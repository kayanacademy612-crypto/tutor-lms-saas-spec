import { Navigate, RouteObject } from "react-router";

import AuthGuard from "@/middleware/AuthGuard";
import { DynamicLayout } from "../layouts/DynamicLayout";
import { AppLayout } from "../layouts/AppLayout";
import { useAuthContext } from "@/app/contexts/auth/context";
import { HOME_PATH } from "@/constants/app";

/**
 * Role-aware home redirect.
 *
 * Mounted at the protected root (`/`). Reads the current user's role from the
 * auth context and bounces them to their default landing page:
 *
 *   - student     → /apps/student-dashboard
 *   - instructor  → /apps/instructor-dashboard
 *   - admin/owner → /apps/reports-dashboard
 *
 * Falls back to the student dashboard for unknown roles so the user always
 * lands somewhere sensible.
 */
function RoleHomeRedirect() {
  const { user } = useAuthContext();
  const role = user?.role || "student";

  const target =
    role === "instructor"
      ? "/apps/instructor-dashboard"
      : role === "admin" || role === "owner"
        ? "/apps/reports-dashboard"
        : "/apps/student-dashboard";

  return <Navigate to={target} replace />;
}

/**
 * Protected routes configuration
 * These routes require authentication to access
 * Uses AuthGuard middleware to verify user authentication
 *
 * NOTE: This file previously hosted dozens of demo routes (nft, pos, travel,
 * chat, ai-chat, mail, todo, kanban, filemanager, the entire `/dashboards/*`,
 * `/components/*`, `/forms/*`, `/tables/*`, `/prototypes/*`, and `/Docs/*`
 * trees). Those demos were removed during the LMS cleanup — only the LMS
 * app routes + the role-aware home redirect + the account Settings shell
 * remain. Do NOT re-add demo routes here.
 */
const protectedRoutes: RouteObject = {
  id: "protected",
  Component: AuthGuard,
  children: [
    // The dynamic layout supports both the main layout and the sideblock.
    {
      Component: DynamicLayout,
      children: [
        {
          index: true,
          element: <RoleHomeRedirect />,
        },
        // Catch-all for unknown paths under the protected root — send the
        // user back to their role-specific dashboard instead of showing a
        // blank DynamicLayout page. The real 404 lives under the ghost
        // routes (see `src/app/router/ghost.tsx`).
        { path: "*", element: <Navigate to={HOME_PATH} replace /> },
      ],
    },
    // The app layout supports only the main layout. Avoid using it for other layouts.
    {
      Component: AppLayout,
      children: [
        {
          path: "apps",
          children: [
            // ------------------------------------------------------------------
            // Courses / authoring
            // ------------------------------------------------------------------
            {
              path: "course-builder",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/course-builder"))
                  .default,
              }),
            },
            {
              path: "quiz-builder",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/quiz-builder"))
                  .default,
              }),
            },

            // ------------------------------------------------------------------
            // Student-facing
            // ------------------------------------------------------------------
            {
              path: "student-dashboard",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/student-dashboard"))
                  .default,
              }),
            },
            {
              path: "learning-area",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/learning-area"))
                  .default,
              }),
            },
            {
              // Course-scoped deep link used by "Continue Learning" buttons on
              // the student dashboard. The LearningArea component accepts an
              // optional `courseId` prop; today it falls back to its built-in
              // mock course, but this route exists so the URL pattern
              // (`/apps/learning-area/{courseId}`) resolves cleanly instead of
              // hitting the protected-root catch-all.
              path: "learning-area/:courseId",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/learning-area"))
                  .default,
              }),
            },
            {
              path: "gamification",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/gamification"))
                  .default,
              }),
            },
            {
              path: "subscriptions",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/subscriptions"))
                  .default,
              }),
            },
            {
              path: "subscriptions/:id",
              lazy: async () => ({
                Component: (
                  await import(
                    "@/app/pages/apps/subscriptions/SubscriptionDetailPage"
                  )
                ).default,
              }),
            },

            // ------------------------------------------------------------------
            // Catalog / checkout
            // ------------------------------------------------------------------
            {
              path: "catalog",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/catalog")).default,
              }),
            },
            {
              path: "course-detail",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/catalog/CourseDetailPage")
                ).default,
              }),
            },
            {
              path: "checkout",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/catalog/CheckoutPage")
                ).default,
              }),
            },

            // ------------------------------------------------------------------
            // Instructor / teaching
            // ------------------------------------------------------------------
            {
              path: "instructor-dashboard",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/instructor-dashboard")
                ).default,
              }),
            },
            {
              path: "assignment-grading",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/assignment-grading")
                ).default,
              }),
            },
            {
              path: "multi-instructor",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/multi-instructor"))
                  .default,
              }),
            },
            {
              path: "drip-manager",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/drip-manager"))
                  .default,
              }),
            },
            {
              path: "prerequisite-manager",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/prerequisite-manager")
                ).default,
              }),
            },
            {
              path: "tutor-ai",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/tutor-ai")).default,
              }),
            },

            // ------------------------------------------------------------------
            // Certificates
            // ------------------------------------------------------------------
            {
              path: "certificate-builder",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/certificate-builder")
                ).default,
              }),
            },
            {
              path: "certificate-builder/verify",
              lazy: async () => ({
                Component: (
                  await import(
                    "@/app/pages/apps/certificate-builder/CertificateVerify"
                  )
                ).default,
              }),
            },

            // ------------------------------------------------------------------
            // eCommerce (admin/owner)
            // ------------------------------------------------------------------
            {
              path: "ecommerce",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/ecommerce")).default,
              }),
            },
            {
              path: "orders-admin",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/orders-admin"))
                  .default,
              }),
            },
            {
              path: "orders-admin/:id",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/orders-admin/OrderDetailPage")
                ).default,
              }),
            },
            {
              path: "payouts-admin",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/payouts-admin"))
                  .default,
              }),
            },
            {
              path: "payouts-admin/:id",
              lazy: async () => ({
                Component: (
                  await import(
                    "@/app/pages/apps/payouts-admin/WithdrawalDetailPage"
                  )
                ).default,
              }),
            },
            {
              path: "storefront",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/storefront")).default,
              }),
            },
            {
              path: "bundles",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/bundles")).default,
              }),
            },
            {
              path: "bundles/:id",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/bundles/BundleDetailPage")
                ).default,
              }),
            },
            {
              path: "memberships",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/memberships"))
                  .default,
              }),
            },
            {
              path: "memberships/checkout/:planId",
              lazy: async () => ({
                Component: (
                  await import(
                    "@/app/pages/apps/memberships/MembershipCheckoutPage"
                  )
                ).default,
              }),
            },
            {
              path: "memberships/admin",
              lazy: async () => ({
                Component: (
                  await import(
                    "@/app/pages/apps/memberships/MembershipAdminPage"
                  )
                ).default,
              }),
            },
            {
              path: "gift-course",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/gift-course"))
                  .default,
              }),
            },
            {
              path: "gift-course/redeem",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/gift-course/GiftRedeemPage")
                ).default,
              }),
            },
            {
              path: "gift-course/sent",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/gift-course/GiftSentPage")
                ).default,
              }),
            },

            // ------------------------------------------------------------------
            // Reports
            // ------------------------------------------------------------------
            {
              path: "reports-dashboard",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/reports-dashboard")
                ).default,
              }),
            },
            {
              path: "school-dashboard",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/school-dashboard")
                ).default,
              }),
            },

            // ------------------------------------------------------------------
            // LMS Settings (admin/owner)
            // ------------------------------------------------------------------
            {
              path: "settings-pages",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/settings-pages"))
                  .default,
              }),
            },
            {
              path: "payment-settings",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/payment-settings")
                ).default,
              }),
            },
            {
              path: "ecommerce-settings",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/ecommerce-settings")
                ).default,
              }),
            },
            {
              path: "notification-settings",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/notification-settings")
                ).default,
              }),
            },
            {
              path: "accessibility-settings",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/accessibility-settings")
                ).default,
              }),
            },
            {
              path: "email-template-editor",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/email-template-editor")
                ).default,
              }),
            },
            {
              path: "legal-consents",
              lazy: async () => ({
                Component: (await import("@/app/pages/apps/legal-consents"))
                  .default,
              }),
            },

            // ------------------------------------------------------------------
            // Migration Wizard
            // ------------------------------------------------------------------
            {
              path: "migration-wizard",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/apps/migration-wizard")
                ).default,
              }),
            },
          ],
        },
        {
          path: "settings",
          lazy: async () => ({
            Component: (await import("@/app/pages/settings/Layout")).default,
          }),
          children: [
            {
              index: true,
              element: <Navigate to="/settings/general" />,
            },
            {
              path: "general",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/General")
                ).default,
              }),
            },
            {
              path: "appearance",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/Appearance")
                ).default,
              }),
            },
            {
              path: "notifications",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/Notifications")
                ).default,
              }),
            },
            {
              path: "applications",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/Applications")
                ).default,
              }),
            },
            {
              path: "sessions",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/Sessions")
                ).default,
              }),
            },
            {
              path: "billing",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/settings/sections/Billing")
                ).default,
              }),
            },
          ],
        },
        // ------------------------------------------------------------------
        // Platform Admin (root tenant owner only)
        // ------------------------------------------------------------------
        // The layout component (`src/app/pages/admin/index.tsx`) wraps its
        // entire subtree in `<RoleGuard allowedRoles={["owner"]}>` and renders
        // the admin sidebar + top header. Child routes mount via `<Outlet />`.
        {
          path: "admin",
          lazy: async () => ({
            Component: (await import("@/app/pages/admin")).default,
          }),
          children: [
            {
              index: true,
              element: <Navigate to="/admin/dashboard" />,
            },
            {
              path: "dashboard",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/admin/DashboardPage")
                ).default,
              }),
            },
            {
              path: "tenants",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/TenantsPage"))
                  .default,
              }),
            },
            {
              path: "tenants/:id",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/admin/TenantDetailPage")
                ).default,
              }),
            },
            {
              path: "users",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/UsersPage"))
                  .default,
              }),
            },
            {
              path: "users/:id",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/admin/UserDetailPage")
                ).default,
              }),
            },
            {
              path: "plans",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/PlansPage"))
                  .default,
              }),
            },
            {
              path: "financial",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/FinancialPage"))
                  .default,
              }),
            },
            {
              path: "health",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/HealthPage"))
                  .default,
              }),
            },
            {
              path: "logs",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/LogsPage"))
                  .default,
              }),
            },
            {
              path: "branding",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/BrandingPage"))
                  .default,
              }),
            },
            {
              path: "api-keys",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/APIKeysPage"))
                  .default,
              }),
            },
            {
              path: "announcements",
              lazy: async () => ({
                Component: (
                  await import("@/app/pages/admin/AnnouncementsPage")
                ).default,
              }),
            },
            {
              path: "config",
              lazy: async () => ({
                Component: (await import("@/app/pages/admin/ConfigPage"))
                  .default,
              }),
            },
          ],
        },
      ],
    },
  ],
};

export { protectedRoutes };
