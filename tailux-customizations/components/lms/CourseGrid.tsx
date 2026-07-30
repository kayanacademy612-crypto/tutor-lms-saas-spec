// Import Dependencies
import clsx from "clsx";
import { ReactNode } from "react";

// Local Imports
import type { Course } from "@/types/lms";
import { CourseCard } from "@/components/lms/CourseCard";
import { Skeleton } from "@/components/ui";
import { EmptyState } from "@/components/lms/EmptyState";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

export interface CourseGridProps {
  courses: Course[];
  /** Show skeleton placeholders while data is loading. */
  loading?: boolean;
  /** Number of skeleton placeholders to render while loading. */
  loadingCount?: number;
  /** Click handler for an individual course card. */
  onCourseClick?: (course: Course) => void;
  /** Per-card extra data resolver — see `CourseCardProps`. */
  getInstructorName?: (course: Course) => string | undefined;
  getInstructorAvatarUrl?: (course: Course) => string | undefined;
  /** Optional progress resolver (0-100) for enrolled students. */
  getProgress?: (course: Course) => number | undefined;
  /** Optional footer slot resolver (e.g. EnrollmentButton). */
  renderFooter?: (course: Course) => ReactNode;
  /** Title shown in the built-in empty state. */
  emptyTitle?: string;
  /** Description shown in the built-in empty state. */
  emptyDescription?: string;
  /** Optional action rendered in the empty state. */
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  /** Responsive column count override (defaults to a 1→4 responsive grid). */
  columns?: 1 | 2 | 3 | 4;
  /** Extra classes on the grid wrapper. */
  className?: string;
}

const columnsClass: Record<NonNullable<CourseGridProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

/** A single skeleton placeholder matching `CourseCard`'s shape. */
function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-soft dark:border-dark-600 dark:bg-dark-700">
      <Skeleton className="aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive grid of `CourseCard`s.
 *
 * - Renders skeleton placeholders when `loading` is true.
 * - Renders an `EmptyState` when there are no courses and not loading.
 * - Otherwise renders one `CourseCard` per course, with the per-course
 *   resolver props forwarded through.
 */
export function CourseGrid({
  courses,
  loading = false,
  loadingCount = 8,
  onCourseClick,
  getInstructorName,
  getInstructorAvatarUrl,
  getProgress,
  renderFooter,
  emptyTitle = "No courses found",
  emptyDescription = "Try adjusting your filters or check back later.",
  emptyActionLabel,
  onEmptyAction,
  columns = 3,
  className,
}: CourseGridProps) {
  if (loading) {
    return (
      <div
        className={clsx("grid gap-4", columnsClass[columns], className)}
        aria-busy="true"
      >
        {Array.from({ length: loadingCount }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <EmptyState
        icon={AcademicCapIcon}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  return (
    <div className={clsx("grid gap-4", columnsClass[columns], className)}>
      {courses.map((course) => (
        <CourseCard
          key={course.id}
          course={course}
          onClick={onCourseClick ? () => onCourseClick(course) : undefined}
          instructorName={getInstructorName?.(course)}
          instructorAvatarUrl={getInstructorAvatarUrl?.(course)}
          progress={getProgress?.(course)}
          footer={renderFooter?.(course)}
        />
      ))}
    </div>
  );
}

export default CourseGrid;
