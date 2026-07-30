// AnnouncementsScreen — list of announcements per course + composer.
//
// Shows existing announcements grouped by course with the recipient count,
// publish date, and a snippet. A "New announcement" composer lets the
// instructor pick a course, write a message, and preview the recipient count
// before posting (mock — prepends to the local list).

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  MegaphoneIcon,
  PlusIcon,
  UsersIcon,
  CalendarDaysIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Textarea, Select } from "@/components/ui";

// ----------------------------------------------------------------------

interface Announcement {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  body: string;
  recipientCount: number;
  publishedAt: string; // ISO
  readCount: number;
}

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const COURSES = [
  { id: "course-001", name: "Full-Stack React & TypeScript", students: 1240 },
  { id: "course-002", name: "Advanced React Performance", students: 540 },
  { id: "course-004", name: "Building Design Systems with Tailwind v4", students: 880 },
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an-1",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    title: "Live class moved to Friday 4pm",
    body: "Heads up — this week's live Q&A is moving from Wednesday to Friday at 4pm UTC to accommodate a guest speaker. The Zoom link in your calendar will be updated automatically.",
    recipientCount: 1240,
    publishedAt: daysAgo(2),
    readCount: 980,
  },
  {
    id: "an-2",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    title: "Module 4 project feedback posted",
    body: "I've finished grading the Module 4 projects. Common feedback: remember to memoize derived state with useMemo only when the computation is expensive. Check your submission for individual notes.",
    recipientCount: 1240,
    publishedAt: daysAgo(5),
    readCount: 1120,
  },
  {
    id: "an-3",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    title: "New bonus lesson on React Compiler",
    body: "I just published a bonus lesson covering the experimental React Compiler. It's optional but I think you'll find it interesting — especially the section on automatic memoization.",
    recipientCount: 540,
    publishedAt: hoursAgo(8),
    readCount: 312,
  },
  {
    id: "an-4",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    title: "Tailwind v4.1 update — what changed",
    body: "Tailwind v4.1 shipped yesterday with a few breaking changes to the @theme directive. I've updated Lesson 12 to reflect the new syntax; please re-pull the starter repo.",
    recipientCount: 880,
    publishedAt: daysAgo(1),
    readCount: 640,
  },
];

// ----------------------------------------------------------------------

function timeAgo(isoDate: string): string {
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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ----------------------------------------------------------------------

export function AnnouncementsScreen() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(INITIAL_ANNOUNCEMENTS);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [composing, setComposing] = useState(false);
  const [draftCourseId, setDraftCourseId] = useState<string>(COURSES[0].id);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const visible = useMemo(() => {
    return announcements
      .filter((a) => courseFilter === "all" || a.courseId === courseFilter)
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );
  }, [announcements, courseFilter]);

  const totalRecipients = announcements.reduce((s, a) => s + a.recipientCount, 0);
  const avgReadRate =
    announcements.length > 0
      ? Math.round(
          (announcements.reduce((s, a) => s + a.readCount / a.recipientCount, 0) /
            announcements.length) *
            100,
        )
      : 0;

  const draftCourse = COURSES.find((c) => c.id === draftCourseId);

  function publishAnnouncement() {
    if (!draftTitle.trim() || !draftBody.trim() || !draftCourse) return;
    const newAnn: Announcement = {
      id: `an-${Math.random().toString(36).slice(2, 8)}`,
      courseId: draftCourse.id,
      courseName: draftCourse.name,
      title: draftTitle.trim(),
      body: draftBody.trim(),
      recipientCount: draftCourse.students,
      publishedAt: new Date().toISOString(),
      readCount: 0,
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    setDraftTitle("");
    setDraftBody("");
    setComposing(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Announcements
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Keep your students in the loop with per-course announcements.
          </p>
        </div>
        <Button color="primary" className="gap-1.5" onClick={() => setComposing(true)}>
          <PlusIcon className="size-4 stroke-2" />
          New announcement
        </Button>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Announcements</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {announcements.length}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Total recipients</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {totalRecipients.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Avg read rate</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {avgReadRate}%
          </p>
        </Card>
      </div>

      {/* Inline composer */}
      {composing && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              New announcement
            </h2>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              onClick={() => setComposing(false)}
              aria-label="Cancel announcement"
            >
              <XMarkIcon className="size-5 stroke-2" />
            </Button>
          </div>

          <Select
            label="Course"
            value={draftCourseId}
            onChange={(e) =>
              setDraftCourseId((e.target as HTMLSelectElement).value)
            }
            data={COURSES.map((c) => ({
              value: c.id,
              label: c.name,
            }))}
          />

          <Input
            label="Title"
            placeholder="e.g. Schedule change for next week's live class"
            value={draftTitle}
            onChange={(e) => setDraftTitle((e.target as HTMLInputElement).value)}
            classNames={{ wrapper: "mt-0" }}
          />

          <Textarea
            label="Message"
            rows={5}
            placeholder="Write your announcement. Students will receive this as a notification."
            value={draftBody}
            onChange={(e) => setDraftBody((e.target as HTMLTextAreaElement).value)}
          />

          {/* Recipient preview */}
          <div className="flex items-center gap-2 rounded-lg bg-primary-500/5 p-3 dark:bg-primary-500/10">
            <UsersIcon className="size-4 text-primary-600 dark:text-primary-400" />
            <p className="text-xs text-gray-600 dark:text-dark-200">
              This announcement will be sent to{" "}
              <span className="font-semibold text-primary-700 dark:text-primary-300">
                {draftCourse?.students.toLocaleString() ?? 0} students
              </span>{" "}
              enrolled in {draftCourse?.name}.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="flat" color="neutral" onClick={() => setComposing(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={publishAnnouncement}
              disabled={!draftTitle.trim() || !draftBody.trim()}
              className="gap-1.5"
            >
              <PaperAirplaneIcon className="size-4 stroke-2" />
              Publish announcement
            </Button>
          </div>
        </Card>
      )}

      {/* Course filter */}
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
            className="max-w-[16rem] truncate text-xs"
          >
            {c.name}
          </Button>
        ))}
      </div>

      {/* Announcement list */}
      {visible.length === 0 ? (
        <EmptyState
          icon={MegaphoneIcon}
          title="No announcements yet"
          description="Post your first announcement to notify students across a course."
          actionLabel="New announcement"
          onAction={() => setComposing(true)}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((ann) => (
            <AnnouncementRow key={ann.id} announcement={ann} />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function AnnouncementRow({ announcement: ann }: { announcement: Announcement }) {
  const readPct = Math.round((ann.readCount / ann.recipientCount) * 100);
  return (
    <Card skin="bordered" className="p-4">
      <div className="flex items-start gap-3.5">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
          <MegaphoneIcon className="size-5 stroke-2" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="primary" variant="soft" className="text-[10px]">
              {ann.courseName}
            </Badge>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 dark:text-dark-400">
              <CalendarDaysIcon className="size-3.5" />
              {formatDate(ann.publishedAt)} · {timeAgo(ann.publishedAt)}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
            {ann.title}
          </h3>
          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-dark-200">
            {ann.body}
          </p>

          {/* Recipient / read strip */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-dark-300">
            <span className="inline-flex items-center gap-1">
              <UsersIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
              {ann.recipientCount.toLocaleString()} recipients
            </span>
            <span className="inline-flex items-center gap-1">
              <ChatBubbleLeftRightIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
              {ann.readCount.toLocaleString()} read ({readPct}%)
            </span>
          </div>

          {/* Read progress bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
            <div
              className={clsx(
                "h-full rounded-full bg-primary-500 transition-all",
              )}
              style={{ width: `${readPct}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default AnnouncementsScreen;
