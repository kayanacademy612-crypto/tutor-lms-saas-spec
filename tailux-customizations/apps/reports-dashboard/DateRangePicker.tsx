// DateRangePicker — shared from/to date picker with quick presets.
//
// Lightweight component (no date library) used by every Reports tab. Renders
// two native `<input type="date">` controls plus a row of preset chips
// (Last 7 days, Last 30 days, … All Time) that compute the matching `from`/
// `to` ISO date strings and call `onChange`.

// Import Dependencies
import { useCallback, useMemo } from "react";
import clsx from "clsx";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface DateRangePickerProps {
  /** ISO date string (YYYY-MM-DD) for the inclusive start. */
  from?: string;
  /** ISO date string (YYYY-MM-DD) for the inclusive end. */
  to?: string;
  /** Called whenever the user changes either bound or picks a preset. */
  onChange: (range: { from?: string; to?: string }) => void;
  /** Extra classes on the root wrapper. */
  className?: string;
}

type PresetId =
  | "7d"
  | "30d"
  | "90d"
  | "this-month"
  | "last-month"
  | "this-year"
  | "all";

interface Preset {
  id: PresetId;
  label: string;
  /** Returns the [from, to] ISO date strings for the preset (to = today). */
  compute: () => [string | undefined, string | undefined];
}

const PRESETS: Preset[] = [
  {
    id: "7d",
    label: "Last 7 days",
    compute: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6);
      return [toIso(from), toIso(to)];
    },
  },
  {
    id: "30d",
    label: "Last 30 days",
    compute: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 29);
      return [toIso(from), toIso(to)];
    },
  },
  {
    id: "90d",
    label: "Last 90 days",
    compute: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 89);
      return [toIso(from), toIso(to)];
    },
  },
  {
    id: "this-month",
    label: "This month",
    compute: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return [toIso(from), toIso(now)];
    },
  },
  {
    id: "last-month",
    label: "Last month",
    compute: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return [toIso(from), toIso(to)];
    },
  },
  {
    id: "this-year",
    label: "This year",
    compute: () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), 0, 1);
      return [toIso(from), toIso(now)];
    },
  },
  {
    id: "all",
    label: "All time",
    compute: () => [undefined, undefined],
  },
];

/** Format a Date as `YYYY-MM-DD` (no timezone drift). */
function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns the preset id whose compute() matches the current `from`/`to`, or
 * `null` if none match (i.e. the user picked a custom range).
 */
function matchPreset(from?: string, to?: string): PresetId | null {
  for (const preset of PRESETS) {
    const [pFrom, pTo] = preset.compute();
    if (pFrom === from && pTo === to) return preset.id;
  }
  return null;
}

/**
 * Two date inputs + preset chips used at the top of every Reports tab. Calls
 * `onChange({ from, to })` with ISO date strings (or `undefined` for "All
 * time"). All native HTML date inputs — no dependency on a date library.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: DateRangePickerProps) {
  const activePreset = useMemo(() => matchPreset(from, to), [from, to]);

  const applyPreset = useCallback(
    (preset: Preset) => {
      const [pFrom, pTo] = preset.compute();
      onChange({ from: pFrom, to: pTo });
    },
    [onChange],
  );

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-dark-300">
          <CalendarDaysIcon className="size-4 stroke-2" />
          <span>Date range</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <Button
                key={preset.id}
                variant={isActive ? "soft" : "flat"}
                color={isActive ? "primary" : "neutral"}
                onClick={() => applyPreset(preset)}
                className={clsx(
                  "h-7 px-2.5 text-xs font-medium",
                  isActive
                    ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                )}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-dark-200">
          <span>From</span>
          <input
            type="date"
            value={from ?? ""}
            max={to ?? undefined}
            onChange={(e) =>
              onChange({
                from: e.target.value || undefined,
                to,
              })
            }
            className="form-input h-8 rounded-md border-gray-300 px-2 py-1 text-xs text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50 dark:focus:border-primary-500"
          />
        </label>

        <span className="text-gray-400 dark:text-dark-400">→</span>

        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-dark-200">
          <span>To</span>
          <input
            type="date"
            value={to ?? ""}
            min={from ?? undefined}
            onChange={(e) =>
              onChange({
                from,
                to: e.target.value || undefined,
              })
            }
            className="form-input h-8 rounded-md border-gray-300 px-2 py-1 text-xs text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50 dark:focus:border-primary-500"
          />
        </label>
      </div>
    </div>
  );
}

export default DateRangePicker;
