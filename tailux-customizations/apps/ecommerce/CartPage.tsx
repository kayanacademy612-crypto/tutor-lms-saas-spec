// CartPage — shopping cart screen.
//
// Layout: two columns:
//   1. Left (main)  — list of cart items (thumbnail, title, type, price,
//                     quantity, remove button) and a coupon code input.
//   2. Right (rail) — price breakdown (subtotal, discount, tax, total) +
//                     "Proceed to Checkout" CTA.
//
// Cart contents are server-owned (Phase 3 cart endpoints). This screen is a
// pure view that:
//   - reads the cart via the `cart` prop (populated by the parent's
//     `useCart()` hook),
//   - mutates via the `useRemoveFromCart`, `useApplyCoupon`,
//     `useRemoveCoupon`, and `useUpdateCartItem` hooks (P3-A5),
//   - and renders loading / error / empty states.
//
// All money values use `formatPrice` from `@/components/lms/PriceTag`.

// Import Dependencies
import { useMemo, useState } from "react";
import {
  ShoppingBagIcon,
  TrashIcon,
  TagIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
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
import {
  useApplyCoupon,
  useRemoveCoupon,
  useRemoveFromCart,
  useUpdateCartItem,
} from "@/hooks/useEcommerce";
import type { Cart, CartItem } from "@/types/lms";

// ----------------------------------------------------------------------

export interface CartPageProps {
  cart: Cart | null;
  loading: boolean;
  error: unknown;
  /** Re-fetch the cart (used by the error retry button). */
  onRetry: () => void;
  /** Switch to the checkout screen. */
  onProceedToCheckout: () => void;
  /** Navigate back to the course catalog. */
  onBrowseCatalog: () => void;
}

export default function CartPage({
  cart,
  loading,
  error,
  onRetry,
  onProceedToCheckout,
  onBrowseCatalog,
}: CartPageProps) {
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);

  // Cart mutations — each hook is a single instance that can operate on any
  // row in the cart (resource id is passed at `mutate(...)` time per P3-A5).
  const removeItem = useRemoveFromCart();
  const updateItem = useUpdateCartItem();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const items = cart?.items ?? [];
  const currency = cart?.currency ?? "usd";
  const appliedCouponCode = cart?.couponCode ?? undefined;

  // Totals come straight from the server — no local computation.
  const subtotal = cart?.subtotalCents ?? 0;
  const discountCents = cart?.discountCents ?? 0;
  const taxCents = cart?.taxCents ?? 0;
  const totalCents = cart?.totalCents ?? 0;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim();
    setCouponError(null);
    if (!code) {
      setCouponError("Enter a coupon code.");
      return;
    }
    const result = await applyCoupon.mutate(code);
    if (!result) {
      setCouponError(
        applyCoupon.error?.message ||
          `"${code.toUpperCase()}" couldn't be applied.`,
      );
    } else {
      setCouponInput("");
    }
  };

  const handleRemoveCoupon = async () => {
    await removeCoupon.mutate();
  };

  const handleRemoveItem = async (itemId: string) => {
    await removeItem.mutate(itemId);
  };

  const handleQuantityChange = async (
    item: CartItem,
    delta: number,
  ) => {
    const nextQty = Math.max(1, item.quantity + delta);
    if (nextQty === item.quantity) return;
    await updateItem.mutate({
      itemId: item.id,
      input: { quantity: nextQty },
    });
  };

  const busy =
    removeItem.loading ||
    updateItem.loading ||
    applyCoupon.loading ||
    removeCoupon.loading;

  const itemCount = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items],
  );

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
      <CartHeader itemCount={itemCount} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ───────── Left: items + coupon ───────── */}
        <div className="space-y-4">
          <Card className="divide-y divide-gray-100 dark:divide-dark-600">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                currency={currency}
                onRemove={() => handleRemoveItem(item.id)}
                onDecrease={() => handleQuantityChange(item, -1)}
                onIncrease={() => handleQuantityChange(item, +1)}
                disabled={busy}
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
            {appliedCouponCode ? (
              <div className="flex items-center justify-between rounded-md border border-success-500/30 bg-success-500/5 px-3 py-2">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-success-700 dark:text-success-400">
                  <TagIcon className="size-4" />
                  <span className="font-mono">{appliedCouponCode}</span>
                  {discountCents > 0 && (
                    <Badge color="success" variant="soft" className="text-[10px]">
                      −{formatPrice(discountCents, currency)}
                    </Badge>
                  )}
                </span>
                <Button
                  isIcon
                  variant="flat"
                  color="error"
                  className="size-6"
                  onClick={handleRemoveCoupon}
                  disabled={removeCoupon.loading}
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
                    if (e.key === "Enter") void handleApplyCoupon();
                  }}
                  error={couponError ?? undefined}
                  classNames={{ root: "flex-1" }}
                />
                <Button
                  color="primary"
                  variant="outlined"
                  onClick={handleApplyCoupon}
                  className="shrink-0"
                  disabled={applyCoupon.loading}
                >
                  {applyCoupon.loading ? "Applying…" : "Apply"}
                </Button>
              </div>
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
                label={`Subtotal (${itemCount} ${
                  itemCount === 1 ? "item" : "items"
                })`}
              >
                {formatPrice(subtotal, currency)}
              </PriceRow>
              {discountCents > 0 && (
                <PriceRow
                  label={`Discount (${appliedCouponCode})`}
                >
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

            <Button
              color="primary"
              variant="filled"
              className="mt-5 w-full gap-2 py-3"
              onClick={onProceedToCheckout}
              disabled={busy}
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
  onDecrease,
  onIncrease,
  disabled,
}: {
  item: CartItem;
  currency: string;
  onRemove: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled: boolean;
}) {
  const itemTypeLabel =
    item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1);
  return (
    <div className="flex gap-3 p-4">
      <CourseThumbnail
        url={item.imageUrl}
        title={item.title}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-gray-800 dark:text-dark-100">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
          {itemTypeLabel} · {item.referenceId}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <PriceTag
            price={item.unitPriceCents}
            currency={currency}
            size="sm"
          />
          {item.quantity > 1 && (
            <Badge color="neutral" variant="soft" className="text-[10px]">
              ×{item.quantity}
            </Badge>
          )}
        </div>

        {/* Quantity stepper */}
        <div className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-200 px-1 py-1 dark:border-dark-500">
          <Button
            isIcon
            unstyled
            className="size-6 text-gray-500 hover:text-primary-600 dark:text-dark-300"
            onClick={onDecrease}
            disabled={disabled || item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            <MinusIcon className="size-3.5" />
          </Button>
          <span className="min-w-6 text-center text-sm font-medium text-gray-800 dark:text-dark-100">
            {item.quantity}
          </span>
          <Button
            isIcon
            unstyled
            className="size-6 text-gray-500 hover:text-primary-600 dark:text-dark-300"
            onClick={onIncrease}
            disabled={disabled}
            aria-label="Increase quantity"
          >
            <PlusIcon className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between">
        <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {formatPrice(item.subtotalCents, currency)}
        </span>
        <Button
          isIcon
          variant="flat"
          color="error"
          className="size-8"
          onClick={onRemove}
          disabled={disabled}
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
