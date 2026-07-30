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
// ProAuthoringAssignmentHandler
//
// Implements the Phase 4 assignment-grading surface mounted at:
//
//   - GET    /api/lms/assignments
//   - GET    /api/lms/assignments/{id}
//   - PATCH  /api/lms/assignments/{id}
//   - DELETE /api/lms/assignments/{id}
//   - GET    /api/lms/assignments/{assignmentId}/submissions
//   - GET    /api/lms/assignment-submissions/{id}
//   - GET    /api/lms/assignment-submissions/{submissionId}/grade
//   - POST   /api/lms/assignment-submissions/{submissionId}/grade
//   - PATCH  /api/lms/assignment-grades/{gradeId}
//
// This handler extends the existing LMSHandler.CreateAssignment +
// LMSHandler.SubmitAssignment surface (still mounted at
// POST /api/lms/topics/{topicId}/assignments and
// POST /api/lms/assignments/{id}/submit). The two legacy handlers cover the
// student-side create/submit flow; this handler covers the instructor-side
// list/get/update/delete + grading flow.
//
// A unique compound index on (tenantId, submissionId) in
// lms_assignment_grades enforces one grade row per submission. Creating a
// grade when one already exists returns HTTP 409 Conflict — the caller should
// instead PATCH the existing grade.
// ---------------------------------------------------------------------------

// ProAuthoringAssignmentHandler exposes the Phase 4 assignment-grading surface.
type ProAuthoringAssignmentHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProAuthoringAssignmentHandler constructs a ProAuthoringAssignmentHandler
// bound to the given MongoDB connection and event emitter.
func NewProAuthoringAssignmentHandler(database *db.MongoDB, emitter events.Emitter) *ProAuthoringAssignmentHandler {
	return &ProAuthoringAssignmentHandler{db: database, emitter: emitter}
}

// ---------------------------------------------------------------------------
// Assignment CRUD
// ---------------------------------------------------------------------------

// ListAssignments handles GET /api/lms/assignments.
//
// Optional query params: courseId, topicId, instructorId, isPublished, search,
// limit, offset.
func (h *ProAuthoringAssignmentHandler) ListAssignments(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if cid := r.URL.Query().Get("courseId"); cid != "" {
		if oid, err := primitive.ObjectIDFromHex(cid); err == nil {
			filter["courseId"] = oid
		}
	}
	if tid := r.URL.Query().Get("topicId"); tid != "" {
		if oid, err := primitive.ObjectIDFromHex(tid); err == nil {
			filter["topicId"] = oid
		}
	}
	if iid := r.URL.Query().Get("instructorId"); iid != "" {
		if oid, err := primitive.ObjectIDFromHex(iid); err == nil {
			filter["instructorId"] = oid
		}
	}
	if pub := r.URL.Query().Get("isPublished"); pub != "" {
		switch strings.ToLower(pub) {
		case "true", "1":
			filter["isPublished"] = true
		case "false", "0":
			filter["isPublished"] = false
		}
	}
	if search := r.URL.Query().Get("search"); search != "" {
		filter["title"] = bson.M{"$regex": escapeRegexInput(search), "$options": "i"}
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.Assignments().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch assignments")
		return
	}
	defer cursor.Close(r.Context())

	var assignments []models.Assignment
	if err := cursor.All(r.Context(), &assignments); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode assignments")
		return
	}
	if assignments == nil {
		assignments = []models.Assignment{}
	}

	total, _ := h.db.Assignments().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"assignments": assignments,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// GetAssignment handles GET /api/lms/assignments/{id}.
func (h *ProAuthoringAssignmentHandler) GetAssignment(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	var assignment models.Assignment
	if err := h.db.Assignments().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&assignment); err != nil {
		respondWithError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	respondWithJSON(w, http.StatusOK, assignment)
}

// UpdateAssignment handles PATCH /api/lms/assignments/{id}.
func (h *ProAuthoringAssignmentHandler) UpdateAssignment(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid assignment ID")
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
	delete(updates, "topicId")
	delete(updates, "instructorId")
	delete(updates, "createdAt")
	updates["updatedAt"] = time.Now()

	var assignment models.Assignment
	if err := h.db.Assignments().FindOneAndUpdate(r.Context(),
		bson.M{"_id": id, "tenantId": ctx.TenantID},
		bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&assignment); err != nil {
		respondWithError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	respondWithJSON(w, http.StatusOK, assignment)
}

// DeleteAssignment handles DELETE /api/lms/assignments/{id}.
func (h *ProAuthoringAssignmentHandler) DeleteAssignment(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	res, err := h.db.Assignments().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete assignment")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Assignment not found")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{"success": true})
}

// ---------------------------------------------------------------------------
// Assignment submissions
// ---------------------------------------------------------------------------

// ListAssignmentSubmissions handles GET /api/lms/assignments/{assignmentId}/submissions.
//
// Optional query params: status, studentId, limit, offset.
func (h *ProAuthoringAssignmentHandler) ListAssignmentSubmissions(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	assignmentID, err := primitive.ObjectIDFromHex(mux.Vars(r)["assignmentId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid assignment ID")
		return
	}

	filter := bson.M{
		"tenantId":     ctx.TenantID,
		"assignmentId": assignmentID,
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = models.AssignmentSubmissionStatus(status)
	}
	if sid := r.URL.Query().Get("studentId"); sid != "" {
		if oid, err := primitive.ObjectIDFromHex(sid); err == nil {
			filter["studentId"] = oid
		}
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "submittedAt", Value: -1}})

	cursor, err := h.db.AssignmentSubmissions().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch submissions")
		return
	}
	defer cursor.Close(r.Context())

	var submissions []models.AssignmentSubmission
	if err := cursor.All(r.Context(), &submissions); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode submissions")
		return
	}
	if submissions == nil {
		submissions = []models.AssignmentSubmission{}
	}

	total, _ := h.db.AssignmentSubmissions().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"submissions": submissions,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// GetAssignmentSubmission handles GET /api/lms/assignment-submissions/{id}.
func (h *ProAuthoringAssignmentHandler) GetAssignmentSubmission(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	id, err := primitive.ObjectIDFromHex(mux.Vars(r)["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid submission ID")
		return
	}

	var submission models.AssignmentSubmission
	if err := h.db.AssignmentSubmissions().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&submission); err != nil {
		respondWithError(w, http.StatusNotFound, "Submission not found")
		return
	}

	respondWithJSON(w, http.StatusOK, submission)
}

// ---------------------------------------------------------------------------
// Assignment grades
// ---------------------------------------------------------------------------

// GetAssignmentGrade handles GET /api/lms/assignment-submissions/{submissionId}/grade.
//
// Returns HTTP 404 (not an error envelope) when no grade exists yet — callers
// should treat the 404 as "not graded yet" and fall back to the create flow.
func (h *ProAuthoringAssignmentHandler) GetAssignmentGrade(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	submissionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["submissionId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid submission ID")
		return
	}

	var grade models.AssignmentGrade
	if err := h.db.AssignmentGrades().FindOne(r.Context(), bson.M{
		"tenantId":     ctx.TenantID,
		"submissionId": submissionID,
	}).Decode(&grade); err != nil {
		respondWithError(w, http.StatusNotFound, "Grade not found")
		return
	}

	respondWithJSON(w, http.StatusOK, grade)
}

// CreateAssignmentGrade handles POST /api/lms/assignment-submissions/{submissionId}/grade.
//
// Request body: { "score": float, "maxScore": float, "feedback": string,
// "isPass": bool }.
//
// The handler resolves the assignmentId, studentId, and instructorId from
// the submission + auth context so the caller doesn't have to pass them.
// A unique compound index on (tenantId, submissionId) prevents double-grading;
// if a grade already exists, HTTP 409 is returned and the caller should
// PATCH the existing grade instead.
func (h *ProAuthoringAssignmentHandler) CreateAssignmentGrade(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	submissionID, err := primitive.ObjectIDFromHex(mux.Vars(r)["submissionId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid submission ID")
		return
	}

	var submission models.AssignmentSubmission
	if err := h.db.AssignmentSubmissions().FindOne(r.Context(), bson.M{
		"_id":      submissionID,
		"tenantId": ctx.TenantID,
	}).Decode(&submission); err != nil {
		respondWithError(w, http.StatusNotFound, "Submission not found")
		return
	}

	var payload struct {
		Score    float64 `json:"score"`
		MaxScore float64 `json:"maxScore"`
		Feedback string  `json:"feedback"`
		IsPass   bool    `json:"isPass"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.MaxScore <= 0 {
		// Fall back to the assignment's MaxPoints.
		var assignment models.Assignment
		_ = h.db.Assignments().FindOne(r.Context(), bson.M{
			"_id": submission.AssignmentID, "tenantId": ctx.TenantID,
		}).Decode(&assignment)
		if assignment.MaxPoints > 0 {
			payload.MaxScore = assignment.MaxPoints
		} else {
			payload.MaxScore = 100
		}
	}
	if payload.Score < 0 || payload.Score > payload.MaxScore {
		respondWithError(w, http.StatusBadRequest, "score must be between 0 and maxScore")
		return
	}

	now := time.Now()
	grade := models.AssignmentGrade{
		TenantID:     ctx.TenantID,
		AssignmentID: submission.AssignmentID,
		SubmissionID: submissionID,
		StudentID:    submission.StudentID,
		InstructorID: ctx.UserID,
		Score:        payload.Score,
		MaxScore:     payload.MaxScore,
		Feedback:     payload.Feedback,
		IsPass:       payload.IsPass,
		GradedAt:     now,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	result, err := h.db.AssignmentGrades().InsertOne(r.Context(), &grade)
	if err != nil {
		// Likely the unique-index violation: a grade already exists for this
		// submission. Tell the caller to PATCH instead.
		respondWithError(w, http.StatusConflict, "A grade already exists for this submission — use PATCH /assignment-grades/{id} to update it")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		grade.ID = oid
	}

	// Stamp the submission as graded.
	nowPtr := now
	_, _ = h.db.AssignmentSubmissions().UpdateOne(r.Context(),
		bson.M{"_id": submissionID, "tenantId": ctx.TenantID},
		bson.M{"$set": bson.M{
			"status":        models.AssignmentSubmissionStatusGraded,
			"pointsAwarded": payload.Score,
			"feedback":      payload.Feedback,
			"gradedBy":      ctx.UserID,
			"gradedAt":      &nowPtr,
			"updatedAt":     now,
		}})

	h.emitter.Emit(events.Event{
		Type:      events.EventAssignmentGraded,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"assignmentId": grade.AssignmentID.Hex(),
			"submissionId": grade.SubmissionID.Hex(),
			"studentId":    grade.StudentID.Hex(),
			"instructorId": grade.InstructorID.Hex(),
			"score":        grade.Score,
			"maxScore":     grade.MaxScore,
			"isPass":       grade.IsPass,
		},
	})

	respondWithJSON(w, http.StatusCreated, grade)
}

// UpdateAssignmentGrade handles PATCH /api/lms/assignment-grades/{gradeId}.
//
// Used for re-grades after an appeal. GradedAt preserves the original
// grading time; only UpdatedAt is bumped.
func (h *ProAuthoringAssignmentHandler) UpdateAssignmentGrade(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	gradeID, err := primitive.ObjectIDFromHex(mux.Vars(r)["gradeId"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid grade ID")
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
	delete(updates, "assignmentId")
	delete(updates, "submissionId")
	delete(updates, "studentId")
	delete(updates, "instructorId")
	delete(updates, "createdAt")
	delete(updates, "gradedAt")
	updates["updatedAt"] = time.Now()

	// If score is being updated, re-validate against maxScore.
	var existing models.AssignmentGrade
	if err := h.db.AssignmentGrades().FindOne(r.Context(), bson.M{
		"_id": gradeID, "tenantId": ctx.TenantID,
	}).Decode(&existing); err != nil {
		respondWithError(w, http.StatusNotFound, "Grade not found")
		return
	}
	maxScore := existing.MaxScore
	if ms, ok := updates["maxScore"].(float64); ok && ms > 0 {
		maxScore = ms
	}
	if score, ok := updates["score"].(float64); ok && (score < 0 || score > maxScore) {
		respondWithError(w, http.StatusBadRequest, "score must be between 0 and maxScore")
		return
	}

	var grade models.AssignmentGrade
	if err := h.db.AssignmentGrades().FindOneAndUpdate(r.Context(),
		bson.M{"_id": gradeID, "tenantId": ctx.TenantID},
		bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&grade); err != nil {
		respondWithError(w, http.StatusNotFound, "Grade not found")
		return
	}

	// Sync the submission row.
	_, _ = h.db.AssignmentSubmissions().UpdateOne(r.Context(),
		bson.M{"_id": existing.SubmissionID, "tenantId": ctx.TenantID},
		bson.M{"$set": bson.M{
			"pointsAwarded": grade.Score,
			"feedback":      grade.Feedback,
			"updatedAt":     time.Now(),
		}})

	h.emitter.Emit(events.Event{
		Type:      events.EventAssignmentGraded,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"gradeId":      grade.ID.Hex(),
			"assignmentId": grade.AssignmentID.Hex(),
			"submissionId": grade.SubmissionID.Hex(),
			"studentId":    grade.StudentID.Hex(),
			"instructorId": grade.InstructorID.Hex(),
			"score":        grade.Score,
			"maxScore":     grade.MaxScore,
			"isPass":       grade.IsPass,
			"action":       "regraded",
		},
	})

	respondWithJSON(w, http.StatusOK, grade)
}
