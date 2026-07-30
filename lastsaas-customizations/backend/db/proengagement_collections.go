package db

import "go.mongodb.org/mongo-driver/mongo"

// ---------------------------------------------------------------------------
// Pro Engagement collection accessors (Phase 5)
//
// Each method returns the *mongo.Collection handle for the named Pro
// Engagement collection on the active database. The collections are created
// lazily by the MongoDB driver on first write, so there is no need to
// pre-create them. Indexes for these collections are registered separately
// inside MongoDB.ensureIndexes() (see internal/db/mongodb.go).
//
// The naming convention follows lms_collections.go, ecommerce_collections.go,
// and proauthoring_collections.go: receiver is *MongoDB, the method is the
// plural resource name, and the underlying collection is
// "lms_<resource_plural>".
// ---------------------------------------------------------------------------

// Badges returns the "lms_badges" collection.
func (m *MongoDB) Badges() *mongo.Collection {
	return m.Database.Collection("lms_badges")
}

// StudentBadges returns the "lms_student_badges" collection.
func (m *MongoDB) StudentBadges() *mongo.Collection {
	return m.Database.Collection("lms_student_badges")
}

// PointTransactions returns the "lms_point_transactions" collection.
func (m *MongoDB) PointTransactions() *mongo.Collection {
	return m.Database.Collection("lms_point_transactions")
}

// LeaderboardEntries returns the "lms_leaderboard_entries" collection.
func (m *MongoDB) LeaderboardEntries() *mongo.Collection {
	return m.Database.Collection("lms_leaderboard_entries")
}

// NotificationPreferences returns the "lms_notification_preferences" collection.
func (m *MongoDB) NotificationPreferences() *mongo.Collection {
	return m.Database.Collection("lms_notification_preferences")
}

// PushSubscriptions returns the "lms_push_subscriptions" collection.
func (m *MongoDB) PushSubscriptions() *mongo.Collection {
	return m.Database.Collection("lms_push_subscriptions")
}

// AccessibilityPreferences returns the "lms_accessibility_preferences" collection.
func (m *MongoDB) AccessibilityPreferences() *mongo.Collection {
	return m.Database.Collection("lms_accessibility_preferences")
}

// EmailTemplates returns the "lms_email_templates" collection.
func (m *MongoDB) EmailTemplates() *mongo.Collection {
	return m.Database.Collection("lms_email_templates")
}

// EmailPlaceholders returns the "lms_email_placeholders" collection.
func (m *MongoDB) EmailPlaceholders() *mongo.Collection {
	return m.Database.Collection("lms_email_placeholders")
}

// LegalConsents returns the "lms_legal_consents" collection.
func (m *MongoDB) LegalConsents() *mongo.Collection {
	return m.Database.Collection("lms_legal_consents")
}
