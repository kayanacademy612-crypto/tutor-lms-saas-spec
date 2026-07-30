// MigrationJobCard — compact card representing a single migration job.
//
// Shows the platform name + icon, a status badge, a progress bar
// (migratedCourses / totalCourses), and counters for the four entity types
// (courses / lessons / quizzes / students). Footer actions: View Logs,
// Cancel (if running/pending), Retry (if failed/cancelled).
//
// The parent owns the live `MigrationJob` data (it can come from either
// `useMigrations` list or `useMigration(id)` for live updates); this
// component is purely presentational.

// Import Dependencies
import clsx from "clsx";
import {
  CubeTransparentIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  CircleStackIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

// Local Imports
import { Badge, Button, Card, Progress } from "@/components/ui";
import type { ColorType } from "@/constants/app";
import type { MigrationJob, MigrationJobStatus, MigrationPlatform } from "@/types/lms";

// ----------------------------------------------------------------------

const PLATFORM_ICON: Record<MigrationPlatform, ComponentType<{ className?: string }>> = {
  learndash: CubeTransparentIcon,
  lifterlms: GlobeAltIcon,
  learnpress: CircleStackIcon,
  woocommerce: ShoppingBagIcon,
  tutor_lms: ArrowPathIcon,
  csv: ArrowUpTrayIcon,
};

const PLATFORM_LABEL: Record<MigrationPlatform, string> = {
  learndash: "LearnDash",
  lifterlms: "LifterLMS",
  learnpress: "LearnPress",
  woocommerce: "WooCommerce",
  tutor_lms: "Tutor LMS",
  csv: "CSV Import",
};

const STATUS_META: Record<
  MigrationJobStatus,
  { color: ColorType; label: string; dot: string }
> = {
  pending: {
    color: "neutral",
    label: "Pending",
    dot: "bg-gray-400 dark:bg-dark-400",
  },
  running: {
    color: "primary",
    label: "Running",
    dot: "bg-primary-500 animate-pulse",
  },
  completed: {
    color: "success",
    label: "Completed",
    dot: "bg-success-500",
  },
  failed: {
    color: "error",
    label: "Failed",
    dot: "bg-error-500",
  },
  cancelled: {
    color: "warning",
    label: "Cancelled",
    dot: "bg-warning-500",
  },
};

// ----------------------------------------------------------------------

export interface MigrationJobCardProps {
  job: MigrationJob;
  onViewLogs?: (job: MigrationJob) => void;
  onCancel?: (job: MigrationJob) => void;
  onRetry?: (job: MigrationJob) => void;
  cancelling?: boolean;
}

export function MigrationJobCard({
  job,
  onViewLogs,
  onCancel,
  onRetry,
  cancelling,
}: MigrationJobCardProps) {
  const Icon = PLATFORM_ICON[job.platform] ?? DocumentTextIcon;
  const status = STATUS_META[job.status];

  const totalCourses = job.totalCourses ?? 0;
  const migratedCourses = job.migratedCourses ?? 0;
  const progressPct =
    totalCourses > 0 ? Math.round((migratedCourses / totalCourses) * 100) : 0;

  const canCancel = job.status === "running" || job.status === "pending";
  const canRetry = job.status === "failed" || job.status === "cancelled";

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
            <Icon className="size-5 stroke-2" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
              {PLATFORM_LABEL[job.platform]}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-dark-400">
              Job #{job.id.slice(-8)}
            </p>
          </div>
        </div>
        <Badge color={status.color} variant="soft" className="gap-1.5">
          <span className={clsx("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </Badge>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-dark-300">
            Courses migrated
          </span>
          <span className="font-medium text-gray-700 dark:text-dark-200">
            {migratedCourses} / {totalCourses || "?"}
            {totalCourses > 0 && (
              <span className="ml-1 text-gray-400 dark:text-dark-400">
                ({progressPct}%)
              </span>
            )}
          </span>
        </div>
        <Progress
          value={progressPct}
          color={job.status === "failed" ? "error" : "primary"}
          className="h-1.5"
        />
      </div>

      {/* Counts */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Count label="Courses" value={migratedCourses} total={totalCourses} />
        <Count
          label="Lessons"
          value={job.migratedLessons ?? 0}
          total={job.totalLessons ?? 0}
        />
        <Count
          label="Quizzes"
          value={job.migratedQuizzes ?? 0}
          total={job.totalQuizzes ?? 0}
        />
        <Count
          label="Students"
          value={job.migratedStudents ?? 0}
          total={job.totalStudents ?? 0}
        />
      </div>

      {/* Error */}
      {job.status === "failed" && job.errorMessage && (
        <p className="mt-3 rounded-md bg-error-500/10 px-2.5 py-1.5 text-xs text-error-700 dark:bg-error-500/15 dark:text-error-400">
          {job.errorMessage}
        </p>
      )}

      {/* Footer actions */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-dark-600">
        <span className="text-[11px] text-gray-400 dark:text-dark-400">
          {job.startedAt ? new Date(job.startedAt).toLocaleString() : "Not started"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="flat"
            color="neutral"
            className="gap-1 text-xs"
            onClick={() => onViewLogs?.(job)}
          >
            <DocumentTextIcon className="size-3.5" />
            Logs
          </Button>
          {canCancel && onCancel && (
            <Button
              variant="flat"
              color="error"
              className="gap-1 text-xs"
              disabled={cancelling}
              onClick={() => onCancel(job)}
            >
              <XMarkIcon className="size-3.5" />
              {cancelling ? "Cancelling…" : "Cancel"}
            </Button>
          )}
          {canRetry && onRetry && (
            <Button
              variant="flat"
              color="primary"
              className="gap-1 text-xs"
              onClick={() => onRetry(job)}
            >
              <ArrowPathIcon className="size-3.5" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------

function Count({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div className="rounded-md bg-gray-50 py-2 dark:bg-dark-600">
      <p className="text-sm font-bold text-gray-800 dark:text-dark-50">
        {value}
        {total > 0 && (
          <span className="ml-0.5 text-[10px] font-normal text-gray-400 dark:text-dark-400">
            /{total}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500 dark:text-dark-300">
        {label}
      </p>
    </div>
  );
}

export default MigrationJobCard;

// Re-export the icon for the wizard header if it wants to show one.
export { ChartBarIcon };
