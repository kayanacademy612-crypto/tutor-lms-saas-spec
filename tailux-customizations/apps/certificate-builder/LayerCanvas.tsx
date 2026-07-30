// LayerCanvas — the center pane of the TemplateEditor.
//
// Renders the certificate backdrop (or a gradient fallback) plus every
// `CertificateLayer` as an absolutely-positioned div. Layers can be:
//   - Clicked  → select (calls `onSelectLayer(id)`)
//   - Dragged  → move (calls `onUpdateLayer(id, { positionX, positionY })`)
//   - Resized  → drag a corner handle (calls
//                 `onUpdateLayer(id, { width, height })`)
//
// No DnD library — just `onMouseDown` / `onMouseMove` / `onMouseUp`
// handlers with a `useRef` drag state and a `useState` "live override" for
// the layer currently being dragged (so the DOM updates smoothly without
// round-tripping through the parent on every mousemove). The override is
// flushed to the parent via `onUpdateLayer` on `mouseup`.
//
// Coordinates are stored as **canvas-space pixels** at a fixed reference
// resolution:
//   - landscape → 1000 × 707
//   - portrait  → 707 × 1000
// The canvas is rendered at a responsive display size; mouse deltas are
// scaled back to canvas-space using the canvas's actual pixel width.

// Import Dependencies
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  PointerEvent as ReactPointerEvent,
} from "react";
import clsx from "clsx";
import {
  LockClosedIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import type {
  CertificateBackdrop,
  CertificateDataKey,
  CertificateLayer,
  CertificateLayerCreateInput,
} from "@/types/lms";

// ----------------------------------------------------------------------

/** Reference canvas size for each orientation (in canvas-space px). */
const CANVAS_SIZE = {
  landscape: { w: 1000, h: 707 },
  portrait: { w: 707, h: 1000 },
} as const;

/** Sample text shown for each data key while editing the canvas. */
const DATA_KEY_SAMPLE: Record<CertificateDataKey, string> = {
  student_name: "Student Name",
  course_title: "Course Title",
  instructor_name: "Instructor Name",
  issue_date: "Apr 12, 2026",
  score: "95%",
  certificate_number: "CERT-AB12CD34",
  completion_date: "Apr 10, 2026",
};

// ----------------------------------------------------------------------

export interface LayerCanvasProps {
  layers: CertificateLayer[];
  backdrop?: CertificateBackdrop;
  /** Currently selected layer id (renders a highlight + resize handles). */
  selectedLayerId?: string;
  /** Orientation string from the template. Defaults to "landscape". */
  orientation?: string;
  /** Show alignment grid overlay (toggle from the editor toolbar). */
  showGrid?: boolean;
  onSelectLayer: (id: string) => void;
  /** Persisted on drag-end / resize-end with the new geometry. */
  onUpdateLayer: (
    id: string,
    input: Partial<CertificateLayerCreateInput>,
  ) => void;
}

// ----------------------------------------------------------------------

type DragMode = "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se";

interface DragState {
  layerId: string;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  // Canvas-space values at drag start:
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

// ----------------------------------------------------------------------

export default function LayerCanvas({
  layers,
  backdrop,
  selectedLayerId,
  orientation,
  showGrid,
  onSelectLayer,
  onUpdateLayer,
}: LayerCanvasProps) {
  const isPortrait = orientation === "portrait";
  const canvasSize = isPortrait
    ? CANVAS_SIZE.portrait
    : CANVAS_SIZE.landscape;

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // `liveOverride` is the canvas-space geometry of the layer currently
  // being dragged/resized. It mirrors `DragState` but in a `useState` so
  // React re-renders the layer at the new position on every mousemove.
  const [liveOverride, setLiveOverride] = useState<{
    layerId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // ------------------------------------------------------------------
  // Convert a mouse event's clientX/Y to canvas-space coords using the
  // canvas element's actual bounding rect.
  // ------------------------------------------------------------------
  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const el = canvasRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const scaleX = canvasSize.w / rect.width;
      const scaleY = canvasSize.h / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [canvasSize.w, canvasSize.h],
  );

  // ------------------------------------------------------------------
  // Pointer handlers — attached to each layer + its resize handles.
  // ------------------------------------------------------------------
  const beginDrag = useCallback(
    (
      e: ReactPointerEvent<HTMLDivElement>,
      layer: CertificateLayer,
      mode: DragMode,
    ) => {
      // Locked / hidden layers can't be interacted with (you can still
      // select them by clicking, but not drag/resize).
      if (layer.isLocked) return;
      e.stopPropagation();
      e.preventDefault();
      onSelectLayer(layer.id);

      const start = toCanvasCoords(e.clientX, e.clientY);
      dragRef.current = {
        layerId: layer.id,
        mode,
        startClientX: start.x,
        startClientY: start.y,
        origX: layer.positionX,
        origY: layer.positionY,
        origW: layer.width ?? 200,
        origH: layer.height ?? 80,
      };
      applyLive({
        layerId: layer.id,
        x: layer.positionX,
        y: layer.positionY,
        w: layer.width ?? 200,
        h: layer.height ?? 80,
      });
    },
    [onSelectLayer, toCanvasCoords, applyLive],
  );

  // ------------------------------------------------------------------
  // Global mousemove / mouseup — attached via window listeners while a
  // drag is in progress. We use `requestAnimationFrame` to batch updates
  // so dragging stays smooth even on slower machines.
  //
  // `liveRef` mirrors `liveOverride` so the `mouseup` handler (which is
  // attached in an effect that closes over `liveOverride`) can read the
  // LATEST position without re-subscribing on every mousemove. Otherwise
  // the handler would capture a stale value (the closure's `liveOverride`
  // is whatever it was when the effect last ran).
  // ------------------------------------------------------------------
  const rafRef = useRef<number | null>(null);
  const pendingEventRef = useRef<{ x: number; y: number } | null>(null);
  const liveRef = useRef<{
    layerId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const applyLive = useCallback(
    (next: {
      layerId: string;
      x: number;
      y: number;
      w: number;
      h: number;
    }) => {
      liveRef.current = next;
      setLiveOverride(next);
    },
    [],
  );

  const flushDrag = useCallback(() => {
    rafRef.current = null;
    const drag = dragRef.current;
    const evt = pendingEventRef.current;
    if (!drag || !evt) return;

    const dx = evt.x - drag.startClientX;
    const dy = evt.y - drag.startClientY;

    const { origX, origY, origW, origH } = drag;
    let newX = origX;
    let newY = origY;
    let newW = origW;
    let newH = origH;

    if (drag.mode === "move") {
      newX = origX + dx;
      newY = origY + dy;
    } else if (drag.mode === "resize-se") {
      newW = Math.max(20, origW + dx);
      newH = Math.max(20, origH + dy);
    } else if (drag.mode === "resize-sw") {
      newX = origX + dx;
      newW = Math.max(20, origW - dx);
      newH = Math.max(20, origH + dy);
    } else if (drag.mode === "resize-ne") {
      newY = origY + dy;
      newW = Math.max(20, origW + dx);
      newH = Math.max(20, origH - dy);
    } else if (drag.mode === "resize-nw") {
      newX = origX + dx;
      newY = origY + dy;
      newW = Math.max(20, origW - dx);
      newH = Math.max(20, origH - dy);
    }

    // Clamp inside canvas
    newX = Math.max(0, Math.min(canvasSize.w - newW, newX));
    newY = Math.max(0, Math.min(canvasSize.h - newH, newY));

    applyLive({
      layerId: drag.layerId,
      x: newX,
      y: newY,
      w: newW,
      h: newH,
    });
  }, [canvasSize.w, canvasSize.h, applyLive]);

  useEffect(() => {
    if (!liveOverride) return; // no drag in progress

    const handleMove = (e: PointerEvent | MouseEvent) => {
      pendingEventRef.current = toCanvasCoords(e.clientX, e.clientY);
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flushDrag);
      }
    };
    const handleUp = () => {
      // Flush any pending rAF first so the final position is captured.
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      flushDrag();
      const drag = dragRef.current;
      // Read the LATEST position from the ref (set by `flushDrag` above)
      // rather than the closure-captured `liveOverride` state value,
      // which would be one frame stale.
      const final = liveRef.current;
      if (drag && final && final.layerId === drag.layerId) {
        onUpdateLayer(drag.layerId, {
          positionX: Math.round(final.x),
          positionY: Math.round(final.y),
          width: Math.round(final.w),
          height: Math.round(final.h),
        });
      }
      dragRef.current = null;
      pendingEventRef.current = null;
      liveRef.current = null;
      setLiveOverride(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [liveOverride, flushDrag, onUpdateLayer, toCanvasCoords]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto bg-gray-100 p-6 dark:bg-dark-800">
      <div
        ref={canvasRef}
        onPointerDown={(e) => {
          // Clicking blank canvas deselects.
          if (e.target === e.currentTarget) onSelectLayer("");
        }}
        className={clsx(
          "relative shadow-xl ring-1 ring-black/10",
          isPortrait ? "max-h-full" : "max-w-full",
        )}
        style={{
          aspectRatio: isPortrait ? "707 / 1000" : "1000 / 707",
          width: isPortrait ? "auto" : "min(100%, 1000px)",
          height: isPortrait ? "min(100%, 1000px)" : "auto",
          background: backdrop
            ? `url(${backdrop.imageUrl}) center/cover no-repeat`
            : "white",
        }}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)",
              backgroundSize: `${100 / 10}% ${100 / 10}%`,
            }}
          />
        )}

        {/* Layers (sorted by sortOrder, then creation order). */}
        {[...layers]
          .sort(
            (a, b) =>
              (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
              a.createdAt.localeCompare(b.createdAt),
          )
          .map((layer) => (
            <LayerView
              key={layer.id}
              layer={layer}
              canvasW={canvasSize.w}
              canvasH={canvasSize.h}
              isSelected={layer.id === selectedLayerId}
              liveOverride={
                liveOverride && liveOverride.layerId === layer.id
                  ? liveOverride
                  : null
              }
              onPointerDown={(e) => beginDrag(e, layer, "move")}
              onSelect={() => onSelectLayer(layer.id)}
              onResizeHandle={(mode) => (
                e: ReactPointerEvent<HTMLDivElement>,
              ) => beginDrag(e, layer, mode)}
            />
          ))}

        {/* Empty-canvas hint */}
        {layers.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-black/5 px-4 py-2 text-sm text-gray-500 dark:bg-white/10 dark:text-dark-200">
              Add a layer from the left panel to start designing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------

interface LayerViewProps {
  layer: CertificateLayer;
  canvasW: number;
  canvasH: number;
  isSelected: boolean;
  liveOverride: { x: number; y: number; w: number; h: number } | null;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onSelect: () => void;
  onResizeHandle: (
    mode: DragMode,
  ) => (e: ReactPointerEvent<HTMLDivElement>) => void;
}

function LayerView({
  layer,
  canvasW,
  canvasH,
  isSelected,
  liveOverride,
  onPointerDown,
  onSelect,
  onResizeHandle,
}: LayerViewProps) {
  const x = liveOverride?.x ?? layer.positionX;
  const y = liveOverride?.y ?? layer.positionY;
  const w = liveOverride?.w ?? layer.width ?? 200;
  const h = liveOverride?.h ?? layer.height ?? 80;
  const rotation = layer.rotation ?? 0;
  const opacity = layer.opacity ?? 1;

  if (!layer.isVisible) {
    // Hidden layers are still listed in the sidebar; show a faint ghost
    // on the canvas so the editor knows they exist.
    return (
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{
          left: `${(x / canvasW) * 100}%`,
          top: `${(y / canvasH) * 100}%`,
          width: `${(w / canvasW) * 100}%`,
          height: `${(h / canvasH) * 100}%`,
          transform: `rotate(${rotation}deg)`,
          opacity: 0.35,
        }}
      >
        <div className="flex items-center gap-1 rounded-md border border-dashed border-gray-400 bg-white/40 px-2 py-1 text-[10px] text-gray-500 dark:bg-dark-700/40 dark:text-dark-300">
          <EyeSlashIcon className="size-3" />
          {layer.name} (hidden)
        </div>
      </div>
    );
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={clsx(
        "absolute cursor-move select-none",
        isSelected
          ? "outline outline-2 outline-primary-500"
          : "outline outline-1 outline-transparent hover:outline-primary-500/40",
        layer.isLocked && "cursor-default",
      )}
      style={{
        left: `${(x / canvasW) * 100}%`,
        top: `${(y / canvasH) * 100}%`,
        width: `${(w / canvasW) * 100}%`,
        height: `${(h / canvasH) * 100}%`,
        transform: `rotate(${rotation}deg)`,
        opacity,
      }}
    >
      <LayerContent layer={layer} />

      {/* Locked indicator */}
      {layer.isLocked && (
        <div className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-gray-700 text-white">
          <LockClosedIcon className="size-2.5" />
        </div>
      )}

      {/* Resize handles (selected + unlocked only) */}
      {isSelected && !layer.isLocked && (
        <>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => {
            const handlePos: Record<
              (typeof corner)[],
              string
            > = {
              nw: "-left-1 -top-1 cursor-nwse-resize",
              ne: "-right-1 -top-1 cursor-nesw-resize",
              sw: "-left-1 -bottom-1 cursor-nesw-resize",
              se: "-right-1 -bottom-1 cursor-nwse-resize",
            };
            return (
              <div
                key={corner}
                onPointerDown={onResizeHandle(
                  `resize-${corner}` as DragMode,
                )}
                className={clsx(
                  "absolute size-2.5 rounded-full border-2 border-white bg-primary-500 shadow",
                  handlePos[corner],
                )}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

/** Renders the actual visible content of a layer (text / image / shape). */
function LayerContent({ layer }: { layer: CertificateLayer }) {
  const color = layer.color ?? "#1f2937";
  const fontFamily = layer.fontFamily ?? "Inter, sans-serif";
  const fontSize = layer.fontSize ?? 18;
  const fontWeight = layer.fontWeight ?? "400";
  const textAlign = (layer.textAlign ?? "left") as "left" | "center" | "right";

  // Resolve data-key bindings to sample text for preview.
  const resolveContent = (raw?: string): string => {
    if (!raw) return "";
    if (layer.dataKey && raw.includes(`{${layer.dataKey}}`)) {
      return raw.replace(
        `{${layer.dataKey}}`,
        DATA_KEY_SAMPLE[layer.dataKey],
      );
    }
    // Replace any other `{key}` tokens with their sample value (best-effort).
    return raw.replace(/\{(\w+)\}/g, (_, key: string) => {
      const sample =
        DATA_KEY_SAMPLE[key as CertificateDataKey] ?? `{${key}}`;
      return sample;
    });
  };

  switch (layer.layerType) {
    case "text":
    case "signature":
      return (
        <div
          className="flex h-full w-full overflow-hidden"
          style={{
            color,
            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight,
            fontStyle: layer.fontStyle ?? "normal",
            textAlign,
            alignItems: "center",
            justifyContent:
              textAlign === "center"
                ? "center"
                : textAlign === "right"
                  ? "flex-end"
                  : "flex-start",
            padding: "4px 6px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {resolveContent(layer.content) || (
            <span className="opacity-50">[empty text layer]</span>
          )}
        </div>
      );

    case "image":
      if (!layer.imageUrl) {
        return (
          <div className="flex h-full w-full items-center justify-center rounded border border-dashed border-gray-300 text-[10px] text-gray-400 dark:border-dark-500 dark:text-dark-400">
            No image URL
          </div>
        );
      }
      return (
        <img
          src={layer.imageUrl}
          alt={layer.name}
          draggable={false}
          className="h-full w-full object-contain"
        />
      );

    case "qrcode":
      // QR code placeholder — the backend generates the actual QR image
      // from the layer's `content` (usually `{certificate_number}`).
      return (
        <div className="flex h-full w-full items-center justify-center bg-white">
          <div
            className="size-full opacity-90"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#1f2937 0% 25%, #fff 0% 50%)",
              backgroundSize: "20% 20%",
            }}
            aria-label={`QR code: ${resolveContent(layer.content) || "certificate"}`}
          />
        </div>
      );

    case "shape": {
      const shape = layer.shapeType ?? "rect";
      const fill = layer.fillColor ?? "#e5e7eb";
      const border = layer.borderColor ?? "transparent";
      const borderWidth = layer.borderWidth ?? 0;
      if (shape === "circle") {
        return (
          <div
            className="size-full rounded-full"
            style={{
              background: fill,
              border: `${borderWidth}px solid ${border}`,
            }}
          />
        );
      }
      if (shape === "line") {
        return (
          <div
            className="absolute left-1/2 top-1/2 w-full"
            style={{
              height: `${Math.max(borderWidth, 2)}px`,
              background: fill,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      }
      return (
        <div
          className="size-full"
          style={{
            background: fill,
            border: `${borderWidth}px solid ${border}`,
          }}
        />
      );
    }

    default:
      return null;
  }
}
