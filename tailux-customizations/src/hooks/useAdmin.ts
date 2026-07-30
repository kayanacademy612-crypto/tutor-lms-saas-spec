/**
 * lastsaas Admin React hooks — thin wrappers around the `admin-api` service.
 *
 * Design choices (mirrors `src/hooks/useEcommerce.ts` and `useLms.ts`):
 *   - Plain `useState` + `useEffect` (no React Query).
 *   - Each query hook returns `{ data, loading, error, refetch }`.
 *   - Each mutation hook returns `{ data, loading, error, mutate, reset }`.
 *   - Query hooks that take an `id` skip the fetch while `id` is empty so
 *     they're safe to mount before the route param is populated.
 *   - Query hooks that take `params` refetch when the stringified `params`
 *     change (via the local `argsKey` helper).
 *   - `useIsMounted` + a per-fetch token ref guard against setState-after-
 *     unmount and stale-response-overwrite races.
 *
 * Mutations that operate on a server-side resource pass the resource id at
 * `mutate(...)` time (via the vars object) instead of capturing it at hook
 * construction. This keeps the hooks reusable across rows in a list/table —
 * e.g. `useUpdateTenantStatus()` can be mounted once and called for any
 * tenant id.
 *
 * Covered endpoints (the most common admin operations; less common ones can
 * call `adminApi.*` directly):
 *   - GET  /admin/dashboard
 *   - GET  /admin/about
 *   - GET  /admin/tenants, GET /admin/tenants/{id}, PATCH .../status,
 *     PATCH .../plan, POST .../cancel-subscription
 *   - GET  /admin/users, GET /admin/users/{id}, PATCH .../status,
 *     GET .../preflight-delete, DELETE /admin/users/{id}
 *   - GET  /admin/members, POST /admin/members/invite,
 *     DELETE /admin/members/{userId}, PATCH /admin/members/{userId}/role
 *   - GET  /admin/plans, GET /admin/plans/{id}, POST /admin/plans,
 *     PUT /admin/plans/{id}, DELETE /admin/plans/{id},
 *     POST /admin/plans/{id}/archive, POST /admin/plans/{id}/unarchive
 *   - GET  /admin/credit-bundles, POST /admin/credit-bundles,
 *     PUT /admin/credit-bundles/{id}, DELETE /admin/credit-bundles/{id}
 *   - GET  /admin/health/nodes, /current, /metrics, /integrations,
 *     POST /admin/health/test-email
 *   - GET  /admin/financial/transactions, /metrics
 *   - GET  /admin/announcements, POST /admin/announcements,
 *     PUT /admin/announcements/{id}, DELETE /admin/announcements/{id}
 *   - GET  /admin/logs, /severity-counts
 *   - GET  /admin/config, GET /admin/config/{name}, PUT /admin/config/{name},
 *     POST /admin/config, DELETE /admin/config/{name}
 *   - GET  /admin/api-keys, POST /admin/api-keys, DELETE /admin/api-keys/{id}
 *   - GET  /admin/webhooks, GET /admin/webhooks/{id}, POST /admin/webhooks,
 *     PUT /admin/webhooks/{id}, DELETE /admin/webhooks/{id},
 *     POST .../test, POST .../regenerate-secret, GET /admin/webhooks/event-types
 *   - GET  /branding, PUT /admin/branding, GET /admin/branding/media,
 *     POST /admin/branding/media, DELETE /admin/branding/media/{key},
 *     GET /admin/branding/pages, POST /admin/branding/pages,
 *     PUT /admin/branding/pages/{id}, DELETE /admin/branding/pages/{id}
 *   - PM dashboard: /admin/pm/funnel, /kpis, /retention, /engagement,
 *     /events, /events/types
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useIsMounted } from "@/hooks/useIsMounted";
import {
  adminApi,
  type AdminApiError,
  type AdminAbout,
  type AdminDashboard,
  type AdminUser,
  type AdminUserDetailResponse,
  type AdminUserListResponse,
  type Announcement,
  type AnnouncementListResponse,
  type APIKeyCreateResponse,
  type APIKeyListResponse,
  type BrandingConfig,
  type ConfigVar,
  type ConfigVarListResponse,
  type CreditBundle,
  type CreditBundleListResponse,
  type CustomPage,
  type CustomPageListResponse,
  type EngagementData,
  type EventTypeListResponse,
  type FinancialMetricsResponse,
  type FinancialTransactionListResponse,
  type FunnelData,
  type HealthIntegrationsResponse,
  type HealthMetricsResponse,
  type HealthNodesResponse,
  type ImpersonationResponse,
  type KPIData,
  type MediaItem,
  type MediaItemListResponse,
  type Plan,
  type PlanListResponse,
  type PromotionListResponse,
  type RetentionResponse,
  type RootMembersResponse,
  type SystemLogListResponse,
  type SystemLogSeverityCountsResponse,
  type Tenant,
  type TenantDetailResponse,
  type TenantListResponse,
  type TestEmailResponse,
  type WebhookCreateResponse,
  type WebhookDetailResponse,
  type WebhookEventTypeListResponse,
  type WebhookListResponse,
  type WebhookRegenerateSecretResponse,
  type WebhookTestResponse,
} from "@/services/admin-api";

// ---------------------------------------------------------------------------
// Shared return types
// ---------------------------------------------------------------------------

export interface UseAdminQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: AdminApiError | null;
  refetch: () => void;
}

export interface UseAdminMutationResult<T, V> {
  data: T | null;
  loading: boolean;
  error: AdminApiError | null;
  mutate: (vars: V) => Promise<T | null>;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns a stringified key for the args array, used as a useEffect dep so we
 * refetch when any arg changes. `undefined` values are normalized so that
 * `undefined` and `""` don't trigger a refetch when swapping between them.
 */
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
 * Normalize a list response that may return either a bare array or an
 * envelope `{ <key>: T[] }` into a bare array. The admin backend always
 * uses envelopes, but this keeps the hooks resilient to future shape drift.
 */
function toList<T>(result: unknown, key: string): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && key in result) {
    const list = (result as Record<string, unknown>)[key];
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

// ===========================================================================
// Dashboard / About
// ===========================================================================

/** `GET /api/admin/dashboard` — top-line counts + health summary. */
export function useAdminDashboard(): UseAdminQueryResult<AdminDashboard> {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getDashboard();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/about` — version + copyright. */
export function useAdminAbout(): UseAdminQueryResult<AdminAbout> {
  const [data, setData] = useState<AdminAbout | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getAbout();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

// ===========================================================================
// Tenants
// ===========================================================================

/** `GET /api/admin/tenants` — paginated tenant list. */
export function useAdminTenants(
  params?: Parameters<typeof adminApi.listTenants>[0],
): UseAdminQueryResult<TenantListResponse> {
  const [data, setData] = useState<TenantListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listTenants(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** Convenience hook: returns just the `tenants` array from the list response. */
export function useAdminTenantList(
  params?: Parameters<typeof adminApi.listTenants>[0],
): UseAdminQueryResult<Tenant[]> {
  const { data, loading, error, refetch } = useAdminTenants(params);
  return {
    data: data ? toList<Tenant>(data, "tenants") : null,
    loading,
    error,
    refetch,
  };
}

/** `GET /api/admin/tenants/{id}` — single tenant detail. */
export function useAdminTenant(
  id: string | undefined,
): UseAdminQueryResult<TenantDetailResponse> {
  const [data, setData] = useState<TenantDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<AdminApiError | null>(null);
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
      const result = await adminApi.getTenant(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `PATCH /api/admin/tenants/{id}/status` — activate/deactivate a tenant. */
export function useUpdateTenantStatus(): UseAdminMutationResult<
  unknown,
  { id: string; isActive: boolean }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; isActive: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateTenantStatus(vars.id, vars.isActive);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PATCH /api/admin/tenants/{tenantId}/plan` — assign a plan to a tenant. */
export function useAssignTenantPlan(): UseAdminMutationResult<
  unknown,
  { tenantId: string; planId?: string; billingWaived?: boolean }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      tenantId: string;
      planId?: string;
      billingWaived?: boolean;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.assignTenantPlan(
          vars.tenantId,
          vars.planId,
          vars.billingWaived,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/tenants/{tenantId}/cancel-subscription`. */
export function useCancelTenantSubscription(): UseAdminMutationResult<
  unknown,
  { tenantId: string; immediate: boolean }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { tenantId: string; immediate: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.cancelTenantSubscription(
          vars.tenantId,
          vars.immediate,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Users
// ===========================================================================

/** `GET /api/admin/users` — paginated user list. */
export function useAdminUsers(
  params?: Parameters<typeof adminApi.listUsers>[0],
): UseAdminQueryResult<AdminUserListResponse> {
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listUsers(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** Convenience hook: returns just the `users` array from the list response. */
export function useAdminUserList(
  params?: Parameters<typeof adminApi.listUsers>[0],
): UseAdminQueryResult<AdminUser[]> {
  const { data, loading, error, refetch } = useAdminUsers(params);
  return {
    data: data ? toList<AdminUser>(data, "users") : null,
    loading,
    error,
    refetch,
  };
}

/** `GET /api/admin/users/{id}` — user detail + memberships. */
export function useAdminUser(
  id: string | undefined,
): UseAdminQueryResult<AdminUserDetailResponse> {
  const [data, setData] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<AdminApiError | null>(null);
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
      const result = await adminApi.getUser(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `PATCH /api/admin/users/{id}/status` — activate/deactivate a user. */
export function useUpdateUserStatus(): UseAdminMutationResult<
  unknown,
  { id: string; isActive: boolean }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; isActive: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateUserStatus(vars.id, vars.isActive);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `GET /api/admin/users/{id}/preflight-delete` — pre-delete safety info. */
export function usePreflightDeleteUser(
  id: string | undefined,
): UseAdminQueryResult<Awaited<ReturnType<typeof adminApi.preflightDeleteUser>>> {
  const [data, setData] = useState<
    Awaited<ReturnType<typeof adminApi.preflightDeleteUser>> | null
  >(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<AdminApiError | null>(null);
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
      const result = await adminApi.preflightDeleteUser(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `DELETE /api/admin/users/{id}` — delete a user (with replacement/confirm). */
export function useDeleteUser(): UseAdminMutationResult<
  unknown,
  {
    id: string;
    replacementOwners?: Record<string, string> | string[];
    confirmTenantDeletions?: string[];
  }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      replacementOwners?: Record<string, string> | string[];
      confirmTenantDeletions?: string[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteUser(vars.id, {
          replacementOwners: vars.replacementOwners,
          confirmTenantDeletions: vars.confirmTenantDeletions,
        });
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/users/{userId}/impersonate`. */
export function useImpersonateUser(): UseAdminMutationResult<
  ImpersonationResponse,
  string
> {
  const [data, setData] = useState<ImpersonationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.impersonateUser(userId);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Root Members
// ===========================================================================

/** `GET /api/admin/members` — root tenant members + invitations. */
export function useRootMembers(): UseAdminQueryResult<RootMembersResponse> {
  const [data, setData] = useState<RootMembersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listRootMembers();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/members/invite`. */
export function useInviteRootMember(): UseAdminMutationResult<
  unknown,
  { email: string; role: string }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { email: string; role: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.inviteRootMember(vars.email, vars.role);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/members/{userId}`. */
export function useRemoveRootMember(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.removeRootMember(userId);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PATCH /api/admin/members/{userId}/role`. */
export function useChangeRootMemberRole(): UseAdminMutationResult<
  unknown,
  { userId: string; role: string }
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { userId: string; role: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.changeRootMemberRole(
          vars.userId,
          vars.role,
        );
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Plans
// ===========================================================================

/** `GET /api/admin/plans` — all plans (active + archived). */
export function useAdminPlans(): UseAdminQueryResult<PlanListResponse> {
  const [data, setData] = useState<PlanListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listPlans();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** Convenience hook: returns just the `plans` array from the list response. */
export function useAdminPlanList(): UseAdminQueryResult<Plan[]> {
  const { data, loading, error, refetch } = useAdminPlans();
  return {
    data: data ? toList<Plan>(data, "plans") : null,
    loading,
    error,
    refetch,
  };
}

/** `GET /api/admin/plans/{id}` — single plan. */
export function useAdminPlan(
  id: string | undefined,
): UseAdminQueryResult<Plan> {
  const [data, setData] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<AdminApiError | null>(null);
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
      const result = await adminApi.getPlan(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/plans` — create a plan. */
export function useCreatePlan(): UseAdminMutationResult<Plan, Partial<Plan>> {
  const [data, setData] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: Partial<Plan>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createPlan(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PUT /api/admin/plans/{id}` — update a plan. */
export function useUpdatePlan(): UseAdminMutationResult<
  Plan,
  { id: string; body: Partial<Plan> }
> {
  const [data, setData] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; body: Partial<Plan> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updatePlan(vars.id, vars.body);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/plans/{id}`. */
export function useDeletePlan(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deletePlan(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/plans/{id}/archive`. */
export function useArchivePlan(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.archivePlan(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/plans/{id}/unarchive`. */
export function useUnarchivePlan(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.unarchivePlan(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Credit Bundles
// ===========================================================================

/** `GET /api/admin/credit-bundles`. */
export function useAdminBundles(): UseAdminQueryResult<CreditBundleListResponse> {
  const [data, setData] = useState<CreditBundleListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listBundles();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** Convenience hook: returns just the `bundles` array. */
export function useAdminBundleList(): UseAdminQueryResult<CreditBundle[]> {
  const { data, loading, error, refetch } = useAdminBundles();
  return {
    data: data ? toList<CreditBundle>(data, "bundles") : null,
    loading,
    error,
    refetch,
  };
}

/** `POST /api/admin/credit-bundles`. */
export function useCreateBundle(): UseAdminMutationResult<
  CreditBundle,
  Partial<CreditBundle>
> {
  const [data, setData] = useState<CreditBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: Partial<CreditBundle>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createBundle(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PUT /api/admin/credit-bundles/{id}`. */
export function useUpdateBundle(): UseAdminMutationResult<
  CreditBundle,
  { id: string; body: Partial<CreditBundle> }
> {
  const [data, setData] = useState<CreditBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; body: Partial<CreditBundle> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateBundle(vars.id, vars.body);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/credit-bundles/{id}`. */
export function useDeleteBundle(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteBundle(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Health
// ===========================================================================

/** `GET /api/admin/health/nodes`. */
export function useHealthNodes(): UseAdminQueryResult<HealthNodesResponse> {
  const [data, setData] = useState<HealthNodesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listHealthNodes();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/health/current` — latest metrics snapshot. */
export function useHealthCurrent(): UseAdminQueryResult<HealthMetricsResponse> {
  const [data, setData] = useState<HealthMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getHealthCurrent();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/health/metrics` — historical metrics. */
export function useHealthMetrics(
  params?: Parameters<typeof adminApi.getHealthMetrics>[0],
): UseAdminQueryResult<HealthMetricsResponse> {
  const [data, setData] = useState<HealthMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getHealthMetrics(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/health/integrations`. */
export function useHealthIntegrations(): UseAdminQueryResult<HealthIntegrationsResponse> {
  const [data, setData] = useState<HealthIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getHealthIntegrations();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/health/test-email`. */
export function useSendTestEmail(): UseAdminMutationResult<
  TestEmailResponse,
  string
> {
  const [data, setData] = useState<TestEmailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (to: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.sendTestEmail(to);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Financial
// ===========================================================================

/** `GET /api/admin/financial/transactions`. */
export function useFinancialTransactions(
  params?: Parameters<typeof adminApi.listFinancialTransactions>[0],
): UseAdminQueryResult<FinancialTransactionListResponse> {
  const [data, setData] = useState<FinancialTransactionListResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listFinancialTransactions(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/financial/metrics`. */
export function useFinancialMetrics(
  params?: Parameters<typeof adminApi.getFinancialMetrics>[0],
): UseAdminQueryResult<FinancialMetricsResponse> {
  const [data, setData] = useState<FinancialMetricsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getFinancialMetrics(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

// ===========================================================================
// Promotions
// ===========================================================================

/** `GET /api/admin/promotions`. */
export function usePromotions(): UseAdminQueryResult<PromotionListResponse> {
  const [data, setData] = useState<PromotionListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listPromotions();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

// ===========================================================================
// Announcements
// ===========================================================================

/** `GET /api/admin/announcements`. */
export function useAnnouncements(): UseAdminQueryResult<AnnouncementListResponse> {
  const [data, setData] = useState<AnnouncementListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listAnnouncements();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** Convenience hook: returns just the `announcements` array. */
export function useAnnouncementList(): UseAdminQueryResult<Announcement[]> {
  const { data, loading, error, refetch } = useAnnouncements();
  return {
    data: data ? toList<Announcement>(data, "announcements") : null,
    loading,
    error,
    refetch,
  };
}

/** `POST /api/admin/announcements`. */
export function useCreateAnnouncement(): UseAdminMutationResult<
  Announcement,
  { title: string; body: string; publish?: boolean }
> {
  const [data, setData] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { title: string; body: string; publish?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createAnnouncement(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PUT /api/admin/announcements/{id}`. */
export function useUpdateAnnouncement(): UseAdminMutationResult<
  Announcement,
  {
    id: string;
    body: Partial<{ title: string; body: string; publish: boolean }>;
  }
> {
  const [data, setData] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      body: Partial<{ title: string; body: string; publish: boolean }>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateAnnouncement(vars.id, vars.body);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/announcements/{id}`. */
export function useDeleteAnnouncement(): UseAdminMutationResult<
  unknown,
  string
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteAnnouncement(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Logs
// ===========================================================================

/** `GET /api/admin/logs`. */
export function useAdminLogs(
  params?: Parameters<typeof adminApi.listLogs>[0],
): UseAdminQueryResult<SystemLogListResponse> {
  const [data, setData] = useState<SystemLogListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listLogs(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/logs/severity-counts`. */
export function useLogSeverityCounts(
  params?: Parameters<typeof adminApi.logSeverityCounts>[0],
): UseAdminQueryResult<SystemLogSeverityCountsResponse> {
  const [data, setData] = useState<SystemLogSeverityCountsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.logSeverityCounts(params);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

// ===========================================================================
// Config
// ===========================================================================

/** `GET /api/admin/config`. */
export function useAdminConfig(): UseAdminQueryResult<ConfigVarListResponse> {
  const [data, setData] = useState<ConfigVarListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listConfig();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** Convenience hook: returns just the `configs` array. */
export function useAdminConfigList(): UseAdminQueryResult<ConfigVar[]> {
  const { data, loading, error, refetch } = useAdminConfig();
  return {
    data: data ? toList<ConfigVar>(data, "configs") : null,
    loading,
    error,
    refetch,
  };
}

/** `GET /api/admin/config/{name}`. */
export function useAdminConfigVar(
  name: string | undefined,
): UseAdminQueryResult<ConfigVar> {
  const [data, setData] = useState<ConfigVar | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(name));
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    if (!name) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getConfig(name);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [name, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([name])]);

  return { data, loading, error, refetch: run };
}

/** `PUT /api/admin/config/{name}`. */
export function useUpdateConfig(): UseAdminMutationResult<
  ConfigVar,
  {
    name: string;
    value: string;
    description?: string;
    options?: string | string[];
  }
> {
  const [data, setData] = useState<ConfigVar | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      name: string;
      value: string;
      description?: string;
      options?: string | string[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateConfig(vars.name, {
          value: vars.value,
          description: vars.description,
          options: vars.options,
        });
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/config`. */
export function useCreateConfig(): UseAdminMutationResult<
  ConfigVar,
  {
    name: string;
    description?: string;
    type: string;
    value: string;
    options?: string | string[];
  }
> {
  const [data, setData] = useState<ConfigVar | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      name: string;
      description?: string;
      type: string;
      value: string;
      options?: string | string[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createConfig(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/config/{name}`. */
export function useDeleteConfig(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (name: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteConfig(name);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// API Keys
// ===========================================================================

/** `GET /api/admin/api-keys`. */
export function useAPIKeys(): UseAdminQueryResult<APIKeyListResponse> {
  const [data, setData] = useState<APIKeyListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listAPIKeys();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/api-keys`. */
export function useCreateAPIKey(): UseAdminMutationResult<
  APIKeyCreateResponse,
  { name: string; authority: string }
> {
  const [data, setData] = useState<APIKeyCreateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { name: string; authority: string }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createAPIKey(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/api-keys/{id}`. */
export function useDeleteAPIKey(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteAPIKey(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// Webhooks
// ===========================================================================

/** `GET /api/admin/webhooks`. */
export function useWebhooks(): UseAdminQueryResult<WebhookListResponse> {
  const [data, setData] = useState<WebhookListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listWebhooks();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/webhooks/{id}` — single webhook + recent deliveries. */
export function useWebhook(
  id: string | undefined,
): UseAdminQueryResult<WebhookDetailResponse> {
  const [data, setData] = useState<WebhookDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<AdminApiError | null>(null);
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
      const result = await adminApi.getWebhook(id);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/webhooks`. */
export function useCreateWebhook(): UseAdminMutationResult<
  WebhookCreateResponse,
  { name: string; description?: string; url: string; events: string[] }
> {
  const [data, setData] = useState<WebhookCreateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      name: string;
      description?: string;
      url: string;
      events: string[];
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createWebhook(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PUT /api/admin/webhooks/{id}`. */
export function useUpdateWebhook(): UseAdminMutationResult<
  { webhook: import("@/services/admin-api").Webhook },
  {
    id: string;
    body: {
      name?: string;
      description?: string;
      url?: string;
      events?: string[];
    };
  }
> {
  const [data, setData] = useState<{
    webhook: import("@/services/admin-api").Webhook;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: {
      id: string;
      body: {
        name?: string;
        description?: string;
        url?: string;
        events?: string[];
      };
    }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateWebhook(vars.id, vars.body);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/webhooks/{id}`. */
export function useDeleteWebhook(): UseAdminMutationResult<unknown, string> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteWebhook(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/webhooks/{id}/test`. */
export function useTestWebhook(): UseAdminMutationResult<
  WebhookTestResponse,
  string
> {
  const [data, setData] = useState<WebhookTestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.testWebhook(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `POST /api/admin/webhooks/{id}/regenerate-secret`. */
export function useRegenerateWebhookSecret(): UseAdminMutationResult<
  WebhookRegenerateSecretResponse,
  string
> {
  const [data, setData] = useState<WebhookRegenerateSecretResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.regenerateWebhookSecret(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `GET /api/admin/webhooks/event-types`. */
export function useWebhookEventTypes(): UseAdminQueryResult<WebhookEventTypeListResponse> {
  const [data, setData] = useState<WebhookEventTypeListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listWebhookEventTypes();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

// ===========================================================================
// Branding
// ===========================================================================

/** `GET /api/branding` — public read of the branding config. */
export function useBranding(): UseAdminQueryResult<BrandingConfig> {
  const [data, setData] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getBranding();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `PUT /api/admin/branding`. */
export function useUpdateBranding(): UseAdminMutationResult<
  BrandingConfig,
  Partial<BrandingConfig>
> {
  const [data, setData] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: Partial<BrandingConfig>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateBranding(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `GET /api/admin/branding/media`. */
export function useBrandingMedia(): UseAdminQueryResult<MediaItemListResponse> {
  const [data, setData] = useState<MediaItemListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listBrandingMedia();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/branding/media`. */
export function useUploadBrandingMedia(): UseAdminMutationResult<
  MediaItem,
  File
> {
  const [data, setData] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.uploadBrandingMedia(file);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/branding/media/{key}`. */
export function useDeleteBrandingMedia(): UseAdminMutationResult<
  unknown,
  string
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (key: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteBrandingMedia(key);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `GET /api/admin/branding/pages`. */
export function useBrandingPages(): UseAdminQueryResult<CustomPageListResponse> {
  const [data, setData] = useState<CustomPageListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.listBrandingPages();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `POST /api/admin/branding/pages`. */
export function useCreateBrandingPage(): UseAdminMutationResult<
  CustomPage,
  Partial<CustomPage>
> {
  const [data, setData] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: Partial<CustomPage>) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.createBrandingPage(vars);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `PUT /api/admin/branding/pages/{id}`. */
export function useUpdateBrandingPage(): UseAdminMutationResult<
  CustomPage,
  { id: string; body: Partial<CustomPage> }
> {
  const [data, setData] = useState<CustomPage | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (vars: { id: string; body: Partial<CustomPage> }) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.updateBrandingPage(vars.id, vars.body);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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

/** `DELETE /api/admin/branding/pages/{id}`. */
export function useDeleteBrandingPage(): UseAdminMutationResult<
  unknown,
  string
> {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();

  const mutate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await adminApi.deleteBrandingPage(id);
        if (isMounted()) setData(result);
        return result;
      } catch (err) {
        if (isMounted()) setError(err as AdminApiError);
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
// PM (Product Metrics) Dashboard
// ===========================================================================

/** `GET /api/admin/pm/funnel`. */
export function usePMFunnel(
  range?: string,
): UseAdminQueryResult<FunnelData> {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.pm.getFunnel(range);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [range, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([range])]);

  return { data, loading, error, refetch: run };
}

/** `GET /api/admin/pm/kpis`. */
export function usePMKPIs(): UseAdminQueryResult<KPIData> {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.pm.getKPIs();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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

/** `GET /api/admin/pm/retention`. */
export function usePMRetention(
  granularity?: string,
  periods?: number,
): UseAdminQueryResult<RetentionResponse> {
  const [data, setData] = useState<RetentionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.pm.getRetention(granularity, periods);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [granularity, periods, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([granularity, periods])]);

  return { data, loading, error, refetch: run };
}

/** `GET /api/admin/pm/engagement`. */
export function usePMEngagement(
  range?: string,
): UseAdminQueryResult<EngagementData> {
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.pm.getEngagement(range);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [range, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([range])]);

  return { data, loading, error, refetch: run };
}

/** `GET /api/admin/pm/events`. */
export function usePMCustomEvents(
  name?: string,
  range?: string,
): UseAdminQueryResult<Awaited<ReturnType<typeof adminApi.pm.getCustomEvents>>> {
  const [data, setData] = useState<
    Awaited<ReturnType<typeof adminApi.pm.getCustomEvents>> | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.pm.getCustomEvents(name, range);
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
      setData(null);
    } finally {
      if (isMounted() && token === fetchToken.current) setLoading(false);
    }
  }, [name, range, isMounted]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [argsKey([name, range])]);

  return { data, loading, error, refetch: run };
}

/** `GET /api/admin/pm/events/types`. */
export function usePMEventTypes(): UseAdminQueryResult<EventTypeListResponse> {
  const [data, setData] = useState<EventTypeListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<AdminApiError | null>(null);
  const isMounted = useIsMounted();
  const fetchToken = useRef(0);

  const run = useCallback(async () => {
    const token = ++fetchToken.current;
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.pm.listEventTypes();
      if (!isMounted() || token !== fetchToken.current) return;
      setData(result);
    } catch (err) {
      if (!isMounted() || token !== fetchToken.current) return;
      setError(err as AdminApiError);
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
