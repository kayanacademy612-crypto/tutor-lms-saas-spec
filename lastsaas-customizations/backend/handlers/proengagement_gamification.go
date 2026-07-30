package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// ProEngagementGamificationHandler — Phase 5 gamification endpoints
//
// Mounted under /api/lms/badges/*, /api/lms/student/badges,
// /api/lms/student/points, and /api/lms/leaderboard/{scope}.
//
// Covers:
//   - Badge CRUD (admin/instructor): list, get, create, update, delete.
//   - Student gamification: my badges (with badge detail join), my points
//     (paginated point history), leaderboard (tenant + course scope, with
//     weekly/monthly/alltime period filter; lazy rebuild when stale).
//   - Internal helpers invoked by other handlers when activity occurs:
//     AwardPoints, CheckAndAwardBadges, RebuildLeaderboard.
//
// All tenant-scoped queries filter by tenantId. The student-facing endpoints
// additionally scope by studentId = ctx.UserID. AwardPoints and
// CheckAndAwardBadges are safe to call from event-driven code paths (e.g.
// MarkLessonComplete, QuizSubmit, EnrollmentComplete) — both are idempotent
// w.r.t. their side effects (AwardPoints just appends; CheckAndAwardBadges
// skips already-awarded badges via the unique compound index on
// (tenantId, studentId, badgeId)).
//
// The handler reuses getLMSContext (defined in lms.go) for tenant/user
// resolution, including the dev fallback that pins requests to the default
// tenant + user. Event emission follows the established events.Event{...}
// pattern; the gamification constants live in proengagement_events.go
// (EventBadgeEarned, EventPointsAwarded, EventLeaderboardUpdated).
//
// NOTE: there is no BadgeCreated/Updated/Deleted event constant in
// proengagement_events.go (only EventBadgeEarned exists). The CRUD handlers
// therefore do NOT emit on create/update/delete — only the award flow emits
// EventBadgeEarned. A future task may add BadgeCreated/Updated/Deleted
// constants and wire them in if audit/notification consumers require them.
// ---------------------------------------------------------------------------

// ProEngagementGamificationHandler implements the Phase 5 gamification
// endpoints plus the internal AwardPoints / CheckAndAwardBadges /
// RebuildLeaderboard helpers used by other handlers when activity occurs.
type ProEngagementGamificationHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProEngagementGamificationHandler constructs a
// ProEngagementGamificationHandler bound to the supplied MongoDB connection
// and event emitter.
func NewProEngagementGamificationHandler(database *db.MongoDB, emitter events.Emitter) *ProEngagementGamificationHandler {
	return &ProEngagementGamificationHandler{db: database, emitter: emitter}
}

// Constants for the lazy-leaderboard-rebuild heuristic. If the newest
// leaderboard entry for a (tenantId, scope, courseId, period) tuple is older
// than leaderboardStaleTTL, GetLeaderboard triggers a synchronous rebuild
// before returning.
const (
	leaderboardStaleTTL    = 1 * time.Hour
	leaderboardDefaultSize = 50
	leaderboardMaxSize     = 500
)

// badgeSlugRe strips non-alphanumerics for slug generation. Mirrors the
// ecommerce_slugRe / slugify pattern in ecommerce_subscription.go.
var badgeSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

// slugifyBadge converts a free-form badge name into a URL-safe slug. Used by
// CreateBadge when the caller does not supply an explicit slug.
func slugifyBadge(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = badgeSlugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "badge"
	}
	return s
}

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks a
// usable tenant or authenticated user.
func (h *ProEngagementGamificationHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
	ctx, ok := getLMSContext(r)
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context required")
		return lmsContext{}, false
	}
	if ctx.UserID.IsZero() {
		respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return lmsContext{}, false
	}
	return ctx, true
}

// resolveStudentName looks up the user's display name; returns "Student" as a
// fallback if the user record can't be loaded.
func (h *ProEngagementGamificationHandler) resolveStudentName(ctx context.Context, studentID primitive.ObjectID) string {
	var user models.User
	if err := h.db.Users().FindOne(ctx, bson.M{"_id": studentID}).Decode(&user); err != nil {
		return "Student"
	}
	if user.DisplayName != "" {
		return user.DisplayName
	}
	if user.Email != "" {
		return user.Email
	}
	return "Student"
}

// ===========================================================================
// Badge CRUD (admin / instructor)
// ===========================================================================

// ListBadges handles GET /api/lms/badges.
//
// Returns the tenant's badges. Students only see active badges; instructors
// /admins see all. Optional query params: ?isActive=true|false, ?type=
// (filters by criteria.type), ?limit=, ?offset=.
func (h *ProEngagementGamificationHandler) ListBadges(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	}
	if activeStr := r.URL.Query().Get("isActive"); activeStr != "" && ctx.IsInstructor {
		filter["isActive"] = activeStr == "true" || activeStr == "1"
	}
	if ctype := r.URL.Query().Get("type"); ctype != "" {
		filter["criteria.type"] = ctype
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: -1}})

	cursor, err := h.db.Badges().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch badges")
		return
	}
	defer cursor.Close(r.Context())

	var badges []models.Badge
	if err := cursor.All(r.Context(), &badges); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode badges")
		return
	}
	if badges == nil {
		badges = []models.Badge{}
	}
	total, _ := h.db.Badges().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"badges": badges,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetBadge handles GET /api/lms/badges/{id}.
//
// Returns a single Badge scoped to the current tenant. Students can fetch
// inactive badges by ID too (the list endpoint hides them, but a direct fetch
// is permitted so deep links from a StudentBadge record resolve).
func (h *ProEngagementGamificationHandler) GetBadge(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid badge ID")
		return
	}
	var badge models.Badge
	if err := h.db.Badges().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&badge); err != nil {
		respondWithError(w, http.StatusNotFound, "Badge not found")
		return
	}
	respondWithJSON(w, http.StatusOK, badge)
}

// CreateBadge handles POST /api/lms/badges.
//
// Body: { name, slug?, description?, iconUrl?, color?, pointsReward?,
// criteria: { type, threshold, courseId? }, isActive?, sortOrder? }. Admin /
// instructor only. Generates a slug from name when slug is empty; enforces
// tenant-scoped slug uniqueness.
func (h *ProEngagementGamificationHandler) CreateBadge(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create badges")
		return
	}

	var badge models.Badge
	if err := json.NewDecoder(r.Body).Decode(&badge); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(badge.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(badge.Criteria.Type) == "" {
		respondWithError(w, http.StatusBadRequest, "criteria.type is required")
		return
	}

	badge.ID = primitive.NilObjectID
	badge.TenantID = ctx.TenantID
	if strings.TrimSpace(badge.Slug) == "" {
		badge.Slug = slugifyBadge(badge.Name)
	} else {
		badge.Slug = slugifyBadge(badge.Slug)
	}

	// Enforce tenant-scoped slug uniqueness.
	existing, err := h.db.Badges().CountDocuments(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"slug":     badge.Slug,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to verify badge slug uniqueness")
		return
	}
	if existing > 0 {
		respondWithError(w, http.StatusConflict, "Badge with this slug already exists")
		return
	}

	now := time.Now()
	badge.CreatedAt = now
	badge.UpdatedAt = now

	result, err := h.db.Badges().InsertOne(r.Context(), &badge)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create badge")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		badge.ID = oid
	}

	// No EventBadgeCreated constant exists in proengagement_events.go —
	// EventBadgeEarned is reserved for the student-award flow. Emit nothing
	// here. (See file header NOTE.)

	w.Header().Set("Location", "/api/lms/badges/"+badge.ID.Hex())
	respondWithJSON(w, http.StatusCreated, badge)
}

// UpdateBadge handles PATCH /api/lms/badges/{id}.
//
// Body: a subset of the writable Badge fields (name, slug, description,
// iconUrl, color, pointsReward, criteria, isActive, sortOrder). Admin /
// instructor only. Re-validates slug uniqueness when slug is changed.
func (h *ProEngagementGamificationHandler) UpdateBadge(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to update badges")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid badge ID")
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Whitelist writable fields.
	allowed := map[string]bool{
		"name":         true,
		"slug":         true,
		"description":  true,
		"iconUrl":      true,
		"color":        true,
		"pointsReward": true,
		"criteria":     true,
		"isActive":     true,
		"sortOrder":    true,
	}
	setFields := bson.M{}
	for k, v := range payload {
		if allowed[k] {
			setFields[k] = v
		}
	}
	if _, hasName := setFields["name"]; hasName {
		if nameStr, ok := setFields["name"].(string); ok && strings.TrimSpace(nameStr) == "" {
			respondWithError(w, http.StatusBadRequest, "name must not be empty")
			return
		}
	}
	if rawSlug, hasSlug := setFields["slug"]; hasSlug {
		if slugStr, ok := rawSlug.(string); ok {
			normalised := slugifyBadge(slugStr)
			if normalised == "" {
				normalised = "badge"
			}
			setFields["slug"] = normalised
			// Re-check slug uniqueness (excluding the badge being updated).
			count, err := h.db.Badges().CountDocuments(r.Context(), bson.M{
				"tenantId": ctx.TenantID,
				"slug":     normalised,
				"_id":      bson.M{"$ne": id},
			})
			if err != nil {
				respondWithError(w, http.StatusInternalServerError, "Failed to verify badge slug uniqueness")
				return
			}
			if count > 0 {
				respondWithError(w, http.StatusConflict, "Badge with this slug already exists")
				return
			}
		}
	}
	if len(setFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No writable fields supplied")
		return
	}
	now := time.Now()
	setFields["updatedAt"] = now

	if _, err := h.db.Badges().UpdateByID(r.Context(), id, bson.M{
		"$set": setFields,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update badge")
		return
	}

	var updated models.Badge
	if err := h.db.Badges().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&updated); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"id":        id.Hex(),
			"updatedAt": now,
		})
		return
	}

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteBadge handles DELETE /api/lms/badges/{id}.
//
// Admin / instructor only. Hard-deletes the badge. StudentBadge records
// referencing the badge are NOT auto-cascaded (they become orphaned); a
// future enhancement may add a cascade. For now, callers should surface the
// orphaned awards as "deleted badge" in the UI.
func (h *ProEngagementGamificationHandler) DeleteBadge(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to delete badges")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid badge ID")
		return
	}
	res, err := h.db.Badges().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete badge")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Badge not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Badge deleted",
		"id":      id.Hex(),
	})
}

// ===========================================================================
// Student gamification
// ===========================================================================

// studentBadgeWithDetail is the GetMyBadges response row — a StudentBadge
// with the parent Badge definition denormalised in.
type studentBadgeWithDetail struct {
	models.StudentBadge
	Badge *models.Badge `json:"badge" bson:"badge"`
}

// GetMyBadges handles GET /api/lms/student/badges.
//
// Returns the badges the current student has been awarded, with the parent
// Badge definition denormalised into each row. Filtered by
// {tenantId, studentId: userId}. Sorted by awardedAt desc.
func (h *ProEngagementGamificationHandler) GetMyBadges(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{
		"tenantId":  ctx.TenantID,
		"studentId": ctx.UserID,
	}
	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "awardedAt", Value: -1}})

	cursor, err := h.db.StudentBadges().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch student badges")
		return
	}
	defer cursor.Close(r.Context())

	var awards []models.StudentBadge
	if err := cursor.All(r.Context(), &awards); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode student badges")
		return
	}
	if awards == nil {
		awards = []models.StudentBadge{}
	}

	// Populate badge details in a single batched query.
	badgeIDs := make([]primitive.ObjectID, 0, len(awards))
	for _, a := range awards {
		badgeIDs = append(badgeIDs, a.BadgeID)
	}
	badgeByID := make(map[primitive.ObjectID]*models.Badge, len(awards))
	if len(badgeIDs) > 0 {
		bcursor, err := h.db.Badges().Find(r.Context(), bson.M{
			"_id": bson.M{"$in": badgeIDs},
		})
		if err == nil {
			defer bcursor.Close(r.Context())
			for bcursor.Next(r.Context()) {
				var b models.Badge
				if err := bcursor.Decode(&b); err == nil {
					badgeByID[b.ID] = &b
				}
			}
		}
	}

	out := make([]studentBadgeWithDetail, 0, len(awards))
	for _, a := range awards {
		row := studentBadgeWithDetail{StudentBadge: a}
		if b, ok := badgeByID[a.BadgeID]; ok {
			row.Badge = b
		}
		out = append(out, row)
	}

	total, _ := h.db.StudentBadges().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"badges": out,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetMyPoints handles GET /api/lms/student/points.
//
// Returns the current student's point history (PointTransaction rows,
// newest first). Filtered by {tenantId, studentId: userId}. Paginated via
// ?limit= / ?offset=. The response also includes the running total points
// so the UI can render a header without a second round-trip.
func (h *ProEngagementGamificationHandler) GetMyPoints(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{
		"tenantId":  ctx.TenantID,
		"studentId": ctx.UserID,
	}
	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.PointTransactions().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch point transactions")
		return
	}
	defer cursor.Close(r.Context())

	var txns []models.PointTransaction
	if err := cursor.All(r.Context(), &txns); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode point transactions")
		return
	}
	if txns == nil {
		txns = []models.PointTransaction{}
	}

	total, _ := h.db.PointTransactions().CountDocuments(r.Context(), filter)
	pointsBalance, _ := h.getStudentTotalPoints(r.Context(), ctx.TenantID, ctx.UserID)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"transactions":  txns,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
		"pointsBalance": pointsBalance,
	})
}

// GetLeaderboard handles GET /api/lms/leaderboard/{scope}.
//
// Path param:
//   - scope=tenant  → tenant-wide leaderboard
//   - scope=course  → course-scoped leaderboard (requires ?courseId=)
//
// Query params: ?courseId= (required when scope=course), ?period=
// (weekly|monthly|alltime, default alltime), ?limit=, ?offset=. If the
// leaderboard for the (tenantId, scope, courseId, period) tuple is missing
// or stale (older than 1 hour), it is rebuilt synchronously before the
// response is returned.
func (h *ProEngagementGamificationHandler) GetLeaderboard(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	scope := strings.TrimSpace(strings.ToLower(mux.Vars(r)["scope"]))
	if scope != "tenant" && scope != "course" {
		respondWithError(w, http.StatusBadRequest, "scope must be 'tenant' or 'course'")
		return
	}

	var courseID *primitive.ObjectID
	if scope == "course" {
		courseIDStr := r.URL.Query().Get("courseId")
		if courseIDStr == "" {
			respondWithError(w, http.StatusBadRequest, "courseId is required when scope=course")
			return
		}
		oid, err := primitive.ObjectIDFromHex(courseIDStr)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid courseId")
			return
		}
		// Validate the course belongs to the tenant.
		count, err := h.db.Courses().CountDocuments(r.Context(), bson.M{
			"_id":      oid,
			"tenantId": ctx.TenantID,
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to verify course")
			return
		}
		if count == 0 {
			respondWithError(w, http.StatusNotFound, "Course not found")
			return
		}
		courseID = &oid
	}

	period := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("period")))
	if period == "" {
		period = "alltime"
	}
	if period != "weekly" && period != "monthly" && period != "alltime" {
		respondWithError(w, http.StatusBadRequest, "period must be 'weekly', 'monthly', or 'alltime'")
		return
	}

	// Lazy rebuild: if no entries exist OR the newest entry is older than
	// leaderboardStaleTTL, rebuild before returning.
	if h.leaderboardIsStale(r.Context(), ctx.TenantID, scope, courseID, period) {
		if err := h.RebuildLeaderboard(r.Context(), ctx.TenantID, scope, courseID); err != nil {
			// Rebuild failure is non-fatal — fall through to return whatever
			// entries already exist (may be empty).
			_ = err
		}
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"scope":    scope,
		"period":   period,
	}
	if scope == "course" {
		filter["courseId"] = courseID
	} else {
		filter["courseId"] = bson.M{"$exists": false}
	}

	limit := parsePositiveInt(r, "limit", leaderboardDefaultSize, leaderboardMaxSize)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "rank", Value: 1}})

	cursor, err := h.db.LeaderboardEntries().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch leaderboard")
		return
	}
	defer cursor.Close(r.Context())

	var entries []models.LeaderboardEntry
	if err := cursor.All(r.Context(), &entries); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode leaderboard entries")
		return
	}
	if entries == nil {
		entries = []models.LeaderboardEntry{}
	}
	total, _ := h.db.LeaderboardEntries().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"leaderboard": entries,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
		"scope":       scope,
		"period":      period,
	})
}

// leaderboardIsStale reports whether the leaderboard for the supplied tuple
// needs rebuilding. Returns true when no entries exist OR the newest entry's
// updatedAt is older than leaderboardStaleTTL.
func (h *ProEngagementGamificationHandler) leaderboardIsStale(ctx context.Context, tenantID primitive.ObjectID, scope string, courseID *primitive.ObjectID, period string) bool {
	filter := bson.M{
		"tenantId": tenantID,
		"scope":    scope,
		"period":   period,
	}
	if scope == "course" {
		filter["courseId"] = courseID
	} else {
		filter["courseId"] = bson.M{"$exists": false}
	}
	var newest models.LeaderboardEntry
	err := h.db.LeaderboardEntries().FindOne(ctx, filter, options.FindOne().
		SetSort(bson.D{{Key: "updatedAt", Value: -1}})).Decode(&newest)
	if err != nil {
		// No rows — rebuild.
		return true
	}
	return time.Since(newest.UpdatedAt) > leaderboardStaleTTL
}

// ===========================================================================
// Internal helpers — invoked by other handlers when activity occurs
// ===========================================================================

// AwardPoints credits (or debits, when points<0) a student's point balance
// by appending a PointTransaction row. The student's total is computed on
// demand from the ledger (no denormalised total field is maintained on the
// user document). Emits EventPointsAwarded. Safe to call concurrently — the
// ledger is append-only.
func (h *ProEngagementGamificationHandler) AwardPoints(ctx context.Context, tenantID, studentID primitive.ObjectID, points int, reason string, referenceID *primitive.ObjectID) error {
	if points == 0 {
		return nil
	}
	if strings.TrimSpace(reason) == "" {
		reason = "manual"
	}
	now := time.Now()
	txn := models.PointTransaction{
		ID:          primitive.NilObjectID,
		TenantID:    tenantID,
		StudentID:   studentID,
		Points:      points,
		Reason:      reason,
		ReferenceID: referenceID,
		CreatedAt:   now,
	}
	result, err := h.db.PointTransactions().InsertOne(ctx, &txn)
	if err != nil {
		return fmt.Errorf("failed to insert point transaction: %w", err)
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		txn.ID = oid
	}

	// Recompute total so the event carries an authoritative balance.
	balance, _ := h.getStudentTotalPoints(ctx, tenantID, studentID)

	h.emitter.Emit(events.Event{
		Type:      events.EventPointsAwarded,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      tenantID.Hex(),
			"studentId":     studentID.Hex(),
			"points":        points,
			"reason":        reason,
			"referenceId":   objectIdToHex(referenceID),
			"transactionId": txn.ID.Hex(),
			"pointsBalance": balance,
		},
	})
	return nil
}

// CheckAndAwardBadges walks every active Badge defined for the tenant and
// awards the student any badge whose criteria is now satisfied AND that the
// student does not already hold. When a badge carries a PointsReward > 0 the
// bonus is credited via AwardPoints (with reason=badge_earned and
// referenceId=badgeId) before emitting EventBadgeEarned. eventType is the
// activity that triggered the check (e.g. "lesson_completed",
// "quiz_passed", "course_completed", "points_awarded"); refID is the
// originating entity ID (may be nil). Both are used only for the emitted
// event payloads — the criteria evaluation re-queries the source-of-truth
// collections so partial / out-of-order events still converge to the
// correct award set.
func (h *ProEngagementGamificationHandler) CheckAndAwardBadges(ctx context.Context, tenantID, studentID primitive.ObjectID, eventType string, refID *primitive.ObjectID) error {
	cursor, err := h.db.Badges().Find(ctx, bson.M{
		"tenantId": tenantID,
		"isActive": true,
	})
	if err != nil {
		return fmt.Errorf("failed to load tenant badges: %w", err)
	}
	defer cursor.Close(ctx)

	var badges []models.Badge
	if err := cursor.All(ctx, &badges); err != nil {
		return fmt.Errorf("failed to decode tenant badges: %w", err)
	}

	// Load the student's already-awarded badge IDs in one shot so we can
	// skip already-held badges without a round-trip per badge.
	awardedCursor, err := h.db.StudentBadges().Find(ctx, bson.M{
		"tenantId":  tenantID,
		"studentId": studentID,
	}, options.Find().SetProjection(bson.M{"badgeId": 1}))
	if err != nil {
		return fmt.Errorf("failed to load student badges: %w", err)
	}
	defer awardedCursor.Close(ctx)
	alreadyAwarded := make(map[primitive.ObjectID]bool)
	for awardedCursor.Next(ctx) {
		var row struct {
			BadgeID primitive.ObjectID `bson:"badgeId"`
		}
		if err := awardedCursor.Decode(&row); err == nil {
			alreadyAwarded[row.BadgeID] = true
		}
	}

	for _, badge := range badges {
		if alreadyAwarded[badge.ID] {
			continue
		}
		met, err := h.evaluateBadgeCriteria(ctx, tenantID, studentID, badge.Criteria)
		if err != nil {
			// Log-and-continue: a single broken badge criteria must not
			// block the rest of the award sweep.
			continue
		}
		if !met {
			continue
		}
		if err := h.awardBadge(ctx, tenantID, studentID, badge, eventType, refID); err != nil {
			continue
		}
	}
	return nil
}

// evaluateBadgeCriteria returns true when the supplied criteria is satisfied
// for the student. Unknown criteria types return (false, nil) — they are
// treated as "never met" rather than an error so a typo in the criteria.type
// doesn't break the whole award sweep.
func (h *ProEngagementGamificationHandler) evaluateBadgeCriteria(ctx context.Context, tenantID, studentID primitive.ObjectID, criteria models.BadgeCriteria) (bool, error) {
	switch criteria.Type {
	case "course_completed":
		return h.checkCourseCompleted(ctx, tenantID, studentID, criteria)
	case "lessons_completed":
		return h.checkLessonsCompleted(ctx, tenantID, studentID, criteria)
	case "quiz_passed":
		return h.checkQuizPassed(ctx, tenantID, studentID, criteria)
	case "points_earned":
		return h.checkPointsEarned(ctx, tenantID, studentID, criteria)
	case "streak_days":
		return h.checkStreakDays(ctx, tenantID, studentID, criteria)
	}
	return false, nil
}

// checkCourseCompleted returns true when the student has at least one
// completed enrollment. When criteria.CourseID is set, the enrollment must
// be for that specific course.
func (h *ProEngagementGamificationHandler) checkCourseCompleted(ctx context.Context, tenantID, studentID primitive.ObjectID, criteria models.BadgeCriteria) (bool, error) {
	filter := bson.M{
		"tenantId":  tenantID,
		"studentId": studentID,
		"status":    models.EnrollmentStatusCompleted,
	}
	if criteria.CourseID != nil {
		filter["courseId"] = *criteria.CourseID
	}
	count, err := h.db.Enrollments().CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return count >= 1, nil
}

// checkLessonsCompleted returns true when the student has at least
// criteria.Threshold completed lessons (LessonProgress.isComplete=true).
// When criteria.CourseID is set, only lessons for that course are counted.
func (h *ProEngagementGamificationHandler) checkLessonsCompleted(ctx context.Context, tenantID, studentID primitive.ObjectID, criteria models.BadgeCriteria) (bool, error) {
	filter := bson.M{
		"tenantId":   tenantID,
		"studentId":  studentID,
		"isComplete": true,
	}
	if criteria.CourseID != nil {
		filter["courseId"] = *criteria.CourseID
	}
	count, err := h.db.LessonProgress().CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return int(count) >= criteria.Threshold, nil
}

// checkQuizPassed returns true when the student has at least
// criteria.Threshold passed quiz attempts (QuizAttempt.isPassed=true).
// When criteria.CourseID is set, only attempts for that course are counted.
func (h *ProEngagementGamificationHandler) checkQuizPassed(ctx context.Context, tenantID, studentID primitive.ObjectID, criteria models.BadgeCriteria) (bool, error) {
	filter := bson.M{
		"tenantId":  tenantID,
		"studentId": studentID,
		"isPassed":  true,
	}
	if criteria.CourseID != nil {
		filter["courseId"] = *criteria.CourseID
	}
	count, err := h.db.QuizAttempts().CountDocuments(ctx, filter)
	if err != nil {
		return false, err
	}
	return int(count) >= criteria.Threshold, nil
}

// checkPointsEarned returns true when the student's total accumulated
// points (sum of all PointTransactions.points) is at least
// criteria.Threshold.
func (h *ProEngagementGamificationHandler) checkPointsEarned(ctx context.Context, tenantID, studentID primitive.ObjectID, criteria models.BadgeCriteria) (bool, error) {
	total, err := h.getStudentTotalPoints(ctx, tenantID, studentID)
	if err != nil {
		return false, err
	}
	return total >= criteria.Threshold, nil
}

// checkStreakDays returns true when the student has been active on at least
// criteria.Threshold distinct days. "Active" is simplified to "has at least
// one PointTransaction on that day" — a more rigorous streak computation
// (consecutive days with activity) is left to a future enhancement.
func (h *ProEngagementGamificationHandler) checkStreakDays(ctx context.Context, tenantID, studentID primitive.ObjectID, criteria models.BadgeCriteria) (bool, error) {
	filter := bson.M{
		"tenantId":  tenantID,
		"studentId": studentID,
	}
	cursor, err := h.db.PointTransactions().Find(ctx, filter, options.Find().SetProjection(bson.M{"createdAt": 1}))
	if err != nil {
		return false, err
	}
	defer cursor.Close(ctx)
	days := make(map[string]bool)
	for cursor.Next(ctx) {
		var pt models.PointTransaction
		if err := cursor.Decode(&pt); err != nil {
			continue
		}
		days[pt.CreatedAt.UTC().Format("2006-01-02")] = true
	}
	return len(days) >= criteria.Threshold, nil
}

// awardBadge inserts the StudentBadge row, optionally credits the bonus
// points, and emits EventBadgeEarned. It is called from
// CheckAndAwardBadges after the criteria has been verified AND the student
// is confirmed not to already hold the badge.
func (h *ProEngagementGamificationHandler) awardBadge(ctx context.Context, tenantID, studentID primitive.ObjectID, badge models.Badge, eventType string, refID *primitive.ObjectID) error {
	now := time.Now()
	award := models.StudentBadge{
		ID:        primitive.NilObjectID,
		TenantID:  tenantID,
		StudentID: studentID,
		BadgeID:   badge.ID,
		AwardedAt: now,
		CourseID:  badge.Criteria.CourseID,
		CreatedAt: now,
	}
	result, err := h.db.StudentBadges().InsertOne(ctx, &award)
	if err != nil {
		// The unique compound index on (tenantId, studentId, badgeId) is
		// the race-condition guard — if two concurrent awardBadge calls
		// for the same student+badge slipped past the alreadyAwarded
		// check, the duplicate insert fails here. Treat that as success
		// (the badge IS awarded) and skip the bonus-points credit +
		// event emission to avoid double-crediting.
		return nil
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		award.ID = oid
	}

	// Credit the bonus points (if any) BEFORE emitting the badge event so
	// downstream consumers see the new balance in the EventBadgeEarned
	// payload.
	if badge.PointsReward > 0 {
		badgeRef := badge.ID
		_ = h.AwardPoints(ctx, tenantID, studentID, badge.PointsReward, "badge_earned", &badgeRef)
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventBadgeEarned,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     tenantID.Hex(),
			"studentId":    studentID.Hex(),
			"badgeId":      badge.ID.Hex(),
			"badgeSlug":    badge.Slug,
			"badgeName":    badge.Name,
			"pointsReward": badge.PointsReward,
			"trigger":      eventType,
			"referenceId":  objectIdToHex(refID),
			"awardId":      award.ID.Hex(),
		},
	})
	return nil
}

// RebuildLeaderboard recomputes the leaderboard for the supplied
// (tenantId, scope, courseId) tuple across ALL three periods
// (weekly|monthly|alltime). Steps:
//  1. Aggregate total points per student from PointTransactions.
//     - scope=tenant: all of the student's PointTransactions in the tenant.
//     - scope=course: only PointTransactions whose referenceId matches a
//     lesson or quiz belonging to the supplied course.
//  2. Sort students by total points descending.
//  3. Assign ranks 1, 2, 3… (ties share the lower rank; the next rank
//     skips — standard competition ranking).
//  4. Delete the existing LeaderboardEntry rows for the tuple, then insert
//     the freshly computed rows.
//  5. Emit EventLeaderboardUpdated.
//
// The period filter (weekly/monthly/alltime) is applied on the
// PointTransactions by createdAt:
//   - alltime: no filter
//   - weekly: createdAt >= start of current ISO week (Monday)
//   - monthly: createdAt >= first day of current month
func (h *ProEngagementGamificationHandler) RebuildLeaderboard(ctx context.Context, tenantID primitive.ObjectID, scope string, courseID *primitive.ObjectID) error {
	if scope != "tenant" && scope != "course" {
		return fmt.Errorf("invalid scope %q (must be 'tenant' or 'course')", scope)
	}
	if scope == "course" && (courseID == nil || courseID.IsZero()) {
		return fmt.Errorf("courseId is required when scope=course")
	}

	// Build the set of referenceIds that count toward a course-scoped
	// leaderboard. Empty for scope=tenant (no referenceId filter).
	var courseRefIDs []primitive.ObjectID
	if scope == "course" {
		ids, err := h.collectCourseReferenceIDs(ctx, tenantID, *courseID)
		if err != nil {
			return fmt.Errorf("failed to collect course reference IDs: %w", err)
		}
		courseRefIDs = ids
	}

	now := time.Now()
	periods := []string{"weekly", "monthly", "alltime"}
	for _, period := range periods {
		if err := h.rebuildLeaderboardForPeriod(ctx, tenantID, scope, courseID, period, courseRefIDs, now); err != nil {
			return fmt.Errorf("failed to rebuild %s leaderboard: %w", period, err)
		}
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventLeaderboardUpdated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": tenantID.Hex(),
			"scope":    scope,
			"courseId": objectIdToHex(courseID),
		},
	})
	return nil
}

// rebuildLeaderboardForPeriod recomputes and persists the leaderboard for a
// single (tenantId, scope, courseId, period) tuple.
func (h *ProEngagementGamificationHandler) rebuildLeaderboardForPeriod(ctx context.Context, tenantID primitive.ObjectID, scope string, courseID *primitive.ObjectID, period string, courseRefIDs []primitive.ObjectID, now time.Time) error {
	// 1. Aggregate total points per student.
	totals, err := h.aggregateStudentPoints(ctx, tenantID, scope, courseRefIDs, period, now)
	if err != nil {
		return err
	}

	// 2. Sort by total descending; tie-break by studentID hex for stable
	// ordering across rebuilds.
	sort.Slice(totals, func(i, j int) bool {
		if totals[i].Total != totals[j].Total {
			return totals[i].Total > totals[j].Total
		}
		return totals[i].StudentID.Hex() < totals[j].StudentID.Hex()
	})

	// 3. Delete existing leaderboard rows for this tuple.
	delFilter := bson.M{
		"tenantId": tenantID,
		"scope":    scope,
		"period":   period,
	}
	if scope == "course" {
		delFilter["courseId"] = courseID
	} else {
		delFilter["courseId"] = bson.M{"$exists": false}
	}
	if _, err := h.db.LeaderboardEntries().DeleteMany(ctx, delFilter); err != nil {
		return fmt.Errorf("failed to clear stale leaderboard: %w", err)
	}

	if len(totals) == 0 {
		return nil
	}

	// 4. Resolve student display names in a single batched query.
	studentIDs := make([]primitive.ObjectID, 0, len(totals))
	for _, t := range totals {
		studentIDs = append(studentIDs, t.StudentID)
	}
	nameByStudent := make(map[primitive.ObjectID]string, len(studentIDs))
	nameCursor, err := h.db.Users().Find(ctx, bson.M{"_id": bson.M{"$in": studentIDs}})
	if err == nil {
		defer nameCursor.Close(ctx)
		for nameCursor.Next(ctx) {
			var u models.User
			if err := nameCursor.Decode(&u); err == nil {
				if u.DisplayName != "" {
					nameByStudent[u.ID] = u.DisplayName
				} else if u.Email != "" {
					nameByStudent[u.ID] = u.Email
				} else {
					nameByStudent[u.ID] = "Student"
				}
			}
		}
	}

	// 5. Assign ranks (standard competition ranking — ties share the
	// lower rank, next rank skips).
	entries := make([]interface{}, 0, len(totals))
	prevTotal := 0
	rank := 0
	for i, t := range totals {
		if i == 0 || t.Total != prevTotal {
			rank = i + 1
			prevTotal = t.Total
		}
		entry := models.LeaderboardEntry{
			ID:          primitive.NilObjectID,
			TenantID:    tenantID,
			StudentID:   t.StudentID,
			StudentName: nameByStudent[t.StudentID],
			TotalPoints: t.Total,
			Rank:        rank,
			Scope:       scope,
			Period:      period,
			UpdatedAt:   now,
		}
		if scope == "course" {
			cid := *courseID
			entry.CourseID = &cid
		}
		entries = append(entries, &entry)
	}

	// 6. Insert.
	if _, err := h.db.LeaderboardEntries().InsertMany(ctx, entries); err != nil {
		return fmt.Errorf("failed to insert leaderboard entries: %w", err)
	}
	return nil
}

// studentPointTotal is the per-student aggregation result used by
// RebuildLeaderboard.
type studentPointTotal struct {
	StudentID primitive.ObjectID
	Total     int
}

// aggregateStudentPoints sums PointTransactions.points per student for the
// supplied period. scope=tenant counts all of the student's transactions;
// scope=course restricts to transactions whose referenceId is in
// courseRefIDs (lessons + quizzes belonging to the course).
func (h *ProEngagementGamificationHandler) aggregateStudentPoints(ctx context.Context, tenantID primitive.ObjectID, scope string, courseRefIDs []primitive.ObjectID, period string, now time.Time) ([]studentPointTotal, error) {
	match := bson.M{
		"tenantId":  tenantID,
		"studentId": bson.M{"$exists": true},
	}
	if scope == "course" {
		if len(courseRefIDs) == 0 {
			// No lessons/quizzes in the course → no points to aggregate.
			return nil, nil
		}
		match["referenceId"] = bson.M{"$in": courseRefIDs}
	}
	if period == "weekly" {
		match["createdAt"] = bson.M{"$gte": startOfWeek(now)}
	} else if period == "monthly" {
		match["createdAt"] = bson.M{"$gte": startOfMonth(now)}
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$studentId"},
			{Key: "total", Value: bson.M{"$sum": "$points"}},
		}}},
	}
	cursor, err := h.db.PointTransactions().Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("failed to aggregate student points: %w", err)
	}
	defer cursor.Close(ctx)

	var rows []struct {
		ID    primitive.ObjectID `bson:"_id"`
		Total int                `bson:"total"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return nil, fmt.Errorf("failed to decode aggregation result: %w", err)
	}
	out := make([]studentPointTotal, 0, len(rows))
	for _, r := range rows {
		out = append(out, studentPointTotal{StudentID: r.ID, Total: r.Total})
	}
	return out, nil
}

// collectCourseReferenceIDs returns the union of all lesson IDs and quiz IDs
// that belong to the supplied course. Used by RebuildLeaderboard to scope
// course-level point aggregation.
func (h *ProEngagementGamificationHandler) collectCourseReferenceIDs(ctx context.Context, tenantID, courseID primitive.ObjectID) ([]primitive.ObjectID, error) {
	filter := bson.M{
		"tenantId": tenantID,
		"courseId": courseID,
	}
	projection := options.Find().SetProjection(bson.M{"_id": 1})

	var ids []primitive.ObjectID

	lcursor, err := h.db.Lessons().Find(ctx, filter, projection)
	if err == nil {
		defer lcursor.Close(ctx)
		for lcursor.Next(ctx) {
			var l models.Lesson
			if err := lcursor.Decode(&l); err == nil {
				ids = append(ids, l.ID)
			}
		}
	}

	qcursor, err := h.db.Quizzes().Find(ctx, filter, projection)
	if err == nil {
		defer qcursor.Close(ctx)
		for qcursor.Next(ctx) {
			var q models.Quiz
			if err := qcursor.Decode(&q); err == nil {
				ids = append(ids, q.ID)
			}
		}
	}
	return ids, nil
}

// getStudentTotalPoints returns the student's current point balance (sum of
// all PointTransactions.points for the tenant+student). Returns 0 on error
// so callers can treat the balance as best-effort.
func (h *ProEngagementGamificationHandler) getStudentTotalPoints(ctx context.Context, tenantID, studentID primitive.ObjectID) (int, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"tenantId":  tenantID,
			"studentId": studentID,
		}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: nil},
			{Key: "total", Value: bson.M{"$sum": "$points"}},
		}}},
	}
	cursor, err := h.db.PointTransactions().Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)
	var rows []struct {
		Total int `bson:"total"`
	}
	if err := cursor.All(ctx, &rows); err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 0, nil
	}
	return rows[0].Total, nil
}

// objectIdToHex returns the hex string for a *primitive.ObjectID, or "" when
// the pointer is nil. Used for event payload serialisation.
func objectIdToHex(id *primitive.ObjectID) string {
	if id == nil {
		return ""
	}
	return id.Hex()
}

// startOfWeek returns the start of the ISO week (Monday 00:00 UTC) containing
// the supplied time.
func startOfWeek(t time.Time) time.Time {
	t = t.UTC()
	// Sunday=0, Monday=1, …, Saturday=6 — ISO week starts Monday.
	daysSinceMonday := int(t.Weekday()) - 1
	if daysSinceMonday < 0 {
		daysSinceMonday = 6
	}
	start := t.AddDate(0, 0, -daysSinceMonday)
	return time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
}

// startOfMonth returns the first day of the month (00:00 UTC) containing the
// supplied time.
func startOfMonth(t time.Time) time.Time {
	t = t.UTC()
	return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
}
