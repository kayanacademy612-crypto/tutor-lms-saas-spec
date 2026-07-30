// KpiCard — reusable key-performance-indicator card for the School Admin
// dashboard.
//
// Renders a labelled value with an optional heroicon (top-right tinted well)
// and an optional signed trend percentage (green up arrow / red down arrow).
// Mirrors the visual language of the Reports dashboard `KpiCard` but uses the
// prop names called out in the SAAS-6 task spec (`trend?` and `color?`).

// Import Dependencies
import { ComponentType, ReactNode } from "react";
import clsx from "clsx";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";
import type { ColorType } from "@/constants/app";

// ----------------------------------------------------------------------

export interface KpiCardProps {
  /** Caption rendered above the value. */
  label: string;
  /** Primary stat value (string so callers control formatting). */
  value: ReactNode;
  /** Optional heroicon rendered in the top-right well. */
  icon?: ComponentType<{ className?: string }>;
  /** Optional signed trend percentage — positive renders green-up, negative red-down. */
  trend?: number;
  /** Optional color theme for the icon well (defaults to `primary`). */
  color?: ColorType;
  /** Optional secondary caption rendered beneath the value. */
  subtitle?: ReactNode;
  /** Extra classes on the root Card. */
  className?: string;
}

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
 * Compact KPI card with optional trend indicator + icon. Composes cleanly in
 * a 6-up grid on the School Admin dashboard.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  color = "primary",
  subtitle,
  className,
}: KpiCardProps) {
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const isUp = (trend ?? 0) >= 0;

  return (
    <Card className={clsx("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold leading-tight text-gray-900 dark:text-dark-50">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-300">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={clsx(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              wellClass[color],
            )}
          >
            <Icon className="size-5 stroke-2" />
          </div>
        )}
      </div>

      {hasTrend && (
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
            {Math.abs(trend as number).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400 dark:text-dark-400">
            vs previous period
          </span>
        </div>
      )}
    </Card>
  );
}

export default KpiCard;
