// Import Dependencies
import clsx from "clsx";
import { CheckIcon } from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

export interface CheckoutStepperProps {
  /** 1-based index of the current step. */
  currentStep: number;
  /** Step labels. Defaults to the standard 4-step checkout flow. */
  steps?: string[];
  /** Extra classes on the root wrapper. */
  className?: string;
}

const DEFAULT_STEPS = ["Cart", "Information", "Payment", "Confirmation"];

/**
 * Horizontal stepper for the multi-step checkout flow.
 *
 * Layout: numbered circles connected by horizontal rules. Completed steps
 * are filled with the primary color, the current step is outlined in
 * primary, and upcoming steps are gray. Labels render beneath each circle.
 *
 * The component is presentational — step navigation is owned by the parent
 * (e.g. a `CheckoutPage` that swaps the body on `currentStep` change).
 */
export function CheckoutStepper({
  currentStep,
  steps = DEFAULT_STEPS,
  className,
}: CheckoutStepperProps) {
  const total = steps.length;
  const clamped = Math.min(Math.max(currentStep, 1), total);

  return (
    <ol
      className={clsx(
        "flex w-full items-center gap-2 sm:gap-3",
        className,
      )}
    >
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isCompleted = stepNum < clamped;
        const isCurrent = stepNum === clamped;

        return (
          <li
            key={`${label}-${idx}`}
            className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"
          >
            {/* Circle + label cluster */}
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <span
                className={clsx(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors sm:size-9 sm:text-sm",
                  isCompleted &&
                    "border-primary-500 bg-primary-500 text-white dark:border-primary-500 dark:bg-primary-500",
                  isCurrent &&
                    "border-primary-500 bg-primary-500/10 text-primary-600 dark:border-primary-400 dark:bg-primary-400/15 dark:text-primary-400",
                  !isCompleted &&
                    !isCurrent &&
                    "border-gray-300 bg-white text-gray-400 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-300",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? (
                  <CheckIcon className="size-4 stroke-2 sm:size-5" />
                ) : (
                  stepNum
                )}
              </span>
              <span
                className={clsx(
                  "max-w-[6rem] truncate text-center text-[11px] font-medium sm:text-xs",
                  isCurrent
                    ? "text-primary-600 dark:text-primary-400"
                    : isCompleted
                      ? "text-gray-700 dark:text-dark-100"
                      : "text-gray-400 dark:text-dark-400",
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line — hidden after the last step */}
            {idx < total - 1 && (
              <span
                aria-hidden
                className={clsx(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  stepNum < clamped
                    ? "bg-primary-500 dark:bg-primary-500"
                    : "bg-gray-200 dark:bg-dark-600",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default CheckoutStepper;
