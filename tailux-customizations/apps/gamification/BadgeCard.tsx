// BadgeCard — shared badge display component used across the gamification app.
//
// Renders a single badge tile: icon (or a placeholder with the first letter
// when no `iconUrl` is provided), name, description, and — when the badge has
// been earned — an "Earned on {date}" footer in a success colour. Locked
// badges render grayed out with a lock icon overlay.
//
// The card is purely presentational — callers decide which badge to render,
// whether it's been earned, and the date it was awarded.

// Import Dependencies
import clsx from "clsx";
import {
  LockClosedIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";
import type { Badge } from "@/types/lms";

// ----------------------------------------------------------------------

export interface BadgeCardProps {
  /** The badge record to render. */
  badge: Badge;
  /** Whether the current student has earned the badge. Defaults to `false`. */
  earned?: boolean;
  /** ISO date string when the badge was awarded (only meaningful when `earned`). */
  awardedAt?: string;
  /** Extra classes on the root Card. */
  className?: string;
}

// ----------------------------------------------------------------------

/**
 * Map a badge `color` string (free-form from the API) to a tailwind token
 * pair used for the icon well. Falls back to the primary palette for any
 * unknown value so tenant-defined colours are still readable.
 */
function badgeColorClasses(color?: string): {
  well: string;
  ring: string;
} {
  switch (color?.toLowerCase()) {
    case "gold":
    case "warning":
      return {
        well: "bg-warning-500/15 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400",
        ring: "ring-warning-500/30",
      };
    case "silver":
    case "neutral":
    case "gray":
      return {
        well: "bg-gray-200/70 text-gray-600 dark:bg-dark-500/60 dark:text-dark-200",
        ring: "ring-gray-300/40 dark:ring-dark-500/50",
      };
    case "bronze":
    case "orange":
      return {
        well: "bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
        ring: "ring-orange-500/30",
      };
    case "success":
    case "green":
      return {
        well: "bg-success-500/15 text-success-600 dark:bg-success-500/20 dark:text-success-400",
        ring: "ring-success-500/30",
      };
    case "info":
    case "blue":
      return {
        well: "bg-info-500/15 text-info-600 dark:bg-info-500/20 dark:text-info-400",
        ring: "ring-info-500/30",
      };
    case "primary":
    case "purple":
      return {
        well: "bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400",
        ring: "ring-primary-500/30",
      };
    default:
      return {
        well: "bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400",
        ring: "ring-primary-500/30",
      };
  }
}

/** Format an ISO timestamp as a localized short date (e.g. "Mar 5, 2026"). */
function formatAwardedDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Human-readable label for a badge's criteria type. */
function criteriaLabel(badge: Badge): string {
  switch (badge.criteria.type) {
    case "course_completed":
      return "Complete a course";
    case "lessons_completed":
      return `Complete ${badge.criteria.threshold} lessons`;
    case "quiz_passed":
      return `Pass ${badge.criteria.threshold} quizzes`;
    case "points_earned":
      return `Earn ${badge.criteria.threshold} points`;
    case "streak_days":
      return `${badge.criteria.threshold}-day streak`;
    default:
      return "Meet the criteria";
  }
}

// ----------------------------------------------------------------------

export function BadgeCard({
  badge,
  earned = false,
  awardedAt,
  className,
}: BadgeCardProps) {
  const colors = badgeColorClasses(badge.color);
  const awardedLabel = formatAwardedDate(awardedAt);
  const initials = badge.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Card
      skin="bordered"
      className={clsx(
        "relative flex h-full flex-col gap-3 p-4 transition-opacity",
        earned ? "opacity-100" : "opacity-70",
        className,
      )}
    >
      {/* Icon well */}
      <div className="flex items-start justify-between">
        <div
          className={clsx(
            "relative flex size-14 items-center justify-center overflow-hidden rounded-xl ring-1 ring-inset",
            colors.well,
            colors.ring,
            !earned && "grayscale",
          )}
        >
          {badge.iconUrl ? (
            <img
              src={badge.iconUrl}
              alt=""
              className="size-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl font-bold leading-none">{initials}</span>
          )}

          {/* Lock overlay for unearned badges */}
          {!earned && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-dark-800/60">
              <LockClosedIcon className="size-5 text-gray-500 dark:text-dark-200" />
            </div>
          )}
        </div>

        {earned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-500/10 px-2 py-0.5 text-[11px] font-semibold text-success-600 dark:bg-success-500/15 dark:text-success-400">
            <CheckCircleIcon className="size-3.5 stroke-2" />
            Earned
          </span>
        )}
        {!earned && (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200/70 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-dark-500/60 dark:text-dark-200">
            <LockClosedIcon className="size-3.5 stroke-2" />
            Locked
          </span>
        )}
      </div>

      {/* Name + description */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
          {badge.name}
        </h3>
        {badge.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
            {badge.description}
          </p>
        ) : null}
      </div>

      {/* Footer: criteria hint or awarded date */}
      <div className="mt-auto flex flex-col gap-1.5 border-t border-gray-100 pt-2.5 dark:border-dark-600">
        {earned && awardedLabel ? (
          <p className="text-xs font-medium text-success-600 dark:text-success-400">
            Earned on {awardedLabel}
          </p>
        ) : (
          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-dark-300">
            <SparklesIcon className="size-3.5 shrink-0" />
            {criteriaLabel(badge)}
          </p>
        )}
        {typeof badge.pointsReward === "number" && badge.pointsReward > 0 && (
          <p className="text-[11px] font-medium text-primary-600 dark:text-primary-400">
            +{badge.pointsReward} points
          </p>
        )}
      </div>
    </Card>
  );
}

export default BadgeCard;
