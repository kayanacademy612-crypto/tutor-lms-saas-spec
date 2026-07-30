// SavedReportsTab — saved-reports management panel for the Reports dashboard.
//
// Lists the saved report configs returned by `useSavedReports()` with the
// report name, type badge, last-run timestamp, and "Run" / "Delete" actions.
// "Run" hands the saved config back to the parent so it can switch tabs and
// apply the saved filter; "Delete" calls `useDeleteSavedReport().mutate(id)`.

// Import Dependencies
import { useMemo } from "react";
import {
  BookmarkIcon,
  PlayIcon,
  TrashIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import {
  Card,
  Button,
  Badge,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/lms";
import {
  useSavedReports,
  useDeleteSavedReport,
} from "@/hooks/useReportsAI";
import type { SavedReport } from "@/types/lms";

// ----------------------------------------------------------------------

export interface SavedReportsTabProps {
  /** Called when the user clicks "Run" — the parent switches tab + applies the config. */
  onRun: (report: SavedReport) => void;
}

const TYPE_COLOR = {
  overview: "primary",
  sales: "success",
  enrollments: "info",
  completion: "warning",
  courses: "secondary",
  students: "primary",
  instructors: "neutral",
} as const;

function relativeTime(iso?: string): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never";
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
 * Saved reports management panel. The "Run" action delegates to the parent
 * (which owns the active-tab + filters state) so a single source of truth
 * drives the rest of the dashboard.
 */
export function SavedReportsTab({ onRun }: SavedReportsTabProps) {
  const { data, loading, error, refetch } = useSavedReports();
  const deleteMutation = useDeleteSavedReport();

  const reports = useMemo(() => data ?? [], [data]);

  const onDelete = async (id: string) => {
    await deleteMutation.mutate(id);
    void refetch();
  };

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading saved reports…" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  return (
    <Card skin="bordered" className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-dark-600">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
            Saved reports
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {reports.length} saved · click <em>Run</em> to load a saved configuration.
          </p>
        </div>
        <Button
          color="neutral"
          variant="soft"
          onClick={() => void refetch()}
          className="text-xs"
        >
          Refresh
        </Button>
      </div>

      {reports.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="No saved reports"
          description="Save a report from any tab to re-run it later with the same filters."
        />
      ) : (
        <Table hoverable className="w-full">
          <THead>
            <Tr>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Name
              </Th>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Type
              </Th>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Last run
              </Th>
              <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Created
              </Th>
              <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                Actions
              </Th>
            </Tr>
          </THead>
          <TBody>
            {reports.map((r) => (
              <Tr
                key={r.id}
                className="border-t border-gray-100 dark:border-dark-600"
              >
                <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                  {r.name}
                </Td>
                <Td className="py-3">
                  <Badge
                    color={TYPE_COLOR[r.reportType] ?? "neutral"}
                    variant="soft"
                    className="text-[10px] capitalize"
                  >
                    {r.reportType}
                  </Badge>
                </Td>
                <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="size-3.5 text-gray-400 dark:text-dark-400" />
                    {relativeTime(r.lastRunAt)}
                  </span>
                </Td>
                <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                  {new Date(r.createdAt).toLocaleDateString()}
                </Td>
                <Td className="py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      color="primary"
                      variant="soft"
                      onClick={() => onRun(r)}
                      className="gap-1 text-xs"
                    >
                      <PlayIcon className="size-3.5 stroke-2" />
                      Run
                    </Button>
                    <Button
                      color="error"
                      variant="soft"
                      onClick={() => void onDelete(r.id)}
                      disabled={deleteMutation.loading}
                      className="gap-1 text-xs"
                    >
                      <TrashIcon className="size-3.5 stroke-2" />
                      Delete
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

export default SavedReportsTab;
