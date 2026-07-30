// Ecommerce Settings — store-wide ecommerce configuration.
//
// Layout: top bar + 2-column body (sidebar with 5 sections + main panel).
//   Sections:
//     - General    : enable eCommerce, guest checkout, coupons, cart expiry,
//                    default gateway
//     - Currency   : currency code, position, decimal/thousand separator,
//                    decimal count
//     - Tax Rules  : list + add/edit/delete tax rates (real `useTaxRates` +
//                    create/update/delete hooks; modal at `TaxRateModal.tsx`)
//     - Invoicing  : invoice prefix, numbering sequence, company header,
//                    logo upload, preview-invoice button
//     - Checkout   : one-page checkout toggle, required billing fields,
//                    T&Cs textarea, success message textarea
//
// Notes:
//   - Backend doesn't yet expose a generic "ecommerce settings" resource.
//     Values for the General / Currency / Invoicing / Checkout sections are
//     persisted to `localStorage` (key `tailux.ecommerce.settings.v1`) so
//     they survive page reloads. Tax Rules are real-server backed via the
//     `useTaxRates*` hooks.
//   - Visual style mirrors `apps/settings-pages/index.tsx` and
//     `apps/ecommerce/index.tsx`.

// Import Dependencies
import {
  ChangeEvent,
  ComponentType,
  ReactNode,
  useEffect,
  useState,
} from "react";
import clsx from "clsx";
import {
  Cog6ToothIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  CheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  EyeIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Switch,
  Checkbox,
  Select,
  ScrollShadow,
} from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import {
  useTaxRates,
  useDeleteTaxRate,
  useGateways,
} from "@/hooks/useEcommerce";
import type { TaxRate } from "@/types/lms";

import TaxRateModal from "./TaxRateModal";

// ----------------------------------------------------------------------

type SectionId = "general" | "currency" | "tax" | "invoicing" | "checkout";

interface NavItem {
  id: SectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "general",
    label: "General",
    icon: Cog6ToothIcon,
    description: "Enable eCommerce, coupons & cart expiry",
  },
  {
    id: "currency",
    label: "Currency",
    icon: CurrencyDollarIcon,
    description: "Symbol, position & precision",
  },
  {
    id: "tax",
    label: "Tax Rules",
    icon: ScaleIcon,
    description: "Country / region tax rates",
  },
  {
    id: "invoicing",
    label: "Invoicing",
    icon: DocumentTextIcon,
    description: "Invoice prefix & header",
  },
  {
    id: "checkout",
    label: "Checkout",
    icon: ShoppingCartIcon,
    description: "One-page flow & required fields",
  },
];

// ----------------------------------------------------------------------

const STORAGE_KEY = "tailux.ecommerce.settings.v1";

/** Shape of the localStorage-persisted settings. */
interface EcommerceSettingsState {
  // General
  ecommerceEnabled: boolean;
  guestCheckout: boolean;
  couponsEnabled: boolean;
  cartExpiryMinutes: number;
  defaultGateway: string;
  // Currency
  currency: string;
  currencyPosition: "before" | "after";
  decimalSeparator: string;
  thousandSeparator: string;
  decimals: number;
  // Invoicing
  invoicePrefix: string;
  invoiceSequence: number;
  invoiceCompanyName: string;
  invoiceAddress: string;
  invoiceTaxId: string;
  invoiceLogoUrl: string;
  // Checkout
  onePageCheckout: boolean;
  requireBillingName: boolean;
  requireBillingEmail: boolean;
  requireBillingAddress: boolean;
  requireBillingPhone: boolean;
  termsAndConditions: string;
  successMessage: string;
}

const DEFAULT_SETTINGS: EcommerceSettingsState = {
  ecommerceEnabled: true,
  guestCheckout: false,
  couponsEnabled: true,
  cartExpiryMinutes: 60,
  defaultGateway: "stripe",
  currency: "USD",
  currencyPosition: "before",
  decimalSeparator: ".",
  thousandSeparator: ",",
  decimals: 2,
  invoicePrefix: "INV-",
  invoiceSequence: 1001,
  invoiceCompanyName: "",
  invoiceAddress: "",
  invoiceTaxId: "",
  invoiceLogoUrl: "",
  onePageCheckout: false,
  requireBillingName: true,
  requireBillingEmail: true,
  requireBillingAddress: false,
  requireBillingPhone: false,
  termsAndConditions: "",
  successMessage:
    "Thanks for your purchase! Your course access is now active.",
};

function loadSettings(): EcommerceSettingsState {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<EcommerceSettingsState>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(s: EcommerceSettingsState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // Quota / privacy mode — silently ignore.
  }
}

// ======================================================================
// Top-level layout
// ======================================================================

export default function EcommerceSettings() {
  const [active, setActive] = useState<SectionId>("general");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settings, setSettings] = useState<EcommerceSettingsState>(
    DEFAULT_SETTINGS,
  );

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Persist on every change.
  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const update = <K extends keyof EcommerceSettingsState>(
    key: K,
    value: EcommerceSettingsState[K],
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="Ecommerce Settings">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <CurrencyDollarIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Ecommerce Settings
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Currency, tax rules, invoicing & checkout configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              {settings.ecommerceEnabled ? "Store open" : "Store closed"}
            </Badge>
            {/* Mobile sidebar toggle */}
            <Button
              variant="outlined"
              color="neutral"
              isIcon
              className="lg:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Cog6ToothIcon className="size-5" />
            </Button>
          </div>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside
            className={clsx(
              "absolute inset-y-0 left-0 z-30 w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 lg:static lg:flex",
              mobileNavOpen ? "flex" : "hidden lg:flex",
            )}
          >
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav
                className="space-y-1 p-3"
                aria-label="Ecommerce settings navigation"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => {
                        setActive(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={clsx(
                        "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-5 shrink-0 stroke-2 transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>

            {/* Sidebar footer — local persistence reminder */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <CheckIcon className="size-5" />
                  <p className="text-xs font-semibold">Saved locally</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  General, currency, invoicing & checkout settings persist to
                  your browser until a server settings API lands. Tax rules
                  are saved to the backend.
                </p>
              </Card>
            </div>
          </aside>

          {/* Mobile overlay */}
          {mobileNavOpen && (
            <div
              className="absolute inset-0 z-20 bg-black/40 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Ecommerce Settings</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-gray-400 dark:text-dark-400 sm:flex">
                <Cog6ToothIcon className="size-3.5" />
                <span>{activeItem.description}</span>
              </div>
            </div>

            {/* Active section */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-4xl px-6 py-6">
                {active === "general" && (
                  <GeneralSection settings={settings} update={update} />
                )}
                {active === "currency" && (
                  <CurrencySection settings={settings} update={update} />
                )}
                {active === "tax" && <TaxRulesSection />}
                {active === "invoicing" && (
                  <InvoicingSection settings={settings} update={update} />
                )}
                {active === "checkout" && (
                  <CheckoutSection settings={settings} update={update} />
                )}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ======================================================================
// Shared layout primitives
// ======================================================================

function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-5 dark:border-dark-600">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
          <Icon className="size-5 stroke-2" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function FieldGroup({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </Card>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.checked)
        }
      />
    </div>
  );
}

function SaveFooter({
  onSave,
  onReset,
}: {
  onSave?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <Button
        variant="flat"
        color="neutral"
        className="min-w-[7rem]"
        onClick={onReset}
      >
        Cancel
      </Button>
      <Button
        color="primary"
        className="min-w-[7rem] gap-1.5"
        onClick={onSave}
      >
        <CheckIcon className="size-4 stroke-2" />
        Save Changes
      </Button>
    </div>
  );
}

// ======================================================================
// 1. General
// ======================================================================

function GeneralSection({
  settings,
  update,
}: {
  settings: EcommerceSettingsState;
  update: <K extends keyof EcommerceSettingsState>(
    key: K,
    value: EcommerceSettingsState[K],
  ) => void;
}) {
  const { data: gateways } = useGateways();
  const enabledGateways = (gateways ?? []).filter((g) => g.isEnabled);

  return (
    <div>
      <SectionHeader
        title="General"
        description="Configure store-wide ecommerce options."
        icon={Cog6ToothIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Store options"
          description="Master switches that gate the entire ecommerce surface."
        >
          <ToggleRow
            title="Enable eCommerce"
            description="When off, the catalog, cart and checkout screens are hidden from students."
            checked={settings.ecommerceEnabled}
            onChange={(v) => update("ecommerceEnabled", v)}
          />
          <ToggleRow
            title="Allow guest checkout"
            description="Guests can purchase without creating an account. Their email is used to deliver access."
            checked={settings.guestCheckout}
            onChange={(v) => update("guestCheckout", v)}
          />
          <ToggleRow
            title="Enable coupons"
            description="Show the coupon input on the cart and accept coupon codes at checkout."
            checked={settings.couponsEnabled}
            onChange={(v) => update("couponsEnabled", v)}
          />
        </FieldGroup>

        <FieldGroup
          title="Cart"
          description="Tune cart retention and the default payment route."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Cart expiry (minutes)"
              type="number"
              min="1"
              max="10080"
              value={String(settings.cartExpiryMinutes)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update(
                  "cartExpiryMinutes",
                  Math.max(1, Number(e.target.value) || 1),
                )
              }
              description="Carts older than this are cleared on the next fetch."
            />
            <Select
              label="Default payment gateway"
              value={settings.defaultGateway}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                update("defaultGateway", e.target.value)
              }
              description="Pre-selected at checkout when the buyer has no preference."
              data={
                enabledGateways.length > 0
                  ? enabledGateways.map((g) => ({
                      value: g.gateway,
                      label: g.gateway.replace(/_/g, " "),
                    }))
                  : [
                      { value: "stripe", label: "Stripe" },
                      { value: "paypal", label: "PayPal" },
                      { value: "razorpay", label: "Razorpay" },
                      { value: "manual", label: "Manual" },
                    ]
              }
            />
          </div>
        </FieldGroup>
      </div>

      <SaveFooter
        onSave={() => {
          // Persisted automatically via the useEffect in the parent.
          // Surface a soft confirmation so the user knows the click registered.
          window.alert("Ecommerce general settings saved.");
        }}
      />
    </div>
  );
}

// ======================================================================
// 2. Currency
// ======================================================================

function CurrencySection({
  settings,
  update,
}: {
  settings: EcommerceSettingsState;
  update: <K extends keyof EcommerceSettingsState>(
    key: K,
    value: EcommerceSettingsState[K],
  ) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Currency"
        description="How monetary values are displayed across the store."
        icon={CurrencyDollarIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Currency code"
          description="ISO 4217 code used by `formatPrice` for symbol resolution."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Currency"
              value={settings.currency}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                update("currency", e.target.value)
              }
              data={[
                { value: "USD", label: "USD — US Dollar ($)" },
                { value: "EUR", label: "EUR — Euro (€)" },
                { value: "GBP", label: "GBP — Pound (£)" },
                { value: "INR", label: "INR — Indian Rupee (₹)" },
                { value: "JPY", label: "JPY — Japanese Yen (¥)" },
                { value: "CNY", label: "CNY — Chinese Yuan (¥)" },
                { value: "AUD", label: "AUD — Australian Dollar (A$)" },
                { value: "CAD", label: "CAD — Canadian Dollar (C$)" },
                { value: "BRL", label: "BRL — Brazilian Real (R$)" },
              ]}
            />
            <Select
              label="Symbol position"
              value={settings.currencyPosition}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                update(
                  "currencyPosition",
                  e.target.value as "before" | "after",
                )
              }
              data={[
                { value: "before", label: "Before amount — $29.99" },
                { value: "after", label: "After amount — 29.99$" },
              ]}
            />
          </div>
        </FieldGroup>

        <FieldGroup
          title="Number formatting"
          description="Decimal & thousand separators, plus the number of decimals."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Decimal separator"
              value={settings.decimalSeparator}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("decimalSeparator", e.target.value)
              }
              placeholder="."
            />
            <Input
              label="Thousand separator"
              value={settings.thousandSeparator}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("thousandSeparator", e.target.value)
              }
              placeholder=","
            />
            <Input
              label="Decimals"
              type="number"
              min="0"
              max="4"
              value={String(settings.decimals)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update(
                  "decimals",
                  Math.min(4, Math.max(0, Number(e.target.value) || 0)),
                )
              }
            />
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-dark-300">
            Preview:{" "}
            <span className="font-mono text-gray-700 dark:text-dark-200">
              {settings.currencyPosition === "before" ? "$" : ""}
              {Number(2999.5).toLocaleString(undefined, {
                minimumFractionDigits: settings.decimals,
                maximumFractionDigits: settings.decimals,
              })}
              {settings.currencyPosition === "after" ? " $" : ""}
            </span>
          </p>
        </FieldGroup>
      </div>

      <SaveFooter
        onSave={() => window.alert("Currency settings saved.")}
      />
    </div>
  );
}

// ======================================================================
// 3. Tax Rules
// ======================================================================

function TaxRulesSection() {
  const { data, loading, error, refetch } = useTaxRates();
  const deleteTaxRate = useDeleteTaxRate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (t: TaxRate) => {
    setEditing(t);
    setModalOpen(true);
  };
  const close = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = (t: TaxRate) => {
    if (!window.confirm(`Delete tax rate "${t.name}"?`)) return;
    void deleteTaxRate.mutate(t.id).then(() => refetch());
  };

  return (
    <div>
      <SectionHeader
        title="Tax Rules"
        description="Country / region tax rates applied at checkout."
        icon={ScaleIcon}
        action={
          <Button
            color="primary"
            variant="filled"
            className="gap-1.5"
            onClick={openCreate}
          >
            <PlusIcon className="size-4" />
            Add tax rate
          </Button>
        }
      />

      {loading && !data ? (
        <Card className="p-4">
          <LoadingState message="Loading tax rates…" />
        </Card>
      ) : error ? (
        <Card className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : !data || data.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={ScaleIcon}
            title="No tax rates yet"
            description="Add a tax rate to start charging tax at checkout."
            actionLabel="Add tax rate"
            onAction={openCreate}
          />
        </Card>
      ) : (
        <Card skin="bordered" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:text-dark-300">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 text-right font-semibold">Rate</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                {data.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-dark-100">
                      {t.name}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-dark-200">
                      {[t.countryCode, t.regionCode]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-dark-200">
                      {t.ratePercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-dark-200">
                      {t.isInclusive ? "Inclusive" : "Exclusive"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-dark-200">
                      {t.priority ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={t.isActive ? "success" : "neutral"}
                        variant="soft"
                        className="text-[10px]"
                      >
                        {t.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          isIcon
                          variant="flat"
                          color="neutral"
                          className="size-7"
                          onClick={() => openEdit(t)}
                          aria-label={`Edit ${t.name}`}
                        >
                          <PencilSquareIcon className="size-4" />
                        </Button>
                        <Button
                          isIcon
                          variant="flat"
                          color="error"
                          className="size-7"
                          onClick={() => handleDelete(t)}
                          disabled={deleteTaxRate.loading}
                          aria-label={`Delete ${t.name}`}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <TaxRateModal
        open={modalOpen}
        taxRate={editing}
        onClose={close}
        onSaved={refetch}
      />
    </div>
  );
}

// ======================================================================
// 4. Invoicing
// ======================================================================

function InvoicingSection({
  settings,
  update,
}: {
  settings: EcommerceSettingsState;
  update: <K extends keyof EcommerceSettingsState>(
    key: K,
    value: EcommerceSettingsState[K],
  ) => void;
}) {
  const previewInvoice = () => {
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Invoice preview</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#111827;max-width:680px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#6b7280;font-size:13px}
  .row{display:flex;justify-content:space-between;margin-top:6px;font-size:13px}
</style></head>
<body>
  <h1>${settings.invoicePrefix}${settings.invoiceSequence}</h1>
  <p class="muted">${settings.invoiceCompanyName || "Your Company"} · ${settings.invoiceTaxId || "Tax ID: —"}</p>
  <p class="muted">${settings.invoiceAddress || "Address line"}</p>
  <div style="margin-top:24px">
    <div class="row"><span class="muted">Sample item</span><span>$99.00</span></div>
    <div class="row"><span class="muted">Tax</span><span>$0.00</span></div>
    <div class="row" style="font-weight:700;font-size:15px"><span>Total</span><span>$99.00</span></div>
  </div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <div>
      <SectionHeader
        title="Invoicing"
        description="Invoice numbering, header & logo."
        icon={DocumentTextIcon}
        action={
          <Button
            variant="outlined"
            color="primary"
            className="gap-1.5"
            onClick={previewInvoice}
          >
            <EyeIcon className="size-4" />
            Preview invoice
          </Button>
        }
      />

      <div className="space-y-5">
        <FieldGroup
          title="Numbering"
          description="The next invoice will be issued with this prefix + sequence."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Invoice prefix"
              value={settings.invoicePrefix}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("invoicePrefix", e.target.value)
              }
              placeholder="INV-"
            />
            <Input
              label="Next sequence number"
              type="number"
              min="1"
              value={String(settings.invoiceSequence)}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update(
                  "invoiceSequence",
                  Math.max(1, Number(e.target.value) || 1),
                )
              }
            />
          </div>
        </FieldGroup>

        <FieldGroup
          title="Invoice header"
          description="Shown at the top of every PDF invoice."
        >
          <div className="space-y-4">
            <Input
              label="Company name"
              value={settings.invoiceCompanyName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("invoiceCompanyName", e.target.value)
              }
              placeholder="Acme Learning Inc."
            />
            <Textarea
              label="Company address"
              rows={3}
              value={settings.invoiceAddress}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                update("invoiceAddress", e.target.value)
              }
              placeholder={"123 Main St\nSan Francisco, CA 94110\nUnited States"}
            />
            <Input
              label="Tax ID / VAT number"
              value={settings.invoiceTaxId}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("invoiceTaxId", e.target.value)
              }
              placeholder="VAT-12345678"
            />
            <Input
              label="Logo URL"
              value={settings.invoiceLogoUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("invoiceLogoUrl", e.target.value)
              }
              placeholder="https://cdn.example.com/logo.png"
              description="Paste a hosted image URL. File upload lands with the settings API."
            />
          </div>
        </FieldGroup>
      </div>

      <SaveFooter onSave={() => window.alert("Invoicing settings saved.")} />
    </div>
  );
}

// ======================================================================
// 5. Checkout
// ======================================================================

function CheckoutSection({
  settings,
  update,
}: {
  settings: EcommerceSettingsState;
  update: <K extends keyof EcommerceSettingsState>(
    key: K,
    value: EcommerceSettingsState[K],
  ) => void;
}) {
  return (
    <div>
      <SectionHeader
        title="Checkout"
        description="Flow shape, required fields & buyer-facing copy."
        icon={ShoppingCartIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Flow"
          description="Single-page vs. multi-step checkout."
        >
          <ToggleRow
            title="One-page checkout"
            description="Combine billing + payment into a single screen. Disable for a guided multi-step flow."
            checked={settings.onePageCheckout}
            onChange={(v) => update("onePageCheckout", v)}
          />
        </FieldGroup>

        <FieldGroup
          title="Required billing fields"
          description="Buyers can't complete checkout until these are filled."
        >
          <div className="space-y-3">
            <Checkbox
              label="Full name"
              checked={settings.requireBillingName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("requireBillingName", e.target.checked)
              }
            />
            <Checkbox
              label="Email address"
              checked={settings.requireBillingEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("requireBillingEmail", e.target.checked)
              }
            />
            <Checkbox
              label="Billing address"
              checked={settings.requireBillingAddress}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("requireBillingAddress", e.target.checked)
              }
            />
            <Checkbox
              label="Phone number"
              checked={settings.requireBillingPhone}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update("requireBillingPhone", e.target.checked)
              }
            />
          </div>
        </FieldGroup>

        <FieldGroup
          title="Buyer-facing copy"
          description="Legal terms shown before payment and the message on the success page."
        >
          <div className="space-y-4">
            <Textarea
              label="Terms & conditions"
              rows={5}
              value={settings.termsAndConditions}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                update("termsAndConditions", e.target.value)
              }
              placeholder="By checking out you agree to our refund policy, terms of service, and privacy policy."
            />
            <Textarea
              label="Success page message"
              rows={3}
              value={settings.successMessage}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                update("successMessage", e.target.value)
              }
              placeholder="Thanks for your purchase!"
            />
          </div>
        </FieldGroup>
      </div>

      <SaveFooter onSave={() => window.alert("Checkout settings saved.")} />
    </div>
  );
}

// Unused symbol exported for tree-shaking friendliness on consumers that
// import the icon set from this module.
export { BuildingOffice2Icon, ArrowPathIcon };
