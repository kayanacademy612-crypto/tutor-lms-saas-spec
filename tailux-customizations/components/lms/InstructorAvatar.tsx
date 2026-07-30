// Import Dependencies
import clsx from "clsx";

// Local Imports
import { Avatar } from "@/components/ui";

// ----------------------------------------------------------------------

export interface InstructorAvatarProps {
  /** Instructor display name (used for initials fallback). */
  name: string;
  /** Optional email shown beneath the name. */
  email?: string;
  /** Optional avatar image URL. */
  avatarUrl?: string;
  /** Avatar diameter in tailwind size units (default 10 → 2.5rem). */
  size?: number;
  /** Layout direction. `row` = avatar left, `col` = avatar top. */
  direction?: "row" | "col";
  /** Show only the avatar (no name/email). */
  avatarOnly?: boolean;
  /** Extra classes on the root wrapper. */
  className?: string;
}

/**
 * Avatar + name (and optional email) block for an instructor.
 *
 * Uses the tailux `Avatar` primitive so missing images fall back to
 * auto-generated initials with a deterministic color.
 */
export function InstructorAvatar({
  name,
  email,
  avatarUrl,
  size = 10,
  direction = "row",
  avatarOnly = false,
  className,
}: InstructorAvatarProps) {
  if (avatarOnly) {
    return (
      <Avatar
        name={name}
        src={avatarUrl}
        size={size}
        initialColor="auto"
        className={clsx("rounded-full", className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5",
        direction === "col" && "flex-col text-center",
        className,
      )}
    >
      <Avatar
        name={name}
        src={avatarUrl}
        size={size}
        initialColor="auto"
        className="rounded-full"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
          {name}
        </p>
        {email && (
          <p className="truncate text-xs text-gray-500 dark:text-dark-300">
            {email}
          </p>
        )}
      </div>
    </div>
  );
}

export default InstructorAvatar;
