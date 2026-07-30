// Import Dependencies
import clsx from "clsx";
import {
  ExclamationCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface ErrorStateProps {
  /** Error value — string message or an `Error` object. */
  error: string | Error | unknown;
  /** Called when the user clicks "Retry". */
  onRetry?: () => void;
  /** Override the retry button label. */
  retryLabel?: string;
  /** Custom title for the error block (defaults to "Something went wrong"). */
  title?: string;
  /** Extra classes on the root wrapper. */
  className?: string;
}

function toMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "An unexpected error occurred.";
  }
}

/**
 * Error display with an optional retry action.
 *
 * Renders an icon well, a humanised message, and — when `onRetry` is supplied
 * — a soft "Retry" button. Designed to drop into card bodies or replace a
 * page region.
 */
export function ErrorState({
  error,
  onRetry,
  retryLabel = "Retry",
  title = "Something went wrong",
  className,
}: ErrorStateProps) {
  const message = toMessage(error);

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
      role="alert"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-error-500/10 text-error-500 dark:bg-error-500/15 dark:text-error-400">
        <ExclamationCircleIcon className="size-7 stroke-2" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-800 dark:text-dark-100">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-sm text-gray-500 dark:text-dark-300">
        {message}
      </p>
      {onRetry && (
        <Button
          color="primary"
          variant="soft"
          onClick={onRetry}
          className="mt-5 gap-1.5 text-sm"
        >
          <ArrowPathIcon className="size-4 stroke-2" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
