package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// Ecommerce Revenue handlers (Phase 3)
//
// EcommerceRevenueHandler exposes:
//   - GET /api/lms/admin/revenue-ledger      -> ListRevenueLedger
//   - GET /api/lms/admin/reports/revenue     -> RevenueReport
//   - GET /api/lms/instructor/earnings       -> InstructorEarnings
//   - GET /api/lms/instructor/statements     -> InstructorStatements
//
// The ledger is double-entry: each paid order writes one
// AccountType="instructor" row (with InstructorID set) crediting the
// instructor's balance, and one AccountType="platform" row (InstructorID nil)
// crediting the platform commission. Instructor-facing endpoints therefore
// filter by `accountType=instructor AND instructorId=currentUser` to surface
// only the instructor's earnings.
//
// All money fields are integer cents. Aggregation is performed in Go (loading
// matching orders/ledger rows into memory and walking them) — consistent with
// the existing GetEarnings implementation in lms.go.
// ---------------------------------------------------------------------------

// EcommerceRevenueHandler implements the admin revenue + instructor earnings surface.
type EcommerceRevenueHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceRevenueHandler constructs an EcommerceRevenueHandler bound to the
// given MongoDB connection and event emitter.
func NewEcommerceRevenueHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceRevenueHandler {
	return &EcommerceRevenueHandler{db: database, emitter: emitter}
}

// requireCtx wraps the shared getLMSContext helper for this handler.
func (h *EcommerceRevenueHandler) requireCtx(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ListRevenueLedger handles GET /api/lms/admin/revenue-ledger.
//
// Lists revenue ledger entries for the active tenant. Optional query params:
//
//	?orderId=<hex>, ?instructorId=<hex>, ?accountType=instructor|platform,
//	?limit=, ?offset=
//
// Results are sorted by createdAt desc.
func (h *EcommerceRevenueHandler) ListRevenueLedger(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	filter := bson.M{"tenantId": ctx.TenantID}
	if v := r.URL.Query().Get("orderId"); v != "" {
		if oid, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["orderId"] = oid
		}
	}
	if v := r.URL.Query().Get("instructorId"); v != "" {
		if oid, err := primitive.ObjectIDFromHex(v); err == nil {
			filter["instructorId"] = oid
		}
	}
	if v := r.URL.Query().Get("accountType"); v != "" {
		if v == "instructor" || v == "platform" {
			filter["accountType"] = v
		}
	}

	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.RevenueLedger().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch revenue ledger")
		return
	}
	defer cursor.Close(r.Context())

	var entries []models.RevenueLedgerEntry
	if err := cursor.All(r.Context(), &entries); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode revenue ledger")
		return
	}
	if entries == nil {
		entries = []models.RevenueLedgerEntry{}
	}
	total, _ := h.db.RevenueLedger().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"entries": entries,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

// RevenueReport handles GET /api/lms/admin/reports/revenue.
//
// Query params: ?from=ISO8601, ?to=ISO8601. Defaults to the last 30 days when
// either bound is missing.
//
// Computes:
//   - totalRevenueCents (sum of TotalCents across paid orders in range)
//   - totalOrders (count of paid orders in range)
//   - totalRefundsCents (sum of succeeded Refund amounts in range)
//   - netRevenueCents (totalRevenue - totalRefunds)
//   - topCourses (by gross item subtotal, top 10)
//   - topInstructors (by instructor revenue ledger entries, top 10)
//   - dailySeries (per-day buckets of revenue + order count)
func (h *EcommerceRevenueHandler) RevenueReport(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	now := time.Now()
	from := parseTimeQuery(r, "from", now.AddDate(0, 0, -30))
	to := parseTimeQuery(r, "to", now)
	if to.Before(from) {
		from, to = to, from
	}
	// Include the entire `to` day.
	to = to.Add(24*time.Hour - time.Nanosecond)

	// --- Paid orders in range ---
	orderFilter := bson.M{
		"tenantId": ctx.TenantID,
		"status":   models.OrderStatusPaid,
		"paidAt":   bson.M{"$gte": from, "$lte": to},
	}
	orderCursor, err := h.db.Orders().Find(r.Context(), orderFilter)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load paid orders")
		return
	}
	var orders []models.Order
	if err := orderCursor.All(r.Context(), &orders); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode paid orders")
		return
	}

	// --- Refunds in range ---
	refundFilter := bson.M{
		"tenantId":  ctx.TenantID,
		"status":    "succeeded",
		"createdAt": bson.M{"$gte": from, "$lte": to},
	}
	refundCursor, err := h.db.Refunds().Find(r.Context(), refundFilter)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load refunds")
		return
	}
	var refunds []models.Refund
	if err := refundCursor.All(r.Context(), &refunds); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode refunds")
		return
	}

	var totalRevenue, totalRefunds int64
	courseRevenue := map[primitive.ObjectID]int64{}
	courseEnroll := map[primitive.ObjectID]int{}
	courseTitles := map[primitive.ObjectID]string{}
	for _, o := range orders {
		totalRevenue += o.TotalCents
		seenCourses := map[primitive.ObjectID]bool{}
		for _, item := range o.Items {
			if item.ItemType == models.OrderItemTypeCourse {
				courseRevenue[item.ReferenceID] += item.SubtotalCents
				courseTitles[item.ReferenceID] = item.Title
				if !seenCourses[item.ReferenceID] {
					courseEnroll[item.ReferenceID]++
					seenCourses[item.ReferenceID] = true
				}
			}
		}
	}
	for _, rf := range refunds {
		totalRefunds += rf.AmountCents
	}
	netRevenue := totalRevenue - totalRefunds
	if netRevenue < 0 {
		netRevenue = 0
	}

	// --- Top courses ---
	type topCourse struct {
		CourseID     string `json:"courseId"`
		Title        string `json:"title"`
		RevenueCents int64  `json:"revenueCents"`
		Enrollments  int    `json:"enrollments"`
	}
	topCourses := make([]topCourse, 0, len(courseRevenue))
	for cid, rev := range courseRevenue {
		topCourses = append(topCourses, topCourse{
			CourseID:     cid.Hex(),
			Title:        courseTitles[cid],
			RevenueCents: rev,
			Enrollments:  courseEnroll[cid],
		})
	}
	sort.Slice(topCourses, func(i, j int) bool {
		return topCourses[i].RevenueCents > topCourses[j].RevenueCents
	})
	if len(topCourses) > 10 {
		topCourses = topCourses[:10]
	}

	// --- Top instructors via revenue ledger (instructor accountType rows) ---
	ledgerFilter := bson.M{
		"tenantId":     ctx.TenantID,
		"accountType":  "instructor",
		"instructorId": bson.M{"$ne": nil},
		"createdAt":    bson.M{"$gte": from, "$lte": to},
	}
	ledgerCursor, err := h.db.RevenueLedger().Find(r.Context(), ledgerFilter)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load revenue ledger")
		return
	}
	var entries []models.RevenueLedgerEntry
	if err := ledgerCursor.All(r.Context(), &entries); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode revenue ledger")
		return
	}
	instructorRevenue := map[primitive.ObjectID]int64{}
	for _, e := range entries {
		if e.InstructorID == nil {
			continue
		}
		instructorRevenue[*e.InstructorID] += e.AmountCents
	}

	// Resolve instructor display names.
	instructorIDs := make([]primitive.ObjectID, 0, len(instructorRevenue))
	for id := range instructorRevenue {
		instructorIDs = append(instructorIDs, id)
	}
	instructorNames := map[primitive.ObjectID]string{}
	if len(instructorIDs) > 0 {
		userCursor, err := h.db.Users().Find(r.Context(), bson.M{"_id": bson.M{"$in": instructorIDs}})
		if err == nil {
			var users []models.User
			if err := userCursor.All(r.Context(), &users); err == nil {
				for _, u := range users {
					instructorNames[u.ID] = u.DisplayName
				}
			}
		}
	}

	type topInstructor struct {
		InstructorID string `json:"instructorId"`
		Name         string `json:"name"`
		RevenueCents int64  `json:"revenueCents"`
	}
	topInstructors := make([]topInstructor, 0, len(instructorRevenue))
	for id, rev := range instructorRevenue {
		name := instructorNames[id]
		if name == "" {
			name = id.Hex()
		}
		topInstructors = append(topInstructors, topInstructor{
			InstructorID: id.Hex(),
			Name:         name,
			RevenueCents: rev,
		})
	}
	sort.Slice(topInstructors, func(i, j int) bool {
		return topInstructors[i].RevenueCents > topInstructors[j].RevenueCents
	})
	if len(topInstructors) > 10 {
		topInstructors = topInstructors[:10]
	}

	// --- Daily time series ---
	type dayBucket struct {
		Date         string `json:"date"`
		RevenueCents int64  `json:"revenueCents"`
		Orders       int    `json:"orders"`
	}
	buckets := map[string]*dayBucket{}
	for _, o := range orders {
		var t time.Time
		if o.PaidAt != nil {
			t = *o.PaidAt
		} else {
			t = o.CreatedAt
		}
		key := t.UTC().Format("2006-01-02")
		b, ok := buckets[key]
		if !ok {
			b = &dayBucket{Date: key}
			buckets[key] = b
		}
		b.RevenueCents += o.TotalCents
		b.Orders++
	}
	dailySeries := make([]dayBucket, 0, len(buckets))
	for _, b := range buckets {
		dailySeries = append(dailySeries, *b)
	}
	sort.Slice(dailySeries, func(i, j int) bool {
		return dailySeries[i].Date < dailySeries[j].Date
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"totalRevenueCents": totalRevenue,
		"totalOrders":       len(orders),
		"totalRefundsCents": totalRefunds,
		"netRevenueCents":   netRevenue,
		"currency":          "USD",
		"from":              from,
		"to":                to,
		"topCourses":        topCourses,
		"topInstructors":    topInstructors,
		"dailySeries":       dailySeries,
	})
}

// InstructorEarnings handles GET /api/lms/instructor/earnings.
//
// Returns an EarningsSummary for the authenticated instructor, computed from
// the revenue ledger (instructor accountType rows) and the withdrawal
// requests table:
//   - totalEarningsCents    = sum of instructor ledger rows
//   - totalWithdrawnCents   = sum of paid withdrawals
//   - pendingBalanceCents   = sum of pending+approved withdrawals (in-flight)
//   - availableBalanceCents = totalEarnings - totalWithdrawn - pending
//   - thisMonthCents/lastMonthCents + growthPercent
//   - monthlySeries for the last 12 months
func (h *EcommerceRevenueHandler) InstructorEarnings(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	// Instructor revenue ledger entries.
	ledgerCursor, err := h.db.RevenueLedger().Find(r.Context(), bson.M{
		"tenantId":     ctx.TenantID,
		"accountType":  "instructor",
		"instructorId": ctx.UserID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load earnings")
		return
	}
	var entries []models.RevenueLedgerEntry
	if err := ledgerCursor.All(r.Context(), &entries); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode earnings")
		return
	}

	var totalEarnings int64
	monthBuckets := map[string]int64{} // "2006-01" -> cents
	for _, e := range entries {
		totalEarnings += e.AmountCents
		key := e.CreatedAt.UTC().Format("2006-01")
		monthBuckets[key] += e.AmountCents
	}

	// Withdrawals.
	wdCursor, err := h.db.WithdrawalRequests().Find(r.Context(), bson.M{
		"tenantId":     ctx.TenantID,
		"instructorId": ctx.UserID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to load withdrawals")
		return
	}
	var withdrawals []models.WithdrawalRequest
	if err := wdCursor.All(r.Context(), &withdrawals); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode withdrawals")
		return
	}
	var totalWithdrawn, pendingBalance int64
	for _, wd := range withdrawals {
		switch wd.Status {
		case models.WithdrawalStatusPaid:
			totalWithdrawn += wd.AmountCents
		case models.WithdrawalStatusPending, models.WithdrawalStatusApproved:
			pendingBalance += wd.AmountCents
		}
	}
	available := totalEarnings - totalWithdrawn - pendingBalance
	if available < 0 {
		available = 0
	}

	// This month / last month.
	now := time.Now().UTC()
	thisMonthKey := now.Format("2006-01")
	lastMonthKey := now.AddDate(0, -1, 0).Format("2006-01")
	thisMonth := monthBuckets[thisMonthKey]
	lastMonth := monthBuckets[lastMonthKey]
	var growthPercent float64
	if lastMonth > 0 {
		growthPercent = (float64(thisMonth) - float64(lastMonth)) / float64(lastMonth) * 100.0
	} else if thisMonth > 0 {
		growthPercent = 100.0
	}

	// Monthly series for the last 12 months.
	type monthPoint struct {
		Month         string `json:"month"`
		EarningsCents int64  `json:"earningsCents"`
	}
	monthlySeries := make([]monthPoint, 0, 12)
	for i := 11; i >= 0; i-- {
		key := now.AddDate(0, -i, 0).Format("2006-01")
		monthlySeries = append(monthlySeries, monthPoint{
			Month:         key,
			EarningsCents: monthBuckets[key],
		})
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"totalEarningsCents":    totalEarnings,
		"totalWithdrawnCents":   totalWithdrawn,
		"pendingBalanceCents":   pendingBalance,
		"availableBalanceCents": available,
		"currency":              "USD",
		"thisMonthCents":        thisMonth,
		"lastMonthCents":        lastMonth,
		"growthPercent":         growthPercent,
		"monthlySeries":         monthlySeries,
	})
}

// InstructorStatements handles GET /api/lms/instructor/statements.
//
// Lists the per-transaction revenue ledger rows that credited the
// authenticated instructor's balance. Pagination via ?limit=, ?offset=.
func (h *EcommerceRevenueHandler) InstructorStatements(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}

	filter := bson.M{
		"tenantId":     ctx.TenantID,
		"accountType":  "instructor",
		"instructorId": ctx.UserID,
	}

	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.RevenueLedger().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch statements")
		return
	}
	defer cursor.Close(r.Context())

	var entries []models.RevenueLedgerEntry
	if err := cursor.All(r.Context(), &entries); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode statements")
		return
	}
	if entries == nil {
		entries = []models.RevenueLedgerEntry{}
	}
	total, _ := h.db.RevenueLedger().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"statements": entries,
		"total":      total,
		"limit":      limit,
		"offset":     offset,
	})
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

// parseTimeQuery parses an ISO8601 timestamp (or Unix seconds) from the named
// query string, falling back to defaultVal when missing/invalid.
func parseTimeQuery(r *http.Request, key string, defaultVal time.Time) time.Time {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return defaultVal
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t
	}
	if n, err := strconv.ParseInt(raw, 10, 64); err == nil {
		return time.Unix(n, 0)
	}
	return defaultVal
}
