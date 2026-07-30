/**
 * lastsaas Admin API client — thin axios wrapper over `/api/admin/*` and the
 * related `/api/branding` + `/api/admin/branding/*` endpoints.
 *
 * The dev server runs at http://localhost:5173/ and is reverse-proxied by the
 * Next.js host (or Vite's dev-server proxy in standalone mode) so that
 * `/api/*` reaches the lastsaas Go backend on port 4290. The base URL uses a
 * same-origin relative path so requests work under both `vite dev` (proxied)
 * and production (Next.js catch-all route at `/api/admin/[...path]`).
 *
 * This module is intentionally separate from `src/services/lms-api.ts` and
 * `src/services/auth-api.ts`:
 *  - The LMS client targets `/api/lms/*`.
 *  - The auth client targets `/api/auth/*` and only attaches the token when
 *    one is already in localStorage (so public endpoints still work).
 *  - The admin client targets `/api/admin/*` and `/api/branding` (which is
 *    public for reads but admin-only for writes). Every request always
 *    attaches the bearer token and the active tenant id, since admin routes
 *    are protected by `RequireAuth + RequireRoot` middleware on the backend.
 *
 * Endpoints are grouped by resource and exported as a single `adminApi`
 * object (with one nested `pm` group for the product-management dashboard)
 * so consumers can do `adminApi.listTenants()`, `adminApi.pm.getKPIs()`, etc.
 *
 * Endpoint list is derived from the SAAS-A1 frontend audit of the lastsaas
 * backend (`internal/api/handlers/admin.go`, `branding.go`, `pm.go`, etc.)
 * and mirrors the API surface exposed by the canonical
 * `lastsaas/frontend/src/api/client.ts` `adminApi` + `brandingAdminApi` +
 * `pmApi` objects.
 */

import axios, { AxiosError, AxiosInstance } from "axios";

// ---------------------------------------------------------------------------
// Axios instance + interceptors
// ---------------------------------------------------------------------------

const ADMIN_BASE_URL = "/api";

/** localStorage keys the existing auth provider uses (see `src/utils/jwt.ts`). */
const AUTH_TOKEN_KEY = "authToken";
const AUTH_TENANT_KEY = "authTenant";

export const adminAxios: AxiosInstance = axios.create({
  baseURL: ADMIN_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor — attach the bearer token from localStorage and the
 * active tenant id (sent as `X-Tenant-ID`). Admin routes are protected by
 * `RequireAuth`, so the token is always sent; the tenant header is sent when
 * present so the backend can resolve the root tenant context.
 */
adminAxios.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenantStr = window.localStorage.getItem(AUTH_TENANT_KEY);
    if (tenantStr) {
      try {
        const tenant = JSON.parse(tenantStr) as { id?: string };
        if (tenant.id) {
          config.headers["X-Tenant-ID"] = tenant.id;
        }
      } catch {
        // ignore malformed tenant entries — the header just won't be sent.
      }
    }
  }
  return config;
});

/**
 * Normalized error shape returned to callers. Always a plain object so hooks
 * can safely do `error.message` without digging into Axios internals.
 */
export interface AdminApiError {
  /** HTTP status code, or 0 for network/timeout errors. */
  status: number;
  /** Human-readable error message. */
  message: string;
  /** Raw error body from the backend (when available). */
  details?: unknown;
}

/**
 * Response interceptor — unwrap backend error envelopes into a consistent
 * `AdminApiError` and reject the promise. Successful responses pass through
 * untouched so callers can destructure `response.data` themselves.
 */
adminAxios.interceptors.response.use(
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

    const normalized: AdminApiError = { status, message, details };
    return Promise.reject(normalized);
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Dashboard summary (top-line counts + health). */
export interface AdminDashboard {
  users: { total: number; active: number };
  tenants: { total: number; active: number };
  health: { healthy: boolean; issues: string[] };
}

/** "About" info returned by `/admin/about`. */
export interface AdminAbout {
  version: string;
  copyright: string;
}

/** Row in the paginated `/admin/tenants` list. */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isRoot: boolean;
  isActive: boolean;
  planName?: string;
  billingStatus?: string;
  billingWaived?: boolean;
  subscriptionCredits?: number;
  purchasedCredits?: number;
  seatQuantity?: number;
  billingInterval?: string;
  currentPeriodEnd?: string;
  memberCount?: number;
  createdAt: string;
}

/** Full tenant document returned by `/admin/tenants/{id}`. */
export interface TenantDetail extends Tenant {
  planId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  canceledAt?: string;
  members: Array<{
    userId: string;
    email: string;
    displayName: string;
    role: string;
    joinedAt: string;
  }>;
}

/** Response shape from `GET /admin/tenants`. */
export interface TenantListResponse {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
}

/** Response shape from `GET /admin/tenants/{id}`. */
export interface TenantDetailResponse {
  tenant: TenantDetail;
  members: TenantDetail["members"];
}

/** Row in the paginated `/admin/users` list. */
export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  emailVerified: boolean;
  authMethods: string[];
  tenantCount?: number;
  createdAt: string;
  lastLoginAt?: string;
}

/** User detail returned by `/admin/users/{id}`. */
export interface AdminUserDetail extends AdminUser {
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    role: string;
    isRoot: boolean;
    joinedAt: string;
    planId?: string;
    planName?: string;
    billingWaived?: boolean;
    subscriptionCredits?: number;
    purchasedCredits?: number;
  }>;
}

/** Response shape from `GET /admin/users`. */
export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

/** Response shape from `GET /admin/users/{id}`. */
export interface AdminUserDetailResponse {
  user: AdminUserDetail;
  memberships: AdminUserDetail["memberships"];
}

/** Preflight info returned by `/admin/users/{id}/preflight-delete`. */
export interface DeleteUserPreflight {
  canDelete: boolean;
  reason?: string;
  ownerships?: Array<{
    tenantId: string;
    tenantName: string;
    isRoot: boolean;
    otherMembers: Array<{ userId: string; displayName: string; email: string }>;
  }>;
}

/** Response shape from `/admin/users/{id}/impersonate`. */
export interface ImpersonationResponse {
  accessToken: string;
  user: AdminUser;
  memberships: AdminUserDetail["memberships"];
}

/** Row in the `/admin/plans` list. */
export interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  annualDiscountPct?: number;
  usageCreditsPerMonth: number;
  creditResetPolicy?: string;
  bonusCredits?: number;
  userLimit: number;
  pricingModel?: string;
  perSeatPriceCents?: number;
  includedSeats?: number;
  minSeats?: number;
  maxSeats?: number;
  entitlements?: Record<string, unknown>;
  trialDays?: number;
  isSystem: boolean;
  isArchived: boolean;
  isActive?: boolean;
  subscriberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Response shape from `GET /admin/plans`. */
export interface PlanListResponse {
  plans: Plan[];
}

/** Response shape from `GET /admin/entitlement-keys`. */
export interface EntitlementKey {
  key: string;
  type: string;
  description: string;
}

/** Row in the `/admin/credit-bundles` list. */
export interface CreditBundle {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  isActive: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Response shape from `GET /admin/credit-bundles`. */
export interface CreditBundleListResponse {
  bundles: CreditBundle[];
}

/** Row in the `/admin/financial/transactions` list. */
export interface FinancialTransaction {
  id: string;
  tenantId?: string;
  userId?: string;
  type: string;
  description: string;
  amountCents: number;
  subtotalCents?: number;
  taxAmountCents?: number;
  taxCents?: number;
  currency: string;
  invoiceNumber?: string;
  planName?: string;
  bundleName?: string;
  billingInterval?: string;
  tenantName?: string;
  createdAt: string;
}

/** Response shape from `GET /admin/financial/transactions`. */
export interface FinancialTransactionListResponse {
  transactions: FinancialTransaction[];
  total: number;
  page: number;
  perPage: number;
}

/** Daily metric point used by `/admin/financial/metrics`. */
export interface DailyMetricPoint {
  date: string;
  value: number;
}

/** Response shape from `GET /admin/financial/metrics`. */
export interface FinancialMetricsResponse {
  data: DailyMetricPoint[];
}

/** Row in the `/admin/health/nodes` list. */
export interface HealthNode {
  id?: string;
  hostname: string;
  machineId: string;
  status: string;
  version: string;
  goVersion: string;
  startedAt?: string;
  lastSeen: string;
  upSince?: string;
}

/** Response shape from `GET /admin/health/nodes`. */
export interface HealthNodesResponse {
  nodes: HealthNode[];
}

/** A single system-metrics sample. */
export interface HealthMetric {
  id?: string;
  nodeId?: string;
  timestamp: string;
  cpu?: {
    usagePercent?: number;
    numCpu?: number;
  };
  memory?: {
    usedBytes?: number;
    totalBytes?: number;
    usedPercent?: number;
  };
  disk?: {
    usedBytes?: number;
    totalBytes?: number;
    usedPercent?: number;
  };
  http?: {
    requestCount?: number;
    latencyP50?: number;
    latencyP95?: number;
    latencyP99?: number;
    statusCodes?: Record<string, number>;
    errorRate4xx?: number;
    errorRate5xx?: number;
  };
  mongo?: {
    currentConnections?: number;
    availableConnections?: number;
    dataSizeBytes?: number;
    indexSizeBytes?: number;
    collections?: number;
    opCounters?: Record<string, number>;
  };
  goRuntime?: {
    numGoroutine?: number;
    heapAlloc?: number;
    heapSys?: number;
    gcPauseNs?: number;
    numGC?: number;
  };
  integrations?: {
    stripeApiCalls?: number;
    resendEmails?: number;
  };
}

/** Response shape from `GET /admin/health/metrics` and `/admin/health/current`. */
export interface HealthMetricsResponse {
  metrics: HealthMetric[];
  from?: string;
  to?: string;
}

/** Row in the `/admin/health/integrations` list. */
export interface HealthIntegration {
  name: string;
  status: string;
  message?: string;
  lastCheck?: string;
  responseMs?: number;
  calls24h?: number;
}

/** Response shape from `GET /admin/health/integrations`. */
export interface HealthIntegrationsResponse {
  integrations: HealthIntegration[];
}

/** Response shape from `POST /admin/health/test-email`. */
export interface TestEmailResponse {
  success?: boolean;
  error?: string;
}

/** Row in the `/admin/logs` list. */
export interface SystemLog {
  id: string;
  severity: string;
  category?: string;
  message: string;
  action?: string;
  userId?: string;
  tenantId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/** Response shape from `GET /admin/logs`. */
export interface SystemLogListResponse {
  logs: SystemLog[];
  total: number;
}

/** Response shape from `GET /admin/logs/severity-counts`. */
export interface SystemLogSeverityCountsResponse {
  counts: Record<string, number>;
}

/** Row in the `/admin/config` list. */
export interface ConfigVar {
  id?: string;
  name: string;
  description?: string;
  type: string;
  value: string;
  options?: string | string[];
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Response shape from `GET /admin/config`. */
export interface ConfigVarListResponse {
  configs: ConfigVar[];
}

/** Row in the `/admin/api-keys` list. */
export interface APIKey {
  id: string;
  name: string;
  keyPreview: string;
  authority: string;
  createdBy?: string;
  isActive?: boolean;
  createdAt: string;
  lastUsedAt?: string;
  /** Only set on creation — the backend returns the raw key once. */
  rawKey?: string;
}

/** Response shape from `GET /admin/api-keys`. */
export interface APIKeyListResponse {
  apiKeys: APIKey[];
}

/** Response shape from `POST /admin/api-keys`. */
export interface APIKeyCreateResponse {
  apiKey: APIKey;
  rawKey: string;
}

/** Row in the `/admin/webhooks` list. */
export interface Webhook {
  id: string;
  name: string;
  description?: string;
  url: string;
  secretPreview?: string;
  isActive: boolean;
  events: string[];
  createdBy?: string;
  deliveries24h?: number;
  lastDeliveryAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

/** Webhook delivery record (returned by `GET /admin/webhooks/{id}`). */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload?: string;
  responseCode: number;
  responseBody?: string;
  success: boolean;
  durationMs: number;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

/** Response shape from `GET /admin/webhooks`. */
export interface WebhookListResponse {
  webhooks: Webhook[];
}

/** Response shape from `GET /admin/webhooks/{id}`. */
export interface WebhookDetailResponse {
  webhook: Webhook;
  deliveries: WebhookDelivery[];
}

/** Response shape from `POST /admin/webhooks`. */
export interface WebhookCreateResponse {
  webhook: Webhook;
  secret: string;
}

/** Response shape from `POST /admin/webhooks/{id}/test`. */
export interface WebhookTestResponse {
  delivery: WebhookDelivery;
}

/** Response shape from `POST /admin/webhooks/{id}/regenerate-secret`. */
export interface WebhookRegenerateSecretResponse {
  secret: string;
  secretPreview: string;
}

/** Row in the `/admin/webhooks/event-types` list. */
export interface WebhookEventType {
  type: string;
  category?: string;
  description?: string;
}

/** Response shape from `GET /admin/webhooks/event-types`. */
export interface WebhookEventTypeListResponse {
  eventTypes: WebhookEventType[];
}

/** Row in the `/admin/announcements` list. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Response shape from `GET /admin/announcements`. */
export interface AnnouncementListResponse {
  announcements: Announcement[];
}

/** Row in the `/admin/promotions` list. */
export interface Promotion {
  id: string;
  code: string;
  active: boolean;
  couponId?: string;
  couponName?: string;
  percentOff?: number;
  amountOff?: number;
  currency?: string;
  timesRedeemed?: number;
  maxRedemptions?: number;
  expiresAt?: number;
  created?: number;
  appliesToProducts?: string[];
}

/** Eligible product for a promotion. */
export interface EligibleProduct {
  id: string;
  name: string;
  type: "plan" | "bundle" | string;
}

/** Response shape from `GET /admin/promotions`. */
export interface PromotionListResponse {
  promotions: Promotion[];
  productNames?: Record<string, string>;
}

/** Response shape from `GET /admin/promotions/eligible-products`. */
export interface EligibleProductListResponse {
  items: EligibleProduct[];
}

/** Response shape from `POST /admin/promotions`. */
export interface PromotionCreateResponse {
  id: string;
  code: string;
}

/** Tenant member record (used by both `/admin/members` and `/tenant/members`). */
export interface TenantMember {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  joinedAt: string;
}

/** Pending invitation returned by `/admin/members`. */
export interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy?: string;
  expiresAt: string;
  createdAt: string;
}

/** Response shape from `GET /admin/members`. */
export interface RootMembersResponse {
  members: TenantMember[];
  invitations: Invitation[];
}

/** Nav item inside the branding config. */
export interface BrandingNavItem {
  id?: string;
  label: string;
  url?: string;
  target?: string;
  icon?: string;
  entitlementGate?: string;
  isBuiltIn?: boolean;
  visible?: boolean;
  sortOrder?: number;
}

/** Branding config returned by `GET /branding` and updated via `PUT /admin/branding`. */
export interface BrandingConfig {
  appName: string;
  tagline?: string;
  logoMode?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontFamily?: string;
  headingFont?: string;
  landingEnabled?: boolean;
  landingTitle?: string;
  landingMeta?: string;
  landingHtml?: string;
  dashboardHtml?: string;
  loginHeading?: string;
  loginSubtext?: string;
  signupHeading?: string;
  signupSubtext?: string;
  customCss?: string;
  headHtml?: string;
  ogImageUrl?: string;
  navItems?: BrandingNavItem[];
  analyticsSnippet?: string;
  authProviders?: Record<string, boolean>;
}

/** Media item returned by `/admin/branding/media`. */
export interface MediaItem {
  id: string;
  key: string;
  filename?: string;
  contentType?: string;
  size?: number;
  url: string;
  createdAt: string;
}

/** Response shape from `GET /admin/branding/media`. */
export interface MediaItemListResponse {
  media: MediaItem[];
}

/** Custom landing page returned by `/admin/branding/pages`. */
export interface CustomPage {
  id: string;
  slug: string;
  title: string;
  htmlBody?: string;
  metaDescription?: string;
  ogImage?: string;
  isPublished: boolean;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

/** Response shape from `GET /admin/branding/pages`. */
export interface CustomPageListResponse {
  pages: CustomPage[];
}

// ---------------------------------------------------------------------------
// Product-management (PM) dashboard types
// ---------------------------------------------------------------------------

export interface FunnelStep {
  name: string;
  count: number;
  conversion: number;
}

export interface FunnelData {
  uniqueVisitors?: number;
  registrations?: number;
  planPageViews?: number;
  checkoutsStarted?: number;
  paidConversions?: number;
  upgrades?: number;
  steps: FunnelStep[];
}

export interface CohortRow {
  cohortLabel: string;
  cohortSize: number;
  retention: number[];
}

export interface RetentionResponse {
  granularity: string;
  periods: number;
  cohorts: CohortRow[];
}

export interface FeatureUse {
  name: string;
  count: number;
}

export interface EngagementData {
  dau?: DailyMetricPoint[];
  wau?: DailyMetricPoint[];
  mau?: DailyMetricPoint[];
  avgSessions?: number;
  topFeatures?: FeatureUse[];
  creditTrend?: DailyMetricPoint[];
}

export interface PlanShare {
  planName: string;
  subscribers: number;
  percentage: number;
  mrr: number;
}

export interface KPIData {
  mrr?: number;
  arr?: number;
  arpu?: number;
  ltv?: number;
  churnRate?: number;
  trialConversionRate?: number;
  timeToFirstPurchase?: number;
  activeSubscribers?: number;
  totalRegistrations?: number;
  planDistribution?: PlanShare[];
  mrrTrend?: DailyMetricPoint[];
  subscriberTrend?: DailyMetricPoint[];
}

export interface CustomEventData {
  eventName: string;
  totalCount: number;
  trend: DailyMetricPoint[];
}

export interface EventTypeSummary {
  eventName: string;
  category?: string;
  count: number;
  lastSeen: string;
}

export interface EventTypeListResponse {
  eventTypes: EventTypeSummary[];
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export const adminApi = {
  // --- Dashboard ---------------------------------------------------------
  getDashboard: (): Promise<AdminDashboard> =>
    adminAxios.get("/admin/dashboard").then((r) => r.data),
  getAbout: (): Promise<AdminAbout> =>
    adminAxios.get("/admin/about").then((r) => r.data),

  // --- Tenants -----------------------------------------------------------
  listTenants: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    status?: string;
    billingStatus?: string;
  }): Promise<TenantListResponse> =>
    adminAxios.get("/admin/tenants", { params }).then((r) => r.data),
  getTenant: (id: string): Promise<TenantDetailResponse> =>
    adminAxios.get(`/admin/tenants/${id}`).then((r) => r.data),
  updateTenant: (
    id: string,
    body: {
      name?: string;
      billingWaived?: boolean;
      subscriptionCredits?: number;
      purchasedCredits?: number;
    },
  ): Promise<unknown> =>
    adminAxios.put(`/admin/tenants/${id}`, body).then((r) => r.data),
  updateTenantStatus: (id: string, isActive: boolean): Promise<unknown> =>
    adminAxios
      .patch(`/admin/tenants/${id}/status`, { isActive })
      .then((r) => r.data),
  assignTenantPlan: (
    tenantId: string,
    planId?: string,
    billingWaived?: boolean,
  ): Promise<unknown> =>
    adminAxios
      .patch(`/admin/tenants/${tenantId}/plan`, { planId, billingWaived })
      .then((r) => r.data),
  cancelTenantSubscription: (
    tenantId: string,
    immediate: boolean,
  ): Promise<unknown> =>
    adminAxios
      .post(`/admin/tenants/${tenantId}/cancel-subscription`, { immediate })
      .then((r) => r.data),
  exportTenantsCSV: (params?: {
    search?: string;
    status?: string;
    billingStatus?: string;
  }): Promise<Blob> =>
    adminAxios
      .get("/admin/tenants/export", { params, responseType: "blob" })
      .then((r) => r.data),

  // --- Users -------------------------------------------------------------
  listUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    status?: string;
  }): Promise<AdminUserListResponse> =>
    adminAxios.get("/admin/users", { params }).then((r) => r.data),
  getUser: (id: string): Promise<AdminUserDetailResponse> =>
    adminAxios.get(`/admin/users/${id}`).then((r) => r.data),
  updateUser: (
    id: string,
    body: { email?: string; displayName?: string },
  ): Promise<unknown> =>
    adminAxios.put(`/admin/users/${id}`, body).then((r) => r.data),
  updateUserStatus: (id: string, isActive: boolean): Promise<unknown> =>
    adminAxios
      .patch(`/admin/users/${id}/status`, { isActive })
      .then((r) => r.data),
  updateUserRole: (
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<unknown> =>
    adminAxios
      .patch(`/admin/users/${userId}/role/${tenantId}`, { role })
      .then((r) => r.data),
  preflightDeleteUser: (id: string): Promise<DeleteUserPreflight> =>
    adminAxios.get(`/admin/users/${id}/preflight-delete`).then((r) => r.data),
  deleteUser: (
    id: string,
    body?: {
      replacementOwners?: Record<string, string> | string[];
      confirmTenantDeletions?: string[];
    },
  ): Promise<unknown> =>
    adminAxios.delete(`/admin/users/${id}`, { data: body }).then((r) => r.data),
  impersonateUser: (userId: string): Promise<ImpersonationResponse> =>
    adminAxios.post(`/admin/users/${userId}/impersonate`).then((r) => r.data),
  exportUsersCSV: (params?: {
    search?: string;
    status?: string;
  }): Promise<Blob> =>
    adminAxios
      .get("/admin/users/export", { params, responseType: "blob" })
      .then((r) => r.data),

  // --- Root Members ------------------------------------------------------
  listRootMembers: (): Promise<RootMembersResponse> =>
    adminAxios.get("/admin/members").then((r) => r.data),
  inviteRootMember: (email: string, role: string): Promise<unknown> =>
    adminAxios.post("/admin/members/invite", { email, role }).then((r) => r.data),
  removeRootMember: (userId: string): Promise<unknown> =>
    adminAxios.delete(`/admin/members/${userId}`).then((r) => r.data),
  changeRootMemberRole: (userId: string, role: string): Promise<unknown> =>
    adminAxios
      .patch(`/admin/members/${userId}/role`, { role })
      .then((r) => r.data),
  cancelRootInvitation: (invitationId: string): Promise<unknown> =>
    adminAxios
      .delete(`/admin/members/invitations/${invitationId}`)
      .then((r) => r.data),

  // --- Plans -------------------------------------------------------------
  listPlans: (): Promise<PlanListResponse> =>
    adminAxios.get("/admin/plans").then((r) => r.data),
  getPlan: (id: string): Promise<Plan> =>
    adminAxios.get(`/admin/plans/${id}`).then((r) => r.data),
  createPlan: (body: Partial<Plan>): Promise<Plan> =>
    adminAxios.post("/admin/plans", body).then((r) => r.data),
  updatePlan: (id: string, body: Partial<Plan>): Promise<Plan> =>
    adminAxios.put(`/admin/plans/${id}`, body).then((r) => r.data),
  deletePlan: (id: string): Promise<unknown> =>
    adminAxios.delete(`/admin/plans/${id}`).then((r) => r.data),
  archivePlan: (id: string): Promise<unknown> =>
    adminAxios.post(`/admin/plans/${id}/archive`).then((r) => r.data),
  unarchivePlan: (id: string): Promise<unknown> =>
    adminAxios.post(`/admin/plans/${id}/unarchive`).then((r) => r.data),
  listEntitlementKeys: (): Promise<{ keys: EntitlementKey[] }> =>
    adminAxios.get("/admin/entitlement-keys").then((r) => r.data),

  // --- Credit Bundles ----------------------------------------------------
  listBundles: (): Promise<CreditBundleListResponse> =>
    adminAxios.get("/admin/credit-bundles").then((r) => r.data),
  createBundle: (body: Partial<CreditBundle>): Promise<CreditBundle> =>
    adminAxios.post("/admin/credit-bundles", body).then((r) => r.data),
  updateBundle: (
    id: string,
    body: Partial<CreditBundle>,
  ): Promise<CreditBundle> =>
    adminAxios.put(`/admin/credit-bundles/${id}`, body).then((r) => r.data),
  deleteBundle: (id: string): Promise<unknown> =>
    adminAxios.delete(`/admin/credit-bundles/${id}`).then((r) => r.data),

  // --- Health ------------------------------------------------------------
  listHealthNodes: (): Promise<HealthNodesResponse> =>
    adminAxios.get("/admin/health/nodes").then((r) => r.data),
  getHealthMetrics: (params?: {
    node?: string;
    range?: string;
  }): Promise<HealthMetricsResponse> =>
    adminAxios.get("/admin/health/metrics", { params }).then((r) => r.data),
  getHealthCurrent: (): Promise<HealthMetricsResponse> =>
    adminAxios.get("/admin/health/current").then((r) => r.data),
  getHealthIntegrations: (): Promise<HealthIntegrationsResponse> =>
    adminAxios.get("/admin/health/integrations").then((r) => r.data),
  sendTestEmail: (to: string): Promise<TestEmailResponse> =>
    adminAxios.post("/admin/health/test-email", { to }).then((r) => r.data),

  // --- Financial ---------------------------------------------------------
  listFinancialTransactions: (params?: {
    page?: number;
    perPage?: number;
    tenantId?: string;
    search?: string;
  }): Promise<FinancialTransactionListResponse> =>
    adminAxios
      .get("/admin/financial/transactions", { params })
      .then((r) => r.data),
  getFinancialMetrics: (params?: {
    range?: string;
    metric?: string;
  }): Promise<FinancialMetricsResponse> =>
    adminAxios
      .get("/admin/financial/metrics", { params })
      .then((r) => r.data),

  // --- Promotions --------------------------------------------------------
  listPromotions: (): Promise<PromotionListResponse> =>
    adminAxios.get("/admin/promotions").then((r) => r.data),
  listEligibleProducts: (): Promise<EligibleProductListResponse> =>
    adminAxios.get("/admin/promotions/eligible-products").then((r) => r.data),
  createPromotion: (body: {
    code: string;
    name?: string;
    percentOff?: number;
    amountOff?: number;
    currency?: string;
    maxRedemptions?: number;
    expiresAt?: string;
    appliesTo?: Array<{ type: string; id: string }>;
  }): Promise<PromotionCreateResponse> =>
    adminAxios.post("/admin/promotions", body).then((r) => r.data),
  updatePromotion: (body: {
    id: string;
    couponId: string;
    couponName?: string;
    active?: boolean;
  }): Promise<unknown> =>
    adminAxios.post("/admin/promotions/update", body).then((r) => r.data),
  deactivatePromotion: (id: string): Promise<unknown> =>
    adminAxios
      .post("/admin/promotions/deactivate", { id })
      .then((r) => r.data),

  // --- Announcements -----------------------------------------------------
  listAnnouncements: (): Promise<AnnouncementListResponse> =>
    adminAxios.get("/admin/announcements").then((r) => r.data),
  createAnnouncement: (body: {
    title: string;
    body: string;
    publish?: boolean;
  }): Promise<Announcement> =>
    adminAxios.post("/admin/announcements", body).then((r) => r.data),
  updateAnnouncement: (
    id: string,
    body: Partial<{ title: string; body: string; publish: boolean }>,
  ): Promise<Announcement> =>
    adminAxios.put(`/admin/announcements/${id}`, body).then((r) => r.data),
  deleteAnnouncement: (id: string): Promise<unknown> =>
    adminAxios.delete(`/admin/announcements/${id}`).then((r) => r.data),

  // --- Logs --------------------------------------------------------------
  listLogs: (params?: {
    page?: number;
    perPage?: number;
    severity?: string;
    category?: string;
    search?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<SystemLogListResponse> =>
    adminAxios.get("/admin/logs", { params }).then((r) => r.data),
  logSeverityCounts: (params?: {
    category?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<SystemLogSeverityCountsResponse> =>
    adminAxios
      .get("/admin/logs/severity-counts", { params })
      .then((r) => r.data),
  exportLogsCSV: (params?: {
    severity?: string;
    category?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Blob> =>
    adminAxios
      .get("/admin/logs/export", { params, responseType: "blob" })
      .then((r) => r.data),

  // --- Config ------------------------------------------------------------
  listConfig: (): Promise<ConfigVarListResponse> =>
    adminAxios.get("/admin/config").then((r) => r.data),
  getConfig: (name: string): Promise<ConfigVar> =>
    adminAxios.get(`/admin/config/${name}`).then((r) => r.data),
  updateConfig: (
    name: string,
    body: {
      value: string;
      description?: string;
      options?: string | string[];
    },
  ): Promise<ConfigVar> =>
    adminAxios.put(`/admin/config/${name}`, body).then((r) => r.data),
  createConfig: (body: {
    name: string;
    description?: string;
    type: string;
    value: string;
    options?: string | string[];
  }): Promise<ConfigVar> =>
    adminAxios.post("/admin/config", body).then((r) => r.data),
  deleteConfig: (name: string): Promise<unknown> =>
    adminAxios.delete(`/admin/config/${name}`).then((r) => r.data),

  // --- API Keys ----------------------------------------------------------
  listAPIKeys: (): Promise<APIKeyListResponse> =>
    adminAxios.get("/admin/api-keys").then((r) => r.data),
  createAPIKey: (body: {
    name: string;
    authority: string;
  }): Promise<APIKeyCreateResponse> =>
    adminAxios.post("/admin/api-keys", body).then((r) => r.data),
  deleteAPIKey: (id: string): Promise<unknown> =>
    adminAxios.delete(`/admin/api-keys/${id}`).then((r) => r.data),

  // --- Webhooks ----------------------------------------------------------
  listWebhooks: (): Promise<WebhookListResponse> =>
    adminAxios.get("/admin/webhooks").then((r) => r.data),
  getWebhook: (id: string): Promise<WebhookDetailResponse> =>
    adminAxios.get(`/admin/webhooks/${id}`).then((r) => r.data),
  createWebhook: (body: {
    name: string;
    description?: string;
    url: string;
    events: string[];
  }): Promise<WebhookCreateResponse> =>
    adminAxios.post("/admin/webhooks", body).then((r) => r.data),
  updateWebhook: (
    id: string,
    body: {
      name?: string;
      description?: string;
      url?: string;
      events?: string[];
    },
  ): Promise<{ webhook: Webhook }> =>
    adminAxios.put(`/admin/webhooks/${id}`, body).then((r) => r.data),
  deleteWebhook: (id: string): Promise<unknown> =>
    adminAxios.delete(`/admin/webhooks/${id}`).then((r) => r.data),
  testWebhook: (id: string): Promise<WebhookTestResponse> =>
    adminAxios.post(`/admin/webhooks/${id}/test`).then((r) => r.data),
  regenerateWebhookSecret: (
    id: string,
  ): Promise<WebhookRegenerateSecretResponse> =>
    adminAxios
      .post(`/admin/webhooks/${id}/regenerate-secret`)
      .then((r) => r.data),
  listWebhookEventTypes: (): Promise<WebhookEventTypeListResponse> =>
    adminAxios.get("/admin/webhooks/event-types").then((r) => r.data),

  // --- Branding ----------------------------------------------------------
  /** Public read endpoint (no auth required). */
  getBranding: (): Promise<BrandingConfig> =>
    adminAxios.get("/branding").then((r) => r.data),
  updateBranding: (body: Partial<BrandingConfig>): Promise<BrandingConfig> =>
    adminAxios.put("/admin/branding", body).then((r) => r.data),
  uploadBrandingAsset: (
    key: "logo" | "favicon" | string,
    file: File,
  ): Promise<unknown> => {
    const formData = new FormData();
    formData.append("file", file);
    return adminAxios
      .post("/admin/branding/asset", formData, {
        params: { key },
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  deleteBrandingAsset: (key: string): Promise<unknown> =>
    adminAxios.delete(`/admin/branding/asset/${key}`).then((r) => r.data),
  listBrandingMedia: (): Promise<MediaItemListResponse> =>
    adminAxios.get("/admin/branding/media").then((r) => r.data),
  uploadBrandingMedia: (file: File): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append("file", file);
    return adminAxios
      .post("/admin/branding/media", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  deleteBrandingMedia: (key: string): Promise<unknown> =>
    adminAxios.delete(`/admin/branding/media/${key}`).then((r) => r.data),
  listBrandingPages: (): Promise<CustomPageListResponse> =>
    adminAxios.get("/admin/branding/pages").then((r) => r.data),
  createBrandingPage: (body: Partial<CustomPage>): Promise<CustomPage> =>
    adminAxios.post("/admin/branding/pages", body).then((r) => r.data),
  updateBrandingPage: (
    id: string,
    body: Partial<CustomPage>,
  ): Promise<CustomPage> =>
    adminAxios.put(`/admin/branding/pages/${id}`, body).then((r) => r.data),
  deleteBrandingPage: (id: string): Promise<unknown> =>
    adminAxios.delete(`/admin/branding/pages/${id}`).then((r) => r.data),

  // --- PM (Product Metrics) Dashboard -----------------------------------
  pm: {
    getFunnel: (range?: string): Promise<FunnelData> =>
      adminAxios
        .get("/admin/pm/funnel", { params: { range } })
        .then((r) => r.data),
    getKPIs: (): Promise<KPIData> =>
      adminAxios.get("/admin/pm/kpis").then((r) => r.data),
    getRetention: (
      granularity?: string,
      periods?: number,
    ): Promise<RetentionResponse> =>
      adminAxios
        .get("/admin/pm/retention", { params: { granularity, periods } })
        .then((r) => r.data),
    getEngagement: (range?: string): Promise<EngagementData> =>
      adminAxios
        .get("/admin/pm/engagement", { params: { range } })
        .then((r) => r.data),
    getCustomEvents: (
      name?: string,
      range?: string,
    ): Promise<CustomEventData> =>
      adminAxios
        .get("/admin/pm/events", { params: { name, range } })
        .then((r) => r.data),
    listEventTypes: (): Promise<EventTypeListResponse> =>
      adminAxios.get("/admin/pm/events/types").then((r) => r.data),
  },
};
