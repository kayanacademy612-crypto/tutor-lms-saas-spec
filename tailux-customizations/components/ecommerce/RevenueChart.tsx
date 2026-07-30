// Import Dependencies
import clsx from "clsx";
import { BanknotesIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Card, Spinner } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { RevenueReport } from "@/types/lms";

// ----------------------------------------------------------------------

export interface RevenueChartProps {
  /** Revenue report payload. Renders a loading state when null. */
  report: RevenueReport | null;
  /** Force a loading state (e.g. while refetching). */
  loading?: boolean;
  /** ISO 4217 currency code (overrides `report.currency`). */
  currency?: string;
  /** Max number of daily bars to render. Defaults to 30. */
  maxBars?: number;
  /** Extra classes on the root Card. */
  className?: string;
}

/**
 * Lightweight div-based bar chart for the daily revenue time-series.
 *
 * No external chart library is pulled in — each bar is a flex column whose
 * height is computed as a percentage of the peak daily revenue. Bars are
 * labeled with the day-of-month on the X axis; the Y axis is implicit
 * (the tooltip/aria-label carries the actual amount).
 */
export function RevenueChart({
  report,
  loading = false,
  currency,
  maxBars = 30,
  className,
}: RevenueChartProps) {
  const cur = currency ?? report?.currency ?? "USD";

  if (loading || !report) {
    return (
      <Card
        className={clsx(
          "flex min-h-[280px] items-center justify-center p-6",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
          <Spinner className="size-4" />
          Loading revenue…
        </div>
      </Card>
    );
  }

  // Slice the most recent N days, defaulting to an empty array when missing.
  const series = report.dailySeries?.slice(-maxBars) ?? [];
  const peak = series.reduce(
    (max, day) => Math.max(max, day.revenueCents || 0),
    0,
  );

  // Summary numbers shown above the chart.
  const totalRevenue = report.totalRevenueCents ?? 0;
  const totalOrders = report.totalOrders ?? 0;
  const totalRefunds = report.totalRefundsCents ?? 0;
  const netRevenue = report.netRevenueCents ?? 0;

  return (
    <Card className={clsx("p-5", className)}>
      {/* Summary header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
            Revenue (last {series.length} days)
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Net revenue {formatPrice(netRevenue, cur)} after{" "}
            {formatPrice(totalRefunds, cur)} refunded.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <BanknotesIcon className="size-4.5 stroke-2" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
                Gross
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-dark-50">
                {formatPrice(totalRevenue, cur)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-info-500/10 text-info-500 dark:bg-info-500/15 dark:text-info-400">
              <ShoppingBagIcon className="size-4.5 stroke-2" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
                Orders
              </p>
              <p className="text-sm font-bold text-gray-900 dark:text-dark-50">
                {totalOrders.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart body */}
      {series.length === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-dark-600 dark:text-dark-300">
          No revenue data for this period.
        </div>
      ) : (
        <div
          className="flex h-48 items-end justify-between gap-0.5 overflow-x-auto"
          role="img"
          aria-label="Daily revenue bar chart"
        >
          {series.map((day, idx) => {
            const heightPct =
              peak > 0 ? Math.max(((day.revenueCents || 0) / peak) * 100, 2) : 2;
            const dateLabel = new Date(day.date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            const hasRevenue = (day.revenueCents || 0) > 0;

            return (
              <div
                key={`${day.date}-${idx}`}
                className="group relative flex h-full min-w-[6px] flex-1 flex-col items-center justify-end"
                title={`${dateLabel}: ${formatPrice(
                  day.revenueCents || 0,
                  cur,
                )} · ${day.orders ?? 0} orders`}
              >
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block dark:bg-dark-900 dark:text-dark-50">
                  {dateLabel}: {formatPrice(day.revenueCents || 0, cur)}
                  <br />
                  {day.orders ?? 0} order{(day.orders ?? 0) === 1 ? "" : "s"}
                </div>

                {/* Bar */}
                <div
                  className={clsx(
                    "w-full rounded-t-sm transition-colors",
                    hasRevenue
                      ? "bg-primary-500/80 group-hover:bg-primary-600 dark:bg-primary-500/70 dark:group-hover:bg-primary-400"
                      : "bg-gray-200 dark:bg-dark-600",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* X-axis labels (first / middle / last) */}
      {series.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-dark-400">
          <span>
            {new Date(series[0].date).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
          {series.length > 2 && (
            <span>
              {new Date(
                series[Math.floor(series.length / 2)].date,
              ).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <span>
            {new Date(series[series.length - 1].date).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" },
            )}
          </span>
        </div>
      )}
    </Card>
  );
}

export default RevenueChart;
