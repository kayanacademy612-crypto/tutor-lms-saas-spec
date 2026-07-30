// Import Dependencies
import clsx from "clsx";

// Local Imports
import { Button } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import { OrderStatusBadge } from "./OrderStatusBadge";
import type { Order } from "@/types/lms";

// ----------------------------------------------------------------------

export interface OrderRowProps {
  /** Order to render. */
  order: Order;
  /** Click handler for the "View" action. Receives the order id. */
  onView?: (id: string) => void;
  /** Click handler for the "Refund" action (admin). Receives the order id. */
  onRefund?: (id: string) => void;
  /** Show the trailing actions column. Defaults to true. */
  showActions?: boolean;
  /** ISO 4217 currency code (overrides `order.currency` if provided). */
  currency?: string;
  /** Extra classes on the root row. */
  className?: string;
}

/**
 * Formats an ISO date string as a short locale date (e.g. "Jul 4, 2026").
 * Falls back to the raw string when the input is missing or unparseable.
 */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Single order row.
 *
 * Renders as a responsive card on small screens (stacked) and as a single
 * flex row on `sm+`. Used by order history, admin order lists, and the
 * instructor payouts screen.
 *
 * Visible columns: order number · date · items count · total · status ·
 * actions (View + Refund, the latter only when `onRefund` is supplied).
 */
export function OrderRow({
  order,
  onView,
  onRefund,
  showActions = true,
  currency,
  className,
}: OrderRowProps) {
  const cur = currency ?? order.currency ?? "USD";
  const itemCount = order.items?.length ?? 0;
  const canRefund = !!onRefund && order.status === "paid";

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-700/40 sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
    >
      {/* Order number + date */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-dark-50">
          {order.orderNumber}
        </p>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          {formatDate(order.createdAt)}
        </p>
      </div>

      {/* Items count */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-200 sm:w-24 sm:justify-center">
        <span className="font-medium">{itemCount}</span>
        <span className="text-xs text-gray-400 dark:text-dark-400">
          {itemCount === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Total */}
      <div className="sm:w-28 sm:text-right">
        <p className="text-sm font-bold text-gray-900 dark:text-dark-50">
          {formatPrice(order.totalCents, cur)}
        </p>
        {order.couponCode && (
          <p className="truncate text-[10px] text-gray-400 dark:text-dark-400">
            code: {order.couponCode}
          </p>
        )}
      </div>

      {/* Status */}
      <div className="sm:w-24 sm:text-center">
        <OrderStatusBadge status={order.status} size="sm" />
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 sm:w-32 sm:justify-end">
          {onView && (
            <Button
              color="primary"
              variant="soft"
              onClick={() => onView(order.id)}
              className="text-xs"
            >
              View
            </Button>
          )}
          {canRefund && (
            <Button
              color="error"
              variant="outlined"
              onClick={() => onRefund?.(order.id)}
              className="text-xs"
            >
              Refund
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderRow;
