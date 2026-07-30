import { NavigationTree } from "@/@types/navigation";

/**
 * Sidebar root-segment shown on the standalone Settings page (under
 * `/settings/*`). The main app sidebar uses `navigation` from `./index.ts`
 * instead — this is a minimal, single-segment rail for the Settings shell.
 */
export const baseNavigationObj: Record<string, NavigationTree> = {
  settings: {
    id: "settings",
    type: "item",
    path: "/settings",
    title: "Settings",
    transKey: "nav.settings.settings",
    icon: "settings",
  },
};

export const baseNavigation: NavigationTree[] = Array.from(
  Object.values(baseNavigationObj),
);
