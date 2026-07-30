/**
 * Phase 6 Reports + AI + Migration React hooks — thin wrappers around the
 * Reports, AI, and Migration resource groups exposed by `lmsApi` (admin
 * report dashboards, AI chat + course/quiz generation, and tenant migration
 * jobs from LearnDash / LifterLMS / Tutor LMS / CSV etc.).
 *
 * Design choices (mirrors `src/hooks/useLms.ts`, `useEcommerce.ts`,
 * `useProAuthoring.ts`, and `useProEngagement.ts`):
 *   - Plain `useState` + `useEffect` (no React Query).
 *   - Each query hook returns `{ data, loading, error, refetch }`.
 *   - Each mutation hook returns `{ data, loading, error, mutate, reset }`.
 *   - Query hooks that take an `id` skip the fetch while `id` is empty so
 *     they're safe to mount before the route param is populated.
 *   - Query hooks that take `params` refetch when the stringified args change
 *     (via the local `argsKey` helper).
 *   - `useIsMounted` + a per-fetch token ref guard against setState-after-
 *     unmount and stale-response-overwrite races.
 *   - List endpoints normalize `T[] | PaginatedResponse<T>` to `T[]` so
 *     callers always get an array (matches the convention in `useLms.ts`).
 *
 * Mutations that operate on a server-side resource pass the resource id at
 * `mutate(...)` time (via the vars object) instead of capturing it at hook
 * construction. This keeps the hooks reusable across rows in a list/table —
 * e.g. `useDeleteSavedReport()` can be mounted once and called for any
 * saved-report id.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMounted } from "@/hooks/useIsMounted";
import type {
  UseLmsMutationResult,
  UseLmsQueryResult,
} from "@/hooks/useLms";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type {
  AIConversation,
  AIMessage,
  AISendMessageInput,
  AISendMessageResult,
  AIUsageStats,
  CompletionReport,
  CourseReport,
  CreateMigrationInput,
  EnrollmentReport,
  ListParams,
  MigrationJob,
  MigrationLog,
  OverviewReport,
  ReportFilters,
  ReportType,
  SalesReport,
  SavedReport,
  StudentReport,
} from "@/types/lms";

// ---------------------------------------------------------------------------
// Internal helpers (mirror useLms.ts / useProEngagement.ts)
// ---------------------------------------------------------------------------

function argsKey(args: unknown[]): string {
  return args
    .map((a) =>
      a === undefined
        ? ""
        : typeof a === "object"
          ? JSON.stringify(a)
          : String(a),
    )
    .join("|");
}

/**
 * Normalize the response of a list endpoint that may return either a bare
 * array or a `PaginatedResponse<T>` envelope into a bare array.
 */
function toList<T>(
  result: T[] | { data?: T[] } | undefined | null,
): T[] {
  if (Array.isArray(result)) return result;
  if (result && typeof result === "object" && "data" in result) {
    return (result as { data?: T[] }).data ?? [];
  }
  return [];
}

// ===========================================================================
// Reports (admin dashboards)
// ===========================================================================

/**
 * `GET /api/lms/admin/reports/overview` — top-line KPIs (revenue, enrollments,
 * completion rate, avg rating) + a daily series for sparklines. Accepts the
 * standard `ReportFilters` so the dashboard page can constrain the date range
 * and filter by course / instructor / category.
 */
export function useOverviewReport(
  params?: ReportFilters,
): UseLmsQueryResult<OverviewReport> {
  const [data, setData] = useState<OverviewReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.overview(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/admin/reports/sales` — sales totals, AOV, refund rate, top
 * courses by revenue, payment-method split, and a daily sales series.
 */
export function useSalesReport(
  params?: ReportFilters,
): UseLmsQueryResult<SalesReport> {
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.sales(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/admin/reports/enrollments` — enrollment counts by state
 * (active / completed / cancelled), growth rate, completion rate, and a per-
 * course breakdown plus daily series.
 */
export function useEnrollmentReport(
  params?: ReportFilters,
): UseLmsQueryResult<EnrollmentReport> {
  const [data, setData] = useState<EnrollmentReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.enrollments(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/admin/reports/completion` — overall completion rate, average
 * completion time, per-course completion stats (enrolled / completed /
 * completion rate / avg score / dropoff), and a stage funnel.
 */
export function useCompletionReport(
  params?: ReportFilters,
): UseLmsQueryResult<CompletionReport> {
  const [data, setData] = useState<CompletionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.completion(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/admin/reports/courses` — per-course roll-up with enrollments,
 * revenue, avg rating, completion rate, and status, plus published/draft
 * totals.
 */
export function useCourseReport(
  params?: ReportFilters,
): UseLmsQueryResult<CourseReport> {
  const [data, setData] = useState<CourseReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.courses(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/admin/reports/students` — per-student roll-up (enrollments,
 * completed courses, total spent, last active), plus new-this-month and active
 * totals.
 */
export function useStudentReport(
  params?: ReportFilters,
): UseLmsQueryResult<StudentReport> {
  const [data, setData] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.students(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/admin/reports/export` — request a CSV export of the given
 * report type. The backend returns a short-lived `downloadUrl` (typically a
 * pre-signed S3 link) which the caller can hand to `window.location.href` or
 * an `<a download>` anchor.
 *
 * Pass `{ reportType, params }` at `mutate(...)` time so a single hook
 * instance can export any report type.
 */
export function useExportReport(): UseLmsMutationResult<
  { downloadUrl: string },
  { reportType: ReportType; params?: ReportFilters }
> {
  const [data, setData] = useState<{ downloadUrl: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { reportType: ReportType; params?: ReportFilters }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.report.exportCsv(vars.reportType, vars.params);
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
 * `POST /api/lms/admin/reports/save` — persist a report config (report type +
 * filters + schedule) under a human-friendly name so it can be re-run from the
 * saved-reports list.
 */
export function useSaveReport(): UseLmsMutationResult<
  SavedReport,
  { name: string; reportType: ReportType; config: Record<string, unknown> }
> {
  const [data, setData] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      name: string;
      reportType: ReportType;
      config: Record<string, unknown>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.report.save(vars);
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
 * `GET /api/lms/admin/reports/saved` — list saved report configs for the
 * active tenant.
 */
export function useSavedReports(): UseLmsQueryResult<SavedReport[]> {
  const [data, setData] = useState<SavedReport[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.report.listSaved();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
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
 * `DELETE /api/lms/admin/reports/saved/{id}` — remove a saved report. Pass the
 * `id` at `mutate(...)` time so the hook can be reused across rows in the
 * saved-reports list.
 */
export function useDeleteSavedReport(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.report.deleteSaved(id);
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

// ===========================================================================
// AI (chat + course/quiz generation)
// ===========================================================================

/**
 * `GET /api/lms/ai/conversations` — list AI chat conversations for the
 * current user (most-recent-first).
 */
export function useAIConversations(): UseLmsQueryResult<AIConversation[]> {
  const [data, setData] = useState<AIConversation[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.ai.conversations();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
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
 * `GET /api/lms/ai/conversations/{id}` — fetch a single conversation and its
 * full message history.
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated.
 */
export function useAIConversation(
  id: string | undefined,
): UseLmsQueryResult<{ conversation: AIConversation; messages: AIMessage[] }> {
  const [data, setData] = useState<{
    conversation: AIConversation;
    messages: AIMessage[];
  } | null>(null);
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
      const result = await lmsApi.ai.conversation(id);
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
 * `POST /api/lms/ai/chat` — send a user message to the AI and get the
 * assistant's reply. If `input.conversationId` is omitted the backend creates
 * a new conversation and returns its id in the result.
 */
export function useSendAIMessage(): UseLmsMutationResult<
  AISendMessageResult,
  AISendMessageInput
> {
  const [data, setData] = useState<AISendMessageResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: AISendMessageInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.ai.sendMessage(vars);
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
 * `DELETE /api/lms/ai/conversations/{id}` — remove a conversation (and its
 * messages). Pass the `id` at `mutate(...)` time so the hook can be reused
 * across rows in the conversations list.
 */
export function useDeleteAIConversation(): UseLmsMutationResult<
  { success: boolean },
  string
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.ai.deleteConversation(id);
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
 * `GET /api/lms/ai/usage?from=&to=` — daily AI usage stats (requests, tokens,
 * estimated cost in cents) for the active tenant. Refetches when the
 * stringified `{ from, to }` window changes.
 */
export function useAIUsage(
  params?: { from?: string; to?: string },
): UseLmsQueryResult<AIUsageStats[]> {
  const [data, setData] = useState<AIUsageStats[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.ai.usage(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/ai/generate-course-outline` — AI-generate a structured
 * course outline from a topic, an optional difficulty level, and an optional
 * target lesson count. Returns the raw outline payload from the model.
 */
export function useGenerateCourseOutline(): UseLmsMutationResult<
  { outline: unknown },
  { topic: string; level?: string; lessonsCount?: number }
> {
  const [data, setData] = useState<{ outline: unknown } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      topic: string;
      level?: string;
      lessonsCount?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.ai.generateCourseOutline(vars);
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
 * `POST /api/lms/ai/generate-quiz` — AI-generate a quiz from a topic (or from
 * a lesson's content when `lessonId` is supplied). Returns the raw quiz
 * payload from the model.
 */
export function useGenerateQuiz(): UseLmsMutationResult<
  { quiz: unknown },
  {
    lessonId?: string;
    topic: string;
    questionCount?: number;
    questionTypes?: string[];
  }
> {
  const [data, setData] = useState<{ quiz: unknown } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      lessonId?: string;
      topic: string;
      questionCount?: number;
      questionTypes?: string[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.ai.generateQuiz(vars);
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

// ===========================================================================
// Migration (data import from other LMS platforms)
// ===========================================================================

/**
 * `GET /api/lms/migrations` — list migration jobs for the active tenant.
 * Accepts the standard `ListParams` so the migration history page can
 * paginate.
 */
export function useMigrations(
  params?: ListParams,
): UseLmsQueryResult<MigrationJob[]> {
  const [data, setData] = useState<MigrationJob[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.migration.list(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([params])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/migrations/{id}` — fetch a single migration job.
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated.
 */
export function useMigration(
  id: string | undefined,
): UseLmsQueryResult<MigrationJob> {
  const [data, setData] = useState<MigrationJob | null>(null);
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
      const result = await lmsApi.migration.get(id);
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
 * `POST /api/lms/migrations` — create a new migration job (does not start it).
 * The caller then invokes `useStartMigration().mutate(id)` to begin processing.
 */
export function useCreateMigration(): UseLmsMutationResult<
  MigrationJob,
  CreateMigrationInput
> {
  const [data, setData] = useState<MigrationJob | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: CreateMigrationInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.migration.create(vars);
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
 * `POST /api/lms/migrations/{id}/start` — begin processing a pending job.
 * Pass the `id` at `mutate(...)` time so the hook can be reused across rows.
 */
export function useStartMigration(): UseLmsMutationResult<MigrationJob, string> {
  const [data, setData] = useState<MigrationJob | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.migration.start(id);
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
 * `POST /api/lms/migrations/{id}/cancel` — cancel a running/pending job.
 * Pass the `id` at `mutate(...)` time so the hook can be reused across rows.
 */
export function useCancelMigration(): UseLmsMutationResult<
  MigrationJob,
  string
> {
  const [data, setData] = useState<MigrationJob | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.migration.cancel(id);
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
 * `GET /api/lms/migrations/{id}/logs` — paginated log entries for a migration
 * job (info / warning / error levels with optional source/target entity ids).
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated. Refetches when the stringified `{ id, params }` changes.
 */
export function useMigrationLogs(
  id: string | undefined,
  params?: ListParams,
): UseLmsQueryResult<MigrationLog[]> {
  const [data, setData] = useState<MigrationLog[] | null>(null);
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
      const result = await lmsApi.migration.logs(id, params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [id, params, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([id, params])]);

  return { data, loading, error, refetch: run };
}
