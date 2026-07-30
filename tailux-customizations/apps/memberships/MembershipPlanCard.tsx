// MembershipPlanCard — pricing-style card for a single Membership tier.
//
// Layout (vertical):
//   - Plan name + "Most popular" / "Trial" badge row
//   - Big price + interval suffix (e.g. $29 /mo)
//   - Billing description line ("billed monthly", "30-day trial", …)
//   - Description
//   - Feature list (check icons)
//   - "Subscribe" CTA button
//
// All money values go through `formatPrice` from `@/components/lms/PriceTag`.

// Import Dependencies
import clsx from "clsx";
import {
  CheckIcon,
  ArrowRightIcon,
  StarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { Membership, MembershipBillingInterval } from "@/types/lms";

// ----------------------------------------------------------------------

export interface MembershipPlanCardProps {
  /** Membership tier to render. */
  membership: Membership;
  /** Highlight this card as the "Most popular" tier (ring + scale). */
  highlight?: boolean;
  /** Disable the subscribe button (e.g. when the user already has a sub). */
  subscribed?: boolean;
  /** Override the CTA label (defaults to "Subscribe"). */
  ctaLabel?: string;
  /** Fired when the user clicks the CTA. */
  onSubscribe?: (membership: Membership) => void;
  /** Extra classes on the root Card. */
  className?: string;
}

const INTERVAL_LABEL: Record<MembershipBillingInterval, string> = {
  monthly: "/mo",
  quarterly: "/quarter",
  annual: "/yr",
  lifetime: "",
};

const INTERVAL_FULL: Record<MembershipBillingInterval, string> = {
  monthly: "billed monthly",
  quarterly: "billed quarterly",
  annual: "billed annually",
  lifetime: "one-time payment",
};

/**
 * Pricing card for a single membership tier.
 *
 * Renders the plan name, price (with the interval suffix), billing
 * description, feature list (derived from the membership fields), and a
 * "Subscribe" CTA. The `highlight` prop adds a primary ring + scale and a
 * "Most popular" badge.
 */
export function MembershipPlanCard({
  membership,
  highlight = false,
  subscribed = false,
  ctaLabel,
  onSubscribe,
  className,
}: MembershipPlanCardProps) {
  const currency = (membership.currency ?? "USD").toUpperCase();
  const courseCount = membership.appliesToAllCourses
    ? "All courses"
    : `${membership.courseIds?.length ?? 0} courses`;

  return (
    <Card
      skin={highlight ? "shadow" : "bordered"}
      className={clsx(
        "relative flex flex-col p-6",
        highlight &&
          "ring-2 ring-primary-500 dark:ring-primary-400 lg:scale-[1.02]",
        className,
      )}
    >
      {/* Most popular badge */}
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge
            color="primary"
            variant="filled"
            className="gap-1 px-3 py-1 text-[10px] uppercase tracking-wide"
          >
            <StarIcon className="size-3 stroke-2" />
            Most popular
          </Badge>
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
        {membership.name}
      </h3>

      {/* Trial badge (when applicable) */}
      {membership.trialDays && membership.trialDays > 0 && (
        <div className="mt-2">
          <Badge color="success" variant="soft" className="gap-1 text-[10px]">
            <ClockIcon className="size-3 stroke-2" />
            {membership.trialDays}-day free trial
          </Badge>
        </div>
      )}

      {/* Price */}
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-gray-900 dark:text-dark-50">
          {formatPrice(membership.priceCents, currency)}
        </span>
        {INTERVAL_LABEL[membership.billingInterval] && (
          <span className="text-sm text-gray-500 dark:text-dark-300">
            {INTERVAL_LABEL[membership.billingInterval]}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
        {INTERVAL_FULL[membership.billingInterval]}
      </p>

      {/* Description */}
      {membership.description && (
        <p className="mt-4 text-sm text-gray-600 dark:text-dark-200">
          {membership.description}
        </p>
      )}

      {/* Feature list */}
      <ul className="mt-5 space-y-2.5 text-sm">
        <FeatureRow label={courseCount} />
        <FeatureRow label="New courses added weekly" />
        <FeatureRow label="Certificates of completion" />
        <FeatureRow label="Cancel anytime" />
        {membership.trialDays && membership.trialDays > 0 ? (
          <FeatureRow label={`${membership.trialDays}-day free trial`} />
        ) : null}
      </ul>

      {/* CTA */}
      <div className="mt-auto pt-6">
        <Button
          color={highlight ? "primary" : "neutral"}
          variant={highlight ? "filled" : "outlined"}
          className="w-full gap-1.5 text-sm font-semibold"
          onClick={() => onSubscribe?.(membership)}
          disabled={subscribed}
        >
          {subscribed
            ? "Current plan"
            : (ctaLabel ?? `Choose ${membership.name}`)}
          {!subscribed && <ArrowRightIcon className="size-4 stroke-2" />}
        </Button>
      </div>
    </Card>
  );
}

/** A single feature row with a check icon. */
function FeatureRow({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2 text-gray-700 dark:text-dark-100">
      <CheckIcon className="mt-0.5 size-4 shrink-0 stroke-2 text-success-500 dark:text-success-400" />
      <span>{label}</span>
    </li>
  );
}

export default MembershipPlanCard;
