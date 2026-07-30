// Platform Admin layout shell.
//
// Wraps the entire `/admin/*` route tree in `<RoleGuard allowedRoles={["owner"]}>`
// and renders the secondary admin sidebar (Dashboard, Tenants, Users, Plans,
// Financial, Health, Logs, Branding, API Keys, Announcements, Config) plus a
// top header carrying the "Platform Admin" badge and a "Back to App" link.
//
// The active nav item is derived from the URL (longest matching prefix wins
// so `/admin/tenants/:id` still highlights the "Tenants" entry). The child
// route's page is mounted via `<Outlet />` inside a scrollable main area.
//
// Pattern mirrors `apps/reports-dashboard/index.tsx` (top bar + 2-column body
// with internal sidebar + scrollable main).

// Import Dependencies
import { ComponentType } from "react";
import { Link, Outlet, useLocation } from "react-router";
import clsx from "clsx";
import {
  Squares2X2Icon,
  BuildingLibraryIcon,
  UsersIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  HeartIcon,
  DocumentTextIcon,
  SwatchIcon,
  KeyIcon,
  MegaphoneIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Badge, Button, ScrollShadow } from "@/components/ui";
import RoleGuard from "@/middleware/RoleGuard";
import { useAdminAbout } from "@/hooks/useAdmin";

// ----------------------------------------------------------------------

interface AdminNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
  description: string;
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: Squares2X2Icon,
    path: "/admin/dashboard",
    description: "Platform overview — KPIs, charts, and recent activity.",
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: BuildingLibraryIcon,
    path: "/admin/tenants",
    description: "Search, audit, and manage every school on the platform.",
  },
  {
    id: "users",
    label: "Users",
    icon: UsersIcon,
    path: "/admin/users",
    description: "Search, impersonate, and manage every user account.",
  },
  {
    id: "plans",
    label: "Plans",
    icon: CreditCardIcon,
    path: "/admin/plans",
    description: "Subscription plans + credit bundles.",
  },
  {
    id: "financial",
    label: "Financial",
    icon: CurrencyDollarIcon,
    path: "/admin/financial",
    description: "Transaction ledger across all tenants.",
  },
  {
    id: "health",
    label: "Health",
    icon: HeartIcon,
    path: "/admin/health",
    description: "Server nodes, integrations, and live metrics.",
  },
  {
    id: "logs",
    label: "Logs",
    icon: DocumentTextIcon,
    path: "/admin/logs",
    description: "Audit trail of every admin / system event.",
  },
  {
    id: "branding",
    label: "Branding",
    icon: SwatchIcon,
    path: "/admin/branding",
    description: "White-label identity, theme, and content.",
  },
  {
    id: "api-keys",
    label: "API Keys",
    icon: KeyIcon,
    path: "/admin/api-keys",
    description: "API keys and outbound webhooks.",
  },
  {
    id: "announcements",
    label: "Announcements",
    icon: MegaphoneIcon,
    path: "/admin/announcements",
    description: "Platform-wide announcement broadcasts.",
  },
  {
    id: "config",
    label: "Config",
    icon: Cog6ToothIcon,
    path: "/admin/config",
    description: "System configuration variables.",
  },
];

/**
 * Derive the active nav id from the URL. Matches the longest prefix so detail
 * routes (`/admin/tenants/:id`) highlight the right parent (`tenants`).
 */
function deriveActive(pathname: string): string {
  const matches = NAV_ITEMS.filter(
    (n) => pathname === n.path || pathname.startsWith(`${n.path}/`),
  );
  if (matches.length === 0) return "dashboard";
  matches.sort((a, b) => b.path.length - a.path.length);
  return matches[0].id;
}

// ----------------------------------------------------------------------

export default function AdminLayout() {
  const location = useLocation();
  const activeId = deriveActive(location.pathname);
  const activeItem =
    NAV_ITEMS.find((n) => n.id === activeId) ?? NAV_ITEMS[0];

  // `useAdminAbout` returns version + copyright. Rendered in the top header
  // footer; failure is non-fatal so we ignore the error.
  const about = useAdminAbout();

  return (
    <RoleGuard allowedRoles={["owner"]}>
      <Page title={`Platform Admin · ${activeItem.label}`}>
        <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
          {/* Top bar */}
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
                <ShieldCheckIcon className="size-5 stroke-2" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                    Platform Admin
                  </h1>
                  <Badge color="primary" variant="soft">
                    Root
                  </Badge>
                </div>
                <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                  Super-admin console for the root tenant operator.
                  {about.data?.version
                    ? ` · v${about.data.version}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                component={Link}
                to="/"
                variant="soft"
                color="neutral"
                className="gap-1.5 text-xs"
              >
                <ArrowLeftIcon className="size-4 stroke-2" />
                Back to App
              </Button>
            </div>
          </header>

          {/* 2-column body */}
          <div className="flex min-h-0 flex-1">
            <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
              <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
                <nav
                  className="space-y-1 p-3"
                  aria-label="Platform admin navigation"
                >
                  {NAV_ITEMS.map((item) => {
                    const isActive = item.id === activeId;
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        component={Link}
                        to={item.path}
                        variant="flat"
                        color={isActive ? "primary" : "neutral"}
                        className={clsx(
                          "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                          isActive
                            ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                        )}
                      >
                        <Icon
                          className={clsx(
                            "size-5 shrink-0 stroke-2 transition-colors",
                            isActive
                              ? "text-primary-600 dark:text-primary-400"
                              : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                          )}
                        />
                        <span className="flex-1 text-left">
                          {item.label}
                        </span>
                      </Button>
                    );
                  })}
                </nav>
              </ScrollShadow>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col">
              {/* Per-page header (breadcrumb) */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                  <span>Platform Admin</span>
                  <span className="text-gray-300 dark:text-dark-500">/</span>
                  <span className="font-medium text-gray-800 dark:text-dark-50">
                    {activeItem.label}
                  </span>
                </div>
                <p className="hidden text-xs text-gray-400 dark:text-dark-400 md:block">
                  {activeItem.description}
                </p>
              </div>

              {/* Active page */}
              <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
                <Outlet />
              </ScrollShadow>
            </main>
          </div>
        </div>
      </Page>
    </RoleGuard>
  );
}
