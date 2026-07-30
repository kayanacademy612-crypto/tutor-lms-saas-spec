package events

// LMS event type constants.
//
// These mirror the convention used in emitter.go: dotted lowercase strings
// grouped by resource (course, topic, lesson, quiz, ...). Each constant is
// an EventType value so it can be passed directly to Emitter.Emit(Event{...}).
const (
	// --- Course lifecycle ---
	EventCourseCreated   EventType = "course.created"
	EventCourseUpdated   EventType = "course.updated"
	EventCoursePublished EventType = "course.published"
	EventCourseUnpublished EventType = "course.unpublished"
	EventCourseArchived  EventType = "course.archived"
	EventCourseDeleted   EventType = "course.deleted"
	EventCourseCompleted EventType = "course.completed"

	// --- Topic lifecycle ---
	EventTopicCreated EventType = "topic.created"
	EventTopicUpdated EventType = "topic.updated"
	EventTopicDeleted EventType = "topic.deleted"

	// --- Lesson lifecycle ---
	EventLessonCreated   EventType = "lesson.created"
	EventLessonUpdated   EventType = "lesson.updated"
	EventLessonDeleted   EventType = "lesson.deleted"
	EventLessonViewed    EventType = "lesson.viewed"
	EventLessonCompleted EventType = "lesson.completed"
	EventLessonProgressUpdated EventType = "lesson.progress_updated"

	// --- Quiz lifecycle ---
	EventQuizCreated   EventType = "quiz.created"
	EventQuizUpdated   EventType = "quiz.updated"
	EventQuizDeleted   EventType = "quiz.deleted"
	EventQuizPublished EventType = "quiz.published"

	// --- Quiz attempts ---
	EventQuizAttemptStarted  EventType = "quiz.attempt.started"
	EventQuizAttemptResumed  EventType = "quiz.attempt.resumed"
	EventQuizAttemptSubmitted EventType = "quiz.attempt.submitted"
	EventQuizAttemptGraded   EventType = "quiz.attempt.graded"

	// --- Question lifecycle ---
	EventQuestionCreated EventType = "question.created"
	EventQuestionUpdated EventType = "question.updated"
	EventQuestionDeleted EventType = "question.deleted"

	// --- Assignment lifecycle ---
	EventAssignmentCreated   EventType = "assignment.created"
	EventAssignmentUpdated   EventType = "assignment.updated"
	EventAssignmentDeleted   EventType = "assignment.deleted"
	EventAssignmentSubmitted EventType = "assignment.submitted"
	EventAssignmentGraded    EventType = "assignment.graded"

	// --- Enrollment lifecycle ---
	EventEnrollmentCreated   EventType = "enrollment.created"
	EventEnrollmentCompleted EventType = "enrollment.completed"
	EventEnrollmentExpired   EventType = "enrollment.expired"
	EventEnrollmentCancelled EventType = "enrollment.cancelled"

	// --- Q&A and Reviews ---
	EventQAQuestionAsked    EventType = "qa.question.asked"
	EventQAQuestionAnswered EventType = "qa.question.answered"
	EventReviewSubmitted    EventType = "review.submitted"
	EventReviewApproved     EventType = "review.approved"

	// --- Notes ---
	EventStudentNoteCreated EventType = "note.created"
	EventStudentNoteUpdated EventType = "note.updated"
	EventStudentNoteDeleted EventType = "note.deleted"

	// --- Categories and Tags ---
	EventCategoryCreated EventType = "category.created"
	EventCategoryUpdated EventType = "category.updated"
	EventCategoryDeleted EventType = "category.deleted"
	EventTagCreated      EventType = "tag.created"
	EventTagUpdated      EventType = "tag.updated"
	EventTagDeleted      EventType = "tag.deleted"

	// --- Orders and Coupons ---
	EventOrderCreated    EventType = "order.created"
	EventOrderPaid       EventType = "order.paid"
	EventOrderFailed     EventType = "order.failed"
	EventOrderRefunded   EventType = "order.refunded"
	EventOrderCancelled  EventType = "order.cancelled"
	EventCouponCreated   EventType = "coupon.created"
	EventCouponRedeemed  EventType = "coupon.redeemed"
	EventCouponUpdated   EventType = "coupon.updated"

	// --- Certificates ---
	EventCertificateIssued  EventType = "certificate.issued"
	EventCertificateRevoked EventType = "certificate.revoked"
	EventCertificateTemplateCreated EventType = "certificate.template.created"
	EventCertificateTemplateUpdated EventType = "certificate.template.updated"

	// --- Bundles and Memberships ---
	EventBundleCreated  EventType = "bundle.created"
	EventBundleUpdated  EventType = "bundle.updated"
	EventBundleDeleted  EventType = "bundle.deleted"
	EventMembershipCreated EventType = "membership.created"
	EventMembershipUpdated EventType = "membership.updated"
	EventMembershipDeleted EventType = "membership.deleted"

	// --- Gifts ---
	EventCourseGiftCreated  EventType = "gift.created"
	EventCourseGiftSent     EventType = "gift.sent"
	EventCourseGiftRedeemed EventType = "gift.redeemed"
	EventCourseGiftExpired  EventType = "gift.expired"

	// --- Notifications ---
	EventNotificationCreated EventType = "notification.created"
	EventNotificationRead    EventType = "notification.read"

	// --- Calendar ---
	EventCalendarEventCreated EventType = "calendar.event.created"
	EventCalendarEventUpdated EventType = "calendar.event.updated"
	EventCalendarEventDeleted EventType = "calendar.event.deleted"

	// --- Migrations ---
	EventMigrationStarted  EventType = "migration.started"
	EventMigrationProgress EventType = "migration.progress"
	EventMigrationComplete EventType = "migration.complete"
	EventMigrationFailed   EventType = "migration.failed"

	// --- Instructor payouts ---
	EventInstructorPayoutCreated  EventType = "instructor_payout.created"
	EventInstructorPayoutApproved EventType = "instructor_payout.approved"
	EventInstructorPayoutPaid     EventType = "instructor_payout.paid"

	// --- Addons / Integrations ---
	EventAddonEnabled  EventType = "addon.enabled"
	EventAddonDisabled EventType = "addon.disabled"
	EventIntegrationUpdated EventType = "integration.updated"
)
