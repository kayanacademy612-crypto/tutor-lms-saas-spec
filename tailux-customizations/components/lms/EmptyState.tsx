// Import Dependencies
import clsx from "clsx";
import { ComponentType, ReactNode } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface EmptyStateProps {
  /** Heroicon component rendered in a circular tinted well. */
  icon: ComponentType<{ className?: string }>;
  /** Headline message. */
  title: string;
  /** Supporting copy shown beneath the title. */
  description?: ReactNode;
  /** CTA button label. When omitted, no button is rendered. */
  actionLabel?: string;
  /** CTA button click handler. */
  onAction?: () => void;
  /** Compact layout (smaller padding, smaller icon). */
  compact?: boolean;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Placeholder rendered when a list/grid has no data.
 *
 * Centered, friendly, and (optionally) actionable — designed to sit inside
 * a `Card` body or take over a full page region.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "py-16",
        className,
      )}
    >
      <div
        className={clsx(
          "flex items-center justify-center rounded-full bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400",
          compact ? "size-12" : "size-16",
        )}
      >
        <Icon className={compact ? "size-6 stroke-2" : "size-8 stroke-2"} />
      </div>
      <h3
        className={clsx(
          "mt-4 font-semibold text-gray-800 dark:text-dark-100",
          compact ? "text-sm" : "text-base",
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={clsx(
            "mt-1.5 max-w-sm text-gray-500 dark:text-dark-300",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {description}
        </p>
      )}
      {actionLabel && (
        <Button
          color="primary"
          variant="soft"
          onClick={onAction}
          className={clsx("mt-5", compact ? "text-xs" : "text-sm")}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/** Convenience empty-state preset for "no data yet" scenarios. */
export function NoDataEmptyState(
  props: Omit<EmptyStateProps, "icon" | "title"> & { title?: string },
) {
  return (
    <EmptyState
      icon={ExclamationTriangleIcon}
      title={props.title ?? "Nothing here yet"}
      {...props}
    />
  );
}

export default EmptyState;
