package db

import "go.mongodb.org/mongo-driver/mongo"

// ---------------------------------------------------------------------------
// Reports + TutorAI + Migration collection accessors (Phase 6)
//
// Each method returns the *mongo.Collection handle for the named Phase 6
// collection on the active database. The collections are created lazily by
// the MongoDB driver on first write, so there is no need to pre-create
// them. Indexes for these collections are registered separately inside
// MongoDB.ensureIndexes() (see internal/db/mongodb.go).
//
// The naming convention follows lms_collections.go, ecommerce_collections.go,
// proauthoring_collections.go, and proengagement_collections.go: receiver is
// *MongoDB, the method is the plural resource name, and the underlying
// collection is "lms_<resource_plural>".
// ---------------------------------------------------------------------------

// ReportSnapshots returns the "lms_report_snapshots" collection.
func (m *MongoDB) ReportSnapshots() *mongo.Collection {
	return m.Database.Collection("lms_report_snapshots")
}

// SavedReports returns the "lms_saved_reports" collection.
func (m *MongoDB) SavedReports() *mongo.Collection {
	return m.Database.Collection("lms_saved_reports")
}

// AIConversations returns the "lms_ai_conversations" collection.
func (m *MongoDB) AIConversations() *mongo.Collection {
	return m.Database.Collection("lms_ai_conversations")
}

// AIMessages returns the "lms_ai_messages" collection.
func (m *MongoDB) AIMessages() *mongo.Collection {
	return m.Database.Collection("lms_ai_messages")
}

// AIUsageStats returns the "lms_ai_usage_stats" collection.
func (m *MongoDB) AIUsageStats() *mongo.Collection {
	return m.Database.Collection("lms_ai_usage_stats")
}

// MigrationJobs returns the "lms_migration_jobs" collection.
func (m *MongoDB) MigrationJobs() *mongo.Collection {
	return m.Database.Collection("lms_migration_jobs")
}

// MigrationLogs returns the "lms_migration_logs" collection.
func (m *MongoDB) MigrationLogs() *mongo.Collection {
	return m.Database.Collection("lms_migration_logs")
}

// MigrationMappings returns the "lms_migration_mappings" collection.
func (m *MongoDB) MigrationMappings() *mongo.Collection {
	return m.Database.Collection("lms_migration_mappings")
}
