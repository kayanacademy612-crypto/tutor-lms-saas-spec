// HomeScreen — student overview.
//
// Renders a greeting, four KPI stats (StatCard), a "Continue Learning"
// section that lists in-progress courses with progress bars, a recent
// notifications feed, and upcoming deadlines.
//
// Uses the real `useEnrollments` and `useNotifications` hooks and falls
// back to the mock data defined at the top of the file when the API is
// unavailable (so the dashboard is always usable in dev).

// Import Dependencies
import clsx from "clsx";
import {
  AcademicCapIcon,
  CheckBadgeIcon,
  ClockIcon,
  SparklesIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { useEnrollments, useNotifications } from "@/hooks/useLms";
import type { Course, Enrollment, Notification } from "@/types/lms";
import {
  ProgressBar,
  StatCard,
  EmptyState,
  LoadingState,
} from "@/components/lms";
import { Button, Badge, Card } from "@/components/ui";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Mock courses keyed by id so the Continue Learning cards can resolve titles. */
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
    instructorId: "instr-2",
    title: "Data Structures & Algorithms",
    slug: "dsa",
    description: "Master the fundamentals of CS problem-solving.",
    status: "published",
    priceType: "paid",
    priceCents: 6900,
    currency: "usd",
    difficulty: "advanced",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 980,
    ratingAvg: 4.6,
    ratingCount: 204,
    createdAt: iso(new Date("2024-11-15")),
    updatedAt: iso(new Date("2025-05-20")),
  },
  {
    id: "course-003",
    tenantId: "tenant-1",
    instructorId: "instr-3",
    title: "UI/UX Design Foundations",
    slug: "uiux-foundations",
    description: "Learn to design delightful, usable interfaces.",
    status: "published",
    priceType: "free",
    priceCents: 0,
    currency: "usd",
    difficulty: "beginner",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 3200,
    ratingAvg: 4.8,
    ratingCount: 540,
    createdAt: iso(new Date("2024-09-01")),
    updatedAt: iso(new Date("2025-04-10")),
  },
  {
    id: "course-004",
    tenantId: "tenant-1",
    instructorId: "instr-4",
    title: "DevOps with Docker & Kubernetes",
    slug: "devops-docker-k8s",
    description: "Ship and scale applications like a pro.",
    status: "published",
    priceType: "paid",
    priceCents: 9900,
    currency: "usd",
    difficulty: "advanced",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 760,
    ratingAvg: 4.5,
    ratingCount: 158,
    createdAt: iso(new Date("2025-02-01")),
    updatedAt: iso(new Date("2025-06-15")),
  },
];

const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: "enr-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-1",
    status: "active",
    progressPct: 62,
    lessonsTotal: 48,
    lessonsComplete: 30,
    lastAccessedAt: daysFromNow(-1),
    createdAt: iso(new Date("2025-03-01")),
    updatedAt: daysFromNow(-1),
  },
  {
    id: "enr-2",
    tenantId: "tenant-1",
    courseId: "course-002",
    studentId: "student-1",
    status: "active",
    progressPct: 28,
    lessonsTotal: 36,
    lessonsComplete: 10,
    lastAccessedAt: daysFromNow(-3),
    createdAt: iso(new Date("2025-04-12")),
    updatedAt: daysFromNow(-3),
  },
  {
    id: "enr-3",
    tenantId: "tenant-1",
    courseId: "course-003",
    studentId: "student-1",
    status: "completed",
    progressPct: 100,
    lessonsTotal: 24,
    lessonsComplete: 24,
    lastAccessedAt: daysFromNow(-14),
    completedAt: daysFromNow(-14),
    createdAt: iso(new Date("2025-01-20")),
    updatedAt: daysFromNow(-14),
  },
  {
    id: "enr-4",
    tenantId: "tenant-1",
    courseId: "course-004",
    studentId: "student-1",
    status: "active",
    progressPct: 8,
    lessonsTotal: 30,
    lessonsComplete: 2,
    lastAccessedAt: daysFromNow(-7),
    createdAt: iso(new Date("2025-06-01")),
    updatedAt: daysFromNow(-7),
  },
];

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "ntf-1",
    tenantId: "tenant-1",
    userId: "student-1",
    type: "lesson",
    title: "New lesson published",
    body: "Lesson 31 of Full-Stack React & TypeScript is now available.",
    isRead: false,
    createdAt: daysFromNow(0),
    updatedAt: daysFromNow(0),
  },
  {
    id: "ntf-2",
    tenantId: "tenant-1",
    userId: "student-1",
    type: "quiz",
    title: "Quiz attempt graded",
    body: "You scored 88% on the DSA Sorting Algorithms quiz.",
    isRead: false,
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(-1),
  },
  {
    id: "ntf-3",
    tenantId: "tenant-1",
    userId: "student-1",
    type: "certificate",
    title: "Certificate earned",
    body: "You earned a certificate for completing UI/UX Design Foundations.",
    isRead: true,
    createdAt: daysFromNow(-14),
    updatedAt: daysFromNow(-14),
  },
  {
    id: "ntf-4",
    tenantId: "tenant-1",
    userId: "student-1",
    type: "announcement",
    title: "Live class reminder",
    body: "DevOps live session starts in 2 hours.",
    isRead: true,
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
];

interface Deadline {
  id: string;
  title: string;
  course: string;
  dueAt: string;
  type: "quiz" | "assignment" | "live";
}

const MOCK_DEADLINES: Deadline[] = [
  {
    id: "dl-1",
    title: "Sorting Algorithms Quiz",
    course: "Data Structures & Algorithms",
    dueAt: daysFromNow(2),
    type: "quiz",
  },
  {
    id: "dl-2",
    title: "Module 4 Project Submission",
    course: "Full-Stack React & TypeScript",
    dueAt: daysFromNow(5),
    type: "assignment",
  },
  {
    id: "dl-3",
    title: "Live: Kubernetes Networking",
    course: "DevOps with Docker & Kubernetes",
    dueAt: daysFromNow(1),
    type: "live",
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

function dueLabel(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diffDays = Math.ceil((then - now.getTime()) / 86400000);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

const deadlineTone: Record<Deadline["type"], { color: "error" | "warning" | "info"; label: string }> = {
  quiz: { color: "warning", label: "Quiz" },
  assignment: { color: "error", label: "Assignment" },
  live: { color: "info", label: "Live class" },
};

// ----------------------------------------------------------------------

export function HomeScreen() {
  const {
    data: enrollments,
    loading: enrLoading,
    error: enrError,
    refetch: enrRefetch,
  } = useEnrollments();
  const {
    data: notifications,
    loading: ntfLoading,
    error: ntfError,
    refetch: ntfRefetch,
  } = useNotifications();

  // Fall back to mock data when the API is unavailable so the dashboard is
  // always usable in dev.
  const enrList = enrollments && enrollments.length > 0 ? enrollments : MOCK_ENROLLMENTS;
  const ntfList = notifications && notifications.length > 0 ? notifications : MOCK_NOTIFICATIONS;

  const enrolledCount = enrList.length;
  const completedLessons = enrList.reduce(
    (sum, e) => sum + (e.lessonsComplete ?? 0),
    0,
  );
  const certificatesEarned = enrList.filter((e) => e.status === "completed").length;
  const hoursLearned = Math.round(completedLessons * 0.75); // ~45min/lesson

  const inProgress = enrList.filter(
    (e) => e.status === "active" && e.progressPct < 100,
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-dark-50">
            {greeting()}, Alex! 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            You&apos;ve learned{" "}
            <span className="font-medium text-primary-600 dark:text-primary-400">
              {hoursLearned} hours
            </span>{" "}
            across {enrolledCount} courses. Keep the momentum going.
          </p>
        </div>
        <Button color="primary" className="gap-1.5">
          <SparklesIcon className="size-4 stroke-2" />
          Resume learning
        </Button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={AcademicCapIcon}
          value={enrolledCount}
          label="Enrolled courses"
          color="primary"
          trend={{ value: 12.5, label: "this month" }}
        />
        <StatCard
          icon={CheckBadgeIcon}
          value={completedLessons}
          label="Completed lessons"
          color="success"
          trend={{ value: 8.2, label: "vs last week" }}
        />
        <StatCard
          icon={SparklesIcon}
          value={certificatesEarned}
          label="Certificates earned"
          color="warning"
          trend={{ value: -3.1, label: "vs last month" }}
        />
        <StatCard
          icon={ClockIcon}
          value={`${hoursLearned}h`}
          label="Hours learned"
          color="info"
          trend={{ value: 15.7, label: "vs last week" }}
        />
      </section>

      {/* API health notices (non-blocking) */}
      {(enrError || ntfError) && (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Live data is unavailable — showing sample data so you can explore the
            dashboard.
          </p>
          <Button
            variant="outlined"
            color="warning"
            className="text-xs"
            onClick={() => {
              enrRefetch();
              ntfRefetch();
            }}
          >
            Retry
          </Button>
        </Card>
      )}

      {/* Continue Learning + sidebar (deadlines) */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              Continue Learning
            </h2>
            <Button variant="flat" color="primary" className="gap-1 text-xs">
              View all
              <ArrowRightIcon className="size-3.5 stroke-2" />
            </Button>
          </div>

          {enrLoading ? (
            <LoadingState message="Loading your courses…" />
          ) : inProgress.length === 0 ? (
            <EmptyState
              icon={AcademicCapIcon}
              title="No courses in progress"
              description="Enroll in a course to start your learning journey."
              actionLabel="Browse catalog"
            />
          ) : (
            <div className="space-y-3">
              {inProgress.map((enr) => {
                const course =
                  MOCK_COURSES.find((c) => c.id === enr.courseId) ??
                  MOCK_COURSES[0];
                return (
                  <ContinueLearningCard
                    key={enr.id}
                    course={course}
                    enrollment={enr}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              Upcoming Deadlines
            </h2>
            <CalendarDaysIcon className="size-5 text-gray-400 dark:text-dark-400" />
          </div>
          <Card className="divide-y divide-gray-100 p-0 dark:divide-dark-600">
            {MOCK_DEADLINES.map((dl) => {
              const tone = deadlineTone[dl.type];
              return (
                <div key={dl.id} className="flex items-start gap-3 p-3.5">
                  <div
                    className={clsx(
                      "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                      tone.color === "error" &&
                        "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
                      tone.color === "warning" &&
                        "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
                      tone.color === "info" &&
                        "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
                    )}
                  >
                    <ClockIcon className="size-4 stroke-2" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                      {dl.title}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                      {dl.course}
                    </p>
                  </div>
                  <Badge color={tone.color} variant="soft" className="shrink-0 text-[10px]">
                    {dueLabel(dl.dueAt)}
                  </Badge>
                </div>
              );
            })}
          </Card>
        </div>
      </section>

      {/* Recent notifications */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
            Recent Notifications
          </h2>
          {ntfError && (
            <Button
              variant="flat"
              color="neutral"
              className="gap-1 text-xs"
              onClick={ntfRefetch}
            >
              <ExclamationTriangleIcon className="size-3.5 text-warning-500" />
              Retry
            </Button>
          )}
        </div>

        {ntfLoading ? (
          <LoadingState message="Loading notifications…" />
        ) : ntfList.length === 0 ? (
          <EmptyState
            icon={AcademicCapIcon}
            title="No notifications yet"
            description="You'll see course updates and announcements here."
            compact
          />
        ) : (
          <Card className="divide-y divide-gray-100 p-0 dark:divide-dark-600">
            {ntfList.slice(0, 5).map((n) => (
              <NotificationRow key={n.id} notification={n} />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------

function ContinueLearningCard({
  course,
  enrollment,
}: {
  course: Course;
  enrollment: Enrollment;
}) {
  const completed = enrollment.lessonsComplete ?? 0;
  const total = enrollment.lessonsTotal ?? 0;
  return (
    <Card skin="bordered" className="p-4">
      <div className="flex items-start gap-4">
          {/* Thumbnail well */}
          <div className="hidden size-14 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 sm:flex dark:bg-primary-500/15 dark:text-primary-400">
            <AcademicCapIcon className="size-7 stroke-2" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {course.title}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                  {course.difficulty
                    ? course.difficulty.charAt(0).toUpperCase() +
                      course.difficulty.slice(1)
                    : "All levels"}{" "}
                  · {course.ratingAvg.toFixed(1)} ★
                </p>
              </div>
              <Button
                color="primary"
                variant="soft"
                className="shrink-0 gap-1 text-xs"
              >
                Resume
                <ArrowRightIcon className="size-3.5 stroke-2" />
              </Button>
            </div>

            <div className="mt-3">
              <ProgressBar
                value={enrollment.progressPct}
                color={enrollment.progressPct >= 100 ? "success" : "primary"}
                size="sm"
                hint={
                  total > 0 ? `${completed} / ${total} lessons` : undefined
                }
              />
            </div>
          </div>
        </div>
      </Card>
  );
}

function NotificationRow({ notification }: { notification: Notification }) {
  return (
    <div className="flex items-start gap-3 p-3.5">
      <span
        className={clsx(
          "mt-1.5 size-2 shrink-0 rounded-full",
          notification.isRead
            ? "bg-gray-300 dark:bg-dark-500"
            : "bg-primary-500",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-400">
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {!notification.isRead && (
        <Badge color="primary" variant="soft" className="shrink-0 text-[10px]">
          New
        </Badge>
      )}
    </div>
  );
}

export default HomeScreen;
