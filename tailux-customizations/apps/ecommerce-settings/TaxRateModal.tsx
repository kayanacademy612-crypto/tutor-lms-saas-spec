// TaxRateModal — create / edit modal for a single TaxRate row.
//
// Backed by `useCreateTaxRate` / `useUpdateTaxRate` from `@/hooks/useEcommerce`.
// Validation via `react-hook-form` + `yup`. Rendered as a centered overlay;
// the parent decides when to mount / unmount it (controlled via `open`).

// Import Dependencies
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import clsx from "clsx";
import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Input, Switch, Select } from "@/components/ui";
import { useCreateTaxRate, useUpdateTaxRate } from "@/hooks/useEcommerce";
import type { TaxRate, TaxRateCreateInput } from "@/types/lms";

// ----------------------------------------------------------------------

const schema = Yup.object().shape({
  name: Yup.string().trim().required("Name is required."),
  countryCode: Yup.string()
    .trim()
    .max(2, "Use the 2-letter ISO code.")
    .transform((v) => (v ? v.toUpperCase() : "")),
  regionCode: Yup.string()
    .trim()
    .max(10, "Region code is too long."),
  ratePercent: Yup.number()
    .typeError("Enter a number.")
    .min(0, "Rate can't be negative.")
    .max(100, "Rate can't exceed 100%.")
    .required("Rate is required."),
  priority: Yup.number()
    .typeError("Enter a number.")
    .min(0, "Priority can't be negative.")
    .integer("Priority must be a whole number.")
    .default(0),
  isInclusive: Yup.boolean().default(false),
  isActive: Yup.boolean().default(true),
});

type FormValues = Yup.InferType<typeof schema>;

export interface TaxRateModalProps {
  open: boolean;
  /** When editing an existing row, pass it here. `null` → create mode. */
  taxRate: TaxRate | null;
  /** Called when the modal should close (cancel, backdrop click, or success). */
  onClose: () => void;
  /** Called after a successful create / update so the parent can refetch. */
  onSaved?: () => void;
}

// ----------------------------------------------------------------------

export default function TaxRateModal({
  open,
  taxRate,
  onClose,
  onSaved,
}: TaxRateModalProps) {
  const createTaxRate = useCreateTaxRate();
  const updateTaxRate = useUpdateTaxRate();

  const isEditing = !!taxRate;

  const defaultValues: FormValues = useMemo(
    () => ({
      name: taxRate?.name ?? "",
      countryCode: taxRate?.countryCode ?? "",
      regionCode: taxRate?.regionCode ?? "",
      ratePercent: taxRate?.ratePercent ?? 0,
      priority: taxRate?.priority ?? 0,
      isInclusive: taxRate?.isInclusive ?? false,
      isActive: taxRate?.isActive ?? true,
    }),
    [taxRate],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // Reset whenever the modal opens or the taxRate prop changes.
  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taxRate?.id]);

  if (!open) return null;

  const isInclusive = watch("isInclusive");
  const isActive = watch("isActive");

  const onSubmit = (values: FormValues) => {
    const input: TaxRateCreateInput = {
      name: values.name,
      countryCode: values.countryCode || undefined,
      regionCode: values.regionCode || undefined,
      ratePercent: values.ratePercent,
      isInclusive: values.isInclusive,
      isActive: values.isActive,
      priority: values.priority,
    };

    if (isEditing && taxRate) {
      void updateTaxRate
        .mutate({ id: taxRate.id, input })
        .then((result) => {
          if (result) {
            onSaved?.();
            onClose();
          }
        });
    } else {
      void createTaxRate.mutate(input).then((result) => {
        if (result) {
          onSaved?.();
          onClose();
        }
      });
    }
  };

  const isSubmitting = createTaxRate.loading || updateTaxRate.loading;
  const mutationError = createTaxRate.error || updateTaxRate.error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tax-rate-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        skin="bordered"
        className="w-full max-w-lg overflow-hidden bg-white dark:bg-dark-750"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
          <div>
            <h2
              id="tax-rate-modal-title"
              className="text-sm font-semibold text-gray-800 dark:text-dark-50"
            >
              {isEditing ? "Edit tax rate" : "Add tax rate"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {isEditing
                ? "Update the configuration for this tax rate."
                : "Define a new tax rate for a country / region."}
            </p>
          </div>
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-7"
            onClick={onClose}
            aria-label="Close"
          >
            <XMarkIcon className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-5">
          <Input
            label="Name"
            placeholder="e.g. EU VAT, California Sales Tax"
            description="Shown in the admin tax list and on invoices."
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Country code"
              placeholder="US"
              description="ISO 3166-1 alpha-2 (2 letters)."
              error={errors.countryCode?.message}
              {...register("countryCode")}
            />
            <Input
              label="Region code"
              placeholder="CA"
              description="State / province code (optional)."
              error={errors.regionCode?.message}
              {...register("regionCode")}
            />
            <Input
              label="Rate (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="8.25"
              error={errors.ratePercent?.message}
              {...register("ratePercent")}
            />
            <Input
              label="Priority"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              description="Higher priority applies first when stacking."
              error={errors.priority?.message}
              {...register("priority")}
            />
          </div>

          <Select
            label="Calculation"
            description="Inclusive rates are baked into the listed price. Exclusive rates are added on top."
            data={[
              { value: "exclusive", label: "Exclusive — added on top" },
              { value: "inclusive", label: "Inclusive — already in price" },
            ]}
            value={isInclusive ? "inclusive" : "exclusive"}
            onChange={(e) =>
              reset((v) => ({
                ...v,
                isInclusive: e.target.value === "inclusive",
              }))
            }
          />

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                Active
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Inactive tax rates are kept in history but never applied.
              </p>
            </div>
            <Switch
              checked={isActive}
              onChange={(e) =>
                reset((v) => ({ ...v, isActive: e.target.checked }))
              }
              aria-label="Toggle active"
            />
          </div>

          {mutationError && (
            <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
              {mutationError.message ||
                "Couldn't save the tax rate. Please try again."}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
            <Button
              type="button"
              variant="flat"
              color="neutral"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              color="primary"
              variant="filled"
              className="gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ArrowPathIcon className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>{isEditing ? "Save changes" : "Add tax rate"}</>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/** Tiny helper exported for parents that need to render the modal trigger. */
export function TaxRateModalTrigger({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <Button
      color="primary"
      variant="filled"
      className={clsx("gap-1.5", className)}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
