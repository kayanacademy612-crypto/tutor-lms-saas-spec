package handlers

import (
	"encoding/json"
	"net/http"
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
// ProEngagementPreferencesHandler — Phase 5 notification preferences,
// push subscriptions, mark-all-read, and accessibility preferences.
//
// Mounted under:
//   - GET/PUT    /api/lms/student/notification-preferences
//   - POST       /api/lms/notifications/push/subscribe
//   - DELETE     /api/lms/notifications/push/{id}
//   - POST       /api/lms/notifications/mark-all-read
//   - GET/PUT    /api/lms/student/preferences            (accessibility)
//
// All queries are tenant-scoped (filter by tenantId) and additionally scoped
// to the authenticated user (filter by userId) so a student can only ever
// read or mutate their own preferences / subscriptions.
//
// Reused from lms_events.go:
//   - EventNotificationCreated ("notification.created")
//   - EventNotificationRead    ("notification.read")
// The new constants EventNotificationSent / EventNotificationMarkedRead /
// EventPushSubscribed / EventPushUnsubscribed come from
// proengagement_events.go.
//
// All endpoints reuse getLMSContext (defined in lms.go) for tenant/user
// resolution, including the dev fallback that pins requests to the default
// tenant + user.
// ---------------------------------------------------------------------------

// ProEngagementPreferencesHandler implements the Phase 5 user-scoped
// notification-preference, push-subscription, mark-all-read, and
// accessibility-preference endpoints.
type ProEngagementPreferencesHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProEngagementPreferencesHandler constructs a
// ProEngagementPreferencesHandler bound to the supplied MongoDB connection and
// event emitter.
func NewProEngagementPreferencesHandler(database *db.MongoDB, emitter events.Emitter) *ProEngagementPreferencesHandler {
	return &ProEngagementPreferencesHandler{db: database, emitter: emitter}
}

// requireContext resolves the per-request tenant/user context. Returns false
// (after writing a 400/401 response) when the request lacks a usable tenant
// or authenticated user.
func (h *ProEngagementPreferencesHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// defaultNotificationPreferenceChannels is the implicit fallback when a user
// has no explicit preference row for an event type: every channel is enabled.
var defaultNotificationPreferenceChannels = map[string]bool{
	"onsiteEnabled": true,
	"emailEnabled":  true,
	"pushEnabled":   true,
}

// ===========================================================================
// Notification Preferences
// ===========================================================================

// GetNotificationPreferences handles GET /api/lms/student/notification-preferences.
//
// Returns the caller's per-event-type notification preferences. If the user
// has no preference rows on record, the response carries an empty preferences
// array plus a `defaults` object describing the implicit fallback (all
// channels enabled) so the client can render the toggles correctly.
func (h *ProEngagementPreferencesHandler) GetNotificationPreferences(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}
	cursor, err := h.db.NotificationPreferences().Find(r.Context(), filter, options.Find().
		SetSort(bson.D{{Key: "eventType", Value: 1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch notification preferences")
		return
	}
	defer cursor.Close(r.Context())

	var prefs []models.NotificationPreference
	if err := cursor.All(r.Context(), &prefs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode notification preferences")
		return
	}
	if prefs == nil {
		prefs = []models.NotificationPreference{}
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"preferences": prefs,
		"defaults":    defaultNotificationPreferenceChannels,
	})
}

// updateNotificationPreferencePayload is the request body for
// UpdateNotificationPreference. Pointer-typed channel toggles let us
// distinguish "field omitted" from "field set to false".
type updateNotificationPreferencePayload struct {
	EventType     string `json:"eventType"`
	OnsiteEnabled *bool  `json:"onsiteEnabled,omitempty"`
	EmailEnabled  *bool  `json:"emailEnabled,omitempty"`
	PushEnabled   *bool  `json:"pushEnabled,omitempty"`
}

// UpdateNotificationPreference handles PUT /api/lms/student/notification-preferences.
//
// Upserts by {tenantId, userId, eventType} and patches only the supplied
// channel toggles. Emits EventNotificationSent (Phase 5) on success — the
// constant is reused here as the generic "preference changed" signal because
// the dispatcher consults these toggles before sending.
func (h *ProEngagementPreferencesHandler) UpdateNotificationPreference(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	var payload updateNotificationPreferencePayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.EventType == "" {
		respondWithError(w, http.StatusBadRequest, "eventType is required")
		return
	}
	if payload.OnsiteEnabled == nil && payload.EmailEnabled == nil && payload.PushEnabled == nil {
		respondWithError(w, http.StatusBadRequest, "At least one of onsiteEnabled, emailEnabled, or pushEnabled must be supplied")
		return
	}

	setFields := bson.M{"updatedAt": time.Now()}
	if payload.OnsiteEnabled != nil {
		setFields["onsiteEnabled"] = *payload.OnsiteEnabled
	}
	if payload.EmailEnabled != nil {
		setFields["emailEnabled"] = *payload.EmailEnabled
	}
	if payload.PushEnabled != nil {
		setFields["pushEnabled"] = *payload.PushEnabled
	}

	filter := bson.M{
		"tenantId":  ctx.TenantID,
		"userId":    ctx.UserID,
		"eventType": payload.EventType,
	}
	update := bson.M{
		"$set": setFields,
		"$setOnInsert": bson.M{
			"tenantId":  ctx.TenantID,
			"userId":    ctx.UserID,
			"eventType": payload.EventType,
			"createdAt": time.Now(),
		},
	}
	opts := options.Update().SetUpsert(true)
	if _, err := h.db.NotificationPreferences().UpdateOne(r.Context(), filter, update, opts); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update notification preference")
		return
	}

	// Reload the canonical record so the client gets the merged state.
	var pref models.NotificationPreference
	if err := h.db.NotificationPreferences().FindOne(r.Context(), filter).Decode(&pref); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"eventType": payload.EventType,
			"updated":   true,
		})
		return
	}

	now := time.Now()
	h.emitter.Emit(events.Event{
		Type:      events.EventNotificationSent,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":  ctx.TenantID.Hex(),
			"userId":    ctx.UserID.Hex(),
			"eventType": payload.EventType,
			"action":    "preference_updated",
		},
	})

	respondWithJSON(w, http.StatusOK, pref)
}

// ===========================================================================
// Push Subscriptions (Web Push)
// ===========================================================================

// subscribePushPayload is the request body for SubscribePush. Keys carries
// the Web Push API encryption secrets (p256dh + auth) per RFC 8291.
type subscribePushPayload struct {
	Endpoint string            `json:"endpoint"`
	Keys     map[string]string `json:"keys"`
}

// SubscribePush handles POST /api/lms/notifications/push/subscribe.
//
// Body: { endpoint, keys: { p256dh, auth } }. Upserts by
// {tenantId, userId, endpoint} so re-subscribing the same browser does not
// create duplicate rows. Emits EventPushSubscribed.
func (h *ProEngagementPreferencesHandler) SubscribePush(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	var payload subscribePushPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.Endpoint == "" {
		respondWithError(w, http.StatusBadRequest, "endpoint is required")
		return
	}
	if payload.Keys == nil || len(payload.Keys) == 0 {
		respondWithError(w, http.StatusBadRequest, "keys are required (p256dh + auth)")
		return
	}

	now := time.Now()
	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
		"endpoint": payload.Endpoint,
	}
	update := bson.M{
		"$set": bson.M{
			"keys":      payload.Keys,
			"isActive":  true,
			"createdAt": now, // refresh createdAt on re-subscribe so the device stays "fresh"
		},
		"$setOnInsert": bson.M{
			"tenantId": ctx.TenantID,
			"userId":   ctx.UserID,
			"endpoint": payload.Endpoint,
		},
	}
	opts := options.Update().SetUpsert(true)
	if _, err := h.db.PushSubscriptions().UpdateOne(r.Context(), filter, update, opts); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to register push subscription")
		return
	}

	var sub models.PushSubscription
	if err := h.db.PushSubscriptions().FindOne(r.Context(), filter).Decode(&sub); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"endpoint": payload.Endpoint,
			"saved":    true,
		})
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventPushSubscribed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":       ctx.TenantID.Hex(),
			"userId":         ctx.UserID.Hex(),
			"subscriptionId": sub.ID.Hex(),
			"endpoint":       payload.Endpoint,
		},
	})

	respondWithJSON(w, http.StatusCreated, sub)
}

// UnsubscribePush handles DELETE /api/lms/notifications/push/{id}.
//
// Soft-deletes the subscription (sets isActive=false) so audit history is
// preserved. Emits EventPushUnsubscribed. Returns 404 if no matching
// subscription exists for the caller.
func (h *ProEngagementPreferencesHandler) UnsubscribePush(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription ID")
		return
	}

	filter := bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}
	now := time.Now()
	res, err := h.db.PushSubscriptions().UpdateOne(r.Context(), filter, bson.M{
		"$set": bson.M{
			"isActive":  false,
			"createdAt": now, // touched to mark the deactivation timestamp
		},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to unsubscribe")
		return
	}
	if res.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Push subscription not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventPushUnsubscribed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":       ctx.TenantID.Hex(),
			"userId":         ctx.UserID.Hex(),
			"subscriptionId": id.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":        "Push subscription deactivated",
		"subscriptionId": id.Hex(),
		"isActive":       false,
	})
}

// ===========================================================================
// Mark all notifications as read
// ===========================================================================

// MarkAllNotificationsRead handles POST /api/lms/notifications/mark-all-read.
//
// Flips every unread notification addressed to the caller to isRead=true with
// readAt=now. Emits EventNotificationMarkedRead with the affected count.
func (h *ProEngagementPreferencesHandler) MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
		"isRead":   false,
	}
	now := time.Now()
	res, err := h.db.Notifications().UpdateMany(r.Context(), filter, bson.M{
		"$set": bson.M{
			"isRead":    true,
			"readAt":    now,
			"updatedAt": now,
		},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to mark notifications as read")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventNotificationMarkedRead,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"userId":       ctx.UserID.Hex(),
			"updatedCount": res.ModifiedCount,
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":      "Notifications marked as read",
		"updatedCount": res.ModifiedCount,
		"markedAt":     now,
	})
}

// ===========================================================================
// Accessibility Preferences
// ===========================================================================

// defaultAccessibilityPreferences returns the implicit fallback for a user
// with no stored accessibility row.
func defaultAccessibilityPreferences(tenantID, userID primitive.ObjectID) models.AccessibilityPreferences {
	now := time.Now()
	return models.AccessibilityPreferences{
		TenantID:       tenantID,
		UserID:         userID,
		FontSize:       "medium",
		HighContrast:   false,
		ScreenReader:   false,
		ReducedMotion:  false,
		DyslexiaFont:   false,
		ColorBlindMode: "none",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

// GetAccessibilityPreferences handles GET /api/lms/student/preferences.
//
// Returns the caller's accessibility preferences. If no row exists yet,
// returns the platform defaults (fontSize="medium", every flag false,
// colorBlindMode="none").
func (h *ProEngagementPreferencesHandler) GetAccessibilityPreferences(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}
	var pref models.AccessibilityPreferences
	if err := h.db.AccessibilityPreferences().FindOne(r.Context(), filter).Decode(&pref); err != nil {
		// No stored row yet — return defaults. The empty ID signals to the
		// client that this is a synthetic record (the next PUT will create
		// the row server-side).
		respondWithJSON(w, http.StatusOK, defaultAccessibilityPreferences(ctx.TenantID, ctx.UserID))
		return
	}
	respondWithJSON(w, http.StatusOK, pref)
}

// UpdateAccessibilityPreferences handles PUT /api/lms/student/preferences.
//
// Body (all fields optional — patch only the supplied keys):
//
//	{ fontSize?, highContrast?, screenReader?, reducedMotion?,
//	  dyslexiaFont?, colorBlindMode? }
//
// Upserts by {tenantId, userId}. Emits EventNotificationSent (Phase 5) as the
// generic "user preference updated" signal so any preference-aware UI can
// refresh.
func (h *ProEngagementPreferencesHandler) UpdateAccessibilityPreferences(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	allowed := map[string]bool{
		"fontSize":       true,
		"highContrast":   true,
		"screenReader":   true,
		"reducedMotion":  true,
		"dyslexiaFont":   true,
		"colorBlindMode": true,
	}
	setFields := bson.M{}
	for k, v := range payload {
		if allowed[k] {
			setFields[k] = v
		}
	}
	if len(setFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No writable fields supplied")
		return
	}
	now := time.Now()
	setFields["updatedAt"] = now

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}
	update := bson.M{
		"$set": setFields,
		"$setOnInsert": bson.M{
			"tenantId":       ctx.TenantID,
			"userId":         ctx.UserID,
			"fontSize":       "medium",
			"highContrast":   false,
			"screenReader":   false,
			"reducedMotion":  false,
			"dyslexiaFont":   false,
			"colorBlindMode": "none",
			"createdAt":      now,
		},
	}
	opts := options.Update().SetUpsert(true)
	if _, err := h.db.AccessibilityPreferences().UpdateOne(r.Context(), filter, update, opts); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update accessibility preferences")
		return
	}

	// Reload the merged record so the client sees the canonical state.
	var pref models.AccessibilityPreferences
	if err := h.db.AccessibilityPreferences().FindOne(r.Context(), filter).Decode(&pref); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"userId":    ctx.UserID.Hex(),
			"updatedAt": now,
			"updated":   true,
		})
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventNotificationSent,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"userId":   ctx.UserID.Hex(),
			"action":   "accessibility_preferences_updated",
			"fields":   setFields,
		},
	})

	respondWithJSON(w, http.StatusOK, pref)
}
