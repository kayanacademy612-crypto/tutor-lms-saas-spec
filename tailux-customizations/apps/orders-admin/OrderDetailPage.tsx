// OrderDetailPage — admin detail view for a single order.
//
// Layout: top bar with back button + order number; body is a 2-column grid:
//   - Left: items table + payment info + order activity timeline.
//   - Right: sticky action rail with status, totals, invoice download, and
//     a refund form (when the order is `paid`).
//
// Hooks: `useOrder(id)`, `useOrderActivity(id)`, `useInvoices({ orderId })`
// (filtered client-side), `useRefundOrder()`.

// Import Dependencies
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentTextIcon,
  UserIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Badge,
  ScrollShadow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Input,
  Textarea,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import { OrderStatusBadge } from "@/components/ecommerce/OrderStatusBadge";
import {
  useInvoices,
  useOrder,
  useOrderActivity,
  useRefundOrder,
} from "@/hooks/useEcommerce";
import { lmsApi } from "@/services/lms-api";
import type { OrderActivity } from "@/types/lms";

// ----------------------------------------------------------------------

const refundSchema = yup.object({
  amount: yup
    .number()
    .typeError("Enter a valid amount")
    .positive("Amount must be greater than 0")
    .required("Amount is required"),
  reason: yup.string().trim().max(500, "Keep it under 500 characters"),
});

type RefundFormValues = yup.InferType<typeof refundSchema>;

// ----------------------------------------------------------------------

export default function OrderDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const orderQuery = useOrder(id || undefined);
  const activityQuery = useOrderActivity(id || undefined);
  const invoiceQuery = useInvoices();
  const refundMutation = useRefundOrder();

  const order = orderQuery.data;

  const invoicesForOrder = (invoiceQuery.data ?? []).filter(
    (inv) => inv.orderId === id,
  );

  return (
    <Page title="Order details">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-8"
              onClick={() => navigate("/apps/orders-admin")}
              aria-label="Back to orders"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                {order ? `Order ${order.orderNumber}` : "Order details"}
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Manage and audit this order.
              </p>
            </div>
          </div>
          {order && <OrderStatusBadge status={order.status} />}
        </header>

        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            {orderQuery.loading ? (
              <Card className="p-6">
                <LoadingState message="Loading order…" />
              </Card>
            ) : orderQuery.error ? (
              <Card className="p-6">
                <ErrorState
                  error={orderQuery.error}
                  onRetry={orderQuery.refetch}
                />
              </Card>
            ) : !order ? (
              <Card className="p-6">
                <EmptyState
                  icon={XCircleIcon}
                  title="Order not found"
                  description="This order may have been deleted or you don't have access."
                  actionLabel="Back to orders"
                  onAction={() => navigate("/apps/orders-admin")}
                />
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* Left column — items + activity */}
                <div className="space-y-6">
                  {/* Items */}
                  <Card skin="bordered" className="p-5">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                      <DocumentTextIcon className="size-4 text-primary-500" />
                      Items
                    </h2>
                    <ItemsTable order={order} />
                  </Card>

                  {/* Payment info */}
                  <Card skin="bordered" className="p-5">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                      <CreditCardIcon className="size-4 text-primary-500" />
                      Payment
                    </h2>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Detail
                        icon={CreditCardIcon}
                        label="Method"
                        value={order.paymentMethod ?? "—"}
                      />
                      <Detail
                        icon={CheckCircleIcon}
                        label="Gateway ref"
                        value={order.paymentGatewayRef ?? "—"}
                      />
                      <Detail
                        icon={ClockIcon}
                        label="Paid at"
                        value={
                          order.paidAt
                            ? new Date(order.paidAt).toLocaleString()
                            : "—"
                        }
                      />
                      <Detail
                        icon={CalendarDaysIcon}
                        label="Placed at"
                        value={new Date(order.createdAt).toLocaleString()}
                      />
                    </dl>
                  </Card>

                  {/* Activity timeline */}
                  <Card skin="bordered" className="p-5">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                      <ClockIcon className="size-4 text-primary-500" />
                      Activity timeline
                    </h2>
                    <ActivityTimeline
                      loading={activityQuery.loading}
                      error={activityQuery.error}
                      activities={activityQuery.data ?? []}
                      onRetry={activityQuery.refetch}
                    />
                  </Card>
                </div>

                {/* Right column — actions rail */}
                <aside className="space-y-4">
                  {/* Summary */}
                  <Card skin="bordered" className="p-5">
                    <h2 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                      Summary
                    </h2>
                    <OrderTotals order={order} />

                    {/* Invoice download */}
                    {invoicesForOrder.length > 0 && (
                      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-dark-600">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                          Invoices
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {invoicesForOrder.map((inv) => (
                            <li key={inv.id}>
                              <Button
                                variant="flat"
                                color="neutral"
                                className="w-full justify-between gap-1.5 text-xs"
                                onClick={() => downloadInvoice(inv.id, inv.invoiceNumber)}
                              >
                                <span className="font-mono">{inv.invoiceNumber}</span>
                                <ArrowDownTrayIcon className="size-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>

                  {/* Refund form (if paid) */}
                  {order.status === "paid" && (
                    <RefundForm
                      order={order}
                      onSubmit={async (vars) => {
                        const result = await refundMutation.mutate({
                          orderId: order.id,
                          input: {
                            amountCents: Math.round(vars.amount * 100),
                            reason: vars.reason || undefined,
                          },
                        });
                        if (result) {
                          await orderQuery.refetch();
                          await activityQuery.refetch();
                        }
                      }}
                      loading={refundMutation.loading}
                      error={refundMutation.error}
                    />
                  )}

                  {/* Customer */}
                  <Card skin="bordered" className="p-5">
                    <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
                      <UserIcon className="size-4 text-primary-500" />
                      Customer
                    </h2>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-dark-300">User ID</dt>
                        <dd className="font-mono text-xs text-gray-700 dark:text-dark-200">
                          {order.userId}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-dark-300">Tenant</dt>
                        <dd className="font-mono text-xs text-gray-700 dark:text-dark-200">
                          {order.tenantId}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </aside>
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

function ItemsTable({ order }: { order: NonNullable<ReturnType<typeof useOrder>["data"]> }) {
  const currency = (order.currency ?? "usd").toUpperCase();
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-gray-200 dark:border-dark-600">
      <Table className="w-full">
        <THead>
          <Tr>
            <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Item
            </Th>
            <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Type
            </Th>
            <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Unit price
            </Th>
            <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Qty
            </Th>
            <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Subtotal
            </Th>
          </Tr>
        </THead>
        <TBody>
          {order.items.map((it) => (
            <Tr key={it.id} className="border-t border-gray-100 dark:border-dark-600">
              <Td className="py-2.5 text-sm text-gray-700 dark:text-dark-200">
                {it.title}
              </Td>
              <Td className="py-2.5">
                <Badge color="neutral" variant="soft" className="text-[10px] capitalize">
                  {it.itemType}
                </Badge>
              </Td>
              <Td className="py-2.5 text-right text-sm text-gray-600 dark:text-dark-200">
                {formatPrice(it.unitPriceCents, currency)}
              </Td>
              <Td className="py-2.5 text-right text-sm text-gray-600 dark:text-dark-200">
                {it.quantity}
              </Td>
              <Td className="py-2.5 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                {formatPrice(it.subtotalCents, currency)}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function OrderTotals({ order }: { order: NonNullable<ReturnType<typeof useOrder>["data"]> }) {
  const currency = (order.currency ?? "usd").toUpperCase();
  return (
    <dl className="mt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-gray-500 dark:text-dark-300">Subtotal</dt>
        <dd className="text-gray-800 dark:text-dark-100">
          {formatPrice(order.subtotalCents, currency)}
        </dd>
      </div>
      {!!order.discountCents && (
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-dark-300">
            Discount{order.couponCode ? ` (${order.couponCode})` : ""}
          </dt>
          <dd className="text-success-600 dark:text-success-400">
            −{formatPrice(order.discountCents, currency)}
          </dd>
        </div>
      )}
      {!!order.taxCents && (
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-dark-300">Tax</dt>
          <dd className="text-gray-800 dark:text-dark-100">
            {formatPrice(order.taxCents, currency)}
          </dd>
        </div>
      )}
      <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-dark-600">
        <dt className="font-medium text-gray-700 dark:text-dark-200">Total</dt>
        <dd className="text-base font-bold text-gray-900 dark:text-dark-50">
          {formatPrice(order.totalCents, currency)}
        </dd>
      </div>
    </dl>
  );
}

function ActivityTimeline({
  loading,
  error,
  activities,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  activities: OrderActivity[];
  onRetry: () => void;
}) {
  if (loading) {
    return <LoadingState inline message="Loading activity…" className="py-4" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={ClockIcon}
        title="No activity yet"
        description="Order activity will appear here as the order is processed."
        compact
      />
    );
  }
  return (
    <ol className="mt-3 space-y-3">
      {activities.map((act) => {
        const date = new Date(act.createdAt);
        return (
          <li
            key={act.id}
            className="relative flex gap-3 pl-6 before:absolute before:bottom-0 before:left-[7px] before:top-2 before:w-px before:bg-gray-200 dark:before:bg-dark-600 [&:last-child]:before:hidden"
          >
            <span className="absolute left-0 top-1.5 size-3.5 rounded-full border-2 border-primary-500 bg-white dark:bg-dark-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium capitalize text-gray-800 dark:text-dark-100">
                {act.action.replace(/_/g, " ")}
              </p>
              {act.notes && (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                  {act.notes}
                </p>
              )}
              <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-400">
                {date.toLocaleString()}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function RefundForm({
  order,
  onSubmit,
  loading,
  error,
}: {
  order: NonNullable<ReturnType<typeof useOrder>["data"]>;
  onSubmit: (vars: RefundFormValues) => Promise<void>;
  loading: boolean;
  error: unknown;
}) {
  const currency = (order.currency ?? "usd").toUpperCase();
  const maxAmount = order.totalCents / 100;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RefundFormValues>({
    resolver: yupResolver(refundSchema),
    defaultValues: { amount: maxAmount, reason: "" },
    mode: "onTouched",
  });

  return (
    <Card skin="bordered" className="p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-dark-100">
        <ArrowPathIcon className="size-4 text-warning-500" />
        Issue refund
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
        Max refundable: {formatPrice(order.totalCents, currency)}
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-3 space-y-3"
      >
        <Input
          label="Refund amount"
          type="number"
          step="0.01"
          min="0.01"
          max={maxAmount}
          {...register("amount")}
          error={errors.amount?.message}
          prefix={<span className="text-xs text-gray-400">{currency}</span>}
        />
        <Textarea
          label="Reason (optional)"
          rows={3}
          placeholder="Customer request, duplicate charge, etc."
          {...register("reason")}
          error={errors.reason?.message}
        />
        {error && (
          <div className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-700 dark:bg-error-500/15 dark:text-error-400">
            {(error as { message?: string })?.message ?? "Refund failed. Try again."}
          </div>
        )}
        <Button
          type="submit"
          color="error"
          variant="filled"
          className="w-full gap-1.5 text-sm"
          disabled={loading}
        >
          <ArrowPathIcon className="size-4" />
          {loading ? "Processing refund…" : "Process refund"}
        </Button>
      </form>
    </Card>
  );
}

// ----------------------------------------------------------------------

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
        <Icon className="size-3.5" />
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-gray-800 dark:text-dark-100">
        {value}
      </dd>
    </div>
  );
}

// Re-import ComponentType locally to avoid a circular import dance.
import type { ComponentType } from "react";

// ----------------------------------------------------------------------

async function downloadInvoice(invoiceId: string, label: string) {
  try {
    const { pdfUrl } = await lmsApi.invoice.downloadPdf(invoiceId);
    if (pdfUrl) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  } catch {
    // Surface a soft failure — the invoice metadata may not yet have a PDF.
    // eslint-disable-next-line no-console
    console.warn(`Failed to download invoice ${label}`);
  }
}
