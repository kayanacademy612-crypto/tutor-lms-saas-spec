// ActivityFeed — recent activity list for the School Admin dashboard.
//
// Renders a vertical list of timestamped activity items. Each item carries a
// `type` discriminator that maps to an icon + tinted well colour so the same
// feed can mix enrollments, orders, reviews, and Q&A questions without the
// caller having to pre-format each row.

// Import Dependencies
import { ComponentType } from "react";
import clsx from "clsx";
import {
  AcademicCapIcon,
  ShoppingBagIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";

// ----------------------------------------------------------------------

export type ActivityType =
  | "enrollment"
  | "order"
  | "review"
  | "question"
  | "info";

export interface ActivityItem {
  /** Discriminator — drives the icon + tinted well colour. */
  type: ActivityType;
  /** Primary headline (e.g. "Jane Doe enrolled in 'Guitar Basics'"). */
  title: string;
  /** Optional supporting copy (e.g. "via Stripe · $49.00"). */
  subtitle?: string;
  /** ISO timestamp — rendered as a relative "2h ago" string. */
  timestamp?: string;
}

export interface ActivityFeedProps {
  /** Activity items, ideally pre-sorted newest-first by the caller. */
  items: ActivityItem[];
  /** Optional heading rendered above the list. */
  title?: string;
  /** Optional caption rendered beneath the heading. */
  description?: string;
  /** Extra classes on the root Card. */
  className?: string;
  /** Hide the surrounding Card — render the bare list (default false). */
  bare?: boolean;
}

const TYPE_ICON: Record<ActivityType, ComponentType<{ className?: string }>> = {
  enrollment: AcademicCapIcon,
  order: ShoppingBagIcon,
  review: StarIcon,
  question: ChatBubbleLeftRightIcon,
  info: BellIcon,
};

const TYPE_WELL: Record<ActivityType, string> = {
  enrollment:
    "bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400",
  order:
    "bg-success-500/10 text-success-500 dark:bg-success-500/15 dark:text-success-400",
  review:
    "bg-warning-500/10 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400",
  question:
    "bg-info-500/10 text-info-500 dark:bg-info-500/15 dark:text-info-400",
  info: "bg-gray-200/70 text-gray-600 dark:bg-dark-500/50 dark:text-dark-200",
};

const TYPE_LABEL: Record<ActivityType, string> = {
  enrollment: "Enrollment",
  order: "Order",
  review: "Review",
  question: "Question",
  info: "Activity",
};

/**
 * Formats an ISO timestamp as a compact relative string ("just now", "12m
 * ago", "3h ago", "4d ago") falling back to a localized date for anything
 * older than 30 days. Returns `"—"` for missing/invalid input.
 */
export function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
}

/**
 * Vertical activity feed. Each row shows a tinted icon well (coloured by
 * activity `type`), the title + subtitle, and a right-aligned relative
 * timestamp. Empty lists render a friendly placeholder line.
 */
export function ActivityFeed({
  items,
  title,
  description,
  className,
  bare = false,
}: ActivityFeedProps) {
  const body = (
    <>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {description}
            </p>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 dark:text-dark-300">
          No recent activity.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-dark-600">
          {items.map((item, idx) => {
            const Icon = TYPE_ICON[item.type] ?? TYPE_ICON.info;
            return (
              <li
                key={`${item.type}-${idx}`}
                className="flex items-start gap-3 py-3"
              >
                <span
                  className={clsx(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    TYPE_WELL[item.type] ?? TYPE_WELL.info,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-4 stroke-2" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                    {item.title}
                  </p>
                  {item.subtitle && (
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-300">
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400 dark:text-dark-400">
                    {relativeTime(item.timestamp)}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
                    {TYPE_LABEL[item.type] ?? TYPE_LABEL.info}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (bare) {
    return <div className={className}>{body}</div>;
  }

  return <Card className={clsx("p-5", className)}>{body}</Card>;
}

export default ActivityFeed;
