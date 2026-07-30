/**
 * Auth API client — thin axios wrapper over `/api/auth/*`.
 *
 * The dev server runs at http://localhost:5173/ and is reverse-proxied by the
 * Next.js host (or Vite's dev-server proxy in standalone mode) so that
 * `/api/auth/*` reaches the Go backend on port 4290. The base URL therefore
 * uses a same-origin relative path so requests work under both `vite dev`
 * (proxied) and production (Next.js catch-all route at `/api/auth/[...path]`).
 *
 * This module is intentionally separate from `src/services/lms-api.ts`:
 *  - The LMS client targets `/api/lms/*` and attaches the bearer token on
 *    every request.
 *  - The auth client targets `/api/auth/*` and only attaches the token when
 *    one is already in localStorage (so the public endpoints like /login and
 *    /school-signup don't fail when there's no session yet).
 *
 * Endpoints:
 *  - POST /school-signup     → create tenant + first user (school owner)
 *  - POST /login             → email/password login, returns JWT
 *  - GET  /tenants           → list a user's tenants
 *  - POST /forgot-password   → send password-reset email
 *  - POST /reset-password    → set a new password using a reset token
 *  - POST /mfa/challenge     → verify an MFA code and exchange for JWT
 */

import axios, { AxiosError, AxiosInstance } from "axios";

// ---------------------------------------------------------------------------
// Axios instance + interceptors
// ---------------------------------------------------------------------------

const AUTH_BASE_URL = "/api/auth";

/** localStorage key the existing auth provider uses (see `src/utils/jwt.ts`). */
const AUTH_TOKEN_KEY = "authToken";

export const authAxios: AxiosInstance = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor — attach the bearer token from localStorage if present.
 * Public endpoints (login, signup, forgot-password) are still callable when
 * the user has no session — the header is just omitted in that case.
 */
authAxios.interceptors.request.use((config) => {
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
export interface AuthApiError {
  /** HTTP status code, or 0 for network/timeout errors. */
  status: number;
  /** Human-readable error message. */
  message: string;
  /** Raw error body from the backend (when available). */
  details?: unknown;
}

/**
 * Response interceptor — unwrap backend error envelopes into a consistent
 * `AuthApiError` and reject the promise. Successful responses pass through
 * untouched so callers can destructure `response.data` themselves.
 */
authAxios.interceptors.response.use(
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

    const normalized: AuthApiError = { status, message, details };
    return Promise.reject(normalized);
  },
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchoolSignupInput {
  schoolName: string;
  fullName: string;
  email: string;
  password: string;
  /** Optional subdomain; the backend can derive one from `schoolName` if omitted. */
  subdomain?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** Active tenant role — defaults to `"student"` when no memberships. */
  role: string;
  /** All tenants the user belongs to (may be empty for a brand-new account). */
  memberships: AuthTenant[];
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  /** Role the user holds within this tenant (owner | admin | instructor | student). */
  role: string;
  /** True when this is the platform-level root tenant. */
  isRoot?: boolean;
}

export interface TenantMembership {
  tenantId: string;
  name: string;
  slug: string;
  role: string;
}

export interface AuthResponse {
  /** JWT access token. We accept `accessToken` (new spec) or `authToken` (legacy). */
  accessToken: string;
  /** Optional JWT refresh token — stored for future use. */
  refreshToken?: string;
  user: AuthUser;
  /** All tenants the user belongs to (may be empty for a brand-new account). */
  memberships: AuthTenant[];
  /** Set on /school-signup, optional on /login (a user may belong to 0..N tenants). */
  tenant?: AuthTenant | null;
  /** True when the backend requires the user to verify their email before login completes. */
  requiresEmailVerification?: boolean;
  /**
   * When MFA is required, the backend returns a `ticket` (or `mfaTicket`)
   * instead of a token. The caller should redirect to the MFA verify page.
   */
  ticket?: string;
  mfaTicket?: string;
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

/**
 * Normalise the raw backend response into our `AuthResponse` shape.
 *
 * The lastsaas backend returns `{ accessToken, refreshToken, user, memberships? }`
 * on `/login` (memberships[] carries the user's role per tenant) and
 * `{ accessToken, user, tenant }` on `/school-signup` (the freshly-created
 * tenant + the owner). We also tolerate the legacy shape `{ authToken, user }`
 * returned by the original demo `jwt_api-node` instance.
 *
 * The normaliser ALWAYS produces a `memberships[]` array (possibly empty) and
 * a `tenant` (the active tenant, derived from the first membership or the
 * top-level `tenant` field). `user.role` is set from the active tenant's role
 * so consumers that just want "what role am I?" can read a single field.
 */
function normalizeAuthResponse(raw: any): AuthResponse {
  const accessToken: string =
    raw?.accessToken ?? raw?.authToken ?? raw?.token ?? "";

  // The backend login endpoint returns `displayName` (not `name`).
  // The school-signup endpoint returns `name`. Handle both.
  const userName =
    raw?.user?.name ??
    raw?.user?.displayName ??
    raw?.user?.fullName ??
    "";

  // Extract memberships array (login returns this).
  const memberships: AuthTenant[] = Array.isArray(raw?.memberships)
    ? raw.memberships.map((m: any) => ({
        id: String(m.tenantId ?? m.id ?? m._id ?? ""),
        name: String(m.tenantName ?? m.name ?? m.schoolName ?? ""),
        slug: String(m.tenantSlug ?? m.slug ?? m.subdomain ?? ""),
        role: String(m.role ?? "student"),
        isRoot: Boolean(m.isRoot),
      }))
    : [];

  // For signup, construct the membership from the tenant object — signup
  // creates the tenant + the first user (the school owner).
  if (raw?.tenant && memberships.length === 0) {
    memberships.push({
      id: String(raw.tenant.id ?? raw.tenant._id ?? ""),
      name: String(raw.tenant.name ?? raw.tenant.schoolName ?? ""),
      slug: String(raw.tenant.slug ?? raw.tenant.subdomain ?? ""),
      role: "owner",
      isRoot: false,
    });
  }

  // Active tenant = first membership (or null when the user has none yet).
  const activeTenant: AuthTenant | null = memberships[0] ?? null;

  return {
    accessToken,
    refreshToken: raw?.refreshToken,
    user: {
      id: String(raw?.user?.id ?? raw?.user?._id ?? ""),
      email: String(raw?.user?.email ?? ""),
      name: String(userName),
      role: activeTenant?.role ?? "student",
      memberships,
    },
    memberships,
    tenant: activeTenant,
    requiresEmailVerification: Boolean(raw?.requiresEmailVerification),
    ticket: raw?.ticket ?? raw?.mfaTicket,
    mfaTicket: raw?.mfaTicket,
  };
}

export const authApi = {
  /** Create a new tenant + first user (school owner). Returns JWT + tenant. */
  schoolSignup: async (input: SchoolSignupInput): Promise<AuthResponse> => {
    const res = await authAxios.post("/school-signup", input);
    return normalizeAuthResponse(res.data);
  },

  /** Email/password login. Returns JWT (or, when MFA is required, a ticket). */
  login: async (input: LoginInput): Promise<AuthResponse> => {
    const res = await authAxios.post("/login", input);
    return normalizeAuthResponse(res.data);
  },

  /** List the tenants a user belongs to (requires the user's email). */
  getUserTenants: async (
    email: string,
  ): Promise<TenantMembership[]> => {
    const res = await authAxios.get("/tenants", { params: { email } });
    const data = res.data;
    // Tolerate both `[{...}]` and `{ tenants: [{...}] }` shapes.
    const list: unknown = Array.isArray(data)
      ? data
      : (data as { tenants?: unknown })?.tenants ?? [];
    if (!Array.isArray(list)) return [];
    return list.map((t: any) => ({
      tenantId: String(t?.tenantId ?? t?.id ?? t?._id ?? ""),
      name: String(t?.name ?? t?.schoolName ?? ""),
      slug: String(t?.slug ?? t?.subdomain ?? ""),
      role: String(t?.role ?? ""),
    }));
  },

  /** Request a password reset email. Always resolves (anti-enumeration). */
  forgotPassword: async (email: string): Promise<void> => {
    await authAxios.post("/forgot-password", { email });
  },

  /** Set a new password using a reset token. */
  resetPassword: async (token: string, password: string): Promise<void> => {
    await authAxios.post("/reset-password", { token, password });
  },

  /** Verify an MFA code and exchange the ticket for JWT. */
  mfaChallenge: async (ticket: string, code: string): Promise<AuthResponse> => {
    const res = await authAxios.post("/mfa/challenge", { ticket, code });
    return normalizeAuthResponse(res.data);
  },
};
