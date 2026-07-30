// Platform Admin — White-label branding.
//
// Tabbed interface (Identity, Theme, Content) for editing the
// `BrandingConfig` returned by `GET /api/branding` and updated via
// `PUT /api/admin/branding`.
//
// Identity: app name, tagline, logo mode, logo upload, favicon upload
// Theme:    primary color picker, font family, custom CSS
// Content:  landing page toggle, login/signup headings, dashboard HTML

// Import Dependencies
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  SwatchIcon,
  IdentificationIcon,
  PaintBrushIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Textarea, Select } from "@/components/ui";
import {
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useBranding,
  useUpdateBranding,
  useUploadBrandingMedia,
} from "@/hooks/useAdmin";
import type { BrandingConfig } from "@/services/admin-api";

// ----------------------------------------------------------------------

type Tab = "identity" | "theme" | "content";

const TABS: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "identity", label: "Identity", icon: IdentificationIcon },
  { id: "theme", label: "Theme", icon: PaintBrushIcon },
  { id: "content", label: "Content", icon: DocumentTextIcon },
];

const LOGO_MODES = [
  { value: "text", label: "Text only" },
  { value: "image", label: "Image" },
  { value: "both", label: "Text + Image" },
];

const FONT_FAMILIES = [
  { value: "Inter", label: "Inter (default)" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Poppins", label: "Poppins" },
  { value: "system-ui", label: "System UI" },
];

export default function BrandingPage() {
  const { data, loading, error, refetch } = useBranding();
  const updateMut = useUpdateBranding();
  const uploadMut = useUploadBrandingMedia();

  const [tab, setTab] = useState<Tab>("identity");
  const [form, setForm] = useState<BrandingConfig | null>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const set = <K extends keyof BrandingConfig>(
    key: K,
    value: BrandingConfig[K],
  ) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const onUploadLogo = async (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "logoUrl" | "faviconUrl",
    assetKey: "logo" | "favicon",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reuse the media-upload endpoint as a simple asset uploader.
    const res = await uploadMut.mutate(file);
    if (res?.url) {
      set(key, res.url);
    }
    void refetch();
    // Note: the dedicated `adminApi.uploadBrandingAsset` would be preferable
    // here when the backend supports the `key` param. The media upload
    // endpoint is the safer fallback for any backend.
    void assetKey;
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <LoadingState message="Loading branding config…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState error="No branding config loaded." title="Empty" />
        </Card>
      </div>
    );
  }

  const onSave = async () => {
    await updateMut.mutate(form);
    void refetch();
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <SwatchIcon className="size-5 text-primary-500" />
            White-label Branding
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            Customize how the platform looks for end-users.
          </p>
        </div>
        <Button
          color="primary"
          variant="filled"
          onClick={onSave}
          disabled={updateMut.loading}
          className="gap-1.5 text-sm"
        >
          <CheckIcon className="size-4" />
          {updateMut.loading ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {updateMut.error && (
        <div className="mt-3 rounded-md bg-error-50 px-3 py-2 text-xs text-error-700 dark:bg-error-500/10 dark:text-error-300">
          {updateMut.error.message}
        </div>
      )}
      {updateMut.data && (
        <div className="mt-3 rounded-md bg-success-50 px-3 py-2 text-xs text-success-700 dark:bg-success-500/10 dark:text-success-300">
          Branding saved.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-dark-600">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-dark-300 dark:hover:text-dark-50",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Identity tab */}
      {tab === "identity" && (
        <Card className="mt-4 space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="App name"
              value={form.appName ?? ""}
              onChange={(e) => set("appName", e.target.value)}
              className="text-sm"
            />
            <Input
              label="Tagline"
              value={form.tagline ?? ""}
              onChange={(e) => set("tagline", e.target.value)}
              className="text-sm"
            />
          </div>
          <Select
            label="Logo mode"
            value={form.logoMode ?? "text"}
            onChange={(e) => set("logoMode", e.target.value)}
            data={LOGO_MODES}
            className="text-sm"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-200">
                Logo
              </p>
              <div className="flex items-center gap-3 rounded-md border border-gray-200 p-3 dark:border-dark-600">
                {form.logoUrl ? (
                  <img
                    src={form.logoUrl}
                    alt="Logo"
                    className="h-10 w-auto max-w-[120px] object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400 dark:bg-dark-600">
                    —
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary-500/10 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-500/15 dark:text-primary-300">
                  <ArrowUpTrayIcon className="size-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadLogo(e, "logoUrl", "logo")}
                  />
                </label>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-200">
                Favicon
              </p>
              <div className="flex items-center gap-3 rounded-md border border-gray-200 p-3 dark:border-dark-600">
                {form.faviconUrl ? (
                  <img
                    src={form.faviconUrl}
                    alt="Favicon"
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 text-xs text-gray-400 dark:bg-dark-600">
                    —
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary-500/10 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-500/15 dark:text-primary-300">
                  <ArrowUpTrayIcon className="size-3.5" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadLogo(e, "faviconUrl", "favicon")}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-500 dark:bg-dark-600 dark:text-dark-300">
            <p className="font-medium text-gray-700 dark:text-dark-200">
              Auth providers
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(form.authProviders ?? {}).map(([k, v]) => (
                <Badge
                  key={k}
                  color={v ? "success" : "neutral"}
                  variant="soft"
                >
                  {k}: {v ? "on" : "off"}
                </Badge>
              ))}
              {Object.keys(form.authProviders ?? {}).length === 0 && (
                <span>No auth providers configured.</span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Theme tab */}
      {tab === "theme" && (
        <Card className="mt-4 space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Primary color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor ?? "#4f46e5"}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-gray-300 dark:border-dark-450 dark:bg-dark-700"
                />
                <Input
                  value={form.primaryColor ?? ""}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  placeholder="#4f46e5"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                Accent color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.accentColor ?? "#0ea5e9"}
                  onChange={(e) => set("accentColor", e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-gray-300 dark:border-dark-450 dark:bg-dark-700"
                />
                <Input
                  value={form.accentColor ?? ""}
                  onChange={(e) => set("accentColor", e.target.value)}
                  placeholder="#0ea5e9"
                  className="text-sm"
                />
              </div>
            </div>
            <Select
              label="Font family"
              value={form.fontFamily ?? "Inter"}
              onChange={(e) => set("fontFamily", e.target.value)}
              data={FONT_FAMILIES}
              className="text-sm"
            />
            <Select
              label="Heading font"
              value={form.headingFont ?? form.fontFamily ?? "Inter"}
              onChange={(e) => set("headingFont", e.target.value)}
              data={FONT_FAMILIES}
              className="text-sm"
            />
          </div>
          <Textarea
            label="Custom CSS"
            rows={8}
            value={form.customCss ?? ""}
            onChange={(e) => set("customCss", e.target.value)}
            placeholder="/* Add any CSS overrides here */"
            className="font-mono text-xs"
          />
          <Textarea
            label="Head HTML (analytics, fonts, etc.)"
            rows={4}
            value={form.headHtml ?? ""}
            onChange={(e) => set("headHtml", e.target.value)}
            placeholder="<!-- e.g. Google Analytics snippet -->"
            className="font-mono text-xs"
          />
        </Card>
      )}

      {/* Content tab */}
      {tab === "content" && (
        <Card className="mt-4 space-y-4 p-5">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-200">
            <input
              type="checkbox"
              checked={Boolean(form.landingEnabled)}
              onChange={(e) => set("landingEnabled", e.target.checked)}
              className="size-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-450 dark:bg-dark-700"
            />
            Landing page enabled (public marketing site)
          </label>

          <Input
            label="Landing title"
            value={form.landingTitle ?? ""}
            onChange={(e) => set("landingTitle", e.target.value)}
            className="text-sm"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Login heading"
              value={form.loginHeading ?? ""}
              onChange={(e) => set("loginHeading", e.target.value)}
              className="text-sm"
            />
            <Input
              label="Login subtext"
              value={form.loginSubtext ?? ""}
              onChange={(e) => set("loginSubtext", e.target.value)}
              className="text-sm"
            />
            <Input
              label="Signup heading"
              value={form.signupHeading ?? ""}
              onChange={(e) => set("signupHeading", e.target.value)}
              className="text-sm"
            />
            <Input
              label="Signup subtext"
              value={form.signupSubtext ?? ""}
              onChange={(e) => set("signupSubtext", e.target.value)}
              className="text-sm"
            />
          </div>

          <Textarea
            label="Dashboard HTML (custom banner / announcement above dashboard)"
            rows={4}
            value={form.dashboardHtml ?? ""}
            onChange={(e) => set("dashboardHtml", e.target.value)}
            placeholder="<!-- Optional HTML shown above the dashboard -->"
            className="font-mono text-xs"
          />
          <Textarea
            label="Landing page HTML"
            rows={6}
            value={form.landingHtml ?? ""}
            onChange={(e) => set("landingHtml", e.target.value)}
            placeholder="<!-- Optional custom landing page HTML -->"
            className="font-mono text-xs"
          />
        </Card>
      )}
    </div>
  );
}
