package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// Pro Engagement models (Phase 5)
//
// These types cover the Pro Engagement feature set that wraps the existing
// Notification / StudentNote / User entities in lms.go and user.go:
//
//   - Gamification: badges, per-student badge awards, point transactions
//     (append-only ledger), and leaderboard entries (tenant + course scope).
//   - Notification preferences: per-user, per-event-type channel toggles
//     (onsite / email / push) plus Web Push API subscription records.
//   - Student accessibility preferences: font size, high contrast, screen
//     reader, reduced motion, dyslexia font, color-blind mode.
//   - Email templates + placeholders: tenant-customisable transactional email
//     bodies and the placeholder catalogue each trigger supports.
//   - Legal consents: per-user, per-consent-type (terms / privacy / marketing
//     / cookies) audit trail with version, IP, and user agent.
//
// Every struct is multi-tenant scoped: it MUST carry TenantID. Timestamps use
// time.Time with both json and bson tags. Field-tag style mirrors lms.go,
// ecommerce.go, and proauthoring.go.
// ---------------------------------------------------------------------------

// === GAMIFICATION ===

// BadgeCriteria is the rule a student must satisfy to earn a Badge. CourseID
// is only populated when the criteria is course-scoped (e.g. "complete this
// specific course"); otherwise it is nil.
type BadgeCriteria struct {
	Type      string              `json:"type" bson:"type"` // course_completed|lessons_completed|quiz_passed|points_earned|streak_days
	Threshold int                 `json:"threshold" bson:"threshold"`
	CourseID  *primitive.ObjectID `json:"courseId,omitempty" bson:"courseId,omitempty"`
}

// Badge is a tenant-scoped achievement definition. Slug is unique per tenant
// so it can be used as a stable identifier in code/UI. PointsReward is the
// bonus points credited to a student when the badge is awarded. Criteria
// defines the rule the engine evaluates.
type Badge struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name         string             `json:"name" bson:"name" validate:"required"`
	Slug         string             `json:"slug" bson:"slug" validate:"required"`
	Description  string             `json:"description,omitempty" bson:"description,omitempty"`
	IconURL      string             `json:"iconUrl,omitempty" bson:"iconUrl,omitempty"`
	Color        string             `json:"color,omitempty" bson:"color,omitempty"` // hex
	PointsReward int                `json:"pointsReward,omitempty" bson:"pointsReward,omitempty"`
	Criteria     BadgeCriteria      `json:"criteria" bson:"criteria" validate:"required"`
	IsActive     bool               `json:"isActive" bson:"isActive"`
	SortOrder    int                `json:"sortOrder,omitempty" bson:"sortOrder,omitempty"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// StudentBadge is the award record linking a student to a badge they have
// earned. A unique compound index on (tenantId, studentId, badgeId) prevents
// duplicate awards; CourseID is populated only when the badge was earned
// inside a course context.
type StudentBadge struct {
	ID        primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	StudentID primitive.ObjectID  `json:"studentId" bson:"studentId" validate:"required"`
	BadgeID   primitive.ObjectID  `json:"badgeId" bson:"badgeId" validate:"required"`
	AwardedAt time.Time           `json:"awardedAt" bson:"awardedAt" validate:"required"`
	CourseID  *primitive.ObjectID `json:"courseId,omitempty" bson:"courseId,omitempty"`
	CreatedAt time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
}

// PointTransaction is the append-only ledger entry for a student's points.
// Points is signed: positive = earned (lesson completed, quiz passed, badge
// earned, course completed), negative = spent (e.g. redeem for a reward).
// ReferenceID points to the originating entity (lesson / quiz / badge).
type PointTransaction struct {
	ID          primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	StudentID   primitive.ObjectID  `json:"studentId" bson:"studentId" validate:"required"`
	Points      int                 `json:"points" bson:"points"`                               // positive=earned, negative=spent
	Reason      string              `json:"reason" bson:"reason" validate:"required"`           // lesson_completed|quiz_passed|badge_earned|course_completed|manual
	ReferenceID *primitive.ObjectID `json:"referenceId,omitempty" bson:"referenceId,omitempty"` // lesson/quiz/badge ID
	CreatedAt   time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
}

// LeaderboardEntry is a denormalised leaderboard row. The engine recomputes
// Rank and TotalPoints periodically and upserts one row per
// (tenantId, studentId, scope, courseId, period). CourseID is nil for
// tenant-scoped entries.
type LeaderboardEntry struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	StudentID     primitive.ObjectID  `json:"studentId" bson:"studentId" validate:"required"`
	StudentName   string              `json:"studentName" bson:"studentName"`
	StudentAvatar string              `json:"studentAvatar,omitempty" bson:"studentAvatar,omitempty"`
	TotalPoints   int                 `json:"totalPoints" bson:"totalPoints"`
	Rank          int                 `json:"rank" bson:"rank"`
	Scope         string              `json:"scope" bson:"scope" validate:"required"` // tenant|course
	CourseID      *primitive.ObjectID `json:"courseId,omitempty" bson:"courseId,omitempty"`
	Period        string              `json:"period,omitempty" bson:"period,omitempty"` // weekly|monthly|alltime
	UpdatedAt     time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === NOTIFICATION PREFERENCES ===

// NotificationPreference is a per-user, per-event-type channel toggle. When
// the dispatcher emits a notification it consults the matching preference row
// (if any) to decide which channels to use; absent a row, tenant defaults
// apply. A unique compound index on (tenantId, userId, eventType) ensures one
// preference row per event type per user.
type NotificationPreference struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID        primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	EventType     string             `json:"eventType" bson:"eventType" validate:"required"` // course_published|lesson_completed|order_paid|etc
	OnsiteEnabled bool               `json:"onsiteEnabled" bson:"onsiteEnabled"`
	EmailEnabled  bool               `json:"emailEnabled" bson:"emailEnabled"`
	PushEnabled   bool               `json:"pushEnabled" bson:"pushEnabled"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// PushSubscription is a Web Push API subscription endpoint owned by a user.
// Keys holds the p256dh + auth secrets required to encrypt push payloads per
// RFC 8291. A user may have multiple subscriptions (one per device/browser);
// setting IsActive=false soft-deletes a subscription without losing audit
// history.
type PushSubscription struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID    primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	Endpoint  string             `json:"endpoint" bson:"endpoint" validate:"required"`
	Keys      map[string]string  `json:"keys" bson:"keys" validate:"required"` // p256dh, auth
	IsActive  bool               `json:"isActive" bson:"isActive"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// === ACCESSIBILITY PREFERENCES ===

// AccessibilityPreferences is the per-user accessibility configuration. One
// row per user (enforced by a unique compound index on (tenantId, userId)).
// All flags are booleans except FontSize and ColorBlindMode, which are
// enumerated strings. The frontend reads these to apply CSS overrides and
// theme tweaks before first paint.
type AccessibilityPreferences struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID         primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	FontSize       string             `json:"fontSize,omitempty" bson:"fontSize,omitempty"` // small|medium|large|xlarge
	HighContrast   bool               `json:"highContrast" bson:"highContrast"`
	ScreenReader   bool               `json:"screenReader" bson:"screenReader"`
	ReducedMotion  bool               `json:"reducedMotion" bson:"reducedMotion"`
	DyslexiaFont   bool               `json:"dyslexiaFont" bson:"dyslexiaFont"`
	ColorBlindMode string             `json:"colorBlindMode,omitempty" bson:"colorBlindMode,omitempty"` // none|protanopia|deuteranopia|tritanopia
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// === EMAIL TEMPLATES ===

// EmailTemplate is a tenant-customisable transactional email body. Trigger
// names the event that fires the email (e.g. order_confirmation,
// course_published). IsDefault=true marks the system-supplied template that
// ships out of the box; tenants clone it (with IsDefault=false) to customise.
// A unique compound index on (tenantId, trigger, language) ensures one
// customised template per (trigger, language) pair per tenant.
type EmailTemplate struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Trigger   string             `json:"trigger" bson:"trigger" validate:"required"` // e.g., order_confirmation, course_published
	Subject   string             `json:"subject" bson:"subject" validate:"required"`
	BodyHTML  string             `json:"bodyHtml" bson:"bodyHtml" validate:"required"`
	BodyText  string             `json:"bodyText,omitempty" bson:"bodyText,omitempty"`
	IsDefault bool               `json:"isDefault" bson:"isDefault"` // system default vs customized
	IsActive  bool               `json:"isActive" bson:"isActive"`
	Language  string             `json:"language,omitempty" bson:"language,omitempty"` // en, es, fr, etc
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// EmailPlaceholder documents a single placeholder ({key}) that may appear in
// an EmailTemplate for a given Trigger. The catalogue is shipped with the
// platform and surfaced in the template editor's "Insert placeholder" UI so
// instructors know which tokens are valid for each trigger.
type EmailPlaceholder struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Trigger     string             `json:"trigger" bson:"trigger" validate:"required"`
	Key         string             `json:"key" bson:"key" validate:"required"` // {student_name}, {course_title}, etc
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	Example     string             `json:"example,omitempty" bson:"example,omitempty"`
}

// === LEGAL CONSENTS ===

// LegalConsent is the audit-trail row for a single user's consent decision.
// Version pins the consent to the document version that was shown (e.g.
// "1.0"), and Granted=false records an explicit revocation. IPAddress and
// UserAgent support GDPR/CCPA compliance reporting. A non-unique compound
// index on (tenantId, userId, consentType) lets the UI list the consent
// history per type.
type LegalConsent struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID      primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	ConsentType string             `json:"consentType" bson:"consentType" validate:"required"` // terms|privacy|marketing|cookies
	Version     string             `json:"version" bson:"version" validate:"required"`         // e.g., "1.0"
	Granted     bool               `json:"granted" bson:"granted"`
	IPAddress   string             `json:"ipAddress,omitempty" bson:"ipAddress,omitempty"`
	UserAgent   string             `json:"userAgent,omitempty" bson:"userAgent,omitempty"`
	GrantedAt   time.Time          `json:"grantedAt" bson:"grantedAt" validate:"required"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}
