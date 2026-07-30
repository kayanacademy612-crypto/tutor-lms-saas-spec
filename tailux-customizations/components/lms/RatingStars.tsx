// Import Dependencies
import clsx from "clsx";
import { useState } from "react";
import { StarIcon as StarOutlineIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface RatingStarsProps {
  /** Current rating value (0..max). Supports half-step display via rounding. */
  value: number;
  /** Maximum number of stars. Defaults to 5. */
  max?: number;
  /** Star size in tailwind `size-*` token, e.g. "size-4". */
  size?: string;
  /** Whether the user can hover/click to change the rating. */
  interactive?: boolean;
  /** Called with the new integer rating when a star is clicked. */
  onChange?: (value: number) => void;
  /** Optional count label rendered after the stars (e.g. "(128)"). */
  count?: number | string;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Star rating display.
 *
 * - Read-only by default (renders partially-filled stars for fractional values).
 * - When `interactive` is true, hovering previews and clicking commits an
 *   integer rating via `onChange`.
 *
 * NOTE: uses solid star icons from `@heroicons/react/24/solid` for filled
 * stars and the outline variant for empty ones — the outline pack is required
 * by the project conventions for the rest of the UI, but star fills read much
 * better as solid glyphs.
 */
export function RatingStars({
  value,
  max = 5,
  size = "size-4",
  interactive = false,
  onChange,
  count,
  className,
}: RatingStarsProps) {
  const [hover, setHover] = useState<number | null>(null);

  const display = hover ?? value;
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1",
        interactive && "cursor-pointer",
        className,
      )}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`Rating: ${value} out of ${max}`}
    >
      <div
        className="inline-flex items-center"
        onMouseLeave={interactive ? () => setHover(null) : undefined}
      >
        {stars.map((star) => {
          const filled = display >= star;
          // Half-fill look for fractional ratings (e.g. 3.5).
          const isHalf =
            !filled &&
            !interactive &&
            Math.ceil(display) === star &&
            display % 1 >= 0.25;

          return (
            <Button
              key={star}
              unstyled
              disabled={!interactive}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onClick={
                interactive && onChange
                  ? () => onChange(star)
                  : undefined
              }
              onMouseEnter={
                interactive ? () => setHover(star) : undefined
              }
              tabIndex={interactive ? 0 : -1}
              className={clsx(
                "btn-base leading-none",
                interactive
                  ? "cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                  : "cursor-default",
                !interactive && "pointer-events-none",
              )}
            >
              {filled ? (
                <StarSolidIcon
                  className={clsx(size, "text-amber-400 dark:text-amber-300")}
                />
              ) : isHalf ? (
                <span className="relative inline-flex">
                  <StarOutlineIcon
                    className={clsx(size, "text-amber-400 dark:text-amber-300")}
                  />
                  <StarSolidIcon
                    className={clsx(
                      size,
                      "absolute inset-0 text-amber-400 dark:text-amber-300",
                    )}
                    style={{ clipPath: "inset(0 50% 0 0)" }}
                  />
                </span>
              ) : (
                <StarOutlineIcon
                  className={clsx(size, "text-gray-300 dark:text-dark-400")}
                />
              )}
            </Button>
          );
        })}
      </div>
      {count !== undefined && (
        <span className="text-xs font-medium text-gray-500 dark:text-dark-300">
          ({count})
        </span>
      )}
    </div>
  );
}

export default RatingStars;
