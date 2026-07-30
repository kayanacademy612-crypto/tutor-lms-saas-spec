package db

import "go.mongodb.org/mongo-driver/mongo"

// ---------------------------------------------------------------------------
// LMS collection accessors
//
// Each method returns the *mongo.Collection handle for the named LMS
// collection on the active database. The collections are created lazily by
// the MongoDB driver on first write, so there is no need to pre-create them.
// Indexes for the LMS collections are registered separately inside
// MongoDB.ensureIndexes() (see internal/db/mongodb.go).
// ---------------------------------------------------------------------------

// Courses returns the "lms_courses" collection.
func (m *MongoDB) Courses() *mongo.Collection {
	return m.Database.Collection("lms_courses")
}

// Topics returns the "lms_topics" collection.
func (m *MongoDB) Topics() *mongo.Collection {
	return m.Database.Collection("lms_topics")
}

// Lessons returns the "lms_lessons" collection.
func (m *MongoDB) Lessons() *mongo.Collection {
	return m.Database.Collection("lms_lessons")
}

// Quizzes returns the "lms_quizzes" collection.
func (m *MongoDB) Quizzes() *mongo.Collection {
	return m.Database.Collection("lms_quizzes")
}

// Questions returns the "lms_questions" collection.
func (m *MongoDB) Questions() *mongo.Collection {
	return m.Database.Collection("lms_questions")
}

// Assignments returns the "lms_assignments" collection.
func (m *MongoDB) Assignments() *mongo.Collection {
	return m.Database.Collection("lms_assignments")
}

// Enrollments returns the "lms_enrollments" collection.
func (m *MongoDB) Enrollments() *mongo.Collection {
	return m.Database.Collection("lms_enrollments")
}

// LessonProgress returns the "lms_lesson_progress" collection.
func (m *MongoDB) LessonProgress() *mongo.Collection {
	return m.Database.Collection("lms_lesson_progress")
}

// QuizAttempts returns the "lms_quiz_attempts" collection.
func (m *MongoDB) QuizAttempts() *mongo.Collection {
	return m.Database.Collection("lms_quiz_attempts")
}

// AssignmentSubmissions returns the "lms_assignment_submissions" collection.
func (m *MongoDB) AssignmentSubmissions() *mongo.Collection {
	return m.Database.Collection("lms_assignment_submissions")
}

// QAQuestions returns the "lms_qa_questions" collection.
func (m *MongoDB) QAQuestions() *mongo.Collection {
	return m.Database.Collection("lms_qa_questions")
}

// CourseReviews returns the "lms_course_reviews" collection.
func (m *MongoDB) CourseReviews() *mongo.Collection {
	return m.Database.Collection("lms_course_reviews")
}

// StudentNotes returns the "lms_student_notes" collection.
func (m *MongoDB) StudentNotes() *mongo.Collection {
	return m.Database.Collection("lms_student_notes")
}

// Orders returns the "lms_orders" collection.
func (m *MongoDB) Orders() *mongo.Collection {
	return m.Database.Collection("lms_orders")
}

// Coupons returns the "lms_coupons" collection.
func (m *MongoDB) Coupons() *mongo.Collection {
	return m.Database.Collection("lms_coupons")
}

// Certificates returns the "lms_certificates" collection.
func (m *MongoDB) Certificates() *mongo.Collection {
	return m.Database.Collection("lms_certificates")
}

// CertificateTemplates returns the "lms_certificate_templates" collection.
func (m *MongoDB) CertificateTemplates() *mongo.Collection {
	return m.Database.Collection("lms_certificate_templates")
}

// CourseBundles returns the "lms_course_bundles" collection.
func (m *MongoDB) CourseBundles() *mongo.Collection {
	return m.Database.Collection("lms_course_bundles")
}

// Memberships returns the "lms_memberships" collection.
func (m *MongoDB) Memberships() *mongo.Collection {
	return m.Database.Collection("lms_memberships")
}

// CourseGifts returns the "lms_course_gifts" collection.
func (m *MongoDB) CourseGifts() *mongo.Collection {
	return m.Database.Collection("lms_course_gifts")
}

// Notifications returns the "lms_notifications" collection.
func (m *MongoDB) Notifications() *mongo.Collection {
	return m.Database.Collection("lms_notifications")
}

// CalendarEvents returns the "lms_calendar_events" collection.
func (m *MongoDB) CalendarEvents() *mongo.Collection {
	return m.Database.Collection("lms_calendar_events")
}

// Migrations returns the "lms_migrations" collection.
func (m *MongoDB) Migrations() *mongo.Collection {
	return m.Database.Collection("lms_migrations")
}

// Categories returns the "lms_categories" collection.
func (m *MongoDB) Categories() *mongo.Collection {
	return m.Database.Collection("lms_categories")
}

// Tags returns the "lms_tags" collection.
func (m *MongoDB) Tags() *mongo.Collection {
	return m.Database.Collection("lms_tags")
}

// InstructorPayouts returns the "lms_instructor_payouts" collection.
func (m *MongoDB) InstructorPayouts() *mongo.Collection {
	return m.Database.Collection("lms_instructor_payouts")
}

// PaymentGateways returns the "lms_payment_gateways" collection.
func (m *MongoDB) PaymentGateways() *mongo.Collection {
	return m.Database.Collection("lms_payment_gateways")
}

// IntegrationConfigs returns the "lms_integration_configs" collection.
func (m *MongoDB) IntegrationConfigs() *mongo.Collection {
	return m.Database.Collection("lms_integration_configs")
}

// AddonConfigs returns the "lms_addon_configs" collection.
func (m *MongoDB) AddonConfigs() *mongo.Collection {
	return m.Database.Collection("lms_addon_configs")
}

// FeatureFlags returns the "lms_feature_flags" collection.
func (m *MongoDB) FeatureFlags() *mongo.Collection {
	return m.Database.Collection("lms_feature_flags")
}

// ThemeOverrides returns the "lms_theme_overrides" collection.
func (m *MongoDB) ThemeOverrides() *mongo.Collection {
	return m.Database.Collection("lms_theme_overrides")
}

// CustomFields returns the "lms_custom_fields" collection.
func (m *MongoDB) CustomFields() *mongo.Collection {
	return m.Database.Collection("lms_custom_fields")
}
