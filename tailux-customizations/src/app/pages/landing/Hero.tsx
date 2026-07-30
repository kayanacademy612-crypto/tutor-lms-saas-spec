// Landing page hero section.
//
// Big marketing headline + subheadline + two CTAs ("Start Free Trial"
// primary, "Watch Demo" ghost that scrolls to the demo section). Right
// side shows a stylised dashboard mockup built from divs.
//
// Auth-aware: when the user is already authenticated, the primary CTA
// becomes "Go to Dashboard" and routes to the user's role-specific
// dashboard (student → /apps/student-dashboard, instructor →
// /apps/instructor-dashboard, admin/owner → /apps/reports-dashboard)
// instead of /signup.

// Import Dependencies
import { useNavigate } from "react-router";
import {
  ArrowRightIcon,
  PlayCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

export function Hero() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthContext();

  const roleDashboard = (() => {
    switch (user?.role) {
      case "instructor":
        return "/apps/instructor-dashboard";
      case "admin":
      case "owner":
        return "/apps/reports-dashboard";
      case "student":
      default:
        return "/apps/student-dashboard";
    }
  })();

  const primaryCtaLabel = isAuthenticated ? "Go to Dashboard" : "Start Free Trial";
  const primaryCtaHref = isAuthenticated ? roleDashboard : "/signup";

  const handlePrimary = () => navigate(primaryCtaHref);

  const handleWatchDemo = () => {
    const el = document.getElementById("feature-showcase");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden bg-white dark:bg-dark-900">
      {/* Gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/10 via-white to-secondary-500/10 dark:from-primary-500/15 dark:via-dark-900 dark:to-secondary-500/10"
      />
      {/* Dot pattern overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(99,102,241,0.55) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-20 sm:py-24 lg:grid-cols-2 lg:py-32">
        {/* Left column — copy */}
        <div className="text-center lg:text-left">
          {/* Eyebrow */}
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
            <SparklesIcon className="size-3.5 stroke-2" />
            All-in-one LMS for modern educators
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-dark-50 sm:text-5xl lg:text-6xl">
            Launch Your Online Academy in{" "}
            <span className="bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent dark:from-primary-400 dark:to-primary-300">
              Minutes
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-600 dark:text-dark-200 sm:text-lg lg:mx-0">
            The all-in-one LMS platform for schools, instructors, and creators.
            Create courses, accept payments, issue certificates, and grow your
            education business.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <Button
              color="primary"
              variant="filled"
              isGlow
              className="gap-2 px-6 py-3 text-sm font-semibold"
              onClick={handlePrimary}
            >
              {primaryCtaLabel}
              <ArrowRightIcon className="size-4 stroke-2" />
            </Button>
            <Button
              color="neutral"
              variant="soft"
              className="gap-2 px-5 py-3 text-sm font-semibold"
              onClick={handleWatchDemo}
            >
              <PlayCircleIcon className="size-5 stroke-2 text-primary-600 dark:text-primary-400" />
              Watch Demo
            </Button>
          </div>

          {/* Trust line */}
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-dark-300 lg:justify-start">
            <li className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4 stroke-2 text-success" />
              14-day free trial
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4 stroke-2 text-success" />
              No credit card required
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4 stroke-2 text-success" />
              Cancel anytime
            </li>
          </ul>
        </div>

        {/* Right column — dashboard mockup */}
        <div className="relative">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------------

/** A stylised product dashboard mockup built purely from divs/spans. */
function DashboardMockup() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Glow halo */}
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary-500/30 to-secondary-500/30 blur-2xl"
      />

      {/* Browser chrome */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-primary-500/10 dark:border-dark-600 dark:bg-dark-750 dark:shadow-black/30">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-dark-600 dark:bg-dark-800">
          <span className="size-3 rounded-full bg-error" />
          <span className="size-3 rounded-full bg-warning" />
          <span className="size-3 rounded-full bg-success" />
          <div className="ml-3 flex-1">
            <div className="mx-auto h-5 w-3/4 rounded-full bg-gray-200 dark:bg-dark-600" />
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-4 w-32 rounded-full bg-gray-300 dark:bg-dark-500" />
              <div className="mt-2 h-2.5 w-24 rounded-full bg-gray-200 dark:bg-dark-600" />
            </div>
            <div className="size-8 rounded-full bg-primary-500/15" />
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Students", value: "1,284", color: "bg-primary-500" },
              { label: "Revenue", value: "$48k", color: "bg-success" },
              { label: "Courses", value: "37", color: "bg-secondary" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-700"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${stat.color}`} />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    {stat.label}
                  </span>
                </div>
                <p className="mt-1.5 text-lg font-bold text-gray-900 dark:text-dark-50">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Chart mock */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-700">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-3 w-20 rounded-full bg-gray-200 dark:bg-dark-600" />
              <div className="h-3 w-10 rounded-full bg-gray-200 dark:bg-dark-600" />
            </div>
            <div className="flex h-24 items-end gap-1.5">
              {[40, 65, 45, 80, 55, 95, 70, 100, 60, 85, 50, 75].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-gradient-to-t from-primary-500 to-primary-400"
                    style={{ height: `${h}%` }}
                  />
                ),
              )}
            </div>
          </div>

          {/* List mock */}
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 dark:border-dark-600 dark:bg-dark-700"
              >
                <span className="size-7 rounded-full bg-gradient-to-br from-primary-500/30 to-secondary-500/30" />
                <div className="flex-1">
                  <div className="h-2.5 w-3/4 rounded-full bg-gray-200 dark:bg-dark-600" />
                  <div className="mt-1.5 h-2 w-1/2 rounded-full bg-gray-200 dark:bg-dark-600" />
                </div>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success dark:text-success-lighter">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-4 -left-4 hidden rotate-3 rounded-xl border border-gray-200 bg-white p-3 shadow-xl dark:border-dark-600 dark:bg-dark-700 sm:block">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-success/15 text-success dark:text-success-lighter">
            <CheckCircleIcon className="size-5 stroke-2" />
          </span>
          <div>
            <p className="text-xs font-bold text-gray-900 dark:text-dark-50">
              +24% this month
            </p>
            <p className="text-[10px] text-gray-500 dark:text-dark-300">
              vs last month
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
