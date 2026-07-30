// Student Dashboard — top-level layout.
//
// Renders a self-contained 2-column layout (sidebar + content) and switches
// between the eight sub-screens via `useState`. The sidebar is built with
// tailux `Button`s (no raw `<button>`), and each nav item supports an active
// state. A small inline `SettingsScreen` is defined here because the spec
// lists "Settings" in the nav but doesn't ask for a dedicated file.

// Import Dependencies
import { useState, ComponentType, ReactNode } from "react";
import clsx from "clsx";
import {
  HomeIcon,
  AcademicCapIcon,
  PencilSquareIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UserIcon,
  Cog6ToothIcon,
  SparklesIcon,
  BellAlertIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, ScrollShadow, Badge, Switch } from "@/components/ui";

import { HomeScreen } from "./HomeScreen";
import { CoursesScreen } from "./CoursesScreen";
import { NotesScreen } from "./NotesScreen";
import { DiscussionsScreen } from "./DiscussionsScreen";
import { CalendarScreen } from "./CalendarScreen";
import { ProfileScreen } from "./ProfileScreen";
import { KidsModeScreen } from "./KidsModeScreen";

// ----------------------------------------------------------------------

type ScreenId =
  | "home"
  | "courses"
  | "notes"
  | "discussions"
  | "calendar"
  | "profile"
  | "settings"
  | "kids";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Optional badge content (e.g. unread count). */
  badge?: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "courses", label: "Courses", icon: AcademicCapIcon },
  { id: "notes", label: "Notes", icon: PencilSquareIcon },
  { id: "discussions", label: "Discussions", icon: ChatBubbleLeftRightIcon, badge: "3" },
  { id: "calendar", label: "Calendar", icon: CalendarDaysIcon },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "settings", label: "Settings", icon: Cog6ToothIcon },
  { id: "kids", label: "Kids Mode", icon: SparklesIcon },
];

// ----------------------------------------------------------------------

/**
 * Inline settings screen — the spec lists "Settings" in the sidebar nav but
 * doesn't ask for a dedicated file, so a compact screen lives here. It uses
 * tailux `Switch` toggles and `Card` sections.
 */
function SettingsScreen() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hdVideo, setHdVideo] = useState(false);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Manage your notifications, playback, and account preferences.
        </p>
      </header>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <BellAlertIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Notifications
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-600">
          <SettingsRow
            title="Email notifications"
            description="Receive course updates and announcements by email."
          >
            <Switch checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="Push notifications"
            description="Get real-time alerts in your browser."
          >
            <Switch checked={pushNotif} onChange={(e) => setPushNotif(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="Weekly digest"
            description="A summary of your learning activity every Monday."
          >
            <Switch checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} />
          </SettingsRow>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ArrowPathIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Playback
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-600">
          <SettingsRow
            title="Autoplay lessons"
            description="Automatically play the next lesson when one ends."
          >
            <Switch checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="HD video by default"
            description="Always start videos in high definition (uses more data)."
          >
            <Switch checked={hdVideo} onChange={(e) => setHdVideo(e.target.checked)} />
          </SettingsRow>
        </div>
      </Card>
    </div>
  );
}

/** A single labelled settings row with a trailing control slot. */
function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ----------------------------------------------------------------------

export default function StudentDashboard() {
  const [active, setActive] = useState<ScreenId>("home");

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="Student Dashboard">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <AcademicCapIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Student Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Welcome back, Alex — keep up the streak!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              Online
            </Badge>
            <Button variant="outlined" color="primary" className="gap-1.5">
              <HomeIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">Catalog</span>
            </Button>
          </div>
        </header>

        {/* 2-column body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Student dashboard navigation">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
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
                      {item.badge && (
                        <Badge
                          color={isActive ? "primary" : "neutral"}
                          variant="filled"
                          className="h-5 min-w-5 px-1 text-[10px]"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>

            {/* Sidebar footer — upgrade nudge */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700" skin="none">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-5" />
                  <p className="text-xs font-semibold">Go Premium</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  Unlock unlimited courses, certificates, and live classes.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-primary-700 hover:bg-white text-xs"
                >
                  Upgrade plan
                </Button>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Screen breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Dashboard</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {active === "home" && <HomeScreen />}
                {active === "courses" && <CoursesScreen />}
                {active === "notes" && <NotesScreen />}
                {active === "discussions" && <DiscussionsScreen />}
                {active === "calendar" && <CalendarScreen />}
                {active === "profile" && <ProfileScreen />}
                {active === "settings" && <SettingsScreen />}
                {active === "kids" && <KidsModeScreen />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}
