// OverviewTab — top-line KPI overview for the Reports dashboard.
//
// Renders 6 KPI cards (Total Revenue, Net Revenue, Total Orders, Total
// Enrollments, Completion Rate, Avg Rating) + a dual-axis revenue +
// enrollments bar chart over the last 30 days, and a recent-activity feed
// showing the latest orders + enrollments derived from `dailySeries`.

// Import Dependencies
import { useMemo } from "react";
import {
  BanknotesIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  CheckBadgeIcon,
  StarIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState, formatPrice } from "@/components/lms";
import { useOverviewReport } from "@/hooks/useReportsAI";
import type { ReportFilters } from "@/types/lms";
import { KpiCard } from "./KpiCard";
import { SimpleBarChart } from "./SimpleBarChart";

// ----------------------------------------------------------------------

export interface OverviewTabProps {
  filters: ReportFilters;
}

/** Formats a 0..1 ratio as a `XX.X%` string. */
function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * KPI overview panel — the default landing tab on the Reports dashboard.
 * Uses `useOverviewReport(filters)` (the canonical Phase 6 report hook).
 */
export function OverviewTab({ filters }: OverviewTabProps) {
  const { data, loading, error, refetch } = useOverviewReport(filters);

  // Build the chart series (last 30 days of revenue + enrollments).
  const chartData = useMemo(() => {
    if (!data?.dailySeries) return [];
    return data.dailySeries.slice(-30).map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: d.revenueCents,
      formattedValue: formatPrice(d.revenueCents),
    }));
  }, [data]);

  // Recent activity feed (latest 8 daily-series entries with orders/enrollments).
  const activity = useMemo(() => {
    if (!data?.dailySeries) return [];
    return data.dailySeries
      .slice()
      .reverse()
      .filter((d) => d.orders > 0 || d.enrollments > 0)
      .slice(0, 8);
  }, [data]);

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading overview…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={ChartBarIcon}
          title="No overview data"
          description="Overview metrics will appear here once orders + enrollments start coming in."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Revenue"
          value={formatPrice(data.totalRevenueCents)}
          growth={data.revenueGrowth}
          icon={CurrencyDollarIcon}
          color="primary"
          subtitle={`Refunds ${formatPrice(data.totalRefundsCents)}`}
        />
        <KpiCard
          label="Net Revenue"
          value={formatPrice(data.netRevenueCents)}
          growth={data.revenueGrowth}
          icon={BanknotesIcon}
          color="success"
          subtitle="After refunds"
        />
        <KpiCard
          label="Total Orders"
          value={data.totalOrders.toLocaleString()}
          growth={data.revenueGrowth}
          icon={ShoppingBagIcon}
          color="info"
        />
        <KpiCard
          label="Total Enrollments"
          value={data.totalEnrollments.toLocaleString()}
          growth={data.enrollmentGrowth}
          icon={AcademicCapIcon}
          color="secondary"
        />
        <KpiCard
          label="Completion Rate"
          value={pct(data.completionRate)}
          icon={CheckBadgeIcon}
          color="warning"
        />
        <KpiCard
          label="Avg Rating"
          value={data.avgRating ? data.avgRating.toFixed(2) : "—"}
          icon={StarIcon}
          color="primary"
          subtitle={`${data.totalCourses} courses · ${data.totalInstructors} instructors`}
        />
      </div>

      {/* Revenue + enrollments chart */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
              Revenue (last {chartData.length} days)
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              Daily gross revenue — hover a bar to see the exact amount.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-300">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary-500" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success-500" />
              Enrollments
            </span>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-dark-600 dark:text-dark-300">
            No revenue data for this period.
          </div>
        ) : (
          <SimpleBarChart
            data={chartData}
            height={200}
            color="bg-primary-500/80 dark:bg-primary-500/70"
          />
        )}
      </Card>

      {/* Recent activity feed */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ChartBarIcon className="size-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
            Recent activity
          </h3>
        </div>

        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-dark-300">
            No recent orders or enrollments in this period.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-dark-600">
            {activity.map((d) => {
              const dateLabel = new Date(d.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              return (
                <li
                  key={d.date}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
                      <AcademicCapIcon className="size-4 stroke-2" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                        {d.enrollments} new enrollment
                        {d.enrollments === 1 ? "" : "s"}
                        {d.orders > 0 && (
                          <span className="text-gray-500 dark:text-dark-300">
                            {" "}
                            · {d.orders} order{d.orders === 1 ? "" : "s"}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {dateLabel}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(d.revenueCents)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default OverviewTab;
