package events

// ---------------------------------------------------------------------------
// Ecommerce event type constants (Phase 3)
//
// These mirror the convention used in lms_events.go and emitter.go: dotted
// lowercase strings grouped by resource. Each constant is an EventType value
// so it can be passed directly to Emitter.Emit(Event{...}).
//
// NOTE on overlap with emitter.go: three event names that the Phase 3 plan
// would naturally introduce are ALREADY declared in emitter.go for the
// billing/tenancy layer and are intentionally NOT re-declared here:
//
//   - EventPaymentReceived        ("payment.received")           -- emitter.go
//   - EventPaymentFailed          ("payment.failed")             -- emitter.go
//   - EventSubscriptionActivated  ("subscription.activated")     -- emitter.go
//
// eCommerce handlers should reuse those constants directly. The new
// subscription lifecycle event below uses the British spelling
// "subscription.cancelled" (with a double-l) to distinguish it from the
// tenancy-level EventSubscriptionCanceled ("subscription.canceled",
// American single-l) defined in emitter.go. The two are intentionally
// distinct identifiers and string values.
// ---------------------------------------------------------------------------

const (
	// --- Cart events ---
	EventCartItemAdded     EventType = "cart.item.added"
	EventCartItemRemoved   EventType = "cart.item.removed"
	EventCartCouponApplied EventType = "cart.coupon.applied"

	// --- Checkout events ---
	EventCheckoutStarted   EventType = "checkout.started"
	EventCheckoutCompleted EventType = "checkout.completed"
	EventCheckoutFailed    EventType = "checkout.failed"

	// --- Payment events ---
	// EventPaymentReceived and EventPaymentFailed are defined in emitter.go.
	EventPaymentRefunded EventType = "payment.refunded"

	// --- Subscription (course/bundle/category/full-site) events ---
	// EventSubscriptionActivated is defined in emitter.go.
	EventSubscriptionCreated       EventType = "subscription.created"
	EventSubscriptionCancelled      EventType = "subscription.cancelled"
	EventSubscriptionExpired        EventType = "subscription.expired"
	EventSubscriptionPaymentFailed  EventType = "subscription.payment_failed"
	EventSubscriptionRenewed        EventType = "subscription.renewed"

	// --- Invoice events ---
	EventInvoiceCreated EventType = "invoice.created"
	EventInvoicePaid    EventType = "invoice.paid"
	EventInvoiceVoided  EventType = "invoice.voided"

	// --- Tax rate events ---
	EventTaxRateCreated EventType = "tax_rate.created"
	EventTaxRateUpdated EventType = "tax_rate.updated"

	// --- Payment gateway events ---
	EventGatewayConnected    EventType = "gateway.connected"
	EventGatewayDisconnected EventType = "gateway.disconnected"
	EventWebhookReceived     EventType = "webhook.received"

	// --- Instructor withdrawal events ---
	EventWithdrawalRequested EventType = "withdrawal.requested"
	EventWithdrawalApproved  EventType = "withdrawal.approved"
	EventWithdrawalRejected  EventType = "withdrawal.rejected"
	EventWithdrawalPaid      EventType = "withdrawal.paid"

	// --- Wishlist events ---
	EventWishlistAdded   EventType = "wishlist.added"
	EventWishlistRemoved EventType = "wishlist.removed"

	// --- Dunning events ---
	EventDunningRetryScheduled EventType = "dunning.retry_scheduled"
	EventDunningExhausted      EventType = "dunning.exhausted"
)
