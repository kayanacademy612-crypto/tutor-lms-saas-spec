// QuizImportExport — modal for exporting quizzes as JSON and importing
// them back via drag-and-drop or file picker.
//
// Export: builds a JSON blob for the selected quizzes and triggers a
// browser download. Import: parses a dropped/picked .json file and
// passes the resulting quizzes back to the parent via `onImported`.

import { useCallback, useMemo, useRef, useState } from "react";
import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentCheckIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import { Button, Badge, Checkbox } from "@/components/ui";

import type { QuizBuilderQuiz } from "./index";

// ============================================================
// PROPS
// ============================================================

export interface QuizImportExportProps {
  quizzes: QuizBuilderQuiz[];
  onClose: () => void;
  onImported: (quizzes: QuizBuilderQuiz[]) => void;
}

type Mode = "export" | "import";

interface ParsedImport {
  quizzes: QuizBuilderQuiz[];
  fileName: string;
  error?: string;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function QuizImportExport({
  quizzes,
  onClose,
  onImported,
}: QuizImportExportProps) {
  const [mode, setMode] = useState<Mode>("export");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(quizzes.map((q) => q.id)),
  );
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedQuizzes = useMemo(
    () => quizzes.filter((q) => selectedIds.has(q.id)),
    [quizzes, selectedIds],
  );

  // ---------- Export helpers ----------

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.size === quizzes.length ? new Set() : new Set(quizzes.map((q) => q.id)),
    );

  const handleExport = useCallback(() => {
    if (selectedQuizzes.length === 0) return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      quizzes: selectedQuizzes,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizzes-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(
      `${selectedQuizzes.length} quiz${selectedQuizzes.length === 1 ? "" : "ies"} exported`,
    );
  }, [selectedQuizzes]);

  const handleCopyToClipboard = useCallback(async () => {
    if (selectedQuizzes.length === 0) return;
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), quizzes: selectedQuizzes },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(payload);
      setExported("Copied to clipboard");
    } catch {
      setExported("Clipboard not available in this browser");
    }
  }, [selectedQuizzes]);

  // ---------- Import helpers ----------

  const handleFile = useCallback(async (file: File) => {
    setImportError(null);
    if (!file.name.toLowerCase().endsWith(".json")) {
      setImportError("Please drop a .json file exported from the Quiz Builder.");
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const list: QuizBuilderQuiz[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.quizzes)
          ? data.quizzes
          : [];
      if (list.length === 0) {
        setImportError("No quizzes found in the file.");
        return;
      }
      // Re-id to avoid collisions with existing quizzes.
      const reidentified = list.map((q) => ({
        ...q,
        id: `qz_imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        isPublished: false,
        updatedAt: new Date().toISOString(),
      }));
      setParsed({ quizzes: reidentified, fileName: file.name });
    } catch (e) {
      setImportError(
        e instanceof Error ? `Invalid JSON: ${e.message}` : "Invalid JSON file.",
      );
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const handleConfirmImport = () => {
    if (parsed) onImported(parsed.quizzes);
  };

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
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* ===== Header ===== */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  <ClipboardDocumentIcon className="size-4.5" />
                </span>
                <h2 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                  Import / Export Quizzes
                </h2>
              </div>
              <Button variant="flat" color="neutral" isIcon className="size-8" onClick={onClose}>
                <XMarkIcon className="size-4" />
              </Button>
            </header>

            {/* ===== Mode tabs ===== */}
            <div className="flex shrink-0 gap-1 border-b border-gray-200 px-3 pt-2 dark:border-dark-600">
              {(["export", "import"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setExported(null);
                    setParsed(null);
                    setImportError(null);
                  }}
                  className={clsx(
                    "flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm capitalize transition-colors",
                    mode === m
                      ? "border-primary-600 font-medium text-primary-600 dark:text-primary-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-200 dark:hover:text-dark-100",
                  )}
                >
                  {m === "export" ? (
                    <ArrowDownTrayIcon className="size-4" />
                  ) : (
                    <ArrowUpTrayIcon className="size-4" />
                  )}
                  {m}
                </button>
              ))}
            </div>

            {/* ===== Body ===== */}
            <div className="flex-1 overflow-y-auto p-5">
              {mode === "export" ? (
                <ExportBody
                  quizzes={quizzes}
                  selectedIds={selectedIds}
                  onToggle={toggle}
                  onToggleAll={toggleAll}
                  exported={exported}
                />
              ) : (
                <ImportBody
                  dragOver={dragOver}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onPick={() => fileInputRef.current?.click()}
                  parsed={parsed}
                  error={importError}
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleFilePick}
              />
            </div>

            {/* ===== Footer ===== */}
            <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="text-xs text-gray-500 dark:text-dark-300">
                {mode === "export"
                  ? `${selectedQuizzes.length} of ${quizzes.length} selected`
                  : parsed
                    ? `${parsed.quizzes.length} quiz${parsed.quizzes.length === 1 ? "" : "ies"} ready to import`
                    : "Drop a JSON file to import"}
              </div>
              <div className="flex gap-2">
                {mode === "export" ? (
                  <>
                    <Button
                      variant="flat"
                      color="neutral"
                      onClick={handleCopyToClipboard}
                      disabled={selectedQuizzes.length === 0}
                    >
                      Copy to Clipboard
                    </Button>
                    <Button
                      color="primary"
                      onClick={handleExport}
                      disabled={selectedQuizzes.length === 0}
                      className="gap-1.5"
                    >
                      <ArrowDownTrayIcon className="size-4" />
                      Download JSON
                    </Button>
                  </>
                ) : (
                  <Button
                    color="primary"
                    onClick={handleConfirmImport}
                    disabled={!parsed}
                    className="gap-1.5"
                  >
                    <CheckCircleIcon className="size-4" />
                    Import {parsed ? `(${parsed.quizzes.length})` : ""}
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

// ============================================================
// EXPORT BODY
// ============================================================

function ExportBody({
  quizzes,
  selectedIds,
  onToggle,
  onToggleAll,
  exported,
}: {
  quizzes: QuizBuilderQuiz[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  exported: string | null;
}) {
  const allSelected = selectedIds.size === quizzes.length;
  if (quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ExclamationTriangleIcon className="size-8 text-warning-500" />
        <p className="mt-2 text-sm text-gray-600 dark:text-dark-200">
          No quizzes available to export.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {exported && (
        <div className="flex items-center gap-2 rounded-md bg-success-500/10 px-3 py-2 text-sm text-success-700 dark:text-success-400">
          <CheckCircleIcon className="size-4" />
          {exported}
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-dark-100">
          <Checkbox checked={allSelected} onChange={onToggleAll} />
          Select all
        </label>
        <Badge color="primary" variant="soft">
          {selectedIds.size} selected
        </Badge>
      </div>
      <ul className="space-y-1.5">
        {quizzes.map((q) => (
          <li
            key={q.id}
            className={clsx(
              "flex items-center gap-3 rounded-md border p-2.5 transition-colors",
              selectedIds.has(q.id)
                ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                : "border-gray-200 dark:border-dark-500",
            )}
          >
            <Checkbox
              checked={selectedIds.has(q.id)}
              onChange={() => onToggle(q.id)}
            />
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                {q.title || "Untitled Quiz"}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-dark-300">
                <span>{q.questions.length} Q</span>
                <span>•</span>
                <span>{q.totalPoints} pts</span>
                <span>•</span>
                <span>{q.isPublished ? "Published" : "Draft"}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// IMPORT BODY
// ============================================================

function ImportBody({
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPick,
  parsed,
  error,
}: {
  dragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPick: () => void;
  parsed: ParsedImport | null;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-error-500/10 px-3 py-2 text-sm text-error-700 dark:text-error-400">
          <ExclamationTriangleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {!parsed && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onPick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onPick();
          }}
          className={clsx(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
            dragOver
              ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
              : "border-gray-300 hover:border-primary-400 hover:bg-gray-50 dark:border-dark-500 dark:hover:bg-dark-800",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <CloudArrowUpIcon className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
              Drop your JSON file here
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              or <span className="text-primary-600 dark:text-primary-400 underline">browse to pick</span> a file
            </p>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-dark-400">
            Only .json files exported from the Quiz Builder are supported.
          </p>
        </div>
      )}

      {parsed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md bg-success-500/10 px-3 py-2 text-sm text-success-700 dark:text-success-400">
            <DocumentCheckIcon className="size-4" />
            Parsed <strong className="mx-1">{parsed.fileName}</strong> — {parsed.quizzes.length} quiz
            {parsed.quizzes.length === 1 ? "" : "ies"} ready.
          </div>
          <ul className="space-y-1.5">
            {parsed.quizzes.map((q) => (
              <li
                key={q.id}
                className="flex items-center gap-2 rounded-md border border-gray-200 p-2.5 dark:border-dark-500"
              >
                <DocumentCheckIcon className="size-4 text-success-500" />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                    {q.title || "Untitled Quiz"}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-dark-300">
                    {q.questions.length} questions • {q.totalPoints} pts
                  </div>
                </div>
                <Badge color="neutral" variant="soft" className="text-xs">
                  New
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
