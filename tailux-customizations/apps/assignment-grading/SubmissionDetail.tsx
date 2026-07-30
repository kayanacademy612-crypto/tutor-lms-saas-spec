// Submission detail — modal-style read-only view of a single submission.
//
// Rendered when the user clicks the "View Submission" (eye) button on a row
// in the assignment-grading dashboard. Shows the student info, assignment
// details, the submitted content + attachments + note, and — if one exists —
// the recorded grade. A single "Close" button is the only action.
//
// Hooks used:
//   - `useAssignmentSubmission(id)` — full submission payload.
//   - `useAssignmentGrade(submissionId)` — existing grade (if any).

// Import Dependencies
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Badge, Button } from "@/components/ui";
import { LoadingState, ErrorState } from "@/components/lms";
import type { ColorType } from "@/constants/app";
import {
  useAssignmentGrade,
  useAssignmentSubmission,
} from "@/hooks/useProAuthoring";
import type { Assignment, AssignmentGrade, AssignmentSubmission } from "@/types/lms";

// ----------------------------------------------------------------------

export interface SubmissionDetailProps {
  submissionId: string;
  assignment: Assignment | null;
  onClose: () => void;
}

// ----------------------------------------------------------------------

export function SubmissionDetail({
  submissionId,
  assignment,
  onClose,
}: SubmissionDetailProps) {
  const submissionQuery = useAssignmentSubmission(submissionId);
  const gradeQuery = useAssignmentGrade(submissionId);

  const submission: AssignmentSubmission | null = submissionQuery.data ?? null;
  const grade: AssignmentGrade | null = gradeQuery.data ?? null;

  return (
    <Page title="Submission Detail">
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

          {/* Centered panel */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              enter="transform transition ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="transform transition ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-dark-750">
                {/* Header */}
                <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
                  <DialogTitle className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    Submission Detail
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
                    <div className="flex flex-col gap-5">
                      {/* Student + assignment meta */}
                      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
                          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                            Student
                          </h3>
                          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                            ID: {submission.studentId}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-dark-300">
                            Enrollment: {submission.enrollmentId}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
                          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                            Assignment
                          </h3>
                          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                            {assignment?.title ?? "—"}
                          </p>
                          {assignment?.maxPoints !== undefined && (
                            <p className="text-xs text-gray-500 dark:text-dark-300">
                              Max points: {assignment.maxPoints}
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Submission meta */}
                      <section>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                          Submission
                        </h3>
                        <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
                          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <dt className="text-gray-500 dark:text-dark-400">
                              Submitted
                            </dt>
                            <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                              {new Date(submission.submittedAt).toLocaleString()}
                            </dd>
                            <dt className="text-gray-500 dark:text-dark-400">
                              Status
                            </dt>
                            <dd className="text-right font-medium capitalize text-gray-800 dark:text-dark-50">
                              {submission.status}
                            </dd>
                          </dl>

                          {submission.content && (
                            <div className="mt-3">
                              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-dark-400">
                                Content
                              </p>
                              <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-dark-600 dark:text-dark-100">
                                {submission.content}
                              </div>
                            </div>
                          )}

                          {submission.attachmentUrls &&
                            submission.attachmentUrls.length > 0 && (
                              <div className="mt-3">
                                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-dark-400">
                                  <PaperClipIcon className="size-4" />
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
                            <div className="mt-3">
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

                      {/* Grade (if any) */}
                      <section>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                          Grade
                        </h3>
                        {gradeQuery.loading ? (
                          <LoadingState inline message="Loading grade…" />
                        ) : grade ? (
                          <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                                {grade.score} / {grade.maxScore}
                              </p>
                              <PassFailBadge isPass={grade.isPass} />
                            </div>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              <dt className="text-gray-500 dark:text-dark-400">
                                Graded at
                              </dt>
                              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                                {new Date(grade.gradedAt).toLocaleString()}
                              </dd>
                              <dt className="text-gray-500 dark:text-dark-400">
                                Instructor
                              </dt>
                              <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                                {grade.instructorId}
                              </dd>
                            </dl>
                            {grade.feedback && (
                              <div className="mt-2">
                                <p className="mb-1 text-xs font-medium text-gray-500 dark:text-dark-400">
                                  Feedback
                                </p>
                                <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-700 dark:bg-dark-600 dark:text-dark-100">
                                  {grade.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 dark:border-dark-500 dark:text-dark-300">
                            Not graded yet.
                          </div>
                        )}
                      </section>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <footer className="shrink-0 border-t border-gray-200 px-5 py-3 dark:border-dark-600">
                  <div className="flex justify-end">
                    <Button
                      color="primary"
                      variant="filled"
                      onClick={onClose}
                    >
                      Close
                    </Button>
                  </div>
                </footer>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </Page>
  );
}

// ----------------------------------------------------------------------

function PassFailBadge({ isPass }: { isPass: boolean }) {
  const color: ColorType = isPass ? "success" : "error";
  return (
    <Badge color={color} variant="soft" className="gap-1">
      {isPass ? (
        <CheckCircleIcon className="size-4 stroke-2" />
      ) : (
        <XCircleIcon className="size-4 stroke-2" />
      )}
      {isPass ? "Pass" : "Fail"}
    </Badge>
  );
}
