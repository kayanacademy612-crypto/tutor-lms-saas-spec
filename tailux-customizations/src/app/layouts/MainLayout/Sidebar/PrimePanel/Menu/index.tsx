// Import Dependencies
import { useLayoutEffect, useMemo, useState } from "react";
import SimpleBar from "simplebar-react";

// Local Imports
import { isRouteActive } from "@/utils/isRouteActive";
import { useDataScrollOverflow, useDidUpdate } from "@/hooks";
import { CollapsibleItem } from "./CollapsibleItem";
import { Accordion } from "@/components/ui";
import { MenuItem } from "./MenuItem";
import { Divider } from "./Divider";
import { NavigationTree } from "@/@types/navigation";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

export interface MenuProps {
  nav: NavigationTree[];
  pathname: string;
}

/**
 * Filter a navigation tree by the current user's role.
 *
 * An item is kept when:
 *   - it has no `roles` array (visible to everyone), OR
 *   - the user's role is in the `roles` array.
 *
 * Dividers are kept when at least one item on each side survives the filter —
 * otherwise we'd end up with stacked dividers at the top/bottom of a section.
 * For simplicity we keep dividers whenever the previous visible sibling was an
 * item (i.e. drop leading / trailing / consecutive dividers).
 */
export function filterNavByRole(
  nav: NavigationTree[],
  role: string | undefined,
): NavigationTree[] {
  if (!role) return nav;

  const filtered = nav
    .filter((item) => !item.roles || item.roles.includes(role))
    .map((item) =>
      item.childs
        ? {
            ...item,
            childs: item.childs.filter(
              (child) => !child.roles || child.roles.includes(role),
            ),
          }
        : item,
    );

  // Drop leading / trailing / consecutive dividers.
  let prevWasItem = false;
  const result: NavigationTree[] = [];
  for (const item of filtered) {
    if (item.type === "divider") {
      if (!prevWasItem) continue;
      // Peek ahead — only keep the divider if there's a non-divider after it.
      result.push(item);
      prevWasItem = false;
    } else {
      result.push(item);
      prevWasItem = true;
    }
  }
  // Trim a trailing divider (if any).
  while (result.length > 0 && result[result.length - 1].type === "divider") {
    result.pop();
  }
  return result;
}

export function Menu({ nav, pathname }: MenuProps) {
  const { user } = useAuthContext();
  const userRole = user?.role || "student";

  const roleFilteredNav = useMemo(
    () => filterNavByRole(nav, userRole),
    [nav, userRole],
  );

  const initialActivePath = useMemo(() => {
    return (
      roleFilteredNav.find((item) =>
        isRouteActive(item.path, pathname),
      )?.path ?? ""
    );
  }, [roleFilteredNav, pathname]);

  const { ref } = useDataScrollOverflow({ updateDeps: roleFilteredNav });
  const [expanded, setExpanded] = useState(initialActivePath);

  useDidUpdate(() => {
    const activePath = roleFilteredNav.find((item) =>
      isRouteActive(item.path, pathname),
    )?.path;

    if (activePath && expanded !== activePath) {
      setExpanded(activePath);
    }
  }, [roleFilteredNav, pathname]);

  useLayoutEffect(() => {
    const activeItem = ref?.current?.querySelector("[data-menu-active=true]");
    activeItem?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <Accordion
      value={expanded}
      onChange={setExpanded}
      className="flex flex-col overflow-hidden"
    >
      <SimpleBar
        scrollableNodeProps={{ ref }}
        className="h-full overflow-x-hidden pb-6"
        style={{ "--scroll-shadow-size": "32px" } as React.CSSProperties}
      >
        <div className="flex h-full flex-1 flex-col px-4">
          {roleFilteredNav.map((item) => {
            switch (item.type) {
              case "collapse":
                return <CollapsibleItem key={item.path} data={item} />;
              case "item":
                return <MenuItem key={item.path} data={item} />;
              case "divider":
                return <Divider key={item.id} />;
              default:
                return null;
            }
          })}
        </div>
      </SimpleBar>
    </Accordion>
  );
}
