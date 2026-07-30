package events

// ---------------------------------------------------------------------------
// Reports + TutorAI + Migration event type constants (Phase 6)
//
// These mirror the convention used in lms_events.go, ecommerce_events.go,
// proauthoring_events.go, and proengagement_events.go: dotted lowercase
// strings grouped by resource. Each constant is an EventType value so it can
// be passed directly to Emitter.Emit(Event{...}).
//
// NOTE on overlap with lms_events.go: the four legacy migration event names
// that target the simpler Migration struct in lms.go are ALREADY declared in
// lms_events.go and are intentionally NOT re-declared here:
//
//	EventMigrationStarted  ("migration.started")   -- lms_events.go
//	EventMigrationProgress ("migration.progress")  -- lms_events.go
//	EventMigrationComplete ("migration.complete")  -- lms_events.go
//	EventMigrationFailed   ("migration.failed")    -- lms_events.go
//
// The Phase 6 migration constants below use the "migration.job_*" and
// "migration.batch_completed" namespaces to target the richer MigrationJob
// struct (per-entity counters, cancellation, batch progress) without
// colliding with the legacy events.
// ---------------------------------------------------------------------------

const (
	// --- Reports ---
	EventReportGenerated EventType = "report.generated"
	EventReportSaved     EventType = "report.saved"
	EventReportScheduled EventType = "report.scheduled"

	// --- TutorAI ---
	EventAIConversationCreated EventType = "ai.conversation_created"
	EventAIMessageSent         EventType = "ai.message_sent"
	EventAIResponseReceived    EventType = "ai.response_received"
	EventAIUsageLimitReached   EventType = "ai.usage_limit_reached"

	// --- Migration (Phase 6 MigrationJob) ---
	// Legacy migration events (migration.started / .progress / .complete /
	// .failed) are declared in lms_events.go and remain valid for the
	// simpler Migration struct. The constants below fire alongside them for
	// the richer MigrationJob lifecycle.
	EventMigrationJobStarted     EventType = "migration.job_started"
	EventMigrationJobCompleted   EventType = "migration.job_completed"
	EventMigrationJobFailed      EventType = "migration.job_failed"
	EventMigrationBatchCompleted EventType = "migration.batch_completed"
)
