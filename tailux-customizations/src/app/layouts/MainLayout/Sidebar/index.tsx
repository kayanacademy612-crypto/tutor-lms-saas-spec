// Import Dependencies
import { useMemo, useState } from "react";
import { useLocation } from "react-router";

// Local Imports
import { useBreakpointsContext } from "@/app/contexts/breakpoint/context";
import { useSidebarContext } from "@/app/contexts/sidebar/context";
import { navigation } from "@/app/navigation";
import { useAuthContext } from "@/app/contexts/auth/context";
import { useDidUpdate } from "@/hooks";
import { isRouteActive } from "@/utils/isRouteActive";
import { NavigationTree } from "@/@types/navigation";
import { filterNavByRole } from "./PrimePanel/Menu";
import { MainPanel } from "./MainPanel";
import { PrimePanel } from "./PrimePanel";

// ----------------------------------------------------------------------

export type SegmentPath = string | undefined;

/**
 * Find the most-specific navigation segment whose `path` is a prefix of the
 * current `pathname`. Returns `undefined` when nothing matches.
 *
 * Why "most-specific": the Dashboard root segment has `path: "/"` which
 * matches every pathname via `matchPath({ end: false })`. If we returned
 * the first match we'd always land on Dashboard. Instead we pick the
 * segment whose `path` is the longest prefix — that way `/apps/catalog`
 * resolves to the Courses segment, not Dashboard.
 */
function findActiveSegment(
  nav: NavigationTree[],
  pathname: string,
): NavigationTree | undefined {
  const matches = nav.filter((item) => isRouteActive(item.path, pathname));
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return matches.reduce((longest, item) =>
    (item.path ?? "").length > (longest.path ?? "").length ? item : longest,
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const { name, lgAndDown } = useBreakpointsContext();
  const { isExpanded, close } = useSidebarContext();
  const { user } = useAuthContext();
  const userRole = user?.role || "student";

  const roleFilteredNav = useMemo(
    () => filterNavByRole(navigation, userRole),
    [userRole],
  );

  const initialSegment = useMemo(
    () => findActiveSegment(roleFilteredNav, pathname),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [activeSegmentPath, setActiveSegmentPath] = useState<SegmentPath>(
    initialSegment?.path,
  );

  const currentSegment = useMemo(() => {
    return (
      roleFilteredNav.find((item) => item.path === activeSegmentPath) ??
      initialSegment
    );
  }, [activeSegmentPath, roleFilteredNav, initialSegment]);

  useDidUpdate(() => {
    const active = findActiveSegment(roleFilteredNav, pathname);
    setActiveSegmentPath(active?.path);
  }, [pathname, roleFilteredNav]);

  useDidUpdate(() => {
    if (lgAndDown && isExpanded) close();
  }, [name]);

  return (
    <>
      <MainPanel
        nav={roleFilteredNav}
        activeSegmentPath={activeSegmentPath}
        setActiveSegmentPath={setActiveSegmentPath}
      />
      <PrimePanel
        close={close}
        currentSegment={currentSegment}
        pathname={pathname}
      />
    </>
  );
}
