// Import Dependencies
import { Navigate, useLocation } from "react-router";
import { ReactNode } from "react";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

interface RoleGuardProps {
  /** Roles permitted to pass through. Any role not in this list is bounced to /403. */
  allowedRoles: string[];
  children: ReactNode;
}

/**
 * Role-based route protection.
 *
 * Wrap a route element with `<RoleGuard allowedRoles={["owner","admin"]}>`
 * to prevent users whose active-tenant role isn't in the list from viewing
 * the page. The guard reads `user.role` from the auth context (which is
 * kept in sync with `activeTenant.role` by the Provider and `switchTenant`).
 *
 * When the user's role isn't allowed, the guard redirects to `/403` with
 * `state.from` set to the current location so the 403 page can offer a
 * "go back" link. The default fallback role is `student` (matches the
 * normalizer's default) so a not-yet-logged-in-but-mounted guard doesn't
 * accidentally grant admin access.
 *
 * Pair with `useCanAccess` for inline checks (button visibility, menu
 * filtering) inside an already-rendered page.
 */
export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const { user } = useAuthContext();
  const location = useLocation();

  const userRole = user?.role || "student";

  if (!allowedRoles.includes(userRole)) {
    return (
      <Navigate to="/403" replace state={{ from: location }} />
    );
  }

  return <>{children}</>;
}
