// Platform Admin — System logs.
//
// - Severity filter chips (Critical, High, Medium, Low, Debug) with counts
// - Category filter (auth, billing, admin, system, security, tenant)
// - Date range filter
// - Search input
// - Log table with expandable rows (full message, metadata)
// - Pagination (25/50/100 per page)
// - Auto-refresh toggle
//
// Uses `useAdminLogs(params)` and `useLogSeverityCounts(params)`.

// Import Dependencies
import { Fragment, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAdminLogs,
  useLogSeverityCounts,
} from "@/hooks/useAdmin";
import { downloadBlob, formatDateTime } from "./utils";

// ----------------------------------------------------------------------

type SeverityColor = "error" | "warning" | "info" | "primary" | "neutral";

const SEVERITIES: Array<{
  value: string;
  label: string;
  color: SeverityColor;
}> = [
  { value: "critical", label: "Critical", color: "error" },
  { value: "high", label: "High", color: "warning" },
  { value: "medium", label: "Medium", color: "info" },
  { value: "low", label: "Low", color: "primary" },
  { value: "debug", label: "Debug", color: "neutral" },
];

const SEVERITY_ACTIVE_CLASS: Record<SeverityColor, string> = {
  error: "bg-error-500 text-white",
  warning: "bg-warning-500 text-white",
  info: "bg-info-500 text-white",
  primary: "bg-primary-500 text-white",
  neutral: "bg-gray-500 text-white dark:bg-dark-400",
};

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "auth", label: "Auth" },
  { value: "billing", label: "Billing" },
  { value: "admin", label: "Admin" },
  { value: "system", label: "System" },
  { value: "security", label: "Security" },
  { value: "tenant", label: "Tenant" },
];

const PAGE_SIZE_OPTIONS = [
  { value: "25", label: "25 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

export default function LogsPage() {
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const params = useMemo(
    () => ({
      page,
      perPage,
      severity: severity || undefined,
      category: category || undefined,
      search: search.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [page, perPage, severity, category, search, fromDate, toDate],
  );

  const countsParams = useMemo(
    () => ({
      category: category || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    }),
    [category, fromDate, toDate],
  );

  const { data, loading, error, refetch } = useAdminLogs(params);
  const counts = useLogSeverityCounts(countsParams);

  // Auto-refresh every 10s when enabled.
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void refetch();
      void counts.refetch();
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refetch, counts.refetch]);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const severityCounts = counts.data?.counts ?? {};

  const toggleExpand = (id: string) => {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onExport = async () => {
    // Client-side CSV export of the current page (no backend export endpoint
    // is wired in the admin-api surface; the spec mentions an exportLogsCSV
    // method exists — use it when the user requests it).
    const rows = [
      ["Date", "Severity", "Category", "Action", "Message"].join(","),
      ...logs.map((l) =>
        [
          l.createdAt,
          l.severity,
          l.category ?? "",
          l.action ?? "",
          `"${(l.message ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n");
    downloadBlob(
      new Blob([rows], { type: "text/csv" }),
      `logs-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Severity chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSeverity("");
            setPage(1);
          }}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            severity === ""
              ? "bg-primary-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-100 dark:hover:bg-dark-500",
          )}
        >
          All
          <span className="rounded-full bg-black/10 px-1.5 text-[10px] dark:bg-white/10">
            {total}
          </span>
        </button>
        {SEVERITIES.map((s) => {
          const count = severityCounts[s.value] ?? 0;
          const isActive = severity === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => {
                setSeverity(isActive ? "" : s.value);
                setPage(1);
              }}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? SEVERITY_ACTIVE_CLASS[s.color]
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-100 dark:hover:bg-dark-500",
              )}
            >
              {s.label}
              <span
                className={clsx(
                  "rounded-full px-1.5 text-[10px]",
                  isActive ? "bg-black/10" : "bg-black/10 dark:bg-white/10",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search logs…"
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
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            data={CATEGORIES}
            className="h-9 w-40 text-sm"
          />
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="h-9 w-36 text-sm"
            classNames={{ input: "h-9" }}
          />
          <span className="text-xs text-gray-400">→</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="h-9 w-36 text-sm"
            classNames={{ input: "h-9" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-dark-200">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-450 dark:bg-dark-700"
            />
            Auto-refresh
          </label>
          <Button
            variant="soft"
            color="neutral"
            onClick={onExport}
            className="gap-1.5 text-xs"
          >
            <ArrowPathIcon className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card skin="bordered" className="mt-4 overflow-hidden">
        {loading ? (
          <LoadingState message="Loading logs…" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title="No logs found"
            description="Try adjusting your filters or date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="w-8 px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Date
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Severity
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Category
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {logs.map((l) => {
                  const isOpen = expanded.has(l.id);
                  return (
                    <Fragment key={l.id}>
                      <tr
                        onClick={() => toggleExpand(l.id)}
                        className="cursor-pointer transition-colors hover:bg-primary-500/5 dark:hover:bg-primary-500/10"
                      >
                        <td className="px-3 py-2.5 text-gray-400 dark:text-dark-400">
                          {isOpen ? (
                            <ChevronDownIcon className="size-4" />
                          ) : (
                            <ChevronRightIcon className="size-4" />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-500 dark:text-dark-300">
                          {formatDateTime(l.createdAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <SeverityBadge severity={l.severity} />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-700 dark:text-dark-200">
                          {l.category ?? "—"}
                          {l.action && (
                            <span className="ml-1 text-xs text-gray-400 dark:text-dark-400">
                              · {l.action}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-gray-700 dark:text-dark-200">
                          <span className="line-clamp-1">{l.message}</span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gray-50 dark:bg-dark-750">
                          <td />
                          <td colSpan={4} className="px-3 py-3">
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-400">
                                  Full message
                                </p>
                                <p className="mt-0.5 text-sm text-gray-700 dark:text-dark-200">
                                  {l.message}
                                </p>
                              </div>
                              {l.userId && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-400">
                                    User
                                  </p>
                                  <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-dark-200">
                                    {l.userId}
                                  </p>
                                </div>
                              )}
                              {l.tenantId && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-400">
                                    Tenant
                                  </p>
                                  <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-dark-200">
                                    {l.tenantId}
                                  </p>
                                </div>
                              )}
                              {l.metadata && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-400">
                                    Metadata
                                  </p>
                                  <pre className="mt-1 overflow-x-auto rounded-md bg-white p-2 text-xs text-gray-700 dark:bg-dark-700 dark:text-dark-200">
                                    {JSON.stringify(l.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
            <span>
              Showing {(page - 1) * perPage + 1}–
              {Math.min(page * perPage, total)} of {total}
            </span>
            <Select
              value={String(perPage)}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              data={PAGE_SIZE_OPTIONS}
              className="h-8 w-36 text-xs"
            />
          </div>
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

// ----------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITIES.find((x) => x.value === severity);
  if (!s) {
    return (
      <Badge color="neutral" variant="soft">
        {severity}
      </Badge>
    );
  }
  return (
    <Badge color={s.color} variant="soft">
      {s.label}
    </Badge>
  );
}
