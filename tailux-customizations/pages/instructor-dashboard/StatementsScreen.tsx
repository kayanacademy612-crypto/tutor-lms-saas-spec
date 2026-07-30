// StatementsScreen — earnings breakdown + period selector + transactions.
//
// Renders four summary cards (gross revenue, platform fee, net earnings,
// payouts), a period selector (monthly / quarterly / yearly), and a table of
// transactions (orders + payouts). Mock data is used.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  ReceiptPercentIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { StatCard, EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Select } from "@/components/ui";

// ----------------------------------------------------------------------

type Period = "monthly" | "quarterly" | "yearly";

interface Transaction {
  id: string;
  date: string; // ISO
  description: string;
  course: string;
  type: "sale" | "payout" | "refund" | "fee";
  grossCents: number;
  feeCents: number;
  netCents: number;
  status: "paid" | "pending" | "failed" | "refunded";
}

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-1",
    date: daysAgo(1),
    description: "Course sale — Full-Stack React & TypeScript",
    course: "Full-Stack React & TypeScript",
    type: "sale",
    grossCents: 8900,
    feeCents: 890,
    netCents: 8010,
    status: "paid",
  },
  {
    id: "tx-2",
    date: daysAgo(2),
    description: "Course sale — Advanced React Performance (×2)",
    course: "Advanced React Performance",
    type: "sale",
    grossCents: 15800,
    feeCents: 1580,
    netCents: 14220,
    status: "paid",
  },
  {
    id: "tx-3",
    date: daysAgo(3),
    description: "Course sale — Building Design Systems with Tailwind v4",
    course: "Building Design Systems with Tailwind v4",
    type: "sale",
    grossCents: 6900,
    feeCents: 690,
    netCents: 6210,
    status: "paid",
  },
  {
    id: "tx-4",
    date: daysAgo(5),
    description: "Payout — June 2025",
    course: "—",
    type: "payout",
    grossCents: 128450,
    feeCents: 0,
    netCents: 128450,
    status: "paid",
  },
  {
    id: "tx-5",
    date: daysAgo(8),
    description: "Refund — Full-Stack React & TypeScript",
    course: "Full-Stack React & TypeScript",
    type: "refund",
    grossCents: -8900,
    feeCents: 0,
    netCents: -8900,
    status: "refunded",
  },
  {
    id: "tx-6",
    date: daysAgo(12),
    description: "Course sale — Full-Stack React & TypeScript (×3)",
    course: "Full-Stack React & TypeScript",
    type: "sale",
    grossCents: 26700,
    feeCents: 2670,
    netCents: 24030,
    status: "paid",
  },
  {
    id: "tx-7",
    date: daysAgo(15),
    description: "Payout — May 2025",
    course: "—",
    type: "payout",
    grossCents: 94280,
    feeCents: 0,
    netCents: 94280,
    status: "paid",
  },
  {
    id: "tx-8",
    date: daysAgo(20),
    description: "Course sale — Advanced React Performance",
    course: "Advanced React Performance",
    type: "sale",
    grossCents: 7900,
    feeCents: 790,
    netCents: 7110,
    status: "pending",
  },
  {
    id: "tx-9",
    date: daysAgo(28),
    description: "Course sale — Building Design Systems with Tailwind v4 (×2)",
    course: "Building Design Systems with Tailwind v4",
    type: "sale",
    grossCents: 13800,
    feeCents: 1380,
    netCents: 12420,
    status: "paid",
  },
];

// ----------------------------------------------------------------------

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${Math.abs(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const statusTone: Record<
  Transaction["status"],
  { color: "success" | "warning" | "error" | "info"; label: string }
> = {
  paid: { color: "success", label: "Paid" },
  pending: { color: "warning", label: "Pending" },
  failed: { color: "error", label: "Failed" },
  refunded: { color: "info", label: "Refunded" },
};

const typeIcon: Record<
  Transaction["type"],
  { icon: typeof CurrencyDollarIcon; color: "success" | "primary" | "info" | "error" }
> = {
  sale: { icon: CurrencyDollarIcon, color: "success" },
  payout: { icon: BanknotesIcon, color: "primary" },
  refund: { icon: ArrowTrendingDownIcon, color: "error" },
  fee: { icon: ReceiptPercentIcon, color: "info" },
};

// ----------------------------------------------------------------------

export function StatementsScreen() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_TRANSACTIONS.filter((t) => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (!q) return true;
      return (
        t.description.toLowerCase().includes(q) ||
        t.course.toLowerCase().includes(q)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [query, typeFilter]);

  const gross = MOCK_TRANSACTIONS.filter((t) => t.type === "sale").reduce(
    (s, t) => s + t.grossCents,
    0,
  );
  const refunds = MOCK_TRANSACTIONS.filter((t) => t.type === "refund").reduce(
    (s, t) => s + t.grossCents,
    0,
  );
  const fees = MOCK_TRANSACTIONS.filter((t) => t.type === "sale").reduce(
    (s, t) => s + t.feeCents,
    0,
  );
  const payouts = MOCK_TRANSACTIONS.filter((t) => t.type === "payout").reduce(
    (s, t) => s + t.grossCents,
    0,
  );
  const net = gross + refunds - fees;

  const periodLabel =
    period === "monthly"
      ? "this month"
      : period === "quarterly"
        ? "this quarter"
        : "this year";

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Statements
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Track your earnings, platform fees, and payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-750">
            <Button
              variant={period === "monthly" ? "soft" : "flat"}
              color={period === "monthly" ? "primary" : "neutral"}
              onClick={() => setPeriod("monthly")}
              className="text-xs"
            >
              Monthly
            </Button>
            <Button
              variant={period === "quarterly" ? "soft" : "flat"}
              color={period === "quarterly" ? "primary" : "neutral"}
              onClick={() => setPeriod("quarterly")}
              className="text-xs"
            >
              Quarterly
            </Button>
            <Button
              variant={period === "yearly" ? "soft" : "flat"}
              color={period === "yearly" ? "primary" : "neutral"}
              onClick={() => setPeriod("yearly")}
              className="text-xs"
            >
              Yearly
            </Button>
          </div>
          <Button variant="outlined" color="primary" className="gap-1.5">
            <ArrowDownTrayIcon className="size-4 stroke-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </header>

      {/* Earnings breakdown */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CurrencyDollarIcon}
          value={formatCents(gross)}
          label={`Gross revenue · ${periodLabel}`}
          color="primary"
          trend={{ value: 18.2, label: "vs prev. period" }}
        />
        <StatCard
          icon={ReceiptPercentIcon}
          value={formatCents(fees)}
          label="Platform fee (10%)"
          color="warning"
          trend={{ value: 8.4, label: "vs prev. period" }}
        />
        <StatCard
          icon={ArrowTrendingUpIcon}
          value={formatCents(net)}
          label="Net earnings"
          color="success"
          trend={{ value: 21.6, label: "vs prev. period" }}
        />
        <StatCard
          icon={BanknotesIcon}
          value={formatCents(payouts)}
          label="Payouts sent"
          color="info"
          trend={{ value: -2.1, label: "vs prev. period" }}
        />
      </section>

      {/* Breakdown bar */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Earnings breakdown
          </h2>
          <span className="text-xs text-gray-500 dark:text-dark-300">
            {formatCents(gross + refunds)} gross · {formatCents(net)} net
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full">
          <div
            className="h-full bg-success-500"
            style={{ width: `${(net / Math.max(gross, 1)) * 100}%` }}
            title={`Net: ${formatCents(net)}`}
          />
          <div
            className="h-full bg-warning-500"
            style={{ width: `${(fees / Math.max(gross, 1)) * 100}%` }}
            title={`Fees: ${formatCents(fees)}`}
          />
          <div
            className="h-full bg-error-500"
            style={{ width: `${(Math.abs(refunds) / Math.max(gross, 1)) * 100}%` }}
            title={`Refunds: ${formatCents(refunds)}`}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-dark-200">
            <span className="size-2.5 rounded-full bg-success-500" />
            Net earnings ({formatCents(net)})
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-dark-200">
            <span className="size-2.5 rounded-full bg-warning-500" />
            Platform fee ({formatCents(fees)})
          </span>
          <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-dark-200">
            <span className="size-2.5 rounded-full bg-error-500" />
            Refunds ({formatCents(refunds)})
          </span>
        </div>
      </Card>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm">
          <Input
            value={query}
            onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder="Search transactions…"
            prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
            classNames={{ wrapper: "mt-0" }}
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter((e.target as HTMLSelectElement).value)}
          data={[
            { value: "all", label: "All types" },
            { value: "sale", label: "Sales" },
            { value: "payout", label: "Payouts" },
            { value: "refund", label: "Refunds" },
            { value: "fee", label: "Fees" },
          ]}
          className="lg:w-44"
        />
      </div>

      {/* Transactions table */}
      {visible.length === 0 ? (
        <EmptyState
          icon={CurrencyDollarIcon}
          title="No transactions found"
          description="Try a different filter or clear your search."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          {/* Table head */}
          <div className="hidden grid-cols-12 gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300 sm:grid">
            <div className="col-span-5">Transaction</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Gross</div>
            <div className="col-span-1 text-right">Fee</div>
            <div className="col-span-2 text-right">Net</div>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            {visible.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
          {/* Footer total */}
          <div className="grid grid-cols-12 gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold dark:border-dark-600 dark:bg-dark-700">
            <div className="col-span-9 text-gray-700 dark:text-dark-200">
              {visible.length} transactions
            </div>
            <div className="col-span-1 text-right text-gray-700 dark:text-dark-200">
              {formatCents(visible.reduce((s, t) => s + t.feeCents, 0))}
            </div>
            <div className="col-span-2 text-right text-gray-800 dark:text-dark-50">
              {formatCents(visible.reduce((s, t) => s + t.netCents, 0))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function TransactionRow({ tx }: { tx: Transaction }) {
  const tone = statusTone[tx.status];
  const TypeIcon = typeIcon[tx.type].icon;

  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-12 sm:items-center">
      {/* Transaction */}
      <div className="col-span-5 flex items-center gap-2.5">
        <div
          className={clsx(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            typeIcon[tx.type].color === "success" && "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
            typeIcon[tx.type].color === "primary" && "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
            typeIcon[tx.type].color === "info" && "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
            typeIcon[tx.type].color === "error" && "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
          )}
        >
          <TypeIcon className="size-4 stroke-2" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
            {tx.description}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-dark-300">
            <span>{new Date(tx.date).toLocaleDateString()}</span>
            {tx.status === "paid" && <CheckCircleIcon className="size-3 text-success-500" />}
            {tx.status === "pending" && <ClockIcon className="size-3 text-warning-500" />}
            {tx.status === "failed" && <XCircleIcon className="size-3 text-error-500" />}
            <span>{tx.course}</span>
          </div>
        </div>
      </div>

      {/* Type / status */}
      <div className="col-span-2 flex items-center gap-2">
        <Badge color={tone.color} variant="soft" className="text-[10px]">
          {tone.label}
        </Badge>
        <span className="hidden text-[10px] capitalize text-gray-400 dark:text-dark-400 sm:inline">
          {tx.type}
        </span>
      </div>

      {/* Gross */}
      <div className="col-span-2 text-right text-sm font-medium text-gray-800 dark:text-dark-50">
        {formatCents(tx.grossCents)}
      </div>

      {/* Fee */}
      <div className="col-span-1 text-right text-xs text-gray-500 dark:text-dark-300">
        {tx.feeCents > 0 ? formatCents(tx.feeCents) : "—"}
      </div>

      {/* Net */}
      <div
        className={clsx(
          "col-span-2 text-right text-sm font-semibold",
          tx.netCents >= 0
            ? "text-success-600 dark:text-success-400"
            : "text-error-600 dark:text-error-400",
        )}
      >
        {formatCents(tx.netCents)}
      </div>
    </div>
  );
}

export default StatementsScreen;
