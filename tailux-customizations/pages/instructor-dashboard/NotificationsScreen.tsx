// NotificationsScreen — list of notifications with read/unread state.
//
// Shows every notification for the instructor with type icon, title, body,
// and timestamp. A "Mark all as read" button flips the entire list; clicking
// a row marks just that one as read. A type filter narrows the list.
// Loads from `lmsApi.notification.list()` and falls back to mock data.

// Import Dependencies
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  BellIcon,
  CheckIcon,
  AcademicCapIcon,
  ShoppingCartIcon,
  StarIcon,
  ChatBubbleLeftIcon,
  CheckBadgeIcon,
  MegaphoneIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { lmsApi } from "@/services/lms-api";
import type { Notification, NotificationType } from "@/types/lms";
import { EmptyState, LoadingState } from "@/components/lms";
import { Button, Card, Badge } from "@/components/ui";

// ----------------------------------------------------------------------

const now = new Date();
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "ntf-1",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "enrollment",
    title: "New enrollment",
    body: "Marcus Lee enrolled in Full-Stack React & TypeScript.",
    isRead: false,
    createdAt: hoursAgo(1),
    updatedAt: hoursAgo(1),
  },
  {
    id: "ntf-2",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "review",
    title: "New 5★ review",
    body: "Priya Patel rated Advanced React Performance 5 stars.",
    isRead: false,
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(4),
  },
  {
    id: "ntf-3",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "order",
    title: "New sale",
    body: "You earned $80.10 from a sale of Full-Stack React & TypeScript.",
    isRead: false,
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
  },
  {
    id: "ntf-4",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "qa",
    title: "New question",
    body: "Diego Rivera asked a question in Advanced React Performance.",
    isRead: false,
    createdAt: hoursAgo(10),
    updatedAt: hoursAgo(10),
  },
  {
    id: "ntf-5",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "certificate",
    title: "Certificate issued",
    body: "Sara Kim earned a certificate for Full-Stack React & TypeScript.",
    isRead: true,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "ntf-6",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "announcement",
    title: "Announcement published",
    body: 'Your announcement "Live class moved to Friday 4pm" was sent to 1,240 students.',
    isRead: true,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "ntf-7",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "system",
    title: "Payout approved",
    body: "Your June payout of $1,284.50 was approved and will be sent on the 1st.",
    isRead: true,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "ntf-8",
    tenantId: "tenant-1",
    userId: "instr-1",
    type: "assignment",
    title: "Submission received",
    body: 'Jamie Chen submitted the assignment "Design a token system".',
    isRead: true,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(4),
  },
];

// ----------------------------------------------------------------------

const typeIcon: Record<
  NotificationType,
  { icon: typeof AcademicCapIcon; color: "primary" | "success" | "warning" | "info" | "error" | "neutral" }
> = {
  course: { icon: AcademicCapIcon, color: "primary" },
  enrollment: { icon: ShoppingCartIcon, color: "primary" },
  lesson: { icon: AcademicCapIcon, color: "info" },
  quiz: { icon: CheckBadgeIcon, color: "info" },
  assignment: { icon: CheckBadgeIcon, color: "warning" },
  qa: { icon: ChatBubbleLeftIcon, color: "info" },
  review: { icon: StarIcon, color: "warning" },
  certificate: { icon: CheckBadgeIcon, color: "success" },
  order: { icon: CurrencyDollarIcon, color: "success" },
  system: { icon: BellIcon, color: "neutral" },
  announcement: { icon: MegaphoneIcon, color: "neutral" },
};

const TYPE_FILTERS: { id: "all" | "unread" | NotificationType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "enrollment", label: "Enrollments" },
  { id: "review", label: "Reviews" },
  { id: "order", label: "Sales" },
  { id: "qa", label: "Q&A" },
  { id: "announcement", label: "Announcements" },
  { id: "system", label: "System" },
];

function timeAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diff = now.getTime() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

// ----------------------------------------------------------------------

export function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<"all" | "unread" | NotificationType>("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    lmsApi.notification
      .list()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setNotifications(list.length > 0 ? list : MOCK_NOTIFICATIONS);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setNotifications(MOCK_NOTIFICATIONS);
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    return notifications
      .filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.isRead;
        return n.type === filter;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)),
    );
  }

  function markAllAsRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You're all caught up."}
          </p>
        </div>
        <Button
          variant="outlined"
          color="primary"
          className="gap-1.5"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <CheckIcon className="size-4 stroke-2" />
          Mark all as read
        </Button>
      </header>

      {/* Type filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "soft" : "flat"}
            color={filter === f.id ? "primary" : "neutral"}
            onClick={() => setFilter(f.id)}
            className="text-xs"
          >
            {f.label}
            {f.id === "unread" && unreadCount > 0 && (
              <Badge
                color={filter === "unread" ? "primary" : "neutral"}
                variant="filled"
                className="ml-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <LoadingState message="Loading notifications…" />
      ) : error ? (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Live notification data is unavailable — showing sample notifications.
          </p>
        </Card>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BellIcon}
          title={filter === "unread" ? "No unread notifications" : "No notifications"}
          description={
            filter === "unread"
              ? "You've read everything. New activity will appear here."
              : "Notifications about enrollments, reviews, and payouts will show up here."
          }
          actionLabel={filter !== "all" ? "Show all" : undefined}
          onAction={filter !== "all" ? () => setFilter("all") : undefined}
        />
      ) : (
        <Card className="divide-y divide-gray-100 p-0 dark:divide-dark-600">
          {visible.map((n) => (
            <NotificationRow key={n.id} notification={n} onMarkAsRead={() => markAsRead(n.id)} />
          ))}
        </Card>
      )}

      {/* Footer hint */}
      {!loading && visible.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-400">
          <EnvelopeIcon className="size-3.5" />
          Showing {visible.length} of {notifications.length} notifications
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function NotificationRow({
  notification: n,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: () => void;
}) {
  const tone = typeIcon[n.type] ?? typeIcon.system;
  const Icon = tone.icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-3 p-4 transition-colors",
        !n.isRead && "bg-primary-500/[0.03] dark:bg-primary-500/[0.05]",
      )}
    >
      {/* Type icon */}
      <div
        className={clsx(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
          tone.color === "primary" && "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
          tone.color === "success" && "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
          tone.color === "warning" && "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
          tone.color === "info" && "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
          tone.color === "error" && "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400",
          tone.color === "neutral" && "bg-gray-200/70 text-gray-600 dark:bg-dark-500/50 dark:text-dark-200",
        )}
      >
        <Icon className="size-5 stroke-2" />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={clsx(
              "text-sm",
              n.isRead
                ? "font-medium text-gray-700 dark:text-dark-200"
                : "font-semibold text-gray-900 dark:text-dark-50",
            )}
          >
            {n.title}
          </p>
          {!n.isRead && (
            <span className="size-2 shrink-0 rounded-full bg-primary-500" aria-label="Unread" />
          )}
        </div>
        {n.body && (
          <p className="mt-0.5 text-xs text-gray-600 dark:text-dark-200">{n.body}</p>
        )}
        <p className="mt-1 text-[11px] text-gray-400 dark:text-dark-400">
          {timeAgo(n.createdAt)} · <span className="capitalize">{n.type}</span>
        </p>
      </div>

      {/* Action */}
      {!n.isRead && (
        <Button
          variant="flat"
          color="primary"
          className="shrink-0 gap-1 text-xs"
          onClick={onMarkAsRead}
        >
          <CheckIcon className="size-3.5 stroke-2" />
          <span className="hidden sm:inline">Mark as read</span>
        </Button>
      )}
    </div>
  );
}

export default NotificationsScreen;
