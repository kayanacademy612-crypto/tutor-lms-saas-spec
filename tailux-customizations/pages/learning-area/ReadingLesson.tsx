// ReadingLesson — main content panel for text/document lessons.
//
// Renders the lesson body as rich text (HTML produced by the instructor's
// WYSIWYG editor), an attachments list with download buttons, and the same
// "Mark as Complete" + prev/next footer used by VideoLesson.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PaperClipIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/lms";
import type { Lesson, LessonProgress, LessonProgressInput } from "@/types/lms";

// ----------------------------------------------------------------------

export interface ReadingLessonProps {
  lesson: Lesson;
  progress?: LessonProgress;
  onPrev?: () => void;
  onNext?: () => void;
  onProgress?: (input: LessonProgressInput) => void;
}

/** Mock attachment metadata — in production this would come from the file
 *  service. The lesson only stores the `attachmentUrls` array. */
interface AttachmentMeta {
  url: string;
  name: string;
  sizeBytes: number;
  mime: string;
}

const ATTACHMENT_LOOKUP: Record<string, AttachmentMeta> = {
  "react-cheatsheet.pdf": {
    url: "react-cheatsheet.pdf",
    name: "react-cheatsheet.pdf",
    sizeBytes: 1_240_000,
    mime: "application/pdf",
  },
  "starter-repo.zip": {
    url: "starter-repo.zip",
    name: "starter-repo.zip",
    sizeBytes: 84_000,
    mime: "application/zip",
  },
  "use-debounce.ts": {
    url: "use-debounce.ts",
    name: "use-debounce.ts",
    sizeBytes: 2_400,
    mime: "text/typescript",
  },
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1000));
  return `${(bytes / Math.pow(1000, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function fileTypeIcon(mime: string): string {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("zip")) return "ZIP";
  if (mime.includes("typescript") || mime.includes("javascript")) return "TS";
  if (mime.includes("image")) return "IMG";
  if (mime.includes("text")) return "TXT";
  return "FILE";
}

// ----------------------------------------------------------------------

export default function ReadingLesson({
  lesson,
  progress,
  onPrev,
  onNext,
  onProgress,
}: ReadingLessonProps) {
  const [markedComplete, setMarkedComplete] = useState(
    !!progress?.isComplete,
  );

  // Estimated reading time — 200 wpm. Falls back to 1 min if no content.
  const wordCount = lesson.content
    ? lesson.content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length
    : 0;
  const readMinutes = Math.max(1, Math.round(wordCount / 200));

  const handleMarkComplete = () => {
    setMarkedComplete(true);
    onProgress?.({
      completionPct: 100,
      isComplete: true,
    });
  };

  const attachments = (lesson.attachmentUrls ?? [])
    .map((url) => ATTACHMENT_LOOKUP[url])
    .filter(Boolean) as AttachmentMeta[];

  return (
    <div className="space-y-5">
      {/* Lesson header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge color="info" variant="soft">
              Reading lesson
            </Badge>
            {lesson.isPreview && (
              <Badge color="primary" variant="soft">
                Free preview
              </Badge>
            )}
            {markedComplete && (
              <Badge color="success" variant="soft" className="gap-1">
                <CheckCircleSolidIcon className="size-3.5" />
                Completed
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-xl font-semibold text-gray-800 dark:text-dark-50">
            {lesson.title}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-dark-300">
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="size-4" />
              {readMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1">
              <DocumentTextIcon className="size-4" />
              {wordCount} words
            </span>
          </div>
        </div>
        <Button
          color={markedComplete ? "success" : "primary"}
          variant={markedComplete ? "soft" : "filled"}
          onClick={handleMarkComplete}
          disabled={markedComplete}
          className="gap-1.5"
        >
          {markedComplete ? (
            <>
              <CheckCircleIcon className="size-4 stroke-2" />
              Completed
            </>
          ) : (
            <>
              <CheckCircleIcon className="size-4 stroke-2" />
              Mark as Complete
            </>
          )}
        </Button>
      </div>

      {/* Progress strip */}
      <ProgressBar
        value={markedComplete ? 100 : 0}
        color={markedComplete ? "success" : "primary"}
        size="sm"
        showValue
        label="Lesson progress"
      />

      {/* Lesson body */}
      {lesson.content ? (
        <Card skin="bordered" className="p-6">
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed text-gray-700 dark:text-dark-200 dark:prose-invert sm:prose-base"
            // Mock content only — safe in dev. The backend sanitises HTML
            // before storage; we trust it here.
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        </Card>
      ) : (
        <Card skin="bordered" className="p-6 text-center text-sm text-gray-500 dark:text-dark-300">
          This lesson has no body content yet.
        </Card>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card skin="bordered" className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <PaperClipIcon className="size-4 text-gray-400 dark:text-dark-400" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Attachments ({attachments.length})
            </h2>
          </div>
          <ul className="space-y-2">
            {attachments.map((att) => {
              const tag = fileTypeIcon(att.mime);
              return (
                <li key={att.url}>
                  <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600/50">
                    <div
                      className={clsx(
                        "flex size-10 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase",
                        tag === "PDF" &&
                          "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
                        tag === "ZIP" &&
                          "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
                        tag === "TS" &&
                          "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
                        !["PDF", "ZIP", "TS"].includes(tag) &&
                          "bg-gray-150 text-gray-600 dark:bg-dark-500 dark:text-dark-200",
                      )}
                    >
                      {tag}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                        {att.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {formatBytes(att.sizeBytes)} · {att.mime}
                      </p>
                    </div>
                    <Button
                      variant="soft"
                      color="primary"
                      isIcon
                      aria-label={`Download ${att.name}`}
                    >
                      <ArrowDownTrayIcon className="size-4 stroke-2" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outlined"
          color="neutral"
          onClick={onPrev}
          disabled={!onPrev}
          className="gap-1.5"
        >
          <ArrowLeftIcon className="size-4 stroke-2" />
          Previous
        </Button>
        <Button
          variant="filled"
          color="primary"
          onClick={onNext}
          disabled={!onNext}
          className="gap-1.5"
        >
          Next
          <ArrowRightIcon className="size-4 stroke-2" />
        </Button>
      </div>
    </div>
  );
}
