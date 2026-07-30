// Features grid section.
//
// Six feature cards with icons (heroicons). Each card has a colored icon
// tile, a title, and a short description. Cards use the bordered Card
// skin for a clean, airy look.

// Import Dependencies
import { ComponentType } from "react";
import {
  SquaresPlusIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  UsersIcon,
  PresentationChartBarIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

// Local Imports
import { Card } from "@/components/ui";

// ----------------------------------------------------------------------

type FeatureColor =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "error";

interface Feature {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: FeatureColor;
}

const FEATURES: Feature[] = [
  {
    icon: SquaresPlusIcon,
    title: "Course Builder",
    description:
      "Drag-and-drop course creation with video, quizzes, and assignments.",
    color: "primary",
  },
  {
    icon: BanknotesIcon,
    title: "eCommerce Built-in",
    description:
      "Sell courses with Stripe/PayPal. Cart, checkout, coupons, subscriptions.",
    color: "success",
  },
  {
    icon: CheckBadgeIcon,
    title: "Certificates",
    description:
      "Visual certificate builder. Auto-issue on completion. PDF download.",
    color: "warning",
  },
  {
    icon: UsersIcon,
    title: "Student Management",
    description:
      "Track progress, grade assignments, manage enrollments in one place.",
    color: "info",
  },
  {
    icon: PresentationChartBarIcon,
    title: "Analytics & Reports",
    description:
      "Revenue, enrollment, completion reports. CSV export for accounting.",
    color: "secondary",
  },
  {
    icon: BuildingOffice2Icon,
    title: "Multi-Tenant",
    description:
      "Each school gets isolated data. White-label branding available.",
    color: "error",
  },
];

// Map feature color -> tailux utility classes for the icon tile.
const COLOR_TILES: Record<FeatureColor, string> = {
  primary:
    "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
  secondary:
    "bg-secondary/10 text-secondary-darker dark:bg-secondary/15 dark:text-secondary-lighter",
  success:
    "bg-success/10 text-success dark:bg-success/15 dark:text-success-lighter",
  info: "bg-info/10 text-info dark:bg-info/15 dark:text-info-lighter",
  warning:
    "bg-warning/10 text-warning-darker dark:bg-warning/15 dark:text-warning-lighter",
  error: "bg-error/10 text-error dark:bg-error/15 dark:text-error-lighter",
};

// ----------------------------------------------------------------------

export function FeaturesGrid() {
  return (
    <section className="bg-white dark:bg-dark-900">
      <div className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        {/* Section heading */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Features
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-50 sm:text-4xl">
            Everything you need to run your academy
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-dark-200 sm:text-lg">
            One platform replaces a dozen tools — course creation, payments,
            certificates, analytics, and more. Built for educators who want to
            focus on teaching, not stitching together software.
          </p>
        </div>

        {/* Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                skin="bordered"
                className={clsx(
                  "group p-6 transition-all duration-200",
                  "hover:-translate-y-1 hover:border-primary-300 hover:shadow-soft",
                  "dark:hover:border-primary-500/40",
                )}
              >
                <div
                  className={clsx(
                    "flex size-12 items-center justify-center rounded-xl",
                    COLOR_TILES[f.color],
                  )}
                >
                  <Icon className="size-6 stroke-2" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-dark-50">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                  {f.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturesGrid;
