// SalesTab — sales report for the Reports dashboard.
//
// KPI cards (Total Sales, Avg Order Value, Refund Rate, Total Orders) +
// a daily-sales line chart, a Top Courses table (with % of total), and a
// Payment Methods breakdown panel (horizontal progress bars).

// Import Dependencies
import { useMemo } from "react";
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import {
  Card,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState, formatPrice } from "@/components/lms";
import { useSalesReport } from "@/hooks/useReportsAI";
import type { ReportFilters } from "@/types/lms";
import { KpiCard } from "./KpiCard";
import { SimpleLineChart } from "./SimpleLineChart";

// ----------------------------------------------------------------------

export interface SalesTabProps {
  filters: ReportFilters;
}

const PAYMENT_COLORS = [
  "bg-primary-500",
  "bg-success-500",
  "bg-info-500",
  "bg-warning-500",
  "bg-error-500",
  "bg-secondary-500",
];

/**
 * Sales report panel — renders when the user picks "Sales" from the sidebar.
 * Pulls `useSalesReport(filters)` once per filter change.
 */
export function SalesTab({ filters }: SalesTabProps) {
  const { data, loading, error, refetch } = useSalesReport(filters);

  const chartData = useMemo(() => {
    if (!data?.dailySeries) return [];
    return data.dailySeries.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: d.salesCents,
      formattedValue: formatPrice(d.salesCents),
    }));
  }, [data]);

  const totalSales = data?.totalSalesCents ?? 0;

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading sales report…" />
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
          icon={CurrencyDollarIcon}
          title="No sales data"
          description="Sales metrics will appear here once the first order is placed."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Sales"
          value={formatPrice(data.totalSalesCents)}
          icon={CurrencyDollarIcon}
          color="primary"
        />
        <KpiCard
          label="Avg Order Value"
          value={formatPrice(data.avgOrderValueCents)}
          icon={ShoppingBagIcon}
          color="info"
        />
        <KpiCard
          label="Refund Rate"
          value={`${(data.refundRate * 100).toFixed(1)}%`}
          icon={ArrowPathIcon}
          color="warning"
        />
        <KpiCard
          label="Total Orders"
          value={data.totalOrders.toLocaleString()}
          icon={ShoppingBagIcon}
          color="success"
        />
      </div>

      {/* Sales line chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
            Daily sales
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Gross revenue per day for the selected range.
          </p>
        </div>
        <SimpleLineChart data={chartData} height={220} />
      </Card>

      {/* Top courses + payment methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top courses table */}
        <Card skin="bordered" className="overflow-hidden lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
              Top courses by revenue
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              Share of total sales — sorted high → low.
            </p>
          </div>
          {data.topCourses.length === 0 ? (
            <EmptyState
              icon={ChartBarIcon}
              title="No course sales yet"
              compact
              description="Top-performing courses will appear here."
            />
          ) : (
            <Table hoverable className="w-full">
              <THead>
                <Tr>
                  <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Course
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Sales
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Orders
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    % of total
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {data.topCourses.map((c) => {
                  const share =
                    totalSales > 0 ? (c.salesCents / totalSales) * 100 : 0;
                  return (
                    <Tr
                      key={c.courseId}
                      className="border-t border-gray-100 dark:border-dark-600"
                    >
                      <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                        {c.title}
                      </Td>
                      <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                        {formatPrice(c.salesCents)}
                      </Td>
                      <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                        {c.orders.toLocaleString()}
                      </Td>
                      <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                        {share.toFixed(1)}%
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Payment methods breakdown */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCardIcon className="size-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
              Payment methods
            </h3>
          </div>

          {data.paymentMethods.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-dark-300">
              No payment data yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.paymentMethods.map((m, idx) => {
                const total = data.paymentMethods.reduce(
                  (sum, x) => sum + x.totalCents,
                  0,
                );
                const share =
                  total > 0 ? (m.totalCents / total) * 100 : 0;
                return (
                  <li key={m.gateway}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-dark-100">
                        <span
                          className={`size-2.5 rounded-full ${
                            PAYMENT_COLORS[idx % PAYMENT_COLORS.length]
                          }`}
                        />
                        <span className="capitalize">{m.gateway}</span>
                      </span>
                      <span className="text-xs text-gray-500 dark:text-dark-300">
                        {m.count} orders · {share.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
                      <div
                        className={`h-full rounded-full ${
                          PAYMENT_COLORS[idx % PAYMENT_COLORS.length]
                        }`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs font-semibold text-gray-700 dark:text-dark-200">
                      {formatPrice(m.totalCents)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default SalesTab;
