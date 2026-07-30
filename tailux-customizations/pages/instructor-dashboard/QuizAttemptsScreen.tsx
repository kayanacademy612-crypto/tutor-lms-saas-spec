// QuizAttemptsScreen — table of student quiz attempts.
//
// Lists every quiz attempt across the instructor's courses with the student
// name, quiz title, score, pass/fail, and date. A course + quiz filter and a
// free-text search narrow the list. Mock data is used.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Avatar, Select } from "@/components/ui";

// ----------------------------------------------------------------------

interface QuizAttemptRow {
  id: string;
  studentName: string;
  courseId: string;
  courseName: string;
  quizId: string;
  quizTitle: string;
  scorePct: number;
  pointsEarned: number;
  pointsTotal: number;
  isPassed: boolean;
  attemptNo: number;
  submittedAt: string; // ISO
  timeSpentMin: number;
}

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const COURSES = [
  { id: "course-001", name: "Full-Stack React & TypeScript" },
  { id: "course-002", name: "Advanced React Performance" },
  { id: "course-004", name: "Building Design Systems with Tailwind v4" },
];

const QUIZZES = [
  { id: "quiz-1", courseId: "course-001", title: "Hooks Fundamentals" },
  { id: "quiz-2", courseId: "course-001", title: "TypeScript Generics" },
  { id: "quiz-3", courseId: "course-002", title: "React Profiling" },
  { id: "quiz-4", courseId: "course-004", title: "Tailwind Tokens" },
];

const MOCK_ATTEMPTS: QuizAttemptRow[] = [
  {
    id: "att-1",
    studentName: "Marcus Lee",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    quizId: "quiz-1",
    quizTitle: "Hooks Fundamentals",
    scorePct: 92,
    pointsEarned: 18,
    pointsTotal: 20,
    isPassed: true,
    attemptNo: 1,
    submittedAt: hoursAgo(2),
    timeSpentMin: 14,
  },
  {
    id: "att-2",
    studentName: "Priya Patel",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    quizId: "quiz-1",
    quizTitle: "Hooks Fundamentals",
    scorePct: 78,
    pointsEarned: 16,
    pointsTotal: 20,
    isPassed: true,
    attemptNo: 2,
    submittedAt: hoursAgo(5),
    timeSpentMin: 18,
  },
  {
    id: "att-3",
    studentName: "Diego Rivera",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    quizId: "quiz-2",
    quizTitle: "TypeScript Generics",
    scorePct: 45,
    pointsEarned: 9,
    pointsTotal: 20,
    isPassed: false,
    attemptNo: 1,
    submittedAt: daysAgo(1),
    timeSpentMin: 22,
  },
  {
    id: "att-4",
    studentName: "Sara Kim",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    quizId: "quiz-3",
    quizTitle: "React Profiling",
    scorePct: 88,
    pointsEarned: 22,
    pointsTotal: 25,
    isPassed: true,
    attemptNo: 1,
    submittedAt: daysAgo(1),
    timeSpentMin: 30,
  },
  {
    id: "att-5",
    studentName: "Alex Morgan",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    quizId: "quiz-3",
    quizTitle: "React Profiling",
    scorePct: 64,
    pointsEarned: 16,
    pointsTotal: 25,
    isPassed: false,
    attemptNo: 2,
    submittedAt: daysAgo(2),
    timeSpentMin: 28,
  },
  {
    id: "att-6",
    studentName: "Jamie Chen",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    quizId: "quiz-4",
    quizTitle: "Tailwind Tokens",
    scorePct: 100,
    pointsEarned: 20,
    pointsTotal: 20,
    isPassed: true,
    attemptNo: 1,
    submittedAt: daysAgo(3),
    timeSpentMin: 11,
  },
  {
    id: "att-7",
    studentName: "Robin Lee",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    quizId: "quiz-4",
    quizTitle: "Tailwind Tokens",
    scorePct: 75,
    pointsEarned: 15,
    pointsTotal: 20,
    isPassed: true,
    attemptNo: 1,
    submittedAt: daysAgo(4),
    timeSpentMin: 17,
  },
];

// ----------------------------------------------------------------------

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ----------------------------------------------------------------------

export function QuizAttemptsScreen() {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [quizFilter, setQuizFilter] = useState<string>("all");

  const availableQuizzes = useMemo(
    () =>
      QUIZZES.filter(
        (q) => courseFilter === "all" || q.courseId === courseFilter,
      ),
    [courseFilter],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_ATTEMPTS.filter((a) => {
      if (courseFilter !== "all" && a.courseId !== courseFilter) return false;
      if (quizFilter !== "all" && a.quizId !== quizFilter) return false;
      if (!q) return true;
      return (
        a.studentName.toLowerCase().includes(q) ||
        a.quizTitle.toLowerCase().includes(q) ||
        a.courseName.toLowerCase().includes(q)
      );
    }).sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
  }, [query, courseFilter, quizFilter]);

  const avgScore =
    visible.length > 0
      ? Math.round(
          visible.reduce((s, a) => s + a.scorePct, 0) / visible.length,
        )
      : 0;
  const passRate =
    visible.length > 0
      ? Math.round(
          (visible.filter((a) => a.isPassed).length / visible.length) * 100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          Quiz Attempts
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Review every attempt across your courses — filter by course or quiz.
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Total attempts</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {visible.length}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Avg score</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {avgScore}%
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Pass rate</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {passRate}%
          </p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search student, quiz, or course…"
            prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
            classNames={{ wrapper: "mt-0" }}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select
            value={courseFilter}
            onChange={(e) => {
              setCourseFilter((e.target as HTMLSelectElement).value);
              setQuizFilter("all");
            }}
            data={[
              { value: "all", label: "All courses" },
              ...COURSES.map((c) => ({ value: c.id, label: c.name })),
            ]}
            className="sm:w-56"
          />
          <Select
            value={quizFilter}
            onChange={(e) => setQuizFilter((e.target as HTMLSelectElement).value)}
            data={[
              { value: "all", label: "All quizzes" },
              ...availableQuizzes.map((q) => ({ value: q.id, label: q.title })),
            ]}
            className="sm:w-48"
          />
        </div>
      </div>

      {/* Active filter chip */}
      {(courseFilter !== "all" || quizFilter !== "all") && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
          <FunnelIcon className="size-3.5" />
          <span>Filtered by:</span>
          {courseFilter !== "all" && (
            <Badge color="primary" variant="soft" className="text-[10px]">
              {COURSES.find((c) => c.id === courseFilter)?.name}
            </Badge>
          )}
          {quizFilter !== "all" && (
            <Badge color="info" variant="soft" className="text-[10px]">
              {QUIZZES.find((q) => q.id === quizFilter)?.title}
            </Badge>
          )}
          <Button
            variant="flat"
            color="neutral"
            className="text-[11px]"
            onClick={() => {
              setCourseFilter("all");
              setQuizFilter("all");
            }}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentCheckIcon}
          title="No quiz attempts found"
          description="Try a different filter or clear your search."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Table head */}
          <div className="hidden grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300 sm:grid">
            <div className="col-span-3">Student</div>
            <div className="col-span-3">Quiz</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-1">Result</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1 text-right">Time</div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            {visible.map((row) => (
              <AttemptRow key={row.id} row={row} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function AttemptRow({ row }: { row: QuizAttemptRow }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-12 sm:items-center">
      {/* Student */}
      <div className="col-span-3 flex items-center gap-2.5">
        <Avatar name={row.studentName} size={8} initialColor="auto" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-50">
            {row.studentName}
          </p>
          <p className="truncate text-[11px] text-gray-500 dark:text-dark-300">
            {row.courseName}
          </p>
        </div>
      </div>

      {/* Quiz */}
      <div className="col-span-3 min-w-0">
        <p className="truncate text-sm text-gray-700 dark:text-dark-200">
          {row.quizTitle}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-dark-400">
          Attempt #{row.attemptNo}
        </p>
      </div>

      {/* Score */}
      <div className="col-span-2 flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
          <div
            className={clsx(
              "h-full rounded-full",
              row.isPassed ? "bg-success-500" : "bg-error-500",
            )}
            style={{ width: `${row.scorePct}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {row.scorePct}%
        </span>
        <span className="text-[11px] text-gray-400 dark:text-dark-400">
          {row.pointsEarned}/{row.pointsTotal}
        </span>
      </div>

      {/* Result */}
      <div className="col-span-1">
        {row.isPassed ? (
          <Badge color="success" variant="soft" className="gap-1 text-[10px]">
            <CheckCircleIcon className="size-3" />
            Pass
          </Badge>
        ) : (
          <Badge color="error" variant="soft" className="gap-1 text-[10px]">
            <XCircleIcon className="size-3" />
            Fail
          </Badge>
        )}
      </div>

      {/* Date */}
      <div className="col-span-2 text-[11px] text-gray-500 dark:text-dark-300">
        <p>{formatDate(row.submittedAt)}</p>
        <p className="text-gray-400 dark:text-dark-400">
          {formatTime(row.submittedAt)}
        </p>
      </div>

      {/* Time */}
      <div className="col-span-1 text-right text-xs text-gray-500 dark:text-dark-300">
        {row.timeSpentMin}m
      </div>
    </div>
  );
}

export default QuizAttemptsScreen;
