// Auto-generated from lastsaas source code
// DO NOT EDIT — regenerate with scripts/extract-collections.py

export interface LastSaaSPackage { name: string; path: string; files: number; fileList: string[]; source: string; confidence: string }
export interface LastSaaSCollection { name: string; accessor: string; source: string; confidence: string }
export interface LastSaaSRoute { method: string; path: string; handler: string; source: string; confidence: string }
export interface LastSaaSMiddleware { name: string; path: string; functions: string[]; source: string; confidence: string }
export interface LastSaaSModel { name: string; path: string; structs: string[]; source: string; confidence: string }
export interface LastSaaSEvent { name: string; constant: string; source: string; confidence: string }
export interface LastSaaSFile { name: string; path: string; source: string; confidence: string }

export const lastsaasSummary = {
  "totalGoFiles": 134,
  "totalTSFiles": 91,
  "packages": 22,
  "collections": 72,
  "apiRoutes": 190,
  "middleware": 10,
  "models": 22,
  "events": 102,
  "frontendPages": 52,
  "frontendComponents": 18,
  "frontendContexts": 4,
  "apiHandlers": 24
}

export const lastsaasPackages: LastSaaSPackage[] = [
  {
    "name": "api",
    "path": "backend/internal/api",
    "files": 24,
    "fileList": [
      "backend/internal/api/handlers/admin.go",
      "backend/internal/api/handlers/billing.go",
      "backend/internal/api/handlers/webhook.go",
      "backend/internal/api/handlers/messages.go",
      "backend/internal/api/handlers/logs.go",
      "backend/internal/api/handlers/announcements.go",
      "backend/internal/api/handlers/event_definitions.go",
      "backend/internal/api/handlers/webhooks.go",
      "backend/internal/api/handlers/plans.go",
      "backend/internal/api/handlers/health.go"
    ],
    "source": "lastsaas/backend/internal/api/",
    "confidence": "confirmed"
  },
  {
    "name": "apicounter",
    "path": "backend/internal/apicounter",
    "files": 1,
    "fileList": [
      "backend/internal/apicounter/counter.go"
    ],
    "source": "lastsaas/backend/internal/apicounter/",
    "confidence": "confirmed"
  },
  {
    "name": "apierror",
    "path": "backend/internal/apierror",
    "files": 1,
    "fileList": [
      "backend/internal/apierror/apierror.go"
    ],
    "source": "lastsaas/backend/internal/apierror/",
    "confidence": "confirmed"
  },
  {
    "name": "auth",
    "path": "backend/internal/auth",
    "files": 7,
    "fileList": [
      "backend/internal/auth/microsoft_oauth.go",
      "backend/internal/auth/totp.go",
      "backend/internal/auth/ua_parser.go",
      "backend/internal/auth/password.go",
      "backend/internal/auth/jwt.go",
      "backend/internal/auth/github_oauth.go",
      "backend/internal/auth/google_oauth.go"
    ],
    "source": "lastsaas/backend/internal/auth/",
    "confidence": "confirmed"
  },
  {
    "name": "config",
    "path": "backend/internal/config",
    "files": 1,
    "fileList": [
      "backend/internal/config/config.go"
    ],
    "source": "lastsaas/backend/internal/config/",
    "confidence": "confirmed"
  },
  {
    "name": "configstore",
    "path": "backend/internal/configstore",
    "files": 3,
    "fileList": [
      "backend/internal/configstore/validate.go",
      "backend/internal/configstore/seed.go",
      "backend/internal/configstore/store.go"
    ],
    "source": "lastsaas/backend/internal/configstore/",
    "confidence": "confirmed"
  },
  {
    "name": "datadog",
    "path": "backend/internal/datadog",
    "files": 1,
    "fileList": [
      "backend/internal/datadog/client.go"
    ],
    "source": "lastsaas/backend/internal/datadog/",
    "confidence": "confirmed"
  },
  {
    "name": "db",
    "path": "backend/internal/db",
    "files": 2,
    "fileList": [
      "backend/internal/db/mongodb.go",
      "backend/internal/db/schema.go"
    ],
    "source": "lastsaas/backend/internal/db/",
    "confidence": "confirmed"
  },
  {
    "name": "email",
    "path": "backend/internal/email",
    "files": 1,
    "fileList": [
      "backend/internal/email/resend.go"
    ],
    "source": "lastsaas/backend/internal/email/",
    "confidence": "confirmed"
  },
  {
    "name": "events",
    "path": "backend/internal/events",
    "files": 1,
    "fileList": [
      "backend/internal/events/emitter.go"
    ],
    "source": "lastsaas/backend/internal/events/",
    "confidence": "confirmed"
  },
  {
    "name": "health",
    "path": "backend/internal/health",
    "files": 3,
    "fileList": [
      "backend/internal/health/health.go",
      "backend/internal/health/query.go",
      "backend/internal/health/integrations.go"
    ],
    "source": "lastsaas/backend/internal/health/",
    "confidence": "confirmed"
  },
  {
    "name": "metrics",
    "path": "backend/internal/metrics",
    "files": 1,
    "fileList": [
      "backend/internal/metrics/metrics.go"
    ],
    "source": "lastsaas/backend/internal/metrics/",
    "confidence": "confirmed"
  },
  {
    "name": "middleware",
    "path": "backend/internal/middleware",
    "files": 10,
    "fileList": [
      "backend/internal/middleware/bodylimit.go",
      "backend/internal/middleware/recovery.go",
      "backend/internal/middleware/metrics.go",
      "backend/internal/middleware/tenant.go",
      "backend/internal/middleware/auth.go",
      "backend/internal/middleware/apiversion.go",
      "backend/internal/middleware/requestid.go",
      "backend/internal/middleware/security.go",
      "backend/internal/middleware/rbac.go",
      "backend/internal/middleware/ratelimit.go"
    ],
    "source": "lastsaas/backend/internal/middleware/",
    "confidence": "confirmed"
  },
  {
    "name": "models",
    "path": "backend/internal/models",
    "files": 22,
    "fileList": [
      "backend/internal/models/billing.go",
      "backend/internal/models/message.go",
      "backend/internal/models/webhook.go",
      "backend/internal/models/config_var.go",
      "backend/internal/models/tokens.go",
      "backend/internal/models/event_definition.go",
      "backend/internal/models/user.go",
      "backend/internal/models/plan.go",
      "backend/internal/models/sso_connection.go",
      "backend/internal/models/api_key.go"
    ],
    "source": "lastsaas/backend/internal/models/",
    "confidence": "confirmed"
  },
  {
    "name": "planstore",
    "path": "backend/internal/planstore",
    "files": 1,
    "fileList": [
      "backend/internal/planstore/seed.go"
    ],
    "source": "lastsaas/backend/internal/planstore/",
    "confidence": "confirmed"
  },
  {
    "name": "stripe",
    "path": "backend/internal/stripe",
    "files": 1,
    "fileList": [
      "backend/internal/stripe/stripe.go"
    ],
    "source": "lastsaas/backend/internal/stripe/",
    "confidence": "confirmed"
  },
  {
    "name": "syslog",
    "path": "backend/internal/syslog",
    "files": 1,
    "fileList": [
      "backend/internal/syslog/syslog.go"
    ],
    "source": "lastsaas/backend/internal/syslog/",
    "confidence": "confirmed"
  },
  {
    "name": "telemetry",
    "path": "backend/internal/telemetry",
    "files": 1,
    "fileList": [
      "backend/internal/telemetry/service.go"
    ],
    "source": "lastsaas/backend/internal/telemetry/",
    "confidence": "confirmed"
  },
  {
    "name": "testutil",
    "path": "backend/internal/testutil",
    "files": 1,
    "fileList": [
      "backend/internal/testutil/testutil.go"
    ],
    "source": "lastsaas/backend/internal/testutil/",
    "confidence": "confirmed"
  },
  {
    "name": "validation",
    "path": "backend/internal/validation",
    "files": 1,
    "fileList": [
      "backend/internal/validation/validate.go"
    ],
    "source": "lastsaas/backend/internal/validation/",
    "confidence": "confirmed"
  },
  {
    "name": "version",
    "path": "backend/internal/version",
    "files": 2,
    "fileList": [
      "backend/internal/version/version.go",
      "backend/internal/version/check.go"
    ],
    "source": "lastsaas/backend/internal/version/",
    "confidence": "confirmed"
  },
  {
    "name": "webhooks",
    "path": "backend/internal/webhooks",
    "files": 2,
    "fileList": [
      "backend/internal/webhooks/dispatcher.go",
      "backend/internal/webhooks/crypto.go"
    ],
    "source": "lastsaas/backend/internal/webhooks/",
    "confidence": "confirmed"
  }
]

export const lastsaasCollections: LastSaaSCollection[] = [
  {
    "name": "users",
    "accessor": "MongoDB.Users()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenants",
    "accessor": "MongoDB.Tenants()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant_memberships",
    "accessor": "MongoDB.TenantMemberships()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "refresh_tokens",
    "accessor": "MongoDB.RefreshTokens()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "verification_tokens",
    "accessor": "MongoDB.VerificationTokens()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "oauth_states",
    "accessor": "MongoDB.OAuthStates()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "revoked_tokens",
    "accessor": "MongoDB.RevokedTokens()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "system_config",
    "accessor": "MongoDB.SystemConfig()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "invitations",
    "accessor": "MongoDB.Invitations()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "audit_log",
    "accessor": "MongoDB.AuditLog()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "messages",
    "accessor": "MongoDB.Messages()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "system_logs",
    "accessor": "MongoDB.SystemLogs()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "config_vars",
    "accessor": "MongoDB.ConfigVars()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "plans",
    "accessor": "MongoDB.Plans()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "credit_bundles",
    "accessor": "MongoDB.CreditBundles()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "system_nodes",
    "accessor": "MongoDB.SystemNodes()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "system_metrics",
    "accessor": "MongoDB.SystemMetrics()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "financial_transactions",
    "accessor": "MongoDB.FinancialTransactions()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "stripe_mappings",
    "accessor": "MongoDB.StripeMappings()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "counters",
    "accessor": "MongoDB.Counters()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "daily_metrics",
    "accessor": "MongoDB.DailyMetrics()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "webhook_events",
    "accessor": "MongoDB.WebhookEvents()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "leader_locks",
    "accessor": "MongoDB.LeaderLocks()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "api_keys",
    "accessor": "MongoDB.APIKeys()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "webhooks",
    "accessor": "MongoDB.Webhooks()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "webhook_deliveries",
    "accessor": "MongoDB.WebhookDeliveries()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "branding_config",
    "accessor": "MongoDB.BrandingConfig()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "branding_assets",
    "accessor": "MongoDB.BrandingAssets()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "custom_pages",
    "accessor": "MongoDB.CustomPages()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "webauthn_credentials",
    "accessor": "MongoDB.WebAuthnCredentials()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "webauthn_sessions",
    "accessor": "MongoDB.WebAuthnSessions()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "sso_connections",
    "accessor": "MongoDB.SSOConnections()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "announcements",
    "accessor": "MongoDB.Announcements()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "usage_events",
    "accessor": "MongoDB.UsageEvents()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "auth_codes",
    "accessor": "MongoDB.AuthCodes()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "impersonation_logs",
    "accessor": "MongoDB.ImpersonationLogs()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "telemetry_events",
    "accessor": "MongoDB.TelemetryEvents()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  {
    "name": "event_definitions",
    "accessor": "MongoDB.EventDefinitions()",
    "source": "lastsaas/backend/internal/db/mongodb.go",
    "confidence": "confirmed"
  },
  // === LMS v2 collections (from compendium-saas-plan.json) ===
  {
    "name": "courses",
    "accessor": "MongoDB.Courses()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "topics",
    "accessor": "MongoDB.Topics()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lessons",
    "accessor": "MongoDB.Lessons()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course_meta",
    "accessor": "MongoDB.CourseMeta()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructors",
    "accessor": "MongoDB.Instructors()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course_categories",
    "accessor": "MongoDB.CourseCategories()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course_tags",
    "accessor": "MongoDB.CourseTags()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "attachments",
    "accessor": "MongoDB.Attachments()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quizzes",
    "accessor": "MongoDB.Quizzes()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "questions",
    "accessor": "MongoDB.Questions()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz_attempts",
    "accessor": "MongoDB.QuizAttempts()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz_settings",
    "accessor": "MongoDB.QuizSettings()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question_answers",
    "accessor": "MongoDB.QuestionAnswers()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz_imports",
    "accessor": "MongoDB.QuizImports()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question_meta",
    "accessor": "MongoDB.QuestionMeta()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "enrollments",
    "accessor": "MongoDB.Enrollments()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson_progress",
    "accessor": "MongoDB.LessonProgress()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "assignment_submissions",
    "accessor": "MongoDB.AssignmentSubmissions()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "qa_questions",
    "accessor": "MongoDB.QaQuestions()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "qa_answers",
    "accessor": "MongoDB.QaAnswers()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course_reviews",
    "accessor": "MongoDB.CourseReviews()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "student_notes",
    "accessor": "MongoDB.StudentNotes()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course_completions",
    "accessor": "MongoDB.CourseCompletions()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "live_classes",
    "accessor": "MongoDB.LiveClasses()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "resources",
    "accessor": "MongoDB.Resources()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "discussions",
    "accessor": "MongoDB.Discussions()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "discussion_replies",
    "accessor": "MongoDB.DiscussionReplies()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "calendar_events",
    "accessor": "MongoDB.CalendarEvents()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "student_preferences",
    "accessor": "MongoDB.StudentPreferences()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "kids_mode_settings",
    "accessor": "MongoDB.KidsModeSettings()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor_stats",
    "accessor": "MongoDB.InstructorStats()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor_notifications",
    "accessor": "MongoDB.InstructorNotifications()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor_payouts",
    "accessor": "MongoDB.InstructorPayouts()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor_settings",
    "accessor": "MongoDB.InstructorSettings()",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  }
]

export const lastsaasRoutes: LastSaaSRoute[] = [
  {
    "method": "GET",
    "path": "/bootstrap/status",
    "handler": "bootstrapHandler.Status",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/docs",
    "handler": "handlers.DocsHTML",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/docs/markdown",
    "handler": "handlers.DocsMarkdown",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/docs/openapi.json",
    "handler": "handlers.DocsOpenAPI",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding",
    "handler": "brandingHandler.GetBranding",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding/asset/{key}",
    "handler": "brandingHandler.ServeAsset",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding/media/{id}",
    "handler": "brandingHandler.ServeMedia",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding/page/{slug}",
    "handler": "brandingHandler.GetPublicPage",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding/pages",
    "handler": "brandingHandler.ListPublicPages",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/auth/exchange-code",
    "handler": "authHandler.ExchangeCode",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/auth/providers",
    "handler": "authHandler.GetProviders",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/auth/google/callback",
    "handler": "authHandler.GoogleOAuthCallback",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/auth/github/callback",
    "handler": "authHandler.GitHubOAuthCallback",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/auth/microsoft/callback",
    "handler": "authHandler.MicrosoftOAuthCallback",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/me",
    "handler": "authHandler.GetMe",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/logout",
    "handler": "authHandler.Logout",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/change-password",
    "handler": "authHandler.ChangePassword",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/accept-invitation",
    "handler": "authHandler.AcceptInvitation",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/mfa/setup",
    "handler": "authHandler.MFASetup",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/mfa/verify-setup",
    "handler": "authHandler.MFAVerifySetup",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/mfa/disable",
    "handler": "authHandler.MFADisable",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/mfa/regenerate-codes",
    "handler": "authHandler.MFARegenerateRecoveryCodes",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/sessions",
    "handler": "authHandler.ListSessions",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/sessions/{id}",
    "handler": "authHandler.RevokeSession",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/sessions",
    "handler": "authHandler.RevokeAllSessions",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/preferences",
    "handler": "authHandler.UpdatePreferences",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/complete-onboarding",
    "handler": "authHandler.CompleteOnboarding",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/delete-account",
    "handler": "authHandler.DeleteAccount",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/export-data",
    "handler": "authHandler.ExportData",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/members",
    "handler": "tenantHandler.ListMembers",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/activity",
    "handler": "tenantHandler.GetActivity",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/role",
    "handler": "tenantHandler.ChangeRole",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/transfer-ownership",
    "handler": "tenantHandler.TransferOwnership",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/unread-count",
    "handler": "messageHandler.UnreadCount",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/{messageId}/read",
    "handler": "messageHandler.MarkRead",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/summary",
    "handler": "usageHandler.GetSummary",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/billing/webhook",
    "handler": "webhookHandler.HandleWebhook",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/transactions",
    "handler": "billingHandler.ListTransactions",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/transactions/{id}/invoice",
    "handler": "billingHandler.GetInvoice",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/transactions/{id}/invoice/pdf",
    "handler": "billingHandler.GetInvoicePDF",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/config",
    "handler": "billingHandler.GetConfig",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/checkout",
    "handler": "billingHandler.Checkout",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/portal",
    "handler": "billingHandler.Portal",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/cancel",
    "handler": "billingHandler.CancelSubscription",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/about",
    "handler": "adminHandler.GetAbout",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/dashboard",
    "handler": "adminHandler.GetDashboard",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/logs",
    "handler": "logHandler.ListLogs",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/logs/severity-counts",
    "handler": "logHandler.SeverityCounts",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/config",
    "handler": "configHandler.ListConfig",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/config/{name}",
    "handler": "configHandler.GetConfig",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/tenants",
    "handler": "adminHandler.ListTenants",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/tenants/{tenantId}",
    "handler": "adminHandler.GetTenant",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/plans",
    "handler": "plansHandler.ListPlans",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/plans/{planId}",
    "handler": "plansHandler.GetPlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/entitlement-keys",
    "handler": "plansHandler.ListEntitlementKeys",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/credit-bundles",
    "handler": "bundlesHandler.ListBundles",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/health/nodes",
    "handler": "healthHandler.ListNodes",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/health/metrics",
    "handler": "healthHandler.GetMetrics",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/health/current",
    "handler": "healthHandler.GetCurrent",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/health/integrations",
    "handler": "healthHandler.GetIntegrations",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/health/test-email",
    "handler": "healthHandler.SendTestEmail",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/promotions",
    "handler": "promotionsHandler.ListPromotions",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/promotions/eligible-products",
    "handler": "promotionsHandler.ListEligibleProducts",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/announcements",
    "handler": "announcementsHandler.ListAll",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/financial/transactions",
    "handler": "billingHandler.AdminListTransactions",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/financial/metrics",
    "handler": "billingHandler.AdminGetMetrics",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/api-keys",
    "handler": "apiKeysHandler.ListAPIKeys",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/members",
    "handler": "adminHandler.ListRootMembers",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/users",
    "handler": "adminHandler.ListUsers",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/users/{userId}",
    "handler": "adminHandler.GetUser",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/webhooks",
    "handler": "webhooksHandler.ListWebhooks",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/webhooks/event-types",
    "handler": "webhooksHandler.ListEventTypes",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/webhooks/{webhookId}",
    "handler": "webhooksHandler.GetWebhook",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding/media",
    "handler": "brandingHandler.ListMedia",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/branding/pages",
    "handler": "brandingHandler.AdminListPages",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/funnel",
    "handler": "pmHandler.GetFunnel",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/retention",
    "handler": "pmHandler.GetRetention",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/engagement",
    "handler": "pmHandler.GetEngagement",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/kpis",
    "handler": "pmHandler.GetKPIs",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/events",
    "handler": "pmHandler.GetCustomEvents",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/events/types",
    "handler": "pmHandler.ListEventTypes",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/event-definitions",
    "handler": "eventDefsHandler.ListEventDefinitions",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/pm/event-definitions/sankey",
    "handler": "eventDefsHandler.GetSankeyData",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/config",
    "handler": "configHandler.CreateConfig",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/config/{name}",
    "handler": "configHandler.UpdateConfig",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/config/{name}",
    "handler": "configHandler.DeleteConfig",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/users/{userId}",
    "handler": "adminHandler.UpdateUser",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/users/{userId}/status",
    "handler": "adminHandler.UpdateUserStatus",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/users/{userId}/role/{tenantId}",
    "handler": "adminHandler.UpdateUserRole",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/tenants/{tenantId}",
    "handler": "adminHandler.UpdateTenant",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/tenants/{tenantId}/status",
    "handler": "adminHandler.UpdateTenantStatus",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/plans",
    "handler": "plansHandler.CreatePlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/plans/{planId}",
    "handler": "plansHandler.UpdatePlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/plans/{planId}",
    "handler": "plansHandler.DeletePlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/plans/{planId}/archive",
    "handler": "plansHandler.ArchivePlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/plans/{planId}/unarchive",
    "handler": "plansHandler.UnarchivePlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/tenants/{tenantId}/plan",
    "handler": "plansHandler.AssignPlan",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/credit-bundles",
    "handler": "bundlesHandler.CreateBundle",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/credit-bundles/{bundleId}",
    "handler": "bundlesHandler.UpdateBundle",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/credit-bundles/{bundleId}",
    "handler": "bundlesHandler.DeleteBundle",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/promotions",
    "handler": "promotionsHandler.CreatePromotion",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/promotions/update",
    "handler": "promotionsHandler.UpdatePromotion",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/promotions/deactivate",
    "handler": "promotionsHandler.DeactivatePromotion",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/announcements",
    "handler": "announcementsHandler.Create",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/announcements/{id}",
    "handler": "announcementsHandler.Update",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/announcements/{id}",
    "handler": "announcementsHandler.Delete",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/api-keys",
    "handler": "apiKeysHandler.CreateAPIKey",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/api-keys/{keyId}",
    "handler": "apiKeysHandler.DeleteAPIKey",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/members/invite",
    "handler": "adminHandler.InviteRootMember",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/members/invitations/{invitationId}",
    "handler": "adminHandler.CancelRootInvitation",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/members/{userId}",
    "handler": "adminHandler.RemoveRootMember",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/webhooks",
    "handler": "webhooksHandler.CreateWebhook",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/webhooks/{webhookId}",
    "handler": "webhooksHandler.UpdateWebhook",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/webhooks/{webhookId}",
    "handler": "webhooksHandler.DeleteWebhook",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/webhooks/{webhookId}/test",
    "handler": "webhooksHandler.TestWebhook",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/webhooks/{webhookId}/regenerate-secret",
    "handler": "webhooksHandler.RegenerateSecret",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/pm/event-definitions",
    "handler": "eventDefsHandler.CreateEventDefinition",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/pm/event-definitions/{defId}",
    "handler": "eventDefsHandler.UpdateEventDefinition",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/pm/event-definitions/{defId}",
    "handler": "eventDefsHandler.DeleteEventDefinition",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/members/{userId}/role",
    "handler": "adminHandler.ChangeRootMemberRole",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "GET",
    "path": "/users/{userId}/preflight-delete",
    "handler": "adminHandler.PreflightDeleteUser",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/users/{userId}/impersonate",
    "handler": "adminHandler.ImpersonateUser",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/users/{userId}",
    "handler": "adminHandler.DeleteUser",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/tenants/{tenantId}/cancel-subscription",
    "handler": "billingHandler.AdminCancelSubscription",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PATCH",
    "path": "/tenants/{tenantId}/subscription",
    "handler": "billingHandler.AdminUpdateSubscription",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/branding",
    "handler": "brandingHandler.UpdateBranding",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/branding/asset",
    "handler": "brandingHandler.UploadAsset",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/branding/asset/{key}",
    "handler": "brandingHandler.DeleteAsset",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/branding/media",
    "handler": "brandingHandler.UploadMedia",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/branding/media/{id}",
    "handler": "brandingHandler.DeleteMedia",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "POST",
    "path": "/branding/pages",
    "handler": "brandingHandler.CreatePage",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "PUT",
    "path": "/branding/pages/{id}",
    "handler": "brandingHandler.UpdatePage",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  {
    "method": "DELETE",
    "path": "/branding/pages/{id}",
    "handler": "brandingHandler.DeletePage",
    "source": "lastsaas/backend/cmd/server/main.go",
    "confidence": "confirmed"
  },
  // === LMS v2 routes (from compendium-saas-plan.json) — /api/lms/* ===
  {
    "method": "GET",
    "path": "/api/lms/courses",
    "handler": "lmsHandler.Courses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses",
    "handler": "lmsHandler.Courses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:id",
    "handler": "lmsHandler.Courses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/courses/:id",
    "handler": "lmsHandler.Courses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "DELETE",
    "path": "/api/lms/courses/:id",
    "handler": "lmsHandler.Courses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:id/publish",
    "handler": "lmsHandler.CoursesPublish",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:courseId/topics",
    "handler": "lmsHandler.CoursesTopics",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:courseId/topics",
    "handler": "lmsHandler.CoursesTopics",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/topics/:id",
    "handler": "lmsHandler.Topics",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "DELETE",
    "path": "/api/lms/topics/:id",
    "handler": "lmsHandler.Topics",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/topics/:topicId/lessons",
    "handler": "lmsHandler.TopicsLessons",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/topics/:topicId/lessons",
    "handler": "lmsHandler.TopicsLessons",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/lessons/:id",
    "handler": "lmsHandler.Lessons",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "DELETE",
    "path": "/api/lms/lessons/:id",
    "handler": "lmsHandler.Lessons",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/lessons/:lessonId/progress",
    "handler": "lmsHandler.LessonsProgress",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:id/ai-generate",
    "handler": "lmsHandler.CoursesAiGenerate",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/topics/:topicId/quizzes",
    "handler": "lmsHandler.TopicsQuizzes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/topics/:topicId/quizzes",
    "handler": "lmsHandler.TopicsQuizzes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/quizzes/:id",
    "handler": "lmsHandler.Quizzes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "DELETE",
    "path": "/api/lms/quizzes/:id",
    "handler": "lmsHandler.Quizzes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/quizzes/:quizId/attempts",
    "handler": "lmsHandler.QuizzesAttempts",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/quizzes/attempts/:id/submit",
    "handler": "lmsHandler.QuizzesAttemptsSubmit",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/quizzes/:quizId/questions",
    "handler": "lmsHandler.QuizzesQuestions",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/questions/:id",
    "handler": "lmsHandler.Questions",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "DELETE",
    "path": "/api/lms/questions/:id",
    "handler": "lmsHandler.Questions",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/quizzes/export",
    "handler": "lmsHandler.QuizzesExport",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/quizzes/import",
    "handler": "lmsHandler.QuizzesImport",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/questions/:id/preview",
    "handler": "lmsHandler.QuestionsPreview",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/enrollments",
    "handler": "lmsHandler.Enrollments",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:courseId/enroll",
    "handler": "lmsHandler.CoursesEnroll",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/assignments/:id/submit",
    "handler": "lmsHandler.AssignmentsSubmit",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:courseId/qa",
    "handler": "lmsHandler.CoursesQa",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:courseId/qa",
    "handler": "lmsHandler.CoursesQa",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:courseId/reviews",
    "handler": "lmsHandler.CoursesReviews",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:courseId/reviews",
    "handler": "lmsHandler.CoursesReviews",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/notes",
    "handler": "lmsHandler.Notes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/notes",
    "handler": "lmsHandler.Notes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:courseId/announcements",
    "handler": "lmsHandler.CoursesAnnouncements",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/courses/:courseId/complete",
    "handler": "lmsHandler.CoursesComplete",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:courseId/gradebook",
    "handler": "lmsHandler.CoursesGradebook",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/courses/:courseId/resources",
    "handler": "lmsHandler.CoursesResources",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/dashboard/student",
    "handler": "lmsHandler.DashboardStudent",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/student/courses",
    "handler": "lmsHandler.StudentCourses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/notes/:id",
    "handler": "lmsHandler.Notes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "DELETE",
    "path": "/api/lms/notes/:id",
    "handler": "lmsHandler.Notes",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/discussions",
    "handler": "lmsHandler.Discussions",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/discussions",
    "handler": "lmsHandler.Discussions",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/calendar",
    "handler": "lmsHandler.Calendar",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/student/profile",
    "handler": "lmsHandler.StudentProfile",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/student/profile",
    "handler": "lmsHandler.StudentProfile",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "POST",
    "path": "/api/lms/student/kids-mode",
    "handler": "lmsHandler.StudentKidsMode",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/student/preferences",
    "handler": "lmsHandler.StudentPreferences",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "PATCH",
    "path": "/api/lms/student/preferences",
    "handler": "lmsHandler.StudentPreferences",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/dashboard/instructor",
    "handler": "lmsHandler.DashboardInstructor",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/instructor/courses",
    "handler": "lmsHandler.InstructorCourses",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/instructor/analytics",
    "handler": "lmsHandler.InstructorAnalytics",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "method": "GET",
    "path": "/api/lms/instructor/statements",
    "handler": "lmsHandler.InstructorStatements",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  }
]

export const lastsaasMiddleware: LastSaaSMiddleware[] = [
  {
    "name": "apiversion",
    "path": "backend/internal/middleware/apiversion.go",
    "functions": [
      "APIVersion"
    ],
    "source": "backend/internal/middleware/apiversion.go",
    "confidence": "confirmed"
  },
  {
    "name": "auth",
    "path": "backend/internal/middleware/auth.go",
    "functions": [
      "NewAuthMiddleware",
      "GetUserFromContext",
      "GetAPIKeyFromContext",
      "GetImpersonatedBy"
    ],
    "source": "backend/internal/middleware/auth.go",
    "confidence": "confirmed"
  },
  {
    "name": "bodylimit",
    "path": "backend/internal/middleware/bodylimit.go",
    "functions": [
      "BodySizeLimit"
    ],
    "source": "backend/internal/middleware/bodylimit.go",
    "confidence": "confirmed"
  },
  {
    "name": "metrics",
    "path": "backend/internal/middleware/metrics.go",
    "functions": [
      "NewMetricsCollector",
      "percentile"
    ],
    "source": "backend/internal/middleware/metrics.go",
    "confidence": "confirmed"
  },
  {
    "name": "ratelimit",
    "path": "backend/internal/middleware/ratelimit.go",
    "functions": [
      "NewRateLimiter",
      "NewDistributedRateLimiter",
      "GetClientIP"
    ],
    "source": "backend/internal/middleware/ratelimit.go",
    "confidence": "confirmed"
  },
  {
    "name": "rbac",
    "path": "backend/internal/middleware/rbac.go",
    "functions": [
      "RequireRole",
      "RequireRootTenant"
    ],
    "source": "backend/internal/middleware/rbac.go",
    "confidence": "confirmed"
  },
  {
    "name": "recovery",
    "path": "backend/internal/middleware/recovery.go",
    "functions": [
      "Recovery"
    ],
    "source": "backend/internal/middleware/recovery.go",
    "confidence": "confirmed"
  },
  {
    "name": "requestid",
    "path": "backend/internal/middleware/requestid.go",
    "functions": [
      "RequestID",
      "GetRequestID",
      "generateRequestID"
    ],
    "source": "backend/internal/middleware/requestid.go",
    "confidence": "confirmed"
  },
  {
    "name": "security",
    "path": "backend/internal/middleware/security.go",
    "functions": [
      "SecurityHeaders"
    ],
    "source": "backend/internal/middleware/security.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant",
    "path": "backend/internal/middleware/tenant.go",
    "functions": [
      "NewTenantMiddleware",
      "GetTenantFromContext",
      "GetMembershipFromContext",
      "RequireActiveBilling",
      "RequireEntitlement"
    ],
    "source": "backend/internal/middleware/tenant.go",
    "confidence": "confirmed"
  }
]

export const lastsaasModels: LastSaaSModel[] = [
  {
    "name": "announcement",
    "path": "backend/internal/models/announcement.go",
    "structs": [
      "Announcement"
    ],
    "source": "backend/internal/models/announcement.go",
    "confidence": "confirmed"
  },
  {
    "name": "api_key",
    "path": "backend/internal/models/api_key.go",
    "structs": [
      "APIKey"
    ],
    "source": "backend/internal/models/api_key.go",
    "confidence": "confirmed"
  },
  {
    "name": "billing",
    "path": "backend/internal/models/billing.go",
    "structs": [
      "FinancialTransaction",
      "StripeMapping",
      "InvoiceCounter",
      "DailyMetric"
    ],
    "source": "backend/internal/models/billing.go",
    "confidence": "confirmed"
  },
  {
    "name": "branding",
    "path": "backend/internal/models/branding.go",
    "structs": [
      "NavItem",
      "BrandingConfig",
      "BrandingAsset",
      "CustomPage"
    ],
    "source": "backend/internal/models/branding.go",
    "confidence": "confirmed"
  },
  {
    "name": "config_var",
    "path": "backend/internal/models/config_var.go",
    "structs": [
      "ConfigVar"
    ],
    "source": "backend/internal/models/config_var.go",
    "confidence": "confirmed"
  },
  {
    "name": "credit_bundle",
    "path": "backend/internal/models/credit_bundle.go",
    "structs": [
      "CreditBundle"
    ],
    "source": "backend/internal/models/credit_bundle.go",
    "confidence": "confirmed"
  },
  {
    "name": "event_definition",
    "path": "backend/internal/models/event_definition.go",
    "structs": [
      "EventDefinition"
    ],
    "source": "backend/internal/models/event_definition.go",
    "confidence": "confirmed"
  },
  {
    "name": "health",
    "path": "backend/internal/models/health.go",
    "structs": [
      "SystemNode",
      "SystemMetric",
      "CPUMetrics",
      "MemoryMetrics",
      "DiskMetrics",
      "NetworkMetrics",
      "HTTPMetrics",
      "MongoMetrics",
      "GoRuntimeMetrics",
      "IntegrationCountMetrics",
      "IntegrationCheck"
    ],
    "source": "backend/internal/models/health.go",
    "confidence": "confirmed"
  },
  {
    "name": "invitation",
    "path": "backend/internal/models/invitation.go",
    "structs": [
      "Invitation"
    ],
    "source": "backend/internal/models/invitation.go",
    "confidence": "confirmed"
  },
  {
    "name": "membership",
    "path": "backend/internal/models/membership.go",
    "structs": [
      "TenantMembership"
    ],
    "source": "backend/internal/models/membership.go",
    "confidence": "confirmed"
  },
  {
    "name": "message",
    "path": "backend/internal/models/message.go",
    "structs": [
      "Message"
    ],
    "source": "backend/internal/models/message.go",
    "confidence": "confirmed"
  },
  {
    "name": "plan",
    "path": "backend/internal/models/plan.go",
    "structs": [
      "EntitlementValue",
      "Plan"
    ],
    "source": "backend/internal/models/plan.go",
    "confidence": "confirmed"
  },
  {
    "name": "sso_connection",
    "path": "backend/internal/models/sso_connection.go",
    "structs": [
      "SSOConnection",
      "SSOAttributeMap"
    ],
    "source": "backend/internal/models/sso_connection.go",
    "confidence": "confirmed"
  },
  {
    "name": "system",
    "path": "backend/internal/models/system.go",
    "structs": [
      "SystemConfig"
    ],
    "source": "backend/internal/models/system.go",
    "confidence": "confirmed"
  },
  {
    "name": "system_log",
    "path": "backend/internal/models/system_log.go",
    "structs": [
      "SystemLog"
    ],
    "source": "backend/internal/models/system_log.go",
    "confidence": "confirmed"
  },
  {
    "name": "telemetry",
    "path": "backend/internal/models/telemetry.go",
    "structs": [
      "TelemetryEvent"
    ],
    "source": "backend/internal/models/telemetry.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant",
    "path": "backend/internal/models/tenant.go",
    "structs": [
      "Tenant"
    ],
    "source": "backend/internal/models/tenant.go",
    "confidence": "confirmed"
  },
  {
    "name": "tokens",
    "path": "backend/internal/models/tokens.go",
    "structs": [
      "VerificationToken",
      "RefreshToken",
      "RevokedToken",
      "OAuthState",
      "AuthCodeTokenData",
      "AuthCode"
    ],
    "source": "backend/internal/models/tokens.go",
    "confidence": "confirmed"
  },
  {
    "name": "usage_event",
    "path": "backend/internal/models/usage_event.go",
    "structs": [
      "UsageEvent"
    ],
    "source": "backend/internal/models/usage_event.go",
    "confidence": "confirmed"
  },
  {
    "name": "user",
    "path": "backend/internal/models/user.go",
    "structs": [
      "User"
    ],
    "source": "backend/internal/models/user.go",
    "confidence": "confirmed"
  },
  {
    "name": "webauthn_credential",
    "path": "backend/internal/models/webauthn_credential.go",
    "structs": [
      "WebAuthnCredential"
    ],
    "source": "backend/internal/models/webauthn_credential.go",
    "confidence": "confirmed"
  },
  {
    "name": "webhook",
    "path": "backend/internal/models/webhook.go",
    "structs": [
      "Webhook",
      "WebhookDelivery"
    ],
    "source": "backend/internal/models/webhook.go",
    "confidence": "confirmed"
  }
]

export const lastsaasEvents: LastSaaSEvent[] = [
  {
    "name": "system.initialized",
    "constant": "EventSystemInitialized",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "user.registered",
    "constant": "EventUserRegistered",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "user.verified",
    "constant": "EventUserVerified",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "user.logged_in",
    "constant": "EventUserLoggedIn",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "user.deactivated",
    "constant": "EventUserDeactivated",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "user.deleted",
    "constant": "EventUserDeleted",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant.created",
    "constant": "EventTenantCreated",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant.deleted",
    "constant": "EventTenantDeleted",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant.deactivated",
    "constant": "EventTenantDeactivated",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "member.invited",
    "constant": "EventMemberInvited",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "member.joined",
    "constant": "EventMemberJoined",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "member.removed",
    "constant": "EventMemberRemoved",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "member.role_changed",
    "constant": "EventMemberRoleChanged",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "member.ownership_transferred",
    "constant": "EventOwnershipTransferred",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "subscription.activated",
    "constant": "EventSubscriptionActivated",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "subscription.canceled",
    "constant": "EventSubscriptionCanceled",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "payment.received",
    "constant": "EventPaymentReceived",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "payment.failed",
    "constant": "EventPaymentFailed",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "credits.purchased",
    "constant": "EventCreditsPurchased",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "plan.changed",
    "constant": "EventPlanChanged",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "api_key.created",
    "constant": "EventAPIKeyCreated",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  {
    "name": "api_key.revoked",
    "constant": "EventAPIKeyRevoked",
    "source": "lastsaas/backend/internal/events/emitter.go",
    "confidence": "confirmed"
  },
  // === LMS v2 events (from compendium-saas-plan.json) ===
  {
    "name": "course.created",
    "constant": "EventCourseCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course.updated",
    "constant": "EventCourseUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course.published",
    "constant": "EventCoursePublished",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course.drafted",
    "constant": "EventCourseDrafted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course.deleted",
    "constant": "EventCourseDeleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "topic.created",
    "constant": "EventTopicCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "topic.reordered",
    "constant": "EventTopicReordered",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "topic.deleted",
    "constant": "EventTopicDeleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.created",
    "constant": "EventLessonCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.updated",
    "constant": "EventLessonUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.deleted",
    "constant": "EventLessonDeleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.video.uploaded",
    "constant": "EventLessonVideoUploaded",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.created",
    "constant": "EventQuizCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.updated",
    "constant": "EventQuizUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.deleted",
    "constant": "EventQuizDeleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.attempt.started",
    "constant": "EventQuizAttemptStarted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.attempt.submitted",
    "constant": "EventQuizAttemptSubmitted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.attempt.graded",
    "constant": "EventQuizAttemptGraded",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.created",
    "constant": "EventQuestionCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.updated",
    "constant": "EventQuestionUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.deleted",
    "constant": "EventQuestionDeleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.exported",
    "constant": "EventQuizExported",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "quiz.imported",
    "constant": "EventQuizImported",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.multiple_choice.created",
    "constant": "EventQuestionTypeMultipleChoiceCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.true_false.created",
    "constant": "EventQuestionTypeTrueFalseCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.open_ended.created",
    "constant": "EventQuestionTypeOpenEndedCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.fill_blanks.created",
    "constant": "EventQuestionTypeFillBlanksCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.short_answer.created",
    "constant": "EventQuestionTypeShortAnswerCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.matching.created",
    "constant": "EventQuestionTypeMatchingCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.image_answering.created",
    "constant": "EventQuestionTypeImageAnsweringCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.ordering.created",
    "constant": "EventQuestionTypeOrderingCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.puzzle.created",
    "constant": "EventQuestionTypePuzzleCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.scale.created",
    "constant": "EventQuestionTypeScaleCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.coordinates.created",
    "constant": "EventQuestionTypeCoordinatesCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.pin_image.created",
    "constant": "EventQuestionTypePinImageCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "question.type.draw_image.created",
    "constant": "EventQuestionTypeDrawImageCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "enrollment.created",
    "constant": "EventEnrollmentCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "enrollment.completed",
    "constant": "EventEnrollmentCompleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "enrollment.cancelled",
    "constant": "EventEnrollmentCancelled",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.started",
    "constant": "EventLessonStarted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.completed",
    "constant": "EventLessonCompleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "lesson.progress.updated",
    "constant": "EventLessonProgressUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "assignment.submitted",
    "constant": "EventAssignmentSubmitted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "assignment.graded",
    "constant": "EventAssignmentGraded",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "qa.question.asked",
    "constant": "EventQaQuestionAsked",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "qa.question.answered",
    "constant": "EventQaQuestionAnswered",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "announcement.posted",
    "constant": "EventAnnouncementPosted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "review.submitted",
    "constant": "EventReviewSubmitted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course.completed",
    "constant": "EventCourseCompleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "course.progress.milestone",
    "constant": "EventCourseProgressMilestone",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "note.created",
    "constant": "EventNoteCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "note.updated",
    "constant": "EventNoteUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "note.deleted",
    "constant": "EventNoteDeleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "discussion.posted",
    "constant": "EventDiscussionPosted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "discussion.replied",
    "constant": "EventDiscussionReplied",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "kids_mode.enabled",
    "constant": "EventKidsModeEnabled",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "kids_mode.disabled",
    "constant": "EventKidsModeDisabled",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "profile.updated",
    "constant": "EventProfileUpdated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor.course.approved",
    "constant": "EventInstructorCourseApproved",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor.payout.requested",
    "constant": "EventInstructorPayoutRequested",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor.payout.processed",
    "constant": "EventInstructorPayoutProcessed",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "instructor.notification.sent",
    "constant": "EventInstructorNotificationSent",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "cart.item.added",
    "constant": "EventCartItemAdded",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "cart.item.removed",
    "constant": "EventCartItemRemoved",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "checkout.started",
    "constant": "EventCheckoutStarted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "checkout.completed",
    "constant": "EventCheckoutCompleted",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "checkout.failed",
    "constant": "EventCheckoutFailed",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "order.created",
    "constant": "EventOrderCreated",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "order.paid",
    "constant": "EventOrderPaid",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "order.refunded",
    "constant": "EventOrderRefunded",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "order.cancelled",
    "constant": "EventOrderCancelled",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "coupon.applied",
    "constant": "EventCouponApplied",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "coupon.redeemed",
    "constant": "EventCouponRedeemed",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "gateway.connected",
    "constant": "EventGatewayConnected",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "gateway.disconnected",
    "constant": "EventGatewayDisconnected",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "webhook.received",
    "constant": "EventWebhookReceived",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "gateway.stripe.connected",
    "constant": "EventGatewayStripeConnected",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "gateway.paypal.connected",
    "constant": "EventGatewayPaypalConnected",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "gateway.paddle.connected",
    "constant": "EventGatewayPaddleConnected",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  },
  {
    "name": "gateway.authorize.connected",
    "constant": "EventGatewayAuthorizeConnected",
    "source": "saas-plan/compendium-saas-plan.json (LMS v2)",
    "confidence": "planned"
  }
]

export const lastsaasFrontendPages: LastSaaSFile[] = [
  {
    "name": "BootstrapPage",
    "path": "frontend/src/pages/BootstrapPage.tsx",
    "source": "frontend/src/pages/BootstrapPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "APIPage",
    "path": "frontend/src/pages/admin/APIPage.tsx",
    "source": "frontend/src/pages/admin/APIPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "AboutPage",
    "path": "frontend/src/pages/admin/AboutPage.tsx",
    "source": "frontend/src/pages/admin/AboutPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "AnnouncementsPage",
    "path": "frontend/src/pages/admin/AnnouncementsPage.tsx",
    "source": "frontend/src/pages/admin/AnnouncementsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BrandingPage",
    "path": "frontend/src/pages/admin/BrandingPage.tsx",
    "source": "frontend/src/pages/admin/BrandingPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ConfigPage",
    "path": "frontend/src/pages/admin/ConfigPage.tsx",
    "source": "frontend/src/pages/admin/ConfigPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "DashboardPage",
    "path": "frontend/src/pages/admin/DashboardPage.tsx",
    "source": "frontend/src/pages/admin/DashboardPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "EventDefinitionModal",
    "path": "frontend/src/pages/admin/EventDefinitionModal.tsx",
    "source": "frontend/src/pages/admin/EventDefinitionModal.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "FinancialPage",
    "path": "frontend/src/pages/admin/FinancialPage.tsx",
    "source": "frontend/src/pages/admin/FinancialPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "HealthPage",
    "path": "frontend/src/pages/admin/HealthPage.tsx",
    "source": "frontend/src/pages/admin/HealthPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "LogsPage",
    "path": "frontend/src/pages/admin/LogsPage.tsx",
    "source": "frontend/src/pages/admin/LogsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "MessagesPage",
    "path": "frontend/src/pages/admin/MessagesPage.tsx",
    "source": "frontend/src/pages/admin/MessagesPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "PMPage",
    "path": "frontend/src/pages/admin/PMPage.tsx",
    "source": "frontend/src/pages/admin/PMPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "PlansPage",
    "path": "frontend/src/pages/admin/PlansPage.tsx",
    "source": "frontend/src/pages/admin/PlansPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "PromotionsPage",
    "path": "frontend/src/pages/admin/PromotionsPage.tsx",
    "source": "frontend/src/pages/admin/PromotionsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "RootMembersPage",
    "path": "frontend/src/pages/admin/RootMembersPage.tsx",
    "source": "frontend/src/pages/admin/RootMembersPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TenantProfilePage",
    "path": "frontend/src/pages/admin/TenantProfilePage.tsx",
    "source": "frontend/src/pages/admin/TenantProfilePage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TenantsPage",
    "path": "frontend/src/pages/admin/TenantsPage.tsx",
    "source": "frontend/src/pages/admin/TenantsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "UserProfilePage",
    "path": "frontend/src/pages/admin/UserProfilePage.tsx",
    "source": "frontend/src/pages/admin/UserProfilePage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "UsersPage",
    "path": "frontend/src/pages/admin/UsersPage.tsx",
    "source": "frontend/src/pages/admin/UsersPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ChartCard",
    "path": "frontend/src/pages/admin/health/ChartCard.tsx",
    "source": "frontend/src/pages/admin/health/ChartCard.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "CurrentStatusPanel",
    "path": "frontend/src/pages/admin/health/CurrentStatusPanel.tsx",
    "source": "frontend/src/pages/admin/health/CurrentStatusPanel.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "IntegrationsPanel",
    "path": "frontend/src/pages/admin/health/IntegrationsPanel.tsx",
    "source": "frontend/src/pages/admin/health/IntegrationsPanel.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "MetricsCharts",
    "path": "frontend/src/pages/admin/health/MetricsCharts.tsx",
    "source": "frontend/src/pages/admin/health/MetricsCharts.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "NodeCards",
    "path": "frontend/src/pages/admin/health/NodeCards.tsx",
    "source": "frontend/src/pages/admin/health/NodeCards.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TimeRangeSelector",
    "path": "frontend/src/pages/admin/health/TimeRangeSelector.tsx",
    "source": "frontend/src/pages/admin/health/TimeRangeSelector.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ActivityPage",
    "path": "frontend/src/pages/app/ActivityPage.tsx",
    "source": "frontend/src/pages/app/ActivityPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BillingCancelPage",
    "path": "frontend/src/pages/app/BillingCancelPage.tsx",
    "source": "frontend/src/pages/app/BillingCancelPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BillingSuccessPage",
    "path": "frontend/src/pages/app/BillingSuccessPage.tsx",
    "source": "frontend/src/pages/app/BillingSuccessPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BuyCreditsPage",
    "path": "frontend/src/pages/app/BuyCreditsPage.tsx",
    "source": "frontend/src/pages/app/BuyCreditsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "DashboardPage",
    "path": "frontend/src/pages/app/DashboardPage.tsx",
    "source": "frontend/src/pages/app/DashboardPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "OnboardingPage",
    "path": "frontend/src/pages/app/OnboardingPage.tsx",
    "source": "frontend/src/pages/app/OnboardingPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "PlanPage",
    "path": "frontend/src/pages/app/PlanPage.tsx",
    "source": "frontend/src/pages/app/PlanPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "SettingsPage",
    "path": "frontend/src/pages/app/SettingsPage.tsx",
    "source": "frontend/src/pages/app/SettingsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TeamPage",
    "path": "frontend/src/pages/app/TeamPage.tsx",
    "source": "frontend/src/pages/app/TeamPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TestEntitlementsPage",
    "path": "frontend/src/pages/app/TestEntitlementsPage.tsx",
    "source": "frontend/src/pages/app/TestEntitlementsPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BillingTab",
    "path": "frontend/src/pages/app/settings/BillingTab.tsx",
    "source": "frontend/src/pages/app/settings/BillingTab.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "InvoiceModal",
    "path": "frontend/src/pages/app/settings/InvoiceModal.tsx",
    "source": "frontend/src/pages/app/settings/InvoiceModal.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "MFASetupModal",
    "path": "frontend/src/pages/app/settings/MFASetupModal.tsx",
    "source": "frontend/src/pages/app/settings/MFASetupModal.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ProfileTab",
    "path": "frontend/src/pages/app/settings/ProfileTab.tsx",
    "source": "frontend/src/pages/app/settings/ProfileTab.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "SecurityTab",
    "path": "frontend/src/pages/app/settings/SecurityTab.tsx",
    "source": "frontend/src/pages/app/settings/SecurityTab.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "SessionsTab",
    "path": "frontend/src/pages/app/settings/SessionsTab.tsx",
    "source": "frontend/src/pages/app/settings/SessionsTab.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "AuthCallbackPage",
    "path": "frontend/src/pages/auth/AuthCallbackPage.tsx",
    "source": "frontend/src/pages/auth/AuthCallbackPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ForgotPasswordPage",
    "path": "frontend/src/pages/auth/ForgotPasswordPage.tsx",
    "source": "frontend/src/pages/auth/ForgotPasswordPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "LoginPage",
    "path": "frontend/src/pages/auth/LoginPage.tsx",
    "source": "frontend/src/pages/auth/LoginPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "MFAChallengePage",
    "path": "frontend/src/pages/auth/MFAChallengePage.tsx",
    "source": "frontend/src/pages/auth/MFAChallengePage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "MagicLinkVerifyPage",
    "path": "frontend/src/pages/auth/MagicLinkVerifyPage.tsx",
    "source": "frontend/src/pages/auth/MagicLinkVerifyPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ResetPasswordPage",
    "path": "frontend/src/pages/auth/ResetPasswordPage.tsx",
    "source": "frontend/src/pages/auth/ResetPasswordPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "SignupPage",
    "path": "frontend/src/pages/auth/SignupPage.tsx",
    "source": "frontend/src/pages/auth/SignupPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "VerifyEmailPage",
    "path": "frontend/src/pages/auth/VerifyEmailPage.tsx",
    "source": "frontend/src/pages/auth/VerifyEmailPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "CustomPage",
    "path": "frontend/src/pages/public/CustomPage.tsx",
    "source": "frontend/src/pages/public/CustomPage.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "LandingPage",
    "path": "frontend/src/pages/public/LandingPage.tsx",
    "source": "frontend/src/pages/public/LandingPage.tsx",
    "confidence": "confirmed"
  }
]

export const lastsaasFrontendComponents: LastSaaSFile[] = [
  {
    "name": "AdminLayout",
    "path": "frontend/src/components/AdminLayout.tsx",
    "source": "frontend/src/components/AdminLayout.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "AdminRoute",
    "path": "frontend/src/components/AdminRoute.tsx",
    "source": "frontend/src/components/AdminRoute.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BrandingThemeInjector",
    "path": "frontend/src/components/BrandingThemeInjector.tsx",
    "source": "frontend/src/components/BrandingThemeInjector.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ConfirmModal",
    "path": "frontend/src/components/ConfirmModal.tsx",
    "source": "frontend/src/components/ConfirmModal.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ErrorBoundary",
    "path": "frontend/src/components/ErrorBoundary.tsx",
    "source": "frontend/src/components/ErrorBoundary.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ImpersonationBanner",
    "path": "frontend/src/components/ImpersonationBanner.tsx",
    "source": "frontend/src/components/ImpersonationBanner.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Layout",
    "path": "frontend/src/components/Layout.tsx",
    "source": "frontend/src/components/Layout.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "LoadingSpinner",
    "path": "frontend/src/components/LoadingSpinner.tsx",
    "source": "frontend/src/components/LoadingSpinner.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ProtectedRoute",
    "path": "frontend/src/components/ProtectedRoute.tsx",
    "source": "frontend/src/components/ProtectedRoute.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TableSkeleton",
    "path": "frontend/src/components/TableSkeleton.tsx",
    "source": "frontend/src/components/TableSkeleton.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Alert",
    "path": "frontend/src/components/ui/Alert.tsx",
    "source": "frontend/src/components/ui/Alert.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Badge",
    "path": "frontend/src/components/ui/Badge.tsx",
    "source": "frontend/src/components/ui/Badge.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Button",
    "path": "frontend/src/components/ui/Button.tsx",
    "source": "frontend/src/components/ui/Button.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Card",
    "path": "frontend/src/components/ui/Card.tsx",
    "source": "frontend/src/components/ui/Card.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Input",
    "path": "frontend/src/components/ui/Input.tsx",
    "source": "frontend/src/components/ui/Input.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Modal",
    "path": "frontend/src/components/ui/Modal.tsx",
    "source": "frontend/src/components/ui/Modal.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Select",
    "path": "frontend/src/components/ui/Select.tsx",
    "source": "frontend/src/components/ui/Select.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "Textarea",
    "path": "frontend/src/components/ui/Textarea.tsx",
    "source": "frontend/src/components/ui/Textarea.tsx",
    "confidence": "confirmed"
  }
]

export const lastsaasFrontendContexts: LastSaaSFile[] = [
  {
    "name": "AuthContext",
    "path": "frontend/src/contexts/AuthContext.tsx",
    "source": "frontend/src/contexts/AuthContext.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "BrandingContext",
    "path": "frontend/src/contexts/BrandingContext.tsx",
    "source": "frontend/src/contexts/BrandingContext.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "TenantContext",
    "path": "frontend/src/contexts/TenantContext.tsx",
    "source": "frontend/src/contexts/TenantContext.tsx",
    "confidence": "confirmed"
  },
  {
    "name": "ThemeContext",
    "path": "frontend/src/contexts/ThemeContext.tsx",
    "source": "frontend/src/contexts/ThemeContext.tsx",
    "confidence": "confirmed"
  }
]

export const lastsaasApiHandlers: LastSaaSFile[] = [
  {
    "name": "admin",
    "path": "backend/internal/api/handlers/admin.go",
    "source": "backend/internal/api/handlers/admin.go",
    "confidence": "confirmed"
  },
  {
    "name": "announcements",
    "path": "backend/internal/api/handlers/announcements.go",
    "source": "backend/internal/api/handlers/announcements.go",
    "confidence": "confirmed"
  },
  {
    "name": "apikeys",
    "path": "backend/internal/api/handlers/apikeys.go",
    "source": "backend/internal/api/handlers/apikeys.go",
    "confidence": "confirmed"
  },
  {
    "name": "auth",
    "path": "backend/internal/api/handlers/auth.go",
    "source": "backend/internal/api/handlers/auth.go",
    "confidence": "confirmed"
  },
  {
    "name": "billing",
    "path": "backend/internal/api/handlers/billing.go",
    "source": "backend/internal/api/handlers/billing.go",
    "confidence": "confirmed"
  },
  {
    "name": "bootstrap",
    "path": "backend/internal/api/handlers/bootstrap.go",
    "source": "backend/internal/api/handlers/bootstrap.go",
    "confidence": "confirmed"
  },
  {
    "name": "branding",
    "path": "backend/internal/api/handlers/branding.go",
    "source": "backend/internal/api/handlers/branding.go",
    "confidence": "confirmed"
  },
  {
    "name": "bundles",
    "path": "backend/internal/api/handlers/bundles.go",
    "source": "backend/internal/api/handlers/bundles.go",
    "confidence": "confirmed"
  },
  {
    "name": "config",
    "path": "backend/internal/api/handlers/config.go",
    "source": "backend/internal/api/handlers/config.go",
    "confidence": "confirmed"
  },
  {
    "name": "docs",
    "path": "backend/internal/api/handlers/docs.go",
    "source": "backend/internal/api/handlers/docs.go",
    "confidence": "confirmed"
  },
  {
    "name": "event_definitions",
    "path": "backend/internal/api/handlers/event_definitions.go",
    "source": "backend/internal/api/handlers/event_definitions.go",
    "confidence": "confirmed"
  },
  {
    "name": "health",
    "path": "backend/internal/api/handlers/health.go",
    "source": "backend/internal/api/handlers/health.go",
    "confidence": "confirmed"
  },
  {
    "name": "helpers",
    "path": "backend/internal/api/handlers/helpers.go",
    "source": "backend/internal/api/handlers/helpers.go",
    "confidence": "confirmed"
  },
  {
    "name": "logs",
    "path": "backend/internal/api/handlers/logs.go",
    "source": "backend/internal/api/handlers/logs.go",
    "confidence": "confirmed"
  },
  {
    "name": "messages",
    "path": "backend/internal/api/handlers/messages.go",
    "source": "backend/internal/api/handlers/messages.go",
    "confidence": "confirmed"
  },
  {
    "name": "openapi",
    "path": "backend/internal/api/handlers/openapi.go",
    "source": "backend/internal/api/handlers/openapi.go",
    "confidence": "confirmed"
  },
  {
    "name": "plans",
    "path": "backend/internal/api/handlers/plans.go",
    "source": "backend/internal/api/handlers/plans.go",
    "confidence": "confirmed"
  },
  {
    "name": "pm",
    "path": "backend/internal/api/handlers/pm.go",
    "source": "backend/internal/api/handlers/pm.go",
    "confidence": "confirmed"
  },
  {
    "name": "promotions",
    "path": "backend/internal/api/handlers/promotions.go",
    "source": "backend/internal/api/handlers/promotions.go",
    "confidence": "confirmed"
  },
  {
    "name": "telemetry",
    "path": "backend/internal/api/handlers/telemetry.go",
    "source": "backend/internal/api/handlers/telemetry.go",
    "confidence": "confirmed"
  },
  {
    "name": "tenant",
    "path": "backend/internal/api/handlers/tenant.go",
    "source": "backend/internal/api/handlers/tenant.go",
    "confidence": "confirmed"
  },
  {
    "name": "usage",
    "path": "backend/internal/api/handlers/usage.go",
    "source": "backend/internal/api/handlers/usage.go",
    "confidence": "confirmed"
  },
  {
    "name": "webhook",
    "path": "backend/internal/api/handlers/webhook.go",
    "source": "backend/internal/api/handlers/webhook.go",
    "confidence": "confirmed"
  },
  {
    "name": "webhooks",
    "path": "backend/internal/api/handlers/webhooks.go",
    "source": "backend/internal/api/handlers/webhooks.go",
    "confidence": "confirmed"
  }
]
