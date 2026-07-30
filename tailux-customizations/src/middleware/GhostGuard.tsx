// Import Dependencies
import { Navigate, useOutlet } from "react-router";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import { REDIRECT_URL_KEY } from "@/constants/app";
import { getHomePathForRole } from "@/utils/roleRedirect";

// ----------------------------------------------------------------------

/**
 * Ghost routes (login, signup, mfa-verify, …) are only reachable for
 * not-yet-authenticated users. When an authenticated user lands on a
 * ghost route (e.g. they typed `/login` while already signed in), we
 * redirect them away.
 *
 * The redirect target is:
 *  1. The `?redirect=` URL when present (so a deep link to a protected
 *     page still works after login).
 *  2. `getHomePathForRole(user.role)` — the role-aware dashboard
 *     (reports for owner/admin, instructor dashboard for instructors,
 *     student dashboard for students). Replaces the old hardcoded
 *     `HOME_PATH` (`/`) which always bounced through a default
 *     dashboard redirect.
 *  3. `HOME_PATH` (`/`) as a final fallback when the user's role isn't
 *     loaded yet (the Provider's initial state has `user === null` so
 *     `user?.role` is undefined — `getHomePathForRole` returns the
 *     student dashboard in that case, but we keep the explicit fallback
 *     for readability).
 */
export default function GhostGuard() {
  const outlet = useOutlet();
  const { isAuthenticated, user } = useAuthContext();

  const url = new URLSearchParams(window.location.search).get(
    REDIRECT_URL_KEY,
  );

  if (isAuthenticated) {
    if (url && url !== "" && url !== "null") {
      return <Navigate to={url} />;
    }
    return <Navigate to={getHomePathForRole(user?.role)} />;
  }

  return <>{outlet}</>;
}
