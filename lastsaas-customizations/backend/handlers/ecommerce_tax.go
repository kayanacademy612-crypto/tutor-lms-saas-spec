package handlers

import (
	"context"
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
// Ecommerce Tax Rate handlers (Phase 3)
//
// EcommerceTaxHandler exposes CRUD over the lms_tax_rates collection plus a
// ComputeTax helper that can be invoked by the checkout/order pipeline to
// stamp TaxCents on an Order based on the buyer's billing country.
//
// All queries are tenant-scoped via the shared lmsContext helper defined in
// lms.go. Money is integer cents everywhere (mirrors the rest of the LMS
// surface).
// ---------------------------------------------------------------------------

// EcommerceTaxHandler implements the /api/lms/taxes surface.
type EcommerceTaxHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceTaxHandler constructs an EcommerceTaxHandler bound to the given
// MongoDB connection and event emitter.
func NewEcommerceTaxHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceTaxHandler {
	return &EcommerceTaxHandler{db: database, emitter: emitter}
}

// requireEcommerceCtx is a thin wrapper over the shared getLMSContext helper
// that writes a 400/401 response when the request lacks tenant/user context.
// (getLMSContext and lmsContext are package-level symbols in lms.go.)
func (h *EcommerceTaxHandler) requireEcommerceCtx(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ListTaxRates handles GET /api/lms/taxes.
//
// Lists tax rates for the active tenant. Optional query params:
//
//	?isActive=true|false, ?countryCode=US, ?regionCode=CA, ?limit=, ?offset=
func (h *EcommerceTaxHandler) ListTaxRates(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceCtx(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if v := r.URL.Query().Get("isActive"); v != "" {
		filter["isActive"] = v == "true"
	}
	if v := r.URL.Query().Get("countryCode"); v != "" {
		filter["countryCode"] = v
	}
	if v := r.URL.Query().Get("regionCode"); v != "" {
		filter["regionCode"] = v
	}

	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "priority", Value: 1}, {Key: "createdAt", Value: -1}})

	cursor, err := h.db.TaxRates().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch tax rates")
		return
	}
	defer cursor.Close(r.Context())

	var rates []models.TaxRate
	if err := cursor.All(r.Context(), &rates); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode tax rates")
		return
	}
	if rates == nil {
		rates = []models.TaxRate{}
	}
	total, _ := h.db.TaxRates().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"taxRates": rates,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// GetTaxRate handles GET /api/lms/taxes/{id}.
func (h *EcommerceTaxHandler) GetTaxRate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceCtx(w, r)
	if !ok {
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid tax rate ID")
		return
	}

	var rate models.TaxRate
	if err := h.db.TaxRates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&rate); err != nil {
		respondWithError(w, http.StatusNotFound, "Tax rate not found")
		return
	}

	respondWithJSON(w, http.StatusOK, rate)
}

// CreateTaxRate handles POST /api/lms/taxes.
//
// Request body mirrors models.TaxRate minus the server-managed fields
// (id/tenantId/createdAt/updatedAt). Validates name + ratePercent.
func (h *EcommerceTaxHandler) CreateTaxRate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceCtx(w, r)
	if !ok {
		return
	}

	var payload struct {
		Name        string  `json:"name"`
		CountryCode string  `json:"countryCode"`
		RegionCode  string  `json:"regionCode"`
		RatePercent float64 `json:"ratePercent"`
		IsInclusive bool    `json:"isInclusive"`
		IsActive    bool    `json:"isActive"`
		Priority    int     `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.Name == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if payload.RatePercent < 0 || payload.RatePercent > 100 {
		respondWithError(w, http.StatusBadRequest, "ratePercent must be between 0 and 100")
		return
	}

	now := time.Now()
	rate := models.TaxRate{
		TenantID:    ctx.TenantID,
		Name:        payload.Name,
		CountryCode: payload.CountryCode,
		RegionCode:  payload.RegionCode,
		RatePercent: payload.RatePercent,
		IsInclusive: payload.IsInclusive,
		IsActive:    payload.IsActive,
		Priority:    payload.Priority,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	result, err := h.db.TaxRates().InsertOne(r.Context(), &rate)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create tax rate")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		rate.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventTaxRateCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":    ctx.TenantID.Hex(),
			"taxRateId":   rate.ID.Hex(),
			"name":        rate.Name,
			"ratePercent": rate.RatePercent,
			"userId":      ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/taxes/"+rate.ID.Hex())
	respondWithJSON(w, http.StatusCreated, rate)
}

// UpdateTaxRate handles PATCH /api/lms/taxes/{id}.
//
// Only fields present in the JSON body are mutated; identity/audit fields are
// rejected. Stamps updatedAt and emits EventTaxRateUpdated.
func (h *EcommerceTaxHandler) UpdateTaxRate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceCtx(w, r)
	if !ok {
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid tax rate ID")
		return
	}

	var existing models.TaxRate
	if err := h.db.TaxRates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&existing); err != nil {
		respondWithError(w, http.StatusNotFound, "Tax rate not found")
		return
	}

	var patch map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	for _, forbidden := range []string{"_id", "id", "tenantId", "createdAt"} {
		delete(patch, forbidden)
	}
	if raw, ok := patch["ratePercent"]; ok {
		v, _ := raw.(float64)
		if v < 0 || v > 100 {
			respondWithError(w, http.StatusBadRequest, "ratePercent must be between 0 and 100")
			return
		}
	}
	patch["updatedAt"] = time.Now()

	if _, err := h.db.TaxRates().UpdateByID(r.Context(), id, bson.M{"$set": patch}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update tax rate")
		return
	}

	var updated models.TaxRate
	if err := h.db.TaxRates().FindOne(r.Context(), bson.M{"_id": id, "tenantId": ctx.TenantID}).Decode(&updated); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to reload tax rate")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventTaxRateUpdated,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":  ctx.TenantID.Hex(),
			"taxRateId": id.Hex(),
			"userId":    ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteTaxRate handles DELETE /api/lms/taxes/{id}.
//
// Performs a hard delete. Future checkout runs that would have matched this
// rate will simply find no applicable rate.
func (h *EcommerceTaxHandler) DeleteTaxRate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceCtx(w, r)
	if !ok {
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid tax rate ID")
		return
	}

	result, err := h.db.TaxRates().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete tax rate")
		return
	}
	if result.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Tax rate not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventTaxRateUpdated,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":  ctx.TenantID.Hex(),
			"taxRateId": id.Hex(),
			"action":    "deleted",
			"userId":    ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Tax rate deleted",
		"id":      id.Hex(),
	})
}

// ComputeTax computes the tax amount (in cents) that should be applied to the
// supplied order given the buyer's billing country. It looks up the tenant's
// active tax rates whose countryCode matches billingCountry (or whose
// countryCode is empty/missing, acting as a tenant-wide default) and picks the
// highest-priority match.
//
// When the matched rate IsInclusive, the tax is considered already embedded in
// the order subtotal and the function returns 0 (callers can still derive the
// embedded tax amount via subtotal - subtotal/(1+rate) if needed). Otherwise
// taxAmount = round((subtotalCents - discountCents) * ratePercent / 100).
// Returns 0 when no applicable rate is found.
func (h *EcommerceTaxHandler) ComputeTax(order models.Order, billingCountry string) int64 {
	if order.TenantID.IsZero() {
		return 0
	}

	// Match either the buyer's country exactly, or a tenant-wide rate with
	// no countryCode set (the catch-all default).
	countryClause := []bson.M{
		{"countryCode": billingCountry},
		{"countryCode": ""},
		{"countryCode": bson.M{"$exists": false}},
	}
	filter := bson.M{
		"tenantId": order.TenantID,
		"isActive": true,
		"$or":      countryClause,
	}

	var rate models.TaxRate
	findOpts := options.FindOne().SetSort(bson.D{
		{Key: "priority", Value: -1},
		{Key: "createdAt", Value: -1},
	})
	if err := h.db.TaxRates().FindOne(context.Background(), filter, findOpts).Decode(&rate); err != nil {
		// No active matching rate -> no tax.
		return 0
	}
	if rate.IsInclusive {
		// Tax is embedded in the subtotal; no additional amount to add.
		return 0
	}
	subtotal := order.SubtotalCents - order.DiscountCents
	if subtotal < 0 {
		subtotal = 0
	}
	tax := int64(float64(subtotal) * rate.RatePercent / 100.0)
	if tax < 0 {
		tax = 0
	}
	return tax
}
