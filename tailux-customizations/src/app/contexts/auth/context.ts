import { createSafeContext } from "@/utils/createSafeContext";

/**
 * A tenant the user belongs to (a school / workspace). A user may belong to
 * multiple tenants — e.g. they teach at one school and study at another.
 *
 * `role` is the user's role WITHIN this tenant (owner | admin | instructor |
 * student). `isRoot` marks the platform-level root tenant (the lastsaas
 * operator's tenant) which has super-admin powers across all tenants.
 */
export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  role: string; // owner | admin | instructor | student
  isRoot?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  /** Active tenant role — kept in sync with `activeTenant.role`. */
  role?: string; // active tenant role
  avatarUrl?: string;
  /** All tenants the user belongs to (login returns this; signup builds one). */
  memberships?: AuthTenant[];
}

export interface SignupInput {
  schoolName: string;
  fullName: string;
  email: string;
  password: string;
  /** Optional subdomain; the backend derives one from `schoolName` when omitted. */
  subdomain?: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  errorMessage: string | null;
  user: User | null;
  /**
   * The tenant the user is currently acting in. Kept as an alias of
   * `activeTenant` for backward-compat with older callers (useIsRootTenant
   * hook, profile widgets, etc).
   */
  tenant: AuthTenant | null;
  /** The tenant the user is currently acting in (new field — prefer this). */
  activeTenant: AuthTenant | null;
  accessToken: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Switch the active tenant (updates `activeTenant`, `tenant`, and `user.role`). */
  switchTenant: (tenantId: string) => void;
  clearError: () => void;
}

export const [AuthProvider, useAuthContext] =
  createSafeContext<AuthContextType>(
    "useAuthContext must be used within AuthProvider",
  );
