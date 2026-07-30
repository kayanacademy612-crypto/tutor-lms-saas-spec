package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

// CourseStatus represents the lifecycle state of a course.
type CourseStatus string

const (
	CourseStatusDraft     CourseStatus = "draft"
	CourseStatusPublished CourseStatus = "published"
	CourseStatusArchived  CourseStatus = "archived"
)

// CourseDifficulty labels the perceived difficulty of a course.
type CourseDifficulty string

const (
	CourseDifficultyBeginner     CourseDifficulty = "beginner"
	CourseDifficultyIntermediate CourseDifficulty = "intermediate"
	CourseDifficultyAdvanced     CourseDifficulty = "advanced"
)

// CoursePriceType describes how a course is monetised.
type CoursePriceType string

const (
	CoursePriceFree   CoursePriceType = "free"
	CoursePricePaid   CoursePriceType = "paid"
	CoursePriceBundle CoursePriceType = "bundle"
)

// Course is the top-level LMS entity owned by a tenant (instructor/school).
type Course struct {
	ID              primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID        primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	InstructorID    primitive.ObjectID  `json:"instructorId" bson:"instructorId" validate:"required"`
	Title           string              `json:"title" bson:"title" validate:"required,min=1,max=300"`
	Slug            string              `json:"slug" bson:"slug" validate:"required,min=1,max=300"`
	Description     string              `json:"description" bson:"description"`
	Excerpt         string              `json:"excerpt" bson:"excerpt"`
	FeaturedImage   string              `json:"featuredImage,omitempty" bson:"featuredImage,omitempty"`
	PreviewVideo    string              `json:"previewVideo,omitempty" bson:"previewVideo,omitempty"`
	Status          CourseStatus        `json:"status" bson:"status" validate:"required,valid_course_status"`
	PriceType       CoursePriceType     `json:"priceType" bson:"priceType" validate:"required,valid_course_price_type"`
	PriceCents      int64               `json:"priceCents" bson:"priceCents" validate:"gte=0"`
	CompareAtCents  int64               `json:"compareAtCents,omitempty" bson:"compareAtCents,omitempty"`
	Currency        string              `json:"currency,omitempty" bson:"currency,omitempty"`
	Difficulty      CourseDifficulty    `json:"difficulty,omitempty" bson:"difficulty,omitempty"`
	CategoryID      *primitive.ObjectID `json:"categoryId,omitempty" bson:"categoryId,omitempty"`
	TagIDs          []primitive.ObjectID `json:"tagIds,omitempty" bson:"tagIds,omitempty"`
	Prerequisites   []primitive.ObjectID `json:"prerequisites,omitempty" bson:"prerequisites,omitempty"`
	Language        string              `json:"language,omitempty" bson:"language,omitempty"`
	DurationSeconds int64               `json:"durationSeconds,omitempty" bson:"durationSeconds,omitempty"`
	IsFeatured      bool                `json:"isFeatured" bson:"isFeatured"`
	IsPublic        bool                `json:"isPublic" bson:"isPublic"`
	MaxStudents     int                 `json:"maxStudents,omitempty" bson:"maxStudents,omitempty"`
	EnrolledCount   int64               `json:"enrolledCount" bson:"enrolledCount"`
	RatingAvg       float64             `json:"ratingAvg" bson:"ratingAvg"`
	RatingCount     int64               `json:"ratingCount" bson:"ratingCount"`
	CertificateID   *primitive.ObjectID `json:"certificateTemplateId,omitempty" bson:"certificateTemplateId,omitempty"`
	PublishedAt     *time.Time          `json:"publishedAt,omitempty" bson:"publishedAt,omitempty"`
	CreatedAt       time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt       time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidCourseStatus returns true when the supplied status is one of the
// supported course lifecycle values.
func ValidCourseStatus(s CourseStatus) bool {
	switch s {
	case CourseStatusDraft, CourseStatusPublished, CourseStatusArchived:
		return true
	}
	return false
}

// ValidCoursePriceType returns true when the supplied price type is supported.
func ValidCoursePriceType(p CoursePriceType) bool {
	switch p {
	case CoursePriceFree, CoursePricePaid, CoursePriceBundle:
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

// Topic groups lessons (and assessments) within a course.
type Topic struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID    primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	Title       string             `json:"title" bson:"title" validate:"required,min=1,max=300"`
	Summary     string             `json:"summary,omitempty" bson:"summary,omitempty"`
	SortOrder   int                `json:"sortOrder" bson:"sortOrder"`
	LessonCount int                `json:"lessonCount,omitempty" bson:"lessonCount,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

// LessonType enumerates the supported lesson content types.
type LessonType string

const (
	LessonTypeVideo     LessonType = "video"
	LessonTypeText      LessonType = "text"
	LessonTypeDocument  LessonType = "document"
	LessonTypeLive      LessonType = "live"
	LessonTypeEmbed     LessonType = "embed"
	LessonTypeZoom      LessonType = "zoom"
)

// LessonVideoSource describes where a video asset is hosted.
type LessonVideoSource string

const (
	LessonVideoSourceHTML5  LessonVideoSource = "html5"
	LessonVideoSourceYouTube LessonVideoSource = "youtube"
	LessonVideoSourceVimeo  LessonVideoSource = "vimeo"
	LessonVideoSourceExternal LessonVideoSource = "external"
)

// Lesson is a single learning unit inside a topic.
type Lesson struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID       primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	TopicID        primitive.ObjectID `json:"topicId" bson:"topicId" validate:"required"`
	InstructorID   primitive.ObjectID `json:"instructorId" bson:"instructorId" validate:"required"`
	Title          string             `json:"title" bson:"title" validate:"required,min=1,max=300"`
	Slug           string             `json:"slug,omitempty" bson:"slug,omitempty"`
	Content        string             `json:"content,omitempty" bson:"content,omitempty"`
	LessonType     LessonType         `json:"lessonType" bson:"lessonType" validate:"required,valid_lesson_type"`
	VideoSource    LessonVideoSource  `json:"videoSource,omitempty" bson:"videoSource,omitempty"`
	VideoURL       string             `json:"videoUrl,omitempty" bson:"videoUrl,omitempty"`
	VideoDuration  int64              `json:"videoDuration,omitempty" bson:"videoDuration,omitempty"`
	AttachmentURLs []string           `json:"attachmentUrls,omitempty" bson:"attachmentUrls,omitempty"`
	IsPreview      bool               `json:"isPreview" bson:"isPreview"`
	IsRequired     bool               `json:"isRequired" bson:"isRequired"`
	SortOrder      int                `json:"sortOrder" bson:"sortOrder"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidLessonType returns true when the supplied lesson type is supported.
func ValidLessonType(t LessonType) bool {
	switch t {
	case LessonTypeVideo, LessonTypeText, LessonTypeDocument, LessonTypeLive, LessonTypeEmbed, LessonTypeZoom:
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Quiz / QuizSettings / Question
// ---------------------------------------------------------------------------

// QuestionType enumerates the supported quiz question types.
type QuestionType string

const (
	QuestionTypeSingleChoice  QuestionType = "single_choice"
	QuestionTypeMultipleChoice QuestionType = "multiple_choice"
	QuestionTypeTrueFalse     QuestionType = "true_false"
	QuestionTypeShortAnswer   QuestionType = "short_answer"
	QuestionTypeEssay         QuestionType = "essay"
	QuestionTypeFillBlank     QuestionType = "fill_blank"
	QuestionTypeMatching      QuestionType = "matching"
	QuestionTypeOrdering      QuestionType = "ordering"
)

// QuizGradingMethod describes how a quiz attempt is graded.
type QuizGradingMethod string

const (
	QuizGradingAuto     QuizGradingMethod = "auto"
	QuizGradingManual   QuizGradingMethod = "manual"
	QuizGradingHybrid   QuizGradingMethod = "hybrid"
)

// QuizSettings captures the configurable behaviour of a single quiz.
type QuizSettings struct {
	PassThresholdPct    float64 `json:"passThresholdPct,omitempty" bson:"passThresholdPct,omitempty"`
	MaxAttempts         int     `json:"maxAttempts,omitempty" bson:"maxAttempts,omitempty"`
	TimeLimitSeconds    int     `json:"timeLimitSeconds,omitempty" bson:"timeLimitSeconds,omitempty"`
	ShuffleQuestions    bool    `json:"shuffleQuestions" bson:"shuffleQuestions"`
	ShuffleAnswers      bool    `json:"shuffleAnswers" bson:"shuffleAnswers"`
	ShowCorrectAnswers  bool    `json:"showCorrectAnswers" bson:"showCorrectAnswers"`
	AllowReview         bool    `json:"allowReview" bson:"allowReview"`
	AllowPauseResume    bool    `json:"allowPauseResume" bson:"allowPauseResume"`
	NotifyOnSubmit      bool    `json:"notifyOnSubmit" bson:"notifyOnSubmit"`
	RandomizeFromPool   int     `json:"randomizeFromPool,omitempty" bson:"randomizeFromPool,omitempty"`
	GradingMethod       QuizGradingMethod `json:"gradingMethod,omitempty" bson:"gradingMethod,omitempty"`
}

// Quiz is an assessment attached to a topic (and optionally a lesson).
type Quiz struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID     primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	TopicID      primitive.ObjectID `json:"topicId" bson:"topicId" validate:"required"`
	LessonID     *primitive.ObjectID `json:"lessonId,omitempty" bson:"lessonId,omitempty"`
	InstructorID primitive.ObjectID `json:"instructorId" bson:"instructorId" validate:"required"`
	Title        string             `json:"title" bson:"title" validate:"required,min=1,max=300"`
	Description  string             `json:"description,omitempty" bson:"description,omitempty"`
	Settings     QuizSettings       `json:"settings" bson:"settings"`
	QuestionCount int               `json:"questionCount,omitempty" bson:"questionCount,omitempty"`
	TotalPoints  float64            `json:"totalPoints,omitempty" bson:"totalPoints,omitempty"`
	IsPublished  bool               `json:"isPublished" bson:"isPublished"`
	SortOrder    int                `json:"sortOrder" bson:"sortOrder"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// QuestionOption is a single selectable answer for a quiz question.
type QuestionOption struct {
	ID       string `json:"id" bson:"id"`
	Label    string `json:"label" bson:"label"`
	IsCorrect bool  `json:"isCorrect" bson:"isCorrect"`
}

// Question is a single prompt within a quiz.
type Question struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	QuizID        primitive.ObjectID `json:"quizId" bson:"quizId" validate:"required"`
	QuestionType  QuestionType       `json:"questionType" bson:"questionType" validate:"required,valid_question_type"`
	Prompt        string             `json:"prompt" bson:"prompt" validate:"required,min=1"`
	Hint          string             `json:"hint,omitempty" bson:"hint,omitempty"`
	Explanation   string             `json:"explanation,omitempty" bson:"explanation,omitempty"`
	Points        float64            `json:"points" bson:"points"`
	Options       []QuestionOption   `json:"options,omitempty" bson:"options,omitempty"`
	AcceptableAnswers []string       `json:"acceptableAnswers,omitempty" bson:"acceptableAnswers,omitempty"`
	Matches       map[string]string  `json:"matches,omitempty" bson:"matches,omitempty"`
	SortOrder     int                `json:"sortOrder" bson:"sortOrder"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidQuestionType returns true when the supplied question type is supported.
func ValidQuestionType(t QuestionType) bool {
	switch t {
	case QuestionTypeSingleChoice, QuestionTypeMultipleChoice, QuestionTypeTrueFalse,
		QuestionTypeShortAnswer, QuestionTypeEssay, QuestionTypeFillBlank,
		QuestionTypeMatching, QuestionTypeOrdering:
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

// Assignment is an instructor-graded deliverable attached to a topic.
type Assignment struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID       primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	TopicID        primitive.ObjectID `json:"topicId" bson:"topicId" validate:"required"`
	LessonID       *primitive.ObjectID `json:"lessonId,omitempty" bson:"lessonId,omitempty"`
	InstructorID   primitive.ObjectID `json:"instructorId" bson:"instructorId" validate:"required"`
	Title          string             `json:"title" bson:"title" validate:"required,min=1,max=300"`
	Description    string             `json:"description,omitempty" bson:"description,omitempty"`
	Instructions   string             `json:"instructions,omitempty" bson:"instructions,omitempty"`
	MaxPoints      float64            `json:"maxPoints,omitempty" bson:"maxPoints,omitempty"`
	PassThreshold  float64            `json:"passThreshold,omitempty" bson:"passThreshold,omitempty"`
	TimeLimitSeconds int               `json:"timeLimitSeconds,omitempty" bson:"timeLimitSeconds,omitempty"`
	AllowUploads   bool               `json:"allowUploads" bson:"allowUploads"`
	AllowedFileTypes []string         `json:"allowedFileTypes,omitempty" bson:"allowedFileTypes,omitempty"`
	MaxFileCount   int                `json:"maxFileCount,omitempty" bson:"maxFileCount,omitempty"`
	DueAt          *time.Time         `json:"dueAt,omitempty" bson:"dueAt,omitempty"`
	SortOrder      int                `json:"sortOrder" bson:"sortOrder"`
	IsPublished    bool               `json:"isPublished" bson:"isPublished"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// Enrollment / LessonProgress / QuizAttempt / AssignmentSubmission
// ---------------------------------------------------------------------------

// EnrollmentStatus represents the lifecycle state of a student enrollment.
type EnrollmentStatus string

const (
	EnrollmentStatusActive    EnrollmentStatus = "active"
	EnrollmentStatusCompleted EnrollmentStatus = "completed"
	EnrollmentStatusExpired   EnrollmentStatus = "expired"
	EnrollmentStatusCancelled EnrollmentStatus = "cancelled"
	EnrollmentStatusRefunded  EnrollmentStatus = "refunded"
)

// Enrollment links a student to a course within a tenant.
type Enrollment struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID        primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID        primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	StudentID       primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	Status          EnrollmentStatus   `json:"status" bson:"status" validate:"required,valid_enrollment_status"`
	OrderID         *primitive.ObjectID `json:"orderId,omitempty" bson:"orderId,omitempty"`
	BundleID        *primitive.ObjectID `json:"bundleId,omitempty" bson:"bundleId,omitempty"`
	MembershipID    *primitive.ObjectID `json:"membershipId,omitempty" bson:"membershipId,omitempty"`
	ProgressPct     float64            `json:"progressPct" bson:"progressPct"`
	LessonsTotal    int                `json:"lessonsTotal,omitempty" bson:"lessonsTotal,omitempty"`
	LessonsComplete int                `json:"lessonsComplete,omitempty" bson:"lessonsComplete,omitempty"`
	LastAccessedAt  *time.Time         `json:"lastAccessedAt,omitempty" bson:"lastAccessedAt,omitempty"`
	CompletedAt     *time.Time         `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	ExpiresAt       *time.Time         `json:"expiresAt,omitempty" bson:"expiresAt,omitempty"`
	CreatedAt       time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidEnrollmentStatus returns true when the supplied status is supported.
func ValidEnrollmentStatus(s EnrollmentStatus) bool {
	switch s {
	case EnrollmentStatusActive, EnrollmentStatusCompleted, EnrollmentStatusExpired,
		EnrollmentStatusCancelled, EnrollmentStatusRefunded:
		return true
	}
	return false
}

// LessonProgress tracks a student's progress on a single lesson.
type LessonProgress struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID        primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID        primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	LessonID        primitive.ObjectID `json:"lessonId" bson:"lessonId" validate:"required"`
	StudentID       primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	EnrollmentID    primitive.ObjectID `json:"enrollmentId" bson:"enrollmentId" validate:"required"`
	PositionSeconds int64              `json:"positionSeconds,omitempty" bson:"positionSeconds,omitempty"`
	DurationSeconds int64              `json:"durationSeconds,omitempty" bson:"durationSeconds,omitempty"`
	IsComplete      bool               `json:"isComplete" bson:"isComplete"`
	CompletionPct   float64            `json:"completionPct" bson:"completionPct"`
	LastWatchedAt   *time.Time         `json:"lastWatchedAt,omitempty" bson:"lastWatchedAt,omitempty"`
	CompletedAt     *time.Time         `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	CreatedAt       time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// QuizAttemptStatus represents the lifecycle state of an attempt.
type QuizAttemptStatus string

const (
	QuizAttemptStatusInProgress QuizAttemptStatus = "in_progress"
	QuizAttemptStatusSubmitted  QuizAttemptStatus = "submitted"
	QuizAttemptStatusGraded     QuizAttemptStatus = "graded"
	QuizAttemptStatusExpired    QuizAttemptStatus = "expired"
)

// QuizAnswer captures the student's response for a single question.
type QuizAnswer struct {
	QuestionID    primitive.ObjectID `json:"questionId" bson:"questionId"`
	SelectedOptionIDs []string        `json:"selectedOptionIds,omitempty" bson:"selectedOptionIds,omitempty"`
	TextAnswer    string             `json:"textAnswer,omitempty" bson:"textAnswer,omitempty"`
	Matches       map[string]string  `json:"matches,omitempty" bson:"matches,omitempty"`
	PointsAwarded float64            `json:"pointsAwarded,omitempty" bson:"pointsAwarded,omitempty"`
	IsCorrect     bool               `json:"isCorrect,omitempty" bson:"isCorrect,omitempty"`
	GradedBy      *primitive.ObjectID `json:"gradedBy,omitempty" bson:"gradedBy,omitempty"`
}

// QuizAttempt is a single student's attempt at a quiz.
type QuizAttempt struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	QuizID       primitive.ObjectID `json:"quizId" bson:"quizId" validate:"required"`
	CourseID     primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	StudentID    primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	EnrollmentID primitive.ObjectID `json:"enrollmentId" bson:"enrollmentId" validate:"required"`
	Status       QuizAttemptStatus  `json:"status" bson:"status" validate:"required,valid_quiz_attempt_status"`
	AttemptNo    int                `json:"attemptNo" bson:"attemptNo"`
	Answers      []QuizAnswer       `json:"answers,omitempty" bson:"answers,omitempty"`
	ScorePct     float64            `json:"scorePct,omitempty" bson:"scorePct,omitempty"`
	PointsEarned float64            `json:"pointsEarned,omitempty" bson:"pointsEarned,omitempty"`
	PointsTotal  float64            `json:"pointsTotal,omitempty" bson:"pointsTotal,omitempty"`
	IsPassed     bool               `json:"isPassed,omitempty" bson:"isPassed,omitempty"`
	TimeSpentSec int64              `json:"timeSpentSec,omitempty" bson:"timeSpentSec,omitempty"`
	StartedAt    time.Time          `json:"startedAt" bson:"startedAt" validate:"required"`
	SubmittedAt  *time.Time         `json:"submittedAt,omitempty" bson:"submittedAt,omitempty"`
	GradedAt     *time.Time         `json:"gradedAt,omitempty" bson:"gradedAt,omitempty"`
	GradedBy     *primitive.ObjectID `json:"gradedBy,omitempty" bson:"gradedBy,omitempty"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidQuizAttemptStatus returns true when the supplied status is supported.
func ValidQuizAttemptStatus(s QuizAttemptStatus) bool {
	switch s {
	case QuizAttemptStatusInProgress, QuizAttemptStatusSubmitted, QuizAttemptStatusGraded, QuizAttemptStatusExpired:
		return true
	}
	return false
}

// AssignmentSubmissionStatus represents the lifecycle state of a submission.
type AssignmentSubmissionStatus string

const (
	AssignmentSubmissionStatusSubmitted AssignmentSubmissionStatus = "submitted"
	AssignmentSubmissionStatusGraded    AssignmentSubmissionStatus = "graded"
	AssignmentSubmissionStatusReturned  AssignmentSubmissionStatus = "returned"
	AssignmentSubmissionStatusLate      AssignmentSubmissionStatus = "late"
)

// AssignmentSubmission captures a student's deliverable for an assignment.
type AssignmentSubmission struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	AssignmentID primitive.ObjectID `json:"assignmentId" bson:"assignmentId" validate:"required"`
	CourseID     primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	StudentID    primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	EnrollmentID primitive.ObjectID `json:"enrollmentId" bson:"enrollmentId" validate:"required"`
	Status       AssignmentSubmissionStatus `json:"status" bson:"status" validate:"required,valid_assignment_submission_status"`
	Content      string             `json:"content,omitempty" bson:"content,omitempty"`
	AttachmentURLs []string         `json:"attachmentUrls,omitempty" bson:"attachmentUrls,omitempty"`
	Note         string             `json:"note,omitempty" bson:"note,omitempty"`
	PointsAwarded float64           `json:"pointsAwarded,omitempty" bson:"pointsAwarded,omitempty"`
	Feedback     string             `json:"feedback,omitempty" bson:"feedback,omitempty"`
	GradedBy     *primitive.ObjectID `json:"gradedBy,omitempty" bson:"gradedBy,omitempty"`
	SubmittedAt  time.Time          `json:"submittedAt" bson:"submittedAt" validate:"required"`
	GradedAt     *time.Time         `json:"gradedAt,omitempty" bson:"gradedAt,omitempty"`
	CreatedAt    time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt    time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidAssignmentSubmissionStatus returns true when the supplied status is supported.
func ValidAssignmentSubmissionStatus(s AssignmentSubmissionStatus) bool {
	switch s {
	case AssignmentSubmissionStatusSubmitted, AssignmentSubmissionStatusGraded,
		AssignmentSubmissionStatusReturned, AssignmentSubmissionStatusLate:
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Q&A and Reviews
// ---------------------------------------------------------------------------

// QAQuestion is a public question asked against a course (optionally a lesson).
type QAQuestion struct {
	ID         primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID   primitive.ObjectID  `json:"courseId" bson:"courseId" validate:"required"`
	LessonID   *primitive.ObjectID `json:"lessonId,omitempty" bson:"lessonId,omitempty"`
	StudentID  primitive.ObjectID  `json:"studentId" bson:"studentId" validate:"required"`
	Question   string              `json:"question" bson:"question" validate:"required,min=1"`
	Answer     string              `json:"answer,omitempty" bson:"answer,omitempty"`
	AnsweredBy *primitive.ObjectID `json:"answeredBy,omitempty" bson:"answeredBy,omitempty"`
	AnsweredAt *time.Time          `json:"answeredAt,omitempty" bson:"answeredAt,omitempty"`
	IsResolved bool                `json:"isResolved" bson:"isResolved"`
	Upvotes    int                 `json:"upvotes,omitempty" bson:"upvotes,omitempty"`
	CreatedAt  time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt  time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// CourseReview is a student's rating + comment for a completed course.
type CourseReview struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID  primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	StudentID primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	Rating    int                `json:"rating" bson:"rating" validate:"required,gte=1,lte=5"`
	Title     string             `json:"title,omitempty" bson:"title,omitempty"`
	Body      string             `json:"body,omitempty" bson:"body,omitempty"`
	IsApproved bool              `json:"isApproved" bson:"isApproved"`
	IsFeatured bool              `json:"isFeatured" bson:"isFeatured"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// StudentNote
// ---------------------------------------------------------------------------

// StudentNote is a private note a student attaches to a lesson.
type StudentNote struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID  primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	LessonID  primitive.ObjectID `json:"lessonId" bson:"lessonId" validate:"required"`
	StudentID primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	Body      string             `json:"body" bson:"body" validate:"required,min=1"`
	PositionSeconds int64        `json:"positionSeconds,omitempty" bson:"positionSeconds,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// Order / OrderItem / Coupon
// ---------------------------------------------------------------------------

// OrderStatus represents the lifecycle state of an order.
type OrderStatus string

const (
	OrderStatusPending  OrderStatus = "pending"
	OrderStatusPaid     OrderStatus = "paid"
	OrderStatusFailed   OrderStatus = "failed"
	OrderStatusRefunded OrderStatus = "refunded"
	OrderStatusCanceled OrderStatus = "canceled"
)

// OrderItemType describes what an order line item refers to.
type OrderItemType string

const (
	OrderItemTypeCourse   OrderItemType = "course"
	OrderItemTypeBundle   OrderItemType = "bundle"
	OrderItemTypeMembership OrderItemType = "membership"
	OrderItemTypeCredit   OrderItemType = "credit"
	OrderItemTypeGift     OrderItemType = "gift"
)

// OrderItem is a single line item on an order.
type OrderItem struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ItemType      OrderItemType      `json:"itemType" bson:"itemType" validate:"required,valid_order_item_type"`
	ReferenceID   primitive.ObjectID `json:"referenceId" bson:"referenceId" validate:"required"`
	Title         string             `json:"title" bson:"title" validate:"required"`
	UnitPriceCents int64             `json:"unitPriceCents" bson:"unitPriceCents"`
	Quantity      int                `json:"quantity" bson:"quantity"`
	SubtotalCents int64              `json:"subtotalCents" bson:"subtotalCents"`
}

// ValidOrderItemType returns true when the supplied item type is supported.
func ValidOrderItemType(t OrderItemType) bool {
	switch t {
	case OrderItemTypeCourse, OrderItemTypeBundle, OrderItemTypeMembership, OrderItemTypeCredit, OrderItemTypeGift:
		return true
	}
	return false
}

// Order is a checkout record for one or more purchasable LMS items.
type Order struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID        primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID          primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	OrderNumber     string             `json:"orderNumber" bson:"orderNumber" validate:"required"`
	Items           []OrderItem        `json:"items" bson:"items" validate:"required,min=1,dive"`
	SubtotalCents   int64              `json:"subtotalCents" bson:"subtotalCents"`
	DiscountCents   int64              `json:"discountCents,omitempty" bson:"discountCents,omitempty"`
	TaxCents        int64              `json:"taxCents,omitempty" bson:"taxCents,omitempty"`
	TotalCents      int64              `json:"totalCents" bson:"totalCents"`
	Currency        string             `json:"currency,omitempty" bson:"currency,omitempty"`
	Status          OrderStatus        `json:"status" bson:"status" validate:"required,valid_order_status"`
	CouponID        *primitive.ObjectID `json:"couponId,omitempty" bson:"couponId,omitempty"`
	CouponCode      string             `json:"couponCode,omitempty" bson:"couponCode,omitempty"`
	PaymentMethod   string             `json:"paymentMethod,omitempty" bson:"paymentMethod,omitempty"`
	PaymentGatewayRef string           `json:"paymentGatewayRef,omitempty" bson:"paymentGatewayRef,omitempty"`
	PaidAt          *time.Time         `json:"paidAt,omitempty" bson:"paidAt,omitempty"`
	RefundedAt      *time.Time         `json:"refundedAt,omitempty" bson:"refundedAt,omitempty"`
	Notes           string             `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt       time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidOrderStatus returns true when the supplied status is supported.
func ValidOrderStatus(s OrderStatus) bool {
	switch s {
	case OrderStatusPending, OrderStatusPaid, OrderStatusFailed, OrderStatusRefunded, OrderStatusCanceled:
		return true
	}
	return false
}

// CouponDiscountType describes how a coupon discount is computed.
type CouponDiscountType string

const (
	CouponDiscountPercent CouponDiscountType = "percent"
	CouponDiscountFixed   CouponDiscountType = "fixed"
)

// Coupon is a redeemable discount code applicable to orders.
type Coupon struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Code           string             `json:"code" bson:"code" validate:"required,min=1,max=64"`
	Description    string             `json:"description,omitempty" bson:"description,omitempty"`
	DiscountType   CouponDiscountType `json:"discountType" bson:"discountType" validate:"required,valid_coupon_discount_type"`
	DiscountValue  float64            `json:"discountValue" bson:"discountValue"`
	MaxRedemptions int                `json:"maxRedemptions,omitempty" bson:"maxRedemptions,omitempty"`
	RedemptionCount int               `json:"redemptionCount" bson:"redemptionCount"`
	MaxRedemptionsPerUser int         `json:"maxRedemptionsPerUser,omitempty" bson:"maxRedemptionsPerUser,omitempty"`
	MinOrderCents  int64              `json:"minOrderCents,omitempty" bson:"minOrderCents,omitempty"`
	MaxDiscountCents int64            `json:"maxDiscountCents,omitempty" bson:"maxDiscountCents,omitempty"`
	AppliesToAllCourses bool          `json:"appliesToAllCourses" bson:"appliesToAllCourses"`
	CourseIDs      []primitive.ObjectID `json:"courseIds,omitempty" bson:"courseIds,omitempty"`
	StartsAt       *time.Time         `json:"startsAt,omitempty" bson:"startsAt,omitempty"`
	ExpiresAt      *time.Time         `json:"expiresAt,omitempty" bson:"expiresAt,omitempty"`
	IsActive       bool               `json:"isActive" bson:"isActive"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidCouponDiscountType returns true when the supplied discount type is supported.
func ValidCouponDiscountType(t CouponDiscountType) bool {
	return t == CouponDiscountPercent || t == CouponDiscountFixed
}

// ---------------------------------------------------------------------------
// Category / Tag
// ---------------------------------------------------------------------------

// Category groups courses into a tenant-scoped taxonomy.
type Category struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name        string             `json:"name" bson:"name" validate:"required,min=1,max=200"`
	Slug        string             `json:"slug" bson:"slug" validate:"required,min=1,max=200"`
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	ParentID    *primitive.ObjectID `json:"parentId,omitempty" bson:"parentId,omitempty"`
	IconURL     string             `json:"iconUrl,omitempty" bson:"iconUrl,omitempty"`
	Color       string             `json:"color,omitempty" bson:"color,omitempty"`
	SortOrder   int                `json:"sortOrder" bson:"sortOrder"`
	CourseCount int                `json:"courseCount,omitempty" bson:"courseCount,omitempty"`
	IsActive    bool               `json:"isActive" bson:"isActive"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// Tag is a free-form label attachable to courses.
type Tag struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name        string             `json:"name" bson:"name" validate:"required,min=1,max=100"`
	Slug        string             `json:"slug" bson:"slug" validate:"required,min=1,max=100"`
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	Color       string             `json:"color,omitempty" bson:"color,omitempty"`
	CourseCount int                `json:"courseCount,omitempty" bson:"courseCount,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

// Certificate is an issued certificate awarded to a student.
type Certificate struct {
	ID               primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID         primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	CourseID         primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	StudentID        primitive.ObjectID `json:"studentId" bson:"studentId" validate:"required"`
	EnrollmentID     primitive.ObjectID `json:"enrollmentId" bson:"enrollmentId" validate:"required"`
	TemplateID       primitive.ObjectID `json:"templateId" bson:"templateId" validate:"required"`
	CertificateNumber string            `json:"certificateNumber" bson:"certificateNumber" validate:"required"`
	StudentName      string             `json:"studentName" bson:"studentName" validate:"required"`
	CourseTitle      string             `json:"courseTitle" bson:"courseTitle" validate:"required"`
	InstructorName   string             `json:"instructorName,omitempty" bson:"instructorName,omitempty"`
	FinalScorePct    float64            `json:"finalScorePct,omitempty" bson:"finalScorePct,omitempty"`
	IssueDate        time.Time          `json:"issueDate" bson:"issueDate" validate:"required"`
	ExpiryDate       *time.Time         `json:"expiryDate,omitempty" bson:"expiryDate,omitempty"`
	PDFURL           string             `json:"pdfUrl,omitempty" bson:"pdfUrl,omitempty"`
	VerificationCode string             `json:"verificationCode" bson:"verificationCode" validate:"required"`
	IsRevoked        bool               `json:"isRevoked" bson:"isRevoked"`
	RevokedAt        *time.Time         `json:"revokedAt,omitempty" bson:"revokedAt,omitempty"`
	CreatedAt        time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt        time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// CertificateTemplate is a tenant-scoped template used to render certificates.
type CertificateTemplate struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name           string             `json:"name" bson:"name" validate:"required,min=1,max=200"`
	Orientation    string             `json:"orientation,omitempty" bson:"orientation,omitempty"`
	BackgroundURL  string             `json:"backgroundUrl,omitempty" bson:"backgroundUrl,omitempty"`
	LogoURL        string             `json:"logoUrl,omitempty" bson:"logoUrl,omitempty"`
	SignatureURL   string             `json:"signatureUrl,omitempty" bson:"signatureUrl,omitempty"`
	HTMLTemplate   string             `json:"htmlTemplate,omitempty" bson:"htmlTemplate,omitempty"`
	FontFamily     string             `json:"fontFamily,omitempty" bson:"fontFamily,omitempty"`
	PrimaryColor   string             `json:"primaryColor,omitempty" bson:"primaryColor,omitempty"`
	AccentColor    string             `json:"accentColor,omitempty" bson:"accentColor,omitempty"`
	IsActive       bool               `json:"isActive" bson:"isActive"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// Bundle / Membership / Gift
// ---------------------------------------------------------------------------

// CourseBundle is a purchasable group of courses.
type CourseBundle struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	Name          string              `json:"name" bson:"name" validate:"required,min=1,max=300"`
	Slug          string              `json:"slug" bson:"slug" validate:"required,min=1,max=300"`
	Description   string              `json:"description,omitempty" bson:"description,omitempty"`
	FeaturedImage string              `json:"featuredImage,omitempty" bson:"featuredImage,omitempty"`
	CourseIDs     []primitive.ObjectID `json:"courseIds" bson:"courseIds" validate:"required,min=1"`
	PriceCents    int64               `json:"priceCents" bson:"priceCents" validate:"gte=0"`
	CompareAtCents int64              `json:"compareAtCents,omitempty" bson:"compareAtCents,omitempty"`
	Currency      string              `json:"currency,omitempty" bson:"currency,omitempty"`
	IsActive      bool                `json:"isActive" bson:"isActive"`
	SortOrder     int                 `json:"sortOrder" bson:"sortOrder"`
	CreatedAt     time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// MembershipBillingInterval enumerates the supported billing cycles.
type MembershipBillingInterval string

const (
	MembershipIntervalMonthly MembershipBillingInterval = "monthly"
	MembershipIntervalQuarterly MembershipBillingInterval = "quarterly"
	MembershipIntervalAnnual  MembershipBillingInterval = "annual"
	MembershipIntervalLifetime MembershipBillingInterval = "lifetime"
)

// Membership is a recurring subscription granting access to a set of courses.
type Membership struct {
	ID                primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID          primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	Name              string              `json:"name" bson:"name" validate:"required,min=1,max=300"`
	Slug              string              `json:"slug" bson:"slug" validate:"required,min=1,max=300"`
	Description       string              `json:"description,omitempty" bson:"description,omitempty"`
	FeaturedImage     string              `json:"featuredImage,omitempty" bson:"featuredImage,omitempty"`
	CourseIDs         []primitive.ObjectID `json:"courseIds,omitempty" bson:"courseIds,omitempty"`
	AppliesToAllCourses bool               `json:"appliesToAllCourses" bson:"appliesToAllCourses"`
	BillingInterval   MembershipBillingInterval `json:"billingInterval" bson:"billingInterval" validate:"required,valid_membership_interval"`
	PriceCents        int64               `json:"priceCents" bson:"priceCents" validate:"gte=0"`
	Currency          string              `json:"currency,omitempty" bson:"currency,omitempty"`
	TrialDays         int                 `json:"trialDays,omitempty" bson:"trialDays,omitempty"`
	IsActive          bool                `json:"isActive" bson:"isActive"`
	SortOrder         int                 `json:"sortOrder" bson:"sortOrder"`
	CreatedAt         time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt         time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidMembershipInterval returns true when the supplied interval is supported.
func ValidMembershipInterval(i MembershipBillingInterval) bool {
	switch i {
	case MembershipIntervalMonthly, MembershipIntervalQuarterly, MembershipIntervalAnnual, MembershipIntervalLifetime:
		return true
	}
	return false
}

// CourseGiftStatus represents the lifecycle state of a course gift.
type CourseGiftStatus string

const (
	CourseGiftStatusPending  CourseGiftStatus = "pending"
	CourseGiftStatusRedeemed CourseGiftStatus = "redeemed"
	CourseGiftStatusExpired  CourseGiftStatus = "expired"
	CourseGiftStatusCanceled CourseGiftStatus = "canceled"
)

// CourseGift represents a purchasable course gift sent to a recipient.
type CourseGift struct {
	ID            primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	SenderID      primitive.ObjectID `json:"senderId" bson:"senderId" validate:"required"`
	RecipientEmail string            `json:"recipientEmail" bson:"recipientEmail" validate:"required,email"`
	RecipientName string             `json:"recipientName,omitempty" bson:"recipientName,omitempty"`
	CourseID      primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	OrderID       *primitive.ObjectID `json:"orderId,omitempty" bson:"orderId,omitempty"`
	RedemptionCode string            `json:"redemptionCode" bson:"redemptionCode" validate:"required"`
	Status        CourseGiftStatus   `json:"status" bson:"status" validate:"required,valid_course_gift_status"`
	Message       string             `json:"message,omitempty" bson:"message,omitempty"`
	RecipientUserID *primitive.ObjectID `json:"recipientUserId,omitempty" bson:"recipientUserId,omitempty"`
	EnrollmentID  *primitive.ObjectID `json:"enrollmentId,omitempty" bson:"enrollmentId,omitempty"`
	PriceCents    int64              `json:"priceCents,omitempty" bson:"priceCents,omitempty"`
	Currency      string             `json:"currency,omitempty" bson:"currency,omitempty"`
	ExpiresAt     *time.Time         `json:"expiresAt,omitempty" bson:"expiresAt,omitempty"`
	RedeemedAt    *time.Time         `json:"redeemedAt,omitempty" bson:"redeemedAt,omitempty"`
	CreatedAt     time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidCourseGiftStatus returns true when the supplied status is supported.
func ValidCourseGiftStatus(s CourseGiftStatus) bool {
	switch s {
	case CourseGiftStatusPending, CourseGiftStatusRedeemed, CourseGiftStatusExpired, CourseGiftStatusCanceled:
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Notification / CalendarEvent
// ---------------------------------------------------------------------------

// NotificationType enumerates supported notification kinds.
type NotificationType string

const (
	NotificationTypeCourse        NotificationType = "course"
	NotificationTypeEnrollment    NotificationType = "enrollment"
	NotificationTypeLesson        NotificationType = "lesson"
	NotificationTypeQuiz          NotificationType = "quiz"
	NotificationTypeAssignment    NotificationType = "assignment"
	NotificationTypeQA            NotificationType = "qa"
	NotificationTypeReview        NotificationType = "review"
	NotificationTypeCertificate   NotificationType = "certificate"
	NotificationTypeOrder         NotificationType = "order"
	NotificationTypeSystem        NotificationType = "system"
	NotificationTypeAnnouncement  NotificationType = "announcement"
)

// Notification is a per-user in-app notification.
type Notification struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID    primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	Type      NotificationType   `json:"type" bson:"type" validate:"required,valid_notification_type"`
	Title     string             `json:"title" bson:"title" validate:"required,min=1"`
	Body      string             `json:"body,omitempty" bson:"body,omitempty"`
	Link      string             `json:"link,omitempty" bson:"link,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty" bson:"metadata,omitempty"`
	IsRead    bool               `json:"isRead" bson:"isRead"`
	ReadAt    *time.Time         `json:"readAt,omitempty" bson:"readAt,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidNotificationType returns true when the supplied notification type is supported.
func ValidNotificationType(t NotificationType) bool {
	switch t {
	case NotificationTypeCourse, NotificationTypeEnrollment, NotificationTypeLesson,
		NotificationTypeQuiz, NotificationTypeAssignment, NotificationTypeQA,
		NotificationTypeReview, NotificationTypeCertificate, NotificationTypeOrder,
		NotificationTypeSystem, NotificationTypeAnnouncement:
		return true
	}
	return false
}

// CalendarEvent is an item shown on a student/instructor LMS calendar.
type CalendarEvent struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID      primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	CourseID    *primitive.ObjectID `json:"courseId,omitempty" bson:"courseId,omitempty"`
	LessonID    *primitive.ObjectID `json:"lessonId,omitempty" bson:"lessonId,omitempty"`
	QuizID      *primitive.ObjectID `json:"quizId,omitempty" bson:"quizId,omitempty"`
	AssignmentID *primitive.ObjectID `json:"assignmentId,omitempty" bson:"assignmentId,omitempty"`
	Title       string             `json:"title" bson:"title" validate:"required,min=1"`
	Description string             `json:"description,omitempty" bson:"description,omitempty"`
	EventType   string             `json:"eventType,omitempty" bson:"eventType,omitempty"`
	StartAt     time.Time          `json:"startAt" bson:"startAt" validate:"required"`
	EndAt       *time.Time         `json:"endAt,omitempty" bson:"endAt,omitempty"`
	AllDay      bool               `json:"allDay" bson:"allDay"`
	Location    string             `json:"location,omitempty" bson:"location,omitempty"`
	MeetingURL  string             `json:"meetingUrl,omitempty" bson:"meetingUrl,omitempty"`
	IsCompleted bool               `json:"isCompleted" bson:"isCompleted"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ---------------------------------------------------------------------------
// Migration / InstructorPayout
// ---------------------------------------------------------------------------

// MigrationStatus represents the lifecycle state of an LMS data migration.
type MigrationStatus string

const (
	MigrationStatusPending  MigrationStatus = "pending"
	MigrationStatusRunning  MigrationStatus = "running"
	MigrationStatusComplete MigrationStatus = "complete"
	MigrationStatusFailed   MigrationStatus = "failed"
)

// Migration tracks the import of legacy LMS data (e.g. from Tutor LMS / WP).
type Migration struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Source     string             `json:"source" bson:"source" validate:"required"`
	Status     MigrationStatus    `json:"status" bson:"status" validate:"required,valid_migration_status"`
	TotalItems int                `json:"totalItems,omitempty" bson:"totalItems,omitempty"`
	DoneItems  int                `json:"doneItems,omitempty" bson:"doneItems,omitempty"`
	FailedItems int               `json:"failedItems,omitempty" bson:"failedItems,omitempty"`
	LogURL     string             `json:"logUrl,omitempty" bson:"logUrl,omitempty"`
	Error      string             `json:"error,omitempty" bson:"error,omitempty"`
	Config     map[string]interface{} `json:"config,omitempty" bson:"config,omitempty"`
	StartedAt  *time.Time         `json:"startedAt,omitempty" bson:"startedAt,omitempty"`
	FinishedAt *time.Time         `json:"finishedAt,omitempty" bson:"finishedAt,omitempty"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidMigrationStatus returns true when the supplied status is supported.
func ValidMigrationStatus(s MigrationStatus) bool {
	switch s {
	case MigrationStatusPending, MigrationStatusRunning, MigrationStatusComplete, MigrationStatusFailed:
		return true
	}
	return false
}

// InstructorPayoutStatus represents the lifecycle state of an instructor payout.
type InstructorPayoutStatus string

const (
	InstructorPayoutStatusPending  InstructorPayoutStatus = "pending"
	InstructorPayoutStatusApproved InstructorPayoutStatus = "approved"
	InstructorPayoutStatusPaid     InstructorPayoutStatus = "paid"
	InstructorPayoutStatusFailed   InstructorPayoutStatus = "failed"
	InstructorPayoutStatusCanceled InstructorPayoutStatus = "canceled"
)

// InstructorPayout records a commission payout to a course instructor.
type InstructorPayout struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	InstructorID   primitive.ObjectID `json:"instructorId" bson:"instructorId" validate:"required"`
	PeriodStart    time.Time          `json:"periodStart" bson:"periodStart" validate:"required"`
	PeriodEnd      time.Time          `json:"periodEnd" bson:"periodEnd" validate:"required"`
	OrderIDs       []primitive.ObjectID `json:"orderIds,omitempty" bson:"orderIds,omitempty"`
	GrossCents     int64              `json:"grossCents" bson:"grossCents"`
	CommissionPct  float64            `json:"commissionPct,omitempty" bson:"commissionPct,omitempty"`
	CommissionCents int64             `json:"commissionCents" bson:"commissionCents"`
	FeeCents       int64              `json:"feeCents,omitempty" bson:"feeCents,omitempty"`
	NetCents       int64              `json:"netCents" bson:"netCents"`
	Currency       string             `json:"currency,omitempty" bson:"currency,omitempty"`
	Status         InstructorPayoutStatus `json:"status" bson:"status" validate:"required,valid_instructor_payout_status"`
	PaymentMethod  string             `json:"paymentMethod,omitempty" bson:"paymentMethod,omitempty"`
	PaymentRef     string             `json:"paymentRef,omitempty" bson:"paymentRef,omitempty"`
	Notes          string             `json:"notes,omitempty" bson:"notes,omitempty"`
	ApprovedBy     *primitive.ObjectID `json:"approvedBy,omitempty" bson:"approvedBy,omitempty"`
	ApprovedAt     *time.Time         `json:"approvedAt,omitempty" bson:"approvedAt,omitempty"`
	PaidAt         *time.Time         `json:"paidAt,omitempty" bson:"paidAt,omitempty"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidInstructorPayoutStatus returns true when the supplied status is supported.
func ValidInstructorPayoutStatus(s InstructorPayoutStatus) bool {
	switch s {
	case InstructorPayoutStatusPending, InstructorPayoutStatusApproved,
		InstructorPayoutStatusPaid, InstructorPayoutStatusFailed, InstructorPayoutStatusCanceled:
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Addons / Integration / Custom field configs (collection-backed config docs)
// ---------------------------------------------------------------------------

// AddonConfig records the enable/disable state and configuration of an LMS addon.
type AddonConfig struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	AddonKey   string             `json:"addonKey" bson:"addonKey" validate:"required,min=1,max=100"`
	Name       string             `json:"name,omitempty" bson:"name,omitempty"`
	IsEnabled  bool               `json:"isEnabled" bson:"isEnabled"`
	Settings   map[string]interface{} `json:"settings,omitempty" bson:"settings,omitempty"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// IntegrationConfig stores credentials/settings for a third-party integration.
type IntegrationConfig struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Provider   string             `json:"provider" bson:"provider" validate:"required,min=1,max=100"`
	IsEnabled  bool               `json:"isEnabled" bson:"isEnabled"`
	Credentials map[string]interface{} `json:"credentials,omitempty" bson:"credentials,omitempty"`
	Settings   map[string]interface{} `json:"settings,omitempty" bson:"settings,omitempty"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// PaymentGatewayConfig stores per-tenant payment gateway settings.
type PaymentGatewayConfig struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Gateway    string             `json:"gateway" bson:"gateway" validate:"required,min=1,max=100"`
	IsEnabled  bool               `json:"isEnabled" bson:"isEnabled"`
	IsDefault  bool               `json:"isDefault" bson:"isDefault"`
	Mode       string             `json:"mode,omitempty" bson:"mode,omitempty"`
	Credentials map[string]interface{} `json:"credentials,omitempty" bson:"credentials,omitempty"`
	Settings   map[string]interface{} `json:"settings,omitempty" bson:"settings,omitempty"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// FeatureFlag is a per-tenant boolean feature toggle.
type FeatureFlag struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Key       string             `json:"key" bson:"key" validate:"required,min=1,max=100"`
	IsEnabled bool               `json:"isEnabled" bson:"isEnabled"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ThemeOverride is a per-tenant LMS UI theme override.
type ThemeOverride struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	ThemeKey  string             `json:"themeKey" bson:"themeKey" validate:"required,min=1,max=100"`
	Values    map[string]interface{} `json:"values,omitempty" bson:"values,omitempty"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// CustomFieldScope describes which LMS entity a custom field belongs to.
type CustomFieldScope string

const (
	CustomFieldScopeCourse    CustomFieldScope = "course"
	CustomFieldScopeLesson    CustomFieldScope = "lesson"
	CustomFieldScopeStudent   CustomFieldScope = "student"
	CustomFieldScopeInstructor CustomFieldScope = "instructor"
)

// CustomField is a tenant-scoped custom field definition.
type CustomField struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID   primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Scope      CustomFieldScope   `json:"scope" bson:"scope" validate:"required,valid_custom_field_scope"`
	Key        string             `json:"key" bson:"key" validate:"required,min=1,max=100"`
	Label      string             `json:"label" bson:"label" validate:"required,min=1,max=200"`
	Type       string             `json:"type" bson:"type" validate:"required,min=1,max=50"`
	IsRequired bool               `json:"isRequired" bson:"isRequired"`
	IsFilterable bool             `json:"isFilterable" bson:"isFilterable"`
	Options    []string           `json:"options,omitempty" bson:"options,omitempty"`
	DefaultValue string           `json:"defaultValue,omitempty" bson:"defaultValue,omitempty"`
	Description string            `json:"description,omitempty" bson:"description,omitempty"`
	SortOrder  int                `json:"sortOrder" bson:"sortOrder"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt  time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// ValidCustomFieldScope returns true when the supplied scope is supported.
func ValidCustomFieldScope(s CustomFieldScope) bool {
	switch s {
	case CustomFieldScopeCourse, CustomFieldScopeLesson, CustomFieldScopeStudent, CustomFieldScopeInstructor:
		return true
	}
	return false
}
