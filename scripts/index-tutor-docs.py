#!/usr/bin/env python3
"""
Index the downloaded Tutor LMS docs bundle into a searchable catalog.

For each doc page we extract:
  - slug (folder name)
  - title (from <title> tag, cleaned)
  - category (inferred from slug prefix: admin-panel-, certificate-builder-, dev-guide-, etc.)
  - file path (absolute, on disk)
  - relative URL (simulates the original URL)
  - text content (cleaned of HTML/CSS/JS, first ~4000 chars for search)
  - screenshot image references (real local file paths)

For each screenshot image we extract:
  - file path
  - file size
  - which doc pages reference it

Output:
  /home/z/my-project/src/data/tutor-docs.json
"""
import os
import re
import json
import html
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

DOCS_ROOT = Path("/home/z/my-project/repos/tutor-docs/tutorlms-docs/tutorlms.com/docs")
UPLOADS_ROOT = Path("/home/z/my-project/repos/tutor-docs/tutorlms-docs/docs.themeum.com/wp-content/uploads")
OUT_FILE = Path("/home/z/my-project/src/data/tutor-docs.json")

# Category inference from slug prefix
CATEGORY_PATTERNS = [
    ("Admin Panel",      r"^admin-panel-"),
    ("Certificate Builder", r"^certificate-builder-"),
    ("Certificate",      r"^certificate-"),
    ("Dev Guide",        r"^dev-guide-"),
    ("Divi Integration", r"^divi-"),
    ("Elementor Integration", r"^elementor-"),
    ("Google Meet",      r"^google-meet-"),
    ("Google Classroom", r"^google-classroom-"),
    ("WooCommerce",      r"^woo-?commerce"),
    ("Content Drip",     r"^content-drip"),
    ("Course Bundle",    r"^course-bundle"),
    ("Course Preview",   r"^course-preview"),
    ("Course Prerequisites", r"^course-prerequisites"),
    ("Course Attachments", r"^course-attachments"),
    ("Assignments",      r"^assignments-"),
    ("BuddyPress",       r"^buddypress-"),
    ("Calendar",         r"^calendar-"),
    ("Email",            r"^tutor-email|^email-"),
    ("Enrollments",      r"^enrollment"),
    ("Gradebook",        r"^gradebook-"),
    ("Live (Zoom/Meet)", r"^zoom-|^live-|^webinar-"),
    ("Multi-Instructor", r"^multi-instructor"),
    ("Notifications",    r"^notifications-"),
    ("Paid Memberships", r"^pmpro-|^paid-membership"),
    ("Quiz",             r"^quiz-"),
    ("Reports",          r"^reports?"),
    ("Restrict Content", r"^restrict-content"),
    ("Social Login",     r"^social-"),
    ("Subscriptions",    r"^subscription"),
    ("Tutor AI",         r"^tutor-ai|^ai-"),
    ("WPML",             r"^wpml-"),
    ("Setup / Getting Started", r"^setup|^getting-|^install|^configur"),
    ("Frontend",         r"^frontend-|^student-|^instructor-"),
    ("Styling",          r"^styling-|^theme-|^custom-"),
    ("Tools",            r"^tools-|^import-|^export-|^migrat"),
    ("Shortcodes",       r"^shortcode"),
    ("Hooks",            r"^dev-guide-action|^dev-guide-filter"),
    ("API",              r"^dev-guide-rest|^api-"),
]

def infer_category(slug: str) -> str:
    s = slug.lower()
    for cat, pat in CATEGORY_PATTERNS:
        if re.search(pat, s):
            return cat
    return "Other"

TITLE_RE = re.compile(r"<title>([^<]+)</title>", re.IGNORECASE)
# Strip scripts, styles, head, nav, footer
CLEAN_RE = re.compile(
    r"<(script|style|head|nav|footer|header|aside|svg)[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")
IMG_SRC_RE = re.compile(
    r'<img[^>]+src=["\']([^"\']+)["\']',
    re.IGNORECASE,
)

def clean_html(raw: str) -> str:
    # Drop everything before <body> to skip the huge CSS dump
    body_match = re.search(r"<body[^>]*>(.*?)</body>", raw, re.IGNORECASE | re.DOTALL)
    if body_match:
        raw = body_match.group(1)
    # Remove nav, header, footer, scripts, styles
    raw = CLEAN_RE.sub("", raw)
    # Strip remaining tags
    text = TAG_RE.sub(" ", raw)
    # Decode entities
    text = html.unescape(text)
    # Collapse whitespace
    text = WHITESPACE_RE.sub(" ", text).strip()
    return text

def extract_title(raw: str) -> str:
    m = TITLE_RE.search(raw)
    if not m:
        return ""
    t = m.group(1).strip()
    # Strip " | Tutor LMS" suffix
    t = re.sub(r"\s*\|\s*Tutor LMS.*$", "", t, flags=re.IGNORECASE)
    return t.strip()

def resolve_image_url(src: str, doc_path: Path) -> str | None:
    """Convert a relative URL like '../../../docs.themeum.com/wp-content/uploads/2022/11/foo.jpg'
    to an absolute path on disk if it exists."""
    if src.startswith("http://") or src.startswith("https://"):
        # Skip external URLs
        return None
    if src.startswith("//"):
        return None
    if src.startswith("data:"):
        return None
    # Decode URL escapes
    src = html.unescape(src)
    # Strip query string
    src = src.split("?")[0]
    # Resolve relative to the doc file
    abs_path = (doc_path.parent / src).resolve()
    try:
        if abs_path.exists() and abs_path.is_file():
            return str(abs_path)
    except OSError:
        pass
    return None

def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    pages = []
    image_index = defaultdict(list)  # image_path -> [doc_slug, ...]
    screenshot_count = 0

    for doc_dir in sorted(DOCS_ROOT.iterdir()):
        if not doc_dir.is_dir():
            continue
        index_html = doc_dir / "index.html"
        if not index_html.exists():
            continue

        slug = doc_dir.name
        try:
            raw = index_html.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue

        title = extract_title(raw) or slug.replace("-", " ").title()
        category = infer_category(slug)
        text = clean_html(raw)

        # Extract image references
        img_refs = []
        for m in IMG_SRC_RE.finditer(raw):
            src = m.group(1)
            resolved = resolve_image_url(src, index_html)
            if resolved:
                img_refs.append({
                    "src": src,
                    "local_path": resolved,
                    "filename": Path(resolved).name,
                })
                image_index[resolved].append(slug)
        # Dedupe image refs by local_path
        seen = set()
        unique_imgs = []
        for ir in img_refs:
            if ir["local_path"] not in seen:
                seen.add(ir["local_path"])
                unique_imgs.append(ir)
        screenshot_count += len(unique_imgs)

        # Truncate text for the catalog (full text would be huge)
        text_preview = text[:6000]

        pages.append({
            "id": f"doc-{slug}",
            "slug": slug,
            "title": title,
            "category": category,
            "file_path": str(index_html),
            "relative_url": f"/docs/{slug}/",
            "text_preview": text_preview,
            "text_length": len(text),
            "image_refs": unique_imgs,
            "image_count": len(unique_imgs),
        })

    # Build image index (only images referenced by docs)
    images = []
    for img_path, doc_slugs in image_index.items():
        try:
            sz = os.path.getsize(img_path)
        except OSError:
            sz = 0
        # Determine a URL we can serve from the webapp
        # We'll create an API endpoint that serves files from the docs tree by relative path
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

    # Sort pages by category then title
    pages.sort(key=lambda p: (p["category"], p["title"]))
    images.sort(key=lambda i: -i["size_bytes"])

    by_category = {}
    by_first_letter = {}
    for p in pages:
        by_category[p["category"]] = by_category.get(p["category"], 0) + 1
        first = p["title"][0].upper() if p["title"] else "?"
        by_first_letter[first] = by_first_letter.get(first, 0) + 1

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Real docs bundle downloaded from Google Drive (id=12m2ZrSv8tC5xfpMTALrkWJIl1_DaEIp9, 428MB, 297 doc pages, 867 screenshot images)",
        "total_pages": len(pages),
        "total_images": len(images),
        "total_screenshot_refs": screenshot_count,
        "by_category": by_category,
        "by_first_letter": by_first_letter,
        "pages": pages,
        "images": images,
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2))

    print(f"Indexed {len(pages)} doc pages")
    print(f"Indexed {len(images)} unique screenshot images (referenced {screenshot_count} times across docs)")
    print(f"Categories ({len(by_category)}):")
    for c, n in sorted(by_category.items(), key=lambda x: -x[1]):
        print(f"  {c:30s} {n:3d}")
    print(f"Output: {OUT_FILE}")
    print(f"Size: {OUT_FILE.stat().st_size / (1024*1024):.1f} MB")

if __name__ == "__main__":
    main()
