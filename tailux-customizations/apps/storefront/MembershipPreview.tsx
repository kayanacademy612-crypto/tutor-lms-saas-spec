// Storefront "Membership plans preview" section.
//
// Renders up to 3 membership tiers side by side as a pricing table preview.
// Highlights the middle plan as "Most popular" when present. CTA pushes
// to /apps/memberships for the full pricing page.

// Import Dependencies
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  CheckIcon,
  ArrowRightIcon,
  SparklesIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { Membership, MembershipBillingInterval } from "@/types/lms";

// ----------------------------------------------------------------------

export interface MembershipPreviewProps {
  /** Membership tiers to render (already active-sorted). */
  memberships: Membership[];
  /** Render skeleton placeholders when true. */
  loading?: boolean;
}

const INTERVAL_LABEL: Record<MembershipBillingInterval, string> = {
  monthly: "/mo",
  quarterly: "/quarter",
  annual: "/yr",
  lifetime: "lifetime",
};

const INTERVAL_FULL: Record<MembershipBillingInterval, string> = {
  monthly: "billed monthly",
  quarterly: "billed quarterly",
  annual: "billed annually",
  lifetime: "one-time payment",
};

/** Render 3 skeleton placeholders while the API call is pending. */
function SkeletonTiers() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-72 animate-pulse p-6" skin="bordered">
          <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-dark-500" />
          <div className="mt-4 h-9 w-2/3 rounded bg-gray-200 dark:bg-dark-500" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-gray-200 dark:bg-dark-500" />
            <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-dark-500" />
            <div className="h-3 w-3/5 rounded bg-gray-200 dark:bg-dark-500" />
          </div>
          <div className="mt-6 h-10 w-full rounded bg-gray-200 dark:bg-dark-500" />
        </Card>
      ))}
    </div>
  );
}

/**
 * Pricing-style preview of membership tiers.
 *
 * Picks up to 3 active memberships sorted by `priceCents` asc and renders
 * them as cards with a feature list derived from the membership fields
 * (billing interval, trial days, course access scope). The middle card is
 * flagged "Most popular" when there are exactly 3 tiers.
 */
export function MembershipPreview({
  memberships,
  loading = false,
}: MembershipPreviewProps) {
  const navigate = useNavigate();

  if (loading) return <SkeletonTiers />;

  const active = memberships
    .filter((m) => m.isActive)
    .sort((a, b) => a.priceCents - b.priceCents)
    .slice(0, 3);

  if (active.length === 0) return null;

  const popularIndex = active.length === 3 ? 1 : 0;

  return (
    <section className="bg-gray-50 dark:bg-dark-800">
      <div className="mx-auto max-w-7xl px-6 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
            <SparklesIcon className="size-3.5 stroke-2" />
            Memberships
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-50">
            One subscription. Unlimited learning.
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-dark-300">
            Pick a plan that fits your goals. Upgrade, downgrade, or cancel
            anytime.
          </p>
        </div>

        {/* Pricing grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((m, idx) => {
            const isPopular = idx === popularIndex;
            const currency = (m.currency ?? "USD").toUpperCase();
            return (
              <Card
                key={m.id}
                skin={isPopular ? "shadow" : "bordered"}
                className={clsx(
                  "relative flex flex-col p-6",
                  isPopular &&
                    "ring-2 ring-primary-500 dark:ring-primary-400 lg:scale-[1.02]",
                )}
              >
                {isPopular && (
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
                  {m.name}
                </h3>

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-dark-50">
                    {formatPrice(m.priceCents, currency)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-dark-300">
                    {INTERVAL_LABEL[m.billingInterval]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
                  {INTERVAL_FULL[m.billingInterval]}
                  {m.trialDays && m.trialDays > 0
                    ? ` · ${m.trialDays}-day trial`
                    : ""}
                </p>

                {/* Description */}
                {m.description && (
                  <p className="mt-4 text-sm text-gray-600 dark:text-dark-200">
                    {m.description}
                  </p>
                )}

                {/* Feature list */}
                <ul className="mt-5 space-y-2.5 text-sm">
                  <FeatureRow
                    label={
                      m.appliesToAllCourses
                        ? "Access to ALL courses"
                        : `${m.courseIds?.length ?? 0} courses included`
                    }
                  />
                  <FeatureRow label="Cancel anytime" />
                  <FeatureRow label="New courses added weekly" />
                  {m.trialDays && m.trialDays > 0 ? (
                    <FeatureRow label={`${m.trialDays}-day free trial`} />
                  ) : null}
                  <FeatureRow label="Certificates of completion" />
                </ul>

                {/* CTA */}
                <div className="mt-auto pt-6">
                  <Button
                    color={isPopular ? "primary" : "neutral"}
                    variant={isPopular ? "filled" : "outlined"}
                    className="w-full gap-1.5 text-sm font-semibold"
                    onClick={() => navigate("/apps/memberships")}
                  >
                    Choose {m.name}
                    <ArrowRightIcon className="size-4 stroke-2" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <Button
            color="primary"
            variant="flat"
            className="gap-1.5 text-sm font-semibold"
            onClick={() => navigate("/apps/memberships")}
          >
            Compare all plans
            <ArrowRightIcon className="size-4 stroke-2" />
          </Button>
        </div>
      </div>
    </section>
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

export default MembershipPreview;
