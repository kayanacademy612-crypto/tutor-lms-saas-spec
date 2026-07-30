package handlers

import (
	"encoding/json"
	"net/http"
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
// ProAuthoringInstructorHandler
//
// Implements the Phase 4 multi-instructor surface mounted at:
//   - GET    /api/lms/courses/{courseId}/instructors
//   - POST   /api/lms/course-instructors
//   - PATCH  /api/lms/course-instructors/{id}
//   - DELETE /api/lms/course-instructors/{id}
//
// A CourseInstructor is an N:N join between a course and an instructor.
// One row per course may carry IsPrimary=true (the rest are co-instructors
// or assistants). RevenueSharePercent splits the instructor-side revenue
// across all rows for the course.
//
// This handler is intentionally lean — it does not enforce that the
// RevenueSharePercent values for a given course sum to 100; that is left to
// the frontend to surface as a soft warning. The unique compound index on
// (tenantId, courseId, instructorId) registered in mongodb.go prevents
// double-adding the same instructor to the same course.
// ---------------------------------------------------------------------------

// ProAuthoringInstructorHandler exposes the Phase 4 multi-instructor surface.
type ProAuthoringInstructorHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProAuthoringInstructorHandler constructs a ProAuthoringInstructorHandler
// bound to the given MongoDB connection and event emitter.
func NewProAuthoringInstructorHandler(database *db.MongoDB, emitter events.Emitter) *ProAuthoringInstructorHandler {
	return &ProAuthoringInstructorHandler{db: database, emitter: emitter}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// validInstructorRole returns true when the supplied role is one of the
// supported values. Empty is allowed (treated as "co_instructor" downstream).
func validInstructorRole(role string) bool {
	switch role {
	case "", "primary", "co_instructor", "assistant":
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

// ListCourseInstructors handles GET /api/lms/courses/{courseId}/instructors.
func (h *ProAuthoringInstructorHandler) ListCourseInstructors(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	courseID, err := primitive.ObjectIDFromHex(mux.Vars(r)["courseId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	cursor, err := h.db.CourseInstructors().Find(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"courseId": courseID,
	}, options.Find().SetSort(bson.D{
		{Key: "isPrimary", Value: -1},
		{Key: "addedAt", Value: 1},
	}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch instructors")
		return
	}
	defer cursor.Close(r.Context())

	var instructors []models.CourseInstructor
	if err := cursor.All(r.Context(), &instructors); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode instructors")
		return
	}
	if instructors == nil {
		instructors = []models.CourseInstructor{}
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"instructors": instructors,
		"total":       len(instructors),
	})
}

// AddCourseInstructor handles POST /api/lms/course-instructors.
//
// Request body: a CourseInstructor payload (courseId, instructorId, role,
// revenueSharePercent, isPrimary). One row per (courseId, instructorId) is
// enforced by the unique compound index in mongodb.go.
func (h *ProAuthoringInstructorHandler) AddCourseInstructor(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var ci models.CourseInstructor
	if err := json.NewDecoder(r.Body).Decode(&ci); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if ci.CourseID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "courseId is required")
		return
	}
	if ci.InstructorID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "instructorId is required")
		return
	}
	if !validInstructorRole(ci.Role) {
		respondWithError(w, http.StatusBadRequest, "invalid role (must be primary|co_instructor|assistant)")
		return
	}
	if ci.RevenueSharePercent < 0 || ci.RevenueSharePercent > 100 {
		respondWithError(w, http.StatusBadRequest, "revenueSharePercent must be between 0 and 100")
		return
	}
	if ci.Role == "" {
		ci.Role = "co_instructor"
	}

	// Verify the course exists.
	if err := h.db.Courses().FindOne(r.Context(), bson.M{
		"_id":      ci.CourseID,
		"tenantId": ctx.TenantID,
	}).Decode(&models.Course{}); err != nil {
		respondWithError(w, http.StatusNotFound, "Course not found")
		return
	}

	now := time.Now()
	ci.ID = primitive.NilObjectID
	ci.TenantID = ctx.TenantID
	ci.AddedAt = now
	ci.CreatedAt = now
	ci.UpdatedAt = now

	// If this row is being added as primary, clear any prior primary.
	if ci.IsPrimary {
		_, _ = h.db.CourseInstructors().UpdateMany(r.Context(),
			bson.M{"tenantId": ctx.TenantID, "courseId": ci.CourseID, "isPrimary": true},
			bson.M{"$set": bson.M{"isPrimary": false, "role": "co_instructor", "updatedAt": now}})
		ci.Role = "primary"
	}

	result, err := h.db.CourseInstructors().InsertOne(r.Context(), &ci)
	if err != nil {
		respondWithError(w, http.StatusConflict, "This instructor is already assigned to this course")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		ci.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventInstructorAddedToCourse,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"courseId":     ci.CourseID.Hex(),
			"instructorId": ci.InstructorID.Hex(),
			"role":         ci.Role,
			"isPrimary":    ci.IsPrimary,
			"userId":       ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusCreated, ci)
}

// UpdateCourseInstructor handles PATCH /api/lms/course-instructors/{id}.
func (h *ProAuthoringInstructorHandler) UpdateCourseInstructor(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid instructor assignment ID")
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
	delete(updates, "instructorId")
	delete(updates, "createdAt")
	delete(updates, "addedAt")
	if role, ok := updates["role"].(string); ok && !validInstructorRole(role) {
		respondWithError(w, http.StatusBadRequest, "invalid role (must be primary|co_instructor|assistant)")
		return
	}
	if rsp, ok := updates["revenueSharePercent"].(float64); ok && (rsp < 0 || rsp > 100) {
		respondWithError(w, http.StatusBadRequest, "revenueSharePercent must be between 0 and 100")
		return
	}
	now := time.Now()
	updates["updatedAt"] = now

	// If promoting to primary, demote any existing primary on the same course.
	if isPrim, ok := updates["isPrimary"].(bool); ok && isPrim {
		// Fetch the existing row to read its courseId.
		var existing models.CourseInstructor
		if err := h.db.CourseInstructors().FindOne(r.Context(), bson.M{
			"_id": id, "tenantId": ctx.TenantID,
		}).Decode(&existing); err != nil {
			respondWithError(w, http.StatusNotFound, "Instructor assignment not found")
			return
		}
		_, _ = h.db.CourseInstructors().UpdateMany(r.Context(),
			bson.M{
				"tenantId":  ctx.TenantID,
				"courseId":  existing.CourseID,
				"isPrimary": true,
				"_id":       bson.M{"$ne": id},
			},
			bson.M{"$set": bson.M{"isPrimary": false, "role": "co_instructor", "updatedAt": now}})
		updates["role"] = "primary"
	}

	var ci models.CourseInstructor
	if err := h.db.CourseInstructors().FindOneAndUpdate(r.Context(),
		bson.M{"_id": id, "tenantId": ctx.TenantID},
		bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&ci); err != nil {
		respondWithError(w, http.StatusNotFound, "Instructor assignment not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventInstructorRoleChanged,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"courseId":     ci.CourseID.Hex(),
			"instructorId": ci.InstructorID.Hex(),
			"role":         ci.Role,
			"isPrimary":    ci.IsPrimary,
			"userId":       ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, ci)
}

// RemoveCourseInstructor handles DELETE /api/lms/course-instructors/{id}.
func (h *ProAuthoringInstructorHandler) RemoveCourseInstructor(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid instructor assignment ID")
		return
	}

	// Fetch the row first so we can emit the course + instructor IDs in the
	// event payload (the DeleteOne result doesn't return the doc).
	var ci models.CourseInstructor
	_ = h.db.CourseInstructors().FindOne(r.Context(), bson.M{
		"_id": id, "tenantId": ctx.TenantID,
	}).Decode(&ci)

	res, err := h.db.CourseInstructors().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to remove instructor")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Instructor assignment not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventInstructorRemovedFromCourse,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"courseId":     ci.CourseID.Hex(),
			"instructorId": ci.InstructorID.Hex(),
			"userId":       ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}
