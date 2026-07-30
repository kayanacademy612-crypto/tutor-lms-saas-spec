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
// Ecommerce Gateway handlers (Phase 3)
//
// EcommerceGatewayHandler exposes CRUD over the lms_payment_gateways
// collection so admins can configure per-tenant payment providers (Stripe,
// PayPal, Razorpay, Manual, etc.). The Checkout / Payment handlers read
// these documents at runtime to pick the active gateway + credentials.
//
// All queries are tenant-scoped via the shared lmsContext helper defined in
// lms.go. Credential values are stored opaquely (map[string]interface{}) —
// encryption-at-rest is the deployment's responsibility, not this handler's.
// ---------------------------------------------------------------------------

// EcommerceGatewayHandler implements the /api/lms/gateways surface.
type EcommerceGatewayHandler struct {
        db      *db.MongoDB
        emitter events.Emitter
}

// NewEcommerceGatewayHandler constructs an EcommerceGatewayHandler bound to
// the given MongoDB connection and event emitter.
func NewEcommerceGatewayHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceGatewayHandler {
        return &EcommerceGatewayHandler{db: database, emitter: emitter}
}

// requireEcommerceGatewayCtx is a thin wrapper over the shared getLMSContext
// helper that writes a 400/401 response when the request lacks tenant/user
// context. Admin-only mutations additionally check ctx.IsInstructor.
func (h *EcommerceGatewayHandler) requireEcommerceGatewayCtx(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ListGateways handles GET /api/lms/gateways.
//
// Lists payment gateway configs for the active tenant. Optional query params:
//
//      ?isEnabled=true|false, ?gateway=stripe, ?limit=, ?offset=
func (h *EcommerceGatewayHandler) ListGateways(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireEcommerceGatewayCtx(w, r)
        if !ok {
                return
        }

        filter := bson.M{"tenantId": ctx.TenantID}
        if v := r.URL.Query().Get("isEnabled"); v != "" {
                filter["isEnabled"] = v == "true"
        }
        if v := r.URL.Query().Get("gateway"); v != "" {
                filter["gateway"] = v
        }

        limit := parsePositiveInt(r, "limit", 50, 200)
        offset := parsePositiveInt(r, "offset", 0, 1<<30)
        findOpts := options.Find().
                SetLimit(int64(limit)).
                SetSkip(int64(offset)).
                SetSort(bson.D{{Key: "createdAt", Value: 1}})

        cursor, err := h.db.PaymentGateways().Find(r.Context(), filter, findOpts)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to fetch gateways")
                return
        }
        defer cursor.Close(r.Context())

        var gateways []models.PaymentGatewayConfig
        if err := cursor.All(r.Context(), &gateways); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to decode gateways")
                return
        }
        if gateways == nil {
                gateways = []models.PaymentGatewayConfig{}
        }
        total, _ := h.db.PaymentGateways().CountDocuments(r.Context(), filter)

        respondWithJSON(w, http.StatusOK, map[string]interface{}{
                "gateways": gateways,
                "total":    total,
                "limit":    limit,
                "offset":   offset,
        })
}

// CreateGateway handles POST /api/lms/gateways.
//
// Admin-only. Body shape mirrors models.PaymentGatewayConfig; tenantId,
// createdAt, updatedAt are stamped by the server.
func (h *EcommerceGatewayHandler) CreateGateway(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireEcommerceGatewayCtx(w, r)
        if !ok {
                return
        }
        if !ctx.IsInstructor {
                respondWithError(w, http.StatusForbidden, "Admin privileges required")
                return
        }

        var gw models.PaymentGatewayConfig
        if err := json.NewDecoder(r.Body).Decode(&gw); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }
        if gw.Gateway == "" {
                respondWithError(w, http.StatusBadRequest, "gateway is required")
                return
        }

        now := time.Now()
        gw.ID = primitive.NilObjectID
        gw.TenantID = ctx.TenantID
        gw.CreatedAt = now
        gw.UpdatedAt = now
        if gw.Credentials == nil {
                gw.Credentials = map[string]interface{}{}
        }
        if gw.Settings == nil {
                gw.Settings = map[string]interface{}{}
        }

        // If this gateway is being marked default, unset isDefault on any other
        // gateway for the same tenant so only one default exists.
        if gw.IsDefault {
                if _, err := h.db.PaymentGateways().UpdateMany(r.Context(),
                        bson.M{"tenantId": ctx.TenantID, "isDefault": true},
                        bson.M{"$set": bson.M{"isDefault": false, "updatedAt": now}},
                ); err != nil {
                        respondWithError(w, http.StatusInternalServerError, "Failed to clear previous default gateway")
                        return
                }
        }

        result, err := h.db.PaymentGateways().InsertOne(r.Context(), gw)
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to create gateway")
                return
        }
        gw.ID = result.InsertedID.(primitive.ObjectID)

        h.emitter.Emit(events.Event{
                Type:      events.EventGatewayConnected,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "gatewayId": gw.ID.Hex(),
                        "gateway":   gw.Gateway,
                        "userId":    ctx.UserID.Hex(),
                },
        })

        w.Header().Set("Location", "/api/lms/gateways/"+gw.ID.Hex())
        respondWithJSON(w, http.StatusCreated, gw)
}

// UpdateGateway handles PATCH /api/lms/gateways/{id}.
//
// Admin-only. Accepts a partial JSON body; only the supplied fields are
// mutated. Identity / audit fields (_id, tenantId, createdAt) cannot be
// changed.
func (h *EcommerceGatewayHandler) UpdateGateway(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireEcommerceGatewayCtx(w, r)
        if !ok {
                return
        }
        if !ctx.IsInstructor {
                respondWithError(w, http.StatusForbidden, "Admin privileges required")
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid gateway ID")
                return
        }

        var body map[string]interface{}
        if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid request body")
                return
        }

        // Reject identity / audit fields so callers can't mutate them.
        for _, k := range []string{"_id", "id", "tenantId", "tenantID", "createdAt"} {
                delete(body, k)
        }
        if len(body) == 0 {
                respondWithError(w, http.StatusBadRequest, "No updatable fields supplied")
                return
        }

        now := time.Now()
        body["updatedAt"] = now

        // If isDefault is being flipped to true, clear any other default gateway
        // for the tenant first.
        if v, exists := body["isDefault"]; exists {
                if b, ok := v.(bool); ok && b {
                        if _, err := h.db.PaymentGateways().UpdateMany(r.Context(),
                                bson.M{"tenantId": ctx.TenantID, "isDefault": true, "_id": bson.M{"$ne": id}},
                                bson.M{"$set": bson.M{"isDefault": false, "updatedAt": now}},
                        ); err != nil {
                                respondWithError(w, http.StatusInternalServerError, "Failed to clear previous default gateway")
                                return
                        }
                }
        }

        update := bson.M{"$set": body}
        result, err := h.db.PaymentGateways().UpdateOne(r.Context(),
                bson.M{"_id": id, "tenantId": ctx.TenantID},
                update,
        )
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to update gateway")
                return
        }
        if result.MatchedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Gateway not found")
                return
        }

        var updated models.PaymentGatewayConfig
        if err := h.db.PaymentGateways().FindOne(r.Context(),
                bson.M{"_id": id, "tenantId": ctx.TenantID},
        ).Decode(&updated); err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to reload gateway")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventGatewayConnected,
                Timestamp: now,
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "gatewayId": id.Hex(),
                        "gateway":   updated.Gateway,
                        "action":    "updated",
                        "userId":    ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, updated)
}

// DeleteGateway handles DELETE /api/lms/gateways/{id}.
//
// Admin-only. Hard delete.
func (h *EcommerceGatewayHandler) DeleteGateway(w http.ResponseWriter, r *http.Request) {
        ctx, ok := h.requireEcommerceGatewayCtx(w, r)
        if !ok {
                return
        }
        if !ctx.IsInstructor {
                respondWithError(w, http.StatusForbidden, "Admin privileges required")
                return
        }

        idStr := mux.Vars(r)["id"]
        id, err := primitive.ObjectIDFromHex(idStr)
        if err != nil {
                respondWithError(w, http.StatusBadRequest, "Invalid gateway ID")
                return
        }

        result, err := h.db.PaymentGateways().DeleteOne(r.Context(), bson.M{
                "_id":      id,
                "tenantId": ctx.TenantID,
        })
        if err != nil {
                respondWithError(w, http.StatusInternalServerError, "Failed to delete gateway")
                return
        }
        if result.DeletedCount == 0 {
                respondWithError(w, http.StatusNotFound, "Gateway not found")
                return
        }

        h.emitter.Emit(events.Event{
                Type:      events.EventGatewayDisconnected,
                Timestamp: time.Now(),
                Data: map[string]interface{}{
                        "tenantId":  ctx.TenantID.Hex(),
                        "gatewayId": id.Hex(),
                        "action":    "deleted",
                        "userId":    ctx.UserID.Hex(),
                },
        })

        respondWithJSON(w, http.StatusOK, map[string]string{
                "message": "Gateway deleted",
                "id":      id.Hex(),
        })
}
