// GradebookPanel — Grades tab for the right sidebar.
//
// Shows the student's gradebook for the course: lesson completion strip,
// quiz scores, assignment grades, overall progress, and certificate
// eligibility. Mock quiz attempts / assignment submissions live at the top;
// the parent passes the curriculum + progress map.

// Import Dependencies
import { useMemo } from "react";
import clsx from "clsx";
import {
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  PlayCircleIcon,
  ClipboardDocumentCheckIcon,
  InboxArrowDownIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Card, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/lms";
import type {
  Assignment,
  Enrollment,
  Lesson,
  LessonProgress,
  Quiz,
  QuizAttempt,
  AssignmentSubmission,
} from "@/types/lms";

// ----------------------------------------------------------------------

export interface GradebookPanelProps {
  courseId: string;
  lessons: Lesson[];
  quizzes: Quiz[];
  assignments: Assignment[];
  progressMap: Record<string, LessonProgress>;
  enrollment: Enrollment;
}

// ---- Mock data --------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const MOCK_QUIZ_ATTEMPTS: QuizAttempt[] = [
  {
    id: "att-1",
    tenantId: "tenant-1",
    quizId: "quiz-1",
    courseId: "course-001",
    studentId: "student-1",
    enrollmentId: "enr-1",
    status: "graded",
    attemptNo: 1,
    scorePct: 75,
    pointsEarned: 3,
    pointsTotal: 4,
    isPassed: true,
    timeSpentSec: 412,
    startedAt: daysFromNow(-2),
    submittedAt: daysFromNow(-2),
    gradedAt: daysFromNow(-2),
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
  },
];

const MOCK_SUBMISSIONS: AssignmentSubmission[] = [
  {
    id: "sub-1",
    tenantId: "tenant-1",
    assignmentId: "asg-1",
    courseId: "course-001",
    studentId: "student-1",
    enrollmentId: "enr-1",
    status: "graded",
    pointsAwarded: 11,
    submittedAt: daysFromNow(-3),
    gradedAt: daysFromNow(-2),
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-2),
  },
];

// ---- Helpers ----------------------------------------------------------

function formatDate(isoDate?: string): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ----------------------------------------------------------------------

export default function GradebookPanel({
  courseId,
  lessons,
  quizzes,
  assignments,
  progressMap,
  enrollment,
}: GradebookPanelProps) {
  void courseId;

  // ---- Aggregates ---------------------------------------------------
  const { lessonsComplete, lessonsTotal, lessonPct } = useMemo(() => {
    const total = lessons.length;
    const complete = lessons.filter(
      (l) => progressMap[l.id]?.isComplete,
    ).length;
    return {
      lessonsComplete: complete,
      lessonsTotal: total,
      lessonPct: total ? Math.round((complete / total) * 100) : 0,
    };
  }, [lessons, progressMap]);

  const { quizScores, quizAvgPct, quizzesPassed } = useMemo(() => {
    const scored = quizzes
      .map((q) => {
        const attempts = MOCK_QUIZ_ATTEMPTS.filter((a) => a.quizId === q.id);
        const best = attempts.sort(
          (a, b) => (b.scorePct ?? 0) - (a.scorePct ?? 0),
        )[0];
        return { quiz: q, best };
      })
      .filter((x) => !!x.best);
    const avg = scored.length
      ? Math.round(
          scored.reduce((s, x) => s + (x.best?.scorePct ?? 0), 0) /
            scored.length,
        )
      : 0;
    const passed = scored.filter(
      (x) => x.best?.isPassed,
    ).length;
    return {
      quizScores: scored,
      quizAvgPct: avg,
      quizzesPassed: passed,
    };
  }, [quizzes]);

  const { assignmentScores, assignmentAvgPct } = useMemo(() => {
    const scored = assignments
      .map((a) => {
        const subs = MOCK_SUBMISSIONS.filter((s) => s.assignmentId === a.id);
        const latest = subs.sort(
          (a, b) =>
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime(),
        )[0];
        return { assignment: a, latest };
      })
      .filter((x) => !!x.latest);
    const avg = scored.length
      ? Math.round(
          scored.reduce((s, x) => {
            const awarded = x.latest?.pointsAwarded ?? 0;
            const max = x.assignment.maxPoints ?? 0;
            return s + (max ? (awarded / max) * 100 : 0);
          }, 0) / scored.length,
        )
      : 0;
    return { assignmentScores: scored, assignmentAvgPct: avg };
  }, [assignments]);

  // ---- Certificate eligibility -------------------------------------
  // Mock rule: 100% lessons + all quizzes passed + all assignments graded.
  const allLessonsDone = lessonsComplete === lessonsTotal && lessonsTotal > 0;
  const allQuizzesPassed =
    quizzes.length === 0 || quizzesPassed === quizzes.length;
  const allAssignmentsGraded =
    assignments.length === 0 ||
    assignmentScores.length === assignments.length;
  const certEligible = allLessonsDone && allQuizzesPassed && allAssignmentsGraded;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
          <ClipboardDocumentListIcon className="size-4 text-primary-500" />
          Gradebook
        </h2>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          Last accessed {formatDate(enrollment.lastAccessedAt)}
        </p>
      </header>

      {/* Overall progress */}
      <Card skin="bordered" className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Overall
          </p>
          <Badge
            color={enrollment.status === "completed" ? "success" : "primary"}
            variant="soft"
          >
            {enrollment.status}
          </Badge>
        </div>
        <p className="mt-1 text-2xl font-bold text-gray-800 dark:text-dark-50">
          {enrollment.progressPct}%
        </p>
        <ProgressBar
          value={enrollment.progressPct}
          color={enrollment.progressPct >= 100 ? "success" : "primary"}
          size="sm"
          showValue={false}
          className="mt-2"
        />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Lessons" value={`${lessonsComplete}/${lessonsTotal}`} />
          <Stat label="Quizzes" value={`${quizzesPassed}/${quizzes.length}`} />
          <Stat
            label="Assignments"
            value={`${assignmentScores.length}/${assignments.length}`}
          />
        </div>
      </Card>

      {/* Certificate eligibility */}
      <Card
        skin="bordered"
        className={clsx(
          "p-4",
          certEligible
            ? "border-success-300 bg-success-50/50 dark:border-success-500/30 dark:bg-success-500/5"
            : "border-gray-200 dark:border-dark-600",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              certEligible
                ? "bg-success-500/15 text-success-600 dark:text-success-300"
                : "bg-gray-150 text-gray-500 dark:bg-dark-500 dark:text-dark-300",
            )}
          >
            {certEligible ? (
              <TrophyIcon className="size-5 stroke-2" />
            ) : (
              <LockClosedIcon className="size-5 stroke-2" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              {certEligible ? "Certificate ready!" : "Certificate locked"}
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              {certEligible
                ? "Visit the Certificate tab to download."
                : "Complete all requirements to unlock."}
            </p>
          </div>
        </div>
        {!certEligible && (
          <ul className="mt-3 space-y-1.5 text-xs">
            <EligibilityRow ok={allLessonsDone} label={`Complete all ${lessonsTotal} lessons (${lessonsComplete}/${lessonsTotal})`} />
            <EligibilityRow ok={allQuizzesPassed} label={`Pass all ${quizzes.length} quizzes (${quizzesPassed}/${quizzes.length})`} />
            <EligibilityRow ok={allAssignmentsGraded} label={`Submit all ${assignments.length} assignments (${assignmentScores.length}/${assignments.length})`} />
          </ul>
        )}
      </Card>

      {/* Lesson completion list */}
      <Card skin="bordered" className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Lessons
          </h3>
          <Badge color="info" variant="soft">
            {lessonPct}% complete
          </Badge>
        </div>
        <ul className="space-y-1.5">
          {lessons.map((l, idx) => {
            const p = progressMap[l.id];
            const complete = !!p?.isComplete;
            return (
              <li
                key={l.id}
                className="flex items-center gap-2 text-xs"
              >
                <span className="w-5 shrink-0 text-right text-gray-400 dark:text-dark-400">
                  {idx + 1}.
                </span>
                <PlayCircleIcon
                  className={clsx(
                    "size-4 shrink-0",
                    complete
                      ? "text-success-500 dark:text-success-400"
                      : "text-gray-400 dark:text-dark-400",
                  )}
                />
                <span
                  className={clsx(
                    "flex-1 truncate",
                    complete
                      ? "text-gray-500 line-through dark:text-dark-300"
                      : "text-gray-700 dark:text-dark-100",
                  )}
                >
                  {l.title}
                </span>
                {complete ? (
                  <CheckCircleSolidIcon className="size-4 shrink-0 text-success-500 dark:text-success-400" />
                ) : (
                  <span className="text-[10px] text-gray-400 dark:text-dark-400">
                    {p ? `${Math.round(p.completionPct)}%` : "—"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Quiz scores */}
      {quizzes.length > 0 && (
        <Card skin="bordered" className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Quizzes
            </h3>
            <Badge color="info" variant="soft">
              Avg {quizAvgPct}%
            </Badge>
          </div>
          <ul className="space-y-2">
            {quizzes.map((q) => {
              const entry = quizScores.find((x) => x.quiz.id === q.id);
              const best = entry?.best;
              const passThreshold = q.settings?.passThresholdPct ?? 0;
              return (
                <li
                  key={q.id}
                  className="rounded-md border border-gray-200 p-2.5 dark:border-dark-600"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="size-4 shrink-0 text-primary-500" />
                    <p className="flex-1 truncate text-xs font-medium text-gray-800 dark:text-dark-100">
                      {q.title}
                    </p>
                    {best ? (
                      <Badge
                        color={best.isPassed ? "success" : "error"}
                        variant="soft"
                      >
                        {best.scorePct}%
                      </Badge>
                    ) : (
                      <Badge color="neutral" variant="soft">
                        Not taken
                      </Badge>
                    )}
                  </div>
                  {best && (
                    <p className="mt-1 pl-6 text-[11px] text-gray-500 dark:text-dark-300">
                      Attempt {best.attemptNo} · {best.pointsEarned}/{best.pointsTotal} pts ·
                      Pass {passThreshold}% · {formatDate(best.submittedAt)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* Assignment grades */}
      {assignments.length > 0 && (
        <Card skin="bordered" className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Assignments
            </h3>
            <Badge color="info" variant="soft">
              Avg {assignmentAvgPct}%
            </Badge>
          </div>
          <ul className="space-y-2">
            {assignments.map((a) => {
              const entry = assignmentScores.find(
                (x) => x.assignment.id === a.id,
              );
              const latest = entry?.latest;
              const pct =
                latest && a.maxPoints
                  ? Math.round(
                      ((latest.pointsAwarded ?? 0) / a.maxPoints) * 100,
                    )
                  : 0;
              return (
                <li
                  key={a.id}
                  className="rounded-md border border-gray-200 p-2.5 dark:border-dark-600"
                >
                  <div className="flex items-center gap-2">
                    <InboxArrowDownIcon className="size-4 shrink-0 text-primary-500" />
                    <p className="flex-1 truncate text-xs font-medium text-gray-800 dark:text-dark-100">
                      {a.title}
                    </p>
                    {latest ? (
                      <Badge
                        color={
                          latest.status === "graded"
                            ? pct >= 70
                              ? "success"
                              : "warning"
                            : "info"
                        }
                        variant="soft"
                      >
                        {latest.status === "graded"
                          ? `${latest.pointsAwarded}/${a.maxPoints}`
                          : latest.status}
                      </Badge>
                    ) : (
                      <Badge color="neutral" variant="soft">
                        Not submitted
                      </Badge>
                    )}
                  </div>
                  {latest && (
                    <p className="mt-1 pl-6 text-[11px] text-gray-500 dark:text-dark-300">
                      Submitted {formatDate(latest.submittedAt)}
                      {latest.gradedAt && ` · Graded ${formatDate(latest.gradedAt)}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 py-1.5 dark:bg-dark-600">
      <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-dark-300">
        {label}
      </p>
    </div>
  );
}

function EligibilityRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircleIcon className="size-4 shrink-0 text-success-500 dark:text-success-400" />
      ) : (
        <XCircleIcon className="size-4 shrink-0 text-error-500 dark:text-error-400" />
      )}
      <span
        className={clsx(
          ok
            ? "text-success-700 dark:text-success-300"
            : "text-gray-600 dark:text-dark-200",
        )}
      >
        {label}
      </span>
    </li>
  );
}
