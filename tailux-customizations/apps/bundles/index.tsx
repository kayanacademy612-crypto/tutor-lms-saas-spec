// Bundle listing page — `apps/bundles` route.
//
// Layout: 2-column body (sidebar + main) modeled on the `apps/ecommerce`
// and `apps/instructor-dashboard` patterns.
//
//   Sidebar:
//     - "Browse Bundles" / "My Bundles" nav toggle
//     - Price-range filter (radio: all / under $50 / $50–$100 / $100+)
//     - Footer: promotional card linking to memberships
//
//   Main:
//     - Header strip (breadcrumb + bundle count)
//     - Loading / error / empty states
//     - Responsive grid of `BundleCard`s
//
// Data is fetched from `lmsApi.bundle.list()` via a small local
// `useState + useEffect` wrapper (no useEcommerce hook exists for bundles).

// Import Dependencies
import { ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  Squares2X2Icon,
  BookmarkIcon,
  ShoppingBagIcon,
  GiftIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import { lmsApi } from "@/services/lms-api";
import type { LmsApiError } from "@/services/lms-api";
import type { CourseBundle } from "@/types/lms";

import { BundleCard } from "./BundleCard";

// ----------------------------------------------------------------------

type ScreenId = "browse" | "mine";
type PriceRange = "all" | "under-50" | "50-100" | "over-100";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "browse", label: "Browse Bundles", icon: Squares2X2Icon },
  { id: "mine", label: "My Bundles", icon: BookmarkIcon },
];

const PRICE_RANGES: Array<{ value: PriceRange; label: string }> = [
  { value: "all", label: "All prices" },
  { value: "under-50", label: "Under $50" },
  { value: "50-100", label: "$50 – $100" },
  { value: "over-100", label: "Over $100" },
];

// ----------------------------------------------------------------------

export default function BundlesPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ScreenId>("browse");
  const [priceRange, setPriceRange] = useState<PriceRange>("all");

  // Bundles list state
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);

  const loadBundles = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.bundle.list();
      setBundles(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err as LmsApiError);
      setBundles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBundles();
  }, []);

  /** Apply price-range filter to the bundle list. */
  const filtered = useMemo(() => {
    const activeBundles = bundles.filter((b) => b.isActive);
    if (priceRange === "all") return activeBundles;
    return activeBundles.filter((b) => {
      const dollars = b.priceCents / 100;
      if (priceRange === "under-50") return dollars < 50;
      if (priceRange === "50-100") return dollars >= 50 && dollars <= 100;
      return dollars > 100;
    });
  }, [bundles, priceRange]);

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  /** "Buy Now" routes to the detail page (which has the full checkout flow). */
  const handleBuyNow = (bundle: CourseBundle) => {
    navigate(`/apps/bundles/${bundle.id}`);
  };

  const handleViewDetails = (bundle: CourseBundle) => {
    navigate(`/apps/bundles/${bundle.id}`);
  };

  return (
    <Page title="Bundles">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <GiftIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Course Bundles
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Buy courses together and save up to 40%.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              {filtered.length} available
            </Badge>
            <Button
              variant="outlined"
              color="primary"
              className="gap-1.5"
              onClick={() => navigate("/apps/catalog")}
            >
              <ShoppingBagIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">Browse catalog</span>
            </Button>
          </div>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Bundles navigation">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => setActive(item.id)}
                      className={clsx(
                        "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-5 shrink-0 stroke-2 transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  );
                })}
              </nav>

              {/* Price range filter */}
              {active === "browse" && (
                <div className="border-t border-gray-200 px-3 py-4 dark:border-dark-600">
                  <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
                    <AdjustmentsHorizontalIcon className="size-3.5 stroke-2" />
                    Price range
                  </div>
                  <div className="space-y-1">
                    {PRICE_RANGES.map((p) => {
                      const isActive = p.value === priceRange;
                      return (
                        <Button
                          key={p.value}
                          variant="flat"
                          color={isActive ? "primary" : "neutral"}
                          onClick={() => setPriceRange(p.value)}
                          className={clsx(
                            "w-full justify-start px-3 py-1.5 text-xs font-medium",
                            isActive
                              ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                          )}
                        >
                          {p.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </ScrollShadow>

            {/* Sidebar footer — membership promo */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-secondary-500 to-secondary-600 p-3 text-white dark:from-secondary-600 dark:to-secondary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <GiftIcon className="size-5" />
                  <p className="text-xs font-semibold">Want unlimited access?</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  Memberships unlock every course for one flat monthly price.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-secondary-700 hover:bg-white text-xs"
                  onClick={() => navigate("/apps/memberships")}
                >
                  View memberships
                </Button>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Bundles</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {active === "browse" ? (
                  <BrowseScreen
                    bundles={filtered}
                    loading={loading}
                    error={error}
                    onRetry={loadBundles}
                    onViewDetails={handleViewDetails}
                    onBuyNow={handleBuyNow}
                    onBrowseCatalog={() => navigate("/apps/catalog")}
                  />
                ) : (
                  <MyBundlesScreen
                    onBrowseBundles={() => setActive("browse")}
                  />
                )}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** "Browse Bundles" screen — responsive grid of `BundleCard`s. */
function BrowseScreen({
  bundles,
  loading,
  error,
  onRetry,
  onViewDetails,
  onBuyNow,
  onBrowseCatalog,
}: {
  bundles: CourseBundle[];
  loading: boolean;
  error: LmsApiError | null;
  onRetry: () => void;
  onViewDetails: (b: CourseBundle) => void;
  onBuyNow: (b: CourseBundle) => void;
  onBrowseCatalog: () => void;
}) {
  if (loading) {
    return <LoadingState message="Loading bundles…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (bundles.length === 0) {
    return (
      <EmptyState
        icon={GiftIcon}
        title="No bundles available"
        description="There aren't any bundles matching your filters yet. Try a different price range, or browse individual courses."
        actionLabel="Browse courses"
        onAction={onBrowseCatalog}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {bundles.map((bundle) => (
        <BundleCard
          key={bundle.id}
          bundle={bundle}
          onViewDetails={onViewDetails}
          onBuyNow={onBuyNow}
        />
      ))}
    </div>
  );
}

/** "My Bundles" screen — placeholder until "owned bundles" API exists. */
function MyBundlesScreen({
  onBrowseBundles,
}: {
  onBrowseBundles: () => void;
}) {
  return (
    <EmptyState
      icon={BookmarkIcon}
      title="No bundles purchased yet"
      description="Once you buy a bundle, it will show up here with quick access to every course inside."
      actionLabel="Browse bundles"
      onAction={onBrowseBundles}
    />
  );
}
