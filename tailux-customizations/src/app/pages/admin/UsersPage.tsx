// Platform Admin — Users list.
//
// Searchable, sortable, paginated table of every user on the platform.
// Columns: Name, Email, Status, Auth Methods, Created, Last Login, Actions.
// Row click → /admin/users/:id.
// Actions: Activate/Deactivate, Impersonate, Export CSV.

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
  EyeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAdminUsers,
  useUpdateUserStatus,
  useImpersonateUser,
} from "@/hooks/useAdmin";
import { adminApi } from "@/services/admin-api";
import { downloadBlob, formatDate, formatRelative } from "./utils";

// ----------------------------------------------------------------------

const PAGE_SIZE = 25;

type SortField = "displayName" | "email" | "createdAt" | "lastLoginAt";

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState<string | null>(
    null,
  );

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

  const { data, loading, error, refetch } = useAdminUsers(params);
  const statusMut = useUpdateUserStatus();
  const impersonateMut = useImpersonateUser();

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "createdAt" || field === "lastLoginAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  const onStatusToggle = async (
    id: string,
    isActive: boolean,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    await statusMut.mutate({ id, isActive: !isActive });
    void refetch();
  };

  const onImpersonate = async (
    id: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setImpersonatingId(id);
    setImpersonateError(null);
    try {
      const res = await impersonateMut.mutate(id);
      if (!res) {
        setImpersonateError(impersonateMut.error?.message ?? "Impersonation failed");
        return;
      }
      // Stash the original token so we can revert later.
      const current = window.localStorage.getItem("authToken");
      if (current) {
        window.localStorage.setItem("impersonationOriginalToken", current);
      }
      // Apply the impersonation session.
      window.localStorage.setItem("authToken", res.accessToken);
      window.localStorage.setItem(
        "authUser",
        JSON.stringify({
          id: res.user.id,
          name: res.user.displayName,
          email: res.user.email,
          role: res.memberships?.[0]?.role ?? res.user.email,
          memberships: (res.memberships ?? []).map((m) => ({
            id: m.tenantId,
            name: m.tenantName,
            slug: m.tenantSlug,
            role: m.role,
            isRoot: m.isRoot,
          })),
        }),
      );
      const firstMembership = res.memberships?.[0];
      if (firstMembership) {
        window.localStorage.setItem(
          "authTenant",
          JSON.stringify({
            id: firstMembership.tenantId,
            name: firstMembership.tenantName,
            slug: firstMembership.tenantSlug,
            role: firstMembership.role,
            isRoot: firstMembership.isRoot,
          }),
        );
      }
      // Hard reload so the auth provider rehydrates from localStorage.
      window.location.href = "/";
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Impersonation failed";
      setImpersonateError(msg);
    } finally {
      setImpersonatingId(null);
    }
  };

  const onExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const blob = await adminApi.exportUsersCSV({
        search: search.trim() || undefined,
        status: status || undefined,
      });
      downloadBlob(blob, `users-${new Date().toISOString().slice(0, 10)}.csv`);
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

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search by name or email…"
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

      {impersonateError && (
        <div className="mt-3 rounded-md bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-300">
          {impersonateError}
        </div>
      )}

      {/* Table card */}
      <Card skin="bordered" className="mt-4 overflow-hidden">
        {loading ? (
          <LoadingState message="Loading users…" />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserCircleIcon}
            title="No users found"
            description="Try adjusting your search or status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <SortHeader
                    label="Name"
                    field="displayName"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("displayName")}
                  />
                  <SortHeader
                    label="Email"
                    field="email"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("email")}
                  />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Auth
                  </th>
                  <SortHeader
                    label="Created"
                    field="createdAt"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("createdAt")}
                  />
                  <SortHeader
                    label="Last login"
                    field="lastLoginAt"
                    sortField={sortField}
                    sortDir={sortDir}
                    onClick={() => toggleSort("lastLoginAt")}
                  />
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/admin/users/${u.id}`)}
                    className="cursor-pointer transition-colors hover:bg-primary-500/5 dark:hover:bg-primary-500/10"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400">
                          <UserCircleIcon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-50">
                            {u.displayName}
                          </p>
                          {u.tenantCount !== undefined && (
                            <p className="text-xs text-gray-400 dark:text-dark-400">
                              {u.tenantCount} tenant
                              {u.tenantCount === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-200">
                      {u.email}
                      {!u.emailVerified && (
                        <span className="ml-1.5 text-xs text-warning-600 dark:text-warning-400">
                          unverified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <Badge color="success" variant="soft">
                          Active
                        </Badge>
                      ) : (
                        <Badge color="error" variant="soft">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.authMethods.length === 0 ? (
                          <span className="text-xs text-gray-400 dark:text-dark-400">
                            —
                          </span>
                        ) : (
                          u.authMethods.map((m) => (
                            <span
                              key={m}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-200"
                            >
                              {m}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                      {formatRelative(u.lastLoginAt)}
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
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                          aria-label="View user details"
                        >
                          <EyeIcon className="size-4" />
                        </Button>
                        <Button
                          isIcon
                          variant="flat"
                          color="primary"
                          className="size-7"
                          disabled={
                            impersonatingId === u.id || impersonateMut.loading
                          }
                          onClick={(e: React.MouseEvent) =>
                            onImpersonate(u.id, e)
                          }
                          aria-label="Impersonate user"
                          title="Impersonate"
                        >
                          {impersonatingId === u.id ? (
                            <LoadingState inline size="size-3.5" />
                          ) : (
                            <UserPlusIcon className="size-4" />
                          )}
                        </Button>
                        <Button
                          variant={u.isActive ? "outlined" : "soft"}
                          color={u.isActive ? "error" : "success"}
                          className="text-xs"
                          disabled={statusMut.loading}
                          onClick={(e: React.MouseEvent) =>
                            onStatusToggle(u.id, u.isActive, e)
                          }
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
  sortDir: "asc" | "desc";
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
