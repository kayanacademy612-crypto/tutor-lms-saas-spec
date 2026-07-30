// Pricing section.
//
// Three tiers (Starter / Professional / Enterprise) with the middle one
// highlighted as "Most Popular". Each tier has a price, feature list, and
// a "Start Free Trial" CTA (or "Go to Dashboard" if the user is already
// authenticated). A note below the cards states the trial terms.

// Import Dependencies
import { useNavigate } from "react-router";
import clsx from "clsx";
import { CheckIcon, SparklesIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

interface Plan {
  id: "starter" | "professional" | "enterprise";
  name: string;
  price: number;
  blurb: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    blurb: "Perfect for solo instructors and small bootcamps just getting started.",
    features: [
      "1 instructor account",
      "Up to 100 students",
      "5 published courses",
      "Stripe checkout",
      "Email support",
    ],
    cta: "Start Free Trial",
  },
  {
    id: "professional",
    name: "Professional",
    price: 99,
    blurb: "For growing academies that need more seats, courses, and analytics.",
    features: [
      "5 instructor accounts",
      "Up to 500 students",
      "Unlimited courses",
      "Stripe + PayPal",
      "Certificates & analytics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    blurb: "For large institutions that need full control, SSO, and white-label.",
    features: [
      "Unlimited instructors",
      "Unlimited students",
      "Unlimited courses",
      "All payment gateways",
      "White-label branding",
      "SSO & SAML",
      "Dedicated account manager",
    ],
    cta: "Start Free Trial",
  },
];

// ----------------------------------------------------------------------

export function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthContext();

  const handleCta = () => {
    if (isAuthenticated) {
      // Send the authenticated user to their role-specific dashboard.
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
      navigate(roleDashboard);
    } else {
      navigate("/signup");
    }
  };

  const ctaLabel = isAuthenticated ? "Go to Dashboard" : "Start Free Trial";

  return (
    <section id="pricing" className="scroll-mt-16 bg-gray-50 dark:bg-dark-800">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-50 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-dark-200 sm:text-lg">
            Start free for 14 days — no credit card required. Upgrade or cancel
            anytime.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={clsx(
                "relative flex flex-col rounded-2xl border p-7 transition-all",
                plan.highlighted
                  ? "border-primary-500 bg-white shadow-2xl shadow-primary-500/10 lg:-translate-y-3 dark:bg-dark-700"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-soft dark:border-dark-600 dark:bg-dark-750 dark:hover:border-dark-450",
              )}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg dark:bg-primary-500">
                  <SparklesIcon className="size-3.5 stroke-2" />
                  Most Popular
                </div>
              )}

              {/* Plan name */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-50">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
                {plan.blurb}
              </p>

              {/* Price */}
              <div className="mt-5 flex items-baseline">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-dark-50">
                  ${plan.price}
                </span>
                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-dark-300">
                  /month
                </span>
              </div>

              {/* CTA */}
              <Button
                color={plan.highlighted ? "primary" : "neutral"}
                variant={plan.highlighted ? "filled" : "outlined"}
                isGlow={plan.highlighted}
                className="mt-6 w-full py-2.5 text-sm font-semibold"
                onClick={handleCta}
              >
                {ctaLabel}
              </Button>

              {/* Features */}
              <ul className="mt-7 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-gray-700 dark:text-dark-100"
                  >
                    <CheckIcon
                      className={clsx(
                        "mt-0.5 size-4 shrink-0 stroke-2",
                        plan.highlighted
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-success",
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Trial note */}
        <p className="mt-10 text-center text-xs text-gray-500 dark:text-dark-300">
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </section>
  );
}

export default Pricing;
