#!/usr/bin/env python3
"""
Insert images into the existing Tutor LMS Full Spec Compendium PDF.
Does NOT rebuild the PDF — opens the existing one and adds images at the
correct pages based on section heading text matching.

For each page in the PDF:
1. Extract the text
2. Find doc slugs mentioned (pattern: "from tutor-lms-some-slug")
3. Find section titles that match doc page titles
4. For each match, insert the corresponding images at the bottom of the page
   (or after the section heading, scaled to fit the page width)

Output: /home/z/my-project/download/Tutor-LMS-Full-Spec-Compendium-with-Images.pdf
"""
import fitz  # PyMuPDF
import json, re, os
from pathlib import Path

INPUT_PDF = "/home/z/my-project/upload/Tutor-LMS-Full-Spec-Compendium.pdf"
OUTPUT_PDF = "/home/z/my-project/download/Tutor-LMS-Full-Spec-Compendium-with-Images.pdf"
DOCS_JSON = "/home/z/my-project/src/data/tutor-docs.json"

def main():
    # Load docs data
    with open(DOCS_JSON) as f:
        docs = json.load(f)

    # Build mapping: slug -> [(filename, local_path, size)]
    # Also: title -> [(filename, local_path)]
    slug_to_images = {}
    title_to_images = {}

    for p in docs['pages']:
        slug = p.get('slug', '')
        title = p.get('title', '')
        imgs = []
        for ir in p.get('image_refs', []):
            local_path = ir.get('local_path', '')
            filename = ir.get('filename', '')
            if local_path and os.path.exists(local_path):
                try:
                    size = os.path.getsize(local_path)
                    if size > 1000:  # skip tiny files
                        imgs.append((filename, local_path, size))
                except:
                    pass
        if imgs:
            slug_to_images[slug] = imgs
            if len(title) > 8:
                title_to_images[title.lower()] = imgs

    print(f"Doc pages with images: {len(slug_to_images)}")
    print(f"Total images available: {sum(len(v) for v in slug_to_images.values())}")

    # Open the PDF
    doc = fitz.open(INPUT_PDF)
    print(f"\nPDF pages: {len(doc)}")

    # For each page, find which images should be inserted
    images_inserted = 0
    pages_with_images = 0

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        text_lower = text.lower()

        # Collect images for this page
        page_images = []  # [(local_path, filename)]

        # Method 1: Find doc slugs mentioned on this page
        slugs = re.findall(r'from\s+(tutor[a-z0-9-]+)', text)
        for slug in slugs:
            if slug in slug_to_images:
                for filename, local_path, size in slug_to_images[slug]:
                    page_images.append((local_path, filename))

        # Method 2: Match section titles
        for title, imgs in title_to_images.items():
            if title in text_lower:
                for filename, local_path, size in imgs:
                    page_images.append((local_path, filename))

        # Method 3: Match section numbers like "1.1.8 Featured Image"
        # to specific image filenames (heuristic matching)
        section_matches = re.findall(r'(\d+\.\d+\.\d+)\s+([A-Z][^\n]+)', text)
        for num, section_title in section_matches:
            section_lower = section_title.lower().strip()
            # Check if any image filename contains words from the section title
            section_words = [w for w in section_lower.split() if len(w) > 3]
            for slug, imgs in slug_to_images.items():
                for filename, local_path, size in imgs:
                    fname_lower = filename.lower()
                    if any(w in fname_lower for w in section_words):
                        page_images.append((local_path, filename))

        # Deduplicate
        seen = set()
        unique_images = []
        for path, name in page_images:
            if path not in seen:
                seen.add(path)
                unique_images.append((path, name))
        page_images = unique_images

        if not page_images:
            continue

        # Limit to 6 images per page to avoid overcrowding
        page_images = page_images[:6]

        pages_with_images += 1

        # Insert images at the bottom of the page
        # Calculate available space
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height
        margin = 28  # points (~10mm)

        # Find the last text block Y position to insert images after it
        blocks = page.get_text("blocks")
        if blocks:
            last_y = max(b[3] for b in blocks if b[3] < page_height - 30)
        else:
            last_y = margin

        available_height = page_height - last_y - margin - 10
        if available_height < 50:
            # Not enough space — skip images on this page
            continue

        # Calculate image dimensions
        img_width = page_width - 2 * margin
        img_height_each = min(available_height / len(page_images), 200)  # max 200pt per image
        img_width_each = min(img_width, img_height_each * 1.5)  # aspect ratio ~3:2

        y_cursor = last_y + 10

        for img_path, img_name in page_images:
            try:
                # Insert image
                img_rect = fitz.Rect(
                    margin,
                    y_cursor,
                    margin + img_width_each,
                    y_cursor + img_height_each
                )
                page.insert_image(img_rect, filename=img_path)
                images_inserted += 1
                y_cursor += img_height_each + 5

                # Add filename caption
                caption = f"[{img_name}]"
                page.insert_text(
                    fitz.Point(margin, y_cursor - 2),
                    caption,
                    fontsize=5,
                    color=(0.5, 0.5, 0.5)
                )
                y_cursor += 8

            except Exception as e:
                print(f"  Warning: could not insert {img_name} on page {page_num+1}: {e}")

    print(f"\nImages inserted: {images_inserted}")
    print(f"Pages with images: {pages_with_images}")

    # Save
    doc.save(OUTPUT_PDF)
    doc.close()

    print(f"\nOutput: {OUTPUT_PDF}")
    print(f"File size: {os.path.getsize(OUTPUT_PDF):,} bytes")

if __name__ == '__main__':
    main()
