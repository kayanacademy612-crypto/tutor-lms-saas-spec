// CalendarScreen — month grid of upcoming deadlines, live classes, and quiz
// due dates.
//
// The backend exposes `GET /api/lms/calendar` but there's no hook for it, so
// this screen fetches directly via `lmsApi.calendar.list()` with a manual
// `useEffect`. Mock data is used as a fallback when the API is unavailable.
// Each event is rendered as a colored dot/badge on its day cell.

// Import Dependencies
import { useEffect, useMemo, useState, useCallback } from "react";
import clsx from "clsx";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  VideoCameraIcon,
  ClipboardDocumentCheckIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type { CalendarEvent } from "@/types/lms";
import { EmptyState, LoadingState, ErrorState } from "@/components/lms";
import { Button, Card, Badge } from "@/components/ui";

// ----------------------------------------------------------------------

const today = new Date();

const iso = (d: Date) => d.toISOString();
const at = (dayOffset: number, h = 10, m = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return iso(d);
};

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "evt-1",
    tenantId: "tenant-1",
    userId: "student-1",
    courseId: "course-004",
    title: "Live: Kubernetes Networking",
    description: "Deep dive on Services, Ingress, and DNS in K8s.",
    eventType: "live",
    startAt: at(1, 18, 0),
    endAt: at(1, 19, 30),
    allDay: false,
    location: "Zoom",
    meetingUrl: "https://zoom.us/j/123",
    isCompleted: false,
    createdAt: iso(today),
    updatedAt: iso(today),
  },
  {
    id: "evt-2",
    tenantId: "tenant-1",
    userId: "student-1",
    courseId: "course-002",
    quizId: "quiz-1",
    title: "Sorting Algorithms Quiz due",
    description: "Covers quicksort, mergesort, and complexity analysis.",
    eventType: "quiz",
    startAt: at(2, 23, 59),
    allDay: true,
    isCompleted: false,
    createdAt: iso(today),
    updatedAt: iso(today),
  },
  {
    id: "evt-3",
    tenantId: "tenant-1",
    userId: "student-1",
    courseId: "course-001",
    assignmentId: "asg-1",
    title: "Module 4 Project submission",
    description: "Build a small CRUD app with React + TS + react-hook-form.",
    eventType: "assignment",
    startAt: at(5, 23, 59),
    allDay: true,
    isCompleted: false,
    createdAt: iso(today),
    updatedAt: iso(today),
  },
  {
    id: "evt-4",
    tenantId: "tenant-1",
    userId: "student-1",
    courseId: "course-004",
    title: "Live: Helm Package Manager",
    eventType: "live",
    startAt: at(8, 18, 0),
    endAt: at(8, 19, 0),
    allDay: false,
    location: "Zoom",
    isCompleted: false,
    createdAt: iso(today),
    updatedAt: iso(today),
  },
  {
    id: "evt-5",
    tenantId: "tenant-1",
    userId: "student-1",
    courseId: "course-002",
    quizId: "quiz-2",
    title: "Graph Traversal Quiz due",
    eventType: "quiz",
    startAt: at(11, 23, 59),
    allDay: true,
    isCompleted: false,
    createdAt: iso(today),
    updatedAt: iso(today),
  },
  {
    id: "evt-6",
    tenantId: "tenant-1",
    userId: "student-1",
    courseId: "course-003",
    title: "Design Critique session",
    eventType: "live",
    startAt: at(-3, 17, 0),
    endAt: at(-3, 18, 0),
    allDay: false,
    isCompleted: true,
    createdAt: iso(today),
    updatedAt: iso(today),
  },
];

// ----------------------------------------------------------------------

type EventKind = "live" | "quiz" | "assignment" | "other";

function eventKind(ev: CalendarEvent): EventKind {
  const t = (ev.eventType ?? "").toLowerCase();
  if (t === "live" || t === "class") return "live";
  if (t === "quiz") return "quiz";
  if (t === "assignment" || t === "deadline") return "assignment";
  return "other";
}

const KIND_META: Record<
  EventKind,
  { label: string; dot: string; badge: "info" | "warning" | "error" | "neutral"; icon: typeof VideoCameraIcon }
> = {
  live: {
    label: "Live class",
    dot: "bg-info-500",
    badge: "info",
    icon: VideoCameraIcon,
  },
  quiz: {
    label: "Quiz due",
    dot: "bg-warning-500",
    badge: "warning",
    icon: ClipboardDocumentCheckIcon,
  },
  assignment: {
    label: "Deadline",
    dot: "bg-error-500",
    badge: "error",
    icon: ExclamationCircleIcon,
  },
  other: {
    label: "Event",
    dot: "bg-gray-400 dark:bg-dark-400",
    badge: "neutral",
    icon: CalendarDaysIcon,
  },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const SAME_DAY = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const SAME_MONTH = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

// ----------------------------------------------------------------------

export function CalendarScreen() {
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.calendar.list();
      const list = Array.isArray(result) ? result : [];
      if (list.length > 0) setEvents(list);
      // If empty, keep mock events so the calendar isn't barren.
    } catch (err) {
      setError(err as LmsApiError);
      // Keep mock events on error.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // Build the 6-week grid (42 cells) for the current view month.
  const grid = useMemo(() => {
    const firstOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
    const startDay = firstOfMonth.getDay(); // 0 = Sun
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - startDay);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [view]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const d = new Date(ev.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    });
    return map;
  }, [events]);

  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

  const selectedDayEvents = useMemo(() => {
    const arr = eventsByDay.get(dayKey(selectedDay)) ?? [];
    return arr.sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  }, [eventsByDay, selectedDay]);

  const monthEvents = useMemo(
    () => events.filter((e) => SAME_MONTH(new Date(e.startAt), view)),
    [events, view],
  );

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  function goToToday() {
    setView(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today);
  }

  // ----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Deadlines, live classes, and quiz due dates at a glance.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outlined" color="neutral" isIcon onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeftIcon className="size-4.5 stroke-2" />
          </Button>
          <Button variant="flat" color="neutral" onClick={goToToday} className="text-xs">
            Today
          </Button>
          <Button variant="outlined" color="neutral" isIcon onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRightIcon className="size-4.5 stroke-2" />
          </Button>
        </div>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(KIND_META) as EventKind[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-dark-300">
            <span className={clsx("size-2.5 rounded-full", KIND_META[k].dot)} />
            {KIND_META[k].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Month grid */}
        <Card className="p-4 lg:col-span-2">
          {/* Month nav row */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              {MONTH_NAMES[view.getMonth()]} {view.getFullYear()}
            </h2>
            <Badge color="neutral" variant="soft" className="text-[10px]">
              {monthEvents.length} event{monthEvents.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = SAME_MONTH(d, view);
              const isToday = SAME_DAY(d, today);
              const isSelected = SAME_DAY(d, selectedDay);
              const dayEvents = eventsByDay.get(dayKey(d)) ?? [];
              return (
                <Card
                  key={i}
                  component="button"
                  skin="none"
                  onClick={() => setSelectedDay(new Date(d))}
                  className={clsx(
                    "flex min-h-[68px] flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors",
                    inMonth
                      ? "bg-white dark:bg-dark-700"
                      : "bg-gray-50 dark:bg-dark-750/50",
                    isSelected
                      ? "border-primary-500 ring-1 ring-primary-500/30"
                      : "border-gray-200 dark:border-dark-600",
                    "hover:border-primary-400 dark:hover:border-primary-500/50",
                  )}
                >
                  <span
                    className={clsx(
                      "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-primary-500 text-white"
                        : inMonth
                          ? "text-gray-700 dark:text-dark-100"
                          : "text-gray-400 dark:text-dark-500",
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
                        className={clsx(
                          "size-1.5 rounded-full",
                          KIND_META[eventKind(ev)].dot,
                          ev.isCompleted && "opacity-40",
                        )}
                        title={ev.title}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] font-medium text-gray-500 dark:text-dark-400">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* Selected day detail */}
        <Card className="p-4">
          <div className="mb-3">
            <p className="text-xs text-gray-500 dark:text-dark-300">
              {selectedDay.toLocaleDateString(undefined, {
                weekday: "long",
              })}
            </p>
            <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              {selectedDay.toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
          </div>

          {loading ? (
            <LoadingState message="Loading events…" inline />
          ) : error ? (
            <ErrorState error={error} onRetry={fetchEvents} />
          ) : selectedDayEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDaysIcon}
              title="No events this day"
              description="Pick another day or check the month view for upcoming items."
              compact
            />
          ) : (
            <div className="space-y-2.5">
              {selectedDayEvents.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function EventCard({ event }: { event: CalendarEvent }) {
  const kind = eventKind(event);
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const start = new Date(event.startAt);
  const timeLabel = event.allDay
    ? "All day"
    : start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div
      className={clsx(
        "rounded-lg border p-3",
        meta.badge === "info" && "border-info-300 bg-info-50 dark:border-info-500/30 dark:bg-info-500/10",
        meta.badge === "warning" && "border-warning-300 bg-warning-50 dark:border-warning-500/30 dark:bg-warning-500/10",
        meta.badge === "error" && "border-error-300 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10",
        meta.badge === "neutral" && "border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={clsx(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            meta.badge === "info" && "bg-info-500/15 text-info-600 dark:text-info-400",
            meta.badge === "warning" && "bg-warning-500/15 text-warning-600 dark:text-warning-400",
            meta.badge === "error" && "bg-error-500/15 text-error-600 dark:text-error-400",
            meta.badge === "neutral" && "bg-gray-200 text-gray-600 dark:bg-dark-600 dark:text-dark-200",
          )}
        >
          <Icon className="size-4 stroke-2" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
            {event.title}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500 dark:text-dark-300">
            {timeLabel}
            {event.location ? ` · ${event.location}` : ""}
          </p>
          {event.description && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-dark-200">
              {event.description}
            </p>
          )}
        </div>
        {event.isCompleted && (
          <Badge color="success" variant="soft" className="shrink-0 text-[10px]">
            Done
          </Badge>
        )}
      </div>
    </div>
  );
}

export default CalendarScreen;
