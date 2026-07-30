# Agent context — `phase1-backend`

**Agent:** z.ai Code
**Started:** 2026-07-29
**Repo:** `/home/z/my-project/repos/lastsaas/backend`
**Module:** `lastsaas`

## Files created/modified in this phase

| Path | Action | Purpose |
|------|--------|---------|
| `internal/models/lms.go` | NEW | 30+ LMS entity structs (Course, Topic, Lesson, Quiz, QuizSettings, Question, Assignment, Enrollment, LessonProgress, QuizAttempt, AssignmentSubmission, QAQuestion, CourseReview, StudentNote, Order, OrderItem, Coupon, Category, Tag, Certificate, CertificateTemplate, CourseBundle, Membership, CourseGift, Notification, CalendarEvent, Migration, InstructorPayout + PaymentGatewayConfig/IntegrationConfig/AddonConfig/FeatureFlag/ThemeOverride/CustomField) with `json`/`bson` tags, `primitive.ObjectID`, `time.Time`, and small validators. |
| `internal/db/lms_collections.go` | NEW | 32 collection accessors on `*MongoDB` (Courses, Topics, Lessons, Quizzes, Questions, Assignments, Enrollments, LessonProgress, QuizAttempts, AssignmentSubmissions, QAQuestions, CourseReviews, StudentNotes, Orders, Coupons, Certificates, CertificateTemplates, CourseBundles, Memberships, CourseGifts, Notifications, CalendarEvents, Migrations, Categories, Tags, InstructorPayouts, PaymentGateways, IntegrationConfigs, AddonConfigs, FeatureFlags, ThemeOverrides, CustomFields). All collections namespaced with `lms_` prefix to avoid colliding with core collections. |
| `internal/events/lms_events.go` | NEW | ~70 LMS event constants (`course.created`, `course.updated`, `course.published`, `course.deleted`, `topic.*`, `lesson.*`, `quiz.*`, `quiz.attempt.*`, `question.*`, `assignment.*`, `enrollment.*`, `qa.*`, `review.*`, `order.*`, `coupon.*`, `certificate.*`, `bundle.*`, `membership.*`, `gift.*`, `notification.*`, `calendar.*`, `migration.*`, `instructor_payout.*`, `addon.*`, `integration.*`). |
| `internal/api/handlers/lms.go` | REWRITTEN | Real Course CRUD (List/Create/Get/Update/Delete/Publish). Uses `mux.Vars(r)["id"]`, `json.NewDecoder(r.Body).Decode(...)`, `respondWithJSON` (which uses `json.NewEncoder`), `h.db.Courses()`, and `h.emitter.Emit(events.Event{...})`. Adds `getLMSContext` / `requireLMSContext` helpers that pull the tenant/user/membership from the request context via `middleware.GetTenantFromContext` / `GetUserFromContext` / `GetMembershipFromContext`, with a `mux.Vars(r)["tenantId"]` fallback. All other handlers (Topics, Lessons, Quizzes, etc.) remain stubs returning 501, per the task spec. |
| `config/dev.yaml` | NEW | Dev config with MongoDB Atlas URI as the default for `${MONGODB_URI}` and database name `tutor_lms_saas` as the default for `${DATABASE_NAME}`. JWT secrets ship with 32+ char dev defaults so the validator passes. |
| `backend/.env` | NEW | Full env file (Atlas URI, DB name, JWT secrets, server config, blank optional integrations) — picked up by `internal/config.LoadEnvFile()` when running from the backend dir. |
| `lastsaas/.env` | NEW | Minimal root-level env file (picked up when running from the repo root). |

## Build status

```text
$ export PATH="/home/z/go/go/bin:$PATH" && export GOPATH="/home/z/go"
$ cd /home/z/my-project/repos/lastsaas/backend
$ go build ./...    # exit 0, no output
$ go vet ./...      # only pre-existing tenant_test.go warnings
```

## Server startup

```text
$ go run ./cmd/server/
2026/07/29 22:48:11 INFO Starting LastSaaS mode=dev
2026/07/29 22:48:21 ERROR Failed to connect to MongoDB error="failed to ping
  MongoDB: server selection error: context deadline exceeded, current topology:
  { Type: ReplicaSetNoPrimary, Servers: [...{Last error: remote error: tls:
  internal error}...] }"
exit status 1
```

The TLS `internal_error` alert from Atlas's edge is the classic signature
of a Network Access List (IP whitelist) block — `openssl s_client` confirms
no peer certificate is exchanged and only 7 bytes are read before the alert
fires. NAT egress IPs observed from this sandbox:
`47.57.232.232`, `47.57.242.119`, `8.212.10.159`.

**Action required to finish Atlas connectivity:** add `0.0.0.0/0` (or those
three IPs / their parent CIDRs `47.57.232.0/21` and `8.212.10.0/24`) to the
MongoDB Atlas `Cluster0` project's Network Access list. After that,
re-running `go run ./cmd/server/` will succeed and the LMS collections will
be created lazily on first write.

## Key patterns the next agent should reuse

- **Tenant identity in LMS handlers:** `h.requireLMSContext(w, r)` returns
  `lmsContext{TenantID, UserID, IsInstructor}` or writes a 400/401 itself.
  Don't reach into `mux.Vars(r)["tenantId"]` for tenant identity in LMS —
  the routes don't expose `{tenantId}` in the path; the middleware
  populates the context from the `X-Tenant-ID` header.
- **Patch updates:** `UpdateCourse` decodes the body into a
  `map[string]interface{}`, strips identity/audit fields, validates
  enumerations, then runs `UpdateByID(ctx, id, bson.M{"$set": patch})`.
  Reuse this for Topic/Lesson/Quiz/Question updates.
- **Collection naming:** LMS collections use the `lms_` prefix to avoid
  colliding with core collections (`users`, `tenants`, `messages`, …).
  Add new LMS collections to `internal/db/lms_collections.go` with the
  same prefix.
- **Events:** every state-mutating handler should `h.emitter.Emit(...)`
  the matching constant from `internal/events/lms_events.go`.
- **Helpers available:** `respondWithJSON` / `respondWithError`
  (`helpers.go`), `decodeJSON` (`admin.go`), `escapeRegexInput`
  (`helpers.go`), `parsePositiveInt` (`lms.go`, new).

## Things explicitly NOT done in this phase (intentional)

- No JSON Schema validators added for LMS collections in
  `internal/db/schema.go` (out of scope).
- No LMS indexes added to `MongoDB.ensureIndexes()` in `mongodb.go`
  (out of scope; would be a worthwhile follow-up).
- All non-Course LMS handlers (Topics, Lessons, Quizzes, Questions,
  Assignments, Enrollments, Q&A, Reviews, Notes, Categories, Tags,
  Orders, Coupons, Certificates, Bundles, Memberships, Gifts, Payouts,
  Notifications, Calendar, Migrations, Addons) remain `notImplemented`
  stubs returning HTTP 501. They're wired up in `cmd/server/main.go`
  and ready to be filled in by future agents.

See `/home/z/my-project/worklog.md` for the full narrative.
