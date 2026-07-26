#!/usr/bin/env python3
"""
Extract the REAL docs site navigation order from any doc page's sidebar.

The Tutor LMS docs site uses a sidebar with accordion sections like:
  - Getting Started
  - Course Builder
  - Admin Panel
  - Frontend
  - Addons
  - Integrations
  - etc.

Each section contains a list of doc links in the EXACT order shown on the
live docs site. This script parses the sidebar HTML to extract:
  - Section name (e.g. "Getting Started")
  - Section order (1, 2, 3, ...)
  - Doc title (e.g. "System Requirements")
  - Doc slug (e.g. "getting-started-system-requirements")
  - Doc order within section (1, 2, 3, ...)

Output:
  /home/z/my-project/src/data/tutor-docs-nav.json
"""
import re
import json
from pathlib import Path
from datetime import datetime, timezone

# Use a doc page known to have the full sidebar
SOURCE_FILE = Path("/home/z/my-project/repos/tutor-docs/tutorlms-docs/tutorlms.com/docs/admin-panel-courses/index.html")
OUT_FILE = Path("/home/z/my-project/src/data/tutor-docs-nav.json")

def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    raw = SOURCE_FILE.read_text(errors="ignore")

    # Find the sidebar block
    sidebar_start = raw.find('documentation-left-sidebar')
    if sidebar_start < 0:
        raise RuntimeError("sidebar not found")
    # Find the matching </aside>
    aside_end = raw.find("</aside>", sidebar_start)
    sidebar_html = raw[sidebar_start:aside_end]

    # Parse accordion sections
    # Pattern: <div class="documentation-accordion ..."> ... <span>SECTION_NAME</span> ... <a href="../SLUG/index.html">TITLE</a> ... </div>
    sections = []
    # Split by accordion-header to find section starts
    # Find every <span> inside accordion-header
    header_pattern = re.compile(
        r'<div class="documentation-accordion[^"]*">\s*<div class="documentation-accordion-header">\s*<span>([^<]+)</span>',
        re.DOTALL,
    )

    headers = list(header_pattern.finditer(sidebar_html))
    for i, m in enumerate(headers):
        section_name = m.group(1).strip()
        section_start = m.end()
        # Section ends at the next header, or end of sidebar
        section_end = headers[i + 1].start() if i + 1 < len(headers) else len(sidebar_html)
        section_html = sidebar_html[section_start:section_end]

        # Extract all <a href="../slug/index.html">title</a> in order
        link_pattern = re.compile(
            r'<a[^>]*href="\.\./([^/]+)/index\.html"[^>]*>([^<]+)</a>',
            re.DOTALL,
        )
        links = []
        for lm in link_pattern.finditer(section_html):
            slug = lm.group(1).strip()
            title = lm.group(2).strip()
            # Decode HTML entities
            title = title.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&#039;", "'")
            links.append({
                "slug": slug,
                "title": title,
                "section": section_name,
                "section_order": i + 1,
                "order_in_section": len(links) + 1,
                "global_order": 0,  # filled below
            })

        if links:
            sections.append({
                "name": section_name,
                "order": i + 1,
                "link_count": len(links),
                "links": links,
            })

    # Assign global order across all sections
    global_idx = 0
    all_links = []
    for sec in sections:
        for link in sec["links"]:
            global_idx += 1
            link["global_order"] = global_idx
            all_links.append(link)

    # Deduplicate by slug (a doc might appear in multiple sections — keep first occurrence)
    seen_slugs = set()
    unique_links = []
    for link in all_links:
        if link["slug"] not in seen_slugs:
            seen_slugs.add(link["slug"])
            unique_links.append(link)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_file": str(SOURCE_FILE),
        "total_sections": len(sections),
        "total_links_in_sidebar": len(all_links),
        "total_unique_docs": len(unique_links),
        "sections": sections,
        "ordered_docs": unique_links,
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2))

    print(f"Extracted sidebar navigation:")
    print(f"  Sections: {len(sections)}")
    print(f"  Total links in sidebar: {len(all_links)}")
    print(f"  Unique docs: {len(unique_links)}")
    print()
    print("Section breakdown:")
    for sec in sections:
        print(f"  {sec['order']:2d}. {sec['name']:30s} ({sec['link_count']} docs)")
    print()
    print(f"Output: {OUT_FILE}")

if __name__ == "__main__":
    main()
