// Import Dependencies
import clsx from "clsx";
import { TicketIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { Coupon } from "@/types/lms";

// ----------------------------------------------------------------------

export interface CouponBadgeProps {
  /** Coupon to render. */
  coupon: Coupon;
  /** ISO 4217 currency code used for `fixed` discount values. */
  currency?: string;
  /** Hide the discount-value suffix (just show the code). */
  codeOnly?: boolean;
  /** Extra classes on the badge. */
  className?: string;
}

/**
 * Builds the human-readable discount suffix:
 *  - `percent` → "20% off"
 *  - `fixed`   → "$10.00 off" (formatPrice handles the 0/free edge case)
 */
function formatDiscount(coupon: Coupon, currency: string): string {
  if (coupon.discountType === "percent") {
    return `${coupon.discountValue}% off`;
  }
  return `${formatPrice(coupon.discountValue, currency)} off`;
}

/**
 * Inline badge that surfaces an applied coupon.
 *
 * Renders the (uppercase) code with a ticket glyph + the discount value
 * (e.g. `SAVE20 · 20% off`). Designed to sit inside a `PriceSummary`
 * totals row or a `CartLineItem` footnote.
 */
export function CouponBadge({
  coupon,
  currency = "USD",
  codeOnly = false,
  className,
}: CouponBadgeProps) {
  return (
    <Badge
      color="primary"
      variant="soft"
      className={clsx("inline-flex items-center gap-1.5", className)}
    >
      <TicketIcon className="size-3.5 stroke-2" />
      <span className="font-mono uppercase tracking-wide">{coupon.code}</span>
      {!codeOnly && (
        <>
          <span className="text-primary-500/60 dark:text-primary-400/60">·</span>
          <span>{formatDiscount(coupon, currency)}</span>
        </>
      )}
    </Badge>
  );
}

export default CouponBadge;
