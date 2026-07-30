// CourseOutlineGenerator — modal that drives `useGenerateCourseOutline`.
//
// Form inputs:
//   - topic (required, free text)
//   - level (beginner / intermediate / advanced)
//   - lessonsCount (optional integer, default 8)
//
// On "Generate", calls `useGenerateCourseOutline().mutate(...)`. The raw
// `outline` payload from the model is rendered as a tree (title → description
// → lessons list) when it has the expected shape, otherwise the JSON is
// pretty-printed as a fallback. The "Create Course" CTA navigates to the
// course-builder route with the outline stashed in `location.state`.

// Import Dependencies
import { Fragment, useState, FormEvent } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
  ArrowRightCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Input, Select } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/lms";
import { useGenerateCourseOutline } from "@/hooks/useReportsAI";

// ----------------------------------------------------------------------

interface OutlineLesson {
  title?: string;
  description?: string;
}
interface OutlineModule {
  title?: string;
  description?: string;
  lessons?: OutlineLesson[];
}
interface OutlineShape {
  title?: string;
  description?: string;
  level?: string;
  modules?: OutlineModule[];
  lessons?: OutlineLesson[];
}

// ----------------------------------------------------------------------

export interface CourseOutlineGeneratorProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (outline: unknown) => void;
}

export function CourseOutlineGenerator({
  open,
  onClose,
  onCreated,
}: CourseOutlineGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">(
    "beginner",
  );
  const [lessonsCount, setLessonsCount] = useState<number>(8);

  const generate = useGenerateCourseOutline();
  const outline = generate.data?.outline as OutlineShape | undefined;

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    await generate.mutate({
      topic: topic.trim(),
      level,
      lessonsCount,
    });
  };

  const handleCreateCourse = () => {
    if (!outline) return;
    onCreated?.(outline);
    onClose();
    // Reset for next open.
    generate.reset();
    setTopic("");
  };

  const handleClose = () => {
    onClose();
    generate.reset();
    setTopic("");
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={handleClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={DialogPanel}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-700">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary-500" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                    Generate Course Outline
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                    Describe your topic and the AI will draft a structured
                    outline.
                  </p>
                </div>
              </div>
              <Button
                isIcon
                variant="flat"
                color="neutral"
                className="size-8"
                onClick={handleClose}
                aria-label="Close"
              >
                <XMarkIcon className="size-4" />
              </Button>
            </header>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {!outline ? (
                <form
                  onSubmit={handleGenerate}
                  className="space-y-4 p-5"
                >
                  <Input
                    label="Topic"
                    placeholder="e.g. Introduction to Linear Algebra"
                    value={topic}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTopic(e.target.value)
                    }
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      label="Level"
                      value={level}
                      onChange={(e) =>
                        setLevel(
                          e.target.value as
                            | "beginner"
                            | "intermediate"
                            | "advanced",
                        )
                      }
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </Select>
                    <Input
                      label="Lessons count"
                      type="number"
                      min={1}
                      max={50}
                      value={lessonsCount}
                      onChange={(
                        e: React.ChangeEvent<HTMLInputElement>,
                      ) => setLessonsCount(Number(e.target.value))}
                    />
                  </div>

                  {generate.error && (
                    <ErrorState
                      error={generate.error}
                      title="AI generation failed"
                    />
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="outlined"
                      color="neutral"
                      onClick={handleClose}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      color="primary"
                      disabled={generate.loading || !topic.trim()}
                      className="gap-1.5"
                    >
                      {generate.loading ? (
                        <ArrowPathIcon className="size-4 animate-spin" />
                      ) : (
                        <SparklesIcon className="size-4" />
                      )}
                      Generate
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 p-5">
                  <OutlineResult outline={outline} />

                  <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-dark-600">
                    <Button
                      variant="outlined"
                      color="neutral"
                      onClick={() => generate.reset()}
                      className="gap-1.5"
                    >
                      <ArrowPathIcon className="size-4" />
                      Regenerate
                    </Button>
                    <Button
                      color="primary"
                      onClick={handleCreateCourse}
                      className="gap-1.5"
                    >
                      <ArrowRightCircleIcon className="size-4" />
                      Create Course
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {generate.loading && !outline && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-dark-700/70">
                <LoadingState message="Generating outline…" />
              </div>
            )}
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ----------------------------------------------------------------------

function OutlineResult({ outline }: { outline: OutlineShape }) {
  const modules = outline.modules ?? [];
  const lessons = outline.lessons ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
          {outline.title ?? "Untitled course"}
        </h3>
        {outline.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-dark-200">
            {outline.description}
          </p>
        )}
        {outline.level && (
          <span className="mt-2 inline-block rounded-full bg-primary-500/10 px-2 py-0.5 text-[11px] font-medium capitalize text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
            {outline.level}
          </span>
        )}
      </div>

      {modules.length > 0 ? (
        <ol className="space-y-3">
          {modules.map((m, i) => (
            <li
              key={i}
              className="rounded-lg border border-gray-200 p-3 dark:border-dark-600"
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                {i + 1}. {m.title ?? `Module ${i + 1}`}
              </p>
              {m.description && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                  {m.description}
                </p>
              )}
              {m.lessons && m.lessons.length > 0 && (
                <ul className="mt-2 space-y-1 pl-4">
                  {m.lessons.map((l, j) => (
                    <li
                      key={j}
                      className="list-disc text-sm text-gray-700 dark:text-dark-200"
                    >
                      <span className="font-medium">{l.title}</span>
                      {l.description && (
                        <span className="text-gray-500 dark:text-dark-400">
                          {" "}
                          — {l.description}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      ) : lessons.length > 0 ? (
        <ol className="space-y-1.5 pl-4">
          {lessons.map((l, i) => (
            <li
              key={i}
              className="list-decimal text-sm text-gray-700 dark:text-dark-200"
            >
              <span className="font-medium">{l.title}</span>
              {l.description && (
                <span className="text-gray-500 dark:text-dark-400">
                  {" "}
                  — {l.description}
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-dark-600 dark:text-dark-200">
          {JSON.stringify(outline, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default CourseOutlineGenerator;
