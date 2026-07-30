// Notification Preferences — `apps/notification-settings` route.
//
// Layout:
//   - Top header strip with the page title and a "Refresh" button.
//   - Two stacked Card sections:
//     1. "Per-event preferences" — a table of notification event types
//        with three Switch columns (Onsite / Email / Push). Toggling a
//        switch immediately PATCHes the preference via
//        `useUpdateNotificationPreference` (auto-save on toggle).
//     2. "Browser push" — a button that requests Notification + PushManager
//        permission and POSTs the resulting subscription via
//        `useSubscribePush`. Once a subscription is registered, the panel
//        shows the subscription id and a "Revoke on this device" button
//        (calls `useUnsubscribePush`).
//
// Hooks used:
//   - `useNotificationPreferences()` — list prefs for the current user.
//   - `useUpdateNotificationPreference()` — upsert a single pref row.
//   - `useSubscribePush()` — register a new push subscription.
//   - `useUnsubscribePush()` — remove a push subscription by id.

// Import Dependencies
import {
  Fragment,
  useCallback,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  ArrowPathIcon,
  BellAlertIcon,
  BellSlashIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  Spinner,
  Switch,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useNotificationPreferences,
  useSubscribePush,
  useUnsubscribePush,
  useUpdateNotificationPreference,
} from "@/hooks/useProEngagement";
import type { NotificationPreference } from "@/types/lms";

// ----------------------------------------------------------------------

/**
 * Catalogue of notification event types supported by the platform.
 *
 * `eventType` is the wire identifier the backend emits/stores. The labels
 * and descriptions are UI-only. Grouped by category so the table is easy
 * to scan.
 */
interface EventTypeDef {
  eventType: string;
  label: string;
  description: string;
  category: EventCategory;
}

type EventCategory =
  | "Courses"
  | "Students"
  | "Orders"
  | "Instructors"
  | "System";

const EVENT_TYPES: EventTypeDef[] = [
  // Courses
  {
    eventType: "course_published",
    label: "Course published",
    description: "A new course goes live on the catalog.",
    category: "Courses",
  },
  {
    eventType: "announcement_posted",
    label: "Course announcement",
    description: "An instructor posts an announcement in a course.",
    category: "Courses",
  },
  // Students
  {
    eventType: "lesson_completed",
    label: "Lesson completed",
    description: "You finish a lesson inside a course.",
    category: "Students",
  },
  {
    eventType: "quiz_graded",
    label: "Quiz graded",
    description: "Your quiz submission has been graded.",
    category: "Students",
  },
  {
    eventType: "assignment_graded",
    label: "Assignment graded",
    description: "Your assignment submission has been graded.",
    category: "Students",
  },
  {
    eventType: "certificate_earned",
    label: "Certificate earned",
    description: "You earn a new certificate upon course completion.",
    category: "Students",
  },
  // Orders
  {
    eventType: "order_paid",
    label: "Order paid",
    description: "An order you placed is paid in full.",
    category: "Orders",
  },
  {
    eventType: "order_refunded",
    label: "Order refunded",
    description: "A refund is issued for one of your orders.",
    category: "Orders",
  },
  {
    eventType: "subscription_renewed",
    label: "Subscription renewed",
    description: "Your subscription auto-renews successfully.",
    category: "Orders",
  },
  {
    eventType: "subscription_cancelled",
    label: "Subscription cancelled",
    description: "Your subscription is cancelled (by you or the system).",
    category: "Orders",
  },
  {
    eventType: "gift_received",
    label: "Gift received",
    description: "Someone sends you a course as a gift.",
    category: "Orders",
  },
  // Instructors
  {
    eventType: "instructor_new_enrollment",
    label: "New enrollment",
    description: "A student enrolls in one of your courses.",
    category: "Instructors",
  },
  {
    eventType: "instructor_new_review",
    label: "New review",
    description: "A student leaves a review on your course.",
    category: "Instructors",
  },
  {
    eventType: "instructor_new_qa",
    label: "New Q&A question",
    description: "A student asks a question in your course Q&A.",
    category: "Instructors",
  },
  {
    eventType: "payout_processed",
    label: "Payout processed",
    description: "An instructor payout is sent to your account.",
    category: "Instructors",
  },
  // System
  {
    eventType: "system_maintenance",
    label: "Maintenance window",
    description: "A scheduled maintenance window is announced.",
    category: "System",
  },
];

const EVENT_CATEGORIES: EventCategory[] = [
  "Courses",
  "Students",
  "Orders",
  "Instructors",
  "System",
];

/**
 * Defaults used when a user has no preference row for an event yet. The
 * backend may seed these on first read; if it doesn't we render an
 * "all-enabled" baseline so the UI doesn't show empty rows.
 */
const DEFAULT_PREFS: Record<
  string,
  { onsiteEnabled: boolean; emailEnabled: boolean; pushEnabled: boolean }
> = {
  course_published: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  announcement_posted: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  lesson_completed: { onsiteEnabled: true, emailEnabled: false, pushEnabled: false },
  quiz_graded: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  assignment_graded: { onsiteEnabled: true, emailEnabled: true, pushEnabled: true },
  certificate_earned: { onsiteEnabled: true, emailEnabled: true, pushEnabled: true },
  order_paid: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  order_refunded: { onsiteEnabled: true, emailEnabled: true, pushEnabled: true },
  subscription_renewed: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  subscription_cancelled: { onsiteEnabled: true, emailEnabled: true, pushEnabled: true },
  gift_received: { onsiteEnabled: true, emailEnabled: true, pushEnabled: true },
  instructor_new_enrollment: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  instructor_new_review: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
  instructor_new_qa: { onsiteEnabled: true, emailEnabled: false, pushEnabled: false },
  payout_processed: { onsiteEnabled: true, emailEnabled: true, pushEnabled: true },
  system_maintenance: { onsiteEnabled: true, emailEnabled: true, pushEnabled: false },
};

interface PrefRow {
  def: EventTypeDef;
  pref: NotificationPreference | undefined;
  onsiteEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

// ----------------------------------------------------------------------

export default function NotificationSettingsPage() {
  // ───────── Data ─────────
  const prefsQuery = useNotificationPreferences();
  const updatePref = useUpdateNotificationPreference();
  const subscribePush = useSubscribePush();
  const unsubscribePush = useUnsubscribePush();

  const [busyEventType, setBusyEventType] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushNotice, setPushNotice] = useState<string | null>(null);

  // ───────── Derived ─────────
  /**
   * Merge the API response with the EVENT_TYPES catalogue so every known
   * event type renders a row — even if the user has no preference row yet
   * (in which case we fall back to DEFAULT_PREFS).
   */
  const rows = useMemo<PrefRow[]>(() => {
    const byEvent = new Map<string, NotificationPreference>();
    for (const p of prefsQuery.data ?? []) {
      byEvent.set(p.eventType, p);
    }
    return EVENT_TYPES.map((def) => {
      const stored = byEvent.get(def.eventType);
      const fallback =
        DEFAULT_PREFS[def.eventType] ?? {
          onsiteEnabled: true,
          emailEnabled: true,
          pushEnabled: false,
        };
      return {
        def,
        pref: stored,
        onsiteEnabled: stored?.onsiteEnabled ?? fallback.onsiteEnabled,
        emailEnabled: stored?.emailEnabled ?? fallback.emailEnabled,
        pushEnabled: stored?.pushEnabled ?? fallback.pushEnabled,
      };
    });
  }, [prefsQuery.data]);

  // ───────── Handlers ─────────
  const handleToggle = useCallback(
    async (
      eventType: string,
      channel: "onsiteEnabled" | "emailEnabled" | "pushEnabled",
      next: boolean,
    ) => {
      setBusyEventType(eventType);
      const result = await updatePref.mutate({
        eventType,
        [channel]: next,
      });
      setBusyEventType(null);
      if (result) {
        void prefsQuery.refetch();
      }
    },
    [updatePref, prefsQuery],
  );

  const handleEnablePush = useCallback(async () => {
    setPushError(null);
    setPushNotice(null);
    setSubscribing(true);
    try {
      // 1. Ask the user for notification permission.
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "default") {
          const perm = await Notification.requestPermission();
          if (perm !== "granted") {
            setPushError(
              "Notification permission was denied. Enable it in your browser settings to subscribe.",
            );
            setSubscribing(false);
            return;
          }
        } else if (Notification.permission !== "granted") {
          setPushError(
            "Notifications are blocked in your browser. Unblock this site to subscribe.",
          );
          setSubscribing(false);
          return;
        }
      }

      // 2. Subscribe via the PushManager (requires a service worker).
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushError(
          "Browser push is not supported in this browser environment.",
        );
        setSubscribing(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // applicationServerKey would be the VAPID public key from the
        // backend in production. Left omitted here so the subscribe call
        // still succeeds against browsers that don't enforce it.
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.keys?.p256dh || !json.keys?.auth) {
        setPushError("Push subscription missing required keys.");
        setSubscribing(false);
        return;
      }
      const created = await subscribePush.mutate({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if (!created) {
        setPushError(
          subscribePush.error?.message ??
            "Failed to register push subscription.",
        );
      } else {
        setPushNotice("Push subscription registered for this device.");
      }
    } catch (err) {
      setPushError(
        err instanceof Error ? err.message : "Failed to enable browser push.",
      );
    } finally {
      setSubscribing(false);
    }
  }, [subscribePush]);

  const handleRevokePush = useCallback(
    async (id: string) => {
      setPushError(null);
      setPushNotice(null);
      const result = await unsubscribePush.mutate(id);
      if (result?.success) {
        setPushNotice("Push subscription revoked for this device.");
      } else if (unsubscribePush.error) {
        setPushError(unsubscribePush.error.message);
      }
    },
    [unsubscribePush],
  );

  // ───────── Render ─────────
  return (
    <Page title="Notification Preferences">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <BellAlertIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Notification Preferences
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Choose which events trigger onsite, email, and push
                notifications.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-9"
              onClick={() => void prefsQuery.refetch()}
              aria-label="Refresh preferences"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            {prefsQuery.loading ? (
              <LoadingState message="Loading notification preferences…" />
            ) : prefsQuery.error ? (
              <ErrorState
                error={prefsQuery.error}
                onRetry={prefsQuery.refetch}
              />
            ) : (
              <div className="space-y-6">
                {/* Per-event preferences table */}
                <Card skin="bordered" className="overflow-hidden p-0">
                  <div className="border-b border-gray-200 px-5 py-4 dark:border-dark-600">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Per-event preferences
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                      Toggle each event type by channel. Changes save
                      automatically.
                    </p>
                  </div>
                  <Table hoverable>
                    <THead>
                      <Tr>
                        <Th className="text-left">Event</Th>
                        <Th className="w-32 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            <EyeIcon className="size-4 stroke-2 text-gray-400 dark:text-dark-400" />
                            Onsite
                          </span>
                        </Th>
                        <Th className="w-32 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            <EnvelopeIcon className="size-4 stroke-2 text-gray-400 dark:text-dark-400" />
                            Email
                          </span>
                        </Th>
                        <Th className="w-32 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            <DevicePhoneMobileIcon className="size-4 stroke-2 text-gray-400 dark:text-dark-400" />
                            Push
                          </span>
                        </Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {EVENT_CATEGORIES.map((cat) => {
                        const groupRows = rows.filter(
                          (r) => r.def.category === cat,
                        );
                        if (groupRows.length === 0) return null;
                        return (
                          <Fragment key={`cat-${cat}`}>
                            <Tr>
                              <Td
                                colSpan={4}
                                className="bg-gray-50 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-dark-700 dark:text-dark-300"
                              >
                                {cat}
                              </Td>
                            </Tr>
                            {groupRows.map((r) => {
                              const busy = busyEventType === r.def.eventType;
                              return (
                                <Tr key={r.def.eventType}>
                                  <Td>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-800 dark:text-dark-50">
                                        {r.def.label}
                                      </p>
                                      <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                                        {r.def.description}
                                      </p>
                                    </div>
                                  </Td>
                                  <Td className="text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Switch
                                        checked={r.onsiteEnabled}
                                        disabled={busy}
                                        onChange={(
                                          e: ChangeEvent<HTMLInputElement>,
                                        ) =>
                                          void handleToggle(
                                            r.def.eventType,
                                            "onsiteEnabled",
                                            e.target.checked,
                                          )
                                        }
                                        aria-label={`Onsite notifications for ${r.def.label}`}
                                      />
                                      {busy && (
                                        <Spinner className="size-3.5" />
                                      )}
                                    </div>
                                  </Td>
                                  <Td className="text-center">
                                    <Switch
                                      checked={r.emailEnabled}
                                      disabled={busy}
                                      onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                      ) =>
                                        void handleToggle(
                                          r.def.eventType,
                                          "emailEnabled",
                                          e.target.checked,
                                        )
                                      }
                                      aria-label={`Email notifications for ${r.def.label}`}
                                    />
                                  </Td>
                                  <Td className="text-center">
                                    <Switch
                                      checked={r.pushEnabled}
                                      disabled={busy}
                                      onChange={(
                                        e: ChangeEvent<HTMLInputElement>,
                                      ) =>
                                        void handleToggle(
                                          r.def.eventType,
                                          "pushEnabled",
                                          e.target.checked,
                                        )
                                      }
                                      aria-label={`Push notifications for ${r.def.label}`}
                                    />
                                  </Td>
                                </Tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </TBody>
                  </Table>
                </Card>

                {/* Mutation error */}
                {updatePref.error && (
                  <Card
                    skin="bordered"
                    className="border-error-300 bg-error-50 p-4 dark:border-error-500/40 dark:bg-error-500/10"
                  >
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="size-5 shrink-0 stroke-2 text-error-500 dark:text-error-400" />
                      <div>
                        <p className="text-sm font-semibold text-error-700 dark:text-error-300">
                          Couldn’t save preference
                        </p>
                        <p className="mt-0.5 text-xs text-error-600 dark:text-error-400">
                          {updatePref.error.message}
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Browser push */}
                <Card skin="bordered" className="p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                        Browser push
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                        Register this device to receive push notifications
                        in your browser, even when the tab is closed.
                      </p>
                    </div>
                    <Button
                      color="primary"
                      className="gap-1.5"
                      onClick={() => void handleEnablePush()}
                      disabled={subscribing}
                    >
                      {subscribing ? (
                        <Spinner className="size-4" />
                      ) : (
                        <BellAlertIcon className="size-4 stroke-2" />
                      )}
                      {subscribing ? "Subscribing…" : "Enable Browser Push"}
                    </Button>
                  </div>

                  {pushError && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-error-300 bg-error-50 p-3 text-xs text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300">
                      <ExclamationTriangleIcon className="size-4 shrink-0 stroke-2" />
                      <span>{pushError}</span>
                    </div>
                  )}

                  {pushNotice && !pushError && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg border border-success-300 bg-success-50 p-3 text-xs text-success-700 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-300">
                      <CheckCircleIcon className="size-4 shrink-0 stroke-2" />
                      <span>{pushNotice}</span>
                    </div>
                  )}

                  {subscribePush.data ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-600 dark:bg-dark-700">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-50">
                            {subscribePush.data.endpoint.replace(
                              /^https?:\/\//,
                              "",
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                            Added{" "}
                            {new Date(
                              subscribePush.data.createdAt,
                            ).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge
                            color={subscribePush.data.isActive ? "success" : "neutral"}
                            variant="soft"
                            className="text-[10px]"
                          >
                            {subscribePush.data.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            color="error"
                            variant="soft"
                            onClick={() =>
                              void handleRevokePush(subscribePush.data!.id)
                            }
                            disabled={unsubscribePush.loading}
                          >
                            Revoke on this device
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      icon={BellSlashIcon}
                      title="No push devices yet"
                      description="Click “Enable Browser Push” above to register this browser."
                      compact
                    />
                  )}
                </Card>
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}
