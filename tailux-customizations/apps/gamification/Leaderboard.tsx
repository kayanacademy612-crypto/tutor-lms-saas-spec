// Leaderboard — ranked list of students by points (tenant-wide or per course).
//
// Backed by `useLeaderboard(scope, courseId?, period?)` from
// `@/hooks/useProEngagement`. Supports three time periods (weekly / monthly /
// all-time) and two scopes (tenant / course). The top 3 entries are styled
// with gold / silver / bronze tints, and the current user's row is always
// highlighted even if they're outside the visible window.
//
// The "current user" comparison uses the auth context's `user.id` so the row
// highlight survives pagination / windowing.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  TrophyIcon,
  StarIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Avatar, Button, Card, Select } from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/lms";
import { useAuthContext } from "@/app/contexts/auth/context";
import { useLeaderboard } from "@/hooks/useProEngagement";
import { useCourses } from "@/hooks/useLms";
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardScope,
} from "@/types/lms";

// ----------------------------------------------------------------------

const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "weekly", label: "This week" },
  { value: "monthly", label: "This month" },
  { value: "alltime", label: "All time" },
];

// Tailwind class triplets for the top-3 medal styling (rank pill + row tint).
const MEDAL_STYLES: Record<
  1 | 2 | 3,
  { pill: string; row: string; icon: string }
> = {
  1: {
    pill: "bg-warning-500 text-white dark:bg-warning-500",
    row: "bg-warning-500/[0.06] dark:bg-warning-500/10",
    icon: "text-warning-500 dark:text-warning-400",
  },
  2: {
    pill: "bg-gray-400 text-white dark:bg-gray-500",
    row: "bg-gray-400/[0.06] dark:bg-gray-500/10",
    icon: "text-gray-500 dark:text-gray-300",
  },
  3: {
    pill: "bg-orange-500 text-white dark:bg-orange-600",
    row: "bg-orange-500/[0.06] dark:bg-orange-600/10",
    icon: "text-orange-500 dark:text-orange-400",
  },
};

// ----------------------------------------------------------------------

export function Leaderboard() {
  const { user } = useAuthContext();
  const coursesQuery = useCourses();
  const courses = coursesQuery.data ?? [];

  const [scope, setScope] = useState<LeaderboardScope>("tenant");
  const [courseId, setCourseId] = useState<string>("");
  const [period, setPeriod] = useState<LeaderboardPeriod>("alltime");

  // When scope = "tenant", pass `undefined` for courseId so the hook builds a
  // tenant-wide URL.
  const effectiveCourseId =
    scope === "course" && courseId ? courseId : undefined;

  const leaderboardQuery = useLeaderboard(scope, effectiveCourseId, period);

  const entries: LeaderboardEntry[] = useMemo(
    () => leaderboardQuery.data ?? [],
    [leaderboardQuery.data],
  );

  // Find the current user's entry so we can highlight it even if it's far
  // down the list (the server returns the full leaderboard; if a windowed
  // response is added later, this lookup still works for visible rows).
  const myEntry = useMemo(
    () => entries.find((e) => e.studentId === user?.id) ?? null,
    [entries, user?.id],
  );

  // --------------------------------------------------------------------

  const handleScopeChange = (value: LeaderboardScope) => {
    setScope(value);
    // Reset courseId when switching back to tenant scope.
    if (value === "tenant") setCourseId("");
  };

  // --------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <TrophyIcon className="size-5 text-warning-500 dark:text-warning-400" />
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            See how you stack up against other learners in your school
            {scope === "course" ? " for this course" : ""}.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          {/* Scope selector */}
          <Select
            label="Scope"
            value={scope}
            onChange={(e) =>
              handleScopeChange(e.target.value as LeaderboardScope)
            }
            className="min-w-[10rem] text-sm"
          >
            <option value="tenant">Tenant-wide</option>
            <option value="course">Per course</option>
          </Select>

          {/* Course dropdown — only visible in course scope */}
          {scope === "course" && (
            <Select
              label="Course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="min-w-[16rem] text-sm"
              disabled={coursesQuery.loading}
            >
              <option value="">
                {coursesQuery.loading
                  ? "Loading…"
                  : courses.length === 0
                    ? "No courses"
                    : "Select a course…"}
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          )}

          {/* Period selector */}
          <Select
            label="Period"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as LeaderboardPeriod)
            }
            className="min-w-[10rem] text-sm"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-9"
            onClick={() => {
              void coursesQuery.refetch();
              void leaderboardQuery.refetch();
            }}
            aria-label="Refresh leaderboard"
          >
            <ArrowPathIcon className="size-5 stroke-2" />
          </Button>
        </div>
      </header>

      {/* Course-scope with no course picked */}
      {scope === "course" && !courseId ? (
        <Card className="p-0">
          <EmptyState
            icon={ChartBarIcon}
            title="Select a course"
            description="Pick a course above to see its leaderboard."
          />
        </Card>
      ) : leaderboardQuery.loading ? (
        <LoadingState message="Loading leaderboard…" />
      ) : leaderboardQuery.error ? (
        <ErrorState
          error={leaderboardQuery.error}
          onRetry={leaderboardQuery.refetch}
        />
      ) : entries.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={TrophyIcon}
            title="No rankings yet"
            description="Leaderboard entries appear once learners start earning points."
          />
        </Card>
      ) : (
        <>
          {/* Top 3 podium */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {entries.slice(0, 3).map((entry, idx) => {
              const rank = (idx + 1) as 1 | 2 | 3;
              const style = MEDAL_STYLES[rank];
              return (
                <Card
                  key={entry.id}
                  skin="bordered"
                  className={clsx(
                    "relative overflow-hidden p-4",
                    style.row,
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold",
                        style.pill,
                      )}
                    >
                      #{rank}
                    </div>
                    <Avatar
                      name={entry.studentName}
                      src={entry.studentAvatar ?? null}
                      size={10}
                      initialColor="auto"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                        {entry.studentName}
                        {entry.studentId === user?.id && (
                          <span className="ml-1.5 text-[11px] font-medium text-primary-600 dark:text-primary-400">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {entry.totalPoints.toLocaleString()} pts
                      </p>
                    </div>
                    <TrophyIcon
                      className={clsx("size-5 shrink-0", style.icon)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Full ranked list */}
          <Card skin="bordered" className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-600">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                All rankings
              </h2>
              {myEntry && (
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  Your rank:{" "}
                  <span className="font-semibold text-primary-600 dark:text-primary-400">
                    #{myEntry.rank}
                  </span>{" "}
                  · {myEntry.totalPoints.toLocaleString()} pts
                </p>
              )}
            </div>

            <ol className="divide-y divide-gray-100 dark:divide-dark-600">
              {entries.map((entry) => {
                const isMe = entry.studentId === user?.id;
                const medal = MEDAL_STYLES[entry.rank as 1 | 2 | 3];
                const isTop3 = entry.rank >= 1 && entry.rank <= 3;

                return (
                  <li
                    key={entry.id}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      isMe
                        ? "bg-primary-500/[0.06] dark:bg-primary-500/10"
                        : isTop3
                          ? medal.row
                          : "hover:bg-gray-50 dark:hover:bg-dark-700/50",
                    )}
                  >
                    {/* Rank */}
                    <div
                      className={clsx(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isTop3
                          ? medal.pill
                          : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200",
                      )}
                    >
                      {entry.rank}
                    </div>

                    {/* Avatar + name */}
                    <Avatar
                      name={entry.studentName}
                      src={entry.studentAvatar ?? null}
                      size={9}
                      initialColor="auto"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-50">
                        {entry.studentName}
                        {isMe && (
                          <span className="ml-1.5 text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                            You
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                        Rank {entry.rank}
                        {entry.period && ` · ${entry.period}`}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-100">
                      <StarIcon className="size-4 text-warning-500 dark:text-warning-400" />
                      {entry.totalPoints.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}

export default Leaderboard;
