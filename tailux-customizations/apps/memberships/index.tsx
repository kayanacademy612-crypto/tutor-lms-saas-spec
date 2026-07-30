// Memberships page — `apps/memberships` route.
//
// Layout: 2-column body (sidebar + main) modeled on the `apps/ecommerce`
// and `apps/instructor-dashboard` patterns.
//
//   Sidebar:
//     - "All Plans" / "My Membership" nav toggle (the latter only when
//       the user has an active subscription)
//     - Footer: promotional card linking to bundles
//
//   Main:
//     - "All Plans"  → monthly/annual toggle + grid of MembershipPlanCard
//     - "My Membership" → current subscription card with Manage / Cancel
//
// Data sources:
//   - Memberships (catalog) via `lmsApi.membership.list()` (no dedicated
//     useEcommerce hook exists for memberships)
//   - User subscriptions via `useSubscriptions()` (returns Subscription[])
//   - Cancellation via `useCancelSubscription()`

// Import Dependencies
import { ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  Squares2X2Icon,
  UserIcon,
  GiftIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
  formatPrice,
} from "@/components/lms";
import type { ColorType } from "@/constants/app";
import { lmsApi } from "@/services/lms-api";
import type { LmsApiError } from "@/services/lms-api";
import {
  useSubscriptions,
  useCancelSubscription,
} from "@/hooks/useEcommerce";
import type {
  Membership,
  Subscription,
  SubscriptionStatus,
} from "@/types/lms";

import { MembershipPlanCard } from "./MembershipPlanCard";

// ----------------------------------------------------------------------

type ScreenId = "all" | "mine";
type BillingFilter = "all" | "monthly" | "annual";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Only show this item when true. */
  visible: boolean;
}

// ----------------------------------------------------------------------

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
  expired: "Expired",
};

const STATUS_COLOR: Record<SubscriptionStatus, ColorType> = {
  trialing: "info",
  active: "success",
  past_due: "warning",
  canceled: "neutral",
  expired: "error",
};

// ----------------------------------------------------------------------

export default function MembershipsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ScreenId>("all");
  const [billingFilter, setBillingFilter] = useState<BillingFilter>("all");

  // ───────── Memberships (catalog) ─────────
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);

  // ───────── User's active subscriptions ─────────
  const {
    data: subsData,
    loading: subsLoading,
    error: subsError,
    refetch: refetchSubs,
  } = useSubscriptions();
  const {
    mutate: cancelSub,
    loading: cancelling,
    error: cancelError,
  } = useCancelSubscription();

  const loadMemberships = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.membership.list();
      setMemberships(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err as LmsApiError);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemberships();
  }, []);

  // Active (non-expired, non-canceled) subscriptions
  const activeSubs: Subscription[] = useMemo(() => {
    return (subsData ?? []).filter(
      (s) => s.status === "active" || s.status === "trialing" || s.status === "past_due",
    );
  }, [subsData]);

  const hasActiveSub = activeSubs.length > 0;

  const navItems: NavItem[] = [
    { id: "all", label: "All Plans", icon: Squares2X2Icon, visible: true },
    {
      id: "mine",
      label: "My Membership",
      icon: UserIcon,
      visible: hasActiveSub,
    },
  ];

  // Filter memberships by billing interval toggle
  const filteredMemberships = useMemo(() => {
    const activeMs = memberships.filter((m) => m.isActive);
    if (billingFilter === "all") return activeMs;
    return activeMs.filter((m) => m.billingInterval === billingFilter);
  }, [memberships, billingFilter]);

  // Pick the "popular" plan — middle plan by price when there are 3+ plans
  const popularIndex =
    filteredMemberships.length >= 3
      ? Math.floor(filteredMemberships.length / 2)
      : 0;

  const activeItem = navItems.find((n) => n.id === active) ?? navItems[0];

  // ───────────────── Handlers ─────────────────

  /** Subscribe CTA → go to membership checkout page for that plan. */
  const handleSubscribe = (m: Membership) => {
    navigate(`/apps/memberships/checkout/${m.id}`);
  };

  /** Cancel an active subscription. */
  const handleCancel = async (subId: string) => {
    await cancelSub(subId);
    refetchSubs();
  };

  // ───────────────── Render ─────────────────

  return (
    <Page title="Memberships">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <SparklesIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Memberships
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                One subscription. Unlimited learning.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              {filteredMemberships.length} plans
            </Badge>
            <Button
              variant="outlined"
              color="primary"
              className="gap-1.5"
              onClick={() => navigate("/apps/memberships/admin")}
            >
              <Squares2X2Icon className="size-4 stroke-2" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
          </div>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav
                className="space-y-1 p-3"
                aria-label="Memberships navigation"
              >
                {navItems
                  .filter((n) => n.visible)
                  .map((item) => {
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

            {/* Sidebar footer — bundle promo */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <GiftIcon className="size-5" />
                  <p className="text-xs font-semibold">Prefer one-time buys?</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  Browse course bundles and save up to 40% on individual
                  courses.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-primary-700 hover:bg-white text-xs"
                  onClick={() => navigate("/apps/bundles")}
                >
                  View bundles
                </Button>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Memberships</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
              {active === "all" && (
                <BillingToggle
                  value={billingFilter}
                  onChange={setBillingFilter}
                />
              )}
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-6xl px-6 py-6">
                {active === "all" ? (
                  <AllPlansScreen
                    memberships={filteredMemberships}
                    loading={loading}
                    error={error}
                    onRetry={loadMemberships}
                    onSubscribe={handleSubscribe}
                    popularIndex={popularIndex}
                    userHasActiveSub={hasActiveSub}
                  />
                ) : (
                  <MyMembershipScreen
                    subscriptions={activeSubs}
                    memberships={memberships}
                    loading={subsLoading}
                    error={subsError}
                    cancelling={cancelling}
                    cancelError={cancelError}
                    onRetry={refetchSubs}
                    onCancel={handleCancel}
                    onBrowsePlans={() => setActive("all")}
                  />
                )}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** "All Plans" screen — pricing grid. */
function AllPlansScreen({
  memberships,
  loading,
  error,
  onRetry,
  onSubscribe,
  popularIndex,
  userHasActiveSub,
}: {
  memberships: Membership[];
  loading: boolean;
  error: LmsApiError | null;
  onRetry: () => void;
  onSubscribe: (m: Membership) => void;
  popularIndex: number;
  userHasActiveSub: boolean;
}) {
  if (loading) {
    return <LoadingState message="Loading plans…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (memberships.length === 0) {
    return (
      <EmptyState
        icon={SparklesIcon}
        title="No membership plans available"
        description="The school hasn't published any membership plans yet. Check back soon or browse individual courses."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {memberships.map((m, idx) => (
        <MembershipPlanCard
          key={m.id}
          membership={m}
          highlight={idx === popularIndex}
          subscribed={userHasActiveSub}
          onSubscribe={onSubscribe}
        />
      ))}
    </div>
  );
}

/** "My Membership" screen — current subscription card. */
function MyMembershipScreen({
  subscriptions,
  memberships,
  loading,
  error,
  cancelling,
  cancelError,
  onRetry,
  onCancel,
  onBrowsePlans,
}: {
  subscriptions: Subscription[];
  memberships: Membership[];
  loading: boolean;
  error: LmsApiError | null;
  cancelling: boolean;
  cancelError: LmsApiError | null;
  onRetry: () => void;
  onCancel: (subId: string) => void;
  onBrowsePlans: () => void;
}) {
  if (loading) {
    return <LoadingState message="Loading your membership…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={UserIcon}
        title="No active membership"
        description="You don't have an active membership yet. Browse our plans to unlock every course for one flat price."
        actionLabel="Browse plans"
        onAction={onBrowsePlans}
      />
    );
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((sub) => {
        // Look up the matching membership (for plan name + price)
        const membership = memberships.find((m) => m.id === sub.planId);
        const currency = (membership?.currency ?? "USD").toUpperCase();
        const periodStart = new Date(sub.currentPeriodStart);
        const periodEnd = new Date(sub.currentPeriodEnd);
        const fmtDate = (d: Date) =>
          d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        return (
          <Card key={sub.id} skin="shadow" className="p-6">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">
                    {membership?.name ?? "Membership"}
                  </h3>
                  <Badge
                    color={STATUS_COLOR[sub.status] ?? "neutral"}
                    variant="soft"
                    className="capitalize"
                  >
                    {STATUS_LABEL[sub.status]}
                  </Badge>
                </div>
                {membership?.description && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
                    {membership.description}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-primary-600 dark:text-primary-400">
                  {membership
                    ? formatPrice(membership.priceCents, currency)
                    : "—"}
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-400">
                  {membership
                    ? `per ${membership.billingInterval}`
                    : "Plan"}
                </p>
              </div>
            </div>

            {/* Period details */}
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <InfoTile
                label="Current period"
                value={`${fmtDate(periodStart)} → ${fmtDate(periodEnd)}`}
              />
              <InfoTile
                label="Trial ends"
                value={sub.trialEnd ? fmtDate(new Date(sub.trialEnd)) : "—"}
              />
              <InfoTile
                label="Renewal"
                value={
                  sub.status === "canceled"
                    ? "Canceled"
                    : sub.status === "past_due"
                      ? "Retry pending"
                      : "Auto-renews"
                }
              />
            </div>

            {/* Canceled notice (only shown when the subscription has been canceled) */}
            {sub.canceledAt && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-warning-500/10 p-3 text-xs text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
                <XCircleIcon className="mt-0.5 size-4 shrink-0 stroke-2" />
                <span>
                  Canceled on{" "}
                  {fmtDate(new Date(sub.canceledAt))}. You&apos;ll keep access
                  until {fmtDate(periodEnd)}.
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {sub.status !== "canceled" && sub.status !== "expired" && (
                <Button
                  color="error"
                  variant="soft"
                  className="gap-1.5 text-sm font-semibold"
                  onClick={() => onCancel(sub.id)}
                  disabled={cancelling}
                >
                  <XCircleIcon className="size-4 stroke-2" />
                  {cancelling ? "Cancelling…" : "Cancel membership"}
                </Button>
              )}
              <Button
                color="neutral"
                variant="outlined"
                className="gap-1.5 text-sm font-semibold"
                onClick={onBrowsePlans}
              >
                <Squares2X2Icon className="size-4 stroke-2" />
                View all plans
              </Button>
            </div>

            {cancelError && (
              <p className="mt-3 text-xs text-error-500 dark:text-error-400">
                Couldn&apos;t cancel — please try again or contact support.
              </p>
            )}
          </Card>
        );
      })}

      {/* Support card */}
      <Card skin="bordered" className="flex items-center gap-3 p-4">
        <CheckCircleIcon className="size-5 text-success-500 dark:text-success-400" />
        <p className="text-xs text-gray-600 dark:text-dark-200">
          Need to update your payment method or change plans? Visit your{" "}
          <button
            type="button"
            className="font-semibold text-primary-600 hover:underline dark:text-primary-400"
            onClick={() => (window.location.href = "/apps/subscriptions")}
          >
            Subscriptions
          </button>{" "}
          page.
        </p>
      </Card>
    </div>
  );
}

/** Compact info tile for the membership details grid. */
function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3 dark:bg-dark-600">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
        {label}
      </p>
      <p className="mt-1 text-xs font-medium text-gray-800 dark:text-dark-50">
        {value}
      </p>
    </div>
  );
}

/** Monthly / Annual / All toggle pill. */
function BillingToggle({
  value,
  onChange,
}: {
  value: BillingFilter;
  onChange: (v: BillingFilter) => void;
}) {
  const options: Array<{ value: BillingFilter; label: string }> = [
    { value: "all", label: "All" },
    { value: "monthly", label: "Monthly" },
    { value: "annual", label: "Annual" },
  ];
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5 dark:border-dark-600 dark:bg-dark-700">
      {options.map((o) => {
        const isActive = o.value === value;
        return (
          <Button
            key={o.value}
            variant={isActive ? "filled" : "flat"}
            color={isActive ? "primary" : "neutral"}
            className={clsx(
              "h-7 px-3 text-xs font-semibold",
              !isActive &&
                "text-gray-500 hover:text-gray-800 dark:text-dark-300 dark:hover:text-dark-50",
            )}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
