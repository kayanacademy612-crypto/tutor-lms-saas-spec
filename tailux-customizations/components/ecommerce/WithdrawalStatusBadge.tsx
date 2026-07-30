// Import Dependencies
import clsx from "clsx";

// Local Imports
import { Badge } from "@/components/ui";
import { ColorType } from "@/constants/app";
import type { WithdrawalStatus } from "@/types/lms";

// ----------------------------------------------------------------------

export interface WithdrawalStatusBadgeProps {
  /** Withdrawal status to render. */
  status: WithdrawalStatus;
  /** Visual size of the badge. */
  size?: "sm" | "md";
  /** Badge variant. Defaults to "soft". */
  variant?: "filled" | "outlined" | "soft";
  /** Extra classes on the badge. */
  className?: string;
}

interface StatusConfig {
  label: string;
  color: ColorType;
}

/**
 * Color map for withdrawal statuses:
 *  - pending  → warning (amber)   — awaiting admin review
 *  - approved → info    (blue)    — queued for payout
 *  - rejected → error   (red)     — declined by admin
 *  - paid     → success (green)   — funds transferred
 *  - failed   → neutral (gray)    — payout attempt failed
 */
const STATUS_CONFIG: Record<WithdrawalStatus, StatusConfig> = {
  pending: { label: "Pending", color: "warning" },
  approved: { label: "Approved", color: "info" },
  rejected: { label: "Rejected", color: "error" },
  paid: { label: "Paid", color: "success" },
  failed: { label: "Failed", color: "neutral" },
};

/**
 * Color-coded badge for a `WithdrawalStatus`.
 *
 * Used on instructor withdrawal history tables and on the admin
 * withdrawal-approval queue.
 */
export function WithdrawalStatusBadge({
  status,
  size = "md",
  variant = "soft",
  className,
}: WithdrawalStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <Badge
      color={cfg.color}
      variant={variant}
      className={clsx(
        "shrink-0 capitalize",
        size === "sm" && "text-[10px] px-1.5 py-0.5",
        size === "md" && "text-xs px-2 py-0.5",
        className,
      )}
    >
      {cfg.label}
    </Badge>
  );
}

export default WithdrawalStatusBadge;
