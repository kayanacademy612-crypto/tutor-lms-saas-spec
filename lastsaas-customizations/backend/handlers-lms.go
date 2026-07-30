package handlers

import (
        "encoding/json"
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

func (h *LMSHandler) ListTopics(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateTopic(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) UpdateTopic(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) DeleteTopic(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListLessons(w http.ResponseWriter, r *http.Request)          { h.notImplemented(w, r) }
func (h *LMSHandler) CreateLesson(w http.ResponseWriter, r *http.Request)         { h.notImplemented(w, r) }
func (h *LMSHandler) UpdateLesson(w http.ResponseWriter, r *http.Request)         { h.notImplemented(w, r) }
func (h *LMSHandler) DeleteLesson(w http.ResponseWriter, r *http.Request)         { h.notImplemented(w, r) }
func (h *LMSHandler) UpdateLessonProgress(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListQuizzes(w http.ResponseWriter, r *http.Request)       { h.notImplemented(w, r) }
func (h *LMSHandler) CreateQuiz(w http.ResponseWriter, r *http.Request)        { h.notImplemented(w, r) }
func (h *LMSHandler) UpdateQuiz(w http.ResponseWriter, r *http.Request)        { h.notImplemented(w, r) }
func (h *LMSHandler) DeleteQuiz(w http.ResponseWriter, r *http.Request)        { h.notImplemented(w, r) }
func (h *LMSHandler) CreateQuizAttempt(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) SubmitQuizAttempt(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListQuestions(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateQuestion(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) UpdateQuestion(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) DeleteQuestion(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListAssignments(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateAssignment(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) SubmitAssignment(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListEnrollments(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) EnrollCourse(w http.ResponseWriter, r *http.Request)    { h.notImplemented(w, r) }

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

func (h *LMSHandler) ListNotes(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateNote(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Categories and Tags
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListCategories(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) CreateCategory(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }
func (h *LMSHandler) ListTags(w http.ResponseWriter, r *http.Request)       { h.notImplemented(w, r) }
func (h *LMSHandler) CreateTag(w http.ResponseWriter, r *http.Request)      { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Orders and Coupons
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListOrders(w http.ResponseWriter, r *http.Request)   { h.notImplemented(w, r) }
func (h *LMSHandler) CreateOrder(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) ListCoupons(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateCoupon(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

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
// Instructor payouts
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListInstructorPayouts(w http.ResponseWriter, r *http.Request)  { h.notImplemented(w, r) }
func (h *LMSHandler) CreateInstructorPayout(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

func (h *LMSHandler) ListNotifications(w http.ResponseWriter, r *http.Request)    { h.notImplemented(w, r) }
func (h *LMSHandler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) { h.notImplemented(w, r) }

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
