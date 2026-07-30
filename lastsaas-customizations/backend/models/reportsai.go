package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// Reports + TutorAI + Migration models (Phase 6)
//
// These types cover the Phase 6 "Reports + AI + Launch" feature set:
//
//   - Reports: immutable report snapshots (point-in-time KPI captures) and
//     saved reports (re-runnable report configurations optionally driven by
//     a cron schedule).
//   - TutorAI: AI conversations + messages plus daily per-user usage stats
//     so tenants can meter OpenAI/Anthropic spend and enforce quotas.
//   - Migration: detailed migration jobs (extends the existing Migration
//     struct in lms.go with per-entity counters and a richer status enum),
//     per-entity migration logs, and source→target ID mappings for idempotent
//     re-runs and rollback.
//
// Every struct is multi-tenant scoped: it MUST carry TenantID. Timestamps use
// time.Time with both json and bson tags. Field-tag style mirrors lms.go,
// ecommerce.go, proauthoring.go, and proengagement.go.
// ---------------------------------------------------------------------------

// === REPORTS ===

// ReportType enumerates the report categories the platform can generate.
type ReportType string

const (
	ReportTypeOverview    ReportType = "overview"
	ReportTypeSales       ReportType = "sales"
	ReportTypeEnrollments ReportType = "enrollments"
	ReportTypeCompletion  ReportType = "completion"
	ReportTypeCourses     ReportType = "courses"
	ReportTypeStudents    ReportType = "students"
	ReportTypeInstructors ReportType = "instructors"
)

// ReportSnapshot is an immutable point-in-time capture of a report run.
// Summary holds KPI scalars (e.g. {"revenue": 1234, "enrollments": 56});
// Data holds the row-level breakdown the frontend renders as a table or
// chart. A compound index on (tenantId, reportType, createdAt) lets the
// dashboard list the most recent snapshots per type efficiently.
type ReportSnapshot struct {
	ID          primitive.ObjectID       `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID       `json:"tenantId" bson:"tenantId" validate:"required"`
	ReportType  ReportType               `json:"reportType" bson:"reportType" validate:"required"`
	Period      string                   `json:"period,omitempty" bson:"period,omitempty"` // daily|weekly|monthly|quarterly|yearly|custom
	FromDate    time.Time                `json:"fromDate" bson:"fromDate" validate:"required"`
	ToDate      time.Time                `json:"toDate" bson:"toDate" validate:"required"`
	Filters     map[string]interface{}   `json:"filters,omitempty" bson:"filters,omitempty"`
	Summary     map[string]interface{}   `json:"summary,omitempty" bson:"summary,omitempty"` // KPIs
	Data        []map[string]interface{} `json:"data,omitempty" bson:"data,omitempty"`       // rows
	GeneratedBy primitive.ObjectID       `json:"generatedBy" bson:"generatedBy" validate:"required"`
	CreatedAt   time.Time                `json:"createdAt" bson:"createdAt" validate:"required"`
}

// SavedReport is a re-runnable report configuration. Config stores the
// filters / date range / groupings the report builder UI produced.
// ScheduleCron, when set, drives a recurring job that materialises a new
// ReportSnapshot on the cron cadence and emails the recipient list.
type SavedReport struct {
	ID           primitive.ObjectID     `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID     `json:"tenantId" bson:"tenantId" validate:"required"`
	Name         string                 `json:"name" bson:"name" validate:"required"`
	ReportType   ReportType             `json:"reportType" bson:"reportType" validate:"required"`
	Config       map[string]interface{} `json:"config" bson:"config" validate:"required"`             // filters, date range, etc
	ScheduleCron string                 `json:"scheduleCron,omitempty" bson:"scheduleCron,omitempty"` // for scheduled reports
	LastRunAt    *time.Time             `json:"lastRunAt,omitempty" bson:"lastRunAt,omitempty"`
	CreatedBy    primitive.ObjectID     `json:"createdBy" bson:"createdBy" validate:"required"`
	CreatedAt    time.Time              `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt    time.Time              `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === TUTORAI ===

// AIConversation is a single chat thread between a user and the TutorAI
// assistant. Context may carry the active course/lesson IDs so the assistant
// can ground its answers in the material the student is viewing.
// UsageTokens is a denormalised running total for fast quota checks without
// joining AIMessages.
type AIConversation struct {
	ID          primitive.ObjectID     `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID     `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID      primitive.ObjectID     `json:"userId" bson:"userId" validate:"required"`
	Title       string                 `json:"title,omitempty" bson:"title,omitempty"`
	Context     map[string]interface{} `json:"context,omitempty" bson:"context,omitempty"` // course_id, lesson_id, etc
	UsageTokens int                    `json:"usageTokens,omitempty" bson:"usageTokens,omitempty"`
	CreatedAt   time.Time              `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt   time.Time              `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// AIMessageRole enumerates the OpenAI-style chat roles used in AIMessage.
type AIMessageRole string

const (
	AIMessageRoleUser      AIMessageRole = "user"
	AIMessageRoleAssistant AIMessageRole = "assistant"
	AIMessageRoleSystem    AIMessageRole = "system"
)

// AIMessage is a single message in an AIConversation. TokensUsed + Model
// let the metering job attribute cost back to the right AIUsageStats row.
type AIMessage struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	ConversationID primitive.ObjectID `json:"conversationId" bson:"conversationId" validate:"required"`
	Role           AIMessageRole      `json:"role" bson:"role" validate:"required"`
	Content        string             `json:"content" bson:"content" validate:"required"`
	TokensUsed     int                `json:"tokensUsed,omitempty" bson:"tokensUsed,omitempty"`
	Model          string             `json:"model,omitempty" bson:"model,omitempty"` // gpt-4, gpt-3.5-turbo, etc
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// AIUsageStats is the daily per-user usage rollup. A unique compound index on
// (tenantId, userId, date) ensures one row per user per day; the metering job
// upserts it on each AI request. EstimatedCostCents is the dollar cost × 100
// so totals remain integer-safe.
type AIUsageStats struct {
	ID                 primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID           primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID             primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	Date               time.Time          `json:"date" bson:"date" validate:"required"` // YYYY-MM-DD (stored at midnight UTC)
	TotalRequests      int                `json:"totalRequests" bson:"totalRequests"`
	TotalTokens        int                `json:"totalTokens" bson:"totalTokens"`
	EstimatedCostCents int                `json:"estimatedCostCents,omitempty" bson:"estimatedCostCents,omitempty"`
	CreatedAt          time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt          time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === MIGRATION (extends existing Migration struct in lms.go) ===

// MigrationPlatform enumerates the source LMS platforms the migration
// importer can read from. CSV covers ad-hoc spreadsheet imports.
type MigrationPlatform string

const (
	MigrationPlatformLearnDash   MigrationPlatform = "learndash"
	MigrationPlatformLifterLMS   MigrationPlatform = "lifterlms"
	MigrationPlatformLearnPress  MigrationPlatform = "learnpress"
	MigrationPlatformWooCommerce MigrationPlatform = "woocommerce"
	MigrationPlatformTutorLMS    MigrationPlatform = "tutor_lms"
	MigrationPlatformCSV         MigrationPlatform = "csv"
)

// MigrationJobStatus is the lifecycle state of a MigrationJob. It mirrors the
// existing MigrationStatus enum in lms.go but adds a "cancelled" terminal
// state for operator-initiated aborts. The simpler Migration struct in
// lms.go remains for back-compat with the Phase-1 importer.
type MigrationJobStatus string

const (
	MigrationJobPending   MigrationJobStatus = "pending"
	MigrationJobRunning   MigrationJobStatus = "running"
	MigrationJobCompleted MigrationJobStatus = "completed"
	MigrationJobFailed    MigrationJobStatus = "failed"
	MigrationJobCancelled MigrationJobStatus = "cancelled"
)

// MigrationJob extends the existing Migration struct in lms.go with
// per-entity counters (courses / lessons / quizzes / students) and a richer
// status enum that supports cancellation. SourceConfig carries the
// opaque connection parameters (DB DSN, REST API key, uploaded file path,
// etc.) required to read from the source platform. StartedBy records the
// operator who initiated the job for audit.
type MigrationJob struct {
	ID               primitive.ObjectID     `json:"id" bson:"_id,omitempty"`
	TenantID         primitive.ObjectID     `json:"tenantId" bson:"tenantId" validate:"required"`
	Platform         MigrationPlatform      `json:"platform" bson:"platform" validate:"required"`
	Status           MigrationJobStatus     `json:"status" bson:"status" validate:"required"`
	SourceConfig     map[string]interface{} `json:"sourceConfig,omitempty" bson:"sourceConfig,omitempty"` // DB connection, API key, file path, etc
	TotalCourses     int                    `json:"totalCourses,omitempty" bson:"totalCourses,omitempty"`
	TotalLessons     int                    `json:"totalLessons,omitempty" bson:"totalLessons,omitempty"`
	TotalQuizzes     int                    `json:"totalQuizzes,omitempty" bson:"totalQuizzes,omitempty"`
	TotalStudents    int                    `json:"totalStudents,omitempty" bson:"totalStudents,omitempty"`
	MigratedCourses  int                    `json:"migratedCourses,omitempty" bson:"migratedCourses,omitempty"`
	MigratedLessons  int                    `json:"migratedLessons,omitempty" bson:"migratedLessons,omitempty"`
	MigratedQuizzes  int                    `json:"migratedQuizzes,omitempty" bson:"migratedQuizzes,omitempty"`
	MigratedStudents int                    `json:"migratedStudents,omitempty" bson:"migratedStudents,omitempty"`
	ErrorMessage     string                 `json:"errorMessage,omitempty" bson:"errorMessage,omitempty"`
	StartedAt        *time.Time             `json:"startedAt,omitempty" bson:"startedAt,omitempty"`
	CompletedAt      *time.Time             `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	StartedBy        primitive.ObjectID     `json:"startedBy" bson:"startedBy" validate:"required"`
	CreatedAt        time.Time              `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt        time.Time              `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// MigrationLog is an append-only audit row produced during a MigrationJob.
// Level is info|warning|error; Entity + SourceID identify what was being
// processed when the log entry was written; TargetID is populated once the
// entity has been written into our system.
type MigrationLog struct {
	ID        primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	JobID     primitive.ObjectID  `json:"jobId" bson:"jobId" validate:"required"`
	Level     string              `json:"level" bson:"level" validate:"required"`       // info|warning|error
	Entity    string              `json:"entity,omitempty" bson:"entity,omitempty"`     // course|lesson|quiz|student
	SourceID  string              `json:"sourceId,omitempty" bson:"sourceId,omitempty"` // ID in source platform
	TargetID  *primitive.ObjectID `json:"targetId,omitempty" bson:"targetId,omitempty"` // ID in our system
	Message   string              `json:"message" bson:"message" validate:"required"`
	CreatedAt time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
}

// MigrationMapping records the source→target ID translation for each migrated
// entity. A unique compound index on (tenantId, jobId, entityType, sourceId)
// makes re-runs idempotent: the importer checks the mapping before inserting
// and skips entities that already have a target ID.
type MigrationMapping struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	JobID      primitive.ObjectID `json:"jobId" bson:"jobId" validate:"required"`
	EntityType string             `json:"entityType" bson:"entityType" validate:"required"` // course|lesson|quiz|student|instructor
	SourceID   string             `json:"sourceId" bson:"sourceId" validate:"required"`
	TargetID   primitive.ObjectID `json:"targetId" bson:"targetId" validate:"required"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}
