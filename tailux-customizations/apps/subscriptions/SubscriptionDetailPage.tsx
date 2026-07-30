// SubscriptionDetailPage — single-subscription detail view.
//
// Shows the subscription's plan, status, billing period, recent invoices,
// and (where applicable) cancel / resume actions. Reached from
// `/apps/subscriptions/:id`.

// Import Dependencies
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import {
  useCancelSubscription,
  useInvoices,
  useResumeSubscription,
  useSubscriptionPlan,
} from "@/hooks/useEcommerce";
import { lmsApi } from "@/services/lms-api";
import type {
  Invoice,
  LmsApiError,
  Subscription,
  SubscriptionStatus,
} from "@/types/lms";

// ----------------------------------------------------------------------

const STATUS_META: Record<
  SubscriptionStatus,
  { label: string; color: "primary" | "success" | "warning" | "error" | "info" | "neutral" }
> = {
  trialing: { label: "Trialing", color: "info" },
  active: { label: "Active", color: "success" },
  past_due: { label: "Past due", color: "warning" },
  canceled: { label: "Canceled", color: "neutral" },
  expired: { label: "Expired", color: "error" },
};

// ----------------------------------------------------------------------

export default function SubscriptionDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  // Single-subscription fetch — there's no `useSubscription(id)` hook, so
  // we read it from the subscriptions list and pick by id. This keeps the
  // page robust to the available API surface (P3-A5 only exposes
  // `useSubscriptions` for the user's own subscriptions).
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(id));
  const [error, setError] = useState<LmsApiError | null>(null);

  const planQuery = useSubscriptionPlan(subscription?.planId);
  const invoiceQuery = useInvoices();
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();

  const load = async () => {
    if (!id) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await lmsApi.subscription.list();
      const arr = Array.isArray(list) ? list : (list as { data?: Subscription[] }).data ?? [];
      const found = arr.find((s) => s.id === id) ?? null;
      setSubscription(found);
    } catch (err) {
      setError(err as LmsApiError);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onCancel = async () => {
    if (!subscription) return;
    const updated = await cancelMutation.mutate(subscription.id);
    if (updated) setSubscription(updated);
  };

  const onResume = async () => {
    if (!subscription) return;
    const updated = await resumeMutation.mutate(subscription.id);
    if (updated) setSubscription(updated);
  };

  // ───────────────── Loading ─────────────────
  if (loading) {
    return (
      <Page title="Subscription details">
        <DetailShell onBack={() => navigate("/apps/subscriptions")}>
          <Card className="p-6">
            <LoadingState message="Loading subscription…" />
          </Card>
        </DetailShell>
      </Page>
    );
  }

  // ───────────────── Error ─────────────────
  if (error || !subscription) {
    return (
      <Page title="Subscription details">
        <DetailShell onBack={() => navigate("/apps/subscriptions")}>
          <Card className="p-6">
            {error ? (
              <ErrorState error={error} onRetry={load} />
            ) : (
              <EmptyState
                icon={ExclamationTriangleIcon}
                title="Subscription not found"
                description="This subscription may have been deleted or you don't have access to it."
                actionLabel="Back to subscriptions"
                onAction={() => navigate("/apps/subscriptions")}
              />
            )}
          </Card>
        </DetailShell>
      </Page>
    );
  }

  const status = STATUS_META[subscription.status] ?? STATUS_META.active;
  const isCanceled = subscription.status === "canceled";
  const currency = planQuery.data?.currency ?? "usd";
  const periodStart = new Date(subscription.currentPeriodStart).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long", day: "numeric" },
  );
  const periodEnd = new Date(subscription.currentPeriodEnd).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long", day: "numeric" },
  );
  const invoices: Invoice[] =
    (invoiceQuery.data ?? []).filter((inv) => inv.orderId) ?? [];

  return (
    <Page title="Subscription details">
      <DetailShell onBack={() => navigate("/apps/subscriptions")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left column — plan + invoices */}
          <div className="space-y-6">
            {/* Plan header card */}
            <Card skin="bordered" className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Subscription
                  </p>
                  <h1 className="mt-1 text-xl font-semibold text-gray-800 dark:text-dark-50">
                    {planQuery.data?.name ?? `Plan ${subscription.planId.slice(-8)}`}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge color={status.color} variant="soft" className="text-[11px]">
                      {status.label}
                    </Badge>
                    <span className="font-mono text-xs text-gray-400 dark:text-dark-400">
                      #{subscription.id.slice(-12)}
                    </span>
                  </div>
                </div>
                {planQuery.data && (
                  <div className="shrink-0 text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                      {formatPrice(planQuery.data.priceCents, currency.toUpperCase())}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      per {planQuery.data.billingInterval.replace("ly", "")}
                    </p>
                  </div>
                )}
              </div>

              {planQuery.data?.description && (
                <p className="mt-4 text-sm text-gray-600 dark:text-dark-200">
                  {planQuery.data.description}
                </p>
              )}
            </Card>

            {/* Billing period + usage */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card skin="bordered" className="p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                  <CalendarDaysIcon className="size-4 text-primary-500" />
                  Current period
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">Start</dt>
                    <dd className="font-medium text-gray-800 dark:text-dark-100">{periodStart}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">End</dt>
                    <dd className="font-medium text-gray-800 dark:text-dark-100">{periodEnd}</dd>
                  </div>
                  {subscription.trialEnd && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-dark-300">Trial ends</dt>
                      <dd className="font-medium text-info-600 dark:text-info-400">
                        {new Date(subscription.trialEnd).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>

              <Card skin="bordered" className="p-4">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                  <CheckCircleIcon className="size-4 text-success-500" />
                  Usage
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-dark-300">Status</dt>
                    <dd className="font-medium text-gray-800 dark:text-dark-100 capitalize">
                      {subscription.status}
                    </dd>
                  </div>
                  {subscription.retryCount != null && subscription.retryCount > 0 && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-dark-300">Renewal retries</dt>
                      <dd className="font-medium text-warning-600 dark:text-warning-400">
                        {subscription.retryCount}
                      </dd>
                    </div>
                  )}
                  {subscription.canceledAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-dark-300">Canceled on</dt>
                      <dd className="font-medium text-gray-800 dark:text-dark-100">
                        {new Date(subscription.canceledAt).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            </div>

            {/* Billing history */}
            <Card skin="bordered" className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                <DocumentTextIcon className="size-4 text-primary-500" />
                Billing history
              </h3>
              {invoiceQuery.loading ? (
                <LoadingState inline message="Loading invoices…" className="py-6" />
              ) : invoiceQuery.error ? (
                <ErrorState error={invoiceQuery.error} onRetry={invoiceQuery.refetch} />
              ) : invoices.length === 0 ? (
                <EmptyState
                  icon={DocumentTextIcon}
                  title="No invoices yet"
                  description="Invoices for this subscription will appear here."
                  compact
                />
              ) : (
                <ul className="mt-3 divide-y divide-gray-100 dark:divide-dark-600">
                  {invoices.map((inv) => {
                    const invDate = new Date(inv.createdAt).toLocaleDateString();
                    const invCurrency = inv.currency ?? "usd";
                    return (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-gray-800 dark:text-dark-100">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-dark-300">{invDate}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            color={inv.status === "paid" ? "success" : inv.status === "void" ? "neutral" : "warning"}
                            variant="soft"
                            className="text-[10px] capitalize"
                          >
                            {inv.status}
                          </Badge>
                          <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                            {formatPrice(inv.totalCents, invCurrency.toUpperCase())}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          {/* Right column — actions */}
          <aside className="space-y-4">
            <Card skin="bordered" className="sticky top-6 p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                Actions
              </h3>

              <div className="mt-3 space-y-2">
                {isCanceled ? (
                  <Button
                    color="primary"
                    variant="filled"
                    className="w-full gap-1.5 text-sm"
                    onClick={onResume}
                    disabled={resumeMutation.loading}
                  >
                    <ArrowPathIcon className="size-4" />
                    {resumeMutation.loading ? "Resuming…" : "Resume subscription"}
                  </Button>
                ) : (
                  <Button
                    color="error"
                    variant="outlined"
                    className="w-full gap-1.5 text-sm"
                    onClick={onCancel}
                    disabled={cancelMutation.loading}
                  >
                    <XMarkIcon className="size-4" />
                    {cancelMutation.loading ? "Canceling…" : "Cancel subscription"}
                  </Button>
                )}
                <Button
                  variant="flat"
                  color="neutral"
                  className="w-full gap-1.5 text-sm"
                  onClick={() => navigate("/apps/subscriptions")}
                >
                  <ArrowLeftIcon className="size-4" />
                  Back to list
                </Button>
              </div>

              {/* Status info */}
              <div
                className={clsx(
                  "mt-4 rounded-md px-3 py-2 text-xs",
                  isCanceled
                    ? "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200"
                    : "bg-success-500/10 text-success-700 dark:bg-success-500/15 dark:text-success-400",
                )}
              >
                {isCanceled ? (
                  <p>
                    This subscription was canceled. You can resume it before the current
                    period ends.
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5">
                    <ClockIcon className="size-3.5" />
                    Auto-renews on {periodEnd}
                  </p>
                )}
              </div>

              {/* Payment method */}
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-dark-600">
                <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-dark-300">
                  <CreditCardIcon className="size-3.5" />
                  Payment method
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-dark-200">
                  {subscription.stripeCustomerId
                    ? "Stripe-managed card"
                    : "Invoice / manual"}
                </p>
              </div>
            </Card>
          </aside>
        </div>
      </DetailShell>
    </Page>
  );
}

// ----------------------------------------------------------------------

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
            aria-label="Back to subscriptions"
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
              Subscription details
            </h1>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Manage plan, billing, and renewal settings.
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
