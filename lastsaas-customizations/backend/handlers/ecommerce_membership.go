package handlers

import (
	"encoding/json"
	"fmt"
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
// EcommerceMembershipHandler
//
// Implements the Phase 3 membership surface mounted at /api/lms/memberships.
// This REPLACES the HTTP 501 stubs on LMSHandler.ListMemberships and
// LMSHandler.CreateMembership defined in lms.go. The routing layer (Agent 10)
// is expected to point the existing /memberships routes at this handler
// instead of the LMSHandler stubs.
//
// A Membership is a recurring billing product that grants access to a set of
// courses (or all courses on the tenant when AppliesToAllCourses=true). The
// purchase flow creates a paid Order + Enrollment records for each course in
// the membership's CourseIDs list. Stripe integration is deferred to the
// checkout webhook layer — this handler records the local state transitions
// only.
// ---------------------------------------------------------------------------

// EcommerceMembershipHandler exposes membership CRUD + purchase methods.
type EcommerceMembershipHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceMembershipHandler constructs an EcommerceMembershipHandler bound
// to the given MongoDB connection and event emitter.
func NewEcommerceMembershipHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceMembershipHandler {
	return &EcommerceMembershipHandler{db: database, emitter: emitter}
}

// ---------------------------------------------------------------------------
// Membership CRUD
// ---------------------------------------------------------------------------

// ListMemberships handles GET /api/lms/memberships.
//
// Returns the tenant's membership products. Students see only active
// memberships; instructors/admins see all. Optional query params:
//   - billingInterval (monthly|quarterly|annual|lifetime)
//   - limit, offset   (pagination)
func (h *EcommerceMembershipHandler) ListMemberships(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	}
	if bi := r.URL.Query().Get("billingInterval"); bi != "" {
		filter["billingInterval"] = models.MembershipBillingInterval(bi)
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{
			{Key: "sortOrder", Value: 1},
			{Key: "createdAt", Value: -1},
		})

	cursor, err := h.db.Memberships().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch memberships")
		return
	}
	defer cursor.Close(r.Context())

	var memberships []models.Membership
	if err := cursor.All(r.Context(), &memberships); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode memberships")
		return
	}
	if memberships == nil {
		memberships = []models.Membership{}
	}
	total, _ := h.db.Memberships().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"memberships": memberships,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// GetMembership handles GET /api/lms/memberships/{id}.
func (h *EcommerceMembershipHandler) GetMembership(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid membership ID")
		return
	}

	filter := bson.M{"_id": id, "tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	}
	var membership models.Membership
	if err := h.db.Memberships().FindOne(r.Context(), filter).Decode(&membership); err != nil {
		respondWithError(w, http.StatusNotFound, "Membership not found")
		return
	}
	respondWithJSON(w, http.StatusOK, membership)
}

// CreateMembership handles POST /api/lms/memberships.
//
// Required body fields: name, billingInterval. Optional: slug (auto-generated
// from name when omitted), description, featuredImage, courseIds,
// appliesToAllCourses, priceCents, currency, trialDays, isActive, sortOrder.
//
// Emits events.EventMembershipCreated on success.
func (h *EcommerceMembershipHandler) CreateMembership(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var membership models.Membership
	if err := json.NewDecoder(r.Body).Decode(&membership); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(membership.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if membership.BillingInterval == "" {
		respondWithError(w, http.StatusBadRequest, "billingInterval is required")
		return
	}
	if !models.ValidMembershipInterval(membership.BillingInterval) {
		respondWithError(w, http.StatusBadRequest, "invalid billingInterval (must be monthly|quarterly|annual|lifetime)")
		return
	}
	if membership.PriceCents < 0 {
		respondWithError(w, http.StatusBadRequest, "priceCents must be >= 0")
		return
	}
	// When not applying to all courses, at least one course ID should be
	// supplied. We accept zero-course memberships (they can be edited later)
	// but warn the caller via a 400 when both flags are missing.
	if !membership.AppliesToAllCourses && len(membership.CourseIDs) == 0 {
		respondWithError(w, http.StatusBadRequest, "courseIds is required when appliesToAllCourses is false")
		return
	}

	// Auto-generate slug from name when not supplied.
	if strings.TrimSpace(membership.Slug) == "" {
		membership.Slug = slugifyEcommerce(membership.Name)
	}

	membership.ID = primitive.NilObjectID
	membership.TenantID = ctx.TenantID
	if membership.Currency == "" {
		membership.Currency = "USD"
	}
	if membership.CourseIDs == nil {
		membership.CourseIDs = []primitive.ObjectID{}
	}
	now := time.Now()
	membership.CreatedAt = now
	membership.UpdatedAt = now

	// Guard against duplicate slugs within the tenant.
	dupCount, err := h.db.Memberships().CountDocuments(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"slug":     membership.Slug,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to verify membership slug")
		return
	}
	if dupCount > 0 {
		respondWithError(w, http.StatusConflict, "A membership with this slug already exists")
		return
	}

	result, err := h.db.Memberships().InsertOne(r.Context(), &membership)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create membership")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		membership.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventMembershipCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":        ctx.TenantID.Hex(),
			"membershipId":    membership.ID.Hex(),
			"name":            membership.Name,
			"billingInterval": string(membership.BillingInterval),
			"priceCents":      membership.PriceCents,
			"actorId":         ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/memberships/"+membership.ID.Hex())
	respondWithJSON(w, http.StatusCreated, membership)
}

// UpdateMembership handles PATCH /api/lms/memberships/{id}.
//
// Only fields present in the JSON body are mutated; identity/audit fields
// (_id, tenantId, createdAt) are rejected. The slug (if changed) is checked
// for tenant-scoped uniqueness before the update is applied.
func (h *EcommerceMembershipHandler) UpdateMembership(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid membership ID")
		return
	}

	var existing models.Membership
	if err := h.db.Memberships().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&existing); err != nil {
		respondWithError(w, http.StatusNotFound, "Membership not found")
		return
	}

	var patch map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	for _, forbidden := range []string{"_id", "id", "tenantId", "createdAt"} {
		delete(patch, forbidden)
	}

	if biRaw, ok := patch["billingInterval"]; ok {
		biStr, _ := biRaw.(string)
		if !models.ValidMembershipInterval(models.MembershipBillingInterval(biStr)) {
			respondWithError(w, http.StatusBadRequest, "invalid billingInterval")
			return
		}
	}
	if priceRaw, ok := patch["priceCents"]; ok {
		priceFloat, _ := priceRaw.(float64)
		if priceFloat < 0 {
			respondWithError(w, http.StatusBadRequest, "priceCents must be >= 0")
			return
		}
	}
	if slugRaw, ok := patch["slug"]; ok {
		slugStr, _ := slugRaw.(string)
		if slugStr != "" && slugStr != existing.Slug {
			dupCount, err := h.db.Memberships().CountDocuments(r.Context(), bson.M{
				"tenantId": ctx.TenantID,
				"slug":     slugStr,
				"_id":      bson.M{"$ne": id},
			})
			if err != nil {
				respondWithError(w, http.StatusInternalServerError, "Failed to verify membership slug")
				return
			}
			if dupCount > 0 {
				respondWithError(w, http.StatusConflict, "A membership with this slug already exists")
				return
			}
		}
	}

	patch["updatedAt"] = time.Now()
	if _, err := h.db.Memberships().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update membership")
		return
	}

	var updated models.Membership
	if err := h.db.Memberships().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to reload membership")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventMembershipUpdated,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"membershipId": id.Hex(),
			"actorId":      ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteMembership handles DELETE /api/lms/memberships/{id}.
//
// Performs a soft delete (sets isActive=false) so historical orders and
// enrollments keep a valid reference. The membership document is retained
// and can be re-activated later by PATCHing isActive=true. Emits
// events.EventMembershipDeleted on success.
func (h *EcommerceMembershipHandler) DeleteMembership(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid membership ID")
		return
	}

	now := time.Now()
	res, err := h.db.Memberships().UpdateOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}, bson.M{
		"$set": bson.M{
			"isActive":  false,
			"updatedAt": now,
		},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete membership")
		return
	}
	if res.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Membership not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventMembershipDeleted,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"membershipId": id.Hex(),
			"actorId":      ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Membership deactivated",
		"id":      id.Hex(),
	})
}

// PurchaseMembership handles POST /api/lms/memberships/{id}/purchase.
//
// Simplified checkout flow: creates an Order with a single membership line
// item, marks it as paid, and creates (or re-activates) an Enrollment record
// for every course in the membership's CourseIDs list. When the membership
// has AppliesToAllCourses=true, the user is enrolled in every published
// course on the tenant.
//
// Emits events.EventOrderPaid and one events.EventEnrollmentCreated per
// created enrollment. The response body carries the created order and the
// list of enrollment IDs.
func (h *EcommerceMembershipHandler) PurchaseMembership(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid membership ID")
		return
	}

	var membership models.Membership
	if err := h.db.Memberships().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
		"isActive": true,
	}).Decode(&membership); err != nil {
		respondWithError(w, http.StatusNotFound, "Membership not found or inactive")
		return
	}

	// Resolve the set of courses the purchase grants access to.
	courseIDs := make([]primitive.ObjectID, 0, len(membership.CourseIDs))
	if membership.AppliesToAllCourses {
		cursor, err := h.db.Courses().Find(r.Context(), bson.M{
			"tenantId": ctx.TenantID,
			"status":   models.CourseStatusPublished,
		}, options.Find().SetProjection(bson.M{"_id": 1}))
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to load courses for membership")
			return
		}
		defer cursor.Close(r.Context())
		for cursor.Next(r.Context()) {
			var doc struct {
				ID primitive.ObjectID `bson:"_id"`
			}
			if err := cursor.Decode(&doc); err == nil {
				courseIDs = append(courseIDs, doc.ID)
			}
		}
	} else {
		// De-duplicate the membership's course IDs while preserving order.
		seen := make(map[primitive.ObjectID]bool, len(membership.CourseIDs))
		for _, cid := range membership.CourseIDs {
			if !seen[cid] {
				seen[cid] = true
				courseIDs = append(courseIDs, cid)
			}
		}
	}

	now := time.Now()

	// Build the order with a single membership line item.
	order := models.Order{
		TenantID:    ctx.TenantID,
		UserID:      ctx.UserID,
		OrderNumber: fmt.Sprintf("ORD-%s", primitive.NewObjectID().Hex()),
		Items: []models.OrderItem{
			{
				ID:             primitive.NewObjectID(),
				ItemType:       models.OrderItemTypeMembership,
				ReferenceID:    membership.ID,
				Title:          membership.Name,
				UnitPriceCents: membership.PriceCents,
				Quantity:       1,
				SubtotalCents:  membership.PriceCents,
			},
		},
		SubtotalCents: membership.PriceCents,
		TotalCents:    membership.PriceCents,
		Currency:      membership.Currency,
		Status:        models.OrderStatusPaid,
		PaymentMethod: "membership",
		PaidAt:        &now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if order.Currency == "" {
		order.Currency = "USD"
	}
	orderResult, err := h.db.Orders().InsertOne(r.Context(), &order)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create membership order")
		return
	}
	if oid, ok := orderResult.InsertedID.(primitive.ObjectID); ok {
		order.ID = oid
	}

	// Create or re-activate enrollments for each granted course.
	enrollmentIDs := make([]primitive.ObjectID, 0, len(courseIDs))
	membershipIDRef := membership.ID
	orderIDRef := order.ID
	for _, cid := range courseIDs {
		var existing models.Enrollment
		err := h.db.Enrollments().FindOne(r.Context(), bson.M{
			"tenantId":  ctx.TenantID,
			"studentId": ctx.UserID,
			"courseId":  cid,
		}).Decode(&existing)
		if err == nil {
			// Re-activate if previously cancelled/expired/refunded.
			if existing.Status == models.EnrollmentStatusCancelled ||
				existing.Status == models.EnrollmentStatusExpired ||
				existing.Status == models.EnrollmentStatusRefunded {
				h.db.Enrollments().UpdateByID(r.Context(), existing.ID, bson.M{
					"$set": bson.M{
						"status":         models.EnrollmentStatusActive,
						"orderId":        orderIDRef,
						"membershipId":   membershipIDRef,
						"lastAccessedAt": now,
						"updatedAt":      now,
					},
				})
			}
			enrollmentIDs = append(enrollmentIDs, existing.ID)
			continue
		}

		enrollment := models.Enrollment{
			TenantID:       ctx.TenantID,
			CourseID:       cid,
			StudentID:      ctx.UserID,
			Status:         models.EnrollmentStatusActive,
			OrderID:        &orderIDRef,
			MembershipID:   &membershipIDRef,
			ProgressPct:    0,
			LastAccessedAt: &now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		enrResult, err := h.db.Enrollments().InsertOne(r.Context(), &enrollment)
		if err != nil {
			// Log and continue — a single failed enrollment shouldn't roll
			// back the whole purchase.
			continue
		}
		if oid, ok := enrResult.InsertedID.(primitive.ObjectID); ok {
			enrollment.ID = oid
		}
		enrollmentIDs = append(enrollmentIDs, enrollment.ID)

		// Best-effort: bump the course's enrolledCount.
		h.db.Courses().UpdateByID(r.Context(), cid, bson.M{
			"$inc": bson.M{"enrolledCount": 1},
		})

		h.emitter.Emit(events.Event{
			Type:      events.EventEnrollmentCreated,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":     ctx.TenantID.Hex(),
				"courseId":     cid.Hex(),
				"studentId":    ctx.UserID.Hex(),
				"enrollmentId": enrollment.ID.Hex(),
				"orderId":      order.ID.Hex(),
				"membershipId": membership.ID.Hex(),
				"source":       "membership_purchase",
			},
		})
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventOrderPaid,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"orderId":      order.ID.Hex(),
			"userId":       ctx.UserID.Hex(),
			"totalCents":   order.TotalCents,
			"itemType":     string(models.OrderItemTypeMembership),
			"membershipId": membership.ID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"order":         order,
		"membership":    membership,
		"enrollmentIds": enrollmentIDs,
		"courseCount":   len(courseIDs),
	})
}
