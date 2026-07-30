// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

/**
 * Role-based access hooks — thin wrappers over the auth context for
 * declarative use inside components (button visibility, menu filtering,
 * feature gating). For route-level protection use `<RoleGuard />`
 * instead — these hooks are for inline checks inside an
 * already-rendered page.
 */

/**
 * Returns `true` when the active-tenant role is in `allowedRoles`.
 *
 * @example
 * const canManageUsers = useCanAccess(["owner","admin"]);
 * return canManageUsers ? <ManageUsersButton/> : null;
 */
export function useCanAccess(allowedRoles: string[]): boolean {
  const { user } = useAuthContext();
  const userRole = user?.role || "student";
  return allowedRoles.includes(userRole);
}

/**
 * Returns the active-tenant role (defaults to `"student"` when the user
 * isn't loaded yet — matches the normalizer's default).
 *
 * @example
 * const role = useUserRole();
 * return role === "owner" ? <OwnerBadge/> : null;
 */
export function useUserRole(): string {
  const { user } = useAuthContext();
  return user?.role || "student";
}

/**
 * Returns `true` when the active tenant is the platform-level root tenant
 * (the lastsaas operator's tenant — has super-admin powers across all
 * tenants). Useful for showing platform-level admin entries in the
 * sidebar that shouldn't be visible to ordinary school owners.
 *
 * @example
 * const isRoot = useIsRootTenant();
 * return isRoot ? <PlatformAdminLink/> : null;
 */
export function useIsRootTenant(): boolean {
  const { tenant } = useAuthContext();
  return Boolean(tenant?.isRoot);
}
