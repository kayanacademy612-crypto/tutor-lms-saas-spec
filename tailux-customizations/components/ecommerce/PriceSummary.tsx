// Import Dependencies
import clsx from "clsx";

// Local Imports
import { formatPrice } from "@/components/lms/PriceTag";
import { CouponBadge } from "./CouponBadge";
import type { Coupon } from "@/types/lms";

// ----------------------------------------------------------------------

export interface PriceSummaryProps {
  /** Cart/order subtotal, in minor units (cents). */
  subtotal: number;
  /** Discount applied, in cents. Hidden when 0/omitted. */
  discount?: number;
  /** Tax collected, in cents. Hidden when 0/omitted. */
  tax?: number;
  /** Grand total, in cents. */
  total: number;
  /** ISO 4217 currency code. Defaults to "USD". */
  currency?: string;
  /** Applied coupon code — rendered as a `CouponBadge` row when present. */
  couponCode?: string;
  /** Full coupon object — when provided, renders the badge with discount info. */
  coupon?: Coupon;
  /** Extra classes on the root wrapper. */
  className?: string;
}

interface SummaryRowProps {
  label: string;
  value: number;
  currency: string;
  emphasis?: "default" | "discount" | "total";
}

function SummaryRow({ label, value, currency, emphasis = "default" }: SummaryRowProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 text-sm",
        emphasis === "total" && "border-t border-gray-200 pt-3 dark:border-dark-600",
      )}
    >
      <span
        className={clsx(
          emphasis === "total"
            ? "text-base font-semibold text-gray-900 dark:text-dark-50"
            : "text-gray-600 dark:text-dark-200",
        )}
      >
        {label}
      </span>
      <span
        className={clsx(
          "font-semibold tabular-nums",
          emphasis === "total"
            ? "text-lg text-gray-900 dark:text-dark-50"
            : emphasis === "discount"
              ? "text-success-600 dark:text-success-400"
              : "text-gray-900 dark:text-dark-50",
        )}
      >
        {emphasis === "discount" ? "-" : ""}
        {formatPrice(value, currency)}
      </span>
    </div>
  );
}

/**
 * Totals summary panel for carts, checkouts, and order confirmations.
 *
 * Renders a vertical stack of label/amount rows:
 *  - Subtotal          (always shown)
 *  - Discount          (only when `discount > 0`, success-colored)
 *  - Tax               (only when `tax > 0`)
 *  - Total             (always shown, separated by a top border + larger type)
 *
 * When a `coupon` (or just a `couponCode`) is provided, a `CouponBadge` row
 * renders above the totals so the shopper sees exactly which promo was applied.
 */
export function PriceSummary({
  subtotal,
  discount = 0,
  tax = 0,
  total,
  currency = "USD",
  couponCode,
  coupon,
  className,
}: PriceSummaryProps) {
  const hasDiscount = discount > 0;
  const hasTax = tax > 0;
  const hasCoupon = !!(coupon ?? couponCode);

  return (
    <div
      className={clsx(
        "flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-dark-600 dark:bg-dark-700/50",
        className,
      )}
    >
      {(hasCoupon) && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Coupon
          </span>
          {coupon ? (
            <CouponBadge coupon={coupon} currency={currency} />
          ) : (
            <span className="rounded-md bg-primary-500/10 px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
              {couponCode}
            </span>
          )}
        </div>
      )}

      <SummaryRow label="Subtotal" value={subtotal} currency={currency} />

      {hasDiscount && (
        <SummaryRow
          label="Discount"
          value={discount}
          currency={currency}
          emphasis="discount"
        />
      )}

      {hasTax && <SummaryRow label="Tax" value={tax} currency={currency} />}

      <SummaryRow label="Total" value={total} currency={currency} emphasis="total" />
    </div>
  );
}

export default PriceSummary;
