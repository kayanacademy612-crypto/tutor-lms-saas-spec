// CompletionTab — completion funnel report for the Reports dashboard.
//
// Renders the overall completion rate as a big number + SVG progress ring,
// the average completion time in days, a horizontal funnel (Enrolled →
// Started → 50% → Completed) with decreasing widths, and a per-course
// completion table (enrolled / completed / completion % / avg score / dropoff).

// Import Dependencies
import { useMemo } from "react";
import {
  CheckBadgeIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ChartBarIcon,
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
import { useCompletionReport } from "@/hooks/useReportsAI";
import type { ReportFilters } from "@/types/lms";
import { KpiCard } from "./KpiCard";

// ----------------------------------------------------------------------

export interface CompletionTabProps {
  filters: ReportFilters;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Circular progress ring (inline SVG). */
function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  color = "rgb(16 185 129)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - safeValue);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Completion rate ${(safeValue * 100).toFixed(1)}%`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-gray-200 dark:text-dark-600"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        className="fill-gray-900 text-base font-bold dark:fill-dark-50"
      >
        {pct(safeValue)}
      </text>
    </svg>
  );
}

/**
 * Completion funnel panel — pulls `useCompletionReport(filters)` and renders
 * the progress ring + funnel + per-course table.
 */
export function CompletionTab({ filters }: CompletionTabProps) {
  const { data, loading, error, refetch } = useCompletionReport(filters);

  // Funnel percentages are derived from each stage's `percentage` (0..1).
  const funnel = useMemo(() => {
    if (!data?.funnel || data.funnel.length === 0) return [];
    const peak = Math.max(...data.funnel.map((f) => f.count), 1);
    return data.funnel.map((f) => ({
      ...f,
      widthPct: Math.max((f.count / peak) * 100, 4),
    }));
  }, [data]);

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading completion report…" />
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
          icon={CheckBadgeIcon}
          title="No completion data"
          description="Completion metrics will appear here once students start finishing courses."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPI strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={data.overallCompletionRate} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Overall completion rate
            </p>
            <p className="mt-1 text-2xl font-semibold leading-tight text-gray-900 dark:text-dark-50">
              {pct(data.overallCompletionRate)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              Across all enrollments
            </p>
          </div>
        </Card>

        <KpiCard
          label="Avg completion time"
          value={`${data.avgCompletionDays.toFixed(1)} days`}
          icon={ClockIcon}
          color="info"
          subtitle="From enrollment to completion"
        />

        <KpiCard
          label="Courses tracked"
          value={data.courses.length.toLocaleString()}
          icon={ChartBarIcon}
          color="primary"
          subtitle="In the selected range"
        />
      </div>

      {/* Funnel */}
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <AdjustmentsHorizontalIcon className="size-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
            Completion funnel
          </h3>
        </div>

        {funnel.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-dark-300">
            No funnel data available.
          </p>
        ) : (
          <ul className="space-y-3">
            {funnel.map((stage, idx) => (
              <li key={stage.stage}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-gray-800 dark:text-dark-100">
                    {idx + 1}. {stage.stage}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-dark-300">
                    {stage.count.toLocaleString()} · {pct(stage.percentage)}
                  </span>
                </div>
                <div className="h-7 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-dark-600">
                  <div
                    className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-primary-500 to-primary-600 px-2 text-[10px] font-semibold text-white"
                    style={{ width: `${stage.widthPct}%` }}
                  >
                    {stage.count.toLocaleString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Per-course completion table */}
      <Card skin="bordered" className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
            Per-course completion
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Enrolled / completed / completion % / avg score / dropoff %.
          </p>
        </div>
        {data.courses.length === 0 ? (
          <EmptyState
            icon={CheckBadgeIcon}
            title="No course data"
            compact
            description="Per-course stats will appear here once there are enrollments."
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
                  Completion
                </Th>
                <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Avg score
                </Th>
                <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Dropoff
                </Th>
              </Tr>
            </THead>
            <TBody>
              {data.courses.map((c) => (
                <Tr
                  key={c.courseId}
                  className="border-t border-gray-100 dark:border-dark-600"
                >
                  <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                    {c.title}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {c.enrolledCount.toLocaleString()}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {c.completedCount.toLocaleString()}
                  </Td>
                  <Td className="py-3 text-right text-sm font-semibold text-success-600 dark:text-success-400">
                    {pct(c.completionRate)}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {c.avgScore ? `${(c.avgScore * 100).toFixed(0)}%` : "—"}
                  </Td>
                  <Td className="py-3 text-right text-sm font-semibold text-error-600 dark:text-error-400">
                    {pct(c.dropoffRate)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

export default CompletionTab;
