import { NavigationTree } from "@/@types/navigation";

/**
 * Role-aware LMS navigation tree.
 *
 * The four LMS roles (matched against `user.role` from `useAuthContext`):
 *   - student     — Learns from courses; can browse catalog, view their
 *                   subscriptions / certificates / gamification profile.
 *   - instructor  — Creates & teaches courses; can build quizzes /
 *                   certificates, grade assignments, manage drip /
 *                   prerequisites, run TutorAI.
 *   - admin       — Tenant administrator; inherits instructor powers +
 *                   eCommerce + reports + LMS settings.
 *   - owner       — Tenant owner; inherits admin powers + Platform Admin
 *                   (root-tenant-only: tenants, plans, branding, etc.).
 *
 * Root segments are surfaced in the MainPanel (left icon rail) and filtered
 * by `roles`. Sub-items live in the PrimePanel (right detail panel) and are
 * also filtered by `roles` — see `Sidebar/PrimePanel/Menu/index.tsx` and
 * `Sidebar/MainPanel/index.tsx`.
 *
 * The Dashboard segment is special: it's always visible (every role sees a
 * dashboard) but the path it navigates to depends on the role. The actual
 * redirect lives in `protected.tsx` (`/` → role-specific dashboard).
 */

const ROOT_APPS = "/apps";
const ROOT_ADMIN = "/admin";

const app = (sub: string) => `${ROOT_APPS}${sub}`;
const admin = (sub: string) => `${ROOT_ADMIN}${sub}`;

// All four LMS roles — convenience const for "everyone".
const ALL_ROLES = ["student", "instructor", "admin", "owner"];
const STAFF_ROLES = ["instructor", "admin", "owner"];
const ADMIN_ROLES = ["admin", "owner"];

export const navigation: NavigationTree[] = [
  // ---------------------------------------------------------------- Dashboard
  {
    id: "dashboard",
    type: "root",
    path: "/",
    title: "Dashboard",
    transKey: "nav.dashboard.dashboard",
    icon: "dashboards",
    roles: ALL_ROLES,
    childs: [
      {
        id: "dashboard.student",
        type: "item",
        path: app("/student-dashboard"),
        title: "Student Dashboard",
        transKey: "nav.dashboard.student",
        icon: "apps.student-dashboard",
        roles: ["student"],
      },
      {
        id: "dashboard.instructor",
        type: "item",
        path: app("/instructor-dashboard"),
        title: "Instructor Dashboard",
        transKey: "nav.dashboard.instructor",
        icon: "apps.instructor-dashboard",
        roles: STAFF_ROLES,
      },
      {
        id: "dashboard.reports",
        type: "item",
        path: app("/reports-dashboard"),
        title: "Reports Dashboard",
        transKey: "nav.dashboard.reports",
        icon: "dashboards.sales",
        roles: ADMIN_ROLES,
      },
    ],
  },

  // ------------------------------------------------------------------ Courses
  {
    id: "courses",
    type: "root",
    path: app("/catalog"),
    title: "Courses",
    transKey: "nav.courses.courses",
    icon: "apps.catalog",
    roles: ALL_ROLES,
    childs: [
      {
        id: "courses.catalog",
        type: "item",
        path: app("/catalog"),
        title: "Browse Catalog",
        transKey: "nav.courses.catalog",
        icon: "apps.catalog",
        roles: ["student", "instructor"],
      },
      {
        id: "courses.my-courses",
        type: "item",
        path: app("/student-dashboard"),
        title: "My Courses",
        transKey: "nav.courses.my-courses",
        icon: "apps.student-dashboard",
        roles: ["student"],
      },
      {
        id: "courses.course-builder",
        type: "item",
        path: app("/course-builder"),
        title: "Course Builder",
        transKey: "nav.courses.course-builder",
        icon: "apps.course-builder",
        roles: STAFF_ROLES,
      },
      {
        id: "courses.quiz-builder",
        type: "item",
        path: app("/quiz-builder"),
        title: "Quiz Builder",
        transKey: "nav.courses.quiz-builder",
        icon: "apps.quiz-builder",
        roles: STAFF_ROLES,
      },
    ],
  },

  // ----------------------------------------------------------------- Learning
  {
    id: "learning",
    type: "root",
    path: app("/learning-area"),
    title: "Learning",
    transKey: "nav.learning.learning",
    icon: "apps.learning-area",
    roles: ["student"],
    childs: [
      {
        id: "learning.area",
        type: "item",
        path: app("/learning-area"),
        title: "Learning Area",
        transKey: "nav.learning.area",
        icon: "apps.learning-area",
        roles: ["student"],
      },
      {
        id: "learning.certificates",
        type: "item",
        path: app("/certificate-builder"),
        title: "My Certificates",
        transKey: "nav.learning.certificates",
        icon: "apps.certificate-builder",
        roles: ["student"],
      },
      {
        id: "learning.subscriptions",
        type: "item",
        path: app("/subscriptions"),
        title: "My Subscriptions",
        transKey: "nav.learning.subscriptions",
        icon: "apps.settings-pages",
        roles: ["student"],
      },
      {
        id: "learning.gamification",
        type: "item",
        path: app("/gamification"),
        title: "Gamification",
        transKey: "nav.learning.gamification",
        icon: "dashboards.widget",
        roles: ["student"],
      },
    ],
  },

  // ----------------------------------------------------------------- Teaching
  {
    id: "teaching",
    type: "root",
    path: app("/instructor-dashboard"),
    title: "Teaching",
    transKey: "nav.teaching.teaching",
    icon: "apps.instructor-dashboard",
    roles: STAFF_ROLES,
    childs: [
      {
        id: "teaching.instructor-dashboard",
        type: "item",
        path: app("/instructor-dashboard"),
        title: "Instructor Dashboard",
        transKey: "nav.teaching.instructor-dashboard",
        icon: "apps.instructor-dashboard",
        roles: STAFF_ROLES,
      },
      {
        id: "teaching.assignment-grading",
        type: "item",
        path: app("/assignment-grading"),
        title: "Assignment Grading",
        transKey: "nav.teaching.assignment-grading",
        icon: "forms.form-validation",
        roles: STAFF_ROLES,
      },
      {
        id: "teaching.multi-instructor",
        type: "item",
        path: app("/multi-instructor"),
        title: "Multi-Instructor",
        transKey: "nav.teaching.multi-instructor",
        icon: "dashboards.employees",
        roles: STAFF_ROLES,
      },
      {
        id: "teaching.drip-manager",
        type: "item",
        path: app("/drip-manager"),
        title: "Drip Manager",
        transKey: "nav.teaching.drip-manager",
        icon: "components.navigation",
        roles: STAFF_ROLES,
      },
      {
        id: "teaching.prerequisites",
        type: "item",
        path: app("/prerequisite-manager"),
        title: "Prerequisites",
        transKey: "nav.teaching.prerequisites",
        icon: "components.feedback",
        roles: STAFF_ROLES,
      },
      {
        id: "teaching.tutor-ai",
        type: "item",
        path: app("/tutor-ai"),
        title: "TutorAI Assistant",
        transKey: "nav.teaching.tutor-ai",
        icon: "apps.ai-chat",
        roles: STAFF_ROLES,
        badge: "AI",
      },
    ],
  },

  // ----------------------------------------------------------------- eCommerce
  {
    id: "ecommerce",
    type: "root",
    path: app("/ecommerce"),
    title: "eCommerce",
    transKey: "nav.ecommerce.ecommerce",
    icon: "apps.ecommerce",
    roles: ADMIN_ROLES,
    childs: [
      {
        id: "ecommerce.store",
        type: "item",
        path: app("/ecommerce"),
        title: "Store",
        transKey: "nav.ecommerce.store",
        icon: "apps.ecommerce",
        roles: ADMIN_ROLES,
      },
      {
        id: "ecommerce.orders",
        type: "item",
        path: app("/orders-admin"),
        title: "Orders",
        transKey: "nav.ecommerce.orders",
        icon: "dashboards.orders",
        roles: ADMIN_ROLES,
      },
      {
        id: "ecommerce.payouts",
        type: "item",
        path: app("/payouts-admin"),
        title: "Payouts",
        transKey: "nav.ecommerce.payouts",
        icon: "forms.price-list",
        roles: ADMIN_ROLES,
      },
      {
        id: "ecommerce.storefront",
        type: "item",
        path: app("/storefront"),
        title: "Storefront",
        transKey: "nav.ecommerce.storefront",
        icon: "dashboards.cms-analytics",
        roles: ADMIN_ROLES,
      },
      {
        id: "ecommerce.bundles",
        type: "item",
        path: app("/bundles"),
        title: "Bundles",
        transKey: "nav.ecommerce.bundles",
        icon: "components.basic-ui",
        roles: ADMIN_ROLES,
      },
      {
        id: "ecommerce.memberships",
        type: "item",
        path: app("/memberships"),
        title: "Memberships",
        transKey: "nav.ecommerce.memberships",
        icon: "settings.applications",
        roles: ADMIN_ROLES,
      },
      {
        id: "ecommerce.gift-course",
        type: "item",
        path: app("/gift-course"),
        title: "Gift Course",
        transKey: "nav.ecommerce.gift-course",
        icon: "forms.input",
        roles: ADMIN_ROLES,
      },
    ],
  },

  // ------------------------------------------------------------- Certificates
  {
    id: "certificates",
    type: "root",
    path: app("/certificate-builder"),
    title: "Certificates",
    transKey: "nav.certificates.certificates",
    icon: "apps.certificate-builder",
    roles: STAFF_ROLES,
    childs: [
      {
        id: "certificates.builder",
        type: "item",
        path: app("/certificate-builder"),
        title: "Certificate Builder",
        transKey: "nav.certificates.builder",
        icon: "apps.certificate-builder",
        roles: STAFF_ROLES,
      },
    ],
  },

  // ------------------------------------------------------------------ Reports
  {
    id: "reports",
    type: "root",
    path: app("/reports-dashboard"),
    title: "Reports",
    transKey: "nav.reports.reports",
    icon: "dashboards.sales",
    roles: ADMIN_ROLES,
    childs: [
      {
        id: "reports.dashboard",
        type: "item",
        path: app("/reports-dashboard"),
        title: "Reports Dashboard",
        transKey: "nav.reports.dashboard",
        icon: "dashboards.sales",
        roles: ADMIN_ROLES,
      },
    ],
  },

  // ------------------------------------------------------------------ Settings
  {
    id: "lms-settings",
    type: "root",
    path: app("/settings-pages"),
    title: "Settings",
    transKey: "nav.lms-settings.lms-settings",
    icon: "apps.settings-pages",
    roles: ADMIN_ROLES,
    childs: [
      {
        id: "lms-settings.payment",
        type: "item",
        path: app("/payment-settings"),
        title: "Payment Settings",
        transKey: "nav.lms-settings.payment",
        icon: "settings.billing",
        roles: ADMIN_ROLES,
      },
      {
        id: "lms-settings.ecommerce",
        type: "item",
        path: app("/ecommerce-settings"),
        title: "eCommerce Settings",
        transKey: "nav.lms-settings.ecommerce",
        icon: "apps.ecommerce",
        roles: ADMIN_ROLES,
      },
      {
        id: "lms-settings.email-templates",
        type: "item",
        path: app("/email-template-editor"),
        title: "Email Templates",
        transKey: "nav.lms-settings.email-templates",
        icon: "forms.textarea",
        roles: ADMIN_ROLES,
      },
      {
        id: "lms-settings.notifications",
        type: "item",
        path: app("/notification-settings"),
        title: "Notification Settings",
        transKey: "nav.lms-settings.notifications",
        icon: "settings.notifications",
        roles: ADMIN_ROLES,
      },
      {
        id: "lms-settings.accessibility",
        type: "item",
        path: app("/accessibility-settings"),
        title: "Accessibility Settings",
        transKey: "nav.lms-settings.accessibility",
        icon: "settings.applications",
        roles: ADMIN_ROLES,
      },
      {
        id: "lms-settings.legal-consents",
        type: "item",
        path: app("/legal-consents"),
        title: "Legal Consents",
        transKey: "nav.lms-settings.legal-consents",
        icon: "docs.attributions",
        roles: ADMIN_ROLES,
      },
      {
        id: "lms-settings.pages",
        type: "item",
        path: app("/settings-pages"),
        title: "LMS Settings",
        transKey: "nav.lms-settings.pages",
        icon: "apps.settings-pages",
        roles: ADMIN_ROLES,
      },
    ],
  },

  // ------------------------------------------------------------ Platform Admin
  {
    id: "platform-admin",
    type: "root",
    path: admin("/dashboard"),
    title: "Platform Admin",
    transKey: "nav.platform-admin.platform-admin",
    icon: "dashboards.workspaces",
    roles: ["owner"],
    childs: [
      {
        id: "platform-admin.dashboard",
        type: "item",
        path: admin("/dashboard"),
        title: "Admin Dashboard",
        transKey: "nav.platform-admin.dashboard",
        icon: "dashboards.sales",
        roles: ["owner"],
      },
      {
        id: "platform-admin.tenants",
        type: "item",
        path: admin("/tenants"),
        title: "Tenants",
        transKey: "nav.platform-admin.tenants",
        icon: "dashboards.employees",
        roles: ["owner"],
      },
      {
        id: "platform-admin.users",
        type: "item",
        path: admin("/users"),
        title: "Users",
        transKey: "nav.platform-admin.users",
        icon: "prototypes.users-card",
        roles: ["owner"],
      },
      {
        id: "platform-admin.plans",
        type: "item",
        path: admin("/plans"),
        title: "Plans",
        transKey: "nav.platform-admin.plans",
        icon: "prototypes.price-list",
        roles: ["owner"],
      },
      {
        id: "platform-admin.financial",
        type: "item",
        path: admin("/financial"),
        title: "Financial",
        transKey: "nav.platform-admin.financial",
        icon: "dashboards.banking",
        roles: ["owner"],
      },
      {
        id: "platform-admin.health",
        type: "item",
        path: admin("/health"),
        title: "Health",
        transKey: "nav.platform-admin.health",
        icon: "components.feedback",
        roles: ["owner"],
      },
      {
        id: "platform-admin.logs",
        type: "item",
        path: admin("/logs"),
        title: "Logs",
        transKey: "nav.platform-admin.logs",
        icon: "docs.changelogs",
        roles: ["owner"],
      },
      {
        id: "platform-admin.branding",
        type: "item",
        path: admin("/branding"),
        title: "Branding",
        transKey: "nav.platform-admin.branding",
        icon: "settings.appearance",
        roles: ["owner"],
      },
      {
        id: "platform-admin.api-keys",
        type: "item",
        path: admin("/api-keys"),
        title: "API Keys",
        transKey: "nav.platform-admin.api-keys",
        icon: "docs.attributions",
        roles: ["owner"],
      },
      {
        id: "platform-admin.announcements",
        type: "item",
        path: admin("/announcements"),
        title: "Announcements",
        transKey: "nav.platform-admin.announcements",
        icon: "dashboards.influencer",
        roles: ["owner"],
      },
      {
        id: "platform-admin.config",
        type: "item",
        path: admin("/config"),
        title: "Config",
        transKey: "nav.platform-admin.config",
        icon: "settings.general",
        roles: ["owner"],
      },
    ],
  },

  // --------------------------------------------------------------- Migration
  {
    id: "migration",
    type: "root",
    path: app("/migration-wizard"),
    title: "Migration",
    transKey: "nav.migration.migration",
    icon: "components.advanced",
    roles: ADMIN_ROLES,
    childs: [
      {
        id: "migration.wizard",
        type: "item",
        path: app("/migration-wizard"),
        title: "Migration Wizard",
        transKey: "nav.migration.wizard",
        icon: "components.advanced",
        roles: ADMIN_ROLES,
      },
    ],
  },
];
