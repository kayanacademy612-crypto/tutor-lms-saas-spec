// AssignmentSubmit — submission interface for an assignment.
//
// Renders the assignment brief (title, description, instructions, due date,
// points), a submission form (text area + file upload area), previous
// submissions, and the grade block when the submission has been graded.

// Import Dependencies
import { useState } from "react";
import {
  InboxArrowDownIcon,
  CalendarDaysIcon,
  StarIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  PaperClipIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Textarea, Input, Avatar } from "@/components/ui";
import type {
  Assignment,
  AssignmentSubmission,
  AssignmentSubmissionInput,
} from "@/types/lms";

// ----------------------------------------------------------------------

export interface AssignmentSubmitProps {
  assignment: Assignment;
  /** Override the mock previous submissions. */
  previousSubmissions?: AssignmentSubmission[];
  onPrev?: () => void;
  onNext?: () => void;
  /** Called when the student submits. Parent forwards to `lmsApi.assignment.submit`. */
  onSubmit?: (input: AssignmentSubmissionInput) => void;
}

// ---- Mock previous submissions --------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const MOCK_PREVIOUS: AssignmentSubmission[] = [
  {
    id: "sub-1",
    tenantId: "tenant-1",
    assignmentId: "asg-1",
    courseId: "course-001",
    studentId: "student-1",
    enrollmentId: "enr-1",
    status: "graded",
    content:
      "First draft — wired up a debounce hook but it didn't cancel the in-flight fetch on unmount.",
    attachmentUrls: ["draft-v1.ts"],
    pointsAwarded: 11,
    feedback:
      "Good start — the debounce logic is right, but you forgot the cleanup. Resubmit with the abort-controller fix.",
    submittedAt: daysFromNow(-3),
    gradedAt: daysFromNow(-2),
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-2),
  },
];

// ---- Helpers ---------------------------------------------------------

function formatDate(isoDate?: string): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dueLabel(isoDate?: string): { label: string; tone: "error" | "warning" | "neutral" } {
  if (!isoDate) return { label: "No due date", tone: "neutral" };
  const diffMs = new Date(isoDate).getTime() - now.getTime();
  const days = Math.ceil(diffMs / 86400000);
  if (days < 0) return { label: "Overdue", tone: "error" };
  if (days === 0) return { label: "Due today", tone: "error" };
  if (days === 1) return { label: "Due tomorrow", tone: "warning" };
  if (days <= 3) return { label: `Due in ${days} days`, tone: "warning" };
  return { label: `Due in ${days} days`, tone: "neutral" };
}

// ----------------------------------------------------------------------

export default function AssignmentSubmit({
  assignment,
  previousSubmissions: previousProp,
  onPrev,
  onNext,
  onSubmit,
}: AssignmentSubmitProps) {
  const previous = previousProp ?? MOCK_PREVIOUS;

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedFlash, setSubmittedFlash] = useState(false);

  const latestGraded = previous.find((s) => s.status === "graded");
  const due = dueLabel(assignment.dueAt);

  const handleAttach = () => {
    // Mock: just push a fake file name.
    const idx = files.length + 1;
    setFiles((f) => [...f, `submission-v${idx}.zip`]);
  };

  const handleSubmit = () => {
    if (!content.trim() && files.length === 0) return;
    setSubmitting(true);
    // Optimistic — fire the parent callback, then flash a confirmation.
    onSubmit?.({
      content: content.trim() || undefined,
      attachmentUrls: files.length ? files : undefined,
      note: note.trim() || undefined,
    });
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmittedFlash(true);
      setContent("");
      setFiles([]);
      setNote("");
      window.setTimeout(() => setSubmittedFlash(false), 4000);
    }, 500);
  };

  return (
    <div className="space-y-5">
      {/* Header / brief */}
      <Card skin="bordered" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="primary" variant="soft">
                <InboxArrowDownIcon className="size-3.5" />
                Assignment
              </Badge>
              <Badge color="neutral" variant="soft">
                {assignment.maxPoints ?? 0} points
              </Badge>
              {assignment.passThreshold !== undefined && (
                <Badge color="info" variant="soft">
                  Pass: {assignment.passThreshold}
                </Badge>
              )}
              {latestGraded && (
                <Badge color="success" variant="soft">
                  <CheckBadgeIcon className="size-3.5" />
                  Graded: {latestGraded.pointsAwarded}/{assignment.maxPoints}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-xl font-semibold text-gray-800 dark:text-dark-50">
              {assignment.title}
            </h1>
            {assignment.description && (
              <p className="mt-1.5 text-sm text-gray-600 dark:text-dark-200">
                {assignment.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge color={due.tone} variant="soft" className="gap-1">
              <CalendarDaysIcon className="size-3.5" />
              {due.label}
            </Badge>
            {assignment.dueAt && (
              <span className="text-xs text-gray-500 dark:text-dark-300">
                {formatDate(assignment.dueAt)}
              </span>
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaTile
            label="Points"
            value={`${assignment.maxPoints ?? 0}`}
            icon={StarIcon}
          />
          <MetaTile
            label="Due date"
            value={assignment.dueAt ? formatDate(assignment.dueAt) : "No due date"}
            icon={CalendarDaysIcon}
          />
          <MetaTile
            label="Allowed files"
            value={
              assignment.allowUploads
                ? `${assignment.maxFileCount ?? "∞"} max`
                : "No uploads"
            }
            icon={PaperClipIcon}
          />
          <MetaTile
            label="Pass threshold"
            value={`${assignment.passThreshold ?? 0} pts`}
            icon={CheckBadgeIcon}
          />
        </div>

        {assignment.instructions && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-dark-600 dark:text-dark-200">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Instructions
            </p>
            {assignment.instructions}
          </div>
        )}
      </Card>

      {/* Latest grade block (if graded) */}
      {latestGraded && (
        <Card
          skin="bordered"
          className="border-success-300 bg-success-50/50 p-5 dark:border-success-500/30 dark:bg-success-500/5"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success-500/15 text-success-600 dark:text-success-300">
              <CheckBadgeIcon className="size-5 stroke-2" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                  Your grade
                </h3>
                <span className="text-2xl font-bold text-success-700 dark:text-success-300">
                  {latestGraded.pointsAwarded}
                  <span className="text-base font-medium text-gray-400 dark:text-dark-400">
                    /{assignment.maxPoints}
                  </span>
                </span>
                <Badge color="success" variant="soft">
                  {assignment.maxPoints
                    ? Math.round(
                        ((latestGraded.pointsAwarded ?? 0) /
                          assignment.maxPoints) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
              {latestGraded.feedback && (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Instructor feedback
                  </p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-dark-200">
                    {latestGraded.feedback}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Submission form */}
      <Card skin="bordered" className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-dark-50">
          Submit your work
        </h2>

        {submittedFlash && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-success-300 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            <CheckBadgeIcon className="size-5 stroke-2" />
            Submission received. You can resubmit until the deadline.
          </div>
        )}

        <div className="space-y-4">
          <Textarea
            label="Written submission"
            rows={6}
            placeholder="Paste or write your response here…"
            value={content}
            onChange={(e) => setContent((e.target as HTMLTextAreaElement).value)}
          />

          {/* File upload area (mock) */}
          <div>
            <p className="input-label mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-100">
              Attachments
            </p>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-5 text-center dark:border-dark-500">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300">
                <ArrowUpTrayIcon className="size-5 stroke-2" />
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-dark-200">
                Drag files here or{" "}
                <Button
                  variant="flat"
                  color="primary"
                  onClick={handleAttach}
                  disabled={!assignment.allowUploads}
                  className="px-1 py-0 text-xs font-semibold"
                >
                  browse
                </Button>
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
                {assignment.allowUploads
                  ? `${(assignment.allowedFileTypes ?? []).join(", ") || "Any file type"} · Max ${assignment.maxFileCount ?? "∞"} files`
                  : "Uploads disabled for this assignment"}
              </p>
            </div>

            {/* Attached files list */}
            {files.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {files.map((f, idx) => (
                  <li
                    key={`${f}-${idx}`}
                    className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-dark-600"
                  >
                    <DocumentTextIcon className="size-4 shrink-0 text-gray-400 dark:text-dark-400" />
                    <span className="flex-1 truncate text-gray-700 dark:text-dark-200">
                      {f}
                    </span>
                    <Button
                      variant="flat"
                      color="error"
                      isIcon
                      className="size-6"
                      aria-label={`Remove ${f}`}
                      onClick={() =>
                        setFiles((arr) => arr.filter((_, i) => i !== idx))
                      }
                    >
                      <ExclamationTriangleIcon className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Input
            label="Note to instructor (optional)"
            placeholder="Anything you'd like the instructor to know…"
            value={note}
            onChange={(e) => setNote((e.target as HTMLInputElement).value)}
          />

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-dark-300">
              <ClockIcon className="mr-1 inline size-3.5" />
              You can resubmit any time before the due date.
            </p>
            <Button
              color="primary"
              variant="filled"
              onClick={handleSubmit}
              disabled={submitting || (!content.trim() && files.length === 0)}
              className="gap-1.5"
            >
              {submitting ? "Submitting…" : "Submit assignment"}
              {!submitting && <ArrowRightIcon className="size-4 stroke-2" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Previous submissions */}
      {previous.length > 0 && (
        <Card skin="bordered" className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-dark-50">
            Previous submissions ({previous.length})
          </h2>
          <ul className="space-y-3">
            {previous.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-gray-200 p-3 dark:border-dark-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar name="Alex Student" size={8} />
                    <div>
                      <p className="text-xs font-medium text-gray-800 dark:text-dark-100">
                        Submitted {formatDate(s.submittedAt)}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-dark-300">
                        Status: {s.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "graded" && (
                      <Badge color="success" variant="soft">
                        {s.pointsAwarded}/{assignment.maxPoints} pts
                      </Badge>
                    )}
                    {s.status === "submitted" && (
                      <Badge color="info" variant="soft">
                        Awaiting review
                      </Badge>
                    )}
                    {s.status === "late" && (
                      <Badge color="warning" variant="soft">
                        Late
                      </Badge>
                    )}
                    {s.status === "returned" && (
                      <Badge color="error" variant="soft">
                        Returned
                      </Badge>
                    )}
                  </div>
                </div>
                {s.content && (
                  <p className="mt-2 line-clamp-3 text-xs text-gray-600 dark:text-dark-200">
                    {s.content}
                  </p>
                )}
                {s.attachmentUrls && s.attachmentUrls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {s.attachmentUrls.map((url) => (
                      <Badge
                        key={url}
                        color="neutral"
                        variant="soft"
                        className="gap-1"
                      >
                        <PaperClipIcon className="size-3" />
                        {url}
                      </Badge>
                    ))}
                  </div>
                )}
                {s.feedback && (
                  <div className="mt-2 rounded-md bg-gray-50 p-2 text-xs text-gray-700 dark:bg-dark-600 dark:text-dark-200">
                    <span className="font-semibold">Feedback: </span>
                    {s.feedback}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Bottom prev/next */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          variant="outlined"
          color="neutral"
          onClick={onPrev}
          disabled={!onPrev}
          className="gap-1.5"
        >
          <ArrowLeftIcon className="size-4 stroke-2" />
          Previous
        </Button>
        <Button
          variant="filled"
          color="primary"
          onClick={onNext}
          disabled={!onNext}
          className="gap-1.5"
        >
          Next
          <ArrowRightIcon className="size-4 stroke-2" />
        </Button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function MetaTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-2.5 dark:border-dark-600">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-dark-100">
        {value}
      </p>
    </div>
  );
}
