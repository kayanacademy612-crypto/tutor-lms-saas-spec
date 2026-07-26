#!/usr/bin/env python3
"""
Extract every lastsaas frontend page/component as a screen inventory entry.

For each .tsx file under frontend/src/pages/ we capture:
  - File path
  - Area (public / auth / app / admin)
  - Screen name (derived from filename)
  - User role
  - Lines of code
  - First 40 lines (code preview)
  - Route hint (derived from file path)
"""
import os
import json
import re
from pathlib import Path
from datetime import datetime, timezone

LASTSAAS_FE = Path("/home/z/my-project/repos/lastsaas/frontend/src/pages")
OUT_FILE = Path("/home/z/my-project/src/data/lastsaas-screens.json")

ROLE_RULES = {
    "public": "guest",
    "auth": "guest",
    "app": "user",
    "admin": "admin",
}

def derive_route(rel_path: str) -> str:
    """Convert pages/app/SettingsPage.tsx -> /app/settings (rough)"""
    p = rel_path.replace("\\", "/")
    # Strip extension
    p = re.sub(r"\.tsx?$", "", p)
    # Strip 'Page' suffix
    p = re.sub(r"Page$", "", p)
    # Convert camelCase to kebab
    p = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", p).lower()
    # Folder/file: keep folder + filename (without 'page')
    return "/" + p

def human_name(stem: str) -> str:
    # Strip 'Page' suffix
    n = re.sub(r"Page$", "", stem)
    # CamelCase to words
    n = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", n)
    return n.strip().title() or stem

def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    screens = []
    for path in sorted(LASTSAAS_FE.rglob("*.tsx")):
        rel = str(path.relative_to(LASTSAAS_FE))
        # Skip non-page component files (in subfolders used purely as components)
        # We'll still include them but flag based on filename
        parts = rel.replace("\\", "/").split("/")
        area = parts[0] if parts else "other"
        # Only include direct page files (ends in Page.tsx) OR files in area root
        is_page = path.stem.endswith("Page") or (len(parts) == 2)
        if not is_page and "health" not in rel:
            continue
        try:
            content = path.read_text(errors="ignore")
        except Exception:
            continue
        lines = content.splitlines()
        screen_name = human_name(path.stem)
        role = ROLE_RULES.get(area, "user")
        route = derive_route(rel)

        screens.append({
            "id": f"lastsaas-{rel.replace('/', '--').replace('.tsx', '')}"[:120],
            "system": "lastsaas",
            "screen_name": screen_name,
            "area": area,
            "role": role,
            "route_hint": route,
            "component_path": f"frontend/src/pages/{rel}",
            "absolute_path": str(path),
            "line_count": len(lines),
            "preview": "\n".join(lines[:40]),
        })

    by_area = {}
    by_role = {}
    for s in screens:
        by_area[s["area"]] = by_area.get(s["area"], 0) + 1
        by_role[s["role"]] = by_role.get(s["role"], 0) + 1

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_screens": len(screens),
        "by_area": by_area,
        "by_role": by_role,
        "source_note": "Extracted from real .tsx files in lastsaas/frontend/src/pages/. Each entry is a real React component that renders a screen — code preview is the source of truth, not a screenshot.",
        "screens": screens,
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2))
    print(f"Extracted {len(screens)} lastsaas frontend screens")
    print(f"By area: {by_area}")
    print(f"By role: {by_role}")
    print(f"Output: {OUT_FILE}")

if __name__ == "__main__":
    main()
