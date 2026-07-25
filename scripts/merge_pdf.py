#!/usr/bin/env python3
"""Merge cover + body PDFs into final deliverable."""
import sys
from pypdf import PdfReader, PdfWriter

cover_path = "/home/z/my-project/scripts/cover.pdf"
body_path = "/home/z/my-project/scripts/body.pdf"
output_path = "/home/z/my-project/download/Tutor-LMS-Pro-SaaS-on-lastsaas-Engineering-Plan.pdf"

writer = PdfWriter()

# Add cover
cover_reader = PdfReader(cover_path)
for page in cover_reader.pages:
    writer.add_page(page)

# Add body
body_reader = PdfReader(body_path)
for page in body_reader.pages:
    writer.add_page(page)

# Set metadata
writer.add_metadata({
    "/Title": "Building a Tutor LMS Pro-Style SaaS on lastsaas",
    "/Author": "Z.ai",
    "/Subject": "Engineering blueprint for extending lastsaas into a Tutor LMS Pro-style SaaS",
    "/Creator": "Z.ai PDF skill",
    "/Producer": "Z.ai",
    "/Keywords": "LMS, SaaS, Go, React, lastsaas, Tutor LMS Pro, engineering plan, PRD",
})

# Copy bookmarks from body (offset by cover page count = 1)
cover_pages = len(cover_reader.pages)

def copy_outlines(src_reader, dst_writer, page_offset):
    """Recursively copy outline items from src to dst with page offset."""
    try:
        outlines = src_reader.outline
    except Exception:
        outlines = []
    _copy_outline_list(outlines, dst_writer, page_offset, parent=None)

def _copy_outline_list(items, dst_writer, page_offset, parent):
    from pypdf.generic import Destination
    for item in items:
        if isinstance(item, list):
            _copy_outline_list(item, dst_writer, page_offset, parent=current_bookmark)
        else:
            try:
                page_num = src_reader.get_destination_page_number(item)
                if page_num is None:
                    continue
                title = item.title if hasattr(item, 'title') else str(item)
                current_bookmark = dst_writer.add_outline_item(
                    title=title,
                    page_number=page_num + page_offset,
                    parent=parent,
                )
            except Exception:
                continue

# Use simpler bookmark approach: copy bookmarks from body
src_outlines = body_reader.outline
def walk(items, parent=None):
    for item in items:
        if isinstance(item, list):
            walk(item, parent=last_bm)
        else:
            try:
                page_idx = body_reader.get_destination_page_number(item)
                if page_idx is None:
                    continue
                title = item.title if hasattr(item, 'title') else str(item)
                last_bm = writer.add_outline_item(title, page_idx + cover_pages, parent=parent)
            except Exception:
                continue

# Try walking; if it fails, we still have a working PDF without bookmarks
import builtins
last_bm = None
try:
    walk(src_outlines)
except Exception as e:
    print(f"Bookmark copy warning: {e}", file=sys.stderr)

with open(output_path, "wb") as f:
    writer.write(f)

import os
sz = os.path.getsize(output_path) / 1024
print(f"Merged PDF: {output_path}")
print(f"Size: {sz:.1f} KB")
print(f"Total pages: {len(writer.pages)}")
