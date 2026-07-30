// Import Dependencies
import clsx from "clsx";
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import type { Quiz, QuizAttempt } from "@/types/lms";
import { Card } from "@/components/ui";
import { Badge } from "@/components/ui";

// ----------------------------------------------------------------------

export interface QuizCardProps {
  quiz: Quiz;
  /** The student's attempts for this quiz (used to compute "attempts used"). */
  attempts?: QuizAttempt[];
  /** Click handler for the whole card. */
  onClick?: () => void;
  /** Extra classes on the root Card. */
  className?: string;
}

/**
 * Formats a number of seconds as a compact human duration.
 *
 * @example formatTimeLimit(0)        === "No limit"
 * @example formatTimeLimit(120)      === "2 min"
 * @example formatTimeLimit(5400)     === "1 hr 30 min"
 */
export function formatTimeLimit(seconds?: number): string {
  if (!seconds || seconds <= 0) return "No limit";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

/**
 * Card summarising a quiz: title, question count, time limit, and attempts
 * used (out of the configured max).
 */
export function QuizCard({
  quiz,
  attempts = [],
  onClick,
  className,
}: QuizCardProps) {
  const maxAttempts = quiz.settings?.maxAttempts;
  const usedAttempts = attempts.length;
  const remaining =
    typeof maxAttempts === "number"
      ? Math.max(0, maxAttempts - usedAttempts)
      : undefined;

  const interactive = !!onClick;

  return (
    <Card
      component={interactive ? "button" : "div"}
      onClick={interactive ? onClick : undefined}
      className={clsx(
        "w-full p-4 text-left",
        interactive &&
          "cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500/40",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
          <ClipboardDocumentCheckIcon className="size-5.5 stroke-2" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-dark-50">
              {quiz.title}
            </h4>
            {!quiz.isPublished && (
              <Badge color="neutral" variant="soft" className="shrink-0">
                Draft
              </Badge>
            )}
          </div>

          {quiz.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
              {quiz.description}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-dark-300">
            <span className="inline-flex items-center gap-1">
              <QuestionMarkCircleIcon className="size-4 text-gray-400 dark:text-dark-400" />
              {quiz.questionCount ?? 0} questions
            </span>

            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-4 text-gray-400 dark:text-dark-400" />
              {formatTimeLimit(quiz.settings?.timeLimitSeconds)}
            </span>

            <span className="inline-flex items-center gap-1">
              <ArrowPathIcon className="size-4 text-gray-400 dark:text-dark-400" />
              {typeof maxAttempts === "number"
                ? `${usedAttempts} / ${maxAttempts} attempts`
                : `${usedAttempts} attempt${usedAttempts === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      </div>

      {/* Attempts remaining banner (only when capped) */}
      {typeof maxAttempts === "number" && (
        <div
          className={clsx(
            "mt-3 flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium",
            remaining === 0
              ? "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400"
              : remaining !== undefined && remaining <= 1
                ? "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
                : "bg-gray-150 text-gray-600 dark:bg-dark-500 dark:text-dark-200",
          )}
        >
          {remaining === 0
            ? "No attempts remaining"
            : `${remaining} attempt${remaining === 1 ? "" : "s"} remaining`}
          {typeof quiz.settings?.passThresholdPct === "number" && (
            <span className="opacity-80">
              Pass: {quiz.settings.passThresholdPct}%
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

export default QuizCard;
