// Accessibility Settings — `apps/accessibility-settings` route.
//
// Layout:
//   - Top header strip with the page title and a "Refresh" button.
//   - Four stacked Card sections:
//     1. "Typography" — radio cards for font size (small / medium /
//        large / xlarge), each showing a preview of body text at that
//        size.
//     2. "Color vision" — radio cards for color-blind mode (none /
//        protanopia / deuteranopia / tritanopia), each with a small
//        color sample swatch filtered by the corresponding simulation.
//     3. "Display preferences" — four Switch rows for high contrast,
//        screen-reader optimization, reduced motion, and dyslexia-
//        friendly font.
//     4. "Live preview" — a styled panel showing how the current
//        settings affect sample text + a primary button + a secondary
//        text block, so the user can see the result before saving.
//   - Footer with a "Reset" and a "Save Preferences" button. Toggles
//     and radio cards update local state immediately; the Save button
//     flushes the whole form via `useUpdateAccessibilityPreferences`.
//
// Hooks used:
//   - `useAccessibilityPreferences()` — fetch the current prefs.
//   - `useUpdateAccessibilityPreferences()` — upsert the prefs.

// Import Dependencies
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  CheckIcon,
  DocumentTextIcon,
  EyeIcon,
  HandRaisedIcon,
  PaintBrushIcon,
  SpeakerWaveIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  Spinner,
  Switch,
} from "@/components/ui";
import {
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAccessibilityPreferences,
  useUpdateAccessibilityPreferences,
} from "@/hooks/useProEngagement";
import type {
  AccessibilityFontSize,
  AccessibilityPreferencesInput,
  ColorBlindMode,
} from "@/types/lms";

// ----------------------------------------------------------------------

interface FontSizeOption {
  value: AccessibilityFontSize;
  label: string;
  px: number;
  preview: string;
}

const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  {
    value: "small",
    label: "Small",
    px: 13,
    preview: "The quick brown fox jumps over the lazy dog.",
  },
  {
    value: "medium",
    label: "Medium",
    px: 15,
    preview: "The quick brown fox jumps over the lazy dog.",
  },
  {
    value: "large",
    label: "Large",
    px: 17,
    preview: "The quick brown fox jumps over the lazy dog.",
  },
  {
    value: "xlarge",
    label: "Extra Large",
    px: 20,
    preview: "The quick brown fox jumps over the lazy dog.",
  },
];

interface ColorBlindOption {
  value: ColorBlindMode;
  label: string;
  description: string;
  /**
   * Inline SVG filter id used to simulate the corresponding color vision
   * deficiency on the swatch row. The filters are defined once at the top
   * of the page (hidden <svg>) and referenced via `style={{ filter:
   * 'url(#...)' }}`.
   */
  filterId: string;
}

const COLOR_BLIND_OPTIONS: ColorBlindOption[] = [
  {
    value: "none",
    label: "None",
    description: "No color vision filter applied.",
    filterId: "cbm-none",
  },
  {
    value: "protanopia",
    label: "Protanopia",
    description: "Reduced sensitivity to red light.",
    filterId: "cbm-protanopia",
  },
  {
    value: "deuteranopia",
    label: "Deuteranopia",
    description: "Reduced sensitivity to green light.",
    filterId: "cbm-deuteranopia",
  },
  {
    value: "tritanopia",
    label: "Tritanopia",
    description: "Reduced sensitivity to blue light.",
    filterId: "cbm-tritanopia",
  },
];

const SWATCH_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

const DEFAULTS: AccessibilityPreferencesInput = {
  fontSize: "medium",
  highContrast: false,
  screenReader: false,
  reducedMotion: false,
  dyslexiaFont: false,
  colorBlindMode: "none",
};

// ----------------------------------------------------------------------

export default function AccessibilitySettingsPage() {
  // ───────── Data ─────────
  const prefsQuery = useAccessibilityPreferences();
  const updatePrefs = useUpdateAccessibilityPreferences();

  const [form, setForm] = useState<AccessibilityPreferencesInput>(DEFAULTS);
  const [dirty, setDirty] = useState(false);

  // ───────── Sync server → form (once on first load) ─────────
  useEffect(() => {
    if (prefsQuery.data && !dirty) {
      setForm({
        fontSize: prefsQuery.data.fontSize ?? "medium",
        highContrast: prefsQuery.data.highContrast,
        screenReader: prefsQuery.data.screenReader,
        reducedMotion: prefsQuery.data.reducedMotion,
        dyslexiaFont: prefsQuery.data.dyslexiaFont,
        colorBlindMode: prefsQuery.data.colorBlindMode ?? "none",
      });
    }
  }, [prefsQuery.data, dirty]);

  // ───────── Derived ─────────
  const activeFontSize = useMemo(
    () =>
      FONT_SIZE_OPTIONS.find((o) => o.value === form.fontSize) ??
      FONT_SIZE_OPTIONS[1],
    [form.fontSize],
  );
  const activeColorBlind = useMemo(
    () =>
      COLOR_BLIND_OPTIONS.find((o) => o.value === form.colorBlindMode) ??
      COLOR_BLIND_OPTIONS[0],
    [form.colorBlindMode],
  );

  // ───────── Handlers ─────────
  const patch = useCallback(
    <K extends keyof AccessibilityPreferencesInput>(
      key: K,
      value: AccessibilityPreferencesInput[K],
    ) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const result = await updatePrefs.mutate(form);
    if (result) {
      setDirty(false);
      void prefsQuery.refetch();
    }
  }, [updatePrefs, form, prefsQuery]);

  const handleReset = useCallback(() => {
    if (prefsQuery.data) {
      setForm({
        fontSize: prefsQuery.data.fontSize ?? "medium",
        highContrast: prefsQuery.data.highContrast,
        screenReader: prefsQuery.data.screenReader,
        reducedMotion: prefsQuery.data.reducedMotion,
        dyslexiaFont: prefsQuery.data.dyslexiaFont,
        colorBlindMode: prefsQuery.data.colorBlindMode ?? "none",
      });
    } else {
      setForm(DEFAULTS);
    }
    setDirty(false);
    updatePrefs.reset();
  }, [prefsQuery.data, updatePrefs]);

  // ───────── Render ─────────
  return (
    <Page title="Accessibility Settings">
      {/* Hidden SVG with color-blind simulation filters. */}
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute" }}
      >
        <defs>
          <filter id="cbm-none" />
          {/* Approximate simulation matrices (W3C-style). */}
          <filter id="cbm-protanopia">
            <feColorMatrix
              type="matrix"
              values="0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="cbm-deuteranopia">
            <feColorMatrix
              type="matrix"
              values="0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0"
            />
          </filter>
          <filter id="cbm-tritanopia">
            <feColorMatrix
              type="matrix"
              values="0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0"
            />
          </filter>
        </defs>
      </svg>

      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <EyeIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Accessibility Settings
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Tune the UI for vision, motion, and reading preferences.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Badge color="warning" variant="soft" className="text-[10px]">
                Unsaved changes
              </Badge>
            )}
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-9"
              onClick={() => void prefsQuery.refetch()}
              aria-label="Refresh preferences"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
          </div>
        </header>

        {/* Body */}
        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-6">
            {prefsQuery.loading ? (
              <LoadingState message="Loading accessibility preferences…" />
            ) : prefsQuery.error ? (
              <ErrorState
                error={prefsQuery.error}
                onRetry={prefsQuery.refetch}
              />
            ) : (
              <div className="space-y-6">
                {/* Typography */}
                <Card skin="bordered" className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Typography
                    </h2>
                  </div>
                  <p className="mb-3 text-xs text-gray-500 dark:text-dark-300">
                    Pick a base body font size. Headings scale proportionally.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {FONT_SIZE_OPTIONS.map((opt) => {
                      const active = opt.value === form.fontSize;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => patch("fontSize", opt.value)}
                          aria-pressed={active}
                          className={[
                            "flex flex-col gap-2 rounded-lg border p-3 text-left transition",
                            active
                              ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                              : "border-gray-200 hover:border-gray-300 dark:border-dark-600 dark:hover:border-dark-500",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-dark-100">
                              {opt.label}
                            </span>
                            {active && (
                              <CheckIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
                            )}
                          </div>
                          <p
                            className="text-gray-800 dark:text-dark-50"
                            style={{ fontSize: `${opt.px}px`, lineHeight: 1.4 }}
                          >
                            {opt.preview}
                          </p>
                          <span className="text-[10px] text-gray-400 dark:text-dark-400">
                            {opt.px}px base
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Color vision */}
                <Card skin="bordered" className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <SwatchIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Color vision
                    </h2>
                  </div>
                  <p className="mb-3 text-xs text-gray-500 dark:text-dark-300">
                    Adjust palette for common color vision deficiencies.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {COLOR_BLIND_OPTIONS.map((opt) => {
                      const active = opt.value === form.colorBlindMode;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => patch("colorBlindMode", opt.value)}
                          aria-pressed={active}
                          className={[
                            "flex flex-col gap-2 rounded-lg border p-3 text-left transition",
                            active
                              ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                              : "border-gray-200 hover:border-gray-300 dark:border-dark-600 dark:hover:border-dark-500",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700 dark:text-dark-100">
                              {opt.label}
                            </span>
                            {active && (
                              <CheckIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
                            )}
                          </div>
                          <div
                            className="flex h-8 overflow-hidden rounded-md"
                            style={{ filter: `url(#${opt.filterId})` }}
                          >
                            {SWATCH_COLORS.map((c) => (
                              <div
                                key={c}
                                className="flex-1"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-gray-500 dark:text-dark-300">
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Display preferences */}
                <Card skin="bordered" className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <PaintBrushIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Display preferences
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-dark-600">
                    <ToggleRow
                      title="High contrast mode"
                      description="Increase foreground/background contrast for readability."
                      icon={SwatchIcon}
                    >
                      <Switch
                        checked={form.highContrast}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          patch("highContrast", e.target.checked)
                        }
                        aria-label="High contrast mode"
                      />
                    </ToggleRow>
                    <ToggleRow
                      title="Screen reader optimization"
                      description="Add extra ARIA landmarks and skip links for assistive tech."
                      icon={SpeakerWaveIcon}
                    >
                      <Switch
                        checked={form.screenReader}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          patch("screenReader", e.target.checked)
                        }
                        aria-label="Screen reader optimization"
                      />
                    </ToggleRow>
                    <ToggleRow
                      title="Reduced motion"
                      description="Disable non-essential animations and transitions."
                      icon={HandRaisedIcon}
                    >
                      <Switch
                        checked={form.reducedMotion}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          patch("reducedMotion", e.target.checked)
                        }
                        aria-label="Reduced motion"
                      />
                    </ToggleRow>
                    <ToggleRow
                      title="Dyslexia-friendly font"
                      description="Switch to a sans-serif font designed for dyslexic readers."
                      icon={DocumentTextIcon}
                    >
                      <Switch
                        checked={form.dyslexiaFont}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          patch("dyslexiaFont", e.target.checked)
                        }
                        aria-label="Dyslexia-friendly font"
                      />
                    </ToggleRow>
                  </div>
                </Card>

                {/* Mutation error */}
                {updatePrefs.error && (
                  <Card
                    skin="bordered"
                    className="border-error-300 bg-error-50 p-4 dark:border-error-500/40 dark:bg-error-500/10"
                  >
                    <p className="text-sm font-semibold text-error-700 dark:text-error-300">
                      Couldn’t save preferences
                    </p>
                    <p className="mt-0.5 text-xs text-error-600 dark:text-error-400">
                      {updatePrefs.error.message}
                    </p>
                  </Card>
                )}

                {/* Live preview */}
                <Card skin="bordered" className="p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <ArrowsPointingOutIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                      Live preview
                    </h2>
                  </div>
                  <div
                    className={[
                      "rounded-lg border p-5 transition",
                      form.highContrast
                        ? "border-gray-900 bg-white text-black dark:border-white dark:bg-black dark:text-white"
                        : "border-gray-200 bg-white text-gray-800 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-50",
                      form.dyslexiaFont && "font-sans",
                    ].join(" ")}
                    style={{
                      fontSize: `${activeFontSize.px}px`,
                      lineHeight: 1.5,
                      filter: `url(#${activeColorBlind.filterId})`,
                    }}
                  >
                    <h3
                      className="font-semibold"
                      style={{ fontSize: `${activeFontSize.px + 4}px` }}
                    >
                      Course overview
                    </h3>
                    <p className="mt-2">
                      Welcome back! You’re <strong>78%</strong> through the
                      “Advanced React Patterns” course. The next lesson covers
                      suspense boundaries and concurrent rendering.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        color="primary"
                        variant="filled"
                        size="sm"
                        className="pointer-events-none"
                      >
                        Continue learning
                      </Button>
                      <Button
                        color="neutral"
                        variant="flat"
                        size="sm"
                        className="pointer-events-none"
                      >
                        Browse catalog
                      </Button>
                    </div>
                    <p className="mt-3 text-xs opacity-70">
                      Last activity: 2 hours ago · 3 lessons completed this
                      week.
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-dark-300">
                    Tip: changes apply platform-wide once you click “Save
                    Preferences”. Live preview only reflects the current card.
                  </p>
                </Card>

                {/* Footer */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="flat"
                    color="neutral"
                    className="min-w-[7rem]"
                    onClick={handleReset}
                    disabled={!dirty && !updatePrefs.loading}
                  >
                    Reset
                  </Button>
                  <Button
                    color="primary"
                    className="min-w-[8rem] gap-1.5"
                    onClick={() => void handleSave()}
                    disabled={!dirty || updatePrefs.loading}
                  >
                    {updatePrefs.loading ? (
                      <Spinner className="size-4" />
                    ) : (
                      <CheckIcon className="size-4 stroke-2" />
                    )}
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------
// Local layout helper — labelled toggle row.
// ----------------------------------------------------------------------

interface ToggleRowProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

function ToggleRow({
  title,
  description,
  icon: Icon,
  children,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
          <Icon className="size-4 stroke-2" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            {description}
          </p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
