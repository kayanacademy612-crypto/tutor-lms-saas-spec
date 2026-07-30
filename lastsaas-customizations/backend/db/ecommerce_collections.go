package db

import "go.mongodb.org/mongo-driver/mongo"

// ---------------------------------------------------------------------------
// Ecommerce collection accessors (Phase 3)
//
// Each method returns the *mongo.Collection handle for the named eCommerce
// collection on the active database. The collections are created lazily by
// the MongoDB driver on first write, so there is no need to pre-create them.
// Indexes for these collections are registered separately inside
// MongoDB.ensureIndexes() (see internal/db/mongodb.go).
//
// The naming convention follows lms_collections.go: receiver is *MongoDB,
// the method is the plural resource name, and the underlying collection is
// "lms_<resource_plural>".
// ---------------------------------------------------------------------------

// Carts returns the "lms_carts" collection.
func (m *MongoDB) Carts() *mongo.Collection {
	return m.Database.Collection("lms_carts")
}

// TaxRates returns the "lms_tax_rates" collection.
func (m *MongoDB) TaxRates() *mongo.Collection {
	return m.Database.Collection("lms_tax_rates")
}

// SubscriptionPlans returns the "lms_subscription_plans" collection.
func (m *MongoDB) SubscriptionPlans() *mongo.Collection {
	return m.Database.Collection("lms_subscription_plans")
}

// Subscriptions returns the "lms_subscriptions" collection.
func (m *MongoDB) Subscriptions() *mongo.Collection {
	return m.Database.Collection("lms_subscriptions")
}

// DunningCycles returns the "lms_dunning_cycles" collection.
func (m *MongoDB) DunningCycles() *mongo.Collection {
	return m.Database.Collection("lms_dunning_cycles")
}

// PaymentTransactions returns the "lms_payment_transactions" collection.
func (m *MongoDB) PaymentTransactions() *mongo.Collection {
	return m.Database.Collection("lms_payment_transactions")
}

// Invoices returns the "lms_invoices" collection.
func (m *MongoDB) Invoices() *mongo.Collection {
	return m.Database.Collection("lms_invoices")
}

// Refunds returns the "lms_refunds" collection.
func (m *MongoDB) Refunds() *mongo.Collection {
	return m.Database.Collection("lms_refunds")
}

// Wishlists returns the "lms_wishlists" collection.
func (m *MongoDB) Wishlists() *mongo.Collection {
	return m.Database.Collection("lms_wishlists")
}

// RevenueLedger returns the "lms_revenue_ledger" collection.
func (m *MongoDB) RevenueLedger() *mongo.Collection {
	return m.Database.Collection("lms_revenue_ledger")
}

// WithdrawalRequests returns the "lms_withdrawal_requests" collection.
func (m *MongoDB) WithdrawalRequests() *mongo.Collection {
	return m.Database.Collection("lms_withdrawal_requests")
}

// OrderActivity returns the "lms_order_activity" collection.
func (m *MongoDB) OrderActivity() *mongo.Collection {
	return m.Database.Collection("lms_order_activity")
}
