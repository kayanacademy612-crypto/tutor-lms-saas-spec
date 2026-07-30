// QuizGenerator — modal that drives `useGenerateQuiz`.
//
// Form inputs:
//   - topic (required, free text)
//   - lessonId (optional — free text since this modal is launched from the
//     AI tutor which has no lesson context; the course-builder passes a
//     lessonId when invoked from there)
//   - questionCount (1..20, default 5)
//   - questionTypes (multi-select: multiple_choice / true_false / short_answer
//     / essay)
//
// On "Generate", calls `useGenerateQuiz().mutate(...)`. The result `quiz`
// payload is rendered as a list of questions when it has the expected shape,
// otherwise the JSON is pretty-printed as a fallback. "Create Quiz" hands the
// payload to the parent so it can route into the quiz builder.

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
import { Button, Checkbox, Input } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/lms";
import { useGenerateQuiz } from "@/hooks/useReportsAI";

// ----------------------------------------------------------------------

const QUESTION_TYPES = [
  { id: "multiple_choice", label: "Multiple choice" },
  { id: "true_false", label: "True / False" },
  { id: "short_answer", label: "Short answer" },
  { id: "essay", label: "Essay" },
] as const;

interface QuizOption {
  text?: string;
  correct?: boolean;
}
interface QuizQuestion {
  type?: string;
  prompt?: string;
  question?: string;
  options?: QuizOption[];
  answer?: string;
  explanation?: string;
}
interface QuizShape {
  title?: string;
  description?: string;
  questions?: QuizQuestion[];
}

// ----------------------------------------------------------------------

export interface QuizGeneratorProps {
  open: boolean;
  onClose: () => void;
  lessonId?: string;
  onCreated?: (quiz: unknown) => void;
}

export function QuizGenerator({
  open,
  onClose,
  lessonId,
  onCreated,
}: QuizGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<string[]>([
    "multiple_choice",
    "true_false",
  ]);

  const generate = useGenerateQuiz();
  const quiz = generate.data?.quiz as QuizShape | undefined;

  const toggleType = (id: string) => {
    setTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || types.length === 0) return;
    await generate.mutate({
      topic: topic.trim(),
      lessonId,
      questionCount: count,
      questionTypes: types,
    });
  };

  const handleCreateQuiz = () => {
    if (!quiz) return;
    onCreated?.(quiz);
    onClose();
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
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-700">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-primary-500" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                    Generate Quiz
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                    Describe the topic and the AI will draft practice questions.
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

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {!quiz ? (
                <form onSubmit={handleGenerate} className="space-y-4 p-5">
                  <Input
                    label="Topic"
                    placeholder="e.g. Photosynthesis"
                    value={topic}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTopic(e.target.value)
                    }
                    required
                  />
                  <Input
                    label="Question count"
                    type="number"
                    min={1}
                    max={20}
                    value={count}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCount(Number(e.target.value))
                    }
                  />
                  <div>
                    <p className="input-label text-sm font-medium text-gray-700 dark:text-dark-200">
                      Question types
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      {QUESTION_TYPES.map((t) => (
                        <Checkbox
                          key={t.id}
                          label={t.label}
                          checked={types.includes(t.id)}
                          onChange={() => toggleType(t.id)}
                        />
                      ))}
                    </div>
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
                      disabled={
                        generate.loading ||
                        !topic.trim() ||
                        types.length === 0
                      }
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
                  <QuizResult quiz={quiz} />

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
                      onClick={handleCreateQuiz}
                      className="gap-1.5"
                    >
                      <ArrowRightCircleIcon className="size-4" />
                      Create Quiz
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {generate.loading && !quiz && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-dark-700/70">
                <LoadingState message="Generating quiz…" />
              </div>
            )}
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ----------------------------------------------------------------------

function QuizResult({ quiz }: { quiz: QuizShape }) {
  const questions = quiz.questions ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
          {quiz.title ?? "Generated quiz"}
        </h3>
        {quiz.description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-dark-200">
            {quiz.description}
          </p>
        )}
      </div>

      {questions.length > 0 ? (
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li
              key={i}
              className="rounded-lg border border-gray-200 p-3 dark:border-dark-600"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {i + 1}. {q.prompt ?? q.question ?? `Question ${i + 1}`}
                </p>
                {q.type && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600 dark:bg-dark-600 dark:text-dark-300">
                    {q.type.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              {q.options && q.options.length > 0 && (
                <ul className="mt-2 space-y-1 pl-4 text-sm text-gray-700 dark:text-dark-200">
                  {q.options.map((o, j) => (
                    <li
                      key={j}
                      className={
                        o.correct
                          ? "font-medium text-success-700 dark:text-success-400"
                          : ""
                      }
                    >
                      <span className="mr-1">{String.fromCharCode(65 + j)}.</span>
                      {o.text}
                      {o.correct && " ✓"}
                    </li>
                  ))}
                </ul>
              )}
              {q.answer && (
                <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
                  <span className="font-medium">Answer:</span> {q.answer}
                </p>
              )}
              {q.explanation && (
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
                  <span className="font-medium">Explanation:</span>{" "}
                  {q.explanation}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-dark-600 dark:text-dark-200">
          {JSON.stringify(quiz, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default QuizGenerator;
