// Achievements — student gamification hub.
//
// Renders three sections sourced entirely from the Phase 5 Pro Engagement API:
//   1. Badges earned — grid of `StudentBadge` records (icon + name + earned date).
//   2. Points summary — total points + recent transaction list (ledger) + a
//      "View full history" link that routes to `/apps/gamification`.
//   3. Leaderboard preview — top 5 tenant entries plus the current user's row
//      (highlighted) even when it falls outside the top 5.
//
// All data comes from `useMyBadges()`, `useMyPoints()`, and
// `useLeaderboard("tenant")`. No mock fallback. Loading / error / empty states
// are handled per section so a failure in one doesn't break the others.

// Import Dependencies
import { useMemo } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  useMyBadges,
  useMyPoints,
  useLeaderboard,
} from "@/hooks/useProEngagement";
import type {
  Badge as BadgeType,
  LeaderboardEntry,
  PointTransaction,
  StudentBadge,
} from "@/types/lms";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import { Button, Card, Badge, Avatar } from "@/components/ui";

// ----------------------------------------------------------------------

function timeAgo(isoDate?: string): string {
  if (!isoDate) return "";
  const then = new Date(isoDate).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

const BADGE_FALLBACK_COLORS = [
  "from-amber-400 to-orange-500",
  "from-sky-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
  "from-violet-400 to-purple-500",
];

function colorForBadge(badge: BadgeType | undefined, index: number): string {
  if (badge?.color) return "";
  return BADGE_FALLBACK_COLORS[index % BADGE_FALLBACK_COLORS.length];
}

// ----------------------------------------------------------------------

export function Achievements() {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const badgesQuery = useMyBadges();
  const pointsQuery = useMyPoints({ limit: 10 });
  const leaderboardQuery = useLeaderboard("tenant", undefined, "alltime");

  const badges = useMemo(() => badgesQuery.data ?? [], [badgesQuery.data]);
  const points: PointTransaction[] = useMemo(
    () => pointsQuery.data ?? [],
    [pointsQuery.data],
  );
  const leaderboard: LeaderboardEntry[] = useMemo(
    () => leaderboardQuery.data ?? [],
    [leaderboardQuery.data],
  );

  const totalPoints = useMemo(
    () => points.reduce((sum, p) => sum + (p.points || 0), 0),
    [points],
  );

  const myEntry = useMemo(
    () => leaderboard.find((e) => e.studentId === user?.id) ?? null,
    [leaderboard, user?.id],
  );

  const top5 = leaderboard.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Achievements
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Your badges, points, and leaderboard rank — all in one place.
          </p>
        </div>
        <Button
          variant="outlined"
          color="primary"
          className="gap-1.5 text-sm"
          onClick={() => navigate("/apps/gamification")}
        >
          <TrophyIcon className="size-4 stroke-2" />
          Full leaderboard
        </Button>
      </header>

      {/* Top summary tiles */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile
          icon={CheckBadgeIcon}
          label="Badges earned"
          value={badges.length}
          tone="primary"
          loading={badgesQuery.loading}
        />
        <SummaryTile
          icon={StarIcon}
          label="Total points"
          value={totalPoints.toLocaleString()}
          tone="warning"
          loading={pointsQuery.loading}
        />
        <SummaryTile
          icon={TrophyIcon}
          label="Leaderboard rank"
          value={myEntry ? `#${myEntry.rank}` : "—"}
          tone="info"
          loading={leaderboardQuery.loading}
        />
      </section>

      {/* Badges + Points ledger */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Badges earned */}
        <div className="space-y-3 lg:col-span-2">
          <SectionHeading
            icon={CheckBadgeIcon}
            title="Badges earned"
            subtitle="Recognition for milestones you've hit."
          />
          <Card className="p-4">
            {badgesQuery.loading ? (
              <LoadingState message="Loading badges…" inline />
            ) : badgesQuery.error ? (
              <ErrorState
                error={badgesQuery.error}
                onRetry={badgesQuery.refetch}
              />
            ) : badges.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No badges yet"
                description="Complete lessons, pass quizzes, and finish courses to earn badges."
                compact
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {badges.map((sb, idx) => (
                  <BadgeTile
                    key={sb.id}
                    studentBadge={sb}
                    colorFallback={colorForBadge(sb.badge, idx)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Points history */}
        <div className="space-y-3">
          <SectionHeading
            icon={StarIcon}
            title="Recent points"
            subtitle="Your last few point awards."
          />
          <Card className="divide-y divide-gray-100 p-0 dark:divide-dark-600">
            {pointsQuery.loading ? (
              <LoadingState message="Loading points…" inline />
            ) : pointsQuery.error ? (
              <ErrorState
                error={pointsQuery.error}
                onRetry={pointsQuery.refetch}
              />
            ) : points.length === 0 ? (
              <EmptyState
                icon={GiftIcon}
                title="No points yet"
                description="Earn points by completing lessons and quizzes."
                compact
              />
            ) : (
              points.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-start gap-3 p-3.5"
                >
                  <div
                    className={clsx(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                      p.points >= 0
                        ? "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                        : "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
                    )}
                  >
                    {p.points >= 0 ? "+" : ""}
                    {p.points}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                      {p.reason}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-dark-400">
                      {timeAgo(p.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </Card>
          <Button
            variant="flat"
            color="primary"
            className="gap-1 text-xs"
            onClick={() => navigate("/apps/gamification")}
          >
            View full history
            <ArrowRightIcon className="size-3.5 stroke-2" />
          </Button>
        </div>
      </section>

      {/* Leaderboard preview */}
      <section className="space-y-3">
        <SectionHeading
          icon={TrophyIcon}
          title="Leaderboard preview"
          subtitle="Top 5 learners across your school — all time."
        />
        <Card className="divide-y divide-gray-100 p-0 dark:divide-dark-600">
          {leaderboardQuery.loading ? (
            <LoadingState message="Loading leaderboard…" inline />
          ) : leaderboardQuery.error ? (
            <ErrorState
              error={leaderboardQuery.error}
              onRetry={leaderboardQuery.refetch}
            />
          ) : leaderboard.length === 0 ? (
            <EmptyState
              icon={TrophyIcon}
              title="No leaderboard entries yet"
              description="Be the first to earn points and claim the top spot."
              compact
            />
          ) : (
            <>
              {top5.map((entry) => (
                <LeaderboardRow
                  key={entry.id}
                  entry={entry}
                  isMe={entry.studentId === user?.id}
                />
              ))}
              {/* Current user row when outside top 5 */}
              {myEntry && myEntry.rank > 5 && (
                <>
                  <div className="bg-gray-50 px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:bg-dark-700/50 dark:text-dark-400">
                    Your rank · #{myEntry.rank}
                  </div>
                  <LeaderboardRow entry={myEntry} isMe />
                </>
              )}
            </>
          )}
        </Card>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------

interface SummaryTileProps {
  icon: typeof StarIcon;
  label: string;
  value: React.ReactNode;
  tone: "primary" | "warning" | "info";
  loading?: boolean;
}

function SummaryTile({ icon: Icon, label, value, tone, loading }: SummaryTileProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "flex size-11 shrink-0 items-center justify-center rounded-lg",
            tone === "primary" &&
              "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
            tone === "warning" &&
              "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
            tone === "info" &&
              "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
          )}
        >
          <Icon className="size-5.5 stroke-2" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <p className="text-sm text-gray-400 dark:text-dark-400">Loading…</p>
          ) : (
            <p className="text-2xl font-semibold leading-tight text-gray-900 dark:text-dark-50">
              {value}
            </p>
          )}
          <p className="truncate text-xs text-gray-500 dark:text-dark-300">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof StarIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
        <Icon className="size-4 stroke-2" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

function BadgeTile({
  studentBadge,
  colorFallback,
}: {
  studentBadge: StudentBadge;
  colorFallback: string;
}) {
  const badge = studentBadge.badge;
  const name = badge?.name ?? "Badge";
  const description = badge?.description;
  const iconUrl = badge?.iconUrl;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center dark:border-dark-600 dark:bg-dark-700">
      <div
        className={clsx(
          "flex size-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-soft",
          colorFallback || "bg-primary-500",
        )}
        style={
          badge?.color && !colorFallback
            ? { background: badge.color }
            : undefined
        }
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            loading="lazy"
            className="size-8 object-contain"
          />
        ) : (
          <SparklesIcon className="size-7 stroke-2" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-gray-800 dark:text-dark-50">
          {name}
        </p>
        <p className="mt-0.5 text-[10px] text-gray-400 dark:text-dark-400">
          {timeAgo(studentBadge.awardedAt)}
        </p>
      </div>
      {description && (
        <p className="line-clamp-2 text-[10px] text-gray-500 dark:text-dark-300">
          {description}
        </p>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  isMe,
}: {
  entry: LeaderboardEntry;
  isMe: boolean;
}) {
  const rankTone =
    entry.rank === 1
      ? "bg-amber-400 text-white"
      : entry.rank === 2
        ? "bg-gray-300 text-gray-800 dark:bg-dark-400 dark:text-dark-50"
        : entry.rank === 3
          ? "bg-orange-500 text-white"
          : "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200";

  return (
    <div
      className={clsx(
        "flex items-center gap-3 p-3.5",
        isMe && "bg-primary-500/[0.06] dark:bg-primary-500/10",
      )}
    >
      <span
        className={clsx(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          rankTone,
        )}
      >
        {entry.rank}
      </span>
      <Avatar
        name={entry.studentName}
        src={entry.studentAvatar}
        size={8}
        initialColor="auto"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
          {entry.studentName}
          {isMe && (
            <Badge
              color="primary"
              variant="soft"
              className="ml-2 align-middle text-[10px]"
            >
              You
            </Badge>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {entry.totalPoints.toLocaleString()}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-dark-400">pts</p>
      </div>
    </div>
  );
}

export default Achievements;
