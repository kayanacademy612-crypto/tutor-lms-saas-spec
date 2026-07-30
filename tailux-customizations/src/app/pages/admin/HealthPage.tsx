// Platform Admin — System health.
//
// Three sections:
//   - Server nodes grid (hostname, status, version, uptime)
//   - Integration status cards (MongoDB, Stripe, Resend, OAuth providers)
//   - Current metrics (CPU, Memory, Disk, Requests, Latency, Errors)
//
// Uses `useHealthNodes`, `useHealthCurrent`, `useHealthIntegrations`.

// Import Dependencies
import {
  ServerStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  CpuChipIcon,
  CircleStackIcon,
  ClockIcon,
  BoltIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import {
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useHealthNodes,
  useHealthCurrent,
  useHealthIntegrations,
} from "@/hooks/useAdmin";
import { formatBytes, formatDateTime, formatMs, formatUptime } from "./utils";

// ----------------------------------------------------------------------

export default function HealthPage() {
  const nodes = useHealthNodes();
  const current = useHealthCurrent();
  const integrations = useHealthIntegrations();

  const metric = current.data?.metrics?.[0];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Nodes */}
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
              Server Nodes
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
              Live application server nodes registered with the cluster.
            </p>
          </div>
          <Button
            variant="flat"
            color="neutral"
            onClick={() => {
              void nodes.refetch();
              void current.refetch();
              void integrations.refetch();
            }}
            className="gap-1.5 text-xs"
          >
            <ArrowPathIcon className="size-4" />
            Refresh
          </Button>
        </div>

        {nodes.loading ? (
          <Card className="mt-4 p-4">
            <LoadingState message="Loading nodes…" />
          </Card>
        ) : nodes.error ? (
          <Card className="mt-4 p-4">
            <ErrorState error={nodes.error} onRetry={nodes.refetch} />
          </Card>
        ) : (nodes.data?.nodes ?? []).length === 0 ? (
          <Card className="mt-4 p-4">
            <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-400">
              No nodes registered.
            </p>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(nodes.data?.nodes ?? []).map((n) => {
              const upSeconds = n.upSince
                ? (Date.now() - new Date(n.upSince).getTime()) / 1000
                : undefined;
              return (
                <Card key={n.id ?? n.hostname} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                        <ServerStackIcon className="size-5 stroke-2" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                          {n.hostname}
                        </p>
                        <p className="truncate text-xs text-gray-400 dark:text-dark-400">
                          {n.machineId}
                        </p>
                      </div>
                    </div>
                    <NodeStatusBadge status={n.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <Field label="Version" value={n.version} />
                    <Field label="Go" value={n.goVersion} />
                    <Field label="Uptime" value={formatUptime(upSeconds)} />
                    <Field
                      label="Last seen"
                      value={formatDateTime(n.lastSeen)}
                    />
                  </dl>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Integrations */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Integrations
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          Status of external services the platform depends on.
        </p>

        {integrations.loading ? (
          <Card className="mt-4 p-4">
            <LoadingState message="Loading integrations…" />
          </Card>
        ) : integrations.error ? (
          <Card className="mt-4 p-4">
            <ErrorState error={integrations.error} onRetry={integrations.refetch} />
          </Card>
        ) : (integrations.data?.integrations ?? []).length === 0 ? (
          <Card className="mt-4 p-4">
            <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-400">
              No integrations configured.
            </p>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(integrations.data?.integrations ?? []).map((i) => (
              <Card key={i.name} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                      {i.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-dark-400">
                      {i.responseMs !== undefined
                        ? `${formatMs(i.responseMs)} response`
                        : ""}
                      {i.calls24h !== undefined
                        ? ` · ${i.calls24h} calls/24h`
                        : ""}
                    </p>
                  </div>
                  <NodeStatusBadge status={i.status} />
                </div>
                {i.message && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
                    {i.message}
                  </p>
                )}
                {i.lastCheck && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-dark-400">
                    Last check: {formatDateTime(i.lastCheck)}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Current metrics */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Current Metrics
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          Most-recent system metrics sample (across the cluster).
        </p>

        {current.loading ? (
          <Card className="mt-4 p-4">
            <LoadingState message="Loading metrics…" />
          </Card>
        ) : current.error ? (
          <Card className="mt-4 p-4">
            <ErrorState error={current.error} onRetry={current.refetch} />
          </Card>
        ) : !metric ? (
          <Card className="mt-4 p-4">
            <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-400">
              No metrics samples available.
            </p>
          </Card>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* CPU */}
            <MetricCard
              icon={CpuChipIcon}
              title="CPU"
              value={
                metric.cpu?.usagePercent !== undefined
                  ? `${metric.cpu.usagePercent.toFixed(1)}%`
                  : "—"
              }
              detail={
                metric.cpu?.numCpu
                  ? `${metric.cpu.numCpu} cores`
                  : undefined
              }
              pct={metric.cpu?.usagePercent}
            />
            {/* Memory */}
            <MetricCard
              icon={CircleStackIcon}
              title="Memory"
              value={
                metric.memory?.usedPercent !== undefined
                  ? `${metric.memory.usedPercent.toFixed(1)}%`
                  : "—"
              }
              detail={
                metric.memory?.usedBytes !== undefined &&
                metric.memory?.totalBytes !== undefined
                  ? `${formatBytes(metric.memory.usedBytes)} / ${formatBytes(metric.memory.totalBytes)}`
                  : undefined
              }
              pct={metric.memory?.usedPercent}
            />
            {/* Disk */}
            <MetricCard
              icon={CircleStackIcon}
              title="Disk"
              value={
                metric.disk?.usedPercent !== undefined
                  ? `${metric.disk.usedPercent.toFixed(1)}%`
                  : "—"
              }
              detail={
                metric.disk?.usedBytes !== undefined &&
                metric.disk?.totalBytes !== undefined
                  ? `${formatBytes(metric.disk.usedBytes)} / ${formatBytes(metric.disk.totalBytes)}`
                  : undefined
              }
              pct={metric.disk?.usedPercent}
            />
            {/* HTTP requests */}
            <MetricCard
              icon={BoltIcon}
              title="HTTP Requests"
              value={
                metric.http?.requestCount !== undefined
                  ? metric.http.requestCount.toLocaleString()
                  : "—"
              }
              detail={
                metric.http?.errorRate5xx !== undefined
                  ? `${metric.http.errorRate5xx.toFixed(2)}% 5xx`
                  : undefined
              }
            />
            {/* Latency */}
            <MetricCard
              icon={ClockIcon}
              title="Latency"
              value={
                metric.http?.latencyP95 !== undefined
                  ? formatMs(metric.http.latencyP95)
                  : "—"
              }
              detail={
                metric.http?.latencyP50 !== undefined &&
                metric.http?.latencyP99 !== undefined
                  ? `p50 ${formatMs(metric.http.latencyP50)} · p99 ${formatMs(metric.http.latencyP99)}`
                  : undefined
              }
            />
            {/* Errors */}
            <MetricCard
              icon={XCircleIcon}
              title="Errors"
              value={
                metric.http?.errorRate4xx !== undefined
                  ? `${metric.http.errorRate4xx.toFixed(2)}% 4xx`
                  : "—"
              }
              detail={
                metric.http?.errorRate5xx !== undefined
                  ? `${metric.http.errorRate5xx.toFixed(2)}% 5xx`
                  : undefined
              }
            />
          </div>
        )}

        {metric && (
          <p className="mt-4 text-xs text-gray-400 dark:text-dark-400">
            Sample taken {formatDateTime(metric.timestamp)}
          </p>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------

function NodeStatusBadge({ status }: { status: string }) {
  const isHealthy =
    status === "healthy" ||
    status === "ok" ||
    status === "active" ||
    status === "online";
  const isDegraded =
    status === "degraded" || status === "warning" || status === "slow";
  const color = isHealthy
    ? "success"
    : isDegraded
      ? "warning"
      : "error";
  const Icon = isHealthy
    ? CheckCircleIcon
    : isDegraded
      ? ClockIcon
      : XCircleIcon;
  return (
    <Badge color={color as "success" | "warning" | "error"} variant="soft">
      <Icon className="size-3.5" />
      {status || "Unknown"}
    </Badge>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-dark-400">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-xs text-gray-800 dark:text-dark-100">
        {value}
      </dd>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  pct,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail?: string;
  pct?: number;
}) {
  const tone =
    pct === undefined
      ? "bg-gray-300 dark:bg-dark-500"
      : pct < 60
        ? "bg-success-500"
        : pct < 85
          ? "bg-warning-500"
          : "bg-error-500";
  const barPct = pct === undefined ? 0 : Math.min(pct, 100);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-200">
            <Icon className="size-5 stroke-2" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
              {title}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-dark-50">
              {value}
            </p>
          </div>
        </div>
      </div>
      {pct !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
          <div
            className={`h-full rounded-full ${tone}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      )}
      {detail && (
        <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
          {detail}
        </p>
      )}
    </Card>
  );
}
