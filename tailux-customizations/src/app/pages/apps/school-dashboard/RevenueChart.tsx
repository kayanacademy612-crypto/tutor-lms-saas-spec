// RevenueChart — lightweight div-based daily revenue bar chart (no chart
// library) for the School Admin dashboard.
//
// Each bar is a flex column whose height is computed as a percentage of the
// peak daily revenue. Bars carry a hover tooltip showing the exact revenue +
// enrollment count for that day. The X axis shows first / middle / last date
// labels.

// Import Dependencies
import clsx from "clsx";

// Local Imports
import { formatPrice } from "@/components/lms";

// ----------------------------------------------------------------------

export interface RevenueChartDatum {
  /** ISO date string (e.g. "2025-07-12"). */
  date: string;
  /** Daily revenue in minor currency units (cents). */
  revenueCents: number;
  /** Daily enrollment count. */
  enrollments: number;
}

export interface RevenueChartProps {
  /** Daily series — bars are rendered left → right in array order. */
  data: RevenueChartDatum[];
  /** Chart body height in pixels (defaults to 220). */
  height?: number;
  /** Max number of bars to render from the tail (defaults to 30). */
  maxBars?: number;
  /** Extra classes on the root wrapper. */
  className?: string;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Div-based vertical bar chart for daily revenue. Renders nothing but a
 * friendly placeholder when `data` is empty — the caller is expected to
 * handle loading / error states separately.
 */
export function RevenueChart({
  data,
  height = 220,
  maxBars = 30,
  className,
}: RevenueChartProps) {
  const series = data.slice(-maxBars);
  const peak = series.reduce(
    (max, d) => Math.max(max, Math.abs(d.revenueCents) || 0),
    0,
  );

  return (
    <div className={clsx("w-full", className)}>
      {series.length === 0 ? (
        <div
          className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-dark-600 dark:text-dark-300"
          style={{ height }}
        >
          No revenue data for this period.
        </div>
      ) : (
        <>
          <div
            className="flex items-end justify-between gap-0.5 overflow-x-auto"
            style={{ height }}
            role="img"
            aria-label="Daily revenue bar chart"
          >
            {series.map((d, idx) => {
              const heightPct =
                peak > 0
                  ? Math.max(((Math.abs(d.revenueCents) || 0) / peak) * 100, 1.5)
                  : 1.5;
              const hasRevenue = (d.revenueCents || 0) > 0;
              const label = dateLabel(d.date);
              return (
                <div
                  key={`${d.date}-${idx}`}
                  className="group relative flex h-full min-w-[6px] flex-1 flex-col items-center justify-end"
                  title={`${label}: ${formatPrice(d.revenueCents)} · ${d.enrollments} enrollment${d.enrollments === 1 ? "" : "s"}`}
                >
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block dark:bg-dark-900 dark:text-dark-50">
                    <span className="text-white/70">{label}</span>
                    <br />
                    {formatPrice(d.revenueCents)}
                    <br />
                    {d.enrollments} enrollment{d.enrollments === 1 ? "" : "s"}
                  </div>

                  {/* Bar */}
                  <div
                    className={clsx(
                      "w-full rounded-t-sm transition-colors",
                      hasRevenue
                        ? "bg-primary-500/80 group-hover:bg-primary-600 dark:bg-primary-500/70 dark:group-hover:bg-primary-400"
                        : "bg-gray-200 dark:bg-dark-600 opacity-60",
                    )}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels (first / middle / last) */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-dark-400">
            <span className="truncate">{dateLabel(series[0].date)}</span>
            {series.length > 2 && (
              <span className="truncate">
                {dateLabel(series[Math.floor(series.length / 2)].date)}
              </span>
            )}
            <span className="truncate">
              {dateLabel(series[series.length - 1].date)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default RevenueChart;
