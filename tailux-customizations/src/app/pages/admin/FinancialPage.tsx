// Platform Admin — Financial transaction ledger.
//
// Searchable, paginated table of all financial transactions across all
// tenants. Columns: Date, Type, Description, Amount, Tax, Invoice, Tenant.
// Filter by type (subscription, credit_purchase, refund).

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import { useFinancialTransactions } from "@/hooks/useAdmin";
import { downloadBlob, formatDateTime } from "./utils";

// ----------------------------------------------------------------------

const PAGE_SIZE = 25;

const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "subscription", label: "Subscription" },
  { value: "credit_purchase", label: "Credit purchase" },
  { value: "refund", label: "Refund" },
  { value: "payout", label: "Payout" },
];

const TYPE_COLORS: Record<string, "primary" | "info" | "warning" | "error" | "success" | "neutral"> = {
  subscription: "primary",
  credit_purchase: "info",
  refund: "error",
  payout: "warning",
  adjustment: "neutral",
  payment: "success",
};

export default function FinancialPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      perPage: PAGE_SIZE,
      search: search.trim() || undefined,
      // The backend doesn't accept `type` directly, but tenants/users filters
      // via `tenantId`/`userId`. We filter client-side by `type` for now.
    }),
    [page, search],
  );

  const { data, loading, error, refetch } = useFinancialTransactions(params);

  // Client-side type filter (the backend list endpoint doesn't expose `type`
  // as a query param in the current admin-api contract).
  const transactions = useMemo(() => {
    const all = data?.transactions ?? [];
    if (!type) return all;
    return all.filter((t) => t.type === type);
  }, [data?.transactions, type]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      // The admin API has no financial export endpoint — emulate by serializing
      // the current page to CSV. Good enough for a CSV snapshot.
      const rows = [
        [
          "Date",
          "Type",
          "Description",
          "Amount",
          "Tax",
          "Currency",
          "Invoice",
          "Tenant",
        ].join(","),
        ...transactions.map((t) =>
          [
            t.createdAt,
            t.type,
            `"${(t.description ?? "").replace(/"/g, '""')}"`,
            t.amountCents,
            t.taxAmountCents ?? t.taxCents ?? 0,
            t.currency,
            t.invoiceNumber ?? "",
            `"${(t.tenantName ?? "").replace(/"/g, '""')}"`,
          ].join(","),
        ),
      ].join("\n");
      downloadBlob(
        new Blob([rows], { type: "text/csv" }),
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Export failed";
      setExportError(msg);
    } finally {
      setExporting(false);
    }
  };

  // Compute a quick summary across the loaded page (best-effort).
  const pageTotalCents = transactions.reduce(
    (sum, t) => sum + t.amountCents,
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search by description, invoice, tenant…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            className="h-9 w-full max-w-xs text-sm"
            classNames={{ input: "h-9" }}
          />
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            data={TYPE_FILTERS}
            className="h-9 w-44 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {exportError && (
            <span className="text-xs text-error-600 dark:text-error-400">
              {exportError}
            </span>
          )}
          <Button
            variant="soft"
            color="neutral"
            onClick={onExport}
            disabled={exporting}
            className="gap-1.5 text-xs"
          >
            {exporting ? (
              <LoadingState inline size="size-3.5" />
            ) : (
              <ArrowDownTrayIcon className="size-4 stroke-2" />
            )}
            Export page CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-3">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
            Page total
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-dark-50">
            {formatPrice(pageTotalCents, "USD")}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
            Total records
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-dark-50">
            {total.toLocaleString()}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
            Current page
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-dark-50">
            {transactions.length} rows
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card skin="bordered" className="mt-4 overflow-hidden">
        {loading ? (
          <LoadingState message="Loading transactions…" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={CurrencyDollarIcon}
            title="No transactions"
            description="No financial transactions match your filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Description
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Tax
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Invoice
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Tenant
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {transactions.map((t) => {
                  const isRefund = t.type === "refund";
                  const tax = t.taxAmountCents ?? t.taxCents;
                  return (
                    <tr key={t.id}>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          color={TYPE_COLORS[t.type] ?? "neutral"}
                          variant="soft"
                        >
                          {t.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-200">
                        {t.description}
                        {t.bundleName && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-dark-400">
                            · {t.bundleName}
                          </span>
                        )}
                        {t.billingInterval && (
                          <span className="ml-1 text-xs text-gray-400 dark:text-dark-400">
                            · {t.billingInterval}
                          </span>
                        )}
                      </td>
                      <td
                        className={clsx(
                          "px-4 py-3 text-right text-sm font-semibold",
                          isRefund
                            ? "text-error-600 dark:text-error-400"
                            : "text-gray-800 dark:text-dark-50",
                        )}
                      >
                        {isRefund ? "-" : ""}
                        {formatPrice(t.amountCents, (t.currency ?? "USD").toUpperCase())}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-dark-300">
                        {tax ? formatPrice(tax, (t.currency ?? "USD").toUpperCase()) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-200">
                        {t.invoiceNumber ? (
                          <code className="font-mono text-xs">
                            {t.invoiceNumber}
                          </code>
                        ) : (
                          <span className="text-gray-400 dark:text-dark-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-200">
                        {t.tenantName ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              isIcon
              variant="outlined"
              color="neutral"
              className="size-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <span className="px-2 text-xs text-gray-600 dark:text-dark-200">
              Page {page} of {totalPages}
            </span>
            <Button
              isIcon
              variant="outlined"
              color="neutral"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
