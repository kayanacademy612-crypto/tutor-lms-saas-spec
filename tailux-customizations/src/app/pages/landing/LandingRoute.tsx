// Landing route wrapper.
//
// Decides what to render at the `/` URL based on auth state:
//   - Authenticated   → redirect to the user's role-specific dashboard
//                      (student → /apps/student-dashboard,
//                       instructor → /apps/instructor-dashboard,
//                       admin/owner → /apps/reports-dashboard).
//   - Not authenticated → render the marketing landing page
//
// This keeps the LandingPage component (./index.tsx) pure UI while the
// auth-aware redirect lives here. Mirrors the AuthGuard / GhostGuard
// pattern used elsewhere in the router.
//
// NOTE: We redirect to the specific dashboard URL (NOT `/`) because `/` is
// the landing route itself — redirecting to `/` would cause an infinite
// loop. The protected root's RoleHomeRedirect (see `protected.tsx`) is
// only reached when the user navigates directly to a protected route
// without a more-specific path.

// Import Dependencies
import { Navigate } from "react-router";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import { SplashScreen } from "@/components/template/SplashScreen";
import LandingPage from "./index";

// ----------------------------------------------------------------------

function roleDashboardPath(role: string | undefined): string {
  switch (role) {
    case "instructor":
      return "/apps/instructor-dashboard";
    case "admin":
    case "owner":
      return "/apps/reports-dashboard";
    case "student":
    default:
      return "/apps/student-dashboard";
  }
}

export default function LandingRoute() {
  const { isAuthenticated, isInitialized, user } = useAuthContext();

  // While the auth session is still being restored (e.g. from localStorage
  // on first paint), show the splash screen instead of flashing the
  // marketing page before a redirect.
  if (!isInitialized) {
    return <SplashScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to={roleDashboardPath(user?.role)} replace />;
  }

  return <LandingPage />;
}
