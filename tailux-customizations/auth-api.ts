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
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
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
  /** Set on /school-signup, optional on /login (a user may belong to 0..N tenants). */
  tenant?: AuthTenant;
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
 * The lastsaas backend (per Agent AUTH-1's spec) returns
 * `{ accessToken, refreshToken, user, tenant? }`. We also tolerate the
 * legacy shape `{ authToken, user }` returned by the original demo
 * `jwt-api-node` instance, so a backend that hasn't been fully migrated
 * doesn't break the UI.
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

  // The login endpoint returns `memberships[]` (not a single `tenant`).
  // The school-signup endpoint returns `tenant`. Handle both.
  const membership = Array.isArray(raw?.memberships) && raw.memberships.length > 0
    ? raw.memberships[0]
    : null;

  const tenantData = raw?.tenant ?? membership;

  return {
    accessToken,
    refreshToken: raw?.refreshToken,
    user: {
      id: String(raw?.user?.id ?? raw?.user?._id ?? ""),
      email: String(raw?.user?.email ?? ""),
      name: String(userName),
    },
    tenant: tenantData
      ? {
          id: String(tenantData.id ?? tenantData._id ?? tenantData.tenantId ?? ""),
          name: String(tenantData.name ?? tenantData.tenantName ?? tenantData.schoolName ?? ""),
          slug: String(tenantData.slug ?? tenantData.tenantSlug ?? tenantData.subdomain ?? ""),
        }
      : undefined,
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
