// Import Dependencies
import { createBrowserRouter, RouteObject } from "react-router";

// Local Imports
import Root from "@/app/layouts/Root";
import RootErrorBoundary from "@/app/pages/errors/RootErrorBoundary";
import { SplashScreen } from "@/components/template/SplashScreen";
import { protectedRoutes } from "./protected";
import { ghostRoutes } from "./ghost";
import { publicRoutes } from "./public";

/**
 * When this app is reverse-proxied through Next.js at /api/tailux/*,
 * we need to set the router basename so it sees /apps/course-builder
 * instead of /api/tailux/apps/course-builder.
 *
 * Detection: if window.location.pathname starts with /api/tailux/,
 * we use that prefix as the basename.
 */
function getBasename(): string | undefined {
  if (typeof window !== "undefined") {
    const path = window.location.pathname;
    if (path.startsWith("/api/tailux/")) {
      return "/api/tailux";
    }
  }
  return undefined;
}

/**
 * Main application router configuration
 * Combines protected, ghost, and public routes under a common root.
 *
 * Order matters: `publicRoutes` is intentionally listed FIRST so that
 * its `index` route (the marketing landing page at `/`) wins over the
 * AuthGuard-wrapped protected branch, which would otherwise bounce
 * not-authenticated visitors to /login before the landing page could
 * render. The landing page itself redirects to / (which the protected
 * root's RoleHomeRedirect turns into the role-specific dashboard) when
 * the user is already authenticated.
 */
const router = createBrowserRouter(
  [
    {
      id: "root",
      Component: Root,
      hydrateFallbackElement: <SplashScreen />,
      ErrorBoundary: RootErrorBoundary,
      children: [publicRoutes, ghostRoutes, protectedRoutes] as RouteObject[],
    },
  ],
  getBasename() ? { basename: getBasename()! } : undefined,
);

export default router;
