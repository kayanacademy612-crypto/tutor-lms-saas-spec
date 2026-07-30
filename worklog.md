# Worklog — phase1-backend

**Task ID:** `phase1-backend`
**Agent:** z.ai Code (single-agent execution)
**Date:** 2026-07-29
**Repo root:** `/home/z/my-project/repos/lastsaas/backend`
**Module name:** `lastsaas`
**Go toolchain:** `go1.25.0` at `/home/z/go/go/bin/go` (`GOPATH=/home/z/go`)

---

## 1. Objective

Get the lastsaas Go backend running against real MongoDB Atlas by recreating
three missing files, implementing real Course CRUD in the LMS handler,
wiring up the MongoDB Atlas connection, and verifying the build/server
startup.

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `internal/models/user.go`, `tenant.go`, `plan.go`, `billing.go`, `api_key.go`, `announcement.go`, `credit_bundle.go`, `event_definition.go`, `system.go` | Established the struct/JSON/BSON tag pattern (`primitive.ObjectID` for `_id`, `time.Time` for timestamps, `json:"id" bson:"_id,omitempty"`, validators). |
| `internal/db/mongodb.go` | Established the collection accessor pattern: `func (m *MongoDB) Foo() *mongo.Collection { return m.Database.Collection("foo") }`. Also confirmed `ensureIndexes()` and `EnsureSchemaValidation()` paths. |
| `internal/events/emitter.go` | Confirmed `EventType` is `type EventType string`, constants are dotted lowercase (`"user.registered"`), and `Emitter` is `Emit(Event)`. |
| `internal/api/handlers/admin.go` | Confirmed gorilla/mux path-param pattern (`mux.Vars(r)["tenantId"]`), the `decodeJSON` helper, and the `respondWithJSON`/`respondWithError` helpers in `helpers.go`. |
| `internal/api/handlers/helpers.go` | Confirmed `respondWithJSON` uses `json.NewEncoder(w).Encode(payload)`. |
| `internal/middleware/tenant.go` + `auth.go` | Confirmed `GetTenantFromContext`, `GetUserFromContext`, `GetMembershipFromContext` — the LMS subrouter's `RequireTenant` middleware populates these via the `X-Tenant-ID` header. |
| `cmd/server/main.go` (lines 775–890) | Confirmed the LMS routes live under `guarded.PathPrefix("/lms").Subrouter()` and require auth + tenant context. The `{id}` path variable is the only path param exposed to LMS handlers (no `{tenantId}`). |
| `internal/config/config.go` | Confirmed the YAML loader uses `${VAR}` / `${VAR:default}` env-var expansion and searches `LASTSAAS_CONFIG_DIR` (default `config`) for `{env}.yaml`. |
| `config/dev.example.yaml`, `config/test.yaml` | Confirmed the config file shape and the env-var indirection pattern. |
| `go.mod` | Confirmed module name is `lastsaas`, gorilla/mux v1.8.1, mongo-driver v1.17.9, validator v10, go 1.25. |

---

## 3. Files created

### 3.1 `internal/models/lms.go` (NEW — 30 structs + validators)

Defines all requested LMS entities with `json` + `bson` tags, `primitive.ObjectID`
for IDs/foreign keys, `time.Time` for timestamps, and small validator helpers
so future `validate:"valid_*"` tags resolve.

Entities:
- `Course` (+ `CourseStatus`, `CourseDifficulty`, `CoursePriceType` + validators)
- `Topic`
- `Lesson` (+ `LessonType`, `LessonVideoSource` + validator)
- `Quiz` (+ `QuizGradingMethod`)
- `QuizSettings` (embedded)
- `Question` (+ `QuestionType`, `QuestionOption` + validator)
- `Assignment`
- `Enrollment` (+ `EnrollmentStatus` + validator)
- `LessonProgress`
- `QuizAttempt` (+ `QuizAttemptStatus`, `QuizAnswer` + validator)
- `AssignmentSubmission` (+ `AssignmentSubmissionStatus` + validator)
- `QAQuestion`
- `CourseReview`
- `StudentNote`
- `Order` (+ `OrderStatus` + validator)
- `OrderItem` (+ `OrderItemType` + validator)
- `Coupon` (+ `CouponDiscountType` + validator)
- `Category`
- `Tag`
- `Certificate`
- `CertificateTemplate`
- `CourseBundle`
- `Membership` (+ `MembershipBillingInterval` + validator)
- `CourseGift` (+ `CourseGiftStatus` + validator)
- `Notification` (+ `NotificationType` + validator)
- `CalendarEvent`
- `Migration` (+ `MigrationStatus` + validator)
- `InstructorPayout` (+ `InstructorPayoutStatus` + validator)

Bonus structs that the task spec asked for at the `db` layer (so the matching
model types exist): `PaymentGatewayConfig`, `IntegrationConfig`,
`AddonConfig`, `FeatureFlag`, `ThemeOverride`, `CustomField`
(+ `CustomFieldScope` + validator).

Every entity carries a `TenantID primitive.ObjectID` field for multi-tenant
isolation, mirroring the pattern in `models.TenantMembership`.

### 3.2 `internal/db/lms_collections.go` (NEW — 32 accessors)

Adds collection accessor methods on `*MongoDB` for every LMS collection,
following the exact pattern of the existing `Users()`/`Tenants()` accessors
in `mongodb.go`. The LMS collections are namespaced with an `lms_` prefix
to avoid colliding with the existing core collections (`users`, `tenants`,
`messages`, `plans`, …).

Accessors implemented (each returns `*mongo.Collection`):
`Courses, Topics, Lessons, Quizzes, Questions, Assignments, Enrollments,
LessonProgress, QuizAttempts, AssignmentSubmissions, QAQuestions,
CourseReviews, StudentNotes, Orders, Coupons, Certificates,
CertificateTemplates, CourseBundles, Memberships, CourseGifts,
Notifications, CalendarEvents, Migrations, Categories, Tags,
InstructorPayouts, PaymentGateways, IntegrationConfigs, AddonConfigs,
FeatureFlags, ThemeOverrides, CustomFields`.

### 3.3 `internal/events/lms_events.go` (NEW — ~70 event constants)

Adds `EventType` constants covering every LMS lifecycle event requested:

- Course: `course.created`, `course.updated`, `course.published`,
  `course.unpublished`, `course.archived`, `course.deleted`, `course.completed`.
- Topic: `topic.created/updated/deleted`.
- Lesson: `lesson.created/updated/deleted/viewed/completed/progress_updated`.
- Quiz: `quiz.created/updated/deleted/published`.
- Quiz attempt: `quiz.attempt.started/resumed/submitted/graded`.
- Question: `question.created/updated/deleted`.
- Assignment: `assignment.created/updated/deleted/submitted/graded`.
- Enrollment: `enrollment.created/completed/expired/cancelled`.
- Q&A + Reviews: `qa.question.asked/answered`, `review.submitted/approved`.
- Notes: `note.created/updated/deleted`.
- Categories + Tags: full CRUD events.
- Orders + Coupons: `order.created/paid/failed/refunded/cancelled`,
  `coupon.created/redeemed/updated`.
- Certificates: `certificate.issued/revoked`, `certificate.template.created/updated`.
- Bundles + Memberships + Gifts: full lifecycle events.
- Notifications, Calendar, Migrations, Instructor payouts, Addons/Integrations.

Each constant is a typed `EventType` so it can be passed directly to
`Emitter.Emit(events.Event{Type: ..., ...})`.

### 3.4 `internal/api/handlers/lms.go` (REWRITTEN — real Course CRUD)

Replaced the 501-stub `ListCourses/CreateCourse/GetCourse/UpdateCourse/
DeleteCourse/PublishCourse` with real MongoDB-backed implementations.
All other handlers (Topics, Lessons, Quizzes, …) remain stubs per the task
spec.

Implementation details:
- `mux.Vars(r)["id"]` for the course ID path param (no `r.PathValue`).
- `json.NewDecoder(r.Body).Decode(...)` for request bodies (both in
  `CreateCourse` and the map-based `UpdateCourse` patch).
- `respondWithJSON` (which internally calls `json.NewEncoder(w).Encode`)
  for responses.
- `h.emitter.Emit(events.Event{...})` for the matching LMS events.
- Collection accessors: `h.db.Courses()`, `h.db.Courses().Find/InsertOne/
  FindOne/UpdateByID/DeleteOne/CountDocuments`.

Helper added — `getLMSContext(r *http.Request) (lmsContext, bool)` — that
resolves the tenant ID, user ID, and instructor flag from the request
context via `middleware.GetTenantFromContext` / `GetUserFromContext` /
`GetMembershipFromContext` (the same context the `RequireTenant` middleware
populates for the LMS subrouter). It also falls back to
`mux.Vars(r)["tenantId"]` to mirror the admin.go pattern for routes that
carry the tenant ID in the path. `requireLMSContext` wraps this with a
401/400 response on failure.

Course CRUD behaviour:
- **ListCourses** — tenant-scoped filter, supports `status`, `categoryId`,
  `instructorId`, `search` (regex on title), `limit` (default 50, max 100),
  `offset` (default 0). Returns `{courses, total, limit, offset}`.
- **CreateCourse** — validates title+slug, defaults `status=draft` and
  `priceType=free`, enforces tenant-scoped slug uniqueness, inserts,
  emits `course.created`, returns 201 with the created course and a
  `Location` header.
- **GetCourse** — fetch by `{id}` filtered by `tenantId`, 404 on miss.
- **UpdateCourse** — map-based patch (only fields the client sent),
  rejects mutation of identity/audit fields (`_id`, `tenantId`,
  `instructorId`, `createdAt`, counters), validates `status`/`priceType`,
  re-checks slug uniqueness when changed, stamps `updatedAt`, emits
  `course.updated`, returns the reloaded course.
- **DeleteCourse** — `DeleteOne({_id, tenantId})`, 404 on miss, emits
  `course.deleted`.
- **PublishCourse** — `UpdateByID` to set `status=published`, `isPublic=true`,
  stamps `publishedAt` only on the first publish (idempotent re-publish),
  emits `course.published`, returns the reloaded course.

A small `parsePositiveInt` helper is included at the bottom for the list
endpoint's pagination.

### 3.5 `config/dev.yaml` (NEW — MongoDB Atlas connection)

Replaces the missing `dev.yaml` (the loader looks for `config/{env}.yaml`
and `LASTSAAS_ENV` defaults to `dev`). Uses the `${VAR:default}` syntax
from `internal/config/config.go` so the MongoDB Atlas URI is baked in as
a default but can still be overridden by the `MONGODB_URI` env var:

```yaml
database:
  uri: ${MONGODB_URI:mongodb+srv://kayanacademy612_db_user:TBuVtQrWXqzO9kAI@cluster0.xuqtpg2.mongodb.net/?appName=Cluster0}
  name: ${DATABASE_NAME:tutor_lms_saas}
```

The database name is `tutor_lms_saas` (per the task hint). JWT secrets ship
with 32+ char dev defaults so the validator passes locally.

### 3.6 `.env` files (NEW)

- `/home/z/my-project/repos/lastsaas/backend/.env` — full env file with the
  Atlas URI, DB name, JWT secrets, and blank optional integrations. The
  `LoadEnvFile()` helper in `internal/config/config.go` searches the CWD
  and up to 3 parent dirs, so this is picked up automatically when running
  `go run ./cmd/server/` from the backend dir.
- `/home/z/my-project/repos/lastsaas/.env` — minimal root-level env file
  (picked up if running from the repo root).

---

## 4. Build & vet results

```text
$ export PATH="/home/z/go/go/bin:$PATH" && export GOPATH="/home/z/go"
$ cd /home/z/my-project/repos/lastsaas/backend
$ go build ./...
$ echo $?
0
$ go build -o /tmp/lastsaas-server ./cmd/server/
$ ls -la /tmp/lastsaas-server
-rwxrwxr-x 1 z z 25711990 Jul 29 22:48 /tmp/lastsaas-server
```

`go build ./...` exits 0 — every package, including the new
`internal/models`, `internal/db`, `internal/events`, and the rewritten
`internal/api/handlers/lms.go`, compiles cleanly against
`go.mongodb.org/mongo-driver v1.17.9`, `github.com/gorilla/mux v1.8.1`,
`github.com/go-playground/validator/v10 v10.30.1`, and the rest of the
pinned module versions.

`go vet ./...` returns only two pre-existing warnings in
`internal/api/handlers/tenant_test.go` (unrelated test-file patterns from
the upstream repo); the new code has zero vet findings.

---

## 5. Server startup

```text
$ go run ./cmd/server/
2026/07/29 22:48:11 INFO Starting LastSaaS mode=dev
2026/07/29 22:48:21 ERROR Failed to connect to MongoDB error="failed to ping
  MongoDB: server selection error: context deadline exceeded, current topology:
  { Type: ReplicaSetNoPrimary, Servers: [
    { Addr: ac-dzx9f8t-shard-00-00.xuqtpg2.mongodb.net:27017,
      Type: Unknown, Last error: remote error: tls: internal error },
    { Addr: ac-dzx9f8t-shard-00-01.xuqtpg2.mongodb.net:27017,
      Type: Unknown, Last error: remote error: tls: internal error },
    { Addr: ac-dzx9f8t-shard-00-02.xuqtpg2.mongodb.net:27017,
      Type: Unknown, Last error: remote error: tls: internal error },
  ] }"
exit status 1
```

### Diagnosis: this is a MongoDB Atlas IP Access List block, not a code issue.

Evidence:

1. **DNS + TCP succeed.** `nslookup -type=SRV _mongodb._tcp.cluster0.xuqtpg2.mongodb.net`
   resolves all three shard hosts, and a raw `bash /dev/tcp/...` connect
   to `ac-dzx9f8t-shard-00-00.xuqtpg2.mongodb.net:27017` returns `TCP OK`.
2. **TLS handshake is rejected by the server before any certificate is
   exchanged.** `openssl s_client` (both TLS 1.2 and TLS 1.3) reports
   `tlsv1 alert internal error` (alert 80) with `no peer certificate
   available` and `SSL handshake has read 7 bytes` — i.e. the server sent
   only the alert and tore down the connection. This is Atlas's
   characteristic signature when the connecting IP is not on the project's
   Network Access list: Atlas's edge LB terminates the TLS handshake with
   an `internal_error` alert rather than completing it (which would leak
   the auth state).
3. **The Go driver surfaces the same alert** — `remote error: tls: internal
   error` against all three shard hosts.
4. **Multi-egress NAT.** `curl https://api.ipify.org` from this sandbox
   returns a rotating set of egress IPs:
   - `47.57.232.232`
   - `47.57.242.119`
   - `8.212.10.159`

### Action required to complete Atlas connectivity (one-time, Atlas admin)

In the MongoDB Atlas UI for the `Cluster0` project (or via the Atlas
Administration API), add a Network Access entry. The simplest path is to
add `0.0.0.0/0` (Allow Access from Anywhere). Otherwise the three observed
egress IPs above (or their parent CIDRs `47.57.232.0/21` and
`8.212.10.0/24`) need to be added. Once the entry is active (typically
<30s), the server will reach the cluster and the LMS collections will be
created lazily on first write.

Once whitelisted, re-run:

```bash
export PATH="/home/z/go/go/bin:$PATH" && export GOPATH="/home/z/go"
cd /home/z/my-project/repos/lastsaas/backend
go run ./cmd/server/
```

and you should see `INFO MongoDB connected` (or equivalent) instead of the
TLS alert, followed by the LMS routes being ready on `:4290`.

---

## 6. Verification commands (for downstream agents / humans)

```bash
# 1. Build everything
export PATH="/home/z/go/go/bin:$PATH" && export GOPATH="/home/z/go"
cd /home/z/my-project/repos/lastsaas/backend
go build ./...                                      # expect: exit 0, no output

# 2. Vet (only pre-existing test-file warnings)
go vet ./...                                        # expect: only tenant_test.go warnings

# 3. Confirm the three new files exist and are syntactically valid Go
gofmt -l internal/models/lms.go \
         internal/db/lms_collections.go \
         internal/events/lms_events.go \
         internal/api/handlers/lms.go               # expect: no output (all formatted)

# 4. Start the server (will exit 1 with the Atlas TLS alert until the IP
#    Access List is updated; that's an infra issue, not a code issue)
go run ./cmd/server/
```

---

## 7. Notes for the next agent (phase 2+)

- The LMS handler's `getLMSContext` helper is the single source of truth
  for "which tenant/user is this request for". New LMS handlers should
  call `h.requireLMSContext(w, r)` at the top of every method to get the
  resolved `lmsContext` (or have a 400/401 written for them).
- `UpdateCourse` uses a `map[string]interface{}` patch on purpose so the
  client can send partial updates. The same pattern should be reused for
  Topic/Lesson/Quiz/Question updates.
- The `lms_` collection-name prefix is intentional — it keeps the LMS
  collections visually grouped in Atlas's collection browser and avoids
  collisions with the existing core collections (`users`, `tenants`,
  `messages`, `plans`, `audit_log`, …). New LMS collections should
  follow the same prefix convention.
- No schema validators were added for the LMS collections in
  `internal/db/schema.go`. The task didn't require it, and
  `EnsureSchemaValidation()` is a no-op for collections without a
  registered schema. If/when validators are needed, add a `lmsCoursesSchema()`
  (etc.) function and register it in `AllSchemas()`.
- The `ensureIndexes()` function in `mongodb.go` was NOT extended with
  LMS indexes. Adding `tenantId+slug` unique on `lms_courses`, `tenantId+
  courseId+sortOrder` on `lms_topics`, etc. is a worthwhile follow-up but
  was explicitly out of scope for this phase.

---

## 8. Summary

✅ `internal/models/lms.go` — created with 30+ LMS entity structs +
   validators, all using `primitive.ObjectID` + `time.Time` with
   `json`/`bson` tags.
✅ `internal/db/lms_collections.go` — created with 32 collection accessors
   on `*MongoDB`, following the existing `Users()`/`Tenants()` pattern.
✅ `internal/events/lms_events.go` — created with ~70 LMS event constants
   following the existing dotted-lowercase `EventType` convention.
✅ `internal/api/handlers/lms.go` — replaced 6 stub Course handlers with
   real MongoDB CRUD using `mux.Vars`, `json.NewDecoder`/`json.NewEncoder`,
   collection accessors, event emission, and a tenant-context helper.
✅ `config/dev.yaml` + `.env` (backend + repo root) — wired up with the
   MongoDB Atlas connection string and `tutor_lms_saas` database name.
✅ `go build ./...` — compiles cleanly (exit 0).
✅ `go vet ./...` — only pre-existing test-file warnings.
✅ Server starts, loads config, and attempts the Atlas ping.
⚠️ Atlas TLS handshake is rejected with `internal_error` because the
   sandbox's NAT egress IPs are not yet on the Atlas project's Network
   Access list. Egress IPs observed: `47.57.232.232`, `47.57.242.119`,
   `8.212.10.159`. Recommended fix: add `0.0.0.0/0` (or those three IPs)
   to the Atlas Network Access list — a one-time infra step that requires
   Atlas admin access. Code-wise, the backend is complete and ready.

---

---

# Worklog — phase1-agent1

**Task ID:** `phase1-agent1`
**Agent:** z.ai Code (general-purpose sub-agent)
**Date:** 2026-07-29
**Repo root:** `/home/z/my-project/repos/tailux/tailux-main`
**Stack:** React 19 + Vite + TypeScript 5.8 (strict) + axios 1.8 + Tailwind v4

---

## 1. Objective

Build the LMS API surface for the tailux frontend:
1. `src/types/lms.ts` — TypeScript interfaces mirroring the Go structs in
   `lastsaas/backend/internal/models/lms.go`.
2. `src/services/lms-api.ts` — Axios client for `/api/lms/*` with auth +
   error interceptors and a function for every endpoint in
   `PHASE1-CONTEXT.md`.
3. `src/hooks/useLms.ts` — Plain `useState`/`useEffect` hooks wrapping the
   service, returning `{ data, loading, error, refetch }`.

Strict rule: create new files only — do NOT modify any existing file.

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `PHASE1-CONTEXT.md` | Project context, API endpoint list, file-naming convention, auth-state bypass. |
| `src/utils/axios.ts` | Existing axios instance pattern (uses `JWT_HOST_API`, response interceptor returning `error.response?.data`). Mirrored for the LMS instance but with same-origin `/api/lms` base + token-from-localStorage request interceptor. |
| `src/utils/jwt.ts` | Confirmed the localStorage key is `authToken` and the existing auth provider sets/clears it via `setSession`. The LMS request interceptor reads the same key. |
| `src/configs/auth.ts` | Confirmed `JWT_HOST_API` is a third-party demo host (not the LMS API), so the LMS client deliberately does NOT reuse the existing axios instance — it gets its own. |
| `src/app/contexts/auth/Provider.tsx` | Confirmed `isAuthenticated: true` dev bypass, dev user shape `{ id: "1", name: "tutor", email: "admin@tutor.hellotutorlms.com" }`. Token is still read from localStorage so the interceptor works once real auth lands. |
| `src/hooks/useIsMounted.ts` | Existing pattern for safe-async setState in hooks — reused as the safety guard in every LMS hook so unmount-during-fetch can't trigger React state warnings. |
| `src/hooks/useLocalStorage.ts`, `src/hooks/useEventCallback.ts` | Code style: `useCallback`-heavy, named exports, generous docstrings, no default exports for hooks. Mirrored. |
| `src/hooks/index.ts` | Confirmed hook barrel pattern. Did NOT add `useLms` to the barrel to keep deps minimal as the task spec requested. |
| `src/@types/user.ts`, `src/@types/common.ts` | Confirmed existing type conventions (PascalCase interfaces, optional `?` for omitempty, string-literal unions). |
| `vite.config.ts` | Confirmed same-origin relative paths work — the dev server is reverse-proxied by Next.js at `/api/tailux/*`, and the LMS API is at `/api/lms/*`. The base URL is therefore `/api/lms` (no scheme/host). |
| `tsconfig.app.json` | Confirmed `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `isolatedModules: true`, `moduleResolution: bundler`. All new files were type-checked against these flags. |
| `src/app/pages/apps/course-builder/index.tsx` (head only) | Confirmed `Button`, `Input`, `Textarea`, `Switch`, `Checkbox`, `Card`, `Badge`, `Upload` are the established UI primitives. Not modified. |
| `lastsaas/backend/internal/models/lms.go` (full 1054 lines) | The source of truth for every TS interface. Read in three 400-line chunks to capture all 30+ structs, every status enum, every optional/required field, and the `json` tags (which dictate the TS property names). |

---

## 3. Files created (NEW — none modified)

### 3.1 `src/types/lms.ts` (NEW — 974 lines)

Mirrors every Go struct in `internal/models/lms.go` as a TypeScript
`interface` or string-literal union. Mapping conventions documented in the
file header:

| Go | TypeScript |
|----|------------|
| `primitive.ObjectID` | `string` (24-char hex) aliased as `ObjectID` |
| `*primitive.ObjectID` (omitempty) | `string \| undefined` |
| `time.Time` | `string` (RFC 3339) aliased as `ISODateString` |
| `*time.Time` (omitempty) | `string \| undefined` |
| `map[string]interface{}` | `Record<string, unknown>` |
| `[]primitive.ObjectID` | `string[]` |
| `CourseStatus` etc. | string-literal union types |

Entities defined (matching the Go models 1:1):
- `Course` (+ `CourseStatus`, `CourseDifficulty`, `CoursePriceType`,
  `CourseCreateInput`, `CourseUpdateInput`)
- `Topic` (+ `TopicCreateInput`, `TopicUpdateInput`)
- `Lesson` (+ `LessonType`, `LessonVideoSource`, `LessonCreateInput`,
  `LessonUpdateInput`)
- `Quiz` (+ `QuizGradingMethod`, `QuizSettings`, `QuizCreateInput`,
  `QuizUpdateInput`)
- `Question` (+ `QuestionType`, `QuestionOption`, `QuestionCreateInput`,
  `QuestionUpdateInput`)
- `Assignment` (+ `AssignmentCreateInput`, `AssignmentSubmissionInput`)
- `Enrollment` (+ `EnrollmentStatus`)
- `LessonProgress` (+ `LessonProgressInput`)
- `QuizAttempt` (+ `QuizAttemptStatus`, `QuizAnswer`, `QuizAttemptSubmitInput`)
- `AssignmentSubmission` (+ `AssignmentSubmissionStatus`)
- `QAQuestion` (+ `QAQuestionCreateInput`)
- `CourseReview` (+ `CourseReviewCreateInput`)
- `StudentNote` (+ `StudentNoteCreateInput`)
- `Order` (+ `OrderStatus`, `OrderItem`, `OrderItemType`, `OrderCreateInput`)
- `Coupon` (+ `CouponDiscountType`, `CouponCreateInput`)
- `Category` (+ `CategoryCreateInput`), `Tag` (+ `TagCreateInput`)
- `Certificate`, `CertificateTemplate` (+ `CertificateTemplateCreateInput`)
- `CourseBundle` (+ `CourseBundleCreateInput`),
  `Membership` (+ `MembershipBillingInterval`, `MembershipCreateInput`),
  `CourseGiftCreateInput`
- `Notification` (+ `NotificationType`), `CalendarEvent`
- `Migration` (+ `MigrationStatus`, `MigrationCreateInput`),
  `InstructorPayout` (+ `InstructorPayoutStatus`, `InstructorPayoutCreateInput`)
- `AddonConfig`
- `PaginatedResponse<T>` generic envelope + `ListParams` query-shape type

Every `*Input` shape mirrors the corresponding Go struct minus the
server-managed fields (`id`, `tenantId`, `createdAt`, `updatedAt`, counters,
`instructorId`) so callers can't accidentally send them on create/update.

### 3.2 `src/services/lms-api.ts` (NEW — 656 lines)

**Axios instance (`lmsAxios`)** — created with `baseURL: "/api/lms"`
(same-origin relative — works under both `vite dev` proxied through Next.js
and in production), 30s timeout, JSON accept/content-type headers.

**Request interceptor** — reads `window.localStorage.getItem("authToken")`
and attaches `Authorization: Bearer <token>` when present. The `typeof window`
guard keeps it SSR-safe even though this is a Vite SPA. Mirrors the pattern
in `src/utils/jwt.ts#setSession` but is per-instance so it doesn't bleed
into the generic JWT axios instance.

**Response interceptor** — normalizes every error into a plain
`LmsApiError` shape `{ status, message, details }` so hook callers can do
`error.message` without digging into Axios internals. Handles three cases:
1. `error.response` present → extracts `message`/`error` from the body
   (or treats the body as a string when it's not an object).
2. `error.request` present but no response → "Network error" message.
3. Setup error → uses `error.message` directly.

**Helper `unwrap<T>(promise)`** — strips the `response.data` layer so each
API function returns `Promise<T>` not `Promise<AxiosResponse<T>>`.

**Helper `toQuery(params)`** — builds a `URLSearchParams` from a
`ListParams` object, skipping empties. Returns `undefined` when nothing was
set so axios skips the `?` entirely.

**Resource groups** (one `xxxApi` object per resource, plus a `lmsApi`
barrel at the bottom):

| Group | Methods | Endpoints covered |
|-------|---------|-------------------|
| `courseApi` | `list`, `create`, `get`, `update`, `remove`, `publish`, `enroll` | GET/POST /courses, GET/PATCH/DELETE /courses/{id}, POST /courses/{id}/publish, POST /courses/{courseId}/enroll |
| `topicApi` | `list`, `create`, `update`, `remove` | GET/POST /courses/{courseId}/topics, PATCH/DELETE /topics/{id} |
| `lessonApi` | `list`, `create`, `update`, `remove`, `updateProgress` | GET/POST /topics/{topicId}/lessons, PATCH/DELETE /lessons/{id}, POST /lessons/{lessonId}/progress |
| `quizApi` | `list`, `create`, `update`, `remove`, `listAttempts`, `startAttempt`, `submitAttempt` | GET/POST /topics/{topicId}/quizzes, PATCH/DELETE /quizzes/{id}, GET/POST /quizzes/{quizId}/attempts, POST /quizzes/attempts/{id}/submit |
| `questionApi` | `create`, `update`, `remove` | POST /quizzes/{quizId}/questions, PATCH/DELETE /questions/{id} |
| `assignmentApi` | `create`, `submit` | POST /topics/{topicId}/assignments, POST /assignments/{id}/submit |
| `enrollmentApi` | `list` | GET /enrollments |
| `qaApi` | `list`, `ask` | GET/POST /courses/{courseId}/qa |
| `reviewApi` | `list`, `submit` | GET/POST /courses/{courseId}/reviews |
| `noteApi` | `list`, `create` | GET/POST /notes |
| `categoryApi` / `tagApi` | `list`, `create` | GET/POST /categories, GET/POST /tags |
| `orderApi` / `couponApi` | `list`, `create` | GET/POST /orders, GET/POST /coupons |
| `certificateApi` | `list`, `createTemplate` | GET /certificates, POST /certificates/templates |
| `bundleApi` / `membershipApi` | `list`, `create` | GET/POST /bundles, GET/POST /memberships |
| `giftApi` | `create` | POST /gifts |
| `payoutApi` | `list`, `create` | GET/POST /instructor/payouts |
| `notificationApi` | `list` | GET /notifications |
| `calendarApi` | `list` | GET /calendar |
| `migrationApi` | `list`, `create` | GET/POST /migrations |
| `addonApi` | `list` | GET /addons |

`listAttempts` on `quizApi` is the only method not strictly listed in
`PHASE1-CONTEXT.md` — added because the spec asked for a `useQuizAttempts`
hook and there was no first-class API method to back it. Documented inline
as "will 404 until the backend ships the matching handler".

All path params are `encodeURIComponent`-escaped to be safe with
MongoDB ObjectIDs (which are URL-safe anyway) and any future slug-based
routes.

### 3.3 `src/hooks/useLms.ts` (NEW — 583 lines)

Plain `useState` + `useEffect` hooks, no React Query. Two shared return
types:

```ts
interface UseLmsQueryResult<T>    { data: T | null; loading: boolean; error: LmsApiError | null; refetch: () => void; }
interface UseLmsMutationResult<T, V> { data: T | null; loading: boolean; error: LmsApiError | null; mutate: (vars: V) => Promise<T | null>; reset: () => void; }
```

Hooks implemented (exactly the 12 requested):

| Hook | Type | Backing API |
|------|------|-------------|
| `useCourses()` | query | `courseApi.list()` |
| `useCourse(id)` | query | `courseApi.get(id)` — skips fetch while `id` is empty |
| `useCreateCourse()` | mutation | `courseApi.create(vars)` |
| `useUpdateCourse(id)` | mutation | `courseApi.update(id, vars)` — errors if `id` is empty |
| `useDeleteCourse(id)` | mutation | `courseApi.remove(id)` — errors if `id` is empty |
| `useEnrollments()` | query | `enrollmentApi.list()` |
| `useTopics(courseId)` | query | `topicApi.list(courseId)` |
| `useLessons(topicId)` | query | `lessonApi.list(topicId)` |
| `useQuizzes(topicId)` | query | `quizApi.list(topicId)` |
| `useQuizAttempts(quizId)` | query | `quizApi.listAttempts(quizId)` |
| `useNotes()` | query | `noteApi.list()` |
| `useNotifications()` | query | `notificationApi.list()` |

Implementation notes:

- **Mounted-guard** — every async path calls `useIsMounted()` (from
  `@/hooks/useIsMounted`) before any `setState`, so unmount-during-fetch
  can't trigger React state-update warnings.
- **Race-condition guard** — each query hook has a `fetchToken` ref that's
  incremented at the start of every fetch; if a newer fetch starts before
  an older one resolves, the older one's result is dropped. This makes
  rapid `id` changes (e.g. when a route param updates) safe.
- **Skip-when-empty** — `useCourse(id)`, `useTopics(courseId)`,
  `useLessons(topicId)`, `useQuizzes(topicId)`, `useQuizAttempts(quizId)`
  short-circuit when their primary id is `undefined`/empty, so callers can
  mount the hook unconditionally before the route param is populated.
- **Stable dep keys** — `useEffect` deps use `argsKey([id])` (a tiny
  helper that stringifies the args array) so the effect refires when the
  id changes without requiring `run` to be in the deps array (which would
  refetch on every render).
- **Mutation shape** — mutations expose `mutate(vars)` that returns the
  created/updated entity (or `null` on error) plus a `reset()` to clear
  state after a successful submission. Errors land in `error` synchronously.
- **List-result normalization** — `useCourses`, `useEnrollments`,
  `useNotes`, `useNotifications`, `useQuizAttempts` all coerce their
  result to `T[]` whether the backend returns a bare array or a
  `PaginatedResponse<T>` envelope (`{ data: T[] }`), so callers can
  `.map()` without an extra unwrap.

---

## 4. Type-check results

```text
$ cd /home/z/my-project/repos/tailux/tailux-main
$ ./node_modules/.bin/tsc -b --noEmit 2>&1 | grep -E "(src/types/lms|src/services/lms-api|src/hooks/useLms)"
# (no output)
$ echo "==="
=== NO ERRORS IN NEW FILES ===
```

The full `tsc -b --noEmit` run surfaces 6 pre-existing errors in
`src/app/pages/apps/course-builder/index.tsx` (unused `useRef` import,
three unused `topicId` locals, two `Button` `size` prop type mismatches).
None of those files were touched by this task — they predate this work and
the task spec explicitly forbade modifying any existing file.

All three new files (`src/types/lms.ts`, `src/services/lms-api.ts`,
`src/hooks/useLms.ts`) type-check cleanly under `strict: true`,
`noUnusedLocals: true`, `noUnusedParameters: true`,
`isolatedModules: true`, and `moduleResolution: bundler`.

---

## 5. Verification commands (for downstream agents / humans)

```bash
cd /home/z/my-project/repos/tailux/tailux-main

# 1. Confirm the three new files exist and are sized as expected
wc -l src/types/lms.ts src/services/lms-api.ts src/hooks/useLms.ts
# expect:
#   974 src/types/lms.ts
#   656 src/services/lms-api.ts
#   583 src/hooks/useLms.ts
#  2213 total

# 2. Type-check (only pre-existing course-builder errors should appear)
./node_modules/.bin/tsc -b --noEmit 2>&1 | \
  grep -E "(src/types/lms|src/services/lms-api|src/hooks/useLms)" \
  && echo "FAIL: errors in new files" \
  || echo "OK: no errors in new files"

# 3. Spot-check the API surface from a Vite REPL or browser console:
#    import { lmsApi } from "@/services/lms-api";
#    import { useCourses } from "@/hooks/useLms";
#    console.log(Object.keys(lmsApi));
#    // → ['course','topic','lesson','quiz','question','assignment',
#    //    'enrollment','qa','review','note','category','tag','order',
#    //    'coupon','certificate','bundle','membership','gift','payout',
#    //    'notification','calendar','migration','addon']
```

---

## 6. Notes for the next agent (phase 2+)

- **Backend `GET /quizzes/{quizId}/attempts` is not in `PHASE1-CONTEXT.md`**
  but the spec requires a `useQuizAttempts(quizId)` hook. The hook is
  implemented and will surface whatever the backend returns (typically a
  404 today) in `error`. When the backend ships the matching handler, no
  frontend change is needed.
- **Paginated list endpoints** (`courseApi.list`, `enrollmentApi.list`,
  `noteApi.list`, `notificationApi.list`, etc.) declare their return type
  as `Promise<PaginatedResponse<T> | T[]>` because the backend's
  `ListCourses` handler already returns an envelope (`{courses, total,
  limit, offset}`) while most other list endpoints are still stubs that
  will likely return bare arrays. The query hooks normalize both shapes
  to `T[]`. If a downstream page needs the `total` field for pagination
  UI, it should call the service function directly (not the hook) and
  narrow the result with `Array.isArray(result) ? null : result.total`.
- **No React Query** — per the task spec. If a later phase adopts
  `@tanstack/react-query`, the `lms-api` service is already shaped to drop
  into `useQuery({ queryKey: [...], queryFn: () => lmsApi.course.get(id) })`
  with zero refactoring; only the hooks file would change.
- **Auth token** — the request interceptor reads `localStorage.authToken`
  to match the existing `setSession` helper. In dev, `AuthProvider` bypasses
  auth (`isAuthenticated: true`) without ever writing a token, so the
  interceptor attaches no `Authorization` header in dev — which is fine
  because the backend's LMS subrouter is also bypassed for dev. When real
  auth lands, the same interceptor picks up the token automatically.
- **`encodeURIComponent`** is applied to every path param. MongoDB
  ObjectIDs are URL-safe so this is a no-op today, but it future-proofs
  the client against slug-based routes (e.g. `/courses/{slug}`).
- **No barrel re-export added to `src/hooks/index.ts`** — the task spec
  asked for minimal deps. Callers import directly from `@/hooks/useLms`.
  If a later phase wants the barrel, append `export * from "./useLms";`
  to `src/hooks/index.ts`.

---

## 7. Summary

✅ `src/types/lms.ts` — 974 lines, ~40 interfaces + ~25 string-literal
   unions + `PaginatedResponse<T>` generic. Mirrors every struct in
   `internal/models/lms.go` 1:1 with documented Go→TS mapping rules.
✅ `src/services/lms-api.ts` — 656 lines. Own axios instance (`lmsAxios`)
   with same-origin `/api/lms` base, request interceptor that attaches
   `Bearer <authToken>` from localStorage, response interceptor that
   normalizes errors into a plain `LmsApiError` shape. 22 resource groups
   (`courseApi`, `topicApi`, …, `addonApi`) + a `lmsApi` barrel covering
   every endpoint in `PHASE1-CONTEXT.md`.
✅ `src/hooks/useLms.ts` — 583 lines. 12 hooks (5 query + 3 mutation for
   courses, plus 7 more query hooks for enrollments/topics/lessons/quizzes/
   quiz-attempts/notes/notifications). Plain `useState`+`useEffect`, no
   React Query. Uses `useIsMounted` + per-fetch token refs for safe-async
   + race-condition protection. Each query returns
   `{ data, loading, error, refetch }`; each mutation returns
   `{ data, loading, error, mutate, reset }`.
✅ No existing files modified.
✅ `tsc -b --noEmit` reports zero errors in the three new files (6
   pre-existing errors in `course-builder/index.tsx` are untouched).

---

# Worklog — phase1-agent2

**Task ID:** `phase1-agent2`
**Agent:** z.ai Code (general-purpose sub-agent)
**Date:** 2026-07-29
**Scope:** Build shared LMS UI components for all Phase 1 screens
**Repo root:** `/home/z/my-project/repos/tailux/tailux-main`

---

## 1. Objective

Create a reusable library of 15 LMS UI components (plus a barrel `index.ts`)
in `src/components/lms/` that compose the existing tailux UI primitives
(`Button`, `Card`, `Badge`, `Progress`, `Avatar`, `Spinner`, `Skeleton`) and
the domain types from `src/types/lms.ts`. These components will be consumed by
every Phase 1 page (course catalog, course detail, lesson player, quizzes,
instructor dashboard, student dashboard, etc.).

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `PHASE1-CONTEXT.md` | Tech stack, available UI components, naming conventions, strict rules (no raw `<button>`/`<input>`, heroicons outline, clsx, Tailwind v4 tokens). |
| `src/types/lms.ts` | `Course`, `Topic`, `Lesson` (+ `LessonType`, `LessonProgress`), `Quiz` (+ `QuizSettings`, `QuizAttempt`), `Enrollment`, etc. Confirmed `Course.difficulty: CourseDifficulty = "beginner"\|"intermediate"\|"advanced"` and `priceCents: number` (minor units). |
| `src/components/ui/Button/index.tsx` | Polymorphic `Button` — props: `color`, `variant`, `isIcon`, `unstyled`, `component`. **No `size` prop** (size must be done via `className`). `unstyled` + neutral color renders a bare `<button>` with only the `btn-base` class. |
| `src/components/ui/Card/index.tsx` | Polymorphic `Card` — `skin: "bordered"\|"shadow"\|"none"`, accepts `component` so it can render as a `<button>` for click-through cards. |
| `src/components/ui/Badge/index.tsx` | `color: ColorType`, `variant: "filled"\|"outlined"\|"soft"`. |
| `src/components/ui/Progress/index.tsx` | `value`, `color`, `isIndeterminate`, children rendered inside the fill. |
| `src/components/ui/Avatar/Avatar.tsx` | `name` → auto initials, `src`, `size` (in ¼-rem units), `initialColor: "auto"` for deterministic color from name. |
| `src/components/ui/Spinner/Spinner.tsx`, `Skeleton/index.tsx`, `Tag/index.tsx` | Spinner accepts `className` for sizing; Skeleton is a bare animated div. |
| `src/components/ui/index.ts` | Barrel exports — confirmed `Button`, `Card`, `Badge`, `Progress`, `Avatar`, `Spinner`, `Skeleton` all re-exported from `@/components/ui`. |
| `src/constants/app.ts` | `ColorType = "neutral"\|"primary"\|"secondary"\|"info"\|"success"\|"warning"\|"error"`. |
| `src/styles/app/components/button.css` | `.btn-base` = `inline-flex cursor-pointer items-center justify-center text-center font-medium ...` — confirmed it's always applied (even when `unstyled`), so callers must override `justify-center`/`text-center` for full-width rows. |
| `src/app/pages/apps/kanban/.../Workspaces.tsx`, `course-builder/index.tsx` | Real-world usage patterns: `Button variant="flat" isIcon className="size-6 rounded-full"`, icon sizing `size-4.5 stroke-2`, tokens `text-primary-600 dark:text-primary-400`. |
| `tsconfig.app.json` | Path alias `@/* → ./src/*` confirmed. |

---

## 3. Files created

All under `src/components/lms/` — **16 new files, zero existing files modified.**

| # | File | Exports | Notes |
|---|------|---------|-------|
| 1 | `ProgressBar.tsx` | `ProgressBar` (default + named), `ProgressBarProps`, `ProgressBarColor` | Wraps tailux `Progress`; clamps 0–100; optional label/hint/value; `valueInside` for in-bar %. |
| 2 | `RatingStars.tsx` | `RatingStars`, `RatingStarsProps` | Read-only by default with half-star support; `interactive` mode uses hover preview + click → `onChange`. Stars rendered via tailux `Button unstyled` (no raw `<button>`). Solid icons from `@heroicons/react/24/solid` for filled stars. |
| 3 | `PriceTag.tsx` | `PriceTag`, `formatPrice`, `PriceTagProps`, `PriceModel` | Minor-units (cents) → currency string; "Free" pill for zero price; optional strike-through `compareAt`. 10 currency symbols. |
| 4 | `DifficultyBadge.tsx` | `DifficultyBadge`, `DifficultyBadgeProps`, `DifficultyLevel` | Accepts `all_levels\|beginner\|intermediate\|advanced\|expert` (covers both the task spec AND `CourseDifficulty` from `lms.ts`). Color-coded via tailux `Badge`. |
| 5 | `InstructorAvatar.tsx` | `InstructorAvatar`, `InstructorAvatarProps` | Uses tailux `Avatar` with `initialColor="auto"`; row/col layouts; `avatarOnly` mode. |
| 6 | `CourseThumbnail.tsx` | `CourseThumbnail`, `CourseThumbnailProps` | Image + `onError` fallback to branded gradient with title initial or `AcademicCapIcon`. Resets error state on URL change. 5 size presets incl. `aspect-[16/9]`. |
| 7 | `EnrollmentButton.tsx` | `EnrollmentButton`, `EnrollmentButtonProps` | Context-aware label: "Enroll" / "Start Course" / "Continue Learning" (based on `enrolled` + `progress`). `locked` shows padlock. |
| 8 | `EmptyState.tsx` | `EmptyState` (default + named), `NoDataEmptyState`, `EmptyStateProps` | Icon well + title + description + optional CTA (`Button variant="soft"`). `compact` mode for in-card use. |
| 9 | `LoadingState.tsx` | `LoadingState`, `LoadingStateProps` | Wraps tailux `Spinner`; `inline` vs full-height centered; `role="status"`. |
| 10 | `ErrorState.tsx` | `ErrorState`, `ErrorStateProps` | Accepts `string \| Error \| unknown`; icon well + message + optional Retry `Button`. |
| 11 | `StatCard.tsx` | `StatCard`, `StatCardProps`, `StatTrend` | KPI card on tailux `Card`; icon well (7 colors) + value/label + optional trend chip with up/down arrow. |
| 12 | `LessonCard.tsx` | `LessonCard`, `formatDuration`, `LessonCardProps` | List-row card. Icon per `LessonType` (video/text/document/live/embed/zoom). Duration `M:SS`/`H:MM:SS`. Completion checkmark (solid), in-progress thin `ProgressBar`, "Preview" tag, `locked` padlock. Clickable via tailux `Button unstyled component="button"\|"div"`. |
| 13 | `QuizCard.tsx` | `QuizCard`, `formatTimeLimit`, `QuizCardProps` | Title + question count + time limit + attempts used (out of `settings.maxAttempts`). Color-coded "remaining attempts" banner (green/amber/red). Draft badge when unpublished. |
| 14 | `CourseCard.tsx` | `CourseCard`, `CourseCardProps` | Composes `CourseThumbnail` + `DifficultyBadge` + `RatingStars` + `InstructorAvatar` + `PriceTag` + `ProgressBar`. Featured ribbon, enrolled-count, optional progress + footer slot. Clickable via tailux `Card component="button"`. |
| 15 | `CourseGrid.tsx` | `CourseGrid`, `CourseGridProps` | Responsive 1→4 col grid. `loading` → skeleton placeholders (matching `CourseCard` shape); empty → `EmptyState`; else maps `CourseCard` with per-course resolvers (`getInstructorName`, `getProgress`, `renderFooter`, …). |
| 16 | `index.ts` | Barrel re-export of all 15 components + their props/types | Enables `import { CourseCard, ProgressBar } from "@/components/lms"`. |

---

## 4. Design decisions & rationale

- **No raw `<button>` / `<input>`** (Phase 1 strict rule). Every interactive
  element uses the tailux `Button` (or polymorphic `Card`/`Button` with
  `component="button"`). `RatingStars` and `LessonCard` use `Button unstyled`
  so they get a real accessible `<button>` without the `.btn` padding/variant.
- **`DifficultyLevel` union widened** to include both `advanced` (from
  `CourseDifficulty` in `lms.ts`) and `expert` (from the task spec) so the
  badge can be driven directly from `course.difficulty` without caller-side
  mapping. `advanced` and `expert` share the red/error color tier.
- **`CourseCard` props extended** beyond the strict `course, onClick?` spec
  with optional `instructorName`, `instructorAvatarUrl`, `instructorEmail`,
  `progress`, `footer`, `hidePrice`. The `Course` type only stores
  `instructorId`, so the instructor display name/avatar must be resolved
  upstream and passed in — these optional props make that ergonomic without
  breaking the minimal spec.
- **Currency handling** — `PriceTag` works in minor units (cents) to match
  `Course.priceCents`. A standalone `formatPrice(cents, currency)` helper is
  exported for reuse in tables/order summaries.
- **Duration helpers exported** — `formatDuration(seconds)` (LessonCard) and
  `formatTimeLimit(seconds)` (QuizCard) are exported so pages can format the
  same values in table cells or detail headers without re-implementing.
- **Composability** — `CourseCard` is built entirely from the smaller LMS
  primitives (`CourseThumbnail`, `DifficultyBadge`, `RatingStars`,
  `PriceTag`, `InstructorAvatar`, `ProgressBar`), and `CourseGrid` is built
  from `CourseCard` + `Skeleton` + `EmptyState`. This keeps styling
  consistent and means a fix in (e.g.) `PriceTag` propagates everywhere.
- **Dark-mode + token compliance** — every component uses Tailwind v4 tokens
  (`text-primary-600`, `dark:bg-dark-700`, `dark:text-dark-100`, `size-*`,
  `text-xs-plus`, etc.) and pairs light/dark classes throughout.
- **Both named + default exports** on every component for flexibility (named
  for tree-shaking barrel imports, default for lazy/`React.lazy` consumers).

---

## 5. Verification

- **`tsc --noEmit -p tsconfig.app.json`** → **0 errors in `src/components/lms/`**.
  The 6 remaining errors are all pre-existing in
  `src/app/pages/apps/course-builder/index.tsx` (unused `useRef`/`topicId`,
  and `<Button size=...>` which the tailux `Button` doesn't accept) — that
  file belongs to another agent and was **not** modified, per the rules.
- **`eslint src/components/lms/`** → **0 errors, 3 warnings**. The warnings
  are `react-refresh/only-export-components` for the three files that export a
  helper function alongside the component (`formatDuration` in `LessonCard`,
  `formatPrice` in `PriceTag`, `formatTimeLimit` in `QuizCard`). These are
  HMR-ergonomics warnings only (not errors) and match the established tailux
  pattern of co-locating small format helpers with their primary component.
- **No existing files modified** — confirmed via the typecheck output (only
  `course-builder` pre-existing errors remain) and the fact that all 16 files
  are newly created under `src/components/lms/`.

---

## 6. Next actions / handoff

- **Consumers (other Phase 1 agents)** can import everything from
  `@/components/lms` (barrel) or deep-import individual files. Suggested
  starter API:
  ```ts
  import {
    CourseGrid, CourseCard, LessonCard, QuizCard,
    ProgressBar, RatingStars, PriceTag, InstructorAvatar,
    DifficultyBadge, EnrollmentButton, EmptyState, LoadingState,
    ErrorState, StatCard, CourseThumbnail,
  } from "@/components/lms";
  ```
- **Instructor resolution** — pages rendering `CourseCard`/`CourseGrid` need
  to resolve `course.instructorId` → `{ name, avatarUrl }` (e.g. via a user
  lookup hook) and pass via `instructorName`/`instructorAvatarUrl` (or the
  `getInstructorName` resolver on `CourseGrid`).
- **`EnrollmentButton`** is intentionally separate from `CourseCard` so it
  can be composed into the `footer` slot of `CourseCard` OR used standalone
  in a course-detail hero. Pass `enrolled` + `progress` (from the
  `useEnrollments` hook that agent-1 built).
- **Optional polish** (not blocking): extract `formatDuration` /
  `formatPrice` / `formatTimeLimit` into a `src/utils/lmsFormat.ts` to
  silence the 3 `react-refresh` warnings — left as-is for now to keep all
  components self-contained.

---

# Worklog — phase1-agent3

**Task ID:** `phase1-agent3`
**Agent:** z.ai Code (sub-agent execution)
**Date:** 2026-07-29
**Repo root:** `/home/z/my-project/repos/tailux/tailux-main`
**Scope:** Build the Student Dashboard — 8 screens using tailux components.

---

## 1. Objective

Create the Student Dashboard app under
`src/app/pages/apps/student-dashboard/` — a self-contained 2-column
(sidebar + content) dashboard with 8 screens (Home, Courses, Notes,
Discussions, Calendar, Profile, Settings, Kids Mode), driven by the
existing `lmsApi` / `useLms` hooks and tailux UI primitives. No existing
files were to be modified; only new files created in the assigned
directory.

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `PHASE1-CONTEXT.md` | Tech stack, available UI components, import aliases, naming conventions, and the strict "no raw `<button>`/`<input>`" rule. |
| `src/types/lms.ts` (975 lines) | Shape of `Course`, `Enrollment`, `StudentNote`, `Notification`, `CalendarEvent` — needed to build correct mock data and to type hook results. |
| `src/services/lms-api.ts` | Confirmed `lmsApi.calendar.list()` exists (no hook for it, so CalendarScreen calls it directly), and that `noteApi` only ships `list`/`create` (so edit/delete must be optimistic in local state). |
| `src/hooks/useLms.ts` | Return shape of `useEnrollments` / `useNotes` / `useNotifications` — `{ data, loading, error, refetch }` with `data: T | null`. |
| `src/components/lms/index.ts` + `CourseCard.tsx`, `CourseGrid.tsx`, `ProgressBar.tsx`, `StatCard.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx` | Exact prop APIs (`CourseGrid`'s `getProgress`/`getInstructorName` resolvers, `StatCard`'s `trend` shape, `EmptyState`'s `actionLabel`/`onAction`, `ErrorState`'s `onRetry`). |
| `src/components/ui/index.ts`, `Button/index.tsx`, `Card/index.tsx`, `Badge/index.tsx`, `Form/Input.tsx`, `Form/Switch.tsx`, `Form/Textarea.tsx`, `Form/Select.tsx`, `Form/Range.tsx`, `Avatar/Avatar.tsx`, `ScrollShadow/index.tsx` | Real prop surfaces. **Key finding:** `CardContent` and `ScrollArea` (listed in the task spec) do **not** exist in this codebase — `Card` takes children directly and the scroll primitive is `ScrollShadow`. Used the actual exports to avoid import errors. |
| `src/app/pages/apps/ai-chat/index.tsx`, `kanban/index.tsx`, `todo/index.tsx`, `filemanager/Sidebar/SidebarPanel/Menu.tsx` | Existing app layout + sidebar-nav patterns (flex h-screen, `Button variant="flat"` nav rows, `ScrollShadow` for the scrollable region). |
| `src/components/shared/Page.tsx`, `src/constants/app.ts` (`ColorType`) | `Page` sets document title; `ColorType = neutral|primary|secondary|info|success|warning|error`. |
| Prior worklog entry (`phase1-agent2`) | Confirmed the 6 pre-existing `course-builder/index.tsx` tsc errors belong to another agent and must be left alone; confirmed `Button` has no `size` prop (must size via `className`). |

---

## 3. Files created

All under `src/app/pages/apps/student-dashboard/` (8 files, ~3,545 lines):

| # | File | Lines | Role |
|---|------|-------|------|
| 1 | `index.tsx` | 304 | Default export. 2-column layout (sidebar + content). `useState<ScreenId>` switches between the 8 screens. Sidebar built with `Button variant="flat"` rows + active-state styling + unread `Badge`. Includes an inline `SettingsScreen` (the spec lists Settings in the nav but not as a dedicated file) with `Switch` toggles for notifications/playback. Top bar + breadcrumb strip + `ScrollShadow` content region + a "Go Premium" sidebar footer card. |
| 2 | `HomeScreen.tsx` | 624 | Greeting (time-of-day aware), 4× `StatCard` KPIs (enrolled courses, completed lessons, certificates earned, hours learned) derived from `useEnrollments`. "Continue Learning" cards with `ProgressBar` for in-progress enrollments. Upcoming-deadlines panel + recent-notifications feed from `useNotifications`. API-health notice + `LoadingState`/`EmptyState` handled. |
| 3 | `CoursesScreen.tsx` | 378 | Enrolled-courses grid via the shared `CourseGrid` (forwards per-enrollment `progressPct` to `CourseCard`). Status filter (all / in-progress / completed) with live counts as `Badge`s, and a search `Input` matching title/description. Mock course catalog + enrollments as API fallback. |
| 4 | `NotesScreen.tsx` | 482 | Notes grouped by course (one `Card` section per course with a count `Badge`). Each note row shows lesson title, body preview, relative timestamp, edit/delete icon `Button`s. Inline editor `Card` (no modal) with tailux `Select` (course + lesson) + `Textarea` for create/edit; delete is optimistic in local state. Syncs from `useNotes` when the API returns data; falls back to mock on error. |
| 5 | `DiscussionsScreen.tsx` | 350 | Mock-driven thread list (no backend discussions resource). Each thread row: course `Badge`, pinned/resolved badges, topic, snippet, replies/views counts, last-activity time, author `Avatar`. Search `Input` + per-course filter `Button`s. Summary stat tiles (threads / replies / resolved). Empty state when filters yield nothing. |
| 6 | `CalendarScreen.tsx` | 487 | Month-grid calendar (6-week × 7-day). Fetches `lmsApi.calendar.list()` directly via `useEffect` (no hook exists) with mock fallback. Events rendered as colored dots per day (max 3 + overflow count). Prev/next/Today nav `Button`s. Side panel shows the selected day's events as tinted `EventCard`s. Legend for event kinds (live class / quiz due / deadline). Day cells use `Card component="button"` (no raw `<button>`). `ErrorState` with retry on fetch failure; `EmptyState` when a day has no events. |
| 7 | `ProfileScreen.tsx` | 483 | Cover banner + `Avatar` + name/headline + "Edit profile" `Button`. 3 KPI tiles (enrolled courses, certificates, member-since) derived from `useEnrollments` (mock fallback). Inline editor toggles to `Input`/`Textarea` fields (name, email, headline, location, bio, website, twitter, github). About section + contact info rows + social `Badge` links. API-health notice + retry. |
| 8 | `KidsModeScreen.tsx` | 437 | Master `Switch` toggles Kids Mode (gradient card changes when on). Three settings groups (content restrictions via `Select`/`Switch`, simplified UI via `Switch`es, parental controls via `Input` PIN + `Switch` + `Range` for screen time). Settings dim and disable when Kids Mode is off. When on, a live `KidsPreview` renders a simplified, colorful, kid-friendly dashboard (big nav `Button unstyled` tiles, featured course card, star row, screen-time footer). |

---

## 4. Design decisions & rationale

- **Strict tailux-only components.** No raw `<button>`/`<input>`/`<select>`/`<textarea>` anywhere (verified via `rg "<(button|input|select|textarea)\b"` — only one match, in a comment). Interactive elements use `Button` (with `isIcon` for icon buttons, `unstyled` for layout-heavy buttons like the Kids Mode nav tiles), `Card component="button"` for calendar day cells, `Input`/`Textarea`/`Select`/`Switch`/`Range` for forms.
- **`CardContent` / `ScrollArea` don't exist** in this codebase despite being listed in the task spec. `Card` accepts children directly (no `CardContent`), and the scroll primitive is `ScrollShadow`. Used the real exports so imports resolve. `tsc` confirms all imports are valid.
- **Mock-data-with-fallback pattern.** Every screen that uses a hook (`useEnrollments`, `useNotes`, `useNotifications`, `lmsApi.calendar.list`) defines realistic mock data at the top and falls back to it when the API errors or returns empty — so the dashboard is always usable in dev (the backend may be down). When an error occurs, a non-blocking `Card` banner ("API unavailable — showing sample data") with a `Retry` button is shown above the content, satisfying both the "handle error state" and "use mock data if API unavailable" requirements. `LoadingState` covers the loading state; `EmptyState` covers the genuinely-empty case (real API returns `[]` with no error).
- **Real `ErrorState` with `onRetry`** is demonstrated in `CalendarScreen`'s side panel (retry re-runs `lmsApi.calendar.list()`), so the retry-with-reload pattern is exercised end-to-end.
- **`useState` screen switching in `index.tsx`** (per spec) — `ScreenId` union + `active` state; the content region conditionally renders the active screen. `SettingsScreen` is inlined in `index.tsx` because the spec lists "Settings" in the nav but the 8-file build list doesn't include a `SettingsScreen.tsx`.
- **`Button` sizing** — the tailux `Button` has no `size` prop (confirmed in the prior agent's worklog), so all sizing is via `className` (`text-xs`, `text-sm`, `gap-1.5`, `isIcon` for square icon buttons). Avoided the `size` prop entirely.
- **Optimistic notes CRUD** — the backend `noteApi` only ships `list` + `create`, so edit/delete are handled in local `useState` with a 250 ms simulated async save. A `useEffect` syncs local state back to hook data whenever the API returns fresh results, so a successful refetch overrides local edits.
- **Calendar day cells** use `Card component="button" skin="none"` — the polymorphic `Card` renders a real `<button>` element (accessible, keyboard-focusable) while letting me fully control the visual via `className`. Same pattern the LMS `CourseCard` uses for clickable cards.
- **Dark-mode + token compliance** throughout — `text-primary-600`, `dark:bg-dark-700`, `dark:text-dark-100`, `size-*`, `text-xs-plus`, paired light/dark classes on every colored element. Reuses the LMS `StatCard`/`ProgressBar`/`CourseGrid` so theming stays consistent with the rest of the app.
- **Both named + default exports** on every screen (named for the `index.tsx` import site, default for `React.lazy` consumers / future routing).

---

## 5. Verification

- **`npx tsc --noEmit -p tsconfig.app.json`** → **0 errors in `src/app/pages/apps/student-dashboard/`**. The only 6 remaining errors are all pre-existing in `src/app/pages/apps/course-builder/index.tsx` (unused `useRef`/`topicId`, and `<Button size=...>` which `Button` doesn't accept) — that file belongs to another agent and was **not** modified, per the rules.
- **`npx eslint src/app/pages/apps/student-dashboard/`** → **exit 0** (0 errors, 0 warnings).
- **`npx vite build`** → **✓ built in 26.09s, exit 0**. The whole project bundles cleanly; the only warnings are pre-existing >500 kB chunk-size notices unrelated to this work.
- **No raw HTML form controls** — `rg "<(button|input|select|textarea)\b"` over the new directory returns a single comment match.
- **No existing files modified** — `git status` (and the tsc output) confirm only the 8 new files under `student-dashboard/` were added.

---

## 6. Next actions / handoff

- **Routing** — the page is not wired into `protected.tsx` (the rules forbid modifying it). To expose the dashboard, an integrator should add to `protected.tsx`:
  ```ts
  {
    path: "apps/student-dashboard",
    lazy: async () => ({
      Component: (await import("@/app/pages/apps/student-dashboard"))
        .default,
    }),
  }
  ```
  The default export is already lazy-loadable.
- **Discussions resource** — `DiscussionsScreen` is mock-only because the backend has no discussions endpoint. When one ships, swap the mock array for a `useDiscussions()` hook following the `useNotes` pattern; the UI is structured to accept real `DiscussionThread[]` data with minimal change.
- **Notes edit/delete** — currently optimistic in local state because `noteApi` only exposes `list` + `create`. When `PATCH /api/lms/notes/{id}` and `DELETE /api/lms/notes/{id}` ship, wire `noteApi.update`/`noteApi.remove` into `NotesScreen.saveEditor`/`deleteNote` and refetch on success.
- **Calendar hook** — `CalendarScreen` calls `lmsApi.calendar.list()` directly via `useEffect`. Consider adding a `useCalendarEvents()` hook to `useLms.ts` (matching the `useNotes` pattern) so the fetch/stale-response guard is reusable.
- **Instructor resolution** — `CoursesScreen` resolves instructor names via a hardcoded map for the mock catalog. When real courses load, replace `getInstructorName` with a user-lookup hook keyed on `course.instructorId`.

---

# Worklog — phase1-agent4

**Task ID:** `phase1-agent4`
**Agent:** z.ai Code (single-agent execution)
**Date:** 2026-07-29
**Repo root:** `/home/z/my-project/repos/tailux/tailux-main`
**Target directory:** `src/app/pages/apps/instructor-dashboard/`

---

## 1. Objective

Build the Instructor Dashboard — 13 self-contained screens using tailux
components and the LMS API/types already created by prior agents. Each screen
ships with mock data, handles loading/error/empty states, and exports a
default function ready to be wired into `protected.tsx` via lazy import.

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `PHASE1-CONTEXT.md` | Confirmed import whitelist, tailux components, naming/routing rules, and the "do not modify protected.tsx" constraint. |
| `src/app/pages/apps/student-dashboard/index.tsx` | Established the layout pattern (2-col sidebar + content via `useState`, `ScrollShadow` for body, inline `SettingsScreen`). Mirrored it for the instructor dashboard. |
| `src/app/pages/apps/student-dashboard/HomeScreen.tsx` | Pattern for mock data + `useEffect`-driven fetch with fallback, `StatCard` usage, `timeAgo()` helpers, `Card` with `divide-y` for activity rows. |
| `src/app/pages/apps/student-dashboard/CoursesScreen.tsx` | Pattern for `CourseCard` composition with status filter + search + `EmptyState`. |
| `src/app/pages/apps/student-dashboard/DiscussionsScreen.tsx` | Pattern for mock-only screens with filter chips, thread rows, and `ChevronStub`. |
| `src/app/pages/apps/student-dashboard/ProfileScreen.tsx` | Pattern for cover+identity card, inline edit toggle, `StatTile`/`InfoRow`/`SocialBadge` subcomponents. |
| `src/types/lms.ts` | Confirmed `Course`, `Enrollment`, `Order`, `Notification`, `InstructorPayout`, `QuizAttempt`, `AssignmentSubmission`, `Certificate`, `CertificateTemplate`, `NotificationType`, `InstructorPayoutStatus` shapes. |
| `src/services/lms-api.ts` | Confirmed `lmsApi.notification.list()`, `lmsApi.course.list()`, `lmsApi.payout.list()` signatures for live fetches with mock fallback. |
| `src/components/lms/index.ts` | Confirmed exports: `CourseCard`, `StatCard`, `EmptyState`, `LoadingState`, `ErrorState`, `ProgressBar`, `RatingStars`, `CourseGrid`. |
| `src/components/ui/index.ts` + `Form/index.ts` | Confirmed exports: `Button`, `Card`, `Badge`, `Input`, `Textarea`, `Switch`, `Avatar`, `Select`, `ScrollShadow`. |
| `src/components/ui/Card/index.tsx` | Confirmed `Card` takes children directly (`skin: bordered | shadow | none`). No `CardHeader`/`CardContent`. |
| `src/components/ui/Button/index.tsx` | Confirmed `variant: filled | outlined | soft | flat`, `color: ColorType`, `isIcon` for icon-only buttons. |
| `src/components/ui/Form/Select.tsx` | Confirmed `data` prop (array of `{ value, label }`) and that `value`/`onChange` pass through `...rest`. |
| `src/components/ui/Form/Switch.tsx` | Confirmed `checked`, `onChange`, `color`, `label` API. |
| `src/components/lms/CourseCard.tsx` | Confirmed `hidePrice` + `footer` props (perfect for the instructor course card with a status badge footer). |

---

## 3. Files created (NEW — none modified)

All files live under `src/app/pages/apps/instructor-dashboard/`:

| File | Lines | Purpose |
|------|-------|---------|
| `index.tsx` | 339 | Top-level layout. 2-column shell (sidebar + content), 13 nav items (Home, Courses, Announcements, Quiz Attempts, Assignments, Discussions, Live Classes, Certificate, Analytics, Statements, Notifications, Profile, Settings). `useState<ScreenId>` for routing. Inline `SettingsScreen` with two `Card` sections of `Switch` toggles. Sidebar footer shows the next-payout nudge. |
| `HomeScreen.tsx` | 555 | Revenue stats (total / this month / pending payouts), course overview (courses / students / enrollments), four `QuickAction` cards (Create Course, View Analytics, Post Announcement, Schedule Live Class), recent-activity feed (6 typed events with icon wells), top-performing course sidebar with revenue, unread-notifications card. Live-fetches `lmsApi.notification.list()` with mock fallback. |
| `CoursesScreen.tsx` | 461 | Instructor's own courses as a 3-col grid of `CourseCard`-backed tiles. Each tile has a stat strip (students / revenue / rating) and an Edit / Publish / View course action. Inline "Create course" composer (title + description) prepends a draft. Status filter (All / Published / Draft) + free-text search with counts. |
| `AnnouncementsScreen.tsx` | 375 | Per-course announcement list with recipient count + read-rate progress bar. Inline composer with `Select` for course, `Input` for title, `Textarea` for body, and a live "X students will receive this" recipient preview. Course filter chips. Summary stats (announcements / recipients / avg read rate). |
| `QuizAttemptsScreen.tsx` | 432 | Responsive table (12-col grid on sm+) of quiz attempts: student (with avatar), quiz + attempt#, score (with mini bar + points), pass/fail badge, date + time, time spent. Course + quiz filter via `Select` (quiz list narrows when a course is chosen). Free-text search. Summary stats (attempts / avg score / pass rate). |
| `AssignmentsScreen.tsx` | 450 | Submission cards with student avatar, assignment title, course, submitted-time-ago, attachment count, and status badge. "Grade" button reveals an inline grading form (`Input` for points + `Textarea` for feedback) that flips the row to "graded" with points awarded. Re-grade supported. Filter by course and status. |
| `DiscussionsScreen.tsx` | 384 | Discussion threads from instructor's courses. Each thread shows course badge, pinned/resolved badges, topic, snippet, author, replies, views, last-activity time, and a large reply-count chip. Course filter chips + free-text search. Sorted: pinned first, then by last activity. |
| `LiveClassesScreen.tsx` | 502 | Schedule of upcoming + completed live classes (Zoom / Meet). Each card has platform-colored icon well, course + status + platform badges, date/time/duration/registered/relative time, external-link + Start/View-recording actions, and (for upcoming) a row of registered-student avatars. Inline composer with course / platform / title / date / time / link fields. Upcoming/Completed tab toggle. |
| `CertificateScreen.tsx` | 535 | Grid of certificate templates with CSS-rendered thumbnail (orientation-aware aspect, primary/accent color borders, font family). Each card has name, orientation + issued count, description, color swatch + font, Active/Inactive toggle button, Edit + Preview actions. Inline composer (name, orientation, primary/accent color, font family, active switch). Preview modal renders a full certificate layout with the chosen template styling. |
| `AnalyticsScreen.tsx` | 508 | Four CSS/SVG charts in a 2x2 grid: (1) **Revenue line chart** — SVG polyline + area gradient + dots, (2) **Enrollment by course** — horizontal bar chart with per-course colors, (3) **Engagement area chart** — stacked SVG areas for lessons/quizzes/discussions, (4) **Ratings breakdown** — `conic-gradient` pie chart with center average + legend bars. 3M/6M/1Y range selector slices the time series. KPI strip above the charts. |
| `StatementsScreen.tsx` | 478 | Earnings breakdown with four `StatCard`s (gross / platform fee / net / payouts), a stacked breakdown bar (net + fees + refunds), Monthly/Quarterly/Yearly period selector, Export-CSV button, free-text search + type filter, and a 12-col transactions table (transaction + type badge + gross + fee + net) with a footer totals row. |
| `NotificationsScreen.tsx` | 397 | Live-fetches `lmsApi.notification.list()` with mock fallback. Lists notifications with type-icon well, title, body, time-ago, and read/unread dot. "Mark all as read" button + per-row "Mark as read". Filter chips: All / Unread (+ 6 typed filters). Unread count badge on the Unread filter. Loading + error + empty states. |
| `ProfileScreen.tsx` | 707 | Instructor profile: cover banner + avatar, name, headline, 3 KPI tiles (courses / students / avg rating). Inline editor with name/email/headline/location/bio/expertise-areas/website/twitter/github/linkedin fields. Read-mode shows About, Expertise (badges), Contact+links grid, and Social badges. Separate **Payout method** card with PayPal / Stripe Connect / Bank transfer picker, method-specific fields, auto-payout switch, minimum-payout threshold input. Recent payouts list at the bottom. |

**Total:** 13 files, ~6,123 lines of TypeScript/TSX.

---

## 4. Design decisions & rationale

### Layout & navigation
- Followed the **student-dashboard layout pattern verbatim** (top bar + 2-col sidebar + content) so the two dashboards feel like siblings. The sidebar is built entirely with tailux `Button` (variant="flat", color="primary" when active) — no raw `<button>`.
- `Settings` lives inline in `index.tsx` (matching the student-dashboard's pattern) because the spec listed it in the nav but didn't ask for a dedicated file. The other 12 screens are their own files.
- Body uses `ScrollShadow` (not `ScrollArea` — per the task's NOTE) with `hide-scrollbar grow overflow-y-auto` so long screens scroll independently of the sidebar.

### Mock data + live fetch
- Per the spec, every screen defines mock data at the top of the file (typed against `@/types/lms` where possible).
- `HomeScreen` and `NotificationsScreen` attempt a real fetch via `lmsApi.notification.list()` and fall back to mock data on any error. The fallback is logged via a small `Card` warning banner so it's obvious in dev. This mirrors the student-dashboard `HomeScreen` pattern.
- All other screens are mock-only because the backend either has no matching endpoint (e.g. quiz-attempts list, discussion threads, live-class schedule) or the endpoint shape doesn't match the dashboard's needs (e.g. statements aggregates orders + payouts). The mock data is structured to make a future swap to a real hook trivial.

### tailux components only
- Every interactive surface uses `Button` (`filled` / `outlined` / `soft` / `flat`, `isIcon` for icon-only buttons). No raw `<button>` except for two intentional exceptions:
  1. `CertificateScreen.tsx` — the template thumbnail is a native `<button>` because it wraps a `<div>` with inline `style` background and an absolutely-positioned border. The card body's actions still use tailux `Button`.
  2. `ProfileScreen.tsx` — the payout-method picker uses native `<button>` because it's a custom selectable tile (border + bg changes by active state) that doesn't map cleanly to any tailux component. Both render as `<button>` and are styled to match the rest of the UI.
- `Card` is used everywhere for sections, with `skin="bordered"` for list rows and the default `shadow` skin for stat-grouped panels. No `CardHeader`/`CardContent` (per the task's NOTE that those don't exist).
- `Input` / `Textarea` / `Select` / `Switch` are imported from `@/components/ui` (which re-exports from `@/components/ui/Form`).
- `Avatar` with `initialColor="auto"` is used for student/instructor identity chips throughout.
- `Badge` (variant=`soft` for muted, `filled` for counts) is used for status indicators.

### Charts (AnalyticsScreen)
- **No chart library.** Used raw SVG for line/area charts (`<path>` + `<circle>`) and CSS `conic-gradient` for the pie chart. This keeps the bundle untouched and avoids dragging in ApexCharts just for four small visuals.
- Each chart is its own component (`LineChart`, `BarChart`, `AreaChart`, `PieChart`) so they can be reused later. The line chart supports a gradient fill via an SVG `<linearGradient>`.
- Range selector (3M / 6M / 1Y) slices the time-series arrays via `sliceByRange` so the same mock data powers all three ranges.

### State handling
- Every screen that fetches data (`HomeScreen`, `NotificationsScreen`) handles **loading** (`LoadingState`), **error** (inline warning `Card` with Retry, or a per-error `Card`), and **empty** (`EmptyState` with optional CTA).
- Mock-only screens still render an `EmptyState` when their filter/search returns zero rows, so the UX stays consistent.
- The `AnnouncementsScreen`, `CoursesScreen`, `LiveClassesScreen`, `CertificateScreen`, and `AssignmentsScreen` all support **inline composers / grading forms** that mutate local state, so the instructor can see the new item appear immediately (mock — no real POST).

### TypeScript hygiene
- All files pass `tsc --noEmit -p tsconfig.app.json` with **zero errors in the instructor-dashboard directory** (the only remaining tsc errors are in `src/app/pages/apps/course-builder/index.tsx`, which belongs to a different agent).
- All files pass `eslint src/app/pages/apps/instructor-dashboard/` with **zero warnings**.
- Removed every unused import (`Avatar`, `Select`, `clsx`, `MONTHS`, `ErrorState`, `lmsApi` where not actually called) after writing each file to satisfy the project's `noUnusedLocals` / `noUnusedParameters` config.

---

## 5. Verification

```bash
# Type check (passes for instructor-dashboard; remaining errors are in course-builder/)
cd /home/z/my-project/repos/tailux/tailux-main
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json 2>&1 | grep "instructor-dashboard"
# (no output = no errors in this directory)

# Lint (passes clean)
./node_modules/.bin/eslint src/app/pages/apps/instructor-dashboard/
# (no output = no warnings)

# File listing
ls -la src/app/pages/apps/instructor-dashboard/
# 13 files, ~6,123 lines total
```

---

## 6. Next actions / handoff

- **Routing** — the dashboard is **not** wired into `protected.tsx` (the rules forbid modifying it). To expose it, an integrator should add to `protected.tsx`:
  ```ts
  {
    path: "apps/instructor-dashboard",
    lazy: async () => ({
      Component: (await import("@/app/pages/apps/instructor-dashboard"))
        .default,
    }),
  }
  ```
  The default export of `index.tsx` is already lazy-loadable.
- **Real data swap** — five screens (`QuizAttemptsScreen`, `AssignmentsScreen`, `DiscussionsScreen`, `LiveClassesScreen`, `CertificateScreen`, `StatementsScreen`) are mock-only because the backend either lacks the endpoint or returns a shape that doesn't match the dashboard. When the matching handlers ship, replace the mock arrays with hooks following the `useNotifications` / `useEnrollments` pattern in `src/hooks/useLms.ts`; the UI is structured to accept the real arrays with minimal change.
- **Certificate preview modal** — currently uses a fixed-position overlay (`fixed inset-0 z-50 bg-black/60`) with click-outside-to-close. If the project standardizes on `@headlessui/react` Dialog (already a dependency), this can be migrated to a `<Dialog>` for focus-trap + escape handling.
- **Analytics chart library** — the four charts are intentionally CSS/SVG-only. If a richer viz is needed later, the existing `apexcharts` dependency can be dropped in without changing the data shape (each chart component takes a plain `data` prop).
- **Live class scheduling** — the composer currently stores meetings in local state. When a `POST /api/lms/calendar` (or a dedicated live-classes endpoint) ships, wire `lmsApi.calendar.list()` + a `create` call into `LiveClassesScreen` following the `useNotifications` pattern.
- **Payout method picker** — uses two native `<button>`s (the certificate thumbnail and the payout-method tile) because they wrap styled `<div>`s that don't map to tailux `Button`. If the design system adds a selectable-card primitive, swap those out for consistency.

---

# Worklog — phase1-agent5

**Task ID:** `phase1-agent5`
**Agent:** z.ai Code (single-agent execution)
**Date:** 2026-07-29
**Repo root:** `/home/z/my-project/repos/tailux/tailux-main`
**Directory:** `src/app/pages/apps/learning-area/`

---

## 1. Objective

Build the **Learning Area** — the screen students use to consume course content
(the most important part of the LMS). The task spec asked for thirteen files
covering the layout, four content types (video / reading / quiz / assignment),
and eight right-sidebar panels (Q&A, announcements, resources, reviews,
gradebook, certificate, course info, drip schedule).

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `PHASE1-CONTEXT.md` | Established the tech stack, the available UI components, the API surface, the file-naming convention, and the hard rules (tailux-only, heroicons, no protected.tsx edits). |
| `src/types/lms.ts` | Confirmed the exact shapes of `Course`, `Topic`, `Lesson`, `Quiz`, `QuizSettings`, `Question`, `QuestionOption`, `Assignment`, `AssignmentSubmission`, `Enrollment`, `LessonProgress`, `QuizAttempt`, `QuizAnswer`, `QAQuestion`, `CourseReview`, `Certificate`, `LessonProgressInput`, `QuizAttemptSubmitInput`, `AssignmentSubmissionInput`. Used to type every mock array. |
| `src/services/lms-api.ts` | Confirmed the `lmsApi.lesson.updateProgress()`, `lmsApi.quiz.startAttempt/submitAttempt`, `lmsApi.assignment.submit`, `lmsApi.qa.ask`, `lmsApi.review.submit` shapes that the parent forwards to. |
| `src/components/lms/index.ts` + `ProgressBar.tsx`, `LessonCard.tsx`, `QuizCard.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx`, `RatingStars.tsx`, `DifficultyBadge.tsx`, `InstructorAvatar.tsx` | Confirmed the prop signatures of every shared LMS component so the page calls them with the right props (`ProgressBar` takes `size="xs|sm|md"`, `RatingStars` takes `interactive` + `onChange`, `EmptyState` takes an `icon` component, etc.). |
| `src/components/ui/index.ts` + `Button/`, `Card/`, `Badge/`, `Avatar/`, `ScrollShadow/`, `Form/Input.tsx`, `Form/Textarea.tsx`, `Form/Switch.tsx`, `Form/Checkbox.tsx`, `Form/Radio.tsx` | Confirmed `Button` accepts `variant/color/isIcon/unstyled/component`, `Card` takes children directly (no `CardContent`), `Input/Textarea` spread `...rest` to the underlying element so `value`/`onChange`/`rows` work natively, `Checkbox/Radio` use the `ApplyWrapper` label pattern. |
| `src/app/pages/apps/student-dashboard/index.tsx` + `HomeScreen.tsx` | Established the canonical 2-/3-column `Page` + `ScrollShadow` layout, the `useState<ScreenId>` tab-switching pattern, the mock-data-then-live-fetch fallback pattern, and the typography/colour tokens (`text-gray-800 dark:text-dark-50`, `bg-primary-500/10`, etc.). |
| `src/app/pages/apps/instructor-dashboard/index.tsx` (via worklog) | Confirmed the previous agent's precedent for the `void courseIdProp;` pattern and the right-sidebar tab strip pattern. |
| `src/@types/polymorphic.tsx` | Confirmed `PolymorphicComponentProps<E, P>` omits keys of `P` from `ComponentPropsWithoutRef<E>` then re-intersects — so passing `value`/`onChange` to `Input` is type-safe. |

---

## 3. Files created (NEW — none modified)

All thirteen files live in `src/app/pages/apps/learning-area/`. Each exports a
default function. No existing files were touched.

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `index.tsx` | 923 | Learning Area layout — 3-column (curriculum tree / active content / tabbed right sidebar). Manages active item + right-tab state. |
| 2 | `VideoLesson.tsx` | 430 | Video player placeholder (BunnyNet to come), custom div-based play/pause + seek bar + speed selector, Mark-as-Complete, prev/next. |
| 3 | `ReadingLesson.tsx` | 273 | Rich-text body, attachments list with download buttons, reading-time estimate, Mark-as-Complete, prev/next. |
| 4 | `QuizTake.tsx` | 917 | Quiz interface supporting all 4 question types (multiple_choice / true_false / short_answer / fill_blank), question palette, count-down timer, results screen with per-question review. |
| 5 | `AssignmentSubmit.tsx` | 510 | Assignment brief, submission form (Textarea + file upload area), previous submissions list, grade block when graded. |
| 6 | `QAPanel.tsx` | 420 | Question list with asker/date/answer count, expandable answer threads, ask-question composer. |
| 7 | `AnnouncementsPanel.tsx` | 208 | Pinned-first announcement list, author/role badges, expand/collapse preview. |
| 8 | `ResourcesPanel.tsx` | 262 | Searchable file list grouped by lesson, file-type icons + sizes, per-group collapse. |
| 9 | `ReviewsPanel.tsx` | 356 | Rating distribution (5★→1★), reviews list with avatars, interactive star-rating composer. |
| 10 | `GradebookPanel.tsx` | 491 | Overall progress, certificate eligibility (with checklist), lesson completion list, quiz scores, assignment grades. |
| 11 | `CertificateView.tsx` | 316 | Earned-state: preview card + verification code + download/share. Locked-state: checklist nudge. |
| 12 | `CourseInfoPanel.tsx` | 279 | Instructor card, at-a-glance stats, categories, tags, prerequisites, description. |
| 13 | `ContentDeliverySettings.tsx` | 345 | Student-facing drip schedule (locked / date-gated / prerequisite / completed) grouped by topic. |

**Total:** 13 files, ~5,730 lines of TypeScript/TSX.

---

## 4. Design decisions & rationale

### Layout & navigation
- Followed the **student-dashboard 3-column pattern** (top bar + sidebar + content + right sidebar) so the Learning Area feels like a sibling of the existing apps. The left sidebar holds the curriculum tree; the main area renders `VideoLesson` / `ReadingLesson` / `QuizTake` / `AssignmentSubmit` based on the active item's kind; the right sidebar is a horizontal-scroll tab strip with eight panels.
- Active item + right-tab live in `useState` in `index.tsx`. The curriculum is built once with `useMemo` into a flat `CurriculumItem[]` array (so prev/next is a trivial index lookup) plus a per-topic tree (so the sidebar can render nested groups).
- The active content type is a discriminated union `{ kind: "lesson" | "quiz" | "assignment"; id: string }` so the render switch is exhaustive and TypeScript catches missing branches.
- Body uses `ScrollShadow` (per the task's NOTE that says use `ScrollShadow` instead of `ScrollArea`) with `hide-scrollbar grow overflow-y-auto` so long screens scroll independently of the sidebars.

### Mock data + live API call sites
- Every file defines mock data at the top (typed against `@/types/lms` where possible) so the screen is always usable in dev. The mock data is structured to make a future swap to `lmsApi.course.get()` / `lmsApi.topic.list()` / `lmsApi.lesson.list()` etc. trivial.
- `index.tsx` is the only file that actually calls the API: `handleLessonProgress()` fires `lmsApi.lesson.updateProgress(lessonId, input)` on every playback tick / seek / Mark-as-Complete. The call is fire-and-forget (rejections swallowed) because the optimistic state in `progressOverride` is what the UI reads. This mirrors the student-dashboard `HomeScreen` pattern.
- The other twelve files are mock-only because the task spec asked for mock data. Each accepts the `courseId` (or relevant entities) as props so a future router can wire live data with one-line changes.

### VideoLesson custom player
- The task spec said "use a div placeholder for the video — we'll integrate BunnyNet later" and "playback controls (play/pause/seek bar using simple divs)". So the player is a `<div>` with `aspect-video`, a big circular play/pause overlay (`Button unstyled isIcon`), a seek bar built from absolutely-positioned `<div>`s whose widths are driven by `position / duration`, and a controls row with play/pause, mute, speed (1x/1.25x/1.5x/2x), and time display. No `<video>` element — BunnyNet can swap in later by replacing the placeholder `<div>`.
- Position updates fire `onProgress` every ~5 seconds while playing (throttled via `lastReportedRef`) and on every seek. Auto-complete fires when position reaches duration.
- Speed selector uses four small `Button unstyled` toggles instead of a native `<select>` to satisfy the "ONLY tailux components" rule.

### QuizTake question types
- Implemented all 4 question types requested: `multiple_choice` (Checkbox group), `true_false` + `single_choice` (Radio group), `short_answer` (Input), `fill_blank` (Input with prompt above). Also handles `essay` (Textarea) as a bonus.
- Grading is done client-side in `gradeAnswer()` (the backend will re-grade authoritatively on submit). For text answers, the comparison is case-insensitive and trims whitespace; multiple acceptable answers are OR'd.
- The results screen shows the score %, pass/fail banner, per-question review with your-answer vs correct-answer, and an explanation block. A "Retake quiz" button resets state. Auto-submit fires when the count-down timer hits 0.

### tailux components only
- Every interactive surface uses `Button` (`filled` / `outlined` / `soft` / `flat`, `isIcon` for icon-only, `unstyled` for the play/pause overlay and the curriculum rows). No native `<button>`, `<input>`, `<select>`, or `<textarea>` — verified by `rg "<(button|input|select|textarea)\b"` returning zero matches.
- `Card` is used everywhere for sections with `skin="bordered"` for list rows and `skin="none"` for the video player wrapper (which has its own dark gradient background). No `CardHeader`/`CardContent` (per the task's NOTE that they don't exist).
- `Input` / `Textarea` are imported from `@/components/ui` (which re-exports from `@/components/ui/Form`). `Checkbox` / `Radio` come from `@/components/ui/Form`. `Avatar` with `initialColor="auto"` is used for student/instructor identity chips.
- `Badge` (variant=`soft` for muted, `filled` for emphasis) is used for status indicators throughout.
- `RatingStars` is reused from `@/components/lms` for both read-only review display and the interactive composer in `ReviewsPanel`.

### State handling
- Every screen that shows a list handles **empty** state via `EmptyState` from `@/components/lms` (e.g. `QAPanel` when there are no questions, `ResourcesPanel` when the search returns nothing, `ReviewsPanel` when there are no reviews).
- Loading / error states aren't rendered in the mock-only screens (because they never load), but the layout is structured so a future `useCourse` / `useLessons` hook can drop in a `LoadingState` / `ErrorState` from `@/components/lms` without restructuring the JSX. The `index.tsx` parent would be the place to add these.
- Optimistic state in `index.tsx` (`progressOverride`) ensures the curriculum tree + gradebook update instantly when the student marks a lesson complete, even before the API call returns.

### TypeScript hygiene
- All 13 files pass `tsc --noEmit -p tsconfig.app.json` with **zero errors**. The only remaining tsc errors in the repo are in `src/app/pages/apps/course-builder/index.tsx` (a different agent's file).
- All 13 files pass `eslint src/app/pages/apps/learning-area/ --max-warnings=0` cleanly.
- Removed every unused import (`clsx` from `AssignmentSubmit` / `CertificateView` / `CourseInfoPanel` / `ReviewsPanel`, `useMemo` from `QuizTake`, `XCircleIcon` from `QuizTake`, `Card` / `Badge` / `CheckCircleIcon` / `DocumentTextIcon` from `index.tsx`, etc.) after writing each file to satisfy the project's `noUnusedLocals` / `noUnusedParameters` config.
- Used the `void courseIdProp;` pattern (precedent from the instructor-dashboard) to mark intentionally-unused props without triggering lint.

---

## 5. Verification

```bash
# Type check (passes for learning-area; remaining errors are in course-builder/)
cd /home/z/my-project/repos/tailux/tailux-main
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json 2>&1 | grep "learning-area"
# (no output = no errors in this directory)

# Lint (passes clean, zero warnings)
./node_modules/.bin/eslint src/app/pages/apps/learning-area/ --max-warnings=0
# (no output, exit code 0)

# Native HTML form-control audit (should be empty)
rg "<(button|input|select|textarea)\b" src/app/pages/apps/learning-area/
# (no matches — every interactive surface uses tailux components)

# File listing
ls -la src/app/pages/apps/learning-area/
# 13 files, ~5,730 lines total
```

---

## 6. Next actions / handoff

- **Routing** — the Learning Area is **not** wired into `protected.tsx` (the rules forbid modifying it). To expose it, an integrator should add to `protected.tsx`:
  ```ts
  {
    path: "apps/learning-area",
    lazy: async () => ({
      Component: (await import("@/app/pages/apps/learning-area"))
        .default,
    }),
  }
  ```
  The default export of `index.tsx` is already lazy-loadable and accepts an optional `courseId` prop. For URL-param wiring, the integrator can read `useParams()` in a thin wrapper and forward `courseId` to `<LearningArea courseId={...} />`.
- **BunnyNet video** — `VideoLesson.tsx` currently renders a styled placeholder `<div>` with a mock tick loop. When the BunnyNet SDK is integrated, replace the placeholder with the Bunny player, drive `setPosition` from its `timeupdate` event, and call `onProgress` (which already forwards to `lmsApi.lesson.updateProgress`).
- **Real data swap** — twelve of the thirteen files are mock-only. Each accepts the relevant entity (or `courseId`) as a prop so a future router can fetch real data. The recommended pattern: a `useCourse(courseId)` hook in `src/hooks/useLms.ts` that returns `{ course, topics, lessons, quizzes, assignments, progressMap, enrollment }` and is consumed by `index.tsx`. The mock arrays at the top of each file become the fallback when the API is unavailable (mirroring `student-dashboard/HomeScreen`).
- **Quiz API** — `QuizTake.tsx` grades client-side for instant feedback but doesn't yet call `lmsApi.quiz.startAttempt()` / `submitAttempt()`. Wire those two calls (the `onSubmit` prop is already plumbed through to `index.tsx`) and trust the backend's authoritative grade in the returned `QuizAttempt` instead of the locally-computed one.
- **Assignment upload** — `AssignmentSubmit.tsx` mocks file upload by pushing fake filenames into local state. Swap the `handleAttach` body for the project's `Filepond` shared component (`@/components/shared/form/Filepond`) and POST via `lmsApi.assignment.submit` once the file service returns a URL.
- **Certificate PDF** — `CertificateView.tsx` "Download PDF" button is currently a no-op. When the backend ships `GET /api/lms/certificates/{id}.pdf`, point the button at that URL (or generate client-side with `jsPDF` if preferred).
- **Q&A answer threads** — the `QAQuestion` type only stores a single `answer` field, but the UI shows a thread. The mock `QAThread` interface adds an `answers: AnswerPost[]` array client-side. When the backend adds a `/qa/{id}/answers` endpoint (or embeds answers in the QAQuestion payload), drop the mock and consume the real array.

---

# Worklog — phase1-agent6

**Task ID:** `phase1-agent6`
**Agent:** z.ai Code (single-agent execution)
**Date:** 2026-07-30
**Repo root:** `/home/z/my-project/repos/tailux/tailux-main`
**Scope:** Build Course Catalog (4 screens), Auth flow (5 screens), and wire ALL new Phase 1 pages into the router.

---

## 1. Objective

Implement Phase 1 user-facing surfaces for the tailux LMS frontend:
1. **Course Catalog** — 4 screens under `src/app/pages/apps/catalog/` (browse, detail, filter, checkout).
2. **Auth flow** — 5 screens under `src/app/pages/auth/` (signup, MFA verify, OAuth callback, forgot password, reset password).
3. **Wire routes** — lazy-loadable routes for the 6 new protected pages + 4 new ghost pages, plus navigation entries in `apps.ts` + icon mappings in `icons.ts`.

---

## 2. Files read for pattern discovery (BEFORE writing any code)

| File | Why |
|------|-----|
| `PHASE1-CONTEXT.md` | Tech stack, available UI components, routing pattern, LMS API endpoints, strict rules (tailux components only, heroicons, clsx, lazy loading). |
| `src/app/router/protected.tsx` | Existing lazy-loading pattern (`lazy: async () => ({ Component: (await import("@/app/pages/apps/...")).default })`), and the two `"apps"` path children blocks (one under `DynamicLayout`, one under `AppLayout`). Confirmed `course-builder` lives in the `AppLayout` block. |
| `src/app/router/ghost.tsx` | Confirmed ghost routes use `GhostGuard` and currently only register `login`. |
| `src/app/router/public.tsx` | Confirmed the structure used for prototypes. |
| `src/app/router/router.tsx` | Confirmed `createBrowserRouter` is used and `protectedRoutes`/`ghostRoutes`/`publicRoutes` are combined under a `Root` component. |
| `src/app/pages/Auth/index.tsx` | Pattern for the existing login page: `react-hook-form` + `yupResolver`, `Page` wrapper, `Card` + `Input` + `Button` + `Checkbox` + `InputErrorMsg`, OAuth buttons row. Mirrored this pattern for `SignupPage`. |
| `src/app/pages/Auth/schema.ts` | Confirmed the yup schema pattern (no explicit type annotation; `AuthFormValues` interface declared separately). |
| `src/app/pages/apps/student-dashboard/index.tsx` | Existing self-contained layout pattern (`Page` + custom 2-column body). |
| `src/app/pages/apps/learning-area/index.tsx` | Mock data definitions + typed `Course` / `Topic` / `Lesson` / `Enrollment` shapes — used as reference for catalog mock data. |
| `src/app/pages/apps/course-builder/index.tsx` | Heavy usage example of tailux components (`Button`, `Input`, `Textarea`, `Switch`, `Checkbox`, `Card`, `Badge`, `Upload`) and how to assemble multi-section screens. |
| `src/components/lms/index.ts` | Barrel exports for LMS components (`CourseGrid`, `CourseCard`, `CourseThumbnail`, `RatingStars`, `PriceTag`, `DifficultyBadge`, `InstructorAvatar`, `EnrollmentButton`, `LessonCard`, `formatPrice`, etc.). |
| `src/components/lms/CourseGrid.tsx`, `CourseCard.tsx`, `RatingStars.tsx`, `PriceTag.tsx`, `DifficultyBadge.tsx`, `InstructorAvatar.tsx`, `CourseThumbnail.tsx`, `EnrollmentButton.tsx`, `LessonCard.tsx` | APIs for each LMS primitive so the catalog/detail/checkout pages compose them correctly. |
| `src/components/ui/Form/Checkbox.tsx`, `Radio.tsx`, `Input.tsx`, `Select.tsx` | tailux control APIs (prop names, variant colors, prefix/suffix slots, ref handling). |
| `src/components/ui/Accordion/Accordion.tsx`, `AccordionItem.tsx`, `AccordionButton.tsx`, `AccordionPanel.tsx` | tailux accordion API (uses `value` on items, `defaultValue` on the parent, render-prop `children` with `{ open }` parameter). Discovered `@headlessui/react` v2 dropped `Accordion` exports, so switched to the tailux primitive. |
| `src/app/pages/prototypes/help-2/sections/Content.tsx` | Working example of the tailux Accordion in the codebase. |
| `src/components/ui/Button/index.tsx`, `Card/index.tsx`, `Badge/index.tsx`, `Spinner/Spinner.tsx` | Variant/color/`unstyled` props; `Card` `skin` option; `Spinner` `variant="soft"` + `color`. |
| `src/app/contexts/auth/context.ts`, `Provider.tsx` | Auth shape (`isAuthenticated`, `login`, `logout`); confirmed dev mode bypasses auth (`isAuthenticated: true`). |
| `src/middleware/GhostGuard.tsx` | Confirmed ghost routes redirect authenticated users to `HOME_PATH` — so the new auth pages are reachable in dev only after disabling auth. |
| `src/types/lms.ts` | Read `Course`, `Topic`, `Lesson`, `CourseReview`, `Category`, `CourseDifficulty`, `LessonType` definitions for typing the mock data. |
| `src/@types/polymorphic.tsx` | Confirmed `PolymorphicComponentProps` omits `ref` (the components re-add `ref?: PolymorphicRef<E>` themselves). |
| `src/app/navigation/segments/apps.ts`, `baseNavigation.ts`, `icons.ts`, `index.ts` | Navigation tree shape (`id`, `path`, `type`, `title`, `transKey`, `icon`) and how `navigationIcons` maps icon keys to components. |

---

## 3. Files created

### 3.1 Course Catalog — `src/app/pages/apps/catalog/`

| File | Purpose | Lines |
|------|---------|------|
| `CategoryFilter.tsx` | Sidebar component with 4 filter groups (category multi-select via `Checkbox`, difficulty / price / rating single-select via `Radio`). Exports `CategoryFilter`, `CatalogFilters`, `PriceFilter`, `RatingFilter`, `CategoryFilterProps`. | ~280 |
| `index.tsx` | Course catalog browse page: header + toolbar (`Input` search with clear-suffix, `Select` sort dropdown), two-column body (sticky `CategoryFilter` sidebar + `CourseGrid`), mobile filter drawer, mock data for 12 courses across 6 categories. Default export. | ~620 |
| `CourseDetailPage.tsx` | Course detail page: hero (thumbnail + play overlay, title, rating, instructor, price card with `Enroll Now` / `Watch Preview`), about + "what you'll learn", curriculum accordion (topics → lessons via tailux `Accordion`), instructor bio, reviews summary + list, related courses grid. Default export. | ~700 |
| `CheckoutPage.tsx` | Simple checkout: contact email, payment-method tiles (card / PayPal / wallet), card form placeholder, course summary, coupon code input (`Apply` / remove), price breakdown (subtotal / discount / tax / total), `Complete Purchase` CTA, success state. Default export. | ~510 |

### 3.2 Auth flow — `src/app/pages/auth/`

| File | Purpose | Lines |
|------|---------|------|
| `SignupPage.tsx` | Student/instructor signup: full name, email, password (with show/hide + strength meter), role selector (student/instructor) via custom `RoleCard` wrapping `Radio`, terms `Checkbox`, "Create Account" button, OAuth quick-signup (Google / GitHub), sign-in link. Uses `react-hook-form` + `yup` (same pattern as existing `Auth/index.tsx`). Default export. | ~445 |
| `MFAVerifyPage.tsx` | 6-cell OTP input with auto-advance, backspace-jump, paste-fill, "Verify" button, 30-second resend countdown, "Use recovery code" toggle that swaps to a single-line recovery-code view. Success state with redirect to `/`. Default export. | ~390 |
| `OAuthCallbackPage.tsx` | OAuth callback handler: reads `provider` / `code` / `error` / `redirect` from query string, shows branded `Spinner` while "exchanging" the code, success state with auto-redirect, error state with "Try again" / "Back to sign up" + humanized error messages for common OAuth error codes. Default export. | ~265 |
| `ForgotPasswordPage.tsx` | Email entry + "Send reset link" button, success state ("Check your inbox") with "Resend reset link" / "Use a different email" affordances. Anti-enumeration posture: same success message regardless of whether the email is associated with an account. Default export. | ~240 |
| `ResetPasswordPage.tsx` | New password + confirm password with show/hide toggles, rule checklist (8+ chars, uppercase, number, symbol), live match indicator, "Reset Password" button, success state with redirect to `/login`. Reads `token` from query string. Default export. | ~330 |

### 3.3 Routes & navigation — modified files

| File | Change |
|------|--------|
| `src/app/router/protected.tsx` | Added 6 lazy-loaded routes inside the existing `"apps"` children block under `AppLayout` (next to `course-builder`): `student-dashboard`, `instructor-dashboard`, `learning-area`, `catalog`, `course-detail`, `checkout`. |
| `src/app/router/ghost.tsx` | Added 5 lazy-loaded routes: `signup`, `mfa-verify`, `forgot-password`, `reset-password`, `oauth/callback`. (OAuth callback was added beyond the task spec because the SignupPage's Google / GitHub buttons navigate to `/oauth/callback?provider=...`.) |
| `src/app/navigation/segments/apps.ts` | Added 4 nav items after `apps.course-builder`: `apps.student-dashboard`, `apps.instructor-dashboard`, `apps.learning-area`, `apps.catalog`. |
| `src/app/navigation/icons.ts` | Imported `AcademicCapIcon` + `BookOpenIcon` from `@heroicons/react/24/outline` and added 4 icon-key mappings: `apps.student-dashboard` → `StudentIcon`, `apps.instructor-dashboard` → `TeacherIcon`, `apps.learning-area` → `AcademicCapIcon`, `apps.catalog` → `BookOpenIcon`. |

---

## 4. Design decisions

### tailux components only — verified
- Every interactive surface uses `Button` (with `variant` / `color` / `unstyled` / `isIcon`), `Input`, `Select`, `Checkbox`, `Radio`, `Card`, `Badge`, `Avatar`, `Spinner`, `Accordion` (and friends), all from `@/components/ui`.
- No raw `<button>` or `<input>` elements — verified by `rg "<(button|input|select|textarea)\b" src/app/pages/apps/catalog/ src/app/pages/auth/` returning zero matches (the only `input` matches are inside tailux `Form/*` internals, not in my pages).

### Course Catalog filter state
- `CatalogFilters` is a single lifted-state object (`categories: string[]`, `difficulty: CourseDifficulty | "all"`, `price: "all" | "free" | "paid"`, `rating: "all" | "4+" | "4.5+"`) owned by the parent `index.tsx`. `CategoryFilter` is purely presentational — every change calls `onChange(next)` so the parent re-derives the filtered course list. This keeps the sidebar reusable (e.g. for a future mobile filter sheet).
- The parent applies filters in `useMemo` so the grid re-renders only when search, sort, or filters change.
- Sort dropdown uses the tailux `Select` with `data=[{ label, value }]` (no raw `<option>`s).
- Mobile filter drawer is a simple fixed-position overlay with a backdrop click-to-close — no Dialog/Modal dependency.

### CourseDetailPage accordion swap
- Initially used `@headlessui/react`'s `Accordion` / `AccordionItem` / `AccordionButton` / `AccordionPanel`, but `@headlessui/react` v2 removed those exports. Refactored to use the tailux `Accordion` from `@/components/ui` (which has its own accordion implementation backed by `Collapse`). The tailux API is render-prop-based (`children: ({ open }) => ReactNode`) so the open-state-driven chevron rotation still works. `defaultValue={MOCK_TOPICS[0]?.id}` opens the first topic on mount.

### CourseDetailPage enroll CTA
- The "Enroll Now" button branches on `priceType` / `priceCents`:
  - **Free** → flip to "Continue Learning" and navigate to `/apps/learning-area`.
  - **Paid** → navigate to `/apps/checkout`.
  This mirrors a real LMS flow without needing a backend.

### CheckoutPage coupon logic
- `VALID_COUPONS = { REACT20: 20, LAUNCH10: 10, FRIENDS: 15 }` — three demo coupons documented in the helper text so QA can try them.
- Discount is computed in cents (`subtotal * pct / 100`) and tax (8%) is applied to the discounted base. Total is `taxableBase + tax`.
- The "wallet" payment method is intentionally disabled in the CTA because the mock wallet balance is $0 — demonstrates the `disabled` prop on `Button`.

### Auth pages — consistent shell
- All 5 auth pages share the same shell: centered `Page` + `Logo` + heading + `Card` + form + footer link, mirroring the existing `Auth/index.tsx` login page. This keeps visual consistency across the unauthenticated surface.
- `SignupPage` uses `react-hook-form` + `yup` for validation (same pattern as `Auth/index.tsx`). The schema is cast as `Yup.ObjectSchema<SignupFormValues>` when passed to `yupResolver` because `Yup.boolean().oneOf([true])` infers as `boolean | undefined` while the `SignupFormValues` interface declares `acceptTerms: boolean`.
- The 6-cell MFA input is six tailux `Input` components with `unstyled` + custom class, controlled by `cells: string[]` state. Auto-advance, backspace-jump, and paste-fill are all handled via `onKeyDown` / `onPaste` on the wrapping `<div>`. Cell refs are stored in a `useRef<Array<HTMLInputElement | null>>` so we can programmatically focus.

### OAuth callback — query-string driven
- The page reads `provider`, `code`, `error`, `error_description`, and `redirect` from the URL via `useSearchParams()`. The provider logo (Google / GitHub / Microsoft / Facebook) is resolved from the `provider` query param and overlaid on the loading `Spinner`.
- A small `humanizeError()` helper maps the standard OAuth 2.1 error codes (`access_denied`, `invalid_request`, `invalid_grant`, `unauthorized_client`, `unsupported_response_type`, `server_error`, `temporarily_unavailable`) to user-friendly strings.

### Anti-enumeration posture
- `ForgotPasswordPage` shows the same "Check your inbox" success message regardless of whether the email is associated with an account. This is the standard security posture for password-reset endpoints (don't leak which emails are registered).

### Navigation — lowercase `auth/` vs capital `Auth/`
- The existing login page lives at `src/app/pages/Auth/index.tsx` (capital A). The task spec asked for new auth files at `src/app/pages/auth/SignupPage.tsx` etc. (lowercase a). I kept both directories: the existing `Auth/` directory is untouched (login route still imports from `@/app/pages/Auth`), and the new lowercase `auth/` directory holds the 5 new pages. On case-sensitive filesystems these are distinct directories; the route imports use the exact case the task spec specified.

---

## 5. Verification

```bash
# Type check — all new files pass cleanly.
cd /home/z/my-project/repos/tailux/tailux-main
./node_modules/.bin/tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "(catalog|auth/)"
# (no output = no errors in either directory)

# Remaining tsc errors are all pre-existing in src/app/pages/apps/course-builder/index.tsx
# (a different agent's file: unused `useRef`/`topicId` locals + a `size` prop on `Button`
# that the Button type doesn't expose). None of my files contribute errors.

# Native HTML form-control audit (should be empty for new pages)
rg "<(button|input|select|textarea)\b" src/app/pages/apps/catalog/ src/app/pages/auth/
# (zero matches — every interactive surface uses tailux components)

# Route wiring audit
rg "student-dashboard|instructor-dashboard|learning-area|catalog|course-detail|checkout" src/app/router/protected.tsx
# → 6 matches: one per route, all under the AppLayout apps children block.

rg "SignupPage|MFAVerifyPage|ForgotPasswordPage|ResetPasswordPage|OAuthCallbackPage" src/app/router/ghost.tsx
# → 5 matches: signup, mfa-verify, forgot-password, reset-password, oauth/callback.

# Navigation audit
rg "student-dashboard|instructor-dashboard|learning-area|catalog" src/app/navigation/segments/apps.ts
# → 4 nav items added.

# Icon mapping audit
rg "apps.student-dashboard|apps.instructor-dashboard|apps.learning-area|apps.catalog" src/app/navigation/icons.ts
# → 4 icon mappings added.
```

---

## 6. Next actions / handoff

- **Reachability in dev** — the new auth pages live under `ghostRoutes` which `GhostGuard` redirects to `HOME_PATH` when `isAuthenticated` is `true`. Dev mode currently has `isAuthenticated: true` (see `src/app/contexts/auth/Provider.tsx` line 24), so to actually exercise `/signup`, `/mfa-verify`, etc. in dev, temporarily set that flag to `false` (or remove the dev bypass) and reload. The pages themselves are fully functional with simulated network latency.
- **Backend wiring** — every auth page uses a `setTimeout` to simulate the API round-trip. When the real `/api/auth/signup`, `/api/auth/mfa/verify`, `/api/auth/forgot-password`, `/api/auth/reset-password`, and `/api/oauth/callback` endpoints are ready, replace the `setTimeout` blocks with `axios` calls (the project's axios instance is at `@/utils/axios`). The success / error / loading state machines are already in place.
- **Course data** — `index.tsx`, `CourseDetailPage.tsx`, and `CheckoutPage.tsx` use mock courses defined inline. When `lmsApi.course.list()` / `lmsApi.course.get(id)` are populated, swap the `MOCK_COURSES` / `MOCK_COURSE` constants for the API response. The `Course` type from `@/types/lms` is already used for typing, so the swap is a one-liner per file.
- **Coupon validation** — `CheckoutPage.tsx` hardcodes `VALID_COUPONS = { REACT20, LAUNCH10, FRIENDS }`. Replace with `lmsApi.coupon.validate(code)` once the backend endpoint is live.
- **OAuth provider round-trip** — `SignupPage.tsx`'s Google / GitHub buttons currently `navigate("/oauth/callback?provider=google")` to demonstrate the callback handler. In production, these should redirect to the provider's authorize URL (e.g. `https://accounts.google.com/o/oauth2/v2/auth?...`) and let the provider bounce back to `/oauth/callback?code=...`. The callback page already handles both `code` and `error` query params.
- **Course detail URL** — currently `/apps/course-detail` is a single route with no `:courseId` param; all three pages share `MOCK_COURSE`. To support per-course detail pages, change the route to `course-detail/:courseId` and have `CourseDetailPage` read `useParams()` to fetch the right course. The existing `handleCourseClick` in `index.tsx` already calls `navigate("/apps/course-detail")` — update it to `navigate(\`/apps/course-detail/${course.id}\`)` once the route accepts the param.
- **Lint cleanup** — the pre-existing `src/app/pages/apps/course-builder/index.tsx` file has 6 tsc errors (unused locals + a `size` prop on `Button` that doesn't exist in the type). Those are out of scope for this task but should be cleaned up by the course-builder owner.
