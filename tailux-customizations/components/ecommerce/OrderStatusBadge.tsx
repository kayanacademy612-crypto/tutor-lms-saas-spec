// Import Dependencies
import clsx from "clsx";

// Local Imports
import { Badge } from "@/components/ui";
import { ColorType } from "@/constants/app";
import type { OrderStatus } from "@/types/lms";

// ----------------------------------------------------------------------

export interface OrderStatusBadgeProps {
  /** Order status to render. */
  status: OrderStatus;
  /** Visual size of the badge. */
  size?: "sm" | "md";
  /** Badge variant. Defaults to "soft" so it stays calm in dense tables. */
  variant?: "filled" | "outlined" | "soft";
  /** Extra classes on the badge. */
  className?: string;
}

interface StatusConfig {
  label: string;
  color: ColorType;
}

/**
 * Color map for order statuses:
 *  - pending  → warning (amber)
 *  - paid     → success (green)
 *  - failed   → error   (red)
 *  - refunded → info    (blue)
 *  - canceled → neutral (gray)
 */
const STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
  pending: { label: "Pending", color: "warning" },
  paid: { label: "Paid", color: "success" },
  failed: { label: "Failed", color: "error" },
  refunded: { label: "Refunded", color: "info" },
  canceled: { label: "Canceled", color: "neutral" },
};

/**
 * Color-coded badge for an `OrderStatus`.
 *
 * Used by `OrderRow` and any screen that lists orders/invoices/payments
 * (the payment + refund flows reuse the same status palette).
 */
export function OrderStatusBadge({
  status,
  size = "md",
  variant = "soft",
  className,
}: OrderStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <Badge
      color={cfg.color}
      variant={variant}
      className={clsx(
        "shrink-0 capitalize",
        size === "sm" && "text-[10px] px-1.5 py-0.5",
        size === "md" && "text-xs px-2 py-0.5",
        className,
      )}
    >
      {cfg.label}
    </Badge>
  );
}

export default OrderStatusBadge;
