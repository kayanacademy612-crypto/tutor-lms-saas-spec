// QuestionRenderers — 13 pluggable renderers that display a question and
// capture the student's answer. One renderer per supported question type.
//
// Each renderer accepts a uniform `{ question, answer, onAnswerChange }`
// props triple so callers can swap them via `<QuestionRendererSwitch>`.
//
// Conventions:
//   - `question` is treated as `any` (permissive) so this file can be reused
//     across different backend question schemas.
//   - `answer` may be `undefined` (no answer yet).
//   - `onAnswerChange(value)` is called with the new answer — the value type
//     is per-renderer (string, number, array, {x,y}, canvasDataUrl, …).
//
// Uses ONLY tailux components from `@/components/ui`.

// Import Dependencies
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  CheckIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  XMarkIcon,
  MapPinIcon,
  PencilSquareIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Select,
  Range,
} from "@/components/ui";
import { Radio } from "@/components/ui/Form/Radio";

// ----------------------------------------------------------------------
// Shared types
// ----------------------------------------------------------------------

export interface QuestionRendererProps {
  /** Canonical question object (treated as `any` for schema flexibility). */
  question: any;
  /** Current answer for this question (may be undefined). */
  answer?: any;
  /** Called whenever the student changes their answer. */
  onAnswerChange: (answer: any) => void;
}

// ----------------------------------------------------------------------
// Shared sub-components
// ----------------------------------------------------------------------

/**
 * Header that renders the question title (from `question.title` or
 * `question.prompt`) and an optional description (from `question.description`
 * or `question.hint`). Renders nothing when no title is available.
 */
function QuestionHeader({
  question,
  hint,
}: {
  question: any;
  hint?: ReactNode;
}) {
  const title: string | undefined =
    question?.title ?? question?.prompt ?? undefined;
  const description: string | undefined =
    question?.description ?? question?.hint ?? undefined;

  return (
    <div className="space-y-1.5">
      {title && (
        <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-dark-300">
          {description}
        </p>
      )}
      {hint && (
        <div className="text-xs italic text-gray-400 dark:text-dark-400">
          {hint}
        </div>
      )}
    </div>
  );
}

/** Wrapper that gives every renderer a consistent outer padding + spacing. */
function RendererShell({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

/** Fallback shown when an unknown question type is encountered. */
function NotSupported({ type }: { type: string }) {
  return (
    <Card skin="bordered" className="p-4 text-sm text-gray-500 dark:text-dark-300">
      Question type <code className="font-mono">{type}</code> is not yet
      supported.
    </Card>
  );
}

// ----------------------------------------------------------------------
// 1. MultipleChoiceRenderer — radio buttons, student selects one
// ----------------------------------------------------------------------

export function MultipleChoiceRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const options: Array<{ id?: string; label: string }> =
    question?.options ?? [];

  // Accept either a bare string (option id) or { selectedOptionId }.
  const selectedId: string | undefined =
    typeof answer === "string" || typeof answer === "number"
      ? String(answer)
      : answer?.selectedOptionId ?? answer?.selectedOptionIds?.[0];

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="space-y-2">
        {options.map((opt, idx) => {
          const id = opt.id ?? String(idx);
          const checked = selectedId === id;
          return (
            <label
              key={id}
              className={clsx(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors",
                checked
                  ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                  : "border-gray-200 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600/50",
              )}
            >
              <Radio
                name={`q-mc-${question?.id ?? "q"}`}
                checked={checked}
                onChange={() => onAnswerChange(id)}
              />
              <span className="flex-1 text-gray-700 dark:text-dark-200">
                {opt.label}
              </span>
            </label>
          );
        })}
        {options.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-dark-400">
            No options provided for this question.
          </p>
        )}
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 2. TrueFalseRenderer — two buttons (True / False), student clicks one
// ----------------------------------------------------------------------

export function TrueFalseRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  // Accept either "true" / "false" or an option id.
  const normalized = String(answer ?? "").toLowerCase();
  const trueSelected =
    normalized === "true" ||
    normalized === "t" ||
    normalized === "1" ||
    normalized === "yes";
  const falseSelected =
    normalized === "false" || normalized === "f" || normalized === "0" ||
    normalized === "no";

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={trueSelected ? "filled" : "outlined"}
          color={trueSelected ? "success" : "neutral"}
          onClick={() => onAnswerChange("true")}
          className="gap-2 py-6"
        >
          <CheckIcon className="size-5 stroke-2" />
          True
        </Button>
        <Button
          variant={falseSelected ? "filled" : "outlined"}
          color={falseSelected ? "error" : "neutral"}
          onClick={() => onAnswerChange("false")}
          className="gap-2 py-6"
        >
          <XMarkIcon className="size-5 stroke-2" />
          False
        </Button>
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 3. OpenEndedRenderer — textarea for essay response with character count
// ----------------------------------------------------------------------

export function OpenEndedRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const maxLength: number | undefined = question?.maxLength ?? question?.maxChars;
  const text: string = typeof answer === "string" ? answer : answer?.text ?? "";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      onAnswerChange(maxLength ? next.slice(0, maxLength) : next);
    },
    [maxLength, onAnswerChange],
  );

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <Textarea
        label="Your response"
        rows={6}
        placeholder="Write your essay response…"
        value={text}
        onChange={handleChange}
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-dark-400">
        <span>
          {maxLength
            ? `Max ${maxLength} characters`
            : "No character limit"}
        </span>
        <span className="tabular-nums">
          {text.length}
          {maxLength ? ` / ${maxLength}` : ""} chars
        </span>
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 4. FillBlanksRenderer — text with {blank} markers replaced by inputs
// ----------------------------------------------------------------------

/**
 * Parses `question.prompt` (or `question.text`) for `{blank}` markers and
 * returns an array of segments: strings + blank markers. Blanks may be
 * numbered ({blank:1}) or plain ({blank}).
 */
function parseBlanks(prompt: string): Array<{ type: "text"; value: string } | { type: "blank"; key: string }> {
  const segments: Array<{ type: "text"; value: string } | { type: "blank"; key: string }> = [];
  const regex = /\{blank(?::([a-zA-Z0-9_-]+))?\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blankCounter = 0;
  while ((match = regex.exec(prompt)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: prompt.slice(lastIndex, match.index),
      });
    }
    const key = match[1] ?? String(blankCounter++);
    segments.push({ type: "blank", key });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < prompt.length) {
    segments.push({ type: "text", value: prompt.slice(lastIndex) });
  }
  return segments;
}

export function FillBlanksRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const prompt: string = question?.prompt ?? question?.text ?? "";
  const segments = useMemo(() => parseBlanks(prompt), [prompt]);

  // `answer` may be: string[] (positional), Record<string,string> (by key),
  // or { values: string[] } / { values: Record<string,string> }.
  const values: Record<string, string> = useMemo(() => {
    if (!answer) return {};
    if (Array.isArray(answer)) {
      const out: Record<string, string> = {};
      answer.forEach((v, i) => (out[String(i)] = v ?? ""));
      return out;
    }
    if (typeof answer === "object") {
      if (Array.isArray(answer.values)) {
        const out: Record<string, string> = {};
        answer.values.forEach(
          (v: string, i: number) => (out[String(i)] = v ?? ""),
        );
        return out;
      }
      if (answer.values && typeof answer.values === "object") {
        return answer.values;
      }
      return answer;
    }
    return {};
  }, [answer]);

  const setBlank = (key: string, val: string) => {
    const next = { ...values, [key]: val };
    // Emit a structured object so the caller can tell blanks apart by key.
    onAnswerChange({ values: next, blanks: segments.filter(s => s.type === "blank").map(s => (s as any).key) });
  };

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <Card skin="bordered" className="p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm leading-relaxed text-gray-700 dark:text-dark-200">
          {segments.map((seg, idx) => {
            if (seg.type === "text") {
              return (
                <span key={`t-${idx}`}>{seg.value}</span>
              );
            }
            return (
              <Input
                key={`b-${seg.key}`}
                unstyled
                value={values[seg.key] ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBlank(seg.key, e.target.value)
                }
                placeholder={`blank ${Number(seg.key) + 1}`}
                classNames={{
                  input:
                    "mx-1 w-32 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-primary-600 dark:border-dark-450 dark:bg-dark-600 dark:text-dark-100",
                }}
              />
            );
          })}
        </p>
      </Card>
      <p className="text-xs text-gray-400 dark:text-dark-400">
        Fill in all the blanks. Each blank accepts a short text answer.
      </p>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 5. ShortAnswerRenderer — single-line input
// ----------------------------------------------------------------------

export function ShortAnswerRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const text: string = typeof answer === "string" ? answer : answer?.text ?? "";
  const placeholder: string =
    question?.placeholder ?? "Type a short answer…";

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <Input
        label="Your answer"
        placeholder={placeholder}
        value={text}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onAnswerChange(e.target.value)
        }
      />
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 6. MatchingRenderer — two columns, student picks matches via dropdowns
// ----------------------------------------------------------------------

export function MatchingRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  // Pairs may be supplied as:
  //   - { pairs: [{ id, left, right }] }
  //   - { left: [...], right: [...] }
  //   - { matches: { leftId: rightLabel } }
  const pairs: Array<{ id: string; left: string; right: string }> =
    useMemo(() => {
      if (Array.isArray(question?.pairs)) {
        return question.pairs.map(
          (p: any, i: number) => ({
            id: String(p.id ?? i),
            left: String(p.left ?? p.prompt ?? ""),
            right: String(p.right ?? p.answer ?? ""),
          }),
        );
      }
      if (Array.isArray(question?.left) && Array.isArray(question?.right)) {
        return question.left.map((l: any, i: number) => ({
          id: String(i),
          left: String(l),
          right: String(question.right[i] ?? ""),
        }));
      }
      if (question?.matches && typeof question.matches === "object") {
        return Object.entries(question.matches).map(([l, r], i) => ({
          id: String(i),
          left: l,
          right: String(r),
        }));
      }
      return [];
    }, [question]);

  // Right-side options are shuffled for the dropdown list.
  const rightOptions = useMemo(() => {
    const arr = pairs.map((p) => ({ value: p.id, label: p.right }));
    // Deterministic-ish shuffle so the right side isn't trivially aligned.
    return [...arr].sort((a, b) => a.label.localeCompare(b.label));
  }, [pairs]);

  // `answer` is Record<leftId, rightId>.
  const selection: Record<string, string> = useMemo(() => {
    if (!answer) return {};
    if (typeof answer === "object") return answer;
    return {};
  }, [answer]);

  const setMatch = (leftId: string, rightId: string) => {
    onAnswerChange({ ...selection, [leftId]: rightId });
  };

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="space-y-3">
        {pairs.map((p) => {
          const selectedRightId = selection[p.id] ?? "";
          return (
            <Card
              key={p.id}
              skin="bordered"
              className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
            >
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 dark:bg-dark-600 dark:text-dark-100">
                {p.left}
              </div>
              <span className="text-center text-xs text-gray-400 dark:text-dark-400">
                ←→
              </span>
              <Select
                value={selectedRightId}
                onChange={(e) => setMatch(p.id, e.target.value)}
                data={[
                  { value: "", label: "— select match —" },
                  ...rightOptions,
                ]}
              />
            </Card>
          );
        })}
        {pairs.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-dark-400">
            No matching pairs provided for this question.
          </p>
        )}
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 7. ImageAnsweringRenderer — grid of images, student clicks one
// ----------------------------------------------------------------------

export function ImageAnsweringRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const images: Array<{ id?: string; url: string; label?: string }> =
    question?.images ?? question?.options ?? [];
  const selectedId: string | undefined =
    typeof answer === "string" || typeof answer === "number"
      ? String(answer)
      : answer?.imageId ?? answer?.selectedOptionId;

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((img, idx) => {
          const id = String(img.id ?? idx);
          const isSelected = selectedId === id;
          return (
            <button
              type="button"
              key={id}
              onClick={() => onAnswerChange(id)}
              className={clsx(
                "group relative overflow-hidden rounded-lg border-2 bg-gray-50 transition-all dark:bg-dark-600",
                isSelected
                  ? "border-primary-500 ring-2 ring-primary-500/30 dark:border-primary-400"
                  : "border-gray-200 hover:border-primary-400 dark:border-dark-500 dark:hover:border-primary-500",
              )}
            >
              <div className="flex aspect-square items-center justify-center bg-gray-100 dark:bg-dark-500">
                {img.url ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img
                    src={img.url}
                    alt={img.label ?? `Option ${idx + 1}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <PhotoIcon className="size-10 text-gray-300 dark:text-dark-400" />
                )}
              </div>
              {img.label && (
                <div className="px-2 py-1.5 text-center text-xs font-medium text-gray-700 dark:text-dark-200">
                  {img.label}
                </div>
              )}
              {isSelected && (
                <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary-500 text-white shadow-sm">
                  <CheckIcon className="size-3.5 stroke-2" />
                </span>
              )}
            </button>
          );
        })}
        {images.length === 0 && (
          <p className="col-span-full text-xs text-gray-400 dark:text-dark-400">
            No images provided for this question.
          </p>
        )}
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 8. OrderingRenderer — list of items, student reorders with up/down buttons
// ----------------------------------------------------------------------

export function OrderingRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const items: Array<{ id?: string; label: string }> =
    question?.items ?? question?.options ?? [];

  // `answer` is string[] of item ids in the user's chosen order.
  const order: string[] = useMemo(() => {
    if (Array.isArray(answer)) {
      return answer.map(String);
    }
    if (answer?.order && Array.isArray(answer.order)) {
      return answer.order.map(String);
    }
    // Default to the original question order.
    return items.map((it, idx) => String(it.id ?? idx));
  }, [answer, items]);

  const orderedItems = useMemo(() => {
    return order
      .map((id) => items.find((it, idx) => String(it.id ?? idx) === id))
      .filter(Boolean) as Array<{ id?: string; label: string }>;
  }, [order, items]);

  const move = (fromIdx: number, toIdx: number) => {
    if (
      toIdx < 0 ||
      toIdx >= order.length ||
      fromIdx === toIdx
    )
      return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onAnswerChange(next);
  };

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="space-y-2">
        {orderedItems.map((item, idx) => {
          const id = String(item.id ?? idx);
          return (
            <div
              key={id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-600"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-xs font-semibold text-primary-700 dark:bg-primary-500/20 dark:text-primary-300">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm text-gray-700 dark:text-dark-100">
                {item.label}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  isIcon
                  variant="soft"
                  color="neutral"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="size-7"
                >
                  <ArrowUpIcon className="size-4 stroke-2" />
                </Button>
                <Button
                  isIcon
                  variant="soft"
                  color="neutral"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === orderedItems.length - 1}
                  className="size-7"
                >
                  <ArrowDownIcon className="size-4 stroke-2" />
                </Button>
              </div>
            </div>
          );
        })}
        {orderedItems.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-dark-400">
            No items provided for this question.
          </p>
        )}
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 9. PuzzleRenderer — simplified: cards arranged via up/down buttons
// ----------------------------------------------------------------------

export function PuzzleRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const pieces: Array<{ id?: string; label: string; color?: string }> =
    question?.pieces ?? question?.items ?? [];

  const order: string[] = useMemo(() => {
    if (Array.isArray(answer)) return answer.map(String);
    if (answer?.order && Array.isArray(answer.order)) {
      return answer.order.map(String);
    }
    return pieces.map((p, idx) => String(p.id ?? idx));
  }, [answer, pieces]);

  const orderedPieces = useMemo(() => {
    return order
      .map((id) => pieces.find((p, idx) => String(p.id ?? idx) === id))
      .filter(Boolean) as Array<{ id?: string; label: string; color?: string }>;
  }, [order, pieces]);

  const move = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= order.length || fromIdx === toIdx) return;
    const next = [...order];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onAnswerChange(next);
  };

  // A small palette of colours for the puzzle cards when no colour is supplied.
  const palette = [
    "bg-primary-500/15 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
    "bg-info-500/15 text-info-700 dark:bg-info-500/20 dark:text-info-300",
    "bg-success-500/15 text-success-700 dark:bg-success-500/20 dark:text-success-300",
    "bg-warning-500/15 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300",
    "bg-error-500/15 text-error-700 dark:bg-error-500/20 dark:text-error-300",
  ];

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <p className="text-xs text-gray-400 dark:text-dark-400">
        Arrange the puzzle pieces in the correct order using the arrows.
      </p>
      <div className="space-y-2">
        {orderedPieces.map((piece, idx) => {
          const id = String(piece.id ?? idx);
          const colorClass = piece.color ?? palette[idx % palette.length];
          return (
            <div
              key={id}
              className={clsx(
                "flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-dark-600",
                colorClass,
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/70 text-xs font-bold dark:bg-dark-700/70">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium">{piece.label}</span>
              <div className="flex items-center gap-1">
                <Button
                  isIcon
                  variant="soft"
                  color="neutral"
                  onClick={() => move(idx, idx - 1)}
                  disabled={idx === 0}
                  className="size-7"
                >
                  <ArrowUpIcon className="size-4 stroke-2" />
                </Button>
                <Button
                  isIcon
                  variant="soft"
                  color="neutral"
                  onClick={() => move(idx, idx + 1)}
                  disabled={idx === orderedPieces.length - 1}
                  className="size-7"
                >
                  <ArrowDownIcon className="size-4 stroke-2" />
                </Button>
              </div>
            </div>
          );
        })}
        {orderedPieces.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-dark-400">
            No puzzle pieces provided for this question.
          </p>
        )}
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 10. ScaleRenderer — slider / range input from min to max
// ----------------------------------------------------------------------

export function ScaleRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const min: number = Number(question?.min ?? 0);
  const max: number = Number(question?.max ?? 10);
  const step: number = Number(question?.step ?? 1);
  const labels: string[] | undefined = question?.labels;

  const value: number =
    typeof answer === "number"
      ? answer
      : typeof answer === "string" && answer !== ""
        ? Number(answer)
        : typeof answer?.value === "number"
          ? answer.value
          : min;

  const clamped = Math.min(max, Math.max(min, value));

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <Card skin="bordered" className="p-5">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 dark:text-dark-400">
              Current value
            </div>
            <div className="text-3xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
              {clamped}
            </div>
          </div>
          <Badge color="neutral" variant="soft">
            {min} – {max}
          </Badge>
        </div>
        <Range
          min={min}
          max={max}
          step={step}
          value={clamped}
          color="primary"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onAnswerChange(Number(e.target.value))
          }
          className="w-full"
        />
        {labels && labels.length > 0 && (
          <div className="mt-3 flex justify-between text-[11px] text-gray-400 dark:text-dark-400">
            {labels.slice(0, max - min + 1).map((lbl, i) => (
              <span key={i} className="flex-1 text-center">
                {lbl}
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex justify-between text-xs text-gray-400 dark:text-dark-400">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </Card>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 11. CoordinatesRenderer — clickable grid/graph, capture (x, y)
// ----------------------------------------------------------------------

export function CoordinatesRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const width: number = Number(question?.width ?? 300);
  const height: number = Number(question?.height ?? 300);
  const gridStep: number = Number(question?.step ?? 30);

  // `answer` is { x, y } in pixels (relative to the grid box).
  const point: { x: number; y: number } | undefined = useMemo(() => {
    if (!answer) return undefined;
    if (typeof answer === "object") {
      return { x: Number(answer.x ?? 0), y: Number(answer.y ?? 0) };
    }
    return undefined;
  }, [answer]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    onAnswerChange({ x, y });
  };

  // Build the gridlines using repeating linear gradients.
  const gridStyle: CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
    backgroundImage: `
      linear-gradient(to right, rgba(156,163,175,0.25) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(156,163,175,0.25) 1px, transparent 1px)
    `,
    backgroundSize: `${gridStep}px ${gridStep}px`,
  };

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="flex flex-wrap items-start gap-5">
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAnswerChange(point ?? { x: width / 2, y: height / 2 });
            }
          }}
          style={gridStyle}
          className="relative cursor-crosshair rounded-md border border-gray-300 bg-white dark:border-dark-500 dark:bg-dark-600"
          aria-label="Clickable coordinate grid"
        >
          {point && (
            <span
              className="pointer-events-none absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary-500 shadow-md"
              style={{ left: point.x, top: point.y }}
            >
              <span className="size-1 rounded-full bg-white" />
            </span>
          )}
        </div>
        <Card skin="bordered" className="min-w-[160px] p-3 text-sm">
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Selected point
          </div>
          {point ? (
            <div className="space-y-0.5 font-mono text-sm">
              <div>
                x: <span className="font-semibold text-gray-800 dark:text-dark-50">{point.x}</span>
              </div>
              <div>
                y: <span className="font-semibold text-gray-800 dark:text-dark-50">{point.y}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-dark-400">
              Click anywhere on the grid to set a point.
            </p>
          )}
          {point && (
            <Button
              variant="flat"
              color="neutral"
              onClick={() => onAnswerChange(undefined)}
              className="mt-2 w-full text-xs"
            >
              <XMarkIcon className="size-3.5 stroke-2" />
              Clear point
            </Button>
          )}
        </Card>
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 12. PinImageRenderer — image with click handler, capture click coords
// ----------------------------------------------------------------------

export function PinImageRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const imageUrl: string | undefined =
    question?.imageUrl ?? question?.image ?? question?.url;
  const width: number = Number(question?.width ?? 480);

  // `answer` is { x, y } as percentages (0–100) so it scales with the image.
  const pin: { x: number; y: number } | undefined = useMemo(() => {
    if (!answer) return undefined;
    if (typeof answer === "object") {
      return { x: Number(answer.x ?? 0), y: Number(answer.y ?? 0) };
    }
    return undefined;
  }, [answer]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    onAnswerChange({
      x: Math.round(xPct * 10) / 10,
      y: Math.round(yPct * 10) / 10,
    });
  };

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="flex flex-wrap items-start gap-5">
        <div
          role="button"
          tabIndex={0}
          onClick={handleImageClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAnswerChange(pin ?? { x: 50, y: 50 });
            }
          }}
          style={{ maxWidth: `${width}px` }}
          className={clsx(
            "relative w-full cursor-crosshair overflow-hidden rounded-lg border border-gray-300 dark:border-dark-500",
            !imageUrl && "flex aspect-video items-center justify-center bg-gray-50 dark:bg-dark-600",
          )}
          aria-label="Click to drop a pin"
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Question"
              className="block w-full select-none"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400 dark:text-dark-400">
              <PhotoIcon className="size-10" />
              <span className="text-xs">No image provided</span>
            </div>
          )}
          {pin && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              <MapPinIcon className="size-7 fill-primary-500 stroke-white stroke-2" />
            </span>
          )}
        </div>
        <Card skin="bordered" className="min-w-[160px] p-3 text-sm">
          <div className="mb-1 text-xs uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Pin position
          </div>
          {pin ? (
            <div className="space-y-0.5 font-mono text-sm">
              <div>
                x: <span className="font-semibold text-gray-800 dark:text-dark-50">{pin.x}%</span>
              </div>
              <div>
                y: <span className="font-semibold text-gray-800 dark:text-dark-50">{pin.y}%</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-dark-400">
              Click the image to drop a pin.
            </p>
          )}
          {pin && (
            <Button
              variant="flat"
              color="neutral"
              onClick={() => onAnswerChange(undefined)}
              className="mt-2 w-full text-xs"
            >
              <XMarkIcon className="size-3.5 stroke-2" />
              Remove pin
            </Button>
          )}
        </Card>
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// 13. DrawImageRenderer — canvas element with basic pen drawing
// ----------------------------------------------------------------------

export function DrawImageRenderer({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState<string>("#1f6feb");
  const [penSize, setPenSize] = useState<number>(3);

  const width: number = Number(question?.width ?? 480);
  const height: number = Number(question?.height ?? 320);

  // Restore a previously saved drawing (answer is a dataURL).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const dataUrl: string | undefined =
      typeof answer === "string" ? answer : answer?.dataUrl;
    if (dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = dataUrl;
    }
    // We deliberately only run this effect on mount — restoring the answer
    // mid-flight would clobber in-progress strokes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onAnswerChange(canvas.toDataURL("image/png"));
  }, [onAnswerChange]);

  const getCanvasPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getCanvasPos(e);
    const last = lastPosRef.current ?? pos;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      lastPosRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      persist();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    persist();
  };

  const penColors = ["#1f6feb", "#111827", "#dc2626", "#16a34a", "#f59e0b"];

  return (
    <RendererShell>
      <QuestionHeader question={question} />
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-dark-600 dark:bg-dark-600">
          <div className="flex items-center gap-1.5">
            <PencilSquareIcon className="size-4 text-gray-400 dark:text-dark-300" />
            <span className="text-xs font-medium text-gray-600 dark:text-dark-200">
              Pen
            </span>
          </div>
          <div className="flex items-center gap-1">
            {penColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setPenColor(c)}
                aria-label={`Pen colour ${c}`}
                className={clsx(
                  "size-6 rounded-full border-2 transition-transform",
                  penColor === c
                    ? "scale-110 border-gray-700 dark:border-dark-100"
                    : "border-white hover:scale-105 dark:border-dark-400",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-dark-300">Size</span>
            <Range
              min={1}
              max={20}
              step={1}
              value={penSize}
              color="primary"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPenSize(Number(e.target.value))
              }
              className="w-28"
            />
            <span className="w-6 text-center text-xs tabular-nums text-gray-600 dark:text-dark-200">
              {penSize}
            </span>
          </div>
          <div className="ml-auto">
            <Button
              variant="soft"
              color="neutral"
              onClick={handleClear}
              className="gap-1.5 text-xs"
            >
              <ArrowPathIcon className="size-3.5 stroke-2" />
              Clear
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-dark-500">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: "100%", height: "auto", touchAction: "none" }}
            className="block cursor-crosshair"
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-dark-400">
          Draw your answer using the pen tool. Your drawing is saved
          automatically as a PNG when you lift the pen.
        </p>
      </div>
    </RendererShell>
  );
}

// ----------------------------------------------------------------------
// QuestionRendererSwitch — dispatches to the correct renderer
// ----------------------------------------------------------------------

/**
 * Switch component that picks the right renderer for a given question type.
 *
 * Accepts the same uniform props as the individual renderers. The question
 * type is read from `question.type` (falling back to `question.questionType`)
 * so the switch works with both the task's `{ type }` shape and the
 * backend's `{ questionType }` shape.
 */
export function QuestionRendererSwitch({
  question,
  answer,
  onAnswerChange,
}: QuestionRendererProps) {
  const type: string =
    question?.type ?? question?.questionType ?? "unknown";

  const shared = { question, answer, onAnswerChange };

  switch (type) {
    case "multiple_choice":
    case "single_choice":
      return <MultipleChoiceRenderer {...shared} />;

    case "true_false":
      return <TrueFalseRenderer {...shared} />;

    case "essay":
    case "open_ended":
    case "open-ended":
      return <OpenEndedRenderer {...shared} />;

    case "fill_blank":
    case "fill_blanks":
    case "fill-blank":
      return <FillBlanksRenderer {...shared} />;

    case "short_answer":
    case "short-answer":
      return <ShortAnswerRenderer {...shared} />;

    case "matching":
      return <MatchingRenderer {...shared} />;

    case "image_answering":
    case "image-answering":
    case "image_answer":
      return <ImageAnsweringRenderer {...shared} />;

    case "ordering":
      return <OrderingRenderer {...shared} />;

    case "puzzle":
      return <PuzzleRenderer {...shared} />;

    case "scale":
      return <ScaleRenderer {...shared} />;

    case "coordinates":
      return <CoordinatesRenderer {...shared} />;

    case "pin_image":
    case "pin-image":
    case "image_pin":
      return <PinImageRenderer {...shared} />;

    case "draw_image":
    case "draw-image":
    case "image_draw":
    case "drawing":
      return <DrawImageRenderer {...shared} />;

    default:
      return <NotSupported type={type} />;
  }
}
