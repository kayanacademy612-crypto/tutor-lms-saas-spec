// CertificateScreen — list of certificate templates with create + preview.
//
// Shows every certificate template (active / draft) with orientation, primary
// color, font family, and usage count (issued certificates). A "Create
// template" composer collects the basics; clicking a card opens a modal-like
// preview pane showing what the certificate would look like (CSS-only).

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  DocumentDuplicateIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { EmptyState } from "@/components/lms";
import { Button, Card, Badge, Input, Textarea, Select, Switch, Avatar } from "@/components/ui";

// ----------------------------------------------------------------------

interface CertTemplate {
  id: string;
  name: string;
  orientation: "landscape" | "portrait";
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  isActive: boolean;
  issuedCount: number;
  createdAt: string; // ISO
  description?: string;
}

const iso = (d: Date) => d.toISOString();

const INITIAL_TEMPLATES: CertTemplate[] = [
  {
    id: "tpl-1",
    name: "Classic Gold",
    orientation: "landscape",
    primaryColor: "#b8860b",
    accentColor: "#f5e6c8",
    fontFamily: "Georgia, serif",
    isActive: true,
    issuedCount: 312,
    createdAt: iso(new Date("2025-01-10")),
    description: "Elegant serif certificate with a gold foil border.",
  },
  {
    id: "tpl-2",
    name: "Modern Indigo",
    orientation: "landscape",
    primaryColor: "#4f46e5",
    accentColor: "#c7d2fe",
    fontFamily: "Inter, sans-serif",
    isActive: true,
    issuedCount: 156,
    createdAt: iso(new Date("2025-02-01")),
    description: "Clean modern layout with indigo accents.",
  },
  {
    id: "tpl-3",
    name: "Minimal Portrait",
    orientation: "portrait",
    primaryColor: "#0f766e",
    accentColor: "#ccfbf1",
    fontFamily: "Helvetica, sans-serif",
    isActive: false,
    issuedCount: 0,
    createdAt: iso(new Date("2025-06-15")),
    description: "Minimal portrait format for short courses.",
  },
  {
    id: "tpl-4",
    name: "Premium Emerald",
    orientation: "landscape",
    primaryColor: "#059669",
    accentColor: "#a7f3d0",
    fontFamily: "Playfair Display, serif",
    isActive: true,
    issuedCount: 87,
    createdAt: iso(new Date("2025-04-20")),
    description: "Premium emerald template with ornate corners.",
  },
];

// ----------------------------------------------------------------------

export function CertificateScreen() {
  const [templates, setTemplates] = useState<CertTemplate[]>(INITIAL_TEMPLATES);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<CertTemplate | null>(null);

  // Composer state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [accentColor, setAccentColor] = useState("#c7d2fe");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [isActive, setIsActive] = useState(true);

  const activeCount = templates.filter((t) => t.isActive).length;
  const totalIssued = templates.reduce((s, t) => s + t.issuedCount, 0);

  function createTemplate() {
    if (!name.trim()) return;
    const tpl: CertTemplate = {
      id: `tpl-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      orientation,
      primaryColor,
      accentColor,
      fontFamily,
      isActive,
      issuedCount: 0,
      createdAt: new Date().toISOString(),
      description: description.trim() || undefined,
    };
    setTemplates((prev) => [tpl, ...prev]);
    setName("");
    setDescription("");
    setOrientation("landscape");
    setPrimaryColor("#4f46e5");
    setAccentColor("#c7d2fe");
    setFontFamily("Inter, sans-serif");
    setIsActive(true);
    setCreating(false);
  }

  function toggleActive(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t)),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Certificate Templates
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Design templates that auto-issue when students complete a course.
          </p>
        </div>
        <Button color="primary" className="gap-1.5" onClick={() => setCreating(true)}>
          <PlusIcon className="size-4 stroke-2" />
          Create template
        </Button>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Templates</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {templates.length}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Active</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {activeCount}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Issued</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {totalIssued.toLocaleString()}
          </p>
        </Card>
      </div>

      {/* Inline composer */}
      {creating && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Create new template
            </h2>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              onClick={() => setCreating(false)}
              aria-label="Cancel create"
            >
              <XMarkIcon className="size-5 stroke-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Template name"
              placeholder="e.g. Premium Emerald"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
            <Select
              label="Orientation"
              value={orientation}
              onChange={(e) =>
                setOrientation((e.target as HTMLSelectElement).value as "landscape" | "portrait")
              }
              data={[
                { value: "landscape", label: "Landscape" },
                { value: "portrait", label: "Portrait" },
              ]}
            />
          </div>

          <Textarea
            label="Description"
            rows={2}
            placeholder="Short note about the design / when to use it."
            value={description}
            onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Primary color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Accent color"
              type="color"
              value={accentColor}
              onChange={(e) => setAccentColor((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
            <Select
              label="Font family"
              value={fontFamily}
              onChange={(e) => setFontFamily((e.target as HTMLSelectElement).value)}
              data={[
                { value: "Inter, sans-serif", label: "Inter (sans)" },
                { value: "Georgia, serif", label: "Georgia (serif)" },
                { value: "Helvetica, sans-serif", label: "Helvetica (sans)" },
                { value: "Playfair Display, serif", label: "Playfair (serif)" },
              ]}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-dark-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                Active
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Active templates can be linked to courses and issued.
              </p>
            </div>
            <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="flat" color="neutral" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={createTemplate} disabled={!name.trim()} className="gap-1.5">
              <PlusIcon className="size-4 stroke-2" />
              Create template
            </Button>
          </div>
        </Card>
      )}

      {/* Template grid */}
      {templates.length === 0 ? (
        <EmptyState
          icon={DocumentDuplicateIcon}
          title="No certificate templates yet"
          description="Create your first template to start issuing certificates to students."
          actionLabel="Create template"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onPreview={() => setPreview(tpl)}
              onToggleActive={() => toggleActive(tpl.id)}
            />
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal template={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function TemplateCard({
  template: tpl,
  onPreview,
  onToggleActive,
}: {
  template: CertTemplate;
  onPreview: () => void;
  onToggleActive: () => void;
}) {
  return (
    <Card skin="shadow" className="flex flex-col overflow-hidden p-0">
      {/* Thumbnail */}
      <button
        onClick={onPreview}
        className={clsx(
          "relative flex w-full items-center justify-center border-b border-gray-100 p-6 dark:border-dark-600",
          tpl.orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]",
        )}
        style={{ background: tpl.accentColor }}
        aria-label={`Preview ${tpl.name}`}
      >
        <div
          className="absolute inset-3 rounded-md border-4"
          style={{ borderColor: tpl.primaryColor }}
        />
        <div className="relative z-10 text-center" style={{ fontFamily: tpl.fontFamily }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: tpl.primaryColor }}>
            Certificate of Completion
          </p>
          <p className="mt-2 text-sm font-bold" style={{ color: tpl.primaryColor }}>
            {tpl.name}
          </p>
          <div className="mx-auto mt-2 h-px w-12" style={{ background: tpl.primaryColor }} />
          <p className="mt-2 text-[10px]" style={{ color: tpl.primaryColor }}>
            This is to certify that
          </p>
          <p className="mt-1 text-xs font-semibold" style={{ color: tpl.primaryColor }}>
            Student Name
          </p>
        </div>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
              {tpl.name}
            </h3>
            <p className="text-[11px] capitalize text-gray-500 dark:text-dark-300">
              {tpl.orientation} · {tpl.issuedCount} issued
            </p>
          </div>
          {tpl.isActive ? (
            <Badge color="success" variant="soft" className="gap-1 text-[10px]">
              <CheckCircleIcon className="size-3" />
              Active
            </Badge>
          ) : (
            <Badge color="neutral" variant="soft" className="text-[10px]">
              Inactive
            </Badge>
          )}
        </div>

        {tpl.description && (
          <p className="line-clamp-2 text-xs text-gray-600 dark:text-dark-200">
            {tpl.description}
          </p>
        )}

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-dark-300">
            <span
              className="size-3 rounded-full ring-1 ring-gray-200 dark:ring-dark-500"
              style={{ background: tpl.primaryColor }}
            />
            {tpl.primaryColor}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-dark-400">·</span>
          <span className="text-[11px] text-gray-500 dark:text-dark-300">
            {tpl.fontFamily.split(",")[0]}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-dark-600">
          <Button
            variant="flat"
            color={tpl.isActive ? "success" : "neutral"}
            className="gap-1.5 text-xs"
            onClick={onToggleActive}
          >
            <span
              className={clsx(
                "size-2 rounded-full",
                tpl.isActive ? "bg-success-500" : "bg-gray-400 dark:bg-dark-400",
              )}
            />
            {tpl.isActive ? "Active" : "Inactive"}
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="flat" color="neutral" isIcon aria-label="Edit template">
              <PencilSquareIcon className="size-4 stroke-2" />
            </Button>
            <Button variant="soft" color="primary" className="gap-1.5 text-xs" onClick={onPreview}>
              <EyeIcon className="size-3.5 stroke-2" />
              Preview
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Full-page preview overlay (CSS-only certificate preview). */
function PreviewModal({
  template: tpl,
  onClose,
}: {
  template: CertTemplate;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <Card
        className="relative w-full max-w-3xl p-0"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-dark-600">
          <div className="flex items-center gap-2">
            <SparklesIcon className="size-5 text-primary-500" />
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Preview: {tpl.name}
            </h3>
          </div>
          <Button
            variant="flat"
            color="neutral"
            isIcon
            onClick={onClose}
            aria-label="Close preview"
          >
            <XMarkIcon className="size-5 stroke-2" />
          </Button>
        </div>

        {/* Certificate canvas */}
        <div className="bg-gray-50 p-6 dark:bg-dark-700">
          <div
            className={clsx(
              "mx-auto bg-white shadow-soft",
              tpl.orientation === "landscape" ? "aspect-[4/3] max-w-2xl" : "aspect-[3/4] max-w-sm",
            )}
            style={{ background: tpl.accentColor }}
          >
            <div className="relative flex h-full flex-col items-center justify-center p-10">
              <div
                className="absolute inset-4 rounded-md border-4"
                style={{ borderColor: tpl.primaryColor }}
              />
              <div className="relative z-10 text-center" style={{ fontFamily: tpl.fontFamily }}>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.4em]"
                  style={{ color: tpl.primaryColor }}
                >
                  Certificate of Completion
                </p>
                <div className="mx-auto mt-3 h-px w-16" style={{ background: tpl.primaryColor }} />
                <p className="mt-4 text-[11px]" style={{ color: tpl.primaryColor }}>
                  This is to certify that
                </p>
                <p
                  className="mt-2 text-2xl font-bold"
                  style={{ color: tpl.primaryColor }}
                >
                  Student Name
                </p>
                <p className="mt-2 text-[11px]" style={{ color: tpl.primaryColor }}>
                  has successfully completed
                </p>
                <p
                  className="mt-1 text-lg font-semibold"
                  style={{ color: tpl.primaryColor }}
                >
                  Full-Stack React &amp; TypeScript
                </p>
                <p className="mt-3 text-[10px]" style={{ color: tpl.primaryColor }}>
                  Issued by Sarah Chen · {new Date(tpl.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3 dark:border-dark-600">
          <div className="flex items-center gap-2">
            <Avatar name="Sarah Chen" size={8} initialColor="primary" />
            <div>
              <p className="text-xs font-medium text-gray-800 dark:text-dark-100">
                Signed by Sarah Chen
              </p>
              <p className="text-[11px] text-gray-500 dark:text-dark-300">
                Issued {tpl.issuedCount} times
              </p>
            </div>
          </div>
          <Button variant="flat" color="neutral" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default CertificateScreen;
