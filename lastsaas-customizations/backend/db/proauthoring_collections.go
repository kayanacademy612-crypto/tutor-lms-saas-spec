package db

import "go.mongodb.org/mongo-driver/mongo"

// ---------------------------------------------------------------------------
// Pro Authoring collection accessors (Phase 4)
//
// Each method returns the *mongo.Collection handle for the named Pro
// Authoring collection on the active database. The collections are created
// lazily by the MongoDB driver on first write, so there is no need to
// pre-create them. Indexes for these collections are registered separately
// inside MongoDB.ensureIndexes() (see internal/db/mongodb.go).
//
// The naming convention follows lms_collections.go and
// ecommerce_collections.go: receiver is *MongoDB, the method is the plural
// resource name, and the underlying collection is "lms_<resource_plural>".
// ---------------------------------------------------------------------------

// CertificateLayers returns the "lms_certificate_layers" collection.
func (m *MongoDB) CertificateLayers() *mongo.Collection {
	return m.Database.Collection("lms_certificate_layers")
}

// CertificateBackdrops returns the "lms_certificate_backdrops" collection.
func (m *MongoDB) CertificateBackdrops() *mongo.Collection {
	return m.Database.Collection("lms_certificate_backdrops")
}

// CertificateMedia returns the "lms_certificate_media" collection.
func (m *MongoDB) CertificateMedia() *mongo.Collection {
	return m.Database.Collection("lms_certificate_media")
}

// DripRules returns the "lms_drip_rules" collection.
func (m *MongoDB) DripRules() *mongo.Collection {
	return m.Database.Collection("lms_drip_rules")
}

// PrerequisiteChains returns the "lms_prerequisite_chains" collection.
func (m *MongoDB) PrerequisiteChains() *mongo.Collection {
	return m.Database.Collection("lms_prerequisite_chains")
}

// CourseInstructors returns the "lms_course_instructors" collection.
func (m *MongoDB) CourseInstructors() *mongo.Collection {
	return m.Database.Collection("lms_course_instructors")
}

// AssignmentGrades returns the "lms_assignment_grades" collection.
func (m *MongoDB) AssignmentGrades() *mongo.Collection {
	return m.Database.Collection("lms_assignment_grades")
}
