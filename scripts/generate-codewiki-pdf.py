#!/usr/bin/env python3
"""
Generate the LastSaaS CodeWiki Compendium PDF — matching the Tutor LMS
Full Spec Compendium structure but for the lastsaas codebase.

Structure matches the Tutor LMS compendium:
- Cover page (reference document style)
- How to use this compendium
- Domain summary table
- Spec Parts (A through E) with numbered sections
- Page headers/footers matching the original

Content source: The 61 CodeWiki analysis sections extracted from the HTML,
plus 177 source file references, 48 SVG diagrams, 936 code blocks.
"""

import sys, os, re, json, hashlib
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Image, Preformatted, Flowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfgen import canvas

# ============================================================
# FONT REGISTRATION
# ============================================================
FONT_DIR = '/usr/share/fonts'

pdfmetrics.registerFont(TTFont('NotoSerifSC', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Regular.ttf'))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', f'{FONT_DIR}/truetype/noto-serif-sc/NotoSerifSC-Bold.ttf'))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')

# NotoSansSC variable font doesn't work with ReportLab — skip it, use NotoSerifSC for everything
# Liberation fonts are sufficient for English-only content

# Liberation fonts for Latin text (matches the Tutor compendium)
pdfmetrics.registerFont(TTFont('LibSans', f'{FONT_DIR}/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibSans-Bold', f'{FONT_DIR}/truetype/liberation/LiberationSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('LibSans-Italic', f'{FONT_DIR}/truetype/liberation/LiberationSans-Italic.ttf'))
pdfmetrics.registerFont(TTFont('LibMono', f'{FONT_DIR}/truetype/liberation/LiberationMono-Regular.ttf'))
pdfmetrics.registerFont(TTFont('LibMono-Bold', f'{FONT_DIR}/truetype/liberation/LiberationMono-Bold.ttf'))
registerFontFamily('LibSans', normal='LibSans', bold='LibSans-Bold', italic='LibSans-Italic')

# ============================================================
# COLORS (matching Tutor compendium)
# ============================================================
C_TEXT = HexColor('#1a1a1a')
C_HEADING = HexColor('#0f1c2e')
C_SUBHEADING = HexColor('#444444')
C_MUTED = HexColor('#999999')
C_ACCENT = HexColor('#2563eb')
C_CODE_BG = HexColor('#f5f5f0')
C_CODE_BORDER = HexColor('#e0e0d0')
C_CODE_TEXT = HexColor('#6b3000')
C_MONO_BOLD = HexColor('#6b3000')
C_HEADER = HexColor('#999999')
C_LINK = HexColor('#2563eb')
C_TABLE_HEADER = HexColor('#f0f0f0')
C_TABLE_BORDER = HexColor('#dddddd')
C_COVER_BG = HexColor('#0f1c2e')
C_COVER_ACCENT = HexColor('#3b82f6')

# ============================================================
# STYLES
# ============================================================
styles = getSampleStyleSheet()

style_cover_title = ParagraphStyle('CoverTitle', fontName='LibSans-Bold', fontSize=28, leading=34, textColor=white, alignment=TA_LEFT, spaceAfter=8)
style_cover_subtitle = ParagraphStyle('CoverSubtitle', fontName='LibSans', fontSize=14, leading=18, textColor=HexColor('#a0b4d0'), alignment=TA_LEFT, spaceAfter=6)
style_cover_meta = ParagraphStyle('CoverMeta', fontName='LibSans', fontSize=9, leading=12, textColor=HexColor('#6b8aaa'), alignment=TA_LEFT)

style_h1 = ParagraphStyle('H1', fontName='LibSans-Bold', fontSize=16, leading=20, textColor=C_HEADING, spaceBefore=16, spaceAfter=8, keepWithNext=True)
style_h2 = ParagraphStyle('H2', fontName='LibSans-Bold', fontSize=13, leading=16, textColor=C_HEADING, spaceBefore=12, spaceAfter=6, keepWithNext=True)
style_h3 = ParagraphStyle('H3', fontName='LibSans-Bold', fontSize=10, leading=13, textColor=C_SUBHEADING, spaceBefore=8, spaceAfter=4, keepWithNext=True)
style_h4 = ParagraphStyle('H4', fontName='LibSans-Bold', fontSize=8, leading=10, textColor=C_SUBHEADING, spaceBefore=6, spaceAfter=3, keepWithNext=True)

style_body = ParagraphStyle('Body', fontName='LibSans', fontSize=7.5, leading=10, textColor=C_TEXT, alignment=TA_JUSTIFY, spaceAfter=3)
style_body_left = ParagraphStyle('BodyLeft', fontName='LibSans', fontSize=7.5, leading=10, textColor=C_TEXT, alignment=TA_LEFT, spaceAfter=3)

style_code = ParagraphStyle('Code', fontName='LibMono', fontSize=6, leading=8, textColor=C_CODE_TEXT, backColor=C_CODE_BG, borderColor=C_CODE_BORDER, borderWidth=0.5, borderPadding=4, leftIndent=4, rightIndent=4, spaceBefore=4, spaceAfter=4)

style_mono = ParagraphStyle('Mono', fontName='LibMono', fontSize=6, leading=8, textColor=C_CODE_TEXT)
style_mono_bold = ParagraphStyle('MonoBold', fontName='LibMono-Bold', fontSize=6, leading=8, textColor=C_MONO_BOLD)

style_table_header = ParagraphStyle('TableHeader', fontName='LibSans-Bold', fontSize=7, leading=9, textColor=C_HEADING, alignment=TA_LEFT)
style_table_cell = ParagraphStyle('TableCell', fontName='LibSans', fontSize=7, leading=9, textColor=C_TEXT, alignment=TA_LEFT)

style_intro = ParagraphStyle('Intro', fontName='LibSans', fontSize=9, leading=13, textColor=C_TEXT, alignment=TA_JUSTIFY, spaceAfter=6)
style_intro_bold = ParagraphStyle('IntroBold', fontName='LibSans-Bold', fontSize=9, leading=13, textColor=C_HEADING, alignment=TA_JUSTIFY, spaceAfter=6)

# ============================================================
# PAGE TEMPLATE (header/footer)
# ============================================================
def header_footer(canvas, doc):
    canvas.saveState()
    page_num = canvas.getPageNumber()

    if page_num == 1:
        # Cover page — no header/footer
        canvas.restoreState()
        return

    # Header
    canvas.setFont('LibSans', 8)
    canvas.setFillColor(C_HEADER)
    canvas.drawString(20*mm, A4[1] - 12*mm, 'LastSaaS CodeWiki Compendium')

    # Footer
    canvas.setFont('LibSans', 9)
    canvas.setFillColor(HexColor('#555555'))
    canvas.drawRightString(A4[0] - 20*mm, 12*mm, str(page_num))

    # Top border line
    canvas.setStrokeColor(HexColor('#dddddd'))
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, A4[1] - 14*mm, A4[0] - 20*mm, A4[1] - 14*mm)

    canvas.restoreState()

def cover_page(canvas, doc):
    """Draw the cover page background."""
    canvas.saveState()
    # Dark background
    canvas.setFillColor(C_COVER_BG)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)

    # Accent bar at top
    canvas.setFillColor(C_COVER_ACCENT)
    canvas.rect(0, A4[1] - 8*mm, A4[0], 8*mm, fill=1, stroke=0)

    # Reference document label
    canvas.setFont('LibSans', 8)
    canvas.setFillColor(HexColor('#6b8aaa'))
    label = "R E F E R E N C E   D O C U M E N T   ·   V 1 . 0   ·   C O M P A N I O N   T O   T H E   E N G I N E E R I N G   P L A N"
    canvas.drawString(25*mm, A4[1] - 25*mm, label)

    # Title
    canvas.setFont('LibSans-Bold', 36)
    canvas.setFillColor(white)
    canvas.drawString(25*mm, A4[1] - 70*mm, 'LastSaaS')
    canvas.drawString(25*mm, A4[1] - 85*mm, 'CodeWiki')
    canvas.drawString(25*mm, A4[1] - 100*mm, 'Compendium')

    # Subtitle
    canvas.setFont('LibSans', 13)
    canvas.setFillColor(HexColor('#a0b4d0'))
    canvas.drawString(25*mm, A4[1] - 115*mm, 'A field-level reference for the lastsaas codebase, derived from the')
    canvas.drawString(25*mm, A4[1] - 122*mm, 'CodeWiki analysis (61 sections, 177 source files, 48 diagrams).')

    # Stats box
    y = A4[1] - 155*mm
    canvas.setFont('LibSans-Bold', 10)
    canvas.setFillColor(C_COVER_ACCENT)
    canvas.drawString(25*mm, y, 'COVERAGE')
    y -= 8*mm
    canvas.setFont('LibSans', 9)
    canvas.setFillColor(HexColor('#a0b4d0'))
    stats = [
        '61 analysis sections (backend + frontend)',
        '177 source file references',
        '48 SVG architecture diagrams',
        '936 code blocks (Go, bash, YAML)',
        '22 Go packages · 22 data models · 133 API routes',
        '10 middleware · 22 events · Stripe billing · Resend email',
    ]
    for stat in stats:
        canvas.drawString(25*mm, y, '·  ' + stat)
        y -= 6*mm

    # Footer
    canvas.setFont('LibSans', 8)
    canvas.setFillColor(HexColor('#4a6a8a'))
    canvas.drawString(25*mm, 20*mm, 'Z.ai  ·  Generated from CodeWiki HTML snapshot  ·  July 2026')

    canvas.restoreState()

# ============================================================
# LOAD DATA
# ============================================================
def load_data():
    with open('/home/z/my-project/src/data/codewiki-sections.json', 'r') as f:
        return json.load(f)

# ============================================================
# BUILD STORY
# ============================================================
def build_story(data):
    story = []

    # --- COVER PAGE ---
    # Cover is drawn by canvas on page 1, just add a page break
    story.append(PageBreak())

    # --- HOW TO USE ---
    story.append(Paragraph('How to use this compendium', style_h1))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        'This document is the full reference spec for the lastsaas codebase, mined from a complete '
        'CodeWiki analysis (codewiki.google) of the jonradoff/lastsaas repository. It is the companion '
        'to the Engineering Plan PDF — where the plan explains <b>what to build</b> for the LMS SaaS, '
        'this compendium explains <b>what lastsaas already provides</b> as the foundation.',
        style_intro
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        'The compendium is organized into Spec Parts A through E, matching the architecture layers of lastsaas: '
        'backend server, configuration & database, middleware, API & data models, authentication, billing, '
        'webhooks, system administration, health monitoring, and frontend application structure.',
        style_intro
    ))
    story.append(Spacer(1, 6))

    # Domain summary table
    story.append(Paragraph('Domain Summary', style_h2))
    domain_data = [
        [Paragraph('<b>Domain</b>', style_table_header), Paragraph('<b>Count</b>', style_table_header), Paragraph('<b>Source</b>', style_table_header)],
        [Paragraph('Analysis sections', style_table_cell), Paragraph('61', style_table_cell), Paragraph('CodeWiki HTML', style_table_cell)],
        [Paragraph('Source files', style_table_cell), Paragraph('177', style_table_cell), Paragraph('backend/ + frontend/', style_table_cell)],
        [Paragraph('Go packages', style_table_cell), Paragraph('22', style_table_cell), Paragraph('backend/internal/', style_table_cell)],
        [Paragraph('Data models', style_table_cell), Paragraph('22', style_table_cell), Paragraph('backend/internal/models/', style_table_cell)],
        [Paragraph('API routes', style_table_cell), Paragraph('133', style_table_cell), Paragraph('backend/cmd/server/main.go', style_table_cell)],
        [Paragraph('Middleware', style_table_cell), Paragraph('10', style_table_cell), Paragraph('backend/internal/middleware/', style_table_cell)],
        [Paragraph('Events', style_table_cell), Paragraph('22', style_table_cell), Paragraph('backend/internal/events/', style_table_cell)],
        [Paragraph('Architecture diagrams', style_table_cell), Paragraph('48', style_table_cell), Paragraph('SVG in CodeWiki HTML', style_table_cell)],
        [Paragraph('Code blocks', style_table_cell), Paragraph('936', style_table_cell), Paragraph('Go, bash, YAML', style_table_cell)],
        [Paragraph('Frontend pages', style_table_cell), Paragraph('46', style_table_cell), Paragraph('frontend/src/pages/', style_table_cell)],
        [Paragraph('Payment integration', style_table_cell), Paragraph('1 (Stripe)', style_table_cell), Paragraph('backend/internal/stripe/', style_table_cell)],
        [Paragraph('Email service', style_table_cell), Paragraph('1 (Resend)', style_table_cell), Paragraph('backend/internal/email/', style_table_cell)],
    ]
    t = Table(domain_data, colWidths=[60*mm, 40*mm, 70*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), C_TABLE_HEADER),
        ('TEXTCOLOR', (0, 0), (-1, 0), C_HEADING),
        ('FONTNAME', (0, 0), (-1, 0), 'LibSans-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, C_TABLE_BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    story.append(PageBreak())

    # --- SPEC PARTS ---
    # Group sections into spec parts based on their names/content
    spec_parts = [
        ('SPEC PART A', 'Backend Server Architecture, Configuration & Database', [
            'Development Environment', 'Backend Server Architecture', 'Configuration Management',
            'Database Connectivity', 'Middleware Architecture'
        ]),
        ('SPEC PART B', 'Health Monitoring, Metrics & Event System', [
            'Health Monitoring', 'Daily Metrics', 'DataDog', 'Internal Event System'
        ]),
        ('SPEC PART C', 'API Endpoints, Data Models & Authentication', [
            'API Endpoints', 'Core Data Models', 'Authentication', 'OAuth', 'JWT', 'Password',
            'Multi-Factor', 'HTTP Middleware for Auth'
        ]),
        ('SPEC PART D', 'Billing, Webhooks & External Integrations', [
            'Billing', 'Stripe', 'Customer and Product', 'Subscription Lifecycle',
            'Webhook Handling', 'Invoice', 'Webhooks and External', 'Webhook Dispatch',
            'Webhook Secret', 'Email Sending'
        ]),
        ('SPEC PART E', 'System Administration, Health & Frontend', [
            'System Administration', 'System Diagnostics', 'Log Management', 'Process Management',
            'Multi-Cloud Platform', 'Financial Reporting', 'Configuration Variable',
            'System Health', 'Node Management', 'System Metric', 'Integration Health',
            'Querying System', 'Frontend Application', 'Global State', 'API Communication',
            'Routing and Access', 'Dynamic Branding', 'Client-Side Telemetry',
            'Error Handling', 'Frontend Components', 'Foundational UI', 'Core Application',
            'Authentication and Access Control', 'Dynamic Branding Injection',
            'Administrative Pages', 'User-Facing', 'Authentication Flow', 'Public-Facing',
            'Frontend API Client', 'Dynamic Header', 'Token Refresh', 'System Initialization',
            'Structured API'
        ]),
    ]

    sections = data['sections']
    section_num = 0

    for part_idx, (part_label, part_title, keywords) in enumerate(spec_parts):
        # Part header
        story.append(Paragraph(f'{part_label}', style_h1))
        story.append(Paragraph(f'{part_title}', style_h2))
        story.append(Spacer(1, 6))

        # Find matching sections
        for s in sections:
            matches = any(kw.lower() in s['name'].lower() for kw in keywords)
            if not matches:
                continue

            section_num += 1
            level = s.get('level', 2)
            heading_style = style_h2 if level == 2 else style_h3

            # Section heading with number
            prefix = f'{part_idx + 1}.{section_num} '
            story.append(Paragraph(f'{prefix}{s["name"]}', heading_style))

            # Content — clean and render
            content = s.get('content', '')
            if content:
                # Split into paragraphs
                paragraphs = content.split('\n\n')
                for para in paragraphs:
                    para = para.strip()
                    if not para:
                        continue
                    # Detect code-like content
                    if para.startswith('link') or para.startswith('bash') or para.startswith('go ') or para.startswith('content_copy'):
                        para = re.sub(r'^(link|bash|go |content_copy|Copy|zoom_in)\s*', '', para)

                    # Clean up code artifacts
                    para = para.replace('content_copy Copy', '')
                    para = para.replace('zoom_in', '')
                    para = para.replace('link ', '')

                    # If it looks like code (has lots of special chars), render as code
                    if any(kw in para for kw in ['func ', 'import ', 'package ', 'type ', 'const ', 'var ', 'cp ', 'echo ', 'if ', 'for ', 'return ']):
                        # Render as code block
                        # Split into lines and format
                        lines = para.split('\n')
                        code_html = '<br/>'.join(line.replace('<', '&lt;').replace('>', '&gt;') for line in lines)
                        story.append(Paragraph(code_html, style_code))
                    else:
                        # Render as body text
                        # Escape HTML
                        para_clean = para.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        story.append(Paragraph(para_clean, style_body))

            # Code blocks
            code_blocks = s.get('code_blocks', [])
            if code_blocks:
                for i, code in enumerate(code_blocks[:5]):  # Limit to 5 per section
                    if len(code.strip()) < 10:
                        continue
                    # Clean code
                    code_clean = code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    code_clean = code_clean.replace('\n', '<br/>')
                    story.append(Paragraph(code_clean, style_code))

            story.append(Spacer(1, 4))

        # Page break between parts
        if part_idx < len(spec_parts) - 1:
            story.append(PageBreak())

    # --- SOURCE FILES APPENDIX ---
    story.append(PageBreak())
    story.append(Paragraph('Appendix: Source Files Referenced', style_h1))
    story.append(Paragraph(
        f'The CodeWiki analysis references {data["total_source_files"]} unique source files across the '
        'backend and frontend directories of the lastsaas repository.',
        style_intro
    ))
    story.append(Spacer(1, 6))

    # Group by directory
    files = data.get('source_files', [])
    backend_files = [f for f in files if f.startswith('backend/')]
    frontend_files = [f for f in files if f.startswith('frontend/')]

    story.append(Paragraph(f'Backend Files ({len(backend_files)})', style_h2))
    for f in backend_files:
        story.append(Paragraph(f'<font name="LibMono" size="6" color="#6b3000">{f}</font>', style_body_left))

    story.append(Spacer(1, 8))
    story.append(Paragraph(f'Frontend Files ({len(frontend_files)})', style_h2))
    for f in frontend_files:
        story.append(Paragraph(f'<font name="LibMono" size="6" color="#6b3000">{f}</font>', style_body_left))

    return story

# ============================================================
# MAIN
# ============================================================
def main():
    data = load_data()
    print(f"Loaded {data['total_sections']} sections, {data['total_source_files']} source files")

    output_path = '/home/z/my-project/download/LastSaaS-CodeWiki-Compendium.pdf'

    # Create document
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=18*mm,
        bottomMargin=18*mm,
        title='LastSaaS CodeWiki Compendium — Reference Document',
        author='Z.ai',
        subject='Field-level reference for the lastsaas codebase, mined from CodeWiki analysis (61 sections, 177 source files, 48 diagrams)',
        creator='Z.ai PDF skill (ReportLab)',
    )

    story = build_story(data)
    print(f"Story has {len(story)} flowables")

    # Build with custom page templates
    doc.build(story, onFirstPage=cover_page, onLaterPages=header_footer)

    print(f"\nPDF generated: {output_path}")
    print(f"File size: {os.path.getsize(output_path):,} bytes")

    # Count pages
    import fitz
    pdf_doc = fitz.open(output_path)
    print(f"Page count: {len(pdf_doc)}")
    pdf_doc.close()

if __name__ == '__main__':
    main()
