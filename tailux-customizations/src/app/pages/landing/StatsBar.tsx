// Social proof / stats bar.
//
// Four animated counters (count-up) showing platform metrics. Uses a
// lightweight IntersectionObserver-triggered count-up effect, so it
// works without pulling in any animation library.

// Import Dependencies
import { useEffect, useRef, useState } from "react";
import { UsersIcon, AcademicCapIcon, PlayCircleIcon, StarIcon } from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

interface StatItem {
  icon: typeof UsersIcon;
  /** Target value to count up to. */
  value: number;
  /** Suffix appended after the number (e.g. "+", "/5"). */
  suffix: string;
  label: string;
}

const STATS: StatItem[] = [
  { icon: AcademicCapIcon, value: 500, suffix: "+", label: "Schools" },
  { icon: UsersIcon, value: 50000, suffix: "+", label: "Students" },
  { icon: PlayCircleIcon, value: 1, suffix: "M+", label: "Lessons Completed" },
  { icon: StarIcon, value: 4.9, suffix: "/5", label: "Average Rating" },
];

// ----------------------------------------------------------------------

/** Hook: count up to `target` once the element is in view. */
function useCountUp(target: number, durationMs = 1500) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isFloat = !Number.isInteger(target);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / durationMs, 1);
              // easeOutCubic
              const eased = 1 - Math.pow(1 - progress, 3);
              const next = target * eased;
              setValue(isFloat ? Math.round(next * 10) / 10 : Math.round(next));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, durationMs]);

  return { value, ref };
}

// ----------------------------------------------------------------------

function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;
  const { value, ref } = useCountUp(stat.value);
  const isFloat = !Number.isInteger(stat.value);
  const formatted = isFloat
    ? value.toFixed(1)
    : value.toLocaleString("en-US");

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center sm:flex-row sm:items-center sm:gap-4 sm:text-left">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
        <Icon className="size-6 stroke-2" />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-dark-50 sm:text-3xl">
          <span ref={ref}>
            {formatted}
            {stat.suffix}
          </span>
        </p>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
          {stat.label}
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

export function StatsBar() {
  return (
    <section className="border-y border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-gray-200 dark:sm:divide-dark-600">
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </section>
  );
}

export default StatsBar;
