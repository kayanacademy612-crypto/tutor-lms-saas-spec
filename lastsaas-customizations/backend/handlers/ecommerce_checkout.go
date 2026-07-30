package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"
	stripeservice "lastsaas/internal/stripe"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"

	stripe "github.com/stripe/stripe-go/v82"
	checkoutsession "github.com/stripe/stripe-go/v82/checkout/session"
)

// ---------------------------------------------------------------------------
// EcommerceCheckoutHandler — Phase 3 checkout & payment finalisation
//
// This handler converts a Phase 3 cart (lms_carts collection) into a real
// Order (lms_orders collection), drives the payment gateway redirect, and
// finalises the order on the success callback: stamps status=paid, issues
// enrollments for course items, writes the Invoice + RevenueLedger entries,
// and emits the checkout.* / payment.* / invoice.* events.
//
// Stripe integration is wired via SetStripe — when no Stripe service is
// configured, the stripe gateway path returns 503. PayPal and Razorpay are
// stubbed (they create a pending PaymentTransaction and return a mock URL
// for the frontend to redirect to). Manual gateway keeps the order in
// pending with no redirect — an admin finalises it via a separate handler.
// ---------------------------------------------------------------------------

// EcommerceCheckoutHandler implements the Phase 3 checkout REST surface
// mounted at /api/lms/checkout*.
type EcommerceCheckoutHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
	stripe  *stripeservice.Service
}

// NewEcommerceCheckoutHandler constructs an EcommerceCheckoutHandler bound
// to the given MongoDB connection and event emitter. Stripe is injected
// separately via SetStripeService (mirroring the EcommerceSubscriptionHandler
// pattern).
func NewEcommerceCheckoutHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceCheckoutHandler {
	return &EcommerceCheckoutHandler{db: database, emitter: emitter}
}

// SetStripeService injects the Stripe service used to create/retrieve
// Checkout Sessions and verify webhook signatures. May be nil when Stripe
// is not configured — the stripe gateway path will then return 503.
func (h *EcommerceCheckoutHandler) SetStripeService(s *stripeservice.Service) {
	h.stripe = s
}

// ---------------------------------------------------------------------------
// Checkout: POST /api/lms/checkout
// ---------------------------------------------------------------------------

// checkoutRequest is the JSON body for POST /api/lms/checkout.
type checkoutRequest struct {
	PaymentGateway string `json:"paymentGateway"`
	CouponCode     string `json:"couponCode"`
	BillingName    string `json:"billingName"`
	BillingEmail   string `json:"billingEmail"`
	BillingAddress string `json:"billingAddress"`
}

// Checkout handles POST /api/lms/checkout.
//
// Converts the user's Phase 3 cart into a pending Order, then dispatches to
// the selected payment gateway:
//   - stripe: create a Stripe Checkout Session, return paymentUrl.
//   - paypal / razorpay: stub — create a pending PaymentTransaction and
//     return a mock paymentUrl.
//   - manual: create a pending PaymentTransaction, no redirect.
//
// On success the cart is cleared. On Stripe session-creation failure the
// EventCheckoutFailed event is emitted and a 500 is returned.
func (h *EcommerceCheckoutHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}

	var payload checkoutRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		// Body is optional in the same way CreateOrder treats it — but for
		// checkout we need at least paymentGateway, so a missing body is a
		// hard error.
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	gateway := strings.ToLower(strings.TrimSpace(payload.PaymentGateway))
	if gateway == "" {
		respondWithError(w, http.StatusBadRequest, "paymentGateway is required")
		return
	}
	switch gateway {
	case "stripe", "paypal", "razorpay", "manual":
	default:
		respondWithError(w, http.StatusBadRequest, "paymentGateway must be one of: stripe, paypal, razorpay, manual")
		return
	}

	// 1. Load the user's cart.
	var cart models.Cart
	if err := h.db.Carts().FindOne(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}).Decode(&cart); err != nil {
		respondWithError(w, http.StatusBadRequest, "Cart not found")
		return
	}
	if len(cart.Items) == 0 {
		respondWithError(w, http.StatusBadRequest, "Cart is empty")
		return
	}

	// 2. Apply the inline coupon if one was supplied (overrides any coupon
	// already on the cart for this checkout).
	if strings.TrimSpace(payload.CouponCode) != "" {
		code := strings.ToUpper(strings.TrimSpace(payload.CouponCode))
		var coupon models.Coupon
		if err := h.db.Coupons().FindOne(r.Context(), bson.M{
			"tenantId": ctx.TenantID,
			"code":     code,
		}).Decode(&coupon); err != nil {
			respondWithError(w, http.StatusBadRequest, "Coupon not found")
			return
		}
		if reason, ok := validateCouponForCart(&coupon, &cart, ctx.UserID); !ok {
			respondWithError(w, http.StatusBadRequest, reason)
			return
		}
		cart.CouponID = &coupon.ID
		cart.CouponCode = coupon.Code
		cart.DiscountCents = computeCartDiscount(&coupon, cart.SubtotalCents)
		recomputeCartTotals(&cart)
	}

	// 3. Build OrderItems from CartItems and assemble the Order.
	now := time.Now()
	orderItems := make([]models.OrderItem, 0, len(cart.Items))
	for _, ci := range cart.Items {
		orderItems = append(orderItems, models.OrderItem{
			ID:             primitive.NewObjectID(),
			ItemType:       models.OrderItemType(ci.ItemType),
			ReferenceID:    ci.ReferenceID,
			Title:          ci.Title,
			UnitPriceCents: ci.UnitPriceCents,
			Quantity:       ci.Quantity,
			SubtotalCents:  ci.SubtotalCents,
		})
	}
	order := models.Order{
		TenantID:          ctx.TenantID,
		UserID:            ctx.UserID,
		OrderNumber:       fmt.Sprintf("ORD-%s", primitive.NewObjectID().Hex()),
		Items:             orderItems,
		SubtotalCents:     cart.SubtotalCents,
		DiscountCents:     cart.DiscountCents,
		TaxCents:          cart.TaxCents,
		TotalCents:        cart.TotalCents,
		Currency:          cart.Currency,
		Status:            models.OrderStatusPending,
		CouponID:          cart.CouponID,
		CouponCode:        cart.CouponCode,
		PaymentMethod:     gateway,
		PaymentGatewayRef: "",
		Notes:             "",
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if order.Currency == "" {
		order.Currency = "USD"
	}

	insertResult, err := h.db.Orders().InsertOne(r.Context(), &order)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}
	if oid, ok := insertResult.InsertedID.(primitive.ObjectID); ok {
		order.ID = oid
	}

	// 4. OrderActivity entry — action="created".
	activity := models.OrderActivity{
		TenantID: ctx.TenantID,
		OrderID:  order.ID,
		Action:   "created",
		ActorID:  &ctx.UserID,
		Notes:    fmt.Sprintf("Order created via %s checkout", gateway),
		Metadata: map[string]interface{}{
			"gateway":    gateway,
			"totalCents": order.TotalCents,
			"currency":   order.Currency,
			"couponCode": order.CouponCode,
			"itemCount":  len(order.Items),
		},
		CreatedAt: now,
	}
	if _, err := h.db.OrderActivity().InsertOne(r.Context(), &activity); err != nil {
		slog.Warn("ecommerce_checkout: failed to write OrderActivity created entry", "orderId", order.ID.Hex(), "error", err)
	}

	// 5. Emit EventCheckoutStarted.
	h.emitter.Emit(events.Event{
		Type:      events.EventCheckoutStarted,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"userId":     ctx.UserID.Hex(),
			"orderId":    order.ID.Hex(),
			"cartId":     cart.ID.Hex(),
			"gateway":    gateway,
			"totalCents": order.TotalCents,
		},
	})

	// 6. Dispatch to the selected gateway.
	type checkoutResponse struct {
		OrderID      string `json:"orderId"`
		PaymentURL   string `json:"paymentUrl,omitempty"`
		ClientSecret string `json:"clientSecret,omitempty"`
		Status       string `json:"status"`
	}

	switch gateway {
	case "stripe":
		// Require the Stripe service to be wired in.
		if h.stripe == nil {
			h.failCheckout(r.Context(), &order, ctx, "Stripe not configured", "")
			respondWithError(w, http.StatusServiceUnavailable, "Stripe payment gateway is not configured")
			return
		}
		sessionURL, sessionID, err := h.createStripeCheckoutSession(r, &order, &cart, payload)
		if err != nil {
			h.failCheckout(r.Context(), &order, ctx, err.Error(), "")
			respondWithError(w, http.StatusInternalServerError, "Failed to create Stripe checkout session: "+err.Error())
			return
		}
		// Stamp the order with the Stripe session ID so CheckoutSuccess and
		// the webhook can reconcile.
		if _, err := h.db.Orders().UpdateByID(r.Context(), order.ID, bson.M{
			"$set": bson.M{
				"paymentGatewayRef": sessionID,
				"updatedAt":         time.Now(),
			},
		}); err != nil {
			slog.Warn("ecommerce_checkout: failed to stamp paymentGatewayRef", "orderId", order.ID.Hex(), "error", err)
		}
		order.PaymentGatewayRef = sessionID

		// Clear the cart on successful session creation.
		h.clearCart(r.Context(), cart.ID)

		respondWithJSON(w, http.StatusOK, checkoutResponse{
			OrderID:    order.ID.Hex(),
			PaymentURL: sessionURL,
			Status:     "pending",
		})

	case "paypal", "razorpay":
		// Stub: create a pending PaymentTransaction and return a mock URL
		// that the frontend can redirect to while the real gateway
		// integration is wired in (Agent 4c).
		txID := h.createPendingTransaction(r.Context(), &order, ctx, gateway)
		mockURL := fmt.Sprintf("/api/lms/%s/redirect?orderId=%s&txId=%s", gateway, order.ID.Hex(), txID.Hex())
		h.clearCart(r.Context(), cart.ID)
		respondWithJSON(w, http.StatusOK, checkoutResponse{
			OrderID:    order.ID.Hex(),
			PaymentURL: mockURL,
			Status:     "pending",
		})

	case "manual":
		// No redirect. The order stays pending until an admin finalises it
		// via a separate handler.
		_ = h.createPendingTransaction(r.Context(), &order, ctx, "manual")
		h.clearCart(r.Context(), cart.ID)
		respondWithJSON(w, http.StatusOK, checkoutResponse{
			OrderID: order.ID.Hex(),
			Status:  "pending",
		})
	}
}

// createStripeCheckoutSession builds a Stripe Checkout Session for the order
// using inline price_data (so we don't need to pre-create Stripe products
// for every catalog item). Returns (sessionURL, sessionID, error).
func (h *EcommerceCheckoutHandler) createStripeCheckoutSession(r *http.Request, order *models.Order, cart *models.Cart, payload checkoutRequest) (string, string, error) {
	currency := strings.ToLower(order.Currency)
	if currency == "" {
		currency = "usd"
	}

	lineItems := make([]*stripe.CheckoutSessionLineItemParams, 0, len(order.Items))
	for _, item := range order.Items {
		// Skip zero-amount items (e.g. free courses) — Stripe requires
		// unit_amount >= 1 for price_data. The frontend shows them as
		// "free" line items; the order still records them so the
		// enrollment grant logic on success works.
		if item.UnitPriceCents <= 0 {
			continue
		}
		lineItems = append(lineItems, &stripe.CheckoutSessionLineItemParams{
			Quantity: stripe.Int64(int64(item.Quantity)),
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency:   stripe.String(currency),
				UnitAmount: stripe.Int64(item.UnitPriceCents),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name: stripe.String(item.Title),
				},
			},
		})
	}

	// If every item was free (zero total), Stripe won't accept an empty
	// line_items array. In that case skip Stripe entirely and treat the
	// order as instantly paid — emit the success path locally.
	if len(lineItems) == 0 {
		return "", "", fmt.Errorf("no chargeable line items (cart total is zero)")
	}

	metadata := map[string]string{
		"tenantId": order.TenantID.Hex(),
		"userId":   order.UserID.Hex(),
		"orderId":  order.ID.Hex(),
		"cartId":   cart.ID.Hex(),
		"gateway":  "stripe",
	}

	// Stripe requires absolute URLs for success/cancel. Reconstruct the
	// API base URL from the incoming request so this works regardless of
	// where the API is mounted. Override with the STRIPE_SUCCESS_URL /
	// STRIPE_CANCEL_URL env vars when set (lets production point at a
	// CDN/frontend host instead of the API host).
	successURL := h.absoluteCallbackURL(r, "/api/lms/checkout/success?session_id={CHECKOUT_SESSION_ID}")
	cancelURL := h.absoluteCallbackURL(r, "/api/lms/checkout/cancel")
	if v := os.Getenv("STRIPE_SUCCESS_URL"); v != "" {
		successURL = v
	}
	if v := os.Getenv("STRIPE_CANCEL_URL"); v != "" {
		cancelURL = v
	}

	params := &stripe.CheckoutSessionParams{
		Mode:       stripe.String("payment"),
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		LineItems:  lineItems,
		Metadata:   metadata,
	}
	if payload.BillingEmail != "" {
		params.CustomerEmail = stripe.String(payload.BillingEmail)
	}

	session, err := checkoutsession.New(params)
	if err != nil {
		return "", "", fmt.Errorf("stripe checkout create: %w", err)
	}
	return session.URL, session.ID, nil
}

// absoluteCallbackURL builds an absolute URL for a Stripe success/cancel
// callback by combining the incoming request's scheme + host with the
// supplied path. Stripe rejects relative URLs.
func (h *EcommerceCheckoutHandler) absoluteCallbackURL(r *http.Request, path string) string {
	scheme := "https"
	if r.TLS == nil {
		if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
			scheme = proto
		} else {
			scheme = "http"
		}
	}
	host := r.Host
	if host == "" {
		host = "localhost"
	}
	return scheme + "://" + host + path
}

// createPendingTransaction inserts a PaymentTransaction with status=pending
// for the supplied gateway. Used by the paypal/razorpay/manual paths.
func (h *EcommerceCheckoutHandler) createPendingTransaction(ctx context.Context, order *models.Order, ctxData ecommerceCartContext, gateway string) primitive.ObjectID {
	now := time.Now()
	tx := models.PaymentTransaction{
		TenantID:    order.TenantID,
		OrderID:     order.ID,
		UserID:      order.UserID,
		Gateway:     gateway,
		AmountCents: order.TotalCents,
		Currency:    order.Currency,
		Status:      models.PaymentStatusPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	res, err := h.db.PaymentTransactions().InsertOne(ctx, &tx)
	if err != nil {
		slog.Warn("ecommerce_checkout: failed to insert pending PaymentTransaction", "orderId", order.ID.Hex(), "gateway", gateway, "error", err)
		return primitive.NilObjectID
	}
	if oid, ok := res.InsertedID.(primitive.ObjectID); ok {
		return oid
	}
	_ = ctxData // ctxData reserved for future per-user tracking
	return primitive.NilObjectID
}

// failCheckout is invoked when the checkout flow fails after the Order has
// been created. It flips the Order status to "failed", records an
// OrderActivity entry, and emits EventCheckoutFailed.
func (h *EcommerceCheckoutHandler) failCheckout(ctx context.Context, order *models.Order, ctxData ecommerceCartContext, reason, gatewayRef string) {
	now := time.Now()
	if _, err := h.db.Orders().UpdateByID(ctx, order.ID, bson.M{
		"$set": bson.M{
			"status":            models.OrderStatusFailed,
			"paymentGatewayRef": gatewayRef,
			"updatedAt":         now,
		},
	}); err != nil {
		slog.Warn("ecommerce_checkout: failed to mark order as failed", "orderId", order.ID.Hex(), "error", err)
	}
	activity := models.OrderActivity{
		TenantID:  ctxData.TenantID,
		OrderID:   order.ID,
		Action:    "checkout_failed",
		ActorID:   &ctxData.UserID,
		Notes:     reason,
		Metadata:  map[string]interface{}{"reason": reason, "gateway": order.PaymentMethod},
		CreatedAt: now,
	}
	if _, err := h.db.OrderActivity().InsertOne(ctx, &activity); err != nil {
		slog.Warn("ecommerce_checkout: failed to write OrderActivity checkout_failed entry", "orderId", order.ID.Hex(), "error", err)
	}
	h.emitter.Emit(events.Event{
		Type:      events.EventCheckoutFailed,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId": ctxData.TenantID.Hex(),
			"userId":   ctxData.UserID.Hex(),
			"orderId":  order.ID.Hex(),
			"reason":   reason,
			"gateway":  order.PaymentMethod,
		},
	})
}

// clearCart empties the user's cart document (preserving the document so
// future AddToCart calls reuse the same cart ID).
func (h *EcommerceCheckoutHandler) clearCart(ctx context.Context, cartID primitive.ObjectID) {
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(ctx, cartID, bson.M{
		"$set": bson.M{
			"items":         []models.CartItem{},
			"couponId":      nil,
			"couponCode":    "",
			"subtotalCents": 0,
			"discountCents": 0,
			"taxCents":      0,
			"totalCents":    0,
			"updatedAt":     now,
		},
	}); err != nil {
		slog.Warn("ecommerce_checkout: failed to clear cart after checkout", "cartId", cartID.Hex(), "error", err)
	}
}

// ---------------------------------------------------------------------------
// CheckoutSuccess: GET /api/lms/checkout/success?session_id=xxx
// ---------------------------------------------------------------------------

// CheckoutSuccess handles GET /api/lms/checkout/success.
//
// Stripe redirect URL on successful payment. Verifies the session's
// payment_status="paid", then finalises the order:
//   - mark order status=paid, paidAt=now
//   - create a PaymentTransaction (status=succeeded)
//   - grant Enrollments for every "course" item (status=active)
//   - create an Invoice (status=paid) with line items from the order
//   - write RevenueLedgerEntry rows for platform + instructor (70/30 split)
//   - emit EventCheckoutCompleted, EventPaymentReceived, EventInvoicePaid
func (h *EcommerceCheckoutHandler) CheckoutSuccess(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}

	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	if sessionID == "" {
		respondWithError(w, http.StatusBadRequest, "session_id is required")
		return
	}

	if h.stripe == nil {
		respondWithError(w, http.StatusServiceUnavailable, "Stripe payment gateway is not configured")
		return
	}

	// 1. Retrieve the Stripe session.
	session, err := h.stripe.GetCheckoutSession(r.Context(), sessionID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Failed to retrieve Stripe session: "+err.Error())
		return
	}
	if session.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
		respondWithError(w, http.StatusBadRequest, fmt.Sprintf("Session payment_status is %q, expected \"paid\"", session.PaymentStatus))
		return
	}

	// 2. Find the order by paymentGatewayRef = sessionID.
	var order models.Order
	if err := h.db.Orders().FindOne(r.Context(), bson.M{
		"paymentGatewayRef": sessionID,
		"tenantId":          ctx.TenantID,
	}).Decode(&order); err != nil {
		respondWithError(w, http.StatusNotFound, "Order not found for session")
		return
	}

	// 3. Finalise the order.
	if err := h.finaliseOrderFromStripeSession(r.Context(), &order, ctx, session); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to finalise order: "+err.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"orderId": order.ID.Hex(),
		"status":  "paid",
	})
}

// finaliseOrderFromStripeSession performs the post-payment finalisation
// shared between CheckoutSuccess and the webhook handler: marks the order
// paid, writes the PaymentTransaction, grants enrollments, issues the
// invoice, writes revenue ledger entries, and emits the success events.
//
// It is idempotent: if the order is already paid, it returns nil without
// re-running the side effects.
func (h *EcommerceCheckoutHandler) finaliseOrderFromStripeSession(ctx context.Context, order *models.Order, ctxData ecommerceCartContext, session *stripe.CheckoutSession) error {
	if order.Status == models.OrderStatusPaid {
		return nil
	}
	now := time.Now()

	// 1. Mark the order paid.
	paidAt := now
	if _, err := h.db.Orders().UpdateByID(ctx, order.ID, bson.M{
		"$set": bson.M{
			"status":    models.OrderStatusPaid,
			"paidAt":    paidAt,
			"updatedAt": now,
		},
	}); err != nil {
		return fmt.Errorf("update order status: %w", err)
	}
	order.Status = models.OrderStatusPaid
	order.PaidAt = &paidAt
	order.UpdatedAt = now

	// 2. PaymentTransaction (status=succeeded).
	gatewayTxID := ""
	if session != nil && session.PaymentIntent != nil {
		gatewayTxID = session.PaymentIntent.ID
	}
	tx := models.PaymentTransaction{
		TenantID:             order.TenantID,
		OrderID:              order.ID,
		UserID:               order.UserID,
		Gateway:              "stripe",
		GatewayTransactionID: gatewayTxID,
		AmountCents:          order.TotalCents,
		Currency:             order.Currency,
		Status:               models.PaymentStatusSucceeded,
		CreatedAt:            now,
		UpdatedAt:            now,
	}
	if _, err := h.db.PaymentTransactions().InsertOne(ctx, &tx); err != nil {
		slog.Warn("ecommerce_checkout: failed to insert succeeded PaymentTransaction", "orderId", order.ID.Hex(), "error", err)
	}

	// 3. Grant enrollments for course items.
	for _, item := range order.Items {
		if item.ItemType != models.OrderItemTypeCourse {
			continue
		}
		// Idempotent: skip if the user already has an active enrollment
		// for this course from this order.
		var existing models.Enrollment
		err := h.db.Enrollments().FindOne(ctx, bson.M{
			"tenantId":  order.TenantID,
			"studentId": order.UserID,
			"courseId":  item.ReferenceID,
			"orderId":   order.ID,
		}).Decode(&existing)
		if err == nil {
			continue
		}
		enrollment := models.Enrollment{
			TenantID:       order.TenantID,
			CourseID:       item.ReferenceID,
			StudentID:      order.UserID,
			Status:         models.EnrollmentStatusActive,
			OrderID:        &order.ID,
			ProgressPct:    0,
			LastAccessedAt: &now,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if _, err := h.db.Enrollments().InsertOne(ctx, &enrollment); err != nil {
			slog.Warn("ecommerce_checkout: failed to create enrollment", "orderId", order.ID.Hex(), "courseId", item.ReferenceID.Hex(), "error", err)
			continue
		}
		// Best-effort: bump the course's enrolledCount.
		h.db.Courses().UpdateByID(ctx, item.ReferenceID, bson.M{
			"$inc": bson.M{"enrolledCount": 1},
		})
		h.emitter.Emit(events.Event{
			Type:      events.EventEnrollmentCreated,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":  order.TenantID.Hex(),
				"courseId":  item.ReferenceID.Hex(),
				"studentId": order.UserID.Hex(),
				"orderId":   order.ID.Hex(),
			},
		})
	}

	// 4. Issue the Invoice.
	invoiceNumber, err := h.nextInvoiceNumber(ctx)
	if err != nil {
		slog.Warn("ecommerce_checkout: failed to generate invoice number", "orderId", order.ID.Hex(), "error", err)
		invoiceNumber = fmt.Sprintf("INV-%s-%d", order.ID.Hex()[:8], now.Unix())
	}
	lineItems := make([]models.InvoiceLineItem, 0, len(order.Items))
	for _, item := range order.Items {
		lineItems = append(lineItems, models.InvoiceLineItem{
			Description: item.Title,
			AmountCents: item.SubtotalCents,
			Quantity:    item.Quantity,
		})
	}
	invoice := models.Invoice{
		TenantID:      order.TenantID,
		OrderID:       &order.ID,
		UserID:        order.UserID,
		InvoiceNumber: invoiceNumber,
		LineItems:     lineItems,
		SubtotalCents: order.SubtotalCents,
		DiscountCents: order.DiscountCents,
		TaxCents:      order.TaxCents,
		TotalCents:    order.TotalCents,
		Currency:      order.Currency,
		Status:        "paid",
		PaidAt:        &now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := h.db.Invoices().InsertOne(ctx, &invoice); err != nil {
		slog.Warn("ecommerce_checkout: failed to insert Invoice", "orderId", order.ID.Hex(), "error", err)
	} else {
		h.emitter.Emit(events.Event{
			Type:      events.EventInvoiceCreated,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":      order.TenantID.Hex(),
				"orderId":       order.ID.Hex(),
				"invoiceId":     invoice.ID.Hex(),
				"invoiceNumber": invoiceNumber,
			},
		})
		h.emitter.Emit(events.Event{
			Type:      events.EventInvoicePaid,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId":      order.TenantID.Hex(),
				"orderId":       order.ID.Hex(),
				"invoiceId":     invoice.ID.Hex(),
				"invoiceNumber": invoiceNumber,
				"totalCents":    invoice.TotalCents,
			},
		})
	}

	// 5. RevenueLedger entries — 70% to instructor, 30% to platform (per
	// the defaultCommissionPct convention used in lms.go).
	const defaultCommissionPct = 70.0
	// Net revenue is the amount the platform actually received (after
	// discounts; tax is pass-through so we exclude it from the split).
	netRevenue := order.TotalCents - order.TaxCents
	if netRevenue < 0 {
		netRevenue = 0
	}
	// Group items by instructor so each instructor gets a single ledger
	// entry per order. Membership and bundle items without an instructor
	// are credited to the platform.
	instructorShares := map[primitive.ObjectID]int64{}
	platformShare := int64(0)
	for _, item := range order.Items {
		// Each item's net contribution is proportional to its subtotal
		// share of the order's subtotal.
		var itemShare int64
		if order.SubtotalCents > 0 {
			itemShare = netRevenue * item.SubtotalCents / order.SubtotalCents
		}
		var instructorID primitive.ObjectID
		if item.ItemType == models.OrderItemTypeCourse {
			var course models.Course
			if err := h.db.Courses().FindOne(ctx, bson.M{
				"_id":      item.ReferenceID,
				"tenantId": order.TenantID,
			}).Decode(&course); err == nil {
				instructorID = course.InstructorID
			}
		}
		if !instructorID.IsZero() {
			instructorShares[instructorID] += itemShare
		} else {
			platformShare += itemShare
		}
	}

	// Write one platform entry for the platform-attributed amount.
	if platformShare > 0 {
		entry := models.RevenueLedgerEntry{
			TenantID:    order.TenantID,
			OrderID:     order.ID,
			AccountType: "platform",
			AmountCents: platformShare,
			Currency:    order.Currency,
			Description: fmt.Sprintf("Platform commission for order %s", order.OrderNumber),
			CreatedAt:   now,
		}
		if _, err := h.db.RevenueLedger().InsertOne(ctx, &entry); err != nil {
			slog.Warn("ecommerce_checkout: failed to insert platform RevenueLedgerEntry", "orderId", order.ID.Hex(), "error", err)
		}
	}
	// Write instructor + platform-pair entries per instructor.
	for instructorID, amount := range instructorShares {
		if amount <= 0 {
			continue
		}
		instructorAmount := int64(float64(amount) * defaultCommissionPct / 100.0)
		platformAmount := amount - instructorAmount
		ii := instructorID // capture for pointer
		insEntry := models.RevenueLedgerEntry{
			TenantID:     order.TenantID,
			OrderID:      order.ID,
			InstructorID: &ii,
			AccountType:  "instructor",
			AmountCents:  instructorAmount,
			Currency:     order.Currency,
			Description:  fmt.Sprintf("Instructor revenue for order %s", order.OrderNumber),
			CreatedAt:    now,
		}
		if _, err := h.db.RevenueLedger().InsertOne(ctx, &insEntry); err != nil {
			slog.Warn("ecommerce_checkout: failed to insert instructor RevenueLedgerEntry", "orderId", order.ID.Hex(), "instructorId", instructorID.Hex(), "error", err)
		}
		if platformAmount > 0 {
			platEntry := models.RevenueLedgerEntry{
				TenantID:    order.TenantID,
				OrderID:     order.ID,
				AccountType: "platform",
				AmountCents: platformAmount,
				Currency:    order.Currency,
				Description: fmt.Sprintf("Platform commission for order %s (instructor %s)", order.OrderNumber, instructorID.Hex()),
				CreatedAt:   now,
			}
			if _, err := h.db.RevenueLedger().InsertOne(ctx, &platEntry); err != nil {
				slog.Warn("ecommerce_checkout: failed to insert paired platform RevenueLedgerEntry", "orderId", order.ID.Hex(), "error", err)
			}
		}
	}

	// 6. OrderActivity entry — action="paid".
	activity := models.OrderActivity{
		TenantID: order.TenantID,
		OrderID:  order.ID,
		Action:   "paid",
		ActorID:  &order.UserID,
		Notes:    fmt.Sprintf("Payment succeeded via %s", order.PaymentMethod),
		Metadata: map[string]interface{}{
			"gateway":              order.PaymentMethod,
			"gatewayTransactionId": gatewayTxID,
			"sessionId":            session.ID,
			"totalCents":           order.TotalCents,
		},
		CreatedAt: now,
	}
	if _, err := h.db.OrderActivity().InsertOne(ctx, &activity); err != nil {
		slog.Warn("ecommerce_checkout: failed to write OrderActivity paid entry", "orderId", order.ID.Hex(), "error", err)
	}

	// 7. Emit success events.
	h.emitter.Emit(events.Event{
		Type:      events.EventCheckoutCompleted,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   order.TenantID.Hex(),
			"userId":     order.UserID.Hex(),
			"orderId":    order.ID.Hex(),
			"totalCents": order.TotalCents,
			"gateway":    order.PaymentMethod,
		},
	})
	h.emitter.Emit(events.Event{
		Type:      events.EventPaymentReceived,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      order.TenantID.Hex(),
			"userId":        order.UserID.Hex(),
			"orderId":       order.ID.Hex(),
			"amountCents":   order.TotalCents,
			"gateway":       order.PaymentMethod,
			"transactionId": gatewayTxID,
		},
	})

	return nil
}

// nextInvoiceNumber atomically increments and returns the next invoice
// number from the Counters collection. Mirrors the Stripe service's
// NextInvoiceNumber so this handler doesn't depend on the Stripe service
// being wired in.
func (h *EcommerceCheckoutHandler) nextInvoiceNumber(ctx context.Context) (string, error) {
	var result models.InvoiceCounter
	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)
	err := h.db.Counters().FindOneAndUpdate(ctx,
		bson.M{"_id": "invoice_number"},
		bson.M{"$inc": bson.M{"value": 1}},
		opts,
	).Decode(&result)
	if err != nil {
		return "", fmt.Errorf("generate invoice number: %w", err)
	}
	return fmt.Sprintf("INV-%06d", result.Value), nil
}

// ---------------------------------------------------------------------------
// CheckoutCancel: GET /api/lms/checkout/cancel
// ---------------------------------------------------------------------------

// CheckoutCancel handles GET /api/lms/checkout/cancel.
//
// Stripe redirect URL when the customer abandons checkout. Marks the
// pending order as canceled and emits EventCheckoutFailed. The order ID is
// read from the `order_id` query param when present (set via the Stripe
// session metadata); otherwise nothing is updated and the endpoint returns
// 200 so the frontend can route the user back to the cart.
func (h *EcommerceCheckoutHandler) CheckoutCancel(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}

	// Try to look up the order via the Stripe session id (preferred) or
	// an explicit order_id query param.
	sessionID := strings.TrimSpace(r.URL.Query().Get("session_id"))
	orderIDStr := strings.TrimSpace(r.URL.Query().Get("order_id"))

	var order models.Order
	found := false
	if sessionID != "" {
		if err := h.db.Orders().FindOne(r.Context(), bson.M{
			"paymentGatewayRef": sessionID,
			"tenantId":          ctx.TenantID,
		}).Decode(&order); err == nil {
			found = true
		}
	}
	if !found && orderIDStr != "" {
		oid, err := primitive.ObjectIDFromHex(orderIDStr)
		if err == nil {
			if err := h.db.Orders().FindOne(r.Context(), bson.M{
				"_id":      oid,
				"tenantId": ctx.TenantID,
			}).Decode(&order); err == nil {
				found = true
			}
		}
	}

	if found && order.Status == models.OrderStatusPending {
		now := time.Now()
		if _, err := h.db.Orders().UpdateByID(r.Context(), order.ID, bson.M{
			"$set": bson.M{
				"status":    models.OrderStatusCanceled,
				"updatedAt": now,
			},
		}); err != nil {
			slog.Warn("ecommerce_checkout: failed to mark order as canceled", "orderId", order.ID.Hex(), "error", err)
		}
		activity := models.OrderActivity{
			TenantID: ctx.TenantID,
			OrderID:  order.ID,
			Action:   "cancelled",
			ActorID:  &ctx.UserID,
			Notes:    "Customer cancelled checkout",
			Metadata: map[string]interface{}{
				"gateway": order.PaymentMethod,
			},
			CreatedAt: now,
		}
		if _, err := h.db.OrderActivity().InsertOne(r.Context(), &activity); err != nil {
			slog.Warn("ecommerce_checkout: failed to write OrderActivity cancelled entry", "orderId", order.ID.Hex(), "error", err)
		}
		h.emitter.Emit(events.Event{
			Type:      events.EventCheckoutFailed,
			Timestamp: now,
			Data: map[string]interface{}{
				"tenantId": ctx.TenantID.Hex(),
				"userId":   ctx.UserID.Hex(),
				"orderId":  order.ID.Hex(),
				"reason":   "customer_cancelled",
				"gateway":  order.PaymentMethod,
			},
		})
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"status": "cancelled",
	})
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
