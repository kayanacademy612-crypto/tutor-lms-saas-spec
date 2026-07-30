import { RouteObject } from "react-router";
import GhostGuard from "@/middleware/GhostGuard";

/**
 * Ghost routes configuration
 * These routes are accessible only for non-authenticated users
 * Used for authentication pages like login, signup, etc.
 */
const ghostRoutes: RouteObject = {
  id: "ghost",
  Component: GhostGuard,
  children: [
    {
      path: "login",
      lazy: async () => ({
        Component: (await import("@/app/pages/Auth")).default,
      }),
    },
    {
      path: "signup",
      lazy: async () => ({
        Component: (await import("@/app/pages/auth/SignupPage")).default,
      }),
    },
    {
      path: "mfa-verify",
      lazy: async () => ({
        Component: (await import("@/app/pages/auth/MFAVerifyPage")).default,
      }),
    },
    {
      path: "forgot-password",
      lazy: async () => ({
        Component: (await import("@/app/pages/auth/ForgotPasswordPage"))
          .default,
      }),
    },
    {
      path: "reset-password",
      lazy: async () => ({
        Component: (await import("@/app/pages/auth/ResetPasswordPage"))
          .default,
      }),
    },
    // OAuth callback is also reachable for not-yet-authenticated users
    // completing a social sign-in flow.
    {
      path: "oauth/callback",
      lazy: async () => ({
        Component: (await import("@/app/pages/auth/OAuthCallbackPage"))
          .default,
      }),
    },
    // Add additional ghost routes as needed
  ],
};

export { ghostRoutes };
