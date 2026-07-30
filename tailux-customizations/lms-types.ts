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

/**
 * CourseGift — a purchased gift code that grants the recipient access to a
 * specific course when redeemed.
 */
export type CourseGiftStatus =
  | "pending"
  | "sent"
  | "redeemed"
  | "expired"
  | "canceled";

export interface CourseGift {
  id: ObjectID;
  tenantId: ObjectID;
  /** The user who purchased the gift. */
  buyerId: ObjectID;
  courseId: ObjectID;
  courseTitle?: string;
  recipientEmail: string;
  recipientName?: string;
  message?: string;
  /** Price paid for the gift, in minor currency units. */
  priceCents: number;
  currency?: string;
  /** Order that the gift was purchased through. */
  orderId?: ObjectID;
  /** Short, human-readable redemption code (e.g. "GIFT-AB12CD34"). */
  code: string;
  status: CourseGiftStatus;
  redeemedAt?: ISODateString;
  redeemedBy?: ObjectID;
  expiresAt?: ISODateString;
  sentAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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

// ---------------------------------------------------------------------------
// PHASE 3: ECOMMERCE TYPES
//
// These extend the existing `Order`/`Coupon`/`Bundle`/`Membership` types with
// the cart, checkout, subscription, invoice, refund, wishlist, withdrawal,
// revenue, and gateway models required by the Phase 3 eCommerce pages.
//
// Conventions match the rest of this file: `ISODateString` for RFC 3339
// timestamps and `ObjectID` for MongoDB hex-string IDs. Both are type aliases
// for `string`, so callers that pass plain `string` literals will type-check.
// ---------------------------------------------------------------------------

// --- Cart ------------------------------------------------------------------

export interface CartItem {
  id: string;
  itemType: "course" | "bundle" | "membership";
  referenceId: string;
  title: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  imageUrl?: string;
}

export interface Cart {
  id: string;
  tenantId: string;
  userId: string;
  items: CartItem[];
  couponId?: string;
  couponCode?: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddToCartInput {
  itemType: "course" | "bundle" | "membership";
  referenceId: string;
  quantity?: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

// --- Tax Rate --------------------------------------------------------------

export interface TaxRate {
  id: string;
  tenantId: string;
  name: string;
  countryCode?: string;
  regionCode?: string;
  ratePercent: number;
  isInclusive: boolean;
  isActive: boolean;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaxRateCreateInput {
  name: string;
  countryCode?: string;
  regionCode?: string;
  ratePercent: number;
  isInclusive?: boolean;
  isActive?: boolean;
  priority?: number;
}

// --- Subscription Plan -----------------------------------------------------

export type SubscriptionPlanType =
  | "course"
  | "bundle"
  | "category"
  | "full_site";

export interface SubscriptionPlan {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  planType: SubscriptionPlanType;
  referenceId?: string;
  priceCents: number;
  currency?: string;
  billingInterval: "monthly" | "quarterly" | "annual";
  trialDays?: number;
  isActive: boolean;
  sortOrder?: number;
  stripeProductId?: string;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionPlanCreateInput {
  name: string;
  slug: string;
  description?: string;
  planType: SubscriptionPlanType;
  referenceId?: string;
  priceCents: number;
  currency?: string;
  billingInterval: "monthly" | "quarterly" | "annual";
  trialDays?: number;
  isActive?: boolean;
}

// --- Subscription (user's active subscription) -----------------------------

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired";

export interface Subscription {
  id: string;
  tenantId: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
  canceledAt?: string;
  nextRetryAt?: string;
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
}

// --- Payment Transaction ---------------------------------------------------

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentTransaction {
  id: string;
  tenantId: string;
  orderId: string;
  userId: string;
  gateway: string;
  gatewayTransactionId?: string;
  amountCents: number;
  currency?: string;
  status: PaymentStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Invoice ---------------------------------------------------------------

export interface InvoiceLineItem {
  description: string;
  amountCents: number;
  quantity?: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  orderId?: string;
  userId: string;
  invoiceNumber: string;
  lineItems: InvoiceLineItem[];
  subtotalCents: number;
  discountCents?: number;
  taxCents?: number;
  totalCents: number;
  currency?: string;
  status: "draft" | "paid" | "void";
  paidAt?: string;
  pdfUrl?: string;
  billingName?: string;
  billingEmail?: string;
  billingAddress?: string;
  createdAt: string;
  updatedAt: string;
}

// --- Refund ----------------------------------------------------------------

export interface Refund {
  id: string;
  tenantId: string;
  orderId: string;
  paymentId?: string;
  amountCents: number;
  currency?: string;
  reason?: string;
  status: "pending" | "succeeded" | "failed";
  gatewayRefundId?: string;
  processedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RefundInput {
  /** Amount to refund in cents. Omit for a full refund. */
  amountCents?: number;
  reason?: string;
}

// --- Wishlist --------------------------------------------------------------

export interface Wishlist {
  id: string;
  tenantId: string;
  userId: string;
  courseId: string;
  createdAt: string;
}

// --- Withdrawal Request ----------------------------------------------------

export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "failed";

export interface WithdrawalRequest {
  id: string;
  tenantId: string;
  instructorId: string;
  amountCents: number;
  currency?: string;
  status: WithdrawalStatus;
  paymentMethod?: string;
  paymentRef?: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequestInput {
  amountCents: number;
  paymentMethod?: string;
  notes?: string;
}

// --- Revenue Ledger --------------------------------------------------------

export interface RevenueLedgerEntry {
  id: string;
  tenantId: string;
  orderId: string;
  instructorId?: string;
  accountType: "instructor" | "platform";
  amountCents: number;
  currency?: string;
  description?: string;
  createdAt: string;
}

// --- Order Activity --------------------------------------------------------

export interface OrderActivity {
  id: string;
  tenantId: string;
  orderId: string;
  action: string;
  actorId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// --- Checkout --------------------------------------------------------------

export interface CheckoutInput {
  /** Gateway key: stripe | paypal | razorpay | manual. */
  paymentGateway: string;
  couponCode?: string;
  billingName?: string;
  billingEmail?: string;
  billingAddress?: string;
}

export interface CheckoutResult {
  orderId: string;
  /** Redirect URL for Stripe Checkout / PayPal. */
  paymentUrl?: string;
  /** Stripe Elements client secret (when using embedded UI). */
  clientSecret?: string;
  status: "pending" | "succeeded" | "requires_action";
}

// --- Earnings summary (instructor) -----------------------------------------

export interface EarningsSummary {
  totalEarningsCents: number;
  totalWithdrawnCents: number;
  pendingBalanceCents: number;
  availableBalanceCents: number;
  currency: string;
  thisMonthCents: number;
  lastMonthCents: number;
  growthPercent: number;
  monthlySeries: Array<{ month: string; earningsCents: number }>;
}

// --- Revenue report (admin) ------------------------------------------------

export interface RevenueReport {
  totalRevenueCents: number;
  totalOrders: number;
  totalRefundsCents: number;
  netRevenueCents: number;
  currency: string;
  topCourses: Array<{
    courseId: string;
    title: string;
    revenueCents: number;
    enrollments: number;
  }>;
  topInstructors: Array<{
    instructorId: string;
    name: string;
    revenueCents: number;
  }>;
  dailySeries: Array<{
    date: string;
    revenueCents: number;
    orders: number;
  }>;
}

// --- Payment Gateway Config ------------------------------------------------

export interface PaymentGatewayConfig {
  id: string;
  tenantId: string;
  gateway: string;
  isEnabled: boolean;
  isDefault: boolean;
  mode?: "test" | "live";
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ===========================================================================
// PHASE 4: PRO AUTHORING TYPES
// ===========================================================================

// --- Certificate Layers (visual canvas editor) -----------------------------

export type CertificateLayerType =
  | "text"
  | "image"
  | "shape"
  | "signature"
  | "qrcode";

export type CertificateDataKey =
  | "student_name"
  | "course_title"
  | "instructor_name"
  | "issue_date"
  | "score"
  | "certificate_number"
  | "completion_date";

export interface CertificateLayer {
  id: string;
  tenantId: string;
  templateId: string;
  name: string;
  layerType: CertificateLayerType;
  sortOrder?: number;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  // Text-specific
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  color?: string;
  // Image-specific
  imageUrl?: string;
  // Shape-specific
  shapeType?: "rect" | "circle" | "line";
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  // Data binding
  dataKey?: CertificateDataKey;
  isVisible: boolean;
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateLayerCreateInput {
  templateId: string;
  name: string;
  layerType: CertificateLayerType;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  imageUrl?: string;
  shapeType?: string;
  fillColor?: string;
  dataKey?: CertificateDataKey;
  isVisible?: boolean;
}

// --- Certificate Backdrop --------------------------------------------------

export interface CertificateBackdrop {
  id: string;
  tenantId: string;
  name: string;
  imageUrl: string;
  orientation?: "landscape" | "portrait";
  width?: number;
  height?: number;
  isDefault?: boolean;
  createdAt: string;
}

// --- Certificate Media -----------------------------------------------------

export type CertificateMediaType =
  | "logo"
  | "signature"
  | "watermark"
  | "stamp";

export interface CertificateMedia {
  id: string;
  tenantId: string;
  name: string;
  mediaType: CertificateMediaType;
  imageUrl: string;
  width?: number;
  height?: number;
  createdAt: string;
}

// NOTE: `CertificateTemplateCreateInput` is already declared above (lines 742-753)
// with the same field set — kept intentionally broad (`orientation?: string`)
// so it accepts both the legacy free-form value and the Phase 4
// `'landscape' | 'portrait'` literal without a duplicate-identifier error.

// --- Content Drip ----------------------------------------------------------

export type DripRuleType =
  | "schedule"
  | "prerequisite"
  | "enrollment_days"
  | "sequence";

export interface DripRule {
  id: string;
  tenantId: string;
  courseId: string;
  lessonId: string;
  ruleType: DripRuleType;
  unlockAt?: string;
  prerequisiteLessonId?: string;
  prerequisiteTopicId?: string;
  daysAfterEnrollment?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DripRuleCreateInput {
  courseId: string;
  lessonId: string;
  ruleType: DripRuleType;
  unlockAt?: string;
  prerequisiteLessonId?: string;
  daysAfterEnrollment?: number;
  isActive?: boolean;
}

// --- Prerequisite Chain ----------------------------------------------------

export interface PrerequisiteChain {
  id: string;
  tenantId: string;
  courseId: string;
  prerequisiteCourseId: string;
  isRequired: boolean;
  createdAt: string;
}

export interface PrerequisiteChainCreateInput {
  courseId: string;
  prerequisiteCourseId: string;
  isRequired?: boolean;
}

// --- Course Instructor (multi-instructor) ----------------------------------

export type CourseInstructorRole =
  | "primary"
  | "co_instructor"
  | "assistant";

export interface CourseInstructor {
  id: string;
  tenantId: string;
  courseId: string;
  instructorId: string;
  /** Populated from the user record on the server side. */
  instructorName?: string;
  instructorEmail?: string;
  instructorAvatar?: string;
  role?: CourseInstructorRole;
  revenueSharePercent: number;
  isPrimary: boolean;
  addedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CourseInstructorCreateInput {
  courseId: string;
  instructorId: string;
  role?: CourseInstructorRole;
  revenueSharePercent?: number;
  isPrimary?: boolean;
}

// --- Assignment Grade ------------------------------------------------------

export interface AssignmentGrade {
  id: string;
  tenantId: string;
  assignmentId: string;
  submissionId: string;
  studentId: string;
  instructorId: string;
  score: number;
  maxScore: number;
  feedback?: string;
  isPass: boolean;
  gradedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentGradeInput {
  score: number;
  maxScore: number;
  feedback?: string;
  isPass?: boolean;
}

// --- Assignment list params ------------------------------------------------

export interface AssignmentListParams {
  courseId?: string;
  topicId?: string;
  status?: string;
}

// --- Certificate assign / preview inputs -----------------------------------

export interface CertificateAssignInput {
  courseId: string;
  templateId: string;
  autoIssue?: boolean;
}

export interface CertificatePreviewInput {
  templateId: string;
  studentName?: string;
  courseTitle?: string;
  instructorName?: string;
  score?: number;
}

// ===========================================================================
// PHASE 5: PRO ENGAGEMENT TYPES
// ===========================================================================
// Gamification, notification preferences + push subscriptions, accessibility,
// email templates, and legal consents. Mirrors the Phase 5 backend contract —
// list endpoints return `T[]` (or `PaginatedResponse<T>`), single-resource
// endpoints return the bare `T`, mutations return the updated `T` or
// `{ success: boolean }` for deletes.

// --- Gamification: Badges --------------------------------------------------

export type BadgeCriteriaType =
  | "course_completed"
  | "lessons_completed"
  | "quiz_passed"
  | "points_earned"
  | "streak_days";

export interface BadgeCriteria {
  type: BadgeCriteriaType;
  threshold: number;
  courseId?: string;
}

export interface Badge {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  pointsReward?: number;
  criteria: BadgeCriteria;
  isActive: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BadgeCreateInput {
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  pointsReward?: number;
  criteria: BadgeCriteria;
  isActive?: boolean;
}

export interface StudentBadge {
  id: string;
  tenantId: string;
  studentId: string;
  badgeId: string;
  /** Populated from the badge record on the server side. */
  badge?: Badge;
  awardedAt: string;
  courseId?: string;
  createdAt: string;
}

// --- Gamification: Points + Leaderboard -----------------------------------

export interface PointTransaction {
  id: string;
  tenantId: string;
  studentId: string;
  points: number;
  reason: string;
  referenceId?: string;
  createdAt: string;
}

export type LeaderboardScope = "tenant" | "course";
export type LeaderboardPeriod = "weekly" | "monthly" | "alltime";

export interface LeaderboardEntry {
  id: string;
  tenantId: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  totalPoints: number;
  rank: number;
  scope: LeaderboardScope;
  courseId?: string;
  period?: LeaderboardPeriod;
  updatedAt: string;
}

// --- Notification Preferences ----------------------------------------------

export interface NotificationPreference {
  id: string;
  tenantId: string;
  userId: string;
  eventType: string;
  onsiteEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceInput {
  eventType: string;
  onsiteEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
}

// --- Push Subscription -----------------------------------------------------

export interface PushSubscription {
  id: string;
  tenantId: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  isActive: boolean;
  createdAt: string;
}

export interface PushSubscribeInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// --- Accessibility ---------------------------------------------------------

export type AccessibilityFontSize =
  | "small"
  | "medium"
  | "large"
  | "xlarge";

export type ColorBlindMode =
  | "none"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia";

export interface AccessibilityPreferences {
  id: string;
  tenantId: string;
  userId: string;
  fontSize?: AccessibilityFontSize;
  highContrast: boolean;
  screenReader: boolean;
  reducedMotion: boolean;
  dyslexiaFont: boolean;
  colorBlindMode?: ColorBlindMode;
  updatedAt: string;
  createdAt: string;
}

export interface AccessibilityPreferencesInput {
  fontSize?: AccessibilityFontSize;
  highContrast?: boolean;
  screenReader?: boolean;
  reducedMotion?: boolean;
  dyslexiaFont?: boolean;
  colorBlindMode?: ColorBlindMode;
}

// --- Email Templates -------------------------------------------------------

export interface EmailTemplate {
  id: string;
  tenantId: string;
  trigger: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  isDefault: boolean;
  isActive: boolean;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateUpdateInput {
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  isActive?: boolean;
}

export interface EmailPlaceholder {
  id: string;
  tenantId: string;
  trigger: string;
  key: string;
  description?: string;
  example?: string;
}

// --- Legal Consents --------------------------------------------------------

export type ConsentType = "terms" | "privacy" | "marketing" | "cookies";

export interface LegalConsent {
  id: string;
  tenantId: string;
  userId: string;
  consentType: ConsentType;
  version: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
  grantedAt: string;
  createdAt: string;
}

export interface ConsentInput {
  consentType: ConsentType;
  version: string;
  granted: boolean;
}
