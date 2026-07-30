// ExportButton — CSV export trigger for the Reports dashboard.
//
// Wraps `useExportReport().mutate({ reportType, params })` and triggers a
// client-side download once the backend returns a short-lived `downloadUrl`.
// Shows a loading spinner + disabled state while the export is being
// prepared, and surfaces any error inline beneath the button.

// Import Dependencies
import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";
import { useExportReport } from "@/hooks/useReportsAI";
import type { ReportFilters, ReportType } from "@/types/lms";

// ----------------------------------------------------------------------

export interface ExportButtonProps {
  /** Which report type to export (one of the 7 `ReportType` values). */
  reportType: ReportType;
  /** Filter object forwarded to the backend (date range, courseId, …). */
  filters: ReportFilters;
  /** Optional label override (defaults to "Export CSV"). */
  label?: string;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Calls `reportApi.exportCsv(reportType, filters)` via the
 * `useExportReport()` mutation hook and, on success, navigates the browser to
 * the returned `downloadUrl` (a pre-signed S3 link) so the file downloads
 * without leaving the page.
 */
export function ExportButton({
  reportType,
  filters,
  label = "Export CSV",
  className,
}: ExportButtonProps) {
  const mutation = useExportReport();
  const [errored, setErrored] = useState(false);

  // Reset the inline error banner whenever a new export starts.
  useEffect(() => {
    if (mutation.loading) setErrored(false);
  }, [mutation.loading]);

  const onExport = useCallback(async () => {
    const result = await mutation.mutate({ reportType, params: filters });
    if (!result?.downloadUrl) {
      setErrored(true);
      return;
    }
    // Hand the pre-signed URL to the browser so it downloads without
    // navigating away from the dashboard.
    window.location.href = result.downloadUrl;
  }, [mutation, reportType, filters]);

  return (
    <div className={className}>
      <Button
        color="primary"
        variant="soft"
        onClick={onExport}
        disabled={mutation.loading}
        className="gap-1.5 text-xs"
      >
        {mutation.loading ? (
          <>
            <ArrowDownTrayIcon className="size-4 animate-pulse stroke-2" />
            Preparing…
          </>
        ) : (
          <>
            <ArrowDownTrayIcon className="size-4 stroke-2" />
            {label}
          </>
        )}
      </Button>

      {errored && mutation.error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-error-600 dark:text-error-400">
          <ExclamationCircleIcon className="size-3.5" />
          {mutation.error.message ?? "Export failed. Try again."}
        </p>
      )}
    </div>
  );
}

export default ExportButton;
