// MyBadges — student's earned + locked badge collection.
//
// Pulls the current student's earned badges from `useMyBadges()` (which
// returns `StudentBadge[]` with the embedded `badge` record populated) and
// the full badge catalog from `useBadges()` (so we can show locked / not-
// yet-earned badges with their criteria hint). A summary card at the top
// shows the progress bar (X of Y badges earned).

// Import Dependencies
import { useMemo } from "react";
import {
  TrophyIcon,
  LockClosedIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ProgressBar,
  StatCard,
} from "@/components/lms";
import { useBadges, useMyBadges } from "@/hooks/useProEngagement";
import type { Badge, StudentBadge } from "@/types/lms";

// Local Imports (component)
import { BadgeCard } from "./BadgeCard";

// ----------------------------------------------------------------------

export function MyBadges() {
  const earnedQuery = useMyBadges();
  const catalogQuery = useBadges();

  const earned: StudentBadge[] = useMemo(
    () => earnedQuery.data ?? [],
    [earnedQuery.data],
  );
  const catalog: Badge[] = useMemo(
    () => catalogQuery.data ?? [],
    [catalogQuery.data],
  );

  // Index of earned badges by id so we can look up awardedAt quickly.
  const earnedById = useMemo(() => {
    const m = new Map<string, StudentBadge>();
    for (const sb of earned) m.set(sb.badgeId, sb);
    return m;
  }, [earned]);

  // Active catalog badges — hide inactive ones from the student view.
  const visibleCatalog = useMemo(
    () => catalog.filter((b) => b.isActive),
    [catalog],
  );

  const lockedBadges = useMemo(
    () => visibleCatalog.filter((b) => !earnedById.has(b.id)),
    [visibleCatalog, earnedById],
  );

  const totalBadges = visibleCatalog.length;
  const earnedCount = visibleCatalog.filter((b) => earnedById.has(b.id))
    .length;
  const progressPct =
    totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  const totalPointsFromBadges = earned.reduce((sum, sb) => {
    const pts = sb.bad?.pointsReward ?? 0;
    return sum + (typeof pts === "number" ? pts : 0);
  }, 0);

  // --------------------------------------------------------------------

  const isLoading = earnedQuery.loading || catalogQuery.loading;
  const error = earnedQuery.error ?? catalogQuery.error;

  // --------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <TrophyIcon className="size-5 text-warning-500 dark:text-warning-400" />
            My Badges
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Track your achievements and discover badges you can unlock next.
          </p>
        </div>
        <Button
          isIcon
          variant="flat"
          color="neutral"
          className="size-9"
          onClick={() => {
            void earnedQuery.refetch();
            void catalogQuery.refetch();
          }}
          aria-label="Refresh badges"
        >
          <ArrowPathIcon className="size-5 stroke-2" />
        </Button>
      </header>

      {isLoading ? (
        <LoadingState message="Loading your badges…" />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={() => {
            void earnedQuery.refetch();
            void catalogQuery.refetch();
          }}
        />
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={TrophyIcon}
              color="warning"
              value={`${earnedCount}`}
              label="Badges earned"
            />
            <StatCard
              icon={LockClosedIcon}
              color="neutral"
              value={`${lockedBadges.length}`}
              label="Badges to unlock"
            />
            <StatCard
              icon={SparklesIcon}
              color="primary"
              value={`+${totalPointsFromBadges.toLocaleString()}`}
              label="Points from badges"
            />
          </div>

          {/* Progress bar */}
          <Card className="p-4">
            <ProgressBar
              value={progressPct}
              color="success"
              size="md"
              label="Collection progress"
              hint={`${earnedCount} / ${totalBadges} badges`}
            />
          </Card>

          {/* Earned badges */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Earned ({earnedCount})
            </h2>
            {earnedCount === 0 ? (
              <Card className="p-0">
                <EmptyState
                  icon={TrophyIcon}
                  title="No badges earned yet"
                  description="Complete lessons, pass quizzes, and hit milestones to earn your first badge."
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleCatalog
                  .filter((b) => earnedById.has(b.id))
                  .map((b) => {
                    const sb = earnedById.get(b.id)!;
                    return (
                      <BadgeCard
                        key={b.id}
                        badge={b}
                        earned
                        awardedAt={sb.awardedAt}
                      />
                    );
                  })}
              </div>
            )}
          </section>

          {/* Locked badges */}
          {lockedBadges.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                Locked ({lockedBadges.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {lockedBadges.map((b) => (
                  <BadgeCard key={b.id} badge={b} earned={false} />
                ))}
              </div>
            </section>
          )}

          {/* Empty catalog */}
          {totalBadges === 0 && (
            <Card className="p-0">
              <EmptyState
                icon={SparklesIcon}
                title="No badges available yet"
                description="Your school hasn't published any badges. Check back soon!"
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export default MyBadges;
