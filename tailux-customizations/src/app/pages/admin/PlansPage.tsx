// Platform Admin — Subscription plans + credit bundles.
//
// Plans table: Name, Price, Credits, User Limit, Subscribers, Status, Actions.
// Create/Edit plan modal (name, description, monthly price, annual discount,
// credits, user limit, trial days).
// Archive/Unarchive plans.
// Credit bundles section below.

// Import Dependencies
import { useState } from "react";
import {
  PlusIcon,
  PencilSquareIcon,
  ArchiveBoxIcon,
  ArrowUpOnSquareStackIcon,
  TrashIcon,
  GiftIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Fragment } from "react";

// Local Imports
import { Button, Card, Badge, Input, Textarea } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import {
  useAdminPlans,
  useCreatePlan,
  useUpdatePlan,
  useArchivePlan,
  useUnarchivePlan,
  useAdminBundles,
  useCreateBundle,
  useDeleteBundle,
} from "@/hooks/useAdmin";
import type { Plan, CreditBundle } from "@/services/admin-api";
import { formatDate } from "./utils";

// ----------------------------------------------------------------------

type PlanDraft = Partial<Plan> & { id?: string };

const EMPTY_DRAFT: PlanDraft = {
  name: "",
  description: "",
  monthlyPriceCents: 0,
  annualDiscountPct: 0,
  usageCreditsPerMonth: 0,
  userLimit: 0,
  trialDays: 0,
};

export default function PlansPage() {
  const plansQ = useAdminPlans();
  const bundlesQ = useAdminBundles();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const archivePlan = useArchivePlan();
  const unarchivePlan = useUnarchivePlan();
  const createBundle = useCreateBundle();
  const deleteBundle = useDeleteBundle();

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<PlanDraft>(EMPTY_DRAFT);

  const [bundleModalOpen, setBundleModalOpen] = useState(false);
  const [bundleDraft, setBundleDraft] = useState<Partial<CreditBundle>>({
    name: "",
    credits: 0,
    priceCents: 0,
  });

  const openCreate = () => {
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setDraft({ ...plan });
    setModalOpen(true);
  };

  const onSavePlan = async () => {
    if (draft.id) {
      await updatePlan.mutate({ id: draft.id, body: draft });
    } else {
      await createPlan.mutate(draft);
    }
    setModalOpen(false);
    void plansQ.refetch();
  };

  const onArchive = async (plan: Plan) => {
    if (plan.isArchived) {
      await unarchivePlan.mutate(plan.id);
    } else {
      await archivePlan.mutate(plan.id);
    }
    void plansQ.refetch();
  };

  const onSaveBundle = async () => {
    await createBundle.mutate(bundleDraft);
    setBundleModalOpen(false);
    setBundleDraft({ name: "", credits: 0, priceCents: 0 });
    void bundlesQ.refetch();
  };

  const onDeleteBundle = async (id: string) => {
    if (!window.confirm("Delete this credit bundle?")) return;
    await deleteBundle.mutate(id);
    void bundlesQ.refetch();
  };

  const plans = plansQ.data?.plans ?? [];
  const bundles = bundlesQ.data?.bundles ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* Plans section */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            Subscription Plans
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            Plans that tenants can subscribe to.
          </p>
        </div>
        <Button
          color="primary"
          variant="filled"
          onClick={openCreate}
          className="gap-1.5 text-sm"
        >
          <PlusIcon className="size-4" />
          New plan
        </Button>
      </div>

      <Card skin="bordered" className="mt-4 overflow-hidden">
        {plansQ.loading ? (
          <LoadingState message="Loading plans…" />
        ) : plansQ.error ? (
          <ErrorState error={plansQ.error} onRetry={plansQ.refetch} />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={CreditCardIcon}
            title="No plans yet"
            description="Create your first subscription plan to get started."
            actionLabel="New plan"
            onAction={openCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Credits
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    User Limit
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Subscribers
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800 dark:text-dark-50">
                            {p.name}
                          </span>
                          {p.isSystem && (
                            <Badge color="info" variant="soft">
                              System
                            </Badge>
                          )}
                        </div>
                        {p.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300 line-clamp-1">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {formatPrice(p.monthlyPriceCents, "USD")}
                      <span className="text-xs text-gray-400 dark:text-dark-400">
                        {" "}
                        /mo
                      </span>
                      {p.annualDiscountPct ? (
                        <span className="ml-1 text-xs text-success-600 dark:text-success-400">
                          -{p.annualDiscountPct}% annual
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {p.usageCreditsPerMonth.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {p.userLimit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {p.subscriberCount ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {p.isArchived ? (
                        <Badge color="neutral" variant="soft">
                          Archived
                        </Badge>
                      ) : (
                        <Badge color="success" variant="soft">
                          Active
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          isIcon
                          variant="flat"
                          color="neutral"
                          className="size-7"
                          onClick={() => openEdit(p)}
                          aria-label="Edit plan"
                          disabled={p.isSystem}
                        >
                          <PencilSquareIcon className="size-4" />
                        </Button>
                        <Button
                          isIcon
                          variant="flat"
                          color={p.isArchived ? "success" : "warning"}
                          className="size-7"
                          onClick={() => onArchive(p)}
                          aria-label={
                            p.isArchived ? "Unarchive plan" : "Archive plan"
                          }
                          disabled={p.isSystem}
                        >
                          {p.isArchived ? (
                            <ArrowUpOnSquareStackIcon className="size-4" />
                          ) : (
                            <ArchiveBoxIcon className="size-4" />
                          )}
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

      {/* Bundles section */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            Credit Bundles
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            One-off credit packages tenants can purchase.
          </p>
        </div>
        <Button
          color="primary"
          variant="filled"
          onClick={() => setBundleModalOpen(true)}
          className="gap-1.5 text-sm"
        >
          <PlusIcon className="size-4" />
          New bundle
        </Button>
      </div>

      <Card skin="bordered" className="mt-4 overflow-hidden">
        {bundlesQ.loading ? (
          <LoadingState message="Loading bundles…" />
        ) : bundlesQ.error ? (
          <ErrorState error={bundlesQ.error} onRetry={bundlesQ.refetch} />
        ) : bundles.length === 0 ? (
          <EmptyState
            icon={GiftIcon}
            title="No credit bundles"
            description="Create a credit bundle so tenants can top up."
            actionLabel="New bundle"
            onAction={() => setBundleModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Credits
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Price
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {bundles.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-dark-50">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {b.credits.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {formatPrice(b.priceCents, "USD")}
                    </td>
                    <td className="px-4 py-3">
                      {b.isActive ? (
                        <Badge color="success" variant="soft">
                          Active
                        </Badge>
                      ) : (
                        <Badge color="neutral" variant="soft">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          isIcon
                          variant="flat"
                          color="error"
                          className="size-7"
                          onClick={() => onDeleteBundle(b.id)}
                          aria-label="Delete bundle"
                          disabled={deleteBundle.loading}
                        >
                          <TrashIcon className="size-4" />
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

      {/* Plan modal */}
      <Transition
        appear
        show={modalOpen}
        as={Dialog}
        onClose={() => setModalOpen(false)}
        className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6"
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40" />
        </TransitionChild>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <DialogPanel className="relative w-full max-w-lg rounded-lg bg-white p-5 shadow-soft dark:bg-dark-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              {draft.id ? "Edit plan" : "New plan"}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Configure the plan's pricing, credits, and limits.
            </p>

            <div className="mt-4 space-y-3">
              <Input
                label="Name"
                value={draft.name ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                className="text-sm"
              />
              <Textarea
                label="Description"
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, description: e.target.value }))
                }
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Monthly price (cents)"
                  type="number"
                  value={String(draft.monthlyPriceCents ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      monthlyPriceCents: Number(e.target.value),
                    }))
                  }
                  className="text-sm"
                />
                <Input
                  label="Annual discount (%)"
                  type="number"
                  value={String(draft.annualDiscountPct ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      annualDiscountPct: Number(e.target.value),
                    }))
                  }
                  className="text-sm"
                />
                <Input
                  label="Monthly credits"
                  type="number"
                  value={String(draft.usageCreditsPerMonth ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      usageCreditsPerMonth: Number(e.target.value),
                    }))
                  }
                  className="text-sm"
                />
                <Input
                  label="User limit"
                  type="number"
                  value={String(draft.userLimit ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      userLimit: Number(e.target.value),
                    }))
                  }
                  className="text-sm"
                />
                <Input
                  label="Trial days"
                  type="number"
                  value={String(draft.trialDays ?? 0)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      trialDays: Number(e.target.value),
                    }))
                  }
                  className="text-sm"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outlined"
                color="neutral"
                onClick={() => setModalOpen(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                variant="filled"
                onClick={onSavePlan}
                disabled={createPlan.loading || updatePlan.loading}
                className="text-sm"
              >
                {createPlan.loading || updatePlan.loading
                  ? "Saving…"
                  : draft.id
                    ? "Save changes"
                    : "Create plan"}
              </Button>
            </div>
            {(createPlan.error || updatePlan.error) && (
              <p className="mt-2 text-right text-xs text-error-600 dark:text-error-400">
                {(createPlan.error || updatePlan.error)?.message}
              </p>
            )}
          </DialogPanel>
        </TransitionChild>
      </Transition>

      {/* Bundle modal */}
      <Transition
        appear
        show={bundleModalOpen}
        as={Dialog}
        onClose={() => setBundleModalOpen(false)}
        className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6"
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40" />
        </TransitionChild>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-soft dark:bg-dark-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              New credit bundle
            </h3>
            <div className="mt-4 space-y-3">
              <Input
                label="Name"
                value={bundleDraft.name ?? ""}
                onChange={(e) =>
                  setBundleDraft((d) => ({ ...d, name: e.target.value }))
                }
                className="text-sm"
              />
              <Input
                label="Credits"
                type="number"
                value={String(bundleDraft.credits ?? 0)}
                onChange={(e) =>
                  setBundleDraft((d) => ({
                    ...d,
                    credits: Number(e.target.value),
                  }))
                }
                className="text-sm"
              />
              <Input
                label="Price (cents)"
                type="number"
                value={String(bundleDraft.priceCents ?? 0)}
                onChange={(e) =>
                  setBundleDraft((d) => ({
                    ...d,
                    priceCents: Number(e.target.value),
                  }))
                }
                className="text-sm"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-200">
                <input
                  type="checkbox"
                  checked={Boolean(bundleDraft.isActive)}
                  onChange={(e) =>
                    setBundleDraft((d) => ({ ...d, isActive: e.target.checked }))
                  }
                  className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-450 dark:bg-dark-700"
                />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outlined"
                color="neutral"
                onClick={() => setBundleModalOpen(false)}
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                color="primary"
                variant="filled"
                onClick={onSaveBundle}
                disabled={createBundle.loading}
                className="text-sm"
              >
                {createBundle.loading ? "Saving…" : "Create bundle"}
              </Button>
            </div>
            {createBundle.error && (
              <p className="mt-2 text-right text-xs text-error-600 dark:text-error-400">
                {createBundle.error.message}
              </p>
            )}
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </div>
  );
}
