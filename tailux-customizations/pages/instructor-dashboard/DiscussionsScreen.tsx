// DiscussionsScreen — list of discussion threads from the instructor's courses.
//
// Shows each thread with the course badge, topic, snippet, reply count,
// views, and last activity. The instructor can filter by course and search
// by topic / author. Mock data is used.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  ChatBubbleLeftRightIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  HandRaisedIcon,
  CheckBadgeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Avatar } from "@/components/ui";

// ----------------------------------------------------------------------

interface DiscussionThread {
  id: string;
  courseId: string;
  courseName: string;
  topic: string;
  snippet: string;
  authorName: string;
  replies: number;
  views: number;
  isPinned?: boolean;
  isResolved?: boolean;
  lastActivityAt: string; // ISO
}

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const COURSES = [
  { id: "course-001", name: "Full-Stack React & TypeScript" },
  { id: "course-002", name: "Advanced React Performance" },
  { id: "course-004", name: "Building Design Systems with Tailwind v4" },
];

const MOCK_THREADS: DiscussionThread[] = [
  {
    id: "th-1",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    topic: "Best way to structure a large React + TS codebase?",
    snippet:
      "I'm splitting features into folders with components/hooks/api subfolders. Is feature-sliced design worth adopting for a mid-size app?",
    authorName: "Marcus Lee",
    replies: 14,
    views: 312,
    isPinned: true,
    lastActivityAt: hoursAgo(2),
  },
  {
    id: "th-2",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    topic: "react-hook-form vs Formik in 2025",
    snippet:
      "Both look great. Which has better TS ergonomics and bundle size for a new project? Leaning toward react-hook-form.",
    authorName: "Priya Patel",
    replies: 8,
    views: 156,
    lastActivityAt: hoursAgo(9),
  },
  {
    id: "th-3",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    topic: "useMemo vs useCallback — when does it actually matter?",
    snippet:
      "I keep wrapping callbacks in useCallback and selectors in useMemo but the profiler doesn't show a difference. Am I doing it wrong?",
    authorName: "Diego Rivera",
    replies: 22,
    views: 540,
    isResolved: true,
    lastActivityAt: daysAgo(1),
  },
  {
    id: "th-4",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    topic: "Stuck on the profiling exercise in lesson 203",
    snippet:
      "My flame graph looks completely different from the example. Anyone else hit this? Sharing my trace below.",
    authorName: "Sara Kim",
    replies: 5,
    views: 78,
    lastActivityAt: daysAgo(2),
  },
  {
    id: "th-5",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    topic: "Tailwind v4 @theme directive — best practices?",
    snippet:
      "Trying to organize tokens into a single theme file vs per-component. What's the convention most teams settle on?",
    authorName: "Jamie Chen",
    replies: 11,
    views: 234,
    isResolved: true,
    lastActivityAt: daysAgo(3),
  },
  {
    id: "th-6",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    topic: "Dark mode tokens — HSL or OKLCH?",
    snippet:
      "Lesson 12 hinted at OKLCH but I want to hear from others. Does it really matter for design system work?",
    authorName: "Alex Morgan",
    replies: 7,
    views: 142,
    lastActivityAt: daysAgo(4),
  },
];

// ----------------------------------------------------------------------

function relativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diff = now.getTime() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

// ----------------------------------------------------------------------

export function DiscussionsScreen() {
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_THREADS.filter((t) => {
      if (courseFilter !== "all" && t.courseId !== courseFilter) return false;
      if (!q) return true;
      return (
        t.topic.toLowerCase().includes(q) ||
        t.snippet.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (
        new Date(b.lastActivityAt).getTime() -
        new Date(a.lastActivityAt).getTime()
      );
    });
  }, [query, courseFilter]);

  const totalReplies = MOCK_THREADS.reduce((s, t) => s + t.replies, 0);
  const totalViews = MOCK_THREADS.reduce((s, t) => s + t.views, 0);
  const resolvedCount = MOCK_THREADS.filter((t) => t.isResolved).length;

  // Demo: unread state toggling doesn't change data but flips a visual cue
  void unreadOnly;
  void setUnreadOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Discussions
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Monitor and engage in student discussions across your courses.
          </p>
        </div>
        <Button color="primary" className="gap-1.5">
          <PlusIcon className="size-4 stroke-2" />
          New thread
        </Button>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Threads</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {MOCK_THREADS.length}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Total replies</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {totalReplies}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Resolved</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {resolvedCount} / {MOCK_THREADS.length}
          </p>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search discussions…"
            prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
            classNames={{ wrapper: "mt-0" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant={courseFilter === "all" ? "soft" : "flat"}
            color={courseFilter === "all" ? "primary" : "neutral"}
            onClick={() => setCourseFilter("all")}
            className="text-xs"
          >
            All courses
          </Button>
          {COURSES.map((c) => (
            <Button
              key={c.id}
              variant={courseFilter === c.id ? "soft" : "flat"}
              color={courseFilter === c.id ? "primary" : "neutral"}
              onClick={() => setCourseFilter(c.id)}
              className="max-w-[14rem] truncate text-xs"
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Thread list */}
      {visible.length === 0 ? (
        <EmptyState
          icon={ChatBubbleLeftRightIcon}
          title="No discussions found"
          description={
            query
              ? "Try a different keyword or clear the search."
              : "Be the first to start a discussion in this course."
          }
          actionLabel="Start a thread"
        />
      ) : (
        <div className="space-y-3">
          {visible.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              totalViews={totalViews}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function ThreadRow({
  thread,
  totalViews,
}: {
  thread: DiscussionThread;
  totalViews: number;
}) {
  void totalViews;
  return (
    <Card
      skin="bordered"
      className="cursor-pointer p-4 transition-shadow hover:shadow-soft"
    >
      <div className="flex items-start gap-3.5">
        <Avatar
          name={thread.authorName}
          size={10}
          initialColor="auto"
          classNames={{ root: "mt-0.5" }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="primary" variant="soft" className="text-[10px]">
              {thread.courseName}
            </Badge>
            {thread.isPinned && (
              <Badge color="warning" variant="soft" className="gap-1 text-[10px]">
                <HandRaisedIcon className="size-3" />
                Pinned
              </Badge>
            )}
            {thread.isResolved && (
              <Badge color="success" variant="soft" className="gap-1 text-[10px]">
                <CheckBadgeIcon className="size-3" />
                Resolved
              </Badge>
            )}
          </div>

          <h3 className="mt-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
            {thread.topic}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-dark-200">
            {thread.snippet}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-dark-300">
            <span className="font-medium text-gray-700 dark:text-dark-200">
              {thread.authorName}
            </span>
            <span className="inline-flex items-center gap-1">
              <ChatBubbleLeftIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
              {thread.replies} {thread.replies === 1 ? "reply" : "replies"}
            </span>
            <span className="inline-flex items-center gap-1">
              <EyeIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
              {thread.views} views
            </span>
            <span className="text-gray-400 dark:text-dark-400">
              last activity {relativeTime(thread.lastActivityAt)}
            </span>
          </div>
        </div>

        {/* Reply count chip */}
        <div className="hidden shrink-0 flex-col items-center sm:flex">
          <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
            {thread.replies}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
            replies
          </span>
        </div>

        <ChevronStub />
      </div>
    </Card>
  );
}

/** Decorative trailing chevron so the row reads as clickable. */
function ChevronStub() {
  return (
    <span
      className={clsx(
        "mt-1 hidden size-6 shrink-0 items-center justify-center rounded-md text-gray-400 sm:flex dark:text-dark-400",
      )}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" fill="none" className="size-4">
        <path
          d="M7 5l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default DiscussionsScreen;
