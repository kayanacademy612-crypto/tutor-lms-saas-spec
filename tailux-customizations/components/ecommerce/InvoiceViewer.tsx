// Import Dependencies
import clsx from "clsx";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import { formatPrice } from "@/components/lms/PriceTag";
import type { Invoice } from "@/types/lms";

// ----------------------------------------------------------------------

export interface InvoiceViewerProps {
  /** Invoice to render. */
  invoice: Invoice;
  /** Download PDF handler. Receives the invoice id. */
  onDownload?: (id: string) => void;
  /** Show a loading spinner on the download button (e.g. while fetching). */
  downloading?: boolean;
  /** ISO 4217 currency code (overrides `invoice.currency`). */
  currency?: string;
  /** Extra classes on the root Card. */
  className?: string;
}

/**
 * Formats an ISO date string as a short locale date.
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

interface StatusBadgeConfig {
  label: string;
  color: "primary" | "success" | "neutral" | "warning" | "info" | "error" | "secondary";
}

const STATUS_CONFIG: Record<Invoice["status"], StatusBadgeConfig> = {
  draft: { label: "Draft", color: "neutral" },
  paid: { label: "Paid", color: "success" },
  void: { label: "Void", color: "error" },
};

interface TotalsRowProps {
  label: string;
  value: number;
  currency: string;
  isTotal?: boolean;
  isDiscount?: boolean;
}

function TotalsRow({
  label,
  value,
  currency,
  isTotal = false,
  isDiscount = false,
}: TotalsRowProps) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-3 text-sm",
        isTotal && "border-t border-gray-200 pt-2 dark:border-dark-600",
      )}
    >
      <span
        className={clsx(
          isTotal
            ? "text-base font-semibold text-gray-900 dark:text-dark-50"
            : "text-gray-600 dark:text-dark-200",
        )}
      >
        {label}
      </span>
      <span
        className={clsx(
          "font-semibold tabular-nums",
          isTotal
            ? "text-base text-gray-900 dark:text-dark-50"
            : isDiscount
              ? "text-success-600 dark:text-success-400"
              : "text-gray-900 dark:text-dark-50",
        )}
      >
        {isDiscount ? "-" : ""}
        {formatPrice(value, currency)}
      </span>
    </div>
  );
}

/**
 * Printable invoice viewer.
 *
 * Renders the invoice header (number + status + issued/paid dates), the
 * billing block, a line-items table, the totals block (subtotal, discount,
 * tax, total), and — when `onDownload` is supplied — a "Download PDF"
 * button. Designed to live inside a modal or a dedicated invoice page.
 */
export function InvoiceViewer({
  invoice,
  onDownload,
  downloading = false,
  currency,
  className,
}: InvoiceViewerProps) {
  const cur = currency ?? invoice.currency ?? "USD";
  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;

  return (
    <Card skin="bordered" className={clsx("w-full overflow-hidden", className)}>
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-dark-600 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-50">
              Invoice {invoice.invoiceNumber}
            </h3>
            <Badge color={statusCfg.color} variant="soft" className="text-[10px] capitalize">
              {statusCfg.label}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            Issued {formatDate(invoice.createdAt)}
            {invoice.paidAt && <> · Paid {formatDate(invoice.paidAt)}</>}
          </p>
        </div>
        {onDownload && (
          <Button
            color="primary"
            variant="soft"
            disabled={downloading}
            onClick={() => onDownload(invoice.id)}
            className="self-start gap-1.5 text-sm"
          >
            <ArrowDownTrayIcon className="size-4 stroke-2" />
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2">
        {/* Bill to */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Bill To
          </p>
          <div className="mt-1.5 text-sm text-gray-700 dark:text-dark-100">
            <p className="font-medium">{invoice.billingName ?? "—"}</p>
            {invoice.billingEmail && (
              <p className="text-gray-500 dark:text-dark-300">{invoice.billingEmail}</p>
            )}
            {invoice.billingAddress && (
              <p className="mt-1 whitespace-pre-line text-gray-500 dark:text-dark-300">
                {invoice.billingAddress}
              </p>
            )}
          </div>
        </div>

        {/* Invoice meta */}
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Invoice Details
          </p>
          <dl className="mt-1.5 space-y-1 text-sm text-gray-700 dark:text-dark-100">
            <div className="flex justify-between gap-2 sm:justify-end">
              <dt className="text-gray-500 dark:text-dark-300">Number</dt>
              <dd className="font-medium">{invoice.invoiceNumber}</dd>
            </div>
            <div className="flex justify-between gap-2 sm:justify-end">
              <dt className="text-gray-500 dark:text-dark-300">Issued</dt>
              <dd className="font-medium">{formatDate(invoice.createdAt)}</dd>
            </div>
            {invoice.paidAt && (
              <div className="flex justify-between gap-2 sm:justify-end">
                <dt className="text-gray-500 dark:text-dark-300">Paid</dt>
                <dd className="font-medium">{formatDate(invoice.paidAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Line items */}
      <div className="overflow-x-auto border-t border-gray-200 dark:border-dark-600">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-dark-700/50">
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-dark-300">
              <th className="px-5 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 text-right font-semibold">Qty</th>
              <th className="px-5 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-dark-600">
            {invoice.lineItems.map((line, idx) => (
              <tr
                key={`${line.description}-${idx}`}
                className="text-gray-700 dark:text-dark-100"
              >
                <td className="px-5 py-2.5">{line.description}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500 dark:text-dark-300">
                  {line.quantity ?? 1}
                </td>
                <td className="px-5 py-2.5 text-right font-medium tabular-nums">
                  {formatPrice(line.amountCents, cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-200 p-5 dark:border-dark-600">
        <div className="ml-auto flex max-w-xs flex-col gap-1.5">
          <TotalsRow label="Subtotal" value={invoice.subtotalCents} currency={cur} />
          {!!invoice.discountCents && invoice.discountCents > 0 && (
            <TotalsRow
              label="Discount"
              value={invoice.discountCents}
              currency={cur}
              isDiscount
            />
          )}
          {!!invoice.taxCents && invoice.taxCents > 0 && (
            <TotalsRow label="Tax" value={invoice.taxCents} currency={cur} />
          )}
          <TotalsRow label="Total" value={invoice.totalCents} currency={cur} isTotal />
        </div>
      </div>
    </Card>
  );
}

export default InvoiceViewer;
