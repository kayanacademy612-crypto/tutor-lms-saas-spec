// CoursesScreen — list of the instructor's own courses.
//
// Renders a grid of `CourseCard`s with status (draft/published), student
// count, revenue, and rating. A "Create course" button opens an inline
// composer (title + description) that prepends a draft course to the list
// (mock — no real POST is made).

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  UsersIcon,
  StarIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import type { Course } from "@/types/lms";
import { CourseCard, EmptyState, LoadingState } from "@/components/lms";
import { Button, Badge, Input, Textarea, Card } from "@/components/ui";

// ----------------------------------------------------------------------

const iso = (d: Date) => d.toISOString();

const INITIAL_COURSES: Course[] = [
  {
    id: "course-001",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Full-Stack React & TypeScript",
    slug: "fullstack-react-ts",
    description:
      "Build production web apps end to end with React, Vite, and TypeScript.",
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
    instructorId: "instr-1",
    title: "Advanced React Performance",
    slug: "advanced-react-perf",
    description: "Profiling, memoization, and concurrent rendering in React 19.",
    featuredImage:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80",
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
  {
    id: "course-004",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Building Design Systems with Tailwind v4",
    slug: "tailwind-design-systems",
    description: "Tokens, themes, and component architecture that scales.",
    featuredImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    status: "published",
    priceType: "paid",
    priceCents: 6900,
    currency: "usd",
    difficulty: "intermediate",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 880,
    ratingAvg: 4.8,
    ratingCount: 156,
    createdAt: iso(new Date("2025-02-05")),
    updatedAt: iso(new Date("2025-05-30")),
  },
];

// ----------------------------------------------------------------------

type StatusFilter = "all" | "published" | "draft";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
];

const statusTone: Record<
  Course["status"],
  { color: "success" | "warning" | "neutral"; label: string }
> = {
  published: { color: "success", label: "Published" },
  draft: { color: "warning", label: "Draft" },
  archived: { color: "neutral", label: "Archived" },
};

// ----------------------------------------------------------------------

export function CoursesScreen() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [loading] = useState(false);
  const [error] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  const counts = useMemo(
    () => ({
      all: courses.length,
      published: courses.filter((c) => c.status === "published").length,
      draft: courses.filter((c) => c.status === "draft").length,
    }),
    [courses],
  );

  const visibleCourses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    });
  }, [courses, filter, query]);

  function createDraft() {
    if (!draftTitle.trim()) return;
    const newCourse: Course = {
      id: `course-${Math.random().toString(36).slice(2, 8)}`,
      tenantId: "tenant-1",
      instructorId: "instr-1",
      title: draftTitle.trim(),
      slug: draftTitle.trim().toLowerCase().replace(/\s+/g, "-"),
      description: draftDescription.trim() || "No description yet.",
      status: "draft",
      priceType: "paid",
      priceCents: 0,
      currency: "usd",
      isFeatured: false,
      isPublic: false,
      enrolledCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCourses((prev) => [newCourse, ...prev]);
    setDraftTitle("");
    setDraftDescription("");
    setCreating(false);
  }

  function publishCourse(id: string) {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: "published",
              publishedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            My Courses
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Manage your published courses and works-in-progress.
          </p>
        </div>
        <Button color="primary" className="gap-1.5" onClick={() => setCreating(true)}>
          <PlusIcon className="size-4 stroke-2" />
          Create Course
        </Button>
      </header>

      {/* API health notice */}
      {error && (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Couldn&apos;t load courses from the server — showing sample data instead.
          </p>
        </Card>
      )}

      {/* Inline create form */}
      {creating && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Create new course
            </h2>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              onClick={() => setCreating(false)}
              aria-label="Cancel create course"
            >
              <XMarkIcon className="size-5 stroke-2" />
            </Button>
          </div>
          <Input
            label="Course title"
            placeholder="e.g. Mastering Serverless with Next.js"
            value={draftTitle}
            onChange={(e) => setDraftTitle((e.target as HTMLInputElement).value)}
            classNames={{ wrapper: "mt-0" }}
          />
          <Textarea
            label="Short description"
            rows={3}
            placeholder="A one-paragraph summary of what students will learn."
            value={draftDescription}
            onChange={(e) => setDraftDescription((e.target as HTMLTextAreaElement).value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="flat" color="neutral" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={createDraft}
              disabled={!draftTitle.trim()}
              className="gap-1.5"
            >
              <PlusIcon className="size-4 stroke-2" />
              Create draft
            </Button>
          </div>
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
                {counts[f.id]}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {/* Course list */}
      {loading ? (
        <LoadingState message="Loading your courses…" />
      ) : visibleCourses.length === 0 ? (
        <EmptyState
          icon={PlusIcon}
          title={
            query
              ? "No courses match your search"
              : filter === "draft"
                ? "No draft courses"
                : filter === "published"
                  ? "No published courses yet"
                  : "You haven't created any courses"
          }
          description={
            query
              ? "Try a different keyword or clear the search."
              : "Create your first course to start teaching."
          }
          actionLabel="Create Course"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => (
            <InstructorCourseCard
              key={course.id}
              course={course}
              onPublish={() => publishCourse(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function InstructorCourseCard({
  course,
  onPublish,
}: {
  course: Course;
  onPublish: () => void;
}) {
  const revenue = (course.enrolledCount * course.priceCents) / 100;
  const tone = statusTone[course.status];

  return (
    <Card skin="shadow" className="flex flex-col overflow-hidden p-0">
      <CourseCard
        course={course}
        hidePrice
        className="rounded-none border-0 shadow-none"
        footer={
          <Badge color={tone.color} variant="soft" className="text-[10px]">
            {tone.label}
          </Badge>
        }
      />
      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-2 border-t border-gray-100 px-4 py-3 dark:border-dark-600">
        <Stat
          icon={UsersIcon}
          value={course.enrolledCount.toLocaleString()}
          label="Students"
        />
        <Stat
          icon={CurrencyDollarIcon}
          value={`$${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          label="Revenue"
        />
        <Stat
          icon={StarIcon}
          value={course.ratingAvg > 0 ? course.ratingAvg.toFixed(1) : "—"}
          label="Rating"
        />
      </div>
      {/* Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 dark:border-dark-600">
        <Button variant="flat" color="neutral" className="gap-1.5 text-xs">
          <PencilSquareIcon className="size-3.5 stroke-2" />
          Edit
        </Button>
        {course.status === "draft" ? (
          <Button
            variant="soft"
            color="success"
            className="gap-1.5 text-xs"
            onClick={onPublish}
          >
            <RocketLaunchIcon className="size-3.5 stroke-2" />
            Publish
          </Button>
        ) : (
          <Button variant="outlined" color="primary" className="text-xs">
            View course
          </Button>
        )}
      </div>
    </Card>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof UsersIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <Icon className="size-4 text-gray-400 dark:text-dark-400" />
      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-dark-50">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
        {label}
      </p>
    </div>
  );
}

export default CoursesScreen;
