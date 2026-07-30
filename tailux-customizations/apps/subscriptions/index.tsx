// Subscriptions app — student subscription management.
//
// Self-contained 2-column layout (sidebar + content) modeled on the existing
// `apps/ecommerce` pattern. The sidebar switches between three screens:
//
//   - Active Subscriptions — the current user's subscriptions with cancel /
//     resume actions (uses `useSubscriptions` + `useCancelSubscription` +
//     `useResumeSubscription`).
//   - Available Plans      — catalog grid of subscription plans with a
//     "Subscribe" CTA (uses `useSubscriptionPlans`).
//   - Billing History      — invoices related to the user's subscriptions
//     (uses `useInvoices`).
//
// All three screens own their own loading/error/empty states. Money values
// go through `formatPrice` from `@/components/lms`.

// Import Dependencies
import { ComponentType, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  GiftIcon,
  SparklesIcon,
  TicketIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

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
} from "@/components/ui";
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
  useSubscriptionPlans,
  useSubscriptions,
} from "@/hooks/useEcommerce";
import type {
  Invoice,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from "@/types/lms";

// ----------------------------------------------------------------------

type ScreenId = "active" | "plans" | "history";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "active",
    label: "Active Subscriptions",
    icon: SparklesIcon,
    description: "Manage your current subscriptions",
  },
  {
    id: "plans",
    label: "Available Plans",
    icon: TicketIcon,
    description: "Browse and subscribe to a plan",
  },
  {
    id: "history",
    label: "Billing History",
    icon: DocumentTextIcon,
    description: "Invoices for your subscriptions",
  },
];

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

const PLAN_TYPE_LABEL: Record<SubscriptionPlan["planType"], string> = {
  course: "Single course",
  bundle: "Bundle",
  category: "Category",
  full_site: "Full site",
};

const BILLING_INTERVAL_LABEL: Record<SubscriptionPlan["billingInterval"], string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  annual: "/yr",
};

// ----------------------------------------------------------------------

export default function Subscriptions() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ScreenId>("active");

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="Subscriptions">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <SparklesIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Subscriptions
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Manage recurring access to courses and content.
              </p>
            </div>
          </div>
          <Badge color="success" variant="soft" className="gap-1">
            <span className="size-1.5 rounded-full bg-success-500" />
            Auto-renew on
          </Badge>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav
                className="space-y-1 p-3"
                aria-label="Subscriptions navigation"
              >
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

            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <GiftIcon className="size-5" />
                  <p className="text-xs font-semibold">Gift a course</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  Share the love — gift a course to a friend with a redemption code.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-primary-700 hover:bg-white text-xs"
                  onClick={() => navigate("/apps/gift-course")}
                >
                  Send a gift
                </Button>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Subscriptions</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
              <p className="hidden text-xs text-gray-400 dark:text-dark-400 sm:block">
                {activeItem.description}
              </p>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {active === "active" && <ActiveSubscriptionsScreen />}
                {active === "plans" && <AvailablePlansScreen />}
                {active === "history" && <BillingHistoryScreen />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ===========================================================================
// Screen 1 — Active Subscriptions
// ===========================================================================

function ActiveSubscriptionsScreen() {
  const { data, loading, error, refetch } = useSubscriptions();
  const cancelMutation = useCancelSubscription();
  const resumeMutation = useResumeSubscription();
  const navigate = useNavigate();

  const onCancel = async (id: string) => {
    await cancelMutation.mutate(id);
    void refetch();
  };

  const onResume = async (id: string) => {
    await resumeMutation.mutate(id);
    void refetch();
  };

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading your subscriptions…" />
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
          icon={SparklesIcon}
          title="No active subscriptions"
          description="Browse available plans to unlock recurring access to courses, bundles, and more."
          actionLabel="Browse plans"
          onAction={() => undefined}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            Active Subscriptions
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            {data.length} {data.length === 1 ? "subscription" : "subscriptions"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.map((sub) => (
          <SubscriptionCard
            key={sub.id}
            subscription={sub}
            onCancel={() => onCancel(sub.id)}
            onResume={() => onResume(sub.id)}
            onOpen={() => navigate(`/apps/subscriptions/${sub.id}`)}
            cancelLoading={cancelMutation.loading}
            resumeLoading={resumeMutation.loading}
          />
        ))}
      </div>
    </div>
  );
}

function SubscriptionCard({
  subscription,
  onCancel,
  onResume,
  onOpen,
  cancelLoading,
  resumeLoading,
}: {
  subscription: Subscription;
  onCancel: () => void;
  onResume: () => void;
  onOpen: () => void;
  cancelLoading: boolean;
  resumeLoading: boolean;
}) {
  const status = STATUS_META[subscription.status] ?? STATUS_META.active;
  const periodStart = new Date(subscription.currentPeriodStart).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" },
  );
  const periodEnd = new Date(subscription.currentPeriodEnd).toLocaleDateString(
    undefined,
    { year: "numeric", month: "short", day: "numeric" },
  );
  const isCanceled = subscription.status === "canceled";

  return (
    <Card skin="bordered" className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
              Subscription #{subscription.id.slice(-8)}
            </p>
            <Badge color={status.color} variant="soft" className="text-[10px]">
              {status.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            Plan: <span className="font-mono">{subscription.planId.slice(-12)}</span>
          </p>
        </div>
        <Button
          isIcon
          variant="flat"
          color="neutral"
          className="size-7"
          onClick={onOpen}
          aria-label="Open subscription details"
        >
          <ArrowTopRightOnSquareIcon className="size-4" />
        </Button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="flex items-center gap-1 text-gray-500 dark:text-dark-300">
            <CalendarDaysIcon className="size-3.5" />
            Current period
          </dt>
          <dd className="mt-1 font-medium text-gray-800 dark:text-dark-100">
            {periodStart} → {periodEnd}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-gray-500 dark:text-dark-300">
            <ClockIcon className="size-3.5" />
            Next billing
          </dt>
          <dd className="mt-1 font-medium text-gray-800 dark:text-dark-100">
            {isCanceled ? "—" : periodEnd}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-dark-600">
        {isCanceled ? (
          <Button
            color="primary"
            variant="soft"
            className="gap-1.5 text-xs"
            onClick={onResume}
            disabled={resumeLoading}
          >
            <ArrowPathIcon className="size-4" />
            {resumeLoading ? "Resuming…" : "Resume"}
          </Button>
        ) : (
          <Button
            color="error"
            variant="flat"
            className="gap-1.5 text-xs"
            onClick={onCancel}
            disabled={cancelLoading}
          >
            <XMarkIcon className="size-4" />
            {cancelLoading ? "Canceling…" : "Cancel"}
          </Button>
        )}
        <Button
          variant="flat"
          color="neutral"
          className="ml-auto gap-1.5 text-xs"
          onClick={onOpen}
        >
          View details
        </Button>
      </div>
    </Card>
  );
}

// ===========================================================================
// Screen 2 — Available Plans
// ===========================================================================

function AvailablePlansScreen() {
  const { data, loading, error, refetch } = useSubscriptionPlans();

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading subscription plans…" />
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
          icon={TicketIcon}
          title="No plans available"
          description="Your school hasn't published any subscription plans yet. Check back later."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Available Plans
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          Choose a plan to unlock content.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data
          .filter((p) => p.isActive)
          .map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const currency = plan.currency ?? "usd";
  const intervalLabel = BILLING_INTERVAL_LABEL[plan.billingInterval];

  return (
    <Card skin="bordered" className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-800 dark:text-dark-50">
            {plan.name}
          </h3>
          <Badge color="primary" variant="soft" className="mt-1 text-[10px]">
            {PLAN_TYPE_LABEL[plan.planType]}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900 dark:text-dark-50">
          {formatPrice(plan.priceCents, currency.toUpperCase())}
        </span>
        <span className="text-sm text-gray-500 dark:text-dark-300">
          {intervalLabel}
        </span>
      </div>

      {plan.description && (
        <p className="mt-3 line-clamp-3 text-sm text-gray-600 dark:text-dark-200">
          {plan.description}
        </p>
      )}

      {typeof plan.trialDays === "number" && plan.trialDays > 0 && (
        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-info-500/10 px-2 py-1 text-xs text-info-700 dark:bg-info-500/15 dark:text-info-300">
          <CheckCircleIcon className="size-4" />
          {plan.trialDays}-day free trial
        </div>
      )}

      <Button color="primary" variant="filled" className="mt-5 w-full gap-1.5 text-sm">
        <CurrencyDollarIcon className="size-4" />
        Subscribe
      </Button>
    </Card>
  );
}

// ===========================================================================
// Screen 3 — Billing History
// ===========================================================================

function BillingHistoryScreen() {
  const { data, loading, error, refetch } = useInvoices();

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading billing history…" />
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
          icon={DocumentTextIcon}
          title="No invoices yet"
          description="Invoices for your subscriptions will appear here once you make your first purchase."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Billing History
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          {data.length} {data.length === 1 ? "invoice" : "invoices"}
        </p>
      </div>

      <Card skin="bordered" className="overflow-hidden">
        <Table hoverable className="w-full">
          <THead>
            <Tr>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Invoice #
              </Th>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Date
              </Th>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Status
              </Th>
              <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Total
              </Th>
            </Tr>
          </THead>
          <TBody>
            {data.map((inv: Invoice) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const currency = invoice.currency ?? "usd";
  const date = new Date(invoice.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const statusColor =
    invoice.status === "paid"
      ? "success"
      : invoice.status === "void"
        ? "neutral"
        : "warning";

  return (
    <Tr className="border-t border-gray-100 dark:border-dark-600">
      <Td className="py-3 text-sm font-mono text-gray-800 dark:text-dark-100">
        {invoice.invoiceNumber}
      </Td>
      <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">{date}</Td>
      <Td className="py-3">
        <Badge color={statusColor as "success" | "neutral" | "warning"} variant="soft" className="text-[10px] capitalize">
          {invoice.status}
        </Badge>
      </Td>
      <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
        {formatPrice(invoice.totalCents, currency.toUpperCase())}
      </Td>
    </Tr>
  );
}
