// Reports Dashboard — top-level layout (6 report tabs + Saved Reports).
//
// 2-column layout (sidebar + content) modeled on `instructor-dashboard` and
// `payouts-admin`. The sidebar switches between seven screens:
//
//   - Overview       — KPI overview + revenue chart + activity feed.
//   - Sales          — sales report (KPIs + line chart + top courses + payment methods).
//   - Enrollments    — enrollment report (KPIs + dual line charts + top courses + status).
//   - Completion     — completion funnel + per-course table.
//   - Courses        — course performance (sortable + searchable table).
//   - Students       — student report (sortable + searchable table).
//   - Saved Reports  — saved config management (run / delete).
//
// The top toolbar holds a `DateRangePicker`, a course filter, an "Export CSV"
// button (delegated to each tab's `reportType`), and a "Save Report" button
// that persists the current filters + tab under a user-supplied name.

// Import Dependencies
import { ComponentType, useCallback, useState } from "react";
import clsx from "clsx";
import {
  Squares2X2Icon,
  CurrencyDollarIcon,
  AcademicCapIcon,
  CheckBadgeIcon,
  BookOpenIcon,
  UsersIcon,
  BookmarkIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Badge,
  ScrollShadow,
  Spinner,
} from "@/components/ui";
import {
  useSaveReport,
} from "@/hooks/useReportsAI";
import type { ReportFilters, ReportType, SavedReport } from "@/types/lms";

import { DateRangePicker } from "./DateRangePicker";
import { ExportButton } from "./ExportButton";
import { OverviewTab } from "./OverviewTab";
import { SalesTab } from "./SalesTab";
import { EnrollmentsTab } from "./EnrollmentsTab";
import { CompletionTab } from "./CompletionTab";
import { CoursesTab } from "./CoursesTab";
import { StudentsTab } from "./StudentsTab";
import { SavedReportsTab } from "./SavedReportsTab";

// ----------------------------------------------------------------------

type ScreenId =
  | "overview"
  | "sales"
  | "enrollments"
  | "completion"
  | "courses"
  | "students"
  | "saved";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Report type associated with the tab (used for CSV export). */
  reportType: ReportType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Squares2X2Icon,
    reportType: "overview",
    description: "Top-line KPIs + revenue + activity feed",
  },
  {
    id: "sales",
    label: "Sales",
    icon: CurrencyDollarIcon,
    reportType: "sales",
    description: "Revenue, AOV, top courses, payment methods",
  },
  {
    id: "enrollments",
    label: "Enrollments",
    icon: AcademicCapIcon,
    reportType: "enrollments",
    description: "Enrollment counts + status breakdown",
  },
  {
    id: "completion",
    label: "Completion",
    icon: CheckBadgeIcon,
    reportType: "completion",
    description: "Completion funnel + per-course table",
  },
  {
    id: "courses",
    label: "Courses",
    icon: BookOpenIcon,
    reportType: "courses",
    description: "Per-course performance roll-up",
  },
  {
    id: "students",
    label: "Students",
    icon: UsersIcon,
    reportType: "students",
    description: "Per-student roll-up + activity",
  },
  {
    id: "saved",
    label: "Saved Reports",
    icon: BookmarkIcon,
    reportType: "overview",
    description: "Re-run or delete saved report configs",
  },
];

// ----------------------------------------------------------------------

export default function ReportsDashboard() {
  const [active, setActive] = useState<ScreenId>("overview");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  // Save-report mutation. We persist the current `filters` + tab under a
  // user-supplied name.
  const saveMutation = useSaveReport();

  const onRunSaved = useCallback((report: SavedReport) => {
    // Switch to the matching tab and apply the saved filter config (when the
    // saved config exposes a `filters` object that matches `ReportFilters`).
    const navItem = NAV_ITEMS.find((n) => n.reportType === report.reportType);
    if (navItem) setActive(navItem.id);
    const cfg = report.config as { filters?: ReportFilters };
    if (cfg?.filters) {
      setFilters(cfg.filters);
    }
  }, []);

  const onSave = useCallback(async () => {
    if (!saveName.trim()) return;
    await saveMutation.mutate({
      name: saveName.trim(),
      reportType: activeItem.reportType,
      config: { filters, tab: active },
    });
    setSaveName("");
    setShowSaveDialog(false);
  }, [saveName, saveMutation, activeItem, filters, active]);

  return (
    <Page title="Reports Dashboard">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <ChartBarSquareIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Reports Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                KPIs, charts, and CSV exports across all LMS reports.
              </p>
            </div>
          </div>
          <Badge color="primary" variant="soft">Admin</Badge>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav className="space-y-1 p-3" aria-label="Reports dashboard navigation">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => setActive(item.id)}
                      className={clsx(
                        "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-5 shrink-0 stroke-2 transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            {/* Toolbar (filters + actions) */}
            <div className="flex shrink-0 flex-col gap-3 border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                  <span>Reports</span>
                  <span className="text-gray-300 dark:text-dark-500">/</span>
                  <span className="font-medium text-gray-800 dark:text-dark-50">
                    {activeItem.label}
                  </span>
                </div>
                <p className="hidden text-xs text-gray-400 dark:text-dark-400 md:block">
                  {activeItem.description}
                </p>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Date range + course filter */}
                <div className="flex flex-wrap items-center gap-4">
                  <DateRangePicker
                    from={filters.from}
                    to={filters.to}
                    onChange={(range) =>
                      setFilters((f) => ({ ...f, ...range }))
                    }
                  />
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-dark-200">
                    <span>Course</span>
                    <input
                      type="text"
                      value={filters.courseId ?? ""}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          courseId: e.target.value || undefined,
                        }))
                      }
                      placeholder="Course ID (optional)"
                      className="form-input h-8 w-44 rounded-md border-gray-300 px-2 py-1 text-xs text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50 dark:focus:border-primary-500"
                    />
                  </label>
                </div>

                {/* Export + Save */}
                <div className="flex flex-wrap items-center gap-2">
                  {active !== "saved" && (
                    <>
                      <ExportButton
                        reportType={activeItem.reportType}
                        filters={filters}
                      />
                      <Button
                        color="neutral"
                        variant="soft"
                        onClick={() => setShowSaveDialog((s) => !s)}
                        className="gap-1.5 text-xs"
                      >
                        <BookmarkIcon className="size-4 stroke-2" />
                        Save Report
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline save dialog */}
              {showSaveDialog && active !== "saved" && (
                <Card className="flex flex-wrap items-center gap-2 p-3">
                  <Cog6ToothIcon className="size-4 text-primary-500" />
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Report name (e.g. 'Q3 sales — Stripe only')"
                    className="form-input h-8 min-w-[260px] flex-1 rounded-md border-gray-300 px-2 py-1 text-xs text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50 dark:focus:border-primary-500"
                  />
                  <Button
                    color="primary"
                    variant="filled"
                    onClick={onSave}
                    disabled={saveMutation.loading || !saveName.trim()}
                    className="gap-1.5 text-xs"
                  >
                    {saveMutation.loading ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <BookmarkIcon className="size-4 stroke-2" />
                    )}
                    Save
                  </Button>
                  <Button
                    color="neutral"
                    variant="flat"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setSaveName("");
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  {saveMutation.error && (
                    <p className="w-full text-xs text-error-600 dark:text-error-400">
                      {saveMutation.error.message}
                    </p>
                  )}
                  {saveMutation.data && (
                    <p className="w-full text-xs text-success-600 dark:text-success-400">
                      Saved as “{saveMutation.data.name}”.
                    </p>
                  )}
                </Card>
              )}
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-7xl px-6 py-6">
                {active === "overview" && <OverviewTab filters={filters} />}
                {active === "sales" && <SalesTab filters={filters} />}
                {active === "enrollments" && <EnrollmentsTab filters={filters} />}
                {active === "completion" && <CompletionTab filters={filters} />}
                {active === "courses" && <CoursesTab filters={filters} />}
                {active === "students" && <StudentsTab filters={filters} />}
                {active === "saved" && <SavedReportsTab onRun={onRunSaved} />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}
