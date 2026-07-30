// Platform Admin — Tenants list.
//
// Searchable, sortable, paginated table of every tenant on the platform.
// Columns: Name, Slug, Plan, Status, Members, Credits, Created, Actions.
// Row click → /admin/tenants/:id. Actions: Activate/Deactivate, Export CSV.

// Import Dependencies
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BuildingLibraryIcon,
  EyeIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAdminTenants,
  useUpdateTenantStatus,
} from "@/hooks/useAdmin";
import { adminApi } from "@/services/admin-api";
import { downloadBlob, formatDate } from "./utils";

// ----------------------------------------------------------------------

const PAGE_SIZE = 25;

type SortField = "name" | "slug" | "createdAt" | "memberCount" | "planName";
type SortDir = "asc" | "desc";

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function TenantsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search.trim() || undefined,
      sort: `${sortDir === "desc" ? "-" : ""}${sortField}`,
      status: status || undefined,
    }),
    [page, search, sortDir, sortField, status],
  );

  const { data, loading, error, refetch } = useAdminTenants(params);
  const statusMutation = useUpdateTenantStatus();

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  const onStatusToggle = async (
    id: string,
    isActive: boolean,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    await statusMutation.mutate({ id, isActive: !isActive });
    void refetch();
  };

  const onExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await adminApi.exportTenantsCSV({
        search: search.trim() || undefined,
        status: status || undefined,
      });
      downloadBlob(blob, `tenants-${new Date().toISOString().slice(0, 10)}.csv`);
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

  const tenants = data?.tenants ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name or slug…"
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            data={STATUS_FILTERS}
            className="h-9 w-40 text-sm"
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
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table card */}
      <Card skin="bordered" className="mt-4 overflow-hidden">
        {loading ? (
          <LoadingState message="Loading tenants…" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : tenants.length === 0 ? (
          <EmptyState
            icon={BuildingLibraryIcon}
            title="No tenants found"
            description="Try adjusting your search or status filter, or check back after the first school signs up."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <SortHeader
                    label="Name"
                    field="name"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                  <SortHeader
                    label="Slug"
                    field="slug"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("slug")}
                  />
                  <SortHeader
                    label="Plan"
                    field="planName"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("planName")}
                  />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Status
                  </th>
                  <SortHeader
                    label="Members"
                    field="memberCount"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("memberCount")}
                    align="right"
                  />
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Credits
                  </th>
                  <SortHeader
                    label="Created"
                    field="createdAt"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("createdAt")}
                  />
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {tenants.map((t) => {
                  const credits =
                    (t.subscriptionCredits ?? 0) +
                    (t.purchasedCredits ?? 0);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/admin/tenants/${t.id}`)}
                      className="cursor-pointer transition-colors hover:bg-primary-500/5 dark:hover:bg-primary-500/10"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                            <BuildingLibraryIcon className="size-4.5 stroke-2" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-gray-800 dark:text-dark-50">
                                {t.name}
                              </span>
                              {t.isRoot && (
                                <Badge color="warning" variant="soft">
                                  Root
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                          {t.slug}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {t.planName ? (
                          <Badge color="info" variant="soft">
                            {t.planName}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-dark-400">
                            —
                          </span>
                        )}
                        {t.billingWaived && (
                          <span className="ml-1.5 text-xs text-warning-600 dark:text-warning-400">
                            waived
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {t.isActive ? (
                          <Badge color="success" variant="soft">
                            Active
                          </Badge>
                        ) : (
                          <Badge color="error" variant="soft">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                        {t.memberCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                        {credits.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            isIcon
                            variant="flat"
                            color="neutral"
                            className="size-7"
                            onClick={() =>
                              navigate(`/admin/tenants/${t.id}`)
                            }
                            aria-label="View tenant details"
                          >
                            <EyeIcon className="size-4" />
                          </Button>
                          <Button
                            variant={
                              t.isActive ? "outlined" : "soft"
                            }
                            color={t.isActive ? "error" : "success"}
                            className="text-xs"
                            disabled={statusMutation.loading}
                            onClick={(e: React.MouseEvent) =>
                              onStatusToggle(t.id, t.isActive, e)
                            }
                          >
                            {t.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
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

// ----------------------------------------------------------------------

function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onClick,
  align = "left",
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onClick: () => void;
  align?: "left" | "right";
}) {
  const isActive = sortField === field;
  return (
    <th
      className={clsx(
        "px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-dark-100",
          align === "right" && "flex-row-reverse",
          isActive && "text-primary-600 dark:text-primary-400",
        )}
      >
        {label}
        {isActive ? (
          sortDir === "asc" ? (
            <ArrowUpIcon className="size-3.5" />
          ) : (
            <ArrowDownIcon className="size-3.5" />
          )
        ) : (
          <ArrowsUpDownIcon className="size-3.5 opacity-50" />
        )}
      </button>
    </th>
  );
}
