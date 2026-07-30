/**
 * LMS API client — thin axios wrapper over `/api/lms/*`.
 *
 * The dev server runs at http://localhost:5173/ and is reverse-proxied by the
 * Next.js host so that `/api/lms/*` reaches the Go backend on port 4290. The
 * base URL therefore uses a same-origin relative path so the request works
 * under both `vite dev` (proxied) and production.
 *
 * Endpoints are grouped by resource and exported as `courseApi`, `topicApi`,
 * etc., mirroring the resource layout in `PHASE1-CONTEXT.md`.
 */

import axios, { AxiosError, AxiosInstance } from "axios";

import type {
  AddToCartInput,
  AddonConfig,
  Assignment,
  AssignmentCreateInput,
  AssignmentGrade,
  AssignmentGradeInput,
  AssignmentListParams,
  AssignmentSubmission,
  AssignmentSubmissionInput,
  CalendarEvent,
  Cart,
  Category,
  CategoryCreateInput,
  Certificate,
  CertificateAssignInput,
  CertificateBackdrop,
  CertificateLayer,
  CertificateLayerCreateInput,
  CertificateMedia,
  CertificateMediaType,
  CertificatePreviewInput,
  CertificateTemplate,
  CertificateTemplateCreateInput,
  CheckoutInput,
  CheckoutResult,
  Coupon,
  CouponCreateInput,
  Course,
  CourseBundle,
  CourseBundleCreateInput,
  CourseCreateInput,
  CourseGift,
  CourseGiftCreateInput,
  CourseInstructor,
  CourseInstructorCreateInput,
  CourseReview,
  CourseReviewCreateInput,
  CourseUpdateInput,
  DripRule,
  DripRuleCreateInput,
  EarningsSummary,
  Enrollment,
  InstructorPayout,
  InstructorPayoutCreateInput,
  Invoice,
  Lesson,
  LessonCreateInput,
  LessonProgress,
  LessonProgressInput,
  LessonUpdateInput,
  ListParams,
  Membership,
  MembershipCreateInput,
  Migration,
  MigrationCreateInput,
  Notification,
  Order,
  OrderActivity,
  OrderCreateInput,
  PaginatedResponse,
  PaymentGatewayConfig,
  PaymentTransaction,
  PrerequisiteChain,
  PrerequisiteChainCreateInput,
  QAQuestion,
  QAQuestionCreateInput,
  Question,
  QuestionCreateInput,
  QuestionUpdateInput,
  Quiz,
  QuizAttempt,
  QuizAttemptSubmitInput,
  QuizCreateInput,
  QuizUpdateInput,
  Refund,
  RefundInput,
  RevenueLedgerEntry,
  RevenueReport,
  StudentNote,
  StudentNoteCreateInput,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanCreateInput,
  Tag,
  TagCreateInput,
  TaxRate,
  TaxRateCreateInput,
  Topic,
  TopicCreateInput,
  TopicUpdateInput,
  UpdateCartItemInput,
  WithdrawalRequest,
  WithdrawalRequestInput,
  Wishlist,
} from "@/types/lms";

// ---------------------------------------------------------------------------
// Axios instance + interceptors
// ---------------------------------------------------------------------------

/**
 * Same-origin relative base. Resolves to `http://localhost:3000/api/lms/*`
 * in dev (proxied by Next.js) and to whatever origin the SPA is served from
 * in production.
 */
const LMS_BASE_URL = "/api/lms";

/** localStorage key the existing auth provider uses (see `src/utils/jwt.ts`). */
const AUTH_TOKEN_KEY = "authToken";

export const lmsAxios: AxiosInstance = axios.create({
  baseURL: LMS_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor — attach the bearer token from localStorage if present.
 * Mirrors the pattern in `src/utils/jwt.ts#setSession` but is per-instance so
 * it doesn't bleed into the generic JWT axios instance.
 */
lmsAxios.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Normalized error shape returned to callers. Always a plain object so hooks
 * can safely do `error.message` without digging into Axios internals.
 */
export interface LmsApiError {
  /** HTTP status code, or 0 for network/timeout errors. */
  status: number;
  /** Human-readable error message. */
  message: string;
  /** Raw error body from the backend (when available). */
  details?: unknown;
}

/**
 * Response interceptor — unwrap backend error envelopes into a consistent
 * `LmsApiError` and reject the promise. Successful responses pass through
 * untouched so callers can destructure `response.data` themselves.
 */
lmsAxios.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status ?? 0;

    let message = "Something went wrong";
    let details: unknown;

    if (error.response) {
      const payload = error.response.data as
        | { message?: string; error?: string }
        | string
        | undefined;

      if (typeof payload === "string" && payload.length > 0) {
        message = payload;
      } else if (payload && typeof payload === "object") {
        message = payload.message ?? payload.error ?? message;
        details = payload;
      } else {
        message = error.message || `Request failed with status ${status}`;
      }
    } else if (error.request) {
      message = "Network error — no response received from the server.";
    } else {
      message = error.message;
    }

    const normalized: LmsApiError = { status, message, details };
    return Promise.reject(normalized);
  },
);

/**
 * Small helper that unwraps `response.data` and lets the call site stay
 * one-liner: `return unwrap(api.get("/foo"))`.
 */
async function unwrap<T>(promise: Promise<{ data: T }>): Promise<T> {
  const response = await promise;
  return response.data;
}

/** Build a query string from a `ListParams` object, skipping empties. */
function toQuery(params?: ListParams): URLSearchParams | undefined {
  if (!params) return undefined;
  const qs = new URLSearchParams();
  (Object.entries(params) as Array<[keyof ListParams, unknown]>).forEach(
    ([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      qs.set(String(key), String(value));
    },
  );
  // Preserve the empty-params ergonomics: return undefined when nothing was set
  // so axios skips the `?` entirely.
  return qs.toString() ? qs : undefined;
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export const courseApi = {
  /** `GET /api/lms/courses` — list courses. */
  list(params?: ListParams): Promise<PaginatedResponse<Course> | Course[]> {
    return unwrap(lmsAxios.get("/courses", { params: toQuery(params) }));
  },
  /** `POST /api/lms/courses` — create a course. */
  create(input: CourseCreateInput): Promise<Course> {
    return unwrap(lmsAxios.post("/courses", input));
  },
  /** `GET /api/lms/courses/{id}` — fetch a single course. */
  get(id: string): Promise<Course> {
    return unwrap(lmsAxios.get(`/courses/${encodeURIComponent(id)}`));
  },
  /** `PATCH /api/lms/courses/{id}` — patch a course. */
  update(id: string, input: CourseUpdateInput): Promise<Course> {
    return unwrap(lmsAxios.patch(`/courses/${encodeURIComponent(id)}`, input));
  },
  /** `DELETE /api/lms/courses/{id}` — delete a course. */
  remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return unwrap(lmsAxios.delete(`/courses/${encodeURIComponent(id)}`));
  },
  /** `POST /api/lms/courses/{id}/publish` — publish a course. */
  publish(id: string): Promise<Course> {
    return unwrap(lmsAxios.post(`/courses/${encodeURIComponent(id)}/publish`));
  },
  /** `POST /api/lms/courses/{courseId}/enroll` — enroll the current user. */
  enroll(courseId: string): Promise<Enrollment> {
    return unwrap(
      lmsAxios.post(`/courses/${encodeURIComponent(courseId)}/enroll`),
    );
  },
};

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

export const topicApi = {
  /** `GET /api/lms/courses/{courseId}/topics`. */
  list(courseId: string): Promise<Topic[]> {
    return unwrap(
      lmsAxios.get(`/courses/${encodeURIComponent(courseId)}/topics`),
    );
  },
  /** `POST /api/lms/courses/{courseId}/topics`. */
  create(courseId: string, input: TopicCreateInput): Promise<Topic> {
    return unwrap(
      lmsAxios.post(`/courses/${encodeURIComponent(courseId)}/topics`, input),
    );
  },
  /** `PATCH /api/lms/topics/{id}`. */
  update(id: string, input: TopicUpdateInput): Promise<Topic> {
    return unwrap(lmsAxios.patch(`/topics/${encodeURIComponent(id)}`, input));
  },
  /** `DELETE /api/lms/topics/{id}`. */
  remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return unwrap(lmsAxios.delete(`/topics/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export const lessonApi = {
  /** `GET /api/lms/topics/{topicId}/lessons`. */
  list(topicId: string): Promise<Lesson[]> {
    return unwrap(lmsAxios.get(`/topics/${encodeURIComponent(topicId)}/lessons`));
  },
  /** `POST /api/lms/topics/{topicId}/lessons`. */
  create(topicId: string, input: LessonCreateInput): Promise<Lesson> {
    return unwrap(
      lmsAxios.post(`/topics/${encodeURIComponent(topicId)}/lessons`, input),
    );
  },
  /** `PATCH /api/lms/lessons/{id}`. */
  update(id: string, input: LessonUpdateInput): Promise<Lesson> {
    return unwrap(lmsAxios.patch(`/lessons/${encodeURIComponent(id)}`, input));
  },
  /** `DELETE /api/lms/lessons/{id}`. */
  remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return unwrap(lmsAxios.delete(`/lessons/${encodeURIComponent(id)}`));
  },
  /** `POST /api/lms/lessons/{lessonId}/progress`. */
  updateProgress(
    lessonId: string,
    input: LessonProgressInput,
  ): Promise<LessonProgress> {
    return unwrap(
      lmsAxios.post(`/lessons/${encodeURIComponent(lessonId)}/progress`, input),
    );
  },
};

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export const quizApi = {
  /** `GET /api/lms/topics/{topicId}/quizzes`. */
  list(topicId: string): Promise<Quiz[]> {
    return unwrap(
      lmsAxios.get(`/topics/${encodeURIComponent(topicId)}/quizzes`),
    );
  },
  /** `POST /api/lms/topics/{topicId}/quizzes`. */
  create(topicId: string, input: QuizCreateInput): Promise<Quiz> {
    return unwrap(
      lmsAxios.post(`/topics/${encodeURIComponent(topicId)}/quizzes`, input),
    );
  },
  /** `PATCH /api/lms/quizzes/{id}`. */
  update(id: string, input: QuizUpdateInput): Promise<Quiz> {
    return unwrap(lmsAxios.patch(`/quizzes/${encodeURIComponent(id)}`, input));
  },
  /** `DELETE /api/lms/quizzes/{id}`. */
  remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return unwrap(lmsAxios.delete(`/quizzes/${encodeURIComponent(id)}`));
  },
  /**
   * `GET /api/lms/quizzes/{quizId}/attempts` — list attempts for a quiz.
   *
   * NOTE: Not yet documented in `PHASE1-CONTEXT.md` but the corresponding
   * hook (`useQuizAttempts`) is required by the spec. Will 404 until the
   * backend ships the matching handler; callers see the error in `error`.
   */
  listAttempts(quizId: string): Promise<QuizAttempt[]> {
    return unwrap(
      lmsAxios.get(`/quizzes/${encodeURIComponent(quizId)}/attempts`),
    );
  },
  /** `POST /api/lms/quizzes/{quizId}/attempts` — start an attempt. */
  startAttempt(quizId: string): Promise<QuizAttempt> {
    return unwrap(
      lmsAxios.post(`/quizzes/${encodeURIComponent(quizId)}/attempts`),
    );
  },
  /** `POST /api/lms/quizzes/attempts/{id}/submit` — submit an attempt. */
  submitAttempt(
    attemptId: string,
    input: QuizAttemptSubmitInput,
  ): Promise<QuizAttempt> {
    return unwrap(
      lmsAxios.post(
        `/quizzes/attempts/${encodeURIComponent(attemptId)}/submit`,
        input,
      ),
    );
  },
};

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const questionApi = {
  /** `POST /api/lms/quizzes/{quizId}/questions`. */
  create(quizId: string, input: QuestionCreateInput): Promise<Question> {
    return unwrap(
      lmsAxios.post(`/quizzes/${encodeURIComponent(quizId)}/questions`, input),
    );
  },
  /** `PATCH /api/lms/questions/{id}`. */
  update(id: string, input: QuestionUpdateInput): Promise<Question> {
    return unwrap(
      lmsAxios.patch(`/questions/${encodeURIComponent(id)}`, input),
    );
  },
  /** `DELETE /api/lms/questions/{id}`. */
  remove(id: string): Promise<{ id: string; deleted: boolean }> {
    return unwrap(lmsAxios.delete(`/questions/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export const assignmentApi = {
  /** `POST /api/lms/topics/{topicId}/assignments`. */
  create(
    topicId: string,
    input: AssignmentCreateInput,
  ): Promise<Assignment> {
    return unwrap(
      lmsAxios.post(
        `/topics/${encodeURIComponent(topicId)}/assignments`,
        input,
      ),
    );
  },
  /** `POST /api/lms/assignments/{id}/submit`. */
  submit(
    assignmentId: string,
    input: AssignmentSubmissionInput,
  ): Promise<AssignmentSubmission> {
    return unwrap(
      lmsAxios.post(
        `/assignments/${encodeURIComponent(assignmentId)}/submit`,
        input,
      ),
    );
  },
};

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

export const enrollmentApi = {
  /** `GET /api/lms/enrollments` — list the current user's enrollments. */
  list(params?: ListParams): Promise<Enrollment[]> {
    return unwrap(lmsAxios.get("/enrollments", { params: toQuery(params) }));
  },
};

// ---------------------------------------------------------------------------
// Q&A
// ---------------------------------------------------------------------------

export const qaApi = {
  /** `GET /api/lms/courses/{courseId}/qa`. */
  list(courseId: string): Promise<QAQuestion[]> {
    return unwrap(lmsAxios.get(`/courses/${encodeURIComponent(courseId)}/qa`));
  },
  /** `POST /api/lms/courses/{courseId}/qa`. */
  ask(courseId: string, input: QAQuestionCreateInput): Promise<QAQuestion> {
    return unwrap(
      lmsAxios.post(`/courses/${encodeURIComponent(courseId)}/qa`, input),
    );
  },
};

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviewApi = {
  /** `GET /api/lms/courses/{courseId}/reviews`. */
  list(courseId: string): Promise<CourseReview[]> {
    return unwrap(
      lmsAxios.get(`/courses/${encodeURIComponent(courseId)}/reviews`),
    );
  },
  /** `POST /api/lms/courses/{courseId}/reviews`. */
  submit(
    courseId: string,
    input: CourseReviewCreateInput,
  ): Promise<CourseReview> {
    return unwrap(
      lmsAxios.post(`/courses/${encodeURIComponent(courseId)}/reviews`, input),
    );
  },
};

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const noteApi = {
  /** `GET /api/lms/notes`. */
  list(params?: ListParams): Promise<StudentNote[]> {
    return unwrap(lmsAxios.get("/notes", { params: toQuery(params) }));
  },
  /** `POST /api/lms/notes`. */
  create(input: StudentNoteCreateInput): Promise<StudentNote> {
    return unwrap(lmsAxios.post("/notes", input));
  },
};

// ---------------------------------------------------------------------------
// Categories & Tags
// ---------------------------------------------------------------------------

export const categoryApi = {
  /** `GET /api/lms/categories`. */
  list(params?: ListParams): Promise<Category[]> {
    return unwrap(lmsAxios.get("/categories", { params: toQuery(params) }));
  },
  /** `POST /api/lms/categories`. */
  create(input: CategoryCreateInput): Promise<Category> {
    return unwrap(lmsAxios.post("/categories", input));
  },
};

export const tagApi = {
  /** `GET /api/lms/tags`. */
  list(params?: ListParams): Promise<Tag[]> {
    return unwrap(lmsAxios.get("/tags", { params: toQuery(params) }));
  },
  /** `POST /api/lms/tags`. */
  create(input: TagCreateInput): Promise<Tag> {
    return unwrap(lmsAxios.post("/tags", input));
  },
};

// ---------------------------------------------------------------------------
// Orders & Coupons
// ---------------------------------------------------------------------------

export const orderApi = {
  /** `GET /api/lms/orders`. */
  list(params?: ListParams): Promise<Order[]> {
    return unwrap(lmsAxios.get("/orders", { params: toQuery(params) }));
  },
  /** `GET /api/lms/orders/{id}` — fetch a single order with its items. */
  get(id: string): Promise<Order> {
    return unwrap(lmsAxios.get(`/orders/${encodeURIComponent(id)}`));
  },
  /** `POST /api/lms/orders`. */
  create(input: OrderCreateInput): Promise<Order> {
    return unwrap(lmsAxios.post("/orders", input));
  },
  /** `POST /api/lms/orders/{id}/refund` — issue a full or partial refund. */
  refund(id: string, input: RefundInput): Promise<Order> {
    return unwrap(
      lmsAxios.post(`/orders/${encodeURIComponent(id)}/refund`, input),
    );
  },
  /** `POST /api/lms/orders/{id}/cancel` — cancel an unpaid/pending order. */
  cancel(id: string): Promise<Order> {
    return unwrap(lmsAxios.post(`/orders/${encodeURIComponent(id)}/cancel`));
  },
  /** `GET /api/lms/orders/{id}/activity` — audit trail for an order. */
  getActivity(id: string): Promise<OrderActivity[]> {
    return unwrap(
      lmsAxios.get(`/orders/${encodeURIComponent(id)}/activity`),
    );
  },
};

export const couponApi = {
  /** `GET /api/lms/coupons`. */
  list(params?: ListParams): Promise<Coupon[]> {
    return unwrap(lmsAxios.get("/coupons", { params: toQuery(params) }));
  },
  /** `POST /api/lms/coupons`. */
  create(input: CouponCreateInput): Promise<Coupon> {
    return unwrap(lmsAxios.post("/coupons", input));
  },
  /** `DELETE /api/lms/coupons/{id}` — deactivate / remove a coupon. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(lmsAxios.delete(`/coupons/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

export const certificateApi = {
  /** `GET /api/lms/certificates`. */
  list(params?: ListParams): Promise<Certificate[]> {
    return unwrap(
      lmsAxios.get("/certificates", { params: toQuery(params) }),
    );
  },
  /** `POST /api/lms/certificates/templates`. */
  createTemplate(
    input: CertificateTemplateCreateInput,
  ): Promise<CertificateTemplate> {
    return unwrap(lmsAxios.post("/certificates/templates", input));
  },
  /** `GET /api/lms/certificates/templates` — list all templates for the tenant. */
  getTemplates(): Promise<CertificateTemplate[]> {
    return unwrap(lmsAxios.get("/certificates/templates"));
  },
  /** `GET /api/lms/certificates/templates/{id}` — fetch a single template. */
  getTemplate(id: string): Promise<CertificateTemplate> {
    return unwrap(
      lmsAxios.get(`/certificates/templates/${encodeURIComponent(id)}`),
    );
  },
  /** `PATCH /api/lms/certificates/templates/{id}` — update a template. */
  updateTemplate(
    id: string,
    input: CertificateTemplateCreateInput,
  ): Promise<CertificateTemplate> {
    return unwrap(
      lmsAxios.patch(
        `/certificates/templates/${encodeURIComponent(id)}`,
        input,
      ),
    );
  },
  /** `DELETE /api/lms/certificates/templates/{id}` — remove a template. */
  deleteTemplate(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/certificates/templates/${encodeURIComponent(id)}`),
    );
  },
  /** `POST /api/lms/certificates/templates/{id}/duplicate` — clone a template. */
  duplicateTemplate(id: string): Promise<CertificateTemplate> {
    return unwrap(
      lmsAxios.post(
        `/certificates/templates/${encodeURIComponent(id)}/duplicate`,
      ),
    );
  },
  /** `POST /api/lms/certificates/templates/{id}/preview` — render a preview. */
  previewTemplate(
    input: CertificatePreviewInput,
  ): Promise<{ previewUrl: string }> {
    return unwrap(
      lmsAxios.post(
        `/certificates/templates/${encodeURIComponent(input.templateId)}/preview`,
        input,
      ),
    );
  },
  /** `POST /api/lms/certificates/assign` — bind a template to a course. */
  assignToCourse(
    input: CertificateAssignInput,
  ): Promise<{ success: boolean }> {
    return unwrap(lmsAxios.post("/certificates/assign", input));
  },
  /** `GET /api/lms/certificates/{id}/download` — get the PDF download URL. */
  download(id: string): Promise<{ pdfUrl: string }> {
    return unwrap(
      lmsAxios.get(`/certificates/${encodeURIComponent(id)}/download`),
    );
  },
  /** `GET /api/lms/certificates/verify/{code}` — public verification lookup. */
  verify(
    code: string,
  ): Promise<{ valid: boolean; certificate?: Certificate }> {
    return unwrap(
      lmsAxios.get(`/certificates/verify/${encodeURIComponent(code)}`),
    );
  },
  /** `POST /api/lms/certificates/{id}/revoke` — revoke an issued certificate. */
  revoke(id: string, reason?: string): Promise<Certificate> {
    return unwrap(
      lmsAxios.post(`/certificates/${encodeURIComponent(id)}/revoke`, {
        reason,
      }),
    );
  },
};

// ---------------------------------------------------------------------------
// Bundles / Memberships / Gifts
// ---------------------------------------------------------------------------

export const bundleApi = {
  /** `GET /api/lms/bundles`. */
  list(params?: ListParams): Promise<CourseBundle[]> {
    return unwrap(lmsAxios.get("/bundles", { params: toQuery(params) }));
  },
  /** `POST /api/lms/bundles`. */
  create(input: CourseBundleCreateInput): Promise<CourseBundle> {
    return unwrap(lmsAxios.post("/bundles", input));
  },
};

export const membershipApi = {
  /** `GET /api/lms/memberships`. */
  list(params?: ListParams): Promise<Membership[]> {
    return unwrap(lmsAxios.get("/memberships", { params: toQuery(params) }));
  },
  /** `POST /api/lms/memberships`. */
  create(input: MembershipCreateInput): Promise<Membership> {
    return unwrap(lmsAxios.post("/memberships", input));
  },
};

export const giftApi = {
  /** `POST /api/lms/gifts`. */
  create(input: CourseGiftCreateInput): Promise<CourseGift> {
    return unwrap(lmsAxios.post("/gifts", input));
  },
  /** `GET /api/lms/gifts/:id`. */
  get(id: string): Promise<CourseGift> {
    return unwrap(lmsAxios.get(`/gifts/${encodeURIComponent(id)}`));
  },
  /** `GET /api/lms/gifts` — list gifts (sent by the current user). */
  list(params?: ListParams): Promise<CourseGift[]> {
    return unwrap(lmsAxios.get("/gifts", { params: toQuery(params) }));
  },
  /** `POST /api/lms/gifts/redeem` — redeem a gift code (recipient flow). */
  redeem(code: string): Promise<CourseGift> {
    return unwrap(lmsAxios.post("/gifts/redeem", { code }));
  },
};

// ---------------------------------------------------------------------------
// Instructor payouts
// ---------------------------------------------------------------------------

export const payoutApi = {
  /** `GET /api/lms/instructor/payouts`. */
  list(params?: ListParams): Promise<InstructorPayout[]> {
    return unwrap(
      lmsAxios.get("/instructor/payouts", { params: toQuery(params) }),
    );
  },
  /** `POST /api/lms/instructor/payouts`. */
  create(input: InstructorPayoutCreateInput): Promise<InstructorPayout> {
    return unwrap(lmsAxios.post("/instructor/payouts", input));
  },
};

// ---------------------------------------------------------------------------
// Notifications / Calendar
// ---------------------------------------------------------------------------

export const notificationApi = {
  /** `GET /api/lms/notifications`. */
  list(params?: ListParams): Promise<Notification[]> {
    return unwrap(
      lmsAxios.get("/notifications", { params: toQuery(params) }),
    );
  },
};

export const calendarApi = {
  /** `GET /api/lms/calendar`. */
  list(params?: ListParams & { from?: string; to?: string }): Promise<
    CalendarEvent[]
  > {
    return unwrap(lmsAxios.get("/calendar", { params: toQuery(params) }));
  },
};

// ---------------------------------------------------------------------------
// Migrations / Addons
// ---------------------------------------------------------------------------

export const migrationApi = {
  /** `GET /api/lms/migrations`. */
  list(params?: ListParams): Promise<Migration[]> {
    return unwrap(lmsAxios.get("/migrations", { params: toQuery(params) }));
  },
  /** `POST /api/lms/migrations`. */
  create(input: MigrationCreateInput): Promise<Migration> {
    return unwrap(lmsAxios.post("/migrations", input));
  },
};

export const addonApi = {
  /** `GET /api/lms/addons`. */
  list(params?: ListParams): Promise<AddonConfig[]> {
    return unwrap(lmsAxios.get("/addons", { params: toQuery(params) }));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Cart
// ---------------------------------------------------------------------------

export const cartApi = {
  /** `GET /api/lms/cart` — fetch the current user's active cart. */
  get(): Promise<Cart> {
    return unwrap(lmsAxios.get("/cart"));
  },
  /** `POST /api/lms/cart/items` — add an item to the cart. */
  addItem(input: AddToCartInput): Promise<Cart> {
    return unwrap(lmsAxios.post("/cart/items", input));
  },
  /** `PATCH /api/lms/cart/items/{itemId}` — update an item's quantity. */
  updateItem(itemId: string, input: UpdateCartItemInput): Promise<Cart> {
    return unwrap(
      lmsAxios.patch(`/cart/items/${encodeURIComponent(itemId)}`, input),
    );
  },
  /** `DELETE /api/lms/cart/items/{itemId}` — remove an item from the cart. */
  removeItem(itemId: string): Promise<Cart> {
    return unwrap(
      lmsAxios.delete(`/cart/items/${encodeURIComponent(itemId)}`),
    );
  },
  /** `DELETE /api/lms/cart` — empty the cart entirely. */
  clear(): Promise<{ success: boolean }> {
    return unwrap(lmsAxios.delete("/cart"));
  },
  /** `POST /api/lms/cart/apply-coupon` — apply a coupon code to the cart. */
  applyCoupon(code: string): Promise<Cart> {
    return unwrap(lmsAxios.post("/cart/apply-coupon", { code }));
  },
  /** `DELETE /api/lms/cart/coupon` — remove the applied coupon. */
  removeCoupon(): Promise<Cart> {
    return unwrap(lmsAxios.delete("/cart/coupon"));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Checkout
// ---------------------------------------------------------------------------

export const checkoutApi = {
  /** `POST /api/lms/checkout` — start a checkout session. */
  create(input: CheckoutInput): Promise<CheckoutResult> {
    return unwrap(lmsAxios.post("/checkout", input));
  },
  /**
   * `GET /api/lms/checkout/success?session_id=...` — confirm a successful
   * redirect from the payment gateway. Returns the final order id + status.
   */
  success(
    sessionId: string,
  ): Promise<{ orderId: string; status: string }> {
    return unwrap(
      lmsAxios.get("/checkout/success", {
        params: { session_id: sessionId },
      }),
    );
  },
  /** `GET /api/lms/checkout/cancel` — acknowledge a canceled checkout. */
  cancel(): Promise<{ status: string }> {
    return unwrap(lmsAxios.get("/checkout/cancel"));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Invoices
// ---------------------------------------------------------------------------

export const invoiceApi = {
  /** `GET /api/lms/invoices`. */
  list(
    params?: ListParams,
  ): Promise<PaginatedResponse<Invoice>> {
    return unwrap(
      lmsAxios.get("/invoices", { params: toQuery(params) }),
    );
  },
  /** `GET /api/lms/invoices/{id}`. */
  get(id: string): Promise<Invoice> {
    return unwrap(lmsAxios.get(`/invoices/${encodeURIComponent(id)}`));
  },
  /** `GET /api/lms/invoices/{id}/pdf` — get a pre-signed PDF URL. */
  downloadPdf(id: string): Promise<{ pdfUrl: string }> {
    return unwrap(
      lmsAxios.get(`/invoices/${encodeURIComponent(id)}/pdf`),
    );
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Tax Rates
// ---------------------------------------------------------------------------

export const taxRateApi = {
  /** `GET /api/lms/taxes`. */
  list(params?: ListParams): Promise<PaginatedResponse<TaxRate>> {
    return unwrap(lmsAxios.get("/taxes", { params: toQuery(params) }));
  },
  /** `POST /api/lms/taxes`. */
  create(input: TaxRateCreateInput): Promise<TaxRate> {
    return unwrap(lmsAxios.post("/taxes", input));
  },
  /** `PATCH /api/lms/taxes/{id}`. */
  update(
    id: string,
    input: Partial<TaxRateCreateInput>,
  ): Promise<TaxRate> {
    return unwrap(lmsAxios.patch(`/taxes/${encodeURIComponent(id)}`, input));
  },
  /** `DELETE /api/lms/taxes/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(lmsAxios.delete(`/taxes/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Subscription Plans (catalog)
// ---------------------------------------------------------------------------

export const subscriptionPlanApi = {
  /** `GET /api/lms/subscription-plans`. */
  list(
    params?: ListParams,
  ): Promise<PaginatedResponse<SubscriptionPlan>> {
    return unwrap(
      lmsAxios.get("/subscription-plans", { params: toQuery(params) }),
    );
  },
  /** `GET /api/lms/subscription-plans/{id}`. */
  get(id: string): Promise<SubscriptionPlan> {
    return unwrap(
      lmsAxios.get(`/subscription-plans/${encodeURIComponent(id)}`),
    );
  },
  /** `POST /api/lms/subscription-plans`. */
  create(input: SubscriptionPlanCreateInput): Promise<SubscriptionPlan> {
    return unwrap(lmsAxios.post("/subscription-plans", input));
  },
  /** `PATCH /api/lms/subscription-plans/{id}`. */
  update(
    id: string,
    input: Partial<SubscriptionPlanCreateInput>,
  ): Promise<SubscriptionPlan> {
    return unwrap(
      lmsAxios.patch(`/subscription-plans/${encodeURIComponent(id)}`, input),
    );
  },
  /** `DELETE /api/lms/subscription-plans/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/subscription-plans/${encodeURIComponent(id)}`),
    );
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Subscriptions (user's active subscriptions)
// ---------------------------------------------------------------------------

export const subscriptionApi = {
  /** `GET /api/lms/subscriptions`. */
  list(params?: ListParams): Promise<PaginatedResponse<Subscription>> {
    return unwrap(
      lmsAxios.get("/subscriptions", { params: toQuery(params) }),
    );
  },
  /** `GET /api/lms/subscriptions/{id}`. */
  get(id: string): Promise<Subscription> {
    return unwrap(
      lmsAxios.get(`/subscriptions/${encodeURIComponent(id)}`),
    );
  },
  /** `POST /api/lms/subscriptions/{id}/cancel`. */
  cancel(id: string): Promise<Subscription> {
    return unwrap(
      lmsAxios.post(`/subscriptions/${encodeURIComponent(id)}/cancel`),
    );
  },
  /** `POST /api/lms/subscriptions/{id}/resume`. */
  resume(id: string): Promise<Subscription> {
    return unwrap(
      lmsAxios.post(`/subscriptions/${encodeURIComponent(id)}/resume`),
    );
  },
  /** `POST /api/lms/subscriptions/{id}/retry` — retry a failed renewal. */
  retry(id: string): Promise<Subscription> {
    return unwrap(
      lmsAxios.post(`/subscriptions/${encodeURIComponent(id)}/retry`),
    );
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Payments
// ---------------------------------------------------------------------------

export const paymentApi = {
  /** `GET /api/lms/payments`. */
  list(
    params?: ListParams,
  ): Promise<PaginatedResponse<PaymentTransaction>> {
    return unwrap(lmsAxios.get("/payments", { params: toQuery(params) }));
  },
  /** `GET /api/lms/payments/{id}`. */
  get(id: string): Promise<PaymentTransaction> {
    return unwrap(lmsAxios.get(`/payments/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Refunds
// ---------------------------------------------------------------------------

export const refundApi = {
  /** `GET /api/lms/refunds`. */
  list(params?: ListParams): Promise<PaginatedResponse<Refund>> {
    return unwrap(lmsAxios.get("/refunds", { params: toQuery(params) }));
  },
  /** `GET /api/lms/refunds/{id}`. */
  get(id: string): Promise<Refund> {
    return unwrap(lmsAxios.get(`/refunds/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Wishlists
// ---------------------------------------------------------------------------

export const wishlistApi = {
  /** `GET /api/lms/wishlist` — list the current user's wishlisted courses. */
  list(): Promise<Wishlist[]> {
    return unwrap(lmsAxios.get("/wishlist"));
  },
  /** `POST /api/lms/wishlist` — add a course to the wishlist. */
  add(courseId: string): Promise<Wishlist> {
    return unwrap(lmsAxios.post("/wishlist", { courseId }));
  },
  /** `DELETE /api/lms/wishlist/{id}` — remove a wishlist entry. */
  remove(id: string): Promise<{ success: boolean }> {
    return unwrap(lmsAxios.delete(`/wishlist/${encodeURIComponent(id)}`));
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Revenue (admin)
// ---------------------------------------------------------------------------

export const revenueApi = {
  /** `GET /api/lms/admin/revenue-ledger`. */
  ledger(
    params?: ListParams,
  ): Promise<PaginatedResponse<RevenueLedgerEntry>> {
    return unwrap(
      lmsAxios.get("/admin/revenue-ledger", { params: toQuery(params) }),
    );
  },
  /**
   * `GET /api/lms/admin/reports/revenue` — aggregated revenue report.
   * `from` / `to` are optional ISO date strings used to bound the window.
   */
  report(params?: {
    from?: string;
    to?: string;
  }): Promise<RevenueReport> {
    return unwrap(
      lmsAxios.get("/admin/reports/revenue", { params }),
    );
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Withdrawals (instructor + admin)
// ---------------------------------------------------------------------------

export const withdrawalApi = {
  /** `GET /api/lms/instructor/withdrawals` — list the instructor's own requests. */
  listMine(
    params?: ListParams,
  ): Promise<PaginatedResponse<WithdrawalRequest>> {
    return unwrap(
      lmsAxios.get("/instructor/withdrawals", { params: toQuery(params) }),
    );
  },
  /** `POST /api/lms/instructor/withdrawals` — request a new withdrawal. */
  request(input: WithdrawalRequestInput): Promise<WithdrawalRequest> {
    return unwrap(lmsAxios.post("/instructor/withdrawals", input));
  },
  /** `GET /api/lms/admin/withdrawals` — admin: list all withdrawal requests. */
  listAll(
    params?: ListParams,
  ): Promise<PaginatedResponse<WithdrawalRequest>> {
    return unwrap(
      lmsAxios.get("/admin/withdrawals", { params: toQuery(params) }),
    );
  },
  /** `POST /api/lms/admin/withdrawals/{id}/approve`. */
  approve(id: string): Promise<WithdrawalRequest> {
    return unwrap(
      lmsAxios.post(`/admin/withdrawals/${encodeURIComponent(id)}/approve`),
    );
  },
  /** `POST /api/lms/admin/withdrawals/{id}/reject`. */
  reject(id: string, notes?: string): Promise<WithdrawalRequest> {
    return unwrap(
      lmsAxios.post(
        `/admin/withdrawals/${encodeURIComponent(id)}/reject`,
        { notes },
      ),
    );
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Earnings (instructor)
// ---------------------------------------------------------------------------

export const earningsApi = {
  /**
   * `GET /api/lms/instructor/earnings` — aggregated earnings summary with a
   * 12-month series suitable for a dashboard chart.
   */
  summary(params?: {
    from?: string;
    to?: string;
  }): Promise<EarningsSummary> {
    return unwrap(
      lmsAxios.get("/instructor/earnings", { params }),
    );
  },
  /** `GET /api/lms/instructor/statements` — paginated ledger entries. */
  statements(
    params?: ListParams,
  ): Promise<PaginatedResponse<RevenueLedgerEntry>> {
    return unwrap(
      lmsAxios.get("/instructor/statements", { params: toQuery(params) }),
    );
  },
};

// ---------------------------------------------------------------------------
// PHASE 3: eCommerce — Payment Gateways (tenant admin config)
// ---------------------------------------------------------------------------

export const gatewayApi = {
  /** `GET /api/lms/gateways` — list configured gateways for the tenant. */
  list(): Promise<PaymentGatewayConfig[]> {
    return unwrap(lmsAxios.get("/gateways"));
  },
  /** `POST /api/lms/gateways` — register a new gateway. */
  create(
    input: Partial<PaymentGatewayConfig>,
  ): Promise<PaymentGatewayConfig> {
    return unwrap(lmsAxios.post("/gateways", input));
  },
  /** `PATCH /api/lms/gateways/{id}` — update gateway config (e.g. toggle, mode). */
  update(
    id: string,
    input: Partial<PaymentGatewayConfig>,
  ): Promise<PaymentGatewayConfig> {
    return unwrap(
      lmsAxios.patch(`/gateways/${encodeURIComponent(id)}`, input),
    );
  },
  /** `DELETE /api/lms/gateways/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(lmsAxios.delete(`/gateways/${encodeURIComponent(id)}`));
  },
};

// ===========================================================================
// Phase 4 — Pro Authoring resource groups
// ===========================================================================

// --- Certificate Layers (visual canvas editor) -----------------------------

export const certificateLayerApi = {
  /** `GET /api/lms/certificates/templates/{templateId}/layers`. */
  list(templateId: string): Promise<CertificateLayer[]> {
    return unwrap(
      lmsAxios.get(
        `/certificates/templates/${encodeURIComponent(templateId)}/layers`,
      ),
    );
  },
  /** `POST /api/lms/certificates/layers`. */
  create(input: CertificateLayerCreateInput): Promise<CertificateLayer> {
    return unwrap(lmsAxios.post("/certificates/layers", input));
  },
  /** `PATCH /api/lms/certificates/layers/{id}`. */
  update(
    id: string,
    input: Partial<CertificateLayerCreateInput>,
  ): Promise<CertificateLayer> {
    return unwrap(
      lmsAxios.patch(`/certificates/layers/${encodeURIComponent(id)}`, input),
    );
  },
  /** `DELETE /api/lms/certificates/layers/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/certificates/layers/${encodeURIComponent(id)}`),
    );
  },
  /** `POST /api/lms/certificates/templates/{templateId}/layers/reorder`. */
  reorder(
    templateId: string,
    layerIds: string[],
  ): Promise<CertificateLayer[]> {
    return unwrap(
      lmsAxios.post(
        `/certificates/templates/${encodeURIComponent(templateId)}/layers/reorder`,
        { layerIds },
      ),
    );
  },
};

// --- Certificate Backdrops --------------------------------------------------

export const certificateBackdropApi = {
  /** `GET /api/lms/certificates/backdrops`. */
  list(): Promise<CertificateBackdrop[]> {
    return unwrap(lmsAxios.get("/certificates/backdrops"));
  },
  /** `POST /api/lms/certificates/backdrops`. */
  create(input: {
    name: string;
    imageUrl: string;
    orientation?: string;
  }): Promise<CertificateBackdrop> {
    return unwrap(lmsAxios.post("/certificates/backdrops", input));
  },
  /** `DELETE /api/lms/certificates/backdrops/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/certificates/backdrops/${encodeURIComponent(id)}`),
    );
  },
};

// --- Certificate Media ------------------------------------------------------

export const certificateMediaApi = {
  /** `GET /api/lms/certificates/media` — optionally filtered by mediaType. */
  list(
    mediaType?: CertificateMediaType,
  ): Promise<CertificateMedia[]> {
    return unwrap(
      lmsAxios.get("/certificates/media", { params: { mediaType } }),
    );
  },
  /** `POST /api/lms/certificates/media`. */
  create(input: {
    name: string;
    imageUrl: string;
    mediaType: CertificateMediaType;
  }): Promise<CertificateMedia> {
    return unwrap(lmsAxios.post("/certificates/media", input));
  },
  /** `DELETE /api/lms/certificates/media/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/certificates/media/${encodeURIComponent(id)}`),
    );
  },
};

// --- Drip Rules -------------------------------------------------------------

export const dripRuleApi = {
  /** `GET /api/lms/courses/{courseId}/drip-rules`. */
  list(courseId: string): Promise<DripRule[]> {
    return unwrap(
      lmsAxios.get(`/courses/${encodeURIComponent(courseId)}/drip-rules`),
    );
  },
  /** `GET /api/lms/drip-rules/{id}`. */
  get(id: string): Promise<DripRule> {
    return unwrap(lmsAxios.get(`/drip-rules/${encodeURIComponent(id)}`));
  },
  /** `POST /api/lms/drip-rules`. */
  create(input: DripRuleCreateInput): Promise<DripRule> {
    return unwrap(lmsAxios.post("/drip-rules", input));
  },
  /** `PATCH /api/lms/drip-rules/{id}`. */
  update(
    id: string,
    input: Partial<DripRuleCreateInput>,
  ): Promise<DripRule> {
    return unwrap(
      lmsAxios.patch(`/drip-rules/${encodeURIComponent(id)}`, input),
    );
  },
  /** `DELETE /api/lms/drip-rules/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/drip-rules/${encodeURIComponent(id)}`),
    );
  },
  /** `GET /api/lms/lessons/{lessonId}/drip-check` — runtime access check. */
  checkAccess(
    lessonId: string,
  ): Promise<{ hasAccess: boolean; reason?: string; unlockAt?: string }> {
    return unwrap(
      lmsAxios.get(`/lessons/${encodeURIComponent(lessonId)}/drip-check`),
    );
  },
};

// --- Prerequisite Chains ----------------------------------------------------

export const prerequisiteApi = {
  /** `GET /api/lms/courses/{courseId}/prerequisites`. */
  list(courseId: string): Promise<PrerequisiteChain[]> {
    return unwrap(
      lmsAxios.get(`/courses/${encodeURIComponent(courseId)}/prerequisites`),
    );
  },
  /** `POST /api/lms/prerequisites`. */
  create(input: PrerequisiteChainCreateInput): Promise<PrerequisiteChain> {
    return unwrap(lmsAxios.post("/prerequisites", input));
  },
  /** `DELETE /api/lms/prerequisites/{id}`. */
  delete(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/prerequisites/${encodeURIComponent(id)}`),
    );
  },
  /** `GET /api/lms/courses/{courseId}/prerequisite-check` — eligibility probe. */
  checkEligibility(
    courseId: string,
  ): Promise<{ eligible: boolean; missingPrerequisites: string[] }> {
    return unwrap(
      lmsAxios.get(
        `/courses/${encodeURIComponent(courseId)}/prerequisite-check`,
      ),
    );
  },
};

// --- Course Instructors (multi-instructor) ---------------------------------

export const courseInstructorApi = {
  /** `GET /api/lms/courses/{courseId}/instructors`. */
  list(courseId: string): Promise<CourseInstructor[]> {
    return unwrap(
      lmsAxios.get(`/courses/${encodeURIComponent(courseId)}/instructors`),
    );
  },
  /** `POST /api/lms/course-instructors`. */
  add(input: CourseInstructorCreateInput): Promise<CourseInstructor> {
    return unwrap(lmsAxios.post("/course-instructors", input));
  },
  /** `PATCH /api/lms/course-instructors/{id}`. */
  update(
    id: string,
    input: Partial<CourseInstructorCreateInput>,
  ): Promise<CourseInstructor> {
    return unwrap(
      lmsAxios.patch(
        `/course-instructors/${encodeURIComponent(id)}`,
        input,
      ),
    );
  },
  /** `DELETE /api/lms/course-instructors/{id}`. */
  remove(id: string): Promise<{ success: boolean }> {
    return unwrap(
      lmsAxios.delete(`/course-instructors/${encodeURIComponent(id)}`),
    );
  },
};

// --- Assignment Grades ------------------------------------------------------

export const assignmentGradeApi = {
  /** `GET /api/lms/assignment-submissions/{submissionId}/grade`. */
  get(submissionId: string): Promise<AssignmentGrade> {
    return unwrap(
      lmsAxios.get(
        `/assignment-submissions/${encodeURIComponent(submissionId)}/grade`,
      ),
    );
  },
  /** `POST /api/lms/assignment-submissions/{submissionId}/grade`. */
  create(
    submissionId: string,
    input: AssignmentGradeInput,
  ): Promise<AssignmentGrade> {
    return unwrap(
      lmsAxios.post(
        `/assignment-submissions/${encodeURIComponent(submissionId)}/grade`,
        input,
      ),
    );
  },
  /** `PATCH /api/lms/assignment-grades/{gradeId}`. */
  update(
    gradeId: string,
    input: Partial<AssignmentGradeInput>,
  ): Promise<AssignmentGrade> {
    return unwrap(
      lmsAxios.patch(
        `/assignment-grades/${encodeURIComponent(gradeId)}`,
        input,
      ),
    );
  },
};

// --- Assignments (extended) -------------------------------------------------
// The legacy `assignmentApi` only exposes `create` + `submit`. This extended
// surface adds list/get/listSubmissions/getSubmission for the Phase 4 grading
// studio and the assignment manager page. The two objects coexist so existing
// imports keep working — pick `lmsApi.assignment` for legacy `create`/`submit`
// or `lmsApi.assignmentExtended` for the Phase 4 read paths.

export const assignmentApiExtended = {
  /** `GET /api/lms/assignments`. */
  list(params?: AssignmentListParams): Promise<Assignment[]> {
    return unwrap(lmsAxios.get("/assignments", { params }));
  },
  /** `GET /api/lms/assignments/{id}`. */
  get(id: string): Promise<Assignment> {
    return unwrap(lmsAxios.get(`/assignments/${encodeURIComponent(id)}`));
  },
  /** `GET /api/lms/assignments/{assignmentId}/submissions`. */
  listSubmissions(
    assignmentId: string,
    params?: ListParams,
  ): Promise<PaginatedResponse<AssignmentSubmission> | AssignmentSubmission[]> {
    return unwrap(
      lmsAxios.get(
        `/assignments/${encodeURIComponent(assignmentId)}/submissions`,
        { params: toQuery(params) },
      ),
    );
  },
  /** `GET /api/lms/assignment-submissions/{id}`. */
  getSubmission(id: string): Promise<AssignmentSubmission> {
    return unwrap(
      lmsAxios.get(`/assignment-submissions/${encodeURIComponent(id)}`),
    );
  },
};

// ---------------------------------------------------------------------------
// Barrel export
// ---------------------------------------------------------------------------

export const lmsApi = {
  course: courseApi,
  topic: topicApi,
  lesson: lessonApi,
  quiz: quizApi,
  question: questionApi,
  assignment: assignmentApi,
  enrollment: enrollmentApi,
  qa: qaApi,
  review: reviewApi,
  note: noteApi,
  category: categoryApi,
  tag: tagApi,
  order: orderApi,
  coupon: couponApi,
  certificate: certificateApi,
  bundle: bundleApi,
  membership: membershipApi,
  gift: giftApi,
  payout: payoutApi,
  notification: notificationApi,
  calendar: calendarApi,
  migration: migrationApi,
  addon: addonApi,
  // Phase 3 — eCommerce
  cart: cartApi,
  checkout: checkoutApi,
  invoice: invoiceApi,
  taxRate: taxRateApi,
  subscriptionPlan: subscriptionPlanApi,
  subscription: subscriptionApi,
  payment: paymentApi,
  refund: refundApi,
  wishlist: wishlistApi,
  revenue: revenueApi,
  withdrawal: withdrawalApi,
  earnings: earningsApi,
  gateway: gatewayApi,
  // Phase 4 — Pro Authoring
  certificateLayer: certificateLayerApi,
  certificateBackdrop: certificateBackdropApi,
  certificateMedia: certificateMediaApi,
  dripRule: dripRuleApi,
  prerequisite: prerequisiteApi,
  courseInstructor: courseInstructorApi,
  assignmentGrade: assignmentGradeApi,
  assignmentExtended: assignmentApiExtended,
};

export default lmsApi;
