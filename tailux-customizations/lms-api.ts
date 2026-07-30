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
  AddonConfig,
  Assignment,
  AssignmentCreateInput,
  AssignmentSubmission,
  AssignmentSubmissionInput,
  CalendarEvent,
  Category,
  CategoryCreateInput,
  Certificate,
  CertificateTemplate,
  CertificateTemplateCreateInput,
  Coupon,
  CouponCreateInput,
  Course,
  CourseBundle,
  CourseBundleCreateInput,
  CourseCreateInput,
  CourseGiftCreateInput,
  CourseReview,
  CourseReviewCreateInput,
  CourseUpdateInput,
  Enrollment,
  InstructorPayout,
  InstructorPayoutCreateInput,
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
  OrderCreateInput,
  PaginatedResponse,
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
  StudentNote,
  StudentNoteCreateInput,
  Tag,
  TagCreateInput,
  Topic,
  TopicCreateInput,
  TopicUpdateInput,
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
  /** `POST /api/lms/orders`. */
  create(input: OrderCreateInput): Promise<Order> {
    return unwrap(lmsAxios.post("/orders", input));
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
  create(input: CourseGiftCreateInput): Promise<unknown> {
    return unwrap(lmsAxios.post("/gifts", input));
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
};

export default lmsApi;
