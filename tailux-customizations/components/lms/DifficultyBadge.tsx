// Import Dependencies
import clsx from "clsx";

// Local Imports
import { Badge } from "@/components/ui";
import { ColorType } from "@/constants/app";

// ----------------------------------------------------------------------

/**
 * Difficulty level union.
 *
 * Mirrors the spec levels (`all_levels | beginner | intermediate | expert`)
 * and also accepts `advanced` (the value actually used by `Course.difficulty`
 * in `src/types/lms.ts`) so the badge can be driven directly from a `Course`.
 */
export type DifficultyLevel =
  | "all_levels"
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export interface DifficultyBadgeProps {
  level: DifficultyLevel;
  /** Render with the `soft` variant instead of filled. */
  soft?: boolean;
  /** Extra classes on the badge. */
  className?: string;
}

interface LevelConfig {
  label: string;
  color: ColorType;
}

const LEVELS: Record<DifficultyLevel, LevelConfig> = {
  all_levels: { label: "All Levels", color: "info" },
  beginner: { label: "Beginner", color: "success" },
  intermediate: { label: "Intermediate", color: "warning" },
  // `advanced` is treated as the same tier as `expert` for color-coding.
  advanced: { label: "Advanced", color: "error" },
  expert: { label: "Expert", color: "error" },
};

/**
 * Compact badge that color-codes a course difficulty level.
 *
 * Color scheme:
 *  - all_levels    → info (blue)
 *  - beginner      → success (green)
 *  - intermediate  → warning (amber)
 *  - advanced      → error (red)
 *  - expert        → error (red)
 */
export function DifficultyBadge({
  level,
  soft = false,
  className,
}: DifficultyBadgeProps) {
  const cfg = LEVELS[level] ?? LEVELS.beginner;
  return (
    <Badge
      color={cfg.color}
      variant={soft ? "soft" : "filled"}
      className={clsx("shrink-0", className)}
    >
      {cfg.label}
    </Badge>
  );
}

export default DifficultyBadge;
