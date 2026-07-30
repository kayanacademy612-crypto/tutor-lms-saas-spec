// CourseDetailPage — full detail screen for a single course.
//
// Layout (single column, scrollable):
//   1. Hero        — thumbnail, title, instructor, rating, price, enroll CTA
//   2. Description — long-form course description + "what you'll learn" grid
//   3. Curriculum  — topics → lessons preview list (locked/unlocked)
//   4. Instructor  — bio card with avatar, stats, and social links
//   5. Reviews     — summary + a list of student reviews
//   6. Related     — grid of related courses (reuses `CourseGrid`)
//
// Mock data lives in this file so the page is always usable in dev.

// Import Dependencies
import { useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  PlayCircleIcon,
  UsersIcon,
  ClockIcon,
  LanguageIcon,
  AcademicCapIcon,
  CheckIcon,
  ArrowLeftIcon,
  LockClosedIcon,
  ChevronDownIcon,
  SparklesIcon,
  ShieldCheckIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
} from "@/components/ui";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Avatar } from "@/components/ui";
import {
  CourseGrid,
  CourseThumbnail,
  DifficultyBadge,
  InstructorAvatar,
  PriceTag,
  RatingStars,
  formatPrice,
} from "@/components/lms";
import type { Course, CourseDifficulty, Lesson, Topic } from "@/types/lms";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return iso(d);
};

const MOCK_COURSE: Course = {
  id: "course-react-fundamentals",
  tenantId: "tenant-1",
  instructorId: "instr-1",
  title: "React 19 Fundamentals: Hooks, Suspense, and Server Components",
  slug: "react-19-fundamentals",
  description:
    "Master modern React from the ground up. This course walks you through React 19's mental model, the hooks API, the new use() hook, Suspense for data fetching, and Server Components. You'll build a real production-grade app — with routing, forms, optimistic updates, and edge deploys — and finish with the confidence to ship.",
  excerpt: "Hooks, Suspense, Server Components, and the new use() hook.",
  featuredImage: "",
  previewVideo: "",
  status: "published",
  priceType: "paid",
  priceCents: 8900,
  compareAtCents: 12900,
  currency: "usd",
  difficulty: "beginner",
  categoryId: "cat-development",
  isFeatured: true,
  isPublic: true,
  enrolledCount: 12450,
  ratingAvg: 4.8,
  ratingCount: 1240,
  durationSeconds: 86400,
  language: "English",
  publishedAt: daysAgo(120),
  createdAt: daysAgo(150),
  updatedAt: daysAgo(5),
};

const MOCK_INSTRUCTOR = {
  id: "instr-1",
  name: "Sarah Chen",
  email: "sarah.chen@hellotutorlms.com",
  avatarUrl: "",
  bio: "Senior Staff Engineer at a YC-backed startup. Sarah has taught React to over 50,000 developers and is a maintainer on a popular open-source UI library. She wrote her first React app in 2014 and has been hooked ever since.",
  stats: {
    students: 52300,
    courses: 12,
    rating: 4.8,
  },
  social: {
    twitter: "https://twitter.com/example",
    github: "https://github.com/example",
    website: "https://example.com",
  },
};

const MOCK_TOPICS: Topic[] = [
  {
    id: "topic-1",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    title: "Getting Started with React 19",
    summary: "Install, configure, and understand the new mental model.",
    sortOrder: 0,
    lessonCount: 3,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(140),
  },
  {
    id: "topic-2",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    title: "Hooks Deep Dive",
    summary: "useState, useEffect, useMemo, and the new use() hook.",
    sortOrder: 1,
    lessonCount: 4,
    createdAt: daysAgo(135),
    updatedAt: daysAgo(120),
  },
  {
    id: "topic-3",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    title: "Suspense & Server Components",
    summary: "Async UI, streaming, and the server component model.",
    sortOrder: 2,
    lessonCount: 3,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(60),
  },
];

const MOCK_LESSONS: Lesson[] = [
  {
    id: "l-1-1",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "Welcome & Course Roadmap",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 312,
    content: "<p>A quick welcome and a look at the roadmap.</p>",
    isPreview: true,
    isRequired: true,
    sortOrder: 0,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(140),
  },
  {
    id: "l-1-2",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "Installing Vite + React 19",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 540,
    content: "<p>Set up a modern Vite project in under five minutes.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 1,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(140),
  },
  {
    id: "l-1-3",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-1",
    instructorId: "instr-1",
    title: "The React Mental Model",
    lessonType: "text",
    content: "<p>Components are pure functions of props + state.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 2,
    createdAt: daysAgo(140),
    updatedAt: daysAgo(140),
  },
  {
    id: "l-2-1",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "useState & Derived State",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 720,
    content: "<p>State, derived state, and avoiding useEffect misuse.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 0,
    createdAt: daysAgo(135),
    updatedAt: daysAgo(120),
  },
  {
    id: "l-2-2",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "useEffect: Sync, Not Lifecycle",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 845,
    content: "<p>Why useEffect is for syncing, not for lifecycle events.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 1,
    createdAt: daysAgo(135),
    updatedAt: daysAgo(120),
  },
  {
    id: "l-2-3",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "useMemo & useCallback — When & Why",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 612,
    content: "<p>Don't memoize everything. Memoize the right things.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 2,
    createdAt: daysAgo(135),
    updatedAt: daysAgo(120),
  },
  {
    id: "l-2-4",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-2",
    instructorId: "instr-1",
    title: "The New use() Hook",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 690,
    content: "<p>unwrap promises and contexts in any function.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 3,
    createdAt: daysAgo(135),
    updatedAt: daysAgo(120),
  },
  {
    id: "l-3-1",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-3",
    instructorId: "instr-1",
    title: "Suspense for Data Fetching",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 880,
    content: "<p>Declarative loading states with Suspense.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 0,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(60),
  },
  {
    id: "l-3-2",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-3",
    instructorId: "instr-1",
    title: "Server Components: The Mental Model",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 760,
    content: "<p>What runs on the server, what runs on the client.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 1,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(60),
  },
  {
    id: "l-3-3",
    tenantId: "tenant-1",
    courseId: MOCK_COURSE.id,
    topicId: "topic-3",
    instructorId: "instr-1",
    title: "Streaming SSR & Edge Deploys",
    lessonType: "video",
    videoSource: "external",
    videoDuration: 920,
    content: "<p>Ship fast first paints with streaming SSR.</p>",
    isPreview: false,
    isRequired: true,
    sortOrder: 2,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(60),
  },
];

const MOCK_REVIEWS = [
  {
    id: "rev-1",
    studentName: "Alex Rivera",
    avatarUrl: "",
    rating: 5,
    title: "Exactly what I needed",
    body: "I'd been using React for years but never really understood the mental model. Sarah's explanations are crystal clear, and the Server Components chapter finally clicked for me.",
    createdAt: daysAgo(15),
  },
  {
    id: "rev-2",
    studentName: "Priya Sharma",
    avatarUrl: "",
    rating: 5,
    title: "The use() hook chapter alone is worth it",
    body: "The way the new use() hook is explained — with the right amount of 'when NOT to use it' — is the best I've seen anywhere.",
    createdAt: daysAgo(28),
  },
  {
    id: "rev-3",
    studentName: "Marcus Lee",
    avatarUrl: "",
    rating: 4,
    title: "Great course, would love more on testing",
    body: "Loved the depth on hooks and Suspense. Would appreciate a follow-up chapter on testing server components — but otherwise excellent.",
    createdAt: daysAgo(42),
  },
];

const MOCK_RELATED: Course[] = [
  {
    id: "course-ts-mastery",
    tenantId: "tenant-1",
    instructorId: "instr-2",
    title: "TypeScript Mastery: From Generics to Advanced Types",
    slug: "typescript-mastery",
    description: "Conditional types, mapped types, and type-safe APIs.",
    status: "published",
    priceType: "paid",
    priceCents: 9900,
    currency: "usd",
    difficulty: "advanced",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 5230,
    ratingAvg: 4.7,
    ratingCount: 612,
    createdAt: daysAgo(110),
    updatedAt: daysAgo(2),
  },
  {
    id: "course-tailwind-pro",
    tenantId: "tenant-1",
    instructorId: "instr-2",
    title: "Tailwind CSS v4 Pro: Build Beautiful UIs Fast",
    slug: "tailwind-css-pro",
    description: "The new v4 engine + patterns for production UIs.",
    status: "published",
    priceType: "paid",
    priceCents: 6900,
    currency: "usd",
    difficulty: "intermediate",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 3400,
    ratingAvg: 4.9,
    ratingCount: 290,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(7),
  },
  {
    id: "course-vite-deploy",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Ship It: Vite, CI/CD & Edge Deploys for React Apps",
    slug: "vite-cicd-deploy",
    description: "From pnpm dev to a global edge deploy.",
    status: "published",
    priceType: "free",
    priceCents: 0,
    currency: "usd",
    difficulty: "advanced",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 1900,
    ratingAvg: 4.6,
    ratingCount: 142,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
];

const LEARNING_POINTS = [
  "Build a complete React 19 app from scratch — including routing and forms",
  "Understand the React mental model: components as pure functions of state",
  "Master every hook — useState, useEffect, useMemo, useCallback, and use()",
  "Use Suspense for data fetching and streaming server rendering",
  "Reason about Server vs. Client Components and ship less JavaScript",
  "Deploy to the edge with confidence — preview branches and CI included",
];

// ----------------------------------------------------------------------

/** Formats a duration in seconds as `Xh Ym` (or `Ym`). */
function formatDurationLong(seconds?: number): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Formats an ISO date as "MMM D, YYYY". */
function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

// ----------------------------------------------------------------------

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const [enrolled, setEnrolled] = useState(false);

  const course = MOCK_COURSE;
  const difficulty = (course.difficulty ?? "beginner") as CourseDifficulty;

  const handleEnroll = () => {
    if (course.priceType === "free" || course.priceCents === 0) {
      // Free → straight to learning area.
      setEnrolled(true);
      navigate("/apps/learning-area");
    } else {
      // Paid → checkout.
      navigate("/apps/checkout");
    }
  };

  return (
    <Page title={course.title}>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* ─────────────────────────── Hero ─────────────────────────── */}
        <section className="border-b border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
          <div className="mx-auto max-w-7xl px-5 py-6">
            {/* Breadcrumb */}
            <Button
              variant="flat"
              color="neutral"
              onClick={() => navigate("/apps/catalog")}
              className="mb-4 gap-1.5 px-2 py-1 text-xs"
            >
              <ArrowLeftIcon className="size-3.5" />
              Back to Catalog
            </Button>

            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              {/* Left: preview */}
              <div className="min-w-0">
                <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-dark-600">
                  <CourseThumbnail
                    url={course.featuredImage}
                    title={course.title}
                    size="full"
                    rounded="rounded-none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Button
                      unstyled
                      className="group flex size-16 items-center justify-center rounded-full bg-white/95 text-primary-600 shadow-lg transition-transform hover:scale-105"
                      aria-label="Play preview"
                    >
                      <PlayCircleIcon className="size-9 stroke-2" />
                    </Button>
                  </div>
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
                    <EyeIcon className="size-3.5" />
                    Preview
                  </span>
                </div>
              </div>

              {/* Right: meta + CTA */}
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  {course.isFeatured && (
                    <Badge color="warning" variant="soft" className="gap-1">
                      <SparklesIcon className="size-3" />
                      Featured
                    </Badge>
                  )}
                  <DifficultyBadge level={difficulty} soft />
                  <Badge color="success" variant="soft">
                    Bestseller
                  </Badge>
                </div>

                <h1 className="mt-3 text-2xl font-bold leading-tight text-gray-900 dark:text-dark-50">
                  {course.title}
                </h1>
                <p className="mt-2 text-sm text-gray-600 dark:text-dark-200">
                  {course.excerpt}
                </p>

                {/* Rating + students */}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-500 dark:text-amber-400">
                      {course.ratingAvg.toFixed(1)}
                    </span>
                    <RatingStars value={course.ratingAvg} size="size-4" />
                    <span className="text-gray-500 dark:text-dark-300">
                      ({course.ratingCount.toLocaleString()} reviews)
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-dark-300">
                    <UsersIcon className="size-4" />
                    {course.enrolledCount.toLocaleString()} students
                  </span>
                </div>

                {/* Instructor */}
                <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4 dark:border-dark-600">
                  <InstructorAvatar
                    name={MOCK_INSTRUCTOR.name}
                    avatarUrl={MOCK_INSTRUCTOR.avatarUrl}
                    size={10}
                  />
                  <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-dark-300">
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {formatDurationLong(course.durationSeconds)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <LanguageIcon className="size-3.5" />
                      {course.language ?? "English"}
                    </span>
                  </div>
                </div>

                {/* Price + CTA */}
                <Card className="mt-5 p-4" skin="bordered">
                  <div className="flex items-end justify-between gap-3">
                    <PriceTag
                      price={course.priceCents}
                      currency={course.currency}
                      model={course.priceType === "free" ? "free" : "paid"}
                      compareAt={course.compareAtCents}
                      size="lg"
                    />
                    {course.compareAtCents && course.compareAtCents > course.priceCents && (
                      <Badge color="error" variant="soft" className="mb-1">
                        Save{" "}
                        {formatPrice(
                          course.compareAtCents - course.priceCents,
                          course.currency,
                        )}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      color="primary"
                      variant="filled"
                      className="w-full gap-2 py-2.5"
                      onClick={handleEnroll}
                    >
                      {enrolled ? (
                        <>
                          <PlayCircleIcon className="size-5" />
                          Continue Learning
                        </>
                      ) : course.priceType === "free" || course.priceCents === 0 ? (
                        <>
                          <AcademicCapIcon className="size-5" />
                          Enroll for Free
                        </>
                      ) : (
                        <>
                          <AcademicCapIcon className="size-5" />
                          Enroll Now
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      className="w-full gap-2 py-2.5"
                    >
                      <PlayCircleIcon className="size-5" />
                      Watch Preview
                    </Button>
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-4 text-[11px] text-gray-400 dark:text-dark-400">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheckIcon className="size-3.5" />
                      30-day refund
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CheckIcon className="size-3.5" />
                      Lifetime access
                    </span>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────── Description + What you'll learn ───────── */}
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-6">
              <Card skin="bordered" className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                  About this course
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                  {course.description}
                </p>
              </Card>

              <Card skin="bordered" className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                  What you'll learn
                </h2>
                <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {LEARNING_POINTS.map((pt) => (
                    <li
                      key={pt}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-dark-100"
                    >
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-success-500 dark:text-success-400" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Curriculum */}
              <Card skin="bordered" className="overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-dark-600">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                    Curriculum
                  </h2>
                  <span className="text-xs text-gray-500 dark:text-dark-300">
                    {MOCK_TOPICS.length} topics · {MOCK_LESSONS.length} lessons
                  </span>
                </div>

                <Accordion
                  defaultValue={MOCK_TOPICS[0]?.id}
                  className="divide-y divide-gray-200 dark:divide-dark-600"
                >
                  {MOCK_TOPICS.map((topic, ti) => {
                    const lessons = MOCK_LESSONS.filter(
                      (l) => l.topicId === topic.id,
                    ).sort((a, b) => a.sortOrder - b.sortOrder);
                    return (
                      <AccordionItem key={topic.id} value={topic.id}>
                        <AccordionButton className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-dark-700">
                          {({ open }: { open: boolean }) => (
                            <>
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-xs font-semibold text-primary-600 dark:text-primary-400">
                                {ti + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-100">
                                  {topic.title}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-300">
                                  {lessons.length} lessons
                                  {topic.summary ? ` · ${topic.summary}` : ""}
                                </p>
                              </div>
                              <ChevronDownIcon
                                className={clsx(
                                  "size-5 shrink-0 text-gray-400 transition-transform",
                                  open && "rotate-180",
                                )}
                              />
                            </>
                          )}
                        </AccordionButton>
                        <AccordionPanel className="px-6 pb-3">
                          <ul className="space-y-1">
                            {lessons.map((lesson, li) => (
                              <LessonRow
                                key={lesson.id}
                                lesson={lesson}
                                index={li + 1}
                              />
                            ))}
                          </ul>
                        </AccordionPanel>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </Card>
            </div>

            {/* Right rail: quick facts */}
            <aside className="space-y-6">
              <Card skin="bordered" className="p-5">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                  Course info
                </h3>
                <dl className="mt-3 space-y-3 text-sm">
                  <InfoRow label="Duration">
                    {formatDurationLong(course.durationSeconds)}
                  </InfoRow>
                  <InfoRow label="Lessons">{MOCK_LESSONS.length}</InfoRow>
                  <InfoRow label="Level">
                    <DifficultyBadge level={difficulty} soft />
                  </InfoRow>
                  <InfoRow label="Language">
                    {course.language ?? "English"}
                  </InfoRow>
                  <InfoRow label="Published">
                    {course.publishedAt ? formatDate(course.publishedAt) : "—"}
                  </InfoRow>
                  <InfoRow label="Certificate">
                    <Badge color="success" variant="soft" className="gap-1">
                      <CheckIcon className="size-3" />
                      Included
                    </Badge>
                  </InfoRow>
                </dl>
              </Card>
            </aside>
          </div>
        </section>

        {/* ───────────────────────── Instructor ───────────────────────── */}
        <section className="border-t border-gray-200 bg-white px-5 py-8 dark:border-dark-600 dark:bg-dark-750">
          <div className="mx-auto max-w-7xl">
            <Card skin="bordered" className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                Your instructor
              </h2>
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center text-center">
                  <Avatar
                    name={MOCK_INSTRUCTOR.name}
                    src={MOCK_INSTRUCTOR.avatarUrl}
                    size={20}
                    initialColor="auto"
                    className="rounded-full"
                  />
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <InstructorStat
                      label="Students"
                      value={MOCK_INSTRUCTOR.stats.students.toLocaleString()}
                    />
                    <InstructorStat
                      label="Courses"
                      value={String(MOCK_INSTRUCTOR.stats.courses)}
                    />
                    <InstructorStat
                      label="Rating"
                      value={MOCK_INSTRUCTOR.stats.rating.toFixed(1)}
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
                    {MOCK_INSTRUCTOR.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1">
                    <RatingStars
                      value={MOCK_INSTRUCTOR.stats.rating}
                      size="size-3.5"
                    />
                    <span className="text-xs text-gray-500 dark:text-dark-300">
                      Instructor rating
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                    {MOCK_INSTRUCTOR.bio}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ─────────────────────────── Reviews ───────────────────────── */}
        <section className="mx-auto max-w-7xl px-5 py-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            Student reviews
          </h2>

          <div className="mt-4 grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Rating summary */}
            <Card skin="bordered" className="flex flex-col items-center p-6 text-center">
              <p className="text-5xl font-bold text-amber-500 dark:text-amber-400">
                {course.ratingAvg.toFixed(1)}
              </p>
              <RatingStars
                value={course.ratingAvg}
                size="size-5"
                className="mt-2"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
                Based on {course.ratingCount.toLocaleString()} reviews
              </p>

              <div className="mt-5 w-full space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const pct =
                    star === 5 ? 68 : star === 4 ? 22 : star === 3 ? 6 : star === 2 ? 3 : 1;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="flex w-8 items-center gap-0.5 text-gray-600 dark:text-dark-200">
                        {star}
                        <StarSolidIcon className="size-3 text-amber-400" />
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-150 dark:bg-dark-600">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-gray-500 dark:text-dark-300">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Review list */}
            <div className="space-y-4">
              {MOCK_REVIEWS.map((review) => (
                <Card key={review.id} skin="bordered" className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={review.studentName}
                      src={review.avatarUrl}
                      size={10}
                      initialColor="auto"
                      className="rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                          {review.studentName}
                        </p>
                        <span className="shrink-0 text-xs text-gray-400 dark:text-dark-400">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <RatingStars value={review.rating} size="size-3.5" />
                      </div>
                      {review.title && (
                        <p className="mt-2 text-sm font-medium text-gray-800 dark:text-dark-100">
                          {review.title}
                        </p>
                      )}
                      <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                        {review.body}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────── Related courses ───────────────────── */}
        <section className="border-t border-gray-200 bg-white px-5 py-8 dark:border-dark-600 dark:bg-dark-750">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                Related courses
              </h2>
              <Button
                variant="flat"
                color="primary"
                className="gap-1.5 text-sm"
                onClick={() => navigate("/apps/catalog")}
              >
                View all
                <ArrowLeftIcon className="size-4 rotate-180" />
              </Button>
            </div>
            <CourseGrid
              courses={MOCK_RELATED}
              onCourseClick={() => navigate("/apps/course-detail")}
              columns={3}
            />
          </div>
        </section>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** Single lesson row in the curriculum accordion. */
function LessonRow({
  lesson,
  index,
}: {
  lesson: Lesson;
  index: number;
}) {
  const locked = !lesson.isPreview;
  return (
    <li>
      <Button
        unstyled
        component="div"
        className={clsx(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
          !locked && "cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700",
          locked && "opacity-70",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center text-xs text-gray-400 dark:text-dark-400">
          {index}.
        </span>
        {locked ? (
          <LockClosedIcon className="size-4 shrink-0 text-gray-400 dark:text-dark-400" />
        ) : (
          <PlayCircleIcon className="size-4 shrink-0 text-primary-500 dark:text-primary-400" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-dark-100">
          {lesson.title}
        </span>
        {lesson.isPreview && (
          <Badge color="primary" variant="soft" className="text-[10px]">
            Preview
          </Badge>
        )}
        {lesson.videoDuration && lesson.videoDuration > 0 && (
          <span className="shrink-0 text-xs text-gray-400 dark:text-dark-400">
            {Math.round(lesson.videoDuration / 60)}m
          </span>
        )}
      </Button>
    </li>
  );
}

/** Label + value row used in the "Course info" card. */
function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-300">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-gray-800 dark:text-dark-100">
        {children}
      </dd>
    </div>
  );
}

/** Small stat block used in the instructor card. */
function InstructorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 px-2 py-1.5 dark:bg-dark-600">
      <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-dark-300">
        {label}
      </p>
    </div>
  );
}

export { CourseDetailPage };
