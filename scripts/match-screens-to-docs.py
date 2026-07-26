#!/usr/bin/env python3
"""
Match every Tutor LMS screen template (PHP file) with screenshots from
the docs bundle. We use the doc page category + slug keywords to find
relevant screenshots.

Output:
  /home/z/my-project/src/data/tutor-screen-shots.json
  (a mapping: tutor_screen_id -> [screenshot_serve_paths])
"""
import os
import re
import json
from pathlib import Path
from datetime import datetime, timezone

SCREENS_FILE = Path("/home/z/my-project/src/data/tutor-screens.json")
DOCS_FILE = Path("/home/z/my-project/src/data/tutor-docs.json")
OUT_FILE = Path("/home/z/my-project/src/data/tutor-screen-shots.json")

def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    screens_data = json.loads(SCREENS_FILE.read_text())
    docs_data = json.loads(DOCS_FILE.read_text())

    # Build a map: keyword -> list of screenshots (serve_path)
    # from doc pages, indexed by slug keywords
    page_screens = {}  # slug -> [serve_paths]
    for page in docs_data["pages"]:
        serve_paths = []
        for ir in page["image_refs"]:
            sp = ir["local_path"].replace("/home/z/my-project/repos/tutor-docs/", "")
            serve_paths.append({
                "serve_path": sp,
                "filename": ir["filename"],
                "doc_slug": page["slug"],
                "doc_title": page["title"],
            })
        page_screens[page["slug"]] = serve_paths

    # For each tutor screen (PHP template), find matching doc pages
    # by extracting keywords from the template path
    matches = {}  # screen_id -> [screenshots]
    match_count = 0
    for screen in screens_data["screens"]:
        sid = screen["id"]
        template_path = screen["template_path"]
        # Extract keywords from path like "tutor-free/templates/dashboard/dashboard.php"
        # -> ["dashboard"]
        parts = template_path.lower().replace("\\", "/").split("/")
        # Skip "tutor-free" / "tutor-pro" / "templates" / filename
        keywords = []
        for p in parts:
            if p in ("tutor-free", "tutor-pro", "templates", "shared", "components"):
                continue
            if p.endswith(".php"):
                p = p[:-4]
            # Only keep meaningful keywords (>=3 chars, not generic)
            if len(p) >= 3 and p not in ("single", "loop", "modal", "content", "nav", "tab", "form", "meta", "item"):
                keywords.append(p)
        # Also extract category keyword
        cat = screen.get("category", "")
        if cat and cat not in ("other",):
            keywords.append(cat)

        # Search doc slugs for any keyword match
        matched_screens = []
        seen_paths = set()
        for slug, screens in page_screens.items():
            slug_lower = slug.lower()
            # Match if any keyword is contained in the slug
            if any(kw in slug_lower for kw in keywords if len(kw) >= 4):
                for s in screens:
                    if s["serve_path"] not in seen_paths:
                        matched_screens.append(s)
                        seen_paths.add(s["serve_path"])
            if len(matched_screens) >= 12:
                break

        if matched_screens:
            matches[sid] = matched_screens
            match_count += len(matched_screens)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_screens_matched": len(matches),
        "total_screenshots_linked": match_count,
        "average_screenshots_per_screen": round(match_count / max(len(matches), 1), 2),
        "matches": matches,
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2))
    print(f"Matched {len(matches)} screens with {match_count} screenshots (avg {payload['average_screenshots_per_screen']} per screen)")
    print(f"Output: {OUT_FILE}")

if __name__ == "__main__":
    main()
