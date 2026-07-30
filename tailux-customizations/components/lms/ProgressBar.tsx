// Import Dependencies
import clsx from "clsx";
import { ReactNode } from "react";

// Local Imports
import { Progress } from "@/components/ui";
import { ColorType } from "@/constants/app";

// ----------------------------------------------------------------------

/**
 * Difficulty/progress color theming for LMS progress bars.
 * Maps a semantic color name to a `ColorType` understood by the tailux
 * `Progress` component (which expands the `this-*` Tailwind tokens).
 */
const COLOR_MAP: Record<NonNullable<ProgressBarProps["color"]>, ColorType> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  error: "error",
  info: "info",
  neutral: "neutral",
};

export type ProgressBarColor =
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export interface ProgressBarProps {
  /** Progress value clamped to 0–100. */
  value: number;
  /** Optional accessible label / caption rendered above the bar. */
  label?: ReactNode;
  /** Optional trailing caption (e.g. "12 / 20 lessons"). */
  hint?: ReactNode;
  /** Bar color. Defaults to `primary`. */
  color?: ProgressBarColor;
  /** Show the numeric percentage on the right of the label row. */
  showValue?: boolean;
  /** Render the value label *inside* the filled bar (only when wide enough). */
  valueInside?: boolean;
  /** Size of the bar (height). */
  size?: "xs" | "sm" | "md";
  /** Extra classes on the root wrapper. */
  className?: string;
}

const sizeClass: Record<NonNullable<ProgressBarProps["size"]>, string> = {
  xs: "h-1.5",
  sm: "h-2",
  md: "h-2.5",
};

/**
 * Horizontal progress bar with an optional label and percentage readout.
 *
 * Built on top of the tailux `Progress` primitive so it inherits dark-mode
 * tokens (`this-*`) and the indeterminate/active animations if needed.
 */
export function ProgressBar({
  value,
  label,
  hint,
  color = "primary",
  showValue = true,
  valueInside = false,
  size = "sm",
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value || 0)));

  return (
    <div className={clsx("w-full", className)}>
      {(label || hint || showValue) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label ? (
            <span className="truncate text-xs-plus font-medium text-gray-600 dark:text-dark-200">
              {label}
            </span>
          ) : (
            <span />
          )}
          {(hint || showValue) && (
            <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-dark-300">
              {hint ?? `${clamped}%`}
            </span>
          )}
        </div>
      )}
      <Progress
        value={clamped}
        color={COLOR_MAP[color]}
        className={clsx("rounded-full", sizeClass[size])}
      >
        {valueInside && clamped >= 12 ? (
          <span className="px-1.5 text-[10px] font-semibold leading-none text-white">
            {clamped}%
          </span>
        ) : null}
      </Progress>
    </div>
  );
}

export default ProgressBar;
