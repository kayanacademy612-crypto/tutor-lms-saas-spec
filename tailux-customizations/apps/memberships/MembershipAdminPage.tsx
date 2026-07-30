// Membership admin page — `apps/memberships/admin` route.
//
// Layout: single column with a header strip + main table.
//
//   Main:
//     - "Create Plan" button → opens a modal with the membership form
//       (name, slug, billing interval, price, trial days, applies-to-all
//       toggle, courseIds, isActive)
//     - Table of all membership plans with name, interval, price, trial,
//       course count, status, and (disabled) edit/delete actions
//
// API surface notes:
//   - `membershipApi.list()` and `membershipApi.create()` are supported.
//   - `update()` and `delete()` are not implemented by the current API.
//     The edit/delete buttons are rendered with a `title` tooltip and
//     disabled state so the table layout matches the spec without breaking
//     the build.

// Import Dependencies
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
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
  Textarea,
  Select,
  Switch,
} from "@/components/ui";
import {
  LoadingState,
  ErrorState,
  EmptyState,
  formatPrice,
} from "@/components/lms";
import type { ColorType } from "@/constants/app";
import { lmsApi } from "@/services/lms-api";
import type { LmsApiError } from "@/services/lms-api";
import type {
  Membership,
  MembershipBillingInterval,
  MembershipCreateInput,
} from "@/types/lms";

// ----------------------------------------------------------------------

const INTERVAL_OPTIONS: Array<{
  value: MembershipBillingInterval;
  label: string;
}> = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "lifetime", label: "Lifetime" },
];

const INTERVAL_BADGE_COLOR: Record<MembershipBillingInterval, ColorType> = {
  monthly: "info",
  quarterly: "primary",
  annual: "success",
  lifetime: "secondary",
};

// ----------------------------------------------------------------------

export default function MembershipAdminPage() {
  const navigate = useNavigate();

  // ───────── State ─────────
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<LmsApiError | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // ───────── Load ─────────

  const loadMemberships = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await lmsApi.membership.list();
      setMemberships(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err as LmsApiError);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMemberships();
  }, []);

  // ───────── Create ─────────

  const handleCreate = async (input: MembershipCreateInput) => {
    try {
      await lmsApi.membership.create(input);
      setModalOpen(false);
      await loadMemberships();
    } catch (err) {
      setError(err as LmsApiError);
    }
  };

  // ───────── Render ─────────

  return (
    <Page title="Memberships Admin">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-9"
              onClick={() => navigate("/apps/memberships")}
              aria-label="Back to memberships"
            >
              <ArrowLeftIcon className="size-5 stroke-2" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Memberships Admin
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Create and manage membership plans for your school.
              </p>
            </div>
          </div>
          <Button
            color="primary"
            variant="filled"
            className="gap-1.5"
            onClick={() => setModalOpen(true)}
          >
            <PlusIcon className="size-4 stroke-2" />
            <span className="hidden sm:inline">Create Plan</span>
          </Button>
        </header>

        {/* Body */}
        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            {loading ? (
              <LoadingState message="Loading plans…" />
            ) : error ? (
              <ErrorState error={error} onRetry={loadMemberships} />
            ) : memberships.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No membership plans yet"
                description="Create your first membership plan to start offering unlimited course access to your students."
                actionLabel="Create Plan"
                onAction={() => setModalOpen(true)}
              />
            ) : (
              <Card skin="bordered" className="overflow-hidden p-0">
                <Table hoverable>
                  <THead>
                    <Tr>
                      <Th className="text-left">Name</Th>
                      <Th className="text-left">Interval</Th>
                      <Th className="text-right">Price</Th>
                      <Th className="text-center">Trial</Th>
                      <Th className="text-center">Courses</Th>
                      <Th className="text-center">Status</Th>
                      <Th className="text-right">Actions</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {memberships.map((m) => {
                      const currency = (m.currency ?? "USD").toUpperCase();
                      return (
                        <Tr key={m.id}>
                          <Td>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                                {m.name}
                              </p>
                              <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                                /{m.slug}
                              </p>
                            </div>
                          </Td>
                          <Td>
                            <Badge
                              color={INTERVAL_BADGE_COLOR[m.billingInterval]}
                              variant="soft"
                              className="capitalize"
                            >
                              {m.billingInterval}
                            </Badge>
                          </Td>
                          <Td className="text-right">
                            <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                              {formatPrice(m.priceCents, currency)}
                            </span>
                          </Td>
                          <Td className="text-center">
                            {m.trialDays && m.trialDays > 0 ? (
                              <span className="text-xs text-success-600 dark:text-success-400">
                                {m.trialDays}d
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-dark-400">
                                —
                              </span>
                            )}
                          </Td>
                          <Td className="text-center">
                            <span className="text-xs text-gray-700 dark:text-dark-100">
                              {m.appliesToAllCourses
                                ? "All"
                                : `${m.courseIds?.length ?? 0}`}
                            </span>
                          </Td>
                          <Td className="text-center">
                            {m.isActive ? (
                              <Badge
                                color="success"
                                variant="soft"
                                className="gap-1"
                              >
                                <CheckCircleIcon className="size-3 stroke-2" />
                                Active
                              </Badge>
                            ) : (
                              <Badge
                                color="neutral"
                                variant="soft"
                                className="gap-1"
                              >
                                <XCircleIcon className="size-3 stroke-2" />
                                Inactive
                              </Badge>
                            )}
                          </Td>
                          <Td>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                isIcon
                                variant="flat"
                                color="neutral"
                                className="size-8"
                                title="Edit not yet supported by API"
                                disabled
                              >
                                <PencilIcon className="size-4 stroke-2" />
                              </Button>
                              <Button
                                isIcon
                                variant="flat"
                                color="error"
                                className="size-8"
                                title="Delete not yet supported by API"
                                disabled
                              >
                                <TrashIcon className="size-4 stroke-2" />
                              </Button>
                            </div>
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </Table>
              </Card>
            )}
          </div>
        </ScrollShadow>
      </div>

      {/* Create Plan modal */}
      <CreatePlanModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </Page>
  );
}

// ----------------------------------------------------------------------

/** HeadlessUI modal containing the "Create Plan" form. */
function CreatePlanModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: MembershipCreateInput) => Promise<void>;
}) {
  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [billingInterval, setBillingInterval] =
    useState<MembershipBillingInterval>("monthly");
  const [priceCents, setPriceCents] = useState<number>(2900);
  const [trialDays, setTrialDays] = useState<number>(0);
  const [appliesToAllCourses, setAppliesToAllCourses] =
    useState<boolean>(true);
  const [courseIdsCsv, setCourseIdsCsv] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setBillingInterval("monthly");
    setPriceCents(2900);
    setTrialDays(0);
    setAppliesToAllCourses(true);
    setCourseIdsCsv("");
    setIsActive(true);
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Plan name is required.");
      return;
    }
    if (!slug.trim()) {
      setFormError("Plan slug is required.");
      return;
    }
    if (priceCents < 0) {
      setFormError("Price cannot be negative.");
      return;
    }

    // Parse comma-separated course IDs (when not appliesToAllCourses).
    const courseIds = appliesToAllCourses
      ? []
      : courseIdsCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const input: MembershipCreateInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      billingInterval,
      priceCents,
      trialDays: trialDays > 0 ? trialDays : undefined,
      appliesToAllCourses,
      courseIds: appliesToAllCourses ? undefined : courseIds,
      isActive,
    };

    setSubmitting(true);
    try {
      await onSubmit(input);
      resetForm();
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Couldn't create the plan. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition
      appear
      show={isOpen}
      as={Dialog}
      className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6 sm:px-5"
      onClose={handleClose}
    >
      <TransitionChild
        as="div"
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40"
      />

      <TransitionChild
        as={DialogPanel}
        enter="ease-out duration-300"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
        className="hide-scrollbar relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-lg bg-white p-6 transition-all dark:bg-dark-700"
      >
        <DialogTitle
          as="h3"
          className="text-base font-semibold text-gray-800 dark:text-dark-50"
        >
          Create Membership Plan
        </DialogTitle>
        <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
          Define a new membership tier. Students can subscribe from the
          memberships page.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          {/* Name + slug */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Plan name"
              placeholder="Pro Membership"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
            />
            <Input
              label="Slug"
              placeholder="pro-membership"
              value={slug}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSlug(e.target.value)
              }
            />
          </div>

          {/* Description */}
          <Textarea
            label="Description (optional)"
            rows={2}
            placeholder="Unlimited access to every course in the catalog."
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setDescription(e.target.value)
            }
          />

          {/* Billing interval + price */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Billing interval"
              value={billingInterval}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setBillingInterval(
                  e.target.value as MembershipBillingInterval,
                )
              }
              data={INTERVAL_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
            />
            <Input
              label="Price (cents)"
              type="number"
              min={0}
              step={100}
              value={priceCents}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPriceCents(Number(e.target.value))
              }
              description={`= ${formatPrice(priceCents, "USD")}`}
            />
          </div>

          {/* Trial days */}
          <Input
            label="Trial days (optional)"
            type="number"
            min={0}
            step={1}
            value={trialDays}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setTrialDays(Number(e.target.value))
            }
            description="0 = no free trial"
          />

          {/* Applies to all courses */}
          <Card skin="bordered" className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                  Access scope
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                  Toggle ON for unlimited access to all current and future
                  courses. Toggle OFF to specify individual course IDs.
                </p>
              </div>
              <Switch
                checked={appliesToAllCourses}
                onChange={(e) => setAppliesToAllCourses(e.target.checked)}
              />
            </div>
            {!appliesToAllCourses && (
              <div className="mt-3">
                <Input
                  label="Course IDs (comma-separated)"
                  placeholder="course-id-1, course-id-2"
                  value={courseIdsCsv}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCourseIdsCsv(e.target.value)
                  }
                />
              </div>
            )}
          </Card>

          {/* Active toggle */}
          <Card skin="bordered" className="p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                  Active
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                  Only active plans are shown on the memberships page.
                </p>
              </div>
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
            </div>
          </Card>

          {/* Form error */}
          {formError && (
            <div className="rounded-md bg-error-500/10 p-3 text-xs text-error-600 dark:bg-error-500/15 dark:text-error-400">
              {formError}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="flat"
              color="neutral"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              variant="filled"
              disabled={submitting}
              className="gap-1.5"
            >
              <PlusIcon className="size-4 stroke-2" />
              {submitting ? "Creating…" : "Create plan"}
            </Button>
          </div>
        </form>
      </TransitionChild>
    </Transition>
  );
}
