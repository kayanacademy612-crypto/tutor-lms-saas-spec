package events

// ---------------------------------------------------------------------------
// Pro Engagement event type constants (Phase 5)
//
// These mirror the convention used in lms_events.go, ecommerce_events.go,
// and proauthoring_events.go: dotted lowercase strings grouped by resource.
// Each constant is an EventType value so it can be passed directly to
// Emitter.Emit(Event{...}).
//
// NOTE on overlap with lms_events.go: two notification lifecycle event names
// that the Phase 5 plan would naturally introduce are ALREADY declared in
// lms_events.go and are intentionally NOT re-declared here:
//
//   - EventNotificationCreated ("notification.created") -- lms_events.go
//   - EventNotificationRead    ("notification.read")    -- lms_events.go
//
// Phase 5 notification handlers should reuse those constants directly. The
// new constants below cover the additional Pro Engagement flows: badge
// awards, point ledger updates, leaderboard recomputation, push subscription
// lifecycle, email template edits, and consent grants/revocations.
// ---------------------------------------------------------------------------

const (
	// --- Gamification ---
	EventBadgeEarned        EventType = "badge.earned"
	EventPointsAwarded      EventType = "points.awarded"
	EventLeaderboardUpdated EventType = "leaderboard.updated"

	// --- Notification preferences / push (extends lms_events.go) ---
	// EventNotificationCreated is defined in lms_events.go ("notification.created").
	// EventNotificationRead is defined in lms_events.go ("notification.read").
	EventNotificationSent       EventType = "notification.sent"
	EventNotificationMarkedRead EventType = "notification.marked_read"
	EventPushSubscribed         EventType = "push.subscribed"
	EventPushUnsubscribed       EventType = "push.unsubscribed"

	// --- Email templates ---
	EventEmailTemplateUpdated EventType = "email_template.updated"
	EventEmailSent            EventType = "email.sent"

	// --- Legal consents ---
	EventConsentGranted EventType = "consent.granted"
	EventConsentRevoked EventType = "consent.revoked"
)
