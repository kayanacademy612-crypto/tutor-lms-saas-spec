// CheckoutPage — full checkout flow for the items in the cart.
//
// Layout: two columns:
//   1. Left (main)  — billing information form (name, email, address) +
//                     payment method selector (card / PayPal / wallet) with
//                     a placeholder card form.
//   2. Right (rail) — order summary (items + coupon), price breakdown, and
//                     "Complete Purchase" CTA. On success the whole page
//                     switches to a confirmation view.
//
// This screen replaces the simpler `catalog/CheckoutPage.tsx` (which only
// handles a single course) by operating on the full cart. The catalog page
// stays for backwards compatibility.
//
// No real Stripe integration yet — `handleCompletePurchase` calls
// `POST /api/lms/orders` via `lmsApi.order.create` and falls back to a mock
// order on any error so the dev flow still completes end-to-end.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CheckIcon,
  TagIcon,
  
  LockClosedIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Input, Textarea } from "@/components/ui";
import {
  CourseThumbnail,
  EmptyState,
  PriceTag,
  formatPrice,
} from "@/components/lms";
import { lmsApi } from "@/services/lms-api";
import type { Coupon, Order } from "@/types/lms";

import type { Cart } from "./mock-data";
import { TAX_RATE, PriceRow } from "./CartPage";

// ----------------------------------------------------------------------

type PaymentMethod = "card" | "paypal" | "wallet";

export interface CheckoutPageProps {
  cart: Cart | null;
  appliedCoupon: Coupon | null;
  /** Back to cart (when user clicks the back arrow). */
  onBackToCart: () => void;
  /** Called after a successful purchase — typically clears the cart. */
  onPurchaseComplete: (order: Order) => void;
  /** "View my orders" CTA on the success screen. */
  onViewOrders: () => void;
  /** "Start learning" CTA on the success screen. */
  onStartLearning: () => void;
}

export default function CheckoutPage({
  cart,
  appliedCoupon,
  onBackToCart,
  onPurchaseComplete,
  onViewOrders,
  onStartLearning,
}: CheckoutPageProps) {
  const items = cart?.items ?? [];
  const currency = cart?.currency ?? "usd";

  // Form state
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Submission state
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Price breakdown (mirrors cart)
  const subtotal = items.reduce(
    (sum, it) => sum + it.priceCents * it.quantity,
    0,
  );
  const discountCents = useMemo(() => {
    if (!appliedCoupon) return 0;
    const raw =
      appliedCoupon.discountType === "percent"
        ? Math.round((subtotal * appliedCoupon.discountValue) / 100)
        : appliedCoupon.discountValue;
    return Math.min(raw, subtotal);
  }, [appliedCoupon, subtotal]);
  const taxableBase = Math.max(subtotal - discountCents, 0);
  const taxCents = Math.round(taxableBase * TAX_RATE);
  const totalCents = taxableBase + taxCents;

  // ───────────────── Empty cart guard ─────────────────
  if (items.length === 0 && !completedOrder) {
    return (
      <Page title="Checkout">
        <div className="mx-auto max-w-3xl py-6">
          <Card className="p-4">
            <EmptyState
              icon={ShoppingCartGlyph}
              title="Nothing to check out"
              description="Your cart is empty — add a course before checking out."
              actionLabel="Back to cart"
              onAction={onBackToCart}
            />
          </Card>
        </div>
      </Page>
    );
  }

  // ───────────────── Success state ─────────────────
  if (completedOrder) {
    return (
      <Page title="Purchase Complete">
        <div className="mx-auto flex max-w-md flex-col items-center px-5 py-12 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-success-500/10">
            <CheckCircleIcon className="size-10 text-success-500 dark:text-success-400" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-gray-800 dark:text-dark-50">
            You're enrolled!
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-dark-300">
            Your purchase is complete. A receipt has been sent to{" "}
            <span className="font-medium">
              {billingEmail || "your email"}
            </span>
            .
          </p>

          <Card skin="bordered" className="mt-6 w-full p-5 text-left">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-dark-300">
                Order number
              </span>
              <span className="font-mono text-sm font-semibold text-gray-800 dark:text-dark-50">
                {completedOrder.orderNumber}
              </span>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-dark-600">
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-dark-300">
                {completedOrder.items.length}{" "}
                {completedOrder.items.length === 1 ? "course" : "courses"}
              </p>
              <ul className="space-y-1.5">
                {completedOrder.items.slice(0, 3).map((it) => (
                  <li
                    key={it.id}
                    className="truncate text-sm text-gray-700 dark:text-dark-200"
                  >
                    · {it.title}
                  </li>
                ))}
                {completedOrder.items.length > 3 && (
                  <li className="text-xs text-gray-400 dark:text-dark-400">
                    +{completedOrder.items.length - 3} more
                  </li>
                )}
              </ul>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-dark-600">
              <span className="text-xs text-gray-500 dark:text-dark-300">
                Total paid
              </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                {formatPrice(completedOrder.totalCents, currency)}
              </span>
            </div>
          </Card>

          <div className="mt-6 flex w-full flex-col gap-2">
            <Button
              color="primary"
              variant="filled"
              className="w-full gap-2 py-2.5"
              onClick={onStartLearning}
            >
              <AcademicCapIcon className="size-5" />
              Start Learning
            </Button>
            <Button
              variant="flat"
              color="neutral"
              className="w-full gap-2 py-2.5"
              onClick={onViewOrders}
            >
              <DocumentTextIcon className="size-5" />
              View My Orders
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  // ───────────────── Checkout form ─────────────────
  const canSubmit =
    !processing &&
    method !== "wallet" && // wallet has no balance in mock
    billingEmail.trim().length > 0 &&
    billingName.trim().length > 0;

  const handleCompletePurchase = async () => {
    setSubmitError(null);
    setProcessing(true);
    try {
      // Build the `OrderCreateInput` payload from the cart.
      const orderInput = {
        items: items.map((it) => ({
          itemType: "course" as const,
          referenceId: it.courseId,
          quantity: it.quantity,
        })),
        couponCode: appliedCoupon?.code,
        paymentMethod: method,
        currency,
      };

      let order: Order;
      try {
        order = await lmsApi.order.create(orderInput);
      } catch {
        // Backend not reachable / 4xx / 5xx — synthesize a mock order so the
        // flow still completes in dev.
        order = mockOrderFromCart(items, appliedCoupon, totalCents, currency);
      }

      setCompletedOrder(order);
      onPurchaseComplete(order);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Purchase failed. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Page title="Checkout">
      {/* Header */}
      <header className="mb-6 flex items-center gap-3">
        <Button
          isIcon
          variant="flat"
          color="neutral"
          onClick={onBackToCart}
          className="size-9"
          aria-label="Back to cart"
        >
          <ArrowLeftIcon className="size-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Checkout
          </h1>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Complete your purchase securely
          </p>
        </div>
        <Badge color="success" variant="soft" className="ml-auto gap-1">
          <LockClosedIcon className="size-3.5" />
          Secure
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ───────── Left: forms ───────── */}
        <div className="space-y-6">
          {/* Billing */}
          <Card skin="bordered" className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              1. Billing information
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
              We'll send your receipt and course access details here.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                placeholder="Jane Q. Public"
                value={billingName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBillingName(e.target.value)
                }
                classNames={{ root: "sm:col-span-1" }}
              />
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={billingEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBillingEmail(e.target.value)
                }
                classNames={{ root: "sm:col-span-1" }}
              />
              <Textarea
                label="Billing address"
                rows={3}
                placeholder="123 Main St&#10;San Francisco, CA 94110&#10;United States"
                value={billingAddress}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setBillingAddress(e.target.value)
                }
                classNames={{
                  root: "sm:col-span-2",
                }}
              />
            </div>
          </Card>

          {/* Payment method */}
          <Card skin="bordered" className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              2. Payment method
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MethodTile
                active={method === "card"}
                onClick={() => setMethod("card")}
                label="Card"
                icon={<CreditCardIcon className="size-5" />}
              />
              <MethodTile
                active={method === "paypal"}
                onClick={() => setMethod("paypal")}
                label="PayPal"
                icon={<PaypalGlyph />}
              />
              <MethodTile
                active={method === "wallet"}
                onClick={() => setMethod("wallet")}
                label="Wallet"
                icon={<WalletGlyph />}
              />
            </div>

            {method === "card" && (
              <div className="mt-5 space-y-4">
                <Input
                  label="Name on card"
                  placeholder="Jane Q. Public"
                  value={cardName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCardName(e.target.value)
                  }
                />
                <Input
                  label="Card number"
                  placeholder="4242 4242 4242 4242"
                  prefix={<CreditCardIcon className="size-5" />}
                  value={cardNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCardNumber(e.target.value)
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Expiry (MM/YY)"
                    placeholder="12/27"
                    value={cardExpiry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCardExpiry(e.target.value)
                    }
                  />
                  <Input
                    label="CVC"
                    placeholder="123"
                    suffix={<LockClosedIcon className="size-4" />}
                    value={cardCvc}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCardCvc(e.target.value)
                    }
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-dark-400">
                  Placeholder form — no real card is charged in dev. Test card:{" "}
                  <span className="font-mono">4242 4242 4242 4242</span>.
                </p>
              </div>
            )}

            {method === "paypal" && (
              <div className="mt-5 rounded-md bg-info-500/5 p-4 text-sm text-info-700 dark:bg-info-500/10 dark:text-info-300">
                You'll be redirected to PayPal to complete your purchase after
                clicking <span className="font-medium">Complete Purchase</span>.
              </div>
            )}

            {method === "wallet" && (
              <div className="mt-5 rounded-md bg-warning-500/5 p-4 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
                Pay with your wallet balance.{" "}
                <span className="font-medium">Available: $0.00</span> —
                insufficient balance for this purchase.
              </div>
            )}
          </Card>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400 dark:text-dark-400">
            <span className="inline-flex items-center gap-1">
              <ShieldCheckIcon className="size-3.5" />
              256-bit SSL encryption
            </span>
            <span className="inline-flex items-center gap-1">
              <CheckIcon className="size-3.5" />
              30-day money back
            </span>
          </div>
        </div>

        {/* ───────── Right: order summary ───────── */}
        <aside>
          <Card skin="bordered" className="sticky top-6 p-5">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Order summary
            </h2>

            {/* Items */}
            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <CourseThumbnail
                    url={item.featuredImage}
                    title={item.title}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-dark-100">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                      Lifetime access · Certificate
                    </p>
                  </div>
                  <PriceTag
                    price={item.priceCents}
                    currency={currency}
                    size="sm"
                  />
                </li>
              ))}
            </ul>

            {/* Coupon display */}
            {appliedCoupon && (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-dark-600">
                <div className="flex items-center justify-between rounded-md border border-success-500/30 bg-success-500/5 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-success-700 dark:text-success-400">
                    <TagIcon className="size-4" />
                    <span className="font-mono">{appliedCoupon.code}</span>
                  </span>
                  <Badge color="success" variant="soft" className="text-[10px]">
                    −{formatPrice(discountCents, currency)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Price breakdown */}
            <dl className="mt-4 space-y-2.5 border-t border-gray-100 pt-4 text-sm dark:border-dark-600">
              <PriceRow label="Subtotal">
                {formatPrice(subtotal, currency)}
              </PriceRow>
              {discountCents > 0 && (
                <PriceRow label={`Discount (${appliedCoupon?.code})`}>
                  <span className="text-success-600 dark:text-success-400">
                    −{formatPrice(discountCents, currency)}
                  </span>
                </PriceRow>
              )}
              <PriceRow label={`Tax (${Math.round(TAX_RATE * 100)}%)`}>
                {formatPrice(taxCents, currency)}
              </PriceRow>
            </dl>

            <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4 dark:border-dark-600">
              <span className="text-sm font-medium text-gray-600 dark:text-dark-200">
                Total
              </span>
              <PriceTag
                price={totalCents}
                currency={currency}
                model="paid"
                size="lg"
              />
            </div>

            {submitError && (
              <p className="mt-3 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                {submitError}
              </p>
            )}

            <Button
              color="primary"
              variant="filled"
              className="mt-5 w-full gap-2 py-3"
              onClick={handleCompletePurchase}
              disabled={!canSubmit}
            >
              {processing ? (
                <>
                  <ArrowPathIcon className="size-5 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <LockClosedIcon className="size-5" />
                  Complete Purchase · {formatPrice(totalCents, currency)}
                </>
              )}
            </Button>

            <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-dark-400">
              By completing your purchase you agree to our Terms of Service and
              Privacy Policy.
            </p>
          </Card>
        </aside>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

/** Selectable payment-method tile. */
function MethodTile({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Button
      unstyled
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors",
        active
          ? "border-primary-500 bg-primary-500/5 text-primary-700 dark:border-primary-400 dark:bg-primary-500/10 dark:text-primary-300"
          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-500 dark:text-dark-200 dark:hover:bg-dark-700",
      )}
    >
      {icon}
      {label}
    </Button>
  );
}

/** Inline PayPal glyph (avoids an external asset). */
function PaypalGlyph() {
  return (
    <span className="text-base font-bold italic text-info-600 dark:text-info-400">
      P
    </span>
  );
}

/** Inline wallet glyph. */
function WalletGlyph() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className="size-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
      />
    </svg>
  );
}

/** Inline shopping-cart glyph (for the empty-cart EmptyState). */
function ShoppingCartGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
      />
    </svg>
  );
}

/** Build a mock `Order` from the cart when the backend create call fails. */
function mockOrderFromCart(
  items: Cart["items"],
  coupon: Coupon | null,
  totalCents: number,
  currency: string,
): Order {
  const nowIso = new Date().toISOString();
  const orderNumber = `RC-${Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0")}`;
  return {
    id: `order-mock-${Math.random().toString(36).slice(2, 10)}`,
    tenantId: "tenant-1",
    userId: "user-1",
    orderNumber,
    items: items.map((it, idx) => ({
      id: `oi-mock-${idx}`,
      itemType: "course",
      referenceId: it.courseId,
      title: it.title,
      unitPriceCents: it.priceCents,
      quantity: it.quantity,
      subtotalCents: it.priceCents * it.quantity,
    })),
    subtotalCents: items.reduce((s, it) => s + it.priceCents * it.quantity, 0),
    discountCents: coupon
      ? coupon.discountType === "percent"
        ? Math.round(
            (items.reduce((s, it) => s + it.priceCents * it.quantity, 0) *
              coupon.discountValue) /
              100,
          )
        : coupon.discountValue
      : 0,
    taxCents: Math.round(totalCents * 0.08),
    totalCents,
    currency,
    status: "paid",
    couponCode: coupon?.code,
    paymentMethod: "card",
    paidAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
