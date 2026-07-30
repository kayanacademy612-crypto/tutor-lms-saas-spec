// Import Dependencies
import { useState, useEffect } from "react";
import clsx from "clsx";
import { AcademicCapIcon } from "@heroicons/react/24/outline";

// ----------------------------------------------------------------------

export interface CourseThumbnailProps {
  /** Image URL. When omitted or failed to load, a fallback is shown. */
  url?: string;
  /** Course title — used for the alt text and the fallback gradient initial. */
  title: string;
  /** Aspect ratio / size preset. */
  size?: "xs" | "sm" | "md" | "lg" | "full";
  /** Optional corner-radius override (defaults to `rounded-lg`). */
  rounded?: string;
  /** Extra classes on the root wrapper. */
  className?: string;
}

const sizeClass: Record<NonNullable<CourseThumbnailProps["size"]>, string> = {
  xs: "h-16 w-24",
  sm: "h-24 w-40",
  md: "h-36 w-full",
  lg: "h-48 w-full",
  full: "aspect-[16/9] w-full",
};

/**
 * Course thumbnail image with graceful fallback.
 *
 * - If `url` is missing or fails to load, a branded gradient placeholder is
 *   rendered with the first letter of the title (or an `AcademicCapIcon` when
 *   no title is supplied).
 * - Image errors are caught via `onError`; once a URL has failed it is not
 *   retried on re-render (state is keyed by URL so it resets on change).
 */
export function CourseThumbnail({
  url,
  title,
  size = "md",
  rounded = "rounded-lg",
  className,
}: CourseThumbnailProps) {
  const [errored, setErrored] = useState(false);

  // Reset error state whenever the URL changes.
  useEffect(() => {
    setErrored(false);
  }, [url]);

  const showFallback = !url || errored;
  const initial = (title?.trim()?.[0] || "").toUpperCase();

  return (
    <div
      className={clsx(
        "relative overflow-hidden bg-gray-100 dark:bg-dark-600",
        rounded,
        sizeClass[size],
        className,
      )}
    >
      {showFallback ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-500/15 to-primary-700/20 dark:from-primary-500/10 dark:to-primary-700/25">
          {initial ? (
            <span className="select-none text-3xl font-bold text-primary-500/70 dark:text-primary-400/70">
              {initial}
            </span>
          ) : (
            <AcademicCapIcon className="size-10 text-primary-500/60 dark:text-primary-400/60" />
          )}
        </div>
      ) : (
        <>
          <img
            src={url}
            alt={title || "Course thumbnail"}
            loading="lazy"
            onError={() => setErrored(true)}
            className="h-full w-full object-cover"
          />
          {/* Subtle gradient veil so overlay text always stays legible. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
        </>
      )}
    </div>
  );
}

export default CourseThumbnail;
