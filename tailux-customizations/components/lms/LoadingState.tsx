// Import Dependencies
import clsx from "clsx";
import { ReactNode } from "react";

// Local Imports
import { Spinner } from "@/components/ui";

// ----------------------------------------------------------------------

export interface LoadingStateProps {
  /** Optional message rendered beneath the spinner. */
  message?: ReactNode;
  /** Spinner size: tailwind size token (default "size-6"). */
  size?: string;
  /** Render inline (no full-height centering). */
  inline?: boolean;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Loading placeholder.
 *
 * Wraps the tailux `Spinner` primitive with consistent vertical spacing and
 * an optional caption. Use `inline` for in-card loading, or omit it for a
 * full-height centered region.
 */
export function LoadingState({
  message,
  size = "size-6",
  inline = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3",
        inline ? "py-4" : "min-h-[200px] py-12",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner className={size} />
      {message && (
        <p className="text-sm text-gray-500 dark:text-dark-300">{message}</p>
      )}
    </div>
  );
}

export default LoadingState;
