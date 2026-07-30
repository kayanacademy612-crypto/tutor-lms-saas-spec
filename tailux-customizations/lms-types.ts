/**
 * LMS domain types — TypeScript mirrors of the Go structs in
 * `backend/internal/models/lms.go`.
 *
 * Conventions:
 *   - `primitive.ObjectID` → `string` (24-char hex, as serialized by the API).
 *   - `*primitive.ObjectID` → `string | undefined` (omitempty).
 *   - `time.Time`           → `string` (RFC 3339 / ISO 8601).
 *   - `*time.Time`          → `string | undefined` (omitempty).
 *   - `map[string]interface{}` → `Record<string, unknown>`.
 *   - Status / enum string types are kept as string-literal unions.
 *
 * NOTE: Types are intentionally permissive (`undefined` for omitempty fields).
 * Pages that need a guaranteed field can narrow with a type assertion.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ISO 8601 timestamp string, e.g. "2026-07-29T22:48:11Z". */
export type ISODateString = string;

/** MongoDB ObjectID serialized as a 24-char hex string. */
export type ObjectID = string;

/** Generic paginated list envelope returned by list endpoints. */
export interface PaginatedResponse<T> {
  /** The page of items. Field name is `data` to be ergonomic for callers. */
  data: T[];
  /** Total number of items across all pages (when known). */
  total?: number;
  /** Page size used by the backend (when known). */
  limit?: number;
  /** Zero-based or one-based offset used by the backend (when known). */
  offset?: number;
  /** 1-based page number (when known). */
  page?: number;
  /** Total number of pages (when known). */
  totalPages?: number;
}

/** Common query params for list endpoints. */
export interface ListParams {
  /** Search term applied to the resource's primary text fields. */
  search?: string;
  /** Page number (1-based, when supported). */
  page?: number;
  /** Page size. Defaults are backend-specific. */
  limit?: number;
  /** Zero-based offset (alternative to `page`). */
  offset?: number;
  /** Field to sort by (backend-specific). */
  sortBy?: string;
  /** Sort direction. */
  sortDir?: "asc" | "desc";
  /** Opaque cursor for cursor-based pagination (when supported). */
  cursor?: string;
}

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

export type CourseStatus = "draft" | "published" | "archived";
export type CourseDifficulty = "beginner" | "intermediate" | "advanced";
export type CoursePriceType = "free" | "paid" | "bundle";

export interface Course {
  id: ObjectID;
  tenantId: ObjectID;
  instructorId: ObjectID;
  title: string;
  slug: string;
  description: string;
  excerpt?: string;
  featuredImage?: string;
  previewVideo?: string;
  status: CourseStatus;
  priceType: CoursePriceType;
  /** Price in minor currency units (cents). */
  priceCents: number;
  compareAtCents?: number;
  currency?: string;
  difficulty?: CourseDifficulty;
  categoryId?: ObjectID;
  tagIds?: ObjectID[];
  prerequisites?: ObjectID[];
  language?: string;
  durationSeconds?: number;
  isFeatured: boolean;
  isPublic: boolean;
  maxStudents?: number;
  enrolledCount: number;
  ratingAvg: number;
  ratingCount: number;
  certificateTemplateId?: ObjectID;
  publishedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Payload accepted by `POST /api/lms/courses`. */
export interface CourseCreateInput {
  title: string;
  slug: string;
  description?: string;
  excerpt?: string;
  featuredImage?: string;
  previewVideo?: string;
  status?: CourseStatus;
  priceType?: CoursePriceType;
  priceCents?: number;
  compareAtCents?: number;
  currency?: string;
  difficulty?: CourseDifficulty;
  categoryId?: ObjectID;
  tagIds?: ObjectID[];
  prerequisites?: ObjectID[];
  language?: string;
  durationSeconds?: number;
  isFeatured?: boolean;
  isPublic?: boolean;
  maxStudents?: number;
  certificateTemplateId?: ObjectID;
}

/** Partial payload accepted by `PATCH /api/lms/courses/{id}`. */
export type CourseUpdateInput = Partial<CourseCreateInput>;

// ---------------------------------------------------------------------------
// Topic
// ---------------------------------------------------------------------------

export interface Topic {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  title: string;
  summary?: string;
  sortOrder: number;
  lessonCount?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TopicCreateInput {
  title: string;
  summary?: string;
  sortOrder?: number;
}

export type TopicUpdateInput = Partial<TopicCreateInput>;

// ---------------------------------------------------------------------------
// Lesson
// ---------------------------------------------------------------------------

export type LessonType =
  | "video"
  | "text"
  | "document"
  | "live"
  | "embed"
  | "zoom";

export type LessonVideoSource =
  | "html5"
  | "youtube"
  | "vimeo"
  | "external";

export interface Lesson {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  topicId: ObjectID;
  instructorId: ObjectID;
  title: string;
  slug?: string;
  content?: string;
  lessonType: LessonType;
  videoSource?: LessonVideoSource;
  videoUrl?: string;
  videoDuration?: number;
  attachmentUrls?: string[];
  isPreview: boolean;
  isRequired: boolean;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface LessonCreateInput {
  title: string;
  slug?: string;
  content?: string;
  lessonType: LessonType;
  videoSource?: LessonVideoSource;
  videoUrl?: string;
  videoDuration?: number;
  attachmentUrls?: string[];
  isPreview?: boolean;
  isRequired?: boolean;
  sortOrder?: number;
}

export type LessonUpdateInput = Partial<LessonCreateInput>;

// ---------------------------------------------------------------------------
// Quiz / QuizSettings / Question
// ---------------------------------------------------------------------------

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "essay"
  | "fill_blank"
  | "matching"
  | "ordering";

export type QuizGradingMethod = "auto" | "manual" | "hybrid";

export interface QuizSettings {
  passThresholdPct?: number;
  maxAttempts?: number;
  timeLimitSeconds?: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  allowPauseResume: boolean;
  notifyOnSubmit: boolean;
  randomizeFromPool?: number;
  gradingMethod?: QuizGradingMethod;
}

export interface Quiz {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  topicId: ObjectID;
  lessonId?: ObjectID;
  instructorId: ObjectID;
  title: string;
  description?: string;
  settings: QuizSettings;
  questionCount?: number;
  totalPoints?: number;
  isPublished: boolean;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface QuizCreateInput {
  title: string;
  description?: string;
  settings?: Partial<QuizSettings>;
  lessonId?: ObjectID;
  isPublished?: boolean;
  sortOrder?: number;
}

export type QuizUpdateInput = Partial<QuizCreateInput>;

export interface QuestionOption {
  id: string;
  label: string;
  isCorrect: boolean;
}

export interface Question {
  id: ObjectID;
  tenantId: ObjectID;
  quizId: ObjectID;
  questionType: QuestionType;
  prompt: string;
  hint?: string;
  explanation?: string;
  points: number;
  options?: QuestionOption[];
  acceptableAnswers?: string[];
  matches?: Record<string, string>;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface QuestionCreateInput {
  questionType: QuestionType;
  prompt: string;
  hint?: string;
  explanation?: string;
  points?: number;
  options?: QuestionOption[];
  acceptableAnswers?: string[];
  matches?: Record<string, string>;
  sortOrder?: number;
}

export type QuestionUpdateInput = Partial<QuestionCreateInput>;

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

export interface Assignment {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  topicId: ObjectID;
  lessonId?: ObjectID;
  instructorId: ObjectID;
  title: string;
  description?: string;
  instructions?: string;
  maxPoints?: number;
  passThreshold?: number;
  timeLimitSeconds?: number;
  allowUploads: boolean;
  allowedFileTypes?: string[];
  maxFileCount?: number;
  dueAt?: ISODateString;
  sortOrder: number;
  isPublished: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface AssignmentCreateInput {
  title: string;
  description?: string;
  instructions?: string;
  maxPoints?: number;
  passThreshold?: number;
  timeLimitSeconds?: number;
  allowUploads?: boolean;
  allowedFileTypes?: string[];
  maxFileCount?: number;
  dueAt?: ISODateString;
  lessonId?: ObjectID;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface AssignmentSubmissionInput {
  content?: string;
  attachmentUrls?: string[];
  note?: string;
}

// ---------------------------------------------------------------------------
// Enrollment / LessonProgress / QuizAttempt / AssignmentSubmission
// ---------------------------------------------------------------------------

export type EnrollmentStatus =
  | "active"
  | "completed"
  | "expired"
  | "cancelled"
  | "refunded";

export interface Enrollment {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  studentId: ObjectID;
  status: EnrollmentStatus;
  orderId?: ObjectID;
  bundleId?: ObjectID;
  membershipId?: ObjectID;
  progressPct: number;
  lessonsTotal?: number;
  lessonsComplete?: number;
  lastAccessedAt?: ISODateString;
  completedAt?: ISODateString;
  expiresAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface LessonProgress {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  lessonId: ObjectID;
  studentId: ObjectID;
  enrollmentId: ObjectID;
  positionSeconds?: number;
  durationSeconds?: number;
  isComplete: boolean;
  completionPct: number;
  lastWatchedAt?: ISODateString;
  completedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface LessonProgressInput {
  positionSeconds?: number;
  durationSeconds?: number;
  completionPct?: number;
  isComplete?: boolean;
}

export type QuizAttemptStatus =
  | "in_progress"
  | "submitted"
  | "graded"
  | "expired";

export interface QuizAnswer {
  questionId: ObjectID;
  selectedOptionIds?: string[];
  textAnswer?: string;
  matches?: Record<string, string>;
  pointsAwarded?: number;
  isCorrect?: boolean;
  gradedBy?: ObjectID;
}

export interface QuizAttempt {
  id: ObjectID;
  tenantId: ObjectID;
  quizId: ObjectID;
  courseId: ObjectID;
  studentId: ObjectID;
  enrollmentId: ObjectID;
  status: QuizAttemptStatus;
  attemptNo: number;
  answers?: QuizAnswer[];
  scorePct?: number;
  pointsEarned?: number;
  pointsTotal?: number;
  isPassed?: boolean;
  timeSpentSec?: number;
  startedAt: ISODateString;
  submittedAt?: ISODateString;
  gradedAt?: ISODateString;
  gradedBy?: ObjectID;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface QuizAttemptSubmitInput {
  answers: QuizAnswer[];
  timeSpentSec?: number;
}

export type AssignmentSubmissionStatus =
  | "submitted"
  | "graded"
  | "returned"
  | "late";

export interface AssignmentSubmission {
  id: ObjectID;
  tenantId: ObjectID;
  assignmentId: ObjectID;
  courseId: ObjectID;
  studentId: ObjectID;
  enrollmentId: ObjectID;
  status: AssignmentSubmissionStatus;
  content?: string;
  attachmentUrls?: string[];
  note?: string;
  pointsAwarded?: number;
  feedback?: string;
  gradedBy?: ObjectID;
  submittedAt: ISODateString;
  gradedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Q&A and Reviews
// ---------------------------------------------------------------------------

export interface QAQuestion {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  lessonId?: ObjectID;
  studentId: ObjectID;
  question: string;
  answer?: string;
  answeredBy?: ObjectID;
  answeredAt?: ISODateString;
  isResolved: boolean;
  upvotes?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface QAQuestionCreateInput {
  question: string;
  lessonId?: ObjectID;
}

export interface CourseReview {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  studentId: ObjectID;
  /** 1–5. */
  rating: number;
  title?: string;
  body?: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CourseReviewCreateInput {
  rating: number;
  title?: string;
  body?: string;
}

// ---------------------------------------------------------------------------
// StudentNote
// ---------------------------------------------------------------------------

export interface StudentNote {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  lessonId: ObjectID;
  studentId: ObjectID;
  body: string;
  positionSeconds?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface StudentNoteCreateInput {
  courseId: ObjectID;
  lessonId: ObjectID;
  body: string;
  positionSeconds?: number;
}

// ---------------------------------------------------------------------------
// Order / OrderItem / Coupon
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "canceled";

export type OrderItemType =
  | "course"
  | "bundle"
  | "membership"
  | "credit"
  | "gift";

export interface OrderItem {
  id: ObjectID;
  itemType: OrderItemType;
  referenceId: ObjectID;
  title: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
}

export interface Order {
  id: ObjectID;
  tenantId: ObjectID;
  userId: ObjectID;
  orderNumber: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents?: number;
  taxCents?: number;
  totalCents: number;
  currency?: string;
  status: OrderStatus;
  couponId?: ObjectID;
  couponCode?: string;
  paymentMethod?: string;
  paymentGatewayRef?: string;
  paidAt?: ISODateString;
  refundedAt?: ISODateString;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OrderCreateInput {
  items: Array<{
    itemType: OrderItemType;
    referenceId: ObjectID;
    quantity?: number;
  }>;
  couponCode?: string;
  paymentMethod?: string;
  currency?: string;
}

export type CouponDiscountType = "percent" | "fixed";

export interface Coupon {
  id: ObjectID;
  tenantId: ObjectID;
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number;
  redemptionCount: number;
  maxRedemptionsPerUser?: number;
  minOrderCents?: number;
  maxDiscountCents?: number;
  appliesToAllCourses: boolean;
  courseIds?: ObjectID[];
  startsAt?: ISODateString;
  expiresAt?: ISODateString;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CouponCreateInput {
  code: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  minOrderCents?: number;
  maxDiscountCents?: number;
  appliesToAllCourses?: boolean;
  courseIds?: ObjectID[];
  startsAt?: ISODateString;
  expiresAt?: ISODateString;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Category / Tag
// ---------------------------------------------------------------------------

export interface Category {
  id: ObjectID;
  tenantId: ObjectID;
  name: string;
  slug: string;
  description?: string;
  parentId?: ObjectID;
  iconUrl?: string;
  color?: string;
  sortOrder: number;
  courseCount?: number;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CategoryCreateInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: ObjectID;
  iconUrl?: string;
  color?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface Tag {
  id: ObjectID;
  tenantId: ObjectID;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  courseCount?: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface TagCreateInput {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export interface Certificate {
  id: ObjectID;
  tenantId: ObjectID;
  courseId: ObjectID;
  studentId: ObjectID;
  enrollmentId: ObjectID;
  templateId: ObjectID;
  certificateNumber: string;
  studentName: string;
  courseTitle: string;
  instructorName?: string;
  finalScorePct?: number;
  issueDate: ISODateString;
  expiryDate?: ISODateString;
  pdfUrl?: string;
  verificationCode: string;
  isRevoked: boolean;
  revokedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CertificateTemplate {
  id: ObjectID;
  tenantId: ObjectID;
  name: string;
  orientation?: string;
  backgroundUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  htmlTemplate?: string;
  fontFamily?: string;
  primaryColor?: string;
  accentColor?: string;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CertificateTemplateCreateInput {
  name: string;
  orientation?: string;
  backgroundUrl?: string;
  logoUrl?: string;
  signatureUrl?: string;
  htmlTemplate?: string;
  fontFamily?: string;
  primaryColor?: string;
  accentColor?: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Bundle / Membership / Gift
// ---------------------------------------------------------------------------

export interface CourseBundle {
  id: ObjectID;
  tenantId: ObjectID;
  name: string;
  slug: string;
  description?: string;
  featuredImage?: string;
  courseIds: ObjectID[];
  priceCents: number;
  compareAtCents?: number;
  currency?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CourseBundleCreateInput {
  name: string;
  slug: string;
  description?: string;
  featuredImage?: string;
  courseIds: ObjectID[];
  priceCents?: number;
  compareAtCents?: number;
  currency?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export type MembershipBillingInterval =
  | "monthly"
  | "quarterly"
  | "annual"
  | "lifetime";

export interface Membership {
  id: ObjectID;
  tenantId: ObjectID;
  name: string;
  slug: string;
  description?: string;
  featuredImage?: string;
  courseIds?: ObjectID[];
  appliesToAllCourses: boolean;
  billingInterval: MembershipBillingInterval;
  priceCents: number;
  currency?: string;
  trialDays?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MembershipCreateInput {
  name: string;
  slug: string;
  description?: string;
  featuredImage?: string;
  courseIds?: ObjectID[];
  appliesToAllCourses?: boolean;
  billingInterval: MembershipBillingInterval;
  priceCents?: number;
  currency?: string;
  trialDays?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface CourseGiftCreateInput {
  recipientEmail: string;
  recipientName?: string;
  courseId: ObjectID;
  message?: string;
  priceCents?: number;
  currency?: string;
  expiresAt?: ISODateString;
}

// ---------------------------------------------------------------------------
// Notification / CalendarEvent
// ---------------------------------------------------------------------------

export type NotificationType =
  | "course"
  | "enrollment"
  | "lesson"
  | "quiz"
  | "assignment"
  | "qa"
  | "review"
  | "certificate"
  | "order"
  | "system"
  | "announcement";

export interface Notification {
  id: ObjectID;
  tenantId: ObjectID;
  userId: ObjectID;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CalendarEvent {
  id: ObjectID;
  tenantId: ObjectID;
  userId: ObjectID;
  courseId?: ObjectID;
  lessonId?: ObjectID;
  quizId?: ObjectID;
  assignmentId?: ObjectID;
  title: string;
  description?: string;
  eventType?: string;
  startAt: ISODateString;
  endAt?: ISODateString;
  allDay: boolean;
  location?: string;
  meetingUrl?: string;
  isCompleted: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

// ---------------------------------------------------------------------------
// Migration / InstructorPayout
// ---------------------------------------------------------------------------

export type MigrationStatus = "pending" | "running" | "complete" | "failed";

export interface Migration {
  id: ObjectID;
  tenantId: ObjectID;
  source: string;
  status: MigrationStatus;
  totalItems?: number;
  doneItems?: number;
  failedItems?: number;
  logUrl?: string;
  error?: string;
  config?: Record<string, unknown>;
  startedAt?: ISODateString;
  finishedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MigrationCreateInput {
  source: string;
  config?: Record<string, unknown>;
}

export type InstructorPayoutStatus =
  | "pending"
  | "approved"
  | "paid"
  | "failed"
  | "canceled";

export interface InstructorPayout {
  id: ObjectID;
  tenantId: ObjectID;
  instructorId: ObjectID;
  periodStart: ISODateString;
  periodEnd: ISODateString;
  orderIds?: ObjectID[];
  grossCents: number;
  commissionPct?: number;
  commissionCents: number;
  feeCents?: number;
  netCents: number;
  currency?: string;
  status: InstructorPayoutStatus;
  paymentMethod?: string;
  paymentRef?: string;
  notes?: string;
  approvedBy?: ObjectID;
  approvedAt?: ISODateString;
  paidAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface InstructorPayoutCreateInput {
  instructorId: ObjectID;
  periodStart: ISODateString;
  periodEnd: ISODateString;
  orderIds?: ObjectID[];
  commissionPct?: number;
  paymentMethod?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Addon / Integration (returned by GET /api/lms/addons)
// ---------------------------------------------------------------------------

export interface AddonConfig {
  id: ObjectID;
  tenantId: ObjectID;
  addonKey: string;
  name?: string;
  isEnabled: boolean;
  settings?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
