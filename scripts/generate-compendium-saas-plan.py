#!/usr/bin/env python3
"""
Generate the Compendium → SaaS Build Plan mapping.

For each of the 27 Tutor LMS docs sections (the "compendium"), this script
maps what needs to be built in our SaaS and which sidebar items get affected.

Output: /home/z/my-project/src/data/compendium-saas-plan.json

Structure:
{
  "sections": [
    {
      "id": "getting-started",
      "name": "Getting Started",
      "doc_count": 5,
      "phase": "Phase 0",  # which build phase this belongs to
      "status": "done" | "in-progress" | "planned",
      "description": "What we build for our SaaS",
      "saas_implementation": "How lastsaas implements this",
      "impact": {
        "collections": ["users", "tenants", ...],  # which of the 91 collections
        "endpoints": ["POST /api/auth/login", ...],  # which of the 172 endpoints
        "events": ["user.registered", ...],  # which events fire
        "settings": ["site_name", ...],  # which of the 66 settings
        "email_triggers": ["welcome_email", ...],  # which of the 54 triggers
        "tickets": ["T-001", "T-002", ...],  # which of the 100 tickets
        "screens": ["login", "signup", ...],  # which frontend screens
        "quiz_types": [],  # which of the 13 quiz types (if applicable)
        "gateways": []  # which of the 11 payment gateways (if applicable)
      },
      "sidebar_effects": {
        "data_model": "Add users, tenants collections (already exist in lastsaas)",
        "api_reference": "Auth endpoints already exist; add /api/courses/* routes",
        "events": "Fire user.registered, course.published events",
        ...
      }
    }
  ],
  "summary": {
    "total_sections": 27,
    "done": N,
    "in_progress": N,
    "planned": N,
    "overall_progress": X,
    "by_phase": {...}
  }
}
"""
import json
import re
from pathlib import Path
from datetime import datetime, timezone

NAV_FILE = Path("/home/z/my-project/src/data/tutor-docs-nav.json")
OUT_FILE = Path("/home/z/my-project/src/data/compendium-saas-plan.json")

# ============================================================
# THE BUILD PLAN: 27 sections mapped to SaaS implementation
# ============================================================
# This is the core intellectual work — for each Tutor LMS docs section,
# what does our SaaS need to build, and what changes across every sidebar item?

SECTIONS_PLAN = [
    {
        "id": "getting-started",
        "name": "Getting Started",
        "phase": "Phase 0",
        "status": "done",
        "saas_implementation": "LastSaaS already provides system requirements (Go 1.25, MongoDB 7+, Node 20), permalink/per-tenant routing, download/install via Docker/Fly.io, compatible themes (tailux), and compatible plugins (Stripe, BunnyNet, Resend). Nothing new to build — this is the foundation lastsaas ships with.",
        "impact": {
            "collections": ["users", "tenants", "config", "roles"],
            "endpoints": ["GET /api/health", "GET /api/config", "POST /api/auth/setup"],
            "events": ["system.initialized", "tenant.created"],
            "settings": ["site_name", "site_url", "timezone", "language"],
            "email_triggers": [],
            "tickets": ["T-001", "T-002", "T-003"],
            "screens": ["login", "signup", "onboarding", "bootstrap"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "No change — users/tenants/config/roles collections already exist in lastsaas (38 base collections)",
            "API Reference": "No change — health/config/auth endpoints already exist (133 lastsaas routes)",
            "Events": "Add 2 new events: system.initialized, tenant.created (lastsaas has 22 events, +2 = 24)",
            "Settings": "No change — site_name/site_url/timezone/language already in lastsaas config store",
            "Email Triggers": "No change — no emails fired during setup",
            "Tickets": "T-001, T-002, T-003 marked DONE (foundation hardening)",
            "Build Roadmap": "Phase 0 (Foundation Hardening) — 100% complete"
        }
    },
    {
        "id": "course-builder",
        "name": "Course Builder",
        "phase": "Phase 1",
        "status": "in-progress",
        "saas_implementation": "Build the course builder as a tailux-based SPA served by lastsaas. Courses collection (new), topics collection (new), lessons collection (new). The 3-step wizard (Basics → Curriculum → Additional) we already prototyped in Frontend Apps becomes the real instructor UI. Backend: new /api/courses/* CRUD routes, /api/topics/*, /api/lessons/*. Video upload to BunnyNet. Rich text editor via TipTap. All 6 modals (Lesson/Quiz/Assignment/AI/Preview/ContentBank) implemented.",
        "impact": {
            "collections": ["courses", "topics", "lessons", "course_meta", "instructors", "course_categories", "course_tags"],
            "endpoints": [
                "GET /api/courses", "POST /api/courses", "GET /api/courses/:id",
                "PATCH /api/courses/:id", "DELETE /api/courses/:id",
                "POST /api/courses/:id/topics", "PATCH /api/topics/:id", "DELETE /api/topics/:id",
                "POST /api/topics/:id/lessons", "PATCH /api/lessons/:id", "DELETE /api/lessons/:id",
                "POST /api/lessons/:id/video", "POST /api/lessons/:id/attachments",
                "POST /api/courses/:id/ai-generate"
            ],
            "events": [
                "course.created", "course.updated", "course.published", "course.drafted",
                "course.deleted", "topic.created", "topic.reordered", "topic.deleted",
                "lesson.created", "lesson.updated", "lesson.deleted", "lesson.video.uploaded"
            ],
            "settings": ["course_max_students_default", "course_difficulty_levels", "course_preview_enabled", "course_video_max_size", "course_attachment_max_size"],
            "email_triggers": ["course_published_instructor", "course_published_admin"],
            "tickets": ["T-014", "T-015", "T-016", "T-017", "T-018", "T-019", "T-020", "T-021"],
            "screens": ["course-builder-basic", "course-builder-curriculum", "course-builder-additional", "lesson-modal", "quiz-modal", "assignment-modal", "ai-course-builder-modal", "content-bank-modal"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 7 new collections: courses, topics, lessons, course_meta, instructors, course_categories, course_tags (38 → 45 total)",
            "API Reference": "Add 16 new endpoints under /api/courses/*, /api/topics/*, /api/lessons/* (133 → 149 lastsaas routes)",
            "Events": "Add 12 new events for course/topic/lesson lifecycle (22 → 34 events)",
            "Settings": "Add 5 new settings for course defaults (66 Tutor settings → 5 mapped to lastsaas config store)",
            "Email Triggers": "Add 2 new email triggers: course_published_instructor, course_published_admin",
            "Tickets": "T-014 through T-021 (8 tickets) — in Phase 1 (Core LMS)",
            "Build Roadmap": "Phase 1 (Core LMS) — 30% complete (course builder done, curriculum done, lessons done; quizzes pending)",
            "Frontend Apps": "Course Builder app (already prototyped) becomes the real production UI — promoted from 'experiment' to 'live'",
            "Screen Inventory": "8 new screens added to inventory (course-builder-*, lesson-modal, quiz-modal, etc.)"
        }
    },
    {
        "id": "quiz-builder",
        "name": "Quiz Builder",
        "phase": "Phase 1",
        "status": "in-progress",
        "saas_implementation": "Build the quiz builder as part of the course builder. Quizzes collection (new), questions collection (new), quiz_attempts collection (new). All 13 question types from Tutor LMS implemented as React components (multiple-choice, true-false, open-ended, fill-blanks, short-answer, matching, image-answering, ordering, puzzle, scale, coordinates, pin-image, draw-image). Backend: /api/quizzes/*, /api/questions/*. Quiz settings (20+ fields) stored in quiz_meta.",
        "impact": {
            "collections": ["quizzes", "questions", "quiz_attempts", "quiz_settings", "question_answers"],
            "endpoints": [
                "POST /api/topics/:id/quizzes", "GET /api/quizzes/:id", "PATCH /api/quizzes/:id", "DELETE /api/quizzes/:id",
                "POST /api/quizzes/:id/questions", "PATCH /api/questions/:id", "DELETE /api/questions/:id",
                "POST /api/quizzes/:id/questions/:id/preview",
                "GET /api/quizzes/:id/attempts", "POST /api/quizzes/:id/attempt", "PATCH /api/attempts/:id"
            ],
            "events": [
                "quiz.created", "quiz.updated", "quiz.deleted",
                "question.created", "question.updated", "question.deleted",
                "quiz.attempt.started", "quiz.attempt.submitted", "quiz.attempt.graded"
            ],
            "settings": ["quiz_default_passing_grade", "quiz_default_time_limit", "quiz_default_attempts", "quiz_question_order"],
            "email_triggers": ["quiz_completed_student", "quiz_completed_instructor"],
            "tickets": ["T-022", "T-023", "T-024", "T-025"],
            "screens": ["quiz-builder-details", "quiz-builder-settings", "question-form-multiple-choice", "question-form-true-false", "question-form-open-ended", "question-form-fill-blanks", "question-form-matching", "question-form-image-answering", "question-form-ordering"],
            "quiz_types": ["multiple-choice", "true-false", "open-ended", "fill-blanks", "short-answer", "matching", "image-answering", "ordering"],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 5 new collections: quizzes, questions, quiz_attempts, quiz_settings, question_answers (45 → 50 total)",
            "API Reference": "Add 11 new endpoints under /api/quizzes/*, /api/questions/* (149 → 160 routes)",
            "Events": "Add 9 new events for quiz/question lifecycle (34 → 43 events)",
            "Settings": "Add 4 new quiz default settings",
            "Email Triggers": "Add 2 new email triggers for quiz completion",
            "Quiz Types": "8 of 13 question types built in Phase 1 (free types); 5 Pro types (puzzle, scale, coordinates, pin-image, draw-image) deferred to Phase 3",
            "Tickets": "T-022 through T-025 (4 tickets) — in Phase 1",
            "Build Roadmap": "Phase 1 — 50% complete (course builder + quiz builder done)"
        }
    },
    {
        "id": "quiz-question-types",
        "name": "Quiz Question Types",
        "phase": "Phase 1",
        "status": "in-progress",
        "saas_implementation": "Implement all 13 question types. Free (8): multiple-choice, true-false, open-ended/essay, fill-in-the-blanks, short-answer, matching, image-answering, ordering. Pro (5): puzzle, scale, coordinates, pin-image, draw-on-image. Each type has a dedicated React renderer (for students) and editor (for instructors). Stored in questions collection with type field.",
        "impact": {
            "collections": ["questions", "question_answers", "question_meta"],
            "endpoints": ["POST /api/questions", "PATCH /api/questions/:id", "GET /api/questions/:id/preview"],
            "events": ["question.type.multiple_choice.created", "question.type.true_false.created"],
            "settings": [],
            "email_triggers": [],
            "tickets": ["T-022", "T-023"],
            "screens": ["question-multiple-choice", "question-true-false", "question-open-ended", "question-fill-blanks", "question-short-answer", "question-matching", "question-image-answering", "question-ordering", "question-puzzle", "question-scale", "question-coordinates", "question-pin-image", "question-draw-image"],
            "quiz_types": ["multiple-choice", "true-false", "open-ended", "fill-blanks", "short-answer", "matching", "image-answering", "ordering", "puzzle", "scale", "coordinates", "pin-image", "draw-image"],
            "gateways": []
        },
        "sidebar_effects": {
            "Quiz Types": "All 13 types catalogued (13/13). 8 built in Phase 1, 5 Pro types built in Phase 3. Each type links to its renderer + editor screen.",
            "Data Model": "questions collection gains a 'type' field + type-specific answer schema",
            "Screen Inventory": "13 new question type screens added (one per type)"
        }
    },
    {
        "id": "course-bundle",
        "name": "Course Bundle",
        "phase": "Phase 3",
        "status": "planned",
        "saas_implementation": "Build course bundles — group multiple courses into a single purchasable package. New collection: course_bundles. Bundle pricing, bundle thumbnail, bundle courses list. Backend: /api/bundles/* CRUD. Frontend: bundle builder UI (similar to course builder). Bundles appear in catalog alongside individual courses.",
        "impact": {
            "collections": ["course_bundles", "bundle_courses", "bundle_pricing"],
            "endpoints": ["GET /api/bundles", "POST /api/bundles", "GET /api/bundles/:id", "PATCH /api/bundles/:id", "DELETE /api/bundles/:id"],
            "events": ["bundle.created", "bundle.updated", "bundle.deleted", "bundle.purchased"],
            "settings": ["bundle_enabled", "bundle_max_courses"],
            "email_triggers": ["bundle_purchased"],
            "tickets": ["T-064", "T-065"],
            "screens": ["bundle-builder", "bundle-list", "bundle-detail"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 3 new collections: course_bundles, bundle_courses, bundle_pricing (50 → 53)",
            "API Reference": "Add 5 new /api/bundles/* endpoints",
            "Events": "Add 4 bundle events",
            "Tickets": "T-064, T-065 in Phase 3 (Pro Authoring)",
            "Build Roadmap": "Phase 3 — 0% (planned for weeks 13-16)"
        }
    },
    {
        "id": "student-learning-experience",
        "name": "Student Learning Experience",
        "phase": "Phase 1",
        "status": "in-progress",
        "saas_implementation": "Build the student-facing learning interface: video player (BunnyNet), reading lessons, taking quizzes, submitting assignments, live classes (Zoom/Meet), resources downloads, Q&A, announcements, reviews, gradebook, certificate, course info, completing the course, content delivery settings.",
        "impact": {
            "collections": ["lesson_progress", "quiz_attempts", "assignment_submissions", "qa_questions", "qa_answers", "announcements", "reviews", "enrollments", "course_completions"],
            "endpoints": [
                "POST /api/lessons/:id/progress", "GET /api/lessons/:id/progress",
                "POST /api/quizzes/:id/attempt", "GET /api/quizzes/:id/attempts",
                "POST /api/assignments/:id/submit", "GET /api/assignments/:id/submissions",
                "GET /api/courses/:id/qa", "POST /api/courses/:id/qa", "POST /api/qa/:id/answer",
                "GET /api/courses/:id/announcements", "POST /api/courses/:id/announcements",
                "POST /api/courses/:id/reviews", "GET /api/courses/:id/reviews",
                "GET /api/courses/:id/gradebook", "POST /api/courses/:id/complete"
            ],
            "events": [
                "lesson.started", "lesson.completed", "lesson.progress.updated",
                "quiz.attempt.started", "quiz.attempt.submitted", "quiz.attempt.graded",
                "assignment.submitted", "assignment.graded",
                "qa.question.asked", "qa.question.answered",
                "announcement.posted", "review.submitted",
                "course.completed", "course.progress.milestone"
            ],
            "settings": ["qa_enabled", "reviews_enabled", "auto_complete_course", "content_drip_default"],
            "email_triggers": ["lesson_completed", "quiz_passed", "quiz_failed", "assignment_graded", "course_completed", "qa_answered", "announcement_posted"],
            "tickets": ["T-026", "T-027", "T-028", "T-029", "T-030", "T-031"],
            "screens": ["learning-area-video", "learning-area-reading", "learning-area-quiz", "learning-area-assignment", "learning-area-live", "learning-area-resources", "learning-area-qa", "learning-area-announcements", "learning-area-reviews", "learning-area-gradebook", "learning-area-certificate", "course-info"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 9 new collections for student activity tracking (53 → 62 total)",
            "API Reference": "Add 17 new endpoints for student learning activities",
            "Events": "Add 14 new events for learning lifecycle (43 → 57 events)",
            "Email Triggers": "Add 7 new email triggers for student notifications",
            "Tickets": "T-026 through T-031 (6 tickets) in Phase 1",
            "Screen Inventory": "12 new learning-area screens added",
            "Build Roadmap": "Phase 1 — 70% complete (course + quiz + learning experience done)"
        }
    },
    {
        "id": "learner-dashboard",
        "name": "Learner Dashboard",
        "phase": "Phase 1",
        "status": "planned",
        "saas_implementation": "Build the student dashboard: home screen, my courses, notes, discussions, calendar, account menu, profile options, kids mode. tailux-based frontend with student-specific sidebar.",
        "impact": {
            "collections": ["student_notes", "discussions", "calendar_events", "student_preferences"],
            "endpoints": [
                "GET /api/dashboard/student", "GET /api/student/courses",
                "GET /api/notes", "POST /api/notes", "PATCH /api/notes/:id", "DELETE /api/notes/:id",
                "GET /api/discussions", "POST /api/discussions",
                "GET /api/calendar", "POST /api/calendar/events",
                "GET /api/student/profile", "PATCH /api/student/profile",
                "POST /api/student/kids-mode"
            ],
            "events": ["note.created", "note.updated", "discussion.posted", "kids_mode.enabled"],
            "settings": ["kids_mode_enabled", "dashboard_layout", "notes_enabled"],
            "email_triggers": [],
            "tickets": ["T-032", "T-033"],
            "screens": ["student-dashboard-home", "student-dashboard-courses", "student-dashboard-notes", "student-dashboard-discussions", "student-dashboard-calendar", "student-dashboard-profile", "student-dashboard-kids-mode"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 4 new collections (62 → 66)",
            "API Reference": "Add 13 new /api/dashboard/student/* and /api/student/* endpoints",
            "Events": "Add 4 new events",
            "Tickets": "T-032, T-033 in Phase 1",
            "Screen Inventory": "7 new student dashboard screens",
            "Build Roadmap": "Phase 1 — 90% complete (dashboard is last in Phase 1)"
        }
    },
    {
        "id": "instructor-dashboard",
        "name": "Instructor Dashboard",
        "phase": "Phase 1",
        "status": "planned",
        "saas_implementation": "Build the instructor dashboard: home, courses, announcements, quiz attempts, assignments, discussions, live classes, certificate, analytics (statements tab), notifications panel, profile menu, account settings.",
        "impact": {
            "collections": ["instructor_stats", "instructor_notifications", "instructor_payouts"],
            "endpoints": [
                "GET /api/dashboard/instructor", "GET /api/instructor/courses",
                "GET /api/instructor/analytics", "GET /api/instructor/statements",
                "GET /api/instructor/notifications", "PATCH /api/instructor/notifications/:id",
                "GET /api/instructor/payouts", "POST /api/instructor/payouts/request"
            ],
            "events": ["instructor.course.approved", "instructor.payout.requested", "instructor.notification.sent"],
            "settings": ["instructor_revenue_share_default", "instructor_auto_approve"],
            "email_triggers": ["instructor_course_approved", "instructor_payout_processed", "instructor_new_enrollment"],
            "tickets": ["T-034", "T-035", "T-036"],
            "screens": ["instructor-dashboard-home", "instructor-dashboard-courses", "instructor-dashboard-announcements", "instructor-dashboard-quiz-attempts", "instructor-dashboard-assignments", "instructor-dashboard-discussions", "instructor-dashboard-live", "instructor-dashboard-certificate", "instructor-dashboard-analytics", "instructor-dashboard-statements", "instructor-dashboard-notifications", "instructor-dashboard-profile"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 3 new collections (66 → 69)",
            "API Reference": "Add 8 new /api/instructor/* endpoints",
            "Events": "Add 3 new instructor events",
            "Email Triggers": "Add 3 new instructor email triggers",
            "Tickets": "T-034 through T-036 in Phase 1",
            "Screen Inventory": "12 new instructor dashboard screens",
            "Build Roadmap": "Phase 1 — 100% complete after instructor dashboard"
        }
    },
    {
        "id": "native-ecommerce",
        "name": "Native eCommerce",
        "phase": "Phase 2",
        "status": "planned",
        "saas_implementation": "Build native eCommerce: cart, checkout, payment methods, coupons, taxes, orders. Reuse lastsaas Stripe integration for payment processing. New collections: carts, orders, coupons, taxes, order_items. Backend: /api/cart/*, /api/checkout/*, /api/orders/*. Stripe webhook handles order.paid event chain.",
        "impact": {
            "collections": ["carts", "orders", "order_items", "coupons", "taxes", "refunds", "invoices"],
            "endpoints": [
                "GET /api/cart", "POST /api/cart/items", "PATCH /api/cart/items/:id", "DELETE /api/cart/items/:id",
                "POST /api/checkout", "GET /api/checkout/success", "GET /api/checkout/cancel",
                "GET /api/orders", "GET /api/orders/:id", "POST /api/orders/:id/refund",
                "POST /api/coupons", "GET /api/coupons", "DELETE /api/coupons/:id",
                "GET /api/taxes", "POST /api/taxes"
            ],
            "events": [
                "cart.item.added", "cart.item.removed", "cart.cleared",
                "checkout.started", "checkout.completed", "checkout.failed",
                "order.created", "order.paid", "order.refunded", "order.cancelled",
                "coupon.applied", "coupon.redeemed"
            ],
            "settings": ["ecommerce_enabled", "default_currency", "tax_enabled", "coupon_enabled"],
            "email_triggers": ["order_confirmation", "order_cancelled", "refund_processed", "payment_failed"],
            "tickets": ["T-037", "T-038", "T-039", "T-040", "T-041", "T-042"],
            "screens": ["cart", "checkout", "order-confirmation", "order-history", "coupon-management", "tax-settings"],
            "quiz_types": [],
            "gateways": ["stripe"]
        },
        "sidebar_effects": {
            "Data Model": "Add 7 new collections (69 → 76)",
            "API Reference": "Add 15 new /api/cart/*, /api/checkout/*, /api/orders/* endpoints",
            "Events": "Add 12 new eCommerce events (57 → 69 events)",
            "Email Triggers": "Add 4 new order email triggers",
            "Payment Gateways": "Stripe integration already exists in lastsaas — extend with course-specific order handling",
            "Tickets": "T-037 through T-042 (6 tickets) in Phase 2",
            "Build Roadmap": "Phase 2 (Ecommerce) — starts weeks 7-12"
        }
    },
    {
        "id": "payment-gateways",
        "name": "Payment Gateways",
        "phase": "Phase 2",
        "status": "planned",
        "saas_implementation": "Integrate all 11 payment gateways: Stripe (already in lastsaas), PayPal, Paddle, Authorize.net, Paystack, Mollie, Klarna, Alipay, Razorpay, 2Checkout, Manual Payment. Each gateway implements a common PaymentGateway interface. Backend: /api/gateways/* for configuration, /api/gateways/:id/process for payment.",
        "impact": {
            "collections": ["payment_gateways", "gateway_configs", "transactions"],
            "endpoints": [
                "GET /api/gateways", "POST /api/gateways", "PATCH /api/gateways/:id", "DELETE /api/gateways/:id",
                "POST /api/gateways/:id/process", "POST /api/gateways/:id/webhook",
                "GET /api/transactions", "GET /api/transactions/:id"
            ],
            "events": ["gateway.connected", "gateway.disconnected", "payment.received", "payment.failed", "webhook.received"],
            "settings": ["gateway_stripe_enabled", "gateway_paypal_enabled", "gateway_paddle_enabled", "gateway_paystack_enabled", "gateway_mollie_enabled", "gateway_klarna_enabled", "gateway_razorpay_enabled", "gateway_manual_enabled"],
            "email_triggers": [],
            "tickets": ["T-043", "T-044", "T-045", "T-046"],
            "screens": ["gateway-settings-stripe", "gateway-settings-paypal", "gateway-settings-paddle", "gateway-settings-authorize", "gateway-settings-paystack", "gateway-settings-mollie", "gateway-settings-klarna", "gateway-settings-alipay", "gateway-settings-razorpay", "gateway-settings-2checkout", "gateway-settings-manual"],
            "quiz_types": [],
            "gateways": ["stripe", "paypal", "paddle", "authorize", "paystack", "mollie", "klarna", "alipay", "razorpay", "2checkout", "manual"]
        },
        "sidebar_effects": {
            "Payment Gateways": "All 11 gateways catalogued. Stripe built in lastsaas (Phase 0). 10 more added in Phase 2. Each gateway = 1 settings screen + 1 webhook endpoint.",
            "Data Model": "Add 3 new collections: payment_gateways, gateway_configs, transactions (76 → 79)",
            "API Reference": "Add 8 new /api/gateways/* endpoints",
            "Events": "Add 5 new gateway events",
            "Tickets": "T-043 through T-046 (4 tickets) in Phase 2"
        }
    },
    {
        "id": "subscriptions",
        "name": "Subscriptions",
        "phase": "Phase 2",
        "status": "planned",
        "saas_implementation": "Build subscription-based course access. Reuse lastsaas Stripe subscriptions. New collection: course_subscriptions. Students pay monthly/yearly for ongoing access. Dunning management for failed payments. Backend: /api/subscriptions/* CRUD.",
        "impact": {
            "collections": ["course_subscriptions", "subscription_plans", "dunning_cycles"],
            "endpoints": ["GET /api/subscriptions", "POST /api/subscriptions", "PATCH /api/subscriptions/:id", "DELETE /api/subscriptions/:id", "POST /api/subscriptions/:id/cancel", "POST /api/subscriptions/:id/retry"],
            "events": ["subscription.created", "subscription.activated", "subscription.cancelled", "subscription.expired", "subscription.payment_failed", "subscription.renewed"],
            "settings": ["subscription_enabled", "subscription_grace_period"],
            "email_triggers": ["subscription_started", "subscription_renewed", "subscription_cancelled", "subscription_payment_failed", "subscription_expired"],
            "tickets": ["T-047", "T-048"],
            "screens": ["subscription-plans", "subscription-management", "dunning-settings"],
            "quiz_types": [],
            "gateways": ["stripe"]
        },
        "sidebar_effects": {
            "Data Model": "Add 3 new collections (79 → 82)",
            "API Reference": "Add 6 new /api/subscriptions/* endpoints",
            "Events": "Add 6 new subscription events",
            "Email Triggers": "Add 5 new subscription email triggers",
            "Tickets": "T-047, T-048 in Phase 2"
        }
    },
    {
        "id": "memberships",
        "name": "Memberships",
        "phase": "Phase 2",
        "status": "planned",
        "saas_implementation": "Build membership tiers — students buy a membership that grants access to a group of courses. New collection: memberships, membership_courses. Backend: /api/memberships/* CRUD. Frontend: membership builder, membership pricing page.",
        "impact": {
            "collections": ["memberships", "membership_courses", "membership_subscriptions"],
            "endpoints": ["GET /api/memberships", "POST /api/memberships", "GET /api/memberships/:id", "PATCH /api/memberships/:id", "DELETE /api/memberships/:id"],
            "events": ["membership.created", "membership.updated", "membership.purchased", "membership.cancelled", "membership.expired"],
            "settings": ["membership_enabled"],
            "email_triggers": ["membership_started", "membership_cancelled", "membership_expired"],
            "tickets": ["T-049"],
            "screens": ["membership-builder", "membership-list", "membership-detail"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 3 new collections (82 → 85)",
            "API Reference": "Add 5 new /api/memberships/* endpoints",
            "Events": "Add 5 new membership events",
            "Email Triggers": "Add 3 new membership email triggers",
            "Tickets": "T-049 in Phase 2"
        }
    },
    {
        "id": "gift-course",
        "name": "Gift Course",
        "phase": "Phase 2",
        "status": "planned",
        "saas_implementation": "Build gift course feature — user purchases a course for someone else. New collection: course_gifts. Backend: /api/gifts/* CRUD. Frontend: gift purchase flow, gift redemption page.",
        "impact": {
            "collections": ["course_gifts", "gift_redemptions"],
            "endpoints": ["POST /api/gifts", "GET /api/gifts/:id", "POST /api/gifts/:id/redeem"],
            "events": ["gift.purchased", "gift.redeemed", "gift.expired"],
            "settings": ["gift_enabled", "gift_expiry_days"],
            "email_triggers": ["gift_sent", "gift_received", "gift_redeemed", "gift_expired"],
            "tickets": ["T-050"],
            "screens": ["gift-purchase", "gift-redeem"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 2 new collections (85 → 87)",
            "API Reference": "Add 3 new /api/gifts/* endpoints",
            "Events": "Add 3 new gift events",
            "Email Triggers": "Add 4 new gift email triggers",
            "Tickets": "T-050 in Phase 2"
        }
    },
    {
        "id": "admin-panel",
        "name": "Admin Panel",
        "phase": "Phase 0",
        "status": "done",
        "saas_implementation": "LastSaaS already provides the admin panel: courses, categories, tags, students, instructors, announcements, Q&A, quiz attempts, tutor themes, addons, tools, pro license. These are the lastsaas /admin/* routes. LMS-specific admin pages (courses, students, instructors) added in Phase 1.",
        "impact": {
            "collections": ["users", "tenants", "config", "admin_logs"],
            "endpoints": ["GET /api/admin/users", "GET /api/admin/tenants", "GET /api/admin/config", "GET /api/admin/logs"],
            "events": ["admin.action.performed", "config.updated"],
            "settings": [],
            "email_triggers": [],
            "tickets": ["T-004", "T-005", "T-006"],
            "screens": ["admin-courses", "admin-categories", "admin-tags", "admin-students", "admin-instructors", "admin-announcements", "admin-qa", "admin-quiz-attempts", "admin-tools"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "No change — admin uses existing collections",
            "API Reference": "No change — admin endpoints already exist in lastsaas",
            "Tickets": "T-004 through T-006 marked DONE (Phase 0)",
            "Build Roadmap": "Phase 0 — 100% complete"
        }
    },
    {
        "id": "tutor-lms-settings",
        "name": "Tutor LMS Settings",
        "phase": "Phase 0",
        "status": "done",
        "saas_implementation": "Map Tutor LMS's 66 settings to lastsaas config store. lastsaas already has a config store with dynamic reloading from MongoDB. LMS-specific settings (course monetization, design, advanced, legal consents, gradebook, email, notifications, authentication, certificate, accessibility, license) added as config keys.",
        "impact": {
            "collections": ["config"],
            "endpoints": ["GET /api/config", "PATCH /api/config"],
            "events": ["config.updated"],
            "settings": ["ALL 66 Tutor LMS settings mapped to lastsaas config keys"],
            "email_triggers": [],
            "tickets": ["T-007", "T-008", "T-009"],
            "screens": ["settings-general", "settings-monetization", "settings-design", "settings-advanced", "settings-legal", "settings-gradebook", "settings-email", "settings-notifications", "settings-authentication", "settings-certificate", "settings-accessibility"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Settings": "All 66 Tutor LMS settings catalogued. Each maps to a lastsaas config key. 11 settings pages built (one per category).",
            "Data Model": "No change — config collection already exists",
            "Tickets": "T-007 through T-009 marked DONE (Phase 0)",
            "Build Roadmap": "Phase 0 — 100% complete"
        }
    },
    {
        "id": "tutor-lms-addons",
        "name": "Tutor LMS Addons",
        "phase": "Phase 3",
        "status": "planned",
        "saas_implementation": "Build the 21 Tutor LMS addons as feature flags in lastsaas. Each addon is a feature flag + a package of code (collections + endpoints + events + frontend). Addons: Course Preview, Prerequisites, Attachments, Content Drip, Assignments, Email, Reports, Social Login, Notifications, Gradebook, Certificate, Multi Instructors, Calendar, Google Meet, Google Classroom, Zoom, H5P, WPML, BuddyPress, WooCommerce Subscriptions, Paid Memberships Pro.",
        "impact": {
            "collections": ["addon_configs", "feature_flags"],
            "endpoints": ["GET /api/addons", "POST /api/addons/:id/enable", "POST /api/addons/:id/disable"],
            "events": ["addon.enabled", "addon.disabled"],
            "settings": ["addon_course_preview_enabled", "addon_prerequisites_enabled", "addon_content_drip_enabled", "addon_assignments_enabled", "addon_email_enabled", "addon_reports_enabled", "addon_social_login_enabled", "addon_notifications_enabled", "addon_gradebook_enabled", "addon_certificate_enabled", "addon_multi_instructors_enabled", "addon_calendar_enabled", "addon_google_meet_enabled", "addon_google_classroom_enabled", "addon_zoom_enabled", "addon_h5p_enabled", "addon_wpml_enabled", "addon_buddypress_enabled", "addon_wc_subscriptions_enabled", "addon_pmpro_enabled"],
            "email_triggers": [],
            "tickets": ["T-066", "T-067", "T-068", "T-069", "T-070", "T-071", "T-072", "T-073", "T-074", "T-075", "T-076", "T-077", "T-078", "T-079", "T-080", "T-081", "T-082", "T-083", "T-084", "T-085", "T-086"],
            "screens": ["addon-list", "addon-settings-course-preview", "addon-settings-prerequisites", "addon-settings-content-drip", "addon-settings-assignments", "addon-settings-email", "addon-settings-reports", "addon-settings-social-login", "addon-settings-notifications", "addon-settings-gradebook", "addon-settings-certificate", "addon-settings-multi-instructors", "addon-settings-calendar", "addon-settings-google-meet", "addon-settings-google-classroom", "addon-settings-zoom", "addon-settings-h5p", "addon-settings-wpml", "addon-settings-buddypress", "addon-settings-wc-subscriptions", "addon-settings-pmpro"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 2 new collections: addon_configs, feature_flags (87 → 89)",
            "API Reference": "Add 3 new /api/addons/* endpoints",
            "Events": "Add 2 new addon events",
            "Settings": "21 new feature flag settings (one per addon)",
            "Tickets": "T-066 through T-086 (21 tickets) in Phase 3-4",
            "Build Roadmap": "Phase 3-4 (Pro Authoring + Pro Engagement) — addons built incrementally"
        }
    },
    {
        "id": "certificate-builder",
        "name": "Certificate Builder",
        "phase": "Phase 3",
        "status": "planned",
        "saas_implementation": "Build a visual certificate design canvas using react-konva. Instructors design certificate templates (backdrops, layers, media library, text). Students receive certificates on course completion. New collection: certificates, certificate_templates. Backend: /api/certificates/* CRUD.",
        "impact": {
            "collections": ["certificates", "certificate_templates", "certificate_layers"],
            "endpoints": ["GET /api/certificates", "POST /api/certificates", "GET /api/certificates/:id", "PATCH /api/certificates/:id", "DELETE /api/certificates/:id", "POST /api/certificates/:id/duplicate", "GET /api/certificates/:id/preview", "POST /api/courses/:id/certificate/assign"],
            "events": ["certificate.created", "certificate.updated", "certificate.assigned", "certificate.downloaded"],
            "settings": ["certificate_enabled", "certificate_default_template"],
            "email_triggers": ["certificate_earned", "certificate_downloaded"],
            "tickets": ["T-063"],
            "screens": ["certificate-builder-canvas", "certificate-templates", "certificate-backdrops", "certificate-layers", "certificate-media-library", "certificate-keyboard-shortcuts"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 3 new collections (89 → 92)",
            "API Reference": "Add 8 new /api/certificates/* endpoints",
            "Events": "Add 4 new certificate events",
            "Email Triggers": "Add 2 new certificate email triggers",
            "Tickets": "T-063 in Phase 3",
            "Frontend Apps": "Certificate Builder app — planned (next after Course Builder)",
            "Screen Inventory": "6 new certificate builder screens"
        }
    },
    {
        "id": "integrations",
        "name": "Integrations",
        "phase": "Phase 4",
        "status": "planned",
        "saas_implementation": "Build third-party integrations: WooCommerce (already have Stripe), Easy Digital Downloads, Kadence Memberships, BunnyNet (video CDN), Loco Translate. Each integration = a config screen + webhook handlers. Backend: /api/integrations/* CRUD.",
        "impact": {
            "collections": ["integration_configs", "integration_logs"],
            "endpoints": ["GET /api/integrations", "POST /api/integrations/:id/connect", "DELETE /api/integrations/:id/disconnect", "POST /api/integrations/:id/webhook"],
            "events": ["integration.connected", "integration.disconnected", "integration.webhook.received"],
            "settings": ["integration_woocommerce_enabled", "integration_edd_enabled", "integration_kadence_enabled", "integration_bunnynet_enabled", "integration_loco_enabled"],
            "email_triggers": [],
            "tickets": ["T-087", "T-088", "T-089"],
            "screens": ["integration-list", "integration-woocommerce", "integration-edd", "integration-kadence", "integration-bunnynet", "integration-loco"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 2 new collections (92 → 94)",
            "API Reference": "Add 4 new /api/integrations/* endpoints",
            "Events": "Add 3 new integration events",
            "Tickets": "T-087 through T-089 in Phase 4"
        }
    },
    {
        "id": "elementor-integration",
        "name": "Elementor Integration",
        "phase": "skipped",
        "status": "skipped",
        "saas_implementation": "SKIP — Elementor is a WordPress page builder plugin. Our SaaS uses tailux (React), not WordPress. No equivalent needed. The 38 Elementor doc pages are reference-only for understanding Tutor LMS's WordPress-specific widgets.",
        "impact": {
            "collections": [],
            "endpoints": [],
            "events": [],
            "settings": [],
            "email_triggers": [],
            "tickets": [],
            "screens": [],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Note": "SKIPPED — WordPress-specific, no SaaS equivalent. tailux replaces Elementor.",
            "Screen Inventory": "38 Elementor screens marked as 'skipped' (WordPress-only)"
        }
    },
    {
        "id": "divi-integration",
        "name": "Divi Integration",
        "phase": "skipped",
        "status": "skipped",
        "saas_implementation": "SKIP — Divi is a WordPress page builder. Same as Elementor. No SaaS equivalent needed.",
        "impact": {
            "collections": [],
            "endpoints": [],
            "events": [],
            "settings": [],
            "email_triggers": [],
            "tickets": [],
            "screens": [],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Note": "SKIPPED — WordPress-specific, no SaaS equivalent.",
            "Screen Inventory": "29 Divi screens marked as 'skipped'"
        }
    },
    {
        "id": "oxygen-builder-integration",
        "name": "Oxygen Builder Integration",
        "phase": "skipped",
        "status": "skipped",
        "saas_implementation": "SKIP — Oxygen is a WordPress page builder. Same as Elementor/Divi. No SaaS equivalent needed.",
        "impact": {
            "collections": [],
            "endpoints": [],
            "events": [],
            "settings": [],
            "email_triggers": [],
            "tickets": [],
            "screens": [],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Note": "SKIPPED — WordPress-specific, no SaaS equivalent.",
            "Screen Inventory": "12 Oxygen screens marked as 'skipped'"
        }
    },
    {
        "id": "tutorials",
        "name": "Tutorials",
        "phase": "reference",
        "status": "reference",
        "saas_implementation": "REFERENCE ONLY — 33 tutorial pages (Frontend Course Creation, Enabling Q&A, Translating, Instructor Signup, Student Signup, Guest Purchase, etc.). These are how-to guides for end users, not implementation specs. Use as UX reference for our help docs.",
        "impact": {
            "collections": [],
            "endpoints": [],
            "events": [],
            "settings": [],
            "email_triggers": [],
            "tickets": [],
            "screens": [],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Note": "REFERENCE ONLY — used for UX patterns and help documentation, not direct implementation."
        }
    },
    {
        "id": "migration",
        "name": "Migration",
        "phase": "Phase 5",
        "status": "planned",
        "saas_implementation": "Build migration tools: WooCommerce to Tutor LMS, LearnDash to Tutor LMS, LifterLMS to Tutor LMS, LearnPress to Tutor LMS. Since we're building a new SaaS (not migrating from WordPress), this becomes an IMPORT tool for customers coming from other LMS platforms. New collection: migrations. Backend: /api/migrations/* CRUD.",
        "impact": {
            "collections": ["migrations", "migration_logs"],
            "endpoints": ["POST /api/migrations", "GET /api/migrations", "GET /api/migrations/:id", "POST /api/migrations/:id/start", "POST /api/migrations/:id/cancel"],
            "events": ["migration.started", "migration.completed", "migration.failed"],
            "settings": ["migration_max_courses", "migration_batch_size"],
            "email_triggers": ["migration_completed", "migration_failed"],
            "tickets": ["T-095", "T-096"],
            "screens": ["migration-list", "migration-woocommerce", "migration-learndash", "migration-lifterlms", "migration-learnpress"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 2 new collections (94 → 96)",
            "API Reference": "Add 5 new /api/migrations/* endpoints",
            "Events": "Add 3 new migration events",
            "Email Triggers": "Add 2 new migration email triggers",
            "Tickets": "T-095, T-096 in Phase 5"
        }
    },
    {
        "id": "tutor-lms-shortcodes",
        "name": "Tutor LMS Shortcodes",
        "phase": "skipped",
        "status": "skipped",
        "saas_implementation": "SKIP — WordPress shortcodes are WordPress-specific. Our SaaS uses React components instead. The shortcode functionality (embedding courses, dashboards, etc.) is replaced by tailux page routes.",
        "impact": {
            "collections": [],
            "endpoints": [],
            "events": [],
            "settings": [],
            "email_triggers": [],
            "tickets": [],
            "screens": [],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Note": "SKIPPED — WordPress shortcodes replaced by tailux React routes."
        }
    },
    {
        "id": "advanced-customization",
        "name": "Advanced Customization",
        "phase": "Phase 5",
        "status": "planned",
        "saas_implementation": "Build customization tools: override templates (tailux theme system), edit dashboard, add course levels, auto-approve instructors, add custom registration fields, disable WP cron for mailing (use lastsaas jobs runner instead).",
        "impact": {
            "collections": ["theme_overrides", "custom_fields"],
            "endpoints": ["GET /api/customization", "PATCH /api/customization", "POST /api/customization/fields", "GET /api/customization/fields"],
            "events": ["customization.updated", "custom_field.created"],
            "settings": ["custom_course_levels", "auto_approve_instructors", "custom_registration_fields"],
            "email_triggers": [],
            "tickets": ["T-097"],
            "screens": ["customization-templates", "customization-dashboard", "customization-course-levels", "customization-registration-fields"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 2 new collections (96 → 98)",
            "API Reference": "Add 4 new /api/customization/* endpoints",
            "Tickets": "T-097 in Phase 5"
        }
    },
    {
        "id": "troubleshooting",
        "name": "Troubleshooting",
        "phase": "reference",
        "status": "reference",
        "saas_implementation": "REFERENCE ONLY — 8 troubleshooting pages (order not completed, 404 error, certificate emails not sent, nonce mismatch, can't create quiz options, Yoast/RankMath issue). Use as QA checklist for our SaaS testing.",
        "impact": {
            "collections": [],
            "endpoints": [],
            "events": [],
            "settings": [],
            "email_triggers": [],
            "tickets": [],
            "screens": [],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Note": "REFERENCE ONLY — used as QA checklist for testing."
        }
    },
    {
        "id": "developer-guides",
        "name": "Developer Guides",
        "phase": "Phase 5",
        "status": "planned",
        "saas_implementation": "Build developer-facing API: action hooks (lastsaas events), filter hooks (lastsaas middleware), REST API (already have /api/*), custom payment gateways (PaymentGateway interface), custom fields in course builder. This is the public API documentation for SaaS customers who want to extend the platform.",
        "impact": {
            "collections": ["api_keys", "webhook_endpoints"],
            "endpoints": ["GET /api/dev/hooks", "GET /api/dev/filters", "GET /api/dev/rest-api", "POST /api/dev/api-keys", "GET /api/dev/api-keys", "DELETE /api/dev/api-keys/:id", "POST /api/dev/webhooks", "GET /api/dev/webhooks"],
            "events": [],
            "settings": ["dev_api_enabled", "dev_webhooks_enabled"],
            "email_triggers": [],
            "tickets": ["T-098", "T-099", "T-100"],
            "screens": ["dev-hooks", "dev-filters", "dev-rest-api", "dev-api-keys", "dev-webhooks"],
            "quiz_types": [],
            "gateways": []
        },
        "sidebar_effects": {
            "Data Model": "Add 2 new collections (98 → 100 total — matches our target of ~100 collections)",
            "API Reference": "Add 8 new /api/dev/* endpoints (172 Tutor endpoints → all mapped)",
            "Events": "All 480 Tutor events mapped to lastsaas event system",
            "Tickets": "T-098 through T-100 (final 3 tickets) in Phase 5",
            "Build Roadmap": "Phase 5 — 100% complete (launch ready)"
        }
    }
]


def main():
    nav = json.loads(NAV_FILE.read_text())

    # Merge nav data (doc counts, order) with our SECTIONS_PLAN
    nav_sections = {s["name"]: s for s in nav["sections"]}
    sections = []
    for plan in SECTIONS_PLAN:
        nav_info = nav_sections.get(plan["name"], {})
        sections.append({
            **plan,
            "doc_count": nav_info.get("link_count", 0),
            "nav_order": nav_info.get("order", 0),
        })

    # Calculate summary
    status_counts = {"done": 0, "in-progress": 0, "planned": 0, "skipped": 0, "reference": 0}
    phase_counts = {}
    total_collections = 0
    total_endpoints = 0
    total_events = 0
    total_settings = 0
    total_emails = 0
    total_tickets = 0
    total_screens = 0
    total_quiz_types = 0
    total_gateways = 0

    for s in sections:
        status_counts[s["status"]] = status_counts.get(s["status"], 0) + 1
        phase_counts[s["phase"]] = phase_counts.get(s["phase"], 0) + 1
        impact = s.get("impact", {})
        total_collections += len(impact.get("collections", []))
        total_endpoints += len(impact.get("endpoints", []))
        total_events += len(impact.get("events", []))
        total_settings += len(impact.get("settings", []))
        total_emails += len(impact.get("email_triggers", []))
        total_tickets += len(impact.get("tickets", []))
        total_screens += len(impact.get("screens", []))
        total_quiz_types += len(impact.get("quiz_types", []))
        total_gateways += len(impact.get("gateways", []))

    # Calculate overall progress
    # done = 100%, in-progress = 50%, planned = 0%, skipped/reference = N/A
    actionable = status_counts["done"] + status_counts["in-progress"] + status_counts["planned"]
    if actionable > 0:
        overall = (status_counts["done"] * 100 + status_counts["in-progress"] * 50) / actionable
    else:
        overall = 0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Maps each of the 27 Tutor LMS docs sections (the compendium) to its SaaS implementation plan, showing exactly what changes across every sidebar item.",
        "total_sections": len(sections),
        "summary": {
            "status_counts": status_counts,
            "phase_counts": phase_counts,
            "overall_progress": round(overall, 1),
            "totals": {
                "collections_to_build": total_collections,
                "endpoints_to_build": total_endpoints,
                "events_to_build": total_events,
                "settings_to_build": total_settings,
                "email_triggers_to_build": total_emails,
                "tickets": total_tickets,
                "screens_to_build": total_screens,
                "quiz_types": total_quiz_types,
                "gateways": total_gateways
            }
        },
        "sections": sections,
    }

    OUT_FILE.write_text(json.dumps(payload, indent=2))
    print(f"Generated compendium → SaaS plan: {len(sections)} sections")
    print(f"Status: {status_counts}")
    print(f"Overall progress: {overall:.1f}%")
    print(f"Totals: {payload['summary']['totals']}")
    print(f"Output: {OUT_FILE}")


if __name__ == "__main__":
    main()
