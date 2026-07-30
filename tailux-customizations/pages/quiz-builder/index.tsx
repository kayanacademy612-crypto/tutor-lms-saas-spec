// Quiz Builder — standalone authoring surface for LMS quizzes.
//
// Layout (3-pane):
//   ┌─────────────┬──────────────────────────────┬──────────────┐
//   │ Quiz list   │ Active quiz editor            │ Question     │
//   │ + create    │ (title, description, settings)│ list + add   │
//   └─────────────┴──────────────────────────────┴──────────────┘
//
// The center pane hosts <QuizEditor>, the right pane is the question
// list. Editing a question opens <QuestionEditor> in a modal.
// <QuizImportExport> and <AIQuizBuilder> are reachable from the header.
//
// Data is mocked for now — each CRUD op updates local state but is
// structured so swapping in `lmsApi` calls later is a one-line change
// (the mock fns have the same signature shape as the API client).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Input } from "@/components/ui";
import { EmptyState, LoadingState, ErrorState } from "@/components/lms";

import QuizEditor from "./QuizEditor";
import QuestionEditor from "./QuestionEditor";
import QuizImportExport from "./QuizImportExport";
import AIQuizBuilder from "./AIQuizBuilder";

// ============================================================
// SHARED TYPES — exported so the child components stay in sync.
// ============================================================

/** Extended quiz settings surface — Tutor LMS exposes ~25 toggles. */
export interface QuizSettings {
  // Grading
  passingGrade: number; // %
  gradingMethod: "auto" | "manual" | "hybrid";
  passRequired: boolean;
  // Attempts
  allowMultipleAttempts: boolean;
  attemptsAllowed: number;
  // Question pool / ordering
  questionOrder: "random" | "sorting" | "ascending" | "descending";
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  limitMaxQuestions: boolean;
  maxQuestions: number;
  randomizeFromPool: number; // 0 = disabled
  // Time
  enableTimeLimit: boolean;
  timeValue: number;
  timeType: "minutes" | "hours" | "days" | "weeks";
  hideTimer: boolean;
  autoStart: boolean;
  autoStartDelay: number; // seconds
  // Layout & UX
  layout: "single" | "list";
  showPagination: boolean;
  enableAnswerReveal: boolean;
  hidePrev: boolean;
  hideQuestionNum: boolean;
  openEndedLimit: number; // chars
  // Review & feedback
  allowReview: boolean;
  allowPauseResume: boolean;
  showCorrectAnswers: boolean;
  notifyOnSubmit: boolean;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  points: number;
  // Type-specific answer payloads (only the relevant one is populated):
  options?: { id: string; label: string; isCorrect: boolean }[];
  trueFalseAnswer?: boolean;
  acceptableAnswers?: string[];
  matches?: Record<string, string>;
  orderingItems?: { id: string; label: string; position: number }[];
  hint?: string;
  explanation?: string;
  sortOrder: number;
}

export type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "open-ended"
  | "fill-blanks"
  | "short-answer"
  | "matching"
  | "image-answering"
  | "ordering"
  | "puzzle"
  | "scale"
  | "coordinates"
  | "pin-image"
  | "draw-image";

export interface QuizBuilderQuiz {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  totalPoints: number;
  settings: QuizSettings;
  questions: QuizQuestion[];
  updatedAt: string;
}

// ============================================================
// DEFAULTS
// ============================================================

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  passingGrade: 50,
  gradingMethod: "auto",
  passRequired: true,
  allowMultipleAttempts: true,
  attemptsAllowed: 3,
  questionOrder: "random",
  shuffleQuestions: false,
  shuffleAnswers: false,
  limitMaxQuestions: false,
  maxQuestions: 10,
  randomizeFromPool: 0,
  enableTimeLimit: true,
  timeValue: 60,
  timeType: "minutes",
  hideTimer: false,
  autoStart: false,
  autoStartDelay: 5,
  layout: "single",
  showPagination: false,
  enableAnswerReveal: false,
  hidePrev: false,
  hideQuestionNum: false,
  openEndedLimit: 500,
  allowReview: true,
  allowPauseResume: true,
  showCorrectAnswers: false,
  notifyOnSubmit: true,
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, { label: string; icon: string }> = {
  "multiple-choice": { label: "Multiple Choice", icon: "◉" },
  "true-false": { label: "True/False", icon: "✓" },
  "open-ended": { label: "Open-Ended/Essay", icon: "✍" },
  "fill-blanks": { label: "Fill in the Blanks", icon: "__" },
  "short-answer": { label: "Short Answer", icon: "Aa" },
  matching: { label: "Matching", icon: "⇄" },
  "image-answering": { label: "Image Answering", icon: "🖼" },
  ordering: { label: "Ordering", icon: "↕" },
  puzzle: { label: "Puzzle", icon: "🧩" },
  scale: { label: "Scale", icon: "📏" },
  coordinates: { label: "Coordinates", icon: "⊕" },
  "pin-image": { label: "Pin the Answer", icon: "📌" },
  "draw-image": { label: "Draw on Image", icon: "✏" },
};

// ============================================================
// MOCK DATA — simulates a paginated `GET /api/lms/topics/{id}/quizzes`.
// ============================================================

const MOCK_QUIZZES: QuizBuilderQuiz[] = [
  {
    id: "qz_001",
    title: "Introduction to Social Media Marketing",
    description: "Test your understanding of the core concepts from the intro topic.",
    isPublished: true,
    totalPoints: 25,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    settings: { ...DEFAULT_QUIZ_SETTINGS },
    questions: [
      {
        id: "qn_001",
        type: "multiple-choice",
        title: "What is the primary goal of social media marketing?",
        points: 5,
        options: [
          { id: "a", label: "Increase brand awareness", isCorrect: true },
          { id: "b", label: "Print more business cards", isCorrect: false },
          { id: "c", label: "Reduce website uptime", isCorrect: false },
          { id: "d", label: "Replace email entirely", isCorrect: false },
        ],
        sortOrder: 0,
      },
      {
        id: "qn_002",
        type: "true-false",
        title: "Engagement rate is a vanity metric with no business value.",
        points: 5,
        trueFalseAnswer: false,
        sortOrder: 1,
      },
    ],
  },
  {
    id: "qz_002",
    title: "Content Strategy Fundamentals",
    description: "Validate your grasp of content calendars, pillars, and formats.",
    isPublished: false,
    totalPoints: 40,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    settings: { ...DEFAULT_QUIZ_SETTINGS, passingGrade: 70 },
    questions: [],
  },
  {
    id: "qz_003",
    title: "Paid Advertising 101",
    description: "Quick check on ad formats, bidding, and audience targeting.",
    isPublished: true,
    totalPoints: 15,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    settings: { ...DEFAULT_QUIZ_SETTINGS, timeValue: 30, attemptsAllowed: 1 },
    questions: [
      {
        id: "qn_010",
        type: "short-answer",
        title: "Name one benefit of lookalike audiences.",
        points: 5,
        acceptableAnswers: ["reach", "scale", "automation"],
        sortOrder: 0,
      },
    ],
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function QuizBuilder() {
  // List state — mirrors what `useQuizzes()` would return.
  const [quizzes, setQuizzes] = useState<QuizBuilderQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection state.
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Modals.
  const [showImportExport, setShowImportExport] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Question editor state.
  const [editingQuestion, setEditingQuestion] = useState<{
    quizId: string;
    questionId?: string;
  } | null>(null);

  // ---- Mock fetch (would be: lmsApi.quiz.list(topicId).then(...)) ----
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 400)); // simulate latency
      setQuizzes(MOCK_QUIZZES);
      if (MOCK_QUIZZES[0]) setActiveQuizId(MOCK_QUIZZES[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuizzes();
  }, [fetchQuizzes]);

  // ---- Derived ----
  const activeQuiz = useMemo(
    () => quizzes.find((q) => q.id === activeQuizId) ?? null,
    [quizzes, activeQuizId],
  );

  const filteredQuizzes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quizzes;
    return quizzes.filter(
      (q) =>
        q.title.toLowerCase().includes(term) ||
        q.description.toLowerCase().includes(term),
    );
  }, [quizzes, search]);

  // ---- Mutations (would call lmsApi.quiz.create / update / remove) ----
  const createQuiz = useCallback(() => {
    const newQuiz: QuizBuilderQuiz = {
      id: `qz_${Date.now()}`,
      title: "Untitled Quiz",
      description: "",
      isPublished: false,
      totalPoints: 0,
      settings: { ...DEFAULT_QUIZ_SETTINGS },
      questions: [],
      updatedAt: new Date().toISOString(),
    };
    setQuizzes((prev) => [newQuiz, ...prev]);
    setActiveQuizId(newQuiz.id);
  }, []);

  const updateQuiz = useCallback((id: string, patch: Partial<QuizBuilderQuiz>) => {
    setQuizzes((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, ...patch, updatedAt: new Date().toISOString() }
          : q,
      ),
    );
  }, []);

  const deleteQuiz = useCallback(
    (id: string) => {
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (activeQuizId === id) {
        setActiveQuizId(quizzes.find((q) => q.id !== id)?.id ?? null);
      }
    },
    [activeQuizId, quizzes],
  );

  const duplicateQuiz = useCallback(
    (id: string) => {
      const orig = quizzes.find((q) => q.id === id);
      if (!orig) return;
      const copy: QuizBuilderQuiz = {
        ...orig,
        id: `qz_${Date.now()}`,
        title: `${orig.title} (copy)`,
        isPublished: false,
        updatedAt: new Date().toISOString(),
      };
      setQuizzes((prev) => [copy, ...prev]);
    },
    [quizzes],
  );

  // Question CRUD — also local-mock (would be lmsApi.question.create etc.).
  const upsertQuestion = useCallback(
    (quizId: string, question: QuizQuestion) => {
      setQuizzes((prev) =>
        prev.map((q) => {
          if (q.id !== quizId) return q;
          const exists = q.questions.some((qn) => qn.id === question.id);
          const next = exists
            ? q.questions.map((qn) => (qn.id === question.id ? question : qn))
            : [...q.questions, question];
          return {
            ...q,
            questions: next,
            totalPoints: next.reduce((sum, n) => sum + n.points, 0),
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [],
  );

  const deleteQuestion = useCallback((quizId: string, questionId: string) => {
    setQuizzes((prev) =>
      prev.map((q) => {
        if (q.id !== quizId) return q;
        const next = q.questions.filter((qn) => qn.id !== questionId);
        return {
          ...q,
          questions: next,
          totalPoints: next.reduce((sum, n) => sum + n.points, 0),
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  // ---- Import / Export handlers ----
  const handleExport = useCallback(() => {
    setShowImportExport(true);
  }, []);

  const handleImported = useCallback(
    (imported: QuizBuilderQuiz[]) => {
      setQuizzes((prev) => [...imported, ...prev]);
      if (imported[0]) setActiveQuizId(imported[0].id);
      setShowImportExport(false);
    },
    [],
  );

  // ---- AI builder handler ----
  const handleAIGenerated = useCallback(
    (questions: QuizQuestion[]) => {
      if (!activeQuiz) return;
      const reordered = questions.map((q, i) => ({ ...q, sortOrder: i }));
      const merged = [...activeQuiz.questions, ...reordered];
      updateQuiz(activeQuiz.id, {
        questions: merged,
        totalPoints: merged.reduce((sum, n) => sum + n.points, 0),
      });
      setShowAI(false);
    },
    [activeQuiz, updateQuiz],
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Page title="Quiz Builder">
      <div className="min-h-screen bg-gray-50 p-4 dark:bg-dark-800 sm:p-6">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4">
          {/* ===== Top header bar ===== */}
          <Card skin="bordered" className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <AcademicCapIcon className="size-5 stroke-2" />
              </div>
              <div className="leading-tight">
                <h1 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                  Quiz Builder
                </h1>
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  Author quizzes, manage question banks, and grade attempts.
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                variant="flat"
                color="primary"
                onClick={() => setShowAI(true)}
                className="gap-1.5 text-sm"
              >
                <SparklesIcon className="size-4" />
                AI Builder
              </Button>
              <Button
                variant="outlined"
                color="neutral"
                onClick={handleExport}
                className="gap-1.5 text-sm"
              >
                <ArrowDownTrayIcon className="size-4" />
                Import / Export
              </Button>
              {activeQuiz && (
                <Button color="primary" className="gap-1.5 text-sm">
                  <CloudArrowUpIcon className="size-4" />
                  Save Quiz
                </Button>
              )}
            </div>
          </Card>

          {/* ===== 3-pane layout ===== */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
            {/* ---------- LEFT SIDEBAR — quiz list ---------- */}
            <Card skin="bordered" className="flex h-[78vh] flex-col overflow-hidden p-0">
              <div className="border-b border-gray-200 p-3 dark:border-dark-600">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                    Quizzes
                  </h2>
                  <Badge color="primary" variant="soft" className="text-xs">
                    {quizzes.length}
                  </Badge>
                </div>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-dark-300" />
                  <Input
                    value={search}
                    onChange={(e: any) => setSearch(e.target.value)}
                    placeholder="Search quizzes"
                    classNames={{ input: "h-9 pl-9" }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <LoadingState message="Loading quizzes…" inline />
                ) : error ? (
                  <ErrorState error={error} onRetry={fetchQuizzes} />
                ) : filteredQuizzes.length === 0 ? (
                  <EmptyState
                    icon={PuzzlePieceIcon}
                    title="No quizzes yet"
                    description={
                      search
                        ? `No quizzes match "${search}".`
                        : "Create your first quiz to get started."
                    }
                    actionLabel="Create Quiz"
                    onAction={createQuiz}
                    compact
                  />
                ) : (
                  <ul className="space-y-0.5 p-2">
                    {filteredQuizzes.map((quiz) => (
                      <li key={quiz.id}>
                        <QuizListItem
                          quiz={quiz}
                          active={quiz.id === activeQuizId}
                          onSelect={() => setActiveQuizId(quiz.id)}
                          onDuplicate={() => duplicateQuiz(quiz.id)}
                          onDelete={() => deleteQuiz(quiz.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-gray-200 p-3 dark:border-dark-600">
                <Button
                  color="primary"
                  onClick={createQuiz}
                  className="w-full gap-1.5 text-sm"
                >
                  <PlusIcon className="size-4" />
                  Create Quiz
                </Button>
              </div>
            </Card>

            {/* ---------- CENTER — active quiz editor ---------- */}
            <Card skin="bordered" className="flex h-[78vh] flex-col overflow-hidden p-0">
              {!activeQuiz ? (
                <div className="flex h-full items-center justify-center">
                  <EmptyState
                    icon={PuzzlePieceIcon}
                    title="No quiz selected"
                    description="Select a quiz from the left, or create a new one to begin authoring."
                    actionLabel="Create Quiz"
                    onAction={createQuiz}
                  />
                </div>
              ) : (
                <QuizEditor
                  key={activeQuiz.id}
                  quiz={activeQuiz}
                  onChange={(patch) => updateQuiz(activeQuiz.id, patch)}
                  onPublish={() =>
                    updateQuiz(activeQuiz.id, { isPublished: !activeQuiz.isPublished })
                  }
                />
              )}
            </Card>

            {/* ---------- RIGHT — question list ---------- */}
            <Card skin="bordered" className="flex h-[78vh] flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-gray-200 p-3 dark:border-dark-600">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                  Questions
                </h2>
                {activeQuiz && (
                  <Badge color="neutral" variant="soft" className="text-xs">
                    {activeQuiz.questions.length}
                  </Badge>
                )}
              </div>

              {!activeQuiz ? (
                <div className="flex flex-1 items-center justify-center p-4">
                  <p className="text-center text-xs text-gray-400 dark:text-dark-400">
                    Select a quiz to view its questions.
                  </p>
                </div>
              ) : activeQuiz.questions.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-4">
                  <EmptyState
                    icon={PlusIcon}
                    title="No questions"
                    description="Add a question to start building this quiz."
                    actionLabel="Add Question"
                    onAction={() =>
                      setEditingQuestion({ quizId: activeQuiz.id })
                    }
                    compact
                  />
                </div>
              ) : (
                <ul className="flex-1 space-y-2 overflow-y-auto p-3">
                  {activeQuiz.questions.map((q, i) => (
                    <li key={q.id}>
                      <QuestionListItem
                        index={i}
                        question={q}
                        onEdit={() =>
                          setEditingQuestion({
                            quizId: activeQuiz.id,
                            questionId: q.id,
                          })
                        }
                        onDelete={() => deleteQuestion(activeQuiz.id, q.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {activeQuiz && (
                <div className="border-t border-gray-200 p-3 dark:border-dark-600">
                  <Button
                    variant="soft"
                    color="primary"
                    onClick={() => setEditingQuestion({ quizId: activeQuiz.id })}
                    className="w-full gap-1.5 text-sm"
                  >
                    <PlusIcon className="size-4" />
                    Add Question
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ===== Modals ===== */}
      {editingQuestion && (
        <QuestionEditor
          quizId={editingQuestion.quizId}
          questionId={editingQuestion.questionId}
          questions={
            quizzes.find((q) => q.id === editingQuestion.quizId)?.questions ?? []
          }
          onClose={() => setEditingQuestion(null)}
          onSave={(question) => {
            upsertQuestion(editingQuestion.quizId, question);
            setEditingQuestion(null);
          }}
        />
      )}

      {showImportExport && (
        <QuizImportExport
          quizzes={quizzes}
          onClose={() => setShowImportExport(false)}
          onImported={handleImported}
        />
      )}

      {showAI && (
        <AIQuizBuilder
          onClose={() => setShowAI(false)}
          onGenerated={handleAIGenerated}
        />
      )}
    </Page>
  );
}

// ============================================================
// SUB-COMPONENTS — kept in this file because they're tightly
// coupled to the layout state and not reused elsewhere.
// ============================================================

function QuizListItem({
  quiz,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  quiz: QuizBuilderQuiz;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        "group rounded-md border p-2.5 transition-colors",
        active
          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
          : "border-transparent hover:bg-gray-50 dark:hover:bg-dark-800",
      )}
    >
      <button onClick={onSelect} className="block w-full text-left">
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-dark-50">
            {quiz.title || "Untitled Quiz"}
          </span>
          {quiz.isPublished ? (
            <Badge color="success" variant="soft" className="shrink-0 text-[10px]">
              Published
            </Badge>
          ) : (
            <Badge color="neutral" variant="soft" className="shrink-0 text-[10px]">
              Draft
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500 dark:text-dark-300">
          <span>{quiz.questions.length} Q</span>
          <span>{quiz.totalPoints} pts</span>
          <span>{quiz.settings.passingGrade}% pass</span>
        </div>
      </button>
      <div className="mt-1.5 flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="flat"
          color="neutral"
          isIcon
          className="size-6"
          onClick={onDuplicate}
          title="Duplicate"
        >
          <DocumentDuplicateIcon className="size-3.5 text-gray-500 dark:text-dark-200" />
        </Button>
        <Button
          variant="flat"
          color="error"
          isIcon
          className="size-6"
          onClick={onDelete}
          title="Delete"
        >
          <TrashIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function QuestionListItem({
  index,
  question,
  onEdit,
  onDelete,
}: {
  index: number;
  question: QuizQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = QUESTION_TYPE_LABELS[question.type];
  return (
    <div className="group rounded-md border border-gray-200 p-2.5 hover:bg-gray-50 dark:border-dark-500 dark:hover:bg-dark-800">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-xs font-medium text-gray-400">{index + 1}.</span>
        <button onClick={onEdit} className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{meta.icon}</span>
            <span className="truncate text-xs font-medium text-gray-800 dark:text-dark-100">
              {question.title || "Untitled question"}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400 dark:text-dark-400">
            <span>{meta.label}</span>
            <span>•</span>
            <span>{question.points} pt{question.points === 1 ? "" : "s"}</span>
          </div>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="flat"
            color="neutral"
            isIcon
            className="size-6"
            onClick={onEdit}
            title="Edit"
          >
            <PencilSquareIcon className="size-3.5 text-gray-500 dark:text-dark-200" />
          </Button>
          <Button
            variant="flat"
            color="error"
            isIcon
            className="size-6"
            onClick={onDelete}
            title="Delete"
          >
            <TrashIcon className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
