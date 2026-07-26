#!/usr/bin/env python3
"""
Extract every PHP template file from Tutor LMS (free + Pro) and build a
screen inventory that maps each template to a real, named UI screen.

For each template we capture:
  - File path (relative to repo root)
  - System (free / pro)
  - Screen name (human-readable, derived from path)
  - Category (dashboard / course / quiz / lesson / profile / email / etc.)
  - User role (student / instructor / admin / guest / system)
  - Lines of code
  - First 40 lines (for code preview)
  - Inline image references found in the template (real screenshot hints)

Output:
  /home/z/my-project/src/data/tutor-screens.json
"""
import os
import json
import re
from pathlib import Path
from datetime import datetime, timezone

TUTOR_ROOT = Path("/home/z/my-project/repos/tutor")
TUTOR_PRO_ROOT = Path("/home/z/my-project/repos/tutor-pro/tutor-pro")
OUT_FILE = Path("/home/z/my-project/src/data/tutor-screens.json")

CATEGORY_RULES = [
    ("dashboard",     ["dashboard", "frontend-dashboard"]),
    ("course",        ["course", "single-course"]),
    ("quiz",          ["quiz"]),
    ("lesson",        ["lesson", "learning-area"]),
    ("enrollment",    ["enrollment", "enroll"]),
    ("checkout",      ["checkout", "cart"]),
    ("profile",       ["profile", "instructor-registration", "student-registration"]),
    ("login",         ["login", "register", "auth"]),
    ("certificate",   ["certificate"]),
    ("email",         ["email", "mail"]),
    ("modal",         ["modal", "popup"]),
    ("loop",          ["loop/"]),
    ("assignment",    ["assignment"]),
    ("meeting",       ["zoom", "google-meet", "webinar", "live-meeting"]),
    ("addon",         ["/addons/"]),
    ("admin",         ["admin", "settings"]),
]

ROLE_RULES = [
    ("student",    ["student", "my-", "learning-area", "quiz", "enroll"]),
    ("instructor", ["instructor", "frontend-dashboard", "create-course"]),
    ("admin",      ["admin", "settings", "configuration"]),
    ("guest",      ["login", "register", "single-course", "course-none"]),
    ("system",     ["email", "mail", "cron"]),
]

SCREEN_NAME_OVERRIDES = {
    "dashboard.php": "Student/Instructor Dashboard",
    "public-profile.php": "Public Instructor Profile",
    "course-none.php": "No Courses Available (Empty State)",
    "course-embed.php": "Embedded Course View",
    "loop/course.php": "Course Card (Catalog Loop)",
    "loop/thumbnail.php": "Course Thumbnail Card Component",
    "loop/rating.php": "Course Rating Stars Component",
    "loop/course-price.php": "Course Price Display Component",
    "loop/add-to-cart-tutor.php": "Add to Cart Button (Tutor)",
    "loop/add-to-cart-woocommerce.php": "Add to Cart Button (WooCommerce)",
    "loop/add-to-cart-edd.php": "Add to Cart Button (EDD)",
    "loop/course-author.php": "Course Author Display",
    "loop/course-continue.php": "Continue Course Button",
    "loop/enrolled-course-progress.php": "Enrolled Course Progress Bar",
    "loop/title.php": "Course Title Display",
    "loop/meta.php": "Course Meta Info",
    "loop/header.php": "Course Card Header",
    "loop/footer.php": "Course Card Footer",
    "modal/alert.php": "Alert Modal",
    "modal/confirm.php": "Confirmation Modal",
}

def classify_category(rel_path: str) -> str:
    p = rel_path.lower()
    for cat, patterns in CATEGORY_RULES:
        for pat in patterns:
            if pat in p:
                return cat
    return "other"

def classify_role(rel_path: str, content: str) -> str:
    p = rel_path.lower()
    for role, patterns in ROLE_RULES:
        for pat in patterns:
            if pat in p:
                return role
    return "any"

def human_screen_name(rel_path: str) -> str:
    if rel_path in SCREEN_NAME_OVERRIDES:
        return SCREEN_NAME_OVERRIDES[rel_path]
    # Derive from filename
    name = Path(rel_path).stem.replace("-", " ").replace("_", " ").title()
    parent = Path(rel_path).parent.name
    if parent and parent != ".":
        parent_human = parent.replace("-", " ").replace("_", " ").title()
        return f"{parent_human} - {name}"
    return name

IMG_PATTERN = re.compile(r'(?:src|poster|data-src|href)\s*=\s*["\']([^"\']+\.(?:png|jpe?g|webp|gif|svg))["\']', re.IGNORECASE)

def extract_images(content: str) -> list[str]:
    return list(dict.fromkeys(IMG_PATTERN.findall(content)))

def main():
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    screens = []
    for root, system in [(TUTOR_ROOT, "tutor-free"), (TUTOR_PRO_ROOT, "tutor-pro")]:
        if not root.exists():
            continue
        templates_dir = root / "templates"
        for path in sorted(templates_dir.rglob("*.php")):
            try:
                content = path.read_text(errors="ignore")
            except Exception:
                continue
            rel = str(path.relative_to(templates_dir))
            full_rel = f"{system}/templates/{rel}"
            category = classify_category(rel)
            role = classify_role(rel, content)
            screen_name = human_screen_name(rel)
            lines = content.splitlines()
            line_count = len(lines)
            preview = "\n".join(lines[:40])
            images = extract_images(content)

            screens.append({
                "id": f"{system}-{rel.replace('/', '--').replace('.php', '')}"[:120],
                "system": system,
                "screen_name": screen_name,
                "category": category,
                "role": role,
                "template_path": full_rel,
                "absolute_path": str(path),
                "line_count": line_count,
                "image_refs": images[:8],  # limit
                "preview": preview,
            })

    by_cat = {}
    by_role = {}
    by_system = {}
    for s in screens:
        by_cat[s["category"]] = by_cat.get(s["category"], 0) + 1
        by_role[s["role"]] = by_role.get(s["role"], 0) + 1
        by_system[s["system"]] = by_system.get(s["system"], 0) + 1

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_screens": len(screens),
        "by_system": by_system,
        "by_category": by_cat,
        "by_role": by_role,
        "source_note": "Extracted from real PHP template files in tutor/templates/ and tutor-pro/tutor-pro/templates/. Each entry is a real screen-rendering template — code preview is the source of truth, not a screenshot.",
        "screens": screens,
    }
    OUT_FILE.write_text(json.dumps(payload, indent=2))
    print(f"Extracted {len(screens)} real Tutor LMS screen templates")
    print(f"By system: {by_system}")
    print(f"By category: {by_cat}")
    print(f"By role: {by_role}")
    print(f"Output: {OUT_FILE}")

if __name__ == "__main__":
    main()
