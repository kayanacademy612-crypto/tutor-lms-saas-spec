// Import Dependencies
import { useEffect, useReducer, ReactNode } from "react";

// Local Imports
import { authApi, AuthApiError } from "@/services/auth-api";
import { isTokenValid, setSession } from "@/utils/jwt";
import {
  AuthProvider as AuthContext,
  AuthContextType,
  AuthTenant,
  SignupInput,
  User,
} from "./context";

// ----------------------------------------------------------------------

/**
 * localStorage keys. The access token lives under `authToken` (kept for
 * backward-compat with `src/utils/jwt.ts#setSession` and `lmsAxios`'s
 * request interceptor in `src/services/lms-api.ts`). The refresh token,
 * user (with memberships), and active tenant are persisted under separate
 * keys so the app can rehydrate its session on next page load without an
 * extra round-trip to the backend (the lastsaas auth API does not expose
 * a `/me` endpoint yet — see Agent AUTH-1's spec).
 *
 * `memberships` are persisted as part of the `authUser` blob (they're a
 * field on the User object) so we don't need a separate key for them.
 */
const ACCESS_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "authUser";
const TENANT_KEY = "authTenant";

// ----------------------------------------------------------------------

interface AuthAction {
  type:
    | "INITIALIZE"
    | "LOGIN_REQUEST"
    | "LOGIN_SUCCESS"
    | "LOGIN_ERROR"
    | "SIGNUP_REQUEST"
    | "SIGNUP_SUCCESS"
    | "LOGOUT"
    | "SWITCH_TENANT"
    | "CLEAR_ERROR";
  payload?: Partial<AuthContextType> & { errorMessage?: string | null };
}

// Initial state
const initialState: AuthContextType = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  errorMessage: null,
  user: null,
  tenant: null,
  activeTenant: null,
  accessToken: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  switchTenant: () => {},
  clearError: () => {},
};

// Reducer handlers
const reducerHandlers: Record<
  AuthAction["type"],
  (state: AuthContextType, action: AuthAction) => AuthContextType
> = {
  INITIALIZE: (state, action) => ({
    ...state,
    isInitialized: true,
    isAuthenticated: action.payload?.isAuthenticated ?? false,
    user: action.payload?.user ?? null,
    tenant: action.payload?.tenant ?? null,
    activeTenant: action.payload?.tenant ?? null,
    accessToken: action.payload?.accessToken ?? null,
  }),

  LOGIN_REQUEST: (state) => ({
    ...state,
    isLoading: true,
    errorMessage: null,
  }),

  LOGIN_SUCCESS: (state, action) => {
    const tenant = action.payload?.tenant ?? state.tenant;
    return {
      ...state,
      isAuthenticated: true,
      isLoading: false,
      errorMessage: null,
      user: action.payload?.user ?? null,
      tenant,
      activeTenant: tenant,
      accessToken: action.payload?.accessToken ?? null,
    };
  },

  LOGIN_ERROR: (state, action) => ({
    ...state,
    errorMessage: action.payload?.errorMessage ?? "An error occurred",
    isLoading: false,
  }),

  SIGNUP_REQUEST: (state) => ({
    ...state,
    isLoading: true,
    errorMessage: null,
  }),

  SIGNUP_SUCCESS: (state, action) => {
    const tenant = action.payload?.tenant ?? null;
    return {
      ...state,
      isAuthenticated: true,
      isLoading: false,
      errorMessage: null,
      user: action.payload?.user ?? null,
      tenant,
      activeTenant: tenant,
      accessToken: action.payload?.accessToken ?? null,
    };
  },

  LOGOUT: (state) => ({
    ...state,
    isAuthenticated: false,
    isLoading: false,
    errorMessage: null,
    user: null,
    tenant: null,
    activeTenant: null,
    accessToken: null,
  }),

  /**
   * Switch the active tenant — called by `switchTenant(tenantId)`. Updates
   * `activeTenant`, mirrors it to `tenant` (alias for legacy callers), and
   * refreshes `user.role` from the new tenant's role so any consumer that
   * reads `user.role` (RoleGuard, useCanAccess, navbar filters, …) sees
   * the new role without a separate lookup.
   */
  SWITCH_TENANT: (state, action) => {
    const tenant = action.payload?.tenant ?? null;
    const prevUser = action.payload?.user ?? state.user;
    const user: User | null = prevUser
      ? { ...prevUser, role: tenant?.role ?? prevUser.role }
      : null;
    return {
      ...state,
      tenant,
      activeTenant: tenant,
      user,
    };
  },

  CLEAR_ERROR: (state) => ({
    ...state,
    errorMessage: null,
  }),
};

// Reducer function
const reducer = (
  state: AuthContextType,
  action: AuthAction,
): AuthContextType => {
  const handler = reducerHandlers[action.type];
  return handler ? handler(state, action) : state;
};

// ----------------------------------------------------------------------

/** Extract a human-readable error message from a rejected authApi promise. */
function errMsg(err: unknown, fallback: string): string {
  const e = err as Partial<AuthApiError>;
  if (typeof e?.message === "string" && e.message.length > 0) return e.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Persist the session to localStorage so the next page load can rehydrate.
 *
 * `memberships` live on the `user` object (so they're saved as part of the
 * USER_KEY blob) — no separate key is needed. The active `tenant` is saved
 * under TENANT_KEY so we can restore it on rehydration even if the user has
 * multiple memberships and chose to start in a non-default one.
 */
function persistSession(opts: {
  accessToken: string;
  refreshToken?: string;
  user: User;
  tenant?: AuthTenant | null;
}): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, opts.accessToken);
  if (opts.refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, opts.refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  // The user object now carries `role` + `memberships[]` — both are
  // persisted by serialising the whole user blob.
  window.localStorage.setItem(USER_KEY, JSON.stringify(opts.user));
  if (opts.tenant) {
    window.localStorage.setItem(TENANT_KEY, JSON.stringify(opts.tenant));
  } else {
    window.localStorage.removeItem(TENANT_KEY);
  }
  // Mirror the token into the default axios instance's Authorization header
  // (matches the old `setSession` contract; lmsAxios reads from localStorage
  // via its own interceptor so this is mostly cosmetic).
  setSession(opts.accessToken);
}

/** Wipe everything we persisted. */
function clearPersistedSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(TENANT_KEY);
  setSession(null);
}

/** Read the persisted user (if any) without throwing. */
function readPersistedUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function readPersistedTenant(): AuthTenant | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TENANT_KEY);
    return raw ? (JSON.parse(raw) as AuthTenant) : null;
  } catch {
    return null;
  }
}

/**
 * On rehydration, the persisted user may have been saved by an older
 * build that didn't track `role` / `memberships`. Re-derive them from the
 * persisted tenant so the rest of the app sees a fully-populated user.
 */
function reconcileUserWithTenant(
  user: User | null,
  tenant: AuthTenant | null,
): User | null {
  if (!user) return null;
  // If the user already has memberships (saved by the new build), keep
  // them — but make sure the active tenant is in the list so switchTenant
  // can find it.
  const memberships: AuthTenant[] = Array.isArray(user.memberships)
    ? user.memberships.slice()
    : [];

  if (tenant) {
    const idx = memberships.findIndex((m) => m.id === tenant.id);
    if (idx === -1) {
      memberships.push(tenant);
    } else {
      // Replace with the persisted tenant — its role/isRoot may have been
      // updated since the user last logged in.
      memberships[idx] = tenant;
    }
  }

  return {
    ...user,
    role: tenant?.role ?? user.role ?? "student",
    memberships,
  };
}

// ----------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // On mount, try to rehydrate the session from localStorage. If the token
  // is missing or expired, clear everything so the user is treated as
  // anonymous (the AuthGuard will bounce them to /login on the next
  // navigation).
  useEffect(() => {
    const init = async () => {
      try {
        const accessToken =
          (typeof window !== "undefined" &&
            window.localStorage.getItem(ACCESS_TOKEN_KEY)) ||
          null;

        if (accessToken && isTokenValid(accessToken)) {
          // Re-use the persisted token on the default axios instance so any
          // legacy callers still see the Authorization header.
          setSession(accessToken);

          const persistedUser = readPersistedUser();
          const persistedTenant = readPersistedTenant();
          // Reconcile user.role + memberships with the persisted tenant —
          // handles both new builds (user already has memberships) and
          // older builds (user has only {id,name,email}).
          const user = reconcileUserWithTenant(persistedUser, persistedTenant);

          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: true,
              accessToken,
              user,
              tenant: persistedTenant,
            },
          });
        } else {
          // Stale or missing token — clean up so the next request doesn't
          // send a bad Authorization header.
          clearPersistedSession();
          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: false,
              accessToken: null,
              user: null,
              tenant: null,
            },
          });
        }
      } catch (err) {
        console.error("Auth init failed:", err);
        clearPersistedSession();
        dispatch({
          type: "INITIALIZE",
          payload: {
            isAuthenticated: false,
            accessToken: null,
            user: null,
            tenant: null,
          },
        });
      }
    };

    init();
  }, []);

  // Email + password login → POST /api/auth/login.
  const login = async (credentials: { email: string; password: string }) => {
    dispatch({ type: "LOGIN_REQUEST" });
    try {
      const res = await authApi.login(credentials);

      // MFA challenge required — the backend returned a ticket instead of
      // a token. Surface a friendly message and let the LoginPage redirect
      // to /mfa-verify (it watches `errorMessage` AND a ticket can be
      // stashed in sessionStorage).
      if (!res.accessToken && (res.ticket || res.mfaTicket)) {
        const ticket = res.ticket ?? res.mfaTicket ?? "";
        if (typeof window !== "undefined" && ticket) {
          window.sessionStorage.setItem("mfaTicket", ticket);
        }
        dispatch({
          type: "LOGIN_ERROR",
          payload: {
            errorMessage: "MFA verification required.",
          },
        });
        // Throwing here lets the caller (LoginPage) know to navigate.
        throw new Error("MFA_REQUIRED");
      }

      if (!res.accessToken) {
        throw new Error("Server did not return an access token.");
      }

      // The normaliser always returns `memberships` (possibly empty) and
      // an `activeTenant` (first membership or null). Store the full user
      // (with memberships + role) and the active tenant so role-based
      // guards, navigation filters, and tenant switchers all see the same
      // data.
      const memberships: AuthTenant[] = res.memberships ?? res.user.memberships ?? [];
      const tenant: AuthTenant | null = res.tenant ?? memberships[0] ?? null;

      const user: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: tenant?.role ?? res.user.role ?? "student",
        memberships,
      };

      persistSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user,
        tenant,
      });

      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { accessToken: res.accessToken, user, tenant },
      });
    } catch (err) {
      // Don't overwrite the MFA message we just set.
      if (err instanceof Error && err.message === "MFA_REQUIRED") {
        throw err;
      }
      dispatch({
        type: "LOGIN_ERROR",
        payload: {
          errorMessage: errMsg(err, "Login failed. Please try again."),
        },
      });
      throw err;
    }
  };

  // School signup → POST /api/auth/school-signup. Creates a tenant + the
  // first user (the school owner), returns JWT + tenant.
  const signup = async (input: SignupInput) => {
    dispatch({ type: "SIGNUP_REQUEST" });
    try {
      const res = await authApi.schoolSignup(input);

      if (!res.accessToken) {
        // The backend may require email verification before issuing a token.
        // In that case, surface a friendly message and let the caller decide
        // where to navigate.
        if (res.requiresEmailVerification) {
          throw new Error("EMAIL_VERIFICATION_REQUIRED");
        }
        throw new Error("Server did not return an access token.");
      }

      // Signup always creates the owner role on the freshly-created tenant.
      // The normaliser already builds a single membership from `raw.tenant`
      // for us.
      const memberships: AuthTenant[] = res.memberships ?? res.user.memberships ?? [];
      const tenant: AuthTenant | null = res.tenant ?? memberships[0] ?? null;

      const user: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: tenant?.role ?? res.user.role ?? "owner",
        memberships,
      };

      persistSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user,
        tenant,
      });

      dispatch({
        type: "SIGNUP_SUCCESS",
        payload: { accessToken: res.accessToken, user, tenant },
      });
    } catch (err) {
      // Re-throw the sentinel so the caller can route to a verification page.
      if (err instanceof Error && err.message === "EMAIL_VERIFICATION_REQUIRED") {
        throw err;
      }
      // The signup page keeps its own local `serverError` state, so we don't
      // pollute the shared `errorMessage` field — but we DO flip isLoading
      // back off by dispatching a LOGIN_ERROR with an empty message.
      dispatch({
        type: "LOGIN_ERROR",
        payload: { errorMessage: null },
      });
      throw err;
    }
  };

  /**
   * Switch the active tenant to one of the user's memberships.
   *
   * Updates `activeTenant` + `tenant` (alias), refreshes `user.role` from
   * the new tenant's role, and re-persists the session so a page reload
   * keeps the same active tenant. Silently no-ops when the tenant isn't in
   * the user's memberships (the user may have been removed from it since
   * they last loaded the membership list — we don't want to crash the UI
   * in that case).
   */
  const switchTenant = (tenantId: string) => {
    const next =
      state.user?.memberships?.find((m) => m.id === tenantId) ?? null;
    if (!next) {
      // Unknown tenant — log and bail out so callers can detect the no-op.
      if (typeof console !== "undefined") {
        console.warn(
          `[auth] switchTenant: tenant ${tenantId} not in user.memberships`,
        );
      }
      return;
    }
    const user: User | null = state.user
      ? { ...state.user, role: next.role }
      : null;

    persistSession({
      accessToken: state.accessToken ?? "",
      refreshToken:
        (typeof window !== "undefined" &&
          window.localStorage.getItem(REFRESH_TOKEN_KEY)) ||
        undefined,
      user: user ?? ({} as User),
      tenant: next,
    });

    dispatch({ type: "SWITCH_TENANT", payload: { tenant: next, user } });
  };

  const logout = async () => {
    clearPersistedSession();
    dispatch({ type: "LOGOUT" });
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  if (!children) {
    return null;
  }

  return (
    <AuthContext
      value={{
        ...state,
        login,
        signup,
        logout,
        switchTenant,
        clearError,
      }}
    >
      {children}
    </AuthContext>
  );
}
