// PlatformSelector — platform-picker card grid for the migration wizard.
//
// Renders one card per supported `MigrationPlatform` with an icon, label, and
// short description. The currently-selected platform is highlighted and the
// rest are clickable. Backed by the static `PLATFORMS` map so the wizard's
// step-1 view stays simple.

// Import Dependencies
import clsx from "clsx";
import {
  ArrowUpTrayIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  CubeTransparentIcon,
  ArrowPathIcon,
  CircleStackIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType } from "react";

// Local Imports
import type { MigrationPlatform } from "@/types/lms";

// ----------------------------------------------------------------------

interface PlatformMeta {
  id: MigrationPlatform;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  description: string;
  kind: "mysql" | "api" | "csv";
}

const PLATFORMS: PlatformMeta[] = [
  {
    id: "learndash",
    label: "LearnDash",
    Icon: CubeTransparentIcon,
    description: "Import courses, lessons, and quizzes from a LearnDash WordPress site via direct MySQL access.",
    kind: "mysql",
  },
  {
    id: "lifterlms",
    label: "LifterLMS",
    Icon: GlobeAltIcon,
    description: "Migrate LifterLMS courses and student progress from a WordPress MySQL database.",
    kind: "mysql",
  },
  {
    id: "learnpress",
    label: "LearnPress",
    Icon: CircleStackIcon,
    description: "Import LearnPress courses, lessons, and orders from a WordPress MySQL database.",
    kind: "mysql",
  },
  {
    id: "woocommerce",
    label: "WooCommerce",
    Icon: ShoppingBagIcon,
    description: "Migrate WooCommerce products, orders, and customers from a WordPress MySQL database.",
    kind: "mysql",
  },
  {
    id: "tutor_lms",
    label: "Tutor LMS",
    Icon: ArrowPathIcon,
    description: "Connect to a Tutor LMS REST API endpoint to import courses and student data.",
    kind: "api",
  },
  {
    id: "csv",
    label: "CSV Import",
    Icon: ArrowUpTrayIcon,
    description: "Upload a CSV file (or supply a URL) to bulk-import courses, lessons, or students.",
    kind: "csv",
  },
];

// ----------------------------------------------------------------------

export interface PlatformSelectorProps {
  selected: MigrationPlatform | null;
  onSelect: (platform: MigrationPlatform) => void;
}

export function PlatformSelector({ selected, onSelect }: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.map((p) => {
        const active = selected === p.id;
        const Icon = p.Icon;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={clsx(
              "group flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
              active
                ? "border-primary-500 bg-primary-50 shadow-sm dark:border-primary-500 dark:bg-primary-500/10"
                : "border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50 dark:border-dark-500 dark:bg-dark-700 dark:hover:border-primary-500/40 dark:hover:bg-dark-650",
            )}
          >
            <div
              className={clsx(
                "flex size-10 items-center justify-center rounded-lg",
                active
                  ? "bg-primary-500 text-white"
                  : "bg-gray-100 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-dark-600 dark:text-dark-200 dark:group-hover:bg-primary-500/15 dark:group-hover:text-primary-400",
              )}
            >
              <Icon className="size-5 stroke-2" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                {p.label}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-dark-300">
                {p.description}
              </p>
            </div>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                active
                  ? "bg-primary-500/20 text-primary-700 dark:bg-primary-500/25 dark:text-primary-300"
                  : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300",
              )}
            >
              {p.kind === "mysql" && "MySQL"}
              {p.kind === "api" && "API"}
              {p.kind === "csv" && "CSV"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default PlatformSelector;

/** Exported so the wizard's review step can look up a friendly label. */
export function getPlatformLabel(id: MigrationPlatform): string {
  return PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

/** Exported so `SourceConfigForm` knows which form variant to render. */
export function getPlatformKind(id: MigrationPlatform): PlatformMeta["kind"] {
  return PLATFORMS.find((p) => p.id === id)?.kind ?? "mysql";
}
