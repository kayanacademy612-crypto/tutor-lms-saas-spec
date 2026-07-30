// IssuedCertificates — table of certs that have been issued to students.
//
// Columns: certificate number, student name, course title, issue date,
// status (valid / revoked), actions (Download PDF, Revoke with reason
// modal). Filters by status.
//
// Backed by Phase 4 hooks:
//   - useCertificates(params?)         — list
//   - useDownloadCertificate(id)       — returns { pdfUrl }
//   - useRevokeCertificate({ id, reason })
//
// Filters are passed via `params` so the hook refetches when they change.

// Import Dependencies
import { useMemo, useState, useCallback } from "react";
import {
  ArrowDownTrayIcon,
  ShieldExclamationIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select, Textarea } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import {
  useCertificates,
  useDownloadCertificate,
  useRevokeCertificate,
} from "@/hooks/useProAuthoring";
import type { Certificate, ListParams } from "@/types/lms";

// ----------------------------------------------------------------------

type StatusFilter = "all" | "valid" | "revoked";

// ----------------------------------------------------------------------

export default function IssuedCertificates() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Build the list params. The hook uses `argsKey([params])` to refetch
  // when the serialized params change.
  const params = useMemo<ListParams>(
    () => ({
      search: search.trim() || undefined,
      // Backend doesn't expose a status filter param today; we filter
      // client-side for valid/revoked.
      limit: 100,
    }),
    [search],
  );

  const list = useCertificates(params);
  const downloadCert = useDownloadCertificate();
  const revokeCert = useRevokeCertificate();

  const handleDownload = useCallback(
    (cert: Certificate) => {
      void downloadCert.mutate(cert.id).then((result) => {
        if (result?.pdfUrl) {
          window.open(result.pdfUrl, "_blank", "noopener,noreferrer");
        }
      });
    },
    [downloadCert],
  );

  const handleRevoke = useCallback(() => {
    if (!revokingId) return;
    void revokeCert
      .mutate({
        id: revokingId,
        reason: revokeReason.trim() || undefined,
      })
      .then((result) => {
        if (result) {
          setRevokingId(null);
          setRevokeReason("");
          void list.refetch();
        }
      });
  }, [revokingId, revokeReason, revokeCert, list]);

  // ------------------------------------------------------------------
  if (list.loading && !list.data) {
    return <LoadingState message="Loading issued certificates…" />;
  }
  if (list.error) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => void list.refetch()}
        title="Couldn't load issued certificates"
      />
    );
  }

  const allCerts = list.data ?? [];
  const certs =
    statusFilter === "all"
      ? allCerts
      : allCerts.filter((c) =>
          statusFilter === "revoked" ? c.isRevoked : !c.isRevoked,
        );

  const validCount = allCerts.filter((c) => !c.isRevoked).length;
  const revokedCount = allCerts.length - validCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Issued Certificates
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Browse, download, and revoke certificates that have been issued to
            students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="success" variant="soft" className="gap-1 text-xs">
            <CheckCircleIcon className="size-3.5" />
            {validCount} valid
          </Badge>
          <Badge color="error" variant="soft" className="gap-1 text-xs">
            <XCircleIcon className="size-3.5" />
            {revokedCount} revoked
          </Badge>
        </div>
      </header>

      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-dark-400" />
          <Input
            placeholder="Search by student, course, or cert number…"
            value={search}
            onChange={(e) =>
              setSearch((e.target as HTMLInputElement).value)
            }
            className="pl-8"
            classNames={{ wrapper: "mt-0" }}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              (e.target as HTMLSelectElement).value as StatusFilter,
            )
          }
          className="w-40"
          data={[
            { value: "all", label: "All statuses" },
            { value: "valid", label: "Valid only" },
            { value: "revoked", label: "Revoked only" },
          ]}
        />
      </Card>

      {/* Table / empty */}
      {certs.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentCheckIcon}
          title="No certificates found"
          description={
            search || statusFilter !== "all"
              ? "Try adjusting your filters."
              : "Certificates will appear here once a course issues them."
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="hide-scrollbar overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300">
                <tr>
                  <th className="px-4 py-3 font-medium">Cert #</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                {certs.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700 dark:text-dark-100">
                      {cert.certificateNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-800 dark:text-dark-100">
                      {cert.studentName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-dark-200">
                      {cert.courseTitle}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-dark-300">
                      {new Date(cert.issueDate).toLocaleDateString()}
                      {cert.finalScorePct != null && (
                        <span className="ml-1 text-gray-400">
                          · {cert.finalScorePct}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cert.isRevoked ? (
                        <Badge
                          color="error"
                          variant="soft"
                          className="gap-1 text-[10px]"
                        >
                          <XCircleIcon className="size-3" />
                          Revoked
                        </Badge>
                      ) : (
                        <Badge
                          color="success"
                          variant="soft"
                          className="gap-1 text-[10px]"
                        >
                          <CheckCircleIcon className="size-3" />
                          Valid
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="flat"
                          color="neutral"
                          isIcon
                          aria-label="Download PDF"
                          onClick={() => handleDownload(cert)}
                          disabled={
                            downloadCert.loading || cert.isRevoked
                          }
                        >
                          <ArrowDownTrayIcon className="size-4 stroke-2" />
                        </Button>
                        {!cert.isRevoked && (
                          <Button
                            variant="flat"
                            color="error"
                            isIcon
                            aria-label="Revoke certificate"
                            onClick={() => {
                              setRevokingId(cert.id);
                              setRevokeReason("");
                            }}
                          >
                            <ShieldExclamationIcon className="size-4 stroke-2" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Revoke modal */}
      {revokingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRevokingId(null);
          }}
        >
          <Card
            skin="bordered"
            className="w-full max-w-md overflow-hidden bg-white dark:bg-dark-750"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
              <div className="flex items-center gap-2">
                <ShieldExclamationIcon className="size-5 text-error-500" />
                <h2
                  id="revoke-modal-title"
                  className="text-sm font-semibold text-gray-800 dark:text-dark-50"
                >
                  Revoke certificate
                </h2>
              </div>
              <Button
                isIcon
                variant="flat"
                color="neutral"
                className="size-7"
                onClick={() => setRevokingId(null)}
                aria-label="Close"
              >
                <span className="text-xs">×</span>
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm text-gray-600 dark:text-dark-200">
                Revoking invalidates the certificate immediately — the
                verification page will show it as revoked, and PDF download
                will be disabled.
              </p>
              <Textarea
                label="Reason (optional)"
                rows={3}
                placeholder="e.g. Issued in error; the student didn't actually complete the course."
                value={revokeReason}
                onChange={(e) =>
                  setRevokeReason((e.target as HTMLTextAreaElement).value)
                }
              />
              {revokeCert.error && (
                <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  {revokeCert.error.message}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
                <Button
                  variant="flat"
                  color="neutral"
                  onClick={() => setRevokingId(null)}
                  disabled={revokeCert.loading}
                >
                  Cancel
                </Button>
                <Button
                  color="error"
                  onClick={handleRevoke}
                  disabled={revokeCert.loading}
                  className="gap-1.5"
                >
                  <ShieldExclamationIcon className="size-4 stroke-2" />
                  {revokeCert.loading ? "Revoking…" : "Revoke certificate"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default IssuedCertificates;
