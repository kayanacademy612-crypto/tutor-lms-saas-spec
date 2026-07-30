// EarningsPage — instructor earnings + payouts dashboard.
//
// Layout:
//   - 4 summary StatCards (total / available / pending / paid out).
//   - Simple CSS bar chart of monthly net revenue.
//   - Two-column body:
//       1. Left  — "Earnings by course" table (course, enrollments, gross,
//                  your share).
//       2. Right — Withdrawal request form (amount + method) on top, then
//                  payout history list below.
//
// Backend calls:
//   - `GET /api/lms/instructor/earnings` (via fetchEarnings, falls back to
//     mock) — returns the `EarningsSummary` shape.
//   - `GET /api/lms/instructor/payouts` (via fetchPayouts, falls back to
//     mock) — returns `InstructorPayout[]`.
//   - `POST /api/lms/instructor/payouts` (via lmsApi.payout.create, falls
//     back to a synthesized local payout).

// Import Dependencies
import { useEffect, useState } from "react";
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
import { lmsApi } from "@/services/lms-api";
import type { InstructorPayout } from "@/types/lms";

import {
  fetchEarnings,
  fetchPayouts,
  payoutStatusMeta,
  type EarningsSummary,
} from "./mock-data";

// ----------------------------------------------------------------------

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [payouts, setPayouts] = useState<InstructorPayout[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, p] = await Promise.all([fetchEarnings(), fetchPayouts()]);
      setEarnings(e);
      setPayouts(p);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // ───────────────── Loading ─────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <EarningsHeader />
        <Card className="p-4">
          <LoadingState message="Loading your earnings…" />
        </Card>
      </div>
    );
  }

  // ───────────────── Error ─────────────────
  if (error || !earnings || !payouts) {
    return (
      <div className="space-y-6">
        <EarningsHeader />
        <Card className="p-4">
          <ErrorState error={error ?? "Unable to load earnings."} onRetry={load} />
        </Card>
      </div>
    );
  }

  const currency = earnings.currency ?? "usd";

  // ───────────────── Main view ─────────────────
  return (
    <div className="space-y-6">
      <EarningsHeader />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CurrencyDollarIcon}
          value={formatPrice(earnings.totalCents, currency)}
          label="Total earnings"
          color="primary"
          trend={{ value: 12.4, label: "vs last year" }}
        />
        <StatCard
          icon={BanknotesIcon}
          value={formatPrice(earnings.availableCents, currency)}
          label="Available for withdrawal"
          color="success"
        />
        <StatCard
          icon={ClockIcon}
          value={formatPrice(earnings.pendingCents, currency)}
          label="Pending clearance"
          color="warning"
        />
        <StatCard
          icon={CheckBadgeIcon}
          value={formatPrice(earnings.paidOutCents, currency)}
          label="Paid out"
          color="info"
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={earnings.monthly} currency={currency} />

      {/* Two-column body */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Earnings by course */}
        <CourseEarningsTable summary={earnings} currency={currency} />

        {/* Withdrawal + history */}
        <aside className="space-y-6">
          <WithdrawalForm
            availableCents={earnings.availableCents}
            currency={currency}
            onSubmit={async (amountCents, method) => {
              let payout: InstructorPayout;
              try {
                payout = await lmsApi.payout.create({
                  instructorId: "instr-1",
                  periodStart: new Date(Date.now() - 30 * 86_400_000)
                    .toISOString()
                    .slice(0, 10),
                  periodEnd: new Date().toISOString().slice(0, 10),
                  paymentMethod: method,
                  notes: `Withdrawal request — ${formatPrice(
                    amountCents,
                    currency,
                  )}`,
                });
              } catch {
                // Backend not reachable — synthesize a local pending payout.
                const nowIso = new Date().toISOString();
                payout = {
                  id: `payout-local-${Math.random()
                    .toString(36)
                    .slice(2, 10)}`,
                  tenantId: "tenant-1",
                  instructorId: "instr-1",
                  periodStart: nowIso,
                  periodEnd: nowIso,
                  grossCents: amountCents,
                  commissionPct: 0,
                  commissionCents: 0,
                  feeCents: 0,
                  netCents: amountCents,
                  currency,
                  status: "pending",
                  paymentMethod: method,
                  createdAt: nowIso,
                  updatedAt: nowIso,
                };
              }
              setPayouts((prev) => (prev ? [payout, ...prev] : [payout]));
              // Reflect the withdrawal in the available balance.
              setEarnings((prev) =>
                prev
                  ? {
                      ...prev,
                      availableCents: Math.max(
                        prev.availableCents - amountCents,
                        0,
                      ),
                      pendingCents: prev.pendingCents + amountCents,
                    }
                  : prev,
              );
            }}
          />

          <PayoutHistory payouts={payouts} currency={currency} />
        </aside>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function EarningsHeader() {
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
        onClick={() => {
          // Placeholder — would export a CSV / PDF statement.
          window.alert("Statement export isn't wired up yet.");
        }}
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
  data: EarningsSummary["monthly"];
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.revenueCents), 1);
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
          Last 12 months
        </span>
      </div>

      {/* CSS bar chart */}
      <div className="flex h-44 items-end gap-1.5 sm:gap-2">
        {data.map((d) => {
          const heightPct = Math.max((d.revenueCents / max) * 100, 2);
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
                  {formatPrice(d.revenueCents, currency)}
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

function CourseEarningsTable({
  summary,
  currency,
}: {
  summary: EarningsSummary;
  currency: string;
}) {
  if (summary.byCourse.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={CurrencyDollarIcon}
          title="No course earnings yet"
          description="Once students enroll in your paid courses, per-course revenue will appear here."
        />
      </Card>
    );
  }

  return (
    <Card skin="bordered" className="overflow-hidden">
      <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          Earnings by course
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:text-dark-300">
              <th className="px-4 py-3 font-semibold">Course</th>
              <th className="px-4 py-3 text-right font-semibold">Enrollments</th>
              <th className="px-4 py-3 text-right font-semibold">Gross</th>
              <th className="px-4 py-3 text-right font-semibold">Your share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {summary.byCourse.map((row) => (
              <tr
                key={row.courseId}
                className="hover:bg-gray-50 dark:hover:bg-dark-700"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800 dark:text-dark-100">
                    {row.courseTitle}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-400">
                    Commission: {row.commissionPct}%
                  </p>
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-dark-200">
                  {row.enrollments.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-gray-700 dark:text-dark-200">
                  {formatPrice(row.grossCents, currency)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-success-600 dark:text-success-400">
                  {formatPrice(row.netCents, currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-100 bg-gray-50 dark:border-dark-600 dark:bg-dark-700">
              <td className="px-4 py-3 font-semibold text-gray-800 dark:text-dark-50">
                Total
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-dark-50">
                {summary.byCourse
                  .reduce((s, r) => s + r.enrollments, 0)
                  .toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-dark-50">
                {formatPrice(
                  summary.byCourse.reduce((s, r) => s + r.grossCents, 0),
                  currency,
                )}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-success-600 dark:text-success-400">
                {formatPrice(
                  summary.byCourse.reduce((s, r) => s + r.netCents, 0),
                  currency,
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function WithdrawalForm({
  availableCents,
  currency,
  onSubmit,
}: {
  availableCents: number;
  currency: string;
  onSubmit: (amountCents: number, method: string) => Promise<void> | void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
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

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
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
          label="Amount (USD)"
          type="number"
          step="0.01"
          min="0"
          placeholder="100.00"
          prefix={<CurrencyDollarIcon className="size-5" />}
          value={amount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setAmount(e.target.value)
          }
          error={formError ?? undefined}
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

function PayoutHistory({
  payouts,
  currency,
}: {
  payouts: InstructorPayout[];
  currency: string;
}) {
  if (payouts.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={BanknotesIcon}
          title="No payouts yet"
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
          Payout history
        </h2>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-dark-600">
        {payouts.map((p) => {
          const meta = payoutStatusMeta(p.status);
          const date = new Date(p.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          return (
            <li key={p.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(p.netCents, currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                    {date} · {p.paymentMethod ?? "bank_transfer"}
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
              {p.paymentRef && (
                <p className="mt-1 truncate font-mono text-[10px] text-gray-400 dark:text-dark-400">
                  {p.paymentRef}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
