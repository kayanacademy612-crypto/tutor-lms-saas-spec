#!/usr/bin/env python3
"""
Build the body PDF for: Building a Tutor LMS Pro-Style SaaS on lastsaas
Pipeline: ReportLab body -> merge with cover PDF -> final output in /download
"""

import os, sys, hashlib

# Make pdf skill scripts importable
PDF_SKILL_DIR = "/home/z/my-project/skills/pdf"
_scripts = os.path.join(PDF_SKILL_DIR, "scripts")
if _scripts not in sys.path:
    sys.path.insert(0, _scripts)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Image, ListFlowable, ListItem, HRFlowable, Flowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ━━ Cascade Palette ━━
PAGE_BG       = colors.HexColor('#f2f2f0')
SECTION_BG    = colors.HexColor('#ececeb')
CARD_BG       = colors.HexColor('#f0efeb')
TABLE_STRIPE  = colors.HexColor('#efeeeb')
HEADER_FILL   = colors.HexColor('#68604b')
COVER_BLOCK   = colors.HexColor('#5d543b')
BORDER        = colors.HexColor('#c8c2b1')
ICON          = colors.HexColor('#8f7938')
ACCENT        = colors.HexColor('#94761d')
ACCENT_2      = colors.HexColor('#7457c9')
TEXT_PRIMARY  = colors.HexColor('#262522')
TEXT_MUTED    = colors.HexColor('#817e77')
SEM_SUCCESS   = colors.HexColor('#3f7952')
SEM_WARNING   = colors.HexColor('#a98a4b')
SEM_ERROR     = colors.HexColor('#ad4c44')
SEM_INFO      = colors.HexColor('#44698d')

TABLE_HEADER_COLOR = HEADER_FILL
TABLE_HEADER_TEXT  = colors.white
TABLE_ROW_EVEN     = colors.white
TABLE_ROW_ODD      = TABLE_STRIPE

# ━━ Fonts ━━
def register_fonts():
    """Register FreeSerif + FreeSans + FreeMono (Latin only)."""
    pdfmetrics.registerFont(TTFont('FreeSerif', '/usr/share/fonts/truetype/freefont/FreeSerif.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSerif-Bold', '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSerif-Italic', '/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSans', '/usr/share/fonts/truetype/freefont/FreeSans.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSans-Bold', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf'))
    pdfmetrics.registerFont(TTFont('FreeMono', '/usr/share/fonts/truetype/freefont/FreeMono.ttf'))
    from reportlab.pdfbase.pdfmetrics import registerFontFamily
    registerFontFamily('FreeSerif', normal='FreeSerif', bold='FreeSerif-Bold', italic='FreeSerif-Italic')
    registerFontFamily('FreeSans', normal='FreeSans', bold='FreeSans-Bold')

register_fonts()

# ━━ Styles ━━
BODY_FONT = 'FreeSerif'
BODY_BOLD = 'FreeSerif-Bold'
SANS_FONT = 'FreeSans'
SANS_BOLD = 'FreeSans-Bold'
MONO_FONT = 'FreeMono'

h1_style = ParagraphStyle(
    'H1', fontName=SANS_BOLD, fontSize=20, leading=26, textColor=TEXT_PRIMARY,
    spaceBefore=8, spaceAfter=14, alignment=TA_LEFT,
)
h2_style = ParagraphStyle(
    'H2', fontName=SANS_BOLD, fontSize=14, leading=18, textColor=HEADER_FILL,
    spaceBefore=16, spaceAfter=8, alignment=TA_LEFT,
)
h3_style = ParagraphStyle(
    'H3', fontName=SANS_BOLD, fontSize=11.5, leading=15, textColor=TEXT_PRIMARY,
    spaceBefore=10, spaceAfter=4, alignment=TA_LEFT,
)
body_style = ParagraphStyle(
    'Body', fontName=BODY_FONT, fontSize=10.5, leading=15.5, textColor=TEXT_PRIMARY,
    alignment=TA_JUSTIFY, spaceAfter=6, firstLineIndent=0,
)
body_indent_style = ParagraphStyle(
    'BodyIndent', parent=body_style, leftIndent=14, spaceAfter=4,
)
callout_style = ParagraphStyle(
    'Callout', fontName=BODY_FONT, fontSize=10, leading=14.5, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leftIndent=14, rightIndent=14, spaceBefore=4, spaceAfter=4,
    backColor=CARD_BG, borderColor=ACCENT, borderWidth=0, borderPadding=8,
)
muted_style = ParagraphStyle(
    'Muted', fontName=BODY_FONT, fontSize=9, leading=12.5, textColor=TEXT_MUTED,
    alignment=TA_LEFT, spaceAfter=4,
)
mono_style = ParagraphStyle(
    'Mono', fontName=MONO_FONT, fontSize=8.5, leading=12, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leftIndent=14, rightIndent=14, spaceBefore=4, spaceAfter=4,
    backColor=colors.HexColor('#f6f5f1'), borderColor=BORDER, borderWidth=0.5, borderPadding=8,
)
bullet_style = ParagraphStyle(
    'Bullet', fontName=BODY_FONT, fontSize=10.5, leading=15, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT, leftIndent=20, bulletIndent=8, spaceAfter=3,
)
table_cell_style = ParagraphStyle(
    'TableCell', fontName=BODY_FONT, fontSize=8.5, leading=11.5, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT,
)
table_cell_bold = ParagraphStyle(
    'TableCellBold', fontName=BODY_BOLD, fontSize=8.5, leading=11.5, textColor=TEXT_PRIMARY,
    alignment=TA_LEFT,
)
table_header_style = ParagraphStyle(
    'TableHeader', fontName=SANS_BOLD, fontSize=8.5, leading=11, textColor=colors.white,
    alignment=TA_LEFT,
)
toc_level0 = ParagraphStyle(
    'TOC0', fontName=SANS_BOLD, fontSize=11, leading=18, textColor=TEXT_PRIMARY, leftIndent=0,
)
toc_level1 = ParagraphStyle(
    'TOC1', fontName=BODY_FONT, fontSize=9.5, leading=15, textColor=TEXT_MUTED, leftIndent=18,
)


# ━━ Heading helpers ━━
def add_heading(text, style, level=0):
    key = f'h_{hashlib.md5(text.encode()).hexdigest()[:10]}'
    p = Paragraph(f'<a name="{key}"/>{text}', style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def h1(text):
    return add_heading(text, h1_style, level=0)

def h2(text):
    return add_heading(text, h2_style, level=1)

def h3(text):
    # H3 not in TOC
    return Paragraph(text, h3_style)

def p(text):
    return Paragraph(text, body_style)

def pi(text):  # indented body
    return Paragraph(text, body_indent_style)

def callout(text):
    return Paragraph(text, callout_style)

def muted(text):
    return Paragraph(text, muted_style)

def mono(text):
    return Paragraph(text.replace('<', '&lt;').replace('>', '&gt;'), mono_style)

def bullets(items, style=None):
    style = style or bullet_style
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=12, value='•') for item in items],
        bulletType='bullet', bulletColor=ACCENT, bulletFontSize=9, leftIndent=14, spaceBefore=2, spaceAfter=2,
    )

def numbered(items, style=None):
    style = style or bullet_style
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=18) for item in items],
        bulletType='1', bulletColor=ACCENT, bulletFontSize=9.5, leftIndent=20, spaceBefore=2, spaceAfter=2,
    )

def hr(thickness=0.4, color=None):
    return HRFlowable(width='100%', thickness=thickness, color=color or BORDER, spaceBefore=4, spaceAfter=4)

def spacer(h=4):
    return Spacer(1, h)


def make_table(data, col_widths, header=True, font_size=8.5):
    """data: list of lists of strings (or Paragraphs). col_widths in mm."""
    rows = []
    for r, row in enumerate(data):
        new_row = []
        for c, cell in enumerate(row):
            if isinstance(cell, Paragraph):
                new_row.append(cell)
            else:
                if header and r == 0:
                    new_row.append(Paragraph(str(cell), table_header_style))
                else:
                    new_row.append(Paragraph(str(cell), table_cell_style))
        rows.append(new_row)
    t = Table(rows, colWidths=[w * mm for w in col_widths], repeatRows=1 if header else 0)
    style = [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, HEADER_FILL) if header else ('LINEBELOW', (0, 0), (-1, 0), 0, colors.white),
        ('LINEBELOW', (0, -1), (-1, -1), 0.4, BORDER),
        ('LINEABOVE', (0, 0), (-1, 0), 0.5, HEADER_FILL) if header else (),
    ]
    if header:
        style.append(('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR))
    # zebra
    for i in range(1, len(rows)):
        bg = TABLE_ROW_EVEN if i % 2 == 1 else TABLE_ROW_ODD
        style.append(('BACKGROUND', (0, i), (-1, i), bg))
    t.setStyle(TableStyle(style))
    return t


# ━━ TocDocTemplate ━━
class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(SANS_FONT, 8)
    canvas.setFillColor(TEXT_MUTED)
    # left: doc title; right: page number
    canvas.drawString(20 * mm, 12 * mm, "Building a Tutor LMS Pro-Style SaaS on lastsaas")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, f"{doc.page}")
    # top thin rule
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.3)
    canvas.line(20 * mm, A4[1] - 18 * mm, A4[0] - 20 * mm, A4[1] - 18 * mm)
    canvas.restoreState()


# ━━ Build story ━━
def build_story():
    story = []

    # ============ TOC ============
    toc = TableOfContents()
    toc.levelStyles = [toc_level0, toc_level1]
    story.append(Paragraph("Table of Contents", h1_style))
    story.append(hr(1, HEADER_FILL))
    story.append(spacer(8))
    story.append(toc)
    story.append(PageBreak())

    # ============ Chapter 1: Executive Summary ============
    story.append(h1("1. Executive Summary"))
    story.append(p(
        "This document is the engineering blueprint for transforming <b>lastsaas</b> — a Go 1.25 + React 19 multi-tenant SaaS foundation — into a fully featured Learning Management System that reaches feature parity with <b>Tutor LMS Pro</b>, the WordPress plugin published by Themeum. The plan deliberately reuses every reusable primitive that lastsaas already ships (multi-tenancy, JWT auth, RBAC, Stripe billing, entitlement gating, in-process event emitter, webhook delivery, MCP server, audit log) and adds only what the LMS domain genuinely requires: a course authoring surface, a lesson and quiz runtime, an ecommerce flow specialized for digital goods, a certificate engine, a video pipeline, a scheduled content-release runner, and an AI generation layer."
    ))
    story.append(p(
        "The target product is a multi-tenant B2B SaaS in which each tenant is a <i>school</i> — an independent course-selling organization with its own instructors, students, branding, and Stripe account. Within a tenant, multiple instructors can author courses, share revenue, and use a unified student experience. Students enroll in courses either through one-time purchases or recurring subscriptions, progress through drip-released content, take quizzes, submit assignments, and earn auto-issued certificates. The platform operator (you) monetizes via tiered subscription plans gated by feature entitlements, exactly the model Tutor LMS Pro uses for its own pricing."
    ))
    story.append(p(
        "Delivery is structured into five phases over twenty-four weeks. Phase 0 hardens the foundation (object storage, scheduled jobs, new RBAC roles, new entitlement keys). Phase 1 ships the core LMS (course catalog, curriculum builder, lesson player, progress tracking). Phase 2 adds ecommerce (cart, checkout, coupons, Stripe one-time and recurring, instructor earnings). Phase 3 layers on Pro authoring (assignments, certificates, content drip, multi-instructor revenue share). Phase 4 adds Pro engagement (gamification, Q&amp;A, announcements, lesson notes, notifications, course preview). Phase 5 closes with reports and an AI generation layer, then enters launch hardening. Each phase has explicit exit criteria and ships a demoable slice."
    ))
    story.append(h2("Top five risks"))
    story.append(numbered([
        "<b>Video pipeline cost overruns.</b> Bunny Stream and Mux both bill per minute streamed and per GB egress; an enthusiastic instructor uploading 50 hours of 1080p video without policy guardrails can blow through a hosting budget in days. Mitigation: enforce upload size limits, transcode-preset caps, signed-URL expiry, and per-tenant bandwidth budgets surfaced on the admin dashboard.",
        "<b>Stripe subscription edge cases.</b> Proration, mid-cycle plan changes, failed renewals (SCA, expired cards), dunning, refund cascades against instructor revenue share — each of these has a non-trivial state machine. Mitigation: build a thin abstraction over Stripe Billing that explicitly models our domain, treat webhooks as the source of truth (idempotent), and write property tests for refund/revenue math.",
        "<b>MongoDB schema migration pain.</b> lastsaas has no migration framework — schema lives in Go struct tags. Adding ~35 new collections without breaking changes will be painful. Mitigation: introduce a lightweight migration runner early (Phase 0) using versioned JSON documents in a <font face='FreeMono'>_migrations</font> collection, plus per-collection schema validators in MongoDB.",
        "<b>Certificate PDF fidelity.</b> Tutor LMS Pro ships 12 certificate templates with pixel-perfect PDF rendering. lastsaas uses <font face='FreeMono'>gofpdf</font> which lacks font subsetting and modern CSS layout. Mitigation: render certificates via Playwright headless Chrome from HTML templates — same pipeline as the cover of this document — then store the resulting PDF in object storage with a verification hash.",
        "<b>Multi-instructor revenue math under refunds.</b> When a course has three instructors with a 40/35/25 split and the student requests a partial refund mid-course, the revenue reversal must respect the same split, net of platform fee, and produce an auditable ledger entry. Mitigation: model revenue as a double-entry ledger from day one, never as derived counters on the order row.",
    ]))
    story.append(PageBreak())

    # ============ Chapter 2: lastsaas recap ============
    story.append(h1("2. Foundations: lastsaas Architecture Recap"))
    story.append(p(
        "lastsaas is a single-tenant-deployable, multi-tenant-by-design SaaS foundation. The entire product ships as one Docker image: a Go binary serves <font face='FreeMono'>/api/*</font> from <font face='FreeMono'>gorilla/mux</font> and serves the built React SPA from <font face='FreeMono'>/app/static</font>. The only external dependency in production is MongoDB Atlas; everything else (email, payments, file blobs) is an external SaaS API. The default deployment target is Fly.io on port 8080."
    ))
    story.append(h2("Backend stack"))
    story.append(make_table([
        ["Layer", "Choice", "Notes for LMS extension"],
        ["Language", "Go 1.25", "Generics used throughout; new modules follow the same patterns."],
        ["HTTP framework", "gorilla/mux", "Routes wired in cmd/server/main.go lines 376–790. Each resource group gets a subrouter."],
        ["Database", "MongoDB (official driver)", "No ORM. Schema maintained in internal/db/schema.go via Go struct tags. ~30 existing collections."],
        ["Auth", "JWT HS256 (60m access / 30d refresh)", "Refresh tokens rotated on use; revoked_tokens collection for logout. RBAC roles: owner, admin, user."],
        ["Billing", "Stripe v82", "stripe.Service.CreateCheckoutSession supports both one-time and recurring modes. stripe_mappings collection links Stripe IDs to internal entities."],
        ["Email", "Resend", "templates rendered via Go html/template. Email queue is in-process."],
        ["Events", "events.Emitter (in-process pub/sub)", "Synchronous, in-memory. Subscribers register in init(). Used for audit log, webhooks, notifications."],
        ["Webhooks", "Outbound only", "Configurable per-tenant. Retry with exponential backoff. Webhook events catalog is the extension point."],
        ["Background jobs", "In-process goroutines", "No external queue. Cron-like scheduling absent — must add for content drip."],
        ["File storage", "MongoDB GridFS for small blobs", "No S3/R2 abstraction. Must add for video — GridFS cannot handle multi-GB files."],
        ["PDF generation", "gofpdf", "Sufficient for invoices; insufficient for certificates — will use Playwright."],
        ["MCP server", "mark3labs/mcp-go", "Exposes CLI tools as MCP resources. LMS admin operations can be exposed as MCP tools."],
        ["Config", "configstore (runtime, no redeploy)", "Used for feature flags and per-tenant settings."],
        ["Audit log", "audit_log collection", "Append-only, indexed by tenant_id + actor_id + timestamp."],
    ], [25, 38, 80]))
    story.append(spacer(4))
    story.append(h2("Frontend stack"))
    story.append(make_table([
        ["Layer", "Choice", "Notes for LMS extension"],
        ["Build", "Vite 7", "Fast HMR. React 19. No SSR."],
        ["Routing", "react-router-dom v7", "All routes registered in src/App.tsx. LMS routes will be added as a feature sub-tree."],
        ["Server state", "TanStack Query v5", "Used for all API calls. New LMS hooks follow the same useXxxQuery / useXxxMutation naming."],
        ["Client state", "Zustand", "Sparse usage. Will host quiz session state and video player state."],
        ["Forms", "react-hook-form v7 + zod v4", "Schema-first. Course builder form will reuse this."],
        ["UI primitives", "8 custom components in src/components/ui/", "Not shadcn. Will need to add: Tabs, Dialog, Drawer, Command palette, DragDrop context, Rich text editor."],
        ["Styling", "Tailwind CSS v4 (@theme directive)", "Per-component CSS modules not used. LMS components follow Tailwind conventions."],
        ["i18n", "None", "All strings hardcoded. Must add if international schools are a target — open question."],
        ["Theming", "Light/dark via branding_config", "Per-tenant branding already supported. LMS pages inherit."],
    ], [25, 38, 80]))
    story.append(spacer(4))
    story.append(h2("Existing collections (30+)"))
    story.append(p(
        "These collections are already defined in <font face='FreeMono'>internal/db/schema.go</font>. The LMS extension will add new collections alongside them, all keyed by <font face='FreeMono'>tenant_id</font> for isolation."
    ))
    story.append(make_table([
        ["Domain", "Collections"],
        ["Identity", "users, refresh_tokens, verification_tokens, oauth_states, revoked_tokens, auth_codes, webauthn_credentials, webauthn_sessions, sso_connections"],
        ["Tenancy", "tenants, tenant_memberships, invitations"],
        ["Billing", "plans, credit_bundles, financial_transactions, stripe_mappings"],
        ["Platform", "config_vars, announcements, custom_pages, messages, usage_events, telemetry_events, event_definitions, system_config, system_logs, audit_log, impersonation_logs, branding_config, branding_assets"],
        ["Integration", "api_keys, webhooks, webhook_deliveries, webhook_events"],
        ["Operations", "leader_locks, counters, system_nodes, system_metrics, daily_metrics"],
    ], [25, 120]))
    story.append(spacer(4))
    story.append(h2("Key extension points"))
    story.append(p(
        "lastsaas was designed for extension. Five primitives will be reused as-is, with no schema changes required:"
    ))
    story.append(numbered([
        "<b>events.Emitter</b> — subscribe to existing events (user.created, tenant.invited, stripe.checkout.completed) and emit new LMS events (course.published, lesson.completed, enrollment.created, certificate.issued).",
        "<b>RequireEntitlement middleware</b> — already used to gate features per plan. Adding LMS entitlements is a config change, not a code change. New keys: <font face='FreeMono'>lms.quizzes</font>, <font face='FreeMono'>lms.certificates</font>, <font face='FreeMono'>lms.multi_instructor</font>, <font face='FreeMono'>lms.content_drip</font>, <font face='FreeMono'>lms.gamification</font>, <font face='FreeMono'>lms.reports</font>, <font face='FreeMono'>lms.tutorai</font>, <font face='FreeMono'>lms.zoom</font>.",
        "<b>Webhook event catalog</b> — extend <font face='FreeMono'>WebhookEventType</font> enum with LMS events. Tenants can subscribe to <font face='FreeMono'>enrollment.created</font> to push into their CRM.",
        "<b>stripe.Service.CreateCheckoutSession</b> — already supports both one-time and recurring modes. Course purchase = one-time; subscription plan = recurring. The line-item shape is the only new code.",
        "<b>configstore</b> — runtime per-tenant config without redeploy. Course completion thresholds, video quality caps, AI token budgets — all live here.",
    ]))
    story.append(h2("What lastsaas does NOT have (and we must add)"))
    story.append(bullets([
        "Object storage abstraction (S3 / Cloudflare R2 / Bunny Stream).",
        "Scheduled jobs runner (for content drip, certificate expiry, dunning emails, AI batch generation).",
        "Rich text / blocks editor on the frontend (recommend TipTap).",
        "Video pipeline (transcode, signed playback, DRM-lite via token auth).",
        "Migration framework (MongoDB schema validators + versioned migrations).",
        "Search index (Mongo text index is enough at MVP scale; Atlas Search or Meilisearch later).",
        "Any LMS domain code — confirmed greenfield by repo-wide grep for 'course', 'lesson', 'enrollment', 'instructor', 'video'.",
    ]))
    story.append(PageBreak())

    # ============ Chapter 3: Tutor LMS Pro feature decomposition ============
    story.append(h1("3. Target: Tutor LMS Pro Feature Decomposition"))
    story.append(p(
        "Tutor LMS is a WordPress plugin, so its data model is shaped by WordPress conventions: courses, topics (sections), lessons, quizzes, and questions are all custom post types; richer data lives in custom tables (<font face='FreeMono'>tutor_quiz_attempts</font>, <font face='FreeMono'>tutor_enrolled</font>, <font face='FreeMono'>tutor_order</font>, <font face='FreeMono'>tutor_subscription_plans</font>, <font face='FreeMono'>tutor_subscriptions</font>) and the postmeta key/value table. Pro features are wired in through a classic addon loader at <font face='FreeMono'>tutor-pro/tutor-pro/addons/</font> with a base helper class. This decomposition matters because it tells us what to consolidate into clean document collections and what to keep as separate modules."
    ))

    story.append(h2("3.1 Domain model: course authoring"))
    story.append(make_table([
        ["Entity", "Source", "Key fields", "Relationships"],
        ["Course", "free: models/CourseModel.php", "title, description, status (draft/publish/pending/private/future/trash), price, level, category, tags, benefits, requirements, target_audience, total_enrolled, rating_avg, thumbnail, video, completion_mode (flexible/strict)", "has_many Topics → Lessons; has_many Instructors (Pro); has_many Enrollments; has_many Reviews; has_many Certificates (Pro)"],
        ["Topic (Section)", "free: WP post type 'topics'", "title, summary, course_id, sort_order", "belongs_to Course; has_many Lessons"],
        ["Lesson", "free: models/LessonModel.php", "title, content, video_source (html5/youtube/vimeo/embedded/bunny), video_url, attachments, duration, sort_order", "belongs_to Topic; has_one Quiz (optional); has_many Lesson_Notes (Pro); has_many Comments"],
        ["Lesson Video", "free: lesson meta", "source_type, source_url, duration, poster, thumbnails", "embedded in Lesson document"],
        ["Attachment", "free: lesson/course meta", "file_url, file_type, file_size, title", "belongs_to Lesson or Course"],
        ["Course Category", "free: WP taxonomy 'course-category'", "name, slug, parent, description", "has_many Courses"],
        ["Course Tag", "free: WP taxonomy 'course-tag'", "name, slug", "has_many Courses"],
        ["Review", "free: course meta", "student_id, rating (1-5), review_text, created_at", "belongs_to Course, belongs_to Student"],
        ["Q&A Question", "free: views/qna/", "student_id, course_id, lesson_id, question, answers[]", "belongs_to Course/Lesson; has_many Answers"],
    ], [22, 25, 60, 40]))
    story.append(spacer(4))

    story.append(h2("3.2 Domain model: quizzes and questions"))
    story.append(p(
        "Quiz attempts are stored in the <font face='FreeMono'>tutor_quiz_attempts</font> table with per-question answers in <font face='FreeMono'>tutor_quiz_attempt_answers</font>. Question types are the most distinctive feature — Tutor LMS supports 14 types, of which 5 are Pro-only."
    ))
    story.append(make_table([
        ["Question type", "Free / Pro", "Storage shape"],
        ["true_false", "Free", "question, correct_answer (boolean)"],
        ["single_choice", "Free", "question, options[], correct_option_id"],
        ["multiple_choice", "Free", "question, options[], correct_option_ids[]"],
        ["open_ended", "Free", "question, expected_answer (free text, instructor-graded)"],
        ["fill_in_the_blank", "Free", "question with {blank} placeholders, answers[]"],
        ["short_answer", "Free", "question, expected_answer (≤200 chars)"],
        ["matching", "Free", "question, pairs[] = {left, right}"],
        ["image_matching", "Free", "question, image_pairs[] = {image, label}"],
        ["image_answering", "Free", "question, image, correct_answer"],
        ["ordering", "Free", "question, items[] (correct order)"],
        ["draw_image (Image Marking)", "Pro", "question, image, marking_areas[]"],
        ["scale (Range)", "Pro", "question, min, max, step, correct_range"],
        ["pin_image (Pin)", "Pro", "question, image, pin_coordinates"],
        ["coordinates", "Pro", "question, image, correct_coordinates"],
        ["puzzle", "Pro", "question, puzzle_pieces[]"],
    ], [30, 18, 80]))
    story.append(spacer(4))
    story.append(make_table([
        ["Quiz entity", "Source", "Key fields", "Notes"],
        ["Quiz", "free: models/QuizModel.php", "title, description, time_limit, attempts_allowed, passing_score, grading_mode (auto/manual), shuffle_questions, show_answer_feedback", "Attached to a Lesson or standalone"],
        ["Quiz Attempt", "free: tutor_quiz_attempts", "student_id, quiz_id, attempt_status (started/ended/review_required/timeout), result (pass/fail/pending), score, started_at, ended_at", "Per-question answers stored separately"],
        ["Quiz Attempt Answer", "free: tutor_quiz_attempt_answers", "attempt_id, question_id, answer (JSON), is_correct, marks_awarded", "One row per question per attempt"],
        ["Question Bank", "free", "questions reusable across quizzes", "Pro addon adds import/export"],
    ], [25, 25, 50, 35]))
    story.append(spacer(4))

    story.append(h2("3.3 Domain model: ecommerce and subscriptions"))
    story.append(make_table([
        ["Entity", "Source", "Key fields", "Notes"],
        ["Cart", "free: models/CartModel.php", "tenant_id, student_id, items[] = {course_id, plan_id, price}", "Per-session or per-student"],
        ["Cart Item", "free: models/CartItemModel.php", "cart_id, course_id or bundle_id or plan_id, list_price, sale_price", "Polymorphic"],
        ["Order", "free: models/OrderModel.php", "status (incomplete/completed/cancelled/trash/pending), payment_status (paid/failed/unpaid/refunded/partially-refunded/pending), payment_method (manual/free/stripe/paypal), total, tax, discount, currency", "1:N to OrderItems"],
        ["Order Item", "free: models/OrderItemModel.php", "order_id, product_type (course/bundle/subscription), product_id, price", "Polymorphic"],
        ["Order Activity", "free: models/OrderActivitiesModel.php", "order_id, action (created/paid/refunded/cancelled), actor_id, metadata", "Append-only audit log per order"],
        ["Coupon", "free: models/CouponModel.php", "code, status (active/inactive/expired/scheduled), discount_type (flat/percentage), discount_value, applies_to (all_courses/specific_courses/category/membership), min_purchase, max_uses, per_user_limit, valid_from, valid_to", "Rich — 6 applies_to types"],
        ["Coupon Redemption", "free", "coupon_id, order_id, student_id, redeemed_at, discount_applied", "Audit + uniqueness"],
        ["Subscription Plan", "Pro: subscription/src/Models/PlanModel.php", "name, status (active/inactive), payment_type (onetime/recurring), plan_type (course/bundle/category/full_site), price, interval (hour/day/week/month/year), interval_count, trial_days", "Recurring only = membership; full_site = membership"],
        ["Subscription", "Pro: subscription/src/Models/SubscriptionModel.php", "student_id, plan_id, status (pending/active/expired/hold/cancelled/trash), started_at, current_period_end, history[]", "History events: subscribed, renewed, resubscribed, cancelled, put_on_hold"],
        ["Bundle", "Pro", "title, courses[], price", "Sold as one unit; enrolled student gets all bundle courses"],
        ["Withdrawal Request", "free: models/WithdrawModel.php", "instructor_id, amount, status (pending/approved/rejected/paid), method, requested_at", "Per-instructor payout"],
    ], [22, 30, 65, 30]))
    story.append(spacer(4))

    story.append(h2("3.4 Pro-only feature inventory"))
    story.append(p(
        "These features exist in <font face='FreeMono'>tutor-pro/tutor-pro/</font> but NOT in the free repo. They are the paywall surface for the SaaS — each maps to one or more entitlement keys."
    ))
    story.append(make_table([
        ["Feature", "Pro folder", "SaaS entitlement key"],
        ["Certificates (12 PDF templates, auto-issue, verify URL)", "addons/tutor-certificate/", "lms.certificates"],
        ["Multi-instructor + revenue share", "addons/tutor-multi-instructors/, classes/Instructor_Percentage.php", "lms.multi_instructor"],
        ["Content Drip (schedule by date / prereq / enrollment)", "addons/content-drip/", "lms.content_drip"],
        ["Native Subscriptions & Memberships", "addons/subscription/", "lms.subscriptions (bundled with plan tier)"],
        ["Zoom meetings & webinars as lessons", "addons/tutor-zoom/", "lms.zoom"],
        ["Advanced reports (sales, course, student, earnings, statements)", "addons/tutor-report/", "lms.reports"],
        ["Gamification (points, badges, leaderboards) via GamiPress integration", "addons (via hooks)", "lms.gamification"],
        ["H5P interactive content", "addons/h5p/", "lms.h5p"],
        ["BuddyPress social layer", "addons/buddypress/", "lms.community (deferred)"],
        ["Course Preview (free preview lessons)", "addons/tutor-course-preview/", "lms.course_preview"],
        ["Course Attachments (downloadable resources)", "addons/tutor-course-attachments/", "lms.attachments"],
        ["Custom Email templates (30+)", "addons/tutor-email/, templates/email/", "lms.custom_emails"],
        ["Push notifications (real-time, via Pusher)", "addons/tutor-notifications/", "lms.notifications"],
        ["2FA + reCAPTCHA + OTP login", "addons/auth/", "lms.advanced_auth (always on)"],
        ["Social login (Google, Facebook)", "addons/social-login/", "lms.social_login"],
        ["Calendar (Google Calendar sync)", "addons/calendar/", "lms.calendar"],
        ["Quiz import/export", "addons/quiz-import-export/", "lms.quiz_import_export"],
        ["WPML multilingual", "addons/tutor-wpml/", "lms.i18n (open question)"],
        ["Google Classroom integration", "addons/google-classroom/", "lms.gclassroom (deferred)"],
        ["Paid Memberships Pro integration", "addons/pmpro/", "N/A — we ship our own"],
        ["Restrict Content Pro integration", "addons/restrict-content-pro/", "N/A — we ship our own"],
        ["Weglot translation", "addons/tutor-weglot/", "N/A — we ship our own"],
        ["Lesson Notes", "classes/LessonNotes.php", "lms.lesson_notes"],
        ["Content Security (video DRM-lite, watermark)", "classes/ContentSecurity.php", "lms.content_security"],
        ["Device Management (limit concurrent logins)", "classes/DeviceManagement.php", "lms.device_management"],
        ["Course Coming Soon (pre-launch pages)", "classes/CourseComingSoon.php", "lms.coming_soon"],
        ["Course Duplicator", "classes/Course_Duplicator.php", "lms.course_duplicate"],
        ["Email Verification", "classes/EmailVerification.php", "always on (lastsaas already does this)"],
        ["Guest Checkout", "ecommerce/GuestCheckout/", "lms.guest_checkout"],
        ["Gift Course", "templates/dashboard/gift-course.php, gift-course/", "lms.gift_course"],
        ["Instructor application & review", "classes/Instructor.php", "lms.instructor_apply (always on)"],
        ["Webinars (live lessons)", "classes/Webinar.php", "bundled with lms.zoom"],
        ["Progress Reset (per-student)", "classes/ProgressReset.php", "lms.progress_reset"],
        ["TutorAI (AI course / quiz generation)", "tutorai/, openai/", "lms.tutorai"],
        ["Invoice generation", "ecommerce/Invoice.php", "always on"],
        ["Content Duplicator (within tenant)", "classes/ContentDuplicator.php", "bundled with lms.course_duplicate"],
        ["Notification preferences per student", "classes/NotificationPreference.php", "always on"],
        ["Visibility Field Control (lesson gating)", "classes/VisibilityFieldControl.php", "always on"],
    ], [40, 30, 30]))
    story.append(PageBreak())

    # ============ Chapter 4: Gap analysis ============
    story.append(h1("4. Gap Analysis and Extension Strategy"))
    story.append(p(
        "The gap analysis below pairs each LMS capability we need with what lastsaas already provides. The pattern is consistent: identity, billing, tenancy, and audit come for free; everything LMS-specific is greenfield. The strategy is therefore additive — we build new modules under <font face='FreeMono'>backend/internal/lms/</font> and new feature folders under <font face='FreeMono'>frontend/src/features/lms/</font>, and we extend three existing touchpoints: the route table in <font face='FreeMono'>cmd/server/main.go</font>, the event catalog in <font face='FreeMono'>events/</font>, and the entitlement catalog in <font face='FreeMono'>middleware/entitlement.go</font>."
    ))
    story.append(make_table([
        ["Capability", "lastsaas today", "LMS requirement", "Strategy"],
        ["User identity", "JWT, RBAC (owner/admin/user), OAuth, WebAuthn", "Need instructor + student roles", "Extend RBAC role enum; add role membership to tenant_memberships"],
        ["Multi-tenancy", "tenants + tenant_memberships", "Each tenant = school", "Reuse as-is; all LMS collections get tenant_id index"],
        ["Billing", "Stripe one-time + recurring via stripe.Service", "Course = one-time; plan = recurring; bundle = one-time", "Reuse stripe.Service; add LMS-specific line items"],
        ["Entitlements", "RequireEntitlement middleware on plan.entitlements map", "8+ new LMS entitlement keys", "Add keys to default plan seeds; middleware unchanged"],
        ["File storage", "MongoDB GridFS (small blobs only)", "Need video upload + playback + thumbnails + attachments", "Add S3/R2 abstraction (Phase 0); Bunny Stream for video"],
        ["Scheduled jobs", "None — only goroutines", "Content drip, dunning, cert expiry, AI batches", "Add river-style job runner backed by MongoDB (Phase 0)"],
        ["Email", "Resend + Go templates", "30+ LMS event emails", "Add LMS templates; subscribe to events.Emitter"],
        ["Webhooks", "Outbound, configurable per-tenant", "Add LMS events to catalog", "Extend WebhookEventType enum"],
        ["Rich text editor", "None on frontend", "Course description, lesson content, certificate text", "Add TipTap (Phase 1); store as HTML; sanitize on render"],
        ["Search", "None (manual MongoDB queries)", "Course catalog search, lesson search", "Phase 1: MongoDB text index. Phase 5: Atlas Search if needed"],
        ["PDF generation", "gofpdf (invoices only)", "Certificates with pixel-perfect templates", "Render via Playwright from HTML templates; cache to object storage"],
        ["Video pipeline", "None", "Upload, transcode, signed playback, watermark", "Bunny Stream (preferred) or Mux — Phase 0 decision"],
        ["Notifications", "In-app messages + announcements", "Push + email + in-app, per-student preferences", "Build on events.Emitter + Pusher for realtime push"],
        ["Analytics / reports", "usage_events + telemetry_events (platform-only)", "Per-tenant sales, enrollment, completion, earnings", "New domain module; aggregations on MongoDB (defer ClickHouse)"],
        ["AI generation", "None", "TutorAI: generate course outline, lessons, quizzes", "LLM skill (z-ai-web-dev-sdk or OpenAI); prompt engineering layer"],
        ["i18n", "None", "Multi-language schools", "Open question — defer to post-launch"],
        ["Migration framework", "None", "Must not break existing collections", "Add lightweight migration runner in Phase 0"],
    ], [22, 28, 30, 50]))
    story.append(PageBreak())

    # ============ Chapter 5: Data model ============
    story.append(h1("5. Data Model: MongoDB Collection Diff"))
    story.append(p(
        "All new collections are document-shaped to exploit MongoDB's strengths. Every collection carries <font face='FreeMono'>tenant_id</font> as the first field after <font face='FreeMono'>_id</font> and is indexed on it. The naming convention is singular nouns (<font face='FreeMono'>course</font> not <font face='FreeMono'>courses</font>) to match lastsaas's existing style. Sortable lists use <font face='FreeMono'>sort_order</font> as a float so insertions between two siblings are O(1)."
    ))

    story.append(h2("5.1 Course authoring collections"))
    story.append(make_table([
        ["Collection", "Key fields", "Indexes"],
        ["course", "_id, tenant_id, title, slug, description (HTML), status, level (beginner/intermediate/advanced), price, compare_at_price, currency, category_id, tags[], thumbnail_url, promo_video_url, benefits[], requirements[], target_audience[], total_enrolled_count, rating_avg, rating_count, completion_mode, created_by, created_at, updated_at, published_at", "tenant_id+status+published_at; tenant_id+slug (unique); tenant_id+category_id; tenant_id+tags; text(title,description)"],
        ["course_topic", "_id, tenant_id, course_id, title, summary, sort_order", "tenant_id+course_id+sort_order"],
        ["lesson", "_id, tenant_id, course_id, topic_id, title, content (HTML), sort_order, lesson_type (video/text/quiz/zoom/assignment), video{source_type, source_url, duration, poster, thumbnails[]}, attachments[], is_preview, is_drip_gated, drip_rule_id, created_at", "tenant_id+course_id+sort_order; tenant_id+topic_id"],
        ["course_category", "_id, tenant_id, name, slug, parent_id, description, sort_order, course_count", "tenant_id+slug (unique); tenant_id+parent_id"],
        ["course_tag", "_id, tenant_id, name, slug, course_count", "tenant_id+slug (unique)"],
        ["course_review", "_id, tenant_id, course_id, student_id, rating (1-5), review_text, instructor_reply{text, created_at}, created_at", "tenant_id+course_id; tenant_id+student_id+course_id (unique)"],
    ], [22, 75, 35]))
    story.append(spacer(4))

    story.append(h2("5.2 Quiz and assignment collections"))
    story.append(make_table([
        ["Collection", "Key fields", "Indexes"],
        ["quiz", "_id, tenant_id, lesson_id (nullable), title, description, time_limit_seconds, attempts_allowed, passing_score_percent, grading_mode (auto/manual), shuffle_questions, show_answer_feedback, questions[] (embedded)", "tenant_id+lesson_id"],
        ["quiz_question", "_id, tenant_id, quiz_id, question_type, question_text, marks, options[] / pairs[] / image_url / scale{min,max,step} / puzzle_pieces[] / correct_answer, explanation, sort_order", "tenant_id+quiz_id+sort_order"],
        ["quiz_attempt", "_id, tenant_id, quiz_id, student_id, status (started/ended/review_required/timeout), result (pass/fail/pending), score_percent, started_at, ended_at, time_spent_seconds", "tenant_id+student_id+quiz_id; tenant_id+quiz_id+status"],
        ["quiz_attempt_answer", "_id, tenant_id, attempt_id, question_id, answer (mixed JSON), is_correct, marks_awarded, instructor_feedback", "tenant_id+attempt_id; tenant_id+attempt_id+question_id (unique)"],
        ["assignment", "_id, tenant_id, lesson_id, title, brief (HTML), time_limit_seconds, total_marks, pass_marks, allow_file_upload, allowed_file_types[], max_file_size_mb", "tenant_id+lesson_id"],
        ["assignment_submission", "_id, tenant_id, assignment_id, student_id, file_urls[], text_answer, submitted_at, eval{status (pending/evaluated), awarded_marks, instructor_feedback, evaluated_at, evaluated_by}", "tenant_id+assignment_id+student_id"],
    ], [22, 75, 35]))
    story.append(spacer(4))

    story.append(h2("5.3 Enrollment and progress collections"))
    story.append(make_table([
        ["Collection", "Key fields", "Indexes"],
        ["enrollment", "_id, tenant_id, course_id, student_id, status (active/cancelled/expired/completed), source (free/purchase/subscription/bundle/admin/gift), order_id, subscription_id, enrolled_at, expires_at, completed_at, progress_percent", "tenant_id+student_id+course_id (unique); tenant_id+course_id+status"],
        ["lesson_progress", "_id, tenant_id, enrollment_id, lesson_id, status (not_started/in_progress/completed), time_spent_seconds, last_position_seconds, first_viewed_at, completed_at", "tenant_id+enrollment_id+lesson_id (unique); tenant_id+enrollment_id"],
        ["quiz_attempt", "(see 5.2)", ""],
        ["wishlist", "_id, tenant_id, student_id, course_id, added_at", "tenant_id+student_id+course_id (unique)"],
        ["lesson_note", "_id, tenant_id, student_id, lesson_id, note_text, created_at, updated_at", "tenant_id+student_id+lesson_id"],
        ["qna_question", "_id, tenant_id, course_id, lesson_id (nullable), student_id, question, upvotes[], status (open/answered/closed), created_at", "tenant_id+course_id+status; tenant_id+lesson_id"],
        ["qna_answer", "_id, tenant_id, question_id, author_id, author_role (student/instructor), answer, is_instructor_answer, created_at", "tenant_id+question_id"],
        ["announcement", "_id, tenant_id, course_id, author_id, title, body (HTML), sent_at, read_by[]", "tenant_id+course_id+sent_at"],
    ], [22, 75, 35]))
    story.append(spacer(4))

    story.append(h2("5.4 Ecommerce collections"))
    story.append(make_table([
        ["Collection", "Key fields", "Indexes"],
        ["cart", "_id, tenant_id, owner_id (student or session), items[] = {item_type, item_id, plan_id, list_price, sale_price}, coupon_code, created_at, updated_at", "tenant_id+owner_id (unique)"],
        ["order", "_id, tenant_id, student_id (nullable for guest), status, payment_status, payment_method, currency, subtotal, discount, tax, total, billing{email, name, country, address}, created_at, paid_at, refunded_at", "tenant_id+status+created_at; tenant_id+student_id+created_at"],
        ["order_item", "_id, tenant_id, order_id, product_type (course/bundle/subscription_plan), product_id, plan_id (nullable), price, discount, tax", "tenant_id+order_id"],
        ["order_activity", "_id, tenant_id, order_id, action (created/paid/refunded/partially_refunded/cancelled/failed), actor_id, metadata, created_at", "tenant_id+order_id+created_at"],
        ["coupon", "_id, tenant_id, code, status, discount_type (flat/percentage), discount_value, applies_to_type, applies_to_ids[], min_purchase_amount, max_uses, per_user_limit, used_count, valid_from, valid_to", "tenant_id+code (unique); tenant_id+status"],
        ["coupon_redemption", "_id, tenant_id, coupon_id, order_id, student_id, discount_applied, redeemed_at", "tenant_id+coupon_id+order_id (unique); tenant_id+student_id+coupon_id"],
        ["subscription_plan", "_id, tenant_id, name, status, payment_type (onetime/recurring), plan_type (course/bundle/category/full_site), target_id (course_id/bundle_id/category_id/null for full_site), price, currency, interval (hour/day/week/month/year), interval_count, trial_days, sort_order", "tenant_id+status; tenant_id+plan_type+target_id"],
        ["subscription", "_id, tenant_id, student_id, plan_id, status (pending/active/expired/hold/cancelled), started_at, current_period_start, current_period_end, cancelled_at, history[] = {event, at, metadata}", "tenant_id+student_id+status; tenant_id+plan_id"],
        ["bundle", "_id, tenant_id, title, slug, description, courses[] (with weights for revenue share), price, currency, thumbnail_url", "tenant_id+slug (unique)"],
        ["withdrawal_request", "_id, tenant_id, instructor_id, amount, currency, status (pending/approved/rejected/paid), method, payout_reference, requested_at, processed_at", "tenant_id+instructor_id+status"],
        ["revenue_ledger", "_id, tenant_id, order_id, instructor_id, role (primary/co_instructor/platform), gross_amount, platform_fee, instructor_share, currency, created_at", "tenant_id+instructor_id+created_at; tenant_id+order_id"],
    ], [22, 75, 35]))
    story.append(spacer(4))

    story.append(h2("5.5 Pro feature collections"))
    story.append(make_table([
        ["Collection", "Key fields", "Indexes"],
        ["certificate_template", "_id, tenant_id, name, html (Jinja-style with placeholders), css, thumbnail_url, orientation (landscape/portrait), is_default", "tenant_id"],
        ["certificate", "_id, tenant_id, student_id, course_id, template_id, certificate_number (unique), issued_at, pdf_url, verification_hash, instructor_signatures[] = {instructor_id, signature_image_url}", "tenant_id+student_id+course_id (unique); tenant_id+certificate_number (unique); verification_hash (unique)"],
        ["instructor", "_id, tenant_id, user_id, status (pending/approved/rejected), bio, expertise[], social_links{}, payout_method, payout_details{}, commission_rate_default, created_at, approved_at", "tenant_id+user_id (unique); tenant_id+status"],
        ["course_instructor", "_id, tenant_id, course_id, instructor_id, role (primary/co), revenue_share_percent, sort_order", "tenant_id+course_id; tenant_id+instructor_id (unique)"],
        ["drip_rule", "_id, tenant_id, course_id (nullable for lesson-level), lesson_id (nullable), drip_type (schedule/prerequisite/enrollment_days), schedule_at, prerequisite_lesson_id, days_after_enrollment", "tenant_id+course_id; tenant_id+lesson_id (unique)"],
        ["gamification_point", "_id, tenant_id, student_id, course_id (nullable), points, reason, awarded_at", "tenant_id+student_id; tenant_id+student_id+course_id"],
        ["gamification_badge", "_id, tenant_id, name, slug, description, icon_url, criteria{type, threshold}, is_auto_award", "tenant_id+slug (unique)"],
        ["gamification_student_badge", "_id, tenant_id, student_id, badge_id, awarded_at", "tenant_id+student_id+badge_id (unique)"],
        ["gamification_leaderboard", "_id, tenant_id, scope (course/tenant), scope_id, period (all_time/monthly), entries[] = {student_id, points, rank}", "tenant_id+scope+scope_id+period (unique); rebuilt weekly"],
        ["notification", "_id, tenant_id, user_id, type, title, body, payload{}, read_at, created_at", "tenant_id+user_id+created_at; tenant_id+user_id+read_at"],
        ["notification_preference", "_id, tenant_id, user_id, channels = {email, push, in_app}, event_subscriptions{}", "tenant_id+user_id (unique)"],
        ["device_session", "_id, tenant_id, user_id, device_fingerprint, user_agent, ip, last_seen_at, is_revoked", "tenant_id+user_id; tenant_id+user_id+device_fingerprint (unique)"],
        ["ai_generation_job", "_id, tenant_id, user_id, prompt, target_type (course_outline/lesson_content/quiz/questions), target_id, status (pending/running/succeeded/failed), result{}, tokens_used, llm_model, created_at", "tenant_id+status+created_at; tenant_id+user_id"],
        ["coming_soon_page", "_id, tenant_id, course_id, email_capture[], launch_at, description", "tenant_id+course_id (unique)"],
    ], [25, 75, 32]))
    story.append(PageBreak())

    # ============ Chapter 6: Backend module architecture ============
    story.append(h1("6. Backend Module Architecture (Go)"))
    story.append(p(
        "Each LMS module lives under <font face='FreeMono'>backend/internal/lms/&lt;module&gt;/</font> and follows lastsaas's existing five-file pattern: <font face='FreeMono'>handlers.go</font> (HTTP), <font face='FreeMono'>service.go</font> (business logic), <font face='FreeMono'>repository.go</font> (MongoDB access), <font face='FreeMono'>models.go</font> (struct definitions + BSON tags), <font face='FreeMono'>hooks.go</font> (event subscriptions). Routes are registered in <font face='FreeMono'>cmd/server/main.go</font> under a new <font face='FreeMono'>/api/v1/lms</font> subrouter that gets the standard tenant+auth middleware applied. The example below shows the skeleton for the course module; every other module follows the same shape."
    ))

    story.append(h2("6.1 Folder structure"))
    story.append(mono(
        "backend/internal/lms/\n"
        "├── course/         # Course CRUD, publish, curriculum\n"
        "│   ├── handlers.go\n"
        "│   ├── service.go\n"
        "│   ├── repository.go\n"
        "│   ├── models.go\n"
        "│   └── hooks.go    # subscribes to course.published → emits course.enrollment_opened\n"
        "├── lesson/         # Lessons, topics, attachments\n"
        "├── quiz/           # Quizzes, questions, attempts, grading\n"
        "├── assignment/     # Assignments, submissions, grading\n"
        "├── enrollment/     # Enrollments, progress tracking\n"
        "├── ecommerce/      # Cart, checkout, orders, coupons, invoices\n"
        "├── subscription/   # Plans, subscriptions, dunning\n"
        "├── certificate/    # Templates, issuance, verification\n"
        "├── instructor/     # Applications, revenue share, payouts\n"
        "├── drip/           # Drip rules, scheduler\n"
        "├── gamification/   # Points, badges, leaderboards\n"
        "├── report/         # Aggregated analytics\n"
        "├── notification/   # In-app, email, push\n"
        "├── media/          # Video upload, signed playback, thumbnails\n"
        "├── ai/             # TutorAI generation jobs\n"
        "└── shared/         # Shared types, enums, error codes\n"
    ))

    story.append(h2("6.2 Course module skeleton"))
    story.append(mono(
        "// backend/internal/lms/course/models.go\n"
        "package course\n"
        "\n"
        "type Course struct {\n"
        "    ID            primitive.ObjectID `bson:\"_id\"`\n"
        "    TenantID      primitive.ObjectID `bson:\"tenant_id\"`\n"
        "    Title         string             `bson:\"title\"`\n"
        "    Slug          string             `bson:\"slug\"`\n"
        "    Description   string             `bson:\"description\"`\n"
        "    Status        string             `bson:\"status\"` // draft|pending|publish|private|future|trash\n"
        "    Level         string             `bson:\"level\"`\n"
        "    Price         money.Money        `bson:\"price\"`\n"
        "    CategoryID    *primitive.ObjectID `bson:\"category_id\"`\n"
        "    Tags          []string           `bson:\"tags\"`\n"
        "    ThumbnailURL  string             `bson:\"thumbnail_url\"`\n"
        "    Benefits      []string           `bson:\"benefits\"`\n"
        "    Requirements  []string           `bson:\"requirements\"`\n"
        "    CompletionMode string            `bson:\"completion_mode\"` // flexible|strict\n"
        "    CreatedBy     primitive.ObjectID `bson:\"created_by\"`\n"
        "    PublishedAt   *time.Time         `bson:\"published_at\"`\n"
        "    CreatedAt     time.Time          `bson:\"created_at\"`\n"
        "    UpdatedAt     time.Time          `bson:\"updated_at\"`\n"
        "}\n"
    ))

    story.append(mono(
        "// backend/internal/lms/course/handlers.go (excerpt)\n"
        "func (h *Handler) Register(r *mux.Router) {\n"
        "    r.HandleFunc(\"/courses\", h.List).Methods(\"GET\")\n"
        "    r.HandleFunc(\"/courses\", h.Create).Methods(\"POST\")\n"
        "    r.HandleFunc(\"/courses/{id}\", h.Get).Methods(\"GET\")\n"
        "    r.HandleFunc(\"/courses/{id}\", h.Update).Methods(\"PATCH\")\n"
        "    r.HandleFunc(\"/courses/{id}/publish\", h.Publish).Methods(\"POST\")\n"
        "    r.HandleFunc(\"/courses/{id}/curriculum\", h.GetCurriculum).Methods(\"GET\")\n"
        "    r.HandleFunc(\"/courses/{id}/curriculum\", h.SaveCurriculum).Methods(\"PUT\")\n"
        "}\n"
        "\n"
        "func (h *Handler) Publish(w http.ResponseWriter, r *http.Request) {\n"
        "    ctx := r.Context()\n"
        "    courseID := chiutil.PathID(r, \"id\")\n"
        "    course, err := h.svc.Publish(ctx, courseID)\n"
        "    if err != nil { writeErr(w, err); return }\n"
        "    h.events.Emit(ctx, \"course.published\", map[string]any{\n"
        "        \"course_id\": courseID, \"tenant_id\": course.TenantID,\n"
        "    })\n"
        "    writeJSON(w, course)\n"
        "}\n"
    ))

    story.append(h2("6.3 Route wiring in main.go"))
    story.append(p(
        "All LMS routes are mounted under <font face='FreeMono'>/api/v1/lms</font>. The subrouter inherits tenant extraction, JWT auth, and audit logging from the parent. Per-route entitlement gating is applied via <font face='FreeMono'>middleware.RequireEntitlement</font>."
    ))
    story.append(mono(
        "// cmd/server/main.go (excerpt, added near line ~600)\n"
        "lmsRouter := apiRouter.PathPrefix(\"/lms\").Subrouter()\n"
        "lmsRouter.Use(middleware.RequireAuth)\n"
        "lmsRouter.Use(middleware.RequireTenant)\n"
        "\n"
        "// Public student-facing (entitlement-free)\n"
        "course.NewHandler(svc, events).Register(lmsRouter) // GET /courses is public within tenant\n"
        "\n"
        "// Instructor-only\n"
        "instructorOnly := lmsRouter.PathPrefix(\"/instructor\").Subrouter()\n"
        "instructorOnly.Use(middleware.RequireRole(\"instructor\", \"admin\", \"owner\"))\n"
        "course.NewInstructorHandler(svc).Register(instructorOnly)\n"
        "\n"
        "// Admin-only\n"
        "adminOnly := lmsRouter.PathPrefix(\"/admin\").Subrouter()\n"
        "adminOnly.Use(middleware.RequireRole(\"admin\", \"owner\"))\n"
        "report.NewHandler(svc).Register(adminOnly)\n"
        "\n"
        "// Entitlement-gated\n"
        "certRouter := lmsRouter.PathPrefix(\"/certificates\").Subrouter()\n"
        "certRouter.Use(middleware.RequireEntitlement(db, \"lms.certificates\"))\n"
        "certificate.NewHandler(svc).Register(certRouter)\n"
    ))
    story.append(PageBreak())

    # ============ Chapter 7: API surface ============
    story.append(h1("7. API Surface Design"))
    story.append(p(
        "The LMS REST surface adds roughly 85 endpoints to lastsaas's existing API. All paths are prefixed with <font face='FreeMono'>/api/v1/lms</font>. The tables below group endpoints by resource and annotate each with its access tier (P = public within tenant, S = student, I = instructor, A = admin/owner, W = webhook)."
    ))

    story.append(h2("7.1 Courses and curriculum"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["GET", "/courses", "List published courses (filter by category, tag, level, price, search, sort)", "P"],
        ["GET", "/courses/{slug}", "Get course detail by slug (curriculum tree, instructors, reviews, price, plans)", "P"],
        ["POST", "/instructor/courses", "Create course (draft)", "I"],
        ["GET", "/instructor/courses", "List instructor's own courses (any status)", "I"],
        ["PATCH", "/instructor/courses/{id}", "Update course fields", "I"],
        ["POST", "/instructor/courses/{id}/publish", "Publish (or schedule)", "I"],
        ["POST", "/instructor/courses/{id}/duplicate", "Clone course within tenant", "I"],
        ["DELETE", "/instructor/courses/{id}", "Soft delete (status=trash)", "I"],
        ["GET", "/instructor/courses/{id}/curriculum", "Get topics + lessons + quizzes as nested tree", "I"],
        ["PUT", "/instructor/courses/{id}/curriculum", "Bulk save curriculum tree (reorder, add, delete)", "I"],
        ["POST", "/instructor/courses/{id}/topics", "Add topic", "I"],
        ["PATCH", "/instructor/courses/{id}/topics/{tid}", "Update topic", "I"],
        ["POST", "/instructor/courses/{id}/topics/{tid}/lessons", "Add lesson to topic", "I"],
        ["PATCH", "/instructor/lessons/{lid}", "Update lesson", "I"],
        ["POST", "/instructor/lessons/{lid}/video/upload-url", "Get presigned upload URL (Bunny)", "I"],
        ["POST", "/instructor/lessons/{lid}/video/confirm", "Confirm upload, trigger transcode", "I"],
    ], [10, 50, 55, 10]))
    story.append(spacer(4))

    story.append(h2("7.2 Quizzes, assignments, attempts"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["POST", "/instructor/quizzes", "Create quiz", "I"],
        ["PATCH", "/instructor/quizzes/{id}", "Update quiz (settings + questions[] embedded)", "I"],
        ["POST", "/instructor/quizzes/{id}/questions", "Add question", "I"],
        ["POST", "/instructor/quizzes/{id}/import", "Import questions JSON (Pro)", "I"],
        ["GET", "/instructor/quizzes/{id}/attempts", "List attempts for this quiz", "I"],
        ["POST", "/instructor/quiz-attempts/{id}/review", "Submit instructor review for open-ended questions", "I"],
        ["POST", "/student/quizzes/{id}/attempt", "Start new attempt", "S"],
        ["GET", "/student/quiz-attempts/{id}", "Get attempt with questions", "S"],
        ["POST", "/student/quiz-attempts/{id}/answer", "Submit answer to one question", "S"],
        ["POST", "/student/quiz-attempts/{id}/submit", "End attempt, compute score", "S"],
        ["POST", "/instructor/assignments", "Create assignment", "I"],
        ["POST", "/student/assignments/{id}/submit", "Submit assignment (files + text)", "S"],
        ["POST", "/instructor/assignment-submissions/{id}/evaluate", "Grade + feedback", "I"],
    ], [10, 60, 55, 10]))
    story.append(spacer(4))

    story.append(h2("7.3 Enrollment and progress"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["GET", "/student/enrollments", "List my enrollments", "S"],
        ["POST", "/student/courses/{id}/enroll", "Enroll in free course or after-checkout", "S"],
        ["GET", "/student/courses/{id}/progress", "Get my progress (lesson completion map)", "S"],
        ["POST", "/student/lessons/{id}/complete", "Mark lesson complete (server validates)", "S"],
        ["POST", "/student/lessons/{id}/progress", "Heartbeat video position", "S"],
        ["POST", "/instructor/courses/{id}/enrollments", "Bulk enroll students", "I"],
        ["DELETE", "/instructor/enrollments/{id}", "Cancel enrollment (admin action)", "I"],
        ["POST", "/instructor/enrollments/{id}/reset-progress", "Reset student progress", "I"],
        ["GET", "/student/wishlist", "List my wishlist", "S"],
        ["POST", "/student/wishlist/{courseId}", "Add to wishlist", "S"],
        ["DELETE", "/student/wishlist/{courseId}", "Remove from wishlist", "S"],
        ["POST", "/student/lessons/{id}/notes", "Save lesson note", "S"],
        ["GET", "/student/lessons/{id}/notes", "Get my notes for lesson", "S"],
    ], [10, 60, 55, 10]))
    story.append(spacer(4))

    story.append(h2("7.4 Ecommerce"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["GET", "/cart", "Get my cart", "S/P"],
        ["POST", "/cart/items", "Add course or bundle or plan to cart", "S/P"],
        ["PATCH", "/cart/items/{id}", "Update quantity / remove", "S"],
        ["POST", "/cart/apply-coupon", "Apply coupon code", "S"],
        ["DELETE", "/cart/coupon", "Remove coupon", "S"],
        ["POST", "/checkout", "Create Stripe Checkout session", "S/P"],
        ["POST", "/webhooks/stripe", "Stripe webhook (idempotent)", "W"],
        ["GET", "/student/orders", "List my orders", "S"],
        ["GET", "/student/orders/{id}/invoice", "Download invoice PDF", "S"],
        ["POST", "/instructor/coupons", "Create coupon", "I"],
        ["GET", "/instructor/coupons", "List coupons", "I"],
        ["GET", "/instructor/orders", "List orders for instructor's courses", "I"],
        ["POST", "/instructor/withdrawals", "Request withdrawal", "I"],
        ["GET", "/admin/orders", "All orders in tenant", "A"],
        ["POST", "/admin/orders/{id}/refund", "Issue refund (partial or full)", "A"],
        ["GET", "/admin/revenue-ledger", "Revenue ledger (filter by instructor, course, date)", "A"],
    ], [10, 55, 60, 10]))
    story.append(spacer(4))

    story.append(h2("7.5 Subscriptions and bundles"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["POST", "/instructor/subscription-plans", "Create plan (course/bundle/category/full_site)", "I"],
        ["GET", "/instructor/subscription-plans", "List plans", "I"],
        ["PATCH", "/instructor/subscription-plans/{id}", "Update plan", "I"],
        ["GET", "/student/subscriptions", "List my active + history", "S"],
        ["POST", "/student/subscriptions/{id}/cancel", "Cancel (effective at period end or immediately)", "S"],
        ["POST", "/student/subscriptions/{id}/resume", "Resume a cancelled-but-not-expired sub", "S"],
        ["POST", "/instructor/bundles", "Create bundle", "I"],
        ["PATCH", "/instructor/bundles/{id}", "Update bundle", "I"],
        ["GET", "/admin/subscriptions", "All subscriptions in tenant", "A"],
    ], [10, 60, 55, 10]))
    story.append(spacer(4))

    story.append(h2("7.6 Certificates, instructors, drip"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["GET", "/instructor/certificate-templates", "List templates", "I"],
        ["POST", "/instructor/certificate-templates", "Create template (HTML+CSS)", "I"],
        ["POST", "/instructor/courses/{id}/certificate/issue", "Manually issue (auto-issue happens on completion)", "I"],
        ["GET", "/student/certificates", "List my certificates", "S"],
        ["GET", "/student/certificates/{id}/download", "Download PDF", "S"],
        ["GET", "/certificates/verify/{hash}", "Public verification page", "P"],
        ["POST", "/instructor/apply", "Student applies to become instructor", "S"],
        ["GET", "/admin/instructor-applications", "List pending applications", "A"],
        ["POST", "/admin/instructor-applications/{id}/approve", "Approve", "A"],
        ["POST", "/instructor/courses/{id}/instructors", "Add co-instructor with revenue_share_percent", "I"],
        ["PATCH", "/instructor/course-instructors/{id}", "Update revenue share", "I"],
        ["POST", "/instructor/courses/{id}/drip-rules", "Create drip rule for lesson", "I"],
        ["GET", "/student/lessons/{id}/drip-status", "Get unlock status + countdown", "S"],
    ], [10, 60, 55, 10]))
    story.append(spacer(4))

    story.append(h2("7.7 Reports, gamification, notifications, AI"))
    story.append(make_table([
        ["Method", "Path", "Purpose", "Access"],
        ["GET", "/admin/reports/overview", "KPIs: revenue, enrollments, active students, completion rate", "A"],
        ["GET", "/admin/reports/sales", "Sales by day/week/month, by course, by coupon", "A"],
        ["GET", "/admin/reports/enrollments", "Enrollment trends", "A"],
        ["GET", "/admin/reports/completion", "Completion funnel per course", "A"],
        ["GET", "/instructor/reports/earnings", "Instructor's own earnings, by period", "I"],
        ["GET", "/instructor/reports/students", "Student progress for instructor's courses", "I"],
        ["GET", "/student/leaderboard/{scope}", "Get leaderboard (course or tenant, period)", "S"],
        ["GET", "/student/badges", "List my badges", "S"],
        ["GET", "/notifications", "List my notifications", "S"],
        ["PATCH", "/notifications/{id}/read", "Mark read", "S"],
        ["POST", "/student/notification-preferences", "Set per-event channel preferences", "S"],
        ["POST", "/instructor/ai/generate-course-outline", "TutorAI: generate course outline from prompt", "I"],
        ["POST", "/instructor/ai/generate-lesson", "Generate lesson content from outline", "I"],
        ["POST", "/instructor/ai/generate-quiz", "Generate quiz from lesson", "I"],
        ["GET", "/instructor/ai/jobs/{id}", "Poll job status", "I"],
    ], [10, 60, 55, 10]))
    story.append(spacer(4))

    story.append(h2("7.8 RBAC matrix (per role)"))
    story.append(make_table([
        ["Capability", "Student", "Instructor", "Admin", "Owner"],
        ["Browse course catalog", "✓", "✓", "✓", "✓"],
        ["Enroll / purchase", "✓", "✓", "✓", "✓"],
        ["Author course", "—", "✓ (own)", "✓", "✓"],
        ["Approve instructors", "—", "—", "✓", "✓"],
        ["Manage tenant billing", "—", "—", "—", "✓"],
        ["Issue refunds", "—", "—", "✓", "✓"],
        ["View all tenant reports", "—", "—", "✓", "✓"],
        ["View own earnings only", "—", "✓", "✓", "✓"],
        ["Configure entitlements per plan", "—", "—", "—", "✓ (via platform super-admin)"],
    ], [38, 16, 16, 16, 16]))
    story.append(PageBreak())

    # ============ Chapter 8: Frontend architecture ============
    story.append(h1("8. Frontend Architecture (React 19 + Vite)"))
    story.append(p(
        "The frontend reuses lastsaas's existing shell — the same auth flow, the same TanStack Query client, the same Tailwind theme, the same <font face='FreeMono'>components/ui/</font> primitives. Three new experience shells are introduced under <font face='FreeMono'>src/pages/</font>: a <b>Public</b> shell for catalog browsing and checkout (unauthenticated-aware), a <b>Student Dashboard</b> shell, and an <b>Instructor Dashboard</b> shell. Admin pages live alongside lastsaas's existing admin section."
    ))

    story.append(h2("8.1 Route map"))
    story.append(mono(
        "frontend/src/pages/\n"
        "├── public/                   # No auth required\n"
        "│   ├── CoursesPage.tsx       # /courses\n"
        "│   ├── CourseDetailPage.tsx  # /courses/:slug\n"
        "│   ├── CheckoutPage.tsx      # /checkout\n"
        "│   ├── CartPage.tsx          # /cart\n"
        "│   ├── InstructorProfilePage.tsx\n"
        "│   └── CertificateVerifyPage.tsx  # /certificates/verify/:hash\n"
        "├── student/                  # Auth required, role=student\n"
        "│   ├── DashboardPage.tsx     # /my\n"
        "│   ├── MyCoursesPage.tsx     # /my/courses\n"
        "│   ├── LearningPage.tsx      # /learn/:courseId/:lessonId  (course player)\n"
        "│   ├── MyOrdersPage.tsx      # /my/orders\n"
        "│   ├── MyCertificatesPage.tsx\n"
        "│   ├── MySubscriptionsPage.tsx\n"
        "│   ├── WishlistPage.tsx\n"
        "│   ├── MyQAPage.tsx\n"
        "│   └── NotificationSettingsPage.tsx\n"
        "├── instructor/               # Auth required, role=instructor\n"
        "│   ├── DashboardPage.tsx     # /instructor\n"
        "│   ├── MyCoursesPage.tsx     # /instructor/courses\n"
        "│   ├── CourseBuilderPage.tsx # /instructor/courses/:id/builder\n"
        "│   ├── StudentsPage.tsx      # /instructor/students\n"
        "│   ├── EarningsPage.tsx      # /instructor/earnings\n"
        "│   ├── WithdrawalsPage.tsx\n"
        "│   ├── QuizzesPage.tsx\n"
        "│   ├── AssignmentsPage.tsx\n"
        "│   └── AiStudioPage.tsx      # /instructor/ai\n"
        "└── admin/                    # Auth required, role=admin/owner\n"
        "    ├── CoursesPage.tsx\n"
        "    ├── InstructorsPage.tsx\n"
        "    ├── StudentsPage.tsx\n"
        "    ├── OrdersPage.tsx\n"
        "    ├── CouponsPage.tsx\n"
        "    ├── ReportsPage.tsx\n"
        "    └── PlansPage.tsx         # Subscription plan management\n"
    ))

    story.append(h2("8.2 Feature folders under src/features/lms/"))
    story.append(make_table([
        ["Feature folder", "Hooks", "Components"],
        ["course", "useCourseQuery, useCoursesQuery, useCreateCourseMutation, usePublishCourseMutation", "CourseCard, CourseGrid, CourseFilterBar, CourseDetailHeader, CurriculumTree"],
        ["lesson", "useLessonQuery, useCompleteLessonMutation, useLessonProgressMutation", "LessonSidebar, LessonContent, LessonAttachments, LessonComments"],
        ["quiz", "useQuizQuery, useStartAttemptMutation, useSubmitAnswerMutation, useEndAttemptMutation", "QuizRenderer (per-question-type renderer registry), QuestionEditor, AttemptSummary, QuizTimer"],
        ["assignment", "useAssignmentQuery, useSubmitAssignmentMutation", "AssignmentUploader, AssignmentGradeCard"],
        ["enrollment", "useEnrollmentsQuery, useCourseProgressQuery", "ProgressRing, ContinueLearningCard"],
        ["ecommerce", "useCartQuery, useAddToCartMutation, useCheckoutMutation, useCouponMutation", "CartDrawer, CheckoutForm, PriceTag, CouponInput, OrderReceipt"],
        ["subscription", "useSubscriptionsQuery, useCancelSubscriptionMutation", "PlanCard, SubscriptionStatus, PlanPicker"],
        ["certificate", "useCertificatesQuery, useDownloadCertificateMutation", "CertificatePreview, CertificateVerify"],
        ["instructor", "useInstructorCoursesQuery, useEarningsQuery", "RevenueShareEditor, InstructorPicker, EarningsChart"],
        ["drip", "useDripStatusQuery", "DripBadge, DripRuleEditor"],
        ["gamification", "useLeaderboardQuery, useMyBadgesQuery", "LeaderboardTable, BadgeWall, PointsDisplay"],
        ["notification", "useNotificationsQuery, useMarkReadMutation", "NotificationBell, NotificationList, PreferenceMatrix"],
        ["media", "useUploadUrlMutation, useConfirmUploadMutation", "VideoPlayer (source adapters: bunny, mux, youtube, vimeo, embed), VideoUploader, ThumbnailPicker"],
        ["ai", "useGenerateCourseMutation, useGenerateLessonMutation, useGenerateQuizMutation, useAiJobPoll", "AiStudioPanel, OutlineEditor, JobProgress"],
        ["builder", "— (composes others)", "CurriculumBuilder (drag-drop tree), LessonTypeSwitcher, QuestionBankPicker"],
    ], [22, 50, 55]))
    story.append(spacer(4))

    story.append(h2("8.3 New shared components needed"))
    story.append(p(
        "Beyond the 8 existing UI primitives in <font face='FreeMono'>src/components/ui/</font>, the LMS surface needs:"
    ))
    story.append(bullets([
        "<b>Tabs</b> — for course-detail sections (Overview / Curriculum / Instructors / Reviews / Q&amp;A) and dashboard sidebar tabs.",
        "<b>Dialog</b> (modal) — for the certificate preview, coupon picker, refund dialog, AI generation preview.",
        "<b>Drawer</b> — for cart preview, filter panel, mobile navigation.",
        "<b>DragDropContext</b> wrapper (recommend @dnd-kit) — for curriculum builder, quiz question reordering, lesson reordering.",
        "<b>RichTextEditor</b> (recommend TipTap) — for course description, lesson content, certificate text, announcements. Output sanitized HTML.",
        "<b>CommandPalette</b> — for instructor / admin quick navigation.",
        "<b>DataGrid</b> — for admin tables (orders, students, enrollments) with sort/filter/pagination/column-visibility.",
        "<b>Chart primitives</b> — for reports. Recommend Recharts (already React 19 compatible). Line/Bar/Area/Pie + a KPI card component.",
    ]))

    story.append(h2("8.4 State management"))
    story.append(p(
        "TanStack Query remains the source of truth for all server state. New query keys are namespaced under <font face='FreeMono'>['lms', &lt;domain&gt;, ...]</font> for predictable invalidation. Two Zustand stores are added:"
    ))
    story.append(bullets([
        "<b>useQuizSessionStore</b> — holds the in-progress attempt: current question index, drafted answers, time remaining, paused state. Synced to localStorage for resilience against refresh; cleared on submit.",
        "<b>usePlayerStore</b> — holds the current video position, playback rate, fullscreen state, watermark overlay position. Not persisted.",
    ]))
    story.append(PageBreak())

    # ============ Chapter 9: Cross-cutting concerns ============
    story.append(h1("9. Cross-Cutting Concerns"))

    story.append(h2("9.1 Multi-tenancy isolation"))
    story.append(p(
        "Every new LMS collection carries <font face='FreeMono'>tenant_id</font> as the first field after <font face='FreeMono'>_id</font> and is indexed on a compound of <font face='FreeMono'>tenant_id</font> plus the primary query field. The existing <font face='FreeMono'>middleware.RequireTenant</font> middleware extracts <font face='FreeMono'>tenant_id</font> from the JWT or API key and injects it into the request context. Every repository method accepts the context and filters by <font face='FreeMono'>tenant_id</font>. A code audit pass in Phase 0 verifies no LMS query bypasses the tenant filter."
    ))

    story.append(h2("9.2 RBAC role extension"))
    story.append(p(
        "lastsaas ships three roles: <font face='FreeMono'>owner</font>, <font face='FreeMono'>admin</font>, <font face='FreeMono'>user</font>. We extend with two LMS-specific roles that are scoped to a tenant membership:"
    ))
    story.append(make_table([
        ["Role", "Holds", "Can do"],
        ["instructor", "Any tenant member who passed instructor application review", "All student capabilities + author own courses + view own earnings + manage own co-instructors"],
        ["student", "Any tenant member (default role at signup)", "Browse catalog, enroll, take lessons, attempt quizzes, submit assignments, earn certificates, leave reviews, Q&A"],
    ], [20, 35, 60]))
    story.append(p(
        "A user can be both student and instructor in the same tenant — the instructor role is additive. The role enum is extended in <font face='FreeMono'>internal/rbac/roles.go</font>; the <font face='FreeMono'>middleware.RequireRole</font> helper already accepts a variadic list, so no middleware change is needed."
    ))

    story.append(h2("9.3 Entitlement gating"))
    story.append(p(
        "Each Pro feature is gated by a single entitlement key. lastsaas's <font face='FreeMono'>Plan.entitlements</font> map is a <font face='FreeMono'>map[string]bool</font> in the <font face='FreeMono'>plans</font> collection. We seed three new plans during Phase 0 hardening:"
    ))
    story.append(make_table([
        ["Entitlement key", "Free tier", "Pro tier", "Business tier"],
        ["lms.core", "✓", "✓", "✓"],
        ["lms.quizzes", "✓ (10 question types)", "✓ (all 14)", "✓ (all 14)"],
        ["lms.certificates", "—", "✓", "✓"],
        ["lms.multi_instructor", "—", "✓", "✓"],
        ["lms.content_drip", "—", "✓", "✓"],
        ["lms.subscriptions", "—", "✓ (5 plans)", "✓ (unlimited)"],
        ["lms.gamification", "—", "✓", "✓"],
        ["lms.reports", "—", "basic", "✓ advanced + export"],
        ["lms.tutorai", "—", "100 generations/mo", "1000 generations/mo"],
        ["lms.zoom", "—", "add-on", "add-on"],
        ["lms.notifications", "in-app + email", "+ push", "+ push"],
        ["lms.course_preview", "—", "✓", "✓"],
        ["lms.attachments", "—", "✓", "✓"],
        ["lms.lesson_notes", "—", "✓", "✓"],
        ["lms.custom_emails", "—", "✓", "✓"],
        ["lms.course_duplicate", "—", "✓", "✓"],
        ["lms.gift_course", "—", "✓", "✓"],
    ], [40, 20, 20, 22]))
    story.append(p(
        "Entitlement checks happen at two layers: the route-level middleware (coarse-grained — returns 402 if the tenant's plan lacks the entitlement) and the service-level check (fine-grained — e.g. <font face='FreeMono'>if !plan.lmsTutorAI { return ErrQuotaExceeded }</font> at the moment of AI generation)."
    ))

    story.append(h2("9.4 Event catalog (new event types)"))
    story.append(make_table([
        ["Event", "Emitted by", "Consumers"],
        ["course.published", "course service", "notification, search indexer, webhook"],
        ["course.unpublished", "course service", "search indexer, webhook"],
        ["lesson.completed", "enrollment service", "gamification (award points), drip (unlock next), notification, certificate-issuance check"],
        ["quiz.attempt.started", "quiz service", "notification"],
        ["quiz.attempt.ended", "quiz service", "gamification, notification, certificate-issuance check"],
        ["assignment.submitted", "assignment service", "notification (instructor)"],
        ["assignment.evaluated", "assignment service", "notification (student)"],
        ["enrollment.created", "enrollment service", "notification, gamification, webhook"],
        ["enrollment.completed", "enrollment service", "gamification, certificate.issued (if eligible)"],
        ["enrollment.expired", "subscription/drip scheduler", "notification"],
        ["certificate.issued", "certificate service", "notification, webhook"],
        ["coupon.redeemed", "ecommerce service", "coupon usage counter"],
        ["order.paid", "ecommerce service (Stripe webhook)", "enrollment creation, revenue ledger entries"],
        ["order.refunded", "ecommerce service", "revenue ledger reversal, enrollment cancellation"],
        ["subscription.activated", "subscription service", "enrollment creation/maintenance"],
        ["subscription.renewed", "Stripe webhook", "enrollment extension"],
        ["subscription.cancelled", "subscription service", "enrollment expiry scheduling"],
        ["subscription.payment_failed", "Stripe webhook", "dunning email sequence"],
        ["instructor.application.submitted", "instructor service", "notification (admins)"],
        ["instructor.application.approved", "instructor service", "notification (instructor), RBAC role grant"],
        ["withdrawal.requested", "instructor service", "notification (admins)"],
        ["withdrawal.paid", "instructor service", "notification (instructor)"],
        ["drip.unlocked", "drip scheduler", "notification (student)"],
        ["ai.generation.completed", "ai service", "notification (instructor)"],
        ["review.posted", "enrollment service", "notification (instructor)"],
        ["qna.question.asked", "qna service", "notification (instructor + enrolled students)"],
        ["qna.answer.posted", "qna service", "notification (question author)"],
        ["announcement.posted", "announcement service", "notification (enrolled students), email"],
    ], [38, 30, 40]))
    story.append(PageBreak())

    # ============ Chapter 10: Video pipeline ============
    story.append(h1("10. Video and Media Pipeline"))
    story.append(p(
        "Video is the highest-stakes infrastructure decision in the project. Three providers are realistic candidates: <b>Bunny Stream</b> (cheapest, generous encoding, token-auth DRM), <b>Mux</b> (best DX, AI chaptering, higher per-minute cost), and <b>Self-hosted S3 + HLS</b> (most control, most ops burden). The recommendation is Bunny Stream for the SaaS launch — its token-auth signing covers 80% of the DRM-lite requirement at $0.005 per minute streamed with no minimums, and the API is small enough that the adapter is ~200 lines of Go."
    ))

    story.append(h2("10.1 Decision matrix"))
    story.append(make_table([
        ["Factor", "Bunny Stream", "Mux", "Self-hosted S3+HLS"],
        ["Per-minute streaming cost", "$0.005", "$0.007–$0.014", "S3 egress (~$0.09/GB)"],
        ["Encoding cost", "Included", "$0.02–$0.05/minute", "Self-managed (FFmpeg)"],
        ["Token-auth signed URLs", "✓ native", "✓ signed playback URLs", "DIY"],
        ["Adaptive bitrate (ABR)", "✓ auto", "✓ auto (best in class)", "Manual renditions"],
        ["Upload flow", "Direct to Bunny via presigned URL", "Direct upload via Mux", "Presigned S3 + transcoder"],
        ["Thumbnails", "✓ auto-generated", "✓ auto + AI chaptering", "FFmpeg snippet"],
        ["Watermarking", "URL-based overlay", "Burn-in or overlay", "FFmpeg overlay"],
        ["Time-to-first-frame", "Good", "Excellent", "Depends on CDN"],
        ["Lock-in risk", "Low (video files are MP4 + HLS)", "Medium", "None"],
        ["Verdict", "**Recommended**", "Better DX, 2-3x cost", "Only for cost-obsessed"],
    ], [25, 22, 22, 26]))
    story.append(spacer(4))

    story.append(h2("10.2 Upload and playback flow"))
    story.append(p(
        "The upload pipeline is a four-step dance that keeps large video bytes off the lastsaas process entirely:"
    ))
    story.append(numbered([
        "<b>Frontend requests an upload URL.</b> Instructor selects a video file in the lesson editor. The frontend POSTs to <font face='FreeMono'>/api/v1/lms/instructor/lessons/{id}/video/upload-url</font> with the file size and MIME type. The backend validates the instructor owns the lesson, checks the tenant's per-tenant upload budget, and calls Bunny's API to create a video entity + generate a presigned upload URL (TTL: 1 hour).",
        "<b>Frontend PUTs the file directly to Bunny.</b> The file bytes never touch the lastsaas process. Upload progress is reported by the browser's <font face='FreeMono'>XMLHttpRequest</font>.",
        "<b>Frontend confirms upload.</b> POST to <font face='FreeMono'>/api/v1/lms/instructor/lessons/{id}/video/confirm</font> with the Bunny video ID. The backend polls Bunny until the transcode is complete (typically 30-90 seconds for a 1-hour 1080p video), fetches the thumbnail URLs, and writes the <font face='FreeMono'>lesson.video</font> subdocument.",
        "<b>Student playback uses a signed URL.</b> When a student opens the lesson, the backend signs a Bunny playback URL with a 5-minute TTL + the student's user ID as the watermark token. The frontend <font face='FreeMono'>&lt;VideoPlayer&gt;</font> component renders a thin wrapper over Bunny's embed or HLS.js player with the watermark overlay (student email) drawn on a canvas."
    ]))

    story.append(h2("10.3 Content security (Pro)"))
    story.append(p(
        "True DRM (Widevine, FairPlay) is out of scope for the SaaS launch — it requires certificate authorities, native apps, and per-platform SDKs. The Pro-tier content security features are the best-effort alternatives that Tutor LMS Pro itself ships:"
    ))
    story.append(bullets([
        "<b>Signed playback URLs</b> with 5-minute TTL — prevents naive link sharing.",
        "<b>Dynamic watermark</b> — student email rendered as a semi-transparent overlay that drifts position every 15 seconds, deterring screen-recording redistribution.",
        "<b>Domain-locked embeds</b> — Bunny's <font face='FreeMono'>allowed_referrers</font> configured per tenant to the tenant's custom domain.",
        "<b>Right-click + keyboard-shortcut suppression</b> on the player container (frontend; advisory only).",
        "<b>Device fingerprinting + concurrent-session cap</b> — Pro feature. Browser fingerprint stored in <font face='FreeMono'>device_session</font> collection; max N concurrent active sessions per student (default 3).",
        "<b>IP geo-fencing</b> — optional per-course blocklist of countries (uses Cloudflare headers)."
    ]))

    story.append(h2("10.4 Object storage abstraction"))
    story.append(p(
        "Beyond video, several features need general object storage: certificate PDFs, assignment submissions, course attachments, instructor signatures. We add a thin Go abstraction in <font face='FreeMono'>internal/storage/</font> with two implementations: <font face='FreeMono'>S3Storage</font> (for AWS S3 / Cloudflare R2 / MinIO via the S3 API) and <font face='FreeMono'>BunnyStorage</font> (for video assets). The interface:"
    ))
    story.append(mono(
        "type Storage interface {\n"
        "    Put(ctx context.Context, key string, r io.Reader, contentType string) (url string, err error)\n"
        "    Get(ctx context.Context, key string) (io.ReadCloser, error)\n"
        "    Delete(ctx context.Context, key string) error\n"
        "    SignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)\n"
        "}\n"
    ))
    story.append(PageBreak())

    # ============ Chapter 11: Roadmap ============
    story.append(h1("11. Phased 6-Month Roadmap"))
    story.append(p(
        "Five phases, twenty-four weeks. Each phase has explicit exit criteria — no phase exits until its criteria are demonstrably met in a staging demo. Weeks are calendar weeks, not working weeks; assume a four-day working week per engineer. Team composition assumed: two backend engineers, two frontend engineers, one designer (part-time), one tech lead (you). Phase 0 work overlaps with hiring and onboarding."
    ))

    story.append(h2("11.1 Phase overview"))
    story.append(make_table([
        ["Phase", "Weeks", "Theme", "Headline deliverable"],
        ["0", "0 (parallel)", "Foundation hardening", "Object storage, scheduled jobs, RBAC roles, entitlement seeds, migration runner"],
        ["1", "1–6", "Core LMS", "Course catalog + curriculum builder + lesson player + student enrollment + progress tracking — demoable course sale + take"],
        ["2", "7–12", "Ecommerce", "Cart + checkout + Stripe + coupons + invoices + instructor earnings + withdrawal flow"],
        ["3", "13–16", "Pro authoring", "Assignments + certificates (12 templates) + content drip + multi-instructor + revenue share"],
        ["4", "17–20", "Pro engagement", "Gamification + Q&A + announcements + lesson notes + notifications (push) + course preview + course attachments"],
        ["5", "21–24", "Reports + AI + launch", "Sales/enrollment/completion reports + instructor analytics + TutorAI course/quiz generation + load test + launch hardening"],
    ], [10, 12, 25, 60]))
    story.append(spacer(4))

    story.append(h2("11.2 Phase 0 — Foundation hardening (Week 0, parallel)"))
    story.append(p(
        "Phase 0 is the only phase that modifies lastsaas's existing primitives. It runs in parallel with hiring and onboarding. By the end of Week 0, the team can write a new LMS module that uses object storage, scheduled jobs, the new RBAC roles, and the new entitlement keys without modifying any lastsaas core file."
    ))
    story.append(h3("Scope"))
    story.append(bullets([
        "Add <font face='FreeMono'>internal/storage/</font> with S3 + Bunny implementations; inject via dependency injection in cmd/server/main.go.",
        "Add <font face='FreeMono'>internal/jobs/</font> — a river-style job runner backed by MongoDB. Collections: <font face='FreeMono'>jobs</font> (pending + retry_count + run_after), <font face='FreeMono'>job_runs</font> (history). One worker goroutine per job type; leases prevent double-execution. Job types: <font face='FreeMono'>drip.unlock_check</font>, <font face='FreeMono'>subscription.dunning</font>, <font face='FreeMono'>certificate.reissue</font>, <font face='FreeMono'>ai.generate_course</font>, <font face='FreeMono'>report.aggregate_daily</font>.",
        "Add <font face='FreeMono'>instructor</font> and <font face='FreeMono'>student</font> to RBAC role enum. Update tenant_memberships to support role list. Update middleware.RequireRole to accept both.",
        "Seed new entitlement keys into the three new plan documents (Free / Pro / Business) in <font face='FreeMono'>plans</font> collection.",
        "Add <font face='FreeMono'>internal/migrations/</font> — a tiny migration runner. Each migration is a Go file implementing <font face='FreeMono'>Up(ctx, db)</font>; tracked by a <font face='FreeMono'>_migrations</font> collection.",
        "Add MongoDB schema validators for all new collections (Phase 1 onward).",
        "Add <font face='FreeMono'>internal/lms/shared/</font> package with shared types, error codes, and helpers.",
    ]))
    story.append(h3("Exit criteria"))
    story.append(bullets([
        "An engineer can run <font face='FreeMono'>make dev</font> and exercise a stub LMS endpoint that uses storage, jobs, and entitlement middleware.",
        "An end-to-end test creates a tenant, signs up a student, promotes them to instructor, and verifies role checks.",
        "Migration runner successfully applies a no-op migration and records it in <font face='FreeMono'>_migrations</font>.",
    ]))

    story.append(h2("11.3 Phase 1 — Core LMS (Weeks 1–6)"))
    story.append(p(
        "By the end of Phase 1, a student can browse a catalog, view a course detail page, enroll for free or via a stub checkout, watch a video lesson, mark it complete, and see their progress. An instructor can create a course with topics, lessons, and quizzes; publish it; and see enrollments. This is the minimum that proves the architecture works end-to-end."
    ))
    story.append(h3("Week-by-week"))
    story.append(make_table([
        ["Week", "Backend deliverables", "Frontend deliverables"],
        ["1", "Course + Topic + Lesson models, CRUD endpoints, category/tag taxonomies, slug generation", "CourseCard component, CoursesPage (catalog), basic CourseDetailPage"],
        ["2", "Curriculum tree endpoints (GET/PUT), drag-drop reorder support, lesson type detection", "CurriculumBuilder component (dnd-kit), LessonTypeSwitcher"],
        ["3", "Enrollment model, create/list/progress endpoints, lesson_progress tracking", "MyCoursesPage, LearningPage skeleton (sidebar + content area)"],
        ["4", "Video upload-url + confirm endpoints (Bunny adapter), signed playback URL endpoint", "<VideoPlayer> component (Bunny embed + watermark overlay), VideoUploader"],
        ["5", "Quiz model, attempts, answer submission, scoring for auto-graded question types (10 free types)", "QuizRenderer with per-type renderers (8 free types — fill_in_blank + matching deferred), QuizTimer"],
        ["6", "Course review + rating aggregation, Q&A foundation, polish, bug bash", "Reviews tab, Ask Question form, integration tests pass"],
    ], [10, 65, 60]))
    story.append(h3("Exit criteria"))
    story.append(bullets([
        "End-to-end test: instructor creates a course with 2 topics, 5 lessons (3 video, 1 text, 1 quiz with 5 single-choice questions), publishes, student enrolls, completes all lessons, passes the quiz, sees 100% progress.",
        "Catalog page loads in < 200ms p95 with 100 published courses.",
        "Lesson video plays with watermark overlay; right-click is suppressed; signed URL expires correctly.",
    ]))

    story.append(h2("11.4 Phase 2 — Ecommerce (Weeks 7–12)"))
    story.append(p(
        "Phase 2 turns the LMS into a business. By the end of the phase, a student can add courses to a cart, apply a coupon, check out via Stripe (one-time or recurring subscription plan), receive an invoice, and the instructor sees their share of revenue in a ledger. The platform operator can issue refunds; revenue reversals flow back through the ledger."
    ))
    story.append(h3("Week-by-week"))
    story.append(make_table([
        ["Week", "Backend deliverables", "Frontend deliverables"],
        ["7", "Cart model + endpoints, coupon model + validation, order model + order_items + order_activities", "CartDrawer, CartPage, CouponInput, CheckoutForm (billing fields)"],
        ["8", "Stripe Checkout integration (reuse stripe.Service), line-item shape for course / bundle / plan, success/cancel URL routing", "CheckoutPage end-to-end, OrderReceipt component, redirect handling"],
        ["9", "Stripe webhook handler (idempotent), order.paid event, enrollment creation on payment, revenue_ledger entries", "MyOrdersPage, invoice download (existing gofpdf)"],
        ["10", "Subscription plan CRUD, subscription creation on recurring checkout, subscription.activated event, enrollment extension", "PlanCard, PlanPicker, MySubscriptionsPage, cancel/resume flows"],
        ["11", "Instructor earnings report (own courses), revenue share computation on order.paid, withdrawal request + admin approval flow", "EarningsPage with chart, WithdrawalsPage, admin OrdersPage + refund dialog"],
        ["12", "Coupon redemption counters, expired coupon handling, tax integration (Stripe Tax recommended), polish, bug bash", "Admin CouponsPage, coupon usage stats, end-to-end checkout tests with Stripe test mode"],
    ], [10, 65, 60]))
    story.append(h3("Exit criteria"))
    story.append(bullets([
        "End-to-end Stripe test-mode checkout: add course → apply coupon → pay → enrollment created → revenue ledger shows instructor share → refund → ledger reversed → enrollment cancelled.",
        "Subscription lifecycle: subscribe → renew (Stripe test trigger) → cancel → dunning email → expire.",
        "Instructor can request withdrawal; admin can approve; ledger shows payout as a debit.",
        "Invoice PDF download works with correct tax line items.",
    ]))

    story.append(h2("11.5 Phase 3 — Pro authoring (Weeks 13–16)"))
    story.append(p(
        "Phase 3 unlocks the Pro entitlement gates. This is the phase that converts free-tier tenants to paid tiers."
    ))
    story.append(h3("Week-by-week"))
    story.append(make_table([
        ["Week", "Backend deliverables", "Frontend deliverables"],
        ["13", "Assignment model, submission upload (storage abstraction), instructor grading, assignment.evaluated event", "AssignmentUploader (drag-drop + progress), AssignmentGradeCard"],
        ["14", "Certificate template model (HTML+CSS), Playwright-based PDF rendering service, certificate issuance on enrollment.completed, verification_hash, public verification endpoint", "CertificatePreview (live HTML render), CertificateVerifyPage (public)"],
        ["15", "Drip rule model, drip.unlock_check job, drip.unlocked event, /student/lessons/{id}/drip-status endpoint", "DripRuleEditor (3 modes: schedule / prerequisite / enrollment-days), DripBadge on locked lessons"],
        ["16", "Instructor application flow, admin approval, course_instructor N:N, revenue_share_percent, Course_Duplicator, polish", "InstructorPicker, RevenueShareEditor, ApplyToBeInstructorPage, admin InstructorApplicationsPage"],
    ], [10, 65, 60]))
    story.append(h3("Exit criteria"))
    story.append(bullets([
        "Course with 3 instructors at 50/30/20 split; checkout generates correct revenue ledger entries; partial refund reverses proportionally.",
        "Certificate auto-issues on course completion; PDF renders correctly with template 1 (default) and template 5 (customizable); verification URL works unauthenticated.",
        "Content drip unlocks lessons on schedule, on prerequisite completion, and on enrollment-day count.",
        "Assignment submission + grading flow works end-to-end with file upload.",
    ]))

    story.append(h2("11.6 Phase 4 — Pro engagement (Weeks 17–20)"))
    story.append(p(
        "Phase 4 adds the engagement layer that makes courses sticky: gamification, social Q&A, notifications, lesson notes, course preview, and downloadable attachments. Most of this phase is frontend-heavy; the backend is largely event subscriptions off the catalog built in Phases 1–3."
    ))
    story.append(h3("Week-by-week"))
    story.append(make_table([
        ["Week", "Backend deliverables", "Frontend deliverables"],
        ["17", "Gamification points engine (event→points rules), badge criteria evaluation job, leaderboard rebuild job", "PointsDisplay, BadgeWall, LeaderboardTable (course + tenant scope)"],
        ["18", "Q&A endpoints (already roughed in Phase 1) fleshed out with answers, upvotes, instructor-answered badge; announcements model + email-out", "QnaThreadedView, AnnouncementList, instructor AnnouncementComposer"],
        ["19", "Lesson notes model + endpoints; notifications model + dispatcher (email + in-app + Pusher for push); notification_preference per user", "LessonNotesPanel (sidebar in player), NotificationBell with realtime feed, PreferenceMatrix"],
        ["20", "Course preview (mark lessons as preview, allow unauthenticated watch); course attachments (downloadable resources, gated by enrollment); polish", "PreviewBadge, AttachmentList, download link with signed URL"],
    ], [10, 65, 60]))
    story.append(h3("Exit criteria"))
    story.append(bullets([
        "Student earns 100 points for course completion, sees badge awarded in real-time via Pusher.",
        "Notification bell shows unread count; clicking takes student to the relevant lesson / certificate / announcement.",
        "Lesson notes save and load correctly; survives lesson navigation.",
        "Preview lessons play without auth; non-preview lessons show login CTA.",
    ]))

    story.append(h2("11.7 Phase 5 — Reports + AI + launch (Weeks 21–24)"))
    story.append(p(
        "Phase 5 closes the gap to Tutor LMS Pro parity with reports and AI course generation, then enters launch hardening. The AI work depends on a separate LLM provider decision (see Chapter 12) and is the most likely to slip — it's scoped to be cuttable without blocking launch."
    ))
    story.append(h3("Week-by-week"))
    story.append(make_table([
        ["Week", "Backend deliverables", "Frontend deliverables"],
        ["21", "Report aggregation jobs (daily rollups), admin reports endpoints (overview, sales, enrollments, completion), instructor reports (own earnings, students)", "ReportsPage with KPI cards + Recharts line/bar/pie; export to CSV"],
        ["22", "TutorAI: generate-course-outline (LLM call with structured output), generate-lesson (per outline item), generate-quiz (per lesson)", "AiStudioPanel with prompt input + preview + insert-into-builder; JobProgress component"],
        ["23", "Performance: index audit, query optimization, N+1 elimination; load test with k6 (1000 concurrent students, 50 instructors)", "Performance fixes; bundle-size audit; code-split Instructor + Admin routes"],
        ["24", "Security review (RBAC matrix audit, entitlement bypass check, SQL/NoSQL injection sweep, secrets scan); launch runbook; on-call setup", "Polish, accessibility audit (axe-core), browser matrix testing, final bug bash"],
    ], [10, 65, 60]))
    story.append(h3("Exit criteria"))
    story.append(bullets([
        "Reports page loads in < 500ms with 10k orders + 5k enrollments; CSV export works.",
        "TutorAI generates a usable course outline from a 1-sentence prompt in < 30 seconds; instructor can edit + insert into builder.",
        "k6 load test passes: 1000 concurrent students browsing catalog, 100 concurrent video playbacks, 10 concurrent checkouts — p95 latency < 1s.",
        "No critical security findings; launch runbook documented; first customer onboarded.",
    ]))
    story.append(PageBreak())

    # ============ Chapter 12: Risk register ============
    story.append(h1("12. Risk Register and Mitigations"))
    story.append(make_table([
        ["#", "Risk", "Prob", "Impact", "Mitigation", "Owner"],
        ["R1", "Video streaming cost overrun (Bunny bill spikes from a viral course)", "Med", "High", "Per-tenant bandwidth budget (configstore); alert at 80% of cap; hard cap at 120% with degraded playback quality", "Tech lead"],
        ["R2", "Stripe subscription dunning failures (SCA, expired cards) silently churn subscribers", "High", "High", "Stripe Smart Retries + our own 3-attempt email sequence; subscription.payment_failed event triggers dunning; daily report of at-risk subs", "Backend"],
        ["R3", "MongoDB schema drift across environments (no migration framework historically)", "High", "Med", "Phase 0 introduces migration runner; every PR that touches a collection must add a migration; CI fails if migrations are pending", "Backend"],
        ["R4", "Certificate PDF rendering inconsistency across Playwright versions", "Med", "Med", "Pin Playwright version in Dockerfile; render certificates server-side only; cache rendered PDF in object storage; re-render only on template change", "Backend"],
        ["R5", "Multi-instructor revenue math breaks under partial refunds + bundle purchases", "Med", "High", "Model revenue as double-entry ledger from day one; property tests cover: partial refund, bundle refund, refund after instructor payout (clawback)", "Backend"],
        ["R6", "Content drip scheduler fires at wrong time across student timezones", "Med", "Med", "Store all drip times as UTC; student sees localized time on frontend; scheduler runs in UTC; document the model clearly in API docs", "Backend"],
        ["R7", "TutorAI generation quality varies wildly across LLM providers and prompt phrasing", "High", "Med", "Ship as Pro add-on with explicit 'draft' framing; allow instructor to edit everything; track acceptance rate; iterate prompts monthly", "Tech lead"],
        ["R8", "RBAC permission leakage (instructor sees another instructor's course)", "Med", "High", "Every repository method takes actor_id and filters by ownership; integration tests assert cross-tenant + cross-instructor isolation; quarterly security audit", "Backend"],
        ["R9", "Catalog search latency degrades as courses grow past 10k", "Med", "Low", "Phase 1: MongoDB text index covers 10k; Phase 5: revisit with Atlas Search or Meilisearch if p95 > 500ms", "Backend"],
        ["R10", "Stripe webhook duplicates cause double-enrollment or double ledger entries", "Low", "High", "Webhook handlers idempotent on Stripe event ID; idempotency key stored in webhook_events collection; replay tests in CI", "Backend"],
        ["R11", "Object storage cost grows unbounded (years of video + certificate PDFs)", "Med", "Med", "Lifecycle policies: move cancelled-tenant assets to cold storage after 90 days; delete after 365 days; tenant export + delete on churn", "Tech lead"],
        ["R12", "Instructor payout compliance (tax forms, KYC, regional payout methods)", "High", "High", "Defer to Stripe Connect Express for Phase 1–3 (handles KYC, 1099s, payout scheduling); only build custom payout if Stripe Connect is unavailable in a target market", "Tech lead"],
    ], [6, 40, 8, 8, 50, 14]))
    story.append(PageBreak())

    # ============ Chapter 13: Open questions ============
    story.append(h1("13. Open Questions and Next Steps"))

    story.append(h2("13.1 Decisions to confirm before Phase 1 starts"))
    story.append(make_table([
        ["#", "Decision", "Options", "Recommendation", "Decision needed by"],
        ["D1", "Video provider", "Bunny Stream / Mux / S3+HLS", "Bunny Stream (lowest cost, token-auth, sufficient DRM-lite)", "End of Phase 0"],
        ["D2", "AI provider for TutorAI", "OpenAI / Anthropic / Gemini / z-ai-web-dev-sdk", "z-ai-web-dev-sdk if available — lowest integration cost; else OpenAI for streaming + tool use", "End of Phase 4"],
        ["D3", "i18n strategy", "None / Lingui / i18next / next-intl", "Defer — Phase 5+ if early customers need non-English schools", "Post-launch"],
        ["D4", "Search backend", "Mongo text index / Atlas Search / Meilisearch", "Mongo text index for MVP; revisit at 10k courses", "Phase 5 review"],
        ["D5", "Marketplace mode (Udemy-style cross-tenant catalog)", "Defer / Build now", "Defer — current scope is per-tenant LMS, not marketplace", "Post-launch"],
        ["D6", "Mobile app", "No / React Native / PWA only", "PWA only — React 19 + Vite already produces an installable PWA; native app deferred", "Post-launch"],
        ["D7", "Email provider", "Resend (existing) / Postmark / SES", "Keep Resend — already integrated, sufficient for LMS volume", "Confirmed"],
        ["D8", "Realtime push (notifications, live Q&A)", "Pusher / self-hosted Centrifugo / WebSocket-only", "Pusher for Phase 4 (fastest TTM); Centrifugo if cost becomes an issue", "End of Phase 3"],
    ], [6, 30, 35, 45, 18]))
    story.append(spacer(4))

    story.append(h2("13.2 Team and resourcing"))
    story.append(p(
        "The roadmap assumes a team of five: two backend engineers, two frontend engineers, one designer (part-time), one tech lead (you, full-time). The team can be smaller if Phase 0 ships before hiring — Phase 0 is tech-lead-only work. The team can be larger if you want to compress the timeline: a third backend engineer in Phase 2 (parallelizing ecommerce and subscription work) and a third frontend engineer in Phase 4 (parallelizing gamification, notifications, and course preview) would compress the 24-week plan to ~18 weeks."
    ))
    story.append(p(
        "Critical hire: a backend engineer with Stripe Billing experience. Subscription dunning, proration, and refund cascades are the highest-risk backend work in the project; an engineer who has built this before will save 2–3 weeks in Phase 2."
    ))

    story.append(h2("13.3 Immediate next steps (this week)"))
    story.append(numbered([
        "Confirm the stack additions (Bunny Stream, Pusher, Playwright for certificates, z-ai-web-dev-sdk for AI) and provision accounts.",
        "Stand up a staging environment on Fly.io with a MongoDB Atlas M10 cluster and a Bunny Stream library.",
        "Begin Phase 0 work in a feature branch off <font face='FreeMono'>main</font>; create the <font face='FreeMono'>internal/storage/</font>, <font face='FreeMono'>internal/jobs/</font>, and <font face='FreeMono'>internal/migrations/</font> packages.",
        "Open the codewiki MCP for lastsaas (<font face='FreeMono'>https://codewiki.google/github.com/jonradoff/lastsaas</font>) and use it as the onboarding doc for new engineers — it walks them through the codebase faster than reading source.",
        "Post the engineering plan (this document) to the team channel; collect feedback for one week; freeze scope at end of week.",
        "Begin hiring (if not already started) — prioritize the Stripe-experienced backend engineer first.",
    ]))

    story.append(h2("13.4 What this plan deliberately does NOT include"))
    story.append(p(
        "To keep the 24-week timeline realistic, the following are explicitly out of scope for v1 launch and should be revisited post-launch:"
    ))
    story.append(bullets([
        "Native mobile apps (PWA only).",
        "Marketplace mode (cross-tenant catalog, transaction fees).",
        "SCORM / LTI / xAPI compliance (deferred until a customer asks).",
        "Full DRM (Widevine / FairPlay) — Bunny token-auth is the v1 ceiling.",
        "Real-time co-authoring of courses (Tutor's multi-instructor is sequential edits only).",
        "Built-in live class tool (we integrate Zoom; we do not build our own).",
        "AI-powered personalized learning paths (TutorAI generates content; adaptive sequencing is a v2).",
        "Built-in discussion forums (Q&A is per-lesson; full forums are deferred — BuddyPress parity is a v2 if customers ask).",
        "WCAG 2.1 AA compliance audit (we will follow accessibility best practices; formal audit deferred).",
        "Multi-currency settlement (display in any currency; settled in USD only at v1).",
    ]))

    return story


def main():
    output_path = "/home/z/my-project/scripts/body.pdf"
    doc = TocDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=20 * mm, rightMargin=20 * mm,
        topMargin=22 * mm, bottomMargin=18 * mm,
        title="Building a Tutor LMS Pro-Style SaaS on lastsaas",
        author="Z.ai",
        subject="Engineering blueprint for extending lastsaas into a Tutor LMS Pro-style SaaS",
        creator="Z.ai PDF skill (ReportLab)",
    )
    story = build_story()
    doc.multiBuild(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(f"Body PDF written: {output_path}")
    # Print size
    sz = os.path.getsize(output_path) / 1024
    print(f"Size: {sz:.1f} KB")


if __name__ == "__main__":
    main()
