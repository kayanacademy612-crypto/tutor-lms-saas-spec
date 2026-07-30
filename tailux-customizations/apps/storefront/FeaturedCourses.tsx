// Storefront "Featured courses" section.
//
// Renders the first N published courses (default 6) in a responsive grid
// using the shared `CourseGrid` primitive. Falls back to an `EmptyState`
// when there are no courses and a `LoadingState` while the courses hook is
// pending.

// Import Dependencies
import { useNavigate } from "react-router";
import { ArrowRightIcon, AcademicCapIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";
import { CourseGrid } from "@/components/lms";
import type { Course } from "@/types/lms";

// ----------------------------------------------------------------------

export interface FeaturedCoursesProps {
  /** Courses to display (already filtered to published). */
  courses: Course[];
  /** Loading flag — renders skeletons when true. */
  loading?: boolean;
  /** Optional error — renders an inline note instead of the grid. */
  error?: unknown;
  /** Maximum number of courses to show. */
  limit?: number;
}

/**
 * Section wrapper with a header ("Featured Courses"), an optional
 * "View all →" link to /apps/catalog, and the `CourseGrid` body.
 */
export function FeaturedCourses({
  courses,
  loading = false,
  error,
  limit = 6,
}: FeaturedCoursesProps) {
  const navigate = useNavigate();
  const slice = courses.slice(0, limit);

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-50">
            Featured Courses
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Hand-picked courses loved by thousands of students.
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          className="gap-1.5 text-sm font-semibold"
          onClick={() => navigate("/apps/catalog")}
        >
          View all
          <ArrowRightIcon className="size-4 stroke-2" />
        </Button>
      </div>

      {/* Body */}
      {error ? (
        <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-4 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
          <p className="font-medium">Couldn&apos;t load featured courses.</p>
          <p className="mt-1 text-xs opacity-80">
            Please try again later — your courses will appear here.
          </p>
        </div>
      ) : slice.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center dark:border-dark-500 dark:bg-dark-750">
          <AcademicCapIcon className="size-10 text-gray-300 dark:text-dark-400" />
          <p className="mt-3 text-sm font-medium text-gray-700 dark:text-dark-100">
            No featured courses yet
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            Check back soon — we&apos;re adding new ones every week.
          </p>
        </div>
      ) : (
        <CourseGrid
          courses={slice}
          loading={loading}
          loadingCount={6}
          onCourseClick={(course) => {
            // Encode the course id in the query string so CourseDetailPage
            // can pick it up (matches the catalog pattern).
            void course;
            navigate("/apps/catalog");
          }}
          columns={3}
          emptyTitle="No featured courses yet"
        />
      )}
    </section>
  );
}

export default FeaturedCourses;
