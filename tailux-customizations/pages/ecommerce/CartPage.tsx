// CartPage — shopping cart screen.
//
// Layout: two columns:
//   1. Left (main)  — list of cart items (thumbnail, title, instructor,
//                     price, remove button) and a coupon code input.
//   2. Right (rail) — price breakdown (subtotal, discount, tax, total) +
//                     "Proceed to Checkout" CTA.
//
// All state (cart contents, applied coupon) is owned by the parent Ecommerce
// layout so it can be shared with the checkout screen. This component is a
// pure presentation + event-emitter view.

// Import Dependencies
import { useState } from "react";
import {
  ShoppingBagIcon,
  TrashIcon,
  TagIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input } from "@/components/ui";
import {
  CourseThumbnail,
  EmptyState,
  LoadingState,
  ErrorState,
  PriceTag,
  formatPrice,
} from "@/components/lms";
import type { Coupon } from "@/types/lms";

import type { Cart, CartItem } from "./mock-data";

// ----------------------------------------------------------------------

export const TAX_RATE = 0.08; // 8% tax

export interface CartPageProps {
  cart: Cart | null;
  loading: boolean;
  error: unknown;
  /** Removes a single cart line item by id. */
  onRemoveItem: (itemId: string) => void;
  /** Currently applied coupon (null when none). */
  appliedCoupon: Coupon | null;
  /** Apply a coupon by code. Returns an error message string, or null on success. */
  onApplyCoupon: (code: string) => string | null;
  /** Removes any applied coupon. */
  onRemoveCoupon: () => void;
  /** Switch to the checkout screen. */
  onProceedToCheckout: () => void;
  /** Navigate back to the course catalog. */
  onBrowseCatalog: () => void;
  /** Re-fetch the cart (used by the error retry button). */
  onRetry: () => void;
}

export default function CartPage({
  cart,
  loading,
  error,
  onRemoveItem,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  onProceedToCheckout,
  onBrowseCatalog,
  onRetry,
}: CartPageProps) {
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const currency = cart?.currency ?? "usd";

  const subtotal = items.reduce(
    (sum, it) => sum + it.priceCents * it.quantity,
    0,
  );
  const discountCents = appliedCoupon
    ? Math.min(
        appliedCoupon.discountType === "percent"
          ? Math.round((subtotal * appliedCoupon.discountValue) / 100)
          : appliedCoupon.discountValue,
        subtotal,
      )
    : 0;
  const taxableBase = Math.max(subtotal - discountCents, 0);
  const taxCents = Math.round(taxableBase * TAX_RATE);
  const totalCents = taxableBase + taxCents;

  const handleApplyCoupon = () => {
    const code = couponInput.trim();
    setCouponError(null);
    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }
    const err = onApplyCoupon(code);
    if (err) {
      setCouponError(err);
    } else {
      setCouponInput("");
    }
  };

  // ───────────────── Loading / error states ─────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <CartHeader itemCount={0} loading />
        <Card className="p-4">
          <LoadingState message="Loading your cart…" />
        </Card>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="space-y-6">
        <CartHeader itemCount={0} />
        <Card className="p-4">
          <ErrorState error={error} onRetry={onRetry} />
        </Card>
      </div>
    );
  }

  // ───────────────── Empty state ─────────────────
  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <CartHeader itemCount={0} />
        <Card className="p-4">
          <EmptyState
            icon={ShoppingBagIcon}
            title="Your cart is empty"
            description="Browse the catalog and add courses to your cart to get started."
            actionLabel="Browse catalog"
            onAction={onBrowseCatalog}
          />
        </Card>
      </div>
    );
  }

  // ───────────────── Cart with items ─────────────────
  return (
    <div className="space-y-6">
      <CartHeader itemCount={items.length} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ───────── Left: items + coupon ───────── */}
        <div className="space-y-4">
          <Card className="divide-y divide-gray-100 dark:divide-dark-600">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                currency={currency}
                onRemove={() => onRemoveItem(item.id)}
              />
            ))}
          </Card>

          {/* Coupon row */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <TagIcon className="size-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                Have a coupon?
              </h3>
            </div>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-md border border-success-500/30 bg-success-500/5 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-success-700 dark:text-success-400">
                  <TagIcon className="size-4" />
                  <span className="font-mono">{appliedCoupon.code}</span>
                  <Badge color="success" variant="soft" className="text-[10px]">
                    {appliedCoupon.discountType === "percent"
                      ? `-${appliedCoupon.discountValue}%`
                      : `-${formatPrice(appliedCoupon.discountValue, currency)}`}
                  </Badge>
                </span>
                <Button
                  isIcon
                  variant="flat"
                  color="error"
                  className="size-6"
                  onClick={onRemoveCoupon}
                  aria-label="Remove coupon"
                >
                  <XMarkIcon className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. REACT10"
                  value={couponInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCouponInput(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") handleApplyCoupon();
                  }}
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
            {!appliedCoupon && (
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-dark-400">
                Try <span className="font-mono">REACT10</span>,{" "}
                <span className="font-mono">FRIENDS</span>, or{" "}
                <span className="font-mono">FLAT25</span>.
              </p>
            )}
          </Card>

          <Button
            variant="flat"
            color="neutral"
            className="gap-1.5 text-sm"
            onClick={onBrowseCatalog}
          >
            <ArrowLeftIcon className="size-4" />
            Continue shopping
          </Button>
        </div>

        {/* ───────── Right: breakdown ───────── */}
        <aside>
          <Card skin="bordered" className="sticky top-6 p-5">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Order summary
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <PriceRow
                label={`Subtotal (${items.length} ${
                  items.length === 1 ? "item" : "items"
                })`}
              >
                {formatPrice(subtotal, currency)}
              </PriceRow>
              {discountCents > 0 && (
                <PriceRow
                  label={`Discount (${appliedCoupon?.code})`}
                >
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

            <Button
              color="primary"
              variant="filled"
              className="mt-5 w-full gap-2 py-3"
              onClick={onProceedToCheckout}
            >
              Proceed to Checkout
              <ArrowRightIcon className="size-5" />
            </Button>

            <p className="mt-3 text-center text-[11px] text-gray-400 dark:text-dark-400">
              Secure checkout · 30-day money-back guarantee
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function CartHeader({
  itemCount,
  loading = false,
}: {
  itemCount: number;
  loading?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          Shopping Cart
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          {loading
            ? "Loading your cart…"
            : itemCount === 0
              ? "No items in your cart yet."
              : `${itemCount} ${itemCount === 1 ? "course" : "courses"} ready to enroll.`}
        </p>
      </div>
      <Badge color="primary" variant="soft" className="gap-1">
        <ShoppingBagIcon className="size-3.5" />
        {itemCount}
      </Badge>
    </header>
  );
}

function CartLine({
  item,
  currency,
  onRemove,
}: {
  item: CartItem;
  currency: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-3 p-4">
      <CourseThumbnail
        url={item.featuredImage}
        title={item.title}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-dark-100">
          {item.title}
        </p>
        {item.excerpt && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-dark-300">
            {item.excerpt}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
          By {item.instructorName}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <PriceTag
            price={item.priceCents}
            currency={currency}
            compareAt={item.compareAtCents}
            size="sm"
          />
          {item.compareAtCents && item.compareAtCents > item.priceCents && (
            <Badge color="error" variant="soft" className="text-[10px]">
              Save {formatPrice(item.compareAtCents - item.priceCents, currency)}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-start">
        <Button
          isIcon
          variant="flat"
          color="error"
          className="size-8"
          onClick={onRemove}
          aria-label={`Remove ${item.title} from cart`}
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
    </div>
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

// Re-exported so the parent layout can reuse the same tax rate for the
// checkout breakdown.
export { PriceRow };
export type { Cart, CartItem };
// `ArrowPathIcon` is exported here so it can be used by the parent retry
// button without a second heroicons import.
export { ArrowPathIcon };
