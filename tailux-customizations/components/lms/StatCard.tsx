// Import Dependencies
import clsx from "clsx";
import { ComponentType, ReactNode } from "react";
import {
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";
import { ColorType } from "@/constants/app";

// ----------------------------------------------------------------------

export interface StatTrend {
  /** Signed percentage delta, e.g. `12.4` for +12.4%. */
  value: number;
  /** Optional label rendered after the delta (e.g. "vs last week"). */
  label?: string;
}

export interface StatCardProps {
  /** Heroicon component rendered in the tinted well. */
  icon: ComponentType<{ className?: string }>;
  /** Primary stat value (string so callers control formatting). */
  value: ReactNode;
  /** Caption rendered beneath the value. */
  label: string;
  /** Optional trend indicator. */
  trend?: StatTrend;
  /** Color theme for the icon well. */
  color?: ColorType;
  /** Extra classes on the root Card. */
  className?: string;
}

// Map semantic colors → tailwind tint classes (used for the icon well only,
// since `Card` does not accept a color prop).
const wellClass: Record<ColorType, string> = {
  primary:
    "bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400",
  secondary:
    "bg-secondary-500/10 text-secondary-500 dark:bg-secondary-500/15 dark:text-secondary-400",
  info: "bg-info-500/10 text-info-500 dark:bg-info-500/15 dark:text-info-400",
  success:
    "bg-success-500/10 text-success-500 dark:bg-success-500/15 dark:text-success-400",
  warning:
    "bg-warning-500/10 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400",
  error:
    "bg-error-500/10 text-error-500 dark:bg-error-500/15 dark:text-error-400",
  neutral:
    "bg-gray-200/70 text-gray-600 dark:bg-dark-500/50 dark:text-dark-200",
};

/**
 * Compact KPI/stat card.
 *
 * Layout: icon well on the left, value + label stack on the right, optional
 * trend chip aligned to the bottom-right. Sits on a `Card` so it inherits the
 * active skin (bordered/shadow) from the theme context.
 */
export function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  color = "primary",
  className,
}: StatCardProps) {
  const isUp = (trend?.value ?? 0) >= 0;

  return (
    <Card className={clsx("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              wellClass[color],
            )}
          >
            <Icon className="size-5.5 stroke-2" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-semibold leading-tight text-gray-900 dark:text-dark-50">
              {value}
            </p>
            <p className="truncate text-xs-plus text-gray-500 dark:text-dark-300">
              {label}
            </p>
          </div>
        </div>
      </div>

      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={clsx(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              isUp
                ? "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                : "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
            )}
          >
            {isUp ? (
              <ArrowUpIcon className="size-3 stroke-2" />
            ) : (
              <ArrowDownIcon className="size-3 stroke-2" />
            )}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
          {trend.label && (
            <span className="text-xs text-gray-400 dark:text-dark-400">
              {trend.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export default StatCard;
