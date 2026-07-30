package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
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
// EcommerceRefundHandler — Phase 3 refund endpoints
//
// Mounted under /api/lms/refunds and /api/lms/orders/{orderId}/refund.
// Records (full or partial) refunds against a paid Order, cascades to the
// order's enrollments when the refund is full, and writes an OrderActivity
// audit row for every refund.
//
// All endpoints reuse getLMSContext (defined in lms.go) for tenant/user
// resolution, including the dev fallback that pins requests to the default
// tenant + user.
// ---------------------------------------------------------------------------

// EcommerceRefundHandler implements the Phase 3 refund endpoints.
type EcommerceRefundHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceRefundHandler constructs an EcommerceRefundHandler bound to
// the supplied MongoDB connection and event emitter.
func NewEcommerceRefundHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceRefundHandler {
	return &EcommerceRefundHandler{db: database, emitter: emitter}
}

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks
// a usable tenant or authenticated user.
func (h *EcommerceRefundHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ListRefunds handles GET /api/lms/refunds.
//
// Tenant-scoped. Optional query params: ?orderId=, ?status=, ?limit=, ?offset=.
// Refunds are tenant-wide records, so both students and admins can list them;
// downstream role gating can be layered in if a tenant wants to restrict
// visibility to the order owner + admins.
func (h *EcommerceRefundHandler) ListRefunds(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if orderIDStr := r.URL.Query().Get("orderId"); orderIDStr != "" {
		if oid, err := primitive.ObjectIDFromHex(orderIDStr); err == nil {
			filter["orderId"] = oid
		}
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = status
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.Refunds().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch refunds")
		return
	}
	defer cursor.Close(r.Context())

	var refunds []models.Refund
	if err := cursor.All(r.Context(), &refunds); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode refunds")
		return
	}
	if refunds == nil {
		refunds = []models.Refund{}
	}
	total, _ := h.db.Refunds().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"refunds": refunds,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetRefund handles GET /api/lms/refunds/{id}.
//
// Returns a single Refund scoped to the current tenant.
func (h *EcommerceRefundHandler) GetRefund(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid refund ID")
		return
	}
	var refund models.Refund
	if err := h.db.Refunds().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&refund); err != nil {
		respondWithError(w, http.StatusNotFound, "Refund not found")
		return
	}
	respondWithJSON(w, http.StatusOK, refund)
}

// CreateRefund handles POST /api/lms/orders/{orderId}/refund.
//
// Body: { amountCents?, reason? }. Admin-only. Refunds an order's payment
// in full or in part:
//
//   - Looks up the order; rejects anything that isn't in the "paid" state.
//   - Defaults amountCents to order.TotalCents when omitted (full refund).
//   - Inserts a Refund row (status=pending, processedBy=currentUser).
//   - If a succeeded PaymentTransaction exists for the order, marks the
//     refund as succeeded and stamps a gatewayRefundId derived from the
//     payment's gateway transaction id. (Future enhancement: actually call
//     the Stripe/PayPal refund API. The hook is in place — see
//     processGatewayRefund below.)
//   - On a full refund, flips the order status to "refunded", stamps
//     refundedAt, and cancels every enrollment created from the order
//     (status=refunded) — also decrementing each course's enrolledCount.
//   - On a partial refund, leaves the order status as "paid".
//   - Always appends an OrderActivity audit row (action="refunded").
//   - Emits payment.refunded + order.refunded (when full).
func (h *EcommerceRefundHandler) CreateRefund(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to issue refunds")
		return
	}

	orderIDStr := mux.Vars(r)["orderId"]
	orderID, err := primitive.ObjectIDFromHex(orderIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid order ID")
		return
	}

	var order models.Order
	if err := h.db.Orders().FindOne(r.Context(), bson.M{
		"_id":      orderID,
		"tenantId": ctx.TenantID,
	}).Decode(&order); err != nil {
		respondWithError(w, http.StatusNotFound, "Order not found")
		return
	}
	if order.Status != models.OrderStatusPaid {
		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("Only paid orders can be refunded (status=%s)", order.Status))
		return
	}

	var payload struct {
		AmountCents *int64 `json:"amountCents"`
		Reason      string `json:"reason"`
	}
	_ = json.NewDecoder(r.Body).Decode(&payload)

	refundAmount := order.TotalCents
	if payload.AmountCents != nil {
		refundAmount = *payload.AmountCents
	}
	if refundAmount <= 0 {
		respondWithError(w, http.StatusBadRequest, "amountCents must be positive")
		return
	}
	if refundAmount > order.TotalCents {
		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("amountCents (%d) exceeds order total (%d)", refundAmount, order.TotalCents))
		return
	}
	isFullRefund := refundAmount == order.TotalCents

	now := time.Now()
	currency := order.Currency
	if currency == "" {
		currency = "USD"
	}

	refund := models.Refund{
		TenantID:    ctx.TenantID,
		OrderID:     orderID,
		AmountCents: refundAmount,
		Currency:    currency,
		Reason:      strings.TrimSpace(payload.Reason),
		Status:      "pending",
		ProcessedBy: ctx.UserID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// Look up the latest succeeded PaymentTransaction for this order so we
	// can stamp the gatewayRefundId and link the refund to the payment.
	var payTxn models.PaymentTransaction
	payFindErr := h.db.PaymentTransactions().FindOne(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"orderId":  orderID,
		"status":   models.PaymentStatusSucceeded,
	}, options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: -1}})).Decode(&payTxn)
	if payFindErr == nil {
		refund.PaymentID = &payTxn.ID
	}

	// Best-effort gateway refund. The actual Stripe API call is intentionally
	// deferred until a PaymentGatewayConfig-backed stripe service is wired in
	// (see P3 next-actions in the worklog). For now we mark the refund as
	// succeeded and derive a deterministic gatewayRefundId from the payment
	// transaction so downstream reconciliation has a stable handle.
	gatewayRefundID, gatewayOK := h.processGatewayRefund(&payTxn, refundAmount, currency)
	if gatewayOK {
		refund.Status = "succeeded"
		refund.GatewayRefundID = gatewayRefundID
	} else {
		// No payment record (e.g. free order, manual refund). Still mark
		// succeeded so the refund is not stuck in pending — the order's
		// status will reflect the refund regardless.
		refund.Status = "succeeded"
	}
	refund.UpdatedAt = time.Now()

	result, err := h.db.Refunds().InsertOne(r.Context(), &refund)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create refund")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		refund.ID = oid
	}

	// Update the order: full refund flips status to "refunded" and stamps
	// refundedAt; partial refunds leave the order "paid" but the refund
	// record is preserved.
	if isFullRefund {
		if _, err := h.db.Orders().UpdateByID(r.Context(), orderID, bson.M{
			"$set": bson.M{
				"status":     models.OrderStatusRefunded,
				"refundedAt": now,
				"updatedAt":  now,
			},
		}); err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to update order")
			return
		}
		order.Status = models.OrderStatusRefunded
		order.RefundedAt = &now
		order.UpdatedAt = now

		// Cascade: cancel enrollments created from this order.
		var courseIDs []primitive.ObjectID
		for _, item := range order.Items {
			if item.ItemType == models.OrderItemTypeCourse {
				courseIDs = append(courseIDs, item.ReferenceID)
			}
		}
		if len(courseIDs) > 0 {
			_, _ = h.db.Enrollments().UpdateMany(r.Context(), bson.M{
				"tenantId": ctx.TenantID,
				"orderId":  orderID,
			}, bson.M{
				"$set": bson.M{
					"status":    models.EnrollmentStatusRefunded,
					"updatedAt": now,
				},
			})
			for _, cid := range courseIDs {
				_, _ = h.db.Courses().UpdateByID(r.Context(), cid, bson.M{
					"$inc": bson.M{"enrolledCount": -1},
				})
			}
		}
	}

	// Audit trail — always write an OrderActivity entry.
	activity := models.OrderActivity{
		TenantID:  ctx.TenantID,
		OrderID:   orderID,
		Action:    "refunded",
		ActorID:   &ctx.UserID,
		Notes:     refund.Reason,
		CreatedAt: now,
		Metadata: map[string]interface{}{
			"refundId":      refund.ID.Hex(),
			"amountCents":   refund.AmountCents,
			"fullRefund":    isFullRefund,
			"gatewayRefundId": refund.GatewayRefundID,
		},
	}
	_, _ = h.db.OrderActivity().InsertOne(r.Context(), &activity)

	// Events.
	h.emitter.Emit(events.Event{
		Type:      events.EventPaymentRefunded,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"orderId":      orderID.Hex(),
			"refundId":     refund.ID.Hex(),
			"amountCents":  refund.AmountCents,
			"fullRefund":   isFullRefund,
			"processedBy":  ctx.UserID.Hex(),
			"gatewayRefundId": refund.GatewayRefundID,
		},
	})
	if isFullRefund {
		h.emitter.Emit(events.Event{
			Type:      events.EventOrderRefunded,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":   ctx.TenantID.Hex(),
				"orderId":    orderID.Hex(),
				"userId":     order.UserID.Hex(),
				"refundedBy": ctx.UserID.Hex(),
				"totalCents": order.TotalCents,
				"refundId":   refund.ID.Hex(),
			},
		})
	}

	w.Header().Set("Location", "/api/lms/refunds/"+refund.ID.Hex())
	respondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"refund":    refund,
		"order":     order,
		"fullRefund": isFullRefund,
	})
}

// processGatewayRefund is the seam where a real Stripe/PayPal refund call
// will live once the PaymentGatewayConfig-backed service is wired in. For
// now it returns a deterministic placeholder gateway refund id derived from
// the payment transaction's gateway transaction id (or empty when there is
// no payment record). Returning ("", false) would leave the refund in
// "pending"; we currently still mark it succeeded in CreateRefund so the
// order status reflects the manual refund regardless.
//
// Future enhancement:
//   - Load PaymentGatewayConfig for the tenant.
//   - Initialise the stripe Service with the configured secret key.
//   - Call stripe.Refund with the payment's gatewayTransactionId + amount.
//   - Return the real refund id from the gateway.
func (h *EcommerceRefundHandler) processGatewayRefund(payTxn *models.PaymentTransaction, amountCents int64, currency string) (string, bool) {
	if payTxn == nil || payTxn.GatewayTransactionID == "" {
		return "", false
	}
	// Placeholder: derive a deterministic id so downstream reconciliation has
	// a stable handle. Replaced with the real gateway response once Stripe
	// is wired in.
	return fmt.Sprintf("rfd_%s_%d", payTxn.GatewayTransactionID, amountCents), true
}
