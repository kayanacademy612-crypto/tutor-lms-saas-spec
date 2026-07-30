// LiveClassesScreen — schedule of upcoming live classes (Zoom/Meet).
//
// Shows upcoming and past live sessions. A "Schedule meeting" composer lets
// the instructor pick a course, enter a title, date/time, and meeting link,
// then prepends a new session to the list (mock — no real POST is made).

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  VideoCameraIcon,
  PlusIcon,
  CalendarDaysIcon,
  UsersIcon,
  LinkIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Avatar, Select } from "@/components/ui";

// ----------------------------------------------------------------------

interface LiveClass {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  platform: "zoom" | "meet";
  meetingUrl: string;
  startsAt: string; // ISO
  durationMin: number;
  registeredCount: number;
  status: "upcoming" | "live" | "completed" | "canceled";
}

const now = new Date();
const hoursFromNow = (n: number) => new Date(now.getTime() + n * 3600000).toISOString();
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const COURSES = [
  { id: "course-001", name: "Full-Stack React & TypeScript" },
  { id: "course-002", name: "Advanced React Performance" },
  { id: "course-004", name: "Building Design Systems with Tailwind v4" },
];

const INITIAL_CLASSES: LiveClass[] = [
  {
    id: "lc-1",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    title: "Live Q&A: Module 4 walkthrough",
    platform: "zoom",
    meetingUrl: "https://zoom.us/j/1234567890",
    startsAt: hoursFromNow(3),
    durationMin: 60,
    registeredCount: 84,
    status: "upcoming",
  },
  {
    id: "lc-2",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    title: "Office hours: bring your profiler traces",
    platform: "meet",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    startsAt: daysFromNow(1),
    durationMin: 45,
    registeredCount: 32,
    status: "upcoming",
  },
  {
    id: "lc-3",
    courseId: "course-004",
    courseName: "Building Design Systems with Tailwind v4",
    title: "Workshop: building a token pipeline",
    platform: "zoom",
    meetingUrl: "https://zoom.us/j/9876543210",
    startsAt: daysFromNow(3),
    durationMin: 90,
    registeredCount: 110,
    status: "upcoming",
  },
  {
    id: "lc-4",
    courseId: "course-001",
    courseName: "Full-Stack React & TypeScript",
    title: "Live: Hooks deep dive",
    platform: "zoom",
    meetingUrl: "https://zoom.us/j/5555555555",
    startsAt: daysAgo(5),
    durationMin: 60,
    registeredCount: 152,
    status: "completed",
  },
  {
    id: "lc-5",
    courseId: "course-002",
    courseName: "Advanced React Performance",
    title: "Concurrent rendering live",
    platform: "meet",
    meetingUrl: "https://meet.google.com/xyz-uvwx-rst",
    startsAt: daysAgo(10),
    durationMin: 45,
    registeredCount: 68,
    status: "completed",
  },
];

// ----------------------------------------------------------------------

function formatDateTime(isoDate: string): {
  date: string;
  time: string;
  relative: string;
} {
  const d = new Date(isoDate);
  const date = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.round(diffMs / 3600000);
  let relative: string;
  if (diffH < -24) {
    relative = `${Math.round(diffH / -24)}d ago`;
  } else if (diffH < 0) {
    relative = `${-diffH}h ago`;
  } else if (diffH < 1) {
    relative = "starting soon";
  } else if (diffH < 24) {
    relative = `in ${diffH}h`;
  } else {
    relative = `in ${Math.round(diffH / 24)}d`;
  }
  return { date, time, relative };
}

const statusTone: Record<
  LiveClass["status"],
  { color: "info" | "success" | "neutral" | "error"; label: string }
> = {
  upcoming: { color: "info", label: "Upcoming" },
  live: { color: "success", label: "Live now" },
  completed: { color: "neutral", label: "Completed" },
  canceled: { color: "error", label: "Canceled" },
};

// ----------------------------------------------------------------------

export function LiveClassesScreen() {
  const [classes, setClasses] = useState<LiveClass[]>(INITIAL_CLASSES);
  const [tab, setTab] = useState<"upcoming" | "completed">("upcoming");
  const [scheduling, setScheduling] = useState(false);
  const [draftCourseId, setDraftCourseId] = useState(COURSES[0].id);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftPlatform, setDraftPlatform] = useState<"zoom" | "meet">("zoom");

  const visible = useMemo(() => {
    return classes
      .filter((c) => c.status === tab || (tab === "upcoming" && c.status === "live"))
      .sort(
        (a, b) =>
          (tab === "upcoming" ? 1 : -1) *
          (new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      );
  }, [classes, tab]);

  const totalUpcoming = classes.filter(
    (c) => c.status === "upcoming" || c.status === "live",
  ).length;
  const totalRegistered = classes
    .filter((c) => c.status === "upcoming" || c.status === "live")
    .reduce((s, c) => s + c.registeredCount, 0);

  function scheduleMeeting() {
    if (!draftTitle.trim() || !draftDate || !draftTime || !draftUrl.trim()) return;
    const startIso = new Date(`${draftDate}T${draftTime}`).toISOString();
    const course = COURSES.find((c) => c.id === draftCourseId);
    if (!course) return;
    const newClass: LiveClass = {
      id: `lc-${Math.random().toString(36).slice(2, 8)}`,
      courseId: course.id,
      courseName: course.name,
      title: draftTitle.trim(),
      platform: draftPlatform,
      meetingUrl: draftUrl.trim(),
      startsAt: startIso,
      durationMin: 60,
      registeredCount: 0,
      status: "upcoming",
    };
    setClasses((prev) => [newClass, ...prev]);
    setDraftTitle("");
    setDraftDate("");
    setDraftTime("");
    setDraftUrl("");
    setScheduling(false);
    setTab("upcoming");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Live Classes
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Schedule Zoom / Meet sessions and track registrations.
          </p>
        </div>
        <Button color="primary" className="gap-1.5" onClick={() => setScheduling(true)}>
          <PlusIcon className="size-4 stroke-2" />
          Schedule meeting
        </Button>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Upcoming</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {totalUpcoming}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Registrations</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {totalRegistered.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Completed</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {classes.filter((c) => c.status === "completed").length}
          </p>
        </Card>
      </div>

      {/* Inline composer */}
      {scheduling && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Schedule new meeting
            </h2>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              onClick={() => setScheduling(false)}
              aria-label="Cancel schedule"
            >
              <XMarkIcon className="size-5 stroke-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Course"
              value={draftCourseId}
              onChange={(e) => setDraftCourseId((e.target as HTMLSelectElement).value)}
              data={COURSES.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Platform"
              value={draftPlatform}
              onChange={(e) =>
                setDraftPlatform((e.target as HTMLSelectElement).value as "zoom" | "meet")
              }
              data={[
                { value: "zoom", label: "Zoom" },
                { value: "meet", label: "Google Meet" },
              ]}
            />
          </div>

          <Input
            label="Meeting title"
            placeholder="e.g. Live Q&A: Module 4 walkthrough"
            value={draftTitle}
            onChange={(e) => setDraftTitle((e.target as HTMLInputElement).value)}
            classNames={{ wrapper: "mt-0" }}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Date"
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Time"
              type="time"
              value={draftTime}
              onChange={(e) => setDraftTime((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
          </div>

          <Input
            label="Meeting link"
            placeholder="https://zoom.us/j/… or https://meet.google.com/…"
            value={draftUrl}
            onChange={(e) => setDraftUrl((e.target as HTMLInputElement).value)}
            prefix={<LinkIcon className="size-4 text-gray-400" />}
            classNames={{ wrapper: "mt-0" }}
          />

          <div className="flex justify-end gap-2">
            <Button variant="flat" color="neutral" onClick={() => setScheduling(false)}>
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={scheduleMeeting}
              disabled={!draftTitle.trim() || !draftDate || !draftTime || !draftUrl.trim()}
              className="gap-1.5"
            >
              <VideoCameraIcon className="size-4 stroke-2" />
              Schedule
            </Button>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-750 sm:w-fit">
        <Button
          variant={tab === "upcoming" ? "soft" : "flat"}
          color={tab === "upcoming" ? "primary" : "neutral"}
          onClick={() => setTab("upcoming")}
          className="gap-1.5 text-xs"
        >
          <ClockIcon className="size-3.5" />
          Upcoming
          <Badge color={tab === "upcoming" ? "primary" : "neutral"} variant="filled" className="h-4 min-w-4 px-1 text-[10px]">
            {totalUpcoming}
          </Badge>
        </Button>
        <Button
          variant={tab === "completed" ? "soft" : "flat"}
          color={tab === "completed" ? "primary" : "neutral"}
          onClick={() => setTab("completed")}
          className="gap-1.5 text-xs"
        >
          <CheckCircleIcon className="size-3.5" />
          Completed
          <Badge color={tab === "completed" ? "primary" : "neutral"} variant="filled" className="h-4 min-w-4 px-1 text-[10px]">
            {classes.filter((c) => c.status === "completed").length}
          </Badge>
        </Button>
      </div>

      {/* Class list */}
      {visible.length === 0 ? (
        <EmptyState
          icon={VideoCameraIcon}
          title={tab === "upcoming" ? "No upcoming live classes" : "No completed classes yet"}
          description={
            tab === "upcoming"
              ? "Schedule your next live session to engage with students in real time."
              : "Completed live classes will appear here."
          }
          actionLabel={tab === "upcoming" ? "Schedule meeting" : undefined}
          onAction={tab === "upcoming" ? () => setScheduling(true) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {visible.map((lc) => (
            <LiveClassRow key={lc.id} liveClass={lc} />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function LiveClassRow({ liveClass: lc }: { liveClass: LiveClass }) {
  const { date, time, relative } = formatDateTime(lc.startsAt);
  const tone = statusTone[lc.status];

  return (
    <Card skin="bordered" className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: identity */}
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className={clsx(
              "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
              lc.platform === "zoom"
                ? "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400"
                : "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
            )}
          >
            <VideoCameraIcon className="size-5 stroke-2" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="primary" variant="soft" className="text-[10px]">
                {lc.courseName}
              </Badge>
              <Badge color={tone.color} variant="soft" className="gap-1 text-[10px]">
                {tone.label}
              </Badge>
              <Badge color="neutral" variant="soft" className="text-[10px]">
                {lc.platform === "zoom" ? "Zoom" : "Google Meet"}
              </Badge>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
              {lc.title}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-dark-300">
              <span className="inline-flex items-center gap-1">
                <CalendarDaysIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
                {date} · {time}
              </span>
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
                {lc.durationMin}m
              </span>
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
                {lc.registeredCount} registered
              </span>
              <span className="text-gray-400 dark:text-dark-400">{relative}</span>
            </div>
          </div>
        </div>

        {/* Right: action */}
        <div className="flex shrink-0 items-center gap-2">
          <a href={lc.meetingUrl} target="_blank" rel="noreferrer">
            <Button
              variant="outlined"
              color="primary"
              className="gap-1.5 text-xs"
              isIcon
              aria-label="Open meeting link"
            >
              <ArrowTopRightOnSquareIcon className="size-3.5 stroke-2" />
            </Button>
          </a>
          {lc.status === "upcoming" || lc.status === "live" ? (
            <Button color="primary" className="gap-1.5 text-xs">
              <VideoCameraIcon className="size-3.5 stroke-2" />
              Start
            </Button>
          ) : (
            <Button variant="flat" color="neutral" className="text-xs">
              View recording
            </Button>
          )}
        </div>
      </div>

      {/* Attendee avatars (only upcoming) */}
      {(lc.status === "upcoming" || lc.status === "live") && (
        <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-dark-600">
          <div className="flex -space-x-2">
            {["AM", "PL", "SK", "DR", "JC"].map((init, i) => (
              <Avatar
                key={i}
                name={init}
                size={6}
                initialColor="auto"
                classNames={{
                  root: "ring-2 ring-white dark:ring-dark-750 rounded-full",
                }}
              />
            ))}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-dark-300">
            +{(lc.registeredCount - 5).toLocaleString()} more registered
          </p>
        </div>
      )}
    </Card>
  );
}

export default LiveClassesScreen;
