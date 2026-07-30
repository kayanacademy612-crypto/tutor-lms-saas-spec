// Storefront hero section.
//
// Big marketing headline + subheadline + primary CTA. Rendered full-width
// inside the storefront page (no sidebar). Uses a primary-tinted gradient
// background with a subtle dot pattern overlay for visual interest.

// Import Dependencies
import { useNavigate } from "react-router";
import {
  ArrowRightIcon,
  PlayCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface HeroProps {
  /** Optional headline override (defaults to marketing copy). */
  headline?: string;
  /** Optional subheadline override. */
  subheadline?: string;
  /** Render a "Browse Courses" CTA that pushes to /apps/catalog. */
  onBrowseCourses?: () => void;
}

const DEFAULT_HEADLINE = "Learn skills that move your career forward";
const DEFAULT_SUBHEADLINE =
  " expert-led courses on modern development, design, data, and marketing — built for makers, by makers.";

/**
 * Full-width marketing hero for the storefront.
 *
 * Layout: centered headline + subheadline + two CTAs ("Browse Courses"
 * primary, "Watch demo" ghost). Sits on a primary-tinged gradient panel
 * with a faint dot pattern.
 */
export function Hero({
  headline = DEFAULT_HEADLINE,
  subheadline = DEFAULT_SUBHEADLINE,
  onBrowseCourses,
}: HeroProps) {
  const navigate = useNavigate();
  const handleBrowse = onBrowseCourses ?? (() => navigate("/apps/catalog"));

  return (
    <section className="relative overflow-hidden bg-white dark:bg-dark-750">
      {/* Gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-500/10 via-white to-secondary-500/10 dark:from-primary-500/15 dark:via-dark-750 dark:to-secondary-500/10"
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

      <div className="relative mx-auto max-w-5xl px-6 py-20 text-center sm:py-28">
        {/* Eyebrow */}
        <div className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
          <SparklesIcon className="size-3.5 stroke-2" />
          New courses dropping every week
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-dark-50 sm:text-5xl md:text-6xl">
          {headline}
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-dark-200 sm:text-lg">
          {subheadline}
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            color="primary"
            variant="filled"
            className="gap-2 px-6 py-3 text-sm font-semibold shadow-lg shadow-primary-500/20"
            onClick={handleBrowse}
          >
            Browse Courses
            <ArrowRightIcon className="size-4 stroke-2" />
          </Button>
          <Button
            color="neutral"
            variant="soft"
            className="gap-2 px-5 py-3 text-sm font-semibold"
            onClick={() => navigate("/apps/catalog")}
          >
            <PlayCircleIcon className="size-5 stroke-2 text-primary-600 dark:text-primary-400" />
            Watch demo
          </Button>
        </div>

        {/* Trust line */}
        <p className="mt-8 text-xs text-gray-400 dark:text-dark-400">
          No credit card required · 30-day money-back guarantee · Cancel anytime
        </p>
      </div>
    </section>
  );
}

export default Hero;
