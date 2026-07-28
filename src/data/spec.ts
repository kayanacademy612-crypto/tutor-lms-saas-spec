// Spec data — typed and comprehensive but stable for compilation

export const specStats = {
  collections: 119, endpoints: 209, events: 175, tickets: 84,
  settings: 153, emailTriggers: 53, quizTypes: 13, gateways: 11,
  phases: 6, devDays: 137.5, calendarWeeks: 24, teamSize: 5,
}

export const navSections = [
  { id: 'overview', label: 'Overview', icon: 'BookOpen' },
  { id: 'collections', label: 'Data Model (119)', icon: 'Database' },
  { id: 'endpoints', label: 'API Reference (209)', icon: 'Code2' },
  { id: 'events', label: 'Events (175)', icon: 'Zap' },
  { id: 'phases', label: 'Build Roadmap (6)', icon: 'Map' },
  { id: 'tickets', label: 'Tickets (84)', icon: 'Ticket' },
  { id: 'quiz-types', label: 'Quiz Types (13)', icon: 'HelpCircle' },
  { id: 'gateways', label: 'Payment Gateways (11)', icon: 'CreditCard' },
  { id: 'settings', label: 'Settings (153)', icon: 'Settings' },
  { id: 'email-triggers', label: 'Email Triggers (53)', icon: 'Mail' },
  { id: 'mcp', label: 'MCP + API Access', icon: 'Plug' },
]

export const collectionSummaries = [
  { name: 'users', domain: 'identity', status: 'existing', fields: 12, description: 'User accounts with email, password, 2FA, preferences' },
  { name: 'tenants', domain: 'tenancy', status: 'extended', fields: 8, description: 'Tenant (school) with storefront_config, AI keys' },
  { name: 'course', domain: 'course', status: 'new', fields: 26, description: 'Core course entity with pricing, curriculum, ratings' },
  { name: 'course_topic', domain: 'course', status: 'new', fields: 7, description: 'Course section that groups lessons' },
  { name: 'lesson', domain: 'course', status: 'new', fields: 14, description: 'Lesson with 7 video source types, drip gating' },
  { name: 'quiz', domain: 'quiz', status: 'new', fields: 22, description: 'Quiz with 19+ settings, embedded questions' },
  { name: 'quiz_attempt', domain: 'quiz', status: 'new', fields: 8, description: 'Student quiz attempt with score' },
  { name: 'enrollment', domain: 'engagement', status: 'new', fields: 12, description: 'Student-course enrollment with progress' },
  { name: 'order', domain: 'ecommerce', status: 'new', fields: 18, description: 'Purchase order with payment status' },
  { name: 'coupon', domain: 'ecommerce', status: 'new', fields: 14, description: 'Coupon with 6 applies_to types' },
  { name: 'subscription_plan', domain: 'ecommerce', status: 'new', fields: 12, description: 'Recurring plan (course/bundle/category/full_site)' },
  { name: 'certificate_template', domain: 'pro', status: 'new', fields: 11, description: 'Visual certificate template with layers JSON' },
  { name: 'certificate', domain: 'pro', status: 'new', fields: 8, description: 'Issued certificate with PDF + verification hash' },
  { name: 'drip_rule', domain: 'pro', status: 'new', fields: 7, description: 'Content drip (4 types: schedule/prereq/days/sequence)' },
  { name: 'gamification_badge', domain: 'pro', status: 'new', fields: 6, description: 'Badge definitions with criteria' },
  { name: 'payment_gateway', domain: 'billing', status: 'new', fields: 5, description: 'Per-tenant gateway configs (11 gateways)' },
  { name: 'cart', domain: 'ecommerce', status: 'new', fields: 5, description: 'Shopping cart with items and coupon' },
  { name: 'revenue_ledger', domain: 'ecommerce', status: 'new', fields: 7, description: 'Double-entry revenue per instructor + platform' },
  { name: 'instructor', domain: 'pro', status: 'new', fields: 8, description: 'Instructor profile + payout config' },
  { name: 'course_instructor', domain: 'pro', status: 'new', fields: 5, description: 'N:N join with revenue_share_percent' },
]

export const endpointSamples = [
  { id: 'EP-001', method: 'GET', path: '/api/v1/lms/courses', name: 'List courses', auth: 'public', phase: 'Phase 1', desc: 'Browse published courses with filters' },
  { id: 'EP-002', method: 'GET', path: '/api/v1/lms/courses/{slug}', name: 'Get course detail', auth: 'public', phase: 'Phase 1', desc: 'Course detail with curriculum, instructors, reviews' },
  { id: 'EP-003', method: 'POST', path: '/api/v1/lms/instructor/courses', name: 'Create course', auth: 'instructor', phase: 'Phase 1', desc: 'Create a draft course' },
  { id: 'EP-004', method: 'POST', path: '/api/v1/lms/checkout', name: 'Create checkout', auth: 'student', phase: 'Phase 2', desc: 'Create Stripe/PayPal checkout session' },
  { id: 'EP-005', method: 'POST', path: '/api/v1/lms/ecommerce-webhook', name: 'Payment webhook', auth: 'webhook', phase: 'Phase 2', desc: 'Universal endpoint for all 11 gateways' },
  { id: 'EP-006', method: 'POST', path: '/api/v1/lms/student/lessons/{id}/complete', name: 'Mark lesson complete', auth: 'student', phase: 'Phase 1', desc: 'Server validates video % watched' },
  { id: 'EP-007', method: 'GET', path: '/api/v1/lms/certificates/verify/{hash}', name: 'Verify certificate', auth: 'public', phase: 'Phase 3', desc: 'Public certificate verification' },
  { id: 'EP-008', method: 'POST', path: '/api/v1/lms/instructor/ai/generate-course-outline', name: 'AI generate course', auth: 'instructor', phase: 'Phase 5', desc: 'OpenAI course outline generation' },
  { id: 'EP-009', method: 'GET', path: '/api/v1/storefront/config', name: 'Get storefront config', auth: 'public', phase: 'Phase 1', desc: 'Tenant theme tokens for SPA bootstrap' },
  { id: 'EP-010', method: 'GET', path: '/api/v1/lms/admin/reports/overview', name: 'Reports overview', auth: 'admin', phase: 'Phase 5', desc: 'KPIs: revenue, enrollments, completion' },
]

export const eventSamples = [
  { name: 'course.published', domain: 'Course', firedBy: 'course service', subscribers: ['notification', 'search', 'webhook'], tutorHook: 'tutor_save_course_after' },
  { name: 'lesson.completed', domain: 'Lesson', firedBy: 'enrollment service', subscribers: ['gamification', 'drip', 'certificate'], tutorHook: 'tutor_lesson_completed_after' },
  { name: 'quiz.attempt.ended', domain: 'Quiz', firedBy: 'quiz service', subscribers: ['gamification', 'notification'], tutorHook: 'tutor_quiz/attempt_ended' },
  { name: 'enrollment.created', domain: 'Enrollment', firedBy: 'enrollment service', subscribers: ['notification', 'gamification', 'webhook'], tutorHook: 'tutor_after_enroll' },
  { name: 'enrollment.completed', domain: 'Enrollment', firedBy: 'enrollment service', subscribers: ['gamification', 'certificate', 'notification'], tutorHook: 'tutor_course_complete_after' },
  { name: 'order.paid', domain: 'Ecommerce', firedBy: 'Stripe webhook', subscribers: ['enrollment', 'revenue_ledger', 'webhook'], tutorHook: 'N/A (new)' },
  { name: 'order.refunded', domain: 'Ecommerce', firedBy: 'ecommerce service', subscribers: ['revenue_reversal', 'enrollment_cancel', 'webhook'], tutorHook: 'N/A (new)' },
  { name: 'certificate.issued', domain: 'Certificate', firedBy: 'certificate service', subscribers: ['notification', 'webhook'], tutorHook: 'N/A (new)' },
  { name: 'subscription.payment_failed', domain: 'Subscription', firedBy: 'Stripe webhook', subscribers: ['dunning_email', 'notification'], tutorHook: 'N/A (new)' },
  { name: 'drip.unlocked', domain: 'Drip', firedBy: 'drip scheduler', subscribers: ['notification'], tutorHook: 'N/A (new)' },
  { name: 'badge.earned', domain: 'Gamification', firedBy: 'gamification service', subscribers: ['notification', 'celebration'], tutorHook: 'N/A (new)' },
  { name: 'announcement.posted', domain: 'Announcement', firedBy: 'announcement service', subscribers: ['notification', 'email'], tutorHook: 'N/A (new)' },
]

export const phases = [
  { id: 'Phase 0', title: 'Foundation Hardening', weeks: 'Week 0', theme: 'Storage, Jobs, RBAC, Entitlements, Migrations', tickets: 13, devDays: 13.5, scope: ['Storage abstraction (S3 + Bunny)', 'Jobs runner', 'RBAC roles (instructor + student)', '16 entitlement keys', 'Migration runner', 'Shared LMS package'] },
  { id: 'Phase 1', title: 'Core LMS', weeks: 'Weeks 1-6', theme: 'Course catalog, curriculum, lessons, quizzes, progress', tickets: 25, devDays: 36, scope: ['Course + Topic + Lesson CRUD', 'Enrollment + progress tracking', 'Quiz (10 free question types)', 'Video upload + playback (Bunny)', 'Frontend: tailux, catalog, course player, dashboards'] },
  { id: 'Phase 2', title: 'Ecommerce', weeks: 'Weeks 7-12', theme: 'Cart, checkout, Stripe, coupons, instructor earnings', tickets: 20, devDays: 23.5, scope: ['Cart + checkout + 4 gateways', 'Stripe webhook + order.paid chain', 'Coupons + taxes', 'Subscriptions + dunning', 'Revenue ledger + instructor payouts'] },
  { id: 'Phase 3', title: 'Pro Authoring', weeks: 'Weeks 13-16', theme: 'Certificates, drip, multi-instructor, bundles', tickets: 14, devDays: 21, scope: ['Certificate canvas builder (react-konva)', 'Content drip (4 types)', 'Multi-instructor revenue share', 'Course bundles + prerequisites', 'Assignments'] },
  { id: 'Phase 4', title: 'Pro Engagement', weeks: 'Weeks 17-20', theme: 'Gamification, notifications, accessibility, kids mode', tickets: 18, devDays: 24, scope: ['Gamification (points, badges, leaderboards)', 'Notifications (onsite + browser push)', 'Accessibility preferences', 'Kids mode', 'Email template editor (42 triggers)', '2FA + fraud protection + legal consents'] },
  { id: 'Phase 5', title: 'Reports + AI + Launch', weeks: 'Weeks 21-24', theme: 'Reports, TutorAI, load test, launch', tickets: 10, devDays: 19.5, scope: ['5-tab reports + CSV export', 'TutorAI (OpenAI passthrough)', 'Tutor LMS migration plugin', 'Performance + security review', 'Launch runbook'] },
]

export const quizTypes = [
  { id: 'true_false', name: 'True/False', isPro: false, grading: 'auto', desc: 'Binary choice question' },
  { id: 'multiple_choice', name: 'Multiple Choice', isPro: false, grading: 'auto', desc: 'Single or multiple correct answers' },
  { id: 'fill_in_the_blank', name: 'Fill in the Blanks', isPro: false, grading: 'auto', desc: '{dash} placeholders, student types answers' },
  { id: 'matching', name: 'Matching', isPro: false, grading: 'auto', desc: 'Match left items to right items' },
  { id: 'image_answering', name: 'Image Answering', isPro: false, grading: 'auto', desc: 'Select an image as the answer' },
  { id: 'open_ended', name: 'Open-Ended/Essay', isPro: false, grading: 'manual', desc: 'Free-text, instructor grades manually' },
  { id: 'short_answer', name: 'Short Answer', isPro: false, grading: 'auto', desc: 'Short text with expected answer' },
  { id: 'ordering', name: 'Ordering', isPro: false, grading: 'auto', desc: 'Drag-drop items into correct order' },
  { id: 'image_matching', name: 'Image Matching', isPro: false, grading: 'auto', desc: 'Match text labels to images' },
  { id: 'mark_in_image', name: 'Image Marking', isPro: true, grading: 'auto', desc: 'Draw region on image, student marks point' },
  { id: 'range', name: 'Range', isPro: true, grading: 'auto', desc: 'Select value within min/max range' },
  { id: 'pin', name: 'Pin', isPro: true, grading: 'auto', desc: 'Pin a specific point on an image' },
  { id: 'puzzle', name: 'Puzzle', isPro: true, grading: 'auto', desc: 'Arrange puzzle pieces (2x2/4x4/7x7)' },
]

export const gateways = [
  { id: 'stripe', name: 'Stripe', region: 'Global', phase: 'Phase 2', creds: ['publishable_key', 'secret_key', 'webhook_signing_secret'] },
  { id: 'paypal', name: 'PayPal', region: 'Global', phase: 'Phase 2', creds: ['client_id', 'client_secret', 'webhook_id'] },
  { id: 'razorpay', name: 'Razorpay', region: 'India', phase: 'Phase 2', creds: ['key_id', 'key_secret', 'webhook_secret'] },
  { id: 'manual', name: 'Manual Payment', region: 'Global', phase: 'Phase 2', creds: ['instructions'] },
  { id: 'mollie', name: 'Mollie', region: 'EU', phase: 'Phase 5', creds: ['api_key'] },
  { id: 'paystack', name: 'Paystack', region: 'Africa', phase: 'Phase 5', creds: ['secret_key'] },
  { id: 'klarna', name: 'Klarna', region: 'EU/US', phase: 'Phase 5', creds: ['username', 'password'] },
  { id: 'alipay', name: 'Alipay', region: 'China', phase: 'Phase 5', creds: ['client_id', 'public_key', 'private_key'] },
  { id: 'authorize_net', name: 'Authorize.net', region: 'US', phase: 'Phase 5', creds: ['login_id', 'transaction_key', 'signature_key'] },
  { id: '2checkout', name: '2Checkout', region: 'Global', phase: 'Phase 5', creds: ['merchant_code', 'secret_key'] },
  { id: 'paddle', name: 'Paddle', region: 'Global', phase: 'Phase 5', creds: ['api_key', 'client_side_token', 'webhook_secret'] },
]

export const settingsData = [
  { tab: 'Course', field: 'completion_mode', label: 'Course Completion Process', type: 'select', default: 'flexible', phase: 'Phase 1' },
  { tab: 'Course', field: 'video_lesson_completion_percent', label: 'Video Lesson Completion %', type: 'number', default: '80', phase: 'Phase 1' },
  { tab: 'Course', field: 'preferred_video_source', label: 'Preferred Video Source', type: 'select', default: 'html5', phase: 'Phase 1' },
  { tab: 'Design', field: 'learning_mode', label: 'Learning Mode', type: 'select', default: 'modern', phase: 'Phase 4' },
  { tab: 'Design', field: 'brand_color', label: 'Brand Color', type: 'color', default: '#1e3a5f', phase: 'Phase 1' },
  { tab: 'Email', field: 'email_cron_enabled', label: 'Cron for Bulk Mailing', type: 'boolean', default: 'false', phase: 'Phase 4' },
  { tab: 'Monetization', field: 'revenue_sharing_enabled', label: 'Enable Revenue Sharing', type: 'boolean', default: 'true', phase: 'Phase 2' },
  { tab: 'Monetization', field: 'sharing_percentage', label: 'Instructor Share %', type: 'number', default: '80', phase: 'Phase 2' },
  { tab: 'Monetization', field: 'min_withdrawal_amount', label: 'Minimum Withdrawal', type: 'number', default: '50', phase: 'Phase 2' },
  { tab: 'Advanced', field: 'ai_studio_enabled', label: 'Enable AI Studio', type: 'boolean', default: 'false', phase: 'Phase 5' },
  { tab: 'Advanced', field: 'openai_api_key', label: 'OpenAI API Key', type: 'text', default: '', phase: 'Phase 5' },
  { tab: 'Authentication', field: 'two_factor_enabled', label: 'Enable 2FA', type: 'boolean', default: 'false', phase: 'Phase 4' },
  { tab: 'Authentication', field: 'fraud_protection_method', label: 'Fraud Protection', type: 'select', default: 'honeypot', phase: 'Phase 4' },
]

export const emailTriggers = [
  { id: 'ET-01', name: 'Welcome Email', recipient: 'student', trigger: 'student.signup', subject: 'Welcome to {site_title}!', phase: 'Phase 1' },
  { id: 'ET-02', name: 'Course Enrolled', recipient: 'student', trigger: 'enrollment.created', subject: 'Enrolled in {course_name}', phase: 'Phase 1' },
  { id: 'ET-03', name: 'Quiz Completed', recipient: 'student', trigger: 'quiz.attempt.ended', subject: 'Quiz Results: {course_name}', phase: 'Phase 1' },
  { id: 'ET-04', name: 'Course Completed', recipient: 'student', trigger: 'enrollment.completed', subject: 'Congratulations on {course_name}!', phase: 'Phase 3' },
  { id: 'ET-05', name: 'Assignment Graded', recipient: 'student', trigger: 'assignment.evaluated', subject: 'Assignment graded: {course_name}', phase: 'Phase 3' },
  { id: 'ET-06', name: 'New Announcement', recipient: 'student', trigger: 'announcement.posted', subject: 'New announcement: {course_name}', phase: 'Phase 4' },
  { id: 'ET-07', name: 'Q&A Answered', recipient: 'student', trigger: 'qna.answer.posted', subject: 'Your question was answered', phase: 'Phase 4' },
  { id: 'ET-08', name: 'Order Confirmation', recipient: 'student', trigger: 'order.paid', subject: 'Order #{order_number}', phase: 'Phase 2' },
  { id: 'ET-09', name: 'Student Enrolled', recipient: 'instructor', trigger: 'enrollment.created', subject: 'New enrollment in {course_name}', phase: 'Phase 1' },
  { id: 'ET-10', name: 'Student Completed Course', recipient: 'instructor', trigger: 'enrollment.completed', subject: 'Student completed {course_name}', phase: 'Phase 3' },
  { id: 'ET-11', name: 'New Q&A Question', recipient: 'instructor', trigger: 'qna.question.asked', subject: 'New question in {course_name}', phase: 'Phase 4' },
  { id: 'ET-12', name: 'Withdrawal Approved', recipient: 'instructor', trigger: 'withdrawal.approved', subject: 'Withdrawal approved!', phase: 'Phase 2' },
  { id: 'ET-13', name: 'Instructor Application', recipient: 'admin', trigger: 'instructor.application.submitted', subject: 'New instructor application', phase: 'Phase 3' },
  { id: 'ET-14', name: 'New Course Published', recipient: 'admin', trigger: 'course.published', subject: 'Course published: {course_name}', phase: 'Phase 1' },
  { id: 'ET-15', name: 'New Order', recipient: 'admin', trigger: 'order.paid', subject: 'New order #{order_number}', phase: 'Phase 2' },
]
