// Platform Admin — Tenant detail page.
//
// Mounted at `/admin/tenants/:id`. Shows:
//   - Tenant info card (name, slug, plan, status, credits, billing)
//   - Members table (email, name, role, joined)
//   - Plan assignment (change plan, waive billing)
//   - Subscription info (Stripe status, period end, cancel button)
//   - Status management (activate/deactivate)

// Import Dependencies
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeftIcon,
  BuildingLibraryIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Select } from "@/components/ui";
import {
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAdminTenant,
  useAdminPlans,
  useUpdateTenantStatus,
  useAssignTenantPlan,
  useCancelTenantSubscription,
} from "@/hooks/useAdmin";
import { formatDate, formatDateTime } from "./utils";

// ----------------------------------------------------------------------

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useAdminTenant(id);
  const plansQ = useAdminPlans();
  const statusMut = useUpdateTenantStatus();
  const planMut = useAssignTenantPlan();
  const cancelMut = useCancelTenantSubscription();

  const [planId, setPlanId] = useState<string>("");
  const [billingWaived, setBillingWaived] = useState<boolean>(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelImmediate, setCancelImmediate] = useState(false);

  // Sync local form state with loaded tenant.
  useEffect(() => {
    if (data?.tenant) {
      setPlanId(data.tenant.planId ?? "");
      setBillingWaived(Boolean(data.tenant.billingWaived));
    }
  }, [data?.tenant]);

  const tenant = data?.tenant;
  const members = data?.members ?? [];
  const plans = plansQ.data?.plans ?? [];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <LoadingState message="Loading tenant…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState
            error="Tenant not found."
            title="Tenant not found"
          />
        </Card>
      </div>
    );
  }

  const onActivate = async () => {
    await statusMut.mutate({ id: tenant.id, isActive: !tenant.isActive });
    void refetch();
  };

  const onSavePlan = async () => {
    await planMut.mutate({
      tenantId: tenant.id,
      planId: planId || undefined,
      billingWaived,
    });
    void refetch();
  };

  const onConfirmCancel = async () => {
    await cancelMut.mutate({
      tenantId: tenant.id,
      immediate: cancelImmediate,
    });
    setShowCancel(false);
    void refetch();
  };

  const totalCredits =
    (tenant.subscriptionCredits ?? 0) + (tenant.purchasedCredits ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Back link */}
      <Link
        to="/admin/tenants"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
      >
        <ArrowLeftIcon className="size-4 stroke-2" />
        Back to tenants
      </Link>

      {/* Tenant header */}
      <Card className="mt-3 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
              <BuildingLibraryIcon className="size-6 stroke-2" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                  {tenant.name}
                </h2>
                {tenant.isRoot && (
                  <Badge color="warning" variant="soft">
                    Root
                  </Badge>
                )}
                {tenant.isActive ? (
                  <Badge color="success" variant="soft">
                    Active
                  </Badge>
                ) : (
                  <Badge color="error" variant="soft">
                    Inactive
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-dark-600">
                  {tenant.slug}
                </code>
                <span className="mx-2">·</span>
                ID: <span className="font-mono text-xs">{tenant.id}</span>
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">
                Created {formatDateTime(tenant.createdAt)}
              </p>
            </div>
          </div>

          <Button
            variant={tenant.isActive ? "outlined" : "soft"}
            color={tenant.isActive ? "error" : "success"}
            onClick={onActivate}
            disabled={statusMut.loading}
            className="gap-1.5 text-sm"
          >
            {tenant.isActive ? (
              <>
                <XMarkIcon className="size-4" />
                Deactivate
              </>
            ) : (
              <>
                <CheckIcon className="size-4" />
                Activate
              </>
            )}
          </Button>
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-dark-600 sm:grid-cols-4">
          <StatTile label="Plan" value={tenant.planName ?? "—"} />
          <StatTile label="Members" value={String(tenant.memberCount ?? 0)} />
          <StatTile label="Total Credits" value={totalCredits.toLocaleString()} />
          <StatTile
            label="Billing"
            value={tenant.billingWaived ? "Waived" : tenant.billingStatus ?? "—"}
          />
        </div>
      </Card>

      {/* Plan + Subscription */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Plan assignment */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Plan Assignment
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Assign a subscription plan or waive billing for this tenant.
          </p>

          {plansQ.loading ? (
            <LoadingState inline message="Loading plans…" />
          ) : plansQ.error ? (
            <ErrorState error={plansQ.error} onRetry={plansQ.refetch} />
          ) : (
            <div className="mt-4 space-y-3">
              <Select
                label="Plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                data={[
                  { value: "", label: "— No plan —" },
                  ...plans
                    .filter((p) => !p.isArchived)
                    .map((p) => ({
                      value: p.id,
                      label: `${p.name} · $${(p.monthlyPriceCents / 100).toFixed(0)}/mo`,
                    })),
                ]}
                className="text-sm"
              />

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-200">
                <input
                  type="checkbox"
                  checked={billingWaived}
                  onChange={(e) => setBillingWaived(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-450 dark:bg-dark-700"
                />
                Waive billing (grant plan for free)
              </label>

              <Button
                color="primary"
                variant="filled"
                onClick={onSavePlan}
                disabled={planMut.loading}
                className="gap-1.5 text-sm"
              >
                <CheckIcon className="size-4" />
                {planMut.loading ? "Saving…" : "Save plan"}
              </Button>

              {planMut.error && (
                <p className="text-xs text-error-600 dark:text-error-400">
                  {planMut.error.message}
                </p>
              )}
              {planMut.data !== null && (
                <p className="text-xs text-success-600 dark:text-success-400">
                  Plan saved.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Subscription info */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Subscription
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Stripe-powered subscription state for this tenant.
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Field label="Billing status" value={tenant.billingStatus ?? "—"} />
            <Field label="Billing interval" value={tenant.billingInterval ?? "—"} />
            <Field
              label="Stripe customer"
              value={
                tenant.stripeCustomerId ? (
                  <code className="font-mono text-xs">
                    {tenant.stripeCustomerId}
                  </code>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="Subscription ID"
              value={
                tenant.stripeSubscriptionId ? (
                  <code className="font-mono text-xs">
                    {tenant.stripeSubscriptionId}
                  </code>
                ) : (
                  "—"
                )
              }
            />
            <Field
              label="Current period end"
              value={
                tenant.currentPeriodEnd
                  ? formatDate(tenant.currentPeriodEnd)
                  : "—"
              }
            />
            <Field
              label="Canceled at"
              value={
                tenant.canceledAt ? formatDateTime(tenant.canceledAt) : "—"
              }
            />
          </dl>

          <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
            <Button
              variant="outlined"
              color="error"
              onClick={() => setShowCancel((s) => !s)}
              disabled={cancelMut.loading || !tenant.stripeSubscriptionId}
              className="gap-1.5 text-sm"
            >
              <XMarkIcon className="size-4" />
              Cancel subscription
            </Button>
          </div>

          {showCancel && (
            <div className="mt-3 rounded-md border border-error-300 bg-error-50 p-3 text-sm dark:border-error-500/40 dark:bg-error-500/10">
              <div className="flex items-center gap-1.5 font-medium text-error-700 dark:text-error-300">
                <ExclamationTriangleIcon className="size-4" />
                Cancel this subscription?
              </div>
              <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                This will cancel the tenant's Stripe subscription. The action
                is irreversible.
              </p>
              <label className="mt-2 flex items-center gap-2 text-xs text-error-700 dark:text-error-300">
                <input
                  type="checkbox"
                  checked={cancelImmediate}
                  onChange={(e) => setCancelImmediate(e.target.checked)}
                  className="size-4 rounded border-error-300 text-error-600 focus:ring-error-500 dark:border-dark-450 dark:bg-dark-700"
                />
                Cancel immediately (vs. at period end)
              </label>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  variant="flat"
                  color="neutral"
                  onClick={() => setShowCancel(false)}
                  className="text-xs"
                >
                  Back
                </Button>
                <Button
                  color="error"
                  variant="filled"
                  onClick={onConfirmCancel}
                  disabled={cancelMut.loading}
                  className="text-xs"
                >
                  {cancelMut.loading ? "Canceling…" : "Confirm cancel"}
                </Button>
              </div>
              {cancelMut.error && (
                <p className="mt-2 text-xs text-error-600 dark:text-error-400">
                  {cancelMut.error.message}
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Members */}
      <Card className="mt-4 overflow-hidden" skin="bordered">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Members
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {members.length} {members.length === 1 ? "member" : "members"}
          </p>
        </div>
        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400 dark:text-dark-400">
            No members in this tenant.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Joined
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {members.map((m) => (
                  <tr key={m.userId}>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-dark-200">
                      {m.email}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-dark-200">
                      {m.displayName}
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleBadge role={m.role} />
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-dark-300">
                      {formatDate(m.joinedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        to={`/admin/users/${m.userId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                      >
                        <CreditCardIcon className="size-3.5" />
                        View user
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-dark-50">
        {value}
      </p>
    </div>
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
      <dt className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-800 dark:text-dark-50">
        {value}
      </dd>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "owner"
      ? "warning"
      : role === "admin"
        ? "info"
        : role === "instructor"
          ? "primary"
          : "neutral";
  return (
    <Badge color={color as "warning" | "info" | "primary" | "neutral"} variant="soft">
      {role}
    </Badge>
  );
}
