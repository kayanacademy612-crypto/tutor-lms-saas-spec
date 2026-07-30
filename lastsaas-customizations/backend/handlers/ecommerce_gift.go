package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
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
// EcommerceGiftHandler — Phase 3 gift course endpoints
//
// Mounted under /api/lms/gifts and /api/lms/gifts/{code}/redeem. Replaces the
// HTTP 501 stubs in lms.go (CreateGift / RedeemGift). The actual payment
// flow happens through the checkout/order layer; this handler is responsible
// for creating the gift record, looking it up, listing, and redeeming a gift
// code (which grants an Enrollment to the recipient).
//
// All endpoints reuse getLMSContext (defined in lms.go) for tenant/user
// resolution, including the dev fallback that pins requests to the default
// tenant + user.
// ---------------------------------------------------------------------------

// EcommerceGiftHandler implements the Phase 3 gift endpoints.
type EcommerceGiftHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceGiftHandler constructs an EcommerceGiftHandler bound to the
// supplied MongoDB connection and event emitter.
func NewEcommerceGiftHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceGiftHandler {
	return &EcommerceGiftHandler{db: database, emitter: emitter}
}

const (
	giftRedemptionCodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	giftRedemptionCodeLength   = 12
	giftDefaultExpiryDays      = 365
)

// generateGiftRedemptionCode returns a cryptographically-random alphanumeric
// code of length giftRedemptionCodeLength.
func generateGiftRedemptionCode() string {
	out := make([]byte, giftRedemptionCodeLength)
	alphaLen := big.NewInt(int64(len(giftRedemptionCodeAlphabet)))
	for i := range out {
		idx, err := rand.Int(rand.Reader, alphaLen)
		if err != nil {
			// Should never happen in practice; fall back to time-derived index.
			out[i] = giftRedemptionCodeAlphabet[int(time.Now().UnixNano())%len(giftRedemptionCodeAlphabet)]
			continue
		}
		out[i] = giftRedemptionCodeAlphabet[idx.Int64()]
	}
	return string(out)
}

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks
// a usable tenant or authenticated user.
func (h *EcommerceGiftHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// CreateGift handles POST /api/lms/gifts.
//
// Body: { recipientEmail, recipientName?, courseId, message?, priceCents?, currency? }
//
// Creates a CourseGift record in the "pending" state. The redemption code is
// generated server-side and is what the recipient will use to unlock the
// course. Expiry defaults to 365 days from creation. The price is taken from
// the request body when provided; otherwise it is copied from the course's
// current PriceCents.
func (h *EcommerceGiftHandler) CreateGift(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	var payload struct {
		RecipientEmail string `json:"recipientEmail"`
		RecipientName  string `json:"recipientName"`
		CourseID       string `json:"courseId"`
		Message        string `json:"message"`
		PriceCents     *int64 `json:"priceCents"`
		Currency       string `json:"currency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	recipientEmail := strings.TrimSpace(strings.ToLower(payload.RecipientEmail))
	if recipientEmail == "" {
		respondWithError(w, http.StatusBadRequest, "recipientEmail is required")
		return
	}
	if !isValidEmail(recipientEmail) {
		respondWithError(w, http.StatusBadRequest, "recipientEmail is invalid")
		return
	}
	if payload.CourseID == "" {
		respondWithError(w, http.StatusBadRequest, "courseId is required")
		return
	}
	courseID, err := primitive.ObjectIDFromHex(payload.CourseID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "courseId is invalid")
		return
	}

	// Look up the course to pull the title + price.
	var course models.Course
	if err := h.db.Courses().FindOne(r.Context(), bson.M{
		"_id":      courseID,
		"tenantId": ctx.TenantID,
	}).Decode(&course); err != nil {
		respondWithError(w, http.StatusNotFound, "Course not found")
		return
	}

	now := time.Now()
	expiresAt := now.Add(time.Duration(giftDefaultExpiryDays) * 24 * time.Hour)

	priceCents := course.PriceCents
	if payload.PriceCents != nil && *payload.PriceCents >= 0 {
		priceCents = *payload.PriceCents
	}
	currency := strings.TrimSpace(payload.Currency)
	if currency == "" {
		currency = course.Currency
	}
	if currency == "" {
		currency = "USD"
	}

	// Generate a unique redemption code (best-effort retry loop).
	redemptionCode := generateGiftRedemptionCode()
	for attempt := 0; attempt < 5; attempt++ {
		count, err := h.db.CourseGifts().CountDocuments(r.Context(), bson.M{
			"tenantId":       ctx.TenantID,
			"redemptionCode": redemptionCode,
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to verify redemption code")
			return
		}
		if count == 0 {
			break
		}
		redemptionCode = generateGiftRedemptionCode()
	}

	gift := models.CourseGift{
		TenantID:        ctx.TenantID,
		SenderID:        ctx.UserID,
		RecipientEmail:  recipientEmail,
		RecipientName:   strings.TrimSpace(payload.RecipientName),
		CourseID:        courseID,
		RedemptionCode:  redemptionCode,
		Status:          models.CourseGiftStatusPending,
		Message:         strings.TrimSpace(payload.Message),
		PriceCents:      priceCents,
		Currency:        currency,
		ExpiresAt:       &expiresAt,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	result, err := h.db.CourseGifts().InsertOne(r.Context(), &gift)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create gift")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		gift.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCourseGiftCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":       ctx.TenantID.Hex(),
			"giftId":         gift.ID.Hex(),
			"senderId":       ctx.UserID.Hex(),
			"courseId":       courseID.Hex(),
			"recipientEmail": recipientEmail,
		},
	})

	w.Header().Set("Location", "/api/lms/gifts/"+gift.ID.Hex())
	respondWithJSON(w, http.StatusCreated, gift)
}

// GetGift handles GET /api/lms/gifts/{id}.
//
// Returns a single CourseGift scoped to the current tenant. Both the sender
// and the (eventual) recipient may look up the gift; tenant admins may view
// any gift in the tenant.
func (h *EcommerceGiftHandler) GetGift(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid gift ID")
		return
	}
	var gift models.CourseGift
	if err := h.db.CourseGifts().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&gift); err != nil {
		respondWithError(w, http.StatusNotFound, "Gift not found")
		return
	}

	// Visibility: tenant admins see everything; otherwise only the sender or
	// the linked recipient may view the gift.
	if !ctx.IsInstructor &&
		gift.SenderID != ctx.UserID &&
		(gift.RecipientUserID == nil || *gift.RecipientUserID != ctx.UserID) {
		respondWithError(w, http.StatusNotFound, "Gift not found")
		return
	}

	respondWithJSON(w, http.StatusOK, gift)
}

// ListGifts handles GET /api/lms/gifts.
//
// Returns the tenant's gifts. Tenant admins/instructors see all gifts in the
// tenant; everyone else sees only gifts they sent. Optional query params:
// ?status=pending|redeemed|expired|canceled, ?limit=, ?offset=.
func (h *EcommerceGiftHandler) ListGifts(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["senderId"] = ctx.UserID
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = models.CourseGiftStatus(status)
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.CourseGifts().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch gifts")
		return
	}
	defer cursor.Close(r.Context())

	var gifts []models.CourseGift
	if err := cursor.All(r.Context(), &gifts); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode gifts")
		return
	}
	if gifts == nil {
		gifts = []models.CourseGift{}
	}
	total, _ := h.db.CourseGifts().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"gifts":  gifts,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// RedeemGift handles POST /api/lms/gifts/{code}/redeem.
//
// The request body is ignored — the authenticated user becomes the gift's
// recipient. Validates the gift is still pending and not expired, then:
//
//   - marks the gift as redeemed (recipientUserID + redeemedAt set, status
//     flipped to "redeemed"),
//   - creates an active Enrollment linking the recipient to the course,
//   - stamps the new enrollment id back onto the gift,
//   - emits gift.redeemed + enrollment.created events.
//
// Returns the updated gift alongside the new enrollment.
func (h *EcommerceGiftHandler) RedeemGift(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	code := strings.TrimSpace(mux.Vars(r)["code"])
	if code == "" {
		respondWithError(w, http.StatusBadRequest, "Redemption code is required")
		return
	}

	var gift models.CourseGift
	if err := h.db.CourseGifts().FindOne(r.Context(), bson.M{
		"tenantId":       ctx.TenantID,
		"redemptionCode": code,
	}).Decode(&gift); err != nil {
		respondWithError(w, http.StatusNotFound, "Gift not found")
		return
	}

	if gift.Status != models.CourseGiftStatusPending {
		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("Gift is not redeemable (status=%s)", gift.Status))
		return
	}
	if gift.ExpiresAt != nil && time.Now().After(*gift.ExpiresAt) {
		// Flip the gift to "expired" so callers can see why redemption failed.
		now := time.Now()
		_, _ = h.db.CourseGifts().UpdateByID(r.Context(), gift.ID, bson.M{
			"$set": bson.M{
				"status":    models.CourseGiftStatusExpired,
				"updatedAt": now,
			},
		})
		respondWithError(w, http.StatusBadRequest, "Gift has expired")
		return
	}

	// Look up the course (best-effort; bump enrolledCount on success).
	var course models.Course
	if err := h.db.Courses().FindOne(r.Context(), bson.M{
		"_id":      gift.CourseID,
		"tenantId": ctx.TenantID,
	}).Decode(&course); err != nil {
		respondWithError(w, http.StatusNotFound, "Course not found")
		return
	}

	now := time.Now()

	// Idempotency: if the same user already holds an enrollment for this
	// course, re-activate it rather than creating a duplicate.
	var enrollment models.Enrollment
	err := h.db.Enrollments().FindOne(r.Context(), bson.M{
		"tenantId":  ctx.TenantID,
		"studentId": ctx.UserID,
		"courseId":  gift.CourseID,
	}).Decode(&enrollment)
	if err == nil {
		if enrollment.Status == models.EnrollmentStatusCancelled || enrollment.Status == models.EnrollmentStatusExpired || enrollment.Status == models.EnrollmentStatusRefunded {
			_, _ = h.db.Enrollments().UpdateByID(r.Context(), enrollment.ID, bson.M{
				"$set": bson.M{
					"status":         models.EnrollmentStatusActive,
					"lastAccessedAt": now,
					"updatedAt":      now,
				},
			})
			enrollment.Status = models.EnrollmentStatusActive
			enrollment.LastAccessedAt = &now
			enrollment.UpdatedAt = now
		}
	} else {
		enrollment = models.Enrollment{
			TenantID:       ctx.TenantID,
			CourseID:       gift.CourseID,
			StudentID:      ctx.UserID,
			Status:         models.EnrollmentStatusActive,
			LastAccessedAt: &now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		insertResult, insertErr := h.db.Enrollments().InsertOne(r.Context(), &enrollment)
		if insertErr != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to create enrollment")
			return
		}
		if oid, ok := insertResult.InsertedID.(primitive.ObjectID); ok {
			enrollment.ID = oid
		}
		// Best-effort: bump the course's enrolledCount.
		_, _ = h.db.Courses().UpdateByID(r.Context(), gift.CourseID, bson.M{
			"$inc": bson.M{"enrolledCount": 1},
		})
	}

	recipientUserID := ctx.UserID
	if _, err := h.db.CourseGifts().UpdateByID(r.Context(), gift.ID, bson.M{
		"$set": bson.M{
			"recipientUserId": recipientUserID,
			"enrollmentId":    enrollment.ID,
			"redeemedAt":      now,
			"status":          models.CourseGiftStatusRedeemed,
			"updatedAt":       now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to redeem gift")
		return
	}
	gift.RecipientUserID = &recipientUserID
	gift.EnrollmentID = &enrollment.ID
	gift.RedeemedAt = &now
	gift.Status = models.CourseGiftStatusRedeemed
	gift.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventEnrollmentCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"courseId":     gift.CourseID.Hex(),
			"studentId":    ctx.UserID.Hex(),
			"enrollmentId": enrollment.ID.Hex(),
		},
	})
	h.emitter.Emit(events.Event{
		Type:      events.EventCourseGiftRedeemed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"giftId":       gift.ID.Hex(),
			"recipientId":  ctx.UserID.Hex(),
			"courseId":     gift.CourseID.Hex(),
			"enrollmentId": enrollment.ID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"gift":       gift,
		"enrollment": enrollment,
	})
}
