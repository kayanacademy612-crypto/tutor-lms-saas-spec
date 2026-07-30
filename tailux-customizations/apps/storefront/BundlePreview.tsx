// Storefront "Bundle offers" section.
//
// Renders 2-3 featured course bundles as horizontal promo cards with
// stacked course thumbnails, original total price (strikethrough),
// bundle price, and a savings badge. CTAs link to /apps/bundles and
// /apps/bundles/:id.

// Import Dependencies
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowRightIcon,
  GiftIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { CourseBundle } from "@/types/lms";

// ----------------------------------------------------------------------

export interface BundlePreviewProps {
  /** Bundles to render (already active-sorted). */
  bundles: CourseBundle[];
  /** Render skeleton placeholders when true. */
  loading?: boolean;
  /** Maximum number of bundles to feature. */
  limit?: number;
}

/** Computes the savings percentage between `priceCents` and `compareAtCents`. */
function savingsPct(bundle: CourseBundle): number {
  if (!bundle.compareAtCents || bundle.compareAtCents <= bundle.priceCents) {
    return 0;
  }
  return Math.round(
    ((bundle.compareAtCents - bundle.priceCents) / bundle.compareAtCents) * 100,
  );
}

/** A single skeleton bundle card. */
function SkeletonCard() {
  return (
    <Card className="h-44 animate-pulse p-5" skin="bordered">
      <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-dark-500" />
      <div className="mt-3 h-6 w-3/4 rounded bg-gray-200 dark:bg-dark-500" />
      <div className="mt-4 h-3 w-1/2 rounded bg-gray-200 dark:bg-dark-500" />
      <div className="mt-6 h-9 w-32 rounded bg-gray-200 dark:bg-dark-500" />
    </Card>
  );
}

/**
 * Featured-bundles preview. Renders a header ("Bundle & Save") and a
 * responsive grid of `BundlePromoCard`s. The first card is highlighted
 * with a primary tint. Returns null when there are no bundles and not
 * loading so the storefront can collapse the section cleanly.
 */
export function BundlePreview({
  bundles,
  loading = false,
  limit = 3,
}: BundlePreviewProps) {
  const navigate = useNavigate();
  const active = bundles
    .filter((b) => b.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .slice(0, limit);

  if (!loading && active.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-secondary-500/10 px-3 py-1 text-xs font-semibold text-secondary-700 dark:bg-secondary-500/15 dark:text-secondary-300">
            <GiftIcon className="size-3.5 stroke-2" />
            Bundles
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-50">
            Bundle &amp; Save
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Buy courses together and save up to 40% off the individual prices.
          </p>
        </div>
        <Button
          color="primary"
          variant="flat"
          className="gap-1.5 text-sm font-semibold"
          onClick={() => navigate("/apps/bundles")}
        >
          All bundles
          <ArrowRightIcon className="size-4 stroke-2" />
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {active.map((bundle, idx) => (
            <BundlePromoCard
              key={bundle.id}
              bundle={bundle}
              highlight={idx === 0}
              onBuy={() => navigate(`/apps/bundles/${bundle.id}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Compact horizontal promo card for a bundle. */
function BundlePromoCard({
  bundle,
  highlight,
  onBuy,
}: {
  bundle: CourseBundle;
  highlight: boolean;
  onBuy: () => void;
}) {
  const currency = (bundle.currency ?? "USD").toUpperCase();
  const pct = savingsPct(bundle);
  const courseCount = bundle.courseIds.length;

  return (
    <Card
      skin={highlight ? "shadow" : "bordered"}
      className={clsx(
        "flex flex-col p-5",
        highlight && "ring-1 ring-primary-500/40 dark:ring-primary-400/40",
      )}
    >
      {/* Top row: course count + savings badge */}
      <div className="flex items-center justify-between">
        <Badge
          color="neutral"
          variant="soft"
          className="gap-1 text-[10px] uppercase tracking-wide"
        >
          <AcademicCapIcon className="size-3 stroke-2" />
          {courseCount} course{courseCount === 1 ? "" : "s"}
        </Badge>
        {pct > 0 && (
          <Badge color="error" variant="soft" className="text-[10px] font-bold">
            Save {pct}%
          </Badge>
        )}
      </div>

      {/* Bundle name */}
      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-gray-900 dark:text-dark-50">
        {bundle.name}
      </h3>

      {/* Description */}
      {bundle.description && (
        <p className="mt-1.5 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
          {bundle.description}
        </p>
      )}

      {/* Price row */}
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
          {formatPrice(bundle.priceCents, currency)}
        </span>
        {bundle.compareAtCents &&
          bundle.compareAtCents > bundle.priceCents && (
            <span className="text-sm text-gray-400 line-through dark:text-dark-400">
              {formatPrice(bundle.compareAtCents, currency)}
            </span>
          )}
      </div>

      {/* CTA */}
      <div className="mt-auto pt-5">
        <Button
          color={highlight ? "primary" : "neutral"}
          variant={highlight ? "filled" : "soft"}
          className="w-full gap-1.5 text-sm font-semibold"
          onClick={onBuy}
        >
          View bundle
          <ArrowRightIcon className="size-4 stroke-2" />
        </Button>
      </div>
    </Card>
  );
}

export default BundlePreview;
