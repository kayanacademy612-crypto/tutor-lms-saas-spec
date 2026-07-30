// AIQuizBuilder — generate quiz questions from a topic using AI.
//
// Flow:
//   1. User enters a topic, picks difficulty, count, and question mix.
//   2. "Generate" simulates an LLM call (mocked) and produces a preview.
//   3. User can deselect questions they don't want.
//   4. "Add to Quiz" calls onGenerated(selected) and closes the modal.
//
// When the real AI endpoint ships, swap `mockGenerate` for the actual
// `lmsApi` call — the component's contract stays the same.

import { useState } from "react";
import { Fragment } from "react";
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
  CheckCircleIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import { Button, Input, Textarea, Select, Badge, Checkbox } from "@/components/ui";

import {
  QUESTION_TYPE_LABELS,
  type QuizQuestion,
  type QuestionType,
} from "./index";

// ============================================================
// PROPS
// ============================================================

export interface AIQuizBuilderProps {
  onClose: () => void;
  onGenerated: (questions: QuizQuestion[]) => void;
}

// ============================================================
// TYPES
// ============================================================

type Difficulty = "beginner" | "intermediate" | "advanced" | "mixed";

interface GenerationConfig {
  topic: string;
  context: string;
  difficulty: Difficulty;
  count: number;
  types: QuestionType[];
  pointsPerQuestion: number;
}

// ============================================================
// MOCK GENERATOR
// In production this would call: lmsApi.quiz.generateWithAI(config)
// or a dedicated /api/lms/ai/quiz-generate endpoint. For now we
// synthesise plausible-looking questions locally.
// ============================================================

const SAMPLE_PROMPTS = [
  "Explain the core concept of {topic}.",
  "Which best describes {topic}?",
  "What is a common misconception about {topic}?",
  "Why does {topic} matter in practice?",
  "Give an example of {topic} in action.",
  "What are the trade-offs of {topic}?",
  "How would you apply {topic} to a real project?",
  "What's the difference between {topic} and a related concept?",
  "List two benefits of {topic}.",
  "Identify a limitation of {topic}.",
];

function mockGenerate(config: GenerationConfig): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (let i = 0; i < config.count; i++) {
    const type = config.types[i % config.types.length] ?? "multiple-choice";
    const prompt = SAMPLE_PROMPTS[i % SAMPLE_PROMPTS.length].replace(
      "{topic}",
      config.topic || "this topic",
    );

    const q: QuizQuestion = {
      id: `qn_ai_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title: `${prompt}`,
      points: config.pointsPerQuestion,
      sortOrder: i,
      hint: "",
      explanation: `Reference answer for: ${prompt}`,
    };

    if (type === "multiple-choice" || type === "image-answering" || type === "puzzle") {
      q.options = [
        { id: "a", label: "Option A (correct)", isCorrect: true },
        { id: "b", label: "Option B", isCorrect: false },
        { id: "c", label: "Option C", isCorrect: false },
        { id: "d", label: "Option D", isCorrect: false },
      ];
    } else if (type === "true-false") {
      q.trueFalseAnswer = i % 2 === 0;
    } else if (type === "short-answer" || type === "open-ended" || type === "fill-blanks") {
      q.acceptableAnswers = ["sample answer"];
    } else if (type === "matching") {
      q.matches = { Concept: "Definition", "Pros": "Cons", Theory: "Practice" };
    } else if (type === "ordering") {
      q.orderingItems = [
        { id: "o1", label: "Step 1", position: 1 },
        { id: "o2", label: "Step 2", position: 2 },
        { id: "o3", label: "Step 3", position: 3 },
      ];
    }

    out.push(q);
  }
  return out;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AIQuizBuilder({ onClose, onGenerated }: AIQuizBuilderProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  const [config, setConfig] = useState<GenerationConfig>({
    topic: "",
    context: "",
    difficulty: "intermediate",
    count: 5,
    types: ["multiple-choice", "true-false", "short-answer"],
    pointsPerQuestion: 1,
  });

  const [generated, setGenerated] = useState<QuizQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ---- handlers ----

  const update = <K extends keyof GenerationConfig>(key: K, value: GenerationConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  const toggleType = (t: QuestionType) =>
    setConfig((c) => {
      const has = c.types.includes(t);
      return {
        ...c,
        types: has ? c.types.filter((x) => x !== t) : [...c.types, t],
      };
    });

  const handleGenerate = async () => {
    setLoading(true);
    // Simulate latency to mimic an LLM round-trip.
    await new Promise((r) => setTimeout(r, 900));
    const result = mockGenerate(config);
    setGenerated(result);
    setSelectedIds(new Set(result.map((q) => q.id)));
    setLoading(false);
    setStep(2);
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = () => {
    const chosen = generated.filter((q) => selectedIds.has(q.id));
    if (chosen.length === 0) return;
    onGenerated(chosen);
  };

  const selectedCount = selectedIds.size;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
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
            className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* ===== Header ===== */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded bg-pink-500/10 text-pink-500">
                  <SparklesIcon className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                    AI Quiz Builder
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    Step {step} of 3 — {step === 1 ? "Configure" : step === 2 ? "Preview" : "Done"}
                  </p>
                </div>
              </div>
              <Button variant="flat" color="neutral" isIcon className="size-8" onClick={onClose}>
                <XMarkIcon className="size-4" />
              </Button>
            </header>

            {/* ===== Body ===== */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* ---------- STEP 1: Config ---------- */}
              {step === 1 && (
                <div className="space-y-4">
                  <Input
                    label="What's the quiz about?"
                    value={config.topic}
                    onChange={(e: any) => update("topic", e.target.value)}
                    placeholder="e.g., Introduction to React Hooks"
                    description="Be specific — the AI uses this to scope every question."
                  />

                  <Textarea
                    label="Additional context (optional)"
                    value={config.context}
                    onChange={(e: any) => update("context", e.target.value)}
                    rows={3}
                    placeholder="Audience, reading material URLs, key terms to include…"
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Select
                      label="Difficulty"
                      value={config.difficulty}
                      onChange={(e: any) =>
                        update("difficulty", e.target.value as Difficulty)
                      }
                      data={[
                        { value: "beginner", label: "Beginner" },
                        { value: "intermediate", label: "Intermediate" },
                        { value: "advanced", label: "Advanced" },
                        { value: "mixed", label: "Mixed" },
                      ]}
                    />
                    <Input
                      label="Number of questions"
                      type="number"
                      min={1}
                      max={20}
                      value={config.count}
                      onChange={(e: any) => update("count", Number(e.target.value))}
                      classNames={{ input: "h-9" }}
                    />
                    <Input
                      label="Points per question"
                      type="number"
                      min={1}
                      max={10}
                      value={config.pointsPerQuestion}
                      onChange={(e: any) =>
                        update("pointsPerQuestion", Number(e.target.value))
                      }
                      classNames={{ input: "h-9" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <AdjustmentsHorizontalIcon className="size-3.5 text-gray-400" />
                      <label className="text-sm font-medium text-gray-700 dark:text-dark-100">
                        Question Types
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      Pick at least one. The AI will distribute questions across the selected types.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => {
                        const m = QUESTION_TYPE_LABELS[t];
                        const active = config.types.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => toggleType(t)}
                            className={clsx(
                              "flex items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors",
                              active
                                ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-dark-500 dark:text-dark-100 dark:hover:bg-dark-800",
                            )}
                          >
                            <span>{m.icon}</span>
                            <span className="flex-1">{m.label}</span>
                            {active && <CheckCircleIcon className="size-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ---------- STEP 2: Preview ---------- */}
              {step === 2 && (
                <div className="space-y-3">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <ArrowPathIcon className="size-8 animate-spin text-primary-500" />
                      <p className="text-sm text-gray-500 dark:text-dark-300">
                        Generating {config.count} questions about "{config.topic}"…
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-md bg-primary-50 px-3 py-2 dark:bg-primary-500/10">
                        <p className="text-xs text-primary-700 dark:text-primary-300">
                          <SparklesIcon className="mr-1 inline size-3.5" />
                          Generated {generated.length} questions. Deselect any you don't want.
                        </p>
                        <Badge color="primary" variant="soft">
                          {selectedCount} selected
                        </Badge>
                      </div>
                      <ul className="space-y-2">
                        {generated.map((q, i) => {
                          const meta = QUESTION_TYPE_LABELS[q.type];
                          const checked = selectedIds.has(q.id);
                          return (
                            <li
                              key={q.id}
                              className={clsx(
                                "flex items-start gap-3 rounded-md border p-3 transition-colors",
                                checked
                                  ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                                  : "border-gray-200 opacity-60 dark:border-dark-500",
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onChange={() => toggleSelected(q.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-400">
                                    {i + 1}.
                                  </span>
                                  <Badge color="neutral" variant="soft" className="text-[10px]">
                                    {meta.icon} {meta.label}
                                  </Badge>
                                  <span className="text-[10px] text-gray-400">
                                    {q.points} pt{q.points === 1 ? "" : "s"}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-gray-800 dark:text-dark-100">
                                  {q.title}
                                </p>
                                {q.options && q.options.length > 0 && (
                                  <ul className="mt-1.5 space-y-0.5 text-xs text-gray-500 dark:text-dark-300">
                                    {q.options.map((o) => (
                                      <li key={o.id} className="flex items-center gap-1.5">
                                        {o.isCorrect ? (
                                          <CheckCircleIcon className="size-3 text-success-500" />
                                        ) : (
                                          <span className="size-3" />
                                        )}
                                        {o.label}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {q.trueFalseAnswer !== undefined && (
                                  <p className="mt-1 text-xs text-success-600 dark:text-success-400">
                                    Correct: {q.trueFalseAnswer ? "True" : "False"}
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* ---------- STEP 3: Done ---------- */}
              {step === 3 && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-success-500/10 text-success-600 dark:text-success-400">
                    <CheckCircleIcon className="size-7" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                    Questions added!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-dark-300">
                    {selectedCount} question{selectedCount === 1 ? "" : "s"} added to your quiz.
                  </p>
                </div>
              )}
            </div>

            {/* ===== Footer ===== */}
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="flex gap-2">
                {step > 1 && step < 3 && (
                  <Button
                    variant="flat"
                    color="neutral"
                    onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="flat" color="neutral" onClick={onClose}>
                  {step === 3 ? "Close" : "Cancel"}
                </Button>
                {step === 1 && (
                  <Button
                    color="primary"
                    onClick={handleGenerate}
                    disabled={
                      loading ||
                      !config.topic.trim() ||
                      config.types.length === 0
                    }
                    className="gap-1.5"
                  >
                    <SparklesIcon className="size-4" />
                    {loading ? "Generating…" : "Generate Questions"}
                  </Button>
                )}
                {step === 2 && !loading && (
                  <>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleGenerate}
                      className="gap-1.5"
                    >
                      <ArrowPathIcon className="size-4" />
                      Regenerate
                    </Button>
                    <Button
                      color="primary"
                      onClick={() => {
                        handleAdd();
                        setStep(3);
                      }}
                      disabled={selectedCount === 0}
                      className="gap-1.5"
                    >
                      <PlusIcon className="size-4" />
                      Add {selectedCount} to Quiz
                    </Button>
                  </>
                )}
                {step === 3 && (
                  <Button color="primary" onClick={onClose} className="gap-1.5">
                    <CheckCircleIcon className="size-4" />
                    Done
                  </Button>
                )}
              </div>
            </footer>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
