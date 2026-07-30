// Import Dependencies
import clsx from "clsx";
import { GiftIcon, SparklesIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { SubscriptionPlan, Subscription } from "@/types/lms";

// ----------------------------------------------------------------------

export interface SubscriptionCardProps {
  /** Plan to render. */
  plan: SubscriptionPlan;
  /** The viewer's current subscription for this plan, if any. */
  currentSubscription?: Subscription;
  /** Subscribe CTA handler. Receives the plan id. */
  onSubscribe?: (planId: string) => void;
  /** Cancel CTA handler. Receives the subscription id. */
  onCancel?: (subId: string) => void;
  /** Resume CTA handler. Receives the subscription id. */
  onResume?: (subId: string) => void;
  /** ISO 4217 currency code (overrides `plan.currency`). */
  currency?: string;
  /** Highlight this plan (e.g. "Most Popular"). */
  featured?: boolean;
  /** Disable the CTA button (e.g. during a subscribe mutation). */
  loading?: boolean;
  /** Extra classes on the root Card. */
  className?: string;
}

const INTERVAL_LABELS: Record<SubscriptionPlan["billingInterval"], string> = {
  monthly: "/mo",
  quarterly: "/quarter",
  annual: "/yr",
};

const PLAN_TYPE_LABELS: Record<SubscriptionPlan["planType"], string> = {
  course: "Single Course",
  bundle: "Bundle",
  category: "Category",
  full_site: "Full Site",
};

/**
 * Formats an ISO date string as a short locale date.
 */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Determines the primary CTA for the card based on the viewer's
 * current subscription state.
 *
 *  - no subscription   → "Subscribe" (calls `onSubscribe`)
 *  - active / trialing → "Cancel"    (calls `onCancel`)
 *  - canceled          → "Resume"    (calls `onResume`)
 *  - expired / past_due → no CTA (subscription is terminal/needs admin)
 */
function resolveCta(
  sub: Subscription | undefined,
):
  | { kind: "subscribe" | "cancel" | "resume"; label: string }
  | null {
  if (!sub) {
    return { kind: "subscribe", label: "Subscribe" };
  }
  if (sub.status === "canceled") {
    return { kind: "resume", label: "Resume" };
  }
  if (sub.status === "active" || sub.status === "trialing") {
    return { kind: "cancel", label: "Cancel" };
  }
  return null;
}

/**
 * Pricing-card for a subscription plan.
 *
 * Renders the plan name, description, price (with billing interval suffix),
 * trial-days pill when present, the plan-type badge, the current period
 * end-date for active subscriptions, and a primary CTA whose label/handler
 * adapts to the viewer's subscription state.
 */
export function SubscriptionCard({
  plan,
  currentSubscription,
  onSubscribe,
  onCancel,
  onResume,
  currency,
  featured = false,
  loading = false,
  className,
}: SubscriptionCardProps) {
  const cur = currency ?? plan.currency ?? "USD";
  const cta = resolveCta(currentSubscription);
  const showTrial = (plan.trialDays ?? 0) > 0;
  const isFeatured = featured || plan.planType === "full_site";

  return (
    <Card
      skin="shadow"
      className={clsx(
        "relative flex w-full flex-col overflow-hidden p-5",
        isFeatured &&
          "ring-2 ring-primary-500/40 dark:ring-primary-400/40",
        className,
      )}
    >
      {isFeatured && (
        <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-lg bg-primary-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-primary-500">
          <SparklesIcon className="size-3 stroke-2" />
          Popular
        </span>
      )}

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-gray-900 dark:text-dark-50">
            {plan.name}
          </h3>
          {plan.description && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-dark-300">
              {plan.description}
            </p>
          )}
        </div>
        <Badge color="info" variant="soft" className="shrink-0 text-[10px]">
          {PLAN_TYPE_LABELS[plan.planType]}
        </Badge>
      </div>

      {/* Price */}
      <div className="mb-3 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900 dark:text-dark-50">
          {formatPrice(plan.priceCents, cur)}
        </span>
        <span className="text-sm font-medium text-gray-500 dark:text-dark-300">
          {INTERVAL_LABELS[plan.billingInterval]}
        </span>
      </div>

      {/* Trial pill */}
      {showTrial && (
        <div className="mb-3 inline-flex items-center gap-1.5 self-start rounded-md bg-success-500/10 px-2 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400">
          <GiftIcon className="size-3.5 stroke-2" />
          {plan.trialDays}-day free trial
        </div>
      )}

      {/* Active subscription status */}
      {currentSubscription &&
        (currentSubscription.status === "active" ||
          currentSubscription.status === "trialing" ||
          currentSubscription.status === "canceled") && (
          <div className="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-dark-600 dark:bg-dark-700/40">
            <p className="text-gray-600 dark:text-dark-200">
              <span className="font-medium capitalize">
                {currentSubscription.status}
              </span>{" "}
              subscription
            </p>
            {currentSubscription.currentPeriodEnd && (
              <p className="mt-0.5 text-gray-500 dark:text-dark-300">
                {currentSubscription.status === "canceled"
                  ? "Ends on "
                  : "Renews on "}
                {formatDate(currentSubscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        )}

      {/* CTA */}
      <div className="mt-auto pt-2">
        {!cta && (
          <p className="rounded-md bg-gray-100 px-3 py-2 text-center text-xs text-gray-500 dark:bg-dark-600 dark:text-dark-300">
            Subscription {currentSubscription?.status ?? "unavailable"}
          </p>
        )}
        {cta?.kind === "subscribe" && (
          <Button
            color="primary"
            variant="filled"
            disabled={loading || !onSubscribe}
            onClick={() => onSubscribe?.(plan.id)}
            className="w-full text-sm"
          >
            {cta.label}
          </Button>
        )}
        {cta?.kind === "cancel" && (
          <Button
            color="error"
            variant="outlined"
            disabled={loading || !onCancel}
            onClick={() =>
              currentSubscription && onCancel?.(currentSubscription.id)
            }
            className="w-full text-sm"
          >
            {cta.label}
          </Button>
        )}
        {cta?.kind === "resume" && (
          <Button
            color="primary"
            variant="soft"
            disabled={loading || !onResume}
            onClick={() =>
              currentSubscription && onResume?.(currentSubscription.id)
            }
            className="w-full text-sm"
          >
            {cta.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default SubscriptionCard;
