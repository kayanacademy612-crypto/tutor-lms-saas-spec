// School Admin Dashboard — top-level layout (5 tabs).
//
// Replaces the tailux mock sales dashboard with a real school owner / admin
// dashboard that pulls LIVE data from the LMS API via the Phase 6 reports
// hooks (`useOverviewReport`, `useSalesReport`, `useCourseReport`,
// `useStudentReport`) plus the Phase 3 ecommerce / LMS hooks
// (`useOrders`, `useCourses`, `useEnrollments`) and a small in-file fetcher
// for cross-course reviews + Q&A.
//
// Layout: 2-column (sidebar + content) modeled on `apps/ecommerce/index.tsx`.
// Sidebar switches between five screens:
//
//   - Overview   — 6 KPI cards + revenue chart + recent activity feed
//   - Courses    — per-course performance table
//   - Students   — per-student roll-up table
//   - Revenue    — sales chart + top courses + payment methods + recent orders
//   - Activity   — recent enrollments / orders / reviews / Q&A questions
//
// All data is fetched live from the API — NO mock data, NO hard-coded stats.

// Import Dependencies
import { ComponentType, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Squares2X2Icon,
  BookOpenIcon,
  UsersIcon,
  CurrencyDollarIcon,
  BoltIcon,
  AcademicCapIcon,
  ShoppingBagIcon,
  StarIcon,
  CheckBadgeIcon,
  BanknotesIcon,
  ChartBarIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  ScrollShadow,
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
  formatPrice,
} from "@/components/lms";
import { useIsMounted } from "@/hooks/useIsMounted";
import {
  useCourseReport,
  useOverviewReport,
  useSalesReport,
  useStudentReport,
} from "@/hooks/useReportsAI";
import { useOrders } from "@/hooks/useEcommerce";
import { useCourses, useEnrollments } from "@/hooks/useLms";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type {
  CourseReview,
  Enrollment,
  Order,
  QAQuestion,
  ReportFilters,
} from "@/types/lms";

import { ActivityFeed, type ActivityItem } from "./ActivityFeed";
import { KpiCard } from "./KpiCard";
import { RevenueChart } from "./RevenueChart";

// ======================================================================
// Sidebar nav config
// ======================================================================

type ScreenId = "overview" | "courses" | "students" | "revenue" | "activity";

interface NavItem {
  id: ScreenId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Squares2X2Icon,
    description: "Top-line KPIs + revenue chart + recent activity",
  },
  {
    id: "courses",
    label: "Courses",
    icon: BookOpenIcon,
    description: "Per-course performance roll-up",
  },
  {
    id: "students",
    label: "Students",
    icon: UsersIcon,
    description: "Per-student enrollment + spend table",
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: CurrencyDollarIcon,
    description: "Sales chart, top courses, payment methods, recent orders",
  },
  {
    id: "activity",
    label: "Activity",
    icon: BoltIcon,
    description: "Recent enrollments, orders, reviews, and Q&A",
  },
];

// ======================================================================
// Helpers
// ======================================================================

/** Formats a 0..1 ratio as a `XX.X%` string. */
function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Formats an ISO timestamp as a relative "2h ago" / "3d ago" string. */
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

const STATUS_COLOR: Record<string, "success" | "warning" | "neutral"> = {
  published: "success",
  draft: "warning",
  archived: "neutral",
};

const ORDER_STATUS_COLOR: Record<
  string,
  "success" | "warning" | "error" | "neutral"
> = {
  paid: "success",
  pending: "warning",
  failed: "error",
  refunded: "error",
  canceled: "neutral",
};

const PAYMENT_COLORS = [
  "bg-primary-500",
  "bg-success-500",
  "bg-info-500",
  "bg-warning-500",
  "bg-error-500",
  "bg-secondary-500",
];

// ======================================================================
// Main component (default export)
// ======================================================================

export default function SchoolDashboard() {
  const [active, setActive] = useState<ScreenId>("overview");
  const activeItem = NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];

  return (
    <Page title="School Admin Dashboard">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <AcademicCapIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                School Admin Dashboard
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Live overview of your school's revenue, students, and content.
              </p>
            </div>
          </div>
          <Badge color="primary" variant="soft">
            Admin / Owner
          </Badge>
        </header>

        {/* 2-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside className="flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav
                className="space-y-1 p-3"
                aria-label="School dashboard navigation"
              >
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

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>School</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
              <p className="hidden text-xs text-gray-400 dark:text-dark-400 md:block">
                {activeItem.description}
              </p>
            </div>

            {/* Active screen */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-7xl px-6 py-6">
                {active === "overview" && <OverviewTab />}
                {active === "courses" && <CoursesTab />}
                {active === "students" && <StudentsTab />}
                {active === "revenue" && <RevenueTab />}
                {active === "activity" && <ActivityTab />}
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}

// ======================================================================
// Overview tab
// ======================================================================

function OverviewTab() {
  // Empty filters = the report's default range (last 30 days).
  const filters: ReportFilters = useMemo(() => ({}), []);
  const { data, loading, error, refetch } = useOverviewReport(filters);

  // Recent activity feed — pulls the latest enrollments + orders directly
  // from their list endpoints (NOT from the daily-series aggregate).
  const enrollments = useEnrollments();
  const orders = useOrders();

  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];

    for (const e of enrollments.data ?? []) {
      items.push({
        type: "enrollment",
        title: `New enrollment`,
        subtitle: `Course ${e.courseId}${
          e.status ? ` · ${e.status}` : ""
        }`,
        timestamp: e.createdAt,
      });
    }
    for (const o of orders.data ?? []) {
      items.push({
        type: "order",
        title: `Order ${o.orderNumber}`,
        subtitle: `${formatPrice(o.totalCents)} · ${o.status}`,
        timestamp: o.createdAt,
      });
    }

    return items
      .sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);
  }, [enrollments.data, orders.data]);

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading overview…" />
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
          icon={ChartBarIcon}
          title="No overview data"
          description="Overview metrics will appear here once orders + enrollments start coming in."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total Revenue"
          value={formatPrice(data.totalRevenueCents)}
          trend={data.revenueGrowth}
          icon={CurrencyDollarIcon}
          color="primary"
          subtitle={`Refunds ${formatPrice(data.totalRefundsCents)}`}
        />
        <KpiCard
          label="Total Students"
          value={data.totalStudents.toLocaleString()}
          trend={data.enrollmentGrowth}
          icon={UsersIcon}
          color="info"
        />
        <KpiCard
          label="Total Courses"
          value={data.totalCourses.toLocaleString()}
          icon={BookOpenIcon}
          color="secondary"
          subtitle={`${data.totalInstructors} instructor${data.totalInstructors === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Total Enrollments"
          value={data.totalEnrollments.toLocaleString()}
          trend={data.enrollmentGrowth}
          icon={AcademicCapIcon}
          color="success"
        />
        <KpiCard
          label="Completion Rate"
          value={pct(data.completionRate)}
          icon={CheckBadgeIcon}
          color="warning"
        />
        <KpiCard
          label="Avg Rating"
          value={data.avgRating ? data.avgRating.toFixed(2) : "—"}
          icon={StarIcon}
          color="primary"
        />
      </div>

      {/* Revenue + enrollments chart */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
              Revenue (last {data.dailySeries?.length ?? 0} days)
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              Daily gross revenue — hover a bar to see the exact amount +
              enrollments.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-300">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary-500" />
              Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success-500" />
              Enrollments
            </span>
          </div>
        </div>
        <RevenueChart data={data.dailySeries ?? []} height={220} />
      </Card>

      {/* Recent activity feed */}
      <ActivityFeed
        items={activity}
        title="Recent activity"
        description="Latest enrollments and orders across your school."
      />
    </div>
  );
}

// ======================================================================
// Courses tab
// ======================================================================

function CoursesTab() {
  const filters: ReportFilters = useMemo(() => ({}), []);
  const { data, loading, error, refetch } = useCourseReport(filters);
  const courses = useCourses();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<CourseSortKey>("revenueCents");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Augment the report's per-course roll-up with the live thumbnail/price
  // from `useCourses()` when available (graceful no-op when the lists don't
  // line up — the report payload alone is enough to populate the table).
  const courseMap = useMemo(() => {
    const m = new Map<string, { title?: string; status?: string }>();
    for (const c of courses.data ?? []) {
      m.set(String(c.id), { title: c.title, status: c.status });
    }
    return m;
  }, [courses.data]);

  const rows = useMemo(() => {
    const list = data?.courses ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.instructorName.toLowerCase().includes(q),
        )
      : list;

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

  const toggleSort = (key: CourseSortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "title" || key === "instructorName" || key === "status"
          ? "asc"
          : "desc",
      );
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
          icon={BookOpenIcon}
          color="success"
        />
        <KpiCard
          label="Draft"
          value={data.draftCourses.toLocaleString()}
          icon={BookOpenIcon}
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
              {rows.length} of {data.courses.length} shown · click a column
              header to sort.
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
                  label="Students"
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
              {rows.map((c) => {
                const live = courseMap.get(String(c.courseId));
                const status = c.status ?? live?.status ?? "draft";
                return (
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
                        color={STATUS_COLOR[status] ?? "neutral"}
                        variant="soft"
                        className="text-[10px] capitalize"
                      >
                        {status}
                      </Badge>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

type CourseSortKey =
  | "title"
  | "instructorName"
  | "enrollments"
  | "revenueCents"
  | "avgRating"
  | "completionRate"
  | "status";
type SortDir = "asc" | "desc";

// ======================================================================
// Students tab
// ======================================================================

function StudentsTab() {
  const filters: ReportFilters = useMemo(() => ({}), []);
  const { data, loading, error, refetch } = useStudentReport(filters);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<StudentSortKey>("totalSpentCents");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    const list = data?.students ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q),
        )
      : list;
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

  const toggleSort = (key: StudentSortKey) => {
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
          icon={UsersIcon}
          color="success"
        />
        <KpiCard
          label="New this month"
          value={data.newStudentsThisMonth.toLocaleString()}
          icon={UsersIcon}
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
              {rows.length} of {data.students.length} shown · click a column
              header to sort.
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
                    {s.name || "—"}
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

type StudentSortKey =
  | "name"
  | "email"
  | "enrollments"
  | "completedCourses"
  | "totalSpentCents"
  | "lastActiveAt";

// ======================================================================
// Revenue tab
// ======================================================================

function RevenueTab() {
  const filters: ReportFilters = useMemo(() => ({}), []);
  const { data, loading, error, refetch } = useSalesReport(filters);
  const orders = useOrders();

  // Recent orders (newest first), capped at 10 rows.
  const recentOrders = useMemo(() => {
    const list = orders.data ?? [];
    return [...list]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 10);
  }, [orders.data]);

  if (loading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading sales report…" />
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
          icon={CurrencyDollarIcon}
          title="No sales data"
          description="Sales metrics will appear here once the first order is placed."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Sales"
          value={formatPrice(data.totalSalesCents)}
          icon={CurrencyDollarIcon}
          color="primary"
        />
        <KpiCard
          label="Avg Order Value"
          value={formatPrice(data.avgOrderValueCents)}
          icon={ShoppingBagIcon}
          color="info"
        />
        <KpiCard
          label="Refund Rate"
          value={pct(data.refundRate)}
          icon={ArrowPathIcon}
          color="warning"
        />
        <KpiCard
          label="Total Orders"
          value={data.totalOrders.toLocaleString()}
          icon={BanknotesIcon}
          color="success"
        />
      </div>

      {/* Daily sales chart */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
            Daily sales
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Gross revenue per day for the selected range — hover a bar for the
            exact amount.
          </p>
        </div>
        <RevenueChart
          data={(data.dailySeries ?? []).map((d) => ({
            date: d.date,
            revenueCents: d.salesCents,
            enrollments: d.orders,
          }))}
          height={220}
        />
      </Card>

      {/* Top courses + payment methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card skin="bordered" className="overflow-hidden lg:col-span-2">
          <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
              Top courses by revenue
            </h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              Share of total sales — sorted high → low.
            </p>
          </div>
          {data.topCourses.length === 0 ? (
            <EmptyState
              icon={ChartBarIcon}
              title="No course sales yet"
              compact
              description="Top-performing courses will appear here."
            />
          ) : (
            <Table hoverable className="w-full">
              <THead>
                <Tr>
                  <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Course
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Sales
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Orders
                  </Th>
                  <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    % of total
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {data.topCourses.map((c) => {
                  const share =
                    data.totalSalesCents > 0
                      ? (c.salesCents / data.totalSalesCents) * 100
                      : 0;
                  return (
                    <Tr
                      key={c.courseId}
                      className="border-t border-gray-100 dark:border-dark-600"
                    >
                      <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                        {c.title}
                      </Td>
                      <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                        {formatPrice(c.salesCents)}
                      </Td>
                      <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                        {c.orders.toLocaleString()}
                      </Td>
                      <Td className="py-3 text-right text-sm text-gray-600 dark:text-dark-200">
                        {share.toFixed(1)}%
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>

        {/* Payment methods */}
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCardIcon className="size-4 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
              Payment methods
            </h3>
          </div>
          {data.paymentMethods.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-dark-300">
              No payment data yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.paymentMethods.map((m, idx) => {
                const total = data.paymentMethods.reduce(
                  (sum, x) => sum + x.totalCents,
                  0,
                );
                const share =
                  total > 0 ? (m.totalCents / total) * 100 : 0;
                const color = PAYMENT_COLORS[idx % PAYMENT_COLORS.length];
                return (
                  <li key={m.gateway}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-gray-800 dark:text-dark-100">
                        <span className={clsx("size-2.5 rounded-full", color)} />
                        <span className="capitalize">{m.gateway}</span>
                      </span>
                      <span className="text-xs text-gray-500 dark:text-dark-300">
                        {m.count} orders · {share.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
                      <div
                        className={clsx("h-full rounded-full", color)}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs font-semibold text-gray-700 dark:text-dark-200">
                      {formatPrice(m.totalCents)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card skin="bordered" className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
            Recent orders
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Latest 10 orders across your school.
          </p>
        </div>
        {orders.loading ? (
          <LoadingState message="Loading orders…" inline />
        ) : orders.error ? (
          <ErrorState
            error={orders.error}
            onRetry={orders.refetch}
            title="Couldn't load orders"
          />
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBagIcon}
            title="No orders yet"
            compact
            description="Orders will appear here once the first purchase is made."
          />
        ) : (
          <Table hoverable className="w-full">
            <THead>
              <Tr>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Order
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Items
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Payment
                </Th>
                <Th className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Total
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Status
                </Th>
                <Th className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Date
                </Th>
              </Tr>
            </THead>
            <TBody>
              {recentOrders.map((o) => (
                <Tr
                  key={o.id}
                  className="border-t border-gray-100 dark:border-dark-600"
                >
                  <Td className="py-3 text-sm font-medium text-gray-800 dark:text-dark-100">
                    {o.orderNumber}
                  </Td>
                  <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                    {o.items.length} item{o.items.length === 1 ? "" : "s"}
                  </Td>
                  <Td className="py-3 text-sm capitalize text-gray-600 dark:text-dark-200">
                    {o.paymentMethod ?? "—"}
                  </Td>
                  <Td className="py-3 text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatPrice(o.totalCents)}
                  </Td>
                  <Td className="py-3">
                    <Badge
                      color={ORDER_STATUS_COLOR[o.status] ?? "neutral"}
                      variant="soft"
                      className="text-[10px] capitalize"
                    >
                      {o.status}
                    </Badge>
                  </Td>
                  <Td className="py-3 text-sm text-gray-600 dark:text-dark-200">
                    {relativeTime(o.createdAt)}
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

// ======================================================================
// Activity tab
// ======================================================================

/**
 * Tiny in-file hook that fetches recent `CourseReview` + `QAQuestion` records
 * across the first N published courses in parallel. The LMS API exposes
 * reviews + Q&A per-course only, so we fan out a small bounded number of
 * calls and merge by `createdAt`. Returns real data — no mocks.
 */
function useRecentCourseInteractions(courseIds: string[], limit = 8) {
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [questions, setQuestions] = useState<QAQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<LmsApiError | null>(null);
  const isMounted = useIsMounted();
  const tokenRef = useRef(0);

  // Stable key so we refetch when the input course-id list actually changes.
  const idsKey = courseIds.slice(0, limit).join("|");

  useEffect(() => {
    const ids = idsKey ? idsKey.split("|") : [];
    if (ids.length === 0) {
      setReviews([]);
      setQuestions([]);
      setLoading(false);
      setError(null);
      return;
    }
    const token = ++tokenRef.current;
    setLoading(true);
    setError(null);

    Promise.allSettled(
      ids.flatMap((id) => [
        lmsApi.review.list(id),
        lmsApi.qa.list(id),
      ]),
    )
      .then((results) => {
        if (!isMounted() || token !== tokenRef.current) return;
        const revs: CourseReview[] = [];
        const qs: QAQuestion[] = [];
        results.forEach((r, idx) => {
          if (r.status !== "fulfilled") return;
          const value = r.value as CourseReview[] | QAQuestion[];
          // Even indices → reviews (matches the flatMap order above).
          if (idx % 2 === 0) {
            for (const v of value as CourseReview[]) revs.push(v);
          } else {
            for (const v of value as QAQuestion[]) qs.push(v);
          }
        });
        revs.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        qs.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setReviews(revs.slice(0, 12));
        setQuestions(qs.slice(0, 12));
      })
      .catch((err: unknown) => {
        if (!isMounted() || token !== tokenRef.current) return;
        setError(err as LmsApiError);
      })
      .finally(() => {
        if (isMounted() && token === tokenRef.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, isMounted]);

  return { reviews, questions, loading, error };
}

function ActivityTab() {
  const enrollments = useEnrollments();
  const orders = useOrders();
  const courses = useCourses();

  // Fetch reviews + Q&A across the first 8 published courses. Use the
  // published courses first so the activity feed reflects real student
  // interactions on live content.
  const courseIds = useMemo(() => {
    const list = courses.data ?? [];
    const published = list.filter((c) => c.status === "published");
    const pool = published.length > 0 ? published : list;
    return pool.slice(0, 8).map((c) => String(c.id));
  }, [courses.data]);

  const { reviews, questions, loading: interactionsLoading } =
    useRecentCourseInteractions(courseIds, 8);

  // Title lookup so we can render the course name next to a review / Q&A row.
  const courseTitleMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of courses.data ?? []) m.set(String(c.id), c.title);
    return m;
  }, [courses.data]);

  const enrollmentItems: ActivityItem[] = useMemo(() => {
    return (enrollments.data ?? [])
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 12)
      .map((e: Enrollment) => ({
        type: "enrollment" as const,
        title: `Student enrolled`,
        subtitle: `Course ${courseTitleMap.get(String(e.courseId)) ?? e.courseId}${
          e.status ? ` · ${e.status}` : ""
        }`,
        timestamp: e.createdAt,
      }));
  }, [enrollments.data, courseTitleMap]);

  const orderItems: ActivityItem[] = useMemo(() => {
    return (orders.data ?? [])
      .slice()
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 12)
      .map((o: Order) => ({
        type: "order" as const,
        title: `Order ${o.orderNumber}`,
        subtitle: `${formatPrice(o.totalCents)} · ${o.status}`,
        timestamp: o.createdAt,
      }));
  }, [orders.data]);

  const reviewItems: ActivityItem[] = useMemo(() => {
    return reviews.map((r) => ({
      type: "review" as const,
      title: `${r.rating}-star review${
        r.title ? ` · ${r.title}` : ""
      }`,
      subtitle: `Course ${courseTitleMap.get(String(r.courseId)) ?? r.courseId}`,
      timestamp: r.createdAt,
    }));
  }, [reviews, courseTitleMap]);

  const questionItems: ActivityItem[] = useMemo(() => {
    return questions.map((q) => ({
      type: "question" as const,
      title: q.question,
      subtitle: `Course ${courseTitleMap.get(String(q.courseId)) ?? q.courseId}${
        q.isResolved ? " · resolved" : " · open"
      }`,
      timestamp: q.createdAt,
    }));
  }, [questions, courseTitleMap]);

  const isLoading =
    enrollments.loading || orders.loading || (courses.loading && courseIds.length === 0);
  const hasError = enrollments.error && orders.error;

  if (isLoading) {
    return (
      <Card className="p-6">
        <LoadingState message="Loading activity…" />
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card className="p-6">
        <ErrorState
          error={enrollments.error ?? orders.error}
          onRetry={() => {
            enrollments.refetch();
            orders.refetch();
          }}
        />
      </Card>
    );
  }

  const hasAny =
    enrollmentItems.length > 0 ||
    orderItems.length > 0 ||
    reviewItems.length > 0 ||
    questionItems.length > 0;

  if (!hasAny) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={BoltIcon}
          title="No activity yet"
          description="Recent enrollments, orders, reviews, and questions will appear here as they happen."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActivityFeed
          items={enrollmentItems}
          title="Recent enrollments"
          description="Latest student enrollments across your courses."
        />
        <ActivityFeed
          items={orderItems}
          title="Recent orders"
          description="Latest purchases across your school."
        />
        <ActivityFeed
          items={reviewItems}
          title="Recent reviews"
          description={
            interactionsLoading
              ? "Loading reviews across your published courses…"
              : "Latest course reviews (top 8 published courses)."
          }
        />
        <ActivityFeed
          items={questionItems}
          title="Recent Q&A questions"
          description={
            interactionsLoading
              ? "Loading questions across your published courses…"
              : "Latest student questions (top 8 published courses)."
          }
        />
      </div>
    </div>
  );
}

// ======================================================================
// Sortable column-header helper (used by Courses + Students tables)
// ======================================================================

interface SortThProps<K extends string> {
  label: string;
  k: K;
  sortKey: K;
  sortDir: SortDir;
  onToggle: (k: K) => void;
  align: "left" | "right";
}

function SortTh<K extends string>({
  label,
  k,
  sortKey,
  sortDir,
  onToggle,
  align,
}: SortThProps<K>) {
  const isActive = sortKey === k;
  return (
    <Th
      className={`text-${align} text-xs font-semibold uppercase tracking-wide ${
        isActive
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
        {isActive &&
          (sortDir === "asc" ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          ))}
      </span>
    </Th>
  );
}
