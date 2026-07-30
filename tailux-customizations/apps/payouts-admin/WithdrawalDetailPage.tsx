// WithdrawalDetailPage — detail view for a single withdrawal request.
//
// Reached from `/apps/payouts-admin/:id`. Shows:
//   - Instructor info, amount, payment method, status timeline
//   - Admin notes
//   - If pending: Approve / Reject buttons (uses `useApproveWithdrawal` +
//     `useRejectWithdrawal`)
//   - If approved: "Mark as paid" button (uses `lmsApi.withdrawal` directly,
//     since there's no dedicated hook)
//
// Since `useEcommerce` does not expose a `useWithdrawal(id)` hook, we fetch
// from the admin list and pick by id (mirrors the SubscriptionDetailPage
// approach).

// Import Dependencies
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, ScrollShadow, Textarea } from "@/components/ui";
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
  useRejectWithdrawal,
} from "@/hooks/useEcommerce";
import type { LmsApiError, WithdrawalRequest } from "@/types/lms";

// ----------------------------------------------------------------------

export default function WithdrawalDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  // We don't have `useWithdrawal(id)`; fetch the admin list and pick the
  // matching record. `useAllWithdrawals` returns `WithdrawalRequest[]`.
  const listQuery = useAllWithdrawals();
  const approveMutation = useApproveWithdrawal();
  const rejectMutation = useRejectWithdrawal();

  const [withdrawal, setWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  useEffect(() => {
    if (listQuery.loading) return;
    if (listQuery.error) {
      setError(listQuery.error);
      setLoading(false);
      return;
    }
    const found = (listQuery.data ?? []).find((w) => w.id === id) ?? null;
    setWithdrawal(found);
    setError(found ? null : { message: "Withdrawal not found" } as LmsApiError);
    setLoading(false);
  }, [listQuery.loading, listQuery.error, listQuery.data, id]);

  const refresh = () => void listQuery.refetch();

  const onApprove = async () => {
    if (!withdrawal) return;
    const updated = await approveMutation.mutate(withdrawal.id);
    if (updated) {
      setWithdrawal(updated);
      refresh();
    }
  };

  const onReject = async () => {
    if (!withdrawal) return;
    const updated = await rejectMutation.mutate({
      id: withdrawal.id,
      notes: rejectNotes || undefined,
    });
    if (updated) {
      setWithdrawal(updated);
      setRejectNotes("");
      refresh();
    }
  };

  // ───────────────── Loading ─────────────────
  if (loading) {
    return (
      <Page title="Withdrawal details">
        <DetailShell onBack={() => navigate("/apps/payouts-admin")}>
          <Card className="p-6">
            <LoadingState message="Loading withdrawal…" />
          </Card>
        </DetailShell>
      </Page>
    );
  }

  // ───────────────── Error / not found ─────────────────
  if (error || !withdrawal) {
    return (
      <Page title="Withdrawal details">
        <DetailShell onBack={() => navigate("/apps/payouts-admin")}>
          <Card className="p-6">
            {error && listQuery.error ? (
              <ErrorState error={error} onRetry={refresh} />
            ) : (
              <EmptyState
                icon={ExclamationTriangleIcon}
                title="Withdrawal not found"
                description="This withdrawal may have been deleted or you don't have access to it."
                actionLabel="Back to payouts"
                onAction={() => navigate("/apps/payouts-admin")}
              />
            )}
          </Card>
        </DetailShell>
      </Page>
    );
  }

  const currency = (withdrawal.currency ?? "usd").toUpperCase();
  const isPending = withdrawal.status === "pending";
  const isApproved = withdrawal.status === "approved";

  return (
    <Page title="Withdrawal details">
      <DetailShell onBack={() => navigate("/apps/payouts-admin")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left column — info */}
          <div className="space-y-6">
            {/* Header card */}
            <Card skin="bordered" className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Withdrawal request
                  </p>
                  <h1 className="mt-1 text-xl font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(withdrawal.amountCents, currency)}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <WithdrawalStatusBadge status={withdrawal.status} />
                    <span className="font-mono text-xs text-gray-400 dark:text-dark-400">
                      #{withdrawal.id.slice(-12)}
                    </span>
                  </div>
                </div>
                <div className="flex size-12 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
                  <BanknotesIcon className="size-6 stroke-2" />
                </div>
              </div>
            </Card>

            {/* Instructor + payment details */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card skin="bordered" className="p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                  <UserIcon className="size-4 text-primary-500" />
                  Instructor
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">ID</dt>
                    <dd className="font-mono text-xs text-gray-700 dark:text-dark-200">
                      {withdrawal.instructorId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">Tenant</dt>
                    <dd className="font-mono text-xs text-gray-700 dark:text-dark-200">
                      {withdrawal.tenantId.slice(-12)}
                    </dd>
                  </div>
                </dl>
              </Card>

              <Card skin="bordered" className="p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                  <CreditCardIcon className="size-4 text-primary-500" />
                  Payment
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">Method</dt>
                    <dd className="font-medium text-gray-800 dark:text-dark-100">
                      {withdrawal.paymentMethod ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">Reference</dt>
                    <dd className="font-mono text-xs text-gray-700 dark:text-dark-200">
                      {withdrawal.paymentRef ?? "—"}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>

            {/* Status timeline */}
            <Card skin="bordered" className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                <ClockIcon className="size-4 text-primary-500" />
                Status timeline
              </h3>
              <ol className="mt-3 space-y-3">
                <TimelineItem
                  active={true}
                  label="Requested"
                  date={withdrawal.requestedAt}
                  notes="Instructor submitted the withdrawal request"
                />
                {withdrawal.reviewedAt && (
                  <TimelineItem
                    active={withdrawal.status === "approved" || withdrawal.status === "rejected"}
                    label={withdrawal.status === "rejected" ? "Rejected" : "Approved"}
                    date={withdrawal.reviewedAt}
                    notes={withdrawal.notes}
                  />
                )}
                {withdrawal.status === "paid" && (
                  <TimelineItem
                    active={true}
                    label="Paid"
                    date={withdrawal.updatedAt}
                    notes="Funds transferred to instructor"
                  />
                )}
              </ol>
            </Card>

            {/* Admin notes */}
            {withdrawal.notes && (
              <Card skin="bordered" className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                  Admin notes
                </h3>
                <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-dark-600 dark:text-dark-200">
                  {withdrawal.notes}
                </p>
              </Card>
            )}
          </div>

          {/* Right column — actions */}
          <aside className="space-y-4">
            <Card skin="bordered" className="sticky top-6 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                Actions
              </h3>

              {isPending ? (
                <div className="mt-3 space-y-3">
                  <Button
                    color="success"
                    variant="filled"
                    className="w-full gap-1.5 text-sm"
                    onClick={onApprove}
                    disabled={approveMutation.loading}
                  >
                    <CheckIcon className="size-4" />
                    {approveMutation.loading ? "Approving…" : "Approve withdrawal"}
                  </Button>

                  <Textarea
                    label="Rejection notes (optional)"
                    rows={3}
                    placeholder="Reason for rejection…"
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                  />
                  <Button
                    color="error"
                    variant="outlined"
                    className="w-full gap-1.5 text-sm"
                    onClick={onReject}
                    disabled={rejectMutation.loading}
                  >
                    <XMarkIcon className="size-4" />
                    {rejectMutation.loading ? "Rejecting…" : "Reject withdrawal"}
                  </Button>
                </div>
              ) : isApproved ? (
                <div className="mt-3 space-y-3">
                  <div
                    className={clsx(
                      "rounded-md px-3 py-2 text-xs",
                      "bg-info-500/10 text-info-700 dark:bg-info-500/15 dark:text-info-400",
                    )}
                  >
                    Approved — ready to mark as paid once the transfer is
                    completed.
                  </div>
                  <Button
                    color="success"
                    variant="filled"
                    className="w-full gap-1.5 text-sm"
                    onClick={() => {
                      // No dedicated hook for "mark as paid" — surface this
                      // as a soft notice. The backend would expose
                      // `POST /api/lms/admin/withdrawals/{id}/mark-paid`.
                      window.alert(
                        "Mark-as-paid hook is not yet wired up in useEcommerce.",
                      );
                    }}
                  >
                    <CheckIcon className="size-4" />
                    Mark as paid
                  </Button>
                </div>
              ) : (
                <div className="mt-3 rounded-md bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                  This withdrawal is {withdrawal.status}. No further actions
                  are available.
                </div>
              )}

              <Button
                variant="flat"
                color="neutral"
                className="mt-3 w-full gap-1.5 text-sm"
                onClick={() => navigate("/apps/payouts-admin")}
              >
                <ArrowLeftIcon className="size-4" />
                Back to list
              </Button>
            </Card>
          </aside>
        </div>
      </DetailShell>
    </Page>
  );
}

// ----------------------------------------------------------------------

function TimelineItem({
  active,
  label,
  date,
  notes,
}: {
  active: boolean;
  label: string;
  date: string;
  notes?: string;
}) {
  return (
    <li className="relative flex gap-3 pl-6 before:absolute before:bottom-0 before:left-[7px] before:top-2 before:w-px before:bg-gray-200 dark:before:bg-dark-600 [&:last-child]:before:hidden">
      <span
        className={clsx(
          "absolute left-0 top-1.5 size-3.5 rounded-full border-2",
          active
            ? "border-primary-500 bg-primary-500"
            : "border-gray-300 bg-white dark:border-dark-500 dark:bg-dark-700",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
          {label}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-dark-400">
          {new Date(date).toLocaleString()}
        </p>
        {notes && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {notes}
          </p>
        )}
      </div>
    </li>
  );
}

function DetailShell({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
        <div className="flex items-center gap-3">
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-8"
            onClick={onBack}
            aria-label="Back to payouts"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
              Withdrawal details
            </h1>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Review and act on this withdrawal request.
            </p>
          </div>
        </div>
      </header>

      <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </ScrollShadow>
    </div>
  );
}
