#!/usr/bin/env python3
"""
Copy actual Tutor LMS image assets from source code repos into the Next.js
public/ directory so they can be served as real visual assets.

We DO NOT have the 408MB docs directory anymore — but we DO have 147 real
image files embedded inside the Tutor LMS source code. This script:
  1. Finds every PNG/JPG/WEBP in tutor/ and tutor-pro/
  2. Classifies it by category (addon / certificate / state / onboarding / etc.)
  3. Copies it into /public/tutor-assets/<category>/
  4. Writes a manifest JSON with metadata for each file

Output:
  /home/z/my-project/public/tutor-assets/manifest.json
"""
import os
import shutil
import json
import hashlib
from pathlib import Path
from datetime import datetime

TUTOR_ROOT = Path("/home/z/my-project/repos/tutor")
TUTOR_PRO_ROOT = Path("/home/z/my-project/repos/tutor-pro/tutor-pro")
PUBLIC_ROOT = Path("/home/z/my-project/public/tutor-assets")

# Categories and how to detect them
def classify(rel_path: str, size_bytes: int) -> str:
    p = rel_path.lower()
    if "/.github/addons/" in p or "/addons/" in p and "thumbnail" in p:
        return "addons"
    if "certificate" in p and ("template" in p or "background" in p or "blank" in p or "frame" in p):
        return "certificates"
    if "certificate-preview" in p or "certificate-demo" in p:
        return "certificates"
    if "onboard" in p or "hero" in p:
        return "onboarding"
    if "/emojis/" in p:
        return "emojis"
    if "ai-types" in p or "course-generation-placeholder" in p or "ai-studio" in p:
        return "ai-types"
    if "empty-state" in p or "not-found" in p or "production-error" in p or "review-submitted" in p or "addon-disabled" in p or "denied" in p:
        return "states"
    if "logo" in p or "favicon" in p or "icon" in p or "play-button" in p or "tax-banner" in p or "free-addons" in p:
        return "misc"
    if "placeholder" in p or "default-config" in p:
        return "misc"
    return "misc"

# Human-readable screen names mapped from filename patterns
SCREEN_NAMES = {
    "tutor-certificate": "Certificate Builder (Pro addon)",
    "enrollments": "Manual Enrollments (Pro addon)",
    "tutor-assignments": "Assignments Addon",
    "tutor-course-preview": "Course Preview Addon",
    "calendar": "Calendar Addon",
    "tutor-prerequisites": "Course Prerequisites (Pro addon)",
    "tutor-email": "Email Template Customizer (Pro addon)",
    "tutor-multi-instructors": "Multi-Instructors (Pro addon)",
    "wc-subscriptions": "WooCommerce Subscriptions Integration",
    "content-drip": "Content Drip Addon (Pro)",
    "pmpro": "Paid Memberships Pro Integration",
    "quiz-import-export": "Quiz Import/Export (Pro addon)",
    "notifications": "Real-time Notifications (Pro addon)",
    "tutor-zoom": "Zoom Integration (Pro addon)",
    "restrict-content-pro": "Restrict Content Pro Integration",
    "gradebook": "Gradebook (Pro addon)",
    "google-classroom": "Google Classroom Integration (Pro)",
    "buddypress": "BuddyPress Integration",
    "tutor-report": "Analytics & Reports (Pro addon)",
    "wpml": "WPML Multilingual Integration",
    "tutor-course-attachments": "Course Attachments (Pro addon)",
}

# Map addon key from filename
def addon_key(filename: str) -> str:
    stem = Path(filename).stem.lower()
    for key in SCREEN_NAMES:
        if key in stem:
            return key
    return stem

def main():
    if PUBLIC_ROOT.exists():
        # Wipe category dirs but keep root
        for sub in PUBLIC_ROOT.iterdir():
            if sub.is_dir():
                shutil.rmtree(sub)
            elif sub.name != "manifest.json":
                sub.unlink()
    PUBLIC_ROOT.mkdir(parents=True, exist_ok=True)
    for cat in ["addons", "certificates", "states", "onboarding", "emojis", "ai-types", "misc"]:
        (PUBLIC_ROOT / cat).mkdir(exist_ok=True)

    manifest = []
    seen_hashes = set()
    counters = {}

    roots = [(TUTOR_ROOT, "tutor-free"), (TUTOR_PRO_ROOT, "tutor-pro")]
    for root, system in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
                continue
            if "node_modules" in str(path) or "/vendor/" in str(path):
                continue
            try:
                size = path.stat().st_size
            except OSError:
                continue
            if size < 1024:  # skip tiny icons < 1KB
                continue

            rel = str(path.relative_to(root))
            category = classify(rel, size)

            # Hash to dedupe identical files
            h = hashlib.md5(path.read_bytes()).hexdigest()
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            # Build a clean output filename — preserve parent dir for context
            import re
            parent_name = path.parent.name.lower().replace(" ", "-")
            stem = path.stem.lower().replace(" ", "-")
            # Strip hash suffixes like "-2x-45983f4c"
            stem = re.sub(r"-2x-[a-f0-9]+$", "", stem)
            stem = re.sub(r"-[a-f0-9]{8,}$", "", stem)
            ext = path.suffix.lower()
            # Prefix with parent dir if the stem is generic
            GENERIC_STEMS = {"thumbnail", "background", "icon", "logo", "image", "thumb", "preview", "demo", "frame", "signature", "blank"}
            if stem in GENERIC_STEMS and parent_name and parent_name not in ("addons", "assets", "images", "tutor-pro", "tutor"):
                out_name = f"{parent_name}-{stem}{ext}"
            else:
                out_name = f"{stem}{ext}"
            n = counters.get(category, 0) + 1
            counters[category] = n
            out_path = PUBLIC_ROOT / category / out_name
            # Avoid collision
            i = 1
            while out_path.exists():
                out_name = f"{parent_name}-{stem}-{i}{ext}" if stem in GENERIC_STEMS else f"{stem}-{i}{ext}"
                out_path = PUBLIC_ROOT / category / out_name
                i += 1

            shutil.copy2(path, out_path)

            # Determine screen name & addon key — prefer parent dir for context
            akey = addon_key(parent_name if stem in GENERIC_STEMS else path.name)
            # Better screen name: use parent dir if it's a known addon key
            parent_lookup = parent_name.replace("-", "_") if "-" in parent_name else parent_name
            if parent_lookup in SCREEN_NAMES:
                screen_name = SCREEN_NAMES[parent_lookup]
                base_label = parent_lookup
                # Append the file role (e.g. "Thumbnail", "Background")
                role_label = stem.replace("-", " ").replace("_", " ").title()
                if stem in GENERIC_STEMS and role_label.lower() not in screen_name.lower():
                    screen_name = f"{screen_name} — {role_label}"
            else:
                screen_name = SCREEN_NAMES.get(akey, path.stem.replace("-", " ").replace("_", " ").title())
                # If it's a generic stem, prefix with parent dir humanized
                if stem in GENERIC_STEMS and parent_name and parent_name not in ("addons", "assets", "images", "tutor-pro", "tutor"):
                    parent_human = parent_name.replace("-", " ").replace("_", " ").title()
                    screen_name = f"{parent_human} — {stem.replace('-', ' ').title()}"

            manifest.append({
                "id": f"{category}-{path.stem.lower().replace('_','-')}"[:80],
                "category": category,
                "system": system,
                "filename": out_name,
                "url": f"/tutor-assets/{category}/{out_name}",
                "original_path": str(path),
                "relative_path": rel,
                "size_bytes": size,
                "screen_name": screen_name,
                "addon_key": akey if category == "addons" else None,
                "width": None,  # populated by next step if needed
                "height": None,
            })

    # Sort: addons first (most relevant "screens"), then certificates, then onboarding, etc.
    cat_order = {"addons": 0, "certificates": 1, "onboarding": 2, "states": 3, "ai-types": 4, "emojis": 5, "misc": 6}
    manifest.sort(key=lambda x: (cat_order.get(x["category"], 99), x["filename"]))

    out_file = PUBLIC_ROOT / "manifest.json"
    out_file.write_text(json.dumps({
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_images": len(manifest),
        "by_category": {c: sum(1 for m in manifest if m["category"] == c) for c in cat_order},
        "source_note": "Real image assets extracted from Tutor LMS free + Pro plugin source code. The 408MB docs directory previously shared is no longer available on disk.",
        "images": manifest,
    }, indent=2))

    print(f"Copied {len(manifest)} real Tutor LMS images to {PUBLIC_ROOT}")
    print(f"By category:")
    for c, n in sorted(cat_order.items(), key=lambda x: x[1]):
        cnt = sum(1 for m in manifest if m["category"] == c)
        print(f"  {c:14s} {cnt:3d}")
    print(f"Manifest: {out_file}")

if __name__ == "__main__":
    main()
