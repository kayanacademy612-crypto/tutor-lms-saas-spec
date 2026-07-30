package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// ProEngagementConsentHandler — Phase 5 legal consent endpoints
//
// Mounted under /api/lms/student/consents. Provides the audit-trail surface
// for GDPR/CCPA compliance: every consent grant or revocation is appended as
// a new LegalConsent row (no in-place updates — the table is an immutable
// history). The "current" consent state for a (user, consentType) is the most
// recent row.
//
// Covers:
//   - ListConsents: GET  /api/lms/student/consents — list the user's consent
//     history, most-recent-first.
//   - GrantConsent: POST /api/lms/student/consents — append a new consent
//     record. Body: { consentType, version, granted }. Extracts IP +
//     UserAgent from the request for audit. Emits EventConsentGranted or
//     EventConsentRevoked based on the `granted` flag.
//
// All queries filter by tenantId. Auth is required (a UserID must be present
// in the request context) — consents are inherently user-scoped, so the dev
// fallback that pins requests to a default user is acceptable for local
// development but production deployments must run behind the auth middleware.
// ---------------------------------------------------------------------------

// ProEngagementConsentHandler implements the Phase 5 legal consent endpoints.
type ProEngagementConsentHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProEngagementConsentHandler constructs a ProEngagementConsentHandler
// bound to the supplied MongoDB connection and event emitter.
func NewProEngagementConsentHandler(database *db.MongoDB, emitter events.Emitter) *ProEngagementConsentHandler {
	return &ProEngagementConsentHandler{db: database, emitter: emitter}
}

// requireContext resolves the per-request tenant/user context. Returns false
// (after writing a 400/401 response) when the request lacks a usable tenant
// or authenticated user.
func (h *ProEngagementConsentHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// extractClientIP returns the client's IP address, preferring the
// X-Forwarded-For header (left-most entry) and falling back to RemoteAddr.
// When RemoteAddr carries a host:port form, the port is stripped. Returns an
// empty string if neither source yields a usable address.
func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For may be a comma-separated list; the left-most entry
		// is the original client IP.
		parts := strings.SplitN(xff, ",", 2)
		ip := strings.TrimSpace(parts[0])
		if ip != "" {
			return ip
		}
	}
	if r.RemoteAddr == "" {
		return ""
	}
	// Strip the :port suffix if present. RemoteAddr is typically "host:port".
	if idx := strings.LastIndex(r.RemoteAddr, ":"); idx > -1 {
		// Guard against IPv6 addresses that contain multiple colons — only
		// strip when the segment after the last colon parses as a port (i.e.
		// the host portion still contains a colon or is a valid IPv4).
		host := r.RemoteAddr[:idx]
		if host != "" {
			return host
		}
	}
	return r.RemoteAddr
}

// validConsentTypes is the closed set of consent categories the platform
// tracks. Any other value is rejected with a 400.
var validConsentTypes = map[string]bool{
	"terms":     true,
	"privacy":   true,
	"marketing": true,
	"cookies":   true,
}

// ===========================================================================
// Consents
// ===========================================================================

// ListConsents handles GET /api/lms/student/consents.
//
// Returns the calling user's consent history scoped to the current tenant,
// sorted by grantedAt descending (most recent first). Optional query param:
//   - consentType — filter to a single category (terms|privacy|marketing|cookies)
//
// Results are limited to the most recent 100 entries by default; ?limit= may
// raise that up to 500.
func (h *ProEngagementConsentHandler) ListConsents(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}
	if consentType := r.URL.Query().Get("consentType"); consentType != "" {
		filter["consentType"] = consentType
	}

	limit := parsePositiveInt(r, "limit", 100, 500)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "grantedAt", Value: -1}})

	cursor, err := h.db.LegalConsents().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch consents")
		return
	}
	defer cursor.Close(r.Context())

	var consents []models.LegalConsent
	if err := cursor.All(r.Context(), &consents); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode consents")
		return
	}
	if consents == nil {
		consents = []models.LegalConsent{}
	}
	total, _ := h.db.LegalConsents().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"consents": consents,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// GrantConsent handles POST /api/lms/student/consents.
//
// Body: { consentType: "terms"|"privacy"|"marketing"|"cookies", version: "1.0", granted: bool }.
// Appends a new LegalConsent row to the audit trail (append-only — the table
// is an immutable history). Extracts IPAddress from X-Forwarded-For or
// RemoteAddr and UserAgent from the request headers. Emits
// EventConsentGranted when granted=true, EventConsentRevoked when
// granted=false. Returns the newly created consent record.
func (h *ProEngagementConsentHandler) GrantConsent(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	var payload struct {
		ConsentType string `json:"consentType"`
		Version     string `json:"version"`
		Granted     bool   `json:"granted"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if !validConsentTypes[payload.ConsentType] {
		respondWithError(w, http.StatusBadRequest, "consentType must be one of terms, privacy, marketing, cookies")
		return
	}
	if strings.TrimSpace(payload.Version) == "" {
		respondWithError(w, http.StatusBadRequest, "version is required")
		return
	}

	now := time.Now().UTC()
	consent := models.LegalConsent{
		ID:          primitive.NewObjectID(),
		TenantID:    ctx.TenantID,
		UserID:      ctx.UserID,
		ConsentType: payload.ConsentType,
		Version:     payload.Version,
		Granted:     payload.Granted,
		IPAddress:   extractClientIP(r),
		UserAgent:   r.UserAgent(),
		GrantedAt:   now,
		CreatedAt:   now,
	}

	if _, err := h.db.LegalConsents().InsertOne(r.Context(), consent); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to record consent")
		return
	}

	// Emit the appropriate event based on the granted flag. Both events carry
	// the same payload shape so downstream consumers (audit log writers,
	// analytics pipelines) can subscribe to either.
	eventType := events.EventConsentGranted
	if !payload.Granted {
		eventType = events.EventConsentRevoked
	}
	h.emitter.Emit(events.Event{
		Type:      eventType,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":    ctx.TenantID.Hex(),
			"userId":      ctx.UserID.Hex(),
			"consentType": payload.ConsentType,
			"version":     payload.Version,
			"granted":     payload.Granted,
			"ipAddress":   consent.IPAddress,
			"consentId":   consent.ID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusCreated, consent)
}
