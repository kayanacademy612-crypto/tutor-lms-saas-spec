// CheckoutPage — simple checkout flow for a paid course.
//
// Layout: two columns:
//   1. Left (main)  — payment method selector (card / PayPal / wallet),
//                     card form placeholder, and billing email input.
//   2. Right (rail) — course summary (thumbnail, title, price breakdown),
//                     coupon code input, and "Complete Purchase" CTA.
//
// Mock course + coupon logic lives in this file so the page is always
// usable in dev. All controls use tailux UI components — no raw inputs.

// Import Dependencies
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  CheckIcon,
  TagIcon,
  XMarkIcon,
  LockClosedIcon,
  AcademicCapIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Input } from "@/components/ui";
import {
  CourseThumbnail,
  PriceTag,
  formatPrice,
} from "@/components/lms";
import type { Course } from "@/types/lms";

// ----------------------------------------------------------------------

const MOCK_COURSE: Course = {
  id: "course-react-fundamentals",
  tenantId: "tenant-1",
  instructorId: "instr-1",
  title: "React 19 Fundamentals: Hooks, Suspense, and Server Components",
  slug: "react-19-fundamentals",
  description:
    "Master modern React from the ground up — hooks, Suspense, server components, and the new use() hook.",
  excerpt: "Hooks, Suspense, Server Components, and the new use() hook.",
  featuredImage: "",
  status: "published",
  priceType: "paid",
  priceCents: 8900,
  compareAtCents: 12900,
  currency: "usd",
  difficulty: "beginner",
  isFeatured: true,
  isPublic: true,
  enrolledCount: 12450,
  ratingAvg: 4.8,
  ratingCount: 1240,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const TAX_RATE = 0.08; // 8% tax
const VALID_COUPONS: Record<string, number> = {
  REACT20: 20, // 20% off
  LAUNCH10: 10, // 10% off
  FRIENDS: 15, // 15% off
};

// ----------------------------------------------------------------------

type PaymentMethod = "card" | "paypal" | "wallet";

// ----------------------------------------------------------------------

export default function CheckoutPage() {
  const navigate = useNavigate();

  const course = MOCK_COURSE;
  const currency = course.currency ?? "usd";

  const [method, setMethod] = useState<PaymentMethod>("card");
  const [email, setEmail] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    pct: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const subtotal = course.priceCents;
  const discountCents = useMemo(() => {
    if (!appliedCoupon) return 0;
    return Math.round((subtotal * appliedCoupon.pct) / 100);
  }, [appliedCoupon, subtotal]);
  const taxableBase = Math.max(subtotal - discountCents, 0);
  const taxCents = Math.round(taxableBase * TAX_RATE);
  const totalCents = taxableBase + taxCents;

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    setCouponError(null);
    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }
    const pct = VALID_COUPONS[code];
    if (!pct) {
      setCouponError(`"${code}" is not a valid coupon.`);
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code, pct });
    setCouponInput("");
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
  };

  const handleCompletePurchase = () => {
    setProcessing(true);
    // Simulate a network round-trip.
    setTimeout(() => {
      setProcessing(false);
      setSuccess(true);
    }, 1100);
  };

  // ───────────────────── Success state ─────────────────────
  if (success) {
    return (
      <Page title="Purchase Complete">
        <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
          <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-success-500/10">
              <CheckCircleIcon className="size-10 text-success-500 dark:text-success-400" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-gray-800 dark:text-dark-50">
              You're enrolled!
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-300">
              Your purchase of <span className="font-medium">{course.title}</span>{" "}
              is complete. A receipt has been sent to your email.
            </p>

            <Card skin="bordered" className="mt-6 w-full p-5 text-left">
              <div className="flex items-center gap-3">
                <CourseThumbnail
                  url={course.featuredImage}
                  title={course.title}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {course.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    Order #RC-{Math.floor(Math.random() * 1e6)
                      .toString()
                      .padStart(6, "0")}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-dark-600">
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
                onClick={() => navigate("/apps/learning-area")}
              >
                <AcademicCapIcon className="size-5" />
                Start Learning
              </Button>
              <Button
                variant="flat"
                color="neutral"
                className="w-full py-2.5"
                onClick={() => navigate("/apps/catalog")}
              >
                Back to Catalog
              </Button>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  // ───────────────────── Checkout form ─────────────────────
  return (
    <Page title="Checkout">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white px-5 py-4 dark:border-dark-600 dark:bg-dark-750">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              onClick={() => navigate("/apps/course-detail")}
              className="size-9"
              aria-label="Back to course detail"
            >
              <ArrowLeftIcon className="size-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                Checkout
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Complete your purchase securely
              </p>
            </div>
            <Badge
              color="success"
              variant="soft"
              className="ml-auto gap-1"
            >
              <LockClosedIcon className="size-3.5" />
              Secure
            </Badge>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* ───────────── Left: payment form ───────────── */}
            <div className="space-y-6">
              {/* Contact */}
              <Card skin="bordered" className="p-5">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                  1. Contact information
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
                  We'll send your receipt and course access here.
                </p>
                <div className="mt-4">
                  <Input
                    label="Email address"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEmail(e.target.value)
                    }
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

                {/* Card form (placeholder) */}
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
                      This is a placeholder form — no real card is charged in
                      dev. Test card: <span className="font-mono">4242 4242 4242 4242</span>.
                    </p>
                  </div>
                )}

                {method === "paypal" && (
                  <div className="mt-5 rounded-md bg-info-500/5 p-4 text-sm text-info-700 dark:bg-info-500/10 dark:text-info-300">
                    You'll be redirected to PayPal to complete your purchase
                    after clicking <span className="font-medium">Complete Purchase</span>.
                  </div>
                )}

                {method === "wallet" && (
                  <div className="mt-5 rounded-md bg-info-500/5 p-4 text-sm text-info-700 dark:bg-info-500/10 dark:text-info-300">
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

            {/* ───────────── Right: order summary ───────────── */}
            <aside>
              <Card skin="bordered" className="sticky top-6 p-5">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                  Order summary
                </h2>

                {/* Course line item */}
                <div className="mt-4 flex gap-3">
                  <CourseThumbnail
                    url={course.featuredImage}
                    title={course.title}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium text-gray-800 dark:text-dark-100">
                      {course.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
                      Lifetime access · Certificate included
                    </p>
                  </div>
                </div>

                {/* Coupon */}
                <div className="mt-5 border-t border-gray-100 pt-4 dark:border-dark-600">
                  <label className="input-label text-xs font-medium text-gray-600 dark:text-dark-200">
                    Coupon code
                  </label>
                  {appliedCoupon ? (
                    <div className="mt-2 flex items-center justify-between rounded-md border border-success-500/30 bg-success-500/5 px-3 py-2">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-success-700 dark:text-success-400">
                        <TagIcon className="size-4" />
                        {appliedCoupon.code}
                        <Badge color="success" variant="soft" className="text-[10px]">
                          -{appliedCoupon.pct}%
                        </Badge>
                      </span>
                      <Button
                        isIcon
                        variant="flat"
                        color="error"
                        className="size-6"
                        onClick={handleRemoveCoupon}
                        aria-label="Remove coupon"
                      >
                        <XMarkIcon className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="e.g. REACT20"
                        value={couponInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setCouponInput(e.target.value)
                        }
                        error={couponError ?? undefined}
                        classNames={{ root: "flex-1" }}
                      />
                      <Button
                        color="primary"
                        variant="outlined"
                        onClick={handleApplyCoupon}
                        className="shrink-0"
                      >
                        Apply
                      </Button>
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] text-gray-400 dark:text-dark-400">
                    Try <span className="font-mono">REACT20</span>,{" "}
                    <span className="font-mono">LAUNCH10</span>, or{" "}
                    <span className="font-mono">FRIENDS</span>.
                  </p>
                </div>

                {/* Price breakdown */}
                <dl className="mt-5 space-y-2.5 border-t border-gray-100 pt-4 text-sm dark:border-dark-600">
                  <PriceRow label="Subtotal">
                    {formatPrice(subtotal, currency)}
                  </PriceRow>
                  {course.compareAtCents &&
                    course.compareAtCents > course.priceCents && (
                      <PriceRow label="Original price">
                        <span className="text-gray-400 line-through dark:text-dark-400">
                          {formatPrice(course.compareAtCents, currency)}
                        </span>
                      </PriceRow>
                    )}
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

                {/* Total */}
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

                {/* CTA */}
                <Button
                  color="primary"
                  variant="filled"
                  className="mt-5 w-full gap-2 py-3"
                  onClick={handleCompletePurchase}
                  disabled={
                    processing ||
                    method === "wallet" /* wallet has no balance in mock */
                  }
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
                  By completing your purchase you agree to our Terms of Service
                  and Privacy Policy.
                </p>
              </Card>
            </aside>
          </div>
        </div>
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

/** Label + value row for the price breakdown. */
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

export { CheckoutPage };
