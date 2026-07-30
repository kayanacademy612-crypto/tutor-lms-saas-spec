// QuestionEditor — modal for adding / editing a single question.
//
// Supports all 13 question types via a type-aware answer config area:
//   • multiple-choice  → option list w/ radio "correct" picker
//   • true-false       → True/False radio
//   • open-ended       → essay char-limit + sample answer
//   • fill-blanks      → text with {{blanks}} and acceptable answers
//   • short-answer     → acceptable-answer list
//   • matching         → left/right pair list
//   • image-answering  → image URL + options
//   • ordering         → list with position numbers
//   • puzzle           → piece label list
//   • scale            → min/max/step config
//   • coordinates      → lat/lng target + tolerance
//   • pin-image        → image URL + target coords
//   • draw-image       → background image + prompt

import { useEffect, useMemo, useState } from "react";
import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpDownIcon,
  PuzzlePieceIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import {
  Button,
  Input,
  Textarea,
  Badge,
  Checkbox,
} from "@/components/ui";

import {
  QUESTION_TYPE_LABELS,
  type QuizQuestion,
  type QuestionType,
} from "./index";

// ============================================================
// PROPS
// ============================================================

export interface QuestionEditorProps {
  quizId: string;
  /** When omitted, the modal opens in "create" mode. */
  questionId?: string;
  /** Existing questions for the active quiz — used to derive next sortOrder. */
  questions: QuizQuestion[];
  onClose: () => void;
  onSave: (question: QuizQuestion) => void;
}

// ============================================================
// DEFAULTS — fresh question per type
// ============================================================

function newOption() {
  return {
    id: `opt_${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    isCorrect: false,
  };
}

function blankQuestion(type: QuestionType, sortOrder: number): QuizQuestion {
  const base: QuizQuestion = {
    id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: "",
    description: "",
    points: 1,
    sortOrder,
    hint: "",
    explanation: "",
  };

  switch (type) {
    case "multiple-choice":
      return {
        ...base,
        options: [newOption(), newOption(), newOption(), newOption()],
      };
    case "true-false":
      return { ...base, trueFalseAnswer: true };
    case "open-ended":
      return { ...base, acceptableAnswers: [""] };
    case "fill-blanks":
      return { ...base, acceptableAnswers: [""] };
    case "short-answer":
      return { ...base, acceptableAnswers: [""] };
    case "matching":
      return { ...base, matches: { "Item 1": "Match 1", "Item 2": "Match 2" } };
    case "image-answering":
      return { ...base, options: [newOption(), newOption()] };
    case "ordering":
      return {
        ...base,
        orderingItems: [
          { id: "o1", label: "First step", position: 1 },
          { id: "o2", label: "Second step", position: 2 },
          { id: "o3", label: "Third step", position: 3 },
        ],
      };
    case "puzzle":
      return { ...base, options: [newOption(), newOption(), newOption()] };
    case "scale":
      return { ...base, acceptableAnswers: ["1", "5"] };
    case "coordinates":
      return { ...base, acceptableAnswers: ["0,0"] };
    case "pin-image":
      return { ...base, acceptableAnswers: ["0,0"] };
    case "draw-image":
      return base;
    default:
      return base;
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function QuestionEditor({
  questionId,
  questions,
  onClose,
  onSave,
}: QuestionEditorProps) {
  const isEditing = !!questionId;
  const existing = useMemo(
    () => (questionId ? questions.find((q) => q.id === questionId) : null),
    [questionId, questions],
  );

  const [question, setQuestion] = useState<QuizQuestion>(
    () =>
      existing ??
      blankQuestion("multiple-choice", questions.length),
  );

  // Reset local state if the user swaps questionId while modal stays open.
  useEffect(() => {
    if (existing) setQuestion(existing);
  }, [existing]);

  const update = (patch: Partial<QuizQuestion>) =>
    setQuestion((q) => ({ ...q, ...patch }));

  const changeType = (type: QuestionType) => {
    // Preserve common fields; reset type-specific payload.
    setQuestion(blankQuestion(type, question.sortOrder));
  };

  const handleSave = () => {
    if (!question.title.trim()) return;
    onSave(question);
  };

  const meta = QUESTION_TYPE_LABELS[question.type];

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
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* ===== Header ===== */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <PuzzlePieceIcon className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                    {isEditing ? "Edit Question" : "Add Question"}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    {meta.icon} {meta.label}
                  </p>
                </div>
              </div>
              <Button
                variant="flat"
                color="neutral"
                isIcon
                className="size-8"
                onClick={onClose}
              >
                <XMarkIcon className="size-4" />
              </Button>
            </header>

            {/* ===== Body ===== */}
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {/* ----- Type selector ----- */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                  Question Type
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
                    (t) => {
                      const m = QUESTION_TYPE_LABELS[t];
                      const active = t === question.type;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => changeType(t)}
                          className={clsx(
                            "flex items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors",
                            active
                              ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
                              : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-dark-500 dark:text-dark-100 dark:hover:bg-dark-800",
                          )}
                        >
                          <span className="text-sm">{m.icon}</span>
                          <span className="flex-1">{m.label}</span>
                          {active && <CheckCircleIcon className="size-3.5" />}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* ----- Title + Points ----- */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px]">
                <Input
                  label="Question Title"
                  value={question.title}
                  onChange={(e: any) => update({ title: e.target.value })}
                  placeholder="Enter the question prompt…"
                />
                <Input
                  label="Points"
                  type="number"
                  min={0}
                  value={question.points}
                  onChange={(e: any) => update({ points: Number(e.target.value) })}
                  classNames={{ input: "h-9" }}
                />
              </div>

              {/* ----- Description ----- */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-dark-100">
                  Description (optional)
                </label>
                <Textarea
                  value={question.description ?? ""}
                  onChange={(e: any) => update({ description: e.target.value })}
                  placeholder="Add context, an image URL, or supporting text…"
                  rows={3}
                />
              </div>

              {/* ----- Type-specific answer config ----- */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                  Answer Configuration
                </label>
                <AnswerConfig question={question} update={update} />
              </div>

              {/* ----- Hint + Explanation ----- */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Hint (optional)"
                  value={question.hint ?? ""}
                  onChange={(e: any) => update({ hint: e.target.value })}
                  placeholder="Shown when the student is stuck"
                  classNames={{ input: "h-9" }}
                />
                <Input
                  label="Explanation (optional)"
                  value={question.explanation ?? ""}
                  onChange={(e: any) => update({ explanation: e.target.value })}
                  placeholder="Shown after submission"
                  classNames={{ input: "h-9" }}
                />
              </div>
            </div>

            {/* ===== Footer ===== */}
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="text-xs text-gray-500 dark:text-dark-300">
                {question.title.trim() ? (
                  <span className="inline-flex items-center gap-1 text-success-600 dark:text-success-400">
                    <CheckCircleIcon className="size-3.5" /> Ready to save
                  </span>
                ) : (
                  <span className="text-warning-600 dark:text-warning-400">
                    Title is required
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="flat" color="neutral" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={handleSave}
                  disabled={!question.title.trim()}
                  className="gap-1.5"
                >
                  <CheckCircleIcon className="size-4" />
                  {isEditing ? "Update Question" : "Add Question"}
                </Button>
              </div>
            </footer>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ============================================================
// ANSWER CONFIG — type-specific
// ============================================================

function AnswerConfig({
  question,
  update,
}: {
  question: QuizQuestion;
  update: (patch: Partial<QuizQuestion>) => void;
}) {
  switch (question.type) {
    case "multiple-choice":
    case "image-answering":
    case "puzzle":
      return <OptionsEditor question={question} update={update} />;

    case "true-false":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-dark-200">
            Correct Answer
          </label>
          <div className="flex gap-3">
            {[
              { v: true, l: "True" },
              { v: false, l: "False" },
            ].map((opt) => (
              <label
                key={String(opt.v)}
                className={clsx(
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  question.trueFalseAnswer === opt.v
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-dark-500 dark:text-dark-100 dark:hover:bg-dark-800",
                )}
              >
                <input
                  type="radio"
                  name="tf-answer"
                  checked={question.trueFalseAnswer === opt.v}
                  onChange={() => update({ trueFalseAnswer: opt.v })}
                  className="size-4 text-primary-600 focus:ring-primary-500/30"
                />
                {opt.l}
              </label>
            ))}
          </div>
        </div>
      );

    case "open-ended":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-dark-200">
            Sample Answer (used for manual grading reference)
          </label>
          <Textarea
            value={question.acceptableAnswers?.[0] ?? ""}
            onChange={(e: any) =>
              update({ acceptableAnswers: [e.target.value] })
            }
            rows={3}
            placeholder="A model answer students should aim for…"
          />
        </div>
      );

    case "fill-blanks":
      return (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Use <code className="rounded bg-gray-100 px-1 dark:bg-dark-800">{"{{blank}}"}</code> in
            the title to mark blanks. List acceptable answers below (one per line, blank separated by
            <code className="rounded bg-gray-100 px-1 dark:bg-dark-800">|</code>).
          </p>
          <Textarea
            value={(question.acceptableAnswers ?? []).join("\n")}
            onChange={(e: any) =>
              update({
                acceptableAnswers: e.target.value.split("\n").filter(Boolean),
              })
            }
            rows={4}
            placeholder={"color|colour\ntechnique"}
          />
        </div>
      );

    case "short-answer":
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-600 dark:text-dark-200">
            Acceptable Answers (any one counts as correct)
          </label>
          <Textarea
            value={(question.acceptableAnswers ?? []).join("\n")}
            onChange={(e: any) =>
              update({
                acceptableAnswers: e.target.value.split("\n").filter(Boolean),
              })
            }
            rows={3}
            placeholder={"One answer per line"}
          />
        </div>
      );

    case "matching":
      return <MatchingEditor question={question} update={update} />;

    case "ordering":
      return <OrderingEditor question={question} update={update} />;

    case "scale":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Input
            label="Min value"
            type="number"
            value={question.acceptableAnswers?.[0] ?? "1"}
            onChange={(e: any) =>
              update({
                acceptableAnswers: [
                  e.target.value,
                  question.acceptableAnswers?.[1] ?? "5",
                ],
              })
            }
            classNames={{ input: "h-9" }}
          />
          <Input
            label="Max value"
            type="number"
            value={question.acceptableAnswers?.[1] ?? "5"}
            onChange={(e: any) =>
              update({
                acceptableAnswers: [
                  question.acceptableAnswers?.[0] ?? "1",
                  e.target.value,
                ],
              })
            }
            classNames={{ input: "h-9" }}
          />
          <Input
            label="Step"
            type="number"
            value={question.acceptableAnswers?.[2] ?? "1"}
            onChange={(e: any) =>
              update({
                acceptableAnswers: [
                  question.acceptableAnswers?.[0] ?? "1",
                  question.acceptableAnswers?.[1] ?? "5",
                  e.target.value,
                ],
              })
            }
            classNames={{ input: "h-9" }}
          />
        </div>
      );

    case "coordinates":
    case "pin-image":
      return (
        <div className="space-y-3">
          <Input
            label={question.type === "pin-image" ? "Image URL" : "Map center (lat,lng)"}
            value={question.description ?? ""}
            onChange={(e: any) => update({ description: e.target.value })}
            placeholder={
              question.type === "pin-image"
                ? "https://example.com/image.png"
                : "37.7749,-122.4194"
            }
            classNames={{ input: "h-9" }}
          />
          <Input
            label="Target coordinates (x,y or lat,lng)"
            value={question.acceptableAnswers?.[0] ?? ""}
            onChange={(e: any) =>
              update({ acceptableAnswers: [e.target.value] })
            }
            placeholder="0.5,0.5"
            classNames={{ input: "h-9" }}
          />
        </div>
      );

    case "draw-image":
      return (
        <div className="space-y-2">
          <Input
            label="Background Image URL (optional)"
            value={question.description ?? ""}
            onChange={(e: any) => update({ description: e.target.value })}
            placeholder="https://example.com/background.png"
            classNames={{ input: "h-9" }}
          />
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Students will be able to draw on the canvas. Grading is manual.
          </p>
        </div>
      );

    default:
      return null;
  }
}

// ============================================================
// OPTIONS EDITOR — used by multiple-choice / image-answering / puzzle
// ============================================================

function OptionsEditor({
  question,
  update,
}: {
  question: QuizQuestion;
  update: (patch: Partial<QuizQuestion>) => void;
}) {
  const options = question.options ?? [];
  const isMulti = question.type === "multiple-choice" || question.type === "image-answering";

  const setOption = (id: string, patch: Partial<(typeof options)[number]>) =>
    update({ options: options.map((o) => (o.id === id ? { ...o, ...patch } : o)) });

  const addOption = () => update({ options: [...options, newOption()] });

  const removeOption = (id: string) =>
    update({ options: options.filter((o) => o.id !== id) });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-dark-300">
          {isMulti ? "Mark the correct option(s)." : "Define the puzzle pieces."}
        </span>
        <Button
          variant="flat"
          color="primary"
          onClick={addOption}
          className="gap-1 text-xs"
        >
          <PlusIcon className="size-3.5" />
          Add Option
        </Button>
      </div>
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={opt.id} className="flex items-center gap-2">
            {isMulti ? (
              <Checkbox
                checked={opt.isCorrect}
                onChange={(e: any) => setOption(opt.id, { isCorrect: e.target.checked })}
              />
            ) : (
              <span className="flex size-6 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 dark:bg-dark-600 dark:text-dark-200">
                {i + 1}
              </span>
            )}
            <Input
              value={opt.label}
              onChange={(e: any) => setOption(opt.id, { label: e.target.value })}
              placeholder={`Option ${i + 1}`}
              classNames={{ input: "h-9" }}
            />
            <Button
              variant="flat"
              color="error"
              isIcon
              className="size-8 shrink-0"
              onClick={() => removeOption(opt.id)}
              disabled={options.length <= 2}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MATCHING EDITOR
// ============================================================

function MatchingEditor({
  question,
  update,
}: {
  question: QuizQuestion;
  update: (patch: Partial<QuizQuestion>) => void;
}) {
  const matches = question.matches ?? {};
  const entries = Object.entries(matches);

  const setPair = (oldKey: string, newKey: string, value: string) => {
    const next = { ...matches };
    delete next[oldKey];
    next[newKey] = value;
    update({ matches: next });
  };

  const addPair = () =>
    update({ matches: { ...matches, [`Item ${entries.length + 1}`]: `Match ${entries.length + 1}` } });

  const removePair = (key: string) => {
    const next = { ...matches };
    delete next[key];
    update({ matches: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-dark-300">
          Left items are matched to right items.
        </span>
        <Button
          variant="flat"
          color="primary"
          onClick={addPair}
          className="gap-1 text-xs"
        >
          <PlusIcon className="size-3.5" />
          Add Pair
        </Button>
      </div>
      <div className="space-y-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <Input
              value={key}
              onChange={(e: any) => setPair(key, e.target.value, value)}
              placeholder="Left item"
              classNames={{ input: "h-9" }}
            />
            <ChevronUpDownIcon className="size-4 shrink-0 text-gray-400" />
            <Input
              value={value}
              onChange={(e: any) => setPair(key, key, e.target.value)}
              placeholder="Right item"
              classNames={{ input: "h-9" }}
            />
            <Button
              variant="flat"
              color="error"
              isIcon
              className="size-8 shrink-0"
              onClick={() => removePair(key)}
              disabled={entries.length <= 2}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ORDERING EDITOR
// ============================================================

function OrderingEditor({
  question,
  update,
}: {
  question: QuizQuestion;
  update: (patch: Partial<QuizQuestion>) => void;
}) {
  const items = question.orderingItems ?? [];

  const setLabel = (id: string, label: string) =>
    update({
      orderingItems: items.map((it) => (it.id === id ? { ...it, label } : it)),
    });

  const move = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((it) => it.id === id);
    const next = [...items];
    const swapWith = idx + dir;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    update({
      orderingItems: next.map((it, i) => ({ ...it, position: i + 1 })),
    });
  };

  const remove = (id: string) =>
    update({
      orderingItems: items
        .filter((it) => it.id !== id)
        .map((it, i) => ({ ...it, position: i + 1 })),
    });

  const add = () =>
    update({
      orderingItems: [
        ...items,
        { id: `o_${Date.now()}`, label: "New step", position: items.length + 1 },
      ],
    });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-dark-300">
          Students will arrange these in the correct order.
        </span>
        <Button
          variant="flat"
          color="primary"
          onClick={add}
          className="gap-1 text-xs"
        >
          <PlusIcon className="size-3.5" />
          Add Step
        </Button>
      </div>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center gap-2">
            <Badge color="primary" variant="soft" className="shrink-0 text-xs">
              {i + 1}
            </Badge>
            <Input
              value={it.label}
              onChange={(e: any) => setLabel(it.id, e.target.value)}
              placeholder="Step description"
              classNames={{ input: "h-9" }}
            />
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-8 shrink-0"
              onClick={() => move(it.id, -1)}
              disabled={i === 0}
              title="Move up"
            >
              <ArrowUpIcon className="size-4" />
            </Button>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-8 shrink-0"
              onClick={() => move(it.id, 1)}
              disabled={i === items.length - 1}
              title="Move down"
            >
              <ArrowDownIcon className="size-4" />
            </Button>
            <Button
              variant="flat"
              color="error"
              isIcon
              className="size-8 shrink-0"
              onClick={() => remove(it.id)}
              disabled={items.length <= 2}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
