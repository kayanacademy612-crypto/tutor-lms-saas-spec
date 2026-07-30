// Import Dependencies
import clsx from "clsx";
import {
  ArrowRightIcon,
  PlayCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface EnrollmentButtonProps {
  /** Whether the user is currently enrolled in the course. */
  enrolled: boolean;
  /** Called when an unenrolled user clicks "Enroll". */
  onEnroll?: () => void;
  /** Called when an enrolled user clicks "Continue Learning". */
  onContinue?: () => void;
  /** Optional progress (0-100) — when > 0 an enrolled user sees "Continue". */
  progress?: number;
  /** Show a lock icon for paid/unenrolled courses that require purchase. */
  locked?: boolean;
  /** Render full-width. */
  block?: boolean;
  /** Visual size of the button. */
  size?: "sm" | "md" | "lg";
  /** Extra classes on the button. */
  className?: string;
}

const sizeClass = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/**
 * Context-aware enrollment CTA.
 *
 * - Unenrolled → "Enroll" (primary filled).
 * - Enrolled, no progress → "Start Course".
 * - Enrolled with progress → "Continue Learning".
 * - `locked` adds a padlock hint for gated/paid content.
 */
export function EnrollmentButton({
  enrolled,
  onEnroll,
  onContinue,
  progress,
  locked = false,
  block = false,
  size = "md",
  className,
}: EnrollmentButtonProps) {
  const hasProgress = typeof progress === "number" && progress > 0;

  const label = !enrolled
    ? "Enroll"
    : hasProgress
      ? "Continue Learning"
      : "Start Course";

  const handleClick = enrolled ? onContinue : onEnroll;

  return (
    <Button
      color="primary"
      variant="filled"
      onClick={handleClick}
      className={clsx(
        "gap-1.5 font-medium",
        block && "w-full",
        sizeClass[size],
        className,
      )}
    >
      {enrolled ? (
        <PlayCircleIcon className="size-4 stroke-2" />
      ) : locked ? (
        <LockClosedIcon className="size-4 stroke-2" />
      ) : (
        <ArrowRightIcon className="size-4 stroke-2" />
      )}
      <span>{label}</span>
    </Button>
  );
}

export default EnrollmentButton;
