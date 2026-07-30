// Payouts Admin — admin payout/withdrawal management.
//
// 2-column layout (sidebar + content) modeled on `apps/ecommerce`. The
// sidebar switches between three screens:
//
//   - Pending Approvals — table of `status=pending` withdrawals with
//     approve / reject buttons (uses `useAllWithdrawals({ status: 'pending' })`).
//   - All Withdrawals   — full table with a status filter (uses
//     `useAllWithdrawals()`).
//   - Instructor Earnings — summary cards + statements table (uses
//     `useEarningsSummary()` + `useEarningsStatements()`).
//
// Approve/Reject open small inline modals with an optional notes field.

// Import Dependencies
import { ComponentType, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Badge,
  ScrollShadow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Select,
  Textarea,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import { WithdrawalStatusBadge } from "@/components/ecommerce/WithdrawalStatusBadge";
import {
  useAllWithdrawals,
  useApproveWithdrawal,
  useEarningsStatements,
  useEarningsSummary,
  useRejectWithdrawal,
} from "@/hooks/useEcommerce";
import type {
  EarningsSummary,
  WithdrawalRequest,
  WithdrawalStatus,
} from "@/types/lms";

// ----------------------------------------------------------------------

type ScreenId = "pending" | "all" | "earnings";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "pending",
    label: "Pending Approvals",
    icon: ClockIcon,
    description: "Instructor withdrawal requests awaiting review",
  },
  {
    id: "all",
    label: "All Withdrawals",
    icon: BanknotesIcon,
    description: "Browse every withdrawal in the tenant",
  },
  {
    id: "earnings",
    label: "Instructor Earnings",
    icon: ChartBarIcon,
    description: "Aggregated earnings + statement ledger",
  },
];

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
];

// ----------------------------------------------------------------------

export default function PayoutsAdmin() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ScreenId>("pending");

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="Payouts Admin">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <BanknotesIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Payouts Admin
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Approve instructor withdrawal requests and audit earnings.
              </p>
            </div>
          </div>
          <Badge color="primary" variant="soft">Admin</Badge>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Payouts admin navigation">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => setActive(item.id)}
                      className={clsx(
                        "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-5 shrink-0 stroke-2 transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Payouts Admin</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
              <p className="hidden text-xs text-gray-400 dark:text-dark-400 sm:block">
                {activeItem.description}
              </p>
            </div>

            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-7xl px-6 py-6">
                {active === "pending" && <PendingApprovalsScreen />}
                {active === "all" && <AllWithdrawalsScreen />}
                {active === "earnings" && <InstructorEarningsScreen />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ===========================================================================
// Screen 1 — Pending Approvals
// ===========================================================================

function PendingApprovalsScreen() {
  const { data, loading, error, refetch } = useAllWithdrawals({
    status: "pending" as WithdrawalStatus,
  });
  const approveMutation = useApproveWithdrawal();
  const rejectMutation = useRejectWithdrawal();
  const navigate = useNavigate();

  const [rejectTarget, setRejectTarget] = useState<WithdrawalRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const onApprove = async (id: string) => {
    await approveMutation.mutate(id);
    void refetch();
  };

  const onConfirmReject = async () => {
    if (!rejectTarget) return;
    await rejectMutation.mutate({
      id: rejectTarget.id,
      notes: rejectNotes || undefined,
    });
    setRejectTarget(null);
    setRejectNotes("");
    void refetch();
  };

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading pending approvals…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={CheckIcon}
          title="No pending approvals"
          description="When instructors request withdrawals, they'll appear here for review."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Pending Approvals
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          {data.length} {data.length === 1 ? "request" : "requests"} awaiting review
        </p>
      </div>

      <Card skin="bordered" className="overflow-hidden">
        <WithdrawalsTable
          withdrawals={data}
          renderActions={(w) => (
            <div className="flex items-center justify-end gap-2">
              <Button
                color="success"
                variant="soft"
                className="gap-1.5 text-xs"
                onClick={() => onApprove(w.id)}
                disabled={approveMutation.loading}
              >
                <CheckIcon className="size-4" />
                Approve
              </Button>
              <Button
                color="error"
                variant="flat"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setRejectTarget(w);
                  setRejectNotes("");
                }}
              >
                <XMarkIcon className="size-4" />
                Reject
              </Button>
              <Button
                isIcon
                variant="flat"
                color="neutral"
                className="size-7"
                onClick={() => navigate(`/apps/payouts-admin/${w.id}`)}
                aria-label="View withdrawal details"
              >
                <EyeIcon className="size-4" />
              </Button>
            </div>
          )}
        />
      </Card>

      {/* Reject modal */}
      <Transition
        appear
        show={!!rejectTarget}
        as={Dialog}
        onClose={() => setRejectTarget(null)}
        className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6"
      >
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40"
        />
        <TransitionChild
          as={DialogPanel}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
          className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-soft dark:bg-dark-700"
        >
          <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
            Reject withdrawal
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Rejecting this request will return the funds to the instructor's
            balance. Add an optional note explaining the decision.
          </p>
          {rejectTarget && (
            <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-dark-600">
              <p className="text-gray-600 dark:text-dark-200">
                Instructor{" "}
                <span className="font-mono">
                  {rejectTarget.instructorId.slice(-8)}
                </span>
              </p>
              <p className="font-semibold text-gray-800 dark:text-dark-100">
                {formatPrice(
                  rejectTarget.amountCents,
                  (rejectTarget.currency ?? "usd").toUpperCase(),
                )}
              </p>
            </div>
          )}
          <Textarea
            label="Notes (optional)"
            rows={3}
            placeholder="Reason for rejection…"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="mt-4"
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => setRejectTarget(null)}
              className="text-sm"
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="filled"
              onClick={onConfirmReject}
              disabled={rejectMutation.loading}
              className="gap-1.5 text-sm"
            >
              <XMarkIcon className="size-4" />
              {rejectMutation.loading ? "Rejecting…" : "Reject withdrawal"}
            </Button>
          </div>
        </TransitionChild>
      </Transition>
    </div>
  );
}

// ===========================================================================
// Screen 2 — All Withdrawals
// ===========================================================================

function AllWithdrawalsScreen() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const params = useMemo(
    () =>
      statusFilter
        ? ({ status: statusFilter as WithdrawalStatus } as { status: WithdrawalStatus })
        : undefined,
    [statusFilter],
  );
  const { data, loading, error, refetch } = useAllWithdrawals(params);
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading withdrawals…" />
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-4">
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }
  if (!data || data.length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={BanknotesIcon}
          title="No withdrawals found"
          description="Try a different status filter or wait for instructors to request payouts."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            All Withdrawals
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            {data.length} {data.length === 1 ? "record" : "records"}
          </p>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data={STATUS_FILTER_OPTIONS}
          className="sm:max-w-[200px]"
        />
      </div>

      <Card skin="bordered" className="overflow-hidden">
        <WithdrawalsTable
          withdrawals={data}
          renderActions={(w) => (
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-7"
              onClick={() => navigate(`/apps/payouts-admin/${w.id}`)}
              aria-label="View withdrawal details"
            >
              <EyeIcon className="size-4" />
            </Button>
          )}
        />
      </Card>
    </div>
  );
}

// ===========================================================================
// Shared withdrawals table
// ===========================================================================

function WithdrawalsTable({
  withdrawals,
  renderActions,
}: {
  withdrawals: WithdrawalRequest[];
  renderActions: (w: WithdrawalRequest) => React.ReactNode;
}) {
  return (
    <Table hoverable className="w-full">
      <THead>
        <Tr>
          <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Instructor
          </Th>
          <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Requested
          </Th>
          <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Method
          </Th>
          <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Amount
          </Th>
          <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Status
          </Th>
          <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Actions
          </Th>
        </Tr>
      </THead>
      <TBody>
        {withdrawals.map((w) => {
          const currency = (w.currency ?? "usd").toUpperCase();
          const requested = new Date(w.requestedAt).toLocaleDateString();
          return (
            <Tr key={w.id} className="border-t border-gray-100 dark:border-dark-600">
              <Td className="py-3 text-sm">
                <p className="font-mono text-xs text-gray-700 dark:text-dark-200">
                  {w.instructorId.slice(-12)}
                </p>
              </Td>
              <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                {requested}
              </Td>
              <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                {w.paymentMethod ?? "—"}
              </Td>
              <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                {formatPrice(w.amountCents, currency)}
              </Td>
              <Td className="py-3">
                <WithdrawalStatusBadge status={w.status} size="sm" />
              </Td>
              <Td className="py-3">{renderActions(w)}</Td>
            </Tr>
          );
        })}
      </TBody>
    </Table>
  );
}

// ===========================================================================
// Screen 3 — Instructor Earnings
// ===========================================================================

function InstructorEarningsScreen() {
  const summaryQuery = useEarningsSummary();
  const statementsQuery = useEarningsStatements();

  if (summaryQuery.loading || statementsQuery.loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading earnings…" />
      </Card>
    );
  }

  if (summaryQuery.error) {
    return (
      <Card className="p-4">
        <ErrorState error={summaryQuery.error} onRetry={summaryQuery.refetch} />
      </Card>
    );
  }

  const summary = summaryQuery.data ?? null;
  const statements = statementsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Instructor Earnings
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          Aggregated earnings across all instructors + per-entry ledger.
        </p>
      </div>

      {/* Stat cards */}
      {summary ? (
        <EarningsStatGrid summary={summary} />
      ) : (
        <Card className="p-4">
          <EmptyState
            icon={ChartBarIcon}
            title="No earnings data yet"
            description="Earnings will appear here once instructors start making sales."
          />
        </Card>
      )}

      {/* Statements table */}
      <Card skin="bordered" className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
            Earnings statements
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Per-order ledger entries for instructor payouts.
          </p>
        </div>
        {statementsQuery.error ? (
          <ErrorState
            error={statementsQuery.error}
            onRetry={statementsQuery.refetch}
          />
        ) : statements.length === 0 ? (
          <EmptyState
            icon={ClipboardDocumentListIcon}
            title="No statements yet"
            description="Ledger entries will appear here as revenue is recorded."
            compact
          />
        ) : (
          <Table hoverable className="w-full">
            <THead>
              <Tr>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Date
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Order
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Account
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Instructor
                </Th>
                <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Amount
                </Th>
              </Tr>
            </THead>
            <TBody>
              {statements.map((s) => {
                const currency = (s.currency ?? "usd").toUpperCase();
                const date = new Date(s.createdAt).toLocaleDateString();
                return (
                  <Tr
                    key={s.id}
                    className="border-t border-gray-100 dark:border-dark-600"
                  >
                    <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                      {date}
                    </Td>
                    <Td className="py-3 font-mono text-xs text-gray-700 dark:text-dark-200">
                      {s.orderId.slice(-10)}
                    </Td>
                    <Td className="py-3">
                      <Badge
                        color={s.accountType === "instructor" ? "primary" : "neutral"}
                        variant="soft"
                        className="text-[10px] capitalize"
                      >
                        {s.accountType}
                      </Badge>
                    </Td>
                    <Td className="py-3 font-mono text-xs text-gray-700 dark:text-dark-200">
                      {s.instructorId ? s.instructorId.slice(-10) : "—"}
                    </Td>
                    <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                      {formatPrice(s.amountCents, currency)}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function EarningsStatGrid({ summary }: { summary: EarningsSummary }) {
  const currency = (summary.currency ?? "usd").toUpperCase();
  const cards = [
    {
      label: "Total earnings",
      value: formatPrice(summary.totalEarningsCents, currency),
      icon: CurrencyDollarIcon,
      color: "primary" as const,
    },
    {
      label: "Available balance",
      value: formatPrice(summary.availableBalanceCents, currency),
      icon: BanknotesIcon,
      color: "success" as const,
    },
    {
      label: "Pending balance",
      value: formatPrice(summary.pendingBalanceCents, currency),
      icon: ClockIcon,
      color: "warning" as const,
    },
    {
      label: "Total withdrawn",
      value: formatPrice(summary.totalWithdrawnCents, currency),
      icon: CheckIcon,
      color: "info" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <EarningsStatCard
          key={c.label}
          label={c.label}
          value={c.value}
          icon={c.icon}
          color={c.color}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// Inline EarningsStatCard (P3-A6 component not available — building inline).
// ----------------------------------------------------------------------

interface EarningsStatCardProps {
  label: string;
  value: React.ReactNode;
  icon: ComponentType<{ className?: string }>;
  color: "primary" | "success" | "warning" | "info" | "error" | "neutral";
}

const WELL_CLASS: Record<EarningsStatCardProps["color"], string> = {
  primary:
    "bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400",
  success:
    "bg-success-500/10 text-success-500 dark:bg-success-500/15 dark:text-success-400",
  warning:
    "bg-warning-500/10 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400",
  info: "bg-info-500/10 text-info-500 dark:bg-info-500/15 dark:text-info-400",
  error: "bg-error-500/10 text-error-500 dark:bg-error-500/15 dark:text-error-400",
  neutral:
    "bg-gray-200/70 text-gray-600 dark:bg-dark-500/50 dark:text-dark-200",
};

function EarningsStatCard({ label, value, icon: Icon, color }: EarningsStatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "flex size-11 shrink-0 items-center justify-center rounded-lg",
            WELL_CLASS[color],
          )}
        >
          <Icon className="size-5 stroke-2" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold leading-tight text-gray-900 dark:text-dark-50">
            {value}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-dark-300">
            {label}
          </p>
        </div>
      </div>
    </Card>
  );
}
