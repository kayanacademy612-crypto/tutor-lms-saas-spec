// GatewayList — sidebar list of all supported payment gateways.
//
// Renders one entry per supported gateway (Stripe, PayPal, Razorpay, Manual,
// Mollie, Paystack, Klarna, Alipay, Authorize.net, 2Checkout, Paddle). When a
// gateway has been configured for the tenant (`configs`), the entry is
// enriched with its enabled / default / mode badges and clicking it selects
// the existing config in the main panel. When a gateway has no config yet,
// clicking it switches the main panel into "create" mode for that gateway
// type.
//
// All hooks come from `@/hooks/useEcommerce` (P3-A5). Visual style mirrors the
// sidebar nav pattern established in `apps/ecommerce/index.tsx`.

// Import Dependencies
import { ComponentType } from "react";
import clsx from "clsx";
import {
  CreditCardIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  CommandLineIcon,
  GlobeAltIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Badge } from "@/components/ui";
import type { PaymentGatewayConfig } from "@/types/lms";

// ----------------------------------------------------------------------

/** Canonical list of gateways the platform supports. */
export interface GatewayMeta {
  /** Lowercase gateway key — matches `PaymentGatewayConfig.gateway`. */
  key: string;
  /** Human-readable name. */
  label: string;
  /** Heroicon component used as the icon glyph. */
  icon: ComponentType<{ className?: string }>;
  /** Short tagline shown beneath the label. */
  tagline: string;
}

export const SUPPORTED_GATEWAYS: GatewayMeta[] = [
  {
    key: "stripe",
    label: "Stripe",
    icon: CreditCardIcon,
    tagline: "Cards, Apple Pay, Google Pay",
  },
  {
    key: "paypal",
    label: "PayPal",
    icon: GlobeAltIcon,
    tagline: "PayPal balance & cards",
  },
  {
    key: "razorpay",
    label: "Razorpay",
    icon: CreditCardIcon,
    tagline: "UPI, cards, netbanking (IN)",
  },
  {
    key: "manual",
    label: "Manual",
    icon: CommandLineIcon,
    tagline: "Offline / bank transfer",
  },
  {
    key: "mollie",
    label: "Mollie",
    icon: CreditCardIcon,
    tagline: "European payment methods",
  },
  {
    key: "paystack",
    label: "Paystack",
    icon: CreditCardIcon,
    tagline: "African payment methods",
  },
  {
    key: "klarna",
    label: "Klarna",
    icon: BanknotesIcon,
    tagline: "Buy now, pay later",
  },
  {
    key: "alipay",
    label: "Alipay",
    icon: GlobeAltIcon,
    tagline: "China cross-border",
  },
  {
    key: "authorize_net",
    label: "Authorize.net",
    icon: CreditCardIcon,
    tagline: "Cards (US)",
  },
  {
    key: "twocheckout",
    label: "2Checkout",
    icon: GlobeAltIcon,
    tagline: "Global cards + PayPal",
  },
  {
    key: "paddle",
    label: "Paddle",
    icon: BanknotesIcon,
    tagline: "Merchant-of-record (tax)",
  },
];

export interface GatewayListProps {
  /** All gateway configurations the tenant has saved. */
  configs: PaymentGatewayConfig[];
  /** Gateway key of the currently selected entry. */
  selectedKey: string;
  /** Switch the main panel to a different gateway. */
  onSelect: (gatewayKey: string) => void;
  /** Re-fetch the gateway list (used by the error retry button). */
  onRetry?: () => void;
  /** True while the initial list is loading. */
  loading?: boolean;
  /** Error from the list fetch, if any. */
  error?: unknown;
}

// ----------------------------------------------------------------------

export default function GatewayList({
  configs,
  selectedKey,
  onSelect,
  loading = false,
}: GatewayListProps) {
  return (
    <nav
      className="space-y-1"
      aria-label="Payment gateways"
    >
      {SUPPORTED_GATEWAYS.map((meta) => {
        const cfg = configs.find((c) => c.gateway === meta.key);
        const isSelected = meta.key === selectedKey;
        const Icon = meta.icon;
        return (
          <Button
            key={meta.key}
            variant="flat"
            color={isSelected ? "primary" : "neutral"}
            onClick={() => onSelect(meta.key)}
            className={clsx(
              "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
              isSelected
                ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
            )}
          >
            <Icon
              className={clsx(
                "size-5 shrink-0 stroke-2 transition-colors",
                isSelected
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
              )}
            />
            <span className="flex-1 text-left">
              <span className="block">{meta.label}</span>
              <span className="mt-0.5 block text-[11px] font-normal text-gray-400 dark:text-dark-400">
                {loading ? "Loading…" : meta.tagline}
              </span>
            </span>
            {cfg?.isDefault && (
              <Badge
                color="primary"
                variant="filled"
                className="text-[10px]"
              >
                Default
              </Badge>
            )}
            {cfg?.isEnabled && !cfg?.isDefault && (
              <span
                className="size-1.5 shrink-0 rounded-full bg-success-500"
                aria-label="Enabled"
                title="Enabled"
              />
            )}
          </Button>
        );
      })}

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-error-500/30 bg-error-500/5 px-3 py-2 text-xs text-error-600 dark:text-error-400">
          <ArrowPathIcon className="size-3.5" />
          <span className="flex-1">Couldn't load config.</span>
          {onRetry && (
            <Button
              isIcon
              unstyled
              className="size-6 text-error-600 dark:text-error-400"
              onClick={onRetry}
              aria-label="Retry gateway fetch"
            >
              <ArrowPathIcon className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </nav>
  );
}

/** Re-exported so parent pages can iterate the full gateway set. */
export { BuildingLibraryIcon };
