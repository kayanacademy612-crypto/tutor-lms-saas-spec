// Import Dependencies
import clsx from "clsx";
import { ReactNode } from "react";
import { UsersIcon, SparklesIcon } from "@heroicons/react/24/outline";

// Local Imports
import type { Course } from "@/types/lms";
import { Card } from "@/components/ui";
import { CourseThumbnail } from "@/components/lms/CourseThumbnail";
import { DifficultyBadge } from "@/components/lms/DifficultyBadge";
import { RatingStars } from "@/components/lms/RatingStars";
import { PriceTag } from "@/components/lms/PriceTag";
import { InstructorAvatar } from "@/components/lms/InstructorAvatar";
import { ProgressBar } from "@/components/lms/ProgressBar";

// ----------------------------------------------------------------------

export interface CourseCardProps {
  course: Course;
  /** Click handler for the whole card. */
  onClick?: () => void;
  /** Optional instructor display name (resolved from `instructorId` upstream). */
  instructorName?: string;
  /** Optional instructor avatar URL. */
  instructorAvatarUrl?: string;
  /** Optional instructor email. */
  instructorEmail?: string;
  /** Optional enrollment progress (0-100). When provided, a progress bar is shown. */
  progress?: number;
  /** Optional footer slot (e.g. an EnrollmentButton). */
  footer?: ReactNode;
  /** Hide the price row (useful for instructor dashboards). */
  hidePrice?: boolean;
  /** Extra classes on the root Card. */
  className?: string;
}

/**
 * Compact, click-through course card for catalogs and dashboards.
 *
 * Composes the lower-level LMS primitives (`CourseThumbnail`,
 * `DifficultyBadge`, `RatingStars`, `PriceTag`, `InstructorAvatar`,
 * `ProgressBar`) so styling stays consistent across all screens.
 */
export function CourseCard({
  course,
  onClick,
  instructorName,
  instructorAvatarUrl,
  instructorEmail,
  progress,
  footer,
  hidePrice = false,
  className,
}: CourseCardProps) {
  const interactive = !!onClick;
  const hasProgress = typeof progress === "number" && progress > 0;

  return (
    <Card
      component={interactive ? "button" : "div"}
      onClick={interactive ? onClick : undefined}
      skin="shadow"
      className={clsx(
        "group flex w-full flex-col overflow-hidden p-0 text-left",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500/40",
        className,
      )}
    >
      {/* Thumbnail + difficulty badge overlay */}
      <div className="relative">
        <CourseThumbnail
          url={course.featuredImage}
          title={course.title}
          size="full"
          rounded="rounded-none"
        />
        {course.difficulty && (
          <DifficultyBadge
            level={course.difficulty}
            className="absolute left-2.5 top-2.5 shadow-sm"
          />
        )}
        {course.isFeatured && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm dark:bg-amber-500/90">
            <SparklesIcon className="size-3 stroke-2" />
            Featured
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
          {course.title}
        </h3>

        {/* Instructor */}
        {instructorName && (
          <InstructorAvatar
            name={instructorName}
            email={instructorEmail}
            avatarUrl={instructorAvatarUrl}
            size={8}
          />
        )}

        {/* Rating + enrollment count */}
        <div className="flex items-center justify-between gap-2">
          <RatingStars
            value={course.ratingAvg}
            count={course.ratingCount}
            size="size-3.5"
          />
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-500 dark:text-dark-300">
            <UsersIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
            {course.enrolledCount.toLocaleString()}
          </span>
        </div>

        {/* Progress (when enrolled) */}
        {hasProgress && (
          <ProgressBar
            value={progress}
            label="Your progress"
            showValue
            size="xs"
          />
        )}

        {/* Price + footer */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {hidePrice ? <span /> : <PriceTag price={course.priceCents} currency={course.currency} model={course.priceType === "free" ? "free" : "paid"} compareAt={course.compareAtCents} size="md" />}
          {footer}
        </div>
      </div>
    </Card>
  );
}

export default CourseCard;
