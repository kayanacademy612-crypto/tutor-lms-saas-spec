// TemplateEditor — the visual canvas editor (3-pane layout).
//
//   ┌──────────────────┬────────────────────────────┬──────────────┐
//   │ Layer list       │ Canvas (draggable layers)  │ Properties   │
//   │ + Add layer      │                            │ for selected │
//   │ + reorder        │                            │ layer        │
//   └──────────────────┴────────────────────────────┴──────────────┘
//
// Top toolbar: template name (editable), orientation toggle, backdrop
// selector, grid toggle, Save / Preview / Close.
//
// Backed by Phase 4 hooks:
//   - useCertificateTemplate(id)
//   - useUpdateCertificateTemplate({id, input})
//   - useCertificateLayers(templateId)
//   - useCreateCertificateLayer(input)
//   - useUpdateCertificateLayer({id, input})
//   - useDeleteCertificateLayer(id)
//   - useReorderCertificateLayers({templateId, layerIds})
//   - useCertificateBackdrops()            — for the backdrop selector
//   - usePreviewCertificateTemplate(input) — "Preview" button
//
// Drag + reorder the layer list with up/down buttons (simpler than HTML5
// drag-and-drop and works in every browser). Drag + resize layers on the
// canvas via mouse events handled in <LayerCanvas>.

// Import Dependencies
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  XMarkIcon,
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeSlashIcon,
  LockClosedIcon,
  CloudArrowUpIcon,
  SparklesIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  PhotoIcon,
  RectangleGroupIcon,
  PaintBrushIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Input, Select, Badge } from "@/components/ui";
import {
  LoadingState,
  ErrorState,
} from "@/components/lms";
import {
  useCertificateTemplate,
  useUpdateCertificateTemplate,
  useCertificateLayers,
  useCreateCertificateLayer,
  useUpdateCertificateLayer,
  useDeleteCertificateLayer,
  useReorderCertificateLayers,
  useCertificateBackdrops,
  usePreviewCertificateTemplate,
} from "@/hooks/useProAuthoring";
import type {
  CertificateLayer,
  CertificateLayerCreateInput,
  CertificateLayerType,
} from "@/types/lms";

import LayerCanvas from "./LayerCanvas";
import LayerProperties from "./LayerProperties";

// ----------------------------------------------------------------------

export interface TemplateEditorProps {
  templateId: string;
  onClose: () => void;
}

// ----------------------------------------------------------------------

const LAYER_TYPE_BUTTONS: {
  type: CertificateLayerType;
  label: string;
  icon: typeof DocumentTextIcon;
}[] = [
  { type: "text", label: "Text", icon: DocumentTextIcon },
  { type: "image", label: "Image", icon: PhotoIcon },
  { type: "shape", label: "Shape", icon: RectangleGroupIcon },
  { type: "signature", label: "Signature", icon: PaintBrushIcon },
  { type: "qrcode", label: "QR Code", icon: QrCodeIcon },
];

const DEFAULT_LAYER_PROPS: Record<
  CertificateLayerType,
  Partial<CertificateLayerCreateInput>
> = {
  text: {
    width: 400,
    height: 60,
    content: "New text layer",
    fontFamily: "Inter, sans-serif",
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    color: "#1f2937",
  },
  image: {
    width: 200,
    height: 120,
    imageUrl: "",
  },
  shape: {
    width: 300,
    height: 200,
    shapeType: "rect",
    fillColor: "#e5e7eb",
    borderColor: "#9ca3af",
    borderWidth: 1,
  },
  signature: {
    width: 240,
    height: 80,
    content: "Instructor Name",
    fontFamily: "Georgia, serif",
    fontSize: 28,
    fontWeight: "400",
    textAlign: "center",
    color: "#1f2937",
  },
  qrcode: {
    width: 120,
    height: 120,
    content: "{certificate_number}",
  },
};

// ----------------------------------------------------------------------

export default function TemplateEditor({
  templateId,
  onClose,
}: TemplateEditorProps) {
  const tplQuery = useCertificateTemplate(templateId);
  const layersQuery = useCertificateLayers(templateId);
  const backdropsQuery = useCertificateBackdrops();

  const updateTpl = useUpdateCertificateTemplate();
  const createLayer = useCreateCertificateLayer();
  const updateLayer = useUpdateCertificateLayer();
  const deleteLayer = useDeleteCertificateLayer();
  const reorderLayers = useReorderCertificateLayers();
  const previewTpl = usePreviewCertificateTemplate();

  const [selectedLayerId, setSelectedLayerId] = useState<string>("");
  const [showGrid, setShowGrid] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Editable template fields — kept in local state so typing is instant;
  // flushed to the server via `useUpdateCertificateTemplate` on blur /
  // save.
  const [name, setName] = useState("");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    "landscape",
  );
  const [backgroundUrl, setBackgroundUrl] = useState<string>("");

  // Hydrate local state once the template query resolves.
  useEffect(() => {
    if (tplQuery.data) {
      setName(tplQuery.data.name);
      setOrientation(
        tplQuery.data.orientation === "portrait"
          ? "portrait"
          : "landscape",
      );
      setBackgroundUrl(tplQuery.data.backgroundUrl ?? "");
    }
  }, [tplQuery.data]);

  // ------------------------------------------------------------------
  // Layer CRUD
  // ------------------------------------------------------------------
  const handleAddLayer = useCallback(
    (type: CertificateLayerType) => {
      const defaults = DEFAULT_LAYER_PROPS[type];
      const label =
        type.charAt(0).toUpperCase() + type.slice(1) + " layer";
      void createLayer
        .mutate({
          templateId,
          name: label,
          layerType: type,
          positionX: 100,
          positionY: 100,
          isVisible: true,
          ...defaults,
        })
        .then((result) => {
          if (result) {
            setSelectedLayerId(result.id);
            void layersQuery.refetch();
          }
        });
      setAddMenuOpen(false);
    },
    [createLayer, templateId, layersQuery],
  );

  const handleUpdateLayer = useCallback(
    (id: string, input: Partial<CertificateLayerCreateInput>) => {
      void updateLayer.mutate({ id, input }).then((result) => {
        if (result) void layersQuery.refetch();
      });
    },
    [updateLayer, layersQuery],
  );

  const handleDeleteLayer = useCallback(
    (id: string) => {
      void deleteLayer.mutate(id).then((result) => {
        if (result) {
          if (selectedLayerId === id) setSelectedLayerId("");
          void layersQuery.refetch();
        }
      });
    },
    [deleteLayer, layersQuery, selectedLayerId],
  );

  const handleReorder = useCallback(
    (layerId: string, dir: "up" | "down") => {
      const list = layersQuery.data ?? [];
      const sorted = [...list].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.createdAt.localeCompare(b.createdAt),
      );
      const idx = sorted.findIndex((l) => l.id === layerId);
      if (idx === -1) return;
      const swapWith = dir === "up" ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= sorted.length) return;
      const next = [...sorted];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      void reorderLayers
        .mutate({
          templateId,
          layerIds: next.map((l) => l.id),
        })
        .then(() => void layersQuery.refetch());
    },
    [layersQuery, reorderLayers, templateId],
  );

  // ------------------------------------------------------------------
  // Template-level actions (save / preview / close)
  // ------------------------------------------------------------------
  const handleSave = useCallback(() => {
    void updateTpl
      .mutate({
        id: templateId,
        input: {
          name: name.trim() || "Untitled template",
          orientation,
          backgroundUrl: backgroundUrl || undefined,
          // Preserve other existing fields by passing them through.
          primaryColor: tplQuery.data?.primaryColor,
          accentColor: tplQuery.data?.accentColor,
          fontFamily: tplQuery.data?.fontFamily,
          logoUrl: tplQuery.data?.logoUrl,
          signatureUrl: tplQuery.data?.signatureUrl,
          htmlTemplate: tplQuery.data?.htmlTemplate,
          isActive: tplQuery.data?.isActive ?? true,
        },
      })
      .then(() => void tplQuery.refetch());
  }, [updateTpl, templateId, name, orientation, backgroundUrl, tplQuery]);

  const handlePreview = useCallback(() => {
    void previewTpl
      .mutate({
        templateId,
        studentName: "Jane Doe",
        courseTitle: "Sample Course",
        instructorName: "Sarah Chen",
        score: 92,
      })
      .then((result) => {
        if (result?.previewUrl) {
          window.open(result.previewUrl, "_blank", "noopener,noreferrer");
        }
      });
  }, [previewTpl, templateId]);

  // ------------------------------------------------------------------
  // Derived layer list — must be memoized BEFORE any early return so the
  // rules-of-hooks (hook order is constant across renders) are respected.
  // ------------------------------------------------------------------
  const layers = useMemo(
    () => layersQuery.data ?? [],
    [layersQuery.data],
  );
  const sortedLayers = useMemo(
    () =>
      [...layers].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.createdAt.localeCompare(b.createdAt),
      ),
    [layers],
  );

  // ------------------------------------------------------------------
  // Loading / error
  // ------------------------------------------------------------------
  if (tplQuery.loading && !tplQuery.data) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingState message="Loading template…" />
      </div>
    );
  }
  if (tplQuery.error) {
    return (
      <div className="p-6">
        <ErrorState
          error={tplQuery.error}
          onRetry={() => void tplQuery.refetch()}
          title="Couldn't load the template"
        />
      </div>
    );
  }

  const selectedLayer = sortedLayers.find((l) => l.id === selectedLayerId);

  const backdrop = (backdropsQuery.data ?? []).find(
    (b) => b.imageUrl === backgroundUrl,
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* ---- Top toolbar ---- */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-dark-600 dark:bg-dark-750">
        {/* Left: close + name + orientation */}
        <div className="flex items-center gap-3">
          <Button
            variant="flat"
            color="neutral"
            isIcon
            aria-label="Close editor"
            onClick={onClose}
          >
            <XMarkIcon className="size-5 stroke-2" />
          </Button>
          <Input
            value={name}
            onChange={(e) =>
              setName((e.target as HTMLInputElement).value)
            }
            onBlur={handleSave}
            placeholder="Template name"
            className="w-56 text-sm font-semibold"
            classNames={{ wrapper: "mt-0" }}
          />
          <div className="flex items-center gap-1 rounded-md bg-gray-100 p-0.5 dark:bg-dark-700">
            {(["landscape", "portrait"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  setOrientation(o);
                  // Persist immediately so the canvas re-renders at the
                  // new aspect ratio without waiting for blur.
                  void updateTpl.mutate({
                    id: templateId,
                    input: { orientation: o },
                  });
                }}
                className={clsx(
                  "rounded px-2 py-1 text-xs font-medium capitalize transition-colors",
                  orientation === o
                    ? "bg-white text-primary-700 shadow-sm dark:bg-dark-600 dark:text-primary-300"
                    : "text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100",
                )}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Center: backdrop selector + grid toggle */}
        <div className="hidden items-center gap-2 md:flex">
          <Select
            value={backgroundUrl}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value;
              setBackgroundUrl(v);
              void updateTpl.mutate({
                id: templateId,
                input: { backgroundUrl: v || undefined },
              });
            }}
            placeholder="No backdrop"
            className="w-56 text-xs"
            data={[
              { value: "", label: "— No backdrop —" },
              ...(backdropsQuery.data ?? []).map((b) => ({
                value: b.imageUrl,
                label: b.name,
              })),
            ]}
          />
          <Button
            variant={showGrid ? "filled" : "flat"}
            color={showGrid ? "primary" : "neutral"}
            isIcon
            aria-label="Toggle grid"
            onClick={() => setShowGrid((v) => !v)}
          >
            <Squares2X2Icon className="size-4 stroke-2" />
          </Button>
        </div>

        {/* Right: preview + save */}
        <div className="flex items-center gap-2">
          <Button
            variant="outlined"
            color="primary"
            className="gap-1.5 text-xs"
            onClick={handlePreview}
            disabled={previewTpl.loading}
          >
            <SparklesIcon className="size-4 stroke-2" />
            <span className="hidden sm:inline">
              {previewTpl.loading ? "Rendering…" : "Preview"}
            </span>
          </Button>
          <Button
            color="primary"
            className="gap-1.5 text-xs"
            onClick={handleSave}
            disabled={updateTpl.loading}
          >
            <CloudArrowUpIcon className="size-4 stroke-2" />
            {updateTpl.loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {/* ---- 3-pane body ---- */}
      <div className="flex min-h-0 flex-1">
        {/* Left: layer list */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-2.5 dark:border-dark-600">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Layers
            </h3>
            <Badge color="neutral" variant="soft" className="text-[10px]">
              {layers.length}
            </Badge>
          </div>

          {/* Add-layer dropdown */}
          <div className="relative shrink-0 border-b border-gray-200 p-2 dark:border-dark-600">
            <Button
              color="primary"
              variant="soft"
              className="w-full gap-1.5 text-xs"
              onClick={() => setAddMenuOpen((v) => !v)}
            >
              <PlusIcon className="size-4 stroke-2" />
              Add layer
            </Button>
            {addMenuOpen && (
              <>
                {/* Click-outside catcher */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setAddMenuOpen(false)}
                />
                <div className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg dark:border-dark-500 dark:bg-dark-700">
                  {LAYER_TYPE_BUTTONS.map((it) => {
                    const Icon = it.icon;
                    return (
                      <button
                        key={it.type}
                        type="button"
                        onClick={() => handleAddLayer(it.type)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 hover:bg-primary-500/10 hover:text-primary-700 dark:text-dark-100 dark:hover:bg-primary-500/15 dark:hover:text-primary-300"
                      >
                        <Icon className="size-4 stroke-2" />
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Layer list (sorted) */}
          <div className="hide-scrollbar grow overflow-y-auto p-2">
            {layersQuery.loading && layers.length === 0 ? (
              <LoadingState inline message="Loading layers…" />
            ) : sortedLayers.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-200 px-3 py-6 text-center dark:border-dark-500">
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  No layers yet. Click <strong>Add layer</strong> to start
                  designing.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {sortedLayers.map((layer, idx) => (
                  <LayerListItem
                    key={layer.id}
                    layer={layer}
                    isSelected={layer.id === selectedLayerId}
                    onSelect={() => setSelectedLayerId(layer.id)}
                    onMoveUp={() => handleReorder(layer.id, "up")}
                    onMoveDown={() => handleReorder(layer.id, "down")}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < sortedLayers.length - 1}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer: layer errors */}
          {(createLayer.error || deleteLayer.error) && (
            <div className="shrink-0 border-t border-error-500/30 p-2 text-[11px] text-error-600 dark:text-error-400">
              {createLayer.error?.message || deleteLayer.error?.message}
            </div>
          )}
        </aside>

        {/* Center: canvas */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {layersQuery.error && (
            <div className="shrink-0 border-b border-error-500/30 bg-error-500/5 px-4 py-2 text-xs text-error-600 dark:text-error-400">
              {layersQuery.error.message}
              <button
                type="button"
                onClick={() => void layersQuery.refetch()}
                className="ml-2 underline"
              >
                Retry
              </button>
            </div>
          )}
          <LayerCanvas
            layers={layers}
            backdrop={backdrop}
            selectedLayerId={selectedLayerId}
            orientation={orientation}
            showGrid={showGrid}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={handleUpdateLayer}
          />
        </div>

        {/* Right: properties */}
        {selectedLayer ? (
          <LayerProperties
            layer={selectedLayer}
            onUpdate={handleUpdateLayer}
            onDelete={handleDeleteLayer}
          />
        ) : (
          <div className="flex h-full w-72 shrink-0 flex-col items-center justify-center border-l border-gray-200 bg-white p-6 text-center dark:border-dark-600 dark:bg-dark-750">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <DocumentTextIcon className="size-6 stroke-2" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-dark-100">
              No layer selected
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
              Click a layer on the canvas (or in the list) to edit its
              properties.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

interface LayerListItemProps {
  layer: CertificateLayer;
  isSelected: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function LayerListItem({
  layer,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: LayerListItemProps) {
  const Icon = LAYER_TYPE_BUTTONS.find(
    (t) => t.type === layer.layerType,
  )?.icon ?? DocumentTextIcon;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={clsx(
          "group flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors",
          isSelected
            ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
            : "border-transparent text-gray-700 hover:bg-gray-100 dark:text-dark-100 dark:hover:bg-dark-600",
        )}
      >
        <Icon
          className={clsx(
            "size-4 shrink-0 stroke-2",
            isSelected
              ? "text-primary-600 dark:text-primary-400"
              : "text-gray-400 dark:text-dark-400",
          )}
        />
        <span className="min-w-0 flex-1 truncate">{layer.name}</span>
        {!layer.isVisible && (
          <EyeSlashIcon className="size-3 shrink-0 text-gray-400 dark:text-dark-400" />
        )}
        {layer.isLocked && (
          <LockClosedIcon className="size-3 shrink-0 text-gray-400 dark:text-dark-400" />
        )}
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-dark-500 dark:hover:text-dark-100"
            aria-label="Move layer up"
          >
            <ArrowUpIcon className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-dark-500 dark:hover:text-dark-100"
            aria-label="Move layer down"
          >
            <ArrowDownIcon className="size-3" />
          </button>
        </div>
      </div>
    </li>
  );
}

// ----------------------------------------------------------------------
// Tiny helper components used by the empty-canvas hint.
// ----------------------------------------------------------------------
