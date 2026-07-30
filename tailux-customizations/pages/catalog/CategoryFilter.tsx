// CategoryFilter — sidebar component for the Course Catalog.
//
// Lets users narrow the course grid by:
//   - category (multi-select, derived from `categories` prop)
//   - difficulty (single-select radio: all / beginner / intermediate / advanced)
//   - price (single-select radio: all / free / paid)
//   - rating (single-select radio: all / 4+ / 4.5+)
//
// Uses ONLY tailux controls (`Checkbox`, `Radio` from `@/components/ui/Form`)
// — no raw `<input>` elements. All state is lifted to the parent via the
// `CatalogFilters` shape + change handlers.

// Import Dependencies
import { ComponentType } from "react";
import clsx from "clsx";
import {
  FunnelIcon,
  ArrowPathIcon,
  Squares2X2Icon,
  CurrencyDollarIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, ScrollShadow } from "@/components/ui";
import { Checkbox, Radio } from "@/components/ui/Form";
import type { CourseDifficulty } from "@/types/lms";

// ----------------------------------------------------------------------

export type PriceFilter = "all" | "free" | "paid";
export type RatingFilter = "all" | "4+" | "4.5+";

export interface CatalogFilters {
  /** Selected category IDs. */
  categories: string[];
  /** Selected difficulty, or `"all"`. */
  difficulty: CourseDifficulty | "all";
  /** Selected price filter. */
  price: PriceFilter;
  /** Selected rating filter. */
  rating: RatingFilter;
}

export interface CategoryFilterProps {
  /** Available categories (id + name). */
  categories: { id: string; name: string; courseCount?: number }[];
  /** Current filter state. */
  filters: CatalogFilters;
  /** Called whenever any filter value changes. */
  onChange: (next: Partial<CatalogFilters>) => void;
  /** Reset every filter to its default. */
  onReset: () => void;
  /** Optional class on the wrapper. */
  className?: string;
}

// ----------------------------------------------------------------------

const DIFFICULTY_OPTIONS: {
  value: CourseDifficulty | "all";
  label: string;
}[] = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All Prices" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "Any Rating" },
  { value: "4+", label: "4.0 & up" },
  { value: "4.5+", label: "4.5 & up" },
];

// ----------------------------------------------------------------------

/** Small section header used by every filter group. */
function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-primary-500 dark:text-primary-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-dark-200">
          {title}
        </h3>
      </div>
      {action}
    </div>
  );
}

/**
 * Sidebar filter component for the catalog.
 *
 * Layout: header (title + reset) → scrollable list of filter groups
 * (Category → Difficulty → Price → Rating) → footer summary.
 */
export function CategoryFilter({
  categories,
  filters,
  onChange,
  onReset,
  className,
}: CategoryFilterProps) {
  const toggleCategory = (id: string) => {
    const set = new Set(filters.categories);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ categories: Array.from(set) });
  };

  const activeCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.difficulty !== "all" ? 1 : 0) +
    (filters.price !== "all" ? 1 : 0) +
    (filters.rating !== "all" ? 1 : 0);

  return (
    <Card
      skin="bordered"
      className={clsx("flex h-full flex-col overflow-hidden p-0", className)}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-dark-600">
        <div className="flex items-center gap-2">
          <FunnelIcon className="size-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Filters
          </h2>
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <Button
          variant="flat"
          color="primary"
          onClick={onReset}
          className="gap-1.5 px-2 py-1 text-xs"
          disabled={activeCount === 0}
        >
          <ArrowPathIcon className="size-3.5" />
          Reset
        </Button>
      </div>

      {/* Body */}
      <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
        <div className="space-y-5 px-4 py-4">
          {/* Category */}
          <section>
            <SectionHeader
              icon={Squares2X2Icon}
              title="Category"
            />
            {categories.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-dark-400">
                No categories available.
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => {
                  const checked = filters.categories.includes(cat.id);
                  return (
                    <Checkbox
                      key={cat.id}
                      id={`cat-${cat.id}`}
                      label={
                        <span className="flex w-full items-center justify-between">
                          <span className="truncate text-sm text-gray-700 dark:text-dark-100">
                            {cat.name}
                          </span>
                          {typeof cat.courseCount === "number" && (
                            <span className="ml-2 shrink-0 text-xs text-gray-400 dark:text-dark-400">
                              {cat.courseCount}
                            </span>
                          )}
                        </span>
                      }
                      checked={checked}
                      onChange={() => toggleCategory(cat.id)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Difficulty */}
          <section>
            <SectionHeader icon={AdjustmentsHorizontalIcon} title="Difficulty" />
            <div className="space-y-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <Radio
                  key={opt.value}
                  id={`diff-${opt.value}`}
                  name="catalog-difficulty"
                  value={opt.value}
                  label={
                    <span className="text-sm text-gray-700 dark:text-dark-100">
                      {opt.label}
                    </span>
                  }
                  checked={filters.difficulty === opt.value}
                  onChange={() => onChange({ difficulty: opt.value })}
                />
              ))}
            </div>
          </section>

          {/* Price */}
          <section>
            <SectionHeader icon={CurrencyDollarIcon} title="Price" />
            <div className="space-y-2">
              {PRICE_OPTIONS.map((opt) => (
                <Radio
                  key={opt.value}
                  id={`price-${opt.value}`}
                  name="catalog-price"
                  value={opt.value}
                  label={
                    <span className="text-sm text-gray-700 dark:text-dark-100">
                      {opt.label}
                    </span>
                  }
                  checked={filters.price === opt.value}
                  onChange={() => onChange({ price: opt.value })}
                />
              ))}
            </div>
          </section>

          {/* Rating */}
          <section>
            <SectionHeader icon={StarIcon} title="Rating" />
            <div className="space-y-2">
              {RATING_OPTIONS.map((opt) => (
                <Radio
                  key={opt.value}
                  id={`rating-${opt.value}`}
                  name="catalog-rating"
                  value={opt.value}
                  label={
                    <span className="text-sm text-gray-700 dark:text-dark-100">
                      {opt.label}
                    </span>
                  }
                  checked={filters.rating === opt.value}
                  onChange={() => onChange({ rating: opt.value })}
                />
              ))}
            </div>
          </section>
        </div>
      </ScrollShadow>
    </Card>
  );
}

export default CategoryFilter;
