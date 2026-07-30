package events

// ---------------------------------------------------------------------------
// Pro Authoring event type constants (Phase 4)
//
// These mirror the convention used in lms_events.go and ecommerce_events.go:
// dotted lowercase strings grouped by resource. Each constant is an EventType
// value so it can be passed directly to Emitter.Emit(Event{...}).
//
// NOTE on overlap with lms_events.go: four event names that the Phase 4 plan
// would naturally introduce are ALREADY declared in lms_events.go and are
// intentionally NOT re-declared here:
//
//   - EventCertificateRevoked           ("certificate.revoked")           -- lms_events.go
//   - EventCertificateTemplateUpdated   ("certificate.template.updated") -- lms_events.go
//   - EventAssignmentSubmitted          ("assignment.submitted")         -- lms_events.go
//   - EventAssignmentGraded             ("assignment.graded")            -- lms_events.go
//
// Phase 4 handlers should reuse those constants directly. The new constants
// below cover the additional Pro Authoring flows: certificate canvas edits,
// certificate assignment / download, drip rules, prerequisite chains,
// multi-instructor course membership, and certificate template duplication.
// ---------------------------------------------------------------------------

const (
	// --- Certificate lifecycle (extends lms_events.go) ---
	EventCertificateUpdated    EventType = "certificate.updated"
	EventCertificateAssigned   EventType = "certificate.assigned"
	EventCertificateDownloaded EventType = "certificate.downloaded"
	// EventCertificateRevoked is defined in lms_events.go ("certificate.revoked").

	// --- Certificate template lifecycle (extends lms_events.go) ---
	// EventCertificateTemplateUpdated is defined in lms_events.go
	// ("certificate.template.updated").
	EventCertificateTemplateDuplicated EventType = "certificate.template.duplicated"

	// --- Certificate canvas editor (layers) ---
	EventCertificateLayerCreated EventType = "certificate.layer.created"
	EventCertificateLayerUpdated EventType = "certificate.layer.updated"

	// --- Drip rules ---
	EventDripRuleCreated EventType = "drip_rule.created"
	EventDripRuleUpdated EventType = "drip_rule.updated"
	EventDripUnlocked    EventType = "drip.unlocked"

	// --- Prerequisite chains ---
	EventPrerequisiteChainCreated EventType = "prerequisite_chain.created"
	EventPrerequisiteCompleted    EventType = "prerequisite.completed"

	// --- Multi-instructor course membership ---
	EventInstructorAddedToCourse     EventType = "instructor.added_to_course"
	EventInstructorRemovedFromCourse EventType = "instructor.removed_from_course"
	EventInstructorRoleChanged       EventType = "instructor.role_changed"

	// --- Assignment grading (extends lms_events.go) ---
	// EventAssignmentSubmitted is defined in lms_events.go ("assignment.submitted").
	// EventAssignmentGraded is defined in lms_events.go ("assignment.graded").
)
