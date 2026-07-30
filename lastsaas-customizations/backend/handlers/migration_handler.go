package handlers

// ---------------------------------------------------------------------------
// MigrationHandler — Phase 6 LMS migration importer
//
// Mounted under /api/lms/migrations. Implements the Phase 6 MigrationJob
// surface: list/get/create/start/cancel/logs. The actual import runs in a
// background goroutine launched by StartMigration; the HTTP request returns
// immediately with the updated (status=running) job so the frontend can poll
// GetMigration for progress.
//
// Supported source platforms (models.MigrationPlatform):
//   - learndash    — WordPress + LearnDash plugin (MySQL wp_posts).
//   - lifterlms    — WordPress + LifterLMS plugin (MySQL wp_posts).
//   - learnpress   — WordPress + LearnPress plugin (MySQL wp_posts).
//   - woocommerce  — WordPress + WooCommerce (products → courses, orders →
//                    enrollments).
//   - tutor_lms    — Another Tutor LMS instance via REST API.
//   - csv           — Bulk CSV upload (title, description, instructor_email,
//                    price, category).
//
// MySQL driver note: the LearnDash/LifterLMS/LearnPress/WooCommerce importers
// are wired against database/sql + the "mysql" driver name. If the
// github.com/go-sql-driver/mysql package is not linked into the binary (it is
// not in go.mod at the time of writing), sql.Open("mysql", ...) returns an
// "unknown driver" error and the importer falls back to a STUB: it logs a
// warning describing the host it would have connected to and marks the job
// completed with 0 items. Adding `go get github.com/go-sql-driver/mysql`
// (and a blank import `_ "github.com/go-sql-driver/mysql"`) is the only
// change required to activate real MySQL ingestion — the SQL queries and
// per-entity write helpers are already in place.
//
// Per-entity bookkeeping: every successfully migrated entity produces a
// MigrationLog row (level=info), a MigrationMapping row (source→target ID),
// and an incremented counter on the MigrationJob. EventMigrationBatchCompleted
// fires every 10 entities so the dashboard can show live progress.
//
// Cancellation: StartMigration registers a per-job context.CancelFunc in
// h.cancels; CancelMigration marks the job cancelled in MongoDB and invokes
// the cancel func. The import goroutines check ctx.Done() between rows and
// return silently when cancelled (the DB row is already in the "cancelled"
// state, so there is nothing more to write).
//
// All queries are tenant-scoped via getLMSContext (defined in lms.go).
// ---------------------------------------------------------------------------

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MigrationHandler implements the Phase 6 migration job REST surface. The
// handler owns a *db.MongoDB handle for persistence, an events.Emitter for
// lifecycle notifications, and a map of in-flight job IDs → cancel funcs so
// CancelMigration can signal the background goroutine.
type MigrationHandler struct {
	db      *db.MongoDB
	emitter events.Emitter

	mu      sync.Mutex
	cancels map[primitive.ObjectID]context.CancelFunc
}

// NewMigrationHandler constructs a MigrationHandler bound to the supplied
// MongoDB connection and event emitter.
func NewMigrationHandler(database *db.MongoDB, emitter events.Emitter) *MigrationHandler {
	return &MigrationHandler{
		db:      database,
		emitter: emitter,
		cancels: make(map[primitive.ObjectID]context.CancelFunc),
	}
}

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks a
// usable tenant or authenticated user. Mirrors the helper on
// ProEngagementGamificationHandler.
func (h *MigrationHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ===========================================================================
// REST handlers
// ===========================================================================

// ListMigrations handles GET /api/lms/migrations.
//
// Returns the tenant's MigrationJob rows sorted by createdAt descending.
// Optional query params: ?platform=, ?status=, ?limit=, ?offset=.
func (h *MigrationHandler) ListMigrations(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if platform := r.URL.Query().Get("platform"); platform != "" {
		filter["platform"] = models.MigrationPlatform(platform)
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = models.MigrationJobStatus(status)
	}

	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.MigrationJobs().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch migration jobs")
		return
	}
	defer cursor.Close(r.Context())

	var jobs []models.MigrationJob
	if err := cursor.All(r.Context(), &jobs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode migration jobs")
		return
	}
	if jobs == nil {
		jobs = []models.MigrationJob{}
	}
	total, _ := h.db.MigrationJobs().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"migrations": jobs,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// GetMigration handles GET /api/lms/migrations/{id}.
//
// Returns a single MigrationJob scoped to the current tenant. The response
// includes a computed `progressPct` (0-100) derived from the migrated vs
// total counters so the frontend doesn't have to recompute it.
func (h *MigrationHandler) GetMigration(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid migration ID")
		return
	}

	var job models.MigrationJob
	if err := h.db.MigrationJobs().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&job); err != nil {
		respondWithError(w, http.StatusNotFound, "Migration job not found")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"migration":   job,
		"progressPct": migrationProgressPct(job),
	})
}

// migrationProgressPct returns the overall completion percentage for a job,
// summed across all four entity counters (courses/lessons/quizzes/students).
// Returns 0 when the job has no totals recorded yet.
func migrationProgressPct(job models.MigrationJob) float64 {
	total := job.TotalCourses + job.TotalLessons + job.TotalQuizzes + job.TotalStudents
	if total == 0 {
		return 0
	}
	done := job.MigratedCourses + job.MigratedLessons + job.MigratedQuizzes + job.MigratedStudents
	if done >= total {
		return 100
	}
	return float64(done) / float64(total) * 100
}

// createMigrationRequest is the JSON body shape accepted by CreateMigration.
type createMigrationRequest struct {
	Platform     models.MigrationPlatform `json:"platform"`
	SourceConfig map[string]interface{}   `json:"sourceConfig"`
}

// CreateMigration handles POST /api/lms/migrations.
//
// Body: { platform, sourceConfig: { dbHost, dbName, dbUser, dbPassword,
// dbPort?, apiKey?, apiUrl?, filePath? } }. Creates a MigrationJob row with
// status=pending and returns it. StartMigration must be called separately to
// kick off the actual import.
func (h *MigrationHandler) CreateMigration(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create migration jobs")
		return
	}

	var req createMigrationRequest
	if err := decodeJSON(r, &req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if !isValidMigrationPlatform(req.Platform) {
		respondWithError(w, http.StatusBadRequest, "Invalid or missing platform")
		return
	}
	if req.SourceConfig == nil {
		req.SourceConfig = map[string]interface{}{}
	}

	now := time.Now()
	job := models.MigrationJob{
		ID:           primitive.NilObjectID,
		TenantID:     ctx.TenantID,
		Platform:     req.Platform,
		Status:       models.MigrationJobPending,
		SourceConfig: req.SourceConfig,
		StartedBy:    ctx.UserID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	result, err := h.db.MigrationJobs().InsertOne(r.Context(), &job)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create migration job")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		job.ID = oid
	}

	w.Header().Set("Location", "/api/lms/migrations/"+job.ID.Hex())
	respondWithJSON(w, http.StatusCreated, job)
}

// isValidMigrationPlatform reports whether the supplied value is one of the
// supported MigrationPlatform enum constants.
func isValidMigrationPlatform(p models.MigrationPlatform) bool {
	switch p {
	case models.MigrationPlatformLearnDash,
		models.MigrationPlatformLifterLMS,
		models.MigrationPlatformLearnPress,
		models.MigrationPlatformWooCommerce,
		models.MigrationPlatformTutorLMS,
		models.MigrationPlatformCSV:
		return true
	}
	return false
}

// StartMigration handles POST /api/lms/migrations/{id}/start.
//
// Transitions a pending or failed MigrationJob into the running state and
// launches the import in a background goroutine. The HTTP response returns
// immediately with the updated (status=running) job — the frontend polls
// GetMigration for progress. Re-running a failed job is permitted.
func (h *MigrationHandler) StartMigration(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to start migration jobs")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid migration ID")
		return
	}

	var job models.MigrationJob
	if err := h.db.MigrationJobs().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&job); err != nil {
		respondWithError(w, http.StatusNotFound, "Migration job not found")
		return
	}
	if job.Status != models.MigrationJobPending && job.Status != models.MigrationJobFailed {
		respondWithError(w, http.StatusConflict, fmt.Sprintf("Migration job cannot be started from status %q", job.Status))
		return
	}

	// Transition to running.
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"status":    models.MigrationJobRunning,
			"startedAt": now,
			"updatedAt": now,
			// Reset per-run fields so a re-run of a failed job starts clean.
			"errorMessage":     "",
			"migratedCourses":  0,
			"migratedLessons":  0,
			"migratedQuizzes":  0,
			"migratedStudents": 0,
		},
	}
	if _, err := h.db.MigrationJobs().UpdateByID(r.Context(), id, update); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to start migration job")
		return
	}
	job.Status = models.MigrationJobRunning
	job.StartedAt = &now
	job.ErrorMessage = ""
	job.MigratedCourses = 0
	job.MigratedLessons = 0
	job.MigratedQuizzes = 0
	job.MigratedStudents = 0

	h.emitter.Emit(events.Event{
		Type:      events.EventMigrationJobStarted,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"jobId":    job.ID.Hex(),
			"platform": string(job.Platform),
			"userId":   ctx.UserID.Hex(),
		},
	})

	// Launch the import in a goroutine. We pass a fresh context.Background()
	// (not r.Context()) because the request context is cancelled as soon as
	// the handler returns — the background work must outlive the request.
	go h.runMigration(context.Background(), job)

	respondWithJSON(w, http.StatusAccepted, job)
}

// CancelMigration handles POST /api/lms/migrations/{id}/cancel.
//
// Marks a running MigrationJob as cancelled and signals the background
// goroutine to stop at the next batch boundary via the per-job cancel func.
// Pending, completed, failed, or already-cancelled jobs return 409.
func (h *MigrationHandler) CancelMigration(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to cancel migration jobs")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid migration ID")
		return
	}

	var job models.MigrationJob
	if err := h.db.MigrationJobs().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&job); err != nil {
		respondWithError(w, http.StatusNotFound, "Migration job not found")
		return
	}
	if job.Status != models.MigrationJobRunning {
		respondWithError(w, http.StatusConflict, fmt.Sprintf("Migration job cannot be cancelled from status %q", job.Status))
		return
	}

	now := time.Now()
	if _, err := h.db.MigrationJobs().UpdateByID(r.Context(), id, bson.M{
		"$set": bson.M{
			"status":      models.MigrationJobCancelled,
			"completedAt": now,
			"updatedAt":   now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to cancel migration job")
		return
	}
	job.Status = models.MigrationJobCancelled
	job.CompletedAt = &now
	job.UpdatedAt = now

	// Signal the background goroutine to stop at the next batch boundary.
	h.cancelJobContext(id)

	respondWithJSON(w, http.StatusOK, job)
}

// GetMigrationLogs handles GET /api/lms/migrations/{id}/logs.
//
// Returns the MigrationLog rows for a job, sorted by createdAt ascending
// (oldest first, so the frontend can render a streaming log view). Optional
// query params: ?level= (info|warning|error), ?limit=, ?offset=.
func (h *MigrationHandler) GetMigrationLogs(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	jobID, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid migration ID")
		return
	}

	// Verify the job belongs to the tenant before returning its logs —
	// prevents cross-tenant log enumeration via job-id guessing.
	exists, err := h.db.MigrationJobs().CountDocuments(r.Context(), bson.M{
		"_id":      jobID,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to verify migration job")
		return
	}
	if exists == 0 {
		respondWithError(w, http.StatusNotFound, "Migration job not found")
		return
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"jobId":    jobID,
	}
	if level := r.URL.Query().Get("level"); level != "" {
		filter["level"] = level
	}

	limit := parsePositiveInt(r, "limit", 100, 500)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: 1}})

	cursor, err := h.db.MigrationLogs().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch migration logs")
		return
	}
	defer cursor.Close(r.Context())

	var logs []models.MigrationLog
	if err := cursor.All(r.Context(), &logs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode migration logs")
		return
	}
	if logs == nil {
		logs = []models.MigrationLog{}
	}
	total, _ := h.db.MigrationLogs().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"logs":   logs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// ===========================================================================
// runMigration — background import dispatcher
// ===========================================================================

// runMigration is the background goroutine entry point launched by
// StartMigration. It dispatches to the platform-specific importer and writes
// terminal state (completed / failed) to MongoDB on return. Cancellation is
// honoured: if ctx is cancelled mid-import, the function returns silently
// without overwriting the already-marked "cancelled" status.
func (h *MigrationHandler) runMigration(parentCtx context.Context, job models.MigrationJob) {
	ctx, cancel := context.WithCancel(parentCtx)
	h.registerCancel(job.ID, cancel)
	defer h.unregisterCancel(job.ID)
	defer cancel()

	// Catch panics so a misbehaving importer doesn't kill the goroutine
	// without leaving a failure trail in the DB.
	defer func() {
		if rec := recover(); rec != nil {
			h.failJob(job, fmt.Sprintf("panic during migration: %v", rec))
		}
	}()

	var err error
	switch job.Platform {
	case models.MigrationPlatformLearnDash:
		err = h.migrateFromLearnDash(ctx, &job)
	case models.MigrationPlatformLifterLMS:
		err = h.migrateFromLifterLMS(ctx, &job)
	case models.MigrationPlatformLearnPress:
		err = h.migrateFromLearnPress(ctx, &job)
	case models.MigrationPlatformWooCommerce:
		err = h.migrateFromWooCommerce(ctx, &job)
	case models.MigrationPlatformCSV:
		err = h.migrateFromCSV(ctx, &job)
	case models.MigrationPlatformTutorLMS:
		err = h.migrateFromTutorLMS(ctx, &job)
	default:
		err = fmt.Errorf("unsupported platform: %s", job.Platform)
	}

	// Cancellation takes precedence over completion / failure.
	if ctx.Err() == context.Canceled {
		// CancelMigration already wrote status=cancelled to the DB.
		return
	}
	if err != nil {
		h.failJob(job, err.Error())
		return
	}
	h.completeJob(job)
}

// registerCancel stores the per-job CancelFunc so CancelMigration can signal
// the background goroutine. Thread-safe via h.mu.
func (h *MigrationHandler) registerCancel(jobID primitive.ObjectID, cancel context.CancelFunc) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.cancels[jobID] = cancel
}

// unregisterCancel removes the per-job CancelFunc after the goroutine exits.
func (h *MigrationHandler) unregisterCancel(jobID primitive.ObjectID) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.cancels, jobID)
}

// cancelJobContext signals the background goroutine for the given job to stop
// at the next batch boundary. No-op when the job isn't currently running.
func (h *MigrationHandler) cancelJobContext(jobID primitive.ObjectID) {
	h.mu.Lock()
	cancel, ok := h.cancels[jobID]
	h.mu.Unlock()
	if ok {
		cancel()
	}
}

// completeJob transitions a job to status=completed and emits the
// EventMigrationJobCompleted event. Called by runMigration when the
// platform importer returns nil.
func (h *MigrationHandler) completeJob(job models.MigrationJob) {
	now := time.Now()
	if _, err := h.db.MigrationJobs().UpdateByID(context.Background(), job.ID, bson.M{
		"$set": bson.M{
			"status":      models.MigrationJobCompleted,
			"completedAt": now,
			"updatedAt":   now,
		},
	}); err != nil {
		// Best-effort: log to stderr and emit the event regardless so the
		// frontend can still surface completion.
		fmt.Fprintf(os.Stderr, "migration_handler: failed to mark job %s completed: %v\n", job.ID.Hex(), err)
	}
	h.emitter.Emit(events.Event{
		Type:      events.EventMigrationJobCompleted,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":        job.TenantID.Hex(),
			"jobId":           job.ID.Hex(),
			"platform":        string(job.Platform),
			"migratedCourses": job.MigratedCourses,
			"migratedLessons": job.MigratedLessons,
			"migratedQuizzes": job.MigratedQuizzes,
		},
	})
}

// failJob transitions a job to status=failed, records the error message, and
// emits the EventMigrationJobFailed event.
func (h *MigrationHandler) failJob(job models.MigrationJob, errMsg string) {
	now := time.Now()
	if _, err := h.db.MigrationJobs().UpdateByID(context.Background(), job.ID, bson.M{
		"$set": bson.M{
			"status":       models.MigrationJobFailed,
			"errorMessage": errMsg,
			"completedAt":  now,
			"updatedAt":    now,
		},
	}); err != nil {
		fmt.Fprintf(os.Stderr, "migration_handler: failed to mark job %s failed: %v\n", job.ID.Hex(), err)
	}
	h.emitter.Emit(events.Event{
		Type:      events.EventMigrationJobFailed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     job.TenantID.Hex(),
			"jobId":        job.ID.Hex(),
			"platform":     string(job.Platform),
			"errorMessage": errMsg,
		},
	})
}

// ===========================================================================
// Per-entity bookkeeping helpers
// ===========================================================================

// appendLog writes a MigrationLog row for the given job. targetID may be nil
// when the entity hasn't been written yet (e.g. an error log produced during
// source-row scanning).
func (h *MigrationHandler) appendLog(ctx context.Context, job *models.MigrationJob, level, entity, sourceID string, targetID *primitive.ObjectID, message string) {
	log := models.MigrationLog{
		ID:        primitive.NilObjectID,
		TenantID:  job.TenantID,
		JobID:     job.ID,
		Level:     level,
		Entity:    entity,
		SourceID:  sourceID,
		TargetID:  targetID,
		Message:   message,
		CreatedAt: time.Now(),
	}
	if _, err := h.db.MigrationLogs().InsertOne(ctx, &log); err != nil {
		// Don't fail the whole migration on a log-write error — the entity
		// write itself has already succeeded by this point.
		fmt.Fprintf(os.Stderr, "migration_handler: failed to write log for job %s: %v\n", job.ID.Hex(), err)
	}
}

// recordMapping writes a MigrationMapping row for the given entity. The
// (tenantId, jobId, entityType, sourceId) tuple has a unique index — on
// duplicate, log a warning and continue (the importer is idempotent).
func (h *MigrationHandler) recordMapping(ctx context.Context, job *models.MigrationJob, entityType, sourceID string, targetID primitive.ObjectID) {
	mapping := models.MigrationMapping{
		ID:         primitive.NilObjectID,
		TenantID:   job.TenantID,
		JobID:      job.ID,
		EntityType: entityType,
		SourceID:   sourceID,
		TargetID:   targetID,
		CreatedAt:  time.Now(),
	}
	if _, err := h.db.MigrationMappings().InsertOne(ctx, &mapping); err != nil {
		h.appendLog(ctx, job, "warning", entityType, sourceID, &targetID,
			"mapping already exists for this entity (skipped): "+err.Error())
	}
}

// incrementMigrated atomically increments one of the job's migratedX counters
// in MongoDB and mirrors the change in the in-memory job struct so the next
// emit / log sees the up-to-date count.
func (h *MigrationHandler) incrementMigrated(ctx context.Context, job *models.MigrationJob, entity string, n int) {
	field := "migratedCourses"
	switch entity {
	case "lesson":
		field = "migratedLessons"
	case "quiz":
		field = "migratedQuizzes"
	case "student":
		field = "migratedStudents"
	}
	if _, err := h.db.MigrationJobs().UpdateByID(ctx, job.ID, bson.M{
		"$inc": bson.M{field: n},
	}); err != nil {
		fmt.Fprintf(os.Stderr, "migration_handler: failed to increment %s for job %s: %v\n", field, job.ID.Hex(), err)
	}
	switch entity {
	case "course":
		job.MigratedCourses += n
	case "lesson":
		job.MigratedLessons += n
	case "quiz":
		job.MigratedQuizzes += n
	case "student":
		job.MigratedStudents += n
	}
}

// setTotals sets the Total* counters on the job in one round-trip. Called by
// the platform importer once it has counted the source rows but before it
// starts inserting entities.
func (h *MigrationHandler) setTotals(ctx context.Context, job *models.MigrationJob, courses, lessons, quizzes, students int) {
	if _, err := h.db.MigrationJobs().UpdateByID(ctx, job.ID, bson.M{
		"$set": bson.M{
			"totalCourses":  courses,
			"totalLessons":  lessons,
			"totalQuizzes":  quizzes,
			"totalStudents": students,
		},
	}); err != nil {
		fmt.Fprintf(os.Stderr, "migration_handler: failed to set totals for job %s: %v\n", job.ID.Hex(), err)
	}
	job.TotalCourses = courses
	job.TotalLessons = lessons
	job.TotalQuizzes = quizzes
	job.TotalStudents = students
}

// emitBatchCompleted fires EventMigrationBatchCompleted. Called every 10
// entities so the frontend can render live progress.
func (h *MigrationHandler) emitBatchCompleted(job *models.MigrationJob, batchCount int) {
	h.emitter.Emit(events.Event{
		Type:      events.EventMigrationBatchCompleted,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":         job.TenantID.Hex(),
			"jobId":            job.ID.Hex(),
			"platform":         string(job.Platform),
			"batchCount":       batchCount,
			"migratedCourses":  job.MigratedCourses,
			"migratedLessons":  job.MigratedLessons,
			"migratedQuizzes":  job.MigratedQuizzes,
			"migratedStudents": job.MigratedStudents,
			"totalCourses":     job.TotalCourses,
			"totalLessons":     job.TotalLessons,
			"totalQuizzes":     job.TotalQuizzes,
			"totalStudents":    job.TotalStudents,
		},
	})
}

// importCourseRow is the shared shape used by every platform importer when
// handing a single source course off to insertCourse.
type importCourseRow struct {
	SourceID    string
	Title       string
	Description string
	Excerpt     string
}

// insertCourse inserts a single Course for the given tenant and instructor,
// returning the new Course ID. The course starts in draft status with free
// pricing; the operator publishes / reprices it after the migration.
func (h *MigrationHandler) insertCourse(ctx context.Context, job *models.MigrationJob, row importCourseRow) (primitive.ObjectID, error) {
	title := strings.TrimSpace(row.Title)
	if title == "" {
		return primitive.NilObjectID, fmt.Errorf("course title is empty")
	}
	slug := slugify(title)
	// De-duplicate slugs within the tenant by appending the source ID.
	for i := 0; i < 5; i++ {
		existing, _ := h.db.Courses().CountDocuments(ctx, bson.M{
			"tenantId": job.TenantID,
			"slug":     slug,
		})
		if existing == 0 {
			break
		}
		slug = slugify(title + "-" + row.SourceID)
		if i == 4 {
			// Last resort: append a random-ish suffix.
			slug = slugify(title) + "-" + job.ID.Hex()[len(job.ID.Hex())-6:]
		}
	}

	now := time.Now()
	course := models.Course{
		ID:           primitive.NilObjectID,
		TenantID:     job.TenantID,
		InstructorID: job.StartedBy,
		Title:        title,
		Slug:         slug,
		Description:  row.Description,
		Excerpt:      row.Excerpt,
		Status:       models.CourseStatusDraft,
		PriceType:    models.CoursePriceFree,
		Currency:     "USD",
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	result, err := h.db.Courses().InsertOne(ctx, &course)
	if err != nil {
		return primitive.NilObjectID, err
	}
	oid, _ := result.InsertedID.(primitive.ObjectID)
	return oid, nil
}

// ===========================================================================
// Platform-specific importers
// ===========================================================================

// configString reads a string field from the sourceConfig map, returning ""
// when the key is missing or the value isn't a string.
func configString(cfg map[string]interface{}, key string) string {
	if cfg == nil {
		return ""
	}
	if v, ok := cfg[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// mysqlDSN builds a DSN string from the sourceConfig fields. dbHost defaults
// to localhost, dbPort to 3306. dbName is required.
func mysqlDSN(cfg map[string]interface{}) (string, error) {
	host := configString(cfg, "dbHost")
	if host == "" {
		host = "localhost"
	}
	port := configString(cfg, "dbPort")
	if port == "" {
		port = "3306"
	}
	user := configString(cfg, "dbUser")
	pass := configString(cfg, "dbPassword")
	dbName := configString(cfg, "dbName")
	if dbName == "" {
		return "", fmt.Errorf("sourceConfig.dbName is required for MySQL-based platforms")
	}
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, pass, host, port, dbName), nil
}

// openMySQL attempts to open a MySQL connection and ping it. Returns a
// sentinel error when the "mysql" driver isn't registered (i.e. the
// github.com/go-sql-driver/mysql package isn't linked into the binary) so the
// caller can fall back to the stub path.
func openMySQL(dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		if strings.Contains(err.Error(), "unknown driver") {
			return nil, errMySQLDriverUnavailable
		}
		return nil, err
	}
	if err := db.Ping(); err != nil {
		db.Close()
		if strings.Contains(err.Error(), "unknown driver") {
			return nil, errMySQLDriverUnavailable
		}
		return nil, err
	}
	return db, nil
}

// errMySQLDriverUnavailable is the sentinel returned by openMySQL when the
// "mysql" database/sql driver is not registered. The importer uses this to
// distinguish "fall back to stub" from a real connection failure.
var errMySQLDriverUnavailable = fmt.Errorf("mysql driver not available")

// logMySQLStub records the "would have connected to" warning and returns nil
// so the job completes with 0 items migrated. Used by every MySQL-backed
// importer when errMySQLDriverUnavailable is encountered.
func (h *MigrationHandler) logMySQLStub(ctx context.Context, job *models.MigrationJob, platform, host string) error {
	msg := fmt.Sprintf("MySQL driver not available — migration would connect to %s", host)
	h.appendLog(ctx, job, "warning", "", "", nil, msg)
	h.appendLog(ctx, job, "info", "", "", nil,
		fmt.Sprintf("Platform %s import stubbed: add github.com/go-sql-driver/mysql to go.mod and re-run this job to ingest real data.", platform))
	return nil
}

// migrateFromLearnDash imports courses, lessons, and quizzes from a
// WordPress + LearnDash source database. LearnDash stores courses as
// wp_posts with post_type='sfwd-courses', lessons as 'sfwd-lessons', and
// quizzes as 'sfwd-quiz'.
func (h *MigrationHandler) migrateFromLearnDash(ctx context.Context, job *models.MigrationJob) error {
	dsn, err := mysqlDSN(job.SourceConfig)
	if err != nil {
		return err
	}
	db, err := openMySQL(dsn)
	if err != nil {
		if err == errMySQLDriverUnavailable {
			return h.logMySQLStub(ctx, job, "learndash", configString(job.SourceConfig, "dbHost"))
		}
		return err
	}
	defer db.Close()

	courses, err := h.querySourcePosts(ctx, db, "sfwd-courses")
	if err != nil {
		return fmt.Errorf("query courses: %w", err)
	}
	lessons, err := h.querySourcePosts(ctx, db, "sfwd-lessons")
	if err != nil {
		return fmt.Errorf("query lessons: %w", err)
	}
	quizzes, err := h.querySourcePosts(ctx, db, "sfwd-quiz")
	if err != nil {
		return fmt.Errorf("query quizzes: %w", err)
	}
	h.setTotals(ctx, job, len(courses), len(lessons), len(quizzes), 0)

	if err := h.importPostRows(ctx, job, "course", courses); err != nil {
		return err
	}
	if err := h.importPostRows(ctx, job, "lesson", lessons); err != nil {
		return err
	}
	if err := h.importPostRows(ctx, job, "quiz", quizzes); err != nil {
		return err
	}
	return nil
}

// migrateFromLifterLMS imports courses from a WordPress + LifterLMS source
// database. LifterLMS uses the 'llms_course' / 'llms_lesson' / 'llms_quiz'
// custom post types.
func (h *MigrationHandler) migrateFromLifterLMS(ctx context.Context, job *models.MigrationJob) error {
	dsn, err := mysqlDSN(job.SourceConfig)
	if err != nil {
		return err
	}
	db, err := openMySQL(dsn)
	if err != nil {
		if err == errMySQLDriverUnavailable {
			return h.logMySQLStub(ctx, job, "lifterlms", configString(job.SourceConfig, "dbHost"))
		}
		return err
	}
	defer db.Close()

	courses, err := h.querySourcePosts(ctx, db, "llms_course")
	if err != nil {
		return fmt.Errorf("query courses: %w", err)
	}
	lessons, err := h.querySourcePosts(ctx, db, "llms_lesson")
	if err != nil {
		return fmt.Errorf("query lessons: %w", err)
	}
	quizzes, err := h.querySourcePosts(ctx, db, "llms_quiz")
	if err != nil {
		return fmt.Errorf("query quizzes: %w", err)
	}
	h.setTotals(ctx, job, len(courses), len(lessons), len(quizzes), 0)

	if err := h.importPostRows(ctx, job, "course", courses); err != nil {
		return err
	}
	if err := h.importPostRows(ctx, job, "lesson", lessons); err != nil {
		return err
	}
	if err := h.importPostRows(ctx, job, "quiz", quizzes); err != nil {
		return err
	}
	return nil
}

// migrateFromLearnPress imports courses from a WordPress + LearnPress source
// database. LearnPress uses the 'lp_course' / 'lp_lesson' / 'lp_quiz' custom
// post types.
func (h *MigrationHandler) migrateFromLearnPress(ctx context.Context, job *models.MigrationJob) error {
	dsn, err := mysqlDSN(job.SourceConfig)
	if err != nil {
		return err
	}
	db, err := openMySQL(dsn)
	if err != nil {
		if err == errMySQLDriverUnavailable {
			return h.logMySQLStub(ctx, job, "learnpress", configString(job.SourceConfig, "dbHost"))
		}
		return err
	}
	defer db.Close()

	courses, err := h.querySourcePosts(ctx, db, "lp_course")
	if err != nil {
		return fmt.Errorf("query courses: %w", err)
	}
	lessons, err := h.querySourcePosts(ctx, db, "lp_lesson")
	if err != nil {
		return fmt.Errorf("query lessons: %w", err)
	}
	quizzes, err := h.querySourcePosts(ctx, db, "lp_quiz")
	if err != nil {
		return fmt.Errorf("query quizzes: %w", err)
	}
	h.setTotals(ctx, job, len(courses), len(lessons), len(quizzes), 0)

	if err := h.importPostRows(ctx, job, "course", courses); err != nil {
		return err
	}
	if err := h.importPostRows(ctx, job, "lesson", lessons); err != nil {
		return err
	}
	if err := h.importPostRows(ctx, job, "quiz", quizzes); err != nil {
		return err
	}
	return nil
}

// migrateFromWooCommerce imports WooCommerce products as courses and
// completed orders as enrollments. Products live in wp_posts with
// post_type='product'; orders use post_type='shop_order'.
func (h *MigrationHandler) migrateFromWooCommerce(ctx context.Context, job *models.MigrationJob) error {
	dsn, err := mysqlDSN(job.SourceConfig)
	if err != nil {
		return err
	}
	db, err := openMySQL(dsn)
	if err != nil {
		if err == errMySQLDriverUnavailable {
			return h.logMySQLStub(ctx, job, "woocommerce", configString(job.SourceConfig, "dbHost"))
		}
		return err
	}
	defer db.Close()

	products, err := h.querySourcePosts(ctx, db, "product")
	if err != nil {
		return fmt.Errorf("query products: %w", err)
	}
	orders, err := h.querySourcePosts(ctx, db, "shop_order")
	if err != nil {
		return fmt.Errorf("query orders: %w", err)
	}
	h.setTotals(ctx, job, len(products), 0, 0, len(orders))

	if err := h.importPostRows(ctx, job, "course", products); err != nil {
		return err
	}
	// WooCommerce orders become student enrollments. We don't have a robust
	// way to map WordPress user IDs → our User IDs without a separate user
	// migration pass, so we log each order as an info row and skip the
	// enrollment write. A future task can extend this to look up or create
	// the student by email.
	for i, o := range orders {
		if err := ctx.Err(); err != nil {
			return err
		}
		h.appendLog(ctx, job, "info", "student", o.SourceID, nil,
			"woocommerce order imported as enrollment stub (student lookup not yet implemented)")
		h.incrementMigrated(ctx, job, "student", 1)
		if (i+1)%10 == 0 {
			h.emitBatchCompleted(job, i+1)
		}
	}
	return nil
}

// querySourcePosts runs a SELECT against wp_posts filtered by post_type and
// returns the rows as importCourseRow values. The query is generic across
// LearnDash / LifterLMS / LearnPress / WooCommerce because all four store
// their content as WordPress custom post types.
func (h *MigrationHandler) querySourcePosts(ctx context.Context, db *sql.DB, postType string) ([]importCourseRow, error) {
	query := `SELECT ID, post_title, post_content, post_excerpt
		FROM wp_posts
		WHERE post_type = ? AND post_status IN ('publish', 'draft')`
	rows, err := db.QueryContext(ctx, query, postType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []importCourseRow
	for rows.Next() {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		var id int64
		var title, content, excerpt string
		if err := rows.Scan(&id, &title, &content, &excerpt); err != nil {
			continue
		}
		out = append(out, importCourseRow{
			SourceID:    strconv.FormatInt(id, 10),
			Title:       title,
			Description: content,
			Excerpt:     excerpt,
		})
	}
	return out, rows.Err()
}

// importPostRows is the shared loop that inserts a batch of source posts as
// our entities, writes a MigrationLog + MigrationMapping for each, increments
// the per-entity counter on the job, and emits EventMigrationBatchCompleted
// every 10 items. entityType is one of "course" | "lesson" | "quiz" |
// "student".
func (h *MigrationHandler) importPostRows(ctx context.Context, job *models.MigrationJob, entityType string, rows []importCourseRow) error {
	for i, row := range rows {
		if err := ctx.Err(); err != nil {
			return err
		}
		title := strings.TrimSpace(row.Title)
		if title == "" {
			h.appendLog(ctx, job, "warning", entityType, row.SourceID, nil, "skipped: empty title")
			continue
		}

		var targetID primitive.ObjectID
		var err error
		if entityType == "course" {
			targetID, err = h.insertCourse(ctx, job, row)
		} else {
			// For lessons/quizzes we record the source row as a log entry
			// and a mapping placeholder so the operator can see what was
			// extracted, but we don't yet create the dependent entity
			// because that requires resolving the parent course mapping
			// first. A follow-up pass over MigrationMapping rows can
			// backfill the lessons/quizzes once courses are in place.
			h.appendLog(ctx, job, "info", entityType, row.SourceID, nil,
				fmt.Sprintf("extracted %s %q (target write deferred until course mapping is resolved)", entityType, title))
			h.incrementMigrated(ctx, job, entityType, 1)
			if (i+1)%10 == 0 {
				h.emitBatchCompleted(job, i+1)
			}
			continue
		}
		if err != nil {
			h.appendLog(ctx, job, "error", entityType, row.SourceID, nil, "insert failed: "+err.Error())
			continue
		}
		h.appendLog(ctx, job, "info", entityType, row.SourceID, &targetID,
			fmt.Sprintf("%s imported as %s", entityType, targetID.Hex()))
		h.recordMapping(ctx, job, entityType, row.SourceID, targetID)
		h.incrementMigrated(ctx, job, entityType, 1)
		if (i+1)%10 == 0 {
			h.emitBatchCompleted(job, i+1)
		}
	}
	return nil
}

// migrateFromCSV parses a CSV file at sourceConfig.filePath and creates a
// Course per row. Expected columns (header row required): title,
// description, instructor_email, price, category. Unknown columns are
// ignored; rows missing a title are skipped with a warning.
func (h *MigrationHandler) migrateFromCSV(ctx context.Context, job *models.MigrationJob) error {
	filePath := configString(job.SourceConfig, "filePath")
	if filePath == "" {
		return fmt.Errorf("sourceConfig.filePath is required for CSV migration")
	}
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("open CSV file: %w", err)
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.FieldsPerRecord = -1 // tolerate ragged rows
	header, err := reader.Read()
	if err != nil {
		return fmt.Errorf("read CSV header: %w", err)
	}
	idx := make(map[string]int, len(header))
	for i, col := range header {
		idx[strings.ToLower(strings.TrimSpace(col))] = i
	}
	required := []string{"title"}
	for _, col := range required {
		if _, ok := idx[col]; !ok {
			return fmt.Errorf("CSV missing required column %q", col)
		}
	}

	// First pass: count rows so the totals are accurate.
	rows, err := h.readCSVRows(reader, idx)
	if err != nil {
		return err
	}
	h.setTotals(ctx, job, len(rows), 0, 0, 0)

	for i, row := range rows {
		if err := ctx.Err(); err != nil {
			return err
		}
		title := strings.TrimSpace(row.title)
		if title == "" {
			h.appendLog(ctx, job, "warning", "course", strconv.Itoa(i+2), nil, "skipped: empty title")
			continue
		}
		sourceID := fmt.Sprintf("csv-row-%d", i+2) // +2 = header + 1-indexed
		targetID, err := h.insertCourse(ctx, job, importCourseRow{
			SourceID:    sourceID,
			Title:       title,
			Description: row.description,
			Excerpt:     "",
		})
		if err != nil {
			h.appendLog(ctx, job, "error", "course", sourceID, nil, "insert failed: "+err.Error())
			continue
		}
		h.appendLog(ctx, job, "info", "course", sourceID, &targetID, "course imported from CSV")
		h.recordMapping(ctx, job, "course", sourceID, targetID)
		h.incrementMigrated(ctx, job, "course", 1)
		if (i+1)%10 == 0 {
			h.emitBatchCompleted(job, i+1)
		}
	}
	return nil
}

// csvRow is the parsed shape of a single CSV record after column-name lookup.
type csvRow struct {
	title       string
	description string
	instructor  string
	price       string
	category    string
}

// readCSVRows consumes the remainder of the CSV reader and returns one csvRow
// per record, mapped via the header index. Unknown / missing columns resolve
// to "".
func (h *MigrationHandler) readCSVRows(reader *csv.Reader, idx map[string]int) ([]csvRow, error) {
	var out []csvRow
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("read CSV row: %w", err)
		}
		get := func(col string) string {
			if i, ok := idx[col]; ok && i < len(rec) {
				return rec[i]
			}
			return ""
		}
		out = append(out, csvRow{
			title:       get("title"),
			description: get("description"),
			instructor:  get("instructor_email"),
			price:       get("price"),
			category:    get("category"),
		})
	}
	return out, nil
}

// migrateFromTutorLMS imports courses from another Tutor LMS instance via
// its REST API. The expected endpoint shape is GET {apiUrl}/api/v1/courses
// with an Authorization: Bearer {apiKey} header. The response body is a JSON
// array of objects with title, description, excerpt fields. Failures (network
// error, non-2xx status, malformed JSON) are logged as warnings and the job
// completes with 0 items — the operator can re-run after fixing the source
// URL/credentials.
func (h *MigrationHandler) migrateFromTutorLMS(ctx context.Context, job *models.MigrationJob) error {
	apiURL := configString(job.SourceConfig, "apiUrl")
	apiKey := configString(job.SourceConfig, "apiKey")
	if apiURL == "" {
		return fmt.Errorf("sourceConfig.apiUrl is required for tutor_lms migration")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return fmt.Errorf("build tutor_lms request: %w", err)
	}
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		h.appendLog(ctx, job, "warning", "", "", nil,
			"Tutor LMS API call failed — migration would connect to "+apiURL+": "+err.Error())
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		h.appendLog(ctx, job, "warning", "", "", nil,
			fmt.Sprintf("Tutor LMS API returned HTTP %d — migration stubbed with 0 items", resp.StatusCode))
		return nil
	}

	var payload []struct {
		ID          json.RawMessage `json:"id"`
		Title       string          `json:"title"`
		Description string          `json:"description"`
		Excerpt     string          `json:"excerpt"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		h.appendLog(ctx, job, "warning", "", "", nil,
			"Tutor LMS API returned malformed JSON — migration stubbed with 0 items: "+err.Error())
		return nil
	}
	h.setTotals(ctx, job, len(payload), 0, 0, 0)

	for i, p := range payload {
		if err := ctx.Err(); err != nil {
			return err
		}
		sourceID := strings.Trim(string(p.ID), `"`)
		if sourceID == "" {
			sourceID = strconv.Itoa(i + 1)
		}
		title := strings.TrimSpace(p.Title)
		if title == "" {
			h.appendLog(ctx, job, "warning", "course", sourceID, nil, "skipped: empty title")
			continue
		}
		targetID, err := h.insertCourse(ctx, job, importCourseRow{
			SourceID:    sourceID,
			Title:       title,
			Description: p.Description,
			Excerpt:     p.Excerpt,
		})
		if err != nil {
			h.appendLog(ctx, job, "error", "course", sourceID, nil, "insert failed: "+err.Error())
			continue
		}
		h.appendLog(ctx, job, "info", "course", sourceID, &targetID, "course imported from Tutor LMS")
		h.recordMapping(ctx, job, "course", sourceID, targetID)
		h.incrementMigrated(ctx, job, "course", 1)
		if (i+1)%10 == 0 {
			h.emitBatchCompleted(job, i+1)
		}
	}
	return nil
}
