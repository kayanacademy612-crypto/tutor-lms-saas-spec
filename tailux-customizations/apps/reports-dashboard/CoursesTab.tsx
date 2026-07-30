// CoursesTab — course-performance report for the Reports dashboard.
//
// Renders the published/draft/total summary, a search input, and a sortable
// courses table (title, instructor, enrollments, revenue, rating, completion
// rate, status). Sorting + filtering is done client-side over the report
// payload since the dataset is bounded by the selected date range.

// Import Dependencies
import { useMemo, useState } from "react";
import {
  AcademicCapIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import {
  Card,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Badge,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState, formatPrice } from "@/components/lms";
import { useCourseReport } from "@/hooks/useReportsAI";
import type { CourseReport, ReportFilters } from "@/types/lms";
import { KpiCard } from "./KpiCard";

// ----------------------------------------------------------------------

export interface CoursesTabProps {
  filters: ReportFilters;
}

type CourseRow = CourseReport["courses"][number];

type SortKey =
  | "title"
  | "instructorName"
  | "enrollments"
  | "revenueCents"
  | "avgRating"
  | "completionRate"
  | "status";

type SortDir = "asc" | "desc";

const STATUS_COLOR: Record<string, "success" | "warning" | "neutral"> = {
  published: "success",
  draft: "warning",
  archived: "neutral",
};

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Course performance panel — pulls `useCourseReport(filters)` and renders the
 * summary + sortable + searchable courses table.
 */
export function CoursesTab({ filters }: CoursesTabProps) {
  const { data, loading, error, refetch } = useCourseReport(filters);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenueCents");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    if (!data?.courses) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.courses.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.instructorName.toLowerCase().includes(q),
        )
      : data.courses;

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return sorted;
  }, [data, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "title" || key === "instructorName" || key === "status" ? "asc" : "desc");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading course report…" />
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

  if (!data) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={AcademicCapIcon}
          title="No courses"
          description="Course performance metrics will appear here once you publish courses."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Courses"
          value={data.totalCourses.toLocaleString()}
          icon={AcademicCapIcon}
          color="primary"
        />
        <KpiCard
          label="Published"
          value={data.publishedCourses.toLocaleString()}
          icon={DocumentTextIcon}
          color="success"
        />
        <KpiCard
          label="Draft"
          value={data.draftCourses.toLocaleString()}
          icon={DocumentDuplicateIcon}
          color="warning"
        />
      </div>

      {/* Search + table */}
      <Card skin="bordered" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
              Courses
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {rows.length} of {data.courses.length} shown · click a column header to sort.
            </p>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-dark-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or instructor…"
              className="form-input h-8 w-64 rounded-md border-gray-300 pl-8 pr-2 text-xs text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50 dark:focus:border-primary-500"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={AcademicCapIcon}
            title={query ? "No matching courses" : "No courses yet"}
            compact
            description={
              query
                ? "Try a different search term."
                : "Courses will appear here once they're created."
            }
          />
        ) : (
          <Table hoverable className="w-full">
            <THead>
              <Tr>
                <SortTh
                  label="Course"
                  k="title"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="left"
                />
                <SortTh
                  label="Instructor"
                  k="instructorName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="left"
                />
                <SortTh
                  label="Enrollments"
                  k="enrollments"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortTh
                  label="Revenue"
                  k="revenueCents"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortTh
                  label="Rating"
                  k="avgRating"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortTh
                  label="Completion"
                  k="completionRate"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortTh
                  label="Status"
                  k="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="left"
                />
              </Tr>
            </THead>
            <TBody>
              {rows.map((c) => (
                <Tr
                  key={c.courseId}
                  className="border-t border-gray-100 dark:border-dark-600"
                >
                  <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                    {c.title}
                  </Td>
                  <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                    {c.instructorName || "—"}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {c.enrollments.toLocaleString()}
                  </Td>
                  <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(c.revenueCents)}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {c.avgRating ? c.avgRating.toFixed(2) : "—"}
                  </Td>
                  <Td className="py-3 text-right text-sm font-semibold text-success-600 dark:text-success-400">
                    {pct(c.completionRate)}
                  </Td>
                  <Td className="py-3">
                    <Badge
                      color={STATUS_COLOR[c.status] ?? "neutral"}
                      variant="soft"
                      className="text-[10px] capitalize"
                    >
                      {c.status}
                    </Badge>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

/** Sortable column-header helper. */
function SortTh({
  label,
  k,
  sortKey,
  sortDir,
  onToggle,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
  align: "left" | "right";
}) {
  const active = sortKey === k;
  return (
    <Th
      className={`text-${align} text-xs font-semibold uppercase tracking-wide ${
        active
          ? "text-primary-600 dark:text-primary-400"
          : "text-gray-500 dark:text-dark-300"
      } cursor-pointer select-none`}
      onClick={() => onToggle(k)}
    >
      <span
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        {label}
        {active &&
          (sortDir === "asc" ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          ))}
      </span>
    </Th>
  );
}

export default CoursesTab;
