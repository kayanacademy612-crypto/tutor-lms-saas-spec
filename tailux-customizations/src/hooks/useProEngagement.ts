/**
 * Phase 5 Pro Engagement React hooks — thin wrappers around the Pro Engagement
 * resource groups exposed by `lmsApi` (badges, gamification points/leaderboard,
 * notification preferences + web-push subscriptions, accessibility prefs,
 * email templates + placeholders, and legal consents).
 *
 * Design choices (mirrors `src/hooks/useLms.ts`, `useEcommerce.ts`, and
 * `useProAuthoring.ts`):
 *   - Plain `useState` + `useEffect` (no React Query).
 *   - Each query hook returns `{ data, loading, error, refetch }`.
 *   - Each mutation hook returns `{ data, loading, error, mutate, reset }`.
 *   - Query hooks that take an `id` skip the fetch while `id` is empty so
 *     they're safe to mount before the route param is populated.
 *   - Query hooks that take `params` / `trigger` / `scope` refetch when the
 *     stringified args change (via the local `argsKey` helper).
 *   - `useIsMounted` + a per-fetch token ref guard against setState-after-
 *     unmount and stale-response-overwrite races.
 *   - List endpoints normalize `T[] | PaginatedResponse<T>` to `T[]` so
 *     callers always get an array (matches the convention in `useLms.ts`).
 *
 * Mutations that operate on a server-side resource pass the resource id at
 * `mutate(...)` time (via the vars object) instead of capturing it at hook
 * construction. This keeps the hooks reusable across rows in a list/table —
 * e.g. `useDeleteBadge()` can be mounted once and called for any badge id.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMounted } from "@/hooks/useIsMounted";
import type {
  UseLmsMutationResult,
  UseLmsQueryResult,
} from "@/hooks/useLms";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type {
  AccessibilityPreferences,
  AccessibilityPreferencesInput,
  Badge,
  BadgeCreateInput,
  ConsentInput,
  EmailPlaceholder,
  EmailTemplate,
  EmailTemplateUpdateInput,
  LegalConsent,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
  ListParams,
  NotificationPreference,
  NotificationPreferenceInput,
  PointTransaction,
  PushSubscribeInput,
  PushSubscription,
  StudentBadge,
} from "@/types/lms";

// ---------------------------------------------------------------------------
// Internal helper: stable fetch key from the args array (mirrors useLms.ts).
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
// Badges (admin)
// ===========================================================================

/**
 * `GET /api/lms/badges` — list all badges for the active tenant. Accepts the
 * standard `ListParams` so the badge manager page can paginate and filter.
 */
export function useBadges(
  params?: ListParams,
): UseLmsQueryResult<Badge[]> {
  const [data, setData] = useState<Badge[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.badge.list(params);
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
 * `GET /api/lms/badges/{id}` — fetch a single badge.
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated.
 */
export function useBadge(
  id: string | undefined,
): UseLmsQueryResult<Badge> {
  const [data, setData] = useState<Badge | null>(null);
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
      const result = await lmsApi.badge.get(id);
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
 * `POST /api/lms/badges` — create a new badge.
 */
export function useCreateBadge(): UseLmsMutationResult<
  Badge,
  BadgeCreateInput
> {
  const [data, setData] = useState<Badge | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: BadgeCreateInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.badge.create(vars);
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
 * `PATCH /api/lms/badges/{id}` — update a badge. Pass `{ id, input }` at
 * `mutate(...)` time so a single hook instance can edit any badge.
 */
export function useUpdateBadge(): UseLmsMutationResult<
  Badge,
  { id: string; input: Partial<BadgeCreateInput> }
> {
  const [data, setData] = useState<Badge | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; input: Partial<BadgeCreateInput> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.badge.update(vars.id, vars.input);
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
 * `DELETE /api/lms/badges/{id}` — remove a badge. Pass the `id` at
 * `mutate(...)` time so the hook can be reused across rows in the badge list.
 */
export function useDeleteBadge(): UseLmsMutationResult<
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
        const result = await lmsApi.badge.delete(id);
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
// Gamification (student-facing)
// ===========================================================================

/**
 * `GET /api/lms/student/badges` — list badges the current student has earned
 * (with the badge record populated).
 */
export function useMyBadges(): UseLmsQueryResult<StudentBadge[]> {
  const [data, setData] = useState<StudentBadge[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.gamification.myBadges();
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
 * `GET /api/lms/student/points` — the student's point-transaction ledger.
 * Accepts the standard `ListParams` so the points history page can paginate.
 */
export function useMyPoints(
  params?: ListParams,
): UseLmsQueryResult<PointTransaction[]> {
  const [data, setData] = useState<PointTransaction[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.gamification.myPoints(params);
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
 * `GET /api/lms/leaderboard/{scope}?courseId=&period=` — leaderboard entries
 * for either the whole tenant or a single course, optionally filtered by a
 * time period (`weekly` / `monthly` / `alltime`).
 *
 * Refetches when `scope`, `courseId`, or `period` changes.
 */
export function useLeaderboard(
  scope: LeaderboardScope,
  courseId?: string,
  period?: LeaderboardPeriod,
): UseLmsQueryResult<LeaderboardEntry[]> {
  const [data, setData] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.gamification.leaderboard(
        scope,
        courseId,
        period,
      );
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [scope, courseId, period, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([scope, courseId, period])]);

  return { data, loading, error, refetch: run };
}

// ===========================================================================
// Notification Preferences
// ===========================================================================

/**
 * `GET /api/lms/student/notification-preferences` — list the current user's
 * per-event-type notification preferences (onsite / email / push toggles).
 */
export function useNotificationPreferences(): UseLmsQueryResult<
  NotificationPreference[]
> {
  const [data, setData] = useState<NotificationPreference[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.notificationPref.list();
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
 * `PUT /api/lms/student/notification-preferences` — upsert a single preference
 * row (keyed by `eventType`).
 */
export function useUpdateNotificationPreference(): UseLmsMutationResult<
  NotificationPreference,
  NotificationPreferenceInput
> {
  const [data, setData] = useState<NotificationPreference | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: NotificationPreferenceInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.notificationPref.update(vars);
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
 * `POST /api/lms/notifications/push/subscribe` — register a web-push
 * subscription (typically from the browser's `PushManager.subscribe()`).
 */
export function useSubscribePush(): UseLmsMutationResult<
  PushSubscription,
  PushSubscribeInput
> {
  const [data, setData] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: PushSubscribeInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.notificationPref.subscribePush(vars);
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
 * `DELETE /api/lms/notifications/push/{id}` — remove a push subscription.
 * Pass the subscription `id` at `mutate(...)` time so the hook can be reused
 * for any row in the device list.
 */
export function useUnsubscribePush(): UseLmsMutationResult<
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
        const result = await lmsApi.notificationPref.unsubscribePush(id);
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
 * `POST /api/lms/notifications/mark-all-read` — bulk-mark all unread
 * notifications for the current user as read.
 */
export function useMarkAllNotificationsRead(): UseLmsMutationResult<
  { success: boolean },
  void
> {
  const [data, setData] = useState<{ success: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.notificationPref.markAllRead();
      if (isMounted()) setData(result);
      return result;
    } catch (err) {
      if (isMounted()) setError(err as LmsApiError);
      return null;
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, mutate, reset };
}

// ===========================================================================
// Accessibility Preferences
// ===========================================================================

/**
 * `GET /api/lms/student/preferences` — the current user's accessibility
 * preferences (font size, high contrast, screen reader, reduced motion,
 * dyslexia font, color-blind mode).
 */
export function useAccessibilityPreferences(): UseLmsQueryResult<
  AccessibilityPreferences
> {
  const [data, setData] = useState<AccessibilityPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.accessibility.get();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
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
 * `PUT /api/lms/student/preferences` — upsert the accessibility preferences
 * (partial update — backend merges onto the existing row).
 */
export function useUpdateAccessibilityPreferences(): UseLmsMutationResult<
  AccessibilityPreferences,
  AccessibilityPreferencesInput
> {
  const [data, setData] = useState<AccessibilityPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: AccessibilityPreferencesInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.accessibility.update(vars);
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
// Email Templates
// ===========================================================================

/**
 * `GET /api/lms/email-templates?trigger=` — list email templates, optionally
 * filtered by the event trigger (e.g. `course.completed`,
 * `enrollment.created`).
 */
export function useEmailTemplates(
  trigger?: string,
): UseLmsQueryResult<EmailTemplate[]> {
  const [data, setData] = useState<EmailTemplate[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.emailTemplate.list(trigger);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [trigger, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([trigger])]);

  return { data, loading, error, refetch: run };
}

/**
 * `GET /api/lms/email-templates/{id}` — fetch a single email template.
 *
 * Skips the fetch while `id` is empty so it's safe to mount before the route
 * param is populated.
 */
export function useEmailTemplate(
  id: string | undefined,
): UseLmsQueryResult<EmailTemplate> {
  const [data, setData] = useState<EmailTemplate | null>(null);
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
      const result = await lmsApi.emailTemplate.get(id);
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
 * `PATCH /api/lms/email-templates/{id}` — update a template's subject/body or
 * toggle its active flag. Pass `{ id, input }` at `mutate(...)` time.
 */
export function useUpdateEmailTemplate(): UseLmsMutationResult<
  EmailTemplate,
  { id: string; input: EmailTemplateUpdateInput }
> {
  const [data, setData] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; input: EmailTemplateUpdateInput }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.emailTemplate.update(vars.id, vars.input);
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
 * `POST /api/lms/email-templates/{id}/reset` — restore the default subject/body
 * for a system template. Pass the `id` at `mutate(...)` time.
 */
export function useResetEmailTemplate(): UseLmsMutationResult<
  EmailTemplate,
  string
> {
  const [data, setData] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.emailTemplate.reset(id);
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
 * `GET /api/lms/email-placeholders?trigger=` — list the available
 * `{{placeholder}}` tokens for a given trigger, with description and example.
 * Used by the template editor's "Insert placeholder" picker.
 */
export function useEmailPlaceholders(
  trigger?: string,
): UseLmsQueryResult<EmailPlaceholder[]> {
  const [data, setData] = useState<EmailPlaceholder[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.emailTemplate.placeholders(trigger);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(toList(result));
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as LmsApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [trigger, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([trigger])]);

  return { data, loading, error, refetch: run };
}

/**
 * `POST /api/lms/email-templates/{id}/preview` — render a preview of the
 * template body with the supplied placeholder values. Returns the rendered
 * HTML so the editor can show a live preview panel.
 *
 * Pass `{ id, data }` at `mutate(...)` time so a single hook instance can
 * preview any template.
 */
export function usePreviewEmailTemplate(): UseLmsMutationResult<
  { html: string },
  { id: string; data: Record<string, string> }
> {
  const [data, setData] = useState<{ html: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; data: Record<string, string> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.emailTemplate.preview(vars.id, vars.data);
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
// Legal Consents
// ===========================================================================

/**
 * `GET /api/lms/student/consents` — list the current user's legal consent
 * history (terms / privacy / marketing / cookies).
 */
export function useLegalConsents(): UseLmsQueryResult<LegalConsent[]> {
  const [data, setData] = useState<LegalConsent[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.consent.list();
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
 * `POST /api/lms/student/consents` — record a consent grant (or revoke —
 * `granted: false`). Pass the `ConsentInput` at `mutate(...)` time.
 */
export function useGrantConsent(): UseLmsMutationResult<
  LegalConsent,
  ConsentInput
> {
  const [data, setData] = useState<LegalConsent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: ConsentInput) => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.consent.grant(vars);
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
