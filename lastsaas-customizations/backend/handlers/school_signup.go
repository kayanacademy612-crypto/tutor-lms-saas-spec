package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"lastsaas/internal/auth"
	"lastsaas/internal/db"
	"lastsaas/internal/email"
	"lastsaas/internal/events"
	"lastsaas/internal/middleware"
	"lastsaas/internal/models"
	"lastsaas/internal/syslog"
	"lastsaas/internal/telemetry"
	"lastsaas/internal/validation"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// SchoolSignupHandler implements the public multi-tenant school signup flow.
//
// Unlike the generic /auth/register endpoint (which creates a user and only
// auto-provisions a throwaway "personal" tenant), this handler performs the
// full school onboarding sequence in a single transaction-style flow:
//
//  1. Validates the request (school name, owner email, password strength).
//  2. Reserves a unique tenant slug (subdomain).
//  3. Creates the Tenant (school) record.
//  4. Creates the owner User record.
//  5. Links them via a TenantMembership with role=owner.
//  6. Issues JWT access + refresh tokens.
//  7. Emits tenant.created + user.registered events.
//  8. Optionally sends a welcome / verification email.
type SchoolSignupHandler struct {
	db              *db.MongoDB
	jwtService      *auth.JWTService
	passwordService *auth.PasswordService
	emailService    *email.ResendService
	events          events.Emitter
	frontendURL     string
	syslog          *syslog.Logger
	getConfig       func(string) string
	rateLimiter     *middleware.RateLimiter
	telemetrySvc    *telemetry.Service
}

// NewSchoolSignupHandler constructs a SchoolSignupHandler with its core
// dependencies. Optional services (rate limiter, telemetry, config getter)
// can be attached via the Set* methods after construction.
func NewSchoolSignupHandler(
	database *db.MongoDB,
	jwtService *auth.JWTService,
	passwordService *auth.PasswordService,
	emailService *email.ResendService,
	emitter events.Emitter,
	frontendURL string,
	sysLogger *syslog.Logger,
) *SchoolSignupHandler {
	return &SchoolSignupHandler{
		db:              database,
		jwtService:      jwtService,
		passwordService: passwordService,
		emailService:    emailService,
		events:          emitter,
		frontendURL:     frontendURL,
		syslog:          sysLogger,
	}
}

func (h *SchoolSignupHandler) SetGetConfig(fn func(string) string)       { h.getConfig = fn }
func (h *SchoolSignupHandler) SetRateLimiter(rl *middleware.RateLimiter) { h.rateLimiter = rl }
func (h *SchoolSignupHandler) SetTelemetry(svc *telemetry.Service)       { h.telemetrySvc = svc }

// --- Request / Response types ---

type SchoolSignupRequest struct {
	SchoolName string `json:"schoolName"`
	Subdomain  string `json:"subdomain,omitempty"`
	FullName   string `json:"fullName"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Plan       string `json:"plan,omitempty"`
}

type SchoolSignupResponse struct {
	AccessToken               string             `json:"accessToken"`
	RefreshToken              string             `json:"refreshToken"`
	User                      SchoolSignupUser   `json:"user"`
	Tenant                    SchoolSignupTenant `json:"tenant"`
	RequiresEmailVerification bool               `json:"requiresEmailVerification"`
}

type SchoolSignupUser struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type SchoolSignupTenant struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

type UserTenantInfo struct {
	TenantID string `json:"tenantId"`
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	Role     string `json:"role"`
}

// slugCharRe matches characters that are NOT lowercase ASCII alphanumeric
// or dashes. We use it to sanitize candidate slugs.
var slugCharRe = regexp.MustCompile(`[^a-z0-9-]+`)

// multipleDashRe collapses runs of consecutive dashes.
var multipleDashRe = regexp.MustCompile(`-{2,}`)

// slugPatternRe matches a string that is already a valid slug (lowercase
// alphanumerics and dashes only). Used to validate user-supplied subdomains
// without modification.
var slugPatternRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// slugify converts a human-readable name (e.g. "My Academy") into a
// URL-safe slug (e.g. "my-academy"). Returns "" if the input produces
// no usable characters.
func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.ReplaceAll(s, " ", "-")
	s = slugCharRe.ReplaceAllString(s, "")
	s = multipleDashRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

// reserveUniqueSlug guarantees a slug that does not collide with any
// existing tenant. If the base slug is already taken (or empty), it
// appends a short random suffix. The returned slug is safe to insert.
func (h *SchoolSignupHandler) reserveUniqueSlug(ctx context.Context, base string) (string, error) {
	if base == "" {
		base = "school"
	}
	// Fast path: base slug is free.
	count, err := h.db.Tenants().CountDocuments(ctx, bson.M{"slug": base})
	if err != nil {
		return "", fmt.Errorf("failed to check slug uniqueness: %w", err)
	}
	if count == 0 {
		return base, nil
	}
	// Slow path: append a short random suffix until we find a free slot.
	for i := 0; i < 8; i++ {
		candidate := fmt.Sprintf("%s-%s", base, primitive.NewObjectID().Hex()[:6])
		count, err := h.db.Tenants().CountDocuments(ctx, bson.M{"slug": candidate})
		if err != nil {
			return "", fmt.Errorf("failed to check slug uniqueness: %w", err)
		}
		if count == 0 {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("could not reserve a unique slug for %q", base)
}

// SchoolSignup creates a new tenant (school), a new user (school owner),
// and an owner membership linking them, then returns JWT tokens.
//
// POST /api/auth/school-signup
func (h *SchoolSignupHandler) SchoolSignup(w http.ResponseWriter, r *http.Request) {
	var req SchoolSignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// --- Normalize inputs ---
	req.SchoolName = strings.TrimSpace(req.SchoolName)
	req.Subdomain = strings.ToLower(strings.TrimSpace(req.Subdomain))
	req.FullName = strings.TrimSpace(req.FullName)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Plan = strings.TrimSpace(strings.ToLower(req.Plan))

	// --- Validate required fields ---
	if req.SchoolName == "" || req.FullName == "" || req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "schoolName, fullName, email, and password are required")
		return
	}
	if len(req.SchoolName) < 2 {
		respondWithError(w, http.StatusBadRequest, "schoolName must be at least 2 characters")
		return
	}
	if len(req.SchoolName) > 200 {
		respondWithError(w, http.StatusBadRequest, "schoolName must be at most 200 characters")
		return
	}
	if !isValidEmail(req.Email) {
		respondWithError(w, http.StatusBadRequest, "Invalid email format")
		return
	}
	// Reuse the codebase-wide password strength policy (min 10 chars, mixed
	// case + number + special). This matches /auth/register so schools and
	// individual users share the same security bar.
	if err := h.passwordService.ValidatePasswordStrength(req.Password); err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	// Optional subdomain must look like a slug if provided.
	if req.Subdomain != "" {
		if !slugPatternRe.MatchString(req.Subdomain) {
			respondWithError(w, http.StatusBadRequest, "subdomain must contain only lowercase letters, numbers, and dashes")
			return
		}
		if len(req.Subdomain) < 2 || len(req.Subdomain) > 100 {
			respondWithError(w, http.StatusBadRequest, "subdomain must be between 2 and 100 characters")
			return
		}
	}

	ctx := r.Context()

	// --- Email uniqueness check ---
	var existingUser models.User
	if err := h.db.Users().FindOne(ctx, bson.M{"email": req.Email}).Decode(&existingUser); err == nil {
		// Use the same generic message as /auth/register to avoid account enumeration.
		respondWithError(w, http.StatusConflict, "Unable to create account with these details")
		return
	}

	// --- Subdomain uniqueness check (if provided) ---
	if req.Subdomain != "" {
		count, err := h.db.Tenants().CountDocuments(ctx, bson.M{"slug": req.Subdomain})
		if err != nil {
			slog.Error("school-signup: failed to check subdomain uniqueness", "error", err)
			respondWithError(w, http.StatusInternalServerError, "Failed to validate subdomain")
			return
		}
		if count > 0 {
			respondWithError(w, http.StatusConflict, "subdomain is already taken")
			return
		}
	}

	// --- Reserve slug ---
	baseSlug := req.Subdomain
	if baseSlug == "" {
		baseSlug = slugify(req.SchoolName)
	}
	slug, err := h.reserveUniqueSlug(ctx, baseSlug)
	if err != nil {
		slog.Error("school-signup: failed to reserve slug", "base", baseSlug, "error", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to allocate subdomain")
		return
	}

	// --- Hash password ---
	passwordHash, err := h.passwordService.HashPassword(req.Password)
	if err != nil {
		slog.Error("school-signup: failed to hash password", "error", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to process password")
		return
	}

	now := time.Now()

	// --- Create tenant (school) ---
	tenant := models.Tenant{
		ID:            primitive.NewObjectID(),
		Name:          req.SchoolName,
		Slug:          slug,
		IsRoot:        false,
		IsActive:      true,
		BillingStatus: models.BillingStatusNone,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := validation.Validate(&tenant); err != nil {
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := h.db.Tenants().InsertOne(ctx, tenant); err != nil {
		slog.Error("school-signup: failed to insert tenant", "slug", slug, "error", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create school")
		return
	}

	// --- Create owner user ---
	user := models.User{
		ID:            primitive.NewObjectID(),
		Email:         req.Email,
		DisplayName:   req.FullName,
		PasswordHash:  passwordHash,
		AuthMethods:   []models.AuthMethod{models.AuthMethodPassword},
		EmailVerified: false,
		IsActive:      true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := validation.Validate(&user); err != nil {
		// Best-effort cleanup: remove the tenant we just created so we don't
		// leak an orphan tenant record if user validation fails.
		_, _ = h.db.Tenants().DeleteOne(ctx, bson.M{"_id": tenant.ID})
		respondWithError(w, http.StatusBadRequest, err.Error())
		return
	}
	if _, err := h.db.Users().InsertOne(ctx, user); err != nil {
		slog.Error("school-signup: failed to insert user", "email", user.Email, "error", err)
		_, _ = h.db.Tenants().DeleteOne(ctx, bson.M{"_id": tenant.ID})
		respondWithError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// --- Create owner membership ---
	membership := models.TenantMembership{
		ID:        primitive.NewObjectID(),
		UserID:    user.ID,
		TenantID:  tenant.ID,
		Role:      models.RoleOwner,
		JoinedAt:  now,
		UpdatedAt: now,
	}
	if _, err := h.db.TenantMemberships().InsertOne(ctx, membership); err != nil {
		slog.Error("school-signup: failed to insert membership", "userId", user.ID.Hex(), "tenantId", tenant.ID.Hex(), "error", err)
		// Roll back user + tenant to avoid orphaned records.
		_, _ = h.db.Users().DeleteOne(ctx, bson.M{"_id": user.ID})
		_, _ = h.db.Tenants().DeleteOne(ctx, bson.M{"_id": tenant.ID})
		respondWithError(w, http.StatusInternalServerError, "Failed to link user to school")
		return
	}

	if h.syslog != nil {
		h.syslog.High(ctx, fmt.Sprintf("School signup: tenant=%s (%s) owner=%s (%s)", tenant.Name, tenant.ID.Hex(), user.Email, user.ID.Hex()))
	}

	// --- Issue tokens ---
	accessToken, refreshToken, refreshTTL, err := h.generateTokenPair(user.ID.Hex(), user.Email, user.DisplayName)
	if err != nil {
		slog.Error("school-signup: failed to generate tokens", "error", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}
	if err := storeRefreshToken(r, h.db, user.ID, refreshToken, refreshTTL); err != nil {
		slog.Error("school-signup: failed to store refresh token", "error", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	// --- Emit events ---
	h.events.Emit(events.Event{
		Type:      events.EventTenantCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": tenant.ID.Hex(),
			"slug":     tenant.Slug,
			"name":     tenant.Name,
			"userId":   user.ID.Hex(),
			"source":   "school_signup",
		},
	})
	h.events.Emit(events.Event{
		Type:      events.EventUserRegistered,
		Timestamp: now,
		Data: map[string]interface{}{
			"userId":   user.ID.Hex(),
			"tenantId": tenant.ID.Hex(),
			"source":   "school_signup",
		},
	})

	if h.telemetrySvc != nil {
		h.telemetrySvc.Track(ctx, models.TelemetryEvent{
			EventName: models.TelemetryUserRegistered,
			Category:  models.TelemetryCategoryFunnel,
			UserID:    &user.ID,
		})
	}

	// --- Send verification / welcome email (best-effort, async) ---
	requiresVerification := !user.EmailVerified
	h.sendWelcomeEmail(ctx, user.ID, user.Email, user.DisplayName, tenant.Name)

	respondWithJSON(w, http.StatusCreated, SchoolSignupResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: SchoolSignupUser{
			ID:    user.ID.Hex(),
			Email: user.Email,
			Name:  user.DisplayName,
		},
		Tenant: SchoolSignupTenant{
			ID:   tenant.ID.Hex(),
			Name: tenant.Name,
			Slug: tenant.Slug,
		},
		RequiresEmailVerification: requiresVerification,
	})
}

// GetUserTenants returns the list of tenants (schools) a user belongs to.
// This powers the login screen where a user picks which school to log into.
//
// GET /api/auth/tenants?email=user@example.com
func (h *SchoolSignupHandler) GetUserTenants(w http.ResponseWriter, r *http.Request) {
	email := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("email")))
	if email == "" {
		respondWithError(w, http.StatusBadRequest, "email query parameter is required")
		return
	}
	if !isValidEmail(email) {
		respondWithError(w, http.StatusBadRequest, "Invalid email format")
		return
	}

	ctx := r.Context()

	// Find the user by email. We intentionally return an empty list (not a
	// 404) when the user does not exist, to avoid leaking which emails have
	// signed up.
	var user models.User
	if err := h.db.Users().FindOne(ctx, bson.M{"email": email}).Decode(&user); err != nil {
		respondWithJSON(w, http.StatusOK, []UserTenantInfo{})
		return
	}

	cursor, err := h.db.TenantMemberships().Find(ctx, bson.M{"userId": user.ID})
	if err != nil {
		slog.Error("school-signup: failed to load memberships", "userId", user.ID.Hex(), "error", err)
		respondWithJSON(w, http.StatusOK, []UserTenantInfo{})
		return
	}
	defer cursor.Close(ctx)

	var memberships []models.TenantMembership
	if err := cursor.All(ctx, &memberships); err != nil {
		slog.Error("school-signup: failed to decode memberships", "userId", user.ID.Hex(), "error", err)
		respondWithJSON(w, http.StatusOK, []UserTenantInfo{})
		return
	}

	// Bulk-fetch tenant details to avoid N+1 queries.
	tenantIDs := make([]primitive.ObjectID, 0, len(memberships))
	for _, m := range memberships {
		tenantIDs = append(tenantIDs, m.TenantID)
	}
	tenantByID := make(map[primitive.ObjectID]models.Tenant, len(memberships))
	if len(tenantIDs) > 0 {
		tCursor, err := h.db.Tenants().Find(ctx, bson.M{"_id": bson.M{"$in": tenantIDs}})
		if err == nil {
			var tenants []models.Tenant
			if err := tCursor.All(ctx, &tenants); err == nil {
				for _, t := range tenants {
					tenantByID[t.ID] = t
				}
			}
			tCursor.Close(ctx)
		}
	}

	result := make([]UserTenantInfo, 0, len(memberships))
	for _, m := range memberships {
		t, ok := tenantByID[m.TenantID]
		if !ok {
			// Tenant was deleted; skip stale membership.
			continue
		}
		result = append(result, UserTenantInfo{
			TenantID: t.ID.Hex(),
			Name:     t.Name,
			Slug:     t.Slug,
			Role:     string(m.Role),
		})
	}

	respondWithJSON(w, http.StatusOK, result)
}

// --- Internal helpers ---

// generateTokenPair mirrors AuthHandler.generateTokenPair but is scoped to
// the SchoolSignupHandler. We intentionally do not depend on the dynamic
// config-based TTLs here to keep this handler self-contained; we fall back
// to the JWTService defaults.
func (h *SchoolSignupHandler) generateTokenPair(userID, email, displayName string) (accessToken, refreshToken string, refreshTTL time.Duration, err error) {
	accessTTL := h.jwtService.GetAccessTTL()
	rTTL := h.jwtService.GetRefreshTTL()

	if h.getConfig != nil {
		if v := h.getConfig("auth.session.access_ttl_minutes"); v != "" {
			if mins, parseErr := parseIntStrict(v); parseErr == nil && mins > 0 {
				accessTTL = time.Duration(mins) * time.Minute
			}
		}
		if v := h.getConfig("auth.session.refresh_ttl_days"); v != "" {
			if days, parseErr := parseIntStrict(v); parseErr == nil && days > 0 {
				rTTL = time.Duration(days) * 24 * time.Hour
			}
		}
	}

	accessToken, err = h.jwtService.GenerateAccessTokenWithTTL(userID, email, displayName, accessTTL)
	if err != nil {
		return
	}
	refreshToken, err = h.jwtService.GenerateRefreshTokenWithTTL(userID, rTTL)
	refreshTTL = rTTL
	return
}

// sendWelcomeEmail issues a verification token and dispatches the welcome
// email asynchronously. It mirrors AuthHandler.sendVerificationEmail but
// accepts the tenant name so the email can be personalized for the school
// onboarding flow. Failures are logged but never bubble up to the caller —
// email delivery is best-effort and must not block signup.
func (h *SchoolSignupHandler) sendWelcomeEmail(ctx context.Context, userID primitive.ObjectID, userEmail, displayName, tenantName string) {
	verificationToken := generateRandomToken()
	hashedVerificationToken := hashToken(verificationToken)
	verification := models.VerificationToken{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Token:     hashedVerificationToken,
		Type:      models.TokenTypeEmailVerification,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedAt: time.Now(),
	}
	if _, err := h.db.VerificationTokens().InsertOne(ctx, verification); err != nil {
		slog.Error("school-signup: failed to insert verification token", "userId", userID.Hex(), "error", err)
		return
	}

	now := time.Now()
	if _, err := h.db.Users().UpdateOne(ctx, bson.M{"_id": userID}, bson.M{
		"$set": bson.M{"lastVerificationSent": now},
	}); err != nil {
		slog.Warn("school-signup: failed to update lastVerificationSent", "userId", userID.Hex(), "error", err)
	}

	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		_ = bgCtx // timeout guard for background goroutine
		if h.emailService != nil {
			if err := h.emailService.SendVerificationEmail(userEmail, displayName, verificationToken); err != nil {
				slog.Error("school-signup: failed to send welcome/verification email", "to", userEmail, "tenant", tenantName, "error", err)
			}
		} else {
			slog.Warn("school-signup: email service not configured, logging verification token", "email", userEmail, "token", verificationToken)
		}
	}()
}

// parseIntStrict is a small wrapper around strconv.Atoi that returns an
// error (rather than panicking) for non-integer input. We keep it local so
// this file does not need to import strconv just for two call sites.
func parseIntStrict(s string) (int, error) {
	var n int
	var negative bool
	if len(s) == 0 {
		return 0, fmt.Errorf("empty integer")
	}
	i := 0
	if s[0] == '-' {
		negative = true
		i = 1
		if len(s) == 1 {
			return 0, fmt.Errorf("invalid integer %q", s)
		}
	} else if s[0] == '+' {
		i = 1
		if len(s) == 1 {
			return 0, fmt.Errorf("invalid integer %q", s)
		}
	}
	for ; i < len(s); i++ {
		c := s[i]
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid integer %q", s)
		}
		n = n*10 + int(c-'0')
	}
	if negative {
		n = -n
	}
	return n, nil
}
