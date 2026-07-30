// Tiny inline bar chart — pure divs, no chart library.
//
// Used by the admin DashboardPage for the revenue / signups / tenant-growth
// charts. Each bar's height is proportional to its value relative to the
// max in the dataset; hover tooltip is a `title` attribute on the bar.

// Import Dependencies
import clsx from "clsx";
import { useMemo } from "react";

// Local Imports
import { Card } from "@/components/ui";

// ----------------------------------------------------------------------

export interface MiniBarChartProps {
  /** Bar values — each entry renders one bar. */
  data: Array<{ label: string; value: number; sublabel?: string }>;
  /** Card title. */
  title: string;
  /** Optional description / subtitle. */
  description?: string;
  /** Render `value` formatted as currency. */
  currency?: boolean;
  /** Empty-state message when there's no data. */
  emptyLabel?: string;
  /** Optional extra className on the root Card. */
  className?: string;
}

function formatValue(value: number, currency?: boolean): string {
  if (currency) {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function MiniBarChart({
  data,
  title,
  description,
  currency,
  emptyLabel = "No data yet",
  className,
}: MiniBarChartProps) {
  const max = useMemo(
    () => data.reduce((m, p) => Math.max(m, p.value), 0),
    [data],
  );

  return (
    <Card className={clsx("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {description}
            </p>
          )}
        </div>
        {data.length > 0 && (
          <div className="text-right">
            <p className="text-lg font-semibold leading-tight text-gray-900 dark:text-dark-50">
              {formatValue(
                data.reduce((sum, p) => sum + p.value, 0),
                currency,
              )}
            </p>
            <p className="text-xs text-gray-400 dark:text-dark-400">total</p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400 dark:text-dark-400">
            {emptyLabel}
          </div>
        ) : (
          <div
            className="flex h-32 items-end gap-1.5 overflow-x-auto"
            role="img"
            aria-label={title}
          >
            {data.map((p, i) => {
              const heightPct =
                max > 0 ? Math.max((p.value / max) * 100, 2) : 2;
              return (
                <div
                  key={`${p.label}-${i}`}
                  className="flex min-w-[8px] flex-1 flex-col items-center gap-1"
                  title={`${p.label}: ${formatValue(p.value, currency)}${
                    p.sublabel ? ` · ${p.sublabel}` : ""
                  }`}
                >
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={clsx(
                        "w-full rounded-t-sm transition-all",
                        "bg-primary-500/70 hover:bg-primary-500",
                        "dark:bg-primary-500/60 dark:hover:bg-primary-500",
                      )}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="truncate text-[10px] leading-tight text-gray-400 dark:text-dark-400">
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export default MiniBarChart;
