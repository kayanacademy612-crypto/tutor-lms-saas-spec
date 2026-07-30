// QuizEditor — center pane of the Quiz Builder.
//
// Renders title, description, and the full QuizSettings surface
// (25+ fields organised into Grading, Attempts, Questions, Time,
// Layout, and Review sections). Every edit calls `onChange(patch)`
// so the parent owns the source of truth.

import { Fragment, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  InformationCircleIcon,
  Cog6ToothIcon,
  ClockIcon,
  Squares2X2Icon,
  EyeIcon,
  ArrowPathIcon,
  TrophyIcon,
  ListBulletIcon,
  CheckCircleIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  EyeDropperIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import {
  Button,
  Input,
  Textarea,
  Switch,
  Checkbox,
  Select,
  Badge,
} from "@/components/ui";

import type { QuizBuilderQuiz, QuizSettings } from "./index";

// ============================================================
// PROPS
// ============================================================

export interface QuizEditorProps {
  quiz: QuizBuilderQuiz;
  onChange: (patch: Partial<QuizBuilderQuiz>) => void;
  onPublish: () => void;
}

// ============================================================
// SECTION HELPERS
// ============================================================

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function SettingsSection({
  icon,
  title,
  description,
  children,
  defaultOpen = true,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-gray-200 dark:border-dark-600">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="flex size-6 items-center justify-center rounded bg-primary-500/10 text-primary-600 dark:text-primary-400">
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-gray-800 dark:text-dark-100">
            {title}
          </span>
          {description && (
            <span className="block text-xs text-gray-500 dark:text-dark-300">
              {description}
            </span>
          )}
        </span>
        <span
          className={clsx(
            "text-gray-400 transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open && <div className="space-y-3 border-t border-gray-200 p-4 dark:border-dark-600">{children}</div>}
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[180px_1fr] sm:items-center sm:gap-3">
      <div className="flex items-center gap-1.5">
        {hint && <InformationCircleIcon className="size-3.5 text-gray-400" />}
        <span className="text-xs font-medium text-gray-700 dark:text-dark-200">
          {label}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  checkbox,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  checkbox?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-700 dark:text-dark-100">
          {label}
        </div>
        {description && (
          <div className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {description}
          </div>
        )}
      </div>
      {checkbox ? (
        <Checkbox checked={checked} onChange={(e: any) => onChange(e.target.checked)} />
      ) : (
        <Switch checked={checked} onChange={(e: any) => onChange(e.target.checked)} />
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function QuizEditor({ quiz, onChange, onPublish }: QuizEditorProps) {
  const s = quiz.settings;

  // Helper: update a single settings field.
  const setSetting = <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => {
    onChange({ settings: { ...s, [key]: value } });
  };

  return (
    <div className="flex h-full flex-col">
      {/* ---------- Header strip with title + publish ---------- */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-4 dark:border-dark-600">
        <div className="flex-1 min-w-0">
          <input
            value={quiz.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Quiz title"
            className="w-full bg-transparent text-lg font-semibold text-gray-900 focus:outline-none dark:text-dark-50"
          />
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
            <Badge color={quiz.isPublished ? "success" : "neutral"} variant="soft">
              {quiz.isPublished ? "Published" : "Draft"}
            </Badge>
            <span>•</span>
            <span>{quiz.questions.length} questions</span>
            <span>•</span>
            <span>{quiz.totalPoints} total points</span>
            <span>•</span>
            <span>Updated {new Date(quiz.updatedAt).toLocaleString()}</span>
          </div>
        </div>
        <Button
          variant={quiz.isPublished ? "outlined" : "filled"}
          color="primary"
          onClick={onPublish}
          className="gap-1.5 text-sm"
        >
          <CloudArrowUpIcon className="size-4" />
          {quiz.isPublished ? "Unpublish" : "Publish"}
        </Button>
      </div>

      {/* ---------- Scrollable body ---------- */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {/* ===== Description ===== */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-800 dark:text-dark-100">
            Description
          </label>
          <Textarea
            value={quiz.description}
            onChange={(e: any) => onChange({ description: e.target.value })}
            placeholder="Briefly describe what this quiz covers…"
            rows={3}
          />
        </div>

        {/* ===== Settings sections ===== */}
        <SettingsSection
          icon={<TrophyIcon className="size-3.5" />}
          title="Grading"
          description="How this quiz is scored and what counts as a pass."
        >
          <FieldRow label="Passing Grade" hint="percentage required to pass">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                value={s.passingGrade}
                onChange={(e: any) => setSetting("passingGrade", Number(e.target.value))}
                classNames={{ input: "h-9 w-24" }}
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </FieldRow>

          <FieldRow label="Grading Method">
            <Select
              value={s.gradingMethod}
              onChange={(e: any) =>
                setSetting("gradingMethod", e.target.value as QuizSettings["gradingMethod"])
              }
              data={[
                { value: "auto", label: "Automatic" },
                { value: "manual", label: "Manual" },
                { value: "hybrid", label: "Hybrid" },
              ]}
              classNames={{ select: "h-9 w-48" }}
            />
          </FieldRow>

          <ToggleRow
            label="Pass required"
            description="Student must pass this quiz to complete the lesson."
            checked={s.passRequired}
            onChange={(v) => setSetting("passRequired", v)}
          />
        </SettingsSection>

        <SettingsSection
          icon={<ArrowPathIcon className="size-3.5" />}
          title="Attempts"
          description="How many times a student can take this quiz."
        >
          <ToggleRow
            label="Allow multiple attempts"
            description="When off, students get a single attempt."
            checked={s.allowMultipleAttempts}
            onChange={(v) => setSetting("allowMultipleAttempts", v)}
          />
          {s.allowMultipleAttempts && (
            <FieldRow label="Attempts Allowed">
              <Input
                type="number"
                min={1}
                value={s.attemptsAllowed}
                onChange={(e: any) => setSetting("attemptsAllowed", Number(e.target.value))}
                classNames={{ input: "h-9 w-24" }}
              />
            </FieldRow>
          )}
        </SettingsSection>

        <SettingsSection
          icon={<ListBulletIcon className="size-3.5" />}
          title="Questions"
          description="Ordering, shuffling and limiting the question pool."
        >
          <FieldRow label="Question Order">
            <Select
              value={s.questionOrder}
              onChange={(e: any) =>
                setSetting("questionOrder", e.target.value as QuizSettings["questionOrder"])
              }
              data={[
                { value: "random", label: "Random" },
                { value: "sorting", label: "Sorting" },
                { value: "ascending", label: "Ascending" },
                { value: "descending", label: "Descending" },
              ]}
              classNames={{ select: "h-9 w-48" }}
            />
          </FieldRow>

          <ToggleRow
            label="Shuffle questions"
            description="Randomise the order of questions on each attempt."
            checked={s.shuffleQuestions}
            onChange={(v) => setSetting("shuffleQuestions", v)}
          />

          <ToggleRow
            label="Shuffle answers"
            description="Randomise the order of answer options within each question."
            checked={s.shuffleAnswers}
            onChange={(v) => setSetting("shuffleAnswers", v)}
          />

          <ToggleRow
            label="Set maximum questions per quiz"
            description="Limit how many questions are shown per attempt."
            checked={s.limitMaxQuestions}
            onChange={(v) => setSetting("limitMaxQuestions", v)}
          />
          {s.limitMaxQuestions && (
            <FieldRow label="Max Questions">
              <Input
                type="number"
                min={1}
                value={s.maxQuestions}
                onChange={(e: any) => setSetting("maxQuestions", Number(e.target.value))}
                classNames={{ input: "h-9 w-24" }}
              />
            </FieldRow>
          )}

          <FieldRow label="Randomize from pool" hint="0 disables the pool">
            <Input
              type="number"
              min={0}
              value={s.randomizeFromPool}
              onChange={(e: any) => setSetting("randomizeFromPool", Number(e.target.value))}
              description="Number of questions to draw randomly from the pool."
              classNames={{ input: "h-9 w-24" }}
            />
          </FieldRow>
        </SettingsSection>

        <SettingsSection
          icon={<ClockIcon className="size-3.5" />}
          title="Time"
          description="Time limits, countdown display, and auto-start."
        >
          <ToggleRow
            label="Set time limit"
            checked={s.enableTimeLimit}
            onChange={(v) => setSetting("enableTimeLimit", v)}
            checkbox
          />
          {s.enableTimeLimit && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FieldRow label="Time Value">
                <Input
                  type="number"
                  min={1}
                  value={s.timeValue}
                  onChange={(e: any) => setSetting("timeValue", Number(e.target.value))}
                  classNames={{ input: "h-9 w-24" }}
                />
              </FieldRow>
              <FieldRow label="Time Type">
                <Select
                  value={s.timeType}
                  onChange={(e: any) =>
                    setSetting("timeType", e.target.value as QuizSettings["timeType"])
                  }
                  data={[
                    { value: "minutes", label: "Minutes" },
                    { value: "hours", label: "Hours" },
                    { value: "days", label: "Days" },
                    { value: "weeks", label: "Weeks" },
                  ]}
                  classNames={{ select: "h-9 w-32" }}
                />
              </FieldRow>
            </div>
          )}

          <ToggleRow
            label="Hide countdown timer"
            description="Don't show the remaining-time countdown to students."
            checked={s.hideTimer}
            onChange={(v) => setSetting("hideTimer", v)}
          />

          <ToggleRow
            label="Auto start quiz"
            description="Begin the quiz automatically when the page loads."
            checked={s.autoStart}
            onChange={(v) => setSetting("autoStart", v)}
            checkbox
          />
          {s.autoStart && (
            <FieldRow label="Auto start delay (seconds)">
              <Input
                type="number"
                min={0}
                value={s.autoStartDelay}
                onChange={(e: any) => setSetting("autoStartDelay", Number(e.target.value))}
                classNames={{ input: "h-9 w-24" }}
              />
            </FieldRow>
          )}
        </SettingsSection>

        <SettingsSection
          icon={<Squares2X2Icon className="size-3.5" />}
          title="Layout & UX"
          description="How the quiz is presented to students."
        >
          <FieldRow label="Layout">
            <Select
              value={s.layout}
              onChange={(e: any) =>
                setSetting("layout", e.target.value as QuizSettings["layout"])
              }
              data={[
                { value: "single", label: "Single question per page" },
                { value: "list", label: "All questions on one page" },
              ]}
              classNames={{ select: "h-9 w-56" }}
            />
          </FieldRow>

          <ToggleRow
            label="Show pagination"
            checked={s.showPagination}
            onChange={(v) => setSetting("showPagination", v)}
            checkbox
          />

          <ToggleRow
            label="Hide Previous button"
            description="Prevent students from going back to earlier questions."
            checked={s.hidePrev}
            onChange={(v) => setSetting("hidePrev", v)}
          />

          <ToggleRow
            label="Hide question number"
            checked={s.hideQuestionNum}
            onChange={(v) => setSetting("hideQuestionNum", v)}
          />

          <FieldRow label="Open-Ended/Essay answer character limit">
            <Input
              type="number"
              min={0}
              value={s.openEndedLimit}
              onChange={(e: any) => setSetting("openEndedLimit", Number(e.target.value))}
              classNames={{ input: "h-9 w-24" }}
            />
          </FieldRow>
        </SettingsSection>

        <SettingsSection
          icon={<EyeIcon className="size-3.5" />}
          title="Review & Feedback"
          description="What students see after submitting and how reviewers interact."
        >
          <ToggleRow
            label="Reveal answers after submission"
            description="Show correct answers once the quiz is submitted."
            checked={s.enableAnswerReveal}
            onChange={(v) => setSetting("enableAnswerReveal", v)}
            checkbox
          />

          <ToggleRow
            label="Show correct answers"
            description="Display the correct answer alongside each question."
            checked={s.showCorrectAnswers}
            onChange={(v) => setSetting("showCorrectAnswers", v)}
          />

          <ToggleRow
            label="Allow review"
            description="Let students review their submitted answers later."
            checked={s.allowReview}
            onChange={(v) => setSetting("allowReview", v)}
          />

          <ToggleRow
            label="Allow pause & resume"
            description="Students can pause the quiz and resume later."
            checked={s.allowPauseResume}
            onChange={(v) => setSetting("allowPauseResume", v)}
          />

          <ToggleRow
            label="Notify on submit"
            description="Send the instructor an email when a student submits."
            checked={s.notifyOnSubmit}
            onChange={(v) => setSetting("notifyOnSubmit", v)}
          />
        </SettingsSection>

        {/* Trailing spacer so the last section isn't flush against the bottom. */}
        <div className="h-2" />
      </div>

      {/* ---------- Footer save bar ---------- */}
      <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-4 py-3 dark:border-dark-600">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-dark-300">
          <EyeDropperIcon className="size-3.5" />
          Changes are saved automatically to local state.
        </div>
        <div className="flex gap-2">
          <Button
            variant="outlined"
            color="neutral"
            className="text-sm"
            onClick={() =>
              onChange({ settings: { ...s, passingGrade: 50 } })
            }
          >
            Reset Defaults
          </Button>
          <Button color="primary" className="gap-1.5 text-sm" onClick={onPublish}>
            <CheckCircleIcon className="size-4" />
            Save Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

// Re-exported so callers can build the publish-confirm modal without
// importing headless-ui directly.
export function ConfirmPublishModal({
  open,
  onClose,
  onConfirm,
  quizTitle,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  quizTitle: string;
}) {
  return (
    <Transition appear show={open} as={Fragment}>
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
            className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-dark-700"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="size-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                  Publish quiz?
                </h3>
              </div>
              <Button variant="flat" color="neutral" isIcon className="size-7" onClick={onClose}>
                <XMarkIcon className="size-4" />
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-dark-200">
              You're about to publish <strong>"{quizTitle}"</strong>. Students
              will be able to take this quiz immediately.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="flat" color="neutral" onClick={onClose}>
                Cancel
              </Button>
              <Button color="primary" onClick={onConfirm}>
                Publish
              </Button>
            </div>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
