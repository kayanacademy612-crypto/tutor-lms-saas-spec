// Import Dependencies
import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  GiftIcon,
  RectangleStackIcon,
  SparklesIcon,
  Squares2X2Icon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { ComponentType, useMemo } from "react";

// Local Imports
import { Avatar, type AvatarProps } from "@/components/ui";
import { Link, type To } from "react-router";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

interface AppItem {
  id: string;
  Icon: ComponentType<{ className?: string }>;
  title: string;
  color: AvatarProps["initialColor"];
  to: To;
  /** Restrict to LMS roles (omit = visible to everyone). */
  roles?: string[];
}

/**
 * The full LMS app launcher set. The visible subset is computed at render
 * time from the current user's role — see `Apps` below.
 */
const ALL_APPS: AppItem[] = [
  {
    id: "catalog",
    Icon: Squares2X2Icon,
    title: "Catalog",
    color: "primary",
    to: "/apps/catalog",
    roles: ["student", "instructor", "admin", "owner"],
  },
  {
    id: "learning-area",
    Icon: AcademicCapIcon,
    title: "Learning",
    color: "success",
    to: "/apps/learning-area",
    roles: ["student"],
  },
  {
    id: "instructor-dashboard",
    Icon: RectangleStackIcon,
    title: "Teaching",
    color: "info",
    to: "/apps/instructor-dashboard",
    roles: ["instructor", "admin", "owner"],
  },
  {
    id: "tutor-ai",
    Icon: SparklesIcon,
    title: "TutorAI",
    color: "secondary",
    to: "/apps/tutor-ai",
    roles: ["instructor", "admin", "owner"],
  },
  {
    id: "reports-dashboard",
    Icon: ArrowTrendingUpIcon,
    title: "Reports",
    color: "warning",
    to: "/apps/reports-dashboard",
    roles: ["admin", "owner"],
  },
  {
    id: "ecommerce",
    Icon: BanknotesIcon,
    title: "Store",
    color: "error",
    to: "/apps/ecommerce",
    roles: ["admin", "owner"],
  },
  {
    id: "orders-admin",
    Icon: DocumentTextIcon,
    title: "Orders",
    color: "info",
    to: "/apps/orders-admin",
    roles: ["admin", "owner"],
  },
  {
    id: "memberships",
    Icon: UserGroupIcon,
    title: "Members",
    color: "success",
    to: "/apps/memberships",
    roles: ["admin", "owner"],
  },
  {
    id: "gift-course",
    Icon: GiftIcon,
    title: "Gift",
    color: "warning",
    to: "/apps/gift-course",
    roles: ["admin", "owner"],
  },
  {
    id: "settings",
    Icon: Cog6ToothIcon,
    title: "Settings",
    color: "secondary",
    to: "/apps/settings-pages",
    roles: ["admin", "owner"],
  },
  {
    id: "platform-admin",
    Icon: BuildingLibraryIcon,
    title: "Platform",
    color: "primary",
    to: "/admin/dashboard",
    roles: ["owner"],
  },
];

export function Apps({ close }: { close: () => void }) {
  const { user } = useAuthContext();
  const userRole = user?.role || "student";

  const apps = useMemo(
    () => ALL_APPS.filter((app) => !app.roles || app.roles.includes(userRole)),
    [userRole],
  );

  if (apps.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <h2 className="text-xs-plus dark:text-dark-100 line-clamp-1 px-3 font-medium tracking-wide text-gray-800">
        Pinned Apps
      </h2>
      <div className="mt-3 flex flex-wrap gap-3 px-3">
        {apps.map((app) => (
          <Link
            key={app.id}
            to={app.to}
            onClick={close}
            className="w-12 shrink-0 text-center"
          >
            <Avatar
              size={10}
              initialColor={app.color}
              classNames={{
                display: "mask is-squircle rounded-none",
              }}
            >
              <app.Icon className="size-5.5" />
            </Avatar>
            <span className="dark:text-dark-100 mt-1.5 block truncate text-xs whitespace-nowrap text-gray-800">
              {app.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
