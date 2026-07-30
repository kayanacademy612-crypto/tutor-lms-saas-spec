// KidsModeScreen — toggle and settings for a kid-friendly experience.
//
// A master `Switch` enables Kids Mode. When enabled, three settings groups
// become editable (content restrictions, simplified UI, parental controls)
// and a live "preview" of the simplified interface renders below. When
// disabled, the settings are dimmed and non-interactive, and the preview
// is hidden.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  SparklesIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  LockClosedIcon,
  ClockIcon,
  StarIcon,
  AcademicCapIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Switch, Input, Select, Badge, Range } from "@/components/ui";

// ----------------------------------------------------------------------

interface KidsSettings {
  enabled: boolean;
  // Content restrictions
  maxDifficulty: "beginner" | "intermediate";
  ageRange: "4-7" | "8-10" | "11-13";
  hideMatureContent: boolean;
  // Simplified UI
  largerText: boolean;
  fewerNavItems: boolean;
  friendlyIcons: boolean;
  // Parental controls
  parentalPin: string;
  weeklyReport: boolean;
  dailyScreenTimeMin: number;
}

const DEFAULT_SETTINGS: KidsSettings = {
  enabled: false,
  maxDifficulty: "beginner",
  ageRange: "8-10",
  hideMatureContent: true,
  largerText: true,
  fewerNavItems: true,
  friendlyIcons: true,
  parentalPin: "",
  weeklyReport: true,
  dailyScreenTimeMin: 60,
};

// ----------------------------------------------------------------------

export function KidsModeScreen() {
  const [settings, setSettings] = useState<KidsSettings>(DEFAULT_SETTINGS);

  function update<K extends keyof KidsSettings>(key: K, value: KidsSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
          Kids Mode
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          A simpler, safer learning experience for younger students.
        </p>
      </header>

      {/* Master toggle card */}
      <Card
        className={clsx(
          "overflow-hidden p-0 transition-colors",
          settings.enabled
            ? "bg-gradient-to-br from-primary-500 to-secondary-500 dark:from-primary-600 dark:to-secondary-600"
            : "",
        )}
      >
        <div className="flex items-center gap-4 p-5">
          <div
            className={clsx(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl",
              settings.enabled
                ? "bg-white/20 text-white"
                : "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
            )}
          >
            <SparklesIcon className="size-7 stroke-2" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className={clsx(
                "text-base font-semibold",
                settings.enabled ? "text-white" : "text-gray-800 dark:text-dark-50",
              )}
            >
              {settings.enabled ? "Kids Mode is ON" : "Turn on Kids Mode"}
            </h2>
            <p
              className={clsx(
                "mt-0.5 text-sm",
                settings.enabled ? "text-white/80" : "text-gray-500 dark:text-dark-300",
              )}
            >
              {settings.enabled
                ? "The dashboard is now simplified and content is filtered."
                : "Simplify the UI, filter content, and add parental controls."}
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onChange={(e) => update("enabled", e.target.checked)}
            color="primary"
            className="shrink-0"
            aria-label="Toggle Kids Mode"
          />
        </div>
      </Card>

      {/* Settings groups */}
      <div
        className={clsx(
          "grid grid-cols-1 gap-4 transition-opacity lg:grid-cols-3",
          !settings.enabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Content restrictions */}
        <Card className="p-5">
          <SectionHeader
            icon={ShieldCheckIcon}
            title="Content restrictions"
            color="success"
          />
          <div className="mt-4 space-y-4">
            <Select
              label="Age range"
              value={settings.ageRange}
              onChange={(e) =>
                update("ageRange", (e.target as HTMLSelectElement).value as KidsSettings["ageRange"])
              }
              data={[
                { label: "Ages 4–7", value: "4-7" },
                { label: "Ages 8–10", value: "8-10" },
                { label: "Ages 11–13", value: "11-13" },
              ]}
              classNames={{ root: "mt-0" }}
            />
            <Select
              label="Max difficulty"
              value={settings.maxDifficulty}
              onChange={(e) =>
                update(
                  "maxDifficulty",
                  (e.target as HTMLSelectElement).value as KidsSettings["maxDifficulty"],
                )
              }
              data={[
                { label: "Beginner only", value: "beginner" },
                { label: "Up to intermediate", value: "intermediate" },
              ]}
              classNames={{ root: "mt-0" }}
            />
            <Switch
              label="Hide mature content"
              checked={settings.hideMatureContent}
              onChange={(e) => update("hideMatureContent", e.target.checked)}
              color="primary"
            />
          </div>
        </Card>

        {/* Simplified UI */}
        <Card className="p-5">
          <SectionHeader
            icon={PaintBrushIcon}
            title="Simplified UI"
            color="primary"
          />
          <div className="mt-4 space-y-3.5">
            <Switch
              label="Larger text & buttons"
              checked={settings.largerText}
              onChange={(e) => update("largerText", e.target.checked)}
              color="primary"
            />
            <Switch
              label="Fewer navigation items"
              checked={settings.fewerNavItems}
              onChange={(e) => update("fewerNavItems", e.target.checked)}
              color="primary"
            />
            <Switch
              label="Friendly, colorful icons"
              checked={settings.friendlyIcons}
              onChange={(e) => update("friendlyIcons", e.target.checked)}
              color="primary"
            />
          </div>
        </Card>

        {/* Parental controls */}
        <Card className="p-5">
          <SectionHeader
            icon={LockClosedIcon}
            title="Parental controls"
            color="warning"
          />
          <div className="mt-4 space-y-4">
            <Input
              label="Parental PIN"
              type="password"
              placeholder="Set a 4-digit PIN"
              maxLength={4}
              value={settings.parentalPin}
              onChange={(e) =>
                update(
                  "parentalPin",
                  (e.target as HTMLInputElement).value.replace(/\D/g, "").slice(0, 4),
                )
              }
              prefix={<LockClosedIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Switch
              label="Weekly progress report"
              checked={settings.weeklyReport}
              onChange={(e) => update("weeklyReport", e.target.checked)}
              color="primary"
            />
            <div>
              <label className="input-label mb-1.5 block text-xs font-medium text-gray-600 dark:text-dark-200">
                Daily screen time: {settings.dailyScreenTimeMin} min
              </label>
              <Range
                min={15}
                max={180}
                step={15}
                value={settings.dailyScreenTimeMin}
                onChange={(e) => update("dailyScreenTimeMin", Number(e.target.value))}
                color="primary"
                className="w-full"
                aria-label="Daily screen time in minutes"
              />
              <div className="mt-1 flex justify-between text-[10px] text-gray-400 dark:text-dark-400">
                <span>15m</span>
                <span>3h</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Preview */}
      {settings.enabled && (
        <KidsPreview settings={settings} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  title,
  color,
}: {
  icon: typeof ShieldCheckIcon;
  title: string;
  color: "success" | "primary" | "warning";
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          "flex size-8 items-center justify-center rounded-lg",
          color === "success" && "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
          color === "primary" && "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
          color === "warning" && "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
        )}
      >
        <Icon className="size-4.5 stroke-2" />
      </div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
        {title}
      </h3>
    </div>
  );
}

// ----------------------------------------------------------------------

/** Live preview of the simplified Kids Mode interface. */
function KidsPreview({ settings }: { settings: KidsSettings }) {
  const big = settings.largerText;

  const navItems = settings.fewerNavItems
    ? [
        { label: "Home", icon: SparklesIcon, color: "bg-pink-500" },
        { label: "Courses", icon: AcademicCapIcon, color: "bg-sky-500" },
        { label: "Calendar", icon: ClockIcon, color: "bg-amber-500" },
      ]
    : [
        { label: "Home", icon: SparklesIcon, color: "bg-pink-500" },
        { label: "Courses", icon: AcademicCapIcon, color: "bg-sky-500" },
        { label: "Notes", icon: StarIcon, color: "bg-violet-500" },
        { label: "Calendar", icon: ClockIcon, color: "bg-amber-500" },
        { label: "Profile", icon: ShieldCheckIcon, color: "bg-emerald-500" },
      ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-pink-500/10 to-sky-500/10 px-5 py-3 dark:border-dark-600">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-5 text-pink-500" />
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Kids Mode Preview
          </h2>
        </div>
        <Badge color="success" variant="soft" className="gap-1 text-[10px]">
          <span className="size-1.5 rounded-full bg-success-500" />
          Live
        </Badge>
      </div>

      <div className="p-5">
        {/* Friendly greeting */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-2 flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-amber-400 text-white shadow-soft">
            <SparklesIcon className="size-8 stroke-2" />
          </div>
          <p
            className={clsx(
              "font-bold text-gray-800 dark:text-dark-50",
              big ? "text-2xl" : "text-lg",
            )}
          >
            Hi, Kiddo! Ready to learn? 🚀
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            You&apos;ve earned 3 stars this week. Awesome!
          </p>
        </div>

        {/* Big colorful nav buttons */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {navItems.map((item) => {
            const Icon = settings.friendlyIcons ? item.icon : AcademicCapIcon;
            return (
              <Button
                key={item.label}
                unstyled
                tabIndex={-1}
                className={clsx(
                  "flex flex-col items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white p-4 text-center transition-transform hover:scale-105 dark:border-dark-600 dark:bg-dark-700",
                )}
              >
                <span
                  className={clsx(
                    "flex items-center justify-center rounded-xl text-white",
                    settings.friendlyIcons ? item.color : "bg-gray-400",
                    big ? "size-14" : "size-12",
                  )}
                >
                  <Icon className={big ? "size-8 stroke-2" : "size-6 stroke-2"} />
                </span>
                <span
                  className={clsx(
                    "font-semibold text-gray-700 dark:text-dark-100",
                    big ? "text-base" : "text-sm",
                  )}
                >
                  {item.label}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Featured course card */}
        <div className="mt-5 rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white">
              <AcademicCapIcon className="size-6 stroke-2" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={clsx("font-bold text-gray-800 dark:text-dark-50", big ? "text-lg" : "text-base")}>
                Coding with Robots 🤖
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                3 of 8 lessons · 2⭐ earned
              </p>
            </div>
            <Button color="primary" className="gap-1.5 text-sm">
              <CheckIcon className="size-4 stroke-2" />
              Continue
            </Button>
          </div>
        </div>

        {/* Stars row */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <StarIcon
              key={n}
              className={clsx(
                "stroke-2",
                n <= 3
                  ? "fill-amber-400 text-amber-400"
                  : "fill-gray-200 text-gray-300 dark:fill-dark-600 dark:text-dark-500",
                big ? "size-7" : "size-5",
              )}
            />
          ))}
        </div>

        <p className="mt-3 text-center text-xs text-gray-400 dark:text-dark-400">
          {settings.dailyScreenTimeMin} min left for today ·{" "}
          <span className="inline-flex items-center gap-0.5 font-medium text-primary-600 dark:text-primary-400">
            Parent zone <ArrowRightIcon className="size-3" />
          </span>
        </p>
      </div>
    </Card>
  );
}

export default KidsModeScreen;
