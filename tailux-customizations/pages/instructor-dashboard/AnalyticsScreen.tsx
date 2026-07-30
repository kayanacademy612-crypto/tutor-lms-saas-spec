// AnalyticsScreen — instructor analytics with 4 CSS-based charts.
//
// Renders four charts using only Tailwind divs (no chart library):
//   1. Revenue over time (line chart — SVG polyline)
//   2. Enrollment by course (horizontal bar chart)
//   3. Student engagement (stacked area chart — SVG)
//   4. Ratings breakdown (pie chart — conic-gradient)
//
// Each chart sits in its own Card with a title, subtitle, and a small
// legend. Mock data is defined at the top.

// Import Dependencies
import { useMemo, useState } from "react";
import {
  CurrencyDollarIcon,
  AcademicCapIcon,
  UsersIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { StatCard } from "@/components/lms";
import { Card, Badge, Button } from "@/components/ui";

// ----------------------------------------------------------------------

const REVENUE_SERIES: { month: string; value: number }[] = [
  { month: "Jan", value: 1820 },
  { month: "Feb", value: 2140 },
  { month: "Mar", value: 2680 },
  { month: "Apr", value: 3120 },
  { month: "May", value: 3680 },
  { month: "Jun", value: 4820 },
  { month: "Jul", value: 4350 },
  { month: "Aug", value: 3940 },
  { month: "Sep", value: 4520 },
  { month: "Oct", value: 5180 },
  { month: "Nov", value: 5640 },
  { month: "Dec", value: 6210 },
];

const ENROLLMENT_BY_COURSE: { name: string; value: number; color: string }[] = [
  { name: "Full-Stack React & TypeScript", value: 1240, color: "#6366f1" },
  { name: "Advanced React Performance", value: 540, color: "#0ea5e9" },
  { name: "Building Design Systems with Tailwind v4", value: 880, color: "#10b981" },
  { name: "TypeScript Generics Deep Dive", value: 0, color: "#f59e0b" },
];

const ENGAGEMENT_SERIES: { month: string; lessons: number; quizzes: number; discussions: number }[] = [
  { month: "Jan", lessons: 820, quizzes: 120, discussions: 64 },
  { month: "Feb", lessons: 980, quizzes: 180, discussions: 88 },
  { month: "Mar", lessons: 1240, quizzes: 240, discussions: 112 },
  { month: "Apr", lessons: 1480, quizzes: 290, discussions: 134 },
  { month: "May", lessons: 1620, quizzes: 320, discussions: 156 },
  { month: "Jun", lessons: 1820, quizzes: 410, discussions: 188 },
  { month: "Jul", lessons: 1740, quizzes: 380, discussions: 172 },
  { month: "Aug", lessons: 1580, quizzes: 340, discussions: 150 },
  { month: "Sep", lessons: 1720, quizzes: 380, discussions: 168 },
  { month: "Oct", lessons: 1940, quizzes: 430, discussions: 198 },
  { month: "Nov", lessons: 2120, quizzes: 470, discussions: 220 },
  { month: "Dec", lessons: 2280, quizzes: 510, discussions: 246 },
];

const RATINGS_BREAKDOWN: { rating: number; count: number; color: string }[] = [
  { rating: 5, count: 412, color: "#10b981" },
  { rating: 4, count: 268, color: "#22c55e" },
  { rating: 3, count: 96, color: "#f59e0b" },
  { rating: 2, count: 34, color: "#f97316" },
  { rating: 1, count: 18, color: "#ef4444" },
];

// ----------------------------------------------------------------------

type Range = "3m" | "6m" | "12m";

const RANGES: { id: Range; label: string }[] = [
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "12m", label: "1Y" },
];

function sliceByRange<T>(arr: T[], range: Range): T[] {
  const n = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  return arr.slice(-n);
}

// ----------------------------------------------------------------------

export function AnalyticsScreen() {
  const [range, setRange] = useState<Range>("12m");

  const revenue = useMemo(() => sliceByRange(REVENUE_SERIES, range), [range]);
  const engagement = useMemo(() => sliceByRange(ENGAGEMENT_SERIES, range), [range]);

  const totalRevenue = REVENUE_SERIES.reduce((s, p) => s + p.value, 0);
  const monthRevenue = REVENUE_SERIES[REVENUE_SERIES.length - 1].value;
  const prevMonthRevenue = REVENUE_SERIES[REVENUE_SERIES.length - 2].value;
  const revenueDelta = ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100;

  const totalEnrollments = ENROLLMENT_BY_COURSE.reduce((s, c) => s + c.value, 0);
  const totalRatings = RATINGS_BREAKDOWN.reduce((s, r) => s + r.count, 0);
  const avgRating =
    RATINGS_BREAKDOWN.reduce((s, r) => s + r.rating * r.count, 0) / Math.max(totalRatings, 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Revenue, enrollments, engagement, and ratings across your courses.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-750">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              variant={range === r.id ? "soft" : "flat"}
              color={range === r.id ? "primary" : "neutral"}
              onClick={() => setRange(r.id)}
              className="text-xs"
            >
              {r.label}
            </Button>
          ))}
        </div>
      </header>

      {/* KPI strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CurrencyDollarIcon}
          value={`$${totalRevenue.toLocaleString()}`}
          label="Total revenue"
          color="success"
          trend={{ value: revenueDelta, label: "vs last month" }}
        />
        <StatCard
          icon={AcademicCapIcon}
          value={totalEnrollments.toLocaleString()}
          label="Total enrollments"
          color="primary"
          trend={{ value: 9.3, label: "vs last month" }}
        />
        <StatCard
          icon={UsersIcon}
          value={engagement.reduce((s, e) => s + e.lessons + e.quizzes + e.discussions, 0).toLocaleString()}
          label="Engagement events"
          color="info"
          trend={{ value: 14.2, label: "vs last month" }}
        />
        <StatCard
          icon={StarIcon}
          value={avgRating.toFixed(2)}
          label="Avg rating"
          color="warning"
          trend={{ value: 2.1, label: "vs last month" }}
        />
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue line chart */}
        <Card className="p-5">
          <ChartHeader
            title="Revenue over time"
            subtitle="Gross revenue (USD) per month"
            trend={revenueDelta}
          />
          <LineChart data={revenue.map((p) => ({ label: p.month, value: p.value }))} color="#6366f1" />
        </Card>

        {/* Enrollment bar chart */}
        <Card className="p-5">
          <ChartHeader
            title="Enrollment by course"
            subtitle="Active students per course"
          />
          <BarChart
            data={ENROLLMENT_BY_COURSE.map((c) => ({
              label: c.name,
              value: c.value,
              color: c.color,
            }))}
            total={totalEnrollments}
          />
        </Card>

        {/* Engagement area chart */}
        <Card className="p-5">
          <ChartHeader
            title="Student engagement"
            subtitle="Lessons, quizzes, and discussions per month"
          />
          <AreaChart
            data={engagement.map((e) => ({
              label: e.month,
              lessons: e.lessons,
              quizzes: e.quizzes,
              discussions: e.discussions,
            }))}
          />
        </Card>

        {/* Ratings pie chart */}
        <Card className="p-5">
          <ChartHeader
            title="Ratings breakdown"
            subtitle={`${totalRatings} ratings · ${avgRating.toFixed(2)} avg`}
          />
          <PieChart data={RATINGS_BREAKDOWN} total={totalRatings} />
        </Card>
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------

function ChartHeader({
  title,
  subtitle,
  trend,
}: {
  title: string;
  subtitle: string;
  trend?: number;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">{subtitle}</p>
      </div>
      {trend !== undefined && (
        <Badge
          color={trend >= 0 ? "success" : "error"}
          variant="soft"
          className="gap-1 text-[10px]"
        >
          {trend >= 0 ? (
            <ArrowTrendingUpIcon className="size-3" />
          ) : (
            <ArrowTrendingDownIcon className="size-3" />
          )}
          {Math.abs(trend).toFixed(1)}%
        </Badge>
      )}
    </div>
  );
}

/** Line chart rendered with SVG (polyline + dots). */
function LineChart({
  data,
  color,
}: {
  data: { label: string; value: number }[];
  color: string;
}) {
  const width = 480;
  const height = 180;
  const padX = 24;
  const padY = 20;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = Math.max(max - min, 1);

  const points = data.map((d, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2);
    const y = height - padY - ((d.value - min) / range) * (height - padY * 2);
    return { x, y, ...d };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `${path} L${points[points.length - 1].x.toFixed(1)},${height - padY} ` +
    `L${points[0].x.toFixed(1)},${height - padY} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padX}
            x2={width - padX}
            y1={padY + p * (height - padY * 2)}
            y2={padY + p * (height - padY * 2)}
            className="stroke-gray-100 dark:stroke-dark-600"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        ))}
        {/* Area */}
        <path d={areaPath} fill="url(#lineFill)" />
        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="mt-1 flex justify-between px-6 text-[10px] text-gray-400 dark:text-dark-400">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bar chart for enrollment by course. */
function BarChart({
  data,
  total,
}: {
  data: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = total > 0 ? (d.value / total) * 100 : 0;
        return (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-gray-700 dark:text-dark-200">{d.label}</span>
              <span className="shrink-0 font-medium text-gray-800 dark:text-dark-50">
                {d.value.toLocaleString()}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: d.color }}
              />
            </div>
          </div>
        );
      })}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-dark-600">
        <span className="text-gray-500 dark:text-dark-300">Total enrollments</span>
        <span className="font-semibold text-gray-800 dark:text-dark-50">
          {total.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

/** Stacked area chart (SVG) for engagement breakdown. */
function AreaChart({
  data,
}: {
  data: { label: string; lessons: number; quizzes: number; discussions: number }[];
}) {
  const width = 480;
  const height = 180;
  const padX = 24;
  const padY = 20;
  const max = Math.max(
    ...data.map((d) => d.lessons + d.quizzes + d.discussions),
    1,
  );

  // Build stacked areas: discussions (bottom), quizzes (middle), lessons (top)
  const buildArea = (key: "lessons" | "quizzes" | "discussions", baseKey: "lessons" | "quizzes" | "discussions" | null, color: string) => {
    const tops = data.map((d, i) => {
      const x = padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2);
      const base = baseKey ? (d[baseKey] ?? 0) : 0;
      const y = height - padY - ((d[key] + base) / max) * (height - padY * 2);
      return { x, y };
    });
    const bottoms = data
      .map((d, i) => {
        const x = padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2);
        const base = baseKey ? (d[baseKey] ?? 0) : 0;
        const y = height - padY - (base / max) * (height - padY * 2);
        return { x, y };
      })
      .reverse();
    const path =
      tops.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
      " L" + bottoms.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L") +
      " Z";
    return <path key={key} d={path} fill={color} opacity={0.85} />;
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full" preserveAspectRatio="none">
        {buildArea("discussions", null, "#f59e0b")}
        {buildArea("quizzes", "discussions", "#0ea5e9")}
        {buildArea("lessons", "quizzes", "#6366f1")}
      </svg>
      {/* Legend + X-axis labels */}
      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-dark-300">
          <LegendDot color="#6366f1" label="Lessons" />
          <LegendDot color="#0ea5e9" label="Quizzes" />
          <LegendDot color="#f59e0b" label="Discussions" />
        </div>
      </div>
      <div className="mt-1 flex justify-between px-6 text-[10px] text-gray-400 dark:text-dark-400">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

/** Pie chart (conic-gradient) with legend. */
function PieChart({
  data,
  total,
}: {
  data: { rating: number; count: number; color: string }[];
  total: number;
}) {
  // Build the conic-gradient stops
  let acc = 0;
  const stops: string[] = [];
  data.forEach((d) => {
    const start = (acc / Math.max(total, 1)) * 360;
    acc += d.count;
    const end = (acc / Math.max(total, 1)) * 360;
    stops.push(`${d.color} ${start}deg ${end}deg`);
  });
  const gradient = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="relative size-36 shrink-0 rounded-full"
        style={{ background: gradient }}
        aria-label="Ratings breakdown pie chart"
      >
        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-white dark:bg-dark-750">
          <p className="text-2xl font-bold text-gray-800 dark:text-dark-50">
            {total > 0 ? (data.reduce((s, r) => s + r.rating * r.count, 0) / total).toFixed(1) : "—"}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Avg rating
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {data.map((d) => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          return (
            <div key={d.rating} className="flex items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ background: d.color }}
              />
              <span className="inline-flex w-12 items-center gap-0.5 text-xs font-medium text-gray-700 dark:text-dark-200">
                {d.rating}
                <StarIcon className="size-3 text-amber-400" />
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-600">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: d.color }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-xs text-gray-500 dark:text-dark-300">
                {d.count}
              </span>
              <span className="w-12 shrink-0 text-right text-[11px] text-gray-400 dark:text-dark-400">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AnalyticsScreen;
