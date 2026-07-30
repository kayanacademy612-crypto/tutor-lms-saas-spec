// DripStatusBadge — small pill that summarises a lesson's drip rule.
//
// Renders the drip rule type (schedule / prerequisite / enrollment_days /
// sequence) with the matching heroicon and a short human label, or "No
// drip" in neutral gray when the lesson has no rule attached.

// Import Dependencies
import clsx from "clsx";
import {
  CalendarIcon,
  ClockIcon,
  ListBulletIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Badge } from "@/components/ui";
import type { DripRule, DripRuleType } from "@/types/lms";

// ----------------------------------------------------------------------

export interface DripStatusBadgeProps {
  /** The drip rule attached to the lesson, or `undefined`/`null` for none. */
  rule?: DripRule | null;
  /** Compact variant — drops the icon for tighter rows. */
  compact?: boolean;
  className?: string;
}

interface BadgeDescriptor {
  label: string;
  icon: typeof CalendarIcon;
  color: "primary" | "info" | "success" | "warning";
}

/** Look up the visual treatment for a drip rule type. */
function describeRuleType(
  type: DripRuleType,
  rule?: DripRule | null,
): BadgeDescriptor {
  switch (type) {
    case "schedule":
      return {
        label: rule?.unlockAt
          ? `Scheduled · ${formatDateTime(rule.unlockAt)}`
          : "Scheduled",
        icon: CalendarIcon,
        color: "info",
      };
    case "prerequisite":
      return {
        label: "Prerequisite",
        icon: ListBulletIcon,
        color: "warning",
      };
    case "enrollment_days":
      return {
        label: rule?.daysAfterEnrollment
          ? `After ${rule.daysAfterEnrollment} day${rule.daysAfterEnrollment === 1 ? "" : "s"}`
          : "After enrollment",
        icon: ClockIcon,
        color: "success",
      };
    case "sequence":
      return {
        label: "Sequential",
        icon: ArrowRightIcon,
        color: "primary",
      };
    default:
      return {
        label: "No drip",
        icon: CalendarIcon,
        color: "primary",
      };
  }
}

/** Format an ISO datetime as a short, locale-aware date+time string. */
function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ----------------------------------------------------------------------

export function DripStatusBadge({
  rule,
  compact = false,
  className,
}: DripStatusBadgeProps) {
  if (!rule) {
    return (
      <Badge
        color="neutral"
        variant="soft"
        className={clsx("gap-1 text-xs", className)}
      >
        {!compact && <span className="size-1.5 rounded-full bg-gray-400" />}
        No drip
      </Badge>
    );
  }

  const desc = describeRuleType(rule.ruleType, rule);
  const Icon = desc.icon;

  return (
    <Badge
      color={desc.color}
      variant="soft"
      className={clsx("gap-1 text-xs", className)}
    >
      <Icon className={clsx(compact ? "size-3" : "size-3.5", "stroke-2")} />
      {desc.label}
      {!rule.isActive && (
        <span className="ml-1 rounded bg-gray-300/40 px-1 text-[10px] uppercase tracking-wide text-gray-700 dark:bg-dark-500/40 dark:text-dark-200">
          off
        </span>
      )}
    </Badge>
  );
}

export default DripStatusBadge;
