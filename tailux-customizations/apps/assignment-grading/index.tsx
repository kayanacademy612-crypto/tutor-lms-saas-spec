// Assignment grading dashboard — `apps/assignment-grading` route.
//
// Layout:
//   - Top header strip with the page title and a course <Select>.
//   - Below: a left sidebar with three filters ("Pending Review", "Graded",
//     "All Submissions") and an assignment <Select>.
//   - Main: a table of submissions for the selected assignment with columns
//     student name, submitted date, status, score, and actions ("Grade" /
//     "View Submission"). Clicking "Grade" opens the GradingPanel; "View
//     Submission" opens the SubmissionDetail modal.
//
// Hooks used:
//   - `useCourses()` — populate the course selector.
//   - `useAssignments({ courseId })` — populate the assignment selector once
//     a course is picked.
//   - `useAssignmentSubmissions(assignmentId)` — fetch the submissions table.

// Import Dependencies
import { useMemo, useState } from "react";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import type { ColorType } from "@/constants/app";
import { useAssignments, useAssignmentSubmissions } from "@/hooks/useProAuthoring";
import { useCourses } from "@/hooks/useLms";
import type {
  Assignment,
  AssignmentSubmission,
  AssignmentSubmissionStatus,
  Course,
} from "@/types/lms";

import { GradingPanel } from "./GradingPanel";
import { SubmissionDetail } from "./SubmissionDetail";

// ----------------------------------------------------------------------

type SubmissionFilter = "pending" | "graded" | "all";

const FILTER_OPTIONS: Array<{
  value: SubmissionFilter;
  label: string;
  icon: typeof ClipboardDocumentListIcon;
}> = [
  { value: "pending", label: "Pending Review", icon: ClipboardDocumentListIcon },
  { value: "graded", label: "Graded", icon: CheckCircleIcon },
  { value: "all", label: "All Submissions", icon: AcademicCapIcon },
];

const STATUS_BADGE_COLOR: Record<AssignmentSubmissionStatus, ColorType> = {
  submitted: "warning",
  graded: "success",
  returned: "error",
  late: "error",
};

// ----------------------------------------------------------------------

export default function AssignmentGradingPage() {
  // ───────── State ─────────
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [filter, setFilter] = useState<SubmissionFilter>("pending");
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(
    null,
  );
  const [viewingSubmissionId, setViewingSubmissionId] = useState<string | null>(
    null,
  );

  // ───────── Data ─────────
  const coursesQuery = useCourses();
  const assignmentsQuery = useAssignments(
    selectedCourseId ? { courseId: selectedCourseId } : undefined,
  );
  // useAssignmentSubmissions is hooked unconditionally with the
  // (possibly empty) assignmentId — the hook itself short-circuits when
  // assignmentId is empty.
  const submissionsQuery = useAssignmentSubmissions(
    selectedAssignmentId || undefined,
  );

  const courses: Course[] = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const assignments: Assignment[] = useMemo(
    () => assignmentsQuery.data ?? [],
    [assignmentsQuery.data],
  );
  const submissions: AssignmentSubmission[] = useMemo(
    () => submissionsQuery.data ?? [],
    [submissionsQuery.data],
  );

  // ───────── Derived ─────────
  const filteredSubmissions = useMemo(() => {
    if (filter === "all") return submissions;
    if (filter === "graded")
      return submissions.filter((s) => s.status === "graded");
    // pending = anything not yet graded (submitted/returned/late without a
    // graded status). The backend stamps status=graded on CreateAssignmentGrade.
    return submissions.filter((s) => s.status !== "graded");
  }, [submissions, filter]);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );

  const counts = useMemo(
    () => ({
      pending: submissions.filter((s) => s.status !== "graded").length,
      graded: submissions.filter((s) => s.status === "graded").length,
      all: submissions.length,
    }),
    [submissions],
  );

  // ───────── Handlers ─────────
  const handleCourseChange = (value: string) => {
    setSelectedCourseId(value);
    setSelectedAssignmentId("");
  };

  // ───────── Render ─────────
  return (
    <Page title="Assignment Grading">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <AcademicCapIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Assignment Grading
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Review student submissions and record grades.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedCourseId}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="min-w-[14rem] text-sm"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-9"
              onClick={() => {
                void coursesQuery.refetch();
                void assignmentsQuery.refetch();
                void submissionsQuery.refetch();
              }}
              aria-label="Refresh"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white px-4 py-4 dark:border-dark-600 dark:bg-dark-750 md:block">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Status Filter
            </h2>
            <nav className="flex flex-col gap-1">
              {FILTER_OPTIONS.map((opt) => {
                const count = counts[opt.value];
                const active = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilter(opt.value)}
                    className={[
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-dark-100 dark:hover:bg-dark-600",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <opt.icon className="size-4 stroke-2" />
                      {opt.label}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>

            <h2 className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Assignment
            </h2>
            {selectedCourseId === "" ? (
              <p className="px-2 text-xs text-gray-400 dark:text-dark-400">
                Pick a course first.
              </p>
            ) : assignmentsQuery.loading ? (
              <LoadingState inline message="Loading assignments…" />
            ) : assignments.length === 0 ? (
              <p className="px-2 text-xs text-gray-400 dark:text-dark-400">
                No assignments in this course.
              </p>
            ) : (
              <Select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="text-sm"
              >
                <option value="">Select an assignment…</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </Select>
            )}

            {selectedAssignment && (
              <div className="mt-4 rounded-lg border border-gray-200 p-3 text-xs dark:border-dark-600">
                <p className="font-semibold text-gray-800 dark:text-dark-50">
                  {selectedAssignment.title}
                </p>
                {selectedAssignment.description && (
                  <p className="mt-1 line-clamp-3 text-gray-500 dark:text-dark-300">
                    {selectedAssignment.description}
                  </p>
                )}
                <dl className="mt-2 grid grid-cols-2 gap-1">
                  <dt className="text-gray-500 dark:text-dark-400">
                    Max points
                  </dt>
                  <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                    {selectedAssignment.maxPoints ?? 100}
                  </dd>
                  <dt className="text-gray-500 dark:text-dark-400">
                    Pass mark
                  </dt>
                  <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                    {selectedAssignment.passThreshold ?? "—"}
                  </dd>
                  <dt className="text-gray-500 dark:text-dark-400">Due</dt>
                  <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                    {selectedAssignment.dueAt
                      ? new Date(selectedAssignment.dueAt).toLocaleDateString()
                      : "—"}
                  </dd>
                </dl>
              </div>
            )}
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1">
            <ScrollShadow className="hide-scrollbar h-full overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {/* Mobile course/assignment pickers */}
                <div className="mb-4 flex flex-col gap-2 md:hidden">
                  <Select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="text-sm"
                  >
                    <option value="">Select a course…</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </Select>
                  {selectedCourseId && (
                    <Select
                      value={selectedAssignmentId}
                      onChange={(e) => setSelectedAssignmentId(e.target.value)}
                      className="text-sm"
                    >
                      <option value="">Select an assignment…</option>
                      {assignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                {/* Mobile filter pills */}
                <div className="mb-4 flex gap-2 md:hidden">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFilter(opt.value)}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-medium",
                        filter === opt.value
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-100",
                      ].join(" ")}
                    >
                      {opt.label} ({counts[opt.value]})
                    </button>
                  ))}
                </div>

                {!selectedCourseId ? (
                  <EmptyState
                    icon={AcademicCapIcon}
                    title="Select a course to begin"
                    description="Pick a course from the dropdown above to view its assignments and grade submissions."
                  />
                ) : !selectedAssignmentId ? (
                  <EmptyState
                    icon={ClipboardDocumentListIcon}
                    title="Select an assignment"
                    description="Pick an assignment from the sidebar (or the dropdown on mobile) to see its submissions."
                  />
                ) : submissionsQuery.loading ? (
                  <LoadingState message="Loading submissions…" />
                ) : submissionsQuery.error ? (
                  <ErrorState
                    error={submissionsQuery.error}
                    onRetry={submissionsQuery.refetch}
                  />
                ) : filteredSubmissions.length === 0 ? (
                  <EmptyState
                    icon={CheckCircleIcon}
                    title="No submissions here"
                    description="There are no submissions matching this filter for the selected assignment."
                  />
                ) : (
                  <Card skin="bordered" className="overflow-hidden p-0">
                    <Table hoverable>
                      <THead>
                        <Tr>
                          <Th className="text-left">Student</Th>
                          <Th className="text-left">Submitted</Th>
                          <Th className="text-left">Status</Th>
                          <Th className="text-right">Score</Th>
                          <Th className="text-right">Actions</Th>
                        </Tr>
                      </THead>
                      <TBody>
                        {filteredSubmissions.map((s) => {
                          const isGraded = s.status === "graded";
                          return (
                            <Tr key={s.id}>
                              <Td>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                                    {s.studentId}
                                  </p>
                                  <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                                    Enrollment {s.enrollmentId}
                                  </p>
                                </div>
                              </Td>
                              <Td>
                                <span className="text-sm text-gray-700 dark:text-dark-100">
                                  {new Date(s.submittedAt).toLocaleString()}
                                </span>
                              </Td>
                              <Td>
                                <Badge
                                  color={STATUS_BADGE_COLOR[s.status]}
                                  variant="soft"
                                  className="capitalize"
                                >
                                  {s.status}
                                </Badge>
                              </Td>
                              <Td className="text-right">
                                {isGraded && typeof s.pointsAwarded === "number" ? (
                                  <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                                    {s.pointsAwarded}
                                    {selectedAssignment?.maxPoints
                                      ? ` / ${selectedAssignment.maxPoints}`
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-dark-400">
                                    Not graded
                                  </span>
                                )}
                              </Td>
                              <Td>
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    color={isGraded ? "neutral" : "primary"}
                                    variant="soft"
                                    className="gap-1.5"
                                    onClick={() => setGradingSubmissionId(s.id)}
                                  >
                                    {isGraded ? (
                                      <PencilIcon className="size-4 stroke-2" />
                                    ) : (
                                      <ClipboardDocumentListIcon className="size-4 stroke-2" />
                                    )}
                                    {isGraded ? "Re-grade" : "Grade"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="neutral"
                                    variant="flat"
                                    isIcon
                                    onClick={() =>
                                      setViewingSubmissionId(s.id)
                                    }
                                    aria-label="View submission"
                                  >
                                    <EyeIcon className="size-4 stroke-2" />
                                  </Button>
                                </div>
                              </Td>
                            </Tr>
                          );
                        })}
                      </TBody>
                    </Table>
                  </Card>
                )}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>

      {/* Grading panel (slide-over) */}
      {gradingSubmissionId && (
        <GradingPanel
          submissionId={gradingSubmissionId}
          assignment={selectedAssignment}
          onClose={() => setGradingSubmissionId(null)}
          onGraded={() => {
            void submissionsQuery.refetch();
          }}
        />
      )}

      {/* Submission detail (modal) */}
      {viewingSubmissionId && (
        <SubmissionDetail
          submissionId={viewingSubmissionId}
          assignment={selectedAssignment}
          onClose={() => setViewingSubmissionId(null)}
        />
      )}
    </Page>
  );
}
