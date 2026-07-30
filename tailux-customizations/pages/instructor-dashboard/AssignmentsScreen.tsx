// AssignmentsScreen — list of assignment submissions with inline grading.
//
// Lists submissions across the instructor's courses. Each row shows the
// student, assignment title, submitted date, status (pending/graded), and
// grade. The "Grade" button opens an inline form with a points field and
// feedback textarea; submitting it flips the row to "graded" (mock state).

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  XMarkIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Textarea, Avatar, Select } from "@/components/ui";

// ----------------------------------------------------------------------

interface Submission {
  id: string;
  studentName: string;
  courseId: string;
  courseName: string;
  assignmentTitle: string;
  submittedAt: string; // ISO
  status: "submitted" | "graded" | "returned" | "late";
  pointsAwarded?: number;
  maxPoints: number;
  feedback?: string;
  attachmentCount: number;
}

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const COURSES = [
  { id: "course-001", name: "Full-Stack React & TypeScript" },
  { id: "course-002", name: "Advanced React Performance" },
  { id: "course-004", name: "Building Design Systems with Tailwind v4" },
];

const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    studentName: "Marcus Lee",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    assignmentTitle: "Module 4 Project: Build a TODO app",
    submittedAt: hoursAgo(3),
    status: "submitted",
    maxPoints: 100,
    attachmentCount: 2,
  },
  {
    id: "sub-2",
    studentName: "Priya Patel",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    assignmentTitle: "Module 4 Project: Build a TODO app",
    submittedAt: hoursAgo(8),
    status: "submitted",
    maxPoints: 100,
    attachmentCount: 1,
  },
  {
    id: "sub-3",
    studentName: "Diego Rivera",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    assignmentTitle: "Module 4 Project: Build a TODO app",
    submittedAt: daysAgo(1),
    status: "graded",
    maxPoints: 100,
    pointsAwarded: 88,
    feedback: "Great work on state management. Deducted points for missing tests.",
    attachmentCount: 2,
  },
  {
    id: "sub-4",
    studentName: "Sara Kim",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    assignmentTitle: "Profile and optimize a React app",
    submittedAt: daysAgo(1),
    status: "submitted",
    maxPoints: 50,
    attachmentCount: 3,
  },
  {
    id: "sub-5",
    studentName: "Alex Morgan",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    assignmentTitle: "Profile and optimize a React app",
    submittedAt: daysAgo(2),
    status: "graded",
    maxPoints: 50,
    pointsAwarded: 45,
    feedback: "Excellent profiling work. Could explore useMemo more sparingly.",
    attachmentCount: 2,
  },
  {
    id: "sub-6",
    studentName: "Jamie Chen",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    assignmentTitle: "Design a token system",
    submittedAt: daysAgo(3),
    status: "late",
    maxPoints: 75,
    attachmentCount: 1,
  },
  {
    id: "sub-7",
    studentName: "Robin Lee",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    assignmentTitle: "Design a token system",
    submittedAt: daysAgo(4),
    status: "graded",
    maxPoints: 75,
    pointsAwarded: 72,
    feedback: "Thoughtful token naming. Watch for redundant color steps.",
    attachmentCount: 2,
  },
];

// ----------------------------------------------------------------------

const statusTone: Record<
  Submission["status"],
  { color: "warning" | "success" | "info" | "error"; label: string }
> = {
  submitted: { color: "warning", label: "Pending" },
  graded: { color: "success", label: "Graded" },
  returned: { color: "info", label: "Returned" },
  late: { color: "error", label: "Late" },
};

function timeAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diff = now.getTime() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ----------------------------------------------------------------------

export function AssignmentsScreen() {
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradePoints, setGradePoints] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const visible = submissions.filter((s) => {
    if (courseFilter !== "all" && s.courseId !== courseFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      s.studentName.toLowerCase().includes(q) ||
      s.assignmentTitle.toLowerCase().includes(q) ||
      s.courseName.toLowerCase().includes(q)
    );
  });

  const pending = submissions.filter((s) => s.status === "submitted").length;
  const graded = submissions.filter((s) => s.status === "graded").length;
  const late = submissions.filter((s) => s.status === "late").length;

  function startGrading(sub: Submission) {
    setGradingId(sub.id);
    setGradePoints(sub.pointsAwarded?.toString() ?? "");
    setGradeFeedback(sub.feedback ?? "");
  }

  function saveGrade() {
    if (!gradingId) return;
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id !== gradingId) return s;
        const pts = Number(gradePoints);
        return {
          ...s,
          status: "graded",
          pointsAwarded: Number.isFinite(pts) ? pts : 0,
          feedback: gradeFeedback.trim(),
        };
      }),
    );
    setGradingId(null);
    setGradePoints("");
    setGradeFeedback("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          Assignments
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Review submissions and grade student work.
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Pending</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {pending}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Graded</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {graded}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Late</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {late}
          </p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search student, assignment, or course…"
            prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
            classNames={{ wrapper: "mt-0" }}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={courseFilter}
            onChange={(e) => setCourseFilter((e.target as HTMLSelectElement).value)}
            data={[
              { value: "all", label: "All courses" },
              ...COURSES.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="sm:w-56"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target as HTMLSelectElement).value)}
            data={[
              { value: "all", label: "All statuses" },
              { value: "submitted", label: "Pending" },
              { value: "graded", label: "Graded" },
              { value: "late", label: "Late" },
            ]}
            className="sm:w-44"
          />
        </div>
      </div>

      {/* Submission list */}
      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No submissions found"
          description="Try a different filter or clear your search."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              isGrading={gradingId === sub.id}
              onStartGrade={() => startGrading(sub)}
              onCancelGrade={() => setGradingId(null)}
              onSaveGrade={saveGrade}
              gradePoints={gradePoints}
              setGradePoints={setGradePoints}
              gradeFeedback={gradeFeedback}
              setGradeFeedback={setGradeFeedback}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function SubmissionCard({
  submission: sub,
  isGrading,
  onStartGrade,
  onCancelGrade,
  onSaveGrade,
  gradePoints,
  setGradePoints,
  gradeFeedback,
  setGradeFeedback,
}: {
  submission: Submission;
  isGrading: boolean;
  onStartGrade: () => void;
  onCancelGrade: () => void;
  onSaveGrade: () => void;
  gradePoints: string;
  setGradePoints: (v: string) => void;
  gradeFeedback: string;
  setGradeFeedback: (v: string) => void;
}) {
  const tone = statusTone[sub.status];

  return (
    <Card skin="bordered" className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: identity */}
        <div className="flex min-w-0 items-start gap-3">
          <Avatar name={sub.studentName} size={10} initialColor="auto" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                {sub.studentName}
              </h3>
              <Badge color={tone.color} variant="soft" className="gap-1 text-[10px]">
                {sub.status === "graded" && <CheckCircleIcon className="size-3" />}
                {sub.status === "submitted" && <ClockIcon className="size-3" />}
                {tone.label}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-gray-700 dark:text-dark-200">
              {sub.assignmentTitle}
            </p>
            <p className="truncate text-[11px] text-gray-500 dark:text-dark-300">
              {sub.courseName}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 dark:text-dark-400">
              <span>Submitted {timeAgo(sub.submittedAt)}</span>
              <span className="inline-flex items-center gap-1">
                <PaperClipIcon className="size-3" />
                {sub.attachmentCount} file{sub.attachmentCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Right: grade + action */}
        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
              Grade
            </p>
            <p
              className={clsx(
                "text-sm font-semibold",
                sub.pointsAwarded !== undefined
                  ? "text-gray-800 dark:text-dark-50"
                  : "text-gray-400 dark:text-dark-400",
              )}
            >
              {sub.pointsAwarded !== undefined
                ? `${sub.pointsAwarded} / ${sub.maxPoints}`
                : `— / ${sub.maxPoints}`}
            </p>
          </div>
          {!isGrading && (
            <Button
              variant={sub.status === "graded" ? "outlined" : "soft"}
              color={sub.status === "graded" ? "neutral" : "primary"}
              className="gap-1.5 text-xs"
              onClick={onStartGrade}
            >
              <PencilSquareIcon className="size-3.5 stroke-2" />
              {sub.status === "graded" ? "Re-grade" : "Grade"}
            </Button>
          )}
        </div>
      </div>

      {/* Inline grading form */}
      {isGrading && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-dark-600">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label={`Points (out of ${sub.maxPoints})`}
              type="number"
              min={0}
              max={sub.maxPoints}
              value={gradePoints}
              onChange={(e) => setGradePoints((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
          </div>
          <Textarea
            label="Feedback"
            rows={3}
            placeholder="Share constructive feedback with the student…"
            value={gradeFeedback}
            onChange={(e) => setGradeFeedback((e.target as HTMLTextAreaElement).value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="flat" color="neutral" onClick={onCancelGrade} className="gap-1.5 text-xs">
              <XMarkIcon className="size-3.5 stroke-2" />
              Cancel
            </Button>
            <Button color="primary" onClick={onSaveGrade} className="text-xs">
              Save grade
            </Button>
          </div>
        </div>
      )}

      {/* Existing feedback (when graded and not currently grading) */}
      {sub.status === "graded" && sub.feedback && !isGrading && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-dark-600">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Feedback
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-dark-200">
            {sub.feedback}
          </p>
        </div>
      )}
    </Card>
  );
}

export default AssignmentsScreen;
