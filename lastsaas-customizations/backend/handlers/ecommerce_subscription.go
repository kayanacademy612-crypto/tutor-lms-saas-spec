package handlers

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"
	stripeservice "lastsaas/internal/stripe"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// EcommerceSubscriptionHandler
//
// Implements the Phase 3 subscription surface mounted at /api/lms/subscription-plans
// (catalog management) and /api/lms/subscriptions (per-user active subscriptions).
//
// The handler is multi-tenant scoped: every query filters by tenantId extracted
// from the request context via getLMSContext (the same helper used by the LMS
// handler). Stripe integration is optional — when the stripe service is nil
// (e.g. in dev mode or when Stripe is not configured) the cancel/resume/retry
// flows fall back to a local-only DB transition. When a subscription carries a
// StripeSubscriptionID and the service is wired, the matching Stripe API call
// is attempted first; failures are logged but do NOT block the local transition
// so the user always sees a consistent state.
// ---------------------------------------------------------------------------

// EcommerceSubscriptionHandler exposes subscription plan CRUD and per-user
// subscription lifecycle methods.
type EcommerceSubscriptionHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
	stripe  *stripeservice.Service
}

// NewEcommerceSubscriptionHandler constructs an EcommerceSubscriptionHandler
// bound to the given MongoDB connection and event emitter. The Stripe service
// is optional — wire it via SetStripeService when available.
func NewEcommerceSubscriptionHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceSubscriptionHandler {
	return &EcommerceSubscriptionHandler{db: database, emitter: emitter}
}

// SetStripeService wires the optional Stripe service used for cancel/resume/
// retry operations. Safe to call once at startup before routes are served.
func (h *EcommerceSubscriptionHandler) SetStripeService(svc *stripeservice.Service) {
	h.stripe = svc
}

// requireEcommerceContext is the shared auth-context extractor for the
// ecommerce handler types. It reuses getLMSContext so identity resolution
// (middleware → path var → dev fallback) matches the LMS handler exactly,
// and returns the full lmsContext (which carries IsInstructor — needed by
// the List handlers to decide whether to surface inactive rows).
//
// This function is also referenced by ecommerce_cart.go's
// requireEcommerceCartContext wrapper (which projects the lmsContext down
// to the local ecommerceCartContext struct).
func requireEcommerceContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// requireEcommerceContext on *EcommerceCheckoutHandler satisfies the call
// sites in ecommerce_checkout.go (added by P3-A2). It mirrors the
// EcommerceCartHandler.requireEcommerceContext method defined in
// ecommerce_cart.go: returns the local ecommerceCartContext struct so the
// checkout handler code stays shape-compatible with the cart handler.
func (h *EcommerceCheckoutHandler) requireEcommerceContext(w http.ResponseWriter, r *http.Request) (ecommerceCartContext, bool) {
	ctx, ok := getEcommerceContext(r)
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context required")
		return ecommerceCartContext{}, false
	}
	return ctx, true
}

// slugifyEcommerce converts a free-form name into a URL-safe slug. Used by the
// create handlers when the caller does not supply an explicit slug.
var ecommerceSlugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugifyEcommerce(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = ecommerceSlugRe.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "item"
	}
	return s
}

// ---------------------------------------------------------------------------
// Subscription Plans (instructor/admin manages)
// ---------------------------------------------------------------------------

// ListSubscriptionPlans handles GET /api/lms/subscription-plans.
//
// Returns the tenant's subscription plans. Students only see active plans;
// instructors/admins see all plans. Optional query params:
//   - planType        (course|bundle|category|full_site)
//   - billingInterval (monthly|quarterly|annual)
//   - limit, offset   (pagination)
func (h *EcommerceSubscriptionHandler) ListSubscriptionPlans(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	}
	if pt := r.URL.Query().Get("planType"); pt != "" {
		filter["planType"] = models.SubscriptionPlanType(pt)
	}
	if bi := r.URL.Query().Get("billingInterval"); bi != "" {
		filter["billingInterval"] = bi
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{
			{Key: "sortOrder", Value: 1},
			{Key: "createdAt", Value: -1},
		})

	cursor, err := h.db.SubscriptionPlans().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch subscription plans")
		return
	}
	defer cursor.Close(r.Context())

	var plans []models.SubscriptionPlan
	if err := cursor.All(r.Context(), &plans); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode subscription plans")
		return
	}
	if plans == nil {
		plans = []models.SubscriptionPlan{}
	}
	total, _ := h.db.SubscriptionPlans().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"plans":  plans,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetSubscriptionPlan handles GET /api/lms/subscription-plans/{id}.
func (h *EcommerceSubscriptionHandler) GetSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription plan ID")
		return
	}

	filter := bson.M{"_id": id, "tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["isActive"] = true
	}
	var plan models.SubscriptionPlan
	if err := h.db.SubscriptionPlans().FindOne(r.Context(), filter).Decode(&plan); err != nil {
		respondWithError(w, http.StatusNotFound, "Subscription plan not found")
		return
	}
	respondWithJSON(w, http.StatusOK, plan)
}

// CreateSubscriptionPlan handles POST /api/lms/subscription-plans.
//
// Required body fields: name, planType, billingInterval, priceCents.
// Optional: slug (auto-generated from name when omitted), description,
// referenceId, currency, trialDays, isActive, sortOrder, stripeProductId,
// stripePriceId.
//
// Emits events.EventSubscriptionCreated on success.
func (h *EcommerceSubscriptionHandler) CreateSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var plan models.SubscriptionPlan
	if err := json.NewDecoder(r.Body).Decode(&plan); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(plan.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if plan.PlanType == "" {
		respondWithError(w, http.StatusBadRequest, "planType is required")
		return
	}
	switch plan.PlanType {
	case models.SubscriptionPlanTypeCourse, models.SubscriptionPlanTypeBundle,
		models.SubscriptionPlanTypeCategory, models.SubscriptionPlanTypeFullSite:
		// valid
	default:
		respondWithError(w, http.StatusBadRequest, "invalid planType")
		return
	}
	if plan.BillingInterval == "" {
		respondWithError(w, http.StatusBadRequest, "billingInterval is required")
		return
	}
	switch plan.BillingInterval {
	case "monthly", "quarterly", "annual":
		// valid
	default:
		respondWithError(w, http.StatusBadRequest, "invalid billingInterval (must be monthly|quarterly|annual)")
		return
	}
	if plan.PriceCents < 0 {
		respondWithError(w, http.StatusBadRequest, "priceCents must be >= 0")
		return
	}

	// Auto-generate slug from name when not supplied.
	if strings.TrimSpace(plan.Slug) == "" {
		plan.Slug = slugifyEcommerce(plan.Name)
	}

	// Enforce tenant identity + defaults.
	plan.ID = primitive.NilObjectID
	plan.TenantID = ctx.TenantID
	if plan.Currency == "" {
		plan.Currency = "USD"
	}
	now := time.Now()
	plan.CreatedAt = now
	plan.UpdatedAt = now

	// Guard against duplicate slugs within the tenant.
	dupCount, err := h.db.SubscriptionPlans().CountDocuments(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"slug":     plan.Slug,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to verify plan slug")
		return
	}
	if dupCount > 0 {
		respondWithError(w, http.StatusConflict, "A subscription plan with this slug already exists")
		return
	}

	result, err := h.db.SubscriptionPlans().InsertOne(r.Context(), &plan)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create subscription plan")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		plan.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventSubscriptionCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":        ctx.TenantID.Hex(),
			"planId":          plan.ID.Hex(),
			"name":            plan.Name,
			"planType":        string(plan.PlanType),
			"billingInterval": plan.BillingInterval,
			"priceCents":      plan.PriceCents,
			"actorId":         ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/subscription-plans/"+plan.ID.Hex())
	respondWithJSON(w, http.StatusCreated, plan)
}

// UpdateSubscriptionPlan handles PATCH /api/lms/subscription-plans/{id}.
//
// Only fields present in the JSON body are mutated; identity/audit fields
// (_id, tenantId, createdAt) are rejected. The slug (if changed) is checked
// for tenant-scoped uniqueness before the update is applied.
func (h *EcommerceSubscriptionHandler) UpdateSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription plan ID")
		return
	}

	var existing models.SubscriptionPlan
	if err := h.db.SubscriptionPlans().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&existing); err != nil {
		respondWithError(w, http.StatusNotFound, "Subscription plan not found")
		return
	}

	var patch map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Reject identity/audit field mutations.
	for _, forbidden := range []string{"_id", "id", "tenantId", "createdAt"} {
		delete(patch, forbidden)
	}

	if ptRaw, ok := patch["planType"]; ok {
		ptStr, _ := ptRaw.(string)
		switch models.SubscriptionPlanType(ptStr) {
		case models.SubscriptionPlanTypeCourse, models.SubscriptionPlanTypeBundle,
			models.SubscriptionPlanTypeCategory, models.SubscriptionPlanTypeFullSite:
			// valid
		default:
			respondWithError(w, http.StatusBadRequest, "invalid planType")
			return
		}
	}
	if biRaw, ok := patch["billingInterval"]; ok {
		biStr, _ := biRaw.(string)
		switch biStr {
		case "monthly", "quarterly", "annual":
			// valid
		default:
			respondWithError(w, http.StatusBadRequest, "invalid billingInterval")
			return
		}
	}
	if priceRaw, ok := patch["priceCents"]; ok {
		priceFloat, _ := priceRaw.(float64)
		if priceFloat < 0 {
			respondWithError(w, http.StatusBadRequest, "priceCents must be >= 0")
			return
		}
	}
	if slugRaw, ok := patch["slug"]; ok {
		slugStr, _ := slugRaw.(string)
		if slugStr != "" && slugStr != existing.Slug {
			dupCount, err := h.db.SubscriptionPlans().CountDocuments(r.Context(), bson.M{
				"tenantId": ctx.TenantID,
				"slug":     slugStr,
				"_id":      bson.M{"$ne": id},
			})
			if err != nil {
				respondWithError(w, http.StatusInternalServerError, "Failed to verify plan slug")
				return
			}
			if dupCount > 0 {
				respondWithError(w, http.StatusConflict, "A subscription plan with this slug already exists")
				return
			}
		}
	}

	patch["updatedAt"] = time.Now()
	if _, err := h.db.SubscriptionPlans().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update subscription plan")
		return
	}

	var updated models.SubscriptionPlan
	if err := h.db.SubscriptionPlans().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to reload subscription plan")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventSubscriptionCreated, // re-using the created event for any write to plans
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"planId":   id.Hex(),
			"action":   "updated",
			"actorId":  ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteSubscriptionPlan handles DELETE /api/lms/subscription-plans/{id}.
//
// Performs a soft delete (sets isActive=false) so historical subscriptions
// referencing the plan keep a valid reference. The plan document is retained
// and can be re-activated later by PATCHing isActive=true.
func (h *EcommerceSubscriptionHandler) DeleteSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription plan ID")
		return
	}

	now := time.Now()
	res, err := h.db.SubscriptionPlans().UpdateOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}, bson.M{
		"$set": bson.M{
			"isActive":  false,
			"updatedAt": now,
		},
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete subscription plan")
		return
	}
	if res.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Subscription plan not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventSubscriptionCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": ctx.TenantID.Hex(),
			"planId":   id.Hex(),
			"action":   "deactivated",
			"actorId":  ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Subscription plan deactivated",
		"id":      id.Hex(),
	})
}

// ---------------------------------------------------------------------------
// User Subscriptions (student manages their active subs)
// ---------------------------------------------------------------------------

// ListSubscriptions handles GET /api/lms/subscriptions.
//
// Returns the current user's subscriptions. Optional query param: ?status=
// (trialing|active|past_due|canceled|expired).
func (h *EcommerceSubscriptionHandler) ListSubscriptions(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = models.SubscriptionStatus(status)
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.Subscriptions().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch subscriptions")
		return
	}
	defer cursor.Close(r.Context())

	var subs []models.Subscription
	if err := cursor.All(r.Context(), &subs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode subscriptions")
		return
	}
	if subs == nil {
		subs = []models.Subscription{}
	}
	total, _ := h.db.Subscriptions().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"subscriptions": subs,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// GetSubscription handles GET /api/lms/subscriptions/{id}.
func (h *EcommerceSubscriptionHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription ID")
		return
	}

	var sub models.Subscription
	if err := h.db.Subscriptions().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}).Decode(&sub); err != nil {
		respondWithError(w, http.StatusNotFound, "Subscription not found")
		return
	}
	respondWithJSON(w, http.StatusOK, sub)
}

// CancelSubscription handles POST /api/lms/subscriptions/{id}/cancel.
//
// Transitions a subscription into the canceled state. If the subscription has
// a StripeSubscriptionID and the Stripe service is wired, the Stripe sub is
// also scheduled for cancellation at period end (so the user keeps access
// through the period they already paid for). Emits
// events.EventSubscriptionCancelled (British double-l) on success.
func (h *EcommerceSubscriptionHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription ID")
		return
	}

	var sub models.Subscription
	if err := h.db.Subscriptions().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}).Decode(&sub); err != nil {
		respondWithError(w, http.StatusNotFound, "Subscription not found")
		return
	}
	if sub.Status == models.SubscriptionStatusCanceled {
		respondWithError(w, http.StatusBadRequest, "Subscription is already canceled")
		return
	}

	// Attempt Stripe cancellation first (best-effort). Failures are logged but
	// do NOT block the local transition — the local DB is the source of truth
	// for the user-facing state.
	if sub.StripeSubscriptionID != "" && h.stripe != nil {
		if _, err := h.stripe.CancelSubscriptionAtPeriodEnd(r.Context(), sub.StripeSubscriptionID); err != nil {
			slog.Warn("Stripe cancel subscription failed; proceeding with local cancel",
				"subscriptionId", id.Hex(),
				"stripeSubscriptionId", sub.StripeSubscriptionID,
				"error", err)
		}
	}

	now := time.Now()
	if _, err := h.db.Subscriptions().UpdateByID(r.Context(), id, bson.M{
		"$set": bson.M{
			"status":     models.SubscriptionStatusCanceled,
			"canceledAt": now,
			"updatedAt":  now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to cancel subscription")
		return
	}
	sub.Status = models.SubscriptionStatusCanceled
	sub.CanceledAt = &now
	sub.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventSubscriptionCancelled,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":       ctx.TenantID.Hex(),
			"subscriptionId": id.Hex(),
			"userId":         ctx.UserID.Hex(),
			"planId":         sub.PlanID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, sub)
}

// ResumeSubscription handles POST /api/lms/subscriptions/{id}/resume.
//
// Reactivates a previously-canceled subscription (clears canceledAt, sets
// status=active). If the subscription has a StripeSubscriptionID and the
// Stripe service is wired, the Stripe cancel-at-period-end flag is cleared.
// Emits events.EventSubscriptionActivated (reused from emitter.go) on success.
func (h *EcommerceSubscriptionHandler) ResumeSubscription(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription ID")
		return
	}

	var sub models.Subscription
	if err := h.db.Subscriptions().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}).Decode(&sub); err != nil {
		respondWithError(w, http.StatusNotFound, "Subscription not found")
		return
	}
	if sub.Status != models.SubscriptionStatusCanceled {
		respondWithError(w, http.StatusBadRequest, "Only canceled subscriptions can be resumed")
		return
	}

	// Best-effort Stripe resume.
	if sub.StripeSubscriptionID != "" && h.stripe != nil {
		if err := h.stripe.ResumeSubscription(r.Context(), sub.StripeSubscriptionID); err != nil {
			slog.Warn("Stripe resume subscription failed; proceeding with local resume",
				"subscriptionId", id.Hex(),
				"stripeSubscriptionId", sub.StripeSubscriptionID,
				"error", err)
		}
	}

	now := time.Now()
	if _, err := h.db.Subscriptions().UpdateByID(r.Context(), id, bson.M{
		"$set": bson.M{
			"status":    models.SubscriptionStatusActive,
			"updatedAt": now,
		},
		"$unset": bson.M{
			"canceledAt": "",
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to resume subscription")
		return
	}
	sub.Status = models.SubscriptionStatusActive
	sub.CanceledAt = nil
	sub.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventSubscriptionActivated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":       ctx.TenantID.Hex(),
			"subscriptionId": id.Hex(),
			"userId":         ctx.UserID.Hex(),
			"planId":         sub.PlanID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, sub)
}

// RetrySubscription handles POST /api/lms/subscriptions/{id}/retry.
//
// Triggers a dunning retry on a past_due subscription. If the subscription has
// a StripeSubscriptionID and the Stripe service is wired, the latest invoice
// is paid via the Stripe API. On success the subscription is flipped to active
// and events.EventSubscriptionRenewed is emitted. On failure a DunningCycle
// entry is recorded, the subscription's retryCount is incremented and the
// next retry is scheduled (exponential backoff: 1d, 3d, 7d, ...). When the
// retry count exceeds the configured maximum (4 attempts) the subscription is
// marked expired and events.EventSubscriptionExpired is emitted instead.
// events.EventSubscriptionPaymentFailed is emitted on every failed attempt.
func (h *EcommerceSubscriptionHandler) RetrySubscription(w http.ResponseWriter, r *http.Request) {
	ctx, ok := requireEcommerceContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid subscription ID")
		return
	}

	var sub models.Subscription
	if err := h.db.Subscriptions().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}).Decode(&sub); err != nil {
		respondWithError(w, http.StatusNotFound, "Subscription not found")
		return
	}
	if sub.Status != models.SubscriptionStatusPastDue {
		respondWithError(w, http.StatusBadRequest, "Only past_due subscriptions can be retried")
		return
	}

	now := time.Now()
	attemptNum := sub.RetryCount + 1

	// Attempt the Stripe retry when possible.
	var stripeErr error
	if sub.StripeSubscriptionID != "" && h.stripe != nil {
		stripeErr = h.stripe.RetrySubscriptionPayment(r.Context(), sub.StripeSubscriptionID)
	} else if sub.StripeSubscriptionID == "" {
		// No Stripe binding — treat as a synthetic success in dev/local mode
		// so the subscription can recover without an external gateway.
		stripeErr = nil
	} else {
		stripeErr = fmt.Errorf("stripe service not configured")
	}

	if stripeErr == nil {
		// Success: flip back to active, clear retry state.
		if _, err := h.db.Subscriptions().UpdateByID(r.Context(), id, bson.M{
			"$set": bson.M{
				"status":     models.SubscriptionStatusActive,
				"retryCount": 0,
				"updatedAt":  now,
			},
			"$unset": bson.M{
				"nextRetryAt": "",
			},
		}); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to activate subscription")
			return
		}
		sub.Status = models.SubscriptionStatusActive
		sub.RetryCount = 0
		sub.NextRetryAt = nil
		sub.UpdatedAt = now

		// Record a successful dunning cycle entry.
		dunning := models.DunningCycle{
			TenantID:       ctx.TenantID,
			SubscriptionID: id,
			AttemptNumber:  attemptNum,
			Status:         "retried",
			ScheduledAt:    now,
			AttemptedAt:    &now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if _, err := h.db.DunningCycles().InsertOne(r.Context(), &dunning); err != nil {
			slog.Warn("Failed to record dunning success entry", "subscriptionId", id.Hex(), "error", err)
		}

		h.emitter.Emit(events.Event{
			Type:      events.EventSubscriptionRenewed,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":       ctx.TenantID.Hex(),
				"subscriptionId": id.Hex(),
				"userId":         ctx.UserID.Hex(),
				"planId":         sub.PlanID.Hex(),
				"attemptNumber":  attemptNum,
			},
		})

		respondWithJSON(w, http.StatusOK, sub)
		return
	}

	// Failure path: record the dunning attempt, schedule next retry.
	const maxRetries = 4
	errMsg := stripeErr.Error()

	// Exponential backoff: 1d, 3d, 7d, 15d. After maxRetries attempts the
	// subscription is marked expired.
	var nextRetry *time.Time
	expired := attemptNum >= maxRetries
	if !expired {
		backoffDays := 1 << attemptNum // 2, 4, 8, 16 — clamped below
		if backoffDays > 15 {
			backoffDays = 15
		}
		nr := now.AddDate(0, 0, backoffDays)
		nextRetry = &nr
	}

	updateSet := bson.M{
		"retryCount": attemptNum,
		"updatedAt":  now,
	}
	if expired {
		updateSet["status"] = models.SubscriptionStatusExpired
	}
	if nextRetry != nil {
		updateSet["nextRetryAt"] = *nextRetry
	}
	update := bson.M{"$set": updateSet}
	if expired {
		update["$unset"] = bson.M{"nextRetryAt": ""}
	}

	if _, err := h.db.Subscriptions().UpdateByID(r.Context(), id, update); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to record retry failure")
		return
	}
	sub.RetryCount = attemptNum
	sub.NextRetryAt = nextRetry
	sub.UpdatedAt = now
	if expired {
		sub.Status = models.SubscriptionStatusExpired
	}

	// Append a dunning cycle entry.
	dunningStatus := "failed"
	if expired {
		dunningStatus = "exhausted"
	}
	dunning := models.DunningCycle{
		TenantID:       ctx.TenantID,
		SubscriptionID: id,
		AttemptNumber:  attemptNum,
		Status:         dunningStatus,
		ScheduledAt:    now,
		AttemptedAt:    &now,
		ErrorMessage:   errMsg,
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if _, err := h.db.DunningCycles().InsertOne(r.Context(), &dunning); err != nil {
		slog.Warn("Failed to record dunning failure entry", "subscriptionId", id.Hex(), "error", err)
	}

	// Emit payment-failed for every failed attempt; emit expired when exhausted.
	h.emitter.Emit(events.Event{
		Type:      events.EventSubscriptionPaymentFailed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":       ctx.TenantID.Hex(),
			"subscriptionId": id.Hex(),
			"userId":         ctx.UserID.Hex(),
			"planId":         sub.PlanID.Hex(),
			"attemptNumber":  attemptNum,
			"errorMessage":   errMsg,
			"expired":        expired,
		},
	})

	if expired {
		h.emitter.Emit(events.Event{
			Type:      events.EventSubscriptionExpired,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":       ctx.TenantID.Hex(),
				"subscriptionId": id.Hex(),
				"userId":         ctx.UserID.Hex(),
				"planId":         sub.PlanID.Hex(),
				"attemptNumber":  attemptNum,
			},
		})
	}

	if expired {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"subscription": sub,
			"message":      "Dunning exhausted; subscription expired",
			"expired":      true,
		})
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"subscription": sub,
		"message":      "Retry failed; next attempt scheduled",
		"expired":      false,
		"nextRetryAt":  nextRetry,
	})
}
