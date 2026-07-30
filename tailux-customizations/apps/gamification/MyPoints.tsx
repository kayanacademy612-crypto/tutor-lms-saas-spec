// MyPoints — student's points ledger.
//
// Backed by `useMyPoints(params?)` from `@/hooks/useProEngagement`, which
// returns `PointTransaction[]`. The summary card shows total points (sum of
// all ledger entries), the current user's all-time tenant rank (looked up
// via `useLeaderboard`), and the count of earned badges (via `useMyBadges`).
//
// The transaction table supports client-side filtering by `reason` (a
// free-form string on each transaction — we derive the distinct reason list
// from the loaded data so the dropdown always reflects what's actually in
// the ledger).

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  SparklesIcon,
  TrophyIcon,
  StarIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ReceiptIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import {
  Button,
  Card,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from "@/components/lms";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  useLeaderboard,
  useMyBadges,
  useMyPoints,
} from "@/hooks/useProEngagement";
import type { PointTransaction } from "@/types/lms";

// ----------------------------------------------------------------------

const ALL_REASONS = "__all__";

// ----------------------------------------------------------------------

export function MyPoints() {
  const { user } = useAuthContext();
  const pointsQuery = useMyPoints();
  const earnedQuery = useMyBadges();
  // All-time tenant leaderboard gives us the current user's rank for the
  // summary card. We pass `undefined` for courseId so it's tenant-wide.
  const leaderboardQuery = useLeaderboard("tenant", undefined, "alltime");

  const [reasonFilter, setReasonFilter] = useState<string>(ALL_REASONS);

  const transactions: PointTransaction[] = useMemo(
    () => pointsQuery.data ?? [],
    [pointsQuery.data],
  );

  // Distinct reasons for the filter dropdown.
  const reasons = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (t.reason) set.add(t.reason);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Filtered transactions.
  const filtered = useMemo(() => {
    if (reasonFilter === ALL_REASONS) return transactions;
    return transactions.filter((t) => t.reason === reasonFilter);
  }, [transactions, reasonFilter]);

  // Total points: sum of all transaction points (may include negatives).
  const totalPoints = useMemo(
    () => transactions.reduce((sum, t) => sum + (t.points || 0), 0),
    [transactions],
  );

  const earnedCount = (earnedQuery.data ?? []).length;

  const myRank = useMemo(() => {
    const entries = leaderboardQuery.data ?? [];
    return entries.find((e) => e.studentId === user?.id)?.rank ?? null;
  }, [leaderboardQuery.data, user?.id]);

  const isLoading =
    pointsQuery.loading ||
    earnedQuery.loading ||
    leaderboardQuery.loading;
  const error = pointsQuery.error ?? earnedQuery.error ?? leaderboardQuery.error;

  const handleRefresh = () => {
    void pointsQuery.refetch();
    void earnedQuery.refetch();
    void leaderboardQuery.refetch();
  };

  // --------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <SparklesIcon className="size-5 text-primary-500 dark:text-primary-400" />
            My Points
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Every action that earns (or spends) points is recorded here.
          </p>
        </div>
        <Button
          isIcon
          variant="flat"
          color="neutral"
          className="size-9"
          onClick={handleRefresh}
          aria-label="Refresh points"
        >
          <ArrowPathIcon className="size-5 stroke-2" />
        </Button>
      </header>

      {isLoading ? (
        <LoadingState message="Loading your points…" />
      ) : error ? (
        <ErrorState error={error} onRetry={handleRefresh} />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              icon={StarIcon}
              color="primary"
              value={totalPoints.toLocaleString()}
              label="Total points"
            />
            <StatCard
              icon={TrophyIcon}
              color="warning"
              value={myRank ? `#${myRank}` : "—"}
              label="Tenant rank (all-time)"
            />
            <StatCard
              icon={SparklesIcon}
              color="success"
              value={`${earnedCount}`}
              label="Badges earned"
            />
          </div>

          {/* Filter + Table */}
          <Card skin="bordered" className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-dark-600">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                Points history
              </h2>
              <Select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="min-w-[14rem] text-sm"
              >
                <option value={ALL_REASONS}>All reasons</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={ReceiptIcon}
                title={
                  reasonFilter === ALL_REASONS
                    ? "No points transactions yet"
                    : "No transactions match this filter"
                }
                description={
                  reasonFilter === ALL_REASONS
                    ? "Start completing lessons and quizzes to earn your first points."
                    : "Try a different reason or clear the filter."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table hoverable dense>
                  <THead>
                    <Tr>
                      <Th className="text-left">Date</Th>
                      <Th className="text-left">Reason</Th>
                      <Th className="text-right">Points</Th>
                      <Th className="text-left">Reference</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {filtered.map((t) => {
                      const positive = (t.points || 0) >= 0;
                      return (
                        <Tr key={t.id}>
                          <Td className="whitespace-nowrap text-sm text-gray-600 dark:text-dark-200">
                            {formatDate(t.createdAt)}
                          </Td>
                          <Td className="text-sm text-gray-800 dark:text-dark-100">
                            {t.reason}
                          </Td>
                          <Td className="text-right">
                            <span
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                                positive
                                  ? "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                                  : "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
                              )}
                            >
                              {positive ? (
                                <ArrowUpIcon className="size-3 stroke-2" />
                              ) : (
                                <ArrowDownIcon className="size-3 stroke-2" />
                              )}
                              {positive ? "+" : ""}
                              {t.points}
                            </span>
                          </Td>
                          <Td className="text-xs text-gray-500 dark:text-dark-300">
                            {t.referenceId ? (
                              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-dark-600">
                                {t.referenceId}
                              </code>
                            ) : (
                              <span className="text-gray-400 dark:text-dark-400">
                                —
                              </span>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

/** Format an ISO timestamp as a short date + time (e.g. "Mar 5, 2026, 2:30 PM"). */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default MyPoints;
