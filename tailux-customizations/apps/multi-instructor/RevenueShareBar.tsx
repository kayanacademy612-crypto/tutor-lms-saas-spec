// RevenueShareBar — stacked horizontal bar visualising revenue split
// across a course's instructors.
//
// Each instructor gets a deterministic colored segment proportional to
// their `revenueSharePercent`. Underneath the bar, a legend lists each
// instructor with their name, role, and percentage. A "Total" indicator
// shows whether the shares sum to 100%.

// Import Dependencies
import clsx from "clsx";
import { ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

// Local Imports
import type { CourseInstructor } from "@/types/lms";

// ----------------------------------------------------------------------

/**
 * Deterministic palette for instructor segments. Picked so adjacent
 * instructors always contrast.
 */
const SEGMENT_COLORS = [
  "bg-primary-500 dark:bg-primary-400",
  "bg-info-500 dark:bg-info-400",
  "bg-success-500 dark:bg-success-400",
  "bg-warning-500 dark:bg-warning-400",
  "bg-secondary-500 dark:bg-secondary-400",
  "bg-error-500 dark:bg-error-400",
];

// ----------------------------------------------------------------------

export interface RevenueShareBarProps {
  /** Instructors currently assigned to the course. */
  instructors: CourseInstructor[];
  /** When true, the bar renders at 100% height regardless of total — used
   *  in the modal's "preview" mode where total may exceed 100%. */
  preview?: boolean;
  className?: string;
}

// ----------------------------------------------------------------------

export function RevenueShareBar({
  instructors,
  preview = false,
  className,
}: RevenueShareBarProps) {
  const total = instructors.reduce(
    (sum, i) => sum + (i.revenueSharePercent ?? 0),
    0,
  );

  // When previewing, normalise each segment against the total so the bar
  // always fills 100% — useful for visualising "what if I add 60%?".
  const denominator = preview && total > 0 ? total : 100;

  const isComplete = Math.abs(total - 100) < 0.01;
  const isOverflow = total > 100.01;

  return (
    <div className={clsx("space-y-3", className)}>
      {/* Bar */}
      <div className="flex h-6 w-full overflow-hidden rounded-md border border-gray-200 dark:border-dark-500">
        {instructors.length === 0 && (
          <div className="flex w-full items-center justify-center bg-gray-100 text-xs text-gray-500 dark:bg-dark-600 dark:text-dark-300">
            No instructors yet
          </div>
        )}
        {instructors.map((ins, idx) => {
          const width = ((ins.revenueSharePercent ?? 0) / denominator) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={ins.id}
              className={clsx(
                "flex h-full items-center justify-center text-[10px] font-semibold text-white transition-all",
                SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
              )}
              style={{ width: `${width}%` }}
              title={`${ins.instructorName ?? "Instructor"} · ${ins.revenueSharePercent}%`}
            >
              {width >= 8 && `${Math.round(ins.revenueSharePercent ?? 0)}%`}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {instructors.length > 0 && (
        <ul className="space-y-1.5">
          {instructors.map((ins, idx) => (
            <li
              key={ins.id}
              className="flex items-center gap-2 text-xs text-gray-700 dark:text-dark-200"
            >
              <span
                className={clsx(
                  "size-2.5 shrink-0 rounded-sm",
                  SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
                )}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {ins.instructorName ?? `Instructor ${ins.instructorId}`}
              </span>
              {ins.isPrimary && (
                <span className="rounded bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary-700 dark:text-primary-300">
                  PRIMARY
                </span>
              )}
              <span className="tabular-nums font-semibold text-gray-800 dark:text-dark-100">
                {ins.revenueSharePercent ?? 0}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Total indicator */}
      <div
        className={clsx(
          "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
          isComplete &&
            "bg-success-500/10 text-success-700 dark:text-success-300",
          isOverflow &&
            "bg-error-500/10 text-error-700 dark:text-error-300",
          !isComplete && !isOverflow && "bg-warning-500/10 text-warning-700 dark:text-warning-300",
        )}
      >
        {isComplete ? (
          <CheckCircleIcon className="size-4 shrink-0" />
        ) : (
          <ExclamationTriangleIcon className="size-4 shrink-0" />
        )}
        <span className="font-semibold">Total: {total.toFixed(0)}%</span>
        {isComplete && <span>· Revenue split is balanced.</span>}
        {isOverflow && (
          <span>· Total exceeds 100% — reduce one or more shares.</span>
        )}
        {!isComplete && !isOverflow && (
          <span>· Remaining: {(100 - total).toFixed(0)}% unassigned.</span>
        )}
      </div>
    </div>
  );
}

export default RevenueShareBar;
