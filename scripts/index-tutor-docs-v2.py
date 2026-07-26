#!/usr/bin/env python3
"""
Re-index the Tutor LMS docs bundle using the REAL sidebar navigation order.

This is the corrected version of index-tutor-docs.py. Instead of sorting
by category, we use the order from the original docs site sidebar
(extracted by extract-docs-nav.py into tutor-docs-nav.json).

We also include any real doc pages that exist on disk but aren't in the
sidebar (e.g. admin-panel-courses, migration-tool-overview), appending
them in a separate "Uncategorized" section at the end.

Output:
  /home/z/my-project/src/data/tutor-docs.json (overwrites the previous one)
"""
import os
import re
import json
import html
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

DOCS_ROOT = Path("/home/z/my-project/repos/tutor-docs/tutorlms-docs/tutorlms.com/docs")
NAV_FILE = Path("/home/z/my-project/src/data/tutor-docs-nav.json")
OUT_FILE = Path("/home/z/my-project/src/data/tutor-docs.json")

TITLE_RE = re.compile(r"<title>([^<]+)</title>", re.IGNORECASE)
CLEAN_RE = re.compile(
    r"<(script|style|head|nav|footer|header|aside|svg)[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")
IMG_SRC_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)

def clean_html(raw: str) -> str:
    body_match = re.search(r"<body[^>]*>(.*?)</body>", raw, re.IGNORECASE | re.DOTALL)
    if body_match:
        raw = body_match.group(1)
    raw = CLEAN_RE.sub("", raw)
    text = TAG_RE.sub(" ", raw)
    text = html.unescape(text)
    text = WHITESPACE_RE.sub(" ", text).strip()
    return text

def extract_title(raw: str) -> str:
    m = TITLE_RE.search(raw)
    if not m:
        return ""
    t = m.group(1).strip()
    t = re.sub(r"\s*\|\s*Tutor LMS.*$", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*\|\s*Documentations.*$", "", t, flags=re.IGNORECASE)
    return t.strip()

def resolve_image_url(src: str, doc_path: Path) -> str | None:
    if src.startswith(("http://", "https://", "//", "data:")):
        return None
    src = html.unescape(src).split("?")[0]
    abs_path = (doc_path.parent / src).resolve()
    try:
        if abs_path.exists() and abs_path.is_file():
            return str(abs_path)
    except OSError:
        pass
    return None

def parse_doc_page(slug: str, section: str, section_order: int, order_in_section: int, global_order: int) -> dict | None:
    """Parse a single doc page from disk."""
    doc_dir = DOCS_ROOT / slug
    index_html = doc_dir / "index.html"
    if not index_html.exists():
        return None
    try:
        raw = index_html.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    title = extract_title(raw) or slug.replace("-", " ").title()
    text = clean_html(raw)
    img_refs = []
    seen = set()
    for m in IMG_SRC_RE.finditer(raw):
        src = m.group(1)
        resolved = resolve_image_url(src, index_html)
        if resolved and resolved not in seen:
            seen.add(resolved)
            img_refs.append({
                "src": src,
                "local_path": resolved,
                "filename": Path(resolved).name,
            })

    return {
        "id": f"doc-{slug}",
        "slug": slug,
        "title": title,
        "category": section,  # use the sidebar section name as category
        "section": section,
        "section_order": section_order,
        "order_in_section": order_in_section,
        "global_order": global_order,
        "file_path": str(index_html),
        "relative_url": f"/docs/{slug}/",
        "text_preview": text[:6000],
        "text_length": len(text),
        "image_refs": img_refs,
        "image_count": len(img_refs),
    }

def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    nav_data = json.loads(NAV_FILE.read_text())

    pages = []
    image_index = defaultdict(list)

    # 1) Process all docs in NAVIGATION ORDER
    for nav_link in nav_data["ordered_docs"]:
        page = parse_doc_page(
            slug=nav_link["slug"],
            section=nav_link["section"],
            section_order=nav_link["section_order"],
            order_in_section=nav_link["order_in_section"],
            global_order=nav_link["global_order"],
        )
        if page:
            # Use the nav-provided title as a fallback (it's the sidebar label)
            if not page["title"] or page["title"].lower() == "page not found":
                page["title"] = nav_link["title"]
            pages.append(page)
            for ir in page["image_refs"]:
                image_index[ir["local_path"]].append(page["slug"])

    # 2) Find docs on disk that aren't in the nav (orphans)
    nav_slugs = {d["slug"] for d in nav_data["ordered_docs"]}
    indexed_slugs = {p["slug"] for p in pages}
    disk_slugs = {p.name for p in DOCS_ROOT.iterdir() if p.is_dir() and (p / "index.html").exists()}

    orphans = disk_slugs - nav_slugs
    real_orphans = []
    for slug in sorted(orphans):
        doc_dir = DOCS_ROOT / slug
        index_html = doc_dir / "index.html"
        size = index_html.stat().st_size
        # Skip tiny placeholder pages (404s, empty feeds)
        if size < 50000:
            continue
        # Skip pages whose title is "Page not found"
        try:
            raw = index_html.read_text(errors="ignore")
            title = extract_title(raw)
            if "page not found" in title.lower():
                continue
        except Exception:
            continue
        real_orphans.append(slug)

    # Append real orphans in an "Uncategorized" section at the end
    orphan_section_order = len(nav_data["sections"]) + 1
    orphan_global_start = len(nav_data["ordered_docs"])
    for i, slug in enumerate(real_orphans):
        page = parse_doc_page(
            slug=slug,
            section="Uncategorized",
            section_order=orphan_section_order,
            order_in_section=i + 1,
            global_order=orphan_global_start + i + 1,
        )
        if page:
            pages.append(page)
            for ir in page["image_refs"]:
                image_index[ir["local_path"]].append(page["slug"])

    # 3) Build the image index
    images = []
    for img_path, doc_slugs in image_index.items():
        try:
            sz = os.path.getsize(img_path)
        except OSError:
            sz = 0
        try:
            rel = Path(img_path).resolve().relative_to(Path("/home/z/my-project/repos/tutor-docs").resolve())
            serve_path = str(rel)
        except ValueError:
            serve_path = None
        images.append({
            "id": f"img-{Path(img_path).stem.lower().replace('_','-')}"[:80],
            "filename": Path(img_path).name,
            "absolute_path": img_path,
            "serve_path": serve_path,
            "size_bytes": sz,
            "referenced_by": list(set(doc_slugs)),
        })

    # Sort pages by global order (preserves the original docs site order)
    pages.sort(key=lambda p: p["global_order"])
    # Sort images by size descending (largest = most detailed first)
    images.sort(key=lambda i: -i["size_bytes"])

    # Build section summary
    by_section = {}
    for p in pages:
        if p["section"] not in by_section:
            by_section[p["section"]] = {"count": 0, "order": p["section_order"]}
        by_section[p["section"]]["count"] += 1
    sections_sorted = sorted(by_section.items(), key=lambda x: x[1]["order"])

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Real docs bundle (428MB, 297 directories) — indexed in ORIGINAL sidebar navigation order from tutorlms.com/docs. 27 sidebar sections + 1 Uncategorized section for orphaned real docs.",
        "total_pages": len(pages),
        "total_images": len(images),
        "total_screenshot_refs": sum(p["image_count"] for p in pages),
        "total_sections": len(by_section),
        "sections_in_order": [{"name": name, "order": info["order"], "count": info["count"]} for name, info in sections_sorted],
        "by_category": {name: info["count"] for name, info in by_section.items()},  # backwards compat
        "pages": pages,
        "images": images,
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2))

    print(f"Indexed {len(pages)} doc pages in ORIGINAL NAVIGATION ORDER")
    print(f"Indexed {len(images)} unique screenshot images (referenced {payload['total_screenshot_refs']} times across docs)")
    print(f"Sections ({len(by_section)}):")
    for name, info in sections_sorted:
        print(f"  {info['order']:2d}. {name:35s} ({info['count']} docs)")
    print(f"Output: {OUT_FILE}")
    print(f"Size: {OUT_FILE.stat().st_size / (1024*1024):.1f} MB")

if __name__ == "__main__":
    main()
