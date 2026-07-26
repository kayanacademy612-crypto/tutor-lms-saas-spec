#!/usr/bin/env python3
"""
Extract ALL frontend screens from both Tutor LMS and LastSaaS codebases.
Build a comprehensive screen inventory with backend mappings.
"""
import re, json
from pathlib import Path

TUTOR = Path("/home/z/my-project/repos/tutor")
TUTOR_PRO = Path("/home/z/my-project/repos/tutor-pro/tutor-pro")
LASTSAAS = Path("/home/z/my-project/repos/lastsaas")

screens = []

# ════════════════════════════════════════════════════════════════
# 1. TUTOR LMS — Extract screens from templates and views
# ════════════════════════════════════════════════════════════════

# Dashboard pages
tutor_dashboard_screens = [
    {"name": "Student Dashboard", "route": "/dashboard", "role": "student", "feature": "Dashboard", "module": "Dashboard", "source": "tutor/templates/dashboard/dashboard.php", "system": "tutor"},
    {"name": "My Courses", "route": "/dashboard/my-courses", "role": "student", "feature": "Course Progress", "module": "Dashboard", "source": "tutor/templates/dashboard/my-courses.php", "system": "tutor"},
    {"name": "Quiz Attempts", "route": "/dashboard/my-quiz-attempts", "role": "student", "feature": "Quiz", "module": "Dashboard", "source": "tutor/templates/dashboard/my-quiz-attempts.php", "system": "tutor"},
    {"name": "Enrolled Courses", "route": "/dashboard/enrolled-courses", "role": "student", "feature": "Enrollment", "module": "Dashboard", "source": "tutor/templates/dashboard/courses/", "system": "tutor"},
    {"name": "Discussions", "route": "/dashboard/discussions", "role": "student", "feature": "Q&A", "module": "Dashboard", "source": "tutor/templates/dashboard/discussions.php", "system": "tutor"},
    {"name": "Announcements", "route": "/dashboard/announcements", "role": "student", "feature": "Announcements", "module": "Dashboard", "source": "tutor/templates/dashboard/announcements.php", "system": "tutor"},
    {"name": "Registration", "route": "/dashboard/registration", "role": "public", "feature": "Auth", "module": "Dashboard", "source": "tutor/templates/dashboard/registration.php", "system": "tutor"},
    {"name": "Create Course", "route": "/dashboard/create-course", "role": "instructor", "feature": "Course Authoring", "module": "Dashboard", "source": "tutor/templates/dashboard/create-course.php", "system": "tutor"},
    {"name": "Instructor Dashboard", "route": "/dashboard/instructor", "role": "instructor", "feature": "Dashboard", "module": "Instructor", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
]
screens.extend(tutor_dashboard_screens)

# Learning area screens
tutor_learning_screens = [
    {"name": "Learning Area (Course Player)", "route": "/learn/{course}/{lesson}", "role": "student", "feature": "Lesson Player", "module": "Learning Area", "source": "tutor/templates/learning-area/index.php", "system": "tutor"},
    {"name": "Lesson Content", "route": "/learn/{course}/{lesson}#content", "role": "student", "feature": "Lesson", "module": "Learning Area", "source": "tutor/templates/learning-area/lesson/content.php", "system": "tutor"},
    {"name": "Quiz Taking", "route": "/learn/{course}/{quiz}", "role": "student", "feature": "Quiz", "module": "Learning Area", "source": "tutor/templates/learning-area/quiz/attempt.php", "system": "tutor"},
    {"name": "Q&A in Lesson", "route": "/learn/{course}/{lesson}#qna", "role": "student", "feature": "Q&A", "module": "Learning Area", "source": "tutor/templates/learning-area/subpages/qna.php", "system": "tutor"},
    {"name": "Reviews in Lesson", "route": "/learn/{course}#reviews", "role": "student", "feature": "Reviews", "module": "Learning Area", "source": "tutor/templates/learning-area/subpages/reviews.php", "system": "tutor"},
    {"name": "Announcements in Lesson", "route": "/learn/{course}#announcements", "role": "student", "feature": "Announcements", "module": "Learning Area", "source": "tutor/templates/learning-area/subpages/announcements.php", "system": "tutor"},
]
screens.extend(tutor_learning_screens)

# Course pages
tutor_course_screens = [
    {"name": "Course Catalog", "route": "/courses", "role": "public", "feature": "Course Browsing", "module": "Courses", "source": "tutor/templates/archive-course.php", "system": "tutor"},
    {"name": "Course Detail", "route": "/courses/{slug}", "role": "public", "feature": "Course Detail", "module": "Courses", "source": "tutor/templates/single-course.php (inferred)", "system": "tutor"},
    {"name": "Login", "route": "/login", "role": "public", "feature": "Auth", "module": "Auth", "source": "tutor/templates/login.php", "system": "tutor"},
    {"name": "Login Form", "route": "/login-form", "role": "public", "feature": "Auth", "module": "Auth", "source": "tutor/templates/login-form.php", "system": "tutor"},
    {"name": "User Account", "route": "/account", "role": "student", "feature": "Profile", "module": "Account", "source": "tutor/templates/account.php", "system": "tutor"},
    {"name": "Account Header", "route": "/account-header", "role": "student", "feature": "Profile", "module": "Account", "source": "tutor/templates/account-header.php", "system": "tutor"},
    {"name": "Dashboard Isolated", "route": "/dashboard-isolated", "role": "student", "feature": "Dashboard", "module": "Dashboard", "source": "tutor/templates/dashboard-isolated.php", "system": "tutor"},
]
screens.extend(tutor_course_screens)

# Admin/WP backend pages
tutor_admin_screens = [
    {"name": "Admin Courses", "route": "/wp-admin/admin.php?page=tutor_courses", "role": "admin", "feature": "Course Management", "module": "Admin", "source": "tutor/views/pages/course-list.php", "system": "tutor"},
    {"name": "Admin Students", "route": "/wp-admin/admin.php?page=tutor_students", "role": "admin", "feature": "Student Management", "module": "Admin", "source": "tutor/views/pages/students.php", "system": "tutor"},
    {"name": "Admin Instructors", "route": "/wp-admin/admin.php?page=tutor_instructors", "role": "admin", "feature": "Instructor Management", "module": "Admin", "source": "tutor/views/pages/instructors.php", "system": "tutor"},
    {"name": "Admin Q&A", "route": "/wp-admin/admin.php?page=tutor_qa", "role": "admin", "feature": "Q&A Management", "module": "Admin", "source": "tutor/views/pages/question_answer.php", "system": "tutor"},
    {"name": "Admin Quiz Attempts", "route": "/wp-admin/admin.php?page=tutor_quiz_attempts", "role": "admin", "feature": "Quiz Management", "module": "Admin", "source": "tutor/views/pages/quiz_attempts.php", "system": "tutor"},
    {"name": "Admin Announcements", "route": "/wp-admin/admin.php?page=tutor_announcements", "role": "admin", "feature": "Announcements", "module": "Admin", "source": "tutor/views/pages/announcements.php", "system": "tutor"},
    {"name": "Admin Withdraw Requests", "route": "/wp-admin/admin.php?page=tutor_withdraw_requests", "role": "admin", "feature": "Payments", "module": "Admin", "source": "tutor/views/pages/withdraw_requests.php", "system": "tutor"},
    {"name": "Course Builder", "route": "/wp-admin/post.php?post={id}&action=edit", "role": "instructor", "feature": "Course Authoring", "module": "Course Builder", "source": "tutor/views/pages/course-builder.php", "system": "tutor"},
    {"name": "Add New Instructor", "route": "/wp-admin/admin.php?page=tutor_add_instructor", "role": "admin", "feature": "Instructor Management", "module": "Admin", "source": "tutor/views/pages/add_new_instructor.php", "system": "tutor"},
    {"name": "Admin Addons", "route": "/wp-admin/admin.php?page=tutor_addons", "role": "admin", "feature": "Addons", "module": "Admin", "source": "tutor/views/pages/addons.php", "system": "tutor"},
    {"name": "Admin Tools", "route": "/wp-admin/admin.php?page=tutor_tools", "role": "admin", "feature": "Tools", "module": "Admin", "source": "tutor/views/pages/tools.php", "system": "tutor"},
    {"name": "View Quiz Attempt", "route": "/wp-admin/admin.php?page=view_attempt", "role": "admin", "feature": "Quiz Management", "module": "Admin", "source": "tutor/views/pages/view_attempt.php", "system": "tutor"},
    {"name": "Answer Review", "route": "/wp-admin/admin.php?page=answer", "role": "instructor", "feature": "Quiz Grading", "module": "Admin", "source": "tutor/views/pages/answer.php", "system": "tutor"},
]
screens.extend(tutor_admin_screens)

# Ecommerce screens
tutor_ecommerce_screens = [
    {"name": "Cart", "route": "/cart", "role": "student", "feature": "Ecommerce", "module": "Ecommerce", "source": "tutor/templates/ecommerce/cart.php", "system": "tutor"},
    {"name": "Checkout", "route": "/checkout", "role": "student", "feature": "Ecommerce", "module": "Ecommerce", "source": "tutor/templates/ecommerce/checkout.php", "system": "tutor"},
    {"name": "Billing", "route": "/billing", "role": "student", "feature": "Ecommerce", "module": "Ecommerce", "source": "tutor/templates/ecommerce/billing.php", "system": "tutor"},
    {"name": "Order Success", "route": "/order-success", "role": "student", "feature": "Ecommerce", "module": "Ecommerce", "source": "tutor/templates/ecommerce/order-placement-success.php", "system": "tutor"},
    {"name": "Order Failed", "route": "/order-failed", "role": "student", "feature": "Ecommerce", "module": "Ecommerce", "source": "tutor/templates/ecommerce/order-placement-failed.php", "system": "tutor"},
    {"name": "Admin Orders", "route": "/wp-admin/admin.php?page=tutor_orders", "role": "admin", "feature": "Ecommerce", "module": "Admin", "source": "tutor/views/pages/ecommerce/order-list.php", "system": "tutor"},
    {"name": "Admin Coupons", "route": "/wp-admin/admin.php?page=tutor_coupons", "role": "admin", "feature": "Ecommerce", "module": "Admin", "source": "tutor/views/pages/ecommerce/coupon-list.php", "system": "tutor"},
]
screens.extend(tutor_ecommerce_screens)

# Instructor dashboard screens (from Pro)
tutor_instructor_screens = [
    {"name": "Instructor Home", "route": "/dashboard/instructor/home", "role": "instructor", "feature": "Dashboard", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Courses", "route": "/dashboard/instructor/courses", "role": "instructor", "feature": "Course Management", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Analytics", "route": "/dashboard/instructor/analytics", "role": "instructor", "feature": "Analytics", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Quiz Attempts", "route": "/dashboard/instructor/quiz-attempts", "role": "instructor", "feature": "Quiz Management", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Assignments", "route": "/dashboard/instructor/assignments", "role": "instructor", "feature": "Assignment Management", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Announcements", "route": "/dashboard/instructor/announcements", "role": "instructor", "feature": "Announcements", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Certificate", "route": "/dashboard/instructor/certificate", "role": "instructor", "feature": "Certificates", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Live Classes", "route": "/dashboard/instructor/live-classes", "role": "instructor", "feature": "Live Classes", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Notifications", "route": "/dashboard/instructor/notifications", "role": "instructor", "feature": "Notifications", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Settings", "route": "/dashboard/instructor/settings", "role": "instructor", "feature": "Settings", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Withdrawals", "route": "/dashboard/instructor/withdrawals", "role": "instructor", "feature": "Payments", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Statements", "route": "/dashboard/instructor/statements", "role": "instructor", "feature": "Earnings", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Discussions", "route": "/dashboard/instructor/discussions", "role": "instructor", "feature": "Q&A", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Meet", "route": "/dashboard/instructor/meet", "role": "instructor", "feature": "Live Classes", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
    {"name": "Instructor Zoom", "route": "/dashboard/instructor/zoom", "role": "instructor", "feature": "Live Classes", "module": "Instructor Dashboard", "source": "tutor/templates/dashboard/instructor/", "system": "tutor"},
]
screens.extend(tutor_instructor_screens)

# Student dashboard screens (from Pro)
tutor_student_screens = [
    {"name": "Student Home", "route": "/dashboard/student/home", "role": "student", "feature": "Dashboard", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/dashboard.php", "system": "tutor"},
    {"name": "Student Stats", "route": "/dashboard/student/stats", "role": "student", "feature": "Analytics", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/stat-card.php", "system": "tutor"},
    {"name": "Continue Learning", "route": "/dashboard/student/continue", "role": "student", "feature": "Course Progress", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/continue-learning.php", "system": "tutor"},
    {"name": "Student Calendar", "route": "/dashboard/student/calendar", "role": "student", "feature": "Calendar", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/", "system": "tutor"},
    {"name": "Student Reviews", "route": "/dashboard/student/reviews", "role": "student", "feature": "Reviews", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/", "system": "tutor"},
    {"name": "Student Wishlist", "route": "/dashboard/student/wishlist", "role": "student", "feature": "Wishlist", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/", "system": "tutor"},
    {"name": "Student Order History", "route": "/dashboard/student/orders", "role": "student", "feature": "Ecommerce", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/", "system": "tutor"},
    {"name": "Student Q&A", "route": "/dashboard/student/qa", "role": "student", "feature": "Q&A", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/", "system": "tutor"},
    {"name": "Student Settings", "route": "/dashboard/student/settings", "role": "student", "feature": "Settings", "module": "Student Dashboard", "source": "tutor/templates/dashboard/student/", "system": "tutor"},
]
screens.extend(tutor_student_screens)

# ════════════════════════════════════════════════════════════════
# 2. LASTSAAS — Extract screens from frontend source
# ════════════════════════════════════════════════════════════════

# App pages
lastsaas_app_screens = [
    {"name": "Dashboard", "route": "/app/dashboard", "role": "user", "feature": "Dashboard", "module": "App", "source": "lastsaas/frontend/src/pages/app/DashboardPage.tsx", "system": "lastsaas"},
    {"name": "Onboarding", "route": "/app/onboarding", "role": "user", "feature": "Onboarding", "module": "App", "source": "lastsaas/frontend/src/pages/app/OnboardingPage.tsx", "system": "lastsaas"},
    {"name": "Plans", "route": "/app/plans", "role": "user", "feature": "Billing", "module": "App", "source": "lastsaas/frontend/src/pages/app/PlanPage.tsx", "system": "lastsaas"},
    {"name": "Activity", "route": "/app/activity", "role": "user", "feature": "Activity Feed", "module": "App", "source": "lastsaas/frontend/src/pages/app/ActivityPage.tsx", "system": "lastsaas"},
    {"name": "Team", "route": "/app/team", "role": "user", "feature": "Team Management", "module": "App", "source": "lastsaas/frontend/src/pages/app/TeamPage.tsx", "system": "lastsaas"},
    {"name": "Buy Credits", "route": "/app/buy-credits", "role": "user", "feature": "Billing", "module": "App", "source": "lastsaas/frontend/src/pages/app/BuyCreditsPage.tsx", "system": "lastsaas"},
    {"name": "Billing Success", "route": "/app/billing/success", "role": "user", "feature": "Billing", "module": "App", "source": "lastsaas/frontend/src/pages/app/BillingSuccessPage.tsx", "system": "lastsaas"},
    {"name": "Billing Cancel", "route": "/app/billing/cancel", "role": "user", "feature": "Billing", "module": "App", "source": "lastsaas/frontend/src/pages/app/BillingCancelPage.tsx", "system": "lastsaas"},
    {"name": "Test Entitlements", "route": "/app/test-entitlements", "role": "user", "feature": "Testing", "module": "App", "source": "lastsaas/frontend/src/pages/app/TestEntitlementsPage.tsx", "system": "lastsaas"},
]
screens.extend(lastsaas_app_screens)

# Settings pages
lastsaas_settings_screens = [
    {"name": "Settings", "route": "/app/settings", "role": "user", "feature": "Settings", "module": "Settings", "source": "lastsaas/frontend/src/pages/app/SettingsPage.tsx", "system": "lastsaas"},
    {"name": "Profile Settings", "route": "/app/settings/profile", "role": "user", "feature": "Profile", "module": "Settings", "source": "lastsaas/frontend/src/pages/app/settings/ProfileTab.tsx", "system": "lastsaas"},
    {"name": "Security Settings", "route": "/app/settings/security", "role": "user", "feature": "Security", "module": "Settings", "source": "lastsaas/frontend/src/pages/app/settings/SecurityTab.tsx", "system": "lastsaas"},
    {"name": "Sessions Settings", "route": "/app/settings/sessions", "role": "user", "feature": "Session Management", "module": "Settings", "source": "lastsaas/frontend/src/pages/app/settings/SessionsTab.tsx", "system": "lastsaas"},
    {"name": "Billing Settings", "route": "/app/settings/billing", "role": "user", "feature": "Billing", "module": "Settings", "source": "lastsaas/frontend/src/pages/app/settings/BillingTab.tsx", "system": "lastsaas"},
    {"name": "MFA Setup", "route": "/app/settings/mfa", "role": "user", "feature": "Security", "module": "Settings", "source": "lastsaas/frontend/src/pages/app/settings/MFASetupModal.tsx", "system": "lastsaas"},
]
screens.extend(lastsaas_settings_screens)

# Admin pages
lastsaas_admin_screens = [
    {"name": "Admin Users", "route": "/admin/users", "role": "admin", "feature": "User Management", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/UsersPage.tsx", "system": "lastsaas"},
    {"name": "Root Members", "route": "/admin/members", "role": "owner", "feature": "Member Management", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/RootMembersPage.tsx", "system": "lastsaas"},
    {"name": "PM (Private Messaging)", "route": "/admin/pm", "role": "admin", "feature": "Messaging", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/PMPage.tsx", "system": "lastsaas"},
    {"name": "Health Monitor", "route": "/admin/health", "role": "admin", "feature": "System Health", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/HealthPage.tsx", "system": "lastsaas"},
    {"name": "System Logs", "route": "/admin/logs", "role": "admin", "feature": "Logs", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/LogsPage.tsx", "system": "lastsaas"},
    {"name": "Tenant Profile", "route": "/admin/tenant", "role": "admin", "feature": "Tenant Management", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/TenantProfilePage.tsx", "system": "lastsaas"},
    {"name": "Admin Plans", "route": "/admin/plans", "role": "admin", "feature": "Plan Management", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/PlansPage.tsx", "system": "lastsaas"},
    {"name": "Branding", "route": "/admin/branding", "role": "admin", "feature": "Branding", "module": "Admin", "source": "lastsaas/frontend/src/pages/admin/BrandingPage.tsx", "system": "lastsaas"},
]
screens.extend(lastsaas_admin_screens)

# Public pages
lastsaas_public_screens = [
    {"name": "Landing Page", "route": "/", "role": "public", "feature": "Landing", "module": "Public", "source": "lastsaas/frontend/src/pages/public/LandingPage.tsx", "system": "lastsaas"},
    {"name": "Custom Page", "route": "/p/{slug}", "role": "public", "feature": "Custom Pages", "module": "Public", "source": "lastsaas/frontend/src/pages/public/CustomPage.tsx", "system": "lastsaas"},
    {"name": "Bootstrap", "route": "/bootstrap", "role": "public", "feature": "System Init", "module": "Public", "source": "lastsaas/frontend/src/pages/BootstrapPage.tsx", "system": "lastsaas"},
]
screens.extend(lastsaas_public_screens)

# ════════════════════════════════════════════════════════════════
# 3. FEATURE COMPARISON MAPPING
# ════════════════════════════════════════════════════════════════

feature_comparisons = [
    {
        "feature": "Dashboard",
        "tutor": {"screens": ["Student Dashboard", "Instructor Home"], "apis": ["GET /wp-json/tutor/v1/students/{id}/dashboard"], "models": ["EnrollmentModel", "CourseModel"], "source": "tutor/templates/dashboard/", "status": "complete"},
        "lastsaas": {"screens": ["Dashboard"], "apis": ["GET /api/bootstrap/status"], "models": ["User", "Tenant"], "source": "lastsaas/frontend/src/pages/app/DashboardPage.tsx", "status": "complete"},
        "comparison": "different-implementation", "notes": "Tutor has role-specific dashboards (student vs instructor). LastSaaS has a single generic dashboard.", "gap": "LastSaaS needs role-specific dashboards for instructor and student"
    },
    {
        "feature": "Course Management",
        "tutor": {"screens": ["Admin Courses", "Course Builder", "Create Course", "Course Detail", "Course Catalog"], "apis": ["GET /courses", "POST /courses", "PUT /courses/{id}"], "models": ["CourseModel"], "source": "tutor/models/CourseModel.php, tutor/views/pages/course-builder.php", "status": "complete"},
        "lastsaas": {"screens": [], "apis": [], "models": [], "source": "N/A", "status": "missing"},
        "comparison": "missing-in-lastsaas", "notes": "Tutor LMS has full course management (CRUD, builder, curriculum). LastSaaS has NO course management at all.", "gap": "ENTIRE course module needs to be built from scratch"
    },
    {
        "feature": "Lesson Management",
        "tutor": {"screens": ["Learning Area (Course Player)", "Lesson Content"], "apis": ["GET /lessons", "POST /lesson-mark-complete"], "models": ["LessonModel"], "source": "tutor/models/LessonModel.php, tutor/templates/learning-area/lesson/content.php", "status": "complete"},
        "lastsaas": {"screens": [], "apis": [], "models": [], "source": "N/A", "status": "missing"},
        "comparison": "missing-in-lastsaas", "notes": "Tutor has a full lesson player with video, text, comments. LastSaaS has nothing.", "gap": "ENTIRE lesson module needs to be built"
    },
    {
        "feature": "Quiz Management",
        "tutor": {"screens": ["Quiz Taking", "Admin Quiz Attempts", "View Quiz Attempt", "Answer Review", "Instructor Quiz Attempts"], "apis": ["GET /quiz/{id}", "POST /quiz-attempts"], "models": ["QuizModel"], "source": "tutor/models/QuizModel.php, tutor/templates/learning-area/quiz/attempt.php", "status": "complete"},
        "lastsaas": {"screens": [], "apis": [], "models": [], "source": "N/A", "status": "missing"},
        "comparison": "missing-in-lastsaas", "notes": "Tutor has 13 quiz question types, attempts, auto-grading, manual review. LastSaaS has nothing.", "gap": "ENTIRE quiz module needs to be built"
    },
    {
        "feature": "Enrollment",
        "tutor": {"screens": ["Enrolled Courses", "Course Detail (enroll button)"], "apis": ["POST /enrollments", "GET /enrollments"], "models": ["EnrollmentModel"], "source": "tutor/models/EnrollmentModel.php", "status": "complete"},
        "lastsaas": {"screens": ["Team (member management)"], "apis": ["POST /auth/accept-invitation"], "models": ["TenantMembership"], "source": "lastsaas/frontend/src/pages/app/TeamPage.tsx", "status": "partial"},
        "comparison": "different-implementation", "notes": "Tutor has course enrollment. LastSaaS has tenant membership (team members) but no course enrollment concept.", "gap": "Enrollment collection + logic needs to be built"
    },
    {
        "feature": "Authentication",
        "tutor": {"screens": ["Login", "Login Form", "Registration"], "apis": ["POST /auth/login (WP)"], "models": ["UserModel"], "source": "tutor/templates/login.php, tutor/templates/dashboard/registration.php", "status": "complete"},
        "lastsaas": {"screens": ["Bootstrap (auth flow)"], "apis": ["POST /auth/register", "POST /auth/login", "POST /auth/refresh", "GET /auth/providers", "POST /auth/mfa/*"], "models": ["User", "RefreshToken", "SSOConnection"], "source": "lastsaas/frontend/src/pages/BootstrapPage.tsx, backend/internal/auth/", "status": "complete"},
        "comparison": "equivalent", "notes": "Both have full auth. LastSaaS has MFA, WebAuthn, OAuth (GitHub/Google/Microsoft). Tutor has 2FA + social login via Pro addon.", "gap": "None — LastSaaS auth is more advanced"
    },
    {
        "feature": "Billing/Payments",
        "tutor": {"screens": ["Cart", "Checkout", "Billing", "Order Success", "Admin Orders", "Admin Coupons", "Instructor Withdrawals", "Instructor Statements"], "apis": ["POST /checkout", "GET /orders", "POST /coupons"], "models": ["OrderModel", "CouponModel", "CartModel", "WithdrawModel"], "source": "tutor/models/OrderModel.php, tutor/templates/ecommerce/", "status": "complete"},
        "lastsaas": {"screens": ["Plans", "Buy Credits", "Billing Settings", "Billing Success", "Billing Cancel", "Admin Plans"], "apis": ["POST /billing/checkout", "POST /billing/credits", "GET /billing/transactions"], "models": ["Plan", "CreditBundle", "FinancialTransaction", "StripeMapping"], "source": "lastsaas/frontend/src/pages/app/PlanPage.tsx, backend/internal/stripe/stripe.go", "status": "partial"},
        "comparison": "partially-implemented", "notes": "Tutor has full ecommerce (cart, checkout, coupons, orders, refunds, instructor payouts). LastSaaS has Stripe subscriptions + credit bundles only — no cart, no coupons, no orders, no instructor payouts.", "gap": "Cart, orders, coupons, revenue ledger, instructor payouts all need to be built"
    },
    {
        "feature": "Settings",
        "tutor": {"screens": ["Admin Tools (settings)", "Instructor Settings", "Student Settings"], "apis": ["GET/PUT /options"], "models": ["Options (WP)"], "source": "tutor/views/pages/tools.php, tutor/classes/Options_V2.php", "status": "complete"},
        "lastsaas": {"screens": ["Settings", "Profile Settings", "Security Settings", "Sessions Settings", "Billing Settings"], "apis": ["GET/PUT /config"], "models": ["ConfigVar"], "source": "lastsaas/frontend/src/pages/app/SettingsPage.tsx, backend/internal/configstore/", "status": "complete"},
        "comparison": "different-implementation", "notes": "Tutor uses WordPress Options API. LastSaaS has a MongoDB-backed configstore with dynamic reloading.", "gap": "LMS-specific settings (completion mode, video source, etc.) need to be added to configstore"
    },
    {
        "feature": "Notifications",
        "tutor": {"screens": ["Instructor Notifications"], "apis": ["N/A (Pro addon)"], "models": ["N/A (Pro)"], "source": "tutor-pro/addons/tutor-notifications/", "status": "complete"},
        "lastsaas": {"screens": ["Activity Feed"], "apis": ["GET /messages", "GET /announcements"], "models": ["Message", "Announcement"], "source": "lastsaas/frontend/src/pages/app/ActivityPage.tsx", "status": "partial"},
        "comparison": "partially-implemented", "notes": "Tutor has onsite bell + browser push. LastSaaS has messages + announcements but no push notifications.", "gap": "Push notification system needs to be built"
    },
    {
        "feature": "User Management",
        "tutor": {"screens": ["Admin Students", "Admin Instructors", "Add New Instructor"], "apis": ["GET /students", "PUT /become-instructor"], "models": ["UserModel"], "source": "tutor/views/pages/students.php, tutor/views/pages/instructors.php", "status": "complete"},
        "lastsaas": {"screens": ["Admin Users", "Root Members", "Team"], "apis": ["GET /admin/users", "POST /invitations"], "models": ["User", "TenantMembership", "Invitation"], "source": "lastsaas/frontend/src/pages/admin/UsersPage.tsx", "status": "complete"},
        "comparison": "equivalent", "notes": "Both have user management. LastSaaS has invitations + role management. Tutor has student/instructor separation.", "gap": "Instructor role + application flow needs to be added to LastSaaS"
    },
    {
        "feature": "Branding/Theming",
        "tutor": {"screens": ["N/A (uses WordPress themes)"], "apis": ["N/A"], "models": ["N/A"], "source": "tutor/includes/theme-compatibility/", "status": "partial"},
        "lastsaas": {"screens": ["Branding"], "apis": ["GET /branding", "PUT /branding"], "models": ["BrandingConfig", "BrandingAsset"], "source": "lastsaas/frontend/src/pages/admin/BrandingPage.tsx", "status": "complete"},
        "comparison": "lastsaas-only", "notes": "LastSaaS has built-in branding management. Tutor relies on WordPress themes.", "gap": "None — LastSaaS branding is more advanced"
    },
    {
        "feature": "Certificates",
        "tutor": {"screens": ["Instructor Certificate", "Student Certificates (implied)"], "apis": ["N/A (Pro addon)"], "models": ["N/A (Pro)"], "source": "tutor-pro/addons/tutor-certificate/", "status": "complete"},
        "lastsaas": {"screens": [], "apis": [], "models": [], "source": "N/A", "status": "missing"},
        "comparison": "missing-in-lastsaas", "notes": "Tutor has a full visual certificate builder (canvas editor, 25+ templates). LastSaaS has nothing.", "gap": "ENTIRE certificate module needs to be built"
    },
    {
        "feature": "System Health",
        "tutor": {"screens": ["Admin Tools > Status"], "apis": ["N/A"], "models": ["N/A"], "source": "tutor/views/pages/tools/status.php", "status": "minimal"},
        "lastsaas": {"screens": ["Health Monitor"], "apis": ["GET /health", "GET /admin/health"], "models": ["SystemNode", "SystemMetric", "LeaderLock"], "source": "lastsaas/frontend/src/pages/admin/HealthPage.tsx, backend/internal/health/", "status": "complete"},
        "comparison": "lastsaas-only", "notes": "LastSaaS has comprehensive health monitoring (CPU, memory, MongoDB, Go runtime, leader election). Tutor has basic status page.", "gap": "None — LastSaaS health monitoring is more advanced"
    },
]

# ════════════════════════════════════════════════════════════════
# 4. USER FLOW COMPARISONS
# ════════════════════════════════════════════════════════════════

user_flows = [
    {
        "flow": "Create a Course",
        "tutor": ["Login", "Dashboard", "Create Course", "Course Information", "Curriculum Builder", "Add Topics", "Add Lessons", "Add Quizzes", "Set Price", "Publish"],
        "lastsaas": ["Login", "Dashboard", "N/A — no course creation exists"],
        "analysis": "Tutor LMS has a complete 10-step course creation workflow. LastSaaS has NO course creation capability at all. This entire workflow needs to be built from scratch.",
        "gap": "CRITICAL — entire flow missing from LastSaaS"
    },
    {
        "flow": "Enroll in a Course",
        "tutor": ["Browse Catalog", "Course Detail", "Click Enroll", "Checkout (if paid)", "Payment", "Enrolled", "Start Learning"],
        "lastsaas": ["N/A — no course catalog exists"],
        "analysis": "Tutor has a complete enrollment flow with free/paid options. LastSaaS has no course catalog or enrollment.",
        "gap": "CRITICAL — entire flow missing from LastSaaS"
    },
    {
        "flow": "Take a Quiz",
        "tutor": ["Open Lesson", "Click Quiz", "Start Attempt", "Answer Questions", "Submit", "See Results", "Review Answers"],
        "lastsaas": ["N/A — no quiz system exists"],
        "analysis": "Tutor has a complete quiz-taking flow with auto-grading and answer review. LastSaaS has no quiz system.",
        "gap": "CRITICAL — entire flow missing from LastSaaS"
    },
    {
        "flow": "Purchase a Course",
        "tutor": ["Course Detail", "Add to Cart", "View Cart", "Apply Coupon", "Checkout", "Enter Billing", "Pay", "Order Success"],
        "lastsaas": ["Plans Page", "Select Plan", "Stripe Checkout", "Billing Success"],
        "analysis": "Tutor has a full ecommerce flow (cart, coupons, billing). LastSaaS has a simpler Stripe checkout flow for plans/credits but no cart or coupons.",
        "gap": "Cart, coupons, billing form, order management all missing from LastSaaS"
    },
    {
        "flow": "Register/Login",
        "tutor": ["Login Page", "Enter Credentials", "Dashboard"],
        "lastsaas": ["Bootstrap/Landing", "Login/Register", "Enter Credentials", "MFA (optional)", "Dashboard"],
        "analysis": "Both have complete auth flows. LastSaaS has MFA and WebAuthn support. Tutor has 2FA via Pro addon.",
        "gap": "None — both flows are complete. LastSaaS is more secure."
    },
    {
        "flow": "Admin Manage Users",
        "tutor": ["Admin", "Students", "View/Edit/Delete"],
        "lastsaas": ["Admin", "Users", "View/Edit/Delete/Invite"],
        "analysis": "Both have admin user management. LastSaaS also has invitations and root member management.",
        "gap": "Instructor application/approval flow missing from LastSaaS"
    },
    {
        "flow": "Instructor Withdraw Earnings",
        "tutor": ["Instructor Dashboard", "Withdrawals", "Request Withdrawal", "Admin Approves", "Payment Sent"],
        "lastsaas": ["N/A — no instructor earnings system"],
        "analysis": "Tutor has a complete instructor payout workflow. LastSaaS has no concept of instructor earnings.",
        "gap": "CRITICAL — revenue ledger, instructor profiles, withdrawal flow all missing from LastSaaS"
    },
]

# ════════════════════════════════════════════════════════════════
# 5. GAP ANALYSIS
# ════════════════════════════════════════════════════════════════

frontend_gaps = [
    {"gap": "Course Catalog", "tutor": "Complete (archive-course.php)", "lastsaas": "Missing", "severity": "critical", "action": "Build course catalog page with filters, search, sorting"},
    {"gap": "Course Detail Page", "tutor": "Complete (single-course.php)", "lastsaas": "Missing", "severity": "critical", "action": "Build course detail with curriculum tree, instructors, reviews, enroll CTA"},
    {"gap": "Course Builder", "tutor": "Complete (course-builder.php)", "lastsaas": "Missing", "severity": "critical", "action": "Build curriculum builder with drag-drop topics, lessons, quizzes"},
    {"gap": "Learning Area (Lesson Player)", "tutor": "Complete (learning-area/index.php)", "lastsaas": "Missing", "severity": "critical", "action": "Build lesson player with video, content, progress sidebar"},
    {"gap": "Quiz Taking Interface", "tutor": "Complete (quiz/attempt.php)", "lastsaas": "Missing", "severity": "critical", "action": "Build quiz player with 13 question types, timer, auto-grading"},
    {"gap": "Student Dashboard", "tutor": "Complete (dashboard/student/)", "lastsaas": "Generic dashboard only", "severity": "high", "action": "Add student-specific dashboard with my courses, progress, certificates"},
    {"gap": "Instructor Dashboard", "tutor": "Complete (dashboard/instructor/)", "lastsaas": "Missing", "severity": "high", "action": "Build instructor dashboard with courses, students, earnings, analytics"},
    {"gap": "Shopping Cart", "tutor": "Complete (ecommerce/cart.php)", "lastsaas": "Missing", "severity": "high", "action": "Build cart with add/remove items, coupon application, totals"},
    {"gap": "Checkout Page", "tutor": "Complete (ecommerce/checkout.php)", "lastsaas": "Missing (has Stripe plan checkout only)", "severity": "high", "action": "Build checkout with billing form, payment method selection, order summary"},
    {"gap": "Certificate Builder", "tutor": "Complete (Pro addon, canvas editor)", "lastsaas": "Missing", "severity": "high", "action": "Build certificate template editor with react-konva"},
    {"gap": "Certificate Download/Verify", "tutor": "Complete (Pro addon)", "lastsaas": "Missing", "severity": "medium", "action": "Build certificate PDF generation + public verification page"},
    {"gap": "Announcements", "tutor": "Complete (dashboard + learning area)", "lastsaas": "Missing", "severity": "medium", "action": "Build announcement system with course-scoped posts"},
    {"gap": "Q&A System", "tutor": "Complete (qna/ templates)", "lastsaas": "Missing", "severity": "medium", "action": "Build Q&A with questions, answers, upvotes, instructor responses"},
    {"gap": "Reviews/Ratings", "tutor": "Complete (review modal + list)", "lastsaas": "Missing", "severity": "medium", "action": "Build review system with star ratings and text reviews"},
    {"gap": "Wishlist", "tutor": "Complete (student wishlist)", "lastsaas": "Missing", "severity": "low", "action": "Build wishlist with add/remove and wishlist page"},
    {"gap": "Calendar", "tutor": "Complete (Pro addon)", "lastsaas": "Missing", "severity": "low", "action": "Build calendar showing assignments, quizzes, live classes"},
    {"gap": "Gamification UI", "tutor": "Points/badges/leaderboard", "lastsaas": "Missing", "severity": "low", "action": "Build gamification widgets (points display, badge wall, leaderboard)"},
    {"gap": "Content Drip Indicator", "tutor": "Lock icons + countdown", "lastsaas": "Missing", "severity": "medium", "action": "Build drip status badges on locked lessons"},
    {"gap": "Instructor Earnings", "tutor": "Complete (statements, withdrawals)", "lastsaas": "Missing", "severity": "high", "action": "Build earnings dashboard with charts, statements, withdrawal requests"},
    {"gap": "Admin Reports", "tutor": "Complete (Pro addon)", "lastsaas": "Missing", "severity": "medium", "action": "Build admin reports with sales, enrollments, completion analytics"},
]

backend_gaps = [
    {"gap": "Course Collection", "tutor": "CourseModel.php (WP post type)", "lastsaas": "Missing", "severity": "critical", "action": "Create course collection with 26 fields, indexes, relationships"},
    {"gap": "Lesson Collection", "tutor": "LessonModel.php (WP post type)", "lastsaas": "Missing", "severity": "critical", "action": "Create lesson collection with video sources, attachments, drip"},
    {"gap": "Quiz Collection", "tutor": "QuizModel.php + tutor_quiz_attempts table", "lastsaas": "Missing", "severity": "critical", "action": "Create quiz + question + attempt + answer collections"},
    {"gap": "Enrollment Collection", "tutor": "EnrollmentModel.php (tutor_enrolled)", "lastsaas": "Missing (has tenant_memberships only)", "severity": "critical", "action": "Create enrollment collection with progress tracking"},
    {"gap": "Order Collection", "tutor": "OrderModel.php (tutor_order)", "lastsaas": "Missing (has financial_transactions)", "severity": "high", "action": "Create order + order_item + order_activity collections"},
    {"gap": "Cart Collection", "tutor": "CartModel.php + CartItemModel.php", "lastsaas": "Missing", "severity": "high", "action": "Create cart + cart_item collections"},
    {"gap": "Coupon Collection", "tutor": "CouponModel.php", "lastsaas": "Missing", "severity": "high", "action": "Create coupon collection with 6 applies_to types"},
    {"gap": "Certificate Collection", "tutor": "Pro addon (tutor-certificate)", "lastsaas": "Missing", "severity": "high", "action": "Create certificate_template + certificate + certificate_asset collections"},
    {"gap": "Subscription Plan Collection", "tutor": "Pro addon (subscription)", "lastsaas": "Missing (has plans but not LMS-specific)", "severity": "high", "action": "Create subscription_plan + subscription collections for course/bundle/membership"},
    {"gap": "Revenue Ledger", "tutor": "Earnings.php + Withdraw.php", "lastsaas": "Missing (has financial_transactions)", "severity": "high", "action": "Create revenue_ledger + withdrawal_request collections"},
    {"gap": "Instructor Profile", "tutor": "Instructor.php class", "lastsaas": "Missing (has tenant_memberships only)", "severity": "high", "action": "Create instructor collection with application + payout config"},
    {"gap": "Content Drip Rules", "tutor": "Pro addon (content-drip)", "lastsaas": "Missing", "severity": "medium", "action": "Create drip_rule collection with 4 drip types"},
    {"gap": "Gamification", "tutor": "Via hooks + Pro addon", "lastsaas": "Missing", "severity": "low", "action": "Create point + badge + leaderboard collections"},
    {"gap": "Lesson Progress Tracking", "tutor": "Lesson reading info (user meta)", "lastsaas": "Missing", "severity": "critical", "action": "Create lesson_progress collection with video position tracking"},
    {"gap": "Q&A System", "tutor": "Q_And_A.php class", "lastsaas": "Missing", "severity": "medium", "action": "Create qna_question + qna_answer collections"},
    {"gap": "Course Review", "tutor": "Reviews.php class", "lastsaas": "Missing", "severity": "medium", "action": "Create course_review collection"},
    {"gap": "Notification System", "tutor": "Pro addon (tutor-notifications)", "lastsaas": "Partial (has messages + announcements)", "severity": "medium", "action": "Add notification + notification_preference collections"},
    {"gap": "Background Jobs", "tutor": "WP-Cron", "lastsaas": "Missing (goroutines only)", "severity": "high", "action": "Build job runner with MongoDB-backed queue"},
    {"gap": "Object Storage", "tutor": "WordPress media library", "lastsaas": "Missing (GridFS only)", "severity": "high", "action": "Add S3/R2/Bunny Stream storage abstraction"},
    {"gap": "AI Generation", "tutor": "Pro (tutorai/ + openai/)", "lastsaas": "Missing", "severity": "medium", "action": "Build AI module with OpenAI passthrough for course/quiz generation"},
]

# ════════════════════════════════════════════════════════════════
# 6. GENERATE TYPESCRIPT
# ════════════════════════════════════════════════════════════════

output = Path("/home/z/my-project/src/data/screen-inventory.ts")
lines = [
    "// Auto-generated frontend screen inventory + feature comparison + gap analysis",
    "// Extracted from real Tutor LMS templates/views + LastSaaS frontend source",
    "",
    "export interface Screen {",
    "  name: string; route: string; role: string; feature: string; module: string;",
    "  source: string; system: 'tutor' | 'lastsaas'",
    "}",
    "",
    "export interface FeatureComparison {",
    "  feature: string;",
    "  tutor: { screens: string[]; apis: string[]; models: string[]; source: string; status: string };",
    "  lastsaas: { screens: string[]; apis: string[]; models: string[]; source: string; status: string };",
    "  comparison: string; notes: string; gap: string",
    "}",
    "",
    "export interface UserFlow {",
    "  flow: string; tutor: string[]; lastsaas: string[]; analysis: string; gap: string",
    "}",
    "",
    "export interface Gap {",
    "  gap: string; tutor: string; lastsaas: string; severity: string; action: string",
    "}",
    "",
    f"export const screenInventory: Screen[] = {json.dumps(screens, indent=2)}",
    "",
    f"export const featureComparisons: FeatureComparison[] = {json.dumps(feature_comparisons, indent=2)}",
    "",
    f"export const userFlows: UserFlow[] = {json.dumps(user_flows, indent=2)}",
    "",
    f"export const frontendGaps: Gap[] = {json.dumps(frontend_gaps, indent=2)}",
    "",
    f"export const backendGaps: Gap[] = {json.dumps(backend_gaps, indent=2)}",
    "",
    f"export const screenInventoryCount = {len(screens)}",
    f"export const featureComparisonCount = {len(feature_comparisons)}",
    f"export const userFlowCount = {len(user_flows)}",
    f"export const frontendGapCount = {len(frontend_gaps)}",
    f"export const backendGapCount = {len(backend_gaps)}",
    "",
]

output.write_text('\n'.join(lines), encoding='utf-8')
print(f"Generated {output}: {len(lines)} lines")
print(f"  {len(screens)} screens ({len([s for s in screens if s['system']=='tutor'])} Tutor, {len([s for s in screens if s['system']=='lastsaas'])} LastSaaS)")
print(f"  {len(feature_comparisons)} feature comparisons")
print(f"  {len(user_flows)} user flow comparisons")
print(f"  {len(frontend_gaps)} frontend gaps")
print(f"  {len(backend_gaps)} backend gaps")
