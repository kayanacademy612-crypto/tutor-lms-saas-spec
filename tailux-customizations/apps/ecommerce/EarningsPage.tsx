// EarningsPage — instructor earnings + withdrawals dashboard.
//
// Layout:
//   - 4 summary StatCards (total / available / pending / withdrawn).
//   - Simple CSS bar chart of monthly net revenue (from `monthlySeries`).
//   - Two-column body:
//       1. Left  — "Statements" table — instructor ledger entries.
//       2. Right — Withdrawal request form (amount + method) on top, then
//                  withdrawal history list below.
//
// Backend:
//   - `useEarningsSummary()`     → EarningsSummary (4 stats + monthlySeries)
//   - `useEarningsStatements()`  → RevenueLedgerEntry[] (statements table)
//   - `useWithdrawals()`         → WithdrawalRequest[] (history)
//   - `useRequestWithdrawal()`   → POST /instructor/withdrawals

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ClockIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  StatCard,
  EmptyState,
  LoadingState,
  ErrorState,
  formatPrice,
} from "@/components/lms";
import {
  useEarningsSummary,
  useEarningsStatements,
  useWithdrawals,
  useRequestWithdrawal,
} from "@/hooks/useEcommerce";
import type {
  EarningsSummary,
  RevenueLedgerEntry,
  WithdrawalRequest,
  WithdrawalStatus,
} from "@/types/lms";

// ----------------------------------------------------------------------

export default function EarningsPage() {
  const summary = useEarningsSummary();
  const statements = useEarningsStatements();
  const withdrawals = useWithdrawals();
  const requestWithdrawal = useRequestWithdrawal();

  const loading = summary.loading || statements.loading || withdrawals.loading;
  const anyError =
    summary.error || statements.error || withdrawals.error;
  const anyData =
    !!summary.data || !!statements.data || !!withdrawals.data;

  // ───────────────── Loading ─────────────────
  if (loading && !anyData) {
    return (
      <div className="space-y-6">
        <EarningsHeader onExport={() => {}} />
        <Card className="p-4">
          <LoadingState message="Loading your earnings…" />
        </Card>
      </div>
    );
  }

  // ───────────────── Error ─────────────────
  if (anyError && !anyData) {
    return (
      <div className="space-y-6">
        <EarningsHeader onExport={() => {}} />
        <Card className="p-4">
          <ErrorState
            error={anyError}
            onRetry={() => {
              summary.refetch();
              statements.refetch();
              withdrawals.refetch();
            }}
          />
        </Card>
      </div>
    );
  }

  const earnings = summary.data;
  const currency = earnings?.currency ?? "usd";

  // ───────────────── Main view ─────────────────
  return (
    <div className="space-y-6">
      <EarningsHeader
        onExport={() => {
          // Stub — CSV export lands with the statements API.
          window.alert("Statement export isn't wired up yet.");
        }}
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CurrencyDollarIcon}
          value={formatPrice(earnings?.totalEarningsCents ?? 0, currency)}
          label="Total earnings"
          color="primary"
          trend={
            earnings?.growthPercent
              ? {
                  value: earnings.growthPercent,
                  label: "vs last month",
                }
              : undefined
          }
        />
        <StatCard
          icon={BanknotesIcon}
          value={formatPrice(earnings?.availableBalanceCents ?? 0, currency)}
          label="Available for withdrawal"
          color="success"
        />
        <StatCard
          icon={ClockIcon}
          value={formatPrice(earnings?.pendingBalanceCents ?? 0, currency)}
          label="Pending clearance"
          color="warning"
        />
        <StatCard
          icon={CheckBadgeIcon}
          value={formatPrice(earnings?.totalWithdrawnCents ?? 0, currency)}
          label="Withdrawn to date"
          color="info"
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart
        data={earnings?.monthlySeries ?? []}
        currency={currency}
      />

      {/* Two-column body */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Statements */}
        <StatementsTable
          entries={statements.data ?? []}
          loading={statements.loading}
          error={statements.error}
          onRetry={statements.refetch}
          currency={currency}
        />

        {/* Withdrawal + history */}
        <aside className="space-y-6">
          <WithdrawalForm
            availableCents={earnings?.availableBalanceCents ?? 0}
            currency={currency}
            submitting={requestWithdrawal.loading}
            submitError={requestWithdrawal.error?.message}
            onSubmit={async (amountCents, method) => {
              const result = await requestWithdrawal.mutate({
                amountCents,
                paymentMethod: method,
              });
              if (result) {
                // Refresh both the summary (available balance) and the
                // withdrawals history so the new request shows up.
                summary.refetch();
                withdrawals.refetch();
              }
            }}
          />

          <WithdrawalHistory
            withdrawals={withdrawals.data ?? []}
            loading={withdrawals.loading}
            error={withdrawals.error}
            onRetry={withdrawals.refetch}
            currency={currency}
          />
        </aside>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function EarningsHeader({ onExport }: { onExport: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
          <CurrencyDollarIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Earnings
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Track your revenue, request withdrawals, and review payouts.
          </p>
        </div>
      </div>
      <Button
        variant="outlined"
        color="neutral"
        className="gap-1.5"
        onClick={onExport}
      >
        <ArrowDownTrayIcon className="size-4" />
        <span className="hidden sm:inline">Export statement</span>
      </Button>
    </header>
  );
}

function RevenueChart({
  data,
  currency,
}: {
  data: EarningsSummary["monthlySeries"];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <Card skin="bordered" className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ArrowTrendingUpIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Monthly net revenue
          </h2>
        </div>
        <EmptyState
          icon={ArrowTrendingUpIcon}
          title="No revenue data yet"
          description="Once students enroll in your paid courses, monthly revenue will appear here."
          compact
        />
      </Card>
    );
  }

  const max = Math.max(...data.map((d) => d.earningsCents), 1);
  return (
    <Card skin="bordered" className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="size-5 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Monthly net revenue
          </h2>
        </div>
        <span className="text-xs text-gray-500 dark:text-dark-300">
          Last {data.length} months
        </span>
      </div>

      {/* CSS bar chart */}
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((d) => {
          const heightPct = Math.max((d.earningsCents / max) * 100, 2);
          return (
            <div
              key={d.month}
              className="group relative flex flex-1 flex-col items-center gap-1"
            >
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-primary-500 to-primary-400 transition-all group-hover:from-primary-600 group-hover:to-primary-500 dark:from-primary-600 dark:to-primary-500"
                  style={{ height: `${heightPct}%` }}
                />
                {/* Tooltip on hover */}
                <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 shadow group-hover:opacity-100 dark:bg-dark-800">
                  {formatPrice(d.earningsCents, currency)}
                </div>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-dark-400">
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StatementsTable({
  entries,
  loading,
  error,
  onRetry,
  currency,
}: {
  entries: RevenueLedgerEntry[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  currency: string;
}) {
  return (
    <Card skin="bordered" className="overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          Statements
        </h2>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          Per-order ledger entries credited to your instructor account.
        </p>
      </div>

      {loading ? (
        <LoadingState inline message="Loading statements…" />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CurrencyDollarIcon}
          title="No statements yet"
          description="Once students enroll in your paid courses, per-order credits will appear here."
          compact
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:text-dark-300">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
              {entries.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 dark:hover:bg-dark-700"
                >
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-dark-200">
                    {new Date(row.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-dark-200">
                    {row.description ?? "Instructor payout"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-dark-300">
                    {row.orderId.slice(-8)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-success-600 dark:text-success-400">
                    {formatPrice(row.amountCents, row.currency ?? currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function WithdrawalForm({
  availableCents,
  currency,
  submitting,
  submitError,
  onSubmit,
}: {
  availableCents: number;
  currency: string;
  submitting: boolean;
  submitError?: string;
  onSubmit: (amountCents: number, method: string) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    const valueNum = Number(amount);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      setFormError("Enter a valid amount greater than zero.");
      return;
    }
    const amountCents = Math.round(valueNum * 100);
    if (amountCents > availableCents) {
      setFormError(
        `Amount exceeds your available balance (${formatPrice(
          availableCents,
          currency,
        )}).`,
      );
      return;
    }

    try {
      await onSubmit(amountCents, method);
      setSuccess(true);
      setAmount("");
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Withdrawal request failed. Please try again.",
      );
    }
  };

  return (
    <Card skin="bordered" className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <BuildingLibraryIcon className="size-5 text-primary-500" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          Request withdrawal
        </h2>
      </div>

      <div className="mb-4 rounded-md bg-primary-500/5 px-3 py-2 text-xs text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
        Available balance:{" "}
        <span className="font-semibold">
          {formatPrice(availableCents, currency)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={`Amount (${currency.toUpperCase()})`}
          type="number"
          step="0.01"
          min="0"
          placeholder="100.00"
          prefix={<CurrencyDollarIcon className="size-5" />}
          value={amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAmount(e.target.value)
          }
          error={formError ?? submitError ?? undefined}
        />
        <Select
          label="Payout method"
          value={method}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setMethod(e.target.value)
          }
          data={[
            { value: "bank_transfer", label: "Bank transfer (ACH)" },
            { value: "paypal", label: "PayPal" },
            { value: "stripe", label: "Stripe Connect" },
            { value: "wise", label: "Wise" },
          ]}
        />
        {success && (
          <p className="rounded-md bg-success-500/10 px-3 py-2 text-xs text-success-600 dark:text-success-400">
            Withdrawal request submitted — you'll see it in your payout
            history below.
          </p>
        )}
        <Button
          type="submit"
          color="primary"
          variant="filled"
          className="w-full gap-1.5"
          disabled={submitting || availableCents <= 0}
        >
          {submitting ? (
            <>
              <ArrowPathIcon className="size-4 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <BanknotesIcon className="size-4" />
              Request withdrawal
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}

function WithdrawalHistory({
  withdrawals,
  loading,
  error,
  onRetry,
  currency,
}: {
  withdrawals: WithdrawalRequest[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  currency: string;
}) {
  if (loading) {
    return (
      <Card skin="bordered" className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Withdrawal history
          </h2>
        </div>
        <LoadingState inline message="Loading withdrawals…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card skin="bordered" className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Withdrawal history
          </h2>
        </div>
        <ErrorState error={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={BanknotesIcon}
          title="No withdrawals yet"
          description="Your withdrawal requests and completed payouts will appear here."
          compact
        />
      </Card>
    );
  }

  return (
    <Card skin="bordered" className="overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          Withdrawal history
        </h2>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-dark-600">
        {withdrawals.map((w) => {
          const meta = withdrawalStatusMeta(w.status);
          const date = new Date(w.requestedAt ?? w.createdAt).toLocaleDateString(
            undefined,
            {
              year: "numeric",
              month: "short",
              day: "numeric",
            },
          );
          return (
            <li key={w.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(w.amountCents, w.currency ?? currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                    {date} · {w.paymentMethod ?? "bank_transfer"}
                  </p>
                </div>
                <Badge
                  color={meta.color}
                  variant="soft"
                  className={clsx("text-[10px]")}
                >
                  {meta.label}
                </Badge>
              </div>
              {w.paymentRef && (
                <p className="mt-1 truncate font-mono text-[10px] text-gray-400 dark:text-dark-400">
                  {w.paymentRef}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * Maps a `WithdrawalStatus` to a tailux Badge color + label.
 */
function withdrawalStatusMeta(
  status: WithdrawalStatus,
): { color: "success" | "warning" | "error" | "neutral" | "info"; label: string } {
  switch (status) {
    case "paid":
      return { color: "success", label: "Paid" };
    case "approved":
      return { color: "info", label: "Approved" };
    case "pending":
      return { color: "warning", label: "Pending" };
    case "rejected":
      return { color: "error", label: "Rejected" };
    case "failed":
      return { color: "error", label: "Failed" };
    default:
      return { color: "neutral", label: status };
  }
}
