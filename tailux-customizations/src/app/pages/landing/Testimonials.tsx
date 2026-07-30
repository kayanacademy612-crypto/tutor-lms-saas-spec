// Testimonials section.
//
// Three testimonial cards with avatar (initials), name, role, quote and
// a 5-star rating row.

// Import Dependencies
import clsx from "clsx";
import { StarIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";

// ----------------------------------------------------------------------

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  /** Optional accent color for the avatar background. */
  tone?: "primary" | "success" | "warning";
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "This platform transformed our academy. We migrated 2,000 students in a weekend and revenue is up 60% year-over-year.",
    name: "Sarah Johnson",
    role: "Director at TechAcademy",
    initials: "SJ",
    tone: "primary",
  },
  {
    quote:
      "The course builder is genuinely the best I've used. I shipped my first cohort in under a week — students love the certificates.",
    name: "Marcus Lee",
    role: "Founder at DevMentor",
    initials: "ML",
    tone: "success",
  },
  {
    quote:
      "We run a multi-tenant bootcamp across three campuses. White-label + isolated data per school was the killer feature for us.",
    name: "Priya Patel",
    role: "COO at SkillForge",
    initials: "PP",
    tone: "warning",
  },
];

const AVATAR_TONES: Record<NonNullable<Testimonial["tone"]>, string> = {
  primary:
    "bg-primary-500/15 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300",
  success:
    "bg-success/15 text-success dark:bg-success/20 dark:text-success-lighter",
  warning:
    "bg-warning/15 text-warning-darker dark:bg-warning/20 dark:text-warning-lighter",
};

// ----------------------------------------------------------------------

export function Testimonials() {
  return (
    <section className="bg-white dark:bg-dark-900">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Testimonials
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-50 sm:text-4xl">
            Loved by educators worldwide
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-dark-200 sm:text-lg">
            Join 500+ schools and 50,000+ students already growing with us.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} skin="bordered" className="p-6">
              {/* Stars */}
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className="size-4 fill-amber-400 stroke-amber-400"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm leading-relaxed text-gray-700 dark:text-dark-100">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-5 flex items-center gap-3 border-t border-gray-100 pt-5 dark:border-dark-600">
                <div
                  className={clsx(
                    "flex size-10 items-center justify-center rounded-full text-sm font-bold",
                    AVATAR_TONES[t.tone ?? "primary"],
                  )}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    {t.role}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Testimonials;
