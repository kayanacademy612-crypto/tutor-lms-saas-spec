// Migration Wizard — `apps/migration-wizard` route.
//
// Two-panel layout:
//   - Left: sidebar with "New Migration" + "Migration History" tabs.
//   - Right: active panel.
//
// New Migration is a 3-step wizard:
//   1. Platform selection (PlatformSelector).
//   2. Source configuration (SourceConfigForm, dynamic on platform kind).
//   3. Review & Start — summary card with a "Start Migration" button that
//      calls `useCreateMigration().mutate(...)` then `useStartMigration().mutate(id)`.
//
// Migration History shows the list of `MigrationJob`s from `useMigrations()`
// as a grid of `MigrationJobCard`s with View Logs / Cancel / Retry actions.

// Import Dependencies
import { useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
  PlusCircleIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useCancelMigration,
  useCreateMigration,
  useMigrations,
  useStartMigration,
} from "@/hooks/useReportsAI";
import type {
  CreateMigrationInput,
  MigrationJob,
  MigrationPlatform,
} from "@/types/lms";

import { MigrationJobCard } from "./MigrationJobCard";
import { MigrationLogs } from "./MigrationLogs";
import { PlatformSelector, getPlatformLabel } from "./PlatformSelector";
import {
  SourceConfigForm,
  type SourceConfig,
  toCreateSourceConfig,
  validateSourceConfig,
} from "./SourceConfigForm";

// ----------------------------------------------------------------------

type Tab = "new" | "history";
type Step = 1 | 2 | 3;

const STEP_LABELS = ["Select platform", "Source configuration", "Review & start"];

// ----------------------------------------------------------------------

export default function MigrationWizardPage() {
  const [tab, setTab] = useState<Tab>("new");
  const [step, setStep] = useState<Step>(1);
  const [platform, setPlatform] = useState<MigrationPlatform | null>(null);
  const [config, setConfig] = useState<SourceConfig>({});
  const [showFormErrors, setShowFormErrors] = useState(false);

  const [logsJobId, setLogsJobId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const migrationsQuery = useMigrations();
  const createMigration = useCreateMigration();
  const startMigration = useStartMigration();
  const cancelMigration = useCancelMigration();

  const jobs = migrationsQuery.data ?? [];

  // --------------------------------------------------------------
  // Wizard handlers
  // --------------------------------------------------------------

  const handleSelectPlatform = (p: MigrationPlatform) => {
    setPlatform(p);
    setConfig({});
    setShowFormErrors(false);
  };

  const handleNextFromStep1 = () => {
    if (!platform) return;
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!platform) return;
    const err = validateSourceConfig(platform, config);
    if (err) {
      setShowFormErrors(true);
      return;
    }
    setShowFormErrors(false);
    setStep(3);
  };

  const handleStart = async () => {
    if (!platform) return;
    const input: CreateMigrationInput = {
      platform,
      sourceConfig: toCreateSourceConfig(config),
    };
    const created = await createMigration.mutate(input);
    if (!created) return;
    const started = await startMigration.mutate(created.id);
    if (!started) return;
    // Reset + jump to history so the user can watch it run.
    setStep(1);
    setPlatform(null);
    setConfig({});
    setShowFormErrors(false);
    setTab("history");
    void migrationsQuery.refetch();
  };

  const handleResetWizard = () => {
    setStep(1);
    setPlatform(null);
    setConfig({});
    setShowFormErrors(false);
  };

  // --------------------------------------------------------------
  // History handlers
  // --------------------------------------------------------------

  const handleCancel = async (job: MigrationJob) => {
    if (!window.confirm("Cancel this migration? In-flight items will be stopped.")) {
      return;
    }
    setCancellingId(job.id);
    try {
      await cancelMigration.mutate(job.id);
      void migrationsQuery.refetch();
    } finally {
      setCancellingId(null);
    }
  };

  const handleRetry = async (job: MigrationJob) => {
    // Retry = create a fresh job with the same platform + source config.
    const input: CreateMigrationInput = {
      platform: job.platform,
      sourceConfig: (job.sourceConfig ?? {}) as CreateMigrationInput["sourceConfig"],
    };
    const created = await createMigration.mutate(input);
    if (!created) return;
    await startMigration.mutate(created.id);
    void migrationsQuery.refetch();
  };

  // --------------------------------------------------------------

  return (
    <Page title="Migration Wizard">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <RocketLaunchIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Migration Wizard
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Import courses, lessons, and students from other LMS platforms.
              </p>
            </div>
          </div>
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-9"
            onClick={() => migrationsQuery.refetch()}
            aria-label="Refresh"
          >
            <ArrowPathIcon
              className={`size-5 stroke-2 ${migrationsQuery.loading ? "animate-spin" : ""}`}
            />
          </Button>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 sm:flex">
            <nav className="space-y-1 p-3">
              <SidebarButton
                active={tab === "new"}
                onClick={() => setTab("new")}
                Icon={PlusCircleIcon}
                label="New Migration"
              />
              <SidebarButton
                active={tab === "history"}
                onClick={() => setTab("history")}
                Icon={ClipboardDocumentListIcon}
                label="Migration History"
                badge={jobs.length || undefined}
              />
            </nav>
          </aside>

          {/* Content */}
          <main className="flex min-w-0 flex-1 flex-col">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-5xl px-6 py-6">
                {tab === "new" ? (
                  <NewMigrationFlow
                    step={step}
                    platform={platform}
                    config={config}
                    showFormErrors={showFormErrors}
                    onSelectPlatform={handleSelectPlatform}
                    onConfigChange={setConfig}
                    onPrev={(s) => setStep(s as Step)}
                    onNextStep1={handleNextFromStep1}
                    onNextStep2={handleNextFromStep2}
                    onStart={handleStart}
                    onReset={handleResetWizard}
                    starting={createMigration.loading || startMigration.loading}
                    createError={createMigration.error}
                    startError={startMigration.error}
                  />
                ) : (
                  <MigrationHistory
                    jobs={jobs}
                    loading={migrationsQuery.loading}
                    error={migrationsQuery.error}
                    onRefresh={migrationsQuery.refetch}
                    onViewLogs={(job) => setLogsJobId(job.id)}
                    onCancel={handleCancel}
                    onRetry={handleRetry}
                    cancellingId={cancellingId}
                  />
                )}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>

      <MigrationLogs
        open={logsJobId !== null}
        jobId={logsJobId}
        onClose={() => setLogsJobId(null)}
      />
    </Page>
  );
}

// ----------------------------------------------------------------------

function SidebarButton({
  active,
  onClick,
  Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof PlusCircleIcon;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50"
      }`}
    >
      <Icon className="size-5 shrink-0 stroke-2" />
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
            active
              ? "bg-primary-500 text-white"
              : "bg-gray-200 text-gray-700 dark:bg-dark-500 dark:text-dark-100"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ----------------------------------------------------------------------

interface NewMigrationFlowProps {
  step: Step;
  platform: MigrationPlatform | null;
  config: SourceConfig;
  showFormErrors: boolean;
  onSelectPlatform: (p: MigrationPlatform) => void;
  onConfigChange: (c: SourceConfig) => void;
  onPrev: (step: number) => void;
  onNextStep1: () => void;
  onNextStep2: () => void;
  onStart: () => void;
  onReset: () => void;
  starting: boolean;
  createError: unknown;
  startError: unknown;
}

function NewMigrationFlow(props: NewMigrationFlowProps) {
  const {
    step,
    platform,
    config,
    showFormErrors,
    onSelectPlatform,
    onConfigChange,
    onPrev,
    onNextStep1,
    onNextStep2,
    onStart,
    onReset,
    starting,
    createError,
    startError,
  } = props;

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 1 && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Select a source platform
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Choose the LMS or data source you want to import from.
          </p>
          <div className="mt-4">
            <PlatformSelector selected={platform} onSelect={onSelectPlatform} />
          </div>
          <div className="mt-5 flex justify-end">
            <Button
              color="primary"
              disabled={!platform}
              onClick={onNextStep1}
              className="gap-1.5"
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && platform && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Configure the {getPlatformLabel(platform)} source
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Enter the connection details for the source platform. Credentials
            are encrypted in transit and never stored in plaintext.
          </p>
          <div className="mt-4">
            <SourceConfigForm
              platform={platform}
              config={config}
              onConfigChange={onConfigChange}
              showErrors={showFormErrors}
            />
          </div>
          <div className="mt-5 flex justify-between">
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => onPrev(1)}
              className="gap-1.5"
            >
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
            <Button
              color="primary"
              onClick={onNextStep2}
              className="gap-1.5"
            >
              Continue
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {step === 3 && platform && (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Review and start
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Confirm the details below, then start the migration. You can track
            progress from the Migration History tab.
          </p>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <ReviewRow label="Platform" value={getPlatformLabel(platform)} />
            <ReviewRow
              label="Database host"
              value={config.dbHost ?? config.apiUrl ?? "—"}
            />
            <ReviewRow
              label="Database / API name"
              value={config.dbName ?? "—"}
            />
            <ReviewRow
              label="User / API key"
              value={
                config.dbUser
                  ? `${config.dbUser}${config.dbPassword ? " (with password)" : ""}`
                  : config.apiKey
                    ? "••••••••"
                    : "—"
              }
            />
            {platform === "csv" && (
              <ReviewRow
                label="Source"
                value={config.filePath ?? config.apiUrl ?? "—"}
              />
            )}
            {platform === "woocommerce" && (
              <ReviewRow label="WordPress URL" value={config.wpUrl ?? "—"} />
            )}
          </dl>

          {(createError || startError) && (
            <div className="mt-4 rounded-md bg-error-500/10 px-3 py-2 text-sm text-error-700 dark:bg-error-500/15 dark:text-error-400">
              <p className="flex items-center gap-1.5 font-medium">
                <ExclamationCircleIcon className="size-4" />
                Migration could not be started
              </p>
              <p className="mt-1 text-xs">
                {String(
                  (createError as Error)?.message ??
                    (startError as Error)?.message ??
                    "Unknown error",
                )}
              </p>
            </div>
          )}

          <div className="mt-5 flex justify-between">
            <Button
              variant="outlined"
              color="neutral"
              onClick={() => onPrev(2)}
              className="gap-1.5"
            >
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button
                variant="flat"
                color="neutral"
                onClick={onReset}
                className="gap-1.5"
              >
                Reset
              </Button>
              <Button
                color="primary"
                onClick={onStart}
                disabled={starting}
                className="gap-1.5"
              >
                {starting ? (
                  <ArrowPathIcon className="size-4 animate-spin" />
                ) : (
                  <RocketLaunchIcon className="size-4" />
                )}
                Start Migration
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-dark-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-800 dark:text-dark-100">
        {value}
      </dd>
    </div>
  );
}

// ----------------------------------------------------------------------

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const done = n < step;
        const active = n === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done
                    ? "bg-success-500 text-white"
                    : active
                      ? "bg-primary-500 text-white"
                      : "bg-gray-200 text-gray-500 dark:bg-dark-500 dark:text-dark-300"
                }`}
              >
                {done ? <CheckCircleIcon className="size-4" /> : n}
              </span>
              <span
                className={`text-xs font-medium ${
                  active
                    ? "text-primary-700 dark:text-primary-300"
                    : done
                      ? "text-gray-700 dark:text-dark-200"
                      : "text-gray-400 dark:text-dark-400"
                } hidden sm:inline`}
              >
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <span
                className={`h-px flex-1 ${
                  done ? "bg-success-500" : "bg-gray-200 dark:bg-dark-500"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ----------------------------------------------------------------------

interface MigrationHistoryProps {
  jobs: MigrationJob[];
  loading: boolean;
  error: unknown;
  onRefresh: () => void;
  onViewLogs: (job: MigrationJob) => void;
  onCancel: (job: MigrationJob) => void;
  onRetry: (job: MigrationJob) => void;
  cancellingId: string | null;
}

function MigrationHistory({
  jobs,
  loading,
  error,
  onRefresh,
  onViewLogs,
  onCancel,
  onRetry,
  cancellingId,
}: MigrationHistoryProps) {
  const summary = useMemo(() => {
    return jobs.reduce(
      (acc, j) => {
        acc[j.status] = (acc[j.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [jobs]);

  if (loading && jobs.length === 0) {
    return <LoadingState message="Loading migration jobs…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRefresh} />;
  }
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={ClipboardDocumentListIcon}
        title="No migrations yet"
        description="Run your first migration from the New Migration tab to see it here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-2 text-xs">
        <SummaryPill label="Total" value={jobs.length} tone="neutral" />
        {(["pending", "running", "completed", "failed", "cancelled"] as const).map(
          (s) =>
            summary[s] ? (
              <SummaryPill
                key={s}
                label={s[0].toUpperCase() + s.slice(1)}
                value={summary[s]}
                tone={s}
              />
            ) : null,
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {jobs.map((job) => (
          <MigrationJobCard
            key={job.id}
            job={job}
            onViewLogs={onViewLogs}
            onCancel={onCancel}
            onRetry={onRetry}
            cancelling={cancellingId === job.id}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "pending" | "running" | "completed" | "failed" | "cancelled";
}) {
  const toneClasses: Record<typeof tone, string> = {
    neutral: "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-200",
    pending: "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-200",
    running: "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300",
    completed: "bg-success-500/10 text-success-700 dark:bg-success-500/15 dark:text-success-400",
    failed: "bg-error-500/10 text-error-700 dark:bg-error-500/15 dark:text-error-400",
    cancelled: "bg-warning-500/10 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium ${toneClasses[tone]}`}
    >
      {label}
      <span className="font-bold">{value}</span>
    </span>
  );
}
