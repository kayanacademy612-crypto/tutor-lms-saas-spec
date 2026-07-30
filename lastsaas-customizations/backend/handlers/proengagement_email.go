package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// ProEngagementEmailHandler — Phase 5 email template + placeholder endpoints
//
// Mounted under /api/lms/email-templates/* and /api/lms/email-placeholders.
// Replaces the HTTP 501 stubs that the Phase 5 router would otherwise expose
// for tenant-customisable transactional email templates.
//
// Covers:
//   - Email templates: list (with trigger/language filters), get, update,
//     reset-to-default, preview-with-sample-data.
//   - Email placeholders: list-by-trigger (the catalogue surfaced in the
//     template editor's "Insert placeholder" UI).
//
// The catalogue of default templates is shipped with the platform and seeded
// lazily into each tenant's lms_email_templates collection on first
// ListEmailTemplates call. The seeding is idempotent: it only inserts when the
// tenant has zero templates, so subsequent edits by the tenant are preserved.
//
// All tenant-scoped queries filter by tenantId. All endpoints reuse
// getLMSContext (defined in lms.go) for tenant/user resolution, including the
// dev fallback that pins requests to the default tenant + user.
// ---------------------------------------------------------------------------

// ProEngagementEmailHandler implements the Phase 5 email template endpoints.
type ProEngagementEmailHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProEngagementEmailHandler constructs a ProEngagementEmailHandler bound
// to the supplied MongoDB connection and event emitter.
func NewProEngagementEmailHandler(database *db.MongoDB, emitter events.Emitter) *ProEngagementEmailHandler {
	return &ProEngagementEmailHandler{db: database, emitter: emitter}
}

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks a
// usable tenant or authenticated user.
func (h *ProEngagementEmailHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
	ctx, ok := getLMSContext(r)
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context required")
		return lmsContext{}, false
	}
	if ctx.UserID.IsZero() {
		respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return lmsContext{}, false
	}
	return ctx, true
}

// ===========================================================================
// Default email templates + placeholder catalogue
// ===========================================================================

// defaultEmailTemplateSeed is the platform-supplied default content for a
// single transactional email trigger. BodyHTML uses {placeholder} tokens that
// PreviewEmailTemplate substitutes at render time.
type defaultEmailTemplateSeed struct {
	Trigger  string
	Subject  string
	BodyHTML string
	BodyText string
}

// defaultEmailPlaceholderSeed documents one {placeholder} token that may
// appear in a given trigger's template body.
type defaultEmailPlaceholderSeed struct {
	Trigger     string
	Key         string
	Description string
	Example     string
}

// defaultEmailTemplates is the catalogue of platform-supplied transactional
// email templates. Each entry ships with IsDefault=true, IsActive=true, and
// Language="en" — seeded lazily into each tenant's collection on first
// ListEmailTemplates call.
//
// The list covers 31 triggers spanning ecommerce, course delivery,
// gamification, subscriptions, memberships, gifting, auth, instructor
// notifications, and dunning flows. BodyHTML strings use {snake_case}
// placeholders that the live email dispatcher will replace with real values
// at send time.
var defaultEmailTemplates = []defaultEmailTemplateSeed{
	// --- Ecommerce ---
	{
		Trigger: "order_confirmation",
		Subject: "Order confirmed — {order_id}",
		BodyHTML: `<h1>Thanks for your order, {student_name}!</h1>
<p>Your order <strong>{order_id}</strong> for <strong>{order_total} {currency}</strong> has been confirmed.</p>
<p>You can review your receipt here: {order_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Thanks for your order, {student_name}!\n\nYour order {order_id} for {order_total} {currency} has been confirmed.\nReceipt: {order_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "order_cancelled",
		Subject: "Order {order_id} has been cancelled",
		BodyHTML: `<h1>Order {order_id} cancelled</h1>
<p>Hi {student_name},</p>
<p>Your order <strong>{order_id}</strong> has been cancelled. Any charges will be refunded within 3-5 business days.</p>
<p>Questions? Reply to this email or contact {support_email}.</p>
<p>— {tenant_name}</p>`,
		BodyText: "Order {order_id} cancelled\n\nHi {student_name},\n\nYour order {order_id} has been cancelled. Any charges will be refunded within 3-5 business days.\nQuestions? Contact {support_email}.\n\n— {tenant_name}",
	},
	{
		Trigger: "refund_processed",
		Subject: "Refund processed for {order_id}",
		BodyHTML: `<h1>Refund of {refund_amount} {currency}</h1>
<p>Hi {student_name},</p>
<p>A refund of <strong>{refund_amount} {currency}</strong> for order <strong>{order_id}</strong> has been processed. It should appear on your original payment method within 5-10 business days.</p>
<p>— {tenant_name}</p>`,
		BodyText: "Refund of {refund_amount} {currency}\n\nHi {student_name},\n\nA refund of {refund_amount} {currency} for order {order_id} has been processed. It should appear on your original payment method within 5-10 business days.\n\n— {tenant_name}",
	},
	{
		Trigger: "payment_failed",
		Subject: "Payment failed for order {order_id}",
		BodyHTML: `<h1>Payment failed</h1>
<p>Hi {student_name},</p>
<p>We couldn't process your payment of <strong>{order_total} {currency}</strong> for order <strong>{order_id}</strong>.</p>
<p>Please update your payment method or retry: {retry_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Payment failed\n\nHi {student_name},\n\nWe couldn't process your payment of {order_total} {currency} for order {order_id}.\nPlease update your payment method or retry: {retry_url}\n\n— {tenant_name}",
	},

	// --- Course / Enrollment ---
	{
		Trigger: "course_published",
		Subject: "New course: {course_title}",
		BodyHTML: `<h1>New course available</h1>
<p>Hi {student_name},</p>
<p>A new course just went live: <strong>{course_title}</strong>.</p>
<p>Check it out: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "New course available\n\nHi {student_name},\n\nA new course just went live: {course_title}.\nCheck it out: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "enrollment_created",
		Subject: "You're enrolled in {course_title}",
		BodyHTML: `<h1>Welcome to {course_title}</h1>
<p>Hi {student_name},</p>
<p>You're now enrolled in <strong>{course_title}</strong> by {instructor_name}.</p>
<p>Start learning: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Welcome to {course_title}\n\nHi {student_name},\n\nYou're now enrolled in {course_title} by {instructor_name}.\nStart learning: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "enrollment_completed",
		Subject: "Congratulations on completing {course_title}!",
		BodyHTML: `<h1>Course complete!</h1>
<p>Hi {student_name},</p>
<p>You've finished <strong>{course_title}</strong>. Great work!</p>
<p>Your certificate (if applicable) is available here: {certificate_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Course complete!\n\nHi {student_name},\n\nYou've finished {course_title}. Great work!\nCertificate: {certificate_url}\n\n— {tenant_name}",
	},

	// --- Lessons / Quizzes ---
	{
		Trigger: "lesson_completed",
		Subject: "Lesson complete: {lesson_title}",
		BodyHTML: `<h1>Lesson complete</h1>
<p>Hi {student_name},</p>
<p>You finished <strong>{lesson_title}</strong> in {course_title}. Keep it up!</p>
<p>Continue: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Lesson complete\n\nHi {student_name},\n\nYou finished {lesson_title} in {course_title}. Keep it up!\nContinue: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "quiz_passed",
		Subject: "Quiz passed: {quiz_title}",
		BodyHTML: `<h1>Quiz passed!</h1>
<p>Hi {student_name},</p>
<p>You passed <strong>{quiz_title}</strong> with a score of <strong>{score}</strong>.</p>
<p>Next up: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Quiz passed!\n\nHi {student_name},\n\nYou passed {quiz_title} with a score of {score}.\nNext up: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "quiz_failed",
		Subject: "Quiz attempt: {quiz_title}",
		BodyHTML: `<h1>Quiz attempt</h1>
<p>Hi {student_name},</p>
<p>You scored <strong>{score}</strong> on <strong>{quiz_title}</strong>. You can retake it any time.</p>
<p>Review the material: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Quiz attempt\n\nHi {student_name},\n\nYou scored {score} on {quiz_title}. You can retake it any time.\nReview the material: {course_url}\n\n— {tenant_name}",
	},

	// --- Certificates ---
	{
		Trigger: "certificate_earned",
		Subject: "Your certificate for {course_title}",
		BodyHTML: `<h1>Certificate earned!</h1>
<p>Hi {student_name},</p>
<p>You've earned a certificate for <strong>{course_title}</strong>.</p>
<p>Certificate #: {certificate_number}</p>
<p>Download: {certificate_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Certificate earned!\n\nHi {student_name},\n\nYou've earned a certificate for {course_title}.\nCertificate #: {certificate_number}\nDownload: {certificate_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "certificate_downloaded",
		Subject: "Certificate downloaded: {certificate_number}",
		BodyHTML: `<h1>Certificate downloaded</h1>
<p>Hi {student_name},</p>
<p>Your certificate <strong>{certificate_number}</strong> for <strong>{course_title}</strong> has been downloaded.</p>
<p>Verification page: {certificate_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Certificate downloaded\n\nHi {student_name},\n\nYour certificate {certificate_number} for {course_title} has been downloaded.\nVerification page: {certificate_url}\n\n— {tenant_name}",
	},

	// --- Subscriptions ---
	{
		Trigger: "subscription_started",
		Subject: "Subscription active: {plan_name}",
		BodyHTML: `<h1>Subscription active</h1>
<p>Hi {student_name},</p>
<p>Your <strong>{plan_name}</strong> subscription is now active. Next renewal: {renewal_date}.</p>
<p>Manage subscription: {subscription_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Subscription active\n\nHi {student_name},\n\nYour {plan_name} subscription is now active. Next renewal: {renewal_date}.\nManage subscription: {subscription_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "subscription_renewed",
		Subject: "Subscription renewed: {plan_name}",
		BodyHTML: `<h1>Subscription renewed</h1>
<p>Hi {student_name},</p>
<p>Your <strong>{plan_name}</strong> subscription has been renewed. Next renewal: {renewal_date}.</p>
<p>Amount charged: {amount} {currency}</p>
<p>Manage subscription: {subscription_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Subscription renewed\n\nHi {student_name},\n\nYour {plan_name} subscription has been renewed. Next renewal: {renewal_date}.\nAmount charged: {amount} {currency}\nManage subscription: {subscription_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "subscription_cancelled",
		Subject: "Subscription cancelled: {plan_name}",
		BodyHTML: `<h1>Subscription cancelled</h1>
<p>Hi {student_name},</p>
<p>Your <strong>{plan_name}</strong> subscription has been cancelled. You'll retain access until {expiry_date}.</p>
<p>Manage subscription: {subscription_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Subscription cancelled\n\nHi {student_name},\n\nYour {plan_name} subscription has been cancelled. You'll retain access until {expiry_date}.\nManage subscription: {subscription_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "subscription_payment_failed",
		Subject: "Subscription payment failed: {plan_name}",
		BodyHTML: `<h1>Payment failed</h1>
<p>Hi {student_name},</p>
<p>We couldn't charge the card on file for your <strong>{plan_name}</strong> subscription.</p>
<p>Please update your payment method to avoid losing access: {retry_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Payment failed\n\nHi {student_name},\n\nWe couldn't charge the card on file for your {plan_name} subscription.\nPlease update your payment method to avoid losing access: {retry_url}\n\n— {tenant_name}",
	},

	// --- Memberships ---
	{
		Trigger: "membership_started",
		Subject: "Welcome to {membership_name}!",
		BodyHTML: `<h1>Welcome to {membership_name}</h1>
<p>Hi {student_name},</p>
<p>Your <strong>{membership_name}</strong> membership is now active. Enjoy your benefits!</p>
<p>Membership hub: {membership_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Welcome to {membership_name}\n\nHi {student_name},\n\nYour {membership_name} membership is now active. Enjoy your benefits!\nMembership hub: {membership_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "membership_cancelled",
		Subject: "Membership cancelled: {membership_name}",
		BodyHTML: `<h1>Membership cancelled</h1>
<p>Hi {student_name},</p>
<p>Your <strong>{membership_name}</strong> membership has been cancelled. You'll retain access until {expiry_date}.</p>
<p>— {tenant_name}</p>`,
		BodyText: "Membership cancelled\n\nHi {student_name},\n\nYour {membership_name} membership has been cancelled. You'll retain access until {expiry_date}.\n\n— {tenant_name}",
	},

	// --- Gifts ---
	{
		Trigger: "gift_sent",
		Subject: "Gift sent to {gift_recipient}",
		BodyHTML: `<h1>Gift sent</h1>
<p>Hi {student_name},</p>
<p>Your gift to <strong>{gift_recipient}</strong> has been sent. Redemption code: <strong>{gift_code}</strong>.</p>
<p>Gift details: {gift_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Gift sent\n\nHi {student_name},\n\nYour gift to {gift_recipient} has been sent. Redemption code: {gift_code}.\nGift details: {gift_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "gift_received",
		Subject: "You received a gift from {gift_sender}!",
		BodyHTML: `<h1>You got a gift!</h1>
<p>Hi {student_name},</p>
<p><strong>{gift_sender}</strong> sent you a gift. Redeem it with the code below:</p>
<p><strong>{gift_code}</strong></p>
<p>Redeem here: {gift_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "You got a gift!\n\nHi {student_name},\n\n{gift_sender} sent you a gift. Redeem it with the code below:\n{gift_code}\nRedeem here: {gift_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "gift_redeemed",
		Subject: "Gift redeemed: {gift_code}",
		BodyHTML: `<h1>Gift redeemed</h1>
<p>Hi {student_name},</p>
<p>Your gift code <strong>{gift_code}</strong> has been redeemed successfully. Enjoy!</p>
<p>— {tenant_name}</p>`,
		BodyText: "Gift redeemed\n\nHi {student_name},\n\nYour gift code {gift_code} has been redeemed successfully. Enjoy!\n\n— {tenant_name}",
	},

	// --- Auth ---
	{
		Trigger: "password_reset",
		Subject: "Reset your password",
		BodyHTML: `<h1>Reset your password</h1>
<p>Hi {student_name},</p>
<p>We received a request to reset your password. Click below to choose a new one:</p>
<p><a href="{reset_url}">Reset password</a></p>
<p>This link expires in 60 minutes. If you didn't request a reset, ignore this email.</p>
<p>— {tenant_name}</p>`,
		BodyText: "Reset your password\n\nHi {student_name},\n\nWe received a request to reset your password. Open the link below to choose a new one:\n{reset_url}\n\nThis link expires in 60 minutes. If you didn't request a reset, ignore this email.\n\n— {tenant_name}",
	},
	{
		Trigger: "email_verification",
		Subject: "Verify your email address",
		BodyHTML: `<h1>Verify your email</h1>
<p>Hi {student_name},</p>
<p>Confirm your email address to activate your account:</p>
<p><a href="{verification_url}">Verify email</a></p>
<p>This link expires in 24 hours.</p>
<p>— {tenant_name}</p>`,
		BodyText: "Verify your email\n\nHi {student_name},\n\nConfirm your email address to activate your account:\n{verification_url}\n\nThis link expires in 24 hours.\n\n— {tenant_name}",
	},
	{
		Trigger: "welcome",
		Subject: "Welcome to {tenant_name}!",
		BodyHTML: `<h1>Welcome, {student_name}!</h1>
<p>Thanks for joining <strong>{tenant_name}</strong>. We're excited to have you.</p>
<p>Browse courses: {courses_url}</p>
<p>Sign in: {login_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Welcome, {student_name}!\n\nThanks for joining {tenant_name}. We're excited to have you.\nBrowse courses: {courses_url}\nSign in: {login_url}\n\n— {tenant_name}",
	},

	// --- Instructor notifications ---
	{
		Trigger: "instructor_new_enrollment",
		Subject: "New enrollment in {course_title}",
		BodyHTML: `<h1>New enrollment</h1>
<p>Hi {instructor_name},</p>
<p><strong>{student_name}</strong> just enrolled in <strong>{course_title}</strong>.</p>
<p>View roster: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "New enrollment\n\nHi {instructor_name},\n\n{student_name} just enrolled in {course_title}.\nView roster: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "instructor_new_review",
		Subject: "New {review_rating}-star review for {course_title}",
		BodyHTML: `<h1>New review</h1>
<p>Hi {instructor_name},</p>
<p><strong>{student_name}</strong> left a <strong>{review_rating}-star</strong> review on <strong>{course_title}</strong>:</p>
<blockquote>{review_text}</blockquote>
<p>View reviews: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "New review\n\nHi {instructor_name},\n\n{student_name} left a {review_rating}-star review on {course_title}:\n\"{review_text}\"\n\nView reviews: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "instructor_new_qa",
		Subject: "New question on {course_title}",
		BodyHTML: `<h1>New question</h1>
<p>Hi {instructor_name},</p>
<p><strong>{student_name}</strong> asked a question on <strong>{course_title}</strong>:</p>
<blockquote>{question_text}</blockquote>
<p>Answer it: {course_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "New question\n\nHi {instructor_name},\n\n{student_name} asked a question on {course_title}:\n\"{question_text}\"\n\nAnswer it: {course_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "instructor_payout_processed",
		Subject: "Payout of {payout_amount} {currency} processed",
		BodyHTML: `<h1>Payout processed</h1>
<p>Hi {instructor_name},</p>
<p>A payout of <strong>{payout_amount} {currency}</strong> has been processed to your {payment_method} account.</p>
<p>Payout date: {payout_date}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Payout processed\n\nHi {instructor_name},\n\nA payout of {payout_amount} {currency} has been processed to your {payment_method} account.\nPayout date: {payout_date}\n\n— {tenant_name}",
	},
	{
		Trigger: "withdrawal_approved",
		Subject: "Withdrawal of {withdrawal_amount} {currency} approved",
		BodyHTML: `<h1>Withdrawal approved</h1>
<p>Hi {instructor_name},</p>
<p>Your withdrawal request of <strong>{withdrawal_amount} {currency}</strong> has been approved and is being sent to your {payment_method} account.</p>
<p>— {tenant_name}</p>`,
		BodyText: "Withdrawal approved\n\nHi {instructor_name},\n\nYour withdrawal request of {withdrawal_amount} {currency} has been approved and is being sent to your {payment_method} account.\n\n— {tenant_name}",
	},

	// --- Dunning / Cart ---
	{
		Trigger: "dunning_warning",
		Subject: "Action needed: payment for {plan_name} failed",
		BodyHTML: `<h1>Payment failed — action needed</h1>
<p>Hi {student_name},</p>
<p>We couldn't process your recurring payment for <strong>{plan_name}</strong>. Please update your payment method to keep your subscription active.</p>
<p>Update payment method: {retry_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Payment failed — action needed\n\nHi {student_name},\n\nWe couldn't process your recurring payment for {plan_name}. Please update your payment method to keep your subscription active.\nUpdate payment method: {retry_url}\n\n— {tenant_name}",
	},
	{
		Trigger: "cart_abandoned",
		Subject: "You left something in your cart",
		BodyHTML: `<h1>Still thinking it over?</h1>
<p>Hi {student_name},</p>
<p>You left <strong>{course_title}</strong> in your cart. Ready to start learning?</p>
<p>Resume checkout: {cart_url}</p>
<p>— {tenant_name}</p>`,
		BodyText: "Still thinking it over?\n\nHi {student_name},\n\nYou left {course_title} in your cart. Ready to start learning?\nResume checkout: {cart_url}\n\n— {tenant_name}",
	},
}

// defaultEmailPlaceholders is the catalogue of placeholder tokens surfaced in
// the template editor's "Insert placeholder" UI. Each (trigger, key) pair is
// seeded into the tenant's lms_email_placeholders collection alongside the
// template rows. The list intentionally covers the union of all tokens used
// across defaultEmailTemplates so the editor's picker stays in sync.
var defaultEmailPlaceholders = []defaultEmailPlaceholderSeed{
	// Common, applies to most triggers
	{Trigger: "*", Key: "student_name", Description: "Recipient student's full name", Example: "John Doe"},
	{Trigger: "*", Key: "tenant_name", Description: "Tenant / school display name", Example: "Acme Academy"},
	{Trigger: "*", Key: "support_email", Description: "Tenant support email address", Example: "support@acme.com"},
	{Trigger: "*", Key: "login_url", Description: "Platform login URL", Example: "https://acme.com/login"},

	// Ecommerce
	{Trigger: "order_confirmation", Key: "order_id", Description: "Order identifier", Example: "ORD-12345"},
	{Trigger: "order_confirmation", Key: "order_total", Description: "Order total amount", Example: "49.99"},
	{Trigger: "order_confirmation", Key: "currency", Description: "Order currency code", Example: "USD"},
	{Trigger: "order_confirmation", Key: "order_url", Description: "URL to view the order receipt", Example: "https://acme.com/orders/ORD-12345"},
	{Trigger: "order_cancelled", Key: "order_id", Description: "Order identifier", Example: "ORD-12345"},
	{Trigger: "refund_processed", Key: "refund_amount", Description: "Refunded amount", Example: "49.99"},
	{Trigger: "refund_processed", Key: "currency", Description: "Refund currency code", Example: "USD"},
	{Trigger: "refund_processed", Key: "order_id", Description: "Original order identifier", Example: "ORD-12345"},
	{Trigger: "payment_failed", Key: "order_id", Description: "Order identifier", Example: "ORD-12345"},
	{Trigger: "payment_failed", Key: "order_total", Description: "Failed charge amount", Example: "49.99"},
	{Trigger: "payment_failed", Key: "currency", Description: "Charge currency code", Example: "USD"},
	{Trigger: "payment_failed", Key: "retry_url", Description: "URL to retry the payment", Example: "https://acme.com/checkout/retry/ORD-12345"},

	// Course / Enrollment
	{Trigger: "course_published", Key: "course_title", Description: "Published course title", Example: "Go 101"},
	{Trigger: "course_published", Key: "course_url", Description: "URL to the course landing page", Example: "https://acme.com/courses/go-101"},
	{Trigger: "enrollment_created", Key: "course_title", Description: "Enrolled course title", Example: "Go 101"},
	{Trigger: "enrollment_created", Key: "instructor_name", Description: "Course instructor's name", Example: "Jane Instructor"},
	{Trigger: "enrollment_created", Key: "course_url", Description: "URL to start the course", Example: "https://acme.com/courses/go-101/learn"},
	{Trigger: "enrollment_completed", Key: "course_title", Description: "Completed course title", Example: "Go 101"},
	{Trigger: "enrollment_completed", Key: "certificate_url", Description: "URL to download the earned certificate (if any)", Example: "https://acme.com/certificates/CERT-202601-0001"},

	// Lessons / Quizzes
	{Trigger: "lesson_completed", Key: "lesson_title", Description: "Completed lesson title", Example: "Lesson 3: Variables"},
	{Trigger: "lesson_completed", Key: "course_title", Description: "Course the lesson belongs to", Example: "Go 101"},
	{Trigger: "lesson_completed", Key: "course_url", Description: "URL to continue the course", Example: "https://acme.com/courses/go-101/learn"},
	{Trigger: "quiz_passed", Key: "quiz_title", Description: "Quiz title", Example: "Variables Quiz"},
	{Trigger: "quiz_passed", Key: "score", Description: "Quiz score (percentage)", Example: "92%"},
	{Trigger: "quiz_passed", Key: "course_url", Description: "URL to continue the course", Example: "https://acme.com/courses/go-101/learn"},
	{Trigger: "quiz_failed", Key: "quiz_title", Description: "Quiz title", Example: "Variables Quiz"},
	{Trigger: "quiz_failed", Key: "score", Description: "Quiz score (percentage)", Example: "40%"},
	{Trigger: "quiz_failed", Key: "course_url", Description: "URL to review the course", Example: "https://acme.com/courses/go-101/learn"},

	// Certificates
	{Trigger: "certificate_earned", Key: "course_title", Description: "Course the certificate was issued for", Example: "Go 101"},
	{Trigger: "certificate_earned", Key: "certificate_number", Description: "Issued certificate number", Example: "CERT-202601-0001"},
	{Trigger: "certificate_earned", Key: "certificate_url", Description: "URL to download the certificate", Example: "https://acme.com/certificates/CERT-202601-0001"},
	{Trigger: "certificate_downloaded", Key: "certificate_number", Description: "Issued certificate number", Example: "CERT-202601-0001"},
	{Trigger: "certificate_downloaded", Key: "course_title", Description: "Course the certificate was issued for", Example: "Go 101"},
	{Trigger: "certificate_downloaded", Key: "certificate_url", Description: "URL to the verification page", Example: "https://acme.com/certificates/verify/CERT-202601-0001"},

	// Subscriptions
	{Trigger: "subscription_started", Key: "plan_name", Description: "Subscription plan name", Example: "Pro Monthly"},
	{Trigger: "subscription_started", Key: "renewal_date", Description: "Next renewal date", Example: "2026-08-29"},
	{Trigger: "subscription_started", Key: "subscription_url", Description: "URL to manage the subscription", Example: "https://acme.com/account/subscriptions"},
	{Trigger: "subscription_renewed", Key: "plan_name", Description: "Renewed plan name", Example: "Pro Monthly"},
	{Trigger: "subscription_renewed", Key: "renewal_date", Description: "Next renewal date", Example: "2026-09-29"},
	{Trigger: "subscription_renewed", Key: "amount", Description: "Charged amount", Example: "29.99"},
	{Trigger: "subscription_renewed", Key: "currency", Description: "Charge currency code", Example: "USD"},
	{Trigger: "subscription_renewed", Key: "subscription_url", Description: "URL to manage the subscription", Example: "https://acme.com/account/subscriptions"},
	{Trigger: "subscription_cancelled", Key: "plan_name", Description: "Cancelled plan name", Example: "Pro Monthly"},
	{Trigger: "subscription_cancelled", Key: "expiry_date", Description: "Date access expires", Example: "2026-09-29"},
	{Trigger: "subscription_cancelled", Key: "subscription_url", Description: "URL to manage the subscription", Example: "https://acme.com/account/subscriptions"},
	{Trigger: "subscription_payment_failed", Key: "plan_name", Description: "Subscription plan name", Example: "Pro Monthly"},
	{Trigger: "subscription_payment_failed", Key: "retry_url", Description: "URL to update payment method", Example: "https://acme.com/account/billing"},

	// Memberships
	{Trigger: "membership_started", Key: "membership_name", Description: "Membership tier name", Example: "VIP"},
	{Trigger: "membership_started", Key: "membership_url", Description: "URL to the membership hub", Example: "https://acme.com/membership"},
	{Trigger: "membership_cancelled", Key: "membership_name", Description: "Cancelled membership tier name", Example: "VIP"},
	{Trigger: "membership_cancelled", Key: "expiry_date", Description: "Date access expires", Example: "2026-09-29"},

	// Gifts
	{Trigger: "gift_sent", Key: "gift_recipient", Description: "Gift recipient's name", Example: "Jane Doe"},
	{Trigger: "gift_sent", Key: "gift_code", Description: "Gift redemption code", Example: "GIFT-ABCD-1234"},
	{Trigger: "gift_sent", Key: "gift_url", Description: "URL to gift details", Example: "https://acme.com/gifts/GIFT-ABCD-1234"},
	{Trigger: "gift_received", Key: "gift_sender", Description: "Gift sender's name", Example: "John Doe"},
	{Trigger: "gift_received", Key: "gift_code", Description: "Gift redemption code", Example: "GIFT-ABCD-1234"},
	{Trigger: "gift_received", Key: "gift_url", Description: "URL to redeem the gift", Example: "https://acme.com/gifts/redeem"},
	{Trigger: "gift_redeemed", Key: "gift_code", Description: "Redeemed gift code", Example: "GIFT-ABCD-1234"},

	// Auth
	{Trigger: "password_reset", Key: "reset_url", Description: "Time-limited password reset URL", Example: "https://acme.com/reset?token=abc"},
	{Trigger: "email_verification", Key: "verification_url", Description: "Time-limited email verification URL", Example: "https://acme.com/verify?token=abc"},
	{Trigger: "welcome", Key: "courses_url", Description: "URL to browse courses", Example: "https://acme.com/courses"},

	// Instructor
	{Trigger: "instructor_new_enrollment", Key: "instructor_name", Description: "Instructor's name", Example: "Jane Instructor"},
	{Trigger: "instructor_new_enrollment", Key: "student_name", Description: "Newly enrolled student's name", Example: "John Doe"},
	{Trigger: "instructor_new_enrollment", Key: "course_title", Description: "Course title", Example: "Go 101"},
	{Trigger: "instructor_new_enrollment", Key: "course_url", Description: "URL to the course roster", Example: "https://acme.com/courses/go-101/roster"},
	{Trigger: "instructor_new_review", Key: "instructor_name", Description: "Instructor's name", Example: "Jane Instructor"},
	{Trigger: "instructor_new_review", Key: "student_name", Description: "Reviewer's name", Example: "John Doe"},
	{Trigger: "instructor_new_review", Key: "course_title", Description: "Reviewed course title", Example: "Go 101"},
	{Trigger: "instructor_new_review", Key: "review_rating", Description: "Numeric rating 1-5", Example: "5"},
	{Trigger: "instructor_new_review", Key: "review_text", Description: "Student's review text", Example: "Loved it!"},
	{Trigger: "instructor_new_review", Key: "course_url", Description: "URL to course reviews", Example: "https://acme.com/courses/go-101/reviews"},
	{Trigger: "instructor_new_qa", Key: "instructor_name", Description: "Instructor's name", Example: "Jane Instructor"},
	{Trigger: "instructor_new_qa", Key: "student_name", Description: "Question author's name", Example: "John Doe"},
	{Trigger: "instructor_new_qa", Key: "course_title", Description: "Course title", Example: "Go 101"},
	{Trigger: "instructor_new_qa", Key: "question_text", Description: "Question text", Example: "How do I run this?"},
	{Trigger: "instructor_new_qa", Key: "course_url", Description: "URL to the Q&A thread", Example: "https://acme.com/courses/go-101/qa"},
	{Trigger: "instructor_payout_processed", Key: "instructor_name", Description: "Instructor's name", Example: "Jane Instructor"},
	{Trigger: "instructor_payout_processed", Key: "payout_amount", Description: "Payout amount", Example: "250.00"},
	{Trigger: "instructor_payout_processed", Key: "currency", Description: "Payout currency code", Example: "USD"},
	{Trigger: "instructor_payout_processed", Key: "payment_method", Description: "Payout destination (e.g. PayPal, bank)", Example: "PayPal"},
	{Trigger: "instructor_payout_processed", Key: "payout_date", Description: "Date the payout was processed", Example: "2026-07-29"},
	{Trigger: "withdrawal_approved", Key: "instructor_name", Description: "Instructor's name", Example: "Jane Instructor"},
	{Trigger: "withdrawal_approved", Key: "withdrawal_amount", Description: "Withdrawal amount", Example: "500.00"},
	{Trigger: "withdrawal_approved", Key: "currency", Description: "Withdrawal currency code", Example: "USD"},
	{Trigger: "withdrawal_approved", Key: "payment_method", Description: "Withdrawal destination (e.g. PayPal, bank)", Example: "Bank transfer"},

	// Dunning / Cart
	{Trigger: "dunning_warning", Key: "plan_name", Description: "Subscription plan name", Example: "Pro Monthly"},
	{Trigger: "dunning_warning", Key: "retry_url", Description: "URL to update payment method", Example: "https://acme.com/account/billing"},
	{Trigger: "cart_abandoned", Key: "course_title", Description: "Course left in the cart", Example: "Go 101"},
	{Trigger: "cart_abandoned", Key: "cart_url", Description: "URL to resume checkout", Example: "https://acme.com/cart"},
}

// SeedDefaultEmailTemplates populates the default email templates (and the
// companion placeholder catalogue) for the supplied tenant if none exist yet.
// The operation is idempotent: when the tenant already has at least one row in
// lms_email_templates, the function returns nil without modifying anything.
//
// This is the function the Phase 5 router/bootstrap code can call after a
// tenant is provisioned to ensure the template editor has rows to display.
// ListEmailTemplates also calls it lazily on first list to keep the editor
// self-bootstrapping even when explicit seeding was skipped.
func (h *ProEngagementEmailHandler) SeedDefaultEmailTemplates(ctx context.Context, tenantID primitive.ObjectID) error {
	if h.db == nil {
		return fmt.Errorf("SeedDefaultEmailTemplates: nil db handle")
	}
	if tenantID.IsZero() {
		return fmt.Errorf("SeedDefaultEmailTemplates: tenantID is zero")
	}

	// Idempotency guard: skip seeding entirely if the tenant already has any
	// template rows. This protects tenant customisations from being clobbered
	// by a stray re-seed.
	existing, err := h.db.EmailTemplates().CountDocuments(ctx, bson.M{"tenantId": tenantID})
	if err != nil {
		return fmt.Errorf("SeedDefaultEmailTemplates: count failed: %w", err)
	}
	if existing > 0 {
		return nil
	}

	now := time.Now().UTC()

	// Build the template rows.
	tplDocs := make([]interface{}, 0, len(defaultEmailTemplates))
	for _, seed := range defaultEmailTemplates {
		tplDocs = append(tplDocs, models.EmailTemplate{
			ID:        primitive.NewObjectID(),
			TenantID:  tenantID,
			Trigger:   seed.Trigger,
			Subject:   seed.Subject,
			BodyHTML:  seed.BodyHTML,
			BodyText:  seed.BodyText,
			IsDefault: true,
			IsActive:  true,
			Language:  "en",
			CreatedAt: now,
			UpdatedAt: now,
		})
	}
	if _, err := h.db.EmailTemplates().InsertMany(ctx, tplDocs); err != nil {
		return fmt.Errorf("SeedDefaultEmailTemplates: insert templates failed: %w", err)
	}

	// Build the placeholder rows. We don't fail if this insert errors — the
	// templates are the source of truth; placeholders are an editor affordance.
	phDocs := make([]interface{}, 0, len(defaultEmailPlaceholders))
	for _, ph := range defaultEmailPlaceholders {
		phDocs = append(phDocs, models.EmailPlaceholder{
			ID:          primitive.NewObjectID(),
			TenantID:    tenantID,
			Trigger:     ph.Trigger,
			Key:         ph.Key,
			Description: ph.Description,
			Example:     ph.Example,
		})
	}
	if _, err := h.db.EmailPlaceholders().InsertMany(ctx, phDocs); err != nil {
		// Non-fatal: log via event emitter best-effort but don't fail seeding.
		h.emitter.Emit(events.Event{
			Type:      events.EventEmailTemplateUpdated,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":         tenantID.Hex(),
				"seedPlaceholders": "failed",
				"error":            err.Error(),
			},
		})
	}

	return nil
}

// fillEmailTemplatePlaceholders replaces every {placeholder} token in the
// supplied text with the matching value from replacements. Unknown tokens are
// left in place so the editor can highlight them.
func fillEmailTemplatePlaceholders(text string, replacements map[string]string) string {
	if text == "" {
		return ""
	}
	out := text
	for key, val := range replacements {
		out = strings.ReplaceAll(out, "{"+key+"}", val)
	}
	return out
}

// ===========================================================================
// Email templates
// ===========================================================================

// ListEmailTemplates handles GET /api/lms/email-templates.
//
// Returns the tenant's email templates. Optional query params:
//   - trigger   — exact match on trigger name
//   - language  — exact match on language code
//
// On first call for a tenant that has no template rows, the platform defaults
// are seeded (see SeedDefaultEmailTemplates) so the response always contains
// at least the system-supplied set. Results are sorted by trigger asc.
func (h *ProEngagementEmailHandler) ListEmailTemplates(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	// Lazy seeding: if the tenant has zero templates at all, seed the platform
	// defaults before applying filters. This makes the editor
	// self-bootstrapping for fresh tenants.
	count, _ := h.db.EmailTemplates().CountDocuments(r.Context(), bson.M{"tenantId": ctx.TenantID})
	if count == 0 {
		if err := h.SeedDefaultEmailTemplates(r.Context(), ctx.TenantID); err != nil {
			// Seeding failed — log but continue with whatever we have (zero
			// rows) so the editor still loads instead of returning a 500.
			h.emitter.Emit(events.Event{
				Type:      events.EventEmailTemplateUpdated,
				Timestamp: time.Now().UTC(),
				Data: map[string]interface{}{
					"tenantId": ctx.TenantID.Hex(),
					"seed":     "failed",
					"error":    err.Error(),
				},
			})
		}
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if trigger := r.URL.Query().Get("trigger"); trigger != "" {
		filter["trigger"] = trigger
	}
	if lang := r.URL.Query().Get("language"); lang != "" {
		filter["language"] = lang
	}

	findOpts := options.Find().
		SetSort(bson.D{{Key: "trigger", Value: 1}, {Key: "language", Value: 1}})

	cursor, err := h.db.EmailTemplates().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch email templates")
		return
	}
	defer cursor.Close(r.Context())

	var templates []models.EmailTemplate
	if err := cursor.All(r.Context(), &templates); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode email templates")
		return
	}
	if templates == nil {
		templates = []models.EmailTemplate{}
	}
	total, _ := h.db.EmailTemplates().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"templates": templates,
		"total":     total,
	})
}

// GetEmailTemplate handles GET /api/lms/email-templates/{id}.
//
// Returns a single EmailTemplate scoped to the current tenant.
func (h *ProEngagementEmailHandler) GetEmailTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var tpl models.EmailTemplate
	if err := h.db.EmailTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&tpl); err != nil {
		respondWithError(w, http.StatusNotFound, "Email template not found")
		return
	}
	respondWithJSON(w, http.StatusOK, tpl)
}

// UpdateEmailTemplate handles PATCH /api/lms/email-templates/{id}.
//
// Body: { subject?, bodyHtml?, bodyText?, isActive? }. Updates the supplied
// writable fields, flips isDefault to false (the template is now customised),
// and emits EventEmailTemplateUpdated. Returns the updated template.
func (h *ProEngagementEmailHandler) UpdateEmailTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	// Template editing is admin/instructor-only — students cannot customise
	// the platform's transactional emails.
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to edit email templates")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var payload struct {
		Subject  *string `json:"subject"`
		BodyHTML *string `json:"bodyHtml"`
		BodyText *string `json:"bodyText"`
		IsActive *bool   `json:"isActive"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	setFields := bson.M{}
	if payload.Subject != nil {
		if strings.TrimSpace(*payload.Subject) == "" {
			respondWithError(w, http.StatusBadRequest, "subject must not be empty")
			return
		}
		setFields["subject"] = *payload.Subject
	}
	if payload.BodyHTML != nil {
		if strings.TrimSpace(*payload.BodyHTML) == "" {
			respondWithError(w, http.StatusBadRequest, "bodyHtml must not be empty")
			return
		}
		setFields["bodyHtml"] = *payload.BodyHTML
	}
	if payload.BodyText != nil {
		setFields["bodyText"] = *payload.BodyText
	}
	if payload.IsActive != nil {
		setFields["isActive"] = *payload.IsActive
	}
	if len(setFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No writable fields supplied")
		return
	}
	now := time.Now().UTC()
	setFields["isDefault"] = false // editing flips it from system-default to customised
	setFields["updatedAt"] = now

	if _, err := h.db.EmailTemplates().UpdateByID(r.Context(), id, bson.M{
		"$set": setFields,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update email template")
		return
	}

	var updated models.EmailTemplate
	if err := h.db.EmailTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&updated); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"id":        id.Hex(),
			"updatedAt": now,
		})
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventEmailTemplateUpdated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"templateId": id.Hex(),
			"trigger":    updated.Trigger,
			"updatedBy":  ctx.UserID.Hex(),
			"fields":     setFields,
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// ResetEmailTemplate handles POST /api/lms/email-templates/{id}/reset.
//
// Restores the template's subject/bodyHtml/bodyText to the platform default
// content for its trigger, flips isDefault back to true, and emits
// EventEmailTemplateUpdated. Returns the reset template.
func (h *ProEngagementEmailHandler) ResetEmailTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to reset email templates")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var tpl models.EmailTemplate
	if err := h.db.EmailTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&tpl); err != nil {
		respondWithError(w, http.StatusNotFound, "Email template not found")
		return
	}

	// Locate the default seed for this trigger. If the trigger isn't in the
	// catalogue (e.g. tenant-introduced custom trigger), fall back to clearing
	// the customized flag without touching the body.
	var seed *defaultEmailTemplateSeed
	for i := range defaultEmailTemplates {
		if defaultEmailTemplates[i].Trigger == tpl.Trigger {
			seed = &defaultEmailTemplates[i]
			break
		}
	}

	now := time.Now().UTC()
	setFields := bson.M{
		"isDefault": true,
		"updatedAt": now,
	}
	if seed != nil {
		setFields["subject"] = seed.Subject
		setFields["bodyHtml"] = seed.BodyHTML
		setFields["bodyText"] = seed.BodyText
	}

	if _, err := h.db.EmailTemplates().UpdateByID(r.Context(), id, bson.M{
		"$set": setFields,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to reset email template")
		return
	}

	// Re-read so we return the post-reset state.
	if err := h.db.EmailTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&tpl); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"id":        id.Hex(),
			"updatedAt": now,
			"isDefault": true,
		})
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventEmailTemplateUpdated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"templateId": id.Hex(),
			"trigger":    tpl.Trigger,
			"resetBy":    ctx.UserID.Hex(),
			"reset":      true,
		},
	})

	respondWithJSON(w, http.StatusOK, tpl)
}

// PreviewEmailTemplate handles POST /api/lms/email-templates/{id}/preview.
//
// Body: { data: { student_name: "John", course_title: "Go 101", ... } }.
// Loads the template, substitutes every {placeholder} token in subject/bodyHtml
// with the values from the request body's data map, and returns the rendered
// HTML as JSON: { html: "...", subject: "...", text: "..." }. Unknown tokens
// are left in place so the editor can highlight them.
func (h *ProEngagementEmailHandler) PreviewEmailTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var tpl models.EmailTemplate
	if err := h.db.EmailTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&tpl); err != nil {
		respondWithError(w, http.StatusNotFound, "Email template not found")
		return
	}

	var payload struct {
		Data map[string]string `json:"data"`
	}
	// Body is optional — empty data => render with tokens intact (useful for
	// previewing the raw template skeleton).
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if payload.Data == nil {
		payload.Data = map[string]string{}
	}

	renderedHTML := fillEmailTemplatePlaceholders(tpl.BodyHTML, payload.Data)
	renderedText := fillEmailTemplatePlaceholders(tpl.BodyText, payload.Data)
	renderedSubject := fillEmailTemplatePlaceholders(tpl.Subject, payload.Data)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"html":    renderedHTML,
		"subject": renderedSubject,
		"text":    renderedText,
	})
}

// ===========================================================================
// Email placeholders
// ===========================================================================

// ListEmailPlaceholders handles GET /api/lms/email-placeholders.
//
// Returns the placeholder catalogue for the supplied trigger
// (?trigger=order_confirmation). Trigger "*" entries (the common tokens like
// {student_name}) are always included. Sorted by key asc. If the tenant has
// not yet been seeded, the function seeds defaults lazily so the picker is
// always populated.
func (h *ProEngagementEmailHandler) ListEmailPlaceholders(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	// Lazy seed: same as ListEmailTemplates, ensure the catalogue exists.
	tplCount, _ := h.db.EmailTemplates().CountDocuments(r.Context(), bson.M{"tenantId": ctx.TenantID})
	if tplCount == 0 {
		if err := h.SeedDefaultEmailTemplates(r.Context(), ctx.TenantID); err != nil {
			h.emitter.Emit(events.Event{
				Type:      events.EventEmailTemplateUpdated,
				Timestamp: time.Now().UTC(),
				Data: map[string]interface{}{
					"tenantId": ctx.TenantID.Hex(),
					"seed":     "failed",
					"error":    err.Error(),
				},
			})
		}
	}

	trigger := r.URL.Query().Get("trigger")
	filter := bson.M{"tenantId": ctx.TenantID}
	if trigger != "" {
		// Match either the supplied trigger OR the wildcard "*" entries that
		// apply to all triggers.
		filter["trigger"] = bson.M{"$in": []string{trigger, "*"}}
	}

	findOpts := options.Find().
		SetSort(bson.D{{Key: "trigger", Value: 1}, {Key: "key", Value: 1}})

	cursor, err := h.db.EmailPlaceholders().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch email placeholders")
		return
	}
	defer cursor.Close(r.Context())

	var placeholders []models.EmailPlaceholder
	if err := cursor.All(r.Context(), &placeholders); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode email placeholders")
		return
	}
	if placeholders == nil {
		placeholders = []models.EmailPlaceholder{}
	}
	total, _ := h.db.EmailPlaceholders().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"placeholders": placeholders,
		"total":        total,
	})
}
