// Orders Admin — admin orders management.
//
// 2-column layout (sidebar + content) modeled on `apps/ecommerce`. The
// sidebar switches between five filtered views:
//
//   - All Orders    — every order in the tenant
//   - Pending       — `status=pending`
//   - Paid          — `status=paid`
//   - Refunded      — `status=refunded`
//   - Cancelled     — `status=canceled`
//
// Each screen renders a search + filter toolbar and a `@tanstack/react-table`
// instance with columns: Order #, Date, Customer, Items, Total, Status,
// Actions. Pagination is handled by react-table's built-in pagination model.
//
// Filters: search by order number/email, payment-method select, status
// select (kept in sync with the sidebar selection). Row actions link to
// the order detail page or trigger refund/cancel (which the detail page
// handles).

// Import Dependencies
import { ComponentType, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  XMarkIcon,
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
  Select,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import { OrderStatusBadge } from "@/components/ecommerce/OrderStatusBadge";
import { useEcommerceOrdersList } from "./useOrdersAdmin";
import type { Order, OrderStatus } from "@/types/lms";

// ----------------------------------------------------------------------

type ScreenId = "all" | "pending" | "paid" | "refunded" | "cancelled";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  status?: OrderStatus;
}

const NAV_ITEMS: NavItem[] = [
  { id: "all", label: "All Orders", icon: ShoppingBagIcon },
  { id: "pending", label: "Pending", icon: DocumentTextIcon, status: "pending" },
  { id: "paid", label: "Paid", icon: DocumentTextIcon, status: "paid" },
  { id: "refunded", label: "Refunded", icon: DocumentTextIcon, status: "refunded" },
  { id: "cancelled", label: "Cancelled", icon: DocumentTextIcon, status: "canceled" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "All payment methods" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "razorpay", label: "Razorpay" },
  { value: "manual", label: "Manual" },
];

const PAGE_SIZE = 10;

// ----------------------------------------------------------------------

export default function OrdersAdmin() {
  const navigate = useNavigate();
  const [active, setActive] = useState<ScreenId>("all");

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="Orders Admin">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <ClipboardDocumentListIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Orders Admin
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Manage every order in your tenant.
              </p>
            </div>
          </div>
          <Badge color="primary" variant="soft">
            Admin
          </Badge>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Orders admin navigation">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => setActive(item.id)}
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
          </aside>

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Orders Admin</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-7xl px-6 py-6">
                <OrdersScreen
                  statusFilter={activeItem.status}
                  onNavigateToOrder={(id) =>
                    navigate(`/apps/orders-admin/${id}`)
                  }
                />
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ===========================================================================
// Orders screen (search + filters + table)
// ===========================================================================

function OrdersScreen({
  statusFilter,
  onNavigateToOrder,
}: {
  statusFilter?: OrderStatus;
  onNavigateToOrder: (id: string) => void;
}) {
  const { data, loading, error, refetch } = useEcommerceOrdersList();
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);

  // Filter by sidebar-selected status + search + payment method.
  const filteredData = useMemo(() => {
    let list = data ?? [];
    if (statusFilter) {
      list = list.filter((o) => o.status === statusFilter);
    }
    if (paymentFilter) {
      list = list.filter((o) =>
        (o.paymentMethod ?? "").toLowerCase().includes(paymentFilter.toLowerCase()),
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.paymentMethod ?? "").toLowerCase().includes(q) ||
          o.items.some((it) => it.title.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [data, statusFilter, paymentFilter, search]);

  const columns = useMemo<ColumnDef<Order>[]>(
    () => buildColumns(onNavigateToOrder),
    [onNavigateToOrder],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  if (loading) {
    return (
      <Card className="p-4">
        <LoadingState message="Loading orders…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  if ((data ?? []).length === 0) {
    return (
      <Card className="p-4">
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title="No orders yet"
          description="Orders placed by your students will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search order #, item, customer email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-4" />}
            className="sm:max-w-xs"
          />
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            data={PAYMENT_METHOD_OPTIONS}
            className="sm:max-w-[200px]"
          />
        </div>
        <Badge color="neutral" variant="soft" className="text-xs">
          {filteredData.length} {filteredData.length === 1 ? "order" : "orders"}
        </Badge>
      </div>

      {filteredData.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={MagnifyingGlassIcon}
            title="No matching orders"
            description="Try adjusting your search or filters."
            compact
          />
        </Card>
      ) : (
        <>
          <Card skin="bordered" className="overflow-hidden">
            <Table hoverable className="w-full">
              <THead>
                {table.getHeaderGroups().map((hg) => (
                  <Tr key={hg.id}>
                    {hg.headers.map((header) => {
                      const canSort = header.column.getCanSort();
                      const sortDir = header.column.getIsSorted();
                      return (
                        <Th
                          key={header.id}
                          className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300"
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          style={{
                            cursor: canSort ? "pointer" : "default",
                          }}
                        >
                          <span className="inline-flex items-center gap-1">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {canSort && sortDir === "asc" && (
                              <ChevronUpIcon className="size-3.5" />
                            )}
                            {canSort && sortDir === "desc" && (
                              <ChevronDownIcon className="size-3.5" />
                            )}
                          </span>
                        </Th>
                      );
                    })}
                  </Tr>
                ))}
              </THead>
              <TBody>
                {table.getRowModel().rows.map((row) => (
                  <Tr
                    key={row.id}
                    className="border-t border-gray-100 dark:border-dark-600"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id} className="py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </TBody>
            </Table>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                isIcon
                variant="outlined"
                color="neutral"
                className="size-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <Button
                isIcon
                variant="outlined"
                color="neutral"
                className="size-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                <ArrowRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ===========================================================================
// Column definitions
// ===========================================================================

function buildColumns(
  onNavigateToOrder: (id: string) => void,
): ColumnDef<Order>[] {
  return [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onNavigateToOrder(row.original.id)}
          className="font-mono text-xs font-semibold text-primary-600 hover:underline dark:text-primary-400"
        >
          {row.original.orderNumber}
        </button>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="text-xs">
            <p className="text-gray-700 dark:text-dark-200">
              {date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
            <p className="text-gray-400 dark:text-dark-400">
              {date.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        );
      },
    },
    {
      id: "customer",
      header: "Customer",
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium text-gray-700 dark:text-dark-200">
            User {row.original.userId.slice(-8)}
          </p>
          <p className="text-gray-400 dark:text-dark-400">
            {row.original.paymentMethod ?? "—"}
          </p>
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.items;
        const first = items[0];
        return (
          <div className="max-w-xs text-xs">
            {first ? (
              <>
                <p className="truncate text-gray-700 dark:text-dark-200">
                  {first.title}
                </p>
                {items.length > 1 && (
                  <p className="text-gray-400 dark:text-dark-400">
                    +{items.length - 1} more
                  </p>
                )}
              </>
            ) : (
              <span className="text-gray-400 dark:text-dark-400">—</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "totalCents",
      header: "Total",
      cell: ({ row }) => {
        const currency = (row.original.currency ?? "usd").toUpperCase();
        return (
          <span className="font-semibold text-gray-800 dark:text-dark-50">
            {formatPrice(row.original.totalCents, currency)}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} size="sm" />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-7"
            onClick={() => onNavigateToOrder(row.original.id)}
            aria-label="View order details"
          >
            <EyeIcon className="size-4" />
          </Button>
        </div>
      ),
    },
  ];
}
