// QuizTake — quiz-taking interface for the active quiz.
//
// Supports the four most common question types: multiple_choice, true_false,
// short_answer (open-ended), and fill_blank. Renders a question palette,
// prev/next nav, a count-down timer when the quiz has a time limit, and a
// results screen on submit (score, pass/fail, per-question review with the
// correct answers).

// Import Dependencies
import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";
import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  ChevronDoubleRightIcon,
} from "@heroicons/react/24/outline";
import {
  CheckCircleIcon as CheckCircleSolidIcon,
  XCircleIcon as XCircleSolidIcon,
} from "@heroicons/react/24/solid";

// Local Imports
import { Button, Card, Badge, Textarea, Input } from "@/components/ui";
import { Checkbox, Radio } from "@/components/ui/Form";
import { ProgressBar } from "@/components/lms";
import type {
  Quiz,
  Question,
  QuizAnswer,
  QuizAttempt,
  QuestionType,
} from "@/types/lms";

// ----------------------------------------------------------------------

export interface QuizTakeProps {
  quiz: Quiz;
  /** Override the mock questions (e.g. when fetched from the API). */
  questions?: Question[];
  onPrev?: () => void;
  onNext?: () => void;
  /** Called after submit with the resulting attempt. */
  onSubmit?: (attempt: QuizAttempt) => void;
}

// ---- Mock questions --------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();

const MOCK_QUESTIONS: Question[] = [
  {
    id: "q-1",
    tenantId: "tenant-1",
    quizId: "quiz-1",
    questionType: "multiple_choice",
    prompt:
      "Which of the following are built-in React hooks? (Select all that apply.)",
    hint: "There are 2 correct answers.",
    explanation:
      "useState and useEffect are built-in hooks. useFetch and useDom are not.",
    points: 1,
    options: [
      { id: "opt-1", label: "useState", isCorrect: true },
      { id: "opt-2", label: "useFetch", isCorrect: false },
      { id: "opt-3", label: "useEffect", isCorrect: true },
      { id: "opt-4", label: "useDom", isCorrect: false },
    ],
    sortOrder: 0,
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "q-2",
    tenantId: "tenant-1",
    quizId: "quiz-1",
    questionType: "true_false",
    prompt: "A React function component must always return JSX.",
    explanation:
      "Components can return strings, numbers, arrays, fragments, or null — not only JSX.",
    points: 1,
    options: [
      { id: "tf-t", label: "True", isCorrect: false },
      { id: "tf-f", label: "False", isCorrect: true },
    ],
    sortOrder: 1,
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "q-3",
    tenantId: "tenant-1",
    quizId: "quiz-1",
    questionType: "short_answer",
    prompt:
      "Which hook would you use to memoise an expensive calculation between renders?",
    explanation: "useMemo caches a value and only recomputes when deps change.",
    acceptableAnswers: ["useMemo", "use memo", "useMemo()"],
    points: 1,
    sortOrder: 2,
    createdAt: iso(now),
    updatedAt: iso(now),
  },
  {
    id: "q-4",
    tenantId: "tenant-1",
    quizId: "quiz-1",
    questionType: "fill_blank",
    prompt:
      "The _____ hook lets you perform side effects in function components.",
    hint: "It's named after the thing it does.",
    explanation: "useEffect is the standard hook for synchronising side effects.",
    acceptableAnswers: ["useEffect", "use effect", "useEffect()"],
    points: 1,
    sortOrder: 3,
    createdAt: iso(now),
    updatedAt: iso(now),
  },
];

// ---- Helpers ----------------------------------------------------------

function fmtClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  short_answer: "Open-ended",
  essay: "Essay",
  fill_blank: "Fill in the blanks",
  matching: "Matching",
  ordering: "Ordering",
};

// ---- Grading ----------------------------------------------------------

/**
 * Grade a single answer against the canonical question definition.
 * Returns `true` when the answer is fully correct.
 */
function gradeAnswer(question: Question, answer: QuizAnswer): boolean {
  switch (question.questionType) {
    case "multiple_choice": {
      const selected = answer.selectedOptionIds ?? [];
      const correct = (question.options ?? [])
        .filter((o) => o.isCorrect)
        .map((o) => o.id);
      if (selected.length !== correct.length) return false;
      return correct.every((id) => selected.includes(id));
    }
    case "single_choice":
    case "true_false": {
      const selected = answer.selectedOptionIds ?? [];
      const correct = (question.options ?? [])
        .filter((o) => o.isCorrect)
        .map((o) => o.id);
      return (
        selected.length === 1 && correct.includes(selected[0])
      );
    }
    case "short_answer":
    case "fill_blank":
    case "essay": {
      const text = (answer.textAnswer ?? "").trim().toLowerCase();
      if (!text) return false;
      return (question.acceptableAnswers ?? []).some(
        (a) => a.trim().toLowerCase() === text,
      );
    }
    default:
      return false;
  }
}

// ----------------------------------------------------------------------

export default function QuizTake({
  quiz,
  questions: questionsProp,
  onPrev,
  onNext,
  onSubmit,
}: QuizTakeProps) {
  const questions = questionsProp ?? MOCK_QUESTIONS;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);

  const timeLimit = quiz.settings?.timeLimitSeconds;
  const [secondsLeft, setSecondsLeft] = useState(timeLimit ?? 0);

  // Count-down timer.
  useEffect(() => {
    if (submitted || !timeLimit || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          // Auto-submit on timeout.
          setSubmitted(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [submitted, timeLimit, secondsLeft]);

  const current = questions[currentIdx];
  const currentAnswer = answers[current?.id];

  const answeredCount = Object.keys(answers).length;
  const progressPct = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  // Build the final attempt + score.
  const buildAttempt = useCallback((): QuizAttempt => {
    const enriched = questions.map((q) => {
      const a = answers[q.id];
      if (!a) {
        return {
          questionId: q.id,
          isCorrect: false,
          pointsAwarded: 0,
        } as QuizAnswer;
      }
      const isCorrect = gradeAnswer(q, a);
      return {
        ...a,
        isCorrect,
        pointsAwarded: isCorrect ? q.points : 0,
      } as QuizAnswer;
    });
    const pointsEarned = enriched.reduce(
      (sum, a) => sum + (a.pointsAwarded ?? 0),
      0,
    );
    const pointsTotal = questions.reduce((sum, q) => sum + q.points, 0);
    const scorePct = pointsTotal > 0 ? Math.round((pointsEarned / pointsTotal) * 100) : 0;
    const passThreshold = quiz.settings?.passThresholdPct ?? 0;
    return {
      id: `att-${quiz.id}-${Date.now()}`,
      tenantId: "tenant-1",
      quizId: quiz.id,
      courseId: quiz.courseId,
      studentId: "student-1",
      enrollmentId: "enr-1",
      status: "submitted",
      attemptNo: 1,
      answers: enriched,
      scorePct,
      pointsEarned,
      pointsTotal,
      isPassed: scorePct >= passThreshold,
      timeSpentSec: timeLimit ? timeLimit - secondsLeft : 0,
      startedAt: iso(new Date(Date.now() - 60_000)),
      submittedAt: iso(new Date()),
      createdAt: iso(new Date()),
      updatedAt: iso(new Date()),
    };
  }, [answers, questions, quiz, secondsLeft, timeLimit]);

  const handleSubmit = useCallback(() => {
    const att = buildAttempt();
    setAttempt(att);
    setSubmitted(true);
    onSubmit?.(att);
  }, [buildAttempt, onSubmit]);

  // Answer mutators
  const setOptionAnswer = (questionId: string, optionIds: string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, selectedOptionIds: optionIds },
    }));
  };
  const setTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, textAnswer: text },
    }));
  };

  // ---- Render --------------------------------------------------------

  if (!current && !submitted) {
    return (
      <Card className="p-6 text-center text-sm text-gray-500 dark:text-dark-300">
        This quiz has no questions yet.
      </Card>
    );
  }

  // Results screen
  if (submitted && attempt) {
    return (
      <QuizResults
        quiz={quiz}
        attempt={attempt}
        questions={questions}
        onRetake={() => {
          setAnswers({});
          setCurrentIdx(0);
          setSubmitted(false);
          setAttempt(null);
          setSecondsLeft(timeLimit ?? 0);
        }}
        onPrev={onPrev}
        onNext={onNext}
      />
    );
  }

  const lowTime = timeLimit && secondsLeft <= 60;

  return (
    <div className="space-y-5">
      {/* Quiz header */}
      <Card skin="bordered" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge color="primary" variant="soft">
                <ClipboardDocumentCheckIcon className="size-3.5" />
                Quiz
              </Badge>
              {quiz.settings?.maxAttempts !== undefined && (
                <Badge color="neutral" variant="soft">
                  Max {quiz.settings.maxAttempts} attempts
                </Badge>
              )}
              {quiz.settings?.passThresholdPct !== undefined && (
                <Badge color="info" variant="soft">
                  Pass: {quiz.settings.passThresholdPct}%
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-xl font-semibold text-gray-800 dark:text-dark-50">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
                {quiz.description}
              </p>
            )}
          </div>
          {timeLimit && (
            <div
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold tabular-nums",
                lowTime
                  ? "border-error-300 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
                  : "border-gray-200 bg-gray-50 text-gray-700 dark:border-dark-600 dark:bg-dark-600 dark:text-dark-100",
              )}
            >
              <ClockIcon className="size-4 stroke-2" />
              {fmtClock(secondsLeft)}
            </div>
          )}
        </div>

        {/* Progress + question counter */}
        <div className="mt-4">
          <ProgressBar
            value={progressPct}
            color="primary"
            size="sm"
            label="Answered"
            hint={`${answeredCount} / ${questions.length}`}
          />
        </div>
      </Card>

      {/* Body: question + palette */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_180px]">
        {/* Question card */}
        <Card skin="bordered" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge color="neutral" variant="soft">
                Question {currentIdx + 1} of {questions.length}
              </Badge>
              <Badge color="info" variant="soft">
                {QUESTION_TYPE_LABEL[current.questionType]}
              </Badge>
              <Badge color="neutral" variant="soft">
                {current.points} pt{current.points === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>

          <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
            {current.prompt}
          </h2>
          {current.hint && (
            <p className="mt-1.5 text-xs italic text-gray-500 dark:text-dark-300">
              Hint: {current.hint}
            </p>
          )}

          {/* Answer area */}
          <div className="mt-5">
            <QuestionAnswerInput
              question={current}
              answer={currentAnswer}
              onOptionChange={(ids) => setOptionAnswer(current.id, ids)}
              onTextChange={(t) => setTextAnswer(current.id, t)}
            />
          </div>

          {/* Prev / Next / Submit footer */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-dark-600">
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="gap-1.5"
            >
              <ArrowLeftIcon className="size-4 stroke-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2">
              {currentIdx === questions.length - 1 ? (
                <Button
                  variant="filled"
                  color="success"
                  onClick={handleSubmit}
                  className="gap-1.5"
                >
                  <CheckCircleIcon className="size-4 stroke-2" />
                  Submit quiz
                </Button>
              ) : (
                <Button
                  variant="filled"
                  color="primary"
                  onClick={() =>
                    setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
                  }
                  className="gap-1.5"
                >
                  Next
                  <ArrowRightIcon className="size-4 stroke-2" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Question palette */}
        <Card skin="bordered" className="p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Question palette
          </h3>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              const isCurrent = idx === currentIdx;
              return (
                <Button
                  key={q.id}
                  unstyled
                  onClick={() => setCurrentIdx(idx)}
                  className={clsx(
                    "flex size-9 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                    isCurrent
                      ? "bg-primary-500 text-white"
                      : isAnswered
                        ? "bg-success-500/15 text-success-700 dark:bg-success-500/20 dark:text-success-300"
                        : "bg-gray-150 text-gray-600 hover:bg-gray-200 dark:bg-dark-500 dark:text-dark-200 dark:hover:bg-dark-450",
                  )}
                >
                  {idx + 1}
                </Button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-[11px] text-gray-500 dark:text-dark-300">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded bg-primary-500" /> Current
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded bg-success-500/30" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="size-3 rounded bg-gray-150 dark:bg-dark-500" /> Unanswered
            </div>
          </div>

          {/* Submit early */}
          <Button
            variant="soft"
            color="success"
            onClick={handleSubmit}
            className="mt-4 w-full gap-1.5 text-xs"
          >
            <ChevronDoubleRightIcon className="size-4 stroke-2" />
            Submit ({answeredCount}/{questions.length})
          </Button>
        </Card>
      </div>

      {/* Bottom prev/next (course-level) */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="flat"
          color="neutral"
          onClick={onPrev}
          disabled={!onPrev}
          className="gap-1.5 text-xs"
        >
          <ArrowLeftIcon className="size-3.5 stroke-2" />
          Previous item
        </Button>
        <Button
          variant="flat"
          color="neutral"
          onClick={onNext}
          disabled={!onNext}
          className="gap-1.5 text-xs"
        >
          Next item
          <ArrowRightIcon className="size-3.5 stroke-2" />
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

/** Per-question answer input — switches on question type. */
function QuestionAnswerInput({
  question,
  answer,
  onOptionChange,
  onTextChange,
}: {
  question: Question;
  answer?: QuizAnswer;
  onOptionChange: (optionIds: string[]) => void;
  onTextChange: (text: string) => void;
}) {
  const options = question.options ?? [];
  const selectedIds = answer?.selectedOptionIds ?? [];

  switch (question.questionType) {
    case "multiple_choice":
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = selectedIds.includes(opt.id);
            return (
              <label
                key={opt.id}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                  checked
                    ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600/50",
                )}
              >
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onOptionChange([...selectedIds, opt.id]);
                    } else {
                      onOptionChange(selectedIds.filter((id) => id !== opt.id));
                    }
                  }}
                />
                <span className="flex-1 text-gray-700 dark:text-dark-200">
                  {opt.label}
                </span>
              </label>
            );
          })}
          <p className="text-xs text-gray-400 dark:text-dark-400">
            Select all that apply.
          </p>
        </div>
      );

    case "single_choice":
    case "true_false":
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const checked = selectedIds[0] === opt.id;
            return (
              <label
                key={opt.id}
                className={clsx(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                  checked
                    ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600/50",
                )}
              >
                <Radio
                  name={`q-${question.id}`}
                  checked={checked}
                  onChange={() => onOptionChange([opt.id])}
                />
                <span className="flex-1 text-gray-700 dark:text-dark-200">
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
      );

    case "short_answer":
      return (
        <Input
          label="Your answer"
          placeholder="Type a short answer…"
          value={answer?.textAnswer ?? ""}
          onChange={(e) =>
            onTextChange((e.target as HTMLInputElement).value)
          }
        />
      );

    case "essay":
      return (
        <Textarea
          label="Your response"
          rows={6}
          placeholder="Write your essay response…"
          value={answer?.textAnswer ?? ""}
          onChange={(e) =>
            onTextChange((e.target as HTMLTextAreaElement).value)
          }
        />
      );

    case "fill_blank": {
      // Render the prompt with the blank shown inline; the input sits below.
      return (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-dark-200">
            Fill in the blank in the prompt above.
          </p>
          <Input
            label="Your answer for the blank"
            placeholder="Type the missing word…"
            value={answer?.textAnswer ?? ""}
            onChange={(e) =>
              onTextChange((e.target as HTMLInputElement).value)
            }
          />
        </div>
      );
    }

    default:
      return (
        <p className="text-xs text-gray-400 dark:text-dark-400">
          This question type ({question.questionType}) is not yet supported.
        </p>
      );
  }
}

// ----------------------------------------------------------------------

/** Results screen shown after submit. */
function QuizResults({
  quiz,
  attempt,
  questions,
  onRetake,
  onPrev,
  onNext,
}: {
  quiz: Quiz;
  attempt: QuizAttempt;
  questions: Question[];
  onRetake: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [showReview, setShowReview] = useState(false);
  const passed = !!attempt.isPassed;
  const passThreshold = quiz.settings?.passThresholdPct ?? 0;

  return (
    <div className="space-y-5">
      {/* Score banner */}
      <Card
        skin="bordered"
        className={clsx(
          "p-6 text-center",
          passed
            ? "border-success-300 bg-success-50 dark:border-success-500/30 dark:bg-success-500/10"
            : "border-error-300 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10",
        )}
      >
        <div
          className={clsx(
            "mx-auto flex size-14 items-center justify-center rounded-full",
            passed
              ? "bg-success-500/15 text-success-600 dark:bg-success-500/20 dark:text-success-300"
              : "bg-error-500/15 text-error-600 dark:bg-error-500/20 dark:text-error-300",
          )}
        >
          {passed ? (
            <TrophyIcon className="size-7 stroke-2" />
          ) : (
            <ExclamationTriangleIcon className="size-7 stroke-2" />
          )}
        </div>
        <h2 className="mt-3 text-2xl font-bold text-gray-800 dark:text-dark-50">
          {attempt.scorePct}%
        </h2>
        <p
          className={clsx(
            "mt-1 text-sm font-semibold",
            passed
              ? "text-success-700 dark:text-success-300"
              : "text-error-700 dark:text-error-300",
          )}
        >
          {passed ? "You passed!" : "You did not pass"}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
          {attempt.pointsEarned} / {attempt.pointsTotal} points · Pass threshold{" "}
          {passThreshold}% · {fmtClock(attempt.timeSpentSec ?? 0)} spent
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="soft"
            color="primary"
            onClick={() => setShowReview((v) => !v)}
            className="gap-1.5"
          >
            {showReview ? "Hide review" : "Review answers"}
          </Button>
          <Button
            variant="outlined"
            color="neutral"
            onClick={onRetake}
            className="gap-1.5"
          >
            <ArrowPathIcon className="size-4 stroke-2" />
            Retake quiz
          </Button>
        </div>
      </Card>

      {/* Per-question review */}
      {showReview && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Answer review
          </h3>
          {questions.map((q, idx) => {
            const ans = attempt.answers?.find((a) => a.questionId === q.id);
            const isCorrect = !!ans?.isCorrect;
            return (
              <Card key={q.id} skin="bordered" className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "mt-0.5 shrink-0",
                      isCorrect
                        ? "text-success-500 dark:text-success-400"
                        : "text-error-500 dark:text-error-400",
                    )}
                  >
                    {isCorrect ? (
                      <CheckCircleSolidIcon className="size-5" />
                    ) : (
                      <XCircleSolidIcon className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-400 dark:text-dark-400">
                        Q{idx + 1}.
                      </span>
                      <Badge
                        color={isCorrect ? "success" : "error"}
                        variant="soft"
                      >
                        {isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                      <Badge color="neutral" variant="soft">
                        {q.points} pt
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-800 dark:text-dark-100">
                      {q.prompt}
                    </p>

                    {/* Show selected vs correct */}
                    <div className="mt-2 space-y-1 text-xs">
                      <ReviewRow
                        label="Your answer"
                        value={formatAnswer(q, ans)}
                        tone={isCorrect ? "success" : "error"}
                      />
                      {!isCorrect && (
                        <ReviewRow
                          label="Correct answer"
                          value={formatCorrect(q)}
                          tone="success"
                        />
                      )}
                      {q.explanation && (
                        <p className="mt-2 rounded-md bg-gray-50 p-2 text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                          <span className="font-semibold">Explanation: </span>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom prev/next (course-level) */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="flat"
          color="neutral"
          onClick={onPrev}
          disabled={!onPrev}
          className="gap-1.5 text-xs"
        >
          <ArrowLeftIcon className="size-3.5 stroke-2" />
          Previous item
        </Button>
        <Button
          variant="flat"
          color="neutral"
          onClick={onNext}
          disabled={!onNext}
          className="gap-1.5 text-xs"
        >
          Next item
          <ArrowRightIcon className="size-3.5 stroke-2" />
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "error";
}) {
  return (
    <p
      className={clsx(
        "flex items-start gap-2",
        tone === "success"
          ? "text-success-700 dark:text-success-300"
          : "text-error-700 dark:text-error-300",
      )}
    >
      <span className="font-semibold">{label}:</span>
      <span>{value}</span>
    </p>
  );
}

function formatAnswer(q: Question, a?: QuizAnswer): string {
  if (!a) return "— (no answer)";
  if (a.selectedOptionIds && a.selectedOptionIds.length > 0) {
    const labels = (q.options ?? [])
      .filter((o) => a.selectedOptionIds!.includes(o.id))
      .map((o) => o.label);
    return labels.join(", ") || "—";
  }
  if (a.textAnswer) return a.textAnswer;
  return "—";
}

function formatCorrect(q: Question): string {
  if (q.options && q.options.length > 0) {
    return q.options.filter((o) => o.isCorrect).map((o) => o.label).join(", ");
  }
  if (q.acceptableAnswers && q.acceptableAnswers.length > 0) {
    return q.acceptableAnswers.join(" | ");
  }
  return "—";
}
