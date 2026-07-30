// MyOrdersPage — order history with detail drawer + status filter.
//
// Layout:
//   - Header with title + status filter pills (All / Completed / Pending /
//     Refunded).
//   - Master-detail: list of orders on the left, selected order detail on the
//     right (or full-width list when nothing is selected, collapsing to a
//     stacked layout on small screens).
//   - Each detail view exposes a "Download invoice" button that synthesizes a
//     tiny printable HTML invoice in a new tab (no backend round-trip needed).
//
// Note: the backend `Order.status` enum is `pending | paid | failed | refunded
// | canceled`. The UI filter labels "Completed" maps to `paid` to match the
// language used elsewhere in the LMS app.

// Import Dependencies
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  XMarkIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
  formatPrice,
} from "@/components/lms";
import type { Order } from "@/types/lms";

import { fetchOrders, orderStatusMeta } from "./mock-data";

// ----------------------------------------------------------------------

type FilterId = "all" | "paid" | "pending" | "refunded";

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "paid", label: "Completed" },
  { id: "pending", label: "Pending" },
  { id: "refunded", label: "Refunded" },
];

// ----------------------------------------------------------------------

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (filter === "all") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const selected = useMemo(
    () => orders?.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  // ───────────────── Loading ─────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <OrdersHeader count={0} loading />
        <Card className="p-4">
          <LoadingState message="Loading your orders…" />
        </Card>
      </div>
    );
  }

  // ───────────────── Error ─────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <OrdersHeader count={0} />
        <Card className="p-4">
          <ErrorState error={error} onRetry={load} />
        </Card>
      </div>
    );
  }

  // ───────────────── Empty ─────────────────
  if (!orders || orders.length === 0) {
    return (
      <div className="space-y-6">
        <OrdersHeader count={0} />
        <Card className="p-4">
          <EmptyState
            icon={DocumentTextIcon}
            title="No orders yet"
            description="When you purchase a course, your order history will appear here."
          />
        </Card>
      </div>
    );
  }

  // ───────────────── Main view ─────────────────
  return (
    <div className="space-y-6">
      <OrdersHeader count={orders.length} />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.id === "all"
              ? orders.length
              : orders.filter((o) => o.status === f.id).length;
          const active = filter === f.id;
          return (
            <Button
              key={f.id}
              variant={active ? "filled" : "outlined"}
              color={active ? "primary" : "neutral"}
              className="gap-1.5 px-3 py-1.5 text-xs"
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <Badge
                color={active ? "neutral" : "neutral"}
                variant={active ? "filled" : "soft"}
                className="text-[10px]"
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Empty filter result */}
      {filtered.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={ClipboardDocumentListIcon}
            title={`No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} orders`}
            description="Try a different filter to see more orders."
            compact
          />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ───────── Order list ───────── */}
          <div className="space-y-3">
            {filtered.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                active={order.id === selectedId}
                onSelect={() => setSelectedId(order.id)}
              />
            ))}
          </div>

          {/* ───────── Detail rail ───────── */}
          <aside>
            {selected ? (
              <OrderDetail
                order={selected}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <Card className="hidden p-4 lg:block">
                <EmptyState
                  icon={DocumentTextIcon}
                  title="Select an order"
                  description="Pick an order from the list to see its details and download an invoice."
                  compact
                />
              </Card>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function OrdersHeader({
  count,
  loading = false,
}: {
  count: number;
  loading?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          My Orders
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          {loading
            ? "Loading your order history…"
            : count === 0
              ? "No orders yet."
              : `${count} ${count === 1 ? "order" : "orders"} placed.`}
        </p>
      </div>
      <Badge color="primary" variant="soft" className="gap-1">
        <DocumentTextIcon className="size-3.5" />
        {count}
      </Badge>
    </header>
  );
}

function OrderRow({
  order,
  active,
  onSelect,
}: {
  order: Order;
  active: boolean;
  onSelect: () => void;
}) {
  const status = orderStatusMeta(order.status);
  const currency = order.currency ?? "usd";
  const date = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const firstItem = order.items[0];

  return (
    <Button
      unstyled
      onClick={onSelect}
      aria-pressed={active}
      className="block w-full text-left"
    >
      <Card
        skin="bordered"
        className={`p-4 transition-colors ${
          active
            ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
            : "hover:border-gray-300 dark:hover:border-dark-500"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-gray-800 dark:text-dark-50">
                {order.orderNumber}
              </span>
              <Badge color={status.color} variant="soft" className="text-[10px]">
                {status.label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
              {date} · {order.items.length}{" "}
              {order.items.length === 1 ? "item" : "items"}
            </p>
            {firstItem && (
              <p className="mt-1.5 truncate text-sm text-gray-700 dark:text-dark-200">
                {firstItem.title}
                {order.items.length > 1 && (
                  <span className="text-gray-400 dark:text-dark-400">
                    {" "}
                    +{order.items.length - 1} more
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              {formatPrice(order.totalCents, currency)}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-dark-400">
              {order.paymentMethod ?? "card"}
            </p>
          </div>
        </div>
      </Card>
    </Button>
  );
}

function OrderDetail({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const currency = order.currency ?? "usd";
  const status = orderStatusMeta(order.status);
  const date = new Date(order.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleDownloadInvoice = () => {
    const itemsHtml = order.items
      .map(
        (it) =>
          `<tr>
            <td style="padding:6px 0;color:#374151">${escapeHtml(it.title)}</td>
            <td style="padding:6px 0;text-align:center;color:#6b7280">${it.quantity}</td>
            <td style="padding:6px 0 6px 16px;text-align:right;color:#111827;white-space:nowrap">${formatPrice(it.unitPriceCents, currency)}</td>
          </tr>`,
      )
      .join("");

    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Invoice ${order.orderNumber}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px;color:#111827;max-width:680px;margin:0 auto}
  h1{font-size:22px;margin:0 0 4px}
  .muted{color:#6b7280;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
  th{text-align:left;border-bottom:1px solid #e5e7eb;padding:8px 0;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  th.r{text-align:right}
  .tot{border-top:2px solid #e5e7eb;margin-top:8px;padding-top:12px;font-size:15px;font-weight:700}
  .row{display:flex;justify-content:space-between;margin-top:6px;font-size:13px}
</style></head>
<body>
  <h1>Invoice ${order.orderNumber}</h1>
  <p class="muted">Issued ${date} · Status: ${status.label}</p>
  <p class="muted">Payment method: ${order.paymentMethod ?? "card"}</p>
  <table>
    <thead>
      <tr><th>Item</th><th style="text-align:center">Qty</th><th class="r">Price</th></tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
  </table>
  <div style="margin-top:16px">
    <div class="row"><span class="muted">Subtotal</span><span>${formatPrice(order.subtotalCents, currency)}</span></div>
    ${order.discountCents ? `<div class="row"><span class="muted">Discount${order.couponCode ? ` (${order.couponCode})` : ""}</span><span>-${formatPrice(order.discountCents, currency)}</span></div>` : ""}
    ${order.taxCents ? `<div class="row"><span class="muted">Tax</span><span>${formatPrice(order.taxCents, currency)}</span></div>` : ""}
    <div class="row tot"><span>Total</span><span>${formatPrice(order.totalCents, currency)}</span></div>
  </div>
  <p class="muted" style="margin-top:32px">Thank you for your purchase!</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) {
      // Pop-up blocked — fall back to a download.
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.orderNumber}.html`;
      a.click();
    }
    // Revoke shortly after to free memory.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return (
    <Card skin="bordered" className="sticky top-6 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-dark-300">Order</p>
          <p className="font-mono text-base font-semibold text-gray-800 dark:text-dark-50">
            {order.orderNumber}
          </p>
        </div>
        <Button
          isIcon
          variant="flat"
          color="neutral"
          className="size-7 lg:hidden"
          onClick={onClose}
          aria-label="Close detail"
        >
          <XMarkIcon className="size-4" />
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge color={status.color} variant="soft" className="text-[10px]">
          {status.label}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-dark-300">
          <CalendarDaysIcon className="size-3.5" />
          {date}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-dark-300">
          <CreditCardIcon className="size-3.5" />
          {order.paymentMethod ?? "card"}
        </span>
      </div>

      <ScrollShadow className="hide-scrollbar mt-4 max-h-64 overflow-y-auto border-t border-gray-100 pt-4 dark:border-dark-600">
        <ul className="space-y-3">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm text-gray-700 dark:text-dark-200">
                  {it.title}
                </p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">
                  Qty {it.quantity} · {formatPrice(it.unitPriceCents, currency)}{" "}
                  each
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-gray-800 dark:text-dark-100">
                {formatPrice(it.subtotalCents, currency)}
              </span>
            </li>
          ))}
        </ul>
      </ScrollShadow>

      <dl className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-dark-600">
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
          <dt className="font-medium text-gray-600 dark:text-dark-200">Total</dt>
          <dd className="font-semibold text-gray-800 dark:text-dark-50">
            {formatPrice(order.totalCents, currency)}
          </dd>
        </div>
      </dl>

      <Button
        color="primary"
        variant="outlined"
        className="mt-5 w-full gap-2"
        onClick={handleDownloadInvoice}
      >
        <ArrowDownTrayIcon className="size-4" />
        Download invoice
      </Button>

      {order.status === "paid" && (
        <Button
          variant="flat"
          color="neutral"
          className="mt-2 w-full gap-2"
          onClick={() => {
            // Placeholder — would route to a refund request flow.
            window.alert(
              `Refund request for ${order.orderNumber} — this flow isn't wired up yet.`,
            );
          }}
        >
          <ArrowPathIcon className="size-4" />
          Request refund
        </Button>
      )}
    </Card>
  );
}

/** Minimal HTML-escaper for the generated invoice. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
