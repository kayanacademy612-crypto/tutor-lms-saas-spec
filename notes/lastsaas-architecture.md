# LastSaaS Architecture Map

> Source: `/home/z/my-project/repos/lastsaas` (v1.3, Go 1.25 / React 19 / MongoDB)
> Purpose: Reference for planning the extension of lastsaas into a Tutor LMS Pro-style learning-management SaaS.

---

## 1. Top-Level Layout & Shipping Model

```
lastsaas/
├── backend/            # Go 1.25 service + CLI
├── frontend/           # Vite + React 19 SPA
├── scripts/setup.sh    # Interactive config/.env generator
├── Dockerfile          # Multi-stage: builds Go + frontend, ships one Alpine image
├── fly.toml            # Fly.io deploy config (single machine, 1 GB RAM, iad region)
├── manifest.json       # MCP server manifest (26 read-only admin tools)
├── server.json         # MCPB package descriptor (stdio transport)
├── glama.json          # Glama MCP registry metadata
├── smithery.yaml       # Smithery MCP runtime config
├── .env.example        # All env vars (DB, JWT, OAuth, Stripe, Resend, Datadog)
├── VERSION             # "1.3"
├── CLAUDE.md           # Developer rules (hybrid validation, deploy warning)
├── VERSIONS.md, README.md, LICENSE, codecov.yml
```

**Key takeaways:**

- **Single Docker image, single process.** `Dockerfile` builds the Go binary (`cmd/server`) and the frontend dist, then runs them as one process on port 8080. The Go server serves `/api/*` and the SPA from `/app/static` via a catch-all `spaHandler` (see `backend/cmd/server/main.go:44`). No reverse proxy, no nginx.
- **MongoDB Atlas is the only external runtime dependency.** `MONGODB_URI` is required; no on-host DB.
- **Fly.io deploy** with `internal_port=8080`, force_https, auto-stop/start machines, health check on `/health`. **NOTE (from `CLAUDE.md`):** dependent projects are supposed to deploy via `Dockerfile.saas` + `fly.saas.toml` — neither file currently exists in this repo, but the convention matters for downstream planning.
- **MCP server is a CLI subcommand.** The same binary (`bin/lastsaas mcp`) runs an stdio MCP server that calls the HTTP API using a root-tenant API key. Tools are read-only and admin-scoped (see `manifest.json`).
- **No docker-compose.** Local dev = run `mongod` locally (or Atlas), then `go run ./cmd/server` on `:4290` and `npm run dev` (Vite) on `:4280` with a proxy to the backend.

---

## 2. Backend (Go)

### 2.1 Directory Structure

```
backend/
├── cmd/
│   ├── server/main.go        # HTTP server entry point (~845 lines, all routing here)
│   └── lastsaas/             # CLI: setup, start, stop, change-password, send-message,
│       │                     #   transfer-root-owner, config, version, status, logs,
│       │                     #   users, tenants, health, stats, doctor, financial, db, mcp
│       ├── main.go           # Dispatch (os.Args[1] switch)
│       ├── cmd_*.go          # One file per CLI subcommand
│       ├── output.go         # JSON/table output helpers
│       └── process.go        # Process management (start/stop daemon)
├── internal/
│   ├── api/handlers/         # All HTTP handlers (one file per resource area)
│   ├── auth/                 # JWT, password (bcrypt), TOTP, OAuth (Google/GitHub/Microsoft), UA parser
│   ├── config/               # YAML config loader + .env loader + env-var expansion
│   ├── configstore/          # In-memory cached config vars, backed by MongoDB (hot reload)
│   ├── apicounter/           # Atomic counters for Stripe/Resend/DataDog call metrics
│   ├── apierror/             # Centralized API error helpers
│   ├── datadog/              # Datadog metrics client
│   ├── db/                   # mongodb.go (driver+indexes) + schema.go (JSON Schema validators)
│   ├── email/                # Resend transactional email service with Go templates
│   ├── events/               # In-process event emitter interface (NoopEmitter default)
│   ├── health/               # Node registration, system metrics, integration checks
│   ├── metrics/              # HTTP middleware metrics collector
│   ├── middleware/           # auth, tenant, rbac, ratelimit, bodylimit, security, requestid,
│   │                         #   apiversion, recovery
│   ├── models/               # All domain structs (one file per collection) + validation tags
│   ├── planstore/            # Plan seeding (system "Free" plan)
│   ├── stripe/               # Stripe service (customer, price, checkout, portal, subscription)
│   ├── syslog/               # System log writer (writes to system_logs collection)
│   ├── telemetry/            # Product analytics: funnel, retention, engagement, custom events
│   ├── testutil/             # Test helpers
│   ├── validation/           # go-playground/validator setup with custom validators
│   ├── version/              # Build version + update check
│   └── webhooks/             # Outbound webhook dispatcher with retry queue + AES-256-GCM secret encryption
├── config/
│   ├── dev.example.yaml      # Dev config template
│   ├── prod.example.yaml     # Prod config template
│   └── test.yaml             # Test config (port 3099, test DB name)
├── go.mod / go.sum
└── Makefile                  # test, test-unit, test-integration, test-coverage, test-e2e
```

### 2.2 HTTP Framework & Routing

- **Framework:** `gorilla/mux` v1.8.1 (not Gin/Echo/Chi). Standard `net/http` handlers throughout.
- **CORS:** `github.com/rs/cors`.
- **Routing style:** All routes are wired in a single file (`cmd/server/main.go`, lines ~376–790) using `mux.Router.HandleFunc(...).Methods(...)`. There is no per-feature router registration; adding a new resource means editing `main.go`.
- **Route hierarchy:** `router` → `/api` subrouter (RequestID + APIVersion middleware) → `guarded` subrouter (BootstrapGuard) → `protectedAuth`, `tenantAPI`, `billingAPI`, `adminAPI` sub-sub-routers, each with their own middleware chain.
- **Middleware chain (outer→inner):** `Recovery → BodySizeLimit → SecurityHeaders → CORS → MetricsCollector → RequestID → APIVersion → BootstrapGuard → [RequireAuth | RequireTenant | RequireRole | RequireRootTenant | RequireEntitlement]`.
- **OpenAPI is hand-coded, not generated.** `handlers/docs.go` (1192 lines) and `handlers/openapi.go` build an OpenAPI 3.0 JSON served at `/api/docs/openapi.json`. There is no `swag`/`oapi-codegen` annotation pipeline.

### 2.3 Database Layer

- **Database:** MongoDB (official driver `go.mongodb.org/mongo-driver` v1.17.9). No Postgres/SQLite. No sqlc/gorm/squirrel.
- **Connection:** `internal/db/mongodb.go` — `NewMongoDB(uri, database)` connects, calls `ensureIndexes()` (creates ~30 indexes), then `EnsureSchemaValidation()` (applies MongoDB JSON Schema validators via `collMod`).
- **Schema source of truth:** Go structs in `internal/models/*.go` (with `bson` + `validate` tags). The MongoDB JSON Schema in `internal/db/schema.go` is a parallel, hand-maintained validator (15 collections explicitly validated). **`CLAUDE.md` mandates keeping both in sync.**
- **No migrations framework.** "Schema migration" = editing Go struct + editing `schema.go` + editing `ensureIndexes()` in `mongodb.go`. Indexes are idempotent (`CreateMany` is safe to re-run).
- **Collection access:** `MongoDB` struct exposes typed accessor methods, e.g. `db.Users()`, `db.Tenants()`, `db.TenantMemberships()` (see `mongodb.go:333+` for the full list — 30+ collections).

### 2.4 Authentication

- **JWT (HS256) access + refresh tokens.** `internal/auth/jwt.go`:
  - Access token TTL: 60 min (configurable). Claims: `userId`, `email`, `displayName`, `tokenType` (`access`/`mfa`/`impersonation`), `mfaPending`, `impersonatedBy`.
  - Refresh token TTL: 30 days. Stored hashed in `refresh_tokens` collection with `familyId`, IP, UA, device info.
  - Revocation list in `revoked_tokens` (TTL-indexed).
- **OAuth providers:** Google, GitHub, Microsoft — each in its own file (`internal/auth/{google,github,microsoft}_oauth.go`). OAuth flow uses `golang.org/x/oauth2`, stores state in `oauth_states` collection (TTL).
- **MFA:** TOTP via `pquerna/otp` (`internal/auth/totp.go`). Recovery codes stored hashed. MFA token is a 5-min JWT.
- **Magic links:** Email-based login with tokens stored in `verification_tokens`.
- **WebAuthn / Passkeys:** Credentials in `webauthn_credentials`, sessions in `webauthn_sessions`.
- **Auth code exchange:** Short-lived `auth_codes` collection enables OAuth/CLI token handoff (used by the MCP server).
- **User model (`internal/models/user.go`):** `id`, `email` (unique), `displayName`, `passwordHash`, `googleId`/`githubId`/`microsoftId` (sparse unique), `authMethods[]`, `emailVerified`, `isActive`, `totpSecret`/`totpEnabled`/`recoveryCodes`, `themePreference`, `onboardingCompletedAt`, `failedLoginAttempts`, `accountLockedUntil`, `trialUsedAt`, timestamps.

### 2.5 Authorization, RBAC & Multi-Tenancy

- **Multi-tenancy is built in and central.** Every user belongs to ≥1 tenant via `tenant_memberships` (userId + tenantId unique pair). A `root` tenant (`isRoot=true`) is the platform admin tenant.
- **Roles** (`internal/models/membership.go`): `owner`, `admin`, `user`. Hierarchical: `RoleHasPermission(userRole, requiredRole)` compares a numeric hierarchy (user=1, admin=2, owner=3).
- **Middleware** (`internal/middleware/`):
  - `RequireAuth` — validates JWT or `lsk_`-prefixed API key (SHA-256 hashed). API keys resolve to a user; admin keys (`APIKeyAuthorityAdmin`) auto-attach the root tenant + admin role.
  - `RequireTenant` (`tenant.go`) — reads `X-Tenant-ID` header, looks up the tenant, verifies the user is a member, populates `TenantContextKey` + `MembershipContextKey`.
  - `RequireRole(minRole)` (`rbac.go`) — checks membership role against minimum.
  - `RequireRootTenant()` — only the root tenant.
  - `RequireActiveBilling()` (`tenant.go`) — blocks non-active tenants (root & waived tenants exempt).
  - `RequireEntitlement(db, featureKey)` (`tenant.go`) — looks up the tenant's plan and checks the entitlements map for a boolean key. **This is the existing feature-flag / gating primitive.**
- **Impersonation:** Admin can mint a 5-min impersonation JWT; `ImpersonatedByContextKey` flows through; tracked in `impersonation_logs` collection.

### 2.6 Billing & Subscriptions

- **Stripe integration** (`internal/stripe/stripe.go`) using `stripe-go/v82`. Service methods: `GetOrCreateCustomer`, `GetOrCreatePrice` (auto-creates Products+Prices and stores in `stripe_mappings`), `CreateCheckoutSession` (subscription or payment mode, supports trials, per-seat, automatic tax, custom line items, currency), `CreateBillingPortalSession`, `CancelSubscriptionAtPeriodEnd`, `CancelSubscriptionImmediately`, `UpdateSubscriptionQuantity`, `ConstructEvent` (webhook signature verification), `NextInvoiceNumber` (atomic counter), `GetCheckoutSession`, `GetSubscription`.
- **Stripe webhook** handled at `POST /api/billing/webhook` (no auth — Stripe signature verification only) in `handlers/webhook.go`. Events mutate the tenant's `billingStatus`, `currentPeriodEnd`, `canceledAt`, `stripeSubscriptionId`.
- **Multi-instance support:** `Service.InstanceID()` is derived from the frontend hostname and stamped into Stripe metadata, allowing multiple lastsaas instances to share a Stripe account.
- **Plans** (`internal/models/plan.go`): Free-form, admin-defined. Fields: `pricingModel` (`flat`/`per_seat`), `monthlyPriceCents`, `annualDiscountPct`, `perSeatPriceCents`, `includedSeats`, `minSeats`/`maxSeats`, `usageCreditsPerMonth`, `creditResetPolicy` (`reset`/`accrue`), `bonusCredits`, `userLimit`, `trialDays`, `entitlements` (map[string]EntitlementValue where value is bool or numeric), `isSystem`, `isArchived`.
- **Credit bundles** (`credit_bundle.go`): One-off purchases (name, credits, priceCents, isActive, sortOrder).
- **Financial transactions** (`billing.go`): Every payment event recorded with `type` (`subscription`/`credit_purchase`/`refund`), amount, tax, currency, invoice number, Stripe IDs, plan/bundle snapshot. Invoice PDFs generated with `jung-kurt/gofpdf`.
- **Daily metrics** (`billing.go`): DAU/WAU/MAU/Revenue/ARR snapshot per day for admin dashboards.
- **Promotions:** Stripe promotion codes & coupons managed via `promotions.go` handler.

### 2.7 Configuration

- **YAML config files** in `backend/config/{env}.yaml` (loaded by `internal/config/config.go`). Env var expansion via `${VAR}` or `${VAR:default}` syntax. `LASTSAAS_ENV` selects dev/prod/test (defaults to `dev`).
- **`.env` loader:** `config.LoadEnvFile()` walks up to 3 parent dirs looking for `.env` (does not override already-set env vars).
- **Runtime config store** (`internal/configstore/`): `ConfigVar` documents (name/description/type/value/options/isSystem) live in `config_vars` collection. In-memory cache with `sync.RWMutex`, hot path is lock-free. `StartAutoReload(ctx, interval)` polls DB so multi-node deploys stay in sync.
- **Email templates** are config-driven: keys like `email.verification.subject`, `email.verification.body`, `email.password_reset.*`, `email.magic_link.*`, `email.invitation.*` override Go-template fallbacks.
- **Secrets:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≥16 chars, validated), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `WEBHOOK_ENCRYPTION_KEY` (64-char hex for AES-256-GCM webhook secret encryption), OAuth secrets, `DATADOG_API_KEY`.

### 2.8 Background Jobs & Queues

- **No external queue (asynq/river/temporal).** All async work is in-process goroutines.
- **Webhook dispatcher** (`internal/webhooks/dispatcher.go`): In-memory retry queue (`chan retryJob`, size 500), 5 retry workers, 3 retries with exponential backoff (1m / 5m / 30m), bounded emit concurrency (25). Events flow through an `events.Emitter` interface — webhooks subscribe by event type.
- **ConfigStore auto-reload goroutine** polls every N seconds.
- **Health node heartbeat** — `system_nodes` collection updated periodically (see `internal/health/`).
- **Leader locks** (`leader_locks` collection) — TTL-indexed locks for single-leader tasks across multi-node deploys (used by daily metrics aggregation).
- **Email retries** — `ResendService` does 3 retries with exponential backoff inline (no queue).
- **Async lastUsedAt update** for API keys — fire-and-forget goroutine.

### 2.9 File Uploads / Storage

- **No S3 / cloud storage abstraction.** Branding assets (logo, favicon, media uploads) are stored as binary blobs directly in MongoDB (`branding_assets` collection, `Data []byte`). Served by `brandingHandler.ServeAsset` / `ServeMedia`.
- This is a constraint to flag for the LMS plan: course videos / large media will need a real object storage layer.

### 2.10 Email / Notifications

- **Resend** is the only email provider (`internal/email/resend.go`). HTTP API at `https://api.resend.com/emails`. No SMTP/SES.
- Four built-in templates (verification, password reset, magic link, invitation) each with subject+body, all overridable via `configstore`.
- In-app messages: `messages` collection (`subject`, `body`, `isSystem`, `read`), surfaced via `/api/messages` and an unread-count badge in the nav.
- Announcements: `announcements` collection, published/draft, shown on the dashboard.

### 2.11 Tests

- **Backend:** Go standard `testing`. `Makefile` defines:
  - `make test` — all tests, `LASTSAAS_ENV=test`
  - `make test-unit` — `-short` (no DB)
  - `make test-integration` — `Integration` test name regex (needs MongoDB)
  - `make test-coverage` — coverage.out → HTML
- Co-located `_test.go` files per package (e.g. `auth_test.go` next to `auth.go`). `testhelpers_test.go` and `internal/testutil/` provide shared fixtures.
- **Frontend:** Vitest (unit, with `@testing-library/react` + `msw` for HTTP mocking) + Playwright E2E (`frontend/e2e/*.spec.ts`).

### 2.12 Existing Domain Modules (Templates for "courses")

There are **no application-domain modules** (no blog, tasks, projects, courses). Everything in `internal/api/handlers/` is SaaS-foundation concerns (auth, tenant, billing, admin, branding, webhooks, telemetry, etc.). The closest patterns to imitate for a new "courses" module:

| Concern | Reference handler | Notes |
|---|---|---|
| CRUD + list-with-pagination | `plans.go`, `bundles.go`, `announcements.go` | Owner-scoped, admin-scoped, or tenant-scoped |
| Tenant-scoped resource with role checks | `tenant.go` (members) | Uses `RequireTenant` + `RequireRole` |
| Webhook event emission | `billing.go`, `tenant.go` | Calls `emitter.Emit(events.Event{...})` |
| Entitlement-gated feature | `middleware/tenant.go` `RequireEntitlement` | Add as middleware on a subrouter |
| File/media upload | `branding.go` `UploadAsset`/`UploadMedia` | Multipart form, binary in MongoDB |

---

## 3. Frontend (React)

### 3.1 Stack (`frontend/package.json`)

- **React 19.2**, **TypeScript 5.9**, **Vite 7** (`@vitejs/plugin-react`)
- **Package manager:** npm (`package-lock.json`); no pnpm/yarn
- **Routing:** `react-router-dom` v7 (BrowserRouter, file-less — all routes declared in `src/App.tsx`)
- **State / data:** `@tanstack/react-query` v5 (server state), React Context for app state (Auth, Tenant, Branding, Theme). No Redux/Zustand.
- **Forms:** `react-hook-form` v7 + `@hookform/resolvers` + `zod` v4 for validation
- **HTTP:** `axios` v1 (`src/api/client.ts` — single shared instance)
- **UI primitives:** Custom small component library in `src/components/ui/` (Button, Input, Select, Textarea, Card, Badge, Alert, Modal) — **not** shadcn/ui. Icons: `lucide-react`. Charts: `recharts` v3. Toasts: `sonner`.
- **Styling:** **Tailwind CSS v4** (`@import "tailwindcss"` + `@theme` directive in `src/styles/index.css`, `@tailwindcss/vite` plugin). Custom CSS variables for primary/dark/accent palettes. No CSS modules, no styled-components.
- **DOM sanitization:** `dompurify` (for branding HTML and custom pages)
- **Testing:** Vitest + Testing Library + jsdom + MSW; Playwright for E2E

### 3.2 Frontend Routing (`src/App.tsx`)

Routes are flat with three layout zones:

| Path prefix | Layout | Auth | Purpose |
|---|---|---|---|
| `/` | none | public | Landing page (HTML from branding) |
| `/p/:slug` | none | public | Custom pages (HTML from branding) |
| `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/mfa`, `/auth/magic-link` | none | public | Auth flow (lazy-loaded) |
| `/setup` | none | public | First-run bootstrap (only when system not initialized) |
| `/onboarding` | none | auth | Post-signup onboarding (no sidebar) |
| `/dashboard`, `/team`, `/plan`, `/buy-credits`, `/billing/success`, `/billing/cancel`, `/settings`, `/activity`, `/test-entitlements`, `/messages` | `Layout` | auth | Tenant-scoped app pages |
| `/last`, `/last/messages`, `/last/users`, `/last/users/:userId`, `/last/tenants`, `/last/tenants/:tenantId`, `/last/members`, `/last/plans`, `/last/financial`, `/last/pm`, `/last/promotions`, `/last/announcements`, `/last/health`, `/last/logs`, `/last/config`, `/last/branding`, `/last/api`, `/last/about` | `AdminLayout` | auth + root tenant | Admin console |

`AdminLayout` redirects non-root-tenant users to `/dashboard`.

### 3.3 Auth Flow on the Frontend

- **JWTs stored in `localStorage`** (`lastsaas_access_token`, `lastsaas_refresh_token`) — explicitly documented as a deliberate XSS-vs-CSRF trade-off in `src/contexts/AuthContext.tsx`.
- **`AuthContext`** loads tokens on mount, calls `/auth/me` to fetch `{user, memberships}`, exposes `login`, `register`, `loginWithTokens`, `completeMfaChallenge`, `logout`, `refreshUser`.
- **`TenantContext`** picks the active tenant from `memberships[]` (defaults to root tenant if user is a member; persists choice in `localStorage` under `lastsaas_active_tenant`). Sets the `X-Tenant-ID` axios header.
- **`axios` interceptor** in `api/client.ts`: on 401, attempts silent refresh; if refresh fails, clears tokens and redirects to `/login`. Also intercepts 503 with `redirect: '/setup'` to send users to the bootstrap page.
- **Route guards:** `ProtectedRoute` (checks `isAuthenticated`) and `AdminLayout` (checks `isRootTenant`).
- **Impersonation banner** (`ImpersonationBanner.tsx`) shown when JWT contains `impersonatedBy`.

### 3.4 Frontend Feature Folders

```
frontend/src/
├── api/client.ts            # All API calls grouped by domain (authApi, tenantApi, adminApi,
│                            #   plansApi, bundlesApi, billingApi, usageApi, telemetryApi,
│                            #   pmApi, brandingApi, brandingAdminApi, messagesApi,
│                            #   announcementsApi)
├── components/
│   ├── ui/                  # 8 primitive components (Button, Input, Select, Textarea, Card,
│   │                        #   Badge, Alert, Modal) — re-exported via ui/index.ts
│   ├── Layout.tsx           # Tenant-scoped app shell (sidebar, tenant switcher, theme toggle)
│   ├── AdminLayout.tsx      # Admin console shell (16 nav items)
│   ├── ProtectedRoute.tsx   # Auth guard
│   ├── AdminRoute.tsx       # Root-tenant guard (used by AdminLayout internally)
│   ├── ErrorBoundary.tsx, ConfirmModal.tsx, LoadingSpinner.tsx, TableSkeleton.tsx
│   ├── ImpersonationBanner.tsx
│   └── BrandingThemeInjector.tsx  # Injects branding CSS variables at runtime
├── contexts/
│   ├── AuthContext.tsx
│   ├── TenantContext.tsx
│   ├── BrandingContext.tsx  # Loads /api/branding, applies app name + theme
│   └── ThemeContext.tsx     # dark/light/system, persisted to user preferences
├── hooks/
│   └── useTelemetry.ts      # Page-view + custom-event tracking
├── pages/
│   ├── BootstrapPage.tsx    # First-run setup wizard
│   ├── auth/                # 8 auth pages
│   ├── app/                 # 11 tenant-scoped pages (Dashboard, Team, Plan, BuyCredits,
│   │                        #   BillingSuccess/Cancel, Settings + 5 settings tabs,
│   │                        #   Activity, Onboarding, TestEntitlements)
│   ├── admin/               # 18 admin pages incl. health/ subfolder with 7 chart components
│   └── public/              # LandingPage, CustomPage
├── styles/index.css         # Tailwind v4 entry + theme variables
├── types/index.ts           # ~700 lines of TypeScript interfaces mirroring backend models
└── main.tsx                 # React root
```

### 3.5 Admin / Dashboard / Settings Pages Already Present

**Admin console (`/last/*`):** Dashboard, Messages, Users, User Profile, Tenants, Tenant Profile, Root Members, Plans, Financial, Product (PM funnel/retention/engagement/KPIs/events/event-definitions/sankey), Promotions, Announcements, System Health (with chart cards, node cards, integrations panel, current status panel, time range selector), Logs, Configuration, Branding, API Keys, About.

**App settings (`/settings`):** Tabbed — Profile, Security (MFA, sessions, passkeys), Billing (transactions, invoices, Stripe portal), with `MFASetupModal` and `InvoiceModal` components.

### 3.6 Theming & i18n

- **Dark mode** is first-class: `ThemeContext` supports `dark`/`light`/`system`, applies `data-theme` attribute on `<html>`, persists to `localStorage` and to the user's `themePreference` field. Default theme is dark.
- **Branding is fully white-label.** `BrandingContext` loads `/api/branding` (appName, tagline, logoMode, primary/accent/background/surface/text colors, fonts, landing/login/signup HTML, custom CSS, head HTML, OG image, nav items). `BrandingThemeInjector` rewrites CSS variables at runtime.
- **No i18n framework.** All strings are hardcoded English. No `react-intl`, `i18next`, or message catalog.

---

## 4. Database Schema (All 30+ Collections)

> All `_id` fields are `primitive.ObjectID`. Timestamps are `time.Time` (BSON date). Collections marked ⚙ have JSON Schema validators in `internal/db/schema.go`.

| # | Collection | Key fields | Indexes | Validated? | Notes |
|---|---|---|---|---|---|
| 1 | `users` | email (unique, sparse), displayName, passwordHash, googleId, githubId, microsoftId, authMethods[], emailVerified, isActive, totpSecret/Enabled/VerifiedAt, recoveryCodes[], themePreference, onboardingCompletedAt, trialUsedAt, failedLoginAttempts, accountLockedUntil, lastLoginAt, timestamps | email unique; googleId/githubId/microsoftId sparse; displayName | ⚙ | User account. `authMethods` enum: password/google/github/microsoft/magic_link/passkey |
| 2 | `tenants` | name, slug (unique), isRoot, isActive, planId, billingWaived, subscriptionCredits, purchasedCredits, stripeCustomerId, billingStatus (none/active/past_due/canceled), stripeSubscriptionId, billingInterval, currentPeriodEnd, canceledAt, trialUsedAt, seatQuantity, timestamps | slug unique; isRoot; name; billingStatus+isActive; planId; trialUsedAt sparse | ⚙ | Tenant/workspace. One root tenant per deployment |
| 3 | `tenant_memberships` | userId, tenantId, role (owner/admin/user), joinedAt, updatedAt | userId+tenantId unique; tenantId+role; userId | ⚙ | Join table user↔tenant |
| 4 | `invitations` | tenantId, email, role, token, status (pending/accepted), invitedBy, expiresAt, createdAt | tenantId+email unique; token; expiresAt TTL | ⚙ | Tenant invitations |
| 5 | `plans` | name (unique), description, pricingModel (flat/per_seat), monthlyPriceCents, annualDiscountPct, perSeatPriceCents, includedSeats, minSeats, maxSeats, usageCreditsPerMonth, creditResetPolicy (reset/accrue), bonusCredits, userLimit, trialDays, entitlements (map), isSystem, isArchived, timestamps | name unique; isSystem | ⚙ | Subscription plans. System "Free" plan seeded at boot |
| 6 | `credit_bundles` | name (unique), credits, priceCents, isActive, sortOrder, timestamps | name unique; sortOrder | ⚙ | One-off credit packs |
| 7 | `financial_transactions` | tenantId, userId, type (subscription/credit_purchase/refund), amountCents, subtotalCents, taxAmountCents, currency, description, invoiceNumber (unique), stripeSessionId/InvoiceId/SubscriptionId, planId/planName, bundleId/bundleName, billingInterval, createdAt | tenantId+createdAt; userId+createdAt; invoiceNumber unique | ⚙ | Every payment event |
| 8 | `stripe_mappings` | entityType, entityId, stripePriceId, stripeProductId, createdAt | entityType+entityId unique | — | Maps internal plan/bundle to Stripe Product+Price |
| 9 | `api_keys` | name, keyHash (unique), keyPreview, authority (admin/user), createdBy, createdAt, lastUsedAt, isActive | keyHash unique; createdBy+createdAt | ⚙ | API keys (prefix `lsk_`) |
| 10 | `webhooks` | name, description, url, secret, secretPreview, events[] (enum), isActive, createdBy, timestamps | createdBy+createdAt; events+isActive | ⚙ | Outbound webhook configs |
| 11 | `webhook_deliveries` | webhookId, eventType, payload, responseCode, responseBody, success, durationMs, retryCount, maxRetries, createdAt | webhookId+createdAt; createdAt TTL (30d) | — | Per-delivery audit log |
| 12 | `webhook_events` | eventId (unique), createdAt | eventId unique; createdAt TTL (30d) | — | Dedup ledger for inbound Stripe webhook events |
| 13 | `config_vars` | name (unique), description, type (string/numeric/enum/template), value, options, isSystem, timestamps | name unique | ⚙ | Runtime config store |
| 14 | `announcements` | title, body, isPublished, publishedAt, timestamps | — | ⚙ | Admin-published dashboard announcements |
| 15 | `custom_pages` | slug (unique), title, htmlBody, metaDescription, ogImage, isPublished, sortOrder, timestamps | slug unique; isPublished+sortOrder | ⚙ | CMS-lite: arbitrary HTML pages at `/p/:slug` |
| 16 | `messages` | userId, subject, body, isSystem, read, createdAt | userId+createdAt; userId+read | ⚙ | In-app notifications per user |
| 17 | `usage_events` | tenantId, userId, type, quantity, metadata{}, createdAt | tenantId+createdAt; tenantId+type+createdAt; createdAt TTL (90d) | ⚙ | Usage metering (for credit consumption) |
| 18 | `telemetry_events` | eventName, category, userId?, tenantId?, sessionId?, properties{}, createdAt | eventName+createdAt; category+createdAt; userId+createdAt; sessionId+createdAt; createdAt TTL (365d); properties.page+createdAt sparse | — | Product analytics |
| 19 | `event_definitions` | name (unique), description, parentId?, timestamps | name unique; parentId sparse | ⚙ | User-defined event types for funnel/sankey |
| 20 | `sso_connections` | tenantId (unique), idpMetadataUrl, idpMetadataXml, idpEntityId, idpSsoUrl, idpCertificate, attributeMapping{}, isActive, timestamps | tenantId unique | ⚙ | SAML SSO per tenant |
| 21 | `users` (auth-related, separate collections) | | | | |
| 22 | `refresh_tokens` | userId, tokenHash, familyId, ipAddress, userAgent, deviceInfo, expiresAt, createdAt, lastActiveAt, isRevoked | userId; expiresAt TTL | — | JWT refresh-token store |
| 23 | `verification_tokens` | userId, token, type (email_verification/password_reset/magic_link/mfa_pending), expiresAt, createdAt, usedAt | userId+type; token; expiresAt TTL | — | Email/MFA token store |
| 24 | `oauth_states` | state, expiresAt, createdAt | expiresAt TTL | — | OAuth state CSRF protection |
| 25 | `revoked_tokens` | tokenHash (unique), expiresAt, createdAt | expiresAt TTL; tokenHash unique | — | Access-token revocation list |
| 26 | `auth_codes` | code (unique), userId, tokenData{accessToken,refreshToken,mfaToken,isMFA}, expiresAt, usedAt, createdAt | code unique; expiresAt TTL | — | Short-lived codes for OAuth/CLI token handoff |
| 27 | `webauthn_credentials` | userId, credentialId (unique), publicKey, attestationType, transport[], signCount, name, createdAt, lastUsedAt | userId; credentialId unique | — | Passkey credentials |
| 28 | `webauthn_sessions` | expiresAt, createdAt | expiresAt TTL | — | WebAuthn registration sessions |
| 29 | `system_config` | initialized, initializedAt, initializedBy, version | — | — | Single-row singleton; gates the BootstrapGuard |
| 30 | `system_logs` | severity (critical/high/medium/low/debug), category (auth/billing/admin/system/security/tenant), message, userId?, tenantId?, action, metadata{}, createdAt | createdAt TTL (180d); severity+createdAt; category+createdAt; message text; userId+createdAt; tenantId+createdAt | — | Centralized system log |
| 31 | `audit_log` | (same shape as system_logs) | createdAt TTL (90d); userId+createdAt; tenantId+createdAt | — | Audit trail (separate from system_logs) |
| 32 | `impersonation_logs` | (admin impersonation events) | — | — | Track admin→user impersonation |
| 33 | `branding_config` | (singleton) appName, tagline, logoMode, theme colors, fonts, landing/login/signup HTML, dashboardHtml, customCss, headHtml, ogImageUrl, navItems[], timestamps | — | — | White-label config |
| 34 | `branding_assets` | key (unique), filename, contentType, data (binary), size, createdAt | key unique | — | Logo/favicon/media blobs |
| 35 | `system_nodes` | machineId (unique), hostname, status (active/stale), startedAt, lastSeen, version, goVersion | machineId unique; lastSeen; startedAt | — | Multi-node registry |
| 36 | `system_metrics` | nodeId, timestamp, cpu{}, memory{}, disk{}, network{}, http{}, mongo{}, goRuntime{}, integrations{} | timestamp TTL (30d); nodeId+timestamp | — | Time-series health metrics |
| 37 | `daily_metrics` | date (unique), dau, wau, mau, revenue, arr, createdAt | date unique; createdAt TTL (400d) | — | Aggregated business KPIs |
| 38 | `leader_locks` | expiresAt, createdAt | expiresAt TTL | — | Distributed leader election |
| 39 | `counters` | _id (string, e.g. "invoice_number"), value | — | — | Atomic counters (invoice number generation) |

---

## 5. API Surface (All REST Endpoints)

> Source: `backend/cmd/server/main.go` lines 376–790. All paths prefixed with `/api`. Auth legend: 🌐 public, 🔒 JWT, 🔑 API key, 👥 tenant-required, 🛡 admin (root tenant), ⚙ Stripe-verified webhook.

### 5.1 Public / Bootstrap

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | 🌐 | DB ping health check (outside `/api`) |
| GET | `/api/version` | 🌐 | Build version |
| GET | `/api/bootstrap/status` | 🌐 | System initialized? |
| GET | `/api/docs`, `/api/docs/markdown`, `/api/docs/openapi.json` | 🌐 | API docs |
| GET | `/api/branding` | 🌐 | Public branding config |
| GET | `/api/branding/asset/{key}` | 🌐 | Logo/favicon binary |
| GET | `/api/branding/media/{id}` | 🌐 | Media binary |
| GET | `/api/branding/page/{slug}` | 🌐 | Public custom page HTML |
| GET | `/api/branding/pages` | 🌐 | List published custom pages |

### 5.2 Auth (`/api/auth/*`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | 🌐 (rate-limited) | Signup, creates user + personal tenant |
| POST | `/auth/login` | 🌐 (rate-limited) | Login (returns JWT or MFA-required) |
| POST | `/auth/refresh` | 🌐 (rate-limited) | Refresh access token |
| POST | `/auth/verify-email` | 🌐 (rate-limited) | Verify email with token |
| POST | `/auth/resend-verification` | 🌐 (rate-limited) | Resend verification email |
| POST | `/auth/forgot-password` | 🌐 (rate-limited) | Send password reset email |
| POST | `/auth/reset-password` | 🌐 (rate-limited) | Reset password with token |
| POST | `/auth/exchange-code` | 🌐 | Exchange short-lived auth code for tokens |
| GET | `/auth/providers` | 🌐 | List enabled auth providers |
| POST | `/auth/mfa/challenge` | 🌐 (rate-limited) | Submit TOTP code for MFA-pending token |
| POST | `/auth/magic-link` | 🌐 (rate-limited) | Request magic-link email |
| POST | `/auth/magic-link/verify` | 🌐 (rate-limited) | Verify magic-link token |
| GET | `/auth/google`, `/auth/google/callback` | 🌐 | Google OAuth |
| GET | `/auth/github`, `/auth/github/callback` | 🌐 | GitHub OAuth |
| GET | `/auth/microsoft`, `/auth/microsoft/callback` | 🌐 | Microsoft OAuth |
| GET | `/auth/me` | 🔒 | Current user + memberships |
| POST | `/auth/logout` | 🔒 | Revoke refresh token |
| POST | `/auth/change-password` | 🔒 | Change password |
| POST | `/auth/accept-invitation` | 🔒 | Accept tenant invitation |
| POST | `/auth/mfa/setup`, `/auth/mfa/verify-setup`, `/auth/mfa/disable`, `/auth/mfa/regenerate-codes` | 🔒 | TOTP management |
| GET | `/auth/sessions` | 🔒 | List active sessions |
| DELETE | `/auth/sessions/{id}` | 🔒 | Revoke session |
| DELETE | `/auth/sessions` | 🔒 | Revoke all sessions |
| PATCH | `/auth/preferences` | 🔒 | Update theme preference |
| POST | `/auth/complete-onboarding` | 🔒 | Mark onboarding complete |
| POST | `/auth/delete-account` | 🔒 | Self-delete account |
| GET | `/auth/export-data` | 🔒 | GDPR data export |

### 5.3 Tenant (`/api/tenant/*`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/tenant/members` | 🔒👥 | List tenant members |
| GET | `/tenant/activity` | 🔒👥 | Tenant audit log |
| PATCH | `/tenant/settings` | 🔒👥 (owner/admin) | Update tenant name |
| POST | `/tenant/members/invite` | 🔒👥 (owner/admin, rate-limited) | Invite member |
| DELETE | `/tenant/members/{userId}` | 🔒👥 (owner/admin) | Remove member |
| PATCH | `/tenant/members/{userId}/role` | 🔒👥 (owner) | Change role |
| POST | `/tenant/members/{userId}/transfer-ownership` | 🔒👥 (owner) | Transfer ownership |

### 5.4 Messages, Plans, Bundles, Announcements, Usage, Telemetry

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/messages` | 🔒 | User's messages |
| GET | `/messages/unread-count` | 🔒 | Unread count |
| PATCH | `/messages/{messageId}/read` | 🔒 | Mark read |
| GET | `/plans` | 🔒 | Public plan list |
| GET | `/credit-bundles` | 🔒 | Public bundle list |
| GET | `/announcements` | 🔒 | Published announcements |
| POST | `/usage/record` | 🔒👥 (rate-limited) | Record usage event (credit consumption) |
| GET | `/usage/summary` | 🔒👥 | Usage summary |
| POST | `/telemetry/track` | 🌐 (rate-limited) | Anonymous telemetry |
| POST | `/telemetry/events`, `/telemetry/events/batch` | 🔒 (rate-limited) | Authenticated telemetry |

### 5.5 Billing (`/api/billing/*`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/billing/webhook` | ⚙ | Stripe webhook (no auth — signature verified) |
| GET | `/billing/transactions` | 🔒👥 | Tenant transactions |
| GET | `/billing/transactions/{id}/invoice` | 🔒👥 | Invoice JSON |
| GET | `/billing/transactions/{id}/invoice/pdf` | 🔒👥 | Invoice PDF |
| GET | `/billing/config` | 🔒👥 | Stripe publishable key |
| POST | `/billing/checkout` | 🔒👥 (owner) | Create Stripe checkout session |
| POST | `/billing/portal` | 🔒👥 (owner) | Create billing portal session |
| POST | `/billing/cancel` | 🔒👥 (owner) | Cancel subscription |

### 5.6 Admin (`/api/admin/*` — root tenant only)

Read endpoints (~30): `/about`, `/dashboard`, `/logs`, `/logs/severity-counts`, `/logs/export`, `/config`, `/config/{name}`, `/tenants`, `/tenants/export`, `/tenants/{tenantId}`, `/plans`, `/plans/{planId}`, `/entitlement-keys`, `/credit-bundles`, `/health/nodes`, `/health/metrics`, `/health/current`, `/health/integrations`, `/promotions`, `/promotions/eligible-products`, `/announcements`, `/financial/transactions`, `/financial/metrics`, `/api-keys`, `/members`, `/users`, `/users/export`, `/users/{userId}`, `/webhooks`, `/webhooks/event-types`, `/webhooks/{webhookId}`, `/branding/media`, `/branding/pages`, `/pm/funnel`, `/pm/retention`, `/pm/engagement`, `/pm/kpis`, `/pm/events`, `/pm/events/types`, `/pm/event-definitions`, `/pm/event-definitions/sankey`.

Write endpoints (~30): `POST/PUT/DELETE /admin/config[/{name}]`, `PUT /admin/users/{userId}`, `PATCH /admin/users/{userId}/status`, `PATCH /admin/users/{userId}/role/{tenantId}`, `PUT /admin/tenants/{tenantId}`, `PATCH /admin/tenants/{tenantId}/status`, `POST/PUT/DELETE /admin/plans[/{planId}]`, `POST /admin/plans/{planId}/archive` + `/unarchive`, `PATCH /admin/tenants/{tenantId}/plan`, `POST/PUT/DELETE /admin/credit-bundles[/{bundleId}]`, `POST /admin/promotions` + `/update` + `/deactivate`, `POST/PUT/DELETE /admin/announcements[/{id}]`, `POST/DELETE /admin/api-keys[/{keyId}]`, `POST /admin/members/invite`, `DELETE /admin/members/invitations/{invitationId}`, `DELETE /admin/members/{userId}`, `PATCH /admin/members/{userId}/role`, `POST/PUT/DELETE /admin/webhooks[/{webhookId}]`, `POST /admin/webhooks/{webhookId}/test` + `/regenerate-secret`, `POST/PUT/DELETE /admin/pm/event-definitions[/{defId}]`, `POST /admin/health/test-email`, `GET /admin/users/{userId}/preflight-delete`, `POST /admin/users/{userId}/impersonate`, `DELETE /admin/users/{userId}`, `POST /admin/tenants/{tenantId}/cancel-subscription`, `PATCH /admin/tenants/{tenantId}/subscription`, `PUT /admin/branding`, `POST /admin/branding/asset`, `DELETE /admin/branding/asset/{key}`, `POST /admin/branding/media`, `DELETE /admin/branding/media/{id}`, `POST/PUT/DELETE /admin/branding/pages[/{id}]`.

---

## 6. Existing Extension Points

- **`events.Emitter` interface** (`internal/events/emitter.go`): In-process pub/sub. The webhook dispatcher implements it; the default is `NoopEmitter`. New LMS events (e.g. `course.published`, `lesson.completed`, `enrollment.created`) can be added as new `EventType` constants and routed through the same emitter — they would automatically flow into outbound webhooks if mapped in `dispatcher.mapEventType`.
- **Entitlements map on `Plan`**: Arbitrary string→{bool|numeric} values. Adding LMS entitlements (e.g. `lms.maxCourses`, `lms.videoUpload`, `lms.certificates`) requires no schema migration — just admin UI to populate them and `RequireEntitlement(db, "lms.certificates")` middleware on routes.
- **`RequireEntitlement` middleware** (`middleware/tenant.go`): Drop-in route guard for plan-gated features.
- **Webhook event catalog** (`models/webhook.go`): Add new `WebhookEventType` constants and update `mapEventType`. Subscribers receive them automatically.
- **Branding `navItems[]`**: Each item has `entitlementGate` — the sidebar can show/hide LMS nav entries based on the tenant's plan.
- **CLI subcommand pattern** (`cmd/lastsaas/`): Adding admin commands (e.g. `lastsaas courses import`) follows the existing `cmd_*.go` pattern + `main.go` switch.
- **`configstore`**: Any new runtime config (e.g. `lms.maxUploadBytes`, `lms.videoProvider`) can be added as a `ConfigVar` row with no code change.
- **MCP tool registry** (`cmd_mcp.go`): New read-only admin tools (e.g. `list_courses`, `get_enrollment_stats`) can be added to the MCP server.

**There is no plugin/module loader, no dynamic feature-flag framework, no hook system.** All extension is via Go source edits.

---

## 7. Deployment & Dev Experience

### 7.1 Local Dev

1. **One-time setup:** `./scripts/setup.sh` — interactive prompt for DB name, MongoDB URI, OAuth, Resend; writes `.env` and copies `config/{env}.example.yaml` to `{env}.yaml`.
2. **Run backend:** `cd backend && go run ./cmd/server` (port 4290).
3. **Run frontend:** `cd frontend && npm run dev` (Vite port 4280, proxies `/api` → `:4290`).
4. **Initialize system:** `./lastsaas setup` (CLI subcommand) — creates root tenant + first admin user.
5. **Tests:** `cd backend && make test` / `cd frontend && npm test`.

### 7.2 Production (Fly.io)

- `fly.toml`: app=`lastsaas`, region=`iad`, single shared CPU + 1 GB RAM machine, `internal_port=8080`, force_https, auto-stop/start machines, 15s health check on `/health`.
- `Dockerfile` (3-stage): `golang:1.25-alpine` → builds `cmd/server`; `node:22-alpine` → builds frontend dist; `alpine:3.21` → runtime with binary + `config/prod.yaml` + frontend dist.
- `LASTSAAS_ENV=prod` selects `config/prod.yaml`.
- **No docker-compose, no k8s manifests, no CI/CD config in repo** (CI badge points to GitHub Actions `ci.yml` but the workflow file isn't in the repo root — likely `.github/workflows/ci.yml` is excluded from this snapshot).
- **Dependent-project deployment convention** (from `CLAUDE.md`): forks/submodules of lastsaas are expected to use `Dockerfile.saas` + `fly.saas.toml` that run **two** processes (the product backend + the lastsaas backend) behind Caddy via supervisord. **Neither file exists in this repo** — they would need to be created when forking into an LMS product.

---

## 8. LMS-Adjacent Concepts Already Present

**Direct grep for `course|lesson|enrollment|instructor|curriculum|tutorial|student|video|lms` across the entire repo returned ZERO legitimate matches** (one false positive in `telemetry/service.go` where `intervalMs` matched the case-insensitive `lms` substring). 

**However, several existing primitives map naturally to LMS concepts:**

| LMS Concept | Existing lastsaas Primitive | Reuse Strategy |
|---|---|---|
| **Course catalog** | `custom_pages` + `announcements` + `branding.navItems` | New `courses` collection, modeled after `plans.go` (CRUD handler pattern) |
| **Enrollment** | `tenant_memberships` (user↔tenant join) | New `enrollments` collection (user↔course), modeled after `tenant_memberships` |
| **Subscription / one-time purchase** | Stripe `checkout` (subscription + payment modes), `stripe_mappings`, `financial_transactions` | Course price = a `Plan` or `CreditBundle` analog; reuse `billingHandler.Checkout` |
| **Instructor / student roles** | `MemberRole` (owner/admin/user) + `RequireRole` middleware | Add LMS-specific roles (instructor/student/ta) either as a new collection or as entitlements |
| **Video / media storage** | `branding_assets` (binary in MongoDB) | **GAP** — needs S3/Cloudflare R2 abstraction for course videos |
| **Progress tracking** | `usage_events` (tenantId, userId, type, quantity, metadata) | LMS progress = usage events with `type: "lesson_complete"` |
| **Certificates** | `gofpdf` invoice PDF generation | Reuse PDF pipeline for certificate generation |
| **Quizzes / assignments** | (none) | Net-new; no existing assessment primitive |
| **Course gating / prerequisites** | `RequireEntitlement` middleware + `event_definitions.parentId` (hierarchy) | Use entitlements for plan-gating; new collection for course-level prerequisites |
| **Notifications** | `messages` + `announcements` + email templates + webhook events | All reusable for course-related notifications |
| **Multi-tenant LMS** | `tenants` + `tenant_memberships` + `X-Tenant-ID` header | Each tenant = one school/organization; courses are tenant-scoped |

**Critical gaps for an LMS:**
1. **No file/object storage abstraction** — must add S3/R2 layer for video uploads.
2. **No rich content authoring** — `custom_pages.htmlBody` is the only HTML-content model; no structured content blocks, no SCORM/xAPI.
3. **No search infrastructure** — all queries are MongoDB find() with indexes; a course catalog search would benefit from Atlas Search or external indexing.
4. **No scheduled jobs** — drip content (release lesson on date X) would need a scheduler; only `leader_locks` + goroutines exist today.
5. **No streaming/video proxy** — would need signed URL generation for video delivery.

---

## 9. Summary for the LMS Planner

**Tech stack:** Go 1.25 + gorilla/mux + MongoDB; React 19 + Vite 7 + TanStack Query + react-router-dom v7 + Tailwind v4 + custom UI primitives; Stripe v82; Resend for email; Fly.io for deploy; single Docker image.

**Database:** MongoDB (no SQL migrations). 30+ collections already exist (see §4). Adding LMS collections = new files in `internal/models/` + new entries in `internal/db/schema.go` `AllSchemas()` + new indexes in `mongodb.go` `ensureIndexes()`.

**Key extension points:** `events.Emitter` (pub/sub), `RequireEntitlement` (plan gating), `WebhookEventType` catalog (extensible), `configstore` (runtime config), branding `navItems` (UI gating), CLI subcommand pattern, MCP tool registry.

**Auth/RBAC:** JWT (HS256, 60min access / 30d refresh) + refresh-token rotation + revocation. Roles: owner/admin/user per tenant. Root tenant = platform admin. API keys (`lsk_` prefix) for admin/user authority. `RequireAuth` + `RequireTenant` + `RequireRole` + `RequireRootTenant` + `RequireActiveBilling` + `RequireEntitlement` middleware chain.

**LMS-adjacent concepts already present:** multi-tenancy, Stripe billing (subscription + one-time), credit metering, PDF generation, in-app messages, announcements, webhooks, file blobs (small, in MongoDB), entitlements, white-label branding. **Zero existing course/lesson/enrollment code** — the LMS module is a clean greenfield built on top of this SaaS foundation.

**Files to study first when planning the LMS module:**
- `backend/internal/api/handlers/plans.go` — CRUD handler pattern (list/create/update/delete with admin vs public views)
- `backend/internal/api/handlers/tenant.go` — tenant-scoped resource + role checks
- `backend/internal/middleware/tenant.go` — `RequireEntitlement` for plan-gating LMS features
- `backend/internal/stripe/stripe.go` — `CreateCheckoutSession` for course purchases
- `backend/internal/events/emitter.go` + `backend/internal/webhooks/dispatcher.go` — event/webhook pattern for `course.published`, `enrollment.created`, etc.
- `frontend/src/pages/app/PlanPage.tsx` + `frontend/src/api/client.ts` `plansApi` — frontend CRUD pattern
- `frontend/src/App.tsx` — route registration pattern (one line per page; lazy-load heavy pages)
- `backend/cmd/server/main.go` lines 376–790 — where all new routes must be wired
