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
// Ecommerce Withdrawal handlers (Phase 3)
//
// EcommerceWithdrawalHandler exposes:
//   - POST /api/lms/instructor/withdrawals               -> RequestWithdrawal
//   - GET  /api/lms/instructor/withdrawals               -> ListMyWithdrawals
//   - GET  /api/lms/admin/withdrawals                    -> ListAllWithdrawals
//   - POST /api/lms/admin/withdrawals/{id}/approve       -> ApproveWithdrawal
//   - POST /api/lms/admin/withdrawals/{id}/reject        -> RejectWithdrawal
//
// Available balance is computed on demand from the revenue ledger (instructor
// accountType rows) minus paid and in-flight withdrawals — the same math used
// by EcommerceRevenueHandler.InstructorEarnings.
//
// On approval an InstructorPayout record is created (status=approved) so the
// existing LMS payout listings surface the cash transfer.
// ---------------------------------------------------------------------------

// EcommerceWithdrawalHandler implements the instructor + admin withdrawal surface.
type EcommerceWithdrawalHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceWithdrawalHandler constructs an EcommerceWithdrawalHandler bound
// to the given MongoDB connection and event emitter.
func NewEcommerceWithdrawalHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceWithdrawalHandler {
	return &EcommerceWithdrawalHandler{db: database, emitter: emitter}
}

// requireCtx wraps the shared getLMSContext helper for this handler.
func (h *EcommerceWithdrawalHandler) requireCtx(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// RequestWithdrawal handles POST /api/lms/instructor/withdrawals.
//
// Request body: { "amountCents": int, "paymentMethod": "...", "notes": "..." }
// Validates amount > 0 and <= available balance (computed from the revenue
// ledger minus paid + in-flight withdrawals). Creates the request with
// status=pending and emits EventWithdrawalRequested.
func (h *EcommerceWithdrawalHandler) RequestWithdrawal(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	var payload struct {
		AmountCents   int64  `json:"amountCents"`
		PaymentMethod string `json:"paymentMethod"`
		Notes         string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.AmountCents <= 0 {
		respondWithError(w, http.StatusBadRequest, "amountCents must be greater than zero")
		return
	}

	available := h.computeAvailableBalance(r, ctx.TenantID, ctx.UserID)
	if payload.AmountCents > available {
		respondWithError(w, http.StatusBadRequest, "amountCents exceeds available balance")
		return
	}

	now := time.Now()
	wd := models.WithdrawalRequest{
		TenantID:      ctx.TenantID,
		InstructorID:  ctx.UserID,
		AmountCents:   payload.AmountCents,
		Currency:      "USD",
		Status:        models.WithdrawalStatusPending,
		PaymentMethod: payload.PaymentMethod,
		Notes:         payload.Notes,
		RequestedAt:   now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	result, err := h.db.WithdrawalRequests().InsertOne(r.Context(), &wd)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create withdrawal request")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		wd.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventWithdrawalRequested,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"withdrawalId": wd.ID.Hex(),
			"instructorId": ctx.UserID.Hex(),
			"amountCents":  payload.AmountCents,
		},
	})

	w.Header().Set("Location", "/api/lms/instructor/withdrawals/"+wd.ID.Hex())
	respondWithJSON(w, http.StatusCreated, wd)
}

// ListMyWithdrawals handles GET /api/lms/instructor/withdrawals.
//
// Lists the authenticated instructor's withdrawal requests. Optional query
// params: ?status=pending|approved|rejected|paid|failed, ?limit=, ?offset=.
func (h *EcommerceWithdrawalHandler) ListMyWithdrawals(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId":     ctx.TenantID,
		"instructorId": ctx.UserID,
	}
	if v := r.URL.Query().Get("status"); v != "" {
		filter["status"] = models.WithdrawalStatus(v)
	}

	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.WithdrawalRequests().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch withdrawals")
		return
	}
	defer cursor.Close(r.Context())

	var withdrawals []models.WithdrawalRequest
	if err := cursor.All(r.Context(), &withdrawals); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode withdrawals")
		return
	}
	if withdrawals == nil {
		withdrawals = []models.WithdrawalRequest{}
	}
	total, _ := h.db.WithdrawalRequests().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"withdrawals": withdrawals,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// ListAllWithdrawals handles GET /api/lms/admin/withdrawals.
//
// Lists every withdrawal request in the tenant. Optional query params:
// ?status=pending|approved|rejected|paid|failed, ?instructorId=<hex>,
// ?limit=, ?offset=.
func (h *EcommerceWithdrawalHandler) ListAllWithdrawals(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if v := r.URL.Query().Get("status"); v != "" {
		filter["status"] = models.WithdrawalStatus(v)
	}
	if v := r.URL.Query().Get("instructorId"); v != "" {
		if oid, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["instructorId"] = oid
		}
	}

	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.WithdrawalRequests().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch withdrawals")
		return
	}
	defer cursor.Close(r.Context())

	var withdrawals []models.WithdrawalRequest
	if err := cursor.All(r.Context(), &withdrawals); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode withdrawals")
		return
	}
	if withdrawals == nil {
		withdrawals = []models.WithdrawalRequest{}
	}
	total, _ := h.db.WithdrawalRequests().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"withdrawals": withdrawals,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

// ApproveWithdrawal handles POST /api/lms/admin/withdrawals/{id}/approve.
//
// Transitions a pending withdrawal into "approved", stamps the reviewer and
// review timestamp, creates an InstructorPayout record (status=approved) that
// links back to this withdrawal via the Notes field, and emits
// EventWithdrawalApproved.
func (h *EcommerceWithdrawalHandler) ApproveWithdrawal(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid withdrawal ID")
		return
	}

	var wd models.WithdrawalRequest
	if err := h.db.WithdrawalRequests().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&wd); err != nil {
		respondWithError(w, http.StatusNotFound, "Withdrawal request not found")
		return
	}
	if wd.Status != models.WithdrawalStatusPending {
		respondWithError(w, http.StatusConflict, "Withdrawal is not pending")
		return
	}

	now := time.Now()
	reviewer := ctx.UserID
	update := bson.M{
		"$set": bson.M{
			"status":     models.WithdrawalStatusApproved,
			"reviewedBy": reviewer,
			"reviewedAt": now,
			"updatedAt":  now,
		},
	}
	if _, err := h.db.WithdrawalRequests().UpdateByID(r.Context(), id, update); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to approve withdrawal")
		return
	}

	// Create a linked InstructorPayout record so the existing LMS payout
	// listings surface the cash transfer. The withdrawal amount IS the
	// instructor's net earnings (already deducted from the ledger), so we
	// mirror it into Gross/Commission/Net for display consistency.
	payout := models.InstructorPayout{
		TenantID:        ctx.TenantID,
		InstructorID:    wd.InstructorID,
		PeriodStart:     wd.RequestedAt,
		PeriodEnd:       now,
		OrderIDs:        []primitive.ObjectID{},
		GrossCents:      wd.AmountCents,
		CommissionPct:   100.0,
		CommissionCents: wd.AmountCents,
		FeeCents:        0,
		NetCents:        wd.AmountCents,
		Currency:        wd.Currency,
		Status:          models.InstructorPayoutStatusApproved,
		PaymentMethod:   wd.PaymentMethod,
		Notes:           "withdrawal:" + wd.ID.Hex(),
		ApprovedBy:      &reviewer,
		ApprovedAt:      &now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	payoutResult, err := h.db.InstructorPayouts().InsertOne(r.Context(), &payout)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create payout record")
		return
	}
	if oid, ok := payoutResult.InsertedID.(primitive.ObjectID); ok {
		payout.ID = oid
	}

	// Reload the updated withdrawal for the response.
	var updated models.WithdrawalRequest
	_ = h.db.WithdrawalRequests().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated)

	h.emitter.Emit(events.Event{
		Type:      events.EventWithdrawalApproved,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"withdrawalId": id.Hex(),
			"instructorId": wd.InstructorID.Hex(),
			"payoutId":     payout.ID.Hex(),
			"reviewedBy":   reviewer.Hex(),
			"amountCents":  wd.AmountCents,
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"withdrawal": updated,
		"payout":     payout,
	})
}

// RejectWithdrawal handles POST /api/lms/admin/withdrawals/{id}/reject.
//
// Transitions a pending withdrawal into "rejected". Request body may carry an
// optional `notes` field explaining the rejection reason. Stamps reviewer +
// reviewedAt and emits EventWithdrawalRejected.
func (h *EcommerceWithdrawalHandler) RejectWithdrawal(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid withdrawal ID")
		return
	}

	var wd models.WithdrawalRequest
	if err := h.db.WithdrawalRequests().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&wd); err != nil {
		respondWithError(w, http.StatusNotFound, "Withdrawal request not found")
		return
	}
	if wd.Status != models.WithdrawalStatusPending {
		respondWithError(w, http.StatusConflict, "Withdrawal is not pending")
		return
	}

	var payload struct {
		Notes string `json:"notes"`
	}
	// Body is optional; ignore decode errors so callers can POST with no body.
	_ = json.NewDecoder(r.Body).Decode(&payload)
	if payload.Notes == "" {
		payload.Notes = wd.Notes
	}

	now := time.Now()
	reviewer := ctx.UserID
	update := bson.M{
		"$set": bson.M{
			"status":     models.WithdrawalStatusRejected,
			"reviewedBy": reviewer,
			"reviewedAt": now,
			"notes":      payload.Notes,
			"updatedAt":  now,
		},
	}
	if _, err := h.db.WithdrawalRequests().UpdateByID(r.Context(), id, update); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to reject withdrawal")
		return
	}

	var updated models.WithdrawalRequest
	_ = h.db.WithdrawalRequests().FindOne(r.Context(), bson.M{"_id": id}).Decode(&updated)

	h.emitter.Emit(events.Event{
		Type:      events.EventWithdrawalRejected,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"withdrawalId": id.Hex(),
			"instructorId": wd.InstructorID.Hex(),
			"reviewedBy":   reviewer.Hex(),
			"amountCents":  wd.AmountCents,
			"notes":        payload.Notes,
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

// computeAvailableBalance mirrors the math in
// EcommerceRevenueHandler.InstructorEarnings: sum of instructor ledger rows
// minus paid withdrawals minus in-flight (pending+approved) withdrawals.
func (h *EcommerceWithdrawalHandler) computeAvailableBalance(r *http.Request, tenantID, instructorID primitive.ObjectID) int64 {
	ledgerCursor, err := h.db.RevenueLedger().Find(r.Context(), bson.M{
		"tenantId":     tenantID,
		"accountType":  "instructor",
		"instructorId": instructorID,
	}, options.Find().SetProjection(bson.M{"amountCents": 1}))
	if err != nil {
		return 0
	}
	var entries []models.RevenueLedgerEntry
	if err := ledgerCursor.All(r.Context(), &entries); err != nil {
		return 0
	}
	var totalEarnings int64
	for _, e := range entries {
		totalEarnings += e.AmountCents
	}

	wdCursor, err := h.db.WithdrawalRequests().Find(r.Context(), bson.M{
		"tenantId":     tenantID,
		"instructorId": instructorID,
	}, options.Find().SetProjection(bson.M{"amountCents": 1, "status": 1}))
	if err != nil {
		return 0
	}
	var withdrawals []models.WithdrawalRequest
	if err := wdCursor.All(r.Context(), &withdrawals); err != nil {
		return 0
	}
	var totalWithdrawn, pending int64
	for _, wd := range withdrawals {
		switch wd.Status {
		case models.WithdrawalStatusPaid:
			totalWithdrawn += wd.AmountCents
		case models.WithdrawalStatusPending, models.WithdrawalStatusApproved:
			pending += wd.AmountCents
		}
	}
	available := totalEarnings - totalWithdrawn - pending
	if available < 0 {
		available = 0
	}
	return available
}
