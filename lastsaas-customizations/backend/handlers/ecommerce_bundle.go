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
// EcommerceBundleHandler
//
// Implements the Phase 3 course-bundle surface mounted at /api/lms/bundles.
// This REPLACES the HTTP 501 stubs on LMSHandler.ListBundles and
// LMSHandler.CreateBundle defined in lms.go. The routing layer (Agent 10)
// is expected to point the existing /bundles routes at this handler instead
// of the LMSHandler stubs.
//
// A CourseBundle is a purchasable group of courses sold together at a single
// (often discounted) price. The handler covers full CRUD; the actual
// checkout → enrollment flow for a bundle purchase is handled by the generic
// Order + checkout layer (the LMSHandler.CreateOrder flow already supports
// OrderItemTypeBundle line items).
// ---------------------------------------------------------------------------

// EcommerceBundleHandler exposes bundle CRUD methods.
type EcommerceBundleHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceBundleHandler constructs an EcommerceBundleHandler bound to the
// given MongoDB connection and event emitter.
func NewEcommerceBundleHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceBundleHandler {
	return &EcommerceBundleHandler{db: database, emitter: emitter}
}

// ---------------------------------------------------------------------------
// Bundle CRUD
// ---------------------------------------------------------------------------

// ListBundles handles GET /api/lms/bundles.
//
// Returns the tenant's course bundles. Students see only active bundles by
// default; instructors/admins see all. Optional query params:
//   - isActive (true|false) — explicit override (instructors only)
//   - limit, offset (pagination)
func (h *EcommerceBundleHandler) ListBundles(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	} else if raw := r.URL.Query().Get("isActive"); raw != "" {
		// Allow instructors to explicitly filter by active state.
		switch strings.ToLower(raw) {
		case "true", "1":
			filter["isActive"] = true
		case "false", "0":
			filter["isActive"] = false
		}
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

	cursor, err := h.db.CourseBundles().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch bundles")
		return
	}
	defer cursor.Close(r.Context())

	var bundles []models.CourseBundle
	if err := cursor.All(r.Context(), &bundles); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode bundles")
		return
	}
	if bundles == nil {
		bundles = []models.CourseBundle{}
	}
	total, _ := h.db.CourseBundles().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"bundles": bundles,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetBundle handles GET /api/lms/bundles/{id}.
//
// When the ?include=courses query parameter is supplied, the handler
// additionally fetches the lightweight {id,title,slug,priceCents,status}
// projection for each course referenced by the bundle and returns them in
// a "courses" field on the response.
func (h *EcommerceBundleHandler) GetBundle(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid bundle ID")
		return
	}

	filter := bson.M{"_id": id, "tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	}
	var bundle models.CourseBundle
	if err := h.db.CourseBundles().FindOne(r.Context(), filter).Decode(&bundle); err != nil {
		respondWithError(w, http.StatusNotFound, "Bundle not found")
		return
	}

	// Optionally populate course details.
	if r.URL.Query().Get("include") == "courses" && len(bundle.CourseIDs) > 0 {
		cursor, err := h.db.Courses().Find(r.Context(), bson.M{
			"_id": bson.M{"$in": bundle.CourseIDs},
		}, options.Find().SetProjection(bson.M{
			"_id":           1,
			"title":         1,
			"slug":          1,
			"priceCents":    1,
			"currency":      1,
			"status":        1,
			"featuredImage": 1,
		}))
		if err == nil {
			defer cursor.Close(r.Context())
			var courses []models.Course
			if err := cursor.All(r.Context(), &courses); err == nil {
				if courses == nil {
					courses = []models.Course{}
				}
				respondWithJSON(w, http.StatusOK, map[string]interface{}{
					"bundle":  bundle,
					"courses": courses,
				})
				return
			}
		}
	}

	respondWithJSON(w, http.StatusOK, bundle)
}

// CreateBundle handles POST /api/lms/bundles.
//
// Required body fields: name, courseIds (min length 1). Optional: slug
// (auto-generated from name when omitted), description, featuredImage,
// priceCents, compareAtCents, currency, isActive, sortOrder.
//
// Emits events.EventBundleCreated on success.
func (h *EcommerceBundleHandler) CreateBundle(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var bundle models.CourseBundle
	if err := json.NewDecoder(r.Body).Decode(&bundle); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(bundle.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if len(bundle.CourseIDs) == 0 {
		respondWithError(w, http.StatusBadRequest, "courseIds must contain at least one course")
		return
	}
	if bundle.PriceCents < 0 {
		respondWithError(w, http.StatusBadRequest, "priceCents must be >= 0")
		return
	}

	// De-duplicate the course IDs while preserving order.
	seen := make(map[primitive.ObjectID]bool, len(bundle.CourseIDs))
	uniqueCourseIDs := make([]primitive.ObjectID, 0, len(bundle.CourseIDs))
	for _, cid := range bundle.CourseIDs {
		if !seen[cid] {
			seen[cid] = true
			uniqueCourseIDs = append(uniqueCourseIDs, cid)
		}
	}
	bundle.CourseIDs = uniqueCourseIDs

	// Auto-generate slug from name when not supplied.
	if strings.TrimSpace(bundle.Slug) == "" {
		bundle.Slug = slugifyEcommerce(bundle.Name)
	}

	bundle.ID = primitive.NilObjectID
	bundle.TenantID = ctx.TenantID
	if bundle.Currency == "" {
		bundle.Currency = "USD"
	}
	now := time.Now()
	bundle.CreatedAt = now
	bundle.UpdatedAt = now

	// Guard against duplicate slugs within the tenant.
	dupCount, err := h.db.CourseBundles().CountDocuments(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"slug":     bundle.Slug,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to verify bundle slug")
		return
	}
	if dupCount > 0 {
		respondWithError(w, http.StatusConflict, "A bundle with this slug already exists")
		return
	}

	result, err := h.db.CourseBundles().InsertOne(r.Context(), &bundle)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create bundle")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		bundle.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventBundleCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":    ctx.TenantID.Hex(),
			"bundleId":    bundle.ID.Hex(),
			"name":        bundle.Name,
			"priceCents":  bundle.PriceCents,
			"courseCount": len(bundle.CourseIDs),
			"actorId":     ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/bundles/"+bundle.ID.Hex())
	respondWithJSON(w, http.StatusCreated, bundle)
}

// UpdateBundle handles PATCH /api/lms/bundles/{id}.
//
// Only fields present in the JSON body are mutated; identity/audit fields
// (_id, tenantId, createdAt) are rejected. The slug (if changed) is checked
// for tenant-scoped uniqueness before the update is applied. The courseIds
// list (if supplied) is de-duplicated.
func (h *EcommerceBundleHandler) UpdateBundle(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid bundle ID")
		return
	}

	var existing models.CourseBundle
	if err := h.db.CourseBundles().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&existing); err != nil {
		respondWithError(w, http.StatusNotFound, "Bundle not found")
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
			dupCount, err := h.db.CourseBundles().CountDocuments(r.Context(), bson.M{
				"tenantId": ctx.TenantID,
				"slug":     slugStr,
				"_id":      bson.M{"$ne": id},
			})
			if err != nil {
				respondWithError(w, http.StatusInternalServerError, "Failed to verify bundle slug")
				return
			}
			if dupCount > 0 {
				respondWithError(w, http.StatusConflict, "A bundle with this slug already exists")
				return
			}
		}
	}
	// De-duplicate courseIds if supplied.
	if courseIDsRaw, ok := patch["courseIds"]; ok {
		if arr, ok := courseIDsRaw.([]interface{}); ok && len(arr) > 0 {
			seen := make(map[string]bool, len(arr))
			unique := make([]primitive.ObjectID, 0, len(arr))
			for _, raw := range arr {
				hexStr, _ := raw.(string)
				oid, err := primitive.ObjectIDFromHex(hexStr)
				if err != nil {
					continue
				}
				if !seen[oid.Hex()] {
					seen[oid.Hex()] = true
					unique = append(unique, oid)
				}
			}
			if len(unique) == 0 {
				respondWithError(w, http.StatusBadRequest, "courseIds must contain at least one valid course ID")
				return
			}
			patch["courseIds"] = unique
		}
	}

	patch["updatedAt"] = time.Now()
	if _, err := h.db.CourseBundles().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update bundle")
		return
	}

	var updated models.CourseBundle
	if err := h.db.CourseBundles().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to reload bundle")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventBundleUpdated,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"bundleId": id.Hex(),
			"actorId":  ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteBundle handles DELETE /api/lms/bundles/{id}.
//
// Performs a soft delete (sets isActive=false) so historical orders keep a
// valid reference. The bundle document is retained and can be re-activated
// later by PATCHing isActive=true. Emits events.EventBundleDeleted on success.
func (h *EcommerceBundleHandler) DeleteBundle(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid bundle ID")
		return
	}

	now := time.Now()
	res, err := h.db.CourseBundles().UpdateOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}, bson.M{
		"$set": bson.M{
			"isActive":  false,
			"updatedAt": now,
		},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete bundle")
		return
	}
	if res.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Bundle not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventBundleDeleted,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"bundleId": id.Hex(),
			"actorId":  ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Bundle deactivated",
		"id":      id.Hex(),
	})
}
