// Import Dependencies
import clsx from "clsx";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export interface WishlistButtonProps {
  /** Course to toggle in the wishlist. */
  courseId: string;
  /** Whether the course is currently wishlisted by the viewer. */
  isWishlisted: boolean;
  /** Toggle handler — called with `courseId` on every click. */
  onToggle: (courseId: string) => void;
  /** Visual size of the button. */
  size?: "sm" | "md";
  /** Render the filled icon variant while loading (debounced clicks). */
  loading?: boolean;
  /** Optional accessible label override. */
  ariaLabel?: string;
  /** Extra classes on the button. */
  className?: string;
}

const sizeClass = {
  sm: "size-8",
  md: "size-10",
} as const;

const iconSizeClass = {
  sm: "size-4",
  md: "size-5",
} as const;

/**
 * Icon-only toggle button for course wishlists.
 *
 * Renders an outline `HeartIcon` when the course is *not* wishlisted and
 * a solid `HeartIcon` (red-tinted) when it is. The component is controlled
 * (`isWishlisted` is owned by the parent) so it pairs cleanly with the
 * `useWishlist` + `useToggleWishlist` hooks from `@/hooks/useEcommerce`.
 */
export function WishlistButton({
  courseId,
  isWishlisted,
  onToggle,
  size = "md",
  loading = false,
  ariaLabel,
  className,
}: WishlistButtonProps) {
  const active = isWishlisted || loading;

  return (
    <Button
      color={active ? "error" : "neutral"}
      variant={active ? "soft" : "outlined"}
      isIcon
      aria-label={ariaLabel ?? (isWishlisted ? "Remove from wishlist" : "Add to wishlist")}
      aria-pressed={isWishlisted}
      onClick={() => onToggle(courseId)}
      disabled={loading}
      className={clsx(
        sizeClass[size],
        "transition-colors",
        className,
      )}
    >
      {isWishlisted ? (
        <HeartSolidIcon className={clsx(iconSizeClass[size], "text-error-500 dark:text-error-400")} />
      ) : (
        <HeartOutlineIcon className={clsx(iconSizeClass[size], "text-gray-500 dark:text-dark-200")} />
      )}
    </Button>
  );
}

export default WishlistButton;
