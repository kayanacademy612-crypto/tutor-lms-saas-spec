// VideoLesson — main content panel shown when the active item is a video lesson.
//
// Renders a styled placeholder for the video player (BunnyNet integration will
// swap in later), lesson title + rich-text description, video duration, a
// custom play/pause + seek bar built from divs (no native <video> yet), and a
// "Mark as Complete" button. Prev/next navigation is wired through props.
//
// Position updates fire `onProgress` (which the parent forwards to
// `lmsApi.lesson.updateProgress`) on a throttled cadence so we don't spam the
// backend.

// Import Dependencies
import { useEffect, useRef, useState, useCallback } from "react";
import clsx from "clsx";
import {
  PlayIcon,
  PauseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SpeakerWaveIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/lms";
import type { Lesson, LessonProgress, LessonProgressInput } from "@/types/lms";

// ----------------------------------------------------------------------

export interface VideoLessonProps {
  lesson: Lesson;
  /** Per-student progress for this lesson (drives "complete" state). */
  progress?: LessonProgress;
  /** Go to the previous curriculum item. */
  onPrev?: () => void;
  /** Go to the next curriculum item. */
  onNext?: () => void;
  /** Forward a progress update (the parent calls `lmsApi.lesson.updateProgress`). */
  onProgress?: (input: LessonProgressInput) => void;
}

/** Formats seconds as `M:SS` or `H:MM:SS`. */
function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// ----------------------------------------------------------------------

export default function VideoLesson({
  lesson,
  progress,
  onPrev,
  onNext,
  onProgress,
}: VideoLessonProps) {
  const duration = lesson.videoDuration ?? 0;
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState<number>(
    progress?.positionSeconds ?? 0,
  );
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<1 | 1.25 | 1.5 | 2>(1);
  const [markedComplete, setMarkedComplete] = useState(
    !!progress?.isComplete,
  );

  // Track the last position we reported so we don't spam the API.
  const lastReportedRef = useRef<number>(position);
  // Tick interval — advances the position while playing.
  const tickRef = useRef<number | null>(null);

  // Reset position when the lesson changes.
  useEffect(() => {
    setPosition(progress?.positionSeconds ?? 0);
    setMarkedComplete(!!progress?.isComplete);
    setPlaying(false);
    lastReportedRef.current = progress?.positionSeconds ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  // Tick loop — advance position while playing.
  useEffect(() => {
    if (!playing) {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = window.setInterval(() => {
      setPosition((p) => {
        const next = p + speed;
        if (next >= duration) {
          // Auto-complete on end.
          setPlaying(false);
          const finalPos = duration;
          if (onProgress && finalPos - lastReportedRef.current >= 1) {
            onProgress({
              positionSeconds: finalPos,
              durationSeconds: duration,
              completionPct: 100,
              isComplete: true,
            });
            lastReportedRef.current = finalPos;
          }
          setMarkedComplete(true);
          return duration;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [playing, speed, duration, onProgress]);

  // Report position every ~5 seconds while playing.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (onProgress && position - lastReportedRef.current >= 5) {
        const completionPct = duration > 0
          ? Math.min(100, Math.round((position / duration) * 100))
          : 0;
        onProgress({
          positionSeconds: position,
          durationSeconds: duration,
          completionPct,
        });
        lastReportedRef.current = position;
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, position, duration, onProgress]);

  const handleSeek = useCallback(
    (pct: number) => {
      const next = Math.max(0, Math.min(duration, Math.round(pct * duration)));
      setPosition(next);
      if (onProgress && Math.abs(next - lastReportedRef.current) >= 1) {
        const completionPct = duration > 0
          ? Math.min(100, Math.round((next / duration) * 100))
          : 0;
        onProgress({
          positionSeconds: next,
          durationSeconds: duration,
          completionPct,
        });
        lastReportedRef.current = next;
      }
    },
    [duration, onProgress],
  );

  const handleMarkComplete = () => {
    setMarkedComplete(true);
    setPlaying(false);
    onProgress?.({
      positionSeconds: duration || position,
      durationSeconds: duration,
      completionPct: 100,
      isComplete: true,
    });
  };

  const seekPct = duration > 0 ? (position / duration) * 100 : 0;
  const lessonCompletionPct = markedComplete
    ? 100
    : duration > 0
      ? Math.round((position / duration) * 100)
      : 0;

  return (
    <div className="space-y-5">
      {/* Video player placeholder */}
      <Card skin="none" className="overflow-hidden rounded-xl bg-black p-0">
        <div
          className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-br from-dark-800 via-dark-700 to-primary-900/40"
          onClick={() => setPlaying((p) => !p)}
          role="button"
          aria-label={playing ? "Pause video" : "Play video"}
        >
          {/* Big play / pause button overlay */}
          <Button
            unstyled
            isIcon
            className="flex size-20 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-transform hover:scale-105 hover:bg-white/25 focus:outline-none focus:ring-4 focus:ring-white/30"
            aria-label={playing ? "Pause" : "Play"}
            onClick={(e) => {
              e.stopPropagation();
              setPlaying((p) => !p);
            }}
          >
            {playing ? (
              <PauseIcon className="size-9 stroke-2" />
            ) : (
              <PlayIcon className="ml-1 size-9 stroke-2" />
            )}
          </Button>

          {/* Title chip */}
          <div className="absolute left-4 top-4 max-w-[70%]">
            <Badge color="neutral" variant="soft" className="bg-black/40 text-white dark:bg-black/40 dark:text-white">
              <span className="size-1.5 rounded-full bg-error-500" />
              BunnyNet placeholder
            </Badge>
          </div>

          {/* Duration chip */}
          <div className="absolute right-4 top-4">
            <Badge color="neutral" variant="soft" className="bg-black/40 text-white dark:bg-black/40 dark:text-white">
              <ClockIcon className="size-3.5 stroke-2" />
              {fmt(duration)}
            </Badge>
          </div>

          {/* Custom controls bar */}
          <div
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Seek bar (built from divs) */}
            <div
              className="group relative flex h-1.5 cursor-pointer items-center"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                handleSeek(pct);
              }}
            >
              <div className="absolute h-1 w-full rounded-full bg-white/25" />
              <div
                className="absolute h-1 rounded-full bg-primary-500"
                style={{ width: `${seekPct}%` }}
              />
              <div
                className="absolute size-3 -translate-x-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                style={{ left: `${seekPct}%` }}
              />
            </div>

            {/* Controls row */}
            <div className="mt-2 flex items-center gap-1 text-white">
              <Button
                unstyled
                isIcon
                className="rounded p-1.5 transition-colors hover:bg-white/15"
                aria-label={playing ? "Pause" : "Play"}
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? (
                  <PauseIcon className="size-5 stroke-2" />
                ) : (
                  <PlayIcon className="size-5 stroke-2" />
                )}
              </Button>
              <Button
                unstyled
                isIcon
                className="rounded p-1.5 transition-colors hover:bg-white/15"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={() => setMuted((m) => !m)}
              >
                <SpeakerWaveIcon
                  className={clsx(
                    "size-5 stroke-2",
                    muted && "opacity-40",
                  )}
                />
              </Button>
              <span className="ml-1 text-xs font-medium tabular-nums">
                {fmt(position)} / {fmt(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1">
                <AdjustmentsHorizontalIcon className="size-4 opacity-70" />
                {([1, 1.25, 1.5, 2] as const).map((s) => (
                  <Button
                    key={s}
                    unstyled
                    onClick={() => setSpeed(s)}
                    className={clsx(
                      "rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
                      speed === s
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Lesson header + completion bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Badge color="primary" variant="soft">
              Video lesson
            </Badge>
            {lesson.isPreview && (
              <Badge color="info" variant="soft">
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
              {fmt(duration)}
            </span>
            <span className="inline-flex items-center gap-1">
              <DocumentTextIcon className="size-4" />
              {lesson.lessonType}
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
        value={lessonCompletionPct}
        color={markedComplete ? "success" : "primary"}
        size="sm"
        showValue
        label="Lesson progress"
      />

      {/* Description (rich text) */}
      {lesson.content && (
        <Card skin="bordered" className="p-5">
          <h2 className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
            About this lesson
          </h2>
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed text-gray-700 dark:text-dark-200 dark:prose-invert"
            // Mock content only — safe in dev. The backend serialises the
            // instructor-authored HTML via a sanitiser before storage.
            dangerouslySetInnerHTML={{ __html: lesson.content }}
          />
        </Card>
      )}

      {/* Prev / Next navigation */}
      <PrevNextNav onPrev={onPrev} onNext={onNext} />
    </div>
  );
}

// ----------------------------------------------------------------------

/** Prev/next navigation strip shared by lesson screens. */
export function PrevNextNav({
  onPrev,
  onNext,
}: {
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
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
  );
}
