// EnrollmentsTab — enrollment report for the Reports dashboard.
//
// KPI cards (Total Enrollments, Active, Completed, Completion Rate) + a dual
// line chart (daily new enrollments + completions), a Top Courses by
// Enrollment table, and a status breakdown donut/progress-bar panel.

// Import Dependencies
import { useMemo } from "react";
import {
  AcademicCapIcon,
  PlayCircleIcon,
  CheckBadgeIcon,
  ChartBarIcon,
  XCircleIcon,
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
import { EmptyState, ErrorState, LoadingState } from "@/components/lms";
import { useEnrollmentReport } from "@/hooks/useReportsAI";
import type { ReportFilters } from "@/types/lms";
import { KpiCard } from "./KpiCard";
import { SimpleLineChart } from "./SimpleLineChart";

// ----------------------------------------------------------------------

export interface EnrollmentsTabProps {
  filters: ReportFilters;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Enrollment report panel — pulls `useEnrollmentReport(filters)` once per
 * filter change and renders the four KPI cards + chart + table + status
 * breakdown.
 */
export function EnrollmentsTab({ filters }: EnrollmentsTabProps) {
  const { data, loading, error, refetch } = useEnrollmentReport(filters);

  // Daily new enrollments (primary line).
  const enrollSeries = useMemo(() => {
    if (!data?.dailySeries) return [];
    return data.dailySeries.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: d.enrollments,
      formattedValue: `${d.enrollments} enrollments`,
    }));
  }, [data]);

  // Daily completions (secondary line — drawn via a second chart instance
  // since we don't have a true multi-series line primitive).
  const completionSeries = useMemo(() => {
    if (!data?.dailySeries) return [];
    return data.dailySeries.map((d) => ({
      label: new Date(d.date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      value: d.completions,
      formattedValue: `${d.completions} completions`,
    }));
  }, [data]);

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading enrollment report…" />
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
          icon={AcademicCapIcon}
          title="No enrollment data"
          description="Enrollments will appear here once students start enrolling."
        />
      </Card>
    );
  }

  const total = data.totalEnrollments || 0;
  const statuses = [
    {
      label: "Active",
      value: data.activeEnrollments,
      color: "bg-primary-500",
      icon: PlayCircleIcon,
    },
    {
      label: "Completed",
      value: data.completedEnrollments,
      color: "bg-success-500",
      icon: CheckBadgeIcon,
    },
    {
      label: "Cancelled",
      value: data.cancelledEnrollments,
      color: "bg-error-500",
      icon: XCircleIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Enrollments"
          value={data.totalEnrollments.toLocaleString()}
          growth={data.enrollmentGrowth}
          icon={AcademicCapIcon}
          color="primary"
        />
        <KpiCard
          label="Active"
          value={data.activeEnrollments.toLocaleString()}
          icon={PlayCircleIcon}
          color="info"
        />
        <KpiCard
          label="Completed"
          value={data.completedEnrollments.toLocaleString()}
          icon={CheckBadgeIcon}
          color="success"
        />
        <KpiCard
          label="Completion Rate"
          value={pct(data.completionRate)}
          icon={ChartBarIcon}
          color="warning"
        />
      </div>

      {/* Daily series (two charts stacked) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                New enrollments
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Daily count for the selected range.
              </p>
            </div>
            <span className="size-2.5 rounded-full bg-primary-500" />
          </div>
          <SimpleLineChart
            data={enrollSeries}
            height={200}
            color="rgb(99 102 241)"
          />
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                Completions
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Daily completion count.
              </p>
            </div>
            <span className="size-2.5 rounded-full bg-success-500" />
          </div>
          <SimpleLineChart
            data={completionSeries}
            height={200}
            color="rgb(16 185 129)"
          />
        </Card>
      </div>

      {/* Top courses + status breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card skin="bordered" className="overflow-hidden lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
              Top courses by enrollment
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              Per-course enrolled / completed counts + completion rate.
            </p>
          </div>
          {data.topCourses.length === 0 ? (
            <EmptyState
              icon={AcademicCapIcon}
              title="No course enrollments yet"
              compact
            />
          ) : (
            <Table hoverable className="w-full">
              <THead>
                <Tr>
                  <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Course
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Enrolled
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Completed
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Rate
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {data.topCourses.map((c) => (
                  <Tr
                    key={c.courseId}
                    className="border-t border-gray-100 dark:border-dark-600"
                  >
                    <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                      {c.title}
                    </Td>
                    <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                      {c.enrollments.toLocaleString()}
                    </Td>
                    <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                      {c.completions.toLocaleString()}
                    </Td>
                    <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                      {pct(c.completionRate)}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Status breakdown */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <ChartBarIcon className="size-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
              Status breakdown
            </h3>
          </div>

          {total === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-dark-300">
              No enrollments yet.
            </p>
          ) : (
            <ul className="space-y-4">
              {statuses.map((s) => {
                const share = total > 0 ? (s.value / total) * 100 : 0;
                const Icon = s.icon;
                return (
                  <li key={s.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-dark-100">
                        <Icon className="size-4 text-gray-400 dark:text-dark-400" />
                        {s.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-dark-300">
                        {s.value.toLocaleString()} · {share.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
                      <div
                        className={`h-full rounded-full ${s.color}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
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

export default EnrollmentsTab;
