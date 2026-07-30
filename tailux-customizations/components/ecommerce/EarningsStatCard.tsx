// Import Dependencies
import clsx from "clsx";
import {
  BanknotesIcon,
  WalletIcon,
  ClockIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card, Spinner } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { EarningsSummary } from "@/types/lms";

// ----------------------------------------------------------------------

export interface EarningsStatCardProps {
  /** Earnings summary payload. Renders a loading skeleton when null. */
  summary: EarningsSummary | null;
  /** Show a loading state (spinner overlay) regardless of `summary`. */
  loading?: boolean;
  /** Extra classes on the root grid wrapper. */
  className?: string;
}

interface StatItem {
  key: string;
  label: string;
  value: number;
  icon: typeof BanknotesIcon;
  color: "primary" | "success" | "warning" | "info";
  /** Optional growth percentage to display under the value. */
  growth?: number;
}

const wellColorClass: Record<StatItem["color"], string> = {
  primary:
    "bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400",
  success:
    "bg-success-500/10 text-success-500 dark:bg-success-500/15 dark:text-success-400",
  warning:
    "bg-warning-500/10 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400",
  info: "bg-info-500/10 text-info-500 dark:bg-info-500/15 dark:text-info-400",
};

interface StatTileProps {
  item: StatItem;
  currency: string;
}

function StatTile({ item, currency }: StatTileProps) {
  const Icon = item.icon;
  const growth = item.growth;
  const hasGrowth = typeof growth === "number" && Number.isFinite(growth);
  const isUp = (growth ?? 0) >= 0;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "flex size-11 shrink-0 items-center justify-center rounded-lg",
            wellColorClass[item.color],
          )}
        >
          <Icon className="size-5.5 stroke-2" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-tight text-gray-900 dark:text-dark-50">
            {formatPrice(item.value, currency)}
          </p>
          <p className="truncate text-xs-plus text-gray-500 dark:text-dark-300">
            {item.label}
          </p>
        </div>
      </div>

      {hasGrowth && (
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
            {Math.abs(growth as number).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400 dark:text-dark-400">
            vs last month
          </span>
        </div>
      )}
    </Card>
  );
}

/**
 * 4-up KPI grid for the instructor earnings dashboard.
 *
 * Renders Total Earnings, Available Balance, Pending Withdrawals, and
 * This Month tiles. The This Month tile additionally surfaces the
 * `growthPercent` field as an up/down trend chip (vs last month).
 *
 * When `summary` is null (initial load) or `loading` is true, a single
 * skeleton card with a spinner is rendered in place of the grid.
 */
export function EarningsStatCard({
  summary,
  loading = false,
  className,
}: EarningsStatCardProps) {
  if (loading || !summary) {
    return (
      <Card
        className={clsx(
          "flex min-h-[120px] items-center justify-center p-6",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
          <Spinner className="size-4" />
          Loading earnings…
        </div>
      </Card>
    );
  }

  const currency = summary.currency ?? "USD";

  const items: StatItem[] = [
    {
      key: "total",
      label: "Total Earnings",
      value: summary.totalEarningsCents,
      icon: BanknotesIcon,
      color: "primary",
    },
    {
      key: "available",
      label: "Available Balance",
      value: summary.availableBalanceCents,
      icon: WalletIcon,
      color: "success",
    },
    {
      key: "pending",
      label: "Pending Withdrawals",
      value: summary.pendingBalanceCents,
      icon: ClockIcon,
      color: "warning",
    },
    {
      key: "thisMonth",
      label: "This Month",
      value: summary.thisMonthCents,
      icon: CalendarDaysIcon,
      color: "info",
      growth: summary.growthPercent,
    },
  ];

  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {items.map((item) => (
        <StatTile key={item.key} item={item} currency={currency} />
      ))}
    </div>
  );
}

export default EarningsStatCard;
