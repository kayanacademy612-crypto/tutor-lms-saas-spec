#!/usr/bin/env python3
"""
Embed the 48 SVG architecture diagrams from codewiki-sections.json into the
LastSaaS CodeWiki Compendium PDF.

Pipeline:
  1. Open the existing PDF with PyMuPDF (fitz).
  2. For each page, find section headings (text matching "^\\d+\\.\\d+\\s+Name").
  3. Match each heading to a section in codewiki-sections.json by name.
  4. For each SVG in the matched section:
       a. If the SVG is a wrapper around a base64-encoded inner SVG (the
          graphviz-style architecture diagrams), extract and decode the inner SVG.
       b. Override the white-on-dark <style> block (the diagrams were designed
          for the dark CodeWiki web UI) with a dark-on-light style so they are
          visible on the PDF's white background.
       c. Render the inner SVG to PNG bytes with cairosvg (background_color=white).
       d. If the SVG is a raw inline SVG (the 3 small UI icons in cw-61), render
          it directly and label it as an icon rather than a diagram.
  5. Insert a NEW page immediately after the heading page containing the rendered
     diagram(s) with a caption ("Diagram N — Section Name [cw-N]") and sub-caption
     per image. New pages are used (rather than in-place insertion on the heading
     page) because the existing text content fills each page top-to-bottom,
     leaving no room for inline images; new pages keep diagrams at full readable
     size without overlapping text.
  6. Save to /home/z/my-project/download/LastSaaS-CodeWiki-Compendium-with-Diagrams.pdf

Fallbacks:
  - If cairosvg fails to render a specific SVG, insert a text placeholder
    "[Diagram N: SVG architecture diagram — render failed: <reason>]" on the
    diagram page so the reader knows a diagram belongs there.
  - If cairosvg is entirely unavailable, the script falls back to text
    placeholders for every SVG and notes the limitation in the worklog.

Run:
    python3 scripts/embed-svgs-into-codewiki-pdf.py
"""

import json
import base64
import re
import os
import sys
import io
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path('/home/z/my-project')
SECTIONS_JSON = PROJECT_ROOT / 'src' / 'data' / 'codewiki-sections.json'
INPUT_PDF = PROJECT_ROOT / 'download' / 'LastSaaS-CodeWiki-Compendium.pdf'
OUTPUT_PDF = PROJECT_ROOT / 'download' / 'LastSaaS-CodeWiki-Compendium-with-Diagrams.pdf'

# ---------------------------------------------------------------------------
# Style override for the graphviz architecture diagrams.
#
# The original SVGs ship with a <style> block tuned for the dark CodeWiki web UI:
#   * { fill: transparent; stroke: rgb(255,255,255); stroke-width: 1; }
#   text { fill: rgb(255,255,255); ... }
# On a white PDF background that renders invisible. We swap the white (#ffffff)
# strokes/fills for a dark slate (#1e1e1e) so the diagrams remain legible while
# preserving the graphviz layout and the per-element fill/stroke overrides
# emitted by graphviz (e.g. <polygon fill="#333333" stroke="#333333" .../>).
# ---------------------------------------------------------------------------
DARK_STYLE = """
  * {
    fill: transparent !important;
    stroke: rgb(30, 30, 30) !important;
    stroke-width: 1 !important;
  }
  polygon:not(.cluster *, .node *, .edge *, text) {
    stroke: transparent !important;
  }
  text {
    font-size: 10px !important;
    font-family: monospace !important;
    fill: rgb(30, 30, 30) !important;
    stroke: transparent !important;
    transform: translateY(-0.5em);
  }
"""

# Try to import cairosvg. If it fails, we fall back to text placeholders.
try:
    import cairosvg
    HAVE_CAIROSVG = True
except ImportError:
    HAVE_CAIROSVG = False

try:
    import fitz  # PyMuPDF
except ImportError:
    print('ERROR: PyMuPDF (fitz) is required. Install with: pip install pymupdf', file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# SVG extraction / rendering helpers
# ---------------------------------------------------------------------------

# Match href=data:image/svg+xml;base64,XXXX whether the href value is quoted
# ("..."/'...') or unquoted (Angular sometimes emits unquoted attributes).
_HREF_RE = re.compile(
    r'href=(["\']?)data:image/svg\+xml;base64,([^"\'\s>]+)'
)


def extract_inner_svg(outer_svg: str):
    """
    If `outer_svg` is a wrapper SVG (class=svg-diagram / image-diagram) that
    embeds a base64-encoded inner SVG in an <image href="data:..."> element,
    decode and return the inner SVG string. Otherwise return None (caller
    should treat `outer_svg` itself as a raw inline SVG).
    """
    m = _HREF_RE.search(outer_svg)
    if not m:
        return None
    b64 = m.group(2)
    try:
        return base64.b64decode(b64).decode('utf-8', errors='replace')
    except Exception as e:
        print(f'  WARN: base64 decode failed: {e}', file=sys.stderr)
        return None


def override_svg_style(svg: str) -> str:
    """Replace the white-on-dark <style> block with our dark-on-light style."""
    return re.sub(
        r'<style>.*?</style>',
        f'<style>{DARK_STYLE}</style>',
        svg,
        count=1,
        flags=re.DOTALL,
    )


# Quote unquoted XML/SVG attributes (e.g. width=65 → width="65") so that
# cairosvg's strict XML parser accepts Angular-emitted inline SVGs (cw-61).
# Only matches name=value where value is NOT already quoted and contains no
# whitespace, quotes, or '>' (so it can't accidentally span into the next tag).
_UNQUOTED_ATTR_RE = re.compile(r'(\b[\w:-]+)=([^"\'\s>]+)')

# Angular view-encapsulation markers (_ngcontent-XXX / _nghost-XXX) are emitted
# as valueless boolean attributes, which XML (unlike HTML) forbids. They carry
# no rendering meaning, so strip them outright before parsing.
_NG_ATTR_RE = re.compile(r'\s+_ng(?:content|host)-[a-z0-9-]+\b(?!=)')


def sanitize_svg_for_xml(svg: str) -> str:
    """Make an Angular-emitted SVG well-formed XML for cairosvg."""
    # 1. Strip Angular _ngcontent-XXX / _nghost-XXX valueless attributes.
    svg = _NG_ATTR_RE.sub('', svg)
    # 2. Quote any remaining unquoted attribute values (width=65 → width="65").
    svg = _UNQUOTED_ATTR_RE.sub(r'\1="\2"', svg)
    return svg


def render_svg_to_png(svg: str, max_width: int = 1600, override_style: bool = True):
    """
    Render an SVG string to PNG bytes via cairosvg.

    Returns (png_bytes, error_message). On success error_message is None.
    """
    if not HAVE_CAIROSVG:
        return None, 'cairosvg not installed'

    # Sanitize: strip Angular _ngcontent-XXX markers and quote unquoted
    # attributes so cairosvg's strict XML parser accepts the SVG. Harmless on
    # already-well-formed SVGs.
    svg = sanitize_svg_for_xml(svg)

    source = override_svg_style(svg) if override_style else svg
    try:
        png = cairosvg.svg2png(
            bytestring=source.encode('utf-8'),
            output_width=max_width,
            background_color='white',
        )
        return png, None
    except Exception as e_primary:
        # Retry without the style override (some SVGs have no <style> block,
        # or the override broke cairosvg's parser).
        if override_style:
            try:
                png = cairosvg.svg2png(
                    bytestring=svg.encode('utf-8'),
                    output_width=max_width,
                    background_color='white',
                )
                return png, None
            except Exception as e_fallback:
                return None, f'{e_primary} / fallback: {e_fallback}'
        return None, str(e_primary)


# ---------------------------------------------------------------------------
# PDF heading detection + section matching
# ---------------------------------------------------------------------------

_HEADING_RE = re.compile(r'^(\d+\.\d+)\s+(.+)$')


def find_section_headings(page):
    """
    Scan a PDF page's text and return a list of (section_name, page_number_str)
    for every line matching "N.N Section Name". The page_number_str is the "N.N"
    prefix (kept for diagnostics; the section name is what we match on).
    """
    headings = []
    text = page.get_text('text')
    for raw_line in text.split('\n'):
        line = raw_line.strip()
        if not line:
            continue
        m = _HEADING_RE.match(line)
        if m:
            page_num_str = m.group(1)
            sec_name = m.group(2).strip()
            headings.append((sec_name, page_num_str))
    return headings


def normalize_name(name: str) -> str:
    """Lowercase + collapse whitespace for fuzzy name matching."""
    return re.sub(r'\s+', ' ', name.lower().strip())


def match_section(sec_name: str, sections_by_norm_name):
    """
    Match a heading section name to a CodeWiki section by normalized name.
    Returns the section dict or None.
    """
    return sections_by_norm_name.get(normalize_name(sec_name))


# ---------------------------------------------------------------------------
# Diagram page construction
# ---------------------------------------------------------------------------

# A4 portrait in points (matches the existing PDF page size: 595 x 842).
PAGE_W = 595.28
PAGE_H = 841.89

# Content area margins (match the ReportLab left/right=20mm, top/bottom=18mm
# used by the source PDF generator).
MARGIN_L = 56.7   # 20mm
MARGIN_R = 56.7   # 20mm
MARGIN_T = 51.0   # 18mm
MARGIN_B = 51.0   # 18mm

CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R
CONTENT_H = PAGE_H - MARGIN_T - MARGIN_B


def build_diagram_page(doc, insert_at_pno, section, diagram_index, rendered_svgs):
    """
    Insert a new page at position `insert_at_pno` in `doc` and populate it with
    the rendered SVG PNGs for `section`. Returns the new page index.

    `rendered_svgs` is a list of dicts: {kind: 'diagram'|'icon'|'placeholder',
                                          png: bytes|None, error: str|None,
                                          label: str}
    """
    new_page = doc.new_page(pno=insert_at_pno, width=PAGE_W, height=PAGE_H)

    # --- Header / caption -----------------------------------------------
    # Use ASCII-safe " - " separator (em dash renders as garbage via the
    # built-in Helvetica WinAnsi encoding when extracted back as text).
    caption = f"Diagram {diagram_index} - {section['name']}  [{section['id']}]"
    # Truncate caption if it would overflow the content width
    max_chars = 95
    if len(caption) > max_chars:
        caption = caption[:max_chars - 3] + '...'

    new_page.insert_text(
        fitz.Point(MARGIN_L, MARGIN_T + 4),
        caption,
        fontsize=11,
        fontname='hebo',  # Helvetica-Bold (PyMuPDF built-in)
        color=(0.06, 0.11, 0.18),  # #0f1c2e
    )

    # Subtle separator line
    sep_y = MARGIN_T + 12
    new_page.draw_line(
        fitz.Point(MARGIN_L, sep_y),
        fitz.Point(PAGE_W - MARGIN_R, sep_y),
        color=(0.78, 0.78, 0.78),
        width=0.5,
    )

    # --- Images ----------------------------------------------------------
    n = len(rendered_svgs)
    # Reserve the top ~24pt for the caption + separator. The rest is for images.
    img_area_top = sep_y + 16
    img_area_bottom = PAGE_H - MARGIN_B - 8
    img_area_h = img_area_bottom - img_area_top
    slot_h = img_area_h / n

    for j, item in enumerate(rendered_svgs):
        slot_top = img_area_top + j * slot_h
        slot_bottom = slot_top + slot_h
        # Leave 18pt at the bottom of each slot for the sub-caption
        img_max_h = slot_h - 22
        img_max_w = CONTENT_W - 16

        if item['png'] is not None:
            # Read PNG dimensions
            try:
                img_doc = fitz.open(stream=item['png'], filetype='png')
                img_rect = img_doc[0].rect
                img_w = img_rect.width
                img_h = img_rect.height
                img_doc.close()
            except Exception:
                item['png'] = None
                item['error'] = 'failed to read PNG dimensions'
                img_w = img_max_w
                img_h = img_max_h

        if item['png'] is not None:
            # Scale to fit slot maintaining aspect ratio
            scale = min(img_max_w / img_w, img_max_h / img_h, 1.0)
            # For tiny inline icons (cw-61), allow upscaling to at least 60% of slot width
            if item['kind'] == 'icon':
                scale = max(scale, min(img_max_w / img_w, img_max_h / img_h))
                scale = min(scale, min(img_max_w / img_w, img_max_h / img_h) * 4)  # cap upscale at 4x
            w = img_w * scale
            h = img_h * scale

            x = MARGIN_L + (CONTENT_W - w) / 2
            y = slot_top + (img_max_h - h) / 2 + 4

            new_page.insert_image(
                fitz.Rect(x, y, x + w, y + h),
                stream=item['png'],
            )

            sub_label = item.get('label', f"[{j+1}/{n}] {item['kind']}")
        else:
            # Placeholder for failed render
            placeholder_text = (
                f"[Diagram {diagram_index}.{j+1}: SVG {item['kind']} — "
                f"render failed: {item.get('error', 'unknown error')}]"
            )
            # Draw a placeholder box
            box_x0 = MARGIN_L + 20
            box_y0 = slot_top + 10
            box_x1 = PAGE_W - MARGIN_R - 20
            box_y1 = slot_bottom - 22
            new_page.draw_rect(
                fitz.Rect(box_x0, box_y0, box_x1, box_y1),
                color=(0.6, 0.4, 0.4),
                width=0.8,
                fill=(0.98, 0.95, 0.95),
            )
            # Center the placeholder text
            text_y = (box_y0 + box_y1) / 2
            # Wrap text if too long
            if len(placeholder_text) > 100:
                mid = len(placeholder_text) // 2
                # Find a space near the middle
                split_at = placeholder_text.rfind(' ', 0, mid)
                if split_at == -1:
                    split_at = mid
                line1 = placeholder_text[:split_at]
                line2 = placeholder_text[split_at:].strip()
                new_page.insert_text(
                    fitz.Point(box_x0 + 10, text_y - 4),
                    line1,
                    fontsize=9,
                    fontname='helv',
                    color=(0.5, 0.2, 0.2),
                )
                new_page.insert_text(
                    fitz.Point(box_x0 + 10, text_y + 8),
                    line2,
                    fontsize=9,
                    fontname='helv',
                    color=(0.5, 0.2, 0.2),
                )
            else:
                new_page.insert_text(
                    fitz.Point(box_x0 + 10, text_y),
                    placeholder_text,
                    fontsize=9,
                    fontname='helv',
                    color=(0.5, 0.2, 0.2),
                )
            sub_label = f"[{j+1}/{n}] {item['kind']} (render failed)"

        # Sub-caption below the image/placeholder
        new_page.insert_text(
            fitz.Point(MARGIN_L + 2, slot_bottom - 6),
            sub_label,
            fontsize=7,
            fontname='helv',
            color=(0.4, 0.4, 0.4),
        )

    return insert_at_pno


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print('=' * 72)
    print('Embed SVG architecture diagrams into LastSaaS CodeWiki Compendium PDF')
    print('=' * 72)

    if not HAVE_CAIROSVG:
        print('WARN: cairosvg is not installed — will insert text placeholders',
              file=sys.stderr)

    # --- Load sections --------------------------------------------------
    with open(SECTIONS_JSON) as f:
        data = json.load(f)
    sections = data['sections']
    sections_by_norm_name = {normalize_name(s['name']): s for s in sections}
    svg_sections = [s for s in sections if s.get('svg_count', 0) > 0]
    print(f'Loaded {len(sections)} CodeWiki sections '
          f'({len(svg_sections)} with SVGs, {data["total_svgs"]} SVGs total)')

    # --- Open input PDF -------------------------------------------------
    if not INPUT_PDF.exists():
        print(f'ERROR: input PDF not found at {INPUT_PDF}', file=sys.stderr)
        print('Run scripts/generate-codewiki-pdf.py first.', file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(str(INPUT_PDF))
    print(f'Opened input PDF: {len(doc)} pages, '
          f'{os.path.getsize(INPUT_PDF):,} bytes')

    # --- Scan every page for section headings that have SVGs ------------
    # Build an ordered list of (page_idx, section) in DOCUMENT order so that
    # diagram numbers ascend through the document. We then insert in REVERSE
    # order so page-index shifts don't corrupt unprocessed indices, but each
    # insertion carries its already-assigned document-order diagram number.
    ordered_inserts = []  # list of (page_idx, section, diagram_number)
    total_heading_matches = 0
    diagram_number = 0
    for i, page in enumerate(doc):
        for sec_name, _num_str in find_section_headings(page):
            section = match_section(sec_name, sections_by_norm_name)
            if section and section.get('svg_count', 0) > 0:
                diagram_number += 1
                ordered_inserts.append((i, section, diagram_number))
                total_heading_matches += 1

    print(f'Found {total_heading_matches} section-heading occurrences with SVGs '
          f'across {len(set(p for p, _, _ in ordered_inserts))} pages')

    # --- Insert diagram pages (process in REVERSE document order so that ---
    # --- insertions at higher page indices don't shift lower indices) -----
    rendered_count = 0
    placeholder_count = 0
    icon_count = 0
    failed_svgs = []

    for page_idx, section, diagram_index in reversed(ordered_inserts):
        rendered_svgs = []
        for k, svg_outer in enumerate(section['svgs']):
            inner = extract_inner_svg(svg_outer)
            if inner is not None:
                # Architecture diagram (base64-wrapped graphviz SVG)
                png, err = render_svg_to_png(inner, max_width=1600,
                                             override_style=True)
                label = f"[{k+1}/{len(section['svgs'])}] architecture diagram"
                kind = 'diagram'
            else:
                # Raw inline SVG (the 3 UI icons in cw-61)
                png, err = render_svg_to_png(svg_outer, max_width=600,
                                             override_style=False)
                label = (f"[{k+1}/{len(section['svgs'])}] "
                         f"inline icon (not an architecture diagram)")
                kind = 'icon'

            if png is not None:
                rendered_count += 1
                if kind == 'icon':
                    icon_count += 1
            else:
                placeholder_count += 1
                failed_svgs.append((section['id'], section['name'], k, err))

            rendered_svgs.append({
                'kind': kind,
                'png': png,
                'error': err,
                'label': label,
            })

        build_diagram_page(
            doc=doc,
            insert_at_pno=page_idx + 1,
            section=section,
            diagram_index=diagram_index,
            rendered_svgs=rendered_svgs,
        )

    diagram_count = len(ordered_inserts)

    # --- Save -----------------------------------------------------------
    # Garbage-collect and deflate for a smaller file.
    doc.save(str(OUTPUT_PDF), garbage=4, deflate=True, clean=True)
    doc.close()

    print()
    print('-' * 72)
    print(f'Diagram pages inserted : {diagram_count}')
    print(f'SVGs rendered to PNG   : {rendered_count} '
          f'({icon_count} icons, {rendered_count - icon_count} diagrams)')
    print(f'SVGs that fell back to : {placeholder_count} placeholder boxes')
    if failed_svgs:
        print('  Failed SVGs:')
        for sid, sname, k, err in failed_svgs:
            print(f'    {sid} "{sname}" svg[{k}]: {err}')
    print(f'Output PDF             : {OUTPUT_PDF}')
    print(f'Output file size       : {os.path.getsize(OUTPUT_PDF):,} bytes')

    # --- Verify ---------------------------------------------------------
    doc2 = fitz.open(str(OUTPUT_PDF))
    print(f'Output page count      : {len(doc2)} (was 60)')
    # Count embedded images
    total_images = 0
    for page in doc2:
        total_images += len(page.get_images(full=True))
    print(f'Total embedded images  : {total_images}')
    doc2.close()
    print('-' * 72)


if __name__ == '__main__':
    main()
