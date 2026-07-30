import { User } from "@/@types/user";
import { createSafeContext } from "@/utils/createSafeContext";

/**
 * The tenant the user is currently acting in. A user may belong to multiple
 * tenants (e.g. they teach at one school and study at another); the auth flow
 * only knows about the one returned at signup/login time. Tenant switching is
 * a separate concern handled elsewhere.
 */
export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
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
  tenant: AuthTenant | null;
  accessToken: string | null;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const [AuthProvider, useAuthContext] =
  createSafeContext<AuthContextType>(
    "useAuthContext must be used within AuthProvider",
  );
