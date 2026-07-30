// Grading panel — slide-over panel used by the assignment-grading dashboard
// to record or revise a grade against a single submission.
//
// Layout (right-side slide-over):
//   - Header: "Grade Submission" + close button.
//   - Student info block (avatar + name placeholder, since we don't have a
//     student display name on the submission payload — we surface the
//     studentId/enrollmentId instead).
//   - Assignment details (title, description, max score, pass threshold).
//   - Submission content (text + attachment URLs).
//   - Grading form:
//       * Score input (0 to maxScore)
//       * Feedback textarea
//       * Pass/Fail badge (auto-calculated from score vs passThreshold with
//         a manual override switch)
//       * "Save Grade" button
//   - If a grade already exists (fetched via useAssignmentGrade), the form is
//     pre-filled and "Save Grade" becomes "Update Grade" (calls
//     useUpdateAssignmentGrade against the existing gradeId).
//
// Hooks used:
//   - `useAssignmentSubmission(id)` — full submission payload.
//   - `useAssignmentGrade(submissionId)` — existing grade (if any).
//   - `useCreateAssignmentGrade()` — record a new grade.
//   - `useUpdateAssignmentGrade()` — revise an existing grade.

// Import Dependencies
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  CheckCircleIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Input,
  Switch,
  Textarea,
} from "@/components/ui";
import { LoadingState, ErrorState } from "@/components/lms";
import type { ColorType } from "@/constants/app";
import {
  useAssignmentGrade,
  useAssignmentSubmission,
  useCreateAssignmentGrade,
  useUpdateAssignmentGrade,
} from "@/hooks/useProAuthoring";
import type {
  Assignment,
  AssignmentGrade,
  AssignmentGradeInput,
  AssignmentSubmission,
} from "@/types/lms";

// ----------------------------------------------------------------------

export interface GradingPanelProps {
  submissionId: string;
  assignment: Assignment | null;
  onClose: () => void;
  onGraded?: () => void;
}

// ----------------------------------------------------------------------

export function GradingPanel({
  submissionId,
  assignment,
  onClose,
  onGraded,
}: GradingPanelProps) {
  // ───────── Data ─────────
  const submissionQuery = useAssignmentSubmission(submissionId);
  const gradeQuery = useAssignmentGrade(submissionId);
  const createGrade = useCreateAssignmentGrade();
  const updateGrade = useUpdateAssignmentGrade();

  const submission: AssignmentSubmission | null = submissionQuery.data ?? null;
  const existingGrade: AssignmentGrade | null = gradeQuery.data ?? null;

  // ───────── Form state ─────────
  const maxScore = assignment?.maxPoints ?? existingGrade?.maxScore ?? 100;
  const passThreshold = assignment?.passThreshold ?? 0;

  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [manualPass, setManualPass] = useState<boolean | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill the form once we know whether there's an existing grade.
  useEffect(() => {
    if (existingGrade) {
      setScore(String(existingGrade.score));
      setFeedback(existingGrade.feedback ?? "");
      setManualPass(existingGrade.isPass);
    } else if (submission) {
      // For a fresh grade, default the score to the awarded points the
      // student already has (often 0).
      setScore(String(submission.pointsAwarded ?? 0));
      setFeedback(submission.feedback ?? "");
      setManualPass(null);
    }
  }, [existingGrade, submission]);

  // Auto-calculate pass/fail from score vs threshold.
  const computedPass = useMemo(() => {
    const s = parseFloat(score);
    if (Number.isNaN(s)) return false;
    if (passThreshold > 0) return s >= passThreshold;
    // No threshold on the assignment — use 60% of maxScore as a sensible default.
    return s >= maxScore * 0.6;
  }, [score, passThreshold, maxScore]);

  const isPass = manualPass !== null ? manualPass : computedPass;

  // ───────── Handlers ─────────
  const handleSubmit = async () => {
    setSubmitError(null);
    const s = parseFloat(score);
    if (Number.isNaN(s)) {
      setSubmitError("Score must be a number.");
      return;
    }
    if (s < 0 || s > maxScore) {
      setSubmitError(`Score must be between 0 and ${maxScore}.`);
      return;
    }

    const input: AssignmentGradeInput = {
      score: s,
      maxScore,
      feedback,
      isPass,
    };

    try {
      if (existingGrade) {
        await updateGrade.mutate({
          gradeId: existingGrade.id,
          input,
        });
      } else {
        await createGrade.mutate({
          submissionId,
          input,
        });
      }
      onGraded?.();
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Failed to save grade. Please try again.",
      );
    }
  };

  const saving = createGrade.loading || updateGrade.loading;

  // ───────── Render ─────────
  return (
    <Page title="Grade Submission">
      <Transition appear show as="div">
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          {/* Backdrop */}
          <TransitionChild
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
              aria-hidden="true"
            />
          </TransitionChild>

          {/* Panel */}
          <div className="fixed inset-0 flex justify-end">
            <TransitionChild
              enter="transform transition ease-out duration-300"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in duration-200"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <DialogPanel className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl dark:bg-dark-750">
                {/* Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
                  <DialogTitle className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {existingGrade ? "Re-grade submission" : "Grade submission"}
                  </DialogTitle>
                  <Button
                    isIcon
                    variant="flat"
                    color="neutral"
                    className="size-8"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <XMarkIcon className="size-5 stroke-2" />
                  </Button>
                </header>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {submissionQuery.loading ? (
                    <LoadingState message="Loading submission…" />
                  ) : submissionQuery.error ? (
                    <ErrorState
                      error={submissionQuery.error}
                      onRetry={submissionQuery.refetch}
                    />
                  ) : !submission ? (
                    <ErrorState error="Submission not found." />
                  ) : (
                    <SubmissionGradingBody
                      submission={submission}
                      assignment={assignment}
                      existingGrade={existingGrade}
                      score={score}
                      feedback={feedback}
                      manualPass={manualPass}
                      computedPass={computedPass}
                      maxScore={maxScore}
                      passThreshold={passThreshold}
                      onScoreChange={setScore}
                      onFeedbackChange={setFeedback}
                      onManualPassChange={setManualPass}
                    />
                  )}
                </div>

                {/* Footer */}
                {submission && (
                  <footer className="shrink-0 border-t border-gray-200 px-5 py-3 dark:border-dark-600">
                    {submitError && (
                      <p className="mb-2 flex items-center gap-1.5 text-xs text-error-500 dark:text-error-400">
                        <ExclamationTriangleIcon className="size-4 stroke-2" />
                        {submitError}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3">
                      <PassBadge isPass={isPass} />
                      <div className="flex gap-2">
                        <Button
                          color="neutral"
                          variant="flat"
                          onClick={onClose}
                        >
                          Cancel
                        </Button>
                        <Button
                          color="primary"
                          variant="filled"
                          onClick={handleSubmit}
                          disabled={saving}
                        >
                          {saving
                            ? "Saving…"
                            : existingGrade
                              ? "Update Grade"
                              : "Save Grade"}
                        </Button>
                      </div>
                    </div>
                  </footer>
                )}
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </Page>
  );
}

// ----------------------------------------------------------------------

interface SubmissionGradingBodyProps {
  submission: AssignmentSubmission;
  assignment: Assignment | null;
  existingGrade: AssignmentGrade | null;
  score: string;
  feedback: string;
  manualPass: boolean | null;
  computedPass: boolean;
  maxScore: number;
  passThreshold: number;
  onScoreChange: (value: string) => void;
  onFeedbackChange: (value: string) => void;
  onManualPassChange: (value: boolean | null) => void;
}

function SubmissionGradingBody({
  submission,
  assignment,
  existingGrade,
  score,
  feedback,
  manualPass,
  computedPass,
  maxScore,
  passThreshold,
  onScoreChange,
  onFeedbackChange,
  onManualPassChange,
}: SubmissionGradingBodyProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Student info */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          Student
        </h3>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Student ID: {submission.studentId}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Enrollment: {submission.enrollmentId}
          </p>
        </div>
      </section>

      {/* Assignment details */}
      {assignment && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Assignment
          </h3>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              {assignment.title}
            </p>
            {assignment.description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-dark-200">
                {assignment.description}
              </p>
            )}
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <dt className="text-gray-500 dark:text-dark-400">Max score</dt>
              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                {maxScore}
              </dd>
              <dt className="text-gray-500 dark:text-dark-400">Pass mark</dt>
              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                {passThreshold > 0 ? passThreshold : "60% (default)"}
              </dd>
              <dt className="text-gray-500 dark:text-dark-400">Due</dt>
              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                {assignment.dueAt
                  ? new Date(assignment.dueAt).toLocaleString()
                  : "—"}
              </dd>
            </dl>
          </div>
        </section>
      )}

      {/* Submission content */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          Submission
        </h3>
        <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
          <dl className="mb-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-gray-500 dark:text-dark-400">Submitted</dt>
            <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
              {new Date(submission.submittedAt).toLocaleString()}
            </dd>
            <dt className="text-gray-500 dark:text-dark-400">Status</dt>
            <dd className="text-right font-medium capitalize text-gray-800 dark:text-dark-50">
              {submission.status}
            </dd>
          </dl>
          {submission.content && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-dark-400">
                Content
              </p>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-dark-600 dark:text-dark-100">
                {submission.content}
              </div>
            </div>
          )}
          {submission.attachmentUrls && submission.attachmentUrls.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-dark-400">
                Attachments
              </p>
              <ul className="list-inside list-disc text-sm text-primary-600 dark:text-primary-400">
                {submission.attachmentUrls.map((url, i) => (
                  <li key={`${url}-${i}`}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {submission.note && (
            <div className="mt-2">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-dark-400">
                Student note
              </p>
              <p className="text-sm text-gray-700 dark:text-dark-100">
                {submission.note}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Existing grade (if any) */}
      {existingGrade && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Existing grade
          </h3>
          <div className="rounded-lg border border-gray-200 p-3 text-xs dark:border-dark-600">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
              <dt className="text-gray-500 dark:text-dark-400">Score</dt>
              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                {existingGrade.score} / {existingGrade.maxScore}
              </dd>
              <dt className="text-gray-500 dark:text-dark-400">Pass</dt>
              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                {existingGrade.isPass ? "Yes" : "No"}
              </dd>
              <dt className="text-gray-500 dark:text-dark-400">Graded at</dt>
              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                {new Date(existingGrade.gradedAt).toLocaleString()}
              </dd>
            </dl>
          </div>
        </section>
      )}

      {/* Grading form */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          Grade
        </h3>
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="grade-score"
              className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-200"
            >
              Score (0 – {maxScore})
            </label>
            <Input
              id="grade-score"
              type="number"
              min={0}
              max={maxScore}
              step="0.5"
              value={score}
              onChange={(e) => onScoreChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="grade-feedback"
              className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-200"
            >
              Feedback
            </label>
            <Textarea
              id="grade-feedback"
              rows={4}
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              placeholder="Provide written feedback for the student…"
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-600">
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-dark-100">
                Pass / Fail override
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {manualPass === null
                  ? `Auto-calculated: ${computedPass ? "Pass" : "Fail"}`
                  : "Manual override active"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-dark-400">
                Auto
              </span>
              <Switch
                checked={manualPass !== null}
                onChange={(checked) =>
                  onManualPassChange(checked ? computedPass : null)
                }
              />
              <span className="text-xs text-gray-500 dark:text-dark-400">
                Manual
              </span>
            </div>
          </div>

          {manualPass !== null && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-dark-600">
              <p className="text-xs font-medium text-gray-700 dark:text-dark-100">
                Manual pass state
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onManualPassChange(true)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-medium",
                    manualPass === true
                      ? "bg-success-500 text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-100",
                  )}
                >
                  Pass
                </button>
                <button
                  type="button"
                  onClick={() => onManualPassChange(false)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-medium",
                    manualPass === false
                      ? "bg-error-500 text-white"
                      : "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-100",
                  )}
                >
                  Fail
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------

function PassBadge({ isPass }: { isPass: boolean }) {
  const color: ColorType = isPass ? "success" : "error";
  return (
    <Badge color={color} variant="soft" className="gap-1.5">
      <CheckCircleIcon className="size-4 stroke-2" />
      {isPass ? "Pass" : "Fail"}
    </Badge>
  );
}
