// ContentDeliverySettings — Schedule tab for the right sidebar.
//
// Student-facing view of the course's content-drip configuration: which
// lessons / quizzes / assignments are locked, when they unlock, and what
// prerequisite (lesson completion or date) is gating them. Mock data lives
// at the top; the parent passes `courseId` for future API wiring.

// Import Dependencies
import clsx from "clsx";
import {
  ClockIcon,
  LockClosedIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  ClipboardDocumentCheckIcon,
  InboxArrowDownIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Card, Badge } from "@/components/ui";

// ----------------------------------------------------------------------

export interface ContentDeliverySettingsProps {
  courseId: string;
}

/** Drip mode — what unlocks a curriculum item. */
type DripMode =
  | "open" // available now
  | "date" // unlocks on a specific date
  | "prerequisite" // unlocks when a prior lesson is complete
  | "completed"; // already completed

interface DripItem {
  id: string;
  kind: "lesson" | "quiz" | "assignment";
  title: string;
  topic: string;
  mode: DripMode;
  /** For `date` mode — the unlock date. */
  unlockDate?: string;
  /** For `prerequisite` mode — what needs to be done. */
  prerequisiteLabel?: string;
}

// ---- Mock data --------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const MOCK_DRIP: DripItem[] = [
  {
    id: "lesson-1",
    kind: "lesson",
    title: "Welcome & Course Roadmap",
    topic: "Foundations",
    mode: "completed",
  },
  {
    id: "lesson-2",
    kind: "lesson",
    title: "Tooling: Vite, TypeScript, pnpm",
    topic: "Foundations",
    mode: "open",
  },
  {
    id: "lesson-3",
    kind: "lesson",
    title: "Reading: React Mental Model",
    topic: "Foundations",
    mode: "prerequisite",
    prerequisiteLabel: "Complete Lesson 2 first",
  },
  {
    id: "quiz-1",
    kind: "quiz",
    title: "Foundations Check",
    topic: "Foundations",
    mode: "prerequisite",
    prerequisiteLabel: "Complete Lesson 3 first",
  },
  {
    id: "lesson-4",
    kind: "lesson",
    title: "Function Components & Props",
    topic: "Components & State",
    mode: "prerequisite",
    prerequisiteLabel: "Pass Quiz: Foundations Check (70%+)",
  },
  {
    id: "lesson-5",
    kind: "lesson",
    title: "useState & useReducer Deep Dive",
    topic: "Components & State",
    mode: "date",
    unlockDate: daysFromNow(1),
  },
  {
    id: "lesson-6",
    kind: "lesson",
    title: "Effects & Cleanup",
    topic: "Components & State",
    mode: "date",
    unlockDate: daysFromNow(2),
  },
  {
    id: "lesson-7",
    kind: "lesson",
    title: "Building a Custom Hook",
    topic: "Components & State",
    mode: "date",
    unlockDate: daysFromNow(3),
  },
  {
    id: "quiz-2",
    kind: "quiz",
    title: "Hooks Mastery Quiz",
    topic: "Components & State",
    mode: "date",
    unlockDate: daysFromNow(4),
  },
  {
    id: "lesson-8",
    kind: "lesson",
    title: "Fetch, Cache, Mutate",
    topic: "Data & APIs",
    mode: "date",
    unlockDate: daysFromNow(6),
  },
  {
    id: "lesson-9",
    kind: "lesson",
    title: "Optimistic UI & Rollbacks",
    topic: "Data & APIs",
    mode: "date",
    unlockDate: daysFromNow(7),
  },
  {
    id: "asg-1",
    kind: "assignment",
    title: "Build a Debounced Search Widget",
    topic: "Data & APIs",
    mode: "date",
    unlockDate: daysFromNow(8),
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

function daysUntil(isoDate?: string): number {
  if (!isoDate) return 0;
  return Math.ceil(
    (new Date(isoDate).getTime() - now.getTime()) / 86400000,
  );
}

const KIND_ICON = {
  lesson: PlayCircleIcon,
  quiz: ClipboardDocumentCheckIcon,
  assignment: InboxArrowDownIcon,
} as const;

// ----------------------------------------------------------------------

export default function ContentDeliverySettings({
  courseId,
}: ContentDeliverySettingsProps) {
  void courseId;

  const grouped = MOCK_DRIP.reduce<Record<string, DripItem[]>>(
    (acc, item) => {
      (acc[item.topic] ??= []).push(item);
      return acc;
    },
    {},
  );

  const openCount = MOCK_DRIP.filter((i) => i.mode === "open" || i.mode === "completed").length;
  const lockedCount = MOCK_DRIP.length - openCount;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
          <ClockIcon className="size-4 text-primary-500" />
          Content schedule
        </h2>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          {openCount} available · {lockedCount} locked
        </p>
      </header>

      {/* Legend */}
      <Card skin="bordered" className="p-3">
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <LegendRow icon={CheckCircleSolidIcon} label="Completed / Open" tone="text-success-500" />
          <LegendRow icon={ArrowPathIcon} label="Prerequisite" tone="text-primary-500" />
          <LegendRow icon={CalendarDaysIcon} label="Date-gated" tone="text-info-500" />
          <LegendRow icon={LockClosedIcon} label="Locked" tone="text-gray-400" />
        </div>
      </Card>

      {/* Per-topic drip list */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([topic, items]) => (
          <div key={topic}>
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              {topic}
            </p>
            <ul className="space-y-1.5">
              {items.map((item) => (
                <DripRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="px-1 text-[11px] text-gray-500 dark:text-dark-300">
        <ClockIcon className="mr-1 inline size-3.5" />
        This course uses content drip to pace your learning. Items unlock as you
        meet the requirements.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------

function DripRow({ item }: { item: DripItem }) {
  const Icon = KIND_ICON[item.kind];
  const isAvailable = item.mode === "open" || item.mode === "completed";
  const isCompleted = item.mode === "completed";

  return (
    <li
      className={clsx(
        "flex items-start gap-2.5 rounded-lg border p-2.5",
        isAvailable
          ? "border-gray-200 dark:border-dark-600"
          : "border-gray-200 bg-gray-50/50 dark:border-dark-600 dark:bg-dark-600/30",
      )}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isCompleted ? (
          <CheckCircleSolidIcon className="size-5 text-success-500 dark:text-success-400" />
        ) : item.mode === "open" ? (
          <Icon className="size-5 text-primary-500 dark:text-primary-400" />
        ) : (
          <div className="flex size-5 items-center justify-center">
            <LockClosedIcon className="size-4 text-gray-400 dark:text-dark-400" />
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            "truncate text-xs font-medium",
            isAvailable
              ? "text-gray-800 dark:text-dark-100"
              : "text-gray-500 dark:text-dark-300",
          )}
        >
          {item.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 dark:text-dark-300">
          {item.mode === "completed" && (
            <Badge color="success" variant="soft">
              Completed
            </Badge>
          )}
          {item.mode === "open" && (
            <Badge color="primary" variant="soft">
              Available
            </Badge>
          )}
          {item.mode === "prerequisite" && (
            <>
              <Badge color="primary" variant="soft" className="gap-1">
                <ArrowPathIcon className="size-2.5" />
                Prerequisite
              </Badge>
              <span>{item.prerequisiteLabel}</span>
            </>
          )}
          {item.mode === "date" && (
            <>
              <Badge color="info" variant="soft" className="gap-1">
                <CalendarDaysIcon className="size-2.5" />
                {formatDate(item.unlockDate)}
              </Badge>
              <span>
                {daysUntil(item.unlockDate) > 0
                  ? `in ${daysUntil(item.unlockDate)} days`
                  : "today"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Trailing check */}
      {isCompleted && (
        <CheckCircleIcon className="size-4 shrink-0 text-success-500 dark:text-success-400" />
      )}
    </li>
  );
}

function LegendRow({
  icon: Icon,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={clsx("size-3.5", tone)} />
      <span className="text-gray-600 dark:text-dark-200">{label}</span>
    </div>
  );
}
