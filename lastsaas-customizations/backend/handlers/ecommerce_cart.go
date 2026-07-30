package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ---------------------------------------------------------------------------
// EcommerceCartHandler — Phase 3 shopping cart
//
// This handler manages the per-user shopping cart stored in the lms_carts
// collection (one document per active cart per user, scoped by tenantId). It
// is intentionally SEPARATE from the legacy cart-as-order pattern in lms.go —
// both surfaces coexist during Phase 3 so the frontend can migrate piecemeal.
//
// The cart supports three item types: course, bundle, membership. Prices are
// resolved from the underlying catalog entities at add-time so a cart item
// always carries a snapshot of the title + unit price the user saw.
//
// All handlers are tenant-scoped via getLMSContext (defined in lms.go) which
// falls back to the dev tenant + dev user when no auth context is present.
// ---------------------------------------------------------------------------

// EcommerceCartHandler implements the Phase 3 cart REST surface mounted at
// /api/lms/cart/*.
type EcommerceCartHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceCartHandler constructs an EcommerceCartHandler bound to the
// given MongoDB connection and event emitter.
func NewEcommerceCartHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceCartHandler {
	return &EcommerceCartHandler{db: database, emitter: emitter}
}

// ecommerceCartContext bundles the per-request identity fields used by the
// ecommerce cart handlers. It mirrors lmsContext but is local to this file
// group so we don't need to widen the existing struct.
type ecommerceCartContext struct {
	TenantID primitive.ObjectID
	UserID   primitive.ObjectID
}

// getEcommerceContext extracts the tenant + user IDs for the ecommerce
// cart handler, falling back to the dev tenant/user when no auth context
// is present (mirroring getLMSContext in lms.go lines 100-115). Returns
// the smaller ecommerceCartContext projection so the cart handler doesn't
// need to depend on the full lmsContext shape.
func getEcommerceContext(r *http.Request) (ecommerceCartContext, bool) {
	ctx, ok := getLMSContext(r)
	if !ok {
		return ecommerceCartContext{}, false
	}
	if ctx.UserID.IsZero() {
		// Match the dev fallback behavior: when no auth context but env is
		// dev/empty, getLMSContext still returns a synthesized dev user.
		return ecommerceCartContext{}, false
	}
	return ecommerceCartContext{TenantID: ctx.TenantID, UserID: ctx.UserID}, true
}

// requireEcommerceContextOn is the method-form wrapper for the cart
// handler's call sites. It uses getEcommerceContext directly so we don't
// depend on a package-level requireEcommerceContext (which may collide
// with the helper added by other ecommerce handler files in this
// package). The checkout handler has its own method-form
// requireEcommerceContext defined in ecommerce_subscription.go that also
// calls getEcommerceContext — the two intentionally return the same
// ecommerceCartContext type so call sites in either file work uniformly.
func (h *EcommerceCartHandler) requireEcommerceContext(w http.ResponseWriter, r *http.Request) (ecommerceCartContext, bool) {
	ctx, ok := getEcommerceContext(r)
	if !ok {
		respondWithError(w, http.StatusBadRequest, "Tenant context required")
		return ecommerceCartContext{}, false
	}
	return ctx, true
}

// findOrCreateEcommerceCart returns the current user's open cart document,
// creating an empty one when none yet exists. The cart is always scoped to
// (tenantId, userId).
func (h *EcommerceCartHandler) findOrCreateEcommerceCart(r *http.Request, ctx ecommerceCartContext) (models.Cart, error) {
	var cart models.Cart
	err := h.db.Carts().FindOne(r.Context(), bson.M{
		"tenantId": ctx.TenantID,
		"userId":   ctx.UserID,
	}).Decode(&cart)
	if err == nil {
		return cart, nil
	}
	now := time.Now()
	cart = models.Cart{
		TenantID:      ctx.TenantID,
		UserID:        ctx.UserID,
		Items:         []models.CartItem{},
		Currency:      "USD",
		SubtotalCents: 0,
		DiscountCents: 0,
		TaxCents:      0,
		TotalCents:    0,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	result, err := h.db.Carts().InsertOne(r.Context(), &cart)
	if err != nil {
		return models.Cart{}, err
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		cart.ID = oid
	}
	return cart, nil
}

// recomputeCartTotals recomputes subtotal/discount/total from the cart's line
// items and currently-applied coupon. TaxCents is left untouched (Agent 4b
// will layer tax computation on top later).
func recomputeCartTotals(cart *models.Cart) {
	var sub int64
	for i := range cart.Items {
		cart.Items[i].SubtotalCents = cart.Items[i].UnitPriceCents * int64(cart.Items[i].Quantity)
		sub += cart.Items[i].SubtotalCents
	}
	cart.SubtotalCents = sub
	if cart.DiscountCents > sub {
		cart.DiscountCents = sub
	}
	if cart.DiscountCents < 0 {
		cart.DiscountCents = 0
	}
	cart.TotalCents = sub - cart.DiscountCents + cart.TaxCents
	if cart.TotalCents < 0 {
		cart.TotalCents = 0
	}
}

// computeCartDiscount returns the discount in cents for the supplied cart
// given a validated coupon. Mirrors applyCouponToOrder in lms.go but does not
// mutate the cart — the caller stamps the result onto cart.DiscountCents.
func computeCartDiscount(coupon *models.Coupon, subtotal int64) int64 {
	var discount int64
	switch coupon.DiscountType {
	case models.CouponDiscountPercent:
		discount = int64(float64(subtotal) * (coupon.DiscountValue / 100.0))
		if coupon.MaxDiscountCents > 0 && discount > coupon.MaxDiscountCents {
			discount = coupon.MaxDiscountCents
		}
	case models.CouponDiscountFixed:
		discount = int64(coupon.DiscountValue)
	}
	if discount < 0 {
		discount = 0
	}
	if discount > subtotal {
		discount = subtotal
	}
	return discount
}

// validateCouponForCart mirrors validateCouponForOrder but operates on a
// Cart instead of an Order. The user ID is accepted so per-user redemption
// limits can be layered in later (currently a no-op).
func validateCouponForCart(coupon *models.Coupon, cart *models.Cart, _ primitive.ObjectID) (string, bool) {
	if !coupon.IsActive {
		return "Coupon is not active", false
	}
	now := time.Now()
	if coupon.StartsAt != nil && now.Before(*coupon.StartsAt) {
		return "Coupon is not yet active", false
	}
	if coupon.ExpiresAt != nil && now.After(*coupon.ExpiresAt) {
		return "Coupon has expired", false
	}
	if coupon.MaxRedemptions > 0 && coupon.RedemptionCount >= coupon.MaxRedemptions {
		return "Coupon redemption limit reached", false
	}
	if coupon.MinOrderCents > 0 && cart.SubtotalCents < coupon.MinOrderCents {
		return "Cart does not meet coupon minimum", false
	}
	if !coupon.AppliesToAllCourses && len(coupon.CourseIDs) > 0 {
		allowed := make(map[primitive.ObjectID]bool, len(coupon.CourseIDs))
		for _, cid := range coupon.CourseIDs {
			allowed[cid] = true
		}
		hasMatching := false
		for _, item := range cart.Items {
			if item.ItemType == string(models.OrderItemTypeCourse) && allowed[item.ReferenceID] {
				hasMatching = true
				break
			}
		}
		if !hasMatching {
			return "Coupon does not apply to any course in your cart", false
		}
	}
	return "", true
}

// ---------------------------------------------------------------------------
// Cart handlers
// ---------------------------------------------------------------------------

// GetCart handles GET /api/lms/cart.
//
// Returns the current user's cart. An empty cart is created on first access
// so the frontend always has a stable cart document to mutate.
func (h *EcommerceCartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}
	respondWithJSON(w, http.StatusOK, cart)
}

// AddToCart handles POST /api/lms/cart/items.
//
// Request body: { itemType: "course"|"bundle"|"membership", referenceId: string, quantity?: int }.
// Resolves the referenced item's title + price from the catalog and adds (or
// increments) a line item on the cart. Adding the same (itemType, referenceId)
// twice increments the quantity rather than creating a duplicate.
func (h *EcommerceCartHandler) AddToCart(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	var payload struct {
		ItemType    string `json:"itemType"`
		ReferenceID string `json:"referenceId"`
		Quantity    int    `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	itemType := strings.ToLower(strings.TrimSpace(payload.ItemType))
	if itemType != "course" && itemType != "bundle" && itemType != "membership" {
		respondWithError(w, http.StatusBadRequest, "itemType must be one of: course, bundle, membership")
		return
	}
	referenceID, err := primitive.ObjectIDFromHex(payload.ReferenceID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid referenceId")
		return
	}
	if payload.Quantity < 1 {
		payload.Quantity = 1
	}

	// Resolve title + unit price from the catalog.
	var title string
	var unitPriceCents int64
	switch itemType {
	case "course":
		var course models.Course
		if err := h.db.Courses().FindOne(r.Context(), bson.M{
			"_id":      referenceID,
			"tenantId": ctx.TenantID,
		}).Decode(&course); err != nil {
			respondWithError(w, http.StatusNotFound, "Course not found")
			return
		}
		if course.PriceType == models.CoursePriceBundle {
			respondWithError(w, http.StatusBadRequest, "Course is only available via a bundle")
			return
		}
		title = course.Title
		if course.PriceType == models.CoursePriceFree {
			unitPriceCents = 0
		} else {
			unitPriceCents = course.PriceCents
		}
	case "bundle":
		var bundle models.CourseBundle
		if err := h.db.CourseBundles().FindOne(r.Context(), bson.M{
			"_id":      referenceID,
			"tenantId": ctx.TenantID,
		}).Decode(&bundle); err != nil {
			respondWithError(w, http.StatusNotFound, "Bundle not found")
			return
		}
		if !bundle.IsActive {
			respondWithError(w, http.StatusBadRequest, "Bundle is not active")
			return
		}
		title = bundle.Name
		unitPriceCents = bundle.PriceCents
	case "membership":
		var membership models.Membership
		if err := h.db.Memberships().FindOne(r.Context(), bson.M{
			"_id":      referenceID,
			"tenantId": ctx.TenantID,
		}).Decode(&membership); err != nil {
			respondWithError(w, http.StatusNotFound, "Membership not found")
			return
		}
		if !membership.IsActive {
			respondWithError(w, http.StatusBadRequest, "Membership is not active")
			return
		}
		title = membership.Name
		unitPriceCents = membership.PriceCents
	}

	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}

	// Merge if the same (itemType, referenceId) is already in the cart.
	found := false
	for i := range cart.Items {
		if cart.Items[i].ItemType == itemType && cart.Items[i].ReferenceID == referenceID {
			cart.Items[i].Quantity += payload.Quantity
			// Refresh title + price in case the catalog changed since the
			// item was first added.
			cart.Items[i].Title = title
			cart.Items[i].UnitPriceCents = unitPriceCents
			found = true
			break
		}
	}
	if !found {
		cart.Items = append(cart.Items, models.CartItem{
			ID:             primitive.NewObjectID(),
			ItemType:       itemType,
			ReferenceID:    referenceID,
			Title:          title,
			UnitPriceCents: unitPriceCents,
			Quantity:       payload.Quantity,
		})
	}

	// If a coupon is already applied, re-validate + re-discount against the
	// updated cart contents.
	if cart.CouponID != nil {
		var coupon models.Coupon
		if err := h.db.Coupons().FindOne(r.Context(), bson.M{
			"_id":      cart.CouponID,
			"tenantId": ctx.TenantID,
		}).Decode(&coupon); err == nil {
			if reason, ok := validateCouponForCart(&coupon, &cart, ctx.UserID); ok {
				cart.DiscountCents = computeCartDiscount(&coupon, cart.SubtotalCents)
			} else {
				// Coupon no longer valid for the new cart contents — drop it.
				_ = reason
				cart.CouponID = nil
				cart.CouponCode = ""
				cart.DiscountCents = 0
			}
		} else {
			cart.CouponID = nil
			cart.CouponCode = ""
			cart.DiscountCents = 0
		}
	}

	recomputeCartTotals(&cart)
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(r.Context(), cart.ID, bson.M{
		"$set": bson.M{
			"items":         cart.Items,
			"couponId":      cart.CouponID,
			"couponCode":    cart.CouponCode,
			"subtotalCents": cart.SubtotalCents,
			"discountCents": cart.DiscountCents,
			"taxCents":      cart.TaxCents,
			"totalCents":    cart.TotalCents,
			"currency":      cart.Currency,
			"updatedAt":     now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update cart")
		return
	}
	cart.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventCartItemAdded,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":    ctx.TenantID.Hex(),
			"userId":      ctx.UserID.Hex(),
			"cartId":      cart.ID.Hex(),
			"itemType":    itemType,
			"referenceId": referenceID.Hex(),
			"quantity":    payload.Quantity,
		},
	})

	respondWithJSON(w, http.StatusOK, cart)
}

// UpdateCartItem handles PATCH /api/lms/cart/items/{itemId}.
//
// Request body: { quantity: int }. Updates the line item's quantity (must be
// >= 1). If quantity is 0 the item is removed (mirror of RemoveFromCart).
func (h *EcommerceCartHandler) UpdateCartItem(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	itemIDStr := mux.Vars(r)["itemId"]
	itemID, err := primitive.ObjectIDFromHex(itemIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid item ID")
		return
	}
	var payload struct {
		Quantity int `json:"quantity"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.Quantity < 0 {
		respondWithError(w, http.StatusBadRequest, "quantity must be >= 0")
		return
	}

	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}

	// quantity == 0 means remove.
	if payload.Quantity == 0 {
		var kept []models.CartItem
		found := false
		for _, item := range cart.Items {
			if item.ID == itemID {
				found = true
				continue
			}
			kept = append(kept, item)
		}
		if !found {
			respondWithError(w, http.StatusNotFound, "Cart item not found")
			return
		}
		if kept == nil {
			kept = []models.CartItem{}
		}
		cart.Items = kept
	} else {
		found := false
		for i := range cart.Items {
			if cart.Items[i].ID == itemID {
				cart.Items[i].Quantity = payload.Quantity
				found = true
				break
			}
		}
		if !found {
			respondWithError(w, http.StatusNotFound, "Cart item not found")
			return
		}
	}

	// Re-validate the coupon (if any) against the updated cart.
	if cart.CouponID != nil {
		var coupon models.Coupon
		if err := h.db.Coupons().FindOne(r.Context(), bson.M{
			"_id":      cart.CouponID,
			"tenantId": ctx.TenantID,
		}).Decode(&coupon); err == nil {
			if _, ok := validateCouponForCart(&coupon, &cart, ctx.UserID); ok {
				cart.DiscountCents = computeCartDiscount(&coupon, cart.SubtotalCents)
			} else {
				cart.CouponID = nil
				cart.CouponCode = ""
				cart.DiscountCents = 0
			}
		} else {
			cart.CouponID = nil
			cart.CouponCode = ""
			cart.DiscountCents = 0
		}
	}

	recomputeCartTotals(&cart)
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(r.Context(), cart.ID, bson.M{
		"$set": bson.M{
			"items":         cart.Items,
			"couponId":      cart.CouponID,
			"couponCode":    cart.CouponCode,
			"subtotalCents": cart.SubtotalCents,
			"discountCents": cart.DiscountCents,
			"taxCents":      cart.TaxCents,
			"totalCents":    cart.TotalCents,
			"updatedAt":     now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update cart")
		return
	}
	cart.UpdatedAt = now

	respondWithJSON(w, http.StatusOK, cart)
}

// RemoveFromCart handles DELETE /api/lms/cart/items/{itemId}.
func (h *EcommerceCartHandler) RemoveFromCart(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	itemIDStr := mux.Vars(r)["itemId"]
	itemID, err := primitive.ObjectIDFromHex(itemIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid item ID")
		return
	}

	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}

	var kept []models.CartItem
	found := false
	var removed models.CartItem
	for _, item := range cart.Items {
		if item.ID == itemID {
			found = true
			removed = item
			continue
		}
		kept = append(kept, item)
	}
	if !found {
		respondWithError(w, http.StatusNotFound, "Cart item not found")
		return
	}
	if kept == nil {
		kept = []models.CartItem{}
	}
	cart.Items = kept

	// Re-validate coupon.
	if cart.CouponID != nil {
		var coupon models.Coupon
		if err := h.db.Coupons().FindOne(r.Context(), bson.M{
			"_id":      cart.CouponID,
			"tenantId": ctx.TenantID,
		}).Decode(&coupon); err == nil {
			if _, ok := validateCouponForCart(&coupon, &cart, ctx.UserID); ok {
				cart.DiscountCents = computeCartDiscount(&coupon, cart.SubtotalCents)
			} else {
				cart.CouponID = nil
				cart.CouponCode = ""
				cart.DiscountCents = 0
			}
		} else {
			cart.CouponID = nil
			cart.CouponCode = ""
			cart.DiscountCents = 0
		}
	}

	recomputeCartTotals(&cart)
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(r.Context(), cart.ID, bson.M{
		"$set": bson.M{
			"items":         cart.Items,
			"couponId":      cart.CouponID,
			"couponCode":    cart.CouponCode,
			"subtotalCents": cart.SubtotalCents,
			"discountCents": cart.DiscountCents,
			"taxCents":      cart.TaxCents,
			"totalCents":    cart.TotalCents,
			"updatedAt":     now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update cart")
		return
	}
	cart.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventCartItemRemoved,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":    ctx.TenantID.Hex(),
			"userId":      ctx.UserID.Hex(),
			"cartId":      cart.ID.Hex(),
			"itemId":      itemID.Hex(),
			"itemType":    removed.ItemType,
			"referenceId": removed.ReferenceID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, cart)
}

// ClearCart handles DELETE /api/lms/cart.
//
// Empties all line items and detaches any previously-applied coupon. The cart
// document itself is preserved so subsequent AddToCart calls reuse the same
// cart ID.
func (h *EcommerceCartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}
	cart.Items = []models.CartItem{}
	cart.DiscountCents = 0
	cart.CouponID = nil
	cart.CouponCode = ""
	cart.TaxCents = 0
	recomputeCartTotals(&cart)
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(r.Context(), cart.ID, bson.M{
		"$set": bson.M{
			"items":         cart.Items,
			"subtotalCents": cart.SubtotalCents,
			"discountCents": cart.DiscountCents,
			"couponId":      nil,
			"couponCode":    "",
			"taxCents":      cart.TaxCents,
			"totalCents":    cart.TotalCents,
			"updatedAt":     now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to clear cart")
		return
	}
	cart.UpdatedAt = now

	respondWithJSON(w, http.StatusOK, cart)
}

// ApplyCoupon handles POST /api/lms/cart/apply-coupon.
//
// Request body: { code: string }. Validates the coupon against the current
// cart contents and stamps it onto the cart, recomputing the discount.
func (h *EcommerceCartHandler) ApplyCoupon(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	var payload struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	code := strings.ToUpper(strings.TrimSpace(payload.Code))
	if code == "" {
		respondWithError(w, http.StatusBadRequest, "code is required")
		return
	}

	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}
	if len(cart.Items) == 0 {
		respondWithError(w, http.StatusBadRequest, "Cannot apply coupon to empty cart")
		return
	}

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
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(r.Context(), cart.ID, bson.M{
		"$set": bson.M{
			"couponId":      cart.CouponID,
			"couponCode":    cart.CouponCode,
			"subtotalCents": cart.SubtotalCents,
			"discountCents": cart.DiscountCents,
			"taxCents":      cart.TaxCents,
			"totalCents":    cart.TotalCents,
			"updatedAt":     now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to apply coupon")
		return
	}
	cart.UpdatedAt = now

	// Best-effort: bump the coupon's redemption counter. The Order-side
	// handler in lms.go does the same; for the cart we count application
	// attempts (not actual redemptions, which happen at checkout).
	h.db.Coupons().UpdateByID(r.Context(), coupon.ID, bson.M{
		"$inc": bson.M{"redemptionCount": 1},
	})

	h.emitter.Emit(events.Event{
		Type:      events.EventCartCouponApplied,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      ctx.TenantID.Hex(),
			"userId":        ctx.UserID.Hex(),
			"cartId":        cart.ID.Hex(),
			"couponId":      coupon.ID.Hex(),
			"couponCode":    coupon.Code,
			"discountCents": cart.DiscountCents,
		},
	})

	respondWithJSON(w, http.StatusOK, cart)
}

// RemoveCoupon handles DELETE /api/lms/cart/coupon.
//
// Detaches the currently-applied coupon and recomputes totals.
func (h *EcommerceCartHandler) RemoveCoupon(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireEcommerceContext(w, r)
	if !ok {
		return
	}
	cart, err := h.findOrCreateEcommerceCart(r, ctx)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load cart")
		return
	}
	cart.CouponID = nil
	cart.CouponCode = ""
	cart.DiscountCents = 0
	recomputeCartTotals(&cart)
	now := time.Now()
	if _, err := h.db.Carts().UpdateByID(r.Context(), cart.ID, bson.M{
		"$set": bson.M{
			"couponId":      nil,
			"couponCode":    "",
			"discountCents": cart.DiscountCents,
			"subtotalCents": cart.SubtotalCents,
			"taxCents":      cart.TaxCents,
			"totalCents":    cart.TotalCents,
			"updatedAt":     now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to remove coupon")
		return
	}
	cart.UpdatedAt = now

	respondWithJSON(w, http.StatusOK, cart)
}
