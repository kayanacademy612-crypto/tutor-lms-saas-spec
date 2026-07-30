// Import Dependencies
import clsx from "clsx";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button, Badge } from "@/components/ui";
import type { TaxRate } from "@/types/lms";

// ----------------------------------------------------------------------

export interface TaxRateRowProps {
  /** Tax rate to render. */
  taxRate: TaxRate;
  /** Click handler for the "Edit" action. Receives the tax-rate id. */
  onEdit?: (id: string) => void;
  /** Click handler for the "Delete" action. Receives the tax-rate id. */
  onDelete?: (id: string) => void;
  /** Show the trailing actions column. Defaults to true. */
  showActions?: boolean;
  /** Extra classes on the root row. */
  className?: string;
}

/**
 * Single tax-rate row for the admin tax-rates table.
 *
 * Responsive: renders as a stacked card on mobile and as a single flex row
 * on `sm+`. Visible columns: name · country · region · rate % ·
 * inclusive/exclusive badge · active badge · actions.
 */
export function TaxRateRow({
  taxRate,
  onEdit,
  onDelete,
  showActions = true,
  className,
}: TaxRateRowProps) {
  const country = taxRate.countryCode?.trim() || "—";
  const region = taxRate.regionCode?.trim() || "—";
  const isExclusive = !taxRate.isInclusive;

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 border-b border-gray-200 px-4 py-3 last:border-b-0 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-700/40 sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
    >
      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-dark-50">
          {taxRate.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-dark-300 sm:hidden">
          {country} · {region}
        </p>
      </div>

      {/* Country / region (desktop only) */}
      <div className="hidden w-24 text-sm text-gray-600 dark:text-dark-200 sm:block">
        {country}
      </div>
      <div className="hidden w-24 text-sm text-gray-600 dark:text-dark-200 sm:block">
        {region}
      </div>

      {/* Rate */}
      <div className="w-20 text-sm font-semibold text-gray-900 dark:text-dark-50 sm:text-right">
        {taxRate.ratePercent.toFixed(taxRate.ratePercent % 1 === 0 ? 0 : 2)}%
      </div>

      {/* Inclusive/exclusive badge */}
      <div className="sm:w-24 sm:text-center">
        <Badge
          color={isExclusive ? "info" : "neutral"}
          variant="soft"
          className="text-[10px]"
        >
          {isExclusive ? "Exclusive" : "Inclusive"}
        </Badge>
      </div>

      {/* Active badge */}
      <div className="sm:w-20 sm:text-center">
        <Badge
          color={taxRate.isActive ? "success" : "neutral"}
          variant="soft"
          className="text-[10px]"
        >
          {taxRate.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-1.5 sm:w-24 sm:justify-end">
          {onEdit && (
            <Button
              color="neutral"
              variant="flat"
              isIcon
              aria-label={`Edit ${taxRate.name}`}
              onClick={() => onEdit(taxRate.id)}
              className="size-8 text-gray-500 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
            >
              <PencilIcon className="size-4 stroke-2" />
            </Button>
          )}
          {onDelete && (
            <Button
              color="neutral"
              variant="flat"
              isIcon
              aria-label={`Delete ${taxRate.name}`}
              onClick={() => onDelete(taxRate.id)}
              className="size-8 text-gray-500 hover:text-error-500 dark:text-dark-300 dark:hover:text-error-400"
            >
              <TrashIcon className="size-4 stroke-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default TaxRateRow;
