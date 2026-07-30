// How it works section.
//
// Three numbered step cards arranged horizontally with connecting line.
// Each card has a circular number badge, an icon, a title, and a short
// description.

// Import Dependencies
import { ComponentType } from "react";
import {
  ArrowLeftStartOnRectangleIcon,
  SquaresPlusIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

interface Step {
  icon: ComponentType<{ className?: string }>;
  step: number;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: ArrowLeftStartOnRectangleIcon,
    step: 1,
    title: "Sign Up",
    description: "Create your school account in 30 seconds — no credit card required.",
  },
  {
    icon: SquaresPlusIcon,
    step: 2,
    title: "Create Courses",
    description:
      "Build your curriculum with our drag-and-drop course builder.",
  },
  {
    icon: BanknotesIcon,
    step: 3,
    title: "Start Earning",
    description: "Accept payments and enroll students instantly with Stripe or PayPal.",
  },
];

// ----------------------------------------------------------------------

export function HowItWorks() {
  return (
    <section className="bg-gray-50 dark:bg-dark-800">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            How It Works
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-50 sm:text-4xl">
            Launch in three simple steps
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-dark-200 sm:text-lg">
            From zero to a fully-functional online academy in under an hour.
          </p>
        </div>

        {/* Steps */}
        <div className="relative mt-16">
          {/* Connector line (desktop only) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-8 hidden h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200 dark:from-primary-500/30 dark:via-primary-500/50 dark:to-primary-500/30 md:block"
          />

          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step badge */}
                  <div className="relative z-10 flex size-16 items-center justify-center rounded-full bg-white shadow-soft ring-1 ring-primary-200 dark:bg-dark-700 dark:ring-primary-500/40">
                    <Icon className="size-7 stroke-2 text-primary-600 dark:text-primary-400" />
                    <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white shadow dark:bg-primary-500">
                      {s.step}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-gray-900 dark:text-dark-50">
                    {s.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
