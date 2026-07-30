// Learning Area — the screen students use to consume course content.
//
// Layout: top bar (course title, progress, catalog back-link) + 3-column body
//   1. Left sidebar  — curriculum tree (topics → lessons/quizzes/assignments)
//                      with per-item progress indicators and locked state.
//   2. Main content  — renders the active item via VideoLesson / ReadingLesson
//                      / QuizTake / AssignmentSubmit.
//   3. Right sidebar — tabbed panel (Q&A, Announcements, Resources, Reviews,
//                      Gradebook, Certificate, Course Info, Drip).
//
// The active item + active right-tab live in `useState`. Mock data is defined
// at the top so the screen is always usable in dev. `courseId` is accepted as
// a prop (or falls back to a hard-coded mock) so the page can be mounted from
// either a route param or a parent layout.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  PlayCircleIcon,
  ClipboardDocumentCheckIcon,
  InboxArrowDownIcon,
  ChatBubbleLeftRightIcon,
  MegaphoneIcon,
  PaperClipIcon,
  StarIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  InformationCircleIcon,
  ClockIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, ScrollShadow } from "@/components/ui";
import { ProgressBar } from "@/components/lms";
import { lmsApi } from "@/services/lms-api";
import type {
  Course,
  Topic,
  Lesson,
  Quiz,
  Assignment,
  Enrollment,
  LessonProgress,
  LessonProgressInput,
} from "@/types/lms";

import VideoLesson from "./VideoLesson";
import ReadingLesson from "./ReadingLesson";
import QuizTake from "./QuizTake";
import AssignmentSubmit from "./AssignmentSubmit";
import QAPanel from "./QAPanel";
import AnnouncementsPanel from "./AnnouncementsPanel";
import ResourcesPanel from "./ResourcesPanel";
import ReviewsPanel from "./ReviewsPanel";
import GradebookPanel from "./GradebookPanel";
import CertificateView from "./CertificateView";
import CourseInfoPanel from "./CourseInfoPanel";
import ContentDeliverySettings from "./ContentDeliverySettings";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Mock course that owns the curriculum below. */
const MOCK_COURSE: Course = {
  id: "course-001",
  tenantId: "tenant-1",
  instructorId: "instr-1",
  title: "Full-Stack React & TypeScript",
  slug: "fullstack-react-ts",
  description:
    "Build production web apps end-to-end with React 19, TypeScript, and modern tooling.",
  status: "published",
  priceType: "paid",
  priceCents: 8900,
  currency: "usd",
  difficulty: "intermediate",
  isFeatured: true,
  isPublic: true,
  enrolledCount: 1240,
  ratingAvg: 4.7,
  ratingCount: 312,
  createdAt: iso(new Date("2025-01-10")),
  updatedAt: iso(new Date("2025-06-01")),
};

const MOCK_TOPICS: Topic[] = [
  {
    id: "topic-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    title: "Foundations",
    summary: "Set up your environment and learn the React mental model.",
    sortOrder: 0,
    lessonCount: 3,
    createdAt: iso(new Date("2025-01-12")),
    updatedAt: iso(new Date("2025-01-12")),
  },
  {
    id: "topic-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    title: "Components & State",
    summary: "Compose UIs with function components and hooks.",
    sortOrder: 1,
    lessonCount: 4,
    createdAt: iso(new Date("2025-01-20")),
    updatedAt: iso(new Date("2025-02-02")),
  },
  {
    id: "topic-3",
    tenantId: "tenant-1",
    courseId: "course-001",
    title: "Data & APIs",
    summary: "Fetch, cache, and mutate data the right way.",
    sortOrder: 2,
    lessonCount: 3,
    createdAt: iso(new Date("2025-02-10")),
    updatedAt: iso(new Date("2025-02-20")),
  },
];

const MOCK_LESSONS: Lesson[] = [
  {
    id: "lesson-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "Welcome & Course Roadmap",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 312,
    content:
      "<p>A quick welcome and a look at the roadmap for the next 12 weeks.</p>",
    isPreview: true,
    isRequired: true,
    sortOrder: 0,
    createdAt: iso(new Date("2025-01-12")),
    updatedAt: iso(new Date("2025-01-12")),
  },
  {
    id: "lesson-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "Tooling: Vite, TypeScript, pnpm",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 658,
    content:
      "<p>Set up a modern Vite + TypeScript project in under five minutes.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 1,
    createdAt: iso(new Date("2025-01-13")),
    updatedAt: iso(new Date("2025-01-13")),
  },
  {
    id: "lesson-3",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "Reading: React Mental Model",
    lessonType: "text",
    content:
      "<h3>Why React?</h3><p>React is a declarative UI library that lets you describe what the UI should look like for any given state, and let it figure out the DOM updates.</p><ul><li>Components are pure functions of props + state.</li><li>State changes trigger re-renders.</li><li>Effects synchronise external systems.</li></ul>",
    attachmentUrls: ["react-cheatsheet.pdf", "starter-repo.zip"],
    isPreview: false,
    isRequired: true,
    sortOrder: 2,
    createdAt: iso(new Date("2025-01-14")),
    updatedAt: iso(new Date("2025-01-14")),
  },
  {
    id: "lesson-4",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "Function Components & Props",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 845,
    content: "<p>Anatomy of a function component, props, and children.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 0,
    createdAt: iso(new Date("2025-01-22")),
    updatedAt: iso(new Date("2025-01-22")),
  },
  {
    id: "lesson-5",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "useState & useReducer Deep Dive",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 1207,
    content: "<p>When to reach for useReducer instead of useState.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 1,
    createdAt: iso(new Date("2025-01-25")),
    updatedAt: iso(new Date("2025-01-25")),
  },
  {
    id: "lesson-6",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "Effects & Cleanup",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 932,
    content: "<p>The Effect lifecycle and how to avoid stale closures.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 2,
    createdAt: iso(new Date("2025-01-28")),
    updatedAt: iso(new Date("2025-01-28")),
  },
  {
    id: "lesson-7",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "Building a Custom Hook",
    lessonType: "text",
    content:
      "<h3>Extracting reusable logic</h3><p>Custom hooks are just functions that call other hooks. Extract them when the same effect/state pattern shows up in two or more components.</p>",
    attachmentUrls: ["use-debounce.ts"],
    isPreview: false,
    isRequired: false,
    sortOrder: 3,
    createdAt: iso(new Date("2025-01-30")),
    updatedAt: iso(new Date("2025-01-30")),
  },
  {
    id: "lesson-8",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-3",
    instructorId: "instr-1",
    title: "Fetch, Cache, Mutate",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 1098,
    content: "<p>Patterns for data fetching without a framework.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 0,
    createdAt: iso(new Date("2025-02-11")),
    updatedAt: iso(new Date("2025-02-11")),
  },
  {
    id: "lesson-9",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-3",
    instructorId: "instr-1",
    title: "Optimistic UI & Rollbacks",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 715,
    content: "<p>Show the user the result before the server confirms it.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 1,
    createdAt: iso(new Date("2025-02-14")),
    updatedAt: iso(new Date("2025-02-14")),
  },
];

const MOCK_QUIZZES: Quiz[] = [
  {
    id: "quiz-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "Foundations Check",
    description: "Quick check on tooling & mental model.",
    settings: {
      passThresholdPct: 70,
      maxAttempts: 3,
      timeLimitSeconds: 600,
      shuffleQuestions: true,
      shuffleAnswers: false,
      showCorrectAnswers: true,
      allowReview: true,
      allowPauseResume: false,
      notifyOnSubmit: true,
      gradingMethod: "auto",
    },
    questionCount: 4,
    totalPoints: 4,
    isPublished: true,
    sortOrder: 99,
    createdAt: iso(new Date("2025-01-15")),
    updatedAt: iso(new Date("2025-01-15")),
  },
  {
    id: "quiz-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "Hooks Mastery Quiz",
    description: "Test your understanding of React hooks.",
    settings: {
      passThresholdPct: 80,
      maxAttempts: 2,
      timeLimitSeconds: 900,
      shuffleQuestions: false,
      shuffleAnswers: true,
      showCorrectAnswers: true,
      allowReview: true,
      allowPauseResume: true,
      notifyOnSubmit: false,
      gradingMethod: "auto",
    },
    questionCount: 4,
    totalPoints: 4,
    isPublished: true,
    sortOrder: 99,
    createdAt: iso(new Date("2025-02-01")),
    updatedAt: iso(new Date("2025-02-01")),
  },
];

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: "asg-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    topicId: "topic-3",
    instructorId: "instr-1",
    title: "Build a Debounced Search Widget",
    description:
      "Put together a debounced search box that fetches results from a public API.",
    instructions:
      "Submit a CodeSandbox link plus a 200-word write-up of your hook design.",
    maxPoints: 20,
    passThreshold: 12,
    allowUploads: true,
    allowedFileTypes: ["pdf", "zip", "txt"],
    maxFileCount: 3,
    dueAt: daysFromNow(5),
    sortOrder: 99,
    isPublished: true,
    createdAt: iso(new Date("2025-02-15")),
    updatedAt: iso(new Date("2025-02-15")),
  },
];

const MOCK_PROGRESS: Record<string, LessonProgress> = {
  "lesson-1": {
    id: "p-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    lessonId: "lesson-1",
    studentId: "student-1",
    enrollmentId: "enr-1",
    positionSeconds: 312,
    durationSeconds: 312,
    isComplete: true,
    completionPct: 100,
    completedAt: daysFromNow(-2),
    createdAt: daysFromNow(-3),
    updatedAt: daysFromNow(-2),
  },
  "lesson-2": {
    id: "p-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    lessonId: "lesson-2",
    studentId: "student-1",
    enrollmentId: "enr-1",
    positionSeconds: 410,
    durationSeconds: 658,
    isComplete: false,
    completionPct: 62,
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(0),
  },
};

const MOCK_ENROLLMENT: Enrollment = {
  id: "enr-1",
  tenantId: "tenant-1",
  courseId: "course-001",
  studentId: "student-1",
  status: "active",
  progressPct: 22,
  lessonsTotal: 9,
  lessonsComplete: 2,
  lastAccessedAt: daysFromNow(0),
  createdAt: daysFromNow(-3),
  updatedAt: daysFromNow(0),
};

// ----------------------------------------------------------------------

/** A single navigable item in the curriculum tree. */
interface CurriculumItem {
  kind: "lesson" | "quiz" | "assignment";
  id: string;
  topicId: string;
  title: string;
  /** Locked by drip / prerequisites. */
  locked: boolean;
  /** Lock reason (preview text under the lock icon). */
  lockedReason?: string;
}

/** Discriminated active-item state. */
type ActiveItem =
  | { kind: "lesson"; id: string }
  | { kind: "quiz"; id: string }
  | { kind: "assignment"; id: string };

type RightTab =
  | "qa"
  | "announcements"
  | "resources"
  | "reviews"
  | "gradebook"
  | "certificate"
  | "info"
  | "drip";

interface RightTabDef {
  id: RightTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const RIGHT_TABS: RightTabDef[] = [
  { id: "qa", label: "Q&A", icon: ChatBubbleLeftRightIcon },
  { id: "announcements", label: "News", icon: MegaphoneIcon },
  { id: "resources", label: "Files", icon: PaperClipIcon },
  { id: "reviews", label: "Reviews", icon: StarIcon },
  { id: "gradebook", label: "Grades", icon: ClipboardDocumentListIcon },
  { id: "certificate", label: "Certificate", icon: DocumentCheckIcon },
  { id: "info", label: "Info", icon: InformationCircleIcon },
  { id: "drip", label: "Schedule", icon: ClockIcon },
];

// ----------------------------------------------------------------------

export default function LearningArea({
  courseId: courseIdProp,
}: {
  /** Optional course id. Falls back to the mock course when omitted. */
  courseId?: string;
}) {
  // Accept the prop so the page is mountable from a router, but the mock data
  // is hard-coded for now. The variable is captured so future router wiring
  // can swap the mock for a fetch keyed on the id.
  void courseIdProp;
  const courseId = MOCK_COURSE.id;

  const [activeItem, setActiveItem] = useState<ActiveItem>({
    kind: "lesson",
    id: "lesson-2",
  });
  const [rightTab, setRightTab] = useState<RightTab>("qa");

  // Build the flattened curriculum: topics → [lessons, quizzes, assignments].
  const { curriculum, flat } = useMemo(() => {
    const tree: Array<{ topic: Topic; items: CurriculumItem[] }> = [];
    const flatItems: CurriculumItem[] = [];
    const sortedTopics = [...MOCK_TOPICS].sort((a, b) => a.sortOrder - b.sortOrder);

    sortedTopics.forEach((topic, topicIdx) => {
      const items: CurriculumItem[] = [];
      const lessons = MOCK_LESSONS.filter((l) => l.topicId === topic.id).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const quizzes = MOCK_QUIZZES.filter((q) => q.topicId === topic.id).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const assignments = MOCK_ASSIGNMENTS.filter(
        (a) => a.topicId === topic.id,
      ).sort((a, b) => a.sortOrder - b.sortOrder);

      lessons.forEach((l, idx) => {
        // Locked = any lesson in a later topic OR lessons past the 2nd in the
        // first topic. (Mock drip rule.)
        const locked =
          topicIdx > 1 ||
          (topicIdx === 1 && idx > 1) ||
          (topicIdx === 2 && idx > 0);
        const item: CurriculumItem = {
          kind: "lesson",
          id: l.id,
          topicId: topic.id,
          title: l.title,
          locked,
          lockedReason: locked
            ? topicIdx > 1
              ? "Unlocks after Module 2 quiz"
              : "Unlocks tomorrow"
            : undefined,
        };
        items.push(item);
        flatItems.push(item);
      });
      quizzes.forEach((q) => {
        const locked = topicIdx > 1;
        const item: CurriculumItem = {
          kind: "quiz",
          id: q.id,
          topicId: topic.id,
          title: q.title,
          locked,
          lockedReason: locked ? "Unlocks after Module 2" : undefined,
        };
        items.push(item);
        flatItems.push(item);
      });
      assignments.forEach((a) => {
        const item: CurriculumItem = {
          kind: "assignment",
          id: a.id,
          topicId: topic.id,
          title: a.title,
          locked: false,
        };
        items.push(item);
        flatItems.push(item);
      });

      tree.push({ topic, items });
    });
    return { curriculum: tree, flat: flatItems };
  }, []);

  // Resolve the active item's data + prev/next siblings.
  const activeFlatIdx = flat.findIndex(
    (i) => i.kind === activeItem.kind && i.id === activeItem.id,
  );
  const activeFlatItem = flat[activeFlatIdx] ?? flat[0];
  const prevItem = activeFlatIdx > 0 ? flat[activeFlatIdx - 1] : undefined;
  const nextItem =
    activeFlatIdx >= 0 && activeFlatIdx < flat.length - 1
      ? flat[activeFlatIdx + 1]
      : undefined;

  const goTo = (item: CurriculumItem | undefined) => {
    if (!item || item.locked) return;
    setActiveItem({ kind: item.kind, id: item.id });
  };

  // Local progress state so "Mark as Complete" reflects immediately.
  const [progressOverride, setProgressOverride] =
    useState<Record<string, LessonProgress>>(MOCK_PROGRESS);

  const handleLessonProgress = (
    lessonId: string,
    input: LessonProgressInput,
  ) => {
    const existing = progressOverride[lessonId];
    const next: LessonProgress = {
      id: existing?.id ?? `p-${lessonId}`,
      tenantId: "tenant-1",
      courseId,
      lessonId,
      studentId: "student-1",
      enrollmentId: MOCK_ENROLLMENT.id,
      positionSeconds: input.positionSeconds ?? existing?.positionSeconds,
      durationSeconds: input.durationSeconds ?? existing?.durationSeconds,
      isComplete: input.isComplete ?? existing?.isComplete ?? false,
      completionPct: input.completionPct ?? existing?.completionPct ?? 0,
      lastWatchedAt: iso(new Date()),
      completedAt:
        input.isComplete ?? existing?.isComplete
          ? iso(new Date())
          : existing?.completedAt,
      createdAt: existing?.createdAt ?? iso(new Date()),
      updatedAt: iso(new Date()),
    };
    setProgressOverride((p) => ({ ...p, [lessonId]: next }));
    // Fire-and-forget — the API call updates the backend; the optimistic state
    // above is what the UI reads. Errors are swallowed so the UX stays smooth.
    void lmsApi.lesson.updateProgress(lessonId, input).catch(() => undefined);
  };

  // Resolve the active lesson object for the main content.
  const activeLesson =
    activeItem.kind === "lesson"
      ? MOCK_LESSONS.find((l) => l.id === activeItem.id)
      : undefined;
  const activeQuiz =
    activeItem.kind === "quiz"
      ? MOCK_QUIZZES.find((q) => q.id === activeItem.id)
      : undefined;
  const activeAssignment =
    activeItem.kind === "assignment"
      ? MOCK_ASSIGNMENTS.find((a) => a.id === activeItem.id)
      : undefined;

  const completedLessons = MOCK_LESSONS.filter(
    (l) => progressOverride[l.id]?.isComplete,
  ).length;
  const totalLessons = MOCK_LESSONS.length;
  const overallPct = Math.round((completedLessons / totalLessons) * 100);

  // ----------------------------------------------------------------------

  return (
    <Page title="Learning Area">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="shrink-0"
              aria-label="Back to catalog"
            >
              <ArrowLeftIcon className="size-5 stroke-2" />
            </Button>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-white">
              <AcademicCapIcon className="size-5 stroke-2" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                {MOCK_COURSE.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {completedLessons}/{totalLessons} lessons · {overallPct}% complete
              </p>
            </div>
          </div>
          <div className="hidden w-64 shrink-0 sm:block">
            <ProgressBar
              value={overallPct}
              color={overallPct >= 100 ? "success" : "primary"}
              size="sm"
              showValue
            />
          </div>
        </header>

        {/* 3-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Left: curriculum tree */}
          <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <div className="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-dark-600">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Curriculum
              </h2>
            </div>
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="space-y-3 p-3">
                {curriculum.map(({ topic, items }) => {
                  const topicCompleted = items.filter(
                    (i) =>
                      i.kind === "lesson" &&
                      progressOverride[i.id]?.isComplete,
                  ).length;
                  const topicLessons = items.filter(
                    (i) => i.kind === "lesson",
                  ).length;
                  return (
                    <div key={topic.id}>
                      <div className="flex items-center justify-between gap-2 px-1.5 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-100">
                            {topic.title}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-dark-300">
                            {topicCompleted}/{topicLessons} lessons
                          </p>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item, idx) => (
                          <CurriculumRow
                            key={`${item.kind}-${item.id}`}
                            item={item}
                            index={idx + 1}
                            progress={
                              item.kind === "lesson"
                                ? progressOverride[item.id]
                                : undefined
                            }
                            active={
                              activeFlatItem?.kind === item.kind &&
                              activeFlatItem?.id === item.id
                            }
                            onClick={() => goTo(item)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollShadow>
          </aside>

          {/* Main content */}
          <main className="flex min-w-0 flex-1 flex-col bg-gray-50 dark:bg-dark-900">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-4xl px-6 py-6">
                {activeLesson && activeLesson.lessonType === "video" && (
                  <VideoLesson
                    lesson={activeLesson}
                    progress={progressOverride[activeLesson.id]}
                    onPrev={() => goTo(prevItem)}
                    onNext={() => goTo(nextItem)}
                    onProgress={(input) =>
                      handleLessonProgress(activeLesson.id, input)
                    }
                  />
                )}
                {activeLesson &&
                  (activeLesson.lessonType === "text" ||
                    activeLesson.lessonType === "document") && (
                    <ReadingLesson
                      lesson={activeLesson}
                      progress={progressOverride[activeLesson.id]}
                      onPrev={() => goTo(prevItem)}
                      onNext={() => goTo(nextItem)}
                      onProgress={(input) =>
                        handleLessonProgress(activeLesson.id, input)
                      }
                    />
                  )}
                {activeQuiz && (
                  <QuizTake
                    quiz={activeQuiz}
                    onPrev={() => goTo(prevItem)}
                    onNext={() => goTo(nextItem)}
                  />
                )}
                {activeAssignment && (
                  <AssignmentSubmit
                    assignment={activeAssignment}
                    onPrev={() => goTo(prevItem)}
                    onNext={() => goTo(nextItem)}
                  />
                )}
              </div>
            </ScrollShadow>
          </main>

          {/* Right: tabbed panels */}
          <aside className="hidden w-80 shrink-0 flex-col border-l border-gray-200 bg-white xl:flex dark:border-dark-600 dark:bg-dark-750">
            <div className="shrink-0 border-b border-gray-200 px-2 dark:border-dark-600">
              <ScrollShadow
                orientation="horizontal"
                className="hide-scrollbar overflow-x-auto"
              >
                <div className="flex gap-0.5 py-1.5">
                  {RIGHT_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === rightTab;
                    return (
                      <Button
                        key={tab.id}
                        variant="flat"
                        color={isActive ? "primary" : "neutral"}
                        onClick={() => setRightTab(tab.id)}
                        className={clsx(
                          "shrink-0 gap-1.5 px-2.5 py-1.5 text-xs font-medium",
                          isActive
                            ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                            : "text-gray-600 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600",
                        )}
                      >
                        <Icon className="size-4 stroke-2" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>
              </ScrollShadow>
            </div>
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="p-4">
                {rightTab === "qa" && <QAPanel courseId={courseId} />}
                {rightTab === "announcements" && (
                  <AnnouncementsPanel courseId={courseId} />
                )}
                {rightTab === "resources" && (
                  <ResourcesPanel courseId={courseId} />
                )}
                {rightTab === "reviews" && <ReviewsPanel courseId={courseId} />}
                {rightTab === "gradebook" && (
                  <GradebookPanel
                    courseId={courseId}
                    lessons={MOCK_LESSONS}
                    quizzes={MOCK_QUIZZES}
                    assignments={MOCK_ASSIGNMENTS}
                    progressMap={progressOverride}
                    enrollment={MOCK_ENROLLMENT}
                  />
                )}
                {rightTab === "certificate" && <CertificateView />}
                {rightTab === "info" && <CourseInfoPanel course={MOCK_COURSE} />}
                {rightTab === "drip" && (
                  <ContentDeliverySettings courseId={courseId} />
                )}
              </div>
            </ScrollShadow>
          </aside>
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** A single row in the curriculum tree. */
function CurriculumRow({
  item,
  index,
  progress,
  active,
  onClick,
}: {
  item: CurriculumItem;
  index: number;
  progress?: LessonProgress;
  active: boolean;
  onClick: () => void;
}) {
  const isComplete = !!progress?.isComplete;
  const inProgress = !isComplete && (progress?.completionPct ?? 0) > 0;
  const locked = item.locked;

  const Icon =
    item.kind === "lesson"
      ? PlayCircleIcon
      : item.kind === "quiz"
        ? ClipboardDocumentCheckIcon
        : InboxArrowDownIcon;

  return (
    <Button
      unstyled
      onClick={locked ? undefined : onClick}
      className={clsx(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
        active
          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
          : "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600",
        locked && "cursor-not-allowed opacity-60 hover:bg-transparent dark:hover:bg-transparent",
      )}
    >
      {/* Leading icon: completion check, type icon, or lock */}
      <div className="shrink-0">
        {locked ? (
          <LockClosedIcon className="size-4 text-gray-400 dark:text-dark-400" />
        ) : isComplete ? (
          <CheckCircleSolidIcon className="size-5 text-success-500 dark:text-success-400" />
        ) : (
          <div
            className={clsx(
              "flex size-5 items-center justify-center",
              active
                ? "text-primary-600 dark:text-primary-400"
                : "text-gray-400 dark:text-dark-400",
            )}
          >
            <Icon className="size-4 stroke-2" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">
          <span className="text-gray-400 dark:text-dark-400">{index}.</span>{" "}
          {item.title}
        </p>
        {inProgress && !locked && (
          <p className="text-[10px] font-medium text-primary-600 dark:text-primary-400">
            {Math.round(progress?.completionPct ?? 0)}% complete
          </p>
        )}
        {locked && item.lockedReason && (
          <p className="truncate text-[10px] text-gray-400 dark:text-dark-400">
            {item.lockedReason}
          </p>
        )}
      </div>
      {active && (
        <ChevronRightIcon className="size-4 shrink-0 text-primary-500 dark:text-primary-400" />
      )}
    </Button>
  );
}

// ----------------------------------------------------------------------
// `lmsApi` is imported at the top of the file (see "Local Imports"). The
// `handleLessonProgress` call site fires `lmsApi.lesson.updateProgress()` and
// ignores rejections — the optimistic state is what the UI reads.
// ----------------------------------------------------------------------
