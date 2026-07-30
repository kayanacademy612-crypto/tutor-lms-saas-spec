// Feature showcase section.
//
// Tabbed interface that swaps between four product "screenshots" —
// Dashboard, Course Builder, eCommerce, Certificates. Each screenshot
// is a stylised mockup built from divs (no real images required). The
// section has id="feature-showcase" so the Hero "Watch Demo" button can
// smooth-scroll to it.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  Squares2X2Icon,
  SquaresPlusIcon,
  BanknotesIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

type TabId = "dashboard" | "course-builder" | "ecommerce" | "certificates";

interface Tab {
  id: TabId;
  label: string;
  icon: typeof Squares2X2Icon;
}

const TABS: Tab[] = [
  { id: "dashboard", label: "Dashboard", icon: Squares2X2Icon },
  { id: "course-builder", label: "Course Builder", icon: SquaresPlusIcon },
  { id: "ecommerce", label: "eCommerce", icon: BanknotesIcon },
  { id: "certificates", label: "Certificates", icon: CheckBadgeIcon },
];

// ----------------------------------------------------------------------

export function FeatureShowcase() {
  const [active, setActive] = useState<TabId>("dashboard");

  return (
    <section
      id="feature-showcase"
      className="scroll-mt-16 bg-white dark:bg-dark-900"
    >
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Product Tour
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-50 sm:text-4xl">
            See the platform in action
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-dark-200 sm:text-lg">
            Click through the tabs to preview the core surfaces you'll use
            every day.
          </p>
        </div>

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary-600 text-white shadow-soft dark:bg-primary-500"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-100 dark:hover:bg-dark-600",
                )}
              >
                <Icon className="size-4 stroke-2" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Mockup frame */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-dark-600 dark:bg-dark-750">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-600 dark:bg-dark-800">
            <span className="size-3 rounded-full bg-error" />
            <span className="size-3 rounded-full bg-warning" />
            <span className="size-3 rounded-full bg-success" />
            <div className="ml-3 flex-1">
              <div className="mx-auto h-5 max-w-md rounded-full bg-gray-200 dark:bg-dark-600" />
            </div>
          </div>

          {/* Active mockup */}
          <div className="bg-gray-50 p-6 dark:bg-dark-800 sm:p-10">
            {active === "dashboard" && <DashboardMockup />}
            {active === "course-builder" && <CourseBuilderMockup />}
            {active === "ecommerce" && <EcommerceMockup />}
            {active === "certificates" && <CertificateMockup />}
          </div>
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------

// Reusable building blocks --------------------------------------------------

function MockCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-700",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Bar({ w, h = "h-2" }: { w: string; h?: string }) {
  return (
    <div
      className={clsx(
        w,
        h,
        "rounded-full bg-gray-200 dark:bg-dark-600",
      )}
    />
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "primary";
}) {
  const tones: Record<string, string> = {
    neutral:
      "bg-gray-100 text-gray-600 dark:bg-dark-600 dark:text-dark-100",
    success:
      "bg-success/10 text-success dark:text-success-lighter",
    warning:
      "bg-warning/10 text-warning-darker dark:text-warning-lighter",
    primary:
      "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

// ----------------------------------------------------------------------

function DashboardMockup() {
  return (
    <div className="space-y-4">
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bar w="w-40" h="h-3" />
          <Bar w="w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="success">+18% MoM</Pill>
          <div className="size-8 rounded-full bg-primary-500/15" />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Revenue", value: "$48,250", tone: "success" as const },
          { label: "Students", value: "1,284", tone: "primary" as const },
          { label: "Enrollments", value: "3,419", tone: "neutral" as const },
          { label: "Completion", value: "82%", tone: "warning" as const },
        ].map((s) => (
          <MockCard key={s.label}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
                {s.label}
              </span>
              <Pill tone={s.tone}>•</Pill>
            </div>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-dark-50">
              {s.value}
            </p>
          </MockCard>
        ))}
      </div>

      {/* Chart + side panel */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MockCard className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Bar w="w-32" />
            <Bar w="w-16" />
          </div>
          <div className="flex h-32 items-end gap-1.5">
            {[40, 65, 45, 80, 55, 95, 70, 100, 60, 85, 50, 75].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-to-t from-primary-500 to-primary-400"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </MockCard>
        <MockCard>
          <Bar w="w-24" h="h-3" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="size-6 rounded-full bg-gradient-to-br from-primary-500/30 to-secondary/30" />
                <div className="flex-1 space-y-1.5">
                  <Bar w="w-3/4" />
                  <Bar w="w-1/2" h="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </MockCard>
      </div>
    </div>
  );
}

function CourseBuilderMockup() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
      {/* Sidebar — modules */}
      <MockCard className="lg:col-span-1">
        <Bar w="w-20" h="h-3" />
        <div className="mt-4 space-y-2">
          {["Introduction", "Module 1: Basics", "Module 2: Advanced", "Module 3: Project", "Final Exam"].map(
            (mod, i) => (
              <div
                key={mod}
                className={clsx(
                  "rounded-lg px-2.5 py-2 text-xs font-medium",
                  i === 1
                    ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                    : "text-gray-600 dark:text-dark-200",
                )}
              >
                {mod}
              </div>
            ),
          )}
        </div>
      </MockCard>

      {/* Main — lesson editor */}
      <MockCard className="lg:col-span-3">
        <div className="flex items-center justify-between">
          <Bar w="w-40" h="h-3" />
          <div className="flex items-center gap-2">
            <Pill tone="primary">Draft</Pill>
            <span className="rounded-md bg-primary-600 px-3 py-1 text-[10px] font-bold text-white">
              Publish
            </span>
          </div>
        </div>

        {/* Video block */}
        <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500/15 to-secondary/15 dark:from-primary-500/20 dark:to-secondary/20">
          <span className="flex size-12 items-center justify-center rounded-full bg-white text-primary-600 shadow-soft dark:bg-dark-700 dark:text-primary-400">
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>

        {/* Lesson list */}
        <div className="mt-4 space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 px-3 py-2 dark:border-dark-600"
            >
              <span className="size-5 rounded bg-gray-200 dark:bg-dark-600" />
              <Bar w="w-1/2" />
              <Bar w="w-16" h="h-1.5" />
              <span className="ml-auto">
                <Pill tone="neutral">5 min</Pill>
              </span>
            </div>
          ))}
        </div>
      </MockCard>
    </div>
  );
}

function EcommerceMockup() {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      {/* Product grid */}
      <div className="space-y-3 lg:col-span-3">
        <div className="flex items-center justify-between">
          <Bar w="w-32" h="h-3" />
          <Bar w="w-20" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <MockCard key={i}>
              <div className="h-20 rounded-lg bg-gradient-to-br from-primary-500/15 to-secondary/15 dark:from-primary-500/20 dark:to-secondary/20" />
              <div className="mt-3 space-y-1.5">
                <Bar w="w-3/4" />
                <Bar w="w-1/2" h="h-1.5" />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900 dark:text-dark-50">
                  ${(i + 1) * 49}.00
                </span>
                <Pill tone="primary">Add to cart</Pill>
              </div>
            </MockCard>
          ))}
        </div>
      </div>

      {/* Cart */}
      <MockCard className="lg:col-span-2">
        <Bar w="w-20" h="h-3" />
        <div className="mt-4 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="size-10 rounded-lg bg-gray-200 dark:bg-dark-600" />
              <div className="flex-1 space-y-1.5">
                <Bar w="w-3/4" />
                <Bar w="w-1/2" h="h-1.5" />
              </div>
              <span className="text-xs font-bold text-gray-900 dark:text-dark-50">
                $99.00
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-5 space-y-2 border-t border-gray-200 pt-4 dark:border-dark-600">
          <div className="flex justify-between text-xs text-gray-500 dark:text-dark-300">
            <span>Subtotal</span>
            <span className="font-medium text-gray-900 dark:text-dark-50">$198.00</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-dark-300">
            <span>Tax (8%)</span>
            <span className="font-medium text-gray-900 dark:text-dark-50">$15.84</span>
          </div>
          <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-dark-600">
            <span className="text-sm font-bold text-gray-900 dark:text-dark-50">Total</span>
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">$213.84</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-primary-600 py-2 text-center text-xs font-bold text-white">
          Checkout
        </div>
      </MockCard>
    </div>
  );
}

function CertificateMockup() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-xl border-2 border-primary-300 bg-gradient-to-br from-primary-50 to-secondary/5 p-8 dark:border-primary-500/40 dark:from-dark-700 dark:to-dark-750">
        {/* Corner ornaments */}
        <div className="absolute left-2 top-2 size-6 border-l-2 border-t-2 border-primary-400 dark:border-primary-500/60" />
        <div className="absolute right-2 top-2 size-6 border-r-2 border-t-2 border-primary-400 dark:border-primary-500/60" />
        <div className="absolute bottom-2 left-2 size-6 border-b-2 border-l-2 border-primary-400 dark:border-primary-500/60" />
        <div className="absolute bottom-2 right-2 size-6 border-b-2 border-r-2 border-primary-400 dark:border-primary-500/60" />

        <div className="text-center">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-primary-600 text-white">
            <CheckBadgeIcon className="size-6 stroke-2" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">
            Certificate of Completion
          </p>
          <p className="mt-3 text-xs text-gray-500 dark:text-dark-300">
            This certifies that
          </p>
          <p className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-dark-50">
            Jane Doe
          </p>
          <p className="mt-2 text-xs text-gray-500 dark:text-dark-300">
            has successfully completed
          </p>
          <p className="mt-1 text-lg font-bold text-gray-900 dark:text-dark-50">
            Advanced React &amp; TypeScript
          </p>

          <div className="mt-6 flex items-center justify-between text-[10px] text-gray-500 dark:text-dark-300">
            <div className="text-left">
              <p className="font-bold text-gray-700 dark:text-dark-100">Date</p>
              <p>Jan 15, 2026</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-700 dark:text-dark-100">Instructor</p>
              <p>Dr. Alex Kim</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Pill tone="success">Auto-issued on completion</Pill>
        <Pill tone="primary">PDF download</Pill>
        <Pill tone="neutral">Verifiable link</Pill>
      </div>
    </div>
  );
}

export default FeatureShowcase;
