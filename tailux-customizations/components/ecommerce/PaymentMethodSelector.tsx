// Import Dependencies
import clsx from "clsx";
import {
  CreditCardIcon,
  BanknotesIcon,
  WalletIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import type { PaymentGatewayConfig } from "@/types/lms";

// ----------------------------------------------------------------------

export interface PaymentMethodSelectorProps {
  /** Enabled payment gateways to choose from. */
  gateways: PaymentGatewayConfig[];
  /** Gateway key currently selected (matches `PaymentGatewayConfig.gateway`). */
  selected: string;
  /** Called with the gateway key when the user picks a method. */
  onSelect: (gateway: string) => void;
  /** Disable the whole selector (e.g. while a payment is processing). */
  disabled?: boolean;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Maps a gateway key to a representative heroicon. Unknown gateways fall
 * back to the generic `CreditCardIcon`.
 */
const GATEWAY_ICONS: Record<string, typeof CreditCardIcon> = {
  stripe: CreditCardIcon,
  paypal: WalletIcon,
  razorpay: BanknotesIcon,
  manual: BuildingLibraryIcon,
  bank: BuildingLibraryIcon,
  bank_transfer: BuildingLibraryIcon,
};

/**
 * Maps a gateway key to a friendly display name.
 */
const GATEWAY_LABELS: Record<string, string> = {
  stripe: "Credit / Debit Card",
  paypal: "PayPal",
  razorpay: "Razorpay",
  manual: "Manual / Offline",
  bank: "Bank Transfer",
  bank_transfer: "Bank Transfer",
};

interface OptionCardProps {
  gateway: PaymentGatewayConfig;
  isSelected: boolean;
  disabled: boolean;
  onSelect: (gateway: string) => void;
}

function OptionCard({ gateway, isSelected, disabled, onSelect }: OptionCardProps) {
  const Icon = GATEWAY_ICONS[gateway.gateway] ?? CreditCardIcon;
  const label = GATEWAY_LABELS[gateway.gateway] ?? gateway.gateway.replace(/_/g, " ");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(gateway.gateway)}
      aria-pressed={isSelected}
      className={clsx(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary-500/40",
        isSelected
          ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-400/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-dark-600 dark:bg-dark-700 dark:hover:border-dark-500",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {/* Radio indicator */}
      <span
        className={clsx(
          "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          isSelected
            ? "border-primary-500 dark:border-primary-400"
            : "border-gray-300 dark:border-dark-500",
        )}
      >
        {isSelected && (
          <span className="size-2 rounded-full bg-primary-500 dark:bg-primary-400" />
        )}
      </span>

      {/* Icon well */}
      <span
        className={clsx(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          isSelected
            ? "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400"
            : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-200",
        )}
      >
        <Icon className="size-5 stroke-2" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold capitalize text-gray-900 dark:text-dark-50">
          {label}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-dark-300">
          {gateway.isDefault ? "Default gateway" : `Gateway: ${gateway.gateway}`}
          {gateway.mode === "test" && (
            <span className="ml-1.5 rounded bg-warning-500/10 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
              test
            </span>
          )}
        </p>
      </div>
    </button>
  );
}

/**
 * Radio-card selector for payment gateways.
 *
 * Renders one clickable card per enabled gateway. The currently-selected
 * gateway is highlighted with a primary border + tinted background and a
 * filled radio dot. Driven entirely by `selected`/`onSelect` so the parent
 * owns the form state.
 */
export function PaymentMethodSelector({
  gateways,
  selected,
  onSelect,
  disabled = false,
  className,
}: PaymentMethodSelectorProps) {
  if (!gateways || gateways.length === 0) {
    return (
      <div
        className={clsx(
          "rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-dark-600 dark:bg-dark-700/50 dark:text-dark-300",
          className,
        )}
      >
        No payment methods are currently enabled.
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Payment method"
      className={clsx("flex flex-col gap-2", className)}
    >
      {gateways.map((g) => (
        <OptionCard
          key={g.id ?? g.gateway}
          gateway={g}
          isSelected={g.gateway === selected}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default PaymentMethodSelector;
