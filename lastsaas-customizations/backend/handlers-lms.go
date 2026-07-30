package handlers

import (
        "encoding/json"
        "fmt"
        "net/http"
        "os"
        "strconv"
        "strings"
        "time"

        "lastsaas/internal/db"
        "lastsaas/internal/events"
        "lastsaas/internal/middleware"
        "lastsaas/internal/models"

        "github.com/gorilla/mux"
        "go.mongodb.org/mongo-driver/bson"
        "go.mongodb.org/mongo-driver/bson/primitive"
        "go.mongodb.org/mongo-driver/mongo/options"
)

// LMSHandler implements the Tutor LMS REST API surface mounted at /api/lms/*.
//
// The Course endpoints (List/Create/Get/Update/Delete/Publish) are fully
// implemented against MongoDB. All other resource endpoints remain stubs
// (returning HTTP 501) and can be layered in incrementally without touching
// cmd/server/main.go.
type LMSHandler struct {
        db      *db.MongoDB
        emitter events.Emitter
}

// NewLMSHandler constructs an LMSHandler bound to the given MongoDB
// connection and event emitter.
func NewLMSHandler(database *db.MongoDB, emitter events.Emitter) *LMSHandler {
        return &LMSHandler{db: database, emitter: emitter}
}

// notImplemented is the shared response for all stub endpoints.
func (h *LMSHandler) notImplemented(w http.ResponseWriter, r *http.Request) {
        respondWithError(w, http.StatusNotImplemented, "LMS endpoint not implemented")
}

// ---------------------------------------------------------------------------
// Tenant / user / membership context helpers
//
// The LMS subrouter is wired through middleware.RequireAuth + middleware.RequireTenant,
// so the active tenant, user, and membership are always available on the request
// context. These helpers centralise the extraction so the CRUD methods can stay
// focused on their persistence logic. They also support the {tenantId} path
// variable pattern (used by the admin endpoints) as a fallback so the same
// handler can be mounted under either router shape.
// ---------------------------------------------------------------------------

// lmsContext bundles the per-request identity fields used by LMS handlers.
type lmsContext struct {
        TenantID   primitive.ObjectID
        UserID     primitive.ObjectID
        IsInstructor bool
}

// lmsRoleRank reports the rank of a membership role within the LMS surface.
// Admins and owners are treated as instructors (they can create/manage courses).
func lmsIsInstructor(role models.MemberRole) bool {
        return role == models.RoleOwner || role == models.RoleAdmin
}

// getLMSContext extracts the tenant/user/membership from the request context.
// It falls back to mux.Vars(r)["tenantId"] for routes that carry the tenant ID
// in the path (mirroring the pattern used by admin.go).
func getLMSContext(r *http.Request) (lmsContext, bool) {
        // Preferred path: tenant middleware has populated the context.
        if tenant, ok := middleware.GetTenantFromContext(r.Context()); ok {
                ctx := lmsContext{
                        TenantID: tenant.ID,
                }
                if user, ok := middleware.GetUserFromContext(r.Context()); ok {
                        ctx.UserID = user.ID
                }
                if membership, ok := middleware.GetMembershipFromContext(r.Context()); ok {
                        ctx.IsInstructor = lmsIsInstructor(membership.Role)
                }
                return ctx, true
        }

        // Fallback path: tenant ID carried as a path variable.
        if tenantIDStr := mux.Vars(r)["tenantId"]; tenantIDStr != "" {
                tenantID, err := primitive.ObjectIDFromHex(tenantIDStr)
                if err != nil {
                        return lmsContext{}, false
                }
                ctx := lmsContext{TenantID: tenantID}
                if user, ok := middleware.GetUserFromContext(r.Context()); ok {
                        ctx.UserID = user.ID
                }
                if membership, ok := middleware.GetMembershipFromContext(r.Context()); ok {
                        ctx.IsInstructor = lmsIsInstructor(membership.Role)
                }
                return ctx, true
        }

        // Dev fallback: no auth context. Use a FIXED default tenant ID so
        // all LMS data is scoped to the same "dev tenant" across requests.
        if os.Getenv("LASTSAAS_ENV") == "dev" || os.Getenv("LASTSAAS_ENV") == "" {
                devTenantID, _ := primitive.ObjectIDFromHex("000000000000000000000001")
                devUserID, _ := primitive.ObjectIDFromHex("000000000000000000000002")
                return lmsContext{
                        TenantID: devTenantID,
                        UserID:   devUserID,
                }, true
        }

        return lmsContext{}, false
}

// requireLMSContext writes a 400/401 response when the request lacks a tenant
// context, otherwise it returns the resolved context.
func (h *LMSHandler) requireLMSContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

// ListCourses handles GET /api/lms/courses.
//
// Supports the following query parameters (all optional, tenant-scoped):
//   - status   (draft|published|archived) — defaults to all
//   - search   — case-insensitive regex match against title
//   - categoryId — exact match
//   - instructorId — exact match
//   - limit    — page size (default 50, max 100)
//   - offset   — pagination offset (default 0)
func (h *LMSHandler) ListCourses(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}

        if status := r.URL.Query().Get("status"); status != "" {
                filter["status"] = models.CourseStatus(status)
        }
        if catID := r.URL.Query().Get("categoryId"); catID != "" {
                if oid, err := primitive.ObjectIDFromHex(catID); err == nil {
                        filter["categoryId"] = oid
                }
        }
        if instrID := r.URL.Query().Get("instructorId"); instrID != "" {
                if oid, err := primitive.ObjectIDFromHex(instrID); err == nil {
                        filter["instructorId"] = oid
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

        cursor, err := h.db.Courses().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch courses")
                return
        }
        defer cursor.Close(r.Context())

        var courses []models.Course
        if err := cursor.All(r.Context(), &courses); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode courses")
                return
        }
        if courses == nil {
                courses = []models.Course{}
        }

        total, _ := h.db.Courses().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "courses": courses,
                "total":   total,
                "limit":   limit,
                "offset":  offset,
        })
}

// CreateCourse handles POST /api/lms/courses.
//
// The requesting user becomes the course instructor. Required fields: title,
// slug. Defaults are applied for status (draft), priceType (free), and
// rating/counter fields.
func (h *LMSHandler) CreateCourse(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        var course models.Course
        if err := json.NewDecoder(r.Body).Decode(&course); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(course.Title) == "" {
                respondWithError(w, http.StatusBadRequest, "title is required")
                return
        }
        if strings.TrimSpace(course.Slug) == "" {
                respondWithError(w, http.StatusBadRequest, "slug is required")
                return
        }

        // Enforce tenant/instructor identity from the authenticated context.
        course.ID = primitive.NilObjectID
        course.TenantID = ctx.TenantID
        course.InstructorID = ctx.UserID
        if course.Status == "" {
                course.Status = models.CourseStatusDraft
        }
        if course.PriceType == "" {
                course.PriceType = models.CoursePriceFree
        }
        if !models.ValidCourseStatus(course.Status) {
                respondWithError(w, http.StatusBadRequest, "invalid status")
                return
        }
        if !models.ValidCoursePriceType(course.PriceType) {
                respondWithError(w, http.StatusBadRequest, "invalid priceType")
                return
        }
        if course.Currency == "" {
                course.Currency = "USD"
        }
        now := time.Now()
        course.CreatedAt = now
        course.UpdatedAt = now

        // Guard against duplicate slugs within the tenant.
        existingCount, err := h.db.Courses().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "slug":     course.Slug,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to verify course slug")
                return
        }
        if existingCount > 0 {
                respondWithError(w, http.StatusConflict, "A course with this slug already exists")
                return
        }

        result, err := h.db.Courses().InsertOne(r.Context(), &course)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create course")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                course.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCourseCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":     ctx.TenantID.Hex(),
                        "courseId":     course.ID.Hex(),
                        "instructorId": ctx.UserID.Hex(),
                        "title":        course.Title,
                },
        })

        w.Header().Set("Location", "/api/lms/courses/"+course.ID.Hex())
        respondWithJSON(w, http.StatusCreated, course)
}

// GetCourse handles GET /api/lms/courses/{id}.
func (h *LMSHandler) GetCourse(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }

        var course models.Course
        err = h.db.Courses().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&course)
        if err != nil {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        respondWithJSON(w, http.StatusOK, course)
}

// UpdateCourse handles PATCH /api/lms/courses/{id}.
//
// Only fields present in the JSON body are mutated; the slug (if changed) is
// checked for tenant-scoped uniqueness before the update is applied.
func (h *LMSHandler) UpdateCourse(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }

        var existing models.Course
        err = h.db.Courses().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing)
        if err != nil {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        // Decode into a map so we can apply only the fields the client sent.
        var patch map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }

        // Reject any attempt to mutate identity/audit fields.
        for _, forbidden := range []string{"_id", "id", "tenantId", "instructorId", "createdAt", "enrolledCount", "ratingAvg", "ratingCount"} {
                delete(patch, forbidden)
        }

        if statusRaw, ok := patch["status"]; ok {
                statusStr, _ := statusRaw.(string)
                if !models.ValidCourseStatus(models.CourseStatus(statusStr)) {
                        respondWithError(w, http.StatusBadRequest, "invalid status")
                        return
                }
        }
        if priceTypeRaw, ok := patch["priceType"]; ok {
                priceTypeStr, _ := priceTypeRaw.(string)
                if !models.ValidCoursePriceType(models.CoursePriceType(priceTypeStr)) {
                        respondWithError(w, http.StatusBadRequest, "invalid priceType")
                        return
                }
        }
        if slugRaw, ok := patch["slug"]; ok {
                slugStr, _ := slugRaw.(string)
                if slugStr != "" && slugStr != existing.Slug {
                        dupCount, err := h.db.Courses().CountDocuments(r.Context(), bson.M{
                                "tenantId": ctx.TenantID,
                                "slug":     slugStr,
                                "_id":      bson.M{"$ne": id},
                        })
                        if err != nil {
                                respondWithError(w, http.StatusInternalServerError, "Failed to verify course slug")
                                return
                        }
                        if dupCount > 0 {
                                respondWithError(w, http.StatusConflict, "A course with this slug already exists")
                                return
                        }
                }
        }

        patch["updatedAt"] = time.Now()
        update := bson.M{"$set": patch}

        if _, err := h.db.Courses().UpdateByID(r.Context(), id, update); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update course")
                return
        }

        var updated models.Course
        if err := h.db.Courses().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload course")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCourseUpdated,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "courseId": id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// DeleteCourse handles DELETE /api/lms/courses/{id}.
//
// Performs a hard delete. Related topics/lessons/enrollments are left in place
// for the v1 surface; a cascade can be layered in later via the
// course.deleted event hook.
func (h *LMSHandler) DeleteCourse(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }

        result, err := h.db.Courses().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete course")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCourseDeleted,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "courseId": id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Course deleted",
                "id":      id.Hex(),
        })
}

// PublishCourse handles POST /api/lms/courses/{id}/publish.
//
// Transitions a course from draft (or archived) into the published state and
// stamps the publishedAt timestamp. Re-publishing an already-published course
// is idempotent.
func (h *LMSHandler) PublishCourse(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }

        var existing models.Course
        err = h.db.Courses().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing)
        if err != nil {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        now := time.Now()
        update := bson.M{
                "$set": bson.M{
                        "status":     models.CourseStatusPublished,
                        "updatedAt":  now,
                        "isPublic":   true,
                },
        }
        if existing.PublishedAt == nil {
                update["$set"].(bson.M)["publishedAt"] = now
        }

        if _, err := h.db.Courses().UpdateByID(r.Context(), id, update); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to publish course")
                return
        }

        var updated models.Course
        if err := h.db.Courses().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload course")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCoursePublished,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "courseId": id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                        "title":    updated.Title,
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

// ListTopics handles GET /api/lms/courses/{courseId}/topics.
//
// When the {courseId} path variable is present the result is scoped to that
// course; otherwise the tenant's entire topic set is returned.
func (h *LMSHandler) ListTopics(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if courseIDStr := mux.Vars(r)["courseId"]; courseIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
                        filter["courseId"] = oid
                }
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}})

        cursor, err := h.db.Topics().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch topics")
                return
        }
        defer cursor.Close(r.Context())

        var topics []models.Topic
        if err := cursor.All(r.Context(), &topics); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode topics")
                return
        }
        if topics == nil {
                topics = []models.Topic{}
        }

        total, _ := h.db.Topics().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "topics": topics,
                "total":  total,
        })
}

// CreateTopic handles POST /api/lms/courses/{courseId}/topics.
func (h *LMSHandler) CreateTopic(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        courseIDStr := mux.Vars(r)["courseId"]
        courseID, err := primitive.ObjectIDFromHex(courseIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }

        // Verify the parent course exists in the tenant.
        var course models.Course
        if err := h.db.Courses().FindOne(r.Context(), bson.M{
                "_id":      courseID,
                "tenantId": ctx.TenantID,
        }).Decode(&course); err != nil {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        var topic models.Topic
        if err := json.NewDecoder(r.Body).Decode(&topic); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(topic.Title) == "" {
                respondWithError(w, http.StatusBadRequest, "title is required")
                return
        }

        topic.ID = primitive.NilObjectID
        topic.TenantID = ctx.TenantID
        topic.CourseID = courseID
        now := time.Now()
        topic.CreatedAt = now
        topic.UpdatedAt = now

        result, err := h.db.Topics().InsertOne(r.Context(), &topic)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create topic")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                topic.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventTopicCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "courseId": courseID.Hex(),
                        "topicId":  topic.ID.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, topic)
}

// UpdateTopic handles PATCH /api/lms/topics/{id}.
func (h *LMSHandler) UpdateTopic(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid topic ID")
                return
        }

        var existing models.Topic
        if err := h.db.Topics().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing); err != nil {
                respondWithError(w, http.StatusNotFound, "Topic not found")
                return
        }

        var patch map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        for _, forbidden := range []string{"_id", "id", "tenantId", "courseId", "createdAt"} {
                delete(patch, forbidden)
        }
        patch["updatedAt"] = time.Now()

        if _, err := h.db.Topics().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update topic")
                return
        }

        var updated models.Topic
        if err := h.db.Topics().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload topic")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventTopicUpdated,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "topicId":  id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// DeleteTopic handles DELETE /api/lms/topics/{id}.
func (h *LMSHandler) DeleteTopic(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid topic ID")
                return
        }

        result, err := h.db.Topics().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete topic")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Topic not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventTopicDeleted,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "topicId":  id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Topic deleted",
                "id":      id.Hex(),
        })
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

// ListLessons handles GET /api/lms/topics/{topicId}/lessons.
//
// Optional query params: ?courseId=.
func (h *LMSHandler) ListLessons(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if topicIDStr := mux.Vars(r)["topicId"]; topicIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(topicIDStr); err == nil {
                        filter["topicId"] = oid
                }
        }
        if courseIDStr := r.URL.Query().Get("courseId"); courseIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
                        filter["courseId"] = oid
                }
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}})

        cursor, err := h.db.Lessons().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch lessons")
                return
        }
        defer cursor.Close(r.Context())

        var lessons []models.Lesson
        if err := cursor.All(r.Context(), &lessons); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode lessons")
                return
        }
        if lessons == nil {
                lessons = []models.Lesson{}
        }

        total, _ := h.db.Lessons().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "lessons": lessons,
                "total":   total,
        })
}

// CreateLesson handles POST /api/lms/topics/{topicId}/lessons.
func (h *LMSHandler) CreateLesson(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        topicIDStr := mux.Vars(r)["topicId"]
        topicID, err := primitive.ObjectIDFromHex(topicIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid topic ID")
                return
        }

        var topic models.Topic
        if err := h.db.Topics().FindOne(r.Context(), bson.M{
                "_id":      topicID,
                "tenantId": ctx.TenantID,
        }).Decode(&topic); err != nil {
                respondWithError(w, http.StatusNotFound, "Topic not found")
                return
        }

        var lesson models.Lesson
        if err := json.NewDecoder(r.Body).Decode(&lesson); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(lesson.Title) == "" {
                respondWithError(w, http.StatusBadRequest, "title is required")
                return
        }
        if lesson.LessonType == "" {
                lesson.LessonType = models.LessonTypeText
        }
        if !models.ValidLessonType(lesson.LessonType) {
                respondWithError(w, http.StatusBadRequest, "invalid lessonType")
                return
        }

        lesson.ID = primitive.NilObjectID
        lesson.TenantID = ctx.TenantID
        lesson.CourseID = topic.CourseID
        lesson.TopicID = topicID
        lesson.InstructorID = ctx.UserID
        now := time.Now()
        lesson.CreatedAt = now
        lesson.UpdatedAt = now

        result, err := h.db.Lessons().InsertOne(r.Context(), &lesson)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create lesson")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                lesson.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventLessonCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "courseId": topic.CourseID.Hex(),
                        "topicId":  topicID.Hex(),
                        "lessonId": lesson.ID.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, lesson)
}

// UpdateLesson handles PATCH /api/lms/lessons/{id}.
func (h *LMSHandler) UpdateLesson(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
                return
        }

        var existing models.Lesson
        if err := h.db.Lessons().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing); err != nil {
                respondWithError(w, http.StatusNotFound, "Lesson not found")
                return
        }

        var patch map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        for _, forbidden := range []string{"_id", "id", "tenantId", "courseId", "topicId", "instructorId", "createdAt"} {
                delete(patch, forbidden)
        }
        if lessonTypeRaw, ok := patch["lessonType"]; ok {
                lessonTypeStr, _ := lessonTypeRaw.(string)
                if lessonTypeStr != "" && !models.ValidLessonType(models.LessonType(lessonTypeStr)) {
                        respondWithError(w, http.StatusBadRequest, "invalid lessonType")
                        return
                }
        }
        patch["updatedAt"] = time.Now()

        if _, err := h.db.Lessons().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update lesson")
                return
        }

        var updated models.Lesson
        if err := h.db.Lessons().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload lesson")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventLessonUpdated,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "lessonId": id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// DeleteLesson handles DELETE /api/lms/lessons/{id}.
func (h *LMSHandler) DeleteLesson(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
                return
        }

        result, err := h.db.Lessons().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete lesson")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Lesson not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventLessonDeleted,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "lessonId": id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Lesson deleted",
                "id":      id.Hex(),
        })
}

// UpdateLessonProgress handles POST /api/lms/lessons/{lessonId}/progress.
//
// Request body (all fields optional): positionSeconds, durationSeconds,
// isComplete, completionPct. The LessonProgress document for (student,lesson)
// is upserted. When an active enrollment exists its progressPct and
// lessonsComplete counters are recomputed.
func (h *LMSHandler) UpdateLessonProgress(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        lessonIDStr := mux.Vars(r)["lessonId"]
        lessonID, err := primitive.ObjectIDFromHex(lessonIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid lesson ID")
                return
        }

        var lesson models.Lesson
        if err := h.db.Lessons().FindOne(r.Context(), bson.M{
                "_id":      lessonID,
                "tenantId": ctx.TenantID,
        }).Decode(&lesson); err != nil {
                respondWithError(w, http.StatusNotFound, "Lesson not found")
                return
        }

        var payload struct {
                PositionSeconds int64   `json:"positionSeconds"`
                DurationSeconds int64   `json:"durationSeconds"`
                IsComplete      bool    `json:"isComplete"`
                CompletionPct   float64 `json:"completionPct"`
        }
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }

        // Look up an active enrollment for the student+course. Progress tracking
        // is permitted without an enrollment in dev mode (enrollment ID is left zero).
        var enrollment models.Enrollment
        enrollmentID := primitive.NilObjectID
        hasEnrollment := true
        if err := h.db.Enrollments().FindOne(r.Context(), bson.M{
                "tenantId":  ctx.TenantID,
                "studentId": ctx.UserID,
                "courseId":  lesson.CourseID,
                "status":    models.EnrollmentStatusActive,
        }).Decode(&enrollment); err != nil {
                hasEnrollment = false
                enrollmentID = primitive.NilObjectID
        }
        if hasEnrollment {
                enrollmentID = enrollment.ID
        }

        now := time.Now()

        progressFilter := bson.M{
                "tenantId":  ctx.TenantID,
                "lessonId":  lessonID,
                "studentId": ctx.UserID,
        }
        setFields := bson.M{
                "courseId":        lesson.CourseID,
                "enrollmentId":    enrollmentID,
                "positionSeconds": payload.PositionSeconds,
                "durationSeconds": payload.DurationSeconds,
                "isComplete":      payload.IsComplete,
                "completionPct":   payload.CompletionPct,
                "lastWatchedAt":   now,
                "updatedAt":       now,
        }
        if payload.IsComplete {
                setFields["completedAt"] = now
        }
        update := bson.M{
                "$set": setFields,
                "$setOnInsert": bson.M{
                        "tenantId":  ctx.TenantID,
                        "lessonId":  lessonID,
                        "studentId": ctx.UserID,
                        "createdAt": now,
                },
        }
        opts := options.Update().SetUpsert(true)
        if _, err := h.db.LessonProgress().UpdateOne(r.Context(), progressFilter, update, opts); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update lesson progress")
                return
        }

        var progress models.LessonProgress
        if err := h.db.LessonProgress().FindOne(r.Context(), progressFilter).Decode(&progress); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload lesson progress")
                return
        }

        if hasEnrollment {
                h.recomputeEnrollmentProgress(r, ctx, enrollment.ID, lesson.CourseID)
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventLessonProgressUpdated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "lessonId":  lessonID.Hex(),
                        "courseId":  lesson.CourseID.Hex(),
                        "studentId": ctx.UserID.Hex(),
                        "complete":  payload.IsComplete,
                },
        })

        if payload.IsComplete {
                h.emitter.Emit(events.Event{
                        Type:      events.EventLessonCompleted,
                        Timestamp: now,
                        Data: map[string]interface{}{
                                "tenantId":  ctx.TenantID.Hex(),
                                "lessonId":  lessonID.Hex(),
                                "courseId":  lesson.CourseID.Hex(),
                                "studentId": ctx.UserID.Hex(),
                        },
                })
        }

        respondWithJSON(w, http.StatusOK, progress)
}

// recomputeEnrollmentProgress recomputes progressPct, lessonsTotal,
// lessonsComplete and (optionally) flips the enrollment to completed.
func (h *LMSHandler) recomputeEnrollmentProgress(r *http.Request, ctx lmsContext, enrollmentID, courseID primitive.ObjectID) {
        totalLessons, _ := h.db.Lessons().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "courseId": courseID,
        })
        completedLessons, _ := h.db.LessonProgress().CountDocuments(r.Context(), bson.M{
                "tenantId":   ctx.TenantID,
                "studentId":  ctx.UserID,
                "courseId":   courseID,
                "isComplete": true,
        })
        var pct float64
        if totalLessons > 0 {
                pct = float64(completedLessons) / float64(totalLessons) * 100.0
        }
        now := time.Now()
        setFields := bson.M{
                "lessonsTotal":    int(totalLessons),
                "lessonsComplete": int(completedLessons),
                "progressPct":     pct,
                "lastAccessedAt":  now,
                "updatedAt":       now,
        }
        if totalLessons > 0 && completedLessons >= int64(totalLessons) {
                setFields["status"] = models.EnrollmentStatusCompleted
                setFields["completedAt"] = now
        }
        h.db.Enrollments().UpdateByID(r.Context(), enrollmentID, bson.M{"$set": setFields})
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

// ListQuizzes handles GET /api/lms/topics/{topicId}/quizzes.
//
// Optional query params: ?courseId=.
func (h *LMSHandler) ListQuizzes(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if topicIDStr := mux.Vars(r)["topicId"]; topicIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(topicIDStr); err == nil {
                        filter["topicId"] = oid
                }
        }
        if courseIDStr := r.URL.Query().Get("courseId"); courseIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
                        filter["courseId"] = oid
                }
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}})

        cursor, err := h.db.Quizzes().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch quizzes")
                return
        }
        defer cursor.Close(r.Context())

        var quizzes []models.Quiz
        if err := cursor.All(r.Context(), &quizzes); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode quizzes")
                return
        }
        if quizzes == nil {
                quizzes = []models.Quiz{}
        }

        total, _ := h.db.Quizzes().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "quizzes": quizzes,
                "total":   total,
        })
}

// CreateQuiz handles POST /api/lms/topics/{topicId}/quizzes.
func (h *LMSHandler) CreateQuiz(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        topicIDStr := mux.Vars(r)["topicId"]
        topicID, err := primitive.ObjectIDFromHex(topicIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid topic ID")
                return
        }

        var topic models.Topic
        if err := h.db.Topics().FindOne(r.Context(), bson.M{
                "_id":      topicID,
                "tenantId": ctx.TenantID,
        }).Decode(&topic); err != nil {
                respondWithError(w, http.StatusNotFound, "Topic not found")
                return
        }

        var quiz models.Quiz
        if err := json.NewDecoder(r.Body).Decode(&quiz); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(quiz.Title) == "" {
                respondWithError(w, http.StatusBadRequest, "title is required")
                return
        }

        quiz.ID = primitive.NilObjectID
        quiz.TenantID = ctx.TenantID
        quiz.CourseID = topic.CourseID
        quiz.TopicID = topicID
        quiz.InstructorID = ctx.UserID
        now := time.Now()
        quiz.CreatedAt = now
        quiz.UpdatedAt = now

        result, err := h.db.Quizzes().InsertOne(r.Context(), &quiz)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create quiz")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                quiz.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventQuizCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "courseId": topic.CourseID.Hex(),
                        "topicId":  topicID.Hex(),
                        "quizId":   quiz.ID.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, quiz)
}

// UpdateQuiz handles PATCH /api/lms/quizzes/{id}.
func (h *LMSHandler) UpdateQuiz(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid quiz ID")
                return
        }

        var existing models.Quiz
        if err := h.db.Quizzes().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing); err != nil {
                respondWithError(w, http.StatusNotFound, "Quiz not found")
                return
        }

        var patch map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        for _, forbidden := range []string{"_id", "id", "tenantId", "courseId", "topicId", "instructorId", "createdAt"} {
                delete(patch, forbidden)
        }
        patch["updatedAt"] = time.Now()

        justPublished := false
        if isPubRaw, ok := patch["isPublished"]; ok {
                if isPub, ok := isPubRaw.(bool); ok && isPub && !existing.IsPublished {
                        justPublished = true
                }
        }

        if _, err := h.db.Quizzes().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update quiz")
                return
        }

        var updated models.Quiz
        if err := h.db.Quizzes().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload quiz")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventQuizUpdated,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "quizId":   id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })
        if justPublished {
                h.emitter.Emit(events.Event{
                        Type:      events.EventQuizPublished,
                        Timestamp: time.Now(),
                        Data: map[string]interface{}{
                                "tenantId": ctx.TenantID.Hex(),
                                "quizId":   id.Hex(),
                                "userId":   ctx.UserID.Hex(),
                        },
                })
        }

        respondWithJSON(w, http.StatusOK, updated)
}

// DeleteQuiz handles DELETE /api/lms/quizzes/{id}.
func (h *LMSHandler) DeleteQuiz(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid quiz ID")
                return
        }

        result, err := h.db.Quizzes().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete quiz")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Quiz not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventQuizDeleted,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "quizId":   id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Quiz deleted",
                "id":      id.Hex(),
        })
}

// CreateQuizAttempt handles POST /api/lms/quizzes/{quizId}/attempts.
//
// Starts (or resumes) an in-progress attempt for the authenticated student.
// An existing in-progress attempt is returned as-is to avoid duplicates.
func (h *LMSHandler) CreateQuizAttempt(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        quizIDStr := mux.Vars(r)["quizId"]
        quizID, err := primitive.ObjectIDFromHex(quizIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid quiz ID")
                return
        }

        var quiz models.Quiz
        if err := h.db.Quizzes().FindOne(r.Context(), bson.M{
                "_id":      quizID,
                "tenantId": ctx.TenantID,
        }).Decode(&quiz); err != nil {
                respondWithError(w, http.StatusNotFound, "Quiz not found")
                return
        }

        // Look up an active enrollment (optional in dev mode).
        var enrollment models.Enrollment
        enrollmentID := primitive.NilObjectID
        if err := h.db.Enrollments().FindOne(r.Context(), bson.M{
                "tenantId":  ctx.TenantID,
                "studentId": ctx.UserID,
                "courseId":  quiz.CourseID,
                "status":    models.EnrollmentStatusActive,
        }).Decode(&enrollment); err == nil {
                enrollmentID = enrollment.ID
        }

        // Resume an existing in-progress attempt if one exists.
        var existing models.QuizAttempt
        if err := h.db.QuizAttempts().FindOne(r.Context(), bson.M{
                "tenantId":  ctx.TenantID,
                "quizId":    quizID,
                "studentId": ctx.UserID,
                "status":    models.QuizAttemptStatusInProgress,
        }).Decode(&existing); err == nil {
                h.emitter.Emit(events.Event{
                        Type:      events.EventQuizAttemptResumed,
                        Timestamp: time.Now(),
                        Data: map[string]interface{}{
                                "tenantId":  ctx.TenantID.Hex(),
                                "quizId":    quizID.Hex(),
                                "attemptId": existing.ID.Hex(),
                                "studentId": ctx.UserID.Hex(),
                        },
                })
                respondWithJSON(w, http.StatusOK, existing)
                return
        }

        // Compute the next attempt number.
        attemptCount, _ := h.db.QuizAttempts().CountDocuments(r.Context(), bson.M{
                "tenantId":  ctx.TenantID,
                "quizId":    quizID,
                "studentId": ctx.UserID,
        })

        now := time.Now()
        attempt := models.QuizAttempt{
                TenantID:     ctx.TenantID,
                QuizID:       quizID,
                CourseID:     quiz.CourseID,
                StudentID:    ctx.UserID,
                EnrollmentID: enrollmentID,
                Status:       models.QuizAttemptStatusInProgress,
                AttemptNo:    int(attemptCount) + 1,
                StartedAt:    now,
                CreatedAt:    now,
                UpdatedAt:    now,
        }

        result, err := h.db.QuizAttempts().InsertOne(r.Context(), &attempt)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create quiz attempt")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                attempt.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventQuizAttemptStarted,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "quizId":    quizID.Hex(),
                        "attemptId": attempt.ID.Hex(),
                        "studentId": ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, attempt)
}

// SubmitQuizAttempt handles POST /api/lms/quizzes/attempts/{id}/submit.
//
// Request body: { "answers": [QuizAnswer...], "timeSpentSec": int }.
// Objective question types (single_choice, multiple_choice, true_false,
// fill_blank, short_answer with acceptableAnswers) are auto-graded against
// the stored questions; subjective types are marked for manual grading.
func (h *LMSHandler) SubmitQuizAttempt(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid attempt ID")
                return
        }

        var attempt models.QuizAttempt
        if err := h.db.QuizAttempts().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&attempt); err != nil {
                respondWithError(w, http.StatusNotFound, "Quiz attempt not found")
                return
        }
        if attempt.Status != models.QuizAttemptStatusInProgress {
                respondWithError(w, http.StatusConflict, "Quiz attempt is not in progress")
                return
        }

        var payload struct {
                Answers      []models.QuizAnswer `json:"answers"`
                TimeSpentSec int64                `json:"timeSpentSec"`
        }
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }

        // Load the questions for objective grading.
        cursor, err := h.db.Questions().Find(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "quizId":   attempt.QuizID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch questions")
                return
        }
        var questions []models.Question
        if err := cursor.All(r.Context(), &questions); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode questions")
                return
        }
        cursor.Close(r.Context())

        questionByID := make(map[primitive.ObjectID]models.Question, len(questions))
        for _, q := range questions {
                questionByID[q.ID] = q
        }

        var pointsEarned, pointsTotal float64
        for i := range payload.Answers {
                ans := &payload.Answers[i]
                q, ok := questionByID[ans.QuestionID]
                if !ok {
                        continue
                }
                pointsTotal += q.Points
                if isAnswerCorrect(q, ans) {
                        ans.IsCorrect = true
                        ans.PointsAwarded = q.Points
                        pointsEarned += q.Points
                } else {
                        ans.IsCorrect = false
                        ans.PointsAwarded = 0
                }
        }

        var scorePct float64
        if pointsTotal > 0 {
                scorePct = pointsEarned / pointsTotal * 100.0
        }

        // Determine pass/fail from the quiz settings.
        isPassed := false
        var quiz models.Quiz
        if err := h.db.Quizzes().FindOne(r.Context(), bson.M{"_id": attempt.QuizID}).Decode(&quiz); err == nil {
                if quiz.Settings.PassThresholdPct > 0 {
                        isPassed = scorePct >= quiz.Settings.PassThresholdPct
                } else {
                        isPassed = scorePct >= 60.0
                }
        }

        now := time.Now()
        update := bson.M{
                "$set": bson.M{
                        "status":       models.QuizAttemptStatusSubmitted,
                        "answers":      payload.Answers,
                        "scorePct":     scorePct,
                        "pointsEarned": pointsEarned,
                        "pointsTotal":  pointsTotal,
                        "isPassed":     isPassed,
                        "timeSpentSec": payload.TimeSpentSec,
                        "submittedAt":  now,
                        "updatedAt":    now,
                },
        }
        if _, err := h.db.QuizAttempts().UpdateByID(r.Context(), id, update); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to submit quiz attempt")
                return
        }

        var updated models.QuizAttempt
        if err := h.db.QuizAttempts().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload quiz attempt")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventQuizAttemptSubmitted,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "quizId":    attempt.QuizID.Hex(),
                        "attemptId": id.Hex(),
                        "studentId": ctx.UserID.Hex(),
                        "scorePct":  scorePct,
                        "isPassed":  isPassed,
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// isAnswerCorrect returns true when the supplied answer matches the stored
// correct options / acceptable answers for objective question types.
// Subjective types (essay, short_answer without acceptable answers) return
// false; they must be graded manually.
func isAnswerCorrect(q models.Question, ans *models.QuizAnswer) bool {
        switch q.QuestionType {
        case models.QuestionTypeSingleChoice, models.QuestionTypeMultipleChoice, models.QuestionTypeTrueFalse:
                correctIDs := map[string]bool{}
                for _, opt := range q.Options {
                        if opt.IsCorrect {
                                correctIDs[opt.ID] = true
                        }
                }
                if len(correctIDs) == 0 || len(ans.SelectedOptionIDs) == 0 {
                        return false
                }
                for _, sel := range ans.SelectedOptionIDs {
                        if !correctIDs[sel] {
                                return false
                        }
                }
                return len(ans.SelectedOptionIDs) == len(correctIDs)
        case models.QuestionTypeFillBlank, models.QuestionTypeShortAnswer:
                if len(q.AcceptableAnswers) == 0 {
                        return false
                }
                trimmed := strings.TrimSpace(ans.TextAnswer)
                for _, acc := range q.AcceptableAnswers {
                        if strings.EqualFold(strings.TrimSpace(acc), trimmed) {
                                return true
                        }
                }
                return false
        default:
                return false
        }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

// ListQuestions handles GET /api/lms/quizzes/{quizId}/questions (or with ?quizId=).
func (h *LMSHandler) ListQuestions(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if quizIDStr := mux.Vars(r)["quizId"]; quizIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(quizIDStr); err == nil {
                        filter["quizId"] = oid
                }
        }
        if quizIDStr := r.URL.Query().Get("quizId"); quizIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(quizIDStr); err == nil {
                        filter["quizId"] = oid
                }
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}})

        cursor, err := h.db.Questions().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch questions")
                return
        }
        defer cursor.Close(r.Context())

        var questions []models.Question
        if err := cursor.All(r.Context(), &questions); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode questions")
                return
        }
        if questions == nil {
                questions = []models.Question{}
        }

        total, _ := h.db.Questions().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "questions": questions,
                "total":     total,
        })
}

// CreateQuestion handles POST /api/lms/quizzes/{quizId}/questions.
func (h *LMSHandler) CreateQuestion(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        quizIDStr := mux.Vars(r)["quizId"]
        quizID, err := primitive.ObjectIDFromHex(quizIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid quiz ID")
                return
        }

        var quiz models.Quiz
        if err := h.db.Quizzes().FindOne(r.Context(), bson.M{
                "_id":      quizID,
                "tenantId": ctx.TenantID,
        }).Decode(&quiz); err != nil {
                respondWithError(w, http.StatusNotFound, "Quiz not found")
                return
        }

        var question models.Question
        if err := json.NewDecoder(r.Body).Decode(&question); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(question.Prompt) == "" {
                respondWithError(w, http.StatusBadRequest, "prompt is required")
                return
        }
        if question.QuestionType == "" {
                question.QuestionType = models.QuestionTypeSingleChoice
        }
        if !models.ValidQuestionType(question.QuestionType) {
                respondWithError(w, http.StatusBadRequest, "invalid questionType")
                return
        }

        question.ID = primitive.NilObjectID
        question.TenantID = ctx.TenantID
        question.QuizID = quizID
        now := time.Now()
        question.CreatedAt = now
        question.UpdatedAt = now

        result, err := h.db.Questions().InsertOne(r.Context(), &question)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create question")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                question.ID = oid
        }

        h.recomputeQuizStats(r, ctx, quizID)

        h.emitter.Emit(events.Event{
                Type:      events.EventQuestionCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":   ctx.TenantID.Hex(),
                        "quizId":     quizID.Hex(),
                        "questionId": question.ID.Hex(),
                        "userId":     ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, question)
}

// UpdateQuestion handles PATCH /api/lms/questions/{id}.
func (h *LMSHandler) UpdateQuestion(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid question ID")
                return
        }

        var existing models.Question
        if err := h.db.Questions().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing); err != nil {
                respondWithError(w, http.StatusNotFound, "Question not found")
                return
        }

        var patch map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        for _, forbidden := range []string{"_id", "id", "tenantId", "quizId", "createdAt"} {
                delete(patch, forbidden)
        }
        if qtRaw, ok := patch["questionType"]; ok {
                qtStr, _ := qtRaw.(string)
                if qtStr != "" && !models.ValidQuestionType(models.QuestionType(qtStr)) {
                        respondWithError(w, http.StatusBadRequest, "invalid questionType")
                        return
                }
        }
        patch["updatedAt"] = time.Now()

        if _, err := h.db.Questions().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update question")
                return
        }

        var updated models.Question
        if err := h.db.Questions().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload question")
                return
        }

        h.recomputeQuizStats(r, ctx, existing.QuizID)

        h.emitter.Emit(events.Event{
                Type:      events.EventQuestionUpdated,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId":   ctx.TenantID.Hex(),
                        "questionId": id.Hex(),
                        "userId":     ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// DeleteQuestion handles DELETE /api/lms/questions/{id}.
func (h *LMSHandler) DeleteQuestion(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid question ID")
                return
        }

        var existing models.Question
        if err := h.db.Questions().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&existing); err != nil {
                respondWithError(w, http.StatusNotFound, "Question not found")
                return
        }

        result, err := h.db.Questions().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete question")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Question not found")
                return
        }

        h.recomputeQuizStats(r, ctx, existing.QuizID)

        h.emitter.Emit(events.Event{
                Type:      events.EventQuestionDeleted,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId":   ctx.TenantID.Hex(),
                        "questionId": id.Hex(),
                        "userId":     ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Question deleted",
                "id":      id.Hex(),
        })
}

// recomputeQuizStats updates the parent quiz's questionCount and totalPoints
// based on its current set of questions.
func (h *LMSHandler) recomputeQuizStats(r *http.Request, ctx lmsContext, quizID primitive.ObjectID) {
        count, _ := h.db.Questions().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "quizId":   quizID,
        })
        type sumResult struct {
                Total float64 `bson:"total"`
        }
        var sr sumResult
        cursor, err := h.db.Questions().Aggregate(r.Context(), []bson.M{
                {"$match": bson.M{"tenantId": ctx.TenantID, "quizId": quizID}},
                {"$group": bson.M{"_id": nil, "total": bson.M{"$sum": "$points"}}},
        })
        if err == nil {
                cursor.Next(r.Context())
                _ = cursor.Decode(&sr)
                cursor.Close(r.Context())
        }
        h.db.Quizzes().UpdateByID(r.Context(), quizID, bson.M{
                "$set": bson.M{
                        "questionCount": int(count),
                        "totalPoints":   sr.Total,
                        "updatedAt":     time.Now(),
                },
        })
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

// ListAssignments handles GET /api/lms/topics/{topicId}/assignments (or with
// ?topicId= / ?courseId= query params).
func (h *LMSHandler) ListAssignments(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if topicIDStr := mux.Vars(r)["topicId"]; topicIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(topicIDStr); err == nil {
                        filter["topicId"] = oid
                }
        }
        if topicIDStr := r.URL.Query().Get("topicId"); topicIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(topicIDStr); err == nil {
                        filter["topicId"] = oid
                }
        }
        if courseIDStr := r.URL.Query().Get("courseId"); courseIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
                        filter["courseId"] = oid
                }
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "createdAt", Value: 1}})

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
        })
}

// CreateAssignment handles POST /api/lms/topics/{topicId}/assignments.
func (h *LMSHandler) CreateAssignment(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        topicIDStr := mux.Vars(r)["topicId"]
        topicID, err := primitive.ObjectIDFromHex(topicIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid topic ID")
                return
        }

        var topic models.Topic
        if err := h.db.Topics().FindOne(r.Context(), bson.M{
                "_id":      topicID,
                "tenantId": ctx.TenantID,
        }).Decode(&topic); err != nil {
                respondWithError(w, http.StatusNotFound, "Topic not found")
                return
        }

        var assignment models.Assignment
        if err := json.NewDecoder(r.Body).Decode(&assignment); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(assignment.Title) == "" {
                respondWithError(w, http.StatusBadRequest, "title is required")
                return
        }

        assignment.ID = primitive.NilObjectID
        assignment.TenantID = ctx.TenantID
        assignment.CourseID = topic.CourseID
        assignment.TopicID = topicID
        assignment.InstructorID = ctx.UserID
        now := time.Now()
        assignment.CreatedAt = now
        assignment.UpdatedAt = now

        result, err := h.db.Assignments().InsertOne(r.Context(), &assignment)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create assignment")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                assignment.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventAssignmentCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":     ctx.TenantID.Hex(),
                        "courseId":     topic.CourseID.Hex(),
                        "topicId":      topicID.Hex(),
                        "assignmentId": assignment.ID.Hex(),
                        "userId":       ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, assignment)
}

// SubmitAssignment handles POST /api/lms/assignments/{id}/submit.
//
// Request body: { "content": string, "attachmentUrls": []string, "note": string }.
func (h *LMSHandler) SubmitAssignment(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
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

        var payload struct {
                Content        string   `json:"content"`
                AttachmentURLs []string `json:"attachmentUrls"`
                Note           string   `json:"note"`
        }
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }

        // Look up an active enrollment (optional in dev mode).
        var enrollment models.Enrollment
        enrollmentID := primitive.NilObjectID
        if err := h.db.Enrollments().FindOne(r.Context(), bson.M{
                "tenantId":  ctx.TenantID,
                "studentId": ctx.UserID,
                "courseId":  assignment.CourseID,
                "status":    models.EnrollmentStatusActive,
        }).Decode(&enrollment); err == nil {
                enrollmentID = enrollment.ID
        }

        now := time.Now()
        submission := models.AssignmentSubmission{
                TenantID:       ctx.TenantID,
                AssignmentID:   id,
                CourseID:       assignment.CourseID,
                StudentID:      ctx.UserID,
                EnrollmentID:   enrollmentID,
                Status:         models.AssignmentSubmissionStatusSubmitted,
                Content:        payload.Content,
                AttachmentURLs: payload.AttachmentURLs,
                Note:           payload.Note,
                SubmittedAt:    now,
                CreatedAt:      now,
                UpdatedAt:      now,
        }

        result, err := h.db.AssignmentSubmissions().InsertOne(r.Context(), &submission)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to submit assignment")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                submission.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventAssignmentSubmitted,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":     ctx.TenantID.Hex(),
                        "assignmentId": id.Hex(),
                        "submissionId": submission.ID.Hex(),
                        "studentId":    ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, submission)
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

// ListEnrollments handles GET /api/lms/enrollments.
//
// Returns the authenticated user's enrollments. Instructors (admins/owners)
// see all enrollments in the tenant; students see only their own.
//
// Optional query params: ?courseId=, ?status=, ?limit=, ?offset=.
func (h *LMSHandler) ListEnrollments(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if !ctx.IsInstructor {
                filter["studentId"] = ctx.UserID
        }
        if courseIDStr := r.URL.Query().Get("courseId"); courseIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
                        filter["courseId"] = oid
                }
        }
        if status := r.URL.Query().Get("status"); status != "" {
                filter["status"] = models.EnrollmentStatus(status)
        }

        limit := parsePositiveInt(r, "limit", 50, 100)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)

        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}})

        cursor, err := h.db.Enrollments().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch enrollments")
                return
        }
        defer cursor.Close(r.Context())

        var enrollments []models.Enrollment
        if err := cursor.All(r.Context(), &enrollments); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode enrollments")
                return
        }
        if enrollments == nil {
                enrollments = []models.Enrollment{}
        }

        total, _ := h.db.Enrollments().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "enrollments": enrollments,
                "total":       total,
                "limit":       limit,
                "offset":      offset,
        })
}

// EnrollCourse handles POST /api/lms/courses/{courseId}/enroll.
//
// Idempotent: if the student already has any enrollment for the course, the
// existing enrollment is returned (and re-activated if it was previously
// cancelled or expired).
func (h *LMSHandler) EnrollCourse(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        courseIDStr := mux.Vars(r)["courseId"]
        courseID, err := primitive.ObjectIDFromHex(courseIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }

        var course models.Course
        if err := h.db.Courses().FindOne(r.Context(), bson.M{
                "_id":      courseID,
                "tenantId": ctx.TenantID,
        }).Decode(&course); err != nil {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        now := time.Now()

        // Idempotent: re-activate an existing enrollment if one exists.
        var existing models.Enrollment
        err = h.db.Enrollments().FindOne(r.Context(), bson.M{
                "tenantId":  ctx.TenantID,
                "studentId": ctx.UserID,
                "courseId":  courseID,
        }).Decode(&existing)
        if err == nil {
                if existing.Status == models.EnrollmentStatusCancelled || existing.Status == models.EnrollmentStatusExpired {
                        h.db.Enrollments().UpdateByID(r.Context(), existing.ID, bson.M{
                                "$set": bson.M{
                                        "status":         models.EnrollmentStatusActive,
                                        "lastAccessedAt": now,
                                        "updatedAt":      now,
                                },
                        })
                        existing.Status = models.EnrollmentStatusActive
                        existing.UpdatedAt = now
                }
                respondWithJSON(w, http.StatusOK, existing)
                return
        }

        enrollment := models.Enrollment{
                TenantID:       ctx.TenantID,
                CourseID:       courseID,
                StudentID:      ctx.UserID,
                Status:         models.EnrollmentStatusActive,
                ProgressPct:    0,
                LastAccessedAt: &now,
                CreatedAt:      now,
                UpdatedAt:      now,
        }

        result, err := h.db.Enrollments().InsertOne(r.Context(), &enrollment)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to enroll in course")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                enrollment.ID = oid
        }

        // Best-effort: bump the course's enrolledCount.
        h.db.Courses().UpdateByID(r.Context(), courseID, bson.M{
                "$inc": bson.M{"enrolledCount": 1},
        })

        h.emitter.Emit(events.Event{
                Type:      events.EventEnrollmentCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "courseId":  courseID.Hex(),
                        "studentId": ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, enrollment)
}

// ---------------------------------------------------------------------------
// Q&A and Reviews
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListQA(w http.ResponseWriter, r *http.Request)       { h.notImplemented(w, r) }
func (h *LMSHandler) CreateQA(w http.ResponseWriter, r *http.Request)     { h.notImplemented(w, r) }
func (h *LMSHandler) ListReviews(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateReview(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

// ListNotes handles GET /api/lms/notes.
//
// Returns notes owned by the authenticated user. Optional query params:
// ?courseId=, ?lessonId=, ?limit=, ?offset=.
func (h *LMSHandler) ListNotes(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{
                "tenantId":  ctx.TenantID,
                "studentId": ctx.UserID,
        }
        if courseIDStr := r.URL.Query().Get("courseId"); courseIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
                        filter["courseId"] = oid
                }
        }
        if lessonIDStr := r.URL.Query().Get("lessonId"); lessonIDStr != "" {
                if oid, err := primitive.ObjectIDFromHex(lessonIDStr); err == nil {
                        filter["lessonId"] = oid
                }
        }

        limit := parsePositiveInt(r, "limit", 100, 200)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)

        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}})

        cursor, err := h.db.StudentNotes().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch notes")
                return
        }
        defer cursor.Close(r.Context())

        var notes []models.StudentNote
        if err := cursor.All(r.Context(), &notes); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode notes")
                return
        }
        if notes == nil {
                notes = []models.StudentNote{}
        }

        total, _ := h.db.StudentNotes().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "notes":  notes,
                "total":  total,
                "limit":  limit,
                "offset": offset,
        })
}

// CreateNote handles POST /api/lms/notes.
//
// Required body fields: lessonId, body. The courseId is resolved from the
// lesson lookup so callers cannot forge cross-tenant associations.
func (h *LMSHandler) CreateNote(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        var note models.StudentNote
        if err := json.NewDecoder(r.Body).Decode(&note); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if note.LessonID.IsZero() {
                respondWithError(w, http.StatusBadRequest, "lessonId is required")
                return
        }
        if strings.TrimSpace(note.Body) == "" {
                respondWithError(w, http.StatusBadRequest, "body is required")
                return
        }

        var lesson models.Lesson
        if err := h.db.Lessons().FindOne(r.Context(), bson.M{
                "_id":      note.LessonID,
                "tenantId": ctx.TenantID,
        }).Decode(&lesson); err != nil {
                respondWithError(w, http.StatusNotFound, "Lesson not found")
                return
        }

        note.ID = primitive.NilObjectID
        note.TenantID = ctx.TenantID
        note.CourseID = lesson.CourseID
        note.StudentID = ctx.UserID
        now := time.Now()
        note.CreatedAt = now
        note.UpdatedAt = now

        result, err := h.db.StudentNotes().InsertOne(r.Context(), &note)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create note")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                note.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventStudentNoteCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "courseId":  lesson.CourseID.Hex(),
                        "lessonId":  note.LessonID.Hex(),
                        "noteId":    note.ID.Hex(),
                        "studentId": ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, note)
}

// ---------------------------------------------------------------------------
// Categories and Tags
// ---------------------------------------------------------------------------

// ListCategories handles GET /api/lms/categories.
//
// Optional query params: ?parentId=<oid|null>, ?isActive=true.
func (h *LMSHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if parentIDStr := r.URL.Query().Get("parentId"); parentIDStr != "" {
                if parentIDStr == "null" {
                        filter["parentId"] = nil
                } else if oid, err := primitive.ObjectIDFromHex(parentIDStr); err == nil {
                        filter["parentId"] = oid
                }
        }
        if active := r.URL.Query().Get("isActive"); active == "true" {
                filter["isActive"] = true
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}, {Key: "name", Value: 1}})

        cursor, err := h.db.Categories().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch categories")
                return
        }
        defer cursor.Close(r.Context())

        var categories []models.Category
        if err := cursor.All(r.Context(), &categories); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode categories")
                return
        }
        if categories == nil {
                categories = []models.Category{}
        }

        total, _ := h.db.Categories().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "categories": categories,
                "total":      total,
        })
}

// CreateCategory handles POST /api/lms/categories.
func (h *LMSHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        var category models.Category
        if err := json.NewDecoder(r.Body).Decode(&category); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(category.Name) == "" {
                respondWithError(w, http.StatusBadRequest, "name is required")
                return
        }
        if strings.TrimSpace(category.Slug) == "" {
                respondWithError(w, http.StatusBadRequest, "slug is required")
                return
        }

        category.ID = primitive.NilObjectID
        category.TenantID = ctx.TenantID
        now := time.Now()
        category.CreatedAt = now
        category.UpdatedAt = now

        dupCount, err := h.db.Categories().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "slug":     category.Slug,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to verify category slug")
                return
        }
        if dupCount > 0 {
                respondWithError(w, http.StatusConflict, "A category with this slug already exists")
                return
        }

        result, err := h.db.Categories().InsertOne(r.Context(), &category)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create category")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                category.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCategoryCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":   ctx.TenantID.Hex(),
                        "categoryId": category.ID.Hex(),
                        "userId":     ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, category)
}

// ListTags handles GET /api/lms/tags.
//
// Optional query params: ?search= (case-insensitive name match).
func (h *LMSHandler) ListTags(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if search := r.URL.Query().Get("search"); search != "" {
                filter["name"] = bson.M{"$regex": escapeRegexInput(search), "$options": "i"}
        }

        findOpts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})

        cursor, err := h.db.Tags().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch tags")
                return
        }
        defer cursor.Close(r.Context())

        var tags []models.Tag
        if err := cursor.All(r.Context(), &tags); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode tags")
                return
        }
        if tags == nil {
                tags = []models.Tag{}
        }

        total, _ := h.db.Tags().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "tags":  tags,
                "total": total,
        })
}

// CreateTag handles POST /api/lms/tags.
func (h *LMSHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        var tag models.Tag
        if err := json.NewDecoder(r.Body).Decode(&tag); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(tag.Name) == "" {
                respondWithError(w, http.StatusBadRequest, "name is required")
                return
        }
        if strings.TrimSpace(tag.Slug) == "" {
                respondWithError(w, http.StatusBadRequest, "slug is required")
                return
        }

        tag.ID = primitive.NilObjectID
        tag.TenantID = ctx.TenantID
        now := time.Now()
        tag.CreatedAt = now
        tag.UpdatedAt = now

        dupCount, err := h.db.Tags().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "slug":     tag.Slug,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to verify tag slug")
                return
        }
        if dupCount > 0 {
                respondWithError(w, http.StatusConflict, "A tag with this slug already exists")
                return
        }

        result, err := h.db.Tags().InsertOne(r.Context(), &tag)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create tag")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                tag.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventTagCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "tagId":    tag.ID.Hex(),
                        "userId":   ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusCreated, tag)
}

// ---------------------------------------------------------------------------
// Cart, Orders, and Coupons
//
// The cart is modelled as an Order whose Status is the private sentinel
// "cart" (defined below). It is intentionally excluded from the
// ValidOrderStatus enum (which only covers post-checkout states) so the cart
// can be persisted freely without tripping the status-machine validator. The
// cart→order transition is performed in-place by CreateOrder, which flips the
// status to "pending" and stamps a proper order number.
// ---------------------------------------------------------------------------

// orderStatusCart marks an order that is still being assembled by the user.
const orderStatusCart models.OrderStatus = "cart"

// defaultCommissionPct is the instructor revenue share applied when no
// per-request override is supplied. Platform keeps the remainder.
const defaultCommissionPct = 70.0

// findOrCreateCart returns the current user's open cart order, creating an
// empty cart when none yet exists. The cart is always scoped to (tenantID,
// userID, status="cart").
func (h *LMSHandler) findOrCreateCart(r *http.Request, ctx lmsContext) (models.Order, error) {
        var cart models.Order
        err := h.db.Orders().FindOne(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
                "status":   orderStatusCart,
        }).Decode(&cart)
        if err == nil {
                return cart, nil
        }
        now := time.Now()
        cart = models.Order{
                TenantID:    ctx.TenantID,
                UserID:      ctx.UserID,
                OrderNumber: fmt.Sprintf("CART-%s", primitive.NewObjectID().Hex()),
                Items:       []models.OrderItem{},
                Currency:    "USD",
                Status:      orderStatusCart,
                CreatedAt:   now,
                UpdatedAt:   now,
        }
        result, err := h.db.Orders().InsertOne(r.Context(), &cart)
        if err != nil {
                return models.Order{}, err
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                cart.ID = oid
        }
        return cart, nil
}

// recomputeOrderTotals recomputes subtotal/discount/total from the supplied
// order's line items and currently-applied coupon. TaxCents is left as-is
// (the caller is expected to set tax before calling when needed).
func recomputeOrderTotals(order *models.Order) {
        var sub int64
        for i := range order.Items {
                order.Items[i].SubtotalCents = order.Items[i].UnitPriceCents * int64(order.Items[i].Quantity)
                sub += order.Items[i].SubtotalCents
        }
        order.SubtotalCents = sub
        if order.DiscountCents > sub {
                order.DiscountCents = sub
        }
        if order.DiscountCents < 0 {
                order.DiscountCents = 0
        }
        if order.TaxCents < 0 {
                order.TaxCents = 0
        }
        order.TotalCents = sub - order.DiscountCents + order.TaxCents
        if order.TotalCents < 0 {
                order.TotalCents = 0
        }
}

// applyCouponToOrder stamps the coupon onto the order and recomputes the
// discount based on the coupon's discount type. The coupon must already have
// been validated by validateCouponForOrder. Returns the discount in cents.
func applyCouponToOrder(order *models.Order, coupon *models.Coupon) int64 {
        var discount int64
        switch coupon.DiscountType {
        case models.CouponDiscountPercent:
                discount = int64(float64(order.SubtotalCents) * (coupon.DiscountValue / 100.0))
                if coupon.MaxDiscountCents > 0 && discount > coupon.MaxDiscountCents {
                        discount = coupon.MaxDiscountCents
                }
        case models.CouponDiscountFixed:
                discount = int64(coupon.DiscountValue)
        }
        if discount < 0 {
                discount = 0
        }
        if discount > order.SubtotalCents {
                discount = order.SubtotalCents
        }
        order.DiscountCents = discount
        order.CouponID = &coupon.ID
        order.CouponCode = coupon.Code
        return discount
}

// validateCouponForOrder returns ("", true) when the coupon is redeemable
// against the supplied order. Otherwise it returns a human-readable reason
// and false. The user ID is accepted so per-user redemption limits can be
// layered in later (currently a no-op).
func validateCouponForOrder(coupon *models.Coupon, order *models.Order, _ primitive.ObjectID) (string, bool) {
        if !coupon.IsActive {
                return "Coupon is not active", false
        }
        now := time.Now()
        if coupon.StartsAt != nil && now.Before(*coupon.StartsAt) {
                return "Coupon is not yet active", false
        }
        if coupon.ExpiresAt != nil && now.After(*coupon.ExpiresAt) {
                return "Coupon has expired", false
        }
        if coupon.MaxRedemptions > 0 && coupon.RedemptionCount >= coupon.MaxRedemptions {
                return "Coupon redemption limit reached", false
        }
        if coupon.MinOrderCents > 0 && order.SubtotalCents < coupon.MinOrderCents {
                return "Order does not meet coupon minimum", false
        }
        if !coupon.AppliesToAllCourses && len(coupon.CourseIDs) > 0 {
                allowed := make(map[primitive.ObjectID]bool, len(coupon.CourseIDs))
                for _, cid := range coupon.CourseIDs {
                        allowed[cid] = true
                }
                hasMatching := false
                for _, item := range order.Items {
                        if item.ItemType == models.OrderItemTypeCourse && allowed[item.ReferenceID] {
                                hasMatching = true
                                break
                        }
                }
                if !hasMatching {
                        return "Coupon does not apply to any course in your cart", false
                }
        }
        return "", true
}

// ---------------------------------------------------------------------------
// Cart handlers
// ---------------------------------------------------------------------------

// GetCart handles GET /api/lms/cart.
//
// Returns the current user's open cart. An empty cart is created on first
// access so the frontend always has a stable cart document to mutate.
func (h *LMSHandler) GetCart(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        cart, err := h.findOrCreateCart(r, ctx)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
                return
        }
        respondWithJSON(w, http.StatusOK, cart)
}

// AddToCart handles POST /api/lms/cart/items.
//
// Request body: { "courseId": "<hex>", "quantity": 1 }. Resolves the course's
// current price and adds (or increments) a line item on the cart. Adding the
// same course twice increments the quantity rather than creating a duplicate.
func (h *LMSHandler) AddToCart(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        var payload struct {
                CourseID string `json:"courseId"`
                Quantity int    `json:"quantity"`
        }
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        courseID, err := primitive.ObjectIDFromHex(payload.CourseID)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid course ID")
                return
        }
        if payload.Quantity < 1 {
                payload.Quantity = 1
        }

        var course models.Course
        if err := h.db.Courses().FindOne(r.Context(), bson.M{
                "_id":      courseID,
                "tenantId": ctx.TenantID,
        }).Decode(&course); err != nil {
                respondWithError(w, http.StatusNotFound, "Course not found")
                return
        }

        cart, err := h.findOrCreateCart(r, ctx)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
                return
        }

        found := false
        for i := range cart.Items {
                if cart.Items[i].ItemType == models.OrderItemTypeCourse && cart.Items[i].ReferenceID == courseID {
                        cart.Items[i].Quantity += payload.Quantity
                        found = true
                        break
                }
        }
        if !found {
                cart.Items = append(cart.Items, models.OrderItem{
                        ID:             primitive.NewObjectID(),
                        ItemType:       models.OrderItemTypeCourse,
                        ReferenceID:    courseID,
                        Title:          course.Title,
                        UnitPriceCents: course.PriceCents,
                        Quantity:       payload.Quantity,
                })
        }

        recomputeOrderTotals(&cart)
        now := time.Now()
        if _, err := h.db.Orders().UpdateByID(r.Context(), cart.ID, bson.M{
                "$set": bson.M{
                        "items":         cart.Items,
                        "subtotalCents": cart.SubtotalCents,
                        "discountCents": cart.DiscountCents,
                        "totalCents":    cart.TotalCents,
                        "updatedAt":     now,
                },
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update cart")
                return
        }
        cart.UpdatedAt = now

        respondWithJSON(w, http.StatusOK, cart)
}

// RemoveFromCart handles DELETE /api/lms/cart/items/{itemId}.
func (h *LMSHandler) RemoveFromCart(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        itemIDStr := mux.Vars(r)["itemId"]
        itemID, err := primitive.ObjectIDFromHex(itemIDStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid item ID")
                return
        }

        cart, err := h.findOrCreateCart(r, ctx)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
                return
        }

        var kept []models.OrderItem
        found := false
        for _, item := range cart.Items {
                if item.ID == itemID {
                        found = true
                        continue
                }
                kept = append(kept, item)
        }
        if !found {
                respondWithError(w, http.StatusNotFound, "Cart item not found")
                return
        }
        if kept == nil {
                kept = []models.OrderItem{}
        }
        cart.Items = kept
        recomputeOrderTotals(&cart)
        now := time.Now()
        if _, err := h.db.Orders().UpdateByID(r.Context(), cart.ID, bson.M{
                "$set": bson.M{
                        "items":         cart.Items,
                        "subtotalCents": cart.SubtotalCents,
                        "discountCents": cart.DiscountCents,
                        "totalCents":    cart.TotalCents,
                        "updatedAt":     now,
                },
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update cart")
                return
        }
        cart.UpdatedAt = now

        respondWithJSON(w, http.StatusOK, cart)
}

// ClearCart handles DELETE /api/lms/cart.
//
// Empties all line items and detaches any previously-applied coupon. The cart
// document itself is preserved so subsequent AddToCart calls reuse the same
// cart ID.
func (h *LMSHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        cart, err := h.findOrCreateCart(r, ctx)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
                return
        }
        cart.Items = []models.OrderItem{}
        cart.DiscountCents = 0
        cart.CouponID = nil
        cart.CouponCode = ""
        cart.TaxCents = 0
        recomputeOrderTotals(&cart)
        now := time.Now()
        if _, err := h.db.Orders().UpdateByID(r.Context(), cart.ID, bson.M{
                "$set": bson.M{
                        "items":         cart.Items,
                        "subtotalCents": cart.SubtotalCents,
                        "discountCents": cart.DiscountCents,
                        "couponId":      nil,
                        "couponCode":    "",
                        "taxCents":      cart.TaxCents,
                        "totalCents":    cart.TotalCents,
                        "updatedAt":     now,
                },
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to clear cart")
                return
        }
        cart.UpdatedAt = now

        respondWithJSON(w, http.StatusOK, cart)
}

// ---------------------------------------------------------------------------
// Order handlers
// ---------------------------------------------------------------------------

// ListOrders handles GET /api/lms/orders.
//
// Lists the authenticated user's orders, excluding the in-progress cart.
// Optional query params: ?status=pending|paid|failed|refunded|canceled,
// ?limit=, ?offset=.
func (h *LMSHandler) ListOrders(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        filter := bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
                "status":   bson.M{"$ne": orderStatusCart},
        }
        if status := r.URL.Query().Get("status"); status != "" {
                filter["status"] = models.OrderStatus(status)
        }

        limit := parsePositiveInt(r, "limit", 50, 100)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)
        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}})

        cursor, err := h.db.Orders().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch orders")
                return
        }
        defer cursor.Close(r.Context())

        var orders []models.Order
        if err := cursor.All(r.Context(), &orders); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode orders")
                return
        }
        if orders == nil {
                orders = []models.Order{}
        }
        total, _ := h.db.Orders().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "orders": orders,
                "total":  total,
                "limit":  limit,
                "offset": offset,
        })
}

// GetOrder handles GET /api/lms/orders/{id}.
//
// Returns a single order (with line items) scoped to the current user.
func (h *LMSHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid order ID")
                return
        }
        var order models.Order
        err = h.db.Orders().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
        }).Decode(&order)
        if err != nil {
                respondWithError(w, http.StatusNotFound, "Order not found")
                return
        }
        respondWithJSON(w, http.StatusOK, order)
}

// CreateOrder handles POST /api/lms/orders.
//
// Converts the current user's cart into a real order (status="pending").
// Optional request body fields: { "couponCode": "...", "paymentMethod": "...",
// "notes": "..." }. The cart document is mutated in-place — its status flips
// to "pending", a proper order number is stamped, and the next AddToCart call
// will spin up a fresh cart.
func (h *LMSHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        var payload struct {
                CouponCode    string `json:"couponCode"`
                PaymentMethod string `json:"paymentMethod"`
                Notes         string `json:"notes"`
        }
        // Body is optional; ignore decode errors when the body is empty.
        _ = json.NewDecoder(r.Body).Decode(&payload)

        cart, err := h.findOrCreateCart(r, ctx)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
                return
        }
        if len(cart.Items) == 0 {
                respondWithError(w, http.StatusBadRequest, "Cart is empty")
                return
        }

        // Reset any previously-applied coupon so a fresh validate+apply cycle
        // runs against the current cart contents.
        cart.DiscountCents = 0
        cart.CouponID = nil
        cart.CouponCode = ""

        if strings.TrimSpace(payload.CouponCode) != "" {
                var coupon models.Coupon
                if err := h.db.Coupons().FindOne(r.Context(), bson.M{
                        "tenantId": ctx.TenantID,
                        "code":     strings.ToUpper(strings.TrimSpace(payload.CouponCode)),
                }).Decode(&coupon); err != nil {
                        respondWithError(w, http.StatusBadRequest, "Coupon not found")
                        return
                }
                if reason, ok := validateCouponForOrder(&coupon, &cart, ctx.UserID); !ok {
                        respondWithError(w, http.StatusBadRequest, reason)
                        return
                }
                applyCouponToOrder(&cart, &coupon)
                h.db.Coupons().UpdateByID(r.Context(), coupon.ID, bson.M{
                        "$inc": bson.M{"redemptionCount": 1},
                })
                h.emitter.Emit(events.Event{
                        Type:      events.EventCouponRedeemed,
                        Timestamp: time.Now(),
                        Data: map[string]interface{}{
                                "tenantId": ctx.TenantID.Hex(),
                                "couponId": coupon.ID.Hex(),
                                "userId":   ctx.UserID.Hex(),
                                "orderId":  cart.ID.Hex(),
                        },
                })
        }

        recomputeOrderTotals(&cart)
        cart.PaymentMethod = payload.PaymentMethod
        cart.Notes = payload.Notes
        cart.OrderNumber = fmt.Sprintf("ORD-%s", primitive.NewObjectID().Hex())
        cart.Status = models.OrderStatusPending
        now := time.Now()
        cart.UpdatedAt = now

        if _, err := h.db.Orders().UpdateByID(r.Context(), cart.ID, bson.M{
                "$set": bson.M{
                        "items":         cart.Items,
                        "subtotalCents": cart.SubtotalCents,
                        "discountCents": cart.DiscountCents,
                        "couponId":      cart.CouponID,
                        "couponCode":    cart.CouponCode,
                        "paymentMethod": cart.PaymentMethod,
                        "notes":         cart.Notes,
                        "orderNumber":   cart.OrderNumber,
                        "status":        cart.Status,
                        "totalCents":    cart.TotalCents,
                        "currency":      cart.Currency,
                        "updatedAt":     now,
                },
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create order")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventOrderCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":   ctx.TenantID.Hex(),
                        "orderId":    cart.ID.Hex(),
                        "userId":     ctx.UserID.Hex(),
                        "totalCents": cart.TotalCents,
                },
        })

        w.Header().Set("Location", "/api/lms/orders/"+cart.ID.Hex())
        respondWithJSON(w, http.StatusCreated, cart)
}

// RefundOrder handles POST /api/lms/orders/{id}/refund.
//
// Transitions a paid order into the refunded state, cancels any enrollments
// tied to the order (status="refunded"), and decrements the affected courses'
// enrolledCount. Only orders in the "paid" state may be refunded.
func (h *LMSHandler) RefundOrder(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid order ID")
                return
        }
        var order models.Order
        if err := h.db.Orders().FindOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        }).Decode(&order); err != nil {
                respondWithError(w, http.StatusNotFound, "Order not found")
                return
        }
        if order.Status != models.OrderStatusPaid {
                respondWithError(w, http.StatusBadRequest, "Only paid orders can be refunded")
                return
        }

        now := time.Now()
        if _, err := h.db.Orders().UpdateByID(r.Context(), id, bson.M{
                "$set": bson.M{
                        "status":     models.OrderStatusRefunded,
                        "refundedAt": now,
                        "updatedAt":  now,
                },
        }); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to refund order")
                return
        }
        order.Status = models.OrderStatusRefunded
        order.RefundedAt = &now
        order.UpdatedAt = now

        // Cancel any enrollments created from this order.
        var courseIDs []primitive.ObjectID
        for _, item := range order.Items {
                if item.ItemType == models.OrderItemTypeCourse {
                        courseIDs = append(courseIDs, item.ReferenceID)
                }
        }
        if len(courseIDs) > 0 {
                _, _ = h.db.Enrollments().UpdateMany(r.Context(), bson.M{
                        "tenantId": ctx.TenantID,
                        "orderId":  id,
                }, bson.M{
                        "$set": bson.M{
                                "status":    models.EnrollmentStatusRefunded,
                                "updatedAt": now,
                        },
                })
                for _, cid := range courseIDs {
                        h.db.Courses().UpdateByID(r.Context(), cid, bson.M{
                                "$inc": bson.M{"enrolledCount": -1},
                        })
                }
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventOrderRefunded,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":   ctx.TenantID.Hex(),
                        "orderId":    id.Hex(),
                        "userId":     order.UserID.Hex(),
                        "refundedBy": ctx.UserID.Hex(),
                        "totalCents": order.TotalCents,
                },
        })

        respondWithJSON(w, http.StatusOK, order)
}

// ---------------------------------------------------------------------------
// Coupon handlers
// ---------------------------------------------------------------------------

// ListCoupons handles GET /api/lms/coupons.
//
// Returns the tenant's coupons. Optional query params: ?active=true|false,
// ?code=<exact>, ?limit=, ?offset=.
func (h *LMSHandler) ListCoupons(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        filter := bson.M{"tenantId": ctx.TenantID}
        if active := r.URL.Query().Get("active"); active != "" {
                filter["isActive"] = active == "true"
        }
        if code := r.URL.Query().Get("code"); code != "" {
                filter["code"] = strings.ToUpper(code)
        }

        limit := parsePositiveInt(r, "limit", 50, 100)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)
        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}})

        cursor, err := h.db.Coupons().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch coupons")
                return
        }
        defer cursor.Close(r.Context())

        var coupons []models.Coupon
        if err := cursor.All(r.Context(), &coupons); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode coupons")
                return
        }
        if coupons == nil {
                coupons = []models.Coupon{}
        }
        total, _ := h.db.Coupons().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "coupons": coupons,
                "total":   total,
                "limit":   limit,
                "offset":  offset,
        })
}

// CreateCoupon handles POST /api/lms/coupons.
//
// Required body fields: code, discountType (percent|fixed), discountValue.
// Coupon codes are upper-cased and must be unique within the tenant.
// IsActive defaults to true; all other optional fields default to zero/empty.
func (h *LMSHandler) CreateCoupon(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        var coupon models.Coupon
        if err := json.NewDecoder(r.Body).Decode(&coupon); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(coupon.Code) == "" {
                respondWithError(w, http.StatusBadRequest, "code is required")
                return
        }
        if !models.ValidCouponDiscountType(coupon.DiscountType) {
                respondWithError(w, http.StatusBadRequest, "invalid discountType (use 'percent' or 'fixed')")
                return
        }
        if coupon.DiscountValue <= 0 {
                respondWithError(w, http.StatusBadRequest, "discountValue must be positive")
                return
        }
        if coupon.DiscountType == models.CouponDiscountPercent && coupon.DiscountValue > 100 {
                respondWithError(w, http.StatusBadRequest, "percent discountValue cannot exceed 100")
                return
        }

        coupon.Code = strings.ToUpper(strings.TrimSpace(coupon.Code))
        coupon.ID = primitive.NilObjectID
        coupon.TenantID = ctx.TenantID
        coupon.RedemptionCount = 0
        coupon.IsActive = true
        if coupon.CourseIDs == nil {
                coupon.CourseIDs = []primitive.ObjectID{}
        }
        now := time.Now()
        coupon.CreatedAt = now
        coupon.UpdatedAt = now

        existingCount, err := h.db.Coupons().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "code":     coupon.Code,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to verify coupon code")
                return
        }
        if existingCount > 0 {
                respondWithError(w, http.StatusConflict, "A coupon with this code already exists")
                return
        }

        result, err := h.db.Coupons().InsertOne(r.Context(), &coupon)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create coupon")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                coupon.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCouponCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "couponId": coupon.ID.Hex(),
                        "code":     coupon.Code,
                        "userId":   ctx.UserID.Hex(),
                },
        })

        w.Header().Set("Location", "/api/lms/coupons/"+coupon.ID.Hex())
        respondWithJSON(w, http.StatusCreated, coupon)
}

// ValidateCoupon handles POST /api/lms/coupons/validate.
//
// Request body: { "code": "SAVE20", "orderSubtotalCents": 10000, "courseIds":
// ["...","..."] }. Returns { "valid": true, "coupon": {...},
// "discountCents": 2000, "subtotalCents": 10000, "totalCents": 8000 } on
// success, or { "valid": false, "reason": "..." } when the coupon cannot be
// applied.
func (h *LMSHandler) ValidateCoupon(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        var payload struct {
                Code               string   `json:"code"`
                OrderSubtotalCents int64    `json:"orderSubtotalCents"`
                CourseIDs          []string `json:"courseIds"`
        }
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if strings.TrimSpace(payload.Code) == "" {
                respondWithError(w, http.StatusBadRequest, "code is required")
                return
        }

        var coupon models.Coupon
        err := h.db.Coupons().FindOne(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "code":     strings.ToUpper(strings.TrimSpace(payload.Code)),
        }).Decode(&coupon)
        if err != nil {
                respondWithJSON(w, http.StatusOK, map[string]interface{}{
                        "valid":  false,
                        "reason": "Coupon not found",
                })
                return
        }

        // Build a synthetic order to reuse the validation helper.
        synthetic := models.Order{SubtotalCents: payload.OrderSubtotalCents}
        for _, cidStr := range payload.CourseIDs {
                if cid, err := primitive.ObjectIDFromHex(cidStr); err == nil {
                        synthetic.Items = append(synthetic.Items, models.OrderItem{
                                ItemType:    models.OrderItemTypeCourse,
                                ReferenceID: cid,
                        })
                }
        }
        if reason, ok := validateCouponForOrder(&coupon, &synthetic, ctx.UserID); !ok {
                respondWithJSON(w, http.StatusOK, map[string]interface{}{
                        "valid":  false,
                        "reason": reason,
                })
                return
        }

        var discount int64
        switch coupon.DiscountType {
        case models.CouponDiscountPercent:
                discount = int64(float64(payload.OrderSubtotalCents) * (coupon.DiscountValue / 100.0))
                if coupon.MaxDiscountCents > 0 && discount > coupon.MaxDiscountCents {
                        discount = coupon.MaxDiscountCents
                }
        case models.CouponDiscountFixed:
                discount = int64(coupon.DiscountValue)
        }
        if discount < 0 {
                discount = 0
        }
        if payload.OrderSubtotalCents > 0 && discount > payload.OrderSubtotalCents {
                discount = payload.OrderSubtotalCents
        }

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "valid":         true,
                "coupon":        coupon,
                "discountCents": discount,
                "subtotalCents": payload.OrderSubtotalCents,
                "totalCents":    payload.OrderSubtotalCents - discount,
        })
}

// DeleteCoupon handles DELETE /api/lms/coupons/{id}.
func (h *LMSHandler) DeleteCoupon(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid coupon ID")
                return
        }
        result, err := h.db.Coupons().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete coupon")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Coupon not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventCouponUpdated,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId": ctx.TenantID.Hex(),
                        "couponId": id.Hex(),
                        "userId":   ctx.UserID.Hex(),
                        "action":   "deleted",
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Coupon deleted",
                "id":      id.Hex(),
        })
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListCertificates(w http.ResponseWriter, r *http.Request)          { h.notImplemented(w, r) }
func (h *LMSHandler) CreateCertificateTemplate(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Bundles and Memberships
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListBundles(w http.ResponseWriter, r *http.Request)     { h.notImplemented(w, r) }
func (h *LMSHandler) CreateBundle(w http.ResponseWriter, r *http.Request)    { h.notImplemented(w, r) }
func (h *LMSHandler) ListMemberships(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) CreateMembership(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Gifts
// ---------------------------------------------------------------------------

func (h *LMSHandler) CreateGift(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) RedeemGift(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Instructor payouts and earnings
// ---------------------------------------------------------------------------

// ListInstructorPayouts handles GET /api/lms/instructor/payouts.
//
// Lists payouts for the authenticated instructor. Optional query params:
// ?status=pending|approved|paid|failed|canceled, ?limit=, ?offset=.
func (h *LMSHandler) ListInstructorPayouts(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        filter := bson.M{
                "tenantId":     ctx.TenantID,
                "instructorId": ctx.UserID,
        }
        if status := r.URL.Query().Get("status"); status != "" {
                filter["status"] = models.InstructorPayoutStatus(status)
        }

        limit := parsePositiveInt(r, "limit", 50, 100)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)
        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}})

        cursor, err := h.db.InstructorPayouts().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch payouts")
                return
        }
        defer cursor.Close(r.Context())

        var payouts []models.InstructorPayout
        if err := cursor.All(r.Context(), &payouts); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode payouts")
                return
        }
        if payouts == nil {
                payouts = []models.InstructorPayout{}
        }
        total, _ := h.db.InstructorPayouts().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "payouts": payouts,
                "total":   total,
                "limit":   limit,
                "offset":  offset,
        })
}

// CreateInstructorPayout handles POST /api/lms/instructor/payouts.
//
// Request body: { "periodStart": "...", "periodEnd": "...", "commissionPct":
// 70, "paymentMethod": "...", "notes": "..." }. Aggregates all paid orders in
// the supplied period whose items reference one of the instructor's courses,
// computes gross/commission/net, and persists a payout record with status
// "pending".
func (h *LMSHandler) CreateInstructorPayout(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }
        var payload struct {
                PeriodStart   time.Time `json:"periodStart"`
                PeriodEnd     time.Time `json:"periodEnd"`
                CommissionPct float64   `json:"commissionPct"`
                PaymentMethod string    `json:"paymentMethod"`
                Notes         string    `json:"notes"`
        }
        if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if payload.PeriodStart.IsZero() || payload.PeriodEnd.IsZero() {
                respondWithError(w, http.StatusBadRequest, "periodStart and periodEnd are required")
                return
        }
        if payload.PeriodEnd.Before(payload.PeriodStart) {
                respondWithError(w, http.StatusBadRequest, "periodEnd must be after periodStart")
                return
        }
        if payload.CommissionPct <= 0 {
                payload.CommissionPct = defaultCommissionPct
        }
        if payload.CommissionPct > 100 {
                payload.CommissionPct = 100
        }

        // Find instructor's courses within the tenant.
        courseCursor, err := h.db.Courses().Find(r.Context(), bson.M{
                "tenantId":     ctx.TenantID,
                "instructorId": ctx.UserID,
        }, options.Find().SetProjection(bson.M{"_id": 1, "title": 1}))
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load instructor courses")
                return
        }
        var courses []models.Course
        if err := courseCursor.All(r.Context(), &courses); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode instructor courses")
                return
        }
        if len(courses) == 0 {
                respondWithError(w, http.StatusBadRequest, "Instructor has no courses")
                return
        }
        courseSet := make(map[primitive.ObjectID]bool, len(courses))
        for _, c := range courses {
                courseSet[c.ID] = true
        }

        // Find paid orders in the period. paidAt is set when the order
        // transitioned to "paid" (typically by a payment webhook); we use it
        // as the earnings timestamp.
        orderCursor, err := h.db.Orders().Find(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "status":   models.OrderStatusPaid,
                "paidAt":   bson.M{"$gte": payload.PeriodStart, "$lte": payload.PeriodEnd},
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load paid orders")
                return
        }
        var orders []models.Order
        if err := orderCursor.All(r.Context(), &orders); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode paid orders")
                return
        }

        var gross int64
        var orderIDs []primitive.ObjectID
        for _, o := range orders {
                matched := false
                for _, item := range o.Items {
                        if item.ItemType == models.OrderItemTypeCourse && courseSet[item.ReferenceID] {
                                gross += item.SubtotalCents
                                matched = true
                        }
                }
                if matched {
                        orderIDs = append(orderIDs, o.ID)
                }
        }
        if orderIDs == nil {
                orderIDs = []primitive.ObjectID{}
        }

        commission := int64(float64(gross) * payload.CommissionPct / 100.0)
        var fee int64 // 0 for v1; platform fee can be layered in later.
        net := commission - fee
        if net < 0 {
                net = 0
        }

        now := time.Now()
        payout := models.InstructorPayout{
                TenantID:        ctx.TenantID,
                InstructorID:    ctx.UserID,
                PeriodStart:     payload.PeriodStart,
                PeriodEnd:       payload.PeriodEnd,
                OrderIDs:        orderIDs,
                GrossCents:      gross,
                CommissionPct:   payload.CommissionPct,
                CommissionCents: commission,
                FeeCents:        fee,
                NetCents:        net,
                Currency:        "USD",
                Status:          models.InstructorPayoutStatusPending,
                PaymentMethod:   payload.PaymentMethod,
                Notes:           payload.Notes,
                CreatedAt:       now,
                UpdatedAt:       now,
        }
        result, err := h.db.InstructorPayouts().InsertOne(r.Context(), &payout)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create payout")
                return
        }
        if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
                payout.ID = oid
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventInstructorPayoutCreated,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":     ctx.TenantID.Hex(),
                        "payoutId":     payout.ID.Hex(),
                        "instructorId": ctx.UserID.Hex(),
                        "grossCents":   gross,
                        "netCents":     net,
                },
        })

        w.Header().Set("Location", "/api/lms/instructor/payouts/"+payout.ID.Hex())
        respondWithJSON(w, http.StatusCreated, payout)
}

// GetEarnings handles GET /api/lms/instructor/earnings.
//
// Returns an earnings summary for the authenticated instructor:
//   - totalGrossCents / totalNetCents — aggregated across all paid orders
//     for the instructor's courses.
//   - pendingPayoutCents / paidPayoutCents — aggregated across the
//     instructor's payout records.
//   - availablePayoutCents — net earnings not yet covered by a paid payout.
//   - byCourse — per-course breakdown of gross/net earnings + order count.
func (h *LMSHandler) GetEarnings(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        // Find instructor's courses.
        courseCursor, err := h.db.Courses().Find(r.Context(), bson.M{
                "tenantId":     ctx.TenantID,
                "instructorId": ctx.UserID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load instructor courses")
                return
        }
        var courses []models.Course
        if err := courseCursor.All(r.Context(), &courses); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode instructor courses")
                return
        }
        courseMap := make(map[primitive.ObjectID]models.Course, len(courses))
        for _, c := range courses {
                courseMap[c.ID] = c
        }

        // Aggregate gross/net across all paid orders for the instructor's
        // courses.
        orderCursor, err := h.db.Orders().Find(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "status":   models.OrderStatusPaid,
        }, options.Find().SetSort(bson.D{{Key: "paidAt", Value: -1}}))
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load paid orders")
                return
        }
        var orders []models.Order
        if err := orderCursor.All(r.Context(), &orders); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode paid orders")
                return
        }

        type courseEarning struct {
                CourseID   primitive.ObjectID `json:"courseId"`
                Title      string             `json:"title"`
                GrossCents int64              `json:"grossCents"`
                NetCents   int64              `json:"netCents"`
                OrderCount int                `json:"orderCount"`
        }
        byCourse := make(map[primitive.ObjectID]*courseEarning)
        var totalGross, totalNet int64
        for _, o := range orders {
                seenInOrder := make(map[primitive.ObjectID]bool)
                for _, item := range o.Items {
                        if item.ItemType != models.OrderItemTypeCourse {
                                continue
                        }
                        course, isInstr := courseMap[item.ReferenceID]
                        if !isInstr {
                                continue
                        }
                        ce, ok := byCourse[item.ReferenceID]
                        if !ok {
                                ce = &courseEarning{
                                        CourseID: item.ReferenceID,
                                        Title:    course.Title,
                                }
                                byCourse[item.ReferenceID] = ce
                        }
                        if !seenInOrder[item.ReferenceID] {
                                seenInOrder[item.ReferenceID] = true
                                ce.OrderCount++
                        }
                        ce.GrossCents += item.SubtotalCents
                        ce.NetCents += int64(float64(item.SubtotalCents) * defaultCommissionPct / 100.0)
                        totalGross += item.SubtotalCents
                        totalNet += int64(float64(item.SubtotalCents) * defaultCommissionPct / 100.0)
                }
        }
        byCourseList := make([]*courseEarning, 0, len(byCourse))
        for _, ce := range byCourse {
                byCourseList = append(byCourseList, ce)
        }

        // Aggregate payout records.
        payoutCursor, err := h.db.InstructorPayouts().Find(r.Context(), bson.M{
                "tenantId":     ctx.TenantID,
                "instructorId": ctx.UserID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to load payouts")
                return
        }
        var payouts []models.InstructorPayout
        if err := payoutCursor.All(r.Context(), &payouts); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode payouts")
                return
        }
        var pendingPayoutCents, paidPayoutCents, totalPayoutCents int64
        for _, p := range payouts {
                totalPayoutCents += p.NetCents
                switch p.Status {
                case models.InstructorPayoutStatusPending, models.InstructorPayoutStatusApproved:
                        pendingPayoutCents += p.NetCents
                case models.InstructorPayoutStatusPaid:
                        paidPayoutCents += p.NetCents
                }
        }
        available := totalNet - paidPayoutCents
        if available < 0 {
                available = 0
        }

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "totalGrossCents":      totalGross,
                "totalNetCents":        totalNet,
                "pendingPayoutCents":   pendingPayoutCents,
                "paidPayoutCents":      paidPayoutCents,
                "totalPayoutCents":     totalPayoutCents,
                "availablePayoutCents": available,
                "commissionPct":        defaultCommissionPct,
                "byCourse":             byCourseList,
        })
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

// ListNotifications handles GET /api/lms/notifications.
//
// Returns notifications addressed to the authenticated user. Optional query
// params: ?unreadOnly=true, ?type=<notificationType>, ?limit=, ?offset=.
func (h *LMSHandler) ListNotifications(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        filter := bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
        }
        if r.URL.Query().Get("unreadOnly") == "true" {
                filter["isRead"] = false
        }
        if ntype := r.URL.Query().Get("type"); ntype != "" {
                filter["type"] = models.NotificationType(ntype)
        }

        limit := parsePositiveInt(r, "limit", 50, 200)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)

        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: -1}})

        cursor, err := h.db.Notifications().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch notifications")
                return
        }
        defer cursor.Close(r.Context())

        var notifications []models.Notification
        if err := cursor.All(r.Context(), &notifications); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode notifications")
                return
        }
        if notifications == nil {
                notifications = []models.Notification{}
        }

        total, _ := h.db.Notifications().CountDocuments(r.Context(), filter)
        unreadCount, _ := h.db.Notifications().CountDocuments(r.Context(), bson.M{
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
                "isRead":   false,
        })

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "notifications": notifications,
                "total":         total,
                "unreadCount":   unreadCount,
                "limit":         limit,
                "offset":        offset,
        })
}

// MarkNotificationRead handles POST /api/lms/notifications/{id}/read.
func (h *LMSHandler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireLMSContext(w, r)
        if !ok {
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid notification ID")
                return
        }

        now := time.Now()
        result, err := h.db.Notifications().UpdateOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
                "userId":   ctx.UserID,
        }, bson.M{
                "$set": bson.M{
                        "isRead":    true,
                        "readAt":    now,
                        "updatedAt": now,
                },
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to mark notification as read")
                return
        }
        if result.MatchedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Notification not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventNotificationRead,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":       ctx.TenantID.Hex(),
                        "userId":         ctx.UserID.Hex(),
                        "notificationId": id.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message":        "Notification marked as read",
                "notificationId": id.Hex(),
        })
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

func (h *LMSHandler) GetCalendar(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListMigrations(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateMigration(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Addons
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListAddons(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) ToggleAddon(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// parsePositiveInt reads a positive integer query parameter, falling back to
// the supplied default when missing/invalid, and clamping to maxVal.
func parsePositiveInt(r *http.Request, key string, defaultVal, maxVal int) int {
        raw := r.URL.Query().Get(key)
        if raw == "" {
                return defaultVal
        }
        n, err := strconv.Atoi(raw)
        if err != nil || n < 0 {
                return defaultVal
        }
        if n > maxVal {
                return maxVal
        }
        return n
}
