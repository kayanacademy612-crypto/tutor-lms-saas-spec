// Import Dependencies
import clsx from "clsx";

// ----------------------------------------------------------------------

export type PriceModel = "free" | "paid";

export interface PriceTagProps {
  /** Price in minor currency units (cents) — matches `Course.priceCents`. */
  price: number;
  /** ISO 4217 currency code, e.g. "USD". Defaults to "USD". */
  currency?: string;
  /** Whether to render as free or paid. When omitted, derived from price. */
  model?: PriceModel;
  /** Optional strike-through "compare at" price (minor units). */
  compareAt?: number;
  /** Visual size of the tag. */
  size?: "sm" | "md" | "lg";
  /** Render the value inline (no badge background). */
  plain?: boolean;
  /** Extra classes on the root wrapper. */
  className?: string;
}

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
  BRL: "R$",
};

/**
 * Formats a minor-units price into a human-readable currency string.
 *
 * @example formatPrice(2999, "USD") === "$29.99"
 * @example formatPrice(0, "USD")    === "Free"
 */
export function formatPrice(price: number, currency = "USD"): string {
  if (!price || price <= 0) return "Free";
  const major = price / 100;
  const symbol = currencySymbols[currency] ?? "";
  const formatted = major.toLocaleString(undefined, {
    minimumFractionDigits: major % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * Displays a course/product price.
 *
 * - `Free` prices render as a green "Free" pill by default.
 * - Paid prices render the formatted amount, with an optional strike-through
 *   `compareAt` price for discounts.
 */
export function PriceTag({
  price,
  currency = "USD",
  model,
  compareAt,
  size = "md",
  plain = false,
  className,
}: PriceTagProps) {
  const isFree = (model ?? (price > 0 ? "paid" : "free")) === "free";

  if (isFree) {
    return (
      <span
        className={clsx(
          "inline-flex items-center font-semibold",
          plain
            ? "text-success-600 dark:text-success-400"
            : "rounded-md bg-success-500/10 px-2 py-0.5 text-success-600 dark:bg-success-500/15 dark:text-success-400",
          sizeClass[size],
          className,
        )}
      >
        Free
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-baseline gap-1.5 font-semibold text-gray-900 dark:text-dark-50",
        sizeClass[size],
        className,
      )}
    >
      {typeof compareAt === "number" && compareAt > price && (
        <span className="text-xs font-normal text-gray-400 line-through dark:text-dark-400">
          {formatPrice(compareAt, currency)}
        </span>
      )}
      <span>{formatPrice(price, currency)}</span>
    </span>
  );
}

export default PriceTag;
