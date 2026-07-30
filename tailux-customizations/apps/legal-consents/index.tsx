// Legal Consents — `apps/legal-consents` route.
//
// Layout:
//   - Top header strip with the page title and a "Refresh" button.
//   - "Active consents" section — a grid of Cards, one per consent type
//     (terms / privacy / marketing / cookies). Each Card shows the
//     current status (granted / revoked), the policy version, the grant
//     date, and a "View" link + a "Grant"/"Revoke" toggle button.
//   - "Consent history" section — a Table audit log of every consent
//     change for the current user (newest first), with columns: type,
//     version, action (granted/revoked), date, IP, user agent.
//
// Hooks used:
//   - `useLegalConsents()` — fetch the current user's consent history.
//   - `useGrantConsent()` — record a grant (or revoke — `granted: false`).

// Import Dependencies
import { useCallback, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  ScaleIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  Spinner,
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
  useGrantConsent,
  useLegalConsents,
} from "@/hooks/useProEngagement";
import type { ConsentType, LegalConsent } from "@/types/lms";

// ----------------------------------------------------------------------

interface ConsentTypeMeta {
  type: ConsentType;
  label: string;
  description: string;
  /** Path to a (future) policy viewer page. */
  viewPath: string;
  /** Latest policy version surfaced to the user — falls back to "v1.0". */
  latestVersion: string;
}

const CONSENT_TYPES: ConsentTypeMeta[] = [
  {
    type: "terms",
    label: "Terms of Service",
    description: "The terms under which you may use the platform.",
    viewPath: "/legal/terms",
    latestVersion: "v3.2",
  },
  {
    type: "privacy",
    label: "Privacy Policy",
    description: "How we collect, use, and protect your personal data.",
    viewPath: "/legal/privacy",
    latestVersion: "v2.5",
  },
  {
    type: "marketing",
    label: "Marketing Communications",
    description: "Promotional emails, course recommendations, and offers.",
    viewPath: "/legal/marketing",
    latestVersion: "v1.1",
  },
  {
    type: "cookies",
    label: "Cookie Usage",
    description: "Use of cookies and similar tracking technologies.",
    viewPath: "/legal/cookies",
    latestVersion: "v1.4",
  },
];

function metaForType(type: ConsentType): ConsentTypeMeta {
  return (
    CONSENT_TYPES.find((m) => m.type === type) ?? {
      type,
      label: type,
      description: "",
      viewPath: "/legal",
      latestVersion: "v1.0",
    }
  );
}

// ----------------------------------------------------------------------

export default function LegalConsentsPage() {
  // ───────── Data ─────────
  const consentsQuery = useLegalConsents();
  const grantConsent = useGrantConsent();

  const [busyType, setBusyType] = useState<ConsentType | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // ───────── Derived ─────────
  /**
   * The consents list is a full history (every grant AND revoke). The
   * "current status" of each consent type is determined by the most
   * recent record for that type (sorted by grantedAt desc).
   */
  const history = useMemo<LegalConsent[]>(() => {
    const list = consentsQuery.data ?? [];
    return list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
      );
  }, [consentsQuery.data]);

  /**
   * Map of `consentType → latest LegalConsent record` so the Active
   * Consents grid can show the current status, version, and date per
   * type.
   */
  const latestByType = useMemo(() => {
    const map = new Map<ConsentType, LegalConsent>();
    for (const c of history) {
      if (!map.has(c.consentType)) {
        map.set(c.consentType, c);
      }
    }
    return map;
  }, [history]);

  // ───────── Handlers ─────────
  const handleToggle = useCallback(
    async (type: ConsentType, granted: boolean) => {
      setErrorNotice(null);
      setBusyType(type);
      const meta = metaForType(type);
      const result = await grantConsent.mutate({
        consentType: type,
        version: meta.latestVersion,
        granted,
      });
      setBusyType(null);
      if (result) {
        void consentsQuery.refetch();
      } else if (grantConsent.error) {
        setErrorNotice(grantConsent.error.message);
      }
    },
    [grantConsent, consentsQuery],
  );

  // ───────── Render ─────────
  return (
    <Page title="Legal Consents">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <ScaleIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Legal Consents
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Review and manage the legal agreements you’ve accepted.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-9"
              onClick={() => void consentsQuery.refetch()}
              aria-label="Refresh consents"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">
            {consentsQuery.loading ? (
              <LoadingState message="Loading consent records…" />
            ) : consentsQuery.error ? (
              <ErrorState
                error={consentsQuery.error}
                onRetry={consentsQuery.refetch}
              />
            ) : (
              <div className="space-y-6">
                {/* Error notice */}
                {errorNotice && (
                  <Card
                    skin="bordered"
                    className="border-error-300 bg-error-50 p-4 dark:border-error-500/40 dark:bg-error-500/10"
                  >
                    <p className="text-sm font-semibold text-error-700 dark:text-error-300">
                      Couldn’t update consent
                    </p>
                    <p className="mt-0.5 text-xs text-error-600 dark:text-error-400">
                      {errorNotice}
                    </p>
                  </Card>
                )}

                {/* Active consents */}
                <section>
                  <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-dark-50">
                    Active consents
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {CONSENT_TYPES.map((meta) => {
                      const latest = latestByType.get(meta.type);
                      const granted = latest?.granted ?? false;
                      const busy = busyType === meta.type;
                      return (
                        <Card key={meta.type} skin="bordered" className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={[
                                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                                  granted
                                    ? "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400"
                                    : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300",
                                ].join(" ")}
                              >
                                {granted ? (
                                  <CheckCircleIcon className="size-5 stroke-2" />
                                ) : (
                                  <XCircleIcon className="size-5 stroke-2" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                                  {meta.label}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                                  {meta.description}
                                </p>
                              </div>
                            </div>
                            <Badge
                              color={granted ? "success" : "neutral"}
                              variant="soft"
                              className="shrink-0 text-[10px]"
                            >
                              {granted ? "Granted" : "Revoked"}
                            </Badge>
                          </div>

                          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                            <dt className="text-gray-500 dark:text-dark-400">
                              Version
                            </dt>
                            <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                              {latest?.version ?? "—"}
                            </dd>
                            <dt className="text-gray-500 dark:text-dark-400">
                              {granted ? "Granted" : "Revoked"}
                            </dt>
                            <dd className="text-right text-gray-800 dark:text-dark-100">
                              {latest
                                ? new Date(latest.grantedAt).toLocaleString()
                                : "—"}
                            </dd>
                            <dt className="text-gray-500 dark:text-dark-400">
                              Latest version
                            </dt>
                            <dd className="text-right text-gray-800 dark:text-dark-100">
                              {meta.latestVersion}
                            </dd>
                          </dl>

                          <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
                            <a
                              href={meta.viewPath}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                            >
                              <EyeIcon className="size-3.5 stroke-2" />
                              View policy
                            </a>
                            <Button
                              size="sm"
                              color={granted ? "error" : "primary"}
                              variant={granted ? "soft" : "filled"}
                              onClick={() =>
                                void handleToggle(meta.type, !granted)
                              }
                              disabled={busy}
                              className="gap-1.5"
                            >
                              {busy && <Spinner className="size-3.5" />}
                              {granted ? "Revoke" : "Grant"}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                {/* Consent history */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Consent history
                    </h2>
                    <span className="text-xs text-gray-500 dark:text-dark-300">
                      {history.length} {history.length === 1 ? "record" : "records"}
                    </span>
                  </div>

                  {history.length === 0 ? (
                    <Card skin="bordered" className="p-0">
                      <EmptyState
                        icon={DocumentTextIcon}
                        title="No consent history"
                        description="You haven’t granted or revoked any consents yet."
                      />
                    </Card>
                  ) : (
                    <Card skin="bordered" className="overflow-hidden p-0">
                      <Table hoverable>
                        <THead>
                          <Tr>
                            <Th className="text-left">Type</Th>
                            <Th className="text-left">Action</Th>
                            <Th className="text-left">Version</Th>
                            <Th className="text-left">Date</Th>
                            <Th className="text-left">IP</Th>
                            <Th className="text-left">User agent</Th>
                          </Tr>
                        </THead>
                        <TBody>
                          {history.map((c) => {
                            const meta = metaForType(c.consentType);
                            return (
                              <Tr key={c.id}>
                                <Td>
                                  <span className="text-sm font-medium text-gray-800 dark:text-dark-50">
                                    {meta.label}
                                  </span>
                                </Td>
                                <Td>
                                  <Badge
                                    color={c.granted ? "success" : "warning"}
                                    variant="soft"
                                    className="text-[10px]"
                                  >
                                    {c.granted ? "Granted" : "Revoked"}
                                  </Badge>
                                </Td>
                                <Td>
                                  <span className="font-mono text-xs text-gray-700 dark:text-dark-100">
                                    {c.version}
                                  </span>
                                </Td>
                                <Td>
                                  <span className="text-xs text-gray-700 dark:text-dark-100">
                                    {new Date(c.grantedAt).toLocaleString()}
                                  </span>
                                </Td>
                                <Td>
                                  <span className="font-mono text-xs text-gray-700 dark:text-dark-100">
                                    {c.ipAddress ?? "—"}
                                  </span>
                                </Td>
                                <Td>
                                  <span className="block max-w-xs truncate text-xs text-gray-500 dark:text-dark-300">
                                    {c.userAgent ?? "—"}
                                  </span>
                                </Td>
                              </Tr>
                            );
                          })}
                        </TBody>
                      </Table>
                    </Card>
                  )}
                </section>

                {/* Footer note */}
                <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-500 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-300">
                  <ShieldCheckIcon className="size-4 shrink-0 stroke-2 text-primary-500 dark:text-primary-400" />
                  <p>
                    Consents are recorded with your IP address and user agent
                    for audit purposes, in line with our privacy policy. You
                    can revoke non-essential consents (e.g. marketing) at any
                    time; revoking Terms or Privacy may limit access to the
                    platform.
                  </p>
                </div>
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}
