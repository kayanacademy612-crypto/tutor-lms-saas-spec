// Instructor Dashboard — top-level layout.
//
// Renders a self-contained 2-column layout (sidebar + content) and switches
// between the twelve sub-screens via `useState`. The sidebar is built with
// tailux `Button`s (no raw `<button>`), and each nav item supports an active
// state. A small inline `SettingsScreen` lives here because the spec lists
// "Settings" in the nav but doesn't ask for a dedicated file.

// Import Dependencies
import { useState, ComponentType, ReactNode } from "react";
import clsx from "clsx";
import {
  HomeIcon,
  AcademicCapIcon,
  MegaphoneIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, ScrollShadow, Badge, Switch } from "@/components/ui";

import { HomeScreen } from "./HomeScreen";
import { CoursesScreen } from "./CoursesScreen";
import { AnnouncementsScreen } from "./AnnouncementsScreen";
import { QuizAttemptsScreen } from "./QuizAttemptsScreen";
import { AssignmentsScreen } from "./AssignmentsScreen";
import { DiscussionsScreen } from "./DiscussionsScreen";
import { LiveClassesScreen } from "./LiveClassesScreen";
import { CertificateScreen } from "./CertificateScreen";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { StatementsScreen } from "./StatementsScreen";
import { NotificationsScreen } from "./NotificationsScreen";
import { ProfileScreen } from "./ProfileScreen";

// ----------------------------------------------------------------------

type ScreenId =
  | "home"
  | "courses"
  | "announcements"
  | "quiz-attempts"
  | "assignments"
  | "discussions"
  | "live-classes"
  | "certificate"
  | "analytics"
  | "statements"
  | "notifications"
  | "profile"
  | "settings";

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
  { id: "announcements", label: "Announcements", icon: MegaphoneIcon, badge: "2" },
  { id: "quiz-attempts", label: "Quiz Attempts", icon: ClipboardDocumentCheckIcon },
  { id: "assignments", label: "Assignments", icon: ClipboardDocumentListIcon, badge: "5" },
  { id: "discussions", label: "Discussions", icon: ChatBubbleLeftRightIcon, badge: "3" },
  { id: "live-classes", label: "Live Classes", icon: VideoCameraIcon },
  { id: "certificate", label: "Certificate", icon: DocumentDuplicateIcon },
  { id: "analytics", label: "Analytics", icon: ChartBarIcon },
  { id: "statements", label: "Statements", icon: CurrencyDollarIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon, badge: "4" },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "settings", label: "Settings", icon: Cog6ToothIcon },
];

// ----------------------------------------------------------------------

/**
 * Inline settings screen — the spec lists "Settings" in the sidebar nav but
 * doesn't ask for a dedicated file, so a compact screen lives here. It uses
 * tailux `Switch` toggles and `Card` sections.
 */
function SettingsScreen() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [newEnrollment, setNewEnrollment] = useState(true);
  const [newReview, setNewReview] = useState(true);
  const [payoutAlerts, setPayoutAlerts] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Manage your notifications, payout alerts, and dashboard preferences.
        </p>
      </header>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <BellIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Notifications
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-600">
          <SettingsRow
            title="Email notifications"
            description="Receive course updates and student activity by email."
          >
            <Switch checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="Push notifications"
            description="Get real-time browser alerts for new enrollments and messages."
          >
            <Switch checked={pushNotif} onChange={(e) => setPushNotif(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="Weekly digest"
            description="A summary of revenue, enrollments, and engagement every Monday."
          >
            <Switch checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} />
          </SettingsRow>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <SparklesIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Activity alerts
          </h2>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-dark-600">
          <SettingsRow
            title="New enrollment"
            description="Notify me whenever a student enrolls in one of my courses."
          >
            <Switch checked={newEnrollment} onChange={(e) => setNewEnrollment(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="New review"
            description="Notify me when a student leaves a review or rating."
          >
            <Switch checked={newReview} onChange={(e) => setNewReview(e.target.checked)} />
          </SettingsRow>
          <SettingsRow
            title="Payout alerts"
            description="Notify me when a payout is approved or sent."
          >
            <Switch checked={payoutAlerts} onChange={(e) => setPayoutAlerts(e.target.checked)} />
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

export default function InstructorDashboard() {
  const [active, setActive] = useState<ScreenId>("home");

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="Instructor Dashboard">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <AcademicCapIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Instructor Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Welcome back, Sarah — your courses earned $4,820 this month.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              Online
            </Badge>
            <Button variant="outlined" color="primary" className="gap-1.5">
              <SparklesIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">New course</span>
            </Button>
          </div>
        </header>

        {/* 2-column body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Instructor dashboard navigation">
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

            {/* Sidebar footer — earnings nudge */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="size-5" />
                  <p className="text-xs font-semibold">Next payout</p>
                </div>
                <p className="mt-1.5 text-lg font-bold">$1,284.50</p>
                <p className="text-[11px] leading-relaxed text-white/80">
                  Scheduled for the 1st of next month.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-primary-700 hover:bg-white text-xs"
                >
                  View statements
                </Button>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Screen breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Instructor</span>
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
                {active === "announcements" && <AnnouncementsScreen />}
                {active === "quiz-attempts" && <QuizAttemptsScreen />}
                {active === "assignments" && <AssignmentsScreen />}
                {active === "discussions" && <DiscussionsScreen />}
                {active === "live-classes" && <LiveClassesScreen />}
                {active === "certificate" && <CertificateScreen />}
                {active === "analytics" && <AnalyticsScreen />}
                {active === "statements" && <StatementsScreen />}
                {active === "notifications" && <NotificationsScreen />}
                {active === "profile" && <ProfileScreen />}
                {active === "settings" && <SettingsScreen />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}
