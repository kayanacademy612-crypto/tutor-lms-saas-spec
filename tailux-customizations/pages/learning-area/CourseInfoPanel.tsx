// CourseInfoPanel — Info tab for the right sidebar.
//
// Shows the course at-a-glance: instructor, duration, total lessons, total
// students, last updated, difficulty, prerequisites, tags, and categories.

// Import Dependencies
import {
  InformationCircleIcon,
  UserIcon,
  ClockIcon,
  PlayCircleIcon,
  UsersIcon,
  CalendarDaysIcon,
  SignalIcon,
  AcademicCapIcon,
  TagIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card, Badge, Avatar } from "@/components/ui";
import { DifficultyBadge, RatingStars } from "@/components/lms";
import type { Course, CourseDifficulty } from "@/types/lms";

// ----------------------------------------------------------------------

export interface CourseInfoPanelProps {
  course: Course;
  /** Override the mock instructor / tag / category metadata. */
  instructorName?: string;
  instructorEmail?: string;
  instructorAvatarUrl?: string;
  tags?: string[];
  categories?: string[];
  prerequisiteTitles?: string[];
}

// ---- Mock metadata (the Course type only stores IDs for these) -------

const MOCK_INSTRUCTOR = {
  name: "Maya Chen",
  email: "maya@hellotutorlms.com",
  avatarUrl: undefined as string | undefined,
};

const MOCK_TAGS = ["React", "TypeScript", "Vite", "Hooks", "Frontend"];
const MOCK_CATEGORIES = ["Web Development", "JavaScript"];
const MOCK_PREREQ_TITLES = [
  "JavaScript Essentials",
  "HTML & CSS Foundations",
];

// ---- Helpers ----------------------------------------------------------

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "Self-paced";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDate(isoDate?: string): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ----------------------------------------------------------------------

export default function CourseInfoPanel({
  course,
  instructorName,
  instructorEmail,
  instructorAvatarUrl,
  tags,
  categories,
  prerequisiteTitles,
}: CourseInfoPanelProps) {
  const instructor = {
    name: instructorName ?? MOCK_INSTRUCTOR.name,
    email: instructorEmail ?? MOCK_INSTRUCTOR.email,
    avatarUrl: instructorAvatarUrl ?? MOCK_INSTRUCTOR.avatarUrl,
  };
  const tagList = tags ?? MOCK_TAGS;
  const catList = categories ?? MOCK_CATEGORIES;
  const prereqList = prerequisiteTitles ?? MOCK_PREREQ_TITLES;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
          <InformationCircleIcon className="size-4 text-primary-500" />
          Course info
        </h2>
      </header>

      {/* Title + rating */}
      <Card skin="bordered" className="p-4">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {course.title}
        </h3>
        {course.excerpt && (
          <p className="mt-1 text-xs text-gray-600 dark:text-dark-200">
            {course.excerpt}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <RatingStars value={course.ratingAvg} size="size-3.5" />
          <span className="text-xs font-medium text-gray-700 dark:text-dark-200">
            {course.ratingAvg.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 dark:text-dark-300">
            ({course.ratingCount})
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <DifficultyBadge
            level={(course.difficulty ?? "beginner") as CourseDifficulty}
            soft
          />
          <Badge color="info" variant="soft">
            <SignalIcon className="size-3" />
            {course.language ?? "English"}
          </Badge>
        </div>
      </Card>

      {/* Instructor */}
      <Card skin="bordered" className="p-4">
        <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          <UserIcon className="size-3.5" />
          Instructor
        </p>
        <div className="flex items-center gap-2.5">
          <Avatar
            name={instructor.name}
            src={instructor.avatarUrl}
            size={10}
            initialColor="auto"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
              {instructor.name}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-dark-300">
              {instructor.email}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <Card skin="bordered" className="p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          At a glance
        </p>
        <div className="grid grid-cols-2 gap-2">
          <InfoTile
            icon={ClockIcon}
            label="Duration"
            value={formatDuration(course.durationSeconds)}
          />
          <InfoTile
            icon={PlayCircleIcon}
            label="Lessons"
            value={`${course.enrolledCount > 0 ? 9 : 0} lessons`}
          />
          <InfoTile
            icon={UsersIcon}
            label="Students"
            value={course.enrolledCount.toLocaleString()}
          />
          <InfoTile
            icon={CalendarDaysIcon}
            label="Updated"
            value={formatDate(course.updatedAt)}
          />
        </div>
      </Card>

      {/* Categories */}
      {catList.length > 0 && (
        <Card skin="bordered" className="p-4">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            <Squares2X2Icon className="size-3.5" />
            Categories
          </p>
          <div className="flex flex-wrap gap-1.5">
            {catList.map((c) => (
              <Badge key={c} color="primary" variant="soft">
                {c}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Tags */}
      {tagList.length > 0 && (
        <Card skin="bordered" className="p-4">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            <TagIcon className="size-3.5" />
            Tags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tagList.map((t) => (
              <Badge key={t} color="neutral" variant="soft">
                #{t}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Prerequisites */}
      {prereqList.length > 0 && (
        <Card skin="bordered" className="p-4">
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            <AcademicCapIcon className="size-3.5" />
            Prerequisites
          </p>
          <ul className="space-y-1.5">
            {prereqList.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2 text-xs text-gray-700 dark:text-dark-200"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-500" />
                {p}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Description */}
      {course.description && (
        <Card skin="bordered" className="p-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            About this course
          </p>
          <p className="text-xs leading-relaxed text-gray-600 dark:text-dark-200">
            {course.description}
          </p>
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-2.5 dark:border-dark-600">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-1 truncate text-xs font-semibold text-gray-800 dark:text-dark-100">
        {value}
      </p>
    </div>
  );
}
