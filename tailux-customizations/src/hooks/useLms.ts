/**
 * LMS React hooks — thin wrappers around the `lms-api` service.
 *
 * Design choices (per task spec):
 *   - Plain `useState` + `useEffect` (no React Query).
 *   - Each query hook returns `{ data, loading, error, refetch }`.
 *   - Each mutation hook returns `{ data, loading, error, mutate, reset }`.
 *   - Hooks skip the fetch when their primary id param is empty/undefined
 *     (so callers can render the hook unconditionally before the id is known).
 *   - `useIsMounted` (from `@/hooks/useIsMounted`) guards against setState
 *     after unmount, and a per-fetch ref guard prevents stale responses from
 *     overwriting the result of a newer fetch.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMounted } from "@/hooks/useIsMounted";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type {
  Course,
  CourseCreateInput,
  CourseUpdateInput,
  Enrollment,
  Lesson,
  Notification,
  Quiz,
  QuizAttempt,
  StudentNote,
  Topic,
} from "@/types/lms";

// ---------------------------------------------------------------------------
// Shared return types
// ---------------------------------------------------------------------------

export interface UseLmsQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: LmsApiError | null;
  refetch: () => void;
}

export interface UseLmsMutationResult<T, V> {
  data: T | null;
  loading: boolean;
  error: LmsApiError | null;
  mutate: (vars: V) => Promise<T | null>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Internal helper: derive a stable fetch key from the args array.
// ---------------------------------------------------------------------------

/**
 * Returns a stringified key for the args array, used as a useEffect dep so we
 * refetch when any arg changes. `undefined` values are normalized so that
 * `undefined` and `""` don't trigger a refetch when swapping between them.
 */
function argsKey(args: unknown[]): string {
  return args
    .map((a) => (a === undefined ? "" : typeof a === "object" ? JSON.stringify(a) : String(a)))
    .join("|");
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/courses` — list all courses for the active tenant.
 */
export function useCourses(): UseLmsQueryResult<Course[]> {
  const [data, setData] = useState<Course[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.course.list();
      if (!isMounted() || token !== fetchToken.current) return;
      // Endpoints may return either `Course[]` or `PaginatedResponse<Course>`.
      const list = Array.isArray(result) ? result : (result as { data?: Course[] }).data ?? [];
      setData(list);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/courses/{id}` — fetch a single course.
 *
 * Skips the fetch while `id` is empty (so it's safe to mount before the
 * route param is populated).
 */
export function useCourse(id: string | undefined): UseLmsQueryResult<Course> {
  const [data, setData] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.course.get(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/courses` — create a course.
 */
export function useCreateCourse(): UseLmsMutationResult<Course, CourseCreateInput> {
  const [data, setData] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CourseCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.course.create(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `PATCH /api/lms/courses/{id}` — update a course.
 *
 * The `id` is captured at hook-construction time so the consumer can pass it
 * once and then call `mutate(input)` without restating the id.
 */
export function useUpdateCourse(
  id: string | undefined,
): UseLmsMutationResult<Course, CourseUpdateInput> {
  const [data, setData] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CourseUpdateInput) => {
      if (!id) {
        const e: LmsApiError = {
          status: 0,
          message: "useUpdateCourse: id is required",
        };
        setError(e);
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.course.update(id, vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as LmsApiError);
        return null;
      } finally {
        if (isMounted()) setLoading(false);
      }
    },
    [id, isMounted],
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

/**
 * `DELETE /api/lms/courses/{id}` — delete a course.
 */
export function useDeleteCourse(
  id: string | undefined,
): UseLmsMutationResult<{ id: string; deleted: boolean }, void> {
  const [data, setData] = useState<{ id: string; deleted: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(async () => {
    if (!id) {
      const e: LmsApiError = {
        status: 0,
        message: "useDeleteCourse: id is required",
      };
      setError(e);
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.course.remove(id);
      if (isMounted()) setData(result);
      return result;
    } catch (err) {
      if (isMounted()) setError(err as LmsApiError);
      return null;
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [id, isMounted]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ---------------------------------------------------------------------------
// Enrollments
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/enrollments` — list the current user's enrollments.
 */
export function useEnrollments(): UseLmsQueryResult<Enrollment[]> {
  const [data, setData] = useState<Enrollment[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.enrollment.list();
      if (!isMounted() || token !== fetchToken.current) return;
      const list = Array.isArray(result) ? result : [];
      setData(list);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Topics (per course)
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/courses/{courseId}/topics` — list topics for a course.
 */
export function useTopics(
  courseId: string | undefined,
): UseLmsQueryResult<Topic[]> {
  const [data, setData] = useState<Topic[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(courseId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!courseId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.topic.list(courseId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [courseId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([courseId])]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Lessons (per topic)
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/topics/{topicId}/lessons` — list lessons for a topic.
 */
export function useLessons(
  topicId: string | undefined,
): UseLmsQueryResult<Lesson[]> {
  const [data, setData] = useState<Lesson[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(topicId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!topicId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.lesson.list(topicId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [topicId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([topicId])]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Quizzes (per topic)
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/topics/{topicId}/quizzes` — list quizzes for a topic.
 */
export function useQuizzes(
  topicId: string | undefined,
): UseLmsQueryResult<Quiz[]> {
  const [data, setData] = useState<Quiz[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(topicId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!topicId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.quiz.list(topicId);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [topicId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([topicId])]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Quiz attempts (per quiz)
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/quizzes/{quizId}/attempts` — list attempts for a quiz.
 *
 * NOTE: The corresponding `GET` endpoint is not yet documented in
 * `PHASE1-CONTEXT.md`, but the spec requires the hook. The hook will surface
 * whatever error the backend returns (typically a 404) in `error` until the
 * matching handler ships — no silent failure.
 */
export function useQuizAttempts(
  quizId: string | undefined,
): UseLmsQueryResult<QuizAttempt[]> {
  const [data, setData] = useState<QuizAttempt[] | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(quizId));
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!quizId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.quiz.listAttempts(quizId);
      if (!isMounted() || token !== fetchToken.current) return;
      const list = Array.isArray(result) ? result : [];
      setData(list);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [quizId, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([quizId])]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/notes` — list the current user's notes.
 */
export function useNotes(): UseLmsQueryResult<StudentNote[]> {
  const [data, setData] = useState<StudentNote[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.note.list();
      if (!isMounted() || token !== fetchToken.current) return;
      const list = Array.isArray(result) ? result : [];
      setData(list);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * `GET /api/lms/notifications` — list the current user's notifications.
 */
export function useNotifications(): UseLmsQueryResult<Notification[]> {
  const [data, setData] = useState<Notification[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.notification.list();
      if (!isMounted() || token !== fetchToken.current) return;
      const list = Array.isArray(result) ? result : [];
      setData(list);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    void run();
  }, [run]);

  return { data, loading, error, refetch: run };
}
