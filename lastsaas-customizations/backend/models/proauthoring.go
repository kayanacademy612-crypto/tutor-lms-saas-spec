package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// Pro Authoring models (Phase 4)
//
// These types extend the existing lms.go Certificate / CertificateTemplate /
// Assignment / Course entities with the Pro Authoring feature set:
//
//   - Certificate canvas editor (layers, backdrops, media assets)
//   - Content drip rules (schedule, prerequisite, enrollment-days, sequence)
//   - Course-level prerequisite chains
//   - Multi-instructor course assignment with revenue share
//   - Assignment grade record (one per submission, enforced by a unique
//     compound index — see the AssignmentGrade comment below)
//
// Every struct is multi-tenant scoped: it MUST carry TenantID. Timestamps use
// time.Time with both json and bson tags. Field-tag style mirrors lms.go and
// ecommerce.go.
// ---------------------------------------------------------------------------

// === CERTIFICATE EXTENSIONS ===

// CertificateLayer represents a single visual layer in the certificate canvas
// editor. Layers stack on top of a CertificateTemplate backdrop and are
// rendered top-down by SortOrder. A layer is one of: text, image, shape,
// signature, or qrcode. Text layers may contain placeholders such as
// {student_name}, {course_title}, {issue_date} that the render pipeline
// substitutes at issue time. DataKey binds a layer to a dynamic value pulled
// from the issued Certificate record.
type CertificateLayer struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	TemplateID primitive.ObjectID `json:"templateId" bson:"templateId" validate:"required"`
	Name       string             `json:"name" bson:"name" validate:"required"`
	LayerType  string             `json:"layerType" bson:"layerType" validate:"required"` // text|image|shape|signature|qrcode
	SortOrder  int                `json:"sortOrder,omitempty" bson:"sortOrder,omitempty"`
	PositionX  float64            `json:"positionX" bson:"positionX"`
	PositionY  float64            `json:"positionY" bson:"positionY"`
	Width      float64            `json:"width,omitempty" bson:"width,omitempty"`
	Height     float64            `json:"height,omitempty" bson:"height,omitempty"`
	Rotation   float64            `json:"rotation,omitempty" bson:"rotation,omitempty"`
	Opacity    float64            `json:"opacity,omitempty" bson:"opacity,omitempty"`
	// Text-specific
	Content    string `json:"content,omitempty" bson:"content,omitempty"` // may contain placeholders like {student_name}, {course_title}
	FontFamily string `json:"fontFamily,omitempty" bson:"fontFamily,omitempty"`
	FontSize   int    `json:"fontSize,omitempty" bson:"fontSize,omitempty"`
	FontWeight string `json:"fontWeight,omitempty" bson:"fontWeight,omitempty"`
	FontStyle  string `json:"fontStyle,omitempty" bson:"fontStyle,omitempty"`
	TextAlign  string `json:"textAlign,omitempty" bson:"textAlign,omitempty"`
	Color      string `json:"color,omitempty" bson:"color,omitempty"` // hex color
	// Image-specific
	ImageURL string `json:"imageUrl,omitempty" bson:"imageUrl,omitempty"`
	// Shape-specific
	ShapeType   string  `json:"shapeType,omitempty" bson:"shapeType,omitempty"` // rect|circle|line
	FillColor   string  `json:"fillColor,omitempty" bson:"fillColor,omitempty"`
	BorderColor string  `json:"borderColor,omitempty" bson:"borderColor,omitempty"`
	BorderWidth float64 `json:"borderWidth,omitempty" bson:"borderWidth,omitempty"`
	// Dynamic data binding
	DataKey   string    `json:"dataKey,omitempty" bson:"dataKey,omitempty"` // student_name|course_title|instructor_name|issue_date|score|certificate_number
	IsVisible bool      `json:"isVisible" bson:"isVisible"`
	IsLocked  bool      `json:"isLocked,omitempty" bson:"isLocked,omitempty"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// CertificateBackdrop is a reusable background image for certificates.
// Tenants can upload several backdrops (landscape + portrait) and pick one as
// the default that loads when an instructor opens the canvas editor.
type CertificateBackdrop struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name        string             `json:"name" bson:"name" validate:"required"`
	ImageURL    string             `json:"imageUrl" bson:"imageUrl" validate:"required"`
	Orientation string             `json:"orientation,omitempty" bson:"orientation,omitempty"` // landscape|portrait
	Width       int                `json:"width,omitempty" bson:"width,omitempty"`
	Height      int                `json:"height,omitempty" bson:"height,omitempty"`
	IsDefault   bool               `json:"isDefault,omitempty" bson:"isDefault,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// CertificateMedia is a reusable media asset (logo, signature, watermark, or
// stamp) that an instructor can drag onto a certificate canvas. Reusable
// media keeps the per-template payload small and lets a tenant swap a logo
// in one place.
type CertificateMedia struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name      string             `json:"name" bson:"name" validate:"required"`
	MediaType string             `json:"mediaType" bson:"mediaType" validate:"required"` // logo|signature|watermark|stamp
	ImageURL  string             `json:"imageUrl" bson:"imageUrl" validate:"required"`
	Width     int                `json:"width,omitempty" bson:"width,omitempty"`
	Height    int                `json:"height,omitempty" bson:"height,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// === CONTENT DRIP ===

// DripRuleType discriminates between the four supported drip strategies.
type DripRuleType string

const (
	DripTypeSchedule       DripRuleType = "schedule"        // unlock on a specific date (UnlockAt)
	DripTypePrerequisite   DripRuleType = "prerequisite"    // unlock after completing a prerequisite lesson/topic
	DripTypeEnrollmentDays DripRuleType = "enrollment_days" // unlock N days after the student's enrollment
	DripTypeSequence       DripRuleType = "sequence"        // unlock after the previous lesson in sequence
)

// DripRule controls when a single lesson becomes accessible to a student.
// Only the fields relevant to the active RuleType are populated; the others
// are left nil/zero. One rule per (courseId, lessonId) is enforced by a
// unique compound index in mongodb.go.
type DripRule struct {
	ID       primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	LessonID primitive.ObjectID `json:"lessonId" bson:"lessonId" validate:"required"`
	RuleType DripRuleType       `json:"ruleType" bson:"ruleType" validate:"required"`
	// Schedule type
	UnlockAt *time.Time `json:"unlockAt,omitempty" bson:"unlockAt,omitempty"`
	// Prerequisite type
	PrerequisiteLessonID *primitive.ObjectID `json:"prerequisiteLessonId,omitempty" bson:"prerequisiteLessonId,omitempty"`
	PrerequisiteTopicID  *primitive.ObjectID `json:"prerequisiteTopicId,omitempty" bson:"prerequisiteTopicId,omitempty"`
	// Enrollment days type
	DaysAfterEnrollment int `json:"daysAfterEnrollment,omitempty" bson:"daysAfterEnrollment,omitempty"`
	// Sequence type — no extra fields, unlocks after the previous lesson in sort order
	IsActive  bool      `json:"isActive" bson:"isActive"`
	CreatedAt time.Time `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === PREREQUISITE CHAINS ===

// PrerequisiteChain defines a course-level prerequisite: a student must
// complete (or be enrolled in, depending on IsRequired) the
// PrerequisiteCourseID course before they can enrol in CourseID.
type PrerequisiteChain struct {
	ID                   primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID             primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID             primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	PrerequisiteCourseID primitive.ObjectID `json:"prerequisiteCourseId" bson:"prerequisiteCourseId" validate:"required"`
	IsRequired           bool               `json:"isRequired" bson:"isRequired"` // required vs recommended
	CreatedAt            time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// === MULTI-INSTRUCTOR ===

// CourseInstructor is an N:N join between courses and instructors. A single
// course may have one primary instructor plus zero or more co-instructors /
// assistants. RevenueSharePercent (0–100) splits the instructor-side revenue
// across all rows for a given course; the platform-side share is tracked
// separately in the revenue ledger.
type CourseInstructor struct {
	ID                  primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID            primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID            primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	InstructorID        primitive.ObjectID `json:"instructorId" bson:"instructorId" validate:"required"`
	Role                string             `json:"role,omitempty" bson:"role,omitempty"` // primary|co_instructor|assistant
	RevenueSharePercent float64            `json:"revenueSharePercent" bson:"revenueSharePercent" validate:"gte=0,lte=100"`
	IsPrimary           bool               `json:"isPrimary" bson:"isPrimary"`
	AddedAt             time.Time          `json:"addedAt" bson:"addedAt" validate:"required"`
	CreatedAt           time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt           time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === ASSIGNMENT GRADE ===
//
// The Assignment + AssignmentSubmission structs already live in lms.go and
// are NOT redefined here. AssignmentGrade is the instructor-issued grade for
// one AssignmentSubmission. A unique compound index on (tenantId,
// submissionId) in mongodb.go enforces one grade row per submission; a
// re-grade (e.g. instructor adjusts the score after appeal) updates the
// existing row in place and stamps UpdatedAt. GradedAt preserves the
// original grade time so audit trails can show when the first grade was
// issued vs. when it was last revised.
//
// (Phase 4 backend handlers will be built by Agent 4 on top of this struct
// plus the existing Assignment / AssignmentSubmission types.)

// AssignmentGrade is the instructor-issued grade for one AssignmentSubmission.
type AssignmentGrade struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	AssignmentID primitive.ObjectID `json:"assignmentId" bson:"assignmentId" validate:"required"`
	SubmissionID primitive.ObjectID `json:"submissionId" bson:"submissionId" validate:"required"`
	StudentID    primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	InstructorID primitive.ObjectID `json:"instructorId" bson:"instructorId" validate:"required"`
	Score        float64            `json:"score" bson:"score" validate:"gte=0"`
	MaxScore     float64            `json:"maxScore" bson:"maxScore" validate:"required"`
	Feedback     string             `json:"feedback,omitempty" bson:"feedback,omitempty"`
	IsPass       bool               `json:"isPass" bson:"isPass"`
	GradedAt     time.Time          `json:"gradedAt" bson:"gradedAt" validate:"required"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}
