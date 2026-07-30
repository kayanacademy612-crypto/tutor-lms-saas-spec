package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// ProAuthoringDripHandler
//
// Implements the Phase 4 content-drip + course-prerequisite surface:
//
//   - Drip rules: list-by-course / get / create / update / delete / drip-check
//     (mounted at /api/lms/courses/{courseId}/drip-rules, /api/lms/drip-rules/*,
//     and /api/lms/lessons/{lessonId}/drip-check).
//
//   - Prerequisite chains: list-by-course / create / delete / eligibility-check
//     (mounted at /api/lms/courses/{courseId}/prerequisites,
//     /api/lms/prerequisites/*, and /api/lms/courses/{courseId}/prerequisite-check).
//
// A DripRule gates a single lesson behind one of four strategies:
// schedule, prerequisite, enrollment_days, sequence. The runtime drip-check
// endpoint evaluates the rule against the calling student's enrollment and
// lesson-progress to decide whether the lesson is accessible yet.
// ---------------------------------------------------------------------------

// ProAuthoringDripHandler exposes the Phase 4 drip + prerequisite surface.
type ProAuthoringDripHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProAuthoringDripHandler constructs a ProAuthoringDripHandler bound to the
// given MongoDB connection and event emitter.
func NewProAuthoringDripHandler(database *db.MongoDB, emitter events.Emitter) *ProAuthoringDripHandler {
	return &ProAuthoringDripHandler{db: database, emitter: emitter}
}

// ---------------------------------------------------------------------------
// Drip rules
// ---------------------------------------------------------------------------

// ListDripRules handles GET /api/lms/courses/{courseId}/drip-rules.
func (h *ProAuthoringDripHandler) ListDripRules(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	courseID, err := primitive.ObjectIDFromHex(mux.Vars(r)["courseId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID, "courseId": courseID}
	if active := r.URL.Query().Get("isActive"); active != "" {
		switch strings.ToLower(active) {
		case "true", "1":
			filter["isActive"] = true
		case "false", "0":
			filter["isActive"] = false
		}
	}

	cursor, err := h.db.DripRules().Find(r.Context(), filter,
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: 1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch drip rules")
		return
	}
	defer cursor.Close(r.Context())

	var rules []models.DripRule
	if err := cursor.All(r.Context(), &rules); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode drip rules")
		return
	}
	if rules == nil {
		rules = []models.DripRule{}
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"dripRules": rules,
		"total":     len(rules),
	})
}

// GetDripRule handles GET /api/lms/drip-rules/{id}.
func (h *ProAuthoringDripHandler) GetDripRule(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid drip rule ID")
		return
	}

	var rule models.DripRule
	if err := h.db.DripRules().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&rule); err != nil {
		respondWithError(w, http.StatusNotFound, "Drip rule not found")
		return
	}

	respondWithJSON(w, http.StatusOK, rule)
}

// CreateDripRule handles POST /api/lms/drip-rules.
//
// Request body: a DripRule payload (courseId, lessonId, ruleType, …).
// One rule per (courseId, lessonId) is enforced by the unique compound index
// registered in mongodb.go.
func (h *ProAuthoringDripHandler) CreateDripRule(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var rule models.DripRule
	if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if rule.CourseID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "courseId is required")
		return
	}
	if rule.LessonID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "lessonId is required")
		return
	}
	if rule.RuleType == "" {
		respondWithError(w, http.StatusBadRequest, "ruleType is required")
		return
	}

	// Verify the course exists.
	if err := h.db.Courses().FindOne(r.Context(), bson.M{
		"_id":      rule.CourseID,
		"tenantId": ctx.TenantID,
	}).Decode(&models.Course{}); err != nil {
		respondWithError(w, http.StatusNotFound, "Course not found")
		return
	}

	// Verify the lesson exists.
	if err := h.db.Lessons().FindOne(r.Context(), bson.M{
		"_id":      rule.LessonID,
		"tenantId": ctx.TenantID,
	}).Decode(&models.Lesson{}); err != nil {
		respondWithError(w, http.StatusNotFound, "Lesson not found")
		return
	}

	rule.ID = primitive.NilObjectID
	rule.TenantID = ctx.TenantID
	rule.IsActive = true
	now := time.Now()
	rule.CreatedAt = now
	rule.UpdatedAt = now

	result, err := h.db.DripRules().InsertOne(r.Context(), &rule)
	if err != nil {
		respondWithError(w, http.StatusConflict, "A drip rule for this lesson already exists")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		rule.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventDripRuleCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"courseId": rule.CourseID.Hex(),
			"lessonId": rule.LessonID.Hex(),
			"ruleType": string(rule.RuleType),
			"ruleId":   rule.ID.Hex(),
			"userId":   ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusCreated, rule)
}

// UpdateDripRule handles PATCH /api/lms/drip-rules/{id}.
func (h *ProAuthoringDripHandler) UpdateDripRule(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid drip rule ID")
		return
	}

	var updates map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	delete(updates, "_id")
	delete(updates, "id")
	delete(updates, "tenantId")
	delete(updates, "courseId")
	delete(updates, "lessonId")
	delete(updates, "createdAt")
	updates["updatedAt"] = time.Now()

	var rule models.DripRule
	if err := h.db.DripRules().FindOneAndUpdate(r.Context(),
		bson.M{"_id": id, "tenantId": ctx.TenantID},
		bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&rule); err != nil {
		respondWithError(w, http.StatusNotFound, "Drip rule not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventDripRuleUpdated,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"ruleId":   rule.ID.Hex(),
			"courseId": rule.CourseID.Hex(),
			"lessonId": rule.LessonID.Hex(),
			"userId":   ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, rule)
}

// DeleteDripRule handles DELETE /api/lms/drip-rules/{id}.
func (h *ProAuthoringDripHandler) DeleteDripRule(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid drip rule ID")
		return
	}

	res, err := h.db.DripRules().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete drip rule")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Drip rule not found")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

// CheckDripAccess handles GET /api/lms/lessons/{lessonId}/drip-check.
//
// Returns whether the calling student has access to the lesson yet, and — if
// not — a human-readable reason plus the unlockAt timestamp (for schedule
// rules).
func (h *ProAuthoringDripHandler) CheckDripAccess(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	lessonID, err := primitive.ObjectIDFromHex(mux.Vars(r)["lessonId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
		return
	}

	// Look up the drip rule for this lesson (if any).
	var rule models.DripRule
	err = h.db.DripRules().FindOne(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"lessonId": lessonID,
		"isActive": true,
	}).Decode(&rule)

	if err != nil {
		// No active rule — access is granted.
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"hasAccess": true,
			"reason":    "no_drip_rule",
		})
		return
	}

	now := time.Now()
	hasAccess := false
	reason := ""
	unlockAt := ""

	switch rule.RuleType {
	case models.DripTypeSchedule:
		if rule.UnlockAt != nil {
			hasAccess = now.After(*rule.UnlockAt)
			if !hasAccess {
				reason = "scheduled_unlock"
				unlockAt = rule.UnlockAt.Format(time.RFC3339)
			}
		} else {
			hasAccess = true
		}

	case models.DripTypeSequence:
		// Look up the previous lesson in the course (by sort order) and
		// require that the student has a completed LessonProgress row for it.
		hasAccess, reason = h.checkSequenceAccess(r, ctx, rule)

	case models.DripTypePrerequisite:
		hasAccess, reason = h.checkPrerequisiteLessonAccess(r, ctx, rule)

	case models.DripTypeEnrollmentDays:
		hasAccess, reason = h.checkEnrollmentDaysAccess(r, ctx, rule)

	default:
		hasAccess = true
	}

	if hasAccess {
		h.emitter.Emit(events.Event{
			Type:      events.EventDripUnlocked,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId": ctx.TenantID.Hex(),
				"courseId": rule.CourseID.Hex(),
				"lessonId": rule.LessonID.Hex(),
				"userId":   ctx.UserID.Hex(),
			},
		})
	}

	resp := map[string]interface{}{
		"hasAccess": hasAccess,
	}
	if reason != "" {
		resp["reason"] = reason
	}
	if unlockAt != "" {
		resp["unlockAt"] = unlockAt
	}

	respondWithJSON(w, http.StatusOK, resp)
}

// checkSequenceAccess returns whether the student has completed the lesson
// immediately preceding `rule.LessonID` in the course's sort order.
func (h *ProAuthoringDripHandler) checkSequenceAccess(r *http.Request, ctx lmsContext, rule models.DripRule) (bool, string) {
	// Find the current lesson to read its sort order.
	var lesson models.Lesson
	if err := h.db.Lessons().FindOne(r.Context(), bson.M{
		"_id":      rule.LessonID,
		"tenantId": ctx.TenantID,
	}).Decode(&lesson); err != nil {
		return true, "" // Lesson missing — don't block access.
	}

	// Find the previous lesson (sort order < current, descending → first hit).
	var prev models.Lesson
	if err := h.db.Lessons().FindOne(r.Context(), bson.M{
		"tenantId":  ctx.TenantID,
		"topicId":   lesson.TopicID,
		"sortOrder": bson.M{"$lt": lesson.SortOrder},
	}, options.FindOne().SetSort(bson.D{{Key: "sortOrder", Value: -1}})).Decode(&prev); err != nil {
		return true, "" // No previous lesson — first in sequence.
	}

	// Check LessonProgress for the previous lesson.
	count, err := h.db.LessonProgress().CountDocuments(r.Context(), bson.M{
		"tenantId":   ctx.TenantID,
		"studentId":  ctx.UserID,
		"lessonId":   prev.ID,
		"isComplete": true,
	})
	if err != nil {
		return true, ""
	}
	if count == 0 {
		return false, "previous_lesson_incomplete"
	}
	return true, ""
}

// checkPrerequisiteLessonAccess returns whether the student has completed the
// prerequisite lesson/topic for the drip rule.
func (h *ProAuthoringDripHandler) checkPrerequisiteLessonAccess(r *http.Request, ctx lmsContext, rule models.DripRule) (bool, string) {
	if rule.PrerequisiteLessonID != nil {
		count, err := h.db.LessonProgress().CountDocuments(r.Context(), bson.M{
			"tenantId":   ctx.TenantID,
			"studentId":  ctx.UserID,
			"lessonId":   *rule.PrerequisiteLessonID,
			"isComplete": true,
		})
		if err != nil {
			return true, ""
		}
		if count == 0 {
			return false, "prerequisite_lesson_incomplete"
		}
	}
	return true, ""
}

// checkEnrollmentDaysAccess returns whether the student's enrollment is at
// least rule.DaysAfterEnrollment days old.
func (h *ProAuthoringDripHandler) checkEnrollmentDaysAccess(r *http.Request, ctx lmsContext, rule models.DripRule) (bool, string) {
	if rule.DaysAfterEnrollment <= 0 {
		return true, ""
	}
	var enr models.Enrollment
	if err := h.db.Enrollments().FindOne(r.Context(), bson.M{
		"tenantId":  ctx.TenantID,
		"studentId": ctx.UserID,
		"courseId":  rule.CourseID,
	}).Decode(&enr); err != nil {
		return false, "not_enrolled"
	}
	cutoff := enr.CreatedAt.AddDate(0, 0, rule.DaysAfterEnrollment)
	if time.Now().Before(cutoff) {
		return false, "enrollment_days_pending"
	}
	return true, ""
}

// ---------------------------------------------------------------------------
// Prerequisite chains (course-level)
// ---------------------------------------------------------------------------

// ListPrerequisites handles GET /api/lms/courses/{courseId}/prerequisites.
func (h *ProAuthoringDripHandler) ListPrerequisites(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	courseID, err := primitive.ObjectIDFromHex(mux.Vars(r)["courseId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	cursor, err := h.db.PrerequisiteChains().Find(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"courseId": courseID,
	}, options.Find().SetSort(bson.D{{Key: "isRequired", Value: -1}, {Key: "createdAt", Value: 1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch prerequisites")
		return
	}
	defer cursor.Close(r.Context())

	var chains []models.PrerequisiteChain
	if err := cursor.All(r.Context(), &chains); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode prerequisites")
		return
	}
	if chains == nil {
		chains = []models.PrerequisiteChain{}
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"prerequisites": chains,
		"total":         len(chains),
	})
}

// CreatePrerequisite handles POST /api/lms/prerequisites.
//
// Request body: a PrerequisiteChain payload (courseId, prerequisiteCourseId,
// isRequired).
func (h *ProAuthoringDripHandler) CreatePrerequisite(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var chain models.PrerequisiteChain
	if err := json.NewDecoder(r.Body).Decode(&chain); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if chain.CourseID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "courseId is required")
		return
	}
	if chain.PrerequisiteCourseID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "prerequisiteCourseId is required")
		return
	}
	if chain.CourseID == chain.PrerequisiteCourseID {
		respondWithError(w, http.StatusBadRequest, "A course cannot be a prerequisite of itself")
		return
	}

	// Verify both courses exist in this tenant.
	for _, cid := range []primitive.ObjectID{chain.CourseID, chain.PrerequisiteCourseID} {
		if err := h.db.Courses().FindOne(r.Context(), bson.M{
			"_id":      cid,
			"tenantId": ctx.TenantID,
		}).Decode(&models.Course{}); err != nil {
			respondWithError(w, http.StatusNotFound, "Course not found: "+cid.Hex())
			return
		}
	}

	chain.ID = primitive.NilObjectID
	chain.TenantID = ctx.TenantID
	chain.CreatedAt = time.Now()

	result, err := h.db.PrerequisiteChains().InsertOne(r.Context(), &chain)
	if err != nil {
		respondWithError(w, http.StatusConflict, "This prerequisite chain already exists")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		chain.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventPrerequisiteChainCreated,
		Timestamp: chain.CreatedAt,
		Data: map[string]interface{}{
			"tenantId":             ctx.TenantID.Hex(),
			"courseId":             chain.CourseID.Hex(),
			"prerequisiteCourseId": chain.PrerequisiteCourseID.Hex(),
			"isRequired":           chain.IsRequired,
			"userId":               ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusCreated, chain)
}

// DeletePrerequisite handles DELETE /api/lms/prerequisites/{id}.
func (h *ProAuthoringDripHandler) DeletePrerequisite(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid prerequisite ID")
		return
	}

	res, err := h.db.PrerequisiteChains().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete prerequisite")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Prerequisite not found")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

// CheckPrerequisiteEligibility handles GET /api/lms/courses/{courseId}/prerequisite-check.
//
// Returns whether the calling student is eligible to enrol in the course
// based on the required prerequisite chains. `missingPrerequisites` lists the
// prerequisite course IDs that the student has not yet completed.
func (h *ProAuthoringDripHandler) CheckPrerequisiteEligibility(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	courseID, err := primitive.ObjectIDFromHex(mux.Vars(r)["courseId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	// Find required prerequisite chains for this course.
	cursor, err := h.db.PrerequisiteChains().Find(r.Context(), bson.M{
		"tenantId":   ctx.TenantID,
		"courseId":   courseID,
		"isRequired": true,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch prerequisites")
		return
	}
	defer cursor.Close(r.Context())

	var chains []models.PrerequisiteChain
	if err := cursor.All(r.Context(), &chains); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode prerequisites")
		return
	}

	missing := []string{}
	for _, c := range chains {
		// Check whether the student has a completed enrollment for the
		// prerequisite course.
		count, err := h.db.Enrollments().CountDocuments(r.Context(), bson.M{
			"tenantId":  ctx.TenantID,
			"studentId": ctx.UserID,
			"courseId":  c.PrerequisiteCourseID,
			"status":    models.EnrollmentStatusCompleted,
		})
		if err != nil || count == 0 {
			missing = append(missing, c.PrerequisiteCourseID.Hex())
		}
	}

	eligible := len(missing) == 0

	if eligible {
		h.emitter.Emit(events.Event{
			Type:      events.EventPrerequisiteCompleted,
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"tenantId": ctx.TenantID.Hex(),
				"courseId": courseID.Hex(),
				"userId":   ctx.UserID.Hex(),
			},
		})
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"eligible":             eligible,
		"missingPrerequisites": missing,
	})
}
