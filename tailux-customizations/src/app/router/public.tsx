import { RouteObject } from "react-router";

/**
 * Public routes configuration
 * These routes are accessible without authentication
 * Includes the marketing landing page (served at `/`), the public
 * certificate verifier, error pages, and other public content.
 *
 * NOTE: This route block is intentionally listed FIRST in the Root
 * router's children (see router.tsx) so that the landing page's
 * `index` route wins for the `/` URL over the AuthGuard-wrapped
 * protected branch (which would otherwise bounce not-authenticated
 * visitors to /login before the landing page could render).
 *
 * NOTE: The old `/prototypes/errors/*` and `/prototypes/sign-in-*` /
 * `/prototypes/sign-up-*` demo routes were removed during the LMS cleanup —
 * the prototypes directory was deleted. The real error pages live under
 * `src/app/pages/errors/*` and the real auth pages live under
 * `src/app/pages/auth/*` (registered in `ghost.tsx`).
 */
const publicRoutes: RouteObject = {
  id: "public",
  children: [
    {
      // Marketing landing page at `/`.
      //
      // - Not authenticated → renders the marketing page.
      // - Authenticated     → redirects to / (which the protected root's
      //                       RoleHomeRedirect turns into the role-specific
      //                       dashboard).
      //
      // The auth check lives in `LandingRoute` (a thin wrapper around
      // the actual `LandingPage` component) so the page itself stays
      // pure UI.
      index: true,
      lazy: async () => ({
        Component: (await import("@/app/pages/landing/LandingRoute"))
          .default,
      }),
    },
    {
      // 403 Forbidden — shown when a RoleGuard rejects the user's role.
      // Registered as a public route so it's reachable regardless of auth
      // state (a session may have expired between the RoleGuard redirect
      // and the page load).
      path: "403",
      lazy: async () => ({
        Component: (await import("@/app/pages/errors/ForbiddenPage")).default,
      }),
    },
    {
      // Public certificate verification — reachable without
      // authentication so external users (employers, students) can
      // validate a certificate by its verification code. Uses the same
      // component as the in-app "Verify" tab but in standalone layout.
      path: "apps/certificate-builder/verify",
      lazy: async () => ({
        Component: (
          await import("@/app/pages/apps/certificate-builder/CertificateVerify")
        ).default,
      }),
    },
  ],
};

export { publicRoutes };
