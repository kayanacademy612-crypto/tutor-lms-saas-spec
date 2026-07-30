// Bundle detail page — `apps/bundles/:id` route.
//
// Layout: single column with header strip + 2-column body (main + rail).
//
//   Main:
//     - Bundle header (featured image, name, description, course count)
//     - "What's Included" — list of all courses in the bundle with
//       thumbnails + titles + durations
//
//   Rail:
//     - Price summary card (original total, bundle price, savings)
//     - "Add to Cart" + "Buy Now" buttons
//     - Bundle meta (course count, billing, access)
//
// The bundle API exposes `list()` but not `get(id)`, so this page fetches
// the full list and finds the bundle by id. Courses are resolved from
// `useCourses()` so we can show titles/durations/thumbnails.
//
// `useAddToCart` is used with `itemType: 'bundle'` to add the bundle to
// the cart. "Buy Now" adds the bundle then navigates to `/apps/ecommerce`
// for checkout.

// Import Dependencies
import { ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  ShoppingBagIcon,
  CheckIcon,
  AcademicCapIcon,
  ClockIcon,
  PlayCircleIcon,
  GiftIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, ScrollShadow } from "@/components/ui";
import {
  CourseThumbnail,
  LoadingState,
  ErrorState,
  EmptyState,
  formatPrice,
} from "@/components/lms";
import { lmsApi } from "@/services/lms-api";
import type { LmsApiError } from "@/services/lms-api";
import { useCourses } from "@/hooks/useLms";
import { useAddToCart } from "@/hooks/useEcommerce";
import type { CourseBundle, Course } from "@/types/lms";

// ----------------------------------------------------------------------

/** Format a duration in seconds as `Xh Ym` / `Ym` / `Xh`. */
function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const totalMin = Math.round(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ----------------------------------------------------------------------

export default function BundleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Bundle list (we look up the bundle by id from the list endpoint — the
  // API does not expose a single-bundle GET yet).
  const [bundle, setBundle] = useState<CourseBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);

  // Courses (so we can resolve titles / thumbnails / durations)
  const { data: courses } = useCourses();

  // Add-to-cart mutation
  const { mutate: addToCart, loading: adding, error: addError } = useAddToCart();

  const loadBundle = async () => {
    if (!id) {
      setError({ message: "Missing bundle id." } as LmsApiError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.bundle.list();
      const list = Array.isArray(result) ? result : [];
      const found = list.find((b) => b.id === id) ?? null;
      setBundle(found);
      if (!found) {
        setError({ message: "Bundle not found." } as LmsApiError);
      }
    } catch (err) {
      setError(err as LmsApiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Resolve the courses that belong to this bundle. */
  const bundleCourses: Course[] = useMemo(() => {
    if (!bundle || !courses) return [];
    const byId = new Map(courses.map((c) => [c.id, c]));
    return bundle.courseIds
      .map((cid) => byId.get(cid))
      .filter((c): c is Course => Boolean(c));
  }, [bundle, courses]);

  // ───────────────── Handlers ─────────────────

  const handleAddToCart = async () => {
    if (!bundle) return;
    await addToCart({ itemType: "bundle", referenceId: bundle.id });
  };

  const handleBuyNow = async () => {
    if (!bundle) return;
    await addToCart({ itemType: "bundle", referenceId: bundle.id });
    navigate("/apps/ecommerce");
  };

  // ───────────────── Render ─────────────────

  const currency = (bundle?.currency ?? "USD").toUpperCase();
  const originalTotal =
    bundle?.compareAtCents ??
    bundleCourses.reduce((sum, c) => sum + c.priceCents, 0);
  const savings =
    bundle && originalTotal > bundle.priceCents
      ? originalTotal - bundle.priceCents
      : 0;
  const savingsPct =
    originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  return (
    <Page title="Bundle Details">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-9"
              onClick={() => navigate("/apps/bundles")}
              aria-label="Back to bundles"
            >
              <ArrowLeftIcon className="size-5 stroke-2" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                {bundle?.name ?? "Bundle details"}
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {bundle
                  ? `${bundle.courseIds.length} courses included`
                  : "Loading bundle…"}
              </p>
            </div>
          </div>
          <Button
            variant="outlined"
            color="primary"
            className="gap-1.5"
            onClick={() => navigate("/apps/bundles")}
          >
            <GiftIcon className="size-4 stroke-2" />
            <span className="hidden sm:inline">All bundles</span>
          </Button>
        </header>

        {/* Body */}
        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            {loading ? (
              <LoadingState message="Loading bundle…" />
            ) : error ? (
              <ErrorState
                error={error}
                onRetry={loadBundle}
                retryLabel="Try again"
              />
            ) : !bundle ? (
              <EmptyState
                icon={GiftIcon}
                title="Bundle not found"
                description="This bundle may have been removed or is no longer available."
                actionLabel="Browse all bundles"
                onAction={() => navigate("/apps/bundles")}
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* ───────── Main column ───────── */}
                <div className="space-y-6">
                  {/* Bundle header */}
                  <Card skin="shadow" className="overflow-hidden p-0">
                    <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-primary-500/15 to-secondary-500/20 dark:from-primary-500/15 dark:to-secondary-500/25">
                      {bundle.featuredImage ? (
                        <img
                          src={bundle.featuredImage}
                          alt={bundle.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <span className="select-none text-6xl font-bold text-primary-500/60 dark:text-primary-400/60">
                          {(bundle.name?.trim()?.[0] || "B").toUpperCase()}
                        </span>
                      )}
                      <div className="absolute left-4 top-4 flex gap-2">
                        <Badge
                          color="primary"
                          variant="filled"
                          className="gap-1"
                        >
                          <GiftIcon className="size-3.5 stroke-2" />
                          Bundle
                        </Badge>
                        {bundle.courseIds.length > 0 && (
                          <Badge
                            color="neutral"
                            variant="soft"
                            className="gap-1 bg-white/90 text-gray-800 dark:bg-dark-750/90 dark:text-dark-50"
                          >
                            <AcademicCapIcon className="size-3.5 stroke-2" />
                            {bundle.courseIds.length} courses
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">
                        {bundle.name}
                      </h2>
                      {bundle.description && (
                        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                          {bundle.description}
                        </p>
                      )}

                      {/* Bundle highlights */}
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-dark-300">
                        <span className="inline-flex items-center gap-1.5">
                          <AcademicCapIcon className="size-4 text-primary-500 dark:text-primary-400" />
                          {bundleCourses.length} of {bundle.courseIds.length}{" "}
                          courses published
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <PlayCircleIcon className="size-4 text-primary-500 dark:text-primary-400" />
                          Lifetime access
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <CheckIcon className="size-4 text-success-500 dark:text-success-400" />
                          Certificate on completion
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* What's included */}
                  <Card skin="bordered" className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <AcademicCapIcon className="size-5 text-primary-500 dark:text-primary-400" />
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                        What&apos;s included
                      </h3>
                    </div>

                    {bundleCourses.length === 0 ? (
                      <p className="rounded-md bg-gray-50 p-4 text-xs text-gray-500 dark:bg-dark-600 dark:text-dark-300">
                        Course details for this bundle aren&apos;t available
                        yet. The bundle still grants access to all included
                        courses on purchase.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-100 dark:divide-dark-600">
                        {bundleCourses.map((course, idx) => {
                          const duration = formatDuration(
                            course.durationSeconds,
                          );
                          return (
                            <li
                              key={course.id}
                              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                              <span className="size-6 shrink-0 text-xs font-bold text-gray-400 dark:text-dark-400">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <CourseThumbnail
                                url={course.featuredImage}
                                title={course.title}
                                size="xs"
                                rounded="rounded-md"
                                className="shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-medium text-gray-800 dark:text-dark-100">
                                  {course.title}
                                </p>
                                <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-dark-300">
                                  {course.difficulty && (
                                    <span className="capitalize">
                                      {course.difficulty}
                                    </span>
                                  )}
                                  {duration && (
                                    <span className="inline-flex items-center gap-1">
                                      <ClockIcon className="size-3.5" />
                                      {duration}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1">
                                    <AcademicCapIcon className="size-3.5" />
                                    {course.enrolledCount.toLocaleString()}{" "}
                                    students
                                  </span>
                                </div>
                              </div>
                              <span className="shrink-0 text-xs font-semibold text-gray-700 dark:text-dark-100">
                                {formatPrice(course.priceCents, currency)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </Card>
                </div>

                {/* ───────── Rail column ───────── */}
                <aside className="space-y-4">
                  {/* Price summary card */}
                  <Card skin="shadow" className="sticky top-6 p-5">
                    <div className="space-y-3">
                      {/* Original total */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-dark-300">
                          Original total
                        </span>
                        <span className="text-gray-500 line-through dark:text-dark-300">
                          {formatPrice(originalTotal, currency)}
                        </span>
                      </div>

                      {/* Bundle price */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-dark-300">
                          Bundle price
                        </span>
                        <span className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                          {formatPrice(bundle.priceCents, currency)}
                        </span>
                      </div>

                      {/* Savings */}
                      {savings > 0 && (
                        <div className="flex items-center justify-between rounded-md bg-success-500/10 px-3 py-2 text-sm dark:bg-success-500/15">
                          <span className="inline-flex items-center gap-1.5 text-success-700 dark:text-success-400">
                            <SparklesIcon className="size-4 stroke-2" />
                            You save
                          </span>
                          <span className="font-bold text-success-700 dark:text-success-400">
                            {formatPrice(savings, currency)} ({savingsPct}%)
                          </span>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="my-2 border-t border-gray-200 dark:border-dark-600" />

                      {/* CTAs */}
                      <Button
                        color="primary"
                        variant="filled"
                        className="w-full gap-1.5 text-sm font-semibold"
                        onClick={handleAddToCart}
                        disabled={adding}
                      >
                        <ShoppingBagIcon className="size-4 stroke-2" />
                        {adding ? "Adding…" : "Add to Cart"}
                      </Button>
                      <Button
                        color="neutral"
                        variant="outlined"
                        className="w-full gap-1.5 text-sm font-semibold"
                        onClick={handleBuyNow}
                        disabled={adding}
                      >
                        Buy Now
                      </Button>

                      {addError && (
                        <p className="text-center text-xs text-error-500 dark:text-error-400">
                          Couldn&apos;t add to cart. Please try again.
                        </p>
                      )}

                      {/* Reassurance line */}
                      <p className="pt-1 text-center text-[11px] text-gray-400 dark:text-dark-400">
                        30-day money-back guarantee · Lifetime access
                      </p>
                    </div>
                  </Card>

                  {/* Bundle meta */}
                  <Card skin="bordered" className="p-5">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
                      Bundle includes
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-dark-100">
                      <MetaRow
                        icon={AcademicCapIcon}
                        label="Courses"
                        value={`${bundle.courseIds.length}`}
                      />
                      <MetaRow
                        icon={PlayCircleIcon}
                        label="Access"
                        value="Lifetime"
                      />
                      <MetaRow
                        icon={CheckIcon}
                        label="Certificates"
                        value="Included"
                      />
                    </ul>
                  </Card>
                </aside>
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}

/** Small labeled meta row with an icon. */
function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-2 text-gray-500 dark:text-dark-300">
        <Icon
          className={clsx(
            "size-4 stroke-2 text-primary-500 dark:text-primary-400",
          )}
        />
        {label}
      </span>
      <span className="font-medium text-gray-800 dark:text-dark-50">
        {value}
      </span>
    </li>
  );
}

// ----------------------------------------------------------------------
