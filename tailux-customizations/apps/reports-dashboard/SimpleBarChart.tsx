// SimpleBarChart — lightweight vertical bar chart (no chart library).
//
// Each bar is a flex column whose height is computed as a percentage of the
// peak value. Hovering a bar reveals a tooltip showing the exact value + the
// bar's label. Used by the Reports dashboard for daily-series visualisations
// where a full charting dependency would be overkill.

// Import Dependencies
import { useMemo } from "react";
import clsx from "clsx";

// ----------------------------------------------------------------------

export interface SimpleBarChartDatum {
  /** X-axis label (e.g. "Jul 12" or "Stripe"). */
  label: string;
  /** Numeric value — determines bar height relative to the peak. */
  value: number;
  /** Optional pre-formatted value shown in the hover tooltip (defaults to `value`). */
  formattedValue?: string;
  /** Optional per-bar color override (a tailwind bg-* class). */
  barClassName?: string;
}

export interface SimpleBarChartProps {
  data: SimpleBarChartDatum[];
  /** Tailwind background class applied to every bar (defaults to primary-500). */
  color?: string;
  /** Chart body height in pixels (defaults to 200). */
  height?: number;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Div-based vertical bar chart. Renders nothing when `data` is empty (caller
 * is responsible for showing an `EmptyState`); otherwise lays bars out in a
 * flex row with proportional widths, the peak value driving the Y scale.
 */
export function SimpleBarChart({
  data,
  color = "bg-primary-500/80 dark:bg-primary-500/70",
  height = 200,
  className,
}: SimpleBarChartProps) {
  const peak = useMemo(
    () => data.reduce((max, d) => Math.max(max, Math.abs(d.value) || 0), 0),
    [data],
  );

  if (data.length === 0) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-dark-600 dark:text-dark-300",
          className,
        )}
        style={{ height }}
      >
        No data for this period.
      </div>
    );
  }

  return (
    <div className={clsx("w-full", className)}>
      <div
        className="flex items-end justify-between gap-0.5 overflow-x-auto"
        style={{ height }}
        role="img"
        aria-label="Bar chart"
      >
        {data.map((d, idx) => {
          const heightPct =
            peak > 0 ? Math.max(((Math.abs(d.value) || 0) / peak) * 100, 1.5) : 1.5;
          const hasValue = (Math.abs(d.value) || 0) > 0;
          const tooltipValue = d.formattedValue ?? String(d.value);

          return (
            <div
              key={`${d.label}-${idx}`}
              className="group relative flex h-full min-w-[6px] flex-1 flex-col items-center justify-end"
              title={`${d.label}: ${tooltipValue}`}
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg group-hover:block dark:bg-dark-900 dark:text-dark-50">
                <span className="text-white/70">{d.label}</span>: {tooltipValue}
              </div>

              {/* Bar */}
              <div
                className={clsx(
                  "w-full rounded-t-sm transition-colors",
                  d.barClassName ?? (hasValue ? color : "bg-gray-200 dark:bg-dark-600"),
                  !hasValue && "opacity-60",
                )}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels (first / middle / last) */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-dark-400">
        <span className="truncate">{data[0].label}</span>
        {data.length > 2 && (
          <span className="truncate">
            {data[Math.floor(data.length / 2)].label}
          </span>
        )}
        <span className="truncate">{data[data.length - 1].label}</span>
      </div>
    </div>
  );
}

export default SimpleBarChart;
