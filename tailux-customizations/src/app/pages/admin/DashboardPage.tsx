// Platform Admin Dashboard — top-level overview for the root tenant owner.
//
// 4 KPI cards (Total Tenants, Total Users, Active Subscriptions, Monthly
// Revenue) + 3 inline bar charts (revenue 30d, signups 30d, tenant growth
// 12mo) + recent activity feed (latest 10 signups / tenants) + system health
// summary.
//
// Primary data source: `useAdminDashboard()` (the spec-required hook).
// Supplementary data: `usePMKPIs()` for MRR + active subscribers,
// `useFinancialMetrics({ range: "30d", metric: "revenue" })` for the revenue
// trend, and `useAdminTenants({ sort: "-createdAt", limit: 10 })` for the
// recent activity feed.

// Import Dependencies
import { useMemo } from "react";
import { Link } from "react-router";
import {
  BuildingLibraryIcon,
  UsersIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import {
  ErrorState,
  LoadingState,
  StatCard,
  formatPrice,
} from "@/components/lms";
import {
  useAdminDashboard,
  useAdminTenants,
  useFinancialMetrics,
  usePMKPIs,
  useHealthCurrent,
} from "@/hooks/useAdmin";
import { MiniBarChart } from "./MiniBarChart";
import { formatDate, formatRelative } from "./utils";

// ----------------------------------------------------------------------

export default function DashboardPage() {
  const dashboard = useAdminDashboard();
  const kpis = usePMKPIs();
  const revenueTrend = useFinancialMetrics({
    range: "30d",
    metric: "revenue",
  });
  const tenantsRecent = useAdminTenants({
    page: 1,
    limit: 10,
    sort: "-createdAt",
  });
  const healthCurrent = useHealthCurrent();

  const signupTrend = useMemo(() => {
    const trend = kpis.data?.subscriberTrend ?? [];
    return trend.map((p) => ({
      label: formatDate(p.date, { month: "short", day: "numeric" }),
      value: p.value,
    }));
  }, [kpis.data?.subscriberTrend]);

  const revenueBars = useMemo(() => {
    const trend = revenueTrend.data?.data ?? [];
    return trend.map((p) => ({
      label: formatDate(p.date, { month: "short", day: "numeric" }),
      value: p.value,
    }));
  }, [revenueTrend.data]);

  // Tenant growth (last 12 months) — bucket the recent tenants list by month.
  // When the API returns more than 10 tenants we'll get a fuller picture; for
  // now we bucket what we have (best-effort) and fall back to an empty chart.
  const tenantGrowth = useMemo(() => {
    const tenants = tenantsRecent.data?.tenants ?? [];
    const buckets = new Map<string, number>();
    for (const t of tenants) {
      const d = new Date(t.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const sorted = Array.from(buckets.entries()).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return sorted.slice(-12).map(([key, value]) => ({
      label: formatDate(`${key}-01`, { month: "short", year: "2-digit" }),
      value,
    }));
  }, [tenantsRecent.data?.tenants]);

  const recentTenants = tenantsRecent.data?.tenants ?? [];

  // System health — combine the dashboard.health flag with live metrics.
  const health = dashboard.data?.health;
  const latestMetric = healthCurrent.data?.metrics?.[0];
  const healthOk = health?.healthy ?? true;
  const cpuPct = latestMetric?.cpu?.usagePercent;
  const memPct = latestMetric?.memory?.usedPercent;
  const diskPct = latestMetric?.disk?.usedPercent;

  if (dashboard.loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <LoadingState message="Loading dashboard…" />
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState
            error={dashboard.error}
            onRetry={dashboard.refetch}
          />
        </Card>
      </div>
    );
  }

  const d = dashboard.data;
  const mrr = kpis.data?.mrr ?? 0;
  const activeSubs = kpis.data?.activeSubscribers ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BuildingLibraryIcon}
          color="primary"
          label="Total Tenants"
          value={d?.tenants.total ?? 0}
          trend={{
            value: d?.tenants.total ? 0 : 0,
            label: `${d?.tenants.active ?? 0} active`,
          }}
        />
        <StatCard
          icon={UsersIcon}
          color="info"
          label="Total Users"
          value={d?.users.total ?? 0}
          trend={{
            value: 0,
            label: `${d?.users.active ?? 0} active`,
          }}
        />
        <StatCard
          icon={CreditCardIcon}
          color="success"
          label="Active Subscriptions"
          value={activeSubs}
          trend={{
            value: 0,
            label: kpis.loading ? "loading…" : "live",
          }}
        />
        <StatCard
          icon={CurrencyDollarIcon}
          color="warning"
          label="Monthly Revenue"
          value={formatPrice(mrr, "USD")}
          trend={{
            value: 0,
            label: kpis.loading ? "loading…" : "MRR",
          }}
        />
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MiniBarChart
          title="Revenue (last 30 days)"
          description="Daily gross revenue across all tenants."
          data={revenueBars}
          currency
          emptyLabel="Revenue data unavailable"
        />
        <MiniBarChart
          title="New Subscribers (last 30 days)"
          description="Daily new paid subscribers."
          data={signupTrend}
          emptyLabel="Subscriber trend unavailable"
        />
        <MiniBarChart
          title="Tenant Growth (12 months)"
          description="New tenants per month."
          data={tenantGrowth}
          emptyLabel="Tenant growth unavailable"
        />
      </div>

      {/* Activity + Health */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                Recent Activity
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Latest {recentTenants.length} tenant sign-ups.
              </p>
            </div>
            <Button
              component={Link}
              to="/admin/tenants"
              variant="flat"
              color="neutral"
              className="gap-1 text-xs"
            >
              View all
              <ArrowRightIcon className="size-4 stroke-2" />
            </Button>
          </div>

          {tenantsRecent.loading ? (
            <LoadingState inline message="Loading recent activity…" />
          ) : tenantsRecent.error ? (
            <ErrorState
              error={tenantsRecent.error}
              onRetry={tenantsRecent.refetch}
            />
          ) : recentTenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400 dark:text-dark-400">
              No recent tenants.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-dark-600">
              {recentTenants.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                      <BuildingLibraryIcon className="size-4.5 stroke-2" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={`/admin/tenants/${t.id}`}
                        className="block truncate text-sm font-medium text-gray-800 hover:text-primary-600 dark:text-dark-50 dark:hover:text-primary-400"
                      >
                        {t.name}
                      </Link>
                      <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                        {t.slug}
                        {t.planName ? ` · ${t.planName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {t.isActive ? (
                      <Badge color="success" variant="soft">
                        Active
                      </Badge>
                    ) : (
                      <Badge color="error" variant="soft">
                        Inactive
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400 dark:text-dark-400">
                      {formatRelative(t.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* System health */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              System Health
            </h3>
            {healthOk ? (
              <Badge color="success" variant="soft">
                <CheckCircleIcon className="size-3.5" />
                Healthy
              </Badge>
            ) : (
              <Badge color="error" variant="soft">
                <XCircleIcon className="size-3.5" />
                Issues
              </Badge>
            )}
          </div>

          {health?.issues && health.issues.length > 0 && (
            <div className="mt-3 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-700 dark:bg-error-500/15 dark:text-error-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <ExclamationTriangleIcon className="size-3.5" />
                {health.issues.length} active issue
                {health.issues.length === 1 ? "" : "s"}
              </div>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {health.issues.slice(0, 4).map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <dl className="mt-4 space-y-2.5 text-sm">
            <MetricRow label="CPU" pct={cpuPct} loading={healthCurrent.loading} />
            <MetricRow
              label="Memory"
              pct={memPct}
              loading={healthCurrent.loading}
            />
            <MetricRow
              label="Disk"
              pct={diskPct}
              loading={healthCurrent.loading}
            />
          </dl>

          <Button
            component={Link}
            to="/admin/health"
            variant="flat"
            color="neutral"
            className="mt-4 w-full justify-center gap-1.5 text-xs"
          >
            View system health
            <ArrowRightIcon className="size-4 stroke-2" />
          </Button>
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function MetricRow({
  label,
  pct,
  loading,
}: {
  label: string;
  pct?: number;
  loading: boolean;
}) {
  const value =
    pct === undefined || pct === null
      ? loading
        ? "…"
        : "—"
      : `${pct.toFixed(1)}%`;
  const tone =
    pct === undefined
      ? "bg-gray-300 dark:bg-dark-500"
      : pct < 60
        ? "bg-success-500"
        : pct < 85
          ? "bg-warning-500"
          : "bg-error-500";
  const barPct =
    pct === undefined || pct === null ? 0 : Math.min(pct, 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <dt className="text-gray-600 dark:text-dark-200">{label}</dt>
        <dd className="font-medium text-gray-800 dark:text-dark-50">
          {value}
        </dd>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}
