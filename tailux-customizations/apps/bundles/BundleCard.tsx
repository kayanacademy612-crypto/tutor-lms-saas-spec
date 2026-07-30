// BundleCard — display card for a single CourseBundle.
//
// Layout:
//   - Top: featured image (or gradient fallback) with course-count badge
//   - Body: bundle name, description, "What's included" course thumbnails
//     (stacked, max 4 with "+N more" overflow)
//   - Price row: original total (strikethrough) → bundle price + savings badge
//   - Footer: "View Details" + "Buy Now" buttons
//
// All money values go through `formatPrice` from `@/components/lms/PriceTag`.

// Import Dependencies
import clsx from "clsx";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { CourseBundle } from "@/types/lms";

// ----------------------------------------------------------------------

export interface BundleCardProps {
  /** Bundle to render. */
  bundle: CourseBundle;
  /** Optional list of course titles for the "What's included" thumbnail stack. */
  courseThumbnails?: Array<{ id: string; title: string; image?: string }>;
  /** Fired when the user clicks "View Details". */
  onViewDetails?: (bundle: CourseBundle) => void;
  /** Fired when the user clicks "Buy Now". */
  onBuyNow?: (bundle: CourseBundle) => void;
  /** Compact layout (smaller image + tighter padding). */
  compact?: boolean;
  /** Extra classes on the root Card. */
  className?: string;
}

/** Computes the savings percentage between bundle price and compare-at. */
function savingsPct(bundle: CourseBundle): number {
  if (!bundle.compareAtCents || bundle.compareAtCents <= bundle.priceCents) {
    return 0;
  }
  return Math.round(
    ((bundle.compareAtCents - bundle.priceCents) / bundle.compareAtCents) * 100,
  );
}

/** Color palette for the stacked-thumbnail fallback initials. */
const STACK_COLORS = [
  "bg-primary-500/15 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
  "bg-secondary-500/15 text-secondary-700 dark:bg-secondary-500/20 dark:text-secondary-300",
  "bg-success-500/15 text-success-700 dark:bg-success-500/20 dark:text-success-300",
  "bg-warning-500/15 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300",
];

/**
 * A single bundle card.
 *
 * Renders the bundle's featured image (or a gradient fallback with the
 * bundle initial), a small horizontal stack of course thumbnails (or
 * colored initials when no thumbnails are supplied), the original total
 * (strikethrough) + bundle price + savings badge, and a footer with
 * "View Details" + "Buy Now" buttons.
 */
export function BundleCard({
  bundle,
  courseThumbnails,
  onViewDetails,
  onBuyNow,
  compact = false,
  className,
}: BundleCardProps) {
  const currency = (bundle.currency ?? "USD").toUpperCase();
  const pct = savingsPct(bundle);
  const courseCount = bundle.courseIds.length;
  const thumbnails = (courseThumbnails ?? []).slice(0, 4);
  const overflowCount = Math.max(0, courseCount - thumbnails.length);

  return (
    <Card
      skin="shadow"
      className={clsx("flex flex-col overflow-hidden p-0", className)}
    >
      {/* Featured image / fallback */}
      <div
        className={clsx(
          "relative flex items-center justify-center bg-gradient-to-br from-primary-500/15 to-secondary-500/20 dark:from-primary-500/15 dark:to-secondary-500/25",
          compact ? "h-28" : "h-40",
        )}
      >
        {bundle.featuredImage ? (
          <img
            src={bundle.featuredImage}
            alt={bundle.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="select-none text-5xl font-bold text-primary-500/60 dark:text-primary-400/60">
            {(bundle.name?.trim()?.[0] || "B").toUpperCase()}
          </span>
        )}

        {/* Course count badge */}
        <div className="absolute left-3 top-3">
          <Badge
            color="neutral"
            variant="soft"
            className="gap-1 bg-white/90 text-xs font-semibold text-gray-800 dark:bg-dark-750/90 dark:text-dark-50"
          >
            <AcademicCapIcon className="size-3.5 stroke-2" />
            {courseCount} course{courseCount === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Savings badge */}
        {pct > 0 && (
          <div className="absolute right-3 top-3">
            <Badge
              color="error"
              variant="filled"
              className="text-[10px] font-bold uppercase tracking-wide"
            >
              Save {pct}%
            </Badge>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Name */}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-dark-50">
          {bundle.name}
        </h3>

        {/* Description */}
        {bundle.description && (
          <p className="line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
            {bundle.description}
          </p>
        )}

        {/* Course thumbnails stack */}
        {!compact && thumbnails.length > 0 && (
          <div className="mt-1">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
              What&apos;s included
            </p>
            <div className="flex -space-x-3">
              {thumbnails.map((t, i) => (
                <div
                  key={t.id}
                  className={clsx(
                    "flex size-9 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-white dark:ring-dark-700",
                    STACK_COLORS[i % STACK_COLORS.length],
                  )}
                  title={t.title}
                >
                  {(t.title?.trim()?.[0] || "?").toUpperCase()}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="flex size-9 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-700 ring-2 ring-white dark:bg-dark-500 dark:text-dark-100 dark:ring-dark-700">
                  +{overflowCount}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-extrabold text-primary-600 dark:text-primary-400">
            {formatPrice(bundle.priceCents, currency)}
          </span>
          {bundle.compareAtCents &&
            bundle.compareAtCents > bundle.priceCents && (
              <span className="text-xs text-gray-400 line-through dark:text-dark-400">
                {formatPrice(bundle.compareAtCents, currency)}
              </span>
            )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            color="neutral"
            variant="outlined"
            className="flex-1 gap-1.5 text-xs font-semibold"
            onClick={() => onViewDetails?.(bundle)}
          >
            View Details
            <ArrowRightIcon className="size-3.5 stroke-2" />
          </Button>
          <Button
            color="primary"
            variant="filled"
            className="flex-1 gap-1.5 text-xs font-semibold"
            onClick={() => onBuyNow?.(bundle)}
          >
            <ShoppingBagIcon className="size-3.5 stroke-2" />
            Buy Now
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default BundleCard;
