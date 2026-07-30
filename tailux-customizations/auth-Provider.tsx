// Import Dependencies
import { useEffect, useReducer, ReactNode } from "react";

// Local Imports
import { authApi, AuthApiError } from "@/services/auth-api";
import { isTokenValid, setSession } from "@/utils/jwt";
import { AuthProvider as AuthContext, AuthContextType, AuthTenant, SignupInput } from "./context";
import { User } from "@/@types/user";

// ----------------------------------------------------------------------

/**
 * localStorage keys. The access token lives under `authToken` (kept for
 * backward-compat with `src/utils/jwt.ts#setSession` and `lmsAxios`'s
 * request interceptor in `src/services/lms-api.ts`). The refresh token,
 * user, and tenant are persisted under separate keys so the app can
 * rehydrate its session on next page load without an extra round-trip
 * to the backend (the lastsaas auth API does not expose a `/me`
 * endpoint yet — see Agent AUTH-1's spec).
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
  accessToken: null,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
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
    accessToken: action.payload?.accessToken ?? null,
  }),

  LOGIN_REQUEST: (state) => ({
    ...state,
    isLoading: true,
    errorMessage: null,
  }),

  LOGIN_SUCCESS: (state, action) => ({
    ...state,
    isAuthenticated: true,
    isLoading: false,
    errorMessage: null,
    user: action.payload?.user ?? null,
    tenant: action.payload?.tenant ?? state.tenant,
    accessToken: action.payload?.accessToken ?? null,
  }),

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

  SIGNUP_SUCCESS: (state, action) => ({
    ...state,
    isAuthenticated: true,
    isLoading: false,
    errorMessage: null,
    user: action.payload?.user ?? null,
    tenant: action.payload?.tenant ?? null,
    accessToken: action.payload?.accessToken ?? null,
  }),

  LOGOUT: (state) => ({
    ...state,
    isAuthenticated: false,
    isLoading: false,
    errorMessage: null,
    user: null,
    tenant: null,
    accessToken: null,
  }),

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

/** Persist the session to localStorage so the next page load can rehydrate. */
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

/** Read the persisted user/tenant (if any) without throwing. */
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

          const user = readPersistedUser();
          const tenant = readPersistedTenant();

          dispatch({
            type: "INITIALIZE",
            payload: {
              isAuthenticated: true,
              accessToken,
              user,
              tenant,
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

      const user: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
      };
      const tenant: AuthTenant | null = res.tenant
        ? {
            id: res.tenant.id,
            name: res.tenant.name,
            slug: res.tenant.slug,
          }
        : null;

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

      const user: User = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
      };
      const tenant: AuthTenant | null = res.tenant
        ? {
            id: res.tenant.id,
            name: res.tenant.name,
            slug: res.tenant.slug,
          }
        : null;

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
        clearError,
      }}
    >
      {children}
    </AuthContext>
  );
}
