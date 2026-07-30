// Final CTA section.
//
// Big centered gradient card urging the visitor to start their free
// trial. Auth-aware: shows "Go to Dashboard" instead of "Start Free
// Trial" when the user is already authenticated.

// Import Dependencies
import { useNavigate } from "react-router";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

export function FinalCTA() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthContext();

  const label = isAuthenticated ? "Go to Dashboard" : "Start Free Trial";
  const href = (() => {
    if (!isAuthenticated) return "/signup";
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

  return (
    <section className="bg-white px-6 py-20 dark:bg-dark-900 sm:py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-700 px-6 py-16 shadow-2xl shadow-primary-500/20 dark:from-primary-600 dark:to-primary-800 sm:px-12 sm:py-20">
        {/* Decorative dot pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-secondary/20 blur-3xl"
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
            <SparklesIcon className="size-3.5 stroke-2" />
            Get started today
          </div>

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            Ready to Launch Your Academy?
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Join 500+ schools already growing with Tailux. Your first 14 days
            are free — set up in minutes, no credit card required.
          </p>

          <Button
            color="neutral"
            variant="filled"
            isGlow
            className="mt-8 gap-2 bg-white px-7 py-3 text-sm font-bold text-primary-700 hover:bg-white/90 dark:bg-white dark:text-primary-700 dark:hover:bg-white/90"
            onClick={() => navigate(href)}
          >
            {label}
            <ArrowRightIcon className="size-4 stroke-2" />
          </Button>

          {/* Trust bullets */}
          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/80">
            <li className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4 stroke-2" />
              No credit card required
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4 stroke-2" />
              14-day free trial
            </li>
            <li className="inline-flex items-center gap-1.5">
              <CheckCircleIcon className="size-4 stroke-2" />
              Cancel anytime
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

export default FinalCTA;
