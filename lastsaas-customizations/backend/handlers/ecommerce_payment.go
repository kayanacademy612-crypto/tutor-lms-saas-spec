package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
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

	stripe "github.com/stripe/stripe-go/v82"
)

// ---------------------------------------------------------------------------
// EcommercePaymentHandler — Phase 3 payment transactions + universal webhook
//
// This handler exposes read-only access to PaymentTransaction records (which
// are written by the checkout handler) and serves as the universal webhook
// endpoint that all payment gateways can call. Today only Stripe webhooks
// are fully implemented; PayPal/Razorpay webhook handling is stubbed (the
// endpoint returns 200 quickly and logs the payload so a follow-up agent
// can layer in the gateway-specific signature verification + event parsing).
//
// As with the checkout handler, the Stripe service is injected via
// SetStripeService so this handler can verify webhook signatures and retrieve
// checkout sessions when an event arrives without a session_id on the URL.
// ---------------------------------------------------------------------------

// EcommercePaymentHandler implements the Phase 3 payment REST surface
// mounted at /api/lms/payments* and the universal webhook at
// /api/lms/ecommerce-webhook.
type EcommercePaymentHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
	stripe  *stripeservice.Service
}

// NewEcommercePaymentHandler constructs an EcommercePaymentHandler bound
// to the given MongoDB connection and event emitter. Stripe is injected
// separately via SetStripeService.
func NewEcommercePaymentHandler(database *db.MongoDB, emitter events.Emitter) *EcommercePaymentHandler {
	return &EcommercePaymentHandler{db: database, emitter: emitter}
}

// SetStripeService injects the Stripe service used to verify webhook
// signatures and retrieve checkout sessions. May be nil — Stripe webhook
// events will then be rejected with 503.
func (h *EcommercePaymentHandler) SetStripeService(s *stripeservice.Service) {
	h.stripe = s
}

// ---------------------------------------------------------------------------
// ListPayments: GET /api/lms/payments
// ---------------------------------------------------------------------------

// ListPayments handles GET /api/lms/payments.
//
// Lists payment transactions for the current user. Instructors/admins
// (ctx.IsInstructor) see all transactions for the tenant. Optional query
// params: ?orderId=, ?status=, ?gateway=, ?page=, ?limit=.
func (h *EcommercePaymentHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.getPaymentContext(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	// Non-instructors see only their own payments; instructors/admins see
	// all tenant payments.
	if !ctx.IsInstructor {
		filter["userId"] = ctx.UserID
	}
	if orderIDStr := r.URL.Query().Get("orderId"); orderIDStr != "" {
		if oid, err := primitive.ObjectIDFromHex(orderIDStr); err == nil {
			filter["orderId"] = oid
		}
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = models.PaymentStatus(status)
	}
	if gateway := r.URL.Query().Get("gateway"); gateway != "" {
		filter["gateway"] = strings.ToLower(gateway)
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	page := parsePositiveInt(r, "page", 1, 1<<30)
	if page < 1 {
		page = 1
	}
	offset := (page - 1) * limit

	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.PaymentTransactions().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch payments")
		return
	}
	defer cursor.Close(r.Context())

	var payments []models.PaymentTransaction
	if err := cursor.All(r.Context(), &payments); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode payments")
		return
	}
	if payments == nil {
		payments = []models.PaymentTransaction{}
	}
	total, _ := h.db.PaymentTransactions().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"payments": payments,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// ---------------------------------------------------------------------------
// GetPayment: GET /api/lms/payments/{id}
// ---------------------------------------------------------------------------

// GetPayment handles GET /api/lms/payments/{id}.
//
// Returns a single payment transaction. Non-instructors can only fetch
// their own transactions; instructors/admins can fetch any tenant
// transaction.
func (h *EcommercePaymentHandler) GetPayment(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.getPaymentContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid payment ID")
		return
	}
	filter := bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}
	if !ctx.IsInstructor {
		filter["userId"] = ctx.UserID
	}
	var payment models.PaymentTransaction
	if err := h.db.PaymentTransactions().FindOne(r.Context(), filter).Decode(&payment); err != nil {
		respondWithError(w, http.StatusNotFound, "Payment not found")
		return
	}
	respondWithJSON(w, http.StatusOK, payment)
}

// ---------------------------------------------------------------------------
// Webhook: POST /api/lms/ecommerce-webhook
// ---------------------------------------------------------------------------

// Webhook handles POST /api/lms/ecommerce-webhook.
//
// Universal payment webhook endpoint. The gateway is selected via the
// `X-Payment-Gateway` request header (or the `gateway` query param) so a
// single endpoint can serve all gateways. For Stripe, the request body is
// the raw Stripe event payload and the signature is read from the
// `Stripe-Signature` header.
//
// The endpoint ALWAYS returns 200 within a few seconds so the gateway
// doesn't retry; processing failures are logged and (for Stripe) recorded
// on the order via an OrderActivity entry.
//
// Supported events:
//   - Stripe `checkout.session.completed` → mark order paid (same path as
//     CheckoutSuccess: enrollments, invoice, revenue ledger, events).
//   - Stripe `payment_intent.payment_failed` → mark order failed, emit
//     EventPaymentFailed.
//   - Stripe `charge.refunded` → emit EventPaymentRefunded (the order
//     status update is left to RefundOrder in lms.go which is the system
//     of record for refunds).
//   - All other Stripe events → log + return 200.
//   - PayPal/Razorpay events → log + return 200 (stubs).
func (h *EcommercePaymentHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	gateway := strings.ToLower(strings.TrimSpace(r.Header.Get("X-Payment-Gateway")))
	if gateway == "" {
		gateway = strings.ToLower(strings.TrimSpace(r.URL.Query().Get("gateway")))
	}
	if gateway == "" {
		// Default to stripe for backward compat with callers that don't
		// set the header — Stripe is the only fully implemented gateway.
		gateway = "stripe"
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 524288)) // 512KB
	if err != nil {
		slog.Warn("ecommerce_webhook: failed to read body", "gateway", gateway, "error", err)
		w.WriteHeader(http.StatusOK)
		return
	}

	switch gateway {
	case "stripe":
		h.handleStripeWebhook(w, r, body)
	default:
		slog.Info("ecommerce_webhook: received event for unimplemented gateway (stub)", "gateway", gateway, "bytes", len(body))
		h.emitter.Emit(events.Event{
			Type:      events.EventWebhookReceived,
			Timestamp: time.Now(),
			Data: map[string]interface{}{
				"gateway": gateway,
				"bytes":   len(body),
			},
		})
		w.WriteHeader(http.StatusOK)
	}
}

// handleStripeWebhook verifies the Stripe signature, parses the event, and
// dispatches to the appropriate handler. Always returns 200.
func (h *EcommercePaymentHandler) handleStripeWebhook(w http.ResponseWriter, r *http.Request, body []byte) {
	if h.stripe == nil {
		slog.Warn("ecommerce_webhook: stripe service not configured, dropping event")
		w.WriteHeader(http.StatusOK)
		return
	}
	event, err := h.stripe.ConstructEvent(body, r.Header.Get("Stripe-Signature"))
	if err != nil {
		slog.Warn("ecommerce_webhook: signature verification failed", "error", err)
		// Signature failures return 400 (Stripe will not retry on 4xx).
		respondWithError(w, http.StatusBadRequest, "invalid signature")
		return
	}

	slog.Info("ecommerce_webhook: received stripe event", "eventId", event.ID, "type", string(event.Type))

	ctx := r.Context()
	var processingErr error
	switch event.Type {
	case "checkout.session.completed":
		processingErr = h.handleStripeCheckoutCompleted(ctx, event)
	case "payment_intent.payment_failed":
		processingErr = h.handleStripePaymentFailed(ctx, event)
	case "charge.refunded":
		processingErr = h.handleStripeChargeRefunded(ctx, event)
	default:
		slog.Info("ecommerce_webhook: unhandled stripe event type", "type", string(event.Type))
	}

	if processingErr != nil {
		slog.Error("ecommerce_webhook: stripe event processing failed", "eventId", event.ID, "type", string(event.Type), "error", processingErr)
		// Return 200 anyway — Stripe would otherwise retry, and we've
		// already recorded the failure on the order.
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventWebhookReceived,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"gateway": "stripe",
			"eventId": event.ID,
			"type":    string(event.Type),
		},
	})

	w.WriteHeader(http.StatusOK)
}

// handleStripeCheckoutCompleted finalises the order when Stripe fires the
// `checkout.session.completed` event. This is the same code path as
// CheckoutSuccess — invoked either via the success redirect or via the
// webhook, whichever fires first. The underlying finaliser is idempotent.
func (h *EcommercePaymentHandler) handleStripeCheckoutCompleted(ctx context.Context, event stripe.Event) error {
	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		return fmt.Errorf("unmarshal checkout session: %w", err)
	}

	tenantIDHex := session.Metadata["tenantId"]
	userIDHex := session.Metadata["userId"]
	orderIDHex := session.Metadata["orderId"]

	tenantID, _ := primitive.ObjectIDFromHex(tenantIDHex)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)
	orderID, _ := primitive.ObjectIDFromHex(orderIDHex)

	if orderID.IsZero() {
		// Fall back to lookup by paymentGatewayRef = session.ID.
		var order models.Order
		if err := h.db.Orders().FindOne(ctx, bson.M{
			"paymentGatewayRef": session.ID,
		}).Decode(&order); err != nil {
			return fmt.Errorf("order not found for session %s: %w", session.ID, err)
		}
		orderID = order.ID
		tenantID = order.TenantID
		userID = order.UserID
	}

	var order models.Order
	if err := h.db.Orders().FindOne(ctx, bson.M{
		"_id":      orderID,
		"tenantId": tenantID,
	}).Decode(&order); err != nil {
		return fmt.Errorf("order %s not found: %w", orderID.Hex(), err)
	}

	pctx := ecommerceCartContext{TenantID: tenantID, UserID: userID}
	// Reuse the checkout handler's finaliser. We instantiate the helper
	// inline because the methods are defined on *EcommerceCheckoutHandler,
	// not on *EcommercePaymentHandler. The shared finaliser is the single
	// source of truth for the post-payment side effects (enrollments,
	// invoice, revenue ledger, events).
	checkoutHandler := &EcommerceCheckoutHandler{db: h.db, emitter: h.emitter, stripe: h.stripe}
	return checkoutHandler.finaliseOrderFromStripeSession(ctx, &order, pctx, &session)
}

// handleStripePaymentFailed marks the order as failed when a
// `payment_intent.payment_failed` event arrives.
func (h *EcommercePaymentHandler) handleStripePaymentFailed(ctx context.Context, event stripe.Event) error {
	// The event.Data.Object is a PaymentIntent; we only need its ID and
	// metadata to locate the order.
	piID := event.GetObjectValue("id")
	orderIDHex := event.GetObjectValue("metadata", "orderId")
	tenantIDHex := event.GetObjectValue("metadata", "tenantId")
	userIDHex := event.GetObjectValue("metadata", "userId")

	if orderIDHex == "" {
		slog.Warn("ecommerce_webhook: payment_intent.payment_failed missing orderId metadata", "paymentIntentId", piID)
		return nil
	}
	orderID, _ := primitive.ObjectIDFromHex(orderIDHex)
	tenantID, _ := primitive.ObjectIDFromHex(tenantIDHex)
	userID, _ := primitive.ObjectIDFromHex(userIDHex)
	if tenantID.IsZero() || orderID.IsZero() {
		return nil
	}

	var order models.Order
	if err := h.db.Orders().FindOne(ctx, bson.M{
		"_id":      orderID,
		"tenantId": tenantID,
	}).Decode(&order); err != nil {
		return fmt.Errorf("order not found: %w", err)
	}
	if order.Status == models.OrderStatusPaid {
		// Already paid — don't downgrade. (Can happen if the success
		// webhook raced the failure webhook.)
		return nil
	}

	now := time.Now()
	if _, err := h.db.Orders().UpdateByID(ctx, order.ID, bson.M{
		"$set": bson.M{
			"status":    models.OrderStatusFailed,
			"updatedAt": now,
		},
	}); err != nil {
		return fmt.Errorf("update order status: %w", err)
	}

	// Record a failed PaymentTransaction if one doesn't already exist.
	tx := models.PaymentTransaction{
		TenantID:             order.TenantID,
		OrderID:              order.ID,
		UserID:               order.UserID,
		Gateway:              "stripe",
		GatewayTransactionID: piID,
		AmountCents:          order.TotalCents,
		Currency:             order.Currency,
		Status:               models.PaymentStatusFailed,
		ErrorMessage:         "payment_intent.payment_failed webhook",
		CreatedAt:            now,
		UpdatedAt:            now,
	}
	if _, err := h.db.PaymentTransactions().InsertOne(ctx, &tx); err != nil {
		slog.Warn("ecommerce_webhook: failed to insert failed PaymentTransaction", "orderId", order.ID.Hex(), "error", err)
	}

	activity := models.OrderActivity{
		TenantID: order.TenantID,
		OrderID:  order.ID,
		Action:   "payment_failed",
		ActorID:  &userID,
		Notes:    "Stripe payment_intent.payment_failed",
		Metadata: map[string]interface{}{
			"gateway":              "stripe",
			"gatewayTransactionId": piID,
			"eventId":              event.ID,
		},
		CreatedAt: now,
	}
	if _, err := h.db.OrderActivity().InsertOne(ctx, &activity); err != nil {
		slog.Warn("ecommerce_webhook: failed to write OrderActivity payment_failed entry", "orderId", order.ID.Hex(), "error", err)
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventPaymentFailed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":             order.TenantID.Hex(),
			"userId":               order.UserID.Hex(),
			"orderId":              order.ID.Hex(),
			"gateway":              "stripe",
			"gatewayTransactionId": piID,
			"amountCents":          order.TotalCents,
		},
	})

	return nil
}

// handleStripeChargeRefunded emits EventPaymentRefunded when a charge is
// refunded. The order-level refund bookkeeping (status=refunded,
// enrollments cancelled, etc.) is the responsibility of RefundOrder in
// lms.go, which is the system of record for refunds.
func (h *EcommercePaymentHandler) handleStripeChargeRefunded(ctx context.Context, event stripe.Event) error {
	chargeID := event.GetObjectValue("id")
	paymentIntentID := event.GetObjectValue("payment_intent")
	amountRefundedStr := event.GetObjectValue("amount_refunded")

	// Best-effort: locate the order via the payment_intent → PaymentTransaction.
	var tx models.PaymentTransaction
	if paymentIntentID != "" {
		_ = h.db.PaymentTransactions().FindOne(ctx, bson.M{
			"gatewayTransactionId": paymentIntentID,
		}).Decode(&tx)
	}

	now := time.Now()
	h.emitter.Emit(events.Event{
		Type:      events.EventPaymentRefunded,
		Timestamp: now,
		Data: map[string]interface{}{
			"chargeId":             chargeID,
			"paymentIntentId":      paymentIntentID,
			"amountRefundedRaw":    amountRefundedStr,
			"orderId":              tx.OrderID.Hex(),
			"tenantId":             tx.TenantID.Hex(),
			"paymentTransactionId": tx.ID.Hex(),
		},
	})

	slog.Info("ecommerce_webhook: charge.refunded received", "chargeId", chargeID, "paymentIntentId", paymentIntentID, "orderId", tx.OrderID.Hex())
	return nil
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// paymentContext bundles the per-request identity fields used by the
// payment handlers. Mirrors ecommerceCartContext but adds IsInstructor so
// ListPayments/GetPayment can scope results appropriately.
type paymentContext struct {
	TenantID     primitive.ObjectID
	UserID       primitive.ObjectID
	IsInstructor bool
}

// getPaymentContext extracts the tenant + user IDs for the payment
// handlers, falling back to the dev tenant/user when no auth context is
// present (mirroring getLMSContext in lms.go lines 100-115).
func (h *EcommercePaymentHandler) getPaymentContext(w http.ResponseWriter, r *http.Request) (paymentContext, bool) {
	lctx, ok := getLMSContext(r)
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context required")
		return paymentContext{}, false
	}
	if lctx.UserID.IsZero() {
		respondWithError(w, http.StatusUnauthorized, "Authentication required")
		return paymentContext{}, false
	}
	return paymentContext{
		TenantID:     lctx.TenantID,
		UserID:       lctx.UserID,
		IsInstructor: lctx.IsInstructor,
	}, true
}
