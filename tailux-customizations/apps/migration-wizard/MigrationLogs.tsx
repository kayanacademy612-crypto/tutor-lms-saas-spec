// MigrationLogs — log viewer modal for a single migration job.
//
// Renders a scrollable list of `MigrationLog` entries colour-coded by level
// (info → gray, warning → warning, error → error). Includes a level filter
// and auto-scrolls to the latest entry on mount + whenever new logs arrive.
//
// Backed by `useMigrationLogs(id)` from `@/hooks/useReportsAI`.

// Import Dependencies
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import clsx from "clsx";
import {
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import { useMigrationLogs } from "@/hooks/useReportsAI";
import type { MigrationLog } from "@/types/lms";

// ----------------------------------------------------------------------

type Level = MigrationLog["level"] | "all";

const LEVELS: { id: Level; label: string; Icon: typeof InformationCircleIcon }[] = [
  { id: "all", label: "All", Icon: FunnelIcon },
  { id: "info", label: "Info", Icon: InformationCircleIcon },
  { id: "warning", label: "Warning", Icon: ExclamationTriangleIcon },
  { id: "error", label: "Error", Icon: ExclamationCircleIcon },
];

const LEVEL_STYLES: Record<MigrationLog["level"], string> = {
  info: "text-gray-600 dark:text-dark-200",
  warning: "text-warning-600 dark:text-warning-400",
  error: "text-error-600 dark:text-error-400",
};

// ----------------------------------------------------------------------

export interface MigrationLogsProps {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
}

export function MigrationLogs({ open, jobId, onClose }: MigrationLogsProps) {
  const [level, setLevel] = useState<Level>("all");
  const logsQuery = useMigrationLogs(open && jobId ? jobId : undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  const logs = logsQuery.data ?? [];

  const filtered = useMemo(
    () => (level === "all" ? logs : logs.filter((l) => l.level === level)),
    [logs, level],
  );

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, filtered.length]);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={DialogPanel}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-700">
              <div className="flex items-center gap-2">
                <DocumentLogsIcon />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                    Migration logs
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                    {jobId ? `Job #${jobId.slice(-8)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  isIcon
                  variant="flat"
                  color="neutral"
                  className="size-8"
                  onClick={() => logsQuery.refetch()}
                  aria-label="Refresh logs"
                >
                  <ArrowPathIcon
                    className={clsx("size-4", logsQuery.loading && "animate-spin")}
                  />
                </Button>
                <Button
                  isIcon
                  variant="flat"
                  color="neutral"
                  className="size-8"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <XMarkIcon className="size-4" />
                </Button>
              </div>
            </header>

            {/* Filter chips */}
            <div className="flex shrink-0 items-center gap-1.5 border-b border-gray-200 px-4 py-2 dark:border-dark-600">
              {LEVELS.map(({ id, label, Icon }) => {
                const active = level === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLevel(id)}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary-500 text-white dark:bg-primary-600"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200 dark:hover:bg-dark-500",
                    )}
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Body */}
            <ScrollShadow className="hide-scrollbar min-h-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-800">
              {logsQuery.loading && filtered.length === 0 ? (
                <LoadingState message="Loading logs…" />
              ) : logsQuery.error ? (
                <ErrorState error={logsQuery.error} onRetry={logsQuery.refetch} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={InformationCircleIcon}
                  title="No log entries"
                  description={
                    level === "all"
                      ? "Logs will appear here once the migration starts processing."
                      : `No ${level} entries in this run.`
                  }
                  compact
                />
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-dark-600">
                  {filtered.map((log) => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </ul>
              )}
              <div ref={bottomRef} />
            </ScrollShadow>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ----------------------------------------------------------------------

function LogRow({ log }: { log: MigrationLog }) {
  const Icon =
    log.level === "error"
      ? ExclamationCircleIcon
      : log.level === "warning"
        ? ExclamationTriangleIcon
        : InformationCircleIcon;

  return (
    <li className="flex gap-2.5 px-4 py-2.5">
      <Icon
        className={clsx(
          "mt-0.5 size-4 shrink-0",
          LEVEL_STYLES[log.level],
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            "break-words text-sm",
            LEVEL_STYLES[log.level],
          )}
        >
          {log.message}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400 dark:text-dark-400">
          <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
          {log.entity && <span>· {log.entity}</span>}
          {log.sourceId && <span>· src: {log.sourceId}</span>}
          {log.targetId && <span>· tgt: {log.targetId}</span>}
        </div>
      </div>
    </li>
  );
}

function DocumentLogsIcon() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
      <InformationCircleIcon className="size-5" />
    </span>
  );
}

export default MigrationLogs;
