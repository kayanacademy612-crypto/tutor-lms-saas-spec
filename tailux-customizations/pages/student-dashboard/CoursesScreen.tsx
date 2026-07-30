// CoursesScreen — enrolled-courses grid with status filter and search.
//
// Lists the courses the student is enrolled in (via `useEnrollments`) and
// renders one `CourseCard` per course using the shared `CourseGrid`, which
// forwards the per-enrollment `progressPct` to the card's progress bar.
//
// Filters: in-progress, completed, all. Search matches course title.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { useEnrollments } from "@/hooks/useLms";
import type { Course, Enrollment } from "@/types/lms";
import { CourseGrid } from "@/components/lms";
import { Button, Badge, Input, Card } from "@/components/ui";

// ----------------------------------------------------------------------

const iso = (d: Date) => d.toISOString();

const MOCK_COURSES: Course[] = [
  {
    id: "course-001",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Full-Stack React & TypeScript",
    slug: "fullstack-react-ts",
    description: "Build production web apps end to end with React, Vite, and TypeScript.",
    featuredImage:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80",
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
    description: "Master the fundamentals of computer-science problem-solving.",
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
    description: "Learn to design delightful, usable interfaces from scratch.",
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
    description: "Ship and scale applications like a pro using containers.",
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
  {
    id: "course-005",
    tenantId: "tenant-1",
    instructorId: "instr-5",
    title: "Python for Data Science",
    slug: "python-data-science",
    description: "From notebooks to ML models with pandas, NumPy, and scikit-learn.",
    status: "published",
    priceType: "paid",
    priceCents: 7900,
    currency: "usd",
    difficulty: "intermediate",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 2100,
    ratingAvg: 4.7,
    ratingCount: 421,
    createdAt: iso(new Date("2024-12-01")),
    updatedAt: iso(new Date("2025-05-05")),
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
    lastAccessedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: iso(new Date("2025-03-01")),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
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
    lastAccessedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    createdAt: iso(new Date("2025-04-12")),
    updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
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
    lastAccessedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    createdAt: iso(new Date("2025-01-20")),
    updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
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
    lastAccessedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: iso(new Date("2025-06-01")),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "enr-5",
    tenantId: "tenant-1",
    courseId: "course-005",
    studentId: "student-1",
    status: "completed",
    progressPct: 100,
    lessonsTotal: 40,
    lessonsComplete: 40,
    lastAccessedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    completedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    createdAt: iso(new Date("2024-12-15")),
    updatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

// ----------------------------------------------------------------------

type StatusFilter = "all" | "in-progress" | "completed";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All courses" },
  { id: "in-progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function matchesFilter(enr: Enrollment, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "in-progress")
    return enr.status === "active" && enr.progressPct < 100;
  return enr.status === "completed" || enr.progressPct >= 100;
}

// ----------------------------------------------------------------------

export function CoursesScreen() {
  const {
    data: enrollments,
    loading,
    error,
    refetch,
  } = useEnrollments();

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  // Fall back to mock data when the API is unavailable.
  const enrList = enrollments && enrollments.length > 0 ? enrollments : MOCK_ENROLLMENTS;

  // Build a courseId → enrollment map for quick progress lookup.
  const enrByCourse = useMemo(() => {
    const m = new Map<string, Enrollment>();
    enrList.forEach((e) => m.set(e.courseId, e));
    return m;
  }, [enrList]);

  // Enrolled courses (resolved from the mock catalog by courseId).
  const enrolledCourses = useMemo(
    () =>
      MOCK_COURSES.filter((c) => enrByCourse.has(c.id)),
    [enrByCourse],
  );

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrolledCourses.filter((c) => {
      const enr = enrByCourse.get(c.id);
      if (!enr || !matchesFilter(enr, filter)) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [enrolledCourses, enrByCourse, filter, query]);

  const counts = useMemo(() => {
    const inProg = enrList.filter(
      (e) => e.status === "active" && e.progressPct < 100,
    ).length;
    const done = enrList.filter(
      (e) => e.status === "completed" || e.progressPct >= 100,
    ).length;
    return { all: enrList.length, inProgress: inProg, completed: done };
  }, [enrList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          My Courses
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Pick up where you left off or revisit a completed course.
        </p>
      </header>

      {/* API health notice */}
      {error && (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Couldn&apos;t load enrollments from the server — showing sample
            courses instead.
          </p>
          <Button variant="outlined" color="warning" className="text-xs" onClick={refetch}>
            Retry
          </Button>
        </Card>
      )}

      {/* Toolbar: search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search your courses…"
            prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
            classNames={{ wrapper: "mt-0" }}
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-750">
          <FunnelIcon className="ml-1.5 size-4 text-gray-400 dark:text-dark-400" />
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "soft" : "flat"}
              color={filter === f.id ? "primary" : "neutral"}
              onClick={() => setFilter(f.id)}
              className={clsx(
                "gap-1.5 text-xs",
                filter === f.id
                  ? "text-primary-700 dark:text-primary-300"
                  : "text-gray-600 dark:text-dark-300",
              )}
            >
              {f.label}
              <Badge
                color={filter === f.id ? "primary" : "neutral"}
                variant="filled"
                className="h-4 min-w-4 px-1 text-[10px]"
              >
                {counts[f.id === "in-progress" ? "inProgress" : f.id === "completed" ? "completed" : "all"]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <CourseGrid
        courses={visibleCourses}
        loading={loading}
        loadingCount={6}
        columns={3}
        getProgress={(c) => enrByCourse.get(c.id)?.progressPct}
        getInstructorName={(c) => {
          const id = c.instructorId;
          return id === "instr-1"
            ? "Sarah Chen"
            : id === "instr-2"
              ? "Marcus Lee"
              : id === "instr-3"
                ? "Priya Patel"
                : id === "instr-4"
                  ? "Diego Rivera"
                  : "Instructor";
        }}
        emptyTitle={
          query
            ? "No courses match your search"
            : filter === "completed"
              ? "No completed courses yet"
              : filter === "in-progress"
                ? "No courses in progress"
                : "You haven't enrolled in any courses"
        }
        emptyDescription={
          query
            ? "Try a different keyword or clear the search."
            : "Browse the catalog to find your next course."
        }
        emptyActionLabel="Browse catalog"
      />
    </div>
  );
}

export default CoursesScreen;
