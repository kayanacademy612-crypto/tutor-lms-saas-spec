// Import Dependencies
import { useLocation } from "react-router";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import SimpleBar from "simplebar-react";

// Local Imports
import { useDidUpdate } from "@/hooks";
import { navigation } from "@/app/navigation";
import { useAuthContext } from "@/app/contexts/auth/context";
import { Accordion } from "@/components/ui";
import { isRouteActive } from "@/utils/isRouteActive";
import { filterNavByRole } from "@/app/layouts/MainLayout/Sidebar/PrimePanel/Menu";
import { Group } from "./Group";

// ----------------------------------------------------------------------

/**
 * Pick the most-specific navigation segment whose `path` is a prefix of the
 * current `pathname`. Returns `undefined` when nothing matches.
 *
 * Why "most-specific": the Dashboard root segment has `path: "/"` which
 * matches every pathname — picking the longest path avoids always landing
 * on Dashboard when the user is actually on, e.g., `/apps/catalog`.
 */
function findMostSpecific<T extends { path?: string }>(
  items: T[],
  pathname: string,
): T | undefined {
  const matches = items.filter((item) => isRouteActive(item.path, pathname));
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return matches.reduce((longest, item) =>
    (item.path ?? "").length > (longest.path ?? "").length ? item : longest,
  );
}

export function Menu() {
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement | null>(null);
  const { user } = useAuthContext();
  const userRole = user?.role || "student";

  const roleFilteredNav = useMemo(
    () => filterNavByRole(navigation, userRole),
    [userRole],
  );

  const activeGroup = findMostSpecific(roleFilteredNav, pathname);

  const activeCollapsible = activeGroup?.childs?.find((item) => {
    if (item.path) return isRouteActive(item.path, pathname);
  });

  const [expanded, setExpanded] = useState<string | null>(
    activeCollapsible?.path || null,
  );

  useDidUpdate(() => {
    if (activeCollapsible?.path !== expanded)
      setExpanded(activeCollapsible?.path || null);
  }, [activeCollapsible?.path]);

  useLayoutEffect(() => {
    const activeItem = ref.current?.querySelector("[data-menu-active=true]");
    activeItem?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <SimpleBar
      scrollableNodeProps={{ ref }}
      className="h-full overflow-x-hidden pb-6"
    >
      <Accordion value={expanded} onChange={setExpanded} className="space-y-1">
        {roleFilteredNav.map((nav) => (
          <Group key={nav.id} data={nav} />
        ))}
      </Accordion>
    </SimpleBar>
  );
}
