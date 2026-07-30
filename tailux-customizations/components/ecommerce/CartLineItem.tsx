// Import Dependencies
import clsx from "clsx";
import { ComponentType } from "react";
import {
  AcademicCapIcon,
  Squares2X2Icon,
  SparklesIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Badge, Button } from "@/components/ui";
import { ColorType } from "@/constants/app";
import { formatPrice } from "@/components/lms/PriceTag";
import type { CartItem } from "@/types/lms";

// ----------------------------------------------------------------------

export interface CartLineItemProps {
  /** Cart item to render. */
  item: CartItem;
  /** Called when the user changes the quantity. Receives the new qty. */
  onUpdateQuantity: (id: string, qty: number) => void;
  /** Called when the user clicks the trash/remove affordance. */
  onRemove: (id: string) => void;
  /** Disable the qty/remove controls while an update mutation is in flight. */
  loading?: boolean;
  /** ISO 4217 currency code. Defaults to "USD". */
  currency?: string;
  /** Extra classes on the root row. */
  className?: string;
}

interface ItemTypeConfig {
  label: string;
  color: ColorType;
  icon: ComponentType<{ className?: string }>;
}

/**
 * Item-type color map (matches the design spec):
 *  - course     → info    (blue)
 *  - bundle     → success (green)
 *  - membership → warning (amber)
 */
const ITEM_TYPE_CONFIG: Record<CartItem["itemType"], ItemTypeConfig> = {
  course: { label: "Course", color: "info", icon: AcademicCapIcon },
  bundle: { label: "Bundle", color: "success", icon: Squares2X2Icon },
  membership: { label: "Membership", color: "warning", icon: SparklesIcon },
};

/**
 * Single-row cart line item.
 *
 * Layout (desktop): thumbnail · title + type badge · unit price ·
 * quantity stepper · line subtotal · remove button.
 *
 * On narrow screens the row collapses to a card-like stack while keeping
 * the same affordances. Driven entirely by callbacks so it pairs with the
 * `useUpdateCartItem` / `useRemoveFromCart` hooks from `@/hooks/useEcommerce`.
 */
export function CartLineItem({
  item,
  onUpdateQuantity,
  onRemove,
  loading = false,
  currency = "USD",
  className,
}: CartLineItemProps) {
  const cfg = ITEM_TYPE_CONFIG[item.itemType] ?? ITEM_TYPE_CONFIG.course;
  const TypeIcon = cfg.icon;
  const canDecrement = item.quantity > 1;

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 dark:border-dark-600 sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
    >
      {/* Thumbnail + type badge */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-dark-600">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500/15 to-primary-700/20 dark:from-primary-500/10 dark:to-primary-700/25">
              <TypeIcon className="size-6 text-primary-500/70 dark:text-primary-400/70" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-dark-50"
            title={item.title}
          >
            {item.title}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge
              color={cfg.color}
              variant="soft"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px]"
            >
              <TypeIcon className="size-3 stroke-2" />
              {cfg.label}
            </Badge>
            <span className="text-xs text-gray-500 dark:text-dark-300">
              {formatPrice(item.unitPriceCents, currency)} each
            </span>
          </div>
        </div>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-gray-300 dark:border-dark-500">
          <Button
            color="neutral"
            variant="flat"
            isIcon
            disabled={loading || !canDecrement}
            aria-label="Decrease quantity"
            onClick={() => canDecrement && onUpdateQuantity(item.id, item.quantity - 1)}
            className="size-8 rounded-r-none border-0 text-gray-600 dark:text-dark-100"
          >
            <MinusIcon className="size-4 stroke-2" />
          </Button>
          <input
            type="number"
            min={1}
            value={item.quantity}
            disabled={loading}
            aria-label={`Quantity for ${item.title}`}
            onChange={(e) => {
              const next = Math.max(1, Number(e.target.value) || 1);
              onUpdateQuantity(item.id, next);
            }}
            className="w-12 border-x border-gray-300 bg-transparent py-1 text-center text-sm font-semibold text-gray-900 outline-none focus:bg-gray-50 dark:border-dark-500 dark:text-dark-50 dark:focus:bg-dark-600"
          />
          <Button
            color="neutral"
            variant="flat"
            isIcon
            disabled={loading}
            aria-label="Increase quantity"
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            className="size-8 rounded-l-none border-0 text-gray-600 dark:text-dark-100"
          >
            <PlusIcon className="size-4 stroke-2" />
          </Button>
        </div>
      </div>

      {/* Subtotal */}
      <div className="flex items-center justify-between gap-3 sm:justify-end sm:text-right">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Subtotal
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-dark-50">
            {formatPrice(item.subtotalCents, currency)}
          </p>
        </div>

        <Button
          color="error"
          variant="flat"
          isIcon
          disabled={loading}
          aria-label="Remove item"
          onClick={() => onRemove(item.id)}
          className="size-9 text-gray-400 hover:text-error-500 dark:text-dark-400 dark:hover:text-error-400"
        >
          <TrashIcon className="size-4.5 stroke-2" />
        </Button>
      </div>
    </div>
  );
}

export default CartLineItem;
