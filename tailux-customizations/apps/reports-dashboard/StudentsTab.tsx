// StudentsTab — student report for the Reports dashboard.
//
// Summary cards (Total Students, Active, New This Month) + a sortable +
// searchable students table (name, email, enrollments, completed courses,
// total spent, last active). Sorting + filtering is done client-side.

// Import Dependencies
import { useMemo, useState } from "react";
import {
  UsersIcon,
  UserCircleIcon,
  UserPlusIcon,
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
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState, formatPrice } from "@/components/lms";
import { useStudentReport } from "@/hooks/useReportsAI";
import type { ReportFilters, StudentReport } from "@/types/lms";
import { KpiCard } from "./KpiCard";

// ----------------------------------------------------------------------

export interface StudentsTabProps {
  filters: ReportFilters;
}

type StudentRow = StudentReport["students"][number];

type SortKey =
  | "name"
  | "email"
  | "enrollments"
  | "completedCourses"
  | "totalSpentCents"
  | "lastActiveAt";

type SortDir = "asc" | "desc";

function relativeTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
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
 * Student report panel — pulls `useStudentReport(filters)` and renders the
 * summary + sortable + searchable students table.
 */
export function StudentsTab({ filters }: StudentsTabProps) {
  const { data, loading, error, refetch } = useStudentReport(filters);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalSpentCents");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    if (!data?.students) return [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.students.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q),
        )
      : data.students;

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
      setSortDir(
        key === "name" || key === "email" || key === "lastActiveAt"
          ? "asc"
          : "desc",
      );
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading student report…" />
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
          icon={UsersIcon}
          title="No students"
          description="Students will appear here once they register."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Students"
          value={data.totalStudents.toLocaleString()}
          icon={UsersIcon}
          color="primary"
        />
        <KpiCard
          label="Active"
          value={data.activeStudents.toLocaleString()}
          icon={UserCircleIcon}
          color="success"
        />
        <KpiCard
          label="New this month"
          value={data.newStudentsThisMonth.toLocaleString()}
          icon={UserPlusIcon}
          color="info"
        />
      </div>

      {/* Search + table */}
      <Card skin="bordered" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
              Students
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {rows.length} of {data.students.length} shown · click a column header to sort.
            </p>
          </div>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400 dark:text-dark-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="form-input h-8 w-64 rounded-md border-gray-300 pl-8 pr-2 text-xs text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50 dark:focus:border-primary-500"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={query ? "No matching students" : "No students yet"}
            compact
            description={
              query
                ? "Try a different search term."
                : "Students will appear here once they register."
            }
          />
        ) : (
          <Table hoverable className="w-full">
            <THead>
              <Tr>
                <SortTh
                  label="Name"
                  k="name"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="left"
                />
                <SortTh
                  label="Email"
                  k="email"
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
                  label="Completed"
                  k="completedCourses"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortTh
                  label="Total Spent"
                  k="totalSpentCents"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="right"
                />
                <SortTh
                  label="Last Active"
                  k="lastActiveAt"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                  align="left"
                />
              </Tr>
            </THead>
            <TBody>
              {rows.map((s) => (
                <Tr
                  key={s.studentId}
                  className="border-t border-gray-100 dark:border-dark-600"
                >
                  <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                    {s.name}
                  </Td>
                  <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                    {s.email}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {s.enrollments.toLocaleString()}
                  </Td>
                  <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                    {s.completedCourses.toLocaleString()}
                  </Td>
                  <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(s.totalSpentCents)}
                  </Td>
                  <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                    {relativeTime(s.lastActiveAt)}
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

export default StudentsTab;
