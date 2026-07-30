// SimpleLineChart — lightweight SVG line chart (no chart library).
//
// Renders an inline SVG `<polyline>` + per-point `<circle>` markers with a
// hover tooltip showing the exact value. Width is responsive (the SVG scales
// to 100% of its container); the caller picks the height.

// Import Dependencies
import { useMemo, useState } from "react";
import clsx from "clsx";

// ----------------------------------------------------------------------

export interface SimpleLineChartDatum {
  /** X-axis label (e.g. "Jul 12"). */
  label: string;
  /** Numeric value — determines the Y position. */
  value: number;
  /** Optional pre-formatted value shown in the hover tooltip (defaults to `value`). */
  formattedValue?: string;
}

export interface SimpleLineChartProps {
  data: SimpleLineChartDatum[];
  /** Stroke color (any valid SVG stroke value, e.g. `rgb(99 102 241)`). Defaults to primary-500. */
  color?: string;
  /** Chart body height in pixels (defaults to 220). */
  height?: number;
  /** Extra classes on the root wrapper. */
  className?: string;
}

const PRIMARY_STROKE = "rgb(99 102 241)";

/**
 * SVG-based line chart. The polyline + circles are positioned in a 0..100
 * viewBox so the SVG scales fluidly with its container width. Each data point
 * is a transparent hit-target circle that reveals a tooltip on hover.
 */
export function SimpleLineChart({
  data,
  color = PRIMARY_STROKE,
  height = 220,
  className,
}: SimpleLineChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { points, peak, min } = useMemo(() => {
    if (data.length === 0) {
      return { points: [] as Array<{ x: number; y: number }>, peak: 0, min: 0 };
    }
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 0);
    const minVal = Math.min(...values, 0);
    const range = max - minVal || 1;
    const padTop = 6;
    const padBottom = 6;
    const usable = 100 - padTop - padBottom;
    const pts = data.map((d, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
      const y = padTop + (1 - (d.value - minVal) / range) * usable;
      return { x, y };
    });
    return { points: pts, peak: max, min: minVal };
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className={clsx(
          "flex items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-dark-600 dark:text-dark-300",
          className,
        )}
        style={{ height }}
      >
        No data for this period.
      </div>
    );
  }

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    points.length > 0
      ? `M ${points[0].x},100 L ${points
          .map((p) => `${p.x},${p.y}`)
          .join(" L ")} L ${points[points.length - 1].x},100 Z`
      : "";

  return (
    <div className={clsx("w-full", className)}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label="Line chart"
        >
          {/* Horizontal grid lines (3 reference lines). */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1={0}
              x2={100}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth={0.25}
              className="text-gray-200 dark:text-dark-600"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Filled area beneath the line. */}
          {areaPath && (
            <path
              d={areaPath}
              fill={color}
              fillOpacity={0.08}
              stroke="none"
            />
          )}

          {/* The line itself. */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data point markers + hover hit-targets. */}
          {points.map((p, i) => {
            const isHover = hoverIdx === i;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHover ? 1.6 : 1}
                  fill={color}
                  stroke="white"
                  strokeWidth={0.4}
                  vectorEffect="non-scaling-stroke"
                />
                {/* Invisible fat hit target for hover. */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  className="cursor-pointer"
                />
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip (HTML, positioned with percentage coords). */}
        {hoverIdx !== null && data[hoverIdx] && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-dark-900 dark:text-dark-50"
            style={{
              left: `${points[hoverIdx].x}%`,
              top: `${points[hoverIdx].y}%`,
              marginTop: -4,
            }}
          >
            <span className="text-white/70">{data[hoverIdx].label}</span>:{" "}
            {data[hoverIdx].formattedValue ?? String(data[hoverIdx].value)}
          </div>
        )}
      </div>

      {/* X-axis labels (first / middle / last). */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 dark:text-dark-400">
        <span className="truncate">{data[0].label}</span>
        {data.length > 2 && (
          <span className="truncate">
            {data[Math.floor(data.length / 2)].label}
          </span>
        )}
        <span className="truncate">{data[data.length - 1].label}</span>
      </div>

      {/* Y-axis peak annotation (compact). */}
      <p className="mt-1 text-[10px] text-gray-400 dark:text-dark-400">
        Peak {data.find((d) => d.value === peak)?.formattedValue ?? peak} ·
        Min {min}
      </p>
    </div>
  );
}

export default SimpleLineChart;
