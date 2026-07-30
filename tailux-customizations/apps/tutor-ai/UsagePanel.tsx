// UsagePanel — right-sidebar AI usage stats.
//
// Shows daily token usage for the last 7 days (mini bar chart), the running
// total of tokens + estimated cost for the visible window, and the remaining
// quota if the most-recent `useSendAIMessage` result exposed one.

// Import Dependencies
import { useMemo } from "react";
import clsx from "clsx";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  BoltIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import { useAIUsage } from "@/hooks/useReportsAI";
import type { AIUsageStats } from "@/types/lms";

// ----------------------------------------------------------------------

const DAY_WINDOW = 7;

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "short",
    });
  } catch {
    return "";
  }
}

// ----------------------------------------------------------------------

export interface UsagePanelProps {
  /** Optional remaining-tokens value surfaced from the most-recent chat reply. */
  remainingTokens?: number;
  /** Optional daily token quota (used to show the remaining share). */
  dailyQuota?: number;
}

export function UsagePanel({
  remainingTokens,
  dailyQuota = 50_000,
}: UsagePanelProps) {
  // Fetch the last 7 days of usage stats.
  const params = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (DAY_WINDOW - 1));
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const usageQuery = useAIUsage(params);
  const stats: AIUsageStats[] = usageQuery.data ?? [];

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => {
        acc.requests += s.totalRequests;
        acc.tokens += s.totalTokens;
        acc.costCents += s.estimatedCostCents;
        return acc;
      },
      { requests: 0, tokens: 0, costCents: 0 },
    );
  }, [stats]);

  const maxTokens = useMemo(
    () => Math.max(1, ...stats.map((s) => s.totalTokens)),
    [stats],
  );

  const today = stats[stats.length - 1];
  const todayTokens = today?.totalTokens ?? 0;
  const remaining =
    typeof remainingTokens === "number"
      ? remainingTokens
      : Math.max(0, dailyQuota - todayTokens);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3 dark:border-dark-600">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            AI Usage
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
          Last {DAY_WINDOW} days
        </p>
      </div>

      <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
        <div className="space-y-4 p-4">
          {usageQuery.loading && stats.length === 0 ? (
            <LoadingState message="Loading usage…" inline />
          ) : usageQuery.error ? (
            <ErrorState
              error={usageQuery.error}
              onRetry={usageQuery.refetch}
            />
          ) : stats.length === 0 ? (
            <EmptyState
              icon={BoltIcon}
              title="No usage data yet"
              description="Send your first message to the AI tutor to start tracking usage."
              compact
            />
          ) : (
            <>
              {/* Today summary */}
              <Card className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-dark-200">
                    <ClockIcon className="size-4 text-primary-500" />
                    Today&apos;s quota
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-dark-50">
                    {formatTokens(todayTokens)} / {formatTokens(dailyQuota)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-150 dark:bg-dark-500">
                  <div
                    className="h-full rounded-full bg-primary-500 dark:bg-primary-400"
                    style={{
                      width: `${Math.min(100, (todayTokens / dailyQuota) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-dark-300">
                  <span>Remaining</span>
                  <span className="font-medium text-success-600 dark:text-success-400">
                    {formatTokens(remaining)} tokens
                  </span>
                </div>
              </Card>

              {/* Window totals */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    <BoltIcon className="size-3.5" />
                    Tokens
                  </div>
                  <p className="mt-1 text-lg font-bold text-gray-800 dark:text-dark-50">
                    {formatTokens(totals.tokens)}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-dark-400">
                    {totals.requests} requests
                  </p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    <CurrencyDollarIcon className="size-3.5" />
                    Est. cost
                  </div>
                  <p className="mt-1 text-lg font-bold text-gray-800 dark:text-dark-50">
                    {formatCost(totals.costCents)}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-dark-400">
                    for the last {DAY_WINDOW} days
                  </p>
                </Card>
              </div>

              {/* Daily chart */}
              <Card className="p-3">
                <p className="mb-3 text-xs font-medium text-gray-600 dark:text-dark-200">
                  Daily token usage
                </p>
                <div className="flex h-28 items-end justify-between gap-1.5">
                  {stats.map((s) => {
                    const heightPct = (s.totalTokens / maxTokens) * 100;
                    return (
                      <div
                        key={s.date}
                        className="flex flex-1 flex-col items-center gap-1"
                      >
                        <div
                          className="flex w-full items-end justify-center"
                          style={{ height: "80px" }}
                          title={`${s.totalTokens} tokens`}
                        >
                          <div
                            className="w-full rounded-t bg-primary-500/80 transition-all hover:bg-primary-500 dark:bg-primary-400/80 dark:hover:bg-primary-400"
                            style={{
                              height: `${Math.max(2, heightPct)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-dark-400">
                          {formatDate(s.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </div>
      </ScrollShadow>
    </div>
  );
}

export default UsagePanel;
