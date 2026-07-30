// CheckoutPage — full checkout flow for the items in the cart.
//
// Layout: two columns:
//   1. Left (main)  — billing information form (name, email, address) +
//                     payment-method selector built from the tenant's enabled
//                     gateways (real `useGateways()`).
//   2. Right (rail) — order summary (items + coupon), price breakdown, and
//                     "Complete Purchase" CTA. On success the whole page
//                     switches to a confirmation view.
//
// Backend flow:
//   - `useCart()` (cart prop) — reads the server-owned cart.
//   - `useGateways()`         — lists enabled payment gateways for the tenant.
//   - `useCheckout()`         — `POST /api/lms/checkout` creates an order
//                                and returns a `CheckoutResult` carrying an
//                                optional `paymentUrl` (Stripe / PayPal
//                                redirect) and `clientSecret` (Stripe
//                                Elements). On `succeeded` status we display
//                                the success screen; on `requires_action` we
//                                redirect to `paymentUrl` if present.

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
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Input, Textarea } from "@/components/ui";
import {
  CourseThumbnail,
  EmptyState,
  LoadingState,
  ErrorState,
  PriceTag,
  formatPrice,
} from "@/components/lms";
import {
  useCheckout,
  useGateways,
} from "@/hooks/useEcommerce";
import type { Cart, CheckoutResult, Order } from "@/types/lms";

// ----------------------------------------------------------------------

export interface CheckoutPageProps {
  cart: Cart | null;
  cartLoading: boolean;
  cartError: unknown;
  onRetryCart: () => void;
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
  cartLoading,
  cartError,
  onRetryCart,
  onBackToCart,
  onPurchaseComplete,
  onViewOrders,
  onStartLearning,
}: CheckoutPageProps) {
  // Payment-method picker is driven by the tenant's enabled gateways.
  const { data: gateways, loading: gatewaysLoading } = useGateways();
  const enabledGateways = useMemo(
    () => (gateways ?? []).filter((g) => g.isEnabled),
    [gateways],
  );

  const currency = cart?.currency ?? "usd";
  const appliedCouponCode = cart?.couponCode;
  const subtotalCents = cart?.subtotalCents ?? 0;
  const discountCents = cart?.discountCents ?? 0;
  const taxCents = cart?.taxCents ?? 0;
  const totalCents = cart?.totalCents ?? 0;

  // Form state
  const [billingName, setBillingName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<string>("");

  // Auto-select the first enabled gateway (or the default one) when the list
  // arrives. Falls back to "manual" when no gateway is configured so the dev
  // flow still completes.
  const effectiveGateway = useMemo(() => {
    if (selectedGateway) return selectedGateway;
    if (enabledGateways.length === 0) return "manual";
    const defaultGw = enabledGateways.find((g) => g.isDefault);
    return (defaultGw ?? enabledGateways[0]).gateway;
  }, [selectedGateway, enabledGateways]);

  // Submission state
  const checkout = useCheckout();
  const [completed, setCompleted] = useState<{
    orderId: string;
    orderNumber?: string;
  } | null>(null);

  // ───────────────── Cart loading / error ─────────────────
  if (cartLoading) {
    return (
      <Page title="Checkout">
        <div className="mx-auto max-w-3xl py-6">
          <Card className="p-4">
            <LoadingState message="Loading your cart…" />
          </Card>
        </div>
      </Page>
    );
  }

  if (cartError && !cart) {
    return (
      <Page title="Checkout">
        <div className="mx-auto max-w-3xl py-6">
          <Card className="p-4">
            <ErrorState
              error={cartError}
              onRetry={onRetryCart}
              title="Couldn't load your cart"
            />
          </Card>
        </div>
      </Page>
    );
  }

  // ───────────────── Empty cart guard ─────────────────
  const items = cart?.items ?? [];
  if (items.length === 0 && !completed) {
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
  if (completed) {
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
                Order ID
              </span>
              <span className="font-mono text-sm font-semibold text-gray-800 dark:text-dark-50">
                {completed.orderNumber ?? completed.orderId}
              </span>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3 dark:border-dark-600">
              <p className="mb-2 text-xs font-medium text-gray-500 dark:text-dark-300">
                {items.length}{" "}
                {items.length === 1 ? "course" : "courses"}
              </p>
              <ul className="space-y-1.5">
                {items.slice(0, 3).map((it) => (
                  <li
                    key={it.id}
                    className="truncate text-sm text-gray-700 dark:text-dark-200"
                  >
                    · {it.title}
                  </li>
                ))}
                {items.length > 3 && (
                  <li className="text-xs text-gray-400 dark:text-dark-400">
                    +{items.length - 3} more
                  </li>
                )}
              </ul>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-dark-600">
              <span className="text-xs text-gray-500 dark:text-dark-300">
                Total paid
              </span>
              <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                {formatPrice(totalCents, currency)}
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
    !checkout.loading &&
    billingEmail.trim().length > 0 &&
    billingName.trim().length > 0 &&
    !!effectiveGateway;

  const handleCompletePurchase = async () => {
    if (!effectiveGateway) return;
    const result = await checkout.mutate({
      paymentGateway: effectiveGateway,
      couponCode: appliedCouponCode,
      billingName: billingName.trim(),
      billingEmail: billingEmail.trim(),
      billingAddress: billingAddress.trim() || undefined,
    });
    if (!result) return;
    handleCheckoutResult(result);
  };

  const handleCheckoutResult = (result: CheckoutResult) => {
    // Stripe / PayPal flow: redirect to the gateway's hosted page.
    if (result.status === "requires_action" && result.paymentUrl) {
      window.location.href = result.paymentUrl;
      return;
    }
    // Manual or succeeded flow: synthesize an Order-like object for the
    // success screen (the parent only needs id + orderNumber for display).
    const syntheticOrder: Order = {
      id: result.orderId,
      tenantId: cart?.tenantId ?? "",
      userId: cart?.userId ?? "",
      orderNumber: `RC-${result.orderId.slice(-6).toUpperCase()}`,
      items: cart?.items ?? [],
      subtotalCents,
      discountCents,
      taxCents,
      totalCents,
      currency,
      status: "paid",
      paymentMethod: effectiveGateway,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCompleted({
      orderId: result.orderId,
      orderNumber: syntheticOrder.orderNumber,
    });
    onPurchaseComplete(syntheticOrder);
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
                classNames={{ root: "sm:col-span-2" }}
              />
            </div>
          </Card>

          {/* Payment method */}
          <Card skin="bordered" className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              2. Payment method
            </h2>

            {gatewaysLoading ? (
              <LoadingState
                inline
                message="Loading available payment methods…"
              />
            ) : enabledGateways.length === 0 ? (
              <div className="mt-4 rounded-md bg-warning-500/5 p-4 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
                No gateways are enabled for this tenant. Configure at least one
                gateway in <span className="font-medium">Payment Settings</span>{" "}
                to start accepting payments. Falling back to{" "}
                <span className="font-mono">manual</span> checkout for now.
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {enabledGateways.map((g) => (
                  <MethodTile
                    key={g.id}
                    active={effectiveGateway === g.gateway}
                    onClick={() => setSelectedGateway(g.gateway)}
                    label={g.gateway.replace(/_/g, " ")}
                    icon={<CreditCardIcon className="size-5" />}
                    badge={g.isDefault ? "Default" : undefined}
                  />
                ))}
              </div>
            )}

            {effectiveGateway === "manual" && (
              <div className="mt-5 rounded-md bg-info-500/5 p-4 text-sm text-info-700 dark:bg-info-500/10 dark:text-info-300">
                Your order will be created in <span className="font-medium">pending</span>{" "}
                status. An admin will mark it as paid once your bank transfer is
                received.
              </div>
            )}
            {effectiveGateway !== "manual" &&
              effectiveGateway !== "stripe" && (
                <div className="mt-5 rounded-md bg-info-500/5 p-4 text-sm text-info-700 dark:bg-info-500/10 dark:text-info-300">
                  You'll be redirected to{" "}
                  <span className="font-medium">{effectiveGateway}</span> to
                  complete your purchase after clicking{" "}
                  <span className="font-medium">Complete Purchase</span>.
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
                    url={item.imageUrl}
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
                    price={item.subtotalCents}
                    currency={currency}
                    size="sm"
                  />
                </li>
              ))}
            </ul>

            {/* Coupon display */}
            {appliedCouponCode && (
              <div className="mt-4 border-t border-gray-100 pt-4 dark:border-dark-600">
                <div className="flex items-center justify-between rounded-md border border-success-500/30 bg-success-500/5 px-3 py-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-success-700 dark:text-success-400">
                    <TagIcon className="size-4" />
                    <span className="font-mono">{appliedCouponCode}</span>
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
                {formatPrice(subtotalCents, currency)}
              </PriceRow>
              {discountCents > 0 && (
                <PriceRow label={`Discount (${appliedCouponCode})`}>
                  <span className="text-success-600 dark:text-success-400">
                    −{formatPrice(discountCents, currency)}
                  </span>
                </PriceRow>
              )}
              <PriceRow label="Tax">
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

            {checkout.error && (
              <p className="mt-3 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                {checkout.error.message || "Checkout failed. Please try again."}
              </p>
            )}

            <Button
              color="primary"
              variant="filled"
              className="mt-5 w-full gap-2 py-3"
              onClick={handleCompletePurchase}
              disabled={!canSubmit}
            >
              {checkout.loading ? (
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
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <Button
      unstyled
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary-500 bg-primary-500/5 text-primary-700 dark:border-primary-400 dark:bg-primary-500/10 dark:text-primary-300"
          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-500 dark:text-dark-200 dark:hover:bg-dark-700",
      )}
    >
      {icon}
      {label}
      {badge && (
        <Badge color="primary" variant="soft" className="text-[9px]">
          {badge}
        </Badge>
      )}
    </Button>
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

function PriceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500 dark:text-dark-300">{label}</dt>
      <dd className="font-medium text-gray-800 dark:text-dark-100">
        {children}
      </dd>
    </div>
  );
}

/** Re-exported for parents that need an icon. */
export { BuildingLibraryIcon };
