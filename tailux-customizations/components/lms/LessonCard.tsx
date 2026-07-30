// Import Dependencies
import clsx from "clsx";
import { ComponentType } from "react";
import {
  PlayCircleIcon,
  DocumentTextIcon,
  PaperClipIcon,
  SignalIcon,
  CodeBracketSquareIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import type { Lesson, LessonProgress, LessonType } from "@/types/lms";
import { Button } from "@/components/ui";
import { ProgressBar } from "@/components/lms/ProgressBar";

// ----------------------------------------------------------------------

export interface LessonCardProps {
  lesson: Lesson;
  /** Per-student progress for the lesson. Optional. */
  progress?: LessonProgress;
  /** Click handler — makes the row behave like a button. */
  onClick?: () => void;
  /** Whether the lesson is locked (requires enrollment / prerequisite). */
  locked?: boolean;
  /** Show the lesson number prefix (e.g. "1."). */
  index?: number;
  /** Extra classes on the root row. */
  className?: string;
}

const TYPE_ICON: Record<LessonType, ComponentType<{ className?: string }>> = {
  video: PlayCircleIcon,
  text: DocumentTextIcon,
  document: PaperClipIcon,
  live: SignalIcon,
  embed: CodeBracketSquareIcon,
  zoom: VideoCameraIcon,
};

const TYPE_LABEL: Record<LessonType, string> = {
  video: "Video",
  text: "Text",
  document: "Document",
  live: "Live",
  embed: "Embed",
  zoom: "Zoom",
};

/**
 * Formats a duration (in seconds) as `M:SS` or `H:MM:SS`.
 *
 * @example formatDuration(0)        === ""
 * @example formatDuration(45)       === "0:45"
 * @example formatDuration(125)      === "2:05"
 * @example formatDuration(3725)     === "1:02:05"
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/**
 * List-item card for a single lesson.
 *
 * Layout: type icon → (title + meta row) → status icon, with an optional
 * thin progress bar beneath the title when the lesson is in progress.
 */
export function LessonCard({
  lesson,
  progress,
  onClick,
  locked = false,
  index,
  className,
}: LessonCardProps) {
  const Icon = TYPE_ICON[lesson.lessonType] ?? PlayCircleIcon;
  const duration = formatDuration(lesson.videoDuration);
  const isComplete = !!progress?.isComplete;
  const completionPct = progress?.completionPct ?? 0;
  const isInProgress = !isComplete && completionPct > 0;

  const interactive = !!onClick && !locked;

  return (
    <Button
      unstyled
      component={interactive ? "button" : "div"}
      onClick={interactive ? onClick : undefined}
      className={clsx(
        "group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left",
        interactive &&
          "cursor-pointer transition-colors hover:bg-gray-100/70 focus:bg-gray-100 focus:outline-none dark:hover:bg-dark-600/50 dark:focus:bg-dark-600",
        locked && "opacity-60",
        className,
      )}
    >
      {/* Type icon / completion badge */}
      <div className="relative shrink-0">
        {isComplete ? (
          <CheckCircleSolidIcon className="size-6 text-success-500 dark:text-success-400" />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-lg bg-gray-150 text-gray-500 dark:bg-dark-500 dark:text-dark-300">
            <Icon className="size-5 stroke-2" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {typeof index === "number" && (
            <span className="shrink-0 text-xs font-medium text-gray-400 dark:text-dark-400">
              {index}.
            </span>
          )}
          <p
            className={clsx(
              "truncate text-sm font-medium",
              isComplete
                ? "text-gray-500 line-through dark:text-dark-300"
                : "text-gray-800 dark:text-dark-100",
            )}
          >
            {lesson.title}
          </p>
          {lesson.isPreview && (
            <span className="shrink-0 rounded bg-primary-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
              Preview
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
          <span>{TYPE_LABEL[lesson.lessonType]}</span>
          {duration && (
            <>
              <span aria-hidden>·</span>
              <span>{duration}</span>
            </>
          )}
          {isInProgress && (
            <>
              <span aria-hidden>·</span>
              <span className="font-medium text-primary-600 dark:text-primary-400">
                {Math.round(completionPct)}% complete
              </span>
            </>
          )}
        </div>

        {/* Thin progress bar for in-progress lessons */}
        {isInProgress && (
          <ProgressBar
            value={completionPct}
            showValue={false}
            size="xs"
            className="mt-1.5"
          />
        )}
      </div>

      {/* Trailing status */}
      <div className="shrink-0">
        {locked ? (
          <LockClosedIcon className="size-5 text-gray-400 dark:text-dark-400" />
        ) : isComplete ? (
          <CheckCircleIcon className="size-5 text-success-500 dark:text-success-400" />
        ) : null}
      </div>
    </Button>
  );
}

export default LessonCard;
