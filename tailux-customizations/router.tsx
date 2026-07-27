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
 * Combines protected, ghost, and public routes under a common root
 */
const router = createBrowserRouter(
  [
    {
      id: "root",
      Component: Root,
      hydrateFallbackElement: <SplashScreen />,
      ErrorBoundary: RootErrorBoundary,
      children: [protectedRoutes, ghostRoutes, publicRoutes] as RouteObject[],
    },
  ],
  getBasename() ? { basename: getBasename()! } : undefined,
);

export default router;
