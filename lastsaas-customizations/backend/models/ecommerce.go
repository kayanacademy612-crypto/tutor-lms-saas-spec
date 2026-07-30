package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// Ecommerce models (Phase 3)
//
// These types cover the eCommerce flow that sits on top of the existing
// lms.go Order/Coupon/Bundle/Membership/Gift entities: shopping cart, tax
// rates, recurring subscriptions, payment transactions, invoices, refunds,
// wishlists, revenue ledger (double-entry), instructor withdrawal requests,
// and an append-only order activity log.
//
// Every struct is multi-tenant scoped: it MUST carry TenantID. Money is
// always stored as integer cents in *Cents fields. Timestamps use time.Time
// with both json and bson tags. Field-tag style mirrors lms.go.
// ---------------------------------------------------------------------------

// === CART ===

// CartItem is a single line inside a Cart. ItemType discriminates between
// course / bundle / membership so the checkout handler can build the right
// access grant when the order is paid.
type CartItem struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ItemType       string             `json:"itemType" bson:"itemType" validate:"required,oneof=course bundle membership"`
	ReferenceID    primitive.ObjectID `json:"referenceId" bson:"referenceId" validate:"required"`
	Title          string             `json:"title" bson:"title" validate:"required"`
	UnitPriceCents int64              `json:"unitPriceCents" bson:"unitPriceCents"`
	Quantity       int                `json:"quantity" bson:"quantity" validate:"required,min=1"`
	SubtotalCents  int64              `json:"subtotalCents" bson:"subtotalCents"`
	ImageURL       string             `json:"imageUrl,omitempty" bson:"imageUrl,omitempty"`
}

// Cart is the per-user shopping cart. One active cart per (tenantId, userId).
type Cart struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID        primitive.ObjectID  `json:"userId" bson:"userId" validate:"required"`
	Items         []CartItem          `json:"items" bson:"items"`
	CouponID      *primitive.ObjectID `json:"couponId,omitempty" bson:"couponId,omitempty"`
	CouponCode    string              `json:"couponCode,omitempty" bson:"couponCode,omitempty"`
	SubtotalCents int64               `json:"subtotalCents" bson:"subtotalCents"`
	DiscountCents int64               `json:"discountCents" bson:"discountCents"`
	TaxCents      int64               `json:"taxCents" bson:"taxCents"`
	TotalCents    int64               `json:"totalCents" bson:"totalCents"`
	Currency      string              `json:"currency,omitempty" bson:"currency,omitempty"`
	ExpiresAt     *time.Time          `json:"expiresAt,omitempty" bson:"expiresAt,omitempty"`
	CreatedAt     time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === TAX ===

// TaxRate is a tenant-scoped tax rate that may be filtered by country/region.
// Priority controls the order in which multiple matching rates are applied.
type TaxRate struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID    primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	Name        string             `json:"name" bson:"name" validate:"required,min=1,max=200"`
	CountryCode string             `json:"countryCode,omitempty" bson:"countryCode,omitempty"`
	RegionCode  string             `json:"regionCode,omitempty" bson:"regionCode,omitempty"`
	RatePercent float64            `json:"ratePercent" bson:"ratePercent" validate:"required"`
	IsInclusive bool               `json:"isInclusive" bson:"isInclusive"`
	IsActive    bool               `json:"isActive" bson:"isActive"`
	Priority    int                `json:"priority,omitempty" bson:"priority,omitempty"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === SUBSCRIPTION ===

// SubscriptionPlanType describes what a SubscriptionPlan grants access to.
type SubscriptionPlanType string

const (
	SubscriptionPlanTypeCourse   SubscriptionPlanType = "course"
	SubscriptionPlanTypeBundle   SubscriptionPlanType = "bundle"
	SubscriptionPlanTypeCategory SubscriptionPlanType = "category"
	SubscriptionPlanTypeFullSite SubscriptionPlanType = "full_site"
)

// SubscriptionPlan is the catalog entry for a recurring billing plan
// (e.g. "Monthly access to course X"). ReferenceID points to the course,
// bundle, or category the plan unlocks (omitted for full_site).
type SubscriptionPlan struct {
	ID              primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	TenantID        primitive.ObjectID   `json:"tenantId" bson:"tenantId" validate:"required"`
	Name            string               `json:"name" bson:"name" validate:"required,min=1,max=300"`
	Slug            string               `json:"slug" bson:"slug" validate:"required,min=1,max=300"`
	Description     string               `json:"description,omitempty" bson:"description,omitempty"`
	PlanType        SubscriptionPlanType `json:"planType" bson:"planType" validate:"required"`
	ReferenceID     *primitive.ObjectID  `json:"referenceId,omitempty" bson:"referenceId,omitempty"`
	PriceCents      int64                `json:"priceCents" bson:"priceCents" validate:"gte=0"`
	Currency        string               `json:"currency,omitempty" bson:"currency,omitempty"`
	BillingInterval string               `json:"billingInterval" bson:"billingInterval" validate:"required,oneof=monthly quarterly annual"`
	TrialDays       int                  `json:"trialDays,omitempty" bson:"trialDays,omitempty"`
	IsActive        bool                 `json:"isActive" bson:"isActive"`
	SortOrder       int                  `json:"sortOrder,omitempty" bson:"sortOrder,omitempty"`
	StripeProductID string               `json:"stripeProductId,omitempty" bson:"stripeProductId,omitempty"`
	StripePriceID   string               `json:"stripePriceId,omitempty" bson:"stripePriceId,omitempty"`
	CreatedAt       time.Time            `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt       time.Time            `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// SubscriptionStatus is the lifecycle state of a user's subscription.
type SubscriptionStatus string

const (
	SubscriptionStatusTrialing SubscriptionStatus = "trialing"
	SubscriptionStatusActive   SubscriptionStatus = "active"
	SubscriptionStatusPastDue  SubscriptionStatus = "past_due"
	SubscriptionStatusCanceled SubscriptionStatus = "canceled"
	SubscriptionStatusExpired  SubscriptionStatus = "expired"
)

// Subscription is the active recurring billing record for a user on a plan.
type Subscription struct {
	ID                   primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID             primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID               primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	PlanID               primitive.ObjectID `json:"planId" bson:"planId" validate:"required"`
	Status               SubscriptionStatus `json:"status" bson:"status" validate:"required"`
	StripeSubscriptionID string             `json:"stripeSubscriptionId,omitempty" bson:"stripeSubscriptionId,omitempty"`
	StripeCustomerID     string             `json:"stripeCustomerId,omitempty" bson:"stripeCustomerId,omitempty"`
	CurrentPeriodStart   time.Time          `json:"currentPeriodStart" bson:"currentPeriodStart" validate:"required"`
	CurrentPeriodEnd     time.Time          `json:"currentPeriodEnd" bson:"currentPeriodEnd" validate:"required"`
	TrialEnd             *time.Time         `json:"trialEnd,omitempty" bson:"trialEnd,omitempty"`
	CanceledAt           *time.Time         `json:"canceledAt,omitempty" bson:"canceledAt,omitempty"`
	NextRetryAt          *time.Time         `json:"nextRetryAt,omitempty" bson:"nextRetryAt,omitempty"`
	RetryCount           int                `json:"retryCount,omitempty" bson:"retryCount,omitempty"`
	CreatedAt            time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt            time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// DunningCycle is a single retry attempt during the dunning workflow that
// runs when a subscription renewal payment fails.
type DunningCycle struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID       primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	SubscriptionID primitive.ObjectID `json:"subscriptionId" bson:"subscriptionId" validate:"required"`
	AttemptNumber  int                `json:"attemptNumber" bson:"attemptNumber" validate:"required"`
	Status         string             `json:"status" bson:"status" validate:"required,oneof=pending retried failed exhausted"`
	ScheduledAt    time.Time          `json:"scheduledAt" bson:"scheduledAt" validate:"required"`
	AttemptedAt    *time.Time         `json:"attemptedAt,omitempty" bson:"attemptedAt,omitempty"`
	ErrorMessage   string             `json:"errorMessage,omitempty" bson:"errorMessage,omitempty"`
	CreatedAt      time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt      time.Time          `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === PAYMENT TRANSACTION ===

// PaymentStatus is the lifecycle state of a PaymentTransaction.
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusSucceeded PaymentStatus = "succeeded"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

// PaymentTransaction records a single attempt to charge a payment gateway
// for an Order. An order may have multiple transactions (e.g. an initial
// failed attempt followed by a successful retry, or a later refund).
type PaymentTransaction struct {
	ID                  primitive.ObjectID         `json:"id" bson:"_id,omitempty"`
	TenantID            primitive.ObjectID         `json:"tenantId" bson:"tenantId" validate:"required"`
	OrderID             primitive.ObjectID         `json:"orderId" bson:"orderId" validate:"required"`
	UserID              primitive.ObjectID         `json:"userId" bson:"userId" validate:"required"`
	Gateway             string                     `json:"gateway" bson:"gateway" validate:"required"`
	GatewayTransactionID string                    `json:"gatewayTransactionId,omitempty" bson:"gatewayTransactionId,omitempty"`
	AmountCents         int64                      `json:"amountCents" bson:"amountCents" validate:"required"`
	Currency            string                     `json:"currency,omitempty" bson:"currency,omitempty"`
	Status              PaymentStatus              `json:"status" bson:"status" validate:"required"`
	ErrorMessage        string                     `json:"errorMessage,omitempty" bson:"errorMessage,omitempty"`
	GatewayResponse     map[string]interface{}     `json:"gatewayResponse,omitempty" bson:"gatewayResponse,omitempty"`
	CreatedAt           time.Time                  `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt           time.Time                  `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === INVOICE ===

// InvoiceLineItem is one row on an Invoice.
type InvoiceLineItem struct {
	Description string `json:"description" bson:"description"`
	AmountCents int64  `json:"amountCents" bson:"amountCents"`
	Quantity    int    `json:"quantity,omitempty" bson:"quantity,omitempty"`
}

// Invoice is the formal billing document issued to a user. It may be linked
// to an Order (one-time purchases) or stand alone (subscription renewals).
type Invoice struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	OrderID       *primitive.ObjectID `json:"orderId,omitempty" bson:"orderId,omitempty"`
	UserID        primitive.ObjectID  `json:"userId" bson:"userId" validate:"required"`
	InvoiceNumber string              `json:"invoiceNumber" bson:"invoiceNumber" validate:"required"`
	LineItems     []InvoiceLineItem   `json:"lineItems" bson:"lineItems" validate:"required,min=1"`
	SubtotalCents int64               `json:"subtotalCents" bson:"subtotalCents"`
	DiscountCents int64               `json:"discountCents,omitempty" bson:"discountCents,omitempty"`
	TaxCents      int64               `json:"taxCents,omitempty" bson:"taxCents,omitempty"`
	TotalCents    int64               `json:"totalCents" bson:"totalCents"`
	Currency      string              `json:"currency,omitempty" bson:"currency,omitempty"`
	Status        string              `json:"status" bson:"status" validate:"required,oneof=draft paid void"`
	PaidAt        *time.Time          `json:"paidAt,omitempty" bson:"paidAt,omitempty"`
	PdfURL        string              `json:"pdfUrl,omitempty" bson:"pdfUrl,omitempty"`
	BillingName   string              `json:"billingName,omitempty" bson:"billingName,omitempty"`
	BillingEmail  string              `json:"billingEmail,omitempty" bson:"billingEmail,omitempty"`
	BillingAddress string             `json:"billingAddress,omitempty" bson:"billingAddress,omitempty"`
	CreatedAt     time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === REFUND ===

// Refund records a (full or partial) refund issued against an Order's payment.
type Refund struct {
	ID              primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID        primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	OrderID         primitive.ObjectID  `json:"orderId" bson:"orderId" validate:"required"`
	PaymentID       *primitive.ObjectID `json:"paymentId,omitempty" bson:"paymentId,omitempty"`
	AmountCents     int64               `json:"amountCents" bson:"amountCents" validate:"required"`
	Currency        string              `json:"currency,omitempty" bson:"currency,omitempty"`
	Reason          string              `json:"reason,omitempty" bson:"reason,omitempty"`
	Status          string              `json:"status" bson:"status" validate:"required,oneof=pending succeeded failed"`
	GatewayRefundID string              `json:"gatewayRefundId,omitempty" bson:"gatewayRefundId,omitempty"`
	ProcessedBy     primitive.ObjectID  `json:"processedBy" bson:"processedBy" validate:"required"`
	CreatedAt       time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt       time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === WISHLIST ===

// Wishlist is a single (userId, courseId) bookmark. A user may wishlist many
// courses; one document per bookmark keeps queries simple.
type Wishlist struct {
	ID        primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID `json:"tenantId" bson:"tenantId" validate:"required"`
	UserID    primitive.ObjectID `json:"userId" bson:"userId" validate:"required"`
	CourseID  primitive.ObjectID `json:"courseId" bson:"courseId" validate:"required"`
	CreatedAt time.Time          `json:"createdAt" bson:"createdAt" validate:"required"`
}

// === REVENUE LEDGER (double-entry per instructor + platform) ===

// RevenueLedgerEntry is one side of a double-entry accounting record for an
// Order. When an order is paid, two entries are written: one with
// AccountType="instructor" crediting the instructor's balance and one with
// AccountType="platform" crediting the platform's commission. InstructorID
// is nil for platform entries.
type RevenueLedgerEntry struct {
	ID           primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID     primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	OrderID      primitive.ObjectID  `json:"orderId" bson:"orderId" validate:"required"`
	InstructorID *primitive.ObjectID `json:"instructorId,omitempty" bson:"instructorId,omitempty"`
	AccountType  string              `json:"accountType" bson:"accountType" validate:"required,oneof=instructor platform"`
	AmountCents  int64               `json:"amountCents" bson:"amountCents"`
	Currency     string              `json:"currency,omitempty" bson:"currency,omitempty"`
	Description  string              `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt    time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
}

// === WITHDRAWAL REQUEST (instructor payout request) ===

// WithdrawalStatus is the lifecycle state of a WithdrawalRequest.
type WithdrawalStatus string

const (
	WithdrawalStatusPending  WithdrawalStatus = "pending"
	WithdrawalStatusApproved WithdrawalStatus = "approved"
	WithdrawalStatusRejected WithdrawalStatus = "rejected"
	WithdrawalStatusPaid     WithdrawalStatus = "paid"
	WithdrawalStatusFailed   WithdrawalStatus = "failed"
)

// WithdrawalRequest is an instructor's request to withdraw their accumulated
// earnings. An admin reviews and either approves or rejects it; on success
// the request transitions approved -> paid once the gateway transfer
// completes.
type WithdrawalRequest struct {
	ID            primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	TenantID      primitive.ObjectID  `json:"tenantId" bson:"tenantId" validate:"required"`
	InstructorID  primitive.ObjectID  `json:"instructorId" bson:"instructorId" validate:"required"`
	AmountCents   int64               `json:"amountCents" bson:"amountCents" validate:"required"`
	Currency      string              `json:"currency,omitempty" bson:"currency,omitempty"`
	Status        WithdrawalStatus    `json:"status" bson:"status" validate:"required"`
	PaymentMethod string              `json:"paymentMethod,omitempty" bson:"paymentMethod,omitempty"`
	PaymentRef    string              `json:"paymentRef,omitempty" bson:"paymentRef,omitempty"`
	RequestedAt   time.Time           `json:"requestedAt" bson:"requestedAt" validate:"required"`
	ReviewedBy    *primitive.ObjectID `json:"reviewedBy,omitempty" bson:"reviewedBy,omitempty"`
	ReviewedAt    *time.Time          `json:"reviewedAt,omitempty" bson:"reviewedAt,omitempty"`
	Notes         string              `json:"notes,omitempty" bson:"notes,omitempty"`
	CreatedAt     time.Time           `json:"createdAt" bson:"createdAt" validate:"required"`
	UpdatedAt     time.Time           `json:"updatedAt" bson:"updatedAt" validate:"required"`
}

// === ORDER ACTIVITY (append-only audit log) ===

// OrderActivity is an append-only audit entry tracking every meaningful
// transition on an Order: created, paid, refunded, cancelled, coupon_applied,
// etc. Metadata captures any free-form context the action handler wants to
// record (e.g. coupon code applied, gateway transaction id, refund reason).
type OrderActivity struct {
	ID        primitive.ObjectID    `json:"id" bson:"_id,omitempty"`
	TenantID  primitive.ObjectID    `json:"tenantId" bson:"tenantId" validate:"required"`
	OrderID   primitive.ObjectID    `json:"orderId" bson:"orderId" validate:"required"`
	Action    string                `json:"action" bson:"action" validate:"required"`
	ActorID   *primitive.ObjectID   `json:"actorId,omitempty" bson:"actorId,omitempty"`
	Notes     string                `json:"notes,omitempty" bson:"notes,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty" bson:"metadata,omitempty"`
	CreatedAt time.Time             `json:"createdAt" bson:"createdAt" validate:"required"`
}
