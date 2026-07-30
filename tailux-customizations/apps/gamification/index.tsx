// Gamification app — `apps/gamification` route.
//
// Self-contained 2-column layout (sidebar + content) that switches between
// the four Phase 5 gamification screens: leaderboard, my badges, my points,
// and admin badge management. The sidebar pattern mirrors
// `instructor-dashboard/index.tsx` (tailux `Button`s, no raw `<button>`,
// active state via `bg-primary-500/10`).
//
// The "Manage Badges" sidebar entry is admin-only — gated on the auth
// context's `user.role === "admin"`. Non-admins simply don't see the entry
// and can't navigate to it (the panel is also defensively hidden).

// Import Dependencies
import { useState, ComponentType } from "react";
import clsx from "clsx";
import {
  TrophyIcon,
  SparklesIcon,
  StarIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, ScrollShadow } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";

// Local Imports (screens)
import { Leaderboard } from "./Leaderboard";
import { MyBadges } from "./MyBadges";
import { MyPoints } from "./MyPoints";
import { BadgeManagement } from "./BadgeManagement";

// ----------------------------------------------------------------------

type ScreenId = "leaderboard" | "my-badges" | "my-points" | "manage-badges";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Restrict to admins (hidden from other roles). */
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "leaderboard", label: "Leaderboard", icon: TrophyIcon },
  { id: "my-badges", label: "My Badges", icon: SparklesIcon },
  { id: "my-points", label: "My Points", icon: StarIcon },
  { id: "manage-badges", label: "Manage Badges", icon: Cog6ToothIcon, adminOnly: true },
];

const SCREEN_LABELS: Record<ScreenId, string> = {
  leaderboard: "Leaderboard",
  "my-badges": "My Badges",
  "my-points": "My Points",
  "manage-badges": "Manage Badges",
};

// ----------------------------------------------------------------------

export default function GamificationApp() {
  const { user } = useAuthContext();
  const isAdmin = user?.role === "admin";

  // Filter nav items by role so admins see all four entries and students
  // only see the three student-facing ones.
  const visibleNav = NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin);

  const [active, setActive] = useState<ScreenId>("leaderboard");

  // If the active screen is admin-only and the current user is not an admin,
  // fall back to the leaderboard instead of rendering a forbidden panel.
  const safeActive: ScreenId =
    active === "manage-badges" && !isAdmin ? "leaderboard" : active;

  return (
    <Page title="Gamification">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-warning-500 to-primary-600 text-white">
              <TrophyIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Gamification
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Track achievements, earn points, and climb the leaderboard.
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                <ShieldCheckIcon className="size-3.5 stroke-2" />
                Admin
              </span>
            </div>
          )}
        </header>

        {/* 2-column body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Gamification navigation">
                {visibleNav.map((item) => {
                  const isActive = item.id === safeActive;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => setActive(item.id)}
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
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.adminOnly && (
                        <ShieldCheckIcon
                          className={clsx(
                            "size-3.5 stroke-2",
                            isActive
                              ? "text-primary-500 dark:text-primary-300"
                              : "text-gray-400 dark:text-dark-400",
                          )}
                        />
                      )}
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>

            {/* Sidebar footer — leaderboard nudge */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <div className="rounded-lg bg-gradient-to-br from-warning-500 to-primary-600 p-3 text-white dark:from-warning-600 dark:to-primary-700">
                <div className="flex items-center gap-2">
                  <TrophyIcon className="size-5" />
                  <p className="text-xs font-semibold">Keep it up!</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/90">
                  Complete lessons and pass quizzes to earn more points and
                  climb the leaderboard.
                </p>
              </div>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Screen breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Gamification</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {SCREEN_LABELS[safeActive]}
                </span>
              </div>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {safeActive === "leaderboard" && <Leaderboard />}
                {safeActive === "my-badges" && <MyBadges />}
                {safeActive === "my-points" && <MyPoints />}
                {safeActive === "manage-badges" && isAdmin && (
                  <BadgeManagement />
                )}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}
