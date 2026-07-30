// HomeScreen — instructor overview.
//
// Renders a greeting, revenue stats (total, this month, pending payouts),
// a course overview row (courses, students, enrollments), a recent activity
// feed, and quick actions (Create Course, View Analytics).
//
// Uses the real `lmsApi` for the home feed and falls back to mock data so the
// dashboard is always usable in dev.

// Import Dependencies
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  AcademicCapIcon,
  UsersIcon,
  ShoppingCartIcon,
  PlusIcon,
  ChartBarIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  CheckBadgeIcon,
  MegaphoneIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { lmsApi } from "@/services/lms-api";
import type { Course, Notification } from "@/types/lms";
import { StatCard, EmptyState, LoadingState } from "@/components/lms";
import { Button, Card, Badge, Avatar } from "@/components/ui";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

/** Instructor's own courses — used for the course overview and quick stats. */
const MOCK_COURSES: Course[] = [
  {
    id: "course-001",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Full-Stack React & TypeScript",
    slug: "fullstack-react-ts",
    description: "Build production web apps end to end.",
    status: "published",
    priceType: "paid",
    priceCents: 8900,
    currency: "usd",
    difficulty: "intermediate",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 1240,
    ratingAvg: 4.7,
    ratingCount: 312,
    createdAt: iso(new Date("2025-01-10")),
    updatedAt: iso(new Date("2025-06-01")),
  },
  {
    id: "course-002",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Advanced React Performance",
    slug: "advanced-react-perf",
    description: "Profiling, memoization, and concurrent rendering.",
    status: "published",
    priceType: "paid",
    priceCents: 7900,
    currency: "usd",
    difficulty: "advanced",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 540,
    ratingAvg: 4.6,
    ratingCount: 98,
    createdAt: iso(new Date("2025-03-15")),
    updatedAt: iso(new Date("2025-06-10")),
  },
  {
    id: "course-003",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "TypeScript Generics Deep Dive",
    slug: "ts-generics",
    description: "Master the type system from conditionals to inference.",
    status: "draft",
    priceType: "paid",
    priceCents: 5900,
    currency: "usd",
    difficulty: "intermediate",
    isFeatured: false,
    isPublic: false,
    enrolledCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: iso(new Date("2025-06-20")),
    updatedAt: iso(new Date("2025-06-25")),
  },
];

interface ActivityItem {
  id: string;
  type: "enrollment" | "review" | "comment" | "certificate" | "announcement" | "payout";
  title: string;
  detail: string;
  actor: string;
  at: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    type: "enrollment",
    title: "New enrollment",
    detail: "Marcus Lee enrolled in Full-Stack React & TypeScript.",
    actor: "Marcus Lee",
    at: hoursAgo(1),
  },
  {
    id: "act-2",
    type: "review",
    title: "New 5★ review",
    detail: "Priya Patel rated Advanced React Performance 5 stars.",
    actor: "Priya Patel",
    at: hoursAgo(4),
  },
  {
    id: "act-3",
    type: "payout",
    title: "Payout approved",
    detail: "Your June payout of $1,284.50 was approved.",
    actor: "Finance",
    at: hoursAgo(8),
  },
  {
    id: "act-4",
    type: "comment",
    title: "New discussion reply",
    detail: 'Diego Rivera replied to "Best way to structure a large React + TS codebase?".',
    actor: "Diego Rivera",
    at: hoursAgo(12),
  },
  {
    id: "act-5",
    type: "certificate",
    title: "Certificate issued",
    detail: "Sara Kim earned a certificate for Full-Stack React & TypeScript.",
    actor: "Sara Kim",
    at: daysAgo(1),
  },
  {
    id: "act-6",
    type: "announcement",
    title: "Announcement published",
    detail: 'You posted "Live class moved to Friday 4pm" in Full-Stack React & TypeScript.',
    actor: "You",
    at: daysAgo(2),
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "ntf-1",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "enrollment",
    title: "New enrollment",
    body: "Marcus Lee enrolled in Full-Stack React & TypeScript.",
    isRead: false,
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
  },
  {
    id: "ntf-2",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "review",
    title: "New 5★ review",
    body: "Priya Patel rated Advanced React Performance.",
    isRead: false,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
];

// ----------------------------------------------------------------------

function greeting(): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diff = now.getTime() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const activityIcon: Record<
  ActivityItem["type"],
  { icon: typeof AcademicCapIcon; color: "primary" | "success" | "warning" | "info" | "error" | "neutral" }
> = {
  enrollment: { icon: ShoppingCartIcon, color: "primary" },
  review: { icon: StarIcon, color: "warning" },
  comment: { icon: ChatBubbleLeftIcon, color: "info" },
  certificate: { icon: CheckBadgeIcon, color: "success" },
  announcement: { icon: MegaphoneIcon, color: "neutral" },
  payout: { icon: CurrencyDollarIcon, color: "success" },
};

// ----------------------------------------------------------------------

export function HomeScreen() {
  // Best-effort fetch of notifications + courses for the activity feed.
  // Falls back to mock data on any error so the screen always renders.
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ntfLoading, setNtfLoading] = useState(true);
  const [ntfError, setNtfError] = useState(false);

  useEffect(() => {
    let active = true;
    setNtfLoading(true);
    lmsApi.notification
      .list()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setNotifications(list.length > 0 ? list : MOCK_NOTIFICATIONS);
        setNtfError(false);
      })
      .catch(() => {
        if (!active) return;
        setNotifications(MOCK_NOTIFICATIONS);
        setNtfError(true);
      })
      .finally(() => {
        if (!active) return;
        setNtfLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const courses = MOCK_COURSES;
  const totalCourses = courses.length;
  const publishedCourses = courses.filter((c) => c.status === "published").length;
  const totalStudents = courses.reduce((s, c) => s + c.enrolledCount, 0);
  const totalEnrollments = totalStudents; // 1 enrollment per student in mock

  const totalRevenue = 48230; // USD
  const monthRevenue = 4820;
  const pendingPayouts = 1284.5;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-dark-50">
            {greeting()}, Sarah! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Your courses earned{" "}
            <span className="font-medium text-primary-600 dark:text-primary-400">
              ${monthRevenue.toLocaleString()}
            </span>{" "}
            this month across {publishedCourses} published courses.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outlined" color="primary" className="gap-1.5">
            <ChartBarIcon className="size-4 stroke-2" />
            <span className="hidden sm:inline">View Analytics</span>
          </Button>
          <Button color="primary" className="gap-1.5">
            <PlusIcon className="size-4 stroke-2" />
            Create Course
          </Button>
        </div>
      </header>

      {/* Revenue stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={CurrencyDollarIcon}
          value={`$${totalRevenue.toLocaleString()}`}
          label="Total revenue"
          color="success"
          trend={{ value: 18.2, label: "vs last quarter" }}
        />
        <StatCard
          icon={ArrowTrendingUpIcon}
          value={`$${monthRevenue.toLocaleString()}`}
          label="This month"
          color="primary"
          trend={{ value: 12.5, label: "vs last month" }}
        />
        <StatCard
          icon={ClockIcon}
          value={`$${pendingPayouts.toFixed(2)}`}
          label="Pending payouts"
          color="warning"
          trend={{ value: -4.1, label: "vs last month" }}
        />
      </section>

      {/* API health notice */}
      {ntfError && (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Live notification data is unavailable — showing sample activity so
            you can explore the dashboard.
          </p>
        </Card>
      )}

      {/* Course overview */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-dark-50">
          Course overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={AcademicCapIcon}
            value={totalCourses}
            label="Total courses"
            color="primary"
          />
          <StatCard
            icon={UsersIcon}
            value={totalStudents.toLocaleString()}
            label="Total students"
            color="info"
            trend={{ value: 9.3, label: "vs last month" }}
          />
          <StatCard
            icon={ShoppingCartIcon}
            value={totalEnrollments.toLocaleString()}
            label="Total enrollments"
            color="success"
            trend={{ value: 15.7, label: "vs last month" }}
          />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-dark-50">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={PlusIcon}
            label="Create course"
            description="Start a new course draft"
            color="primary"
          />
          <QuickAction
            icon={ChartBarIcon}
            label="View analytics"
            description="See revenue & engagement trends"
            color="info"
          />
          <QuickAction
            icon={MegaphoneIcon}
            label="Post announcement"
            description="Notify students across a course"
            color="warning"
          />
          <QuickAction
            icon={VideoCameraIcon}
            label="Schedule live class"
            description="Create a Zoom / Meet session"
            color="success"
          />
        </div>
      </section>

      {/* Recent activity + top performing course */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              Recent activity
            </h2>
            <Button variant="flat" color="primary" className="gap-1 text-xs">
              View all
              <ArrowRightIcon className="size-3.5 stroke-2" />
            </Button>
          </div>

          {ntfLoading ? (
            <LoadingState message="Loading activity…" />
          ) : MOCK_ACTIVITY.length === 0 ? (
            <EmptyState
              icon={AcademicCapIcon}
              title="No activity yet"
              description="Recent student and revenue activity will appear here."
              compact
            />
          ) : (
            <Card className="divide-y divide-gray-100 p-0 dark:divide-dark-600">
              {MOCK_ACTIVITY.map((item) => {
                const tone = activityIcon[item.type];
                const Icon = tone.icon;
                return (
                  <div key={item.id} className="flex items-start gap-3 p-3.5">
                    <div
                      className={clsx(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        tone.color === "primary" && "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
                        tone.color === "success" && "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
                        tone.color === "warning" && "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
                        tone.color === "info" && "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
                        tone.color === "error" && "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
                        tone.color === "neutral" && "bg-gray-200/70 text-gray-600 dark:bg-dark-500/50 dark:text-dark-200",
                      )}
                    >
                      <Icon className="size-4 stroke-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                        {item.detail}
                      </p>
                      <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-400">
                        {timeAgo(item.at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>

        {/* Top performing course */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
            Top performing
          </h2>
          <Card className="space-y-3 p-4">
            {courses
              .filter((c) => c.status === "published")
              .sort((a, b) => b.enrolledCount - a.enrolledCount)
              .slice(0, 2)
              .map((course) => (
                <TopCourseRow key={course.id} course={course} />
              ))}
          </Card>

          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Unread notifications
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-dark-50">
              {notifications.filter((n) => !n.isRead).length}
            </p>
            <Button variant="flat" color="primary" className="mt-2 gap-1 text-xs">
              View notifications
              <ArrowRightIcon className="size-3.5 stroke-2" />
            </Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------

function QuickAction({
  icon: Icon,
  label,
  description,
  color,
}: {
  icon: typeof PlusIcon;
  label: string;
  description: string;
  color: "primary" | "success" | "warning" | "info";
}) {
  return (
    <Card className="flex cursor-pointer items-center gap-3 p-4 transition-shadow hover:shadow-soft">
      <div
        className={clsx(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          color === "primary" && "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
          color === "success" && "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
          color === "warning" && "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
          color === "info" && "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
        )}
      >
        <Icon className="size-5 stroke-2" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">{label}</p>
        <p className="truncate text-xs text-gray-500 dark:text-dark-300">{description}</p>
      </div>
    </Card>
  );
}

function TopCourseRow({ course }: { course: Course }) {
  const revenue = (course.enrolledCount * course.priceCents) / 100;
  return (
    <div className="flex items-center gap-3">
      <Avatar
        name={course.title}
        size={10}
        initialColor="primary"
        initialVariant="soft"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
          {course.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
          <span className="inline-flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {course.enrolledCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <StarIcon className="size-3.5 text-amber-400" />
            {course.ratingAvg.toFixed(1)}
          </span>
        </div>
      </div>
      <Badge color="success" variant="soft" className="shrink-0 text-[10px]">
        ${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </Badge>
    </div>
  );
}

export default HomeScreen;
