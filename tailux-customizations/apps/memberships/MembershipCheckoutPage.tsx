// Membership checkout page — `apps/memberships/checkout/:planId` route.
//
// Layout: single column with a 2-column body (main + rail).
//
//   Main:
//     - Billing info form (name, email, address)
//     - Payment method selector (radio group: card / PayPal / wallet —
//       populated from `useGateways()` when available, with sensible
//       fallbacks)
//
//   Rail:
//     - Plan summary (name, price, interval, trial badge, included courses)
//     - "Complete Purchase" CTA → adds membership to cart, then calls
//       `useCheckout()` with the billing info
//     - On success → confirmation view with "Go to learning" / "View
//       membership" CTAs
//
// The page resolves the membership by `planId` from `lmsApi.membership.list()`
// (the API does not expose a single-membership GET yet).

// Import Dependencies
import { ComponentType, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  CheckIcon,
  CreditCardIcon,
  WalletIcon,
  BanknotesIcon,
  LockClosedIcon,
  CheckCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Input, Textarea, ScrollShadow } from "@/components/ui";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  formatPrice,
} from "@/components/lms";
import { lmsApi } from "@/services/lms-api";
import type { LmsApiError } from "@/services/lms-api";
import {
  useGateways,
  useAddToCart,
  useCheckout,
} from "@/hooks/useEcommerce";
import type {
  Membership,
  MembershipBillingInterval,
  PaymentGatewayConfig,
} from "@/types/lms";

// ----------------------------------------------------------------------

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

// Built-in fallback gateways shown when the tenant hasn't configured any.
const FALLBACK_GATEWAYS: Array<{
  gateway: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    gateway: "stripe",
    label: "Credit / Debit Card",
    icon: CreditCardIcon,
    description: "Visa, Mastercard, Amex via Stripe",
  },
  {
    gateway: "paypal",
    label: "PayPal",
    icon: WalletIcon,
    description: "Pay with your PayPal balance",
  },
  {
    gateway: "manual",
    label: "Bank Transfer",
    icon: BanknotesIcon,
    description: "Manual transfer — access granted on clearance",
  },
];

// ----------------------------------------------------------------------

export default function MembershipCheckoutPage() {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();

  // ───────── Membership (catalog) ─────────
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);

  // ───────── Gateways ─────────
  const { data: gatewaysData } = useGateways();

  // ───────── Mutations ─────────
  const { mutate: addToCart, loading: adding } = useAddToCart();
  const {
    mutate: checkout,
    loading: checkingOut,
    error: checkoutError,
  } = useCheckout();

  // ───────── Form state ─────────
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<string>("stripe");
  const [confirmed, setConfirmed] = useState(false);

  // ───────── Load membership ─────────

  const loadMembership = async () => {
    if (!planId) {
      setError({ message: "Missing plan id." } as LmsApiError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.membership.list();
      const list = Array.isArray(result) ? result : [];
      const found = list.find((m) => m.id === planId) ?? null;
      setMembership(found);
      if (!found) {
        setError({ message: "Membership plan not found." } as LmsApiError);
      }
    } catch (err) {
      setError(err as LmsApiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMembership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  // Resolve the available gateways (use the tenant config when present,
  // otherwise fall back to the built-in list).
  const gateways = useMemo<PaymentGatewayConfig[]>(() => {
    return (gatewaysData ?? []).filter((g) => g.isEnabled);
  }, [gatewaysData]);

  const gatewayOptions =
    gateways.length > 0
      ? gateways.map((g) => {
          const fallback = FALLBACK_GATEWAYS.find(
            (f) => f.gateway === g.gateway,
          );
          return {
            gateway: g.gateway,
            label:
              g.gateway.charAt(0).toUpperCase() +
              g.gateway.slice(1) +
              (g.isDefault ? " (default)" : ""),
            icon: fallback?.icon ?? CreditCardIcon,
            description: fallback?.description ?? `${g.gateway} payment`,
          };
        })
      : FALLBACK_GATEWAYS;

  // ───────── Submit ─────────

  const handleSubmit = async () => {
    if (!membership) return;
    // 1. Add the membership to the cart.
    const cart = await addToCart({
      itemType: "membership",
      referenceId: membership.id,
    });
    if (!cart) return;
    // 2. Initiate checkout.
    const result = await checkout({
      paymentGateway: selectedGateway,
      billingName: billingName.trim() || undefined,
      billingEmail: billingEmail.trim() || undefined,
      billingAddress: billingAddress.trim() || undefined,
    });
    if (result) {
      setConfirmed(true);
    }
    // If a hosted payment URL was returned, redirect the user.
    if (result?.paymentUrl) {
      window.location.href = result.paymentUrl;
    }
  };

  // ───────── Render ─────────

  const currency = (membership?.currency ?? "USD").toUpperCase();
  const canSubmit =
    billingName.trim().length > 0 &&
    billingEmail.trim().length > 0 &&
    !adding &&
    !checkingOut;

  return (
    <Page title="Membership Checkout">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-9"
              onClick={() => navigate("/apps/memberships")}
              aria-label="Back to memberships"
            >
              <ArrowLeftIcon className="size-5 stroke-2" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Membership Checkout
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {membership
                  ? `Subscribing to ${membership.name}`
                  : "Loading plan…"}
              </p>
            </div>
          </div>
          <Badge color="success" variant="soft" className="gap-1">
            <LockClosedIcon className="size-3.5 stroke-2" />
            Secure checkout
          </Badge>
        </header>

        {/* Body */}
        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            {loading ? (
              <LoadingState message="Loading plan…" />
            ) : error ? (
              <ErrorState
                error={error}
                onRetry={loadMembership}
                retryLabel="Try again"
              />
            ) : !membership ? (
              <EmptyState
                icon={SparklesIcon}
                title="Plan not found"
                description="This membership plan may have been removed."
                actionLabel="Browse memberships"
                onAction={() => navigate("/apps/memberships")}
              />
            ) : confirmed ? (
              <ConfirmationView
                membership={membership}
                onGoToMembership={() => navigate("/apps/memberships")}
                onGoToLearning={() => navigate("/apps/learning-area")}
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* ───────── Main column ───────── */}
                <div className="space-y-6">
                  {/* Billing info form */}
                  <Card skin="bordered" className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                        Billing information
                      </h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Full name"
                        placeholder="Jane Doe"
                        value={billingName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBillingName(e.target.value)
                        }
                        classNames={{ root: "sm:col-span-1" }}
                      />
                      <Input
                        label="Email"
                        type="email"
                        placeholder="jane@example.com"
                        value={billingEmail}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBillingEmail(e.target.value)
                        }
                        classNames={{ root: "sm:col-span-1" }}
                      />
                      <Textarea
                        label="Billing address (optional)"
                        placeholder="Street, City, ZIP, Country"
                        rows={3}
                        value={billingAddress}
                        onChange={(
                          e: React.ChangeEvent<HTMLTextAreaElement>,
                        ) => setBillingAddress(e.target.value)}
                        classNames={{ root: "sm:col-span-2" }}
                      />
                    </div>
                  </Card>

                  {/* Payment method */}
                  <Card skin="bordered" className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                        Payment method
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {gatewayOptions.map((opt) => {
                        const isSelected = opt.gateway === selectedGateway;
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.gateway}
                            type="button"
                            onClick={() => setSelectedGateway(opt.gateway)}
                            className={clsx(
                              "flex w-full items-center gap-3 rounded-md border p-3 text-left transition-colors",
                              isSelected
                                ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                                : "border-gray-200 hover:border-gray-300 dark:border-dark-500 dark:hover:border-dark-400",
                            )}
                          >
                            <div
                              className={clsx(
                                "flex size-9 shrink-0 items-center justify-center rounded-md",
                                isSelected
                                  ? "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400"
                                  : "bg-gray-100 text-gray-500 dark:bg-dark-500 dark:text-dark-300",
                              )}
                            >
                              <Icon className="size-5 stroke-2" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                                {opt.label}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-dark-300">
                                {opt.description}
                              </p>
                            </div>
                            <span
                              className={clsx(
                                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                                isSelected
                                  ? "border-primary-500 bg-primary-500 text-white dark:border-primary-400 dark:bg-primary-400"
                                  : "border-gray-300 dark:border-dark-500",
                              )}
                            >
                              {isSelected && (
                                <CheckIcon className="size-3 stroke-3" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Card placeholder (Stripe would mount here) */}
                    {selectedGateway === "stripe" && (
                      <div className="mt-4 rounded-md border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-dark-500 dark:bg-dark-600">
                        <p className="text-xs text-gray-500 dark:text-dark-300">
                          Card details (Stripe Elements would mount here in
                          production).
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="col-span-3 h-9 rounded border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700" />
                          <div className="col-span-2 h-9 rounded border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700" />
                          <div className="h-9 rounded border border-gray-200 bg-white dark:border-dark-500 dark:bg-dark-700" />
                        </div>
                      </div>
                    )}

                    {/* Trust line */}
                    <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-dark-400">
                      <ShieldCheckIcon className="size-4 text-success-500 dark:text-success-400" />
                      Payments are encrypted and processed securely.
                    </p>
                  </Card>
                </div>

                {/* ───────── Rail column ───────── */}
                <aside className="space-y-4">
                  {/* Plan summary */}
                  <Card skin="shadow" className="p-5">
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
                      Plan summary
                    </h4>

                    <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      {membership.name}
                    </p>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">
                        {formatPrice(membership.priceCents, currency)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-dark-300">
                        {INTERVAL_LABEL[membership.billingInterval]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
                      {INTERVAL_FULL[membership.billingInterval]}
                    </p>

                    {/* Trial badge */}
                    {membership.trialDays && membership.trialDays > 0 && (
                      <div className="mt-3">
                        <Badge color="success" variant="soft" className="gap-1">
                          <SparklesIcon className="size-3.5 stroke-2" />
                          {membership.trialDays}-day free trial
                        </Badge>
                      </div>
                    )}

                    {/* Includes */}
                    <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-dark-100">
                      <SummaryRow
                        label={
                          membership.appliesToAllCourses
                            ? "All courses included"
                            : `${membership.courseIds?.length ?? 0} courses included`
                        }
                      />
                      <SummaryRow label="New courses weekly" />
                      <SummaryRow label="Cancel anytime" />
                      <SummaryRow label="Certificates of completion" />
                    </ul>

                    {/* Divider */}
                    <div className="my-4 border-t border-gray-200 dark:border-dark-600" />

                    {/* CTA */}
                    <Button
                      color="primary"
                      variant="filled"
                      className="w-full gap-1.5 text-sm font-semibold"
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                    >
                      <LockClosedIcon className="size-4 stroke-2" />
                      {adding
                        ? "Adding to cart…"
                        : checkingOut
                          ? "Processing…"
                          : "Complete Purchase"}
                    </Button>

                    {checkoutError && (
                      <p className="mt-3 text-center text-xs text-error-500 dark:text-error-400">
                        Checkout failed — please try again or contact support.
                      </p>
                    )}

                    <p className="mt-2 text-center text-[11px] text-gray-400 dark:text-dark-400">
                      By subscribing you authorize recurring charges until
                      canceled.
                    </p>
                  </Card>

                  {/* Reassurance */}
                  <Card skin="bordered" className="p-4">
                    <div className="flex items-start gap-2">
                      <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-success-500 dark:text-success-400" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-dark-50">
                          30-day money-back guarantee
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-dark-300">
                          Not happy? Get a full refund within 30 days, no
                          questions asked.
                        </p>
                      </div>
                    </div>
                  </Card>
                </aside>
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** Confirmation view shown after a successful checkout. */
function ConfirmationView({
  membership,
  onGoToMembership,
  onGoToLearning,
}: {
  membership: Membership;
  onGoToMembership: () => void;
  onGoToLearning: () => void;
}) {
  return (
    <Card skin="shadow" className="mx-auto max-w-xl p-8 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-500/10 text-success-500 dark:bg-success-500/15 dark:text-success-400">
        <CheckCircleIcon className="size-8 stroke-2" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-dark-50">
        Welcome aboard!
      </h2>
      <p className="mt-2 text-sm text-gray-600 dark:text-dark-200">
        You&apos;re now subscribed to the{" "}
        <span className="font-semibold">{membership.name}</span> plan. Every
        course in your plan is unlocked and ready to go.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button
          color="primary"
          variant="filled"
          className="gap-1.5 text-sm font-semibold"
          onClick={onGoToLearning}
        >
          Start learning
        </Button>
        <Button
          color="neutral"
          variant="outlined"
          className="gap-1.5 text-sm font-semibold"
          onClick={onGoToMembership}
        >
          View my membership
        </Button>
      </div>
    </Card>
  );
}

/** A single summary row with a check icon. */
function SummaryRow({ label }: { label: string }) {
  return (
    <li className="flex items-start gap-2 text-gray-700 dark:text-dark-100">
      <CheckIcon className="mt-0.5 size-4 shrink-0 stroke-2 text-success-500 dark:text-success-400" />
      <span>{label}</span>
    </li>
  );
}
