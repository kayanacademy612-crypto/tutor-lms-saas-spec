// Payment Settings — gateway configuration page.
//
// Two-column layout (sidebar + main panel):
//   - Sidebar: list of the 11 supported gateways (Stripe, PayPal, Razorpay,
//     Manual, Mollie, Paystack, Klarna, Alipay, Authorize.net, 2Checkout,
//     Paddle). Each item shows enabled / default indicators and the mode
//     (test / live).
//   - Main: dynamic config form for the selected gateway.
//
// All data flows through the real API hooks (P3-A5):
//   - `useGateways()`          — list configured gateways
//   - `useCreateGateway()`     — create a new gateway config
//   - `useUpdateGateway()`     — update an existing gateway config
//   - `useDeleteGateway()`     — delete a gateway config
//
// Visual style mirrors `apps/ecommerce/index.tsx` (top bar + sidebar + main).

// Import Dependencies
import { useMemo, useState } from "react";
import {
  CreditCardIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, ScrollShadow } from "@/components/ui";
import {
  LoadingState,
  ErrorState,
} from "@/components/lms";
import { useGateways } from "@/hooks/useEcommerce";

import GatewayList, { SUPPORTED_GATEWAYS } from "./GatewayList";
import GatewayConfigForm from "./GatewayConfigForm";

// ----------------------------------------------------------------------

export default function PaymentSettings() {
  const [selectedKey, setSelectedKey] = useState<string>("stripe");

  const { data: gateways, loading, error, refetch } = useGateways();

  const selectedConfig = useMemo(
    () => gateways?.find((g) => g.gateway === selectedKey),
    [gateways, selectedKey],
  );

  // ───────────────── Loading ─────────────────
  if (loading && !gateways) {
    return (
      <Page title="Payment Settings">
        <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
          <HeaderBar
            configuredCount={0}
            defaultGatewayLabel={undefined}
          />
          <div className="flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md p-4">
              <LoadingState message="Loading payment gateways…" />
            </Card>
          </div>
        </div>
      </Page>
    );
  }

  // ───────────────── Error (no data yet) ─────────────────
  if (error && !gateways) {
    return (
      <Page title="Payment Settings">
        <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
          <HeaderBar
            configuredCount={0}
            defaultGatewayLabel={undefined}
          />
          <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-md p-4">
              <ErrorState
                error={error}
                onRetry={refetch}
                title="Couldn't load payment gateways"
              />
            </Card>
          </div>
        </div>
      </Page>
    );
  }

  const configs = gateways ?? [];
  const configuredCount = configs.filter((c) => c.isEnabled).length;
  const defaultGateway = configs.find((c) => c.isDefault);
  const defaultGatewayLabel = defaultGateway
    ? SUPPORTED_GATEWAYS.find((g) => g.key === defaultGateway.gateway)?.label ??
      defaultGateway.gateway
    : undefined;

  return (
    <Page title="Payment Settings">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        <HeaderBar
          configuredCount={configuredCount}
          defaultGatewayLabel={defaultGatewayLabel}
        />

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="p-3">
                <GatewayList
                  configs={configs}
                  selectedKey={selectedKey}
                  onSelect={setSelectedKey}
                  loading={loading}
                  error={error}
                  onRetry={refetch}
                />
              </div>
            </ScrollShadow>

            {/* Sidebar footer — quick summary */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="size-5" />
                  <p className="text-xs font-semibold">PCI compliance</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  We never store raw card data. Credentials are encrypted at
                  rest and redacted on the client.
                </p>
              </Card>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Payment Settings</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {SUPPORTED_GATEWAYS.find((g) => g.key === selectedKey)
                    ?.label ?? selectedKey}
                </span>
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-gray-400 dark:text-dark-400 sm:flex">
                <CheckCircleIcon className="size-3.5" />
                <span>
                  {configuredCount} of {SUPPORTED_GATEWAYS.length} gateways
                  enabled
                </span>
              </div>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-4xl px-6 py-6">
                <GatewayConfigForm
                  key={selectedKey}
                  gatewayKey={selectedKey}
                  config={selectedConfig}
                  onSaved={refetch}
                  onDeleted={() => {
                    refetch();
                    // Fall back to the first gateway when the selected one is
                    // removed.
                    setSelectedKey("stripe");
                  }}
                />
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

function HeaderBar({
  configuredCount,
  defaultGatewayLabel,
}: {
  configuredCount: number;
  defaultGatewayLabel?: string;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
          <CreditCardIcon className="size-5 stroke-2" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
            Payment Settings
          </h1>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Configure gateways, manage credentials, and test connections.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge color="primary" variant="soft" className="gap-1">
          <span className="size-1.5 rounded-full bg-primary-500" />
          {configuredCount} enabled
        </Badge>
        {defaultGatewayLabel ? (
          <Badge color="success" variant="soft" className="gap-1">
            Default: {defaultGatewayLabel}
          </Badge>
        ) : (
          <Badge color="warning" variant="soft" className="gap-1">
            No default gateway
          </Badge>
        )}
        <Button
          variant="outlined"
          color="primary"
          className="gap-1.5"
          onClick={() => {
            // No-op for now — admin "regenerate webhook secret" flow lives in
            // the gateway-specific form.
          }}
        >
          <ShieldCheckIcon className="size-4 stroke-2" />
          <span className="hidden sm:inline">Webhook secrets</span>
        </Button>
      </div>
    </header>
  );
}
