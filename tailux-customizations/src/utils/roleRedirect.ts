// ----------------------------------------------------------------------

/**
 * Role-aware post-login redirect.
 *
 * The auth flow used to send every user to `/` after login, which then
 * bounced them to the default dashboard. With role tracking in place we
 * can route them straight to the dashboard that's relevant for their
 * active-tenant role:
 *
 *  - `owner` / `admin` → reports dashboard (school-wide metrics)
 *  - `instructor` → instructor dashboard (course management)
 *  - `student` / unknown → student dashboard (course consumption)
 *
 * The fallback for any unknown role is the student dashboard — matches
 * the normalizer's default role of `student` so a not-yet-loaded user
 * lands somewhere sensible.
 */

/**
 * Returns the dashboard path for the given role.
 *
 * @example
 * const dest = getHomePathForRole(user.role);
 * navigate(dest, { replace: true });
 */
export function getHomePathForRole(role: string | undefined): string {
  switch (role) {
    case "owner":
    case "admin":
      return "/apps/reports-dashboard";
    case "instructor":
      return "/apps/instructor-dashboard";
    case "student":
    default:
      return "/apps/student-dashboard";
  }
}
