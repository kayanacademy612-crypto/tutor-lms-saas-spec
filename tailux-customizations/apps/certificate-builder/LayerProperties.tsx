// LayerProperties — right sidebar of the TemplateEditor.
//
// Renders editable inputs for the selected layer's geometry, styling, and
// data binding. Calls `onUpdate(id, input)` on every change (the parent
// batches updates through `useUpdateCertificateLayer`). The "Delete layer"
// button calls `onDelete(id)`.
//
// The panel is sectioned:
//   1. Geometry       — position X/Y, width/height, rotation, opacity
//   2. Type-specific  — text content + font props, image URL, shape props
//   3. Data binding   — {student_name} / {course_title} / etc. dropdown
//   4. Behavior       — visibility + lock toggles, delete button

// Import Dependencies
import { useCallback } from "react";
import clsx from "clsx";
import {
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  LockOpenIcon,
  LockClosedIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Input, Textarea, Select, Switch, Range } from "@/components/ui";
import type {
  CertificateDataKey,
  CertificateLayer,
  CertificateLayerCreateInput,
  CertificateLayerType,
} from "@/types/lms";

// ----------------------------------------------------------------------

export interface LayerPropertiesProps {
  layer: CertificateLayer;
  /** Patch the layer with the given partial input. */
  onUpdate: (
    id: string,
    input: Partial<CertificateLayerCreateInput>,
  ) => void;
  /** Remove the layer. */
  onDelete: (id: string) => void;
}

// ----------------------------------------------------------------------

const LAYER_TYPE_OPTIONS: { value: CertificateLayerType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "shape", label: "Shape" },
  { value: "signature", label: "Signature" },
  { value: "qrcode", label: "QR Code" },
];

const DATA_KEY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "— None (static content) —" },
  { value: "student_name", label: "{student_name} — Student name" },
  { value: "course_title", label: "{course_title} — Course title" },
  { value: "instructor_name", label: "{instructor_name} — Instructor" },
  { value: "issue_date", label: "{issue_date} — Issue date" },
  { value: "score", label: "{score} — Final score" },
  { value: "certificate_number", label: "{certificate_number}" },
  { value: "completion_date", label: "{completion_date}" },
];

const FONT_FAMILY_OPTIONS = [
  { value: "Inter, sans-serif", label: "Inter" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "Helvetica, sans-serif", label: "Helvetica" },
  { value: "Playfair Display, serif", label: "Playfair Display" },
  { value: "Courier New, monospace", label: "Courier New" },
];

const FONT_WEIGHT_OPTIONS = [
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semibold (600)" },
  { value: "700", label: "Bold (700)" },
];

const SHAPE_OPTIONS = [
  { value: "rect", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "line", label: "Line" },
];

// ----------------------------------------------------------------------

export default function LayerProperties({
  layer,
  onUpdate,
  onDelete,
}: LayerPropertiesProps) {
  const patch = useCallback(
    (input: Partial<CertificateLayerCreateInput>) => {
      onUpdate(layer.id, input);
    },
    [layer.id, onUpdate],
  );

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-dark-600">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-dark-400">
            Layer
          </p>
          <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
            {layer.name}
          </h3>
        </div>
        <Button
          variant="flat"
          color="error"
          isIcon
          aria-label="Delete layer"
          onClick={() => onDelete(layer.id)}
        >
          <TrashIcon className="size-4 stroke-2" />
        </Button>
      </div>

      {/* Scrollable property sections */}
      <div className="hide-scrollbar grow space-y-5 overflow-y-auto p-4">
        {/* Layer type + name */}
        <Section title="General">
          <Input
            label="Layer name"
            value={layer.name}
            onChange={(e) =>
              patch({ name: (e.target as HTMLInputElement).value })
            }
            classNames={{ wrapper: "mt-0" }}
          />
          <Select
            label="Type"
            value={layer.layerType}
            onChange={(e) =>
              patch({
                layerType: (e.target as HTMLSelectElement)
                  .value as CertificateLayerType,
              })
            }
            data={LAYER_TYPE_OPTIONS}
          />
        </Section>

        {/* Geometry */}
        <Section title="Geometry">
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="X"
              type="number"
              value={Math.round(layer.positionX)}
              onChange={(e) =>
                patch({
                  positionX: Number((e.target as HTMLInputElement).value) || 0,
                })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Y"
              type="number"
              value={Math.round(layer.positionY)}
              onChange={(e) =>
                patch({
                  positionY: Number((e.target as HTMLInputElement).value) || 0,
                })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Width"
              type="number"
              value={Math.round(layer.width ?? 0)}
              onChange={(e) =>
                patch({
                  width: Number((e.target as HTMLInputElement).value) || 0,
                })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Height"
              type="number"
              value={Math.round(layer.height ?? 0)}
              onChange={(e) =>
                patch({
                  height: Number((e.target as HTMLInputElement).value) || 0,
                })
              }
              classNames={{ wrapper: "mt-0" }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-gray-600 dark:text-dark-200">
                Rotation
              </label>
              <span className="text-gray-500 dark:text-dark-300">
                {Math.round(layer.rotation ?? 0)}°
              </span>
            </div>
            <Range
              min={-180}
              max={180}
              step={1}
              value={layer.rotation ?? 0}
              color="primary"
              onChange={(e) =>
                patch({
                  rotation: Number((e.target as HTMLInputElement).value),
                })
              }
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-medium text-gray-600 dark:text-dark-200">
                Opacity
              </label>
              <span className="text-gray-500 dark:text-dark-300">
                {Math.round((layer.opacity ?? 1) * 100)}%
              </span>
            </div>
            <Range
              min={0}
              max={1}
              step={0.05}
              value={layer.opacity ?? 1}
              color="primary"
              onChange={(e) =>
                patch({
                  opacity: Number((e.target as HTMLInputElement).value),
                })
              }
            />
          </div>
        </Section>

        {/* Type-specific */}
        {(layer.layerType === "text" ||
          layer.layerType === "signature") && (
          <Section title="Text">
            <Textarea
              label="Content"
              rows={3}
              placeholder={
                layer.dataKey
                  ? `Use {${layer.dataKey}} to insert the bound value.`
                  : "Static text or {student_name} for a bound field."
              }
              value={layer.content ?? ""}
              onChange={(e) =>
                patch({ content: (e.target as HTMLTextAreaElement).value })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Font family"
                value={layer.fontFamily ?? "Inter, sans-serif"}
                onChange={(e) =>
                  patch({
                    fontFamily: (e.target as HTMLSelectElement).value,
                  })
                }
                data={FONT_FAMILY_OPTIONS}
              />
              <Input
                label="Font size"
                type="number"
                min={6}
                max={200}
                value={layer.fontSize ?? 18}
                onChange={(e) =>
                  patch({
                    fontSize:
                      Number((e.target as HTMLInputElement).value) || 18,
                  })
                }
                classNames={{ wrapper: "mt-0" }}
              />
            </div>
            <Select
              label="Font weight"
              value={layer.fontWeight ?? "400"}
              onChange={(e) =>
                patch({
                  fontWeight: (e.target as HTMLSelectElement).value,
                })
              }
              data={FONT_WEIGHT_OPTIONS}
            />
            {/* Text-align button group */}
            <div>
              <label className="input-label text-xs font-medium text-gray-600 dark:text-dark-200">
                Text align
              </label>
              <div className="mt-1.5 flex gap-1">
                {(["left", "center", "right"] as const).map((align) => (
                  <Button
                    key={align}
                    variant={layer.textAlign === align ? "filled" : "flat"}
                    color={layer.textAlign === align ? "primary" : "neutral"}
                    className={clsx(
                      "h-8 flex-1 text-xs capitalize",
                      !layer.textAlign &&
                        align === "left" &&
                        "bg-primary-500 text-white hover:bg-primary-600",
                    )}
                    onClick={() => patch({ textAlign: align })}
                  >
                    {align}
                  </Button>
                ))}
              </div>
            </div>
            <Input
              label="Text color"
              type="color"
              value={layer.color ?? "#1f2937"}
              onChange={(e) =>
                patch({ color: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
          </Section>
        )}

        {layer.layerType === "image" && (
          <Section title="Image">
            <Input
              label="Image URL"
              placeholder="https://…/logo.png"
              value={layer.imageUrl ?? ""}
              onChange={(e) =>
                patch({ imageUrl: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            {layer.imageUrl && (
              <div className="overflow-hidden rounded-md border border-gray-200 dark:border-dark-500">
                <img
                  src={layer.imageUrl}
                  alt=""
                  className="h-24 w-full object-contain bg-gray-50 dark:bg-dark-700"
                />
              </div>
            )}
            <Button
              variant="outlined"
              color="primary"
              className="w-full gap-1.5 text-xs"
              // File upload is a TODO — the backend needs an upload endpoint.
              // For now we surface a friendly placeholder.
              onClick={() =>
                patch({
                  imageUrl:
                    "https://placehold.co/400x120/png?text=Upload+coming+soon",
                })
              }
            >
              <ArrowDownTrayIcon className="size-4 stroke-2" />
              Upload image
            </Button>
          </Section>
        )}

        {layer.layerType === "shape" && (
          <Section title="Shape">
            <Select
              label="Shape"
              value={layer.shapeType ?? "rect"}
              onChange={(e) =>
                patch({
                  shapeType: (e.target as HTMLSelectElement).value,
                })
              }
              data={SHAPE_OPTIONS}
            />
            <Input
              label="Fill color"
              type="color"
              value={layer.fillColor ?? "#e5e7eb"}
              onChange={(e) =>
                patch({ fillColor: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Border color"
              type="color"
              value={layer.borderColor ?? "#000000"}
              onChange={(e) =>
                patch({ borderColor: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Border width"
              type="number"
              min={0}
              max={20}
              value={layer.borderWidth ?? 0}
              onChange={(e) =>
                patch({
                  borderWidth:
                    Number((e.target as HTMLInputElement).value) || 0,
                })
              }
              classNames={{ wrapper: "mt-0" }}
            />
          </Section>
        )}

        {layer.layerType === "qrcode" && (
          <Section title="QR Code">
            <Textarea
              label="Encoded value"
              rows={2}
              placeholder="Use {certificate_number} to encode the cert code."
              value={layer.content ?? ""}
              onChange={(e) =>
                patch({ content: (e.target as HTMLTextAreaElement).value })
              }
            />
            <p className="text-[11px] text-gray-500 dark:text-dark-300">
              The backend renders the QR image at issue time; the canvas shows
              a placeholder pattern.
            </p>
          </Section>
        )}

        {/* Data binding */}
        <Section title="Data binding">
          <Select
            label="Bound field"
            value={layer.dataKey ?? ""}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              patch({
                dataKey: v
                  ? (v as CertificateDataKey)
                  : undefined,
              });
            }}
            data={DATA_KEY_OPTIONS}
          />
          {layer.dataKey && (
            <div className="rounded-md bg-primary-500/5 px-3 py-2 text-[11px] text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              Insert <code className="font-mono">{`{${layer.dataKey}}`}</code>{" "}
              into the layer's content to render the live value at issue time.
            </div>
          )}
        </Section>

        {/* Behavior */}
        <Section title="Behavior">
          <div className="space-y-2">
            <ToggleRow
              icon={
                layer.isVisible ? (
                  <EyeIcon className="size-4" />
                ) : (
                  <EyeSlashIcon className="size-4" />
                )
              }
              label="Visible on canvas"
              description="Hidden layers are skipped when the PDF is rendered."
              checked={layer.isVisible}
              onChange={(v) => patch({ isVisible: v })}
            />
            <ToggleRow
              icon={
                layer.isLocked ? (
                  <LockClosedIcon className="size-4" />
                ) : (
                  <LockOpenIcon className="size-4" />
                )
              }
              label="Locked"
              description="Locked layers can't be dragged or resized."
              checked={!!layer.isLocked}
              onChange={(v) => patch({ isLocked: v })}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-400">
        {title}
      </h4>
      {children}
    </section>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-gray-500 dark:text-dark-300">{icon}</span>
        <div>
          <p className="text-xs font-medium text-gray-800 dark:text-dark-100">
            {label}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-dark-300">
            {description}
          </p>
        </div>
      </div>
      <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

export default LayerProperties;
