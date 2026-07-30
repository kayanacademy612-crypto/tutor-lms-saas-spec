package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// Phase 6 Reports handlers
//
// ReportsHandler exposes 6 read-only report endpoints + a CSV export endpoint
// + saved-report CRUD, all under /api/lms/admin/reports/*. Every report
// aggregates from the existing LMS / ecommerce collections, scoped by
// tenantId from the auth context.
//
// Reports:
//   - GET  /admin/reports/overview      -> OverviewReport
//   - GET  /admin/reports/sales         -> SalesReport
//   - GET  /admin/reports/enrollments   -> EnrollmentsReport
//   - GET  /admin/reports/completion    -> CompletionReport
//   - GET  /admin/reports/courses       -> CoursesReport
//   - GET  /admin/reports/students      -> StudentsReport
//
// Export + saved reports:
//   - POST   /admin/reports/export      -> ExportReport (CSV as data URL)
//   - POST   /admin/reports/save        -> SaveReport
//   - GET    /admin/reports/saved       -> ListSavedReports
//   - DELETE /admin/reports/saved/{id}  -> DeleteSavedReport
//
// All queries filter by tenantId. EventReportGenerated fires on every report
// run (including ExportReport); EventReportSaved fires on SaveReport.
// ---------------------------------------------------------------------------

// ReportsHandler implements the Phase 6 admin reports surface.
type ReportsHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewReportsHandler constructs a ReportsHandler bound to the given MongoDB
// connection and event emitter.
func NewReportsHandler(database *db.MongoDB, emitter events.Emitter) *ReportsHandler {
	return &ReportsHandler{db: database, emitter: emitter}
}

// requireCtx resolves the per-request tenant/user context and writes a 400/401
// response when the request lacks a usable tenant or authenticated user.
func (h *ReportsHandler) requireCtx(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// ---------------------------------------------------------------------------
// Shared types + helpers
// ---------------------------------------------------------------------------

// reportParams bundles the common query/body filters every report shares.
type reportParams struct {
	From         time.Time
	To           time.Time
	CourseID     *primitive.ObjectID
	InstructorID *primitive.ObjectID
	Period       string
	Limit        int
	Offset       int
}

// reportResult bundles a report's JSON response with the row-level data the
// CSV exporter needs. Response is what the HTTP handlers JSON-encode; Rows +
// Columns drive the CSV download.
type reportResult struct {
	Response map[string]interface{}
	Rows     []map[string]interface{}
	Columns  []string
}

// parseReportParamsFromQuery reads from/to/courseId/instructorId/limit/offset
// from the URL query string, defaulting to the last 30 days.
func parseReportParamsFromQuery(r *http.Request) reportParams {
	now := time.Now()
	from := parseTimeQuery(r, "from", now.AddDate(0, 0, -30))
	to := parseTimeQuery(r, "to", now)
	p := finalizeReportParams(from, to, r.URL.Query().Get("courseId"), r.URL.Query().Get("instructorId"))
	p.Limit = parsePositiveInt(r, "limit", 100, 500)
	p.Offset = parsePositiveInt(r, "offset", 0, 1<<30)
	return p
}

// parseReportParamsFromMap reads the same fields from a JSON object (used by
// the POST /export endpoint).
func parseReportParamsFromMap(m map[string]interface{}) reportParams {
	now := time.Now()
	from := now.AddDate(0, 0, -30)
	to := now
	if v, ok := m["from"].(string); ok && v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			from = t
		}
	}
	if v, ok := m["to"].(string); ok && v != "" {
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			to = t
		}
	}
	courseIDStr, _ := m["courseId"].(string)
	instructorIDStr, _ := m["instructorId"].(string)
	p := finalizeReportParams(from, to, courseIDStr, instructorIDStr)
	if v, ok := m["limit"].(float64); ok && v > 0 {
		p.Limit = int(v)
		if p.Limit > 500 {
			p.Limit = 500
		}
	} else {
		p.Limit = 100
	}
	if v, ok := m["offset"].(float64); ok && v > 0 {
		p.Offset = int(v)
	}
	return p
}

func finalizeReportParams(from, to time.Time, courseIDStr, instructorIDStr string) reportParams {
	if to.Before(from) {
		from, to = to, from
	}
	// Include the entire `to` day.
	to = to.Add(24*time.Hour - time.Nanosecond)
	p := reportParams{From: from, To: to, Period: "custom", Limit: 100}
	if courseIDStr != "" {
		if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
			p.CourseID = &oid
		}
	}
	if instructorIDStr != "" {
		if oid, err := primitive.ObjectIDFromHex(instructorIDStr); err == nil {
			p.InstructorID = &oid
		}
	}
	return p
}

// emitReportGenerated fires the EventReportGenerated event with a scalar-only
// summary payload (large arrays like dailySeries / rows are dropped so the
// event stays small).
func (h *ReportsHandler) emitReportGenerated(lctx lmsContext, reportType models.ReportType, p reportParams, response map[string]interface{}) {
	summary := make(map[string]interface{}, len(response))
	for k, v := range response {
		switch v.(type) {
		case []map[string]interface{}, []interface{}:
			continue
		default:
			summary[k] = v
		}
	}
	h.emitter.Emit(events.Event{
		Type:      events.EventReportGenerated,
		Timestamp: time.Now(),
		Data: map[string]interface{}{
			"tenantId":   lctx.TenantID.Hex(),
			"userId":     lctx.UserID.Hex(),
			"reportType": string(reportType),
			"fromDate":   p.From.Format(time.RFC3339),
			"toDate":     p.To.Format(time.RFC3339),
			"period":     p.Period,
			"summary":    summary,
		},
	})
}

// dailySeriesBuilder accumulates per-day buckets for time-series reports.
// `zero` returns a fresh bucket (minus the "date" key, which the builder
// fills in). `add(t, mutate)` looks up (or creates) the bucket for t's UTC
// day and applies mutate to it.
type dailySeriesBuilder struct {
	buckets map[string]map[string]interface{}
	zero    func() map[string]interface{}
}

func newDailySeriesBuilder(zero func() map[string]interface{}) *dailySeriesBuilder {
	return &dailySeriesBuilder{
		buckets: map[string]map[string]interface{}{},
		zero:    zero,
	}
}

func (b *dailySeriesBuilder) add(t time.Time, mutate func(map[string]interface{})) {
	key := t.UTC().Format("2006-01-02")
	bucket, ok := b.buckets[key]
	if !ok {
		bucket = b.zero()
		bucket["date"] = key
		b.buckets[key] = bucket
	}
	mutate(bucket)
}

func (b *dailySeriesBuilder) build() []map[string]interface{} {
	out := make([]map[string]interface{}, 0, len(b.buckets))
	for _, v := range b.buckets {
		out = append(out, v)
	}
	sort.Slice(out, func(i, j int) bool {
		si, _ := out[i]["date"].(string)
		sj, _ := out[j]["date"].(string)
		return si < sj
	})
	return out
}

// growthPercent computes (current-previous)/previous*100, guarded against
// divide-by-zero. When previous=0 and current>0, returns 100 (new activity).
func growthPercent(current, previous float64) float64 {
	if previous > 0 {
		return (current - previous) / previous * 100.0
	}
	if current > 0 {
		return 100.0
	}
	return 0.0
}

// ===========================================================================
// 1. Overview report
// ===========================================================================

// OverviewReport handles GET /api/lms/admin/reports/overview.
//
// Query params: ?from=ISO8601, ?to=ISO8601, ?courseId=hex, ?instructorId=hex.
// Defaults to the last 30 days when either bound is missing.
//
// Returns: totalRevenue, totalOrders, totalRefunds, netRevenue,
// totalEnrollments, totalStudents, totalCourses, totalInstructors,
// completionRate, avgRating, revenueGrowth, enrollmentGrowth, dailySeries.
func (h *ReportsHandler) OverviewReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	p := parseReportParamsFromQuery(r)
	result, err := h.computeOverview(r.Context(), lctx, p)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build overview report: "+err.Error())
		return
	}
	h.emitReportGenerated(lctx, models.ReportTypeOverview, p, result.Response)
	respondWithJSON(w, http.StatusOK, result.Response)
}

func (h *ReportsHandler) computeOverview(ctx context.Context, lctx lmsContext, p reportParams) (*reportResult, error) {
	// --- Paid orders in range ---
	orderFilter := bson.M{
		"tenantId": lctx.TenantID,
		"status":   models.OrderStatusPaid,
		"paidAt":   bson.M{"$gte": p.From, "$lte": p.To},
	}
	if p.CourseID != nil {
		orderFilter["items"] = bson.M{"$elemMatch": bson.M{
			"itemType":    models.OrderItemTypeCourse,
			"referenceId": *p.CourseID,
		}}
	}
	orders, err := findAll[models.Order](ctx, h.db.Orders(), orderFilter)
	if err != nil {
		return nil, fmt.Errorf("load orders: %w", err)
	}

	// --- Refunds in range ---
	refunds, err := findAll[models.Refund](ctx, h.db.Refunds(), bson.M{
		"tenantId":  lctx.TenantID,
		"status":    "succeeded",
		"createdAt": bson.M{"$gte": p.From, "$lte": p.To},
	})
	if err != nil {
		return nil, fmt.Errorf("load refunds: %w", err)
	}

	// --- Enrollments in range ---
	enrollFilter := bson.M{
		"tenantId":  lctx.TenantID,
		"createdAt": bson.M{"$gte": p.From, "$lte": p.To},
	}
	if p.CourseID != nil {
		enrollFilter["courseId"] = *p.CourseID
	}
	enrollments, err := findAll[models.Enrollment](ctx, h.db.Enrollments(), enrollFilter)
	if err != nil {
		return nil, fmt.Errorf("load enrollments: %w", err)
	}

	// --- Previous period (for growth) ---
	dur := p.To.Sub(p.From)
	prevFrom := p.From.Add(-dur)
	prevTo := p.From.Add(-time.Nanosecond)
	prevOrderFilter := bson.M{
		"tenantId": lctx.TenantID,
		"status":   models.OrderStatusPaid,
		"paidAt":   bson.M{"$gte": prevFrom, "$lte": prevTo},
	}
	if p.CourseID != nil {
		prevOrderFilter["items"] = orderFilter["items"]
	}
	prevOrders, err := findAll[models.Order](ctx, h.db.Orders(), prevOrderFilter)
	if err != nil {
		return nil, fmt.Errorf("load prev orders: %w", err)
	}
	prevEnrollCount, err := h.db.Enrollments().CountDocuments(ctx, bson.M{
		"tenantId":  lctx.TenantID,
		"createdAt": bson.M{"$gte": prevFrom, "$lte": prevTo},
	})
	if err != nil {
		return nil, fmt.Errorf("count prev enrollments: %w", err)
	}
	var prevRevenue int64
	for _, o := range prevOrders {
		prevRevenue += o.TotalCents
	}

	// --- Aggregate current period ---
	var totalRevenue, totalRefunds int64
	for _, o := range orders {
		totalRevenue += o.TotalCents
	}
	for _, rf := range refunds {
		totalRefunds += rf.AmountCents
	}
	netRevenue := totalRevenue - totalRefunds
	if netRevenue < 0 {
		netRevenue = 0
	}

	completedCount := 0
	for _, e := range enrollments {
		if e.Status == models.EnrollmentStatusCompleted {
			completedCount++
		}
	}
	var completionRate float64
	if len(enrollments) > 0 {
		completionRate = float64(completedCount) / float64(len(enrollments)) * 100.0
	}

	// --- Tenant-wide counts ---
	courseFilter := bson.M{"tenantId": lctx.TenantID}
	if p.InstructorID != nil {
		courseFilter["instructorId"] = *p.InstructorID
	}
	totalCourses, err := h.db.Courses().CountDocuments(ctx, courseFilter)
	if err != nil {
		return nil, fmt.Errorf("count courses: %w", err)
	}
	// distinct instructors via in-memory aggregation over a projection-only query.
	instructorIDs := map[primitive.ObjectID]struct{}{}
	if totalCourses > 0 {
		coursesProj, err := findAll[models.Course](ctx, h.db.Courses(), courseFilter,
			options.Find().SetProjection(bson.D{{Key: "instructorId", Value: 1}}))
		if err == nil {
			for _, c := range coursesProj {
				instructorIDs[c.InstructorID] = struct{}{}
			}
		}
	}

	totalStudents, err := h.db.TenantMemberships().CountDocuments(ctx, bson.M{
		"tenantId": lctx.TenantID,
		"role":     models.RoleUser,
	})
	if err != nil {
		return nil, fmt.Errorf("count students: %w", err)
	}

	// avgRating: mean of Course.RatingAvg over courses that have at least one review.
	var avgRating float64
	ratedCourses, err := findAll[models.Course](ctx, h.db.Courses(), bson.M{
		"tenantId":    lctx.TenantID,
		"ratingCount": bson.M{"$gt": 0},
	}, options.Find().SetProjection(bson.D{{Key: "ratingAvg", Value: 1}}))
	if err == nil && len(ratedCourses) > 0 {
		var sum float64
		for _, c := range ratedCourses {
			sum += c.RatingAvg
		}
		avgRating = sum / float64(len(ratedCourses))
	}

	// --- Daily series (revenue + orders + enrollments) ---
	dsb := newDailySeriesBuilder(func() map[string]interface{} {
		return map[string]interface{}{
			"revenueCents": int64(0),
			"orders":       0,
			"enrollments":  0,
		}
	})
	for _, o := range orders {
		t := o.CreatedAt
		if o.PaidAt != nil {
			t = *o.PaidAt
		}
		oo := o
		dsb.add(t, func(b map[string]interface{}) {
			b["revenueCents"] = b["revenueCents"].(int64) + oo.TotalCents
			b["orders"] = b["orders"].(int) + 1
		})
	}
	for _, e := range enrollments {
		ee := e
		dsb.add(ee.CreatedAt, func(b map[string]interface{}) {
			b["enrollments"] = b["enrollments"].(int) + 1
		})
	}
	dailySeries := dsb.build()

	revenueGrowth := growthPercent(float64(totalRevenue), float64(prevRevenue))
	enrollmentGrowth := growthPercent(float64(len(enrollments)), float64(prevEnrollCount))

	response := map[string]interface{}{
		"totalRevenue":     totalRevenue,
		"totalOrders":      len(orders),
		"totalRefunds":     totalRefunds,
		"netRevenue":       netRevenue,
		"currency":         "USD",
		"totalEnrollments": len(enrollments),
		"totalStudents":    totalStudents,
		"totalCourses":     totalCourses,
		"totalInstructors": len(instructorIDs),
		"completionRate":   completionRate,
		"avgRating":        avgRating,
		"revenueGrowth":    revenueGrowth,
		"enrollmentGrowth": enrollmentGrowth,
		"from":             p.From,
		"to":               p.To,
		"dailySeries":      dailySeries,
	}

	rows := make([]map[string]interface{}, len(dailySeries))
	for i, d := range dailySeries {
		rows[i] = map[string]interface{}{
			"date":         d["date"],
			"revenueCents": d["revenueCents"],
			"orders":       d["orders"],
			"enrollments":  d["enrollments"],
		}
	}

	return &reportResult{
		Response: response,
		Rows:     rows,
		Columns:  []string{"date", "revenueCents", "orders", "enrollments"},
	}, nil
}

// ===========================================================================
// 2. Sales report
// ===========================================================================

// SalesReport handles GET /api/lms/admin/reports/sales.
//
// Returns: totalSales, totalOrders, avgOrderValue, refundRate, topCourses,
// paymentMethods, dailySeries.
func (h *ReportsHandler) SalesReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	p := parseReportParamsFromQuery(r)
	result, err := h.computeSales(r.Context(), lctx, p)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build sales report: "+err.Error())
		return
	}
	h.emitReportGenerated(lctx, models.ReportTypeSales, p, result.Response)
	respondWithJSON(w, http.StatusOK, result.Response)
}

func (h *ReportsHandler) computeSales(ctx context.Context, lctx lmsContext, p reportParams) (*reportResult, error) {
	orderFilter := bson.M{
		"tenantId": lctx.TenantID,
		"status":   models.OrderStatusPaid,
		"paidAt":   bson.M{"$gte": p.From, "$lte": p.To},
	}
	if p.CourseID != nil {
		orderFilter["items"] = bson.M{"$elemMatch": bson.M{
			"itemType":    models.OrderItemTypeCourse,
			"referenceId": *p.CourseID,
		}}
	}
	orders, err := findAll[models.Order](ctx, h.db.Orders(), orderFilter)
	if err != nil {
		return nil, fmt.Errorf("load orders: %w", err)
	}

	refunds, err := findAll[models.Refund](ctx, h.db.Refunds(), bson.M{
		"tenantId":  lctx.TenantID,
		"status":    "succeeded",
		"createdAt": bson.M{"$gte": p.From, "$lte": p.To},
	})
	if err != nil {
		return nil, fmt.Errorf("load refunds: %w", err)
	}

	// Payment transactions (succeeded) for payment-method breakdown.
	txns, err := findAll[models.PaymentTransaction](ctx, h.db.PaymentTransactions(), bson.M{
		"tenantId":  lctx.TenantID,
		"status":    "succeeded",
		"createdAt": bson.M{"$gte": p.From, "$lte": p.To},
	})
	if err != nil {
		return nil, fmt.Errorf("load payment transactions: %w", err)
	}

	var totalSales int64
	courseRevenue := map[primitive.ObjectID]int64{}
	courseTitles := map[primitive.ObjectID]string{}
	courseEnroll := map[primitive.ObjectID]int{}
	for _, o := range orders {
		totalSales += o.TotalCents
		seen := map[primitive.ObjectID]bool{}
		for _, item := range o.Items {
			if item.ItemType == models.OrderItemTypeCourse {
				courseRevenue[item.ReferenceID] += item.SubtotalCents
				courseTitles[item.ReferenceID] = item.Title
				if !seen[item.ReferenceID] {
					courseEnroll[item.ReferenceID]++
					seen[item.ReferenceID] = true
				}
			}
		}
	}
	var totalRefunds int64
	for _, rf := range refunds {
		totalRefunds += rf.AmountCents
	}

	var avgOrderValue float64
	if len(orders) > 0 {
		avgOrderValue = float64(totalSales) / float64(len(orders))
	}
	var refundRate float64
	if totalSales > 0 {
		refundRate = float64(totalRefunds) / float64(totalSales) * 100.0
	}

	// Top courses by revenue.
	type topCourseRow struct {
		CourseID     string `json:"courseId"`
		Title        string `json:"title"`
		RevenueCents int64  `json:"revenueCents"`
		Enrollments  int    `json:"enrollments"`
	}
	topCourses := make([]topCourseRow, 0, len(courseRevenue))
	for cid, rev := range courseRevenue {
		topCourses = append(topCourses, topCourseRow{
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

	// Payment method breakdown (by Gateway).
	paymentMethods := map[string]int64{}
	paymentCounts := map[string]int{}
	for _, t := range txns {
		gw := t.Gateway
		if gw == "" {
			gw = "unknown"
		}
		paymentMethods[gw] += t.AmountCents
		paymentCounts[gw]++
	}
	type methodRow struct {
		Method       string `json:"method"`
		AmountCents  int64  `json:"amountCents"`
		Transactions int    `json:"transactions"`
	}
	methods := make([]methodRow, 0, len(paymentMethods))
	for m, amt := range paymentMethods {
		methods = append(methods, methodRow{
			Method:       m,
			AmountCents:  amt,
			Transactions: paymentCounts[m],
		})
	}
	sort.Slice(methods, func(i, j int) bool {
		return methods[i].AmountCents > methods[j].AmountCents
	})

	// Daily series.
	dsb := newDailySeriesBuilder(func() map[string]interface{} {
		return map[string]interface{}{
			"salesCents": int64(0),
			"orders":     0,
		}
	})
	for _, o := range orders {
		t := o.CreatedAt
		if o.PaidAt != nil {
			t = *o.PaidAt
		}
		oo := o
		dsb.add(t, func(b map[string]interface{}) {
			b["salesCents"] = b["salesCents"].(int64) + oo.TotalCents
			b["orders"] = b["orders"].(int) + 1
		})
	}
	dailySeries := dsb.build()

	response := map[string]interface{}{
		"totalSales":     totalSales,
		"totalOrders":    len(orders),
		"avgOrderValue":  avgOrderValue,
		"refundRate":     refundRate,
		"totalRefunds":   totalRefunds,
		"currency":       "USD",
		"topCourses":     topCourses,
		"paymentMethods": methods,
		"from":           p.From,
		"to":             p.To,
		"dailySeries":    dailySeries,
	}

	rows := make([]map[string]interface{}, len(dailySeries))
	for i, d := range dailySeries {
		rows[i] = map[string]interface{}{
			"date":       d["date"],
			"salesCents": d["salesCents"],
			"orders":     d["orders"],
		}
	}

	return &reportResult{
		Response: response,
		Rows:     rows,
		Columns:  []string{"date", "salesCents", "orders"},
	}, nil
}

// ===========================================================================
// 3. Enrollments report
// ===========================================================================

// EnrollmentsReport handles GET /api/lms/admin/reports/enrollments.
//
// Returns: totalEnrollments, active, completed, cancelled, growth,
// completionRate, topCourses, dailySeries.
func (h *ReportsHandler) EnrollmentsReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	p := parseReportParamsFromQuery(r)
	result, err := h.computeEnrollments(r.Context(), lctx, p)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build enrollments report: "+err.Error())
		return
	}
	h.emitReportGenerated(lctx, models.ReportTypeEnrollments, p, result.Response)
	respondWithJSON(w, http.StatusOK, result.Response)
}

func (h *ReportsHandler) computeEnrollments(ctx context.Context, lctx lmsContext, p reportParams) (*reportResult, error) {
	enrollFilter := bson.M{
		"tenantId":  lctx.TenantID,
		"createdAt": bson.M{"$gte": p.From, "$lte": p.To},
	}
	if p.CourseID != nil {
		enrollFilter["courseId"] = *p.CourseID
	}
	enrollments, err := findAll[models.Enrollment](ctx, h.db.Enrollments(), enrollFilter)
	if err != nil {
		return nil, fmt.Errorf("load enrollments: %w", err)
	}

	// Previous-period count for growth.
	dur := p.To.Sub(p.From)
	prevFrom := p.From.Add(-dur)
	prevTo := p.From.Add(-time.Nanosecond)
	prevFilter := bson.M{
		"tenantId":  lctx.TenantID,
		"createdAt": bson.M{"$gte": prevFrom, "$lte": prevTo},
	}
	if p.CourseID != nil {
		prevFilter["courseId"] = *p.CourseID
	}
	prevEnrollCount, err := h.db.Enrollments().CountDocuments(ctx, prevFilter)
	if err != nil {
		return nil, fmt.Errorf("count prev enrollments: %w", err)
	}

	// Status breakdown.
	var active, completed, cancelled int
	courseEnrollCount := map[primitive.ObjectID]int{}
	for _, e := range enrollments {
		courseEnrollCount[e.CourseID]++
		switch e.Status {
		case models.EnrollmentStatusActive:
			active++
		case models.EnrollmentStatusCompleted:
			completed++
		case models.EnrollmentStatusCancelled, models.EnrollmentStatusRefunded:
			cancelled++
		}
	}
	var completionRate float64
	if len(enrollments) > 0 {
		completionRate = float64(completed) / float64(len(enrollments)) * 100.0
	}
	growth := growthPercent(float64(len(enrollments)), float64(prevEnrollCount))

	// Top courses by enrollment count — resolve titles via Courses collection.
	courseIDs := make([]primitive.ObjectID, 0, len(courseEnrollCount))
	for cid := range courseEnrollCount {
		courseIDs = append(courseIDs, cid)
	}
	courseTitles := map[primitive.ObjectID]string{}
	if len(courseIDs) > 0 {
		courses, err := findAll[models.Course](ctx, h.db.Courses(), bson.M{
			"_id": bson.M{"$in": courseIDs},
		}, options.Find().SetProjection(bson.D{{Key: "title", Value: 1}}))
		if err == nil {
			for _, c := range courses {
				courseTitles[c.ID] = c.Title
			}
		}
	}
	type topCourseRow struct {
		CourseID    string `json:"courseId"`
		Title       string `json:"title"`
		Enrollments int    `json:"enrollments"`
	}
	topCourses := make([]topCourseRow, 0, len(courseEnrollCount))
	for cid, n := range courseEnrollCount {
		topCourses = append(topCourses, topCourseRow{
			CourseID:    cid.Hex(),
			Title:       courseTitles[cid],
			Enrollments: n,
		})
	}
	sort.Slice(topCourses, func(i, j int) bool {
		return topCourses[i].Enrollments > topCourses[j].Enrollments
	})
	if len(topCourses) > 10 {
		topCourses = topCourses[:10]
	}

	// Daily series.
	dsb := newDailySeriesBuilder(func() map[string]interface{} {
		return map[string]interface{}{"enrollments": 0}
	})
	for _, e := range enrollments {
		ee := e
		dsb.add(ee.CreatedAt, func(b map[string]interface{}) {
			b["enrollments"] = b["enrollments"].(int) + 1
		})
	}
	dailySeries := dsb.build()

	response := map[string]interface{}{
		"totalEnrollments": len(enrollments),
		"active":           active,
		"completed":        completed,
		"cancelled":        cancelled,
		"growth":           growth,
		"completionRate":   completionRate,
		"topCourses":       topCourses,
		"from":             p.From,
		"to":               p.To,
		"dailySeries":      dailySeries,
	}

	rows := make([]map[string]interface{}, len(dailySeries))
	for i, d := range dailySeries {
		rows[i] = map[string]interface{}{
			"date":        d["date"],
			"enrollments": d["enrollments"],
		}
	}

	return &reportResult{
		Response: response,
		Rows:     rows,
		Columns:  []string{"date", "enrollments"},
	}, nil
}

// ===========================================================================
// 4. Completion report
// ===========================================================================

// CompletionReport handles GET /api/lms/admin/reports/completion.
//
// Returns: overallCompletionRate, avgCompletionDays, perCourse, funnel.
func (h *ReportsHandler) CompletionReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	p := parseReportParamsFromQuery(r)
	result, err := h.computeCompletion(r.Context(), lctx, p)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build completion report: "+err.Error())
		return
	}
	h.emitReportGenerated(lctx, models.ReportTypeCompletion, p, result.Response)
	respondWithJSON(w, http.StatusOK, result.Response)
}

func (h *ReportsHandler) computeCompletion(ctx context.Context, lctx lmsContext, p reportParams) (*reportResult, error) {
	enrollFilter := bson.M{
		"tenantId":  lctx.TenantID,
		"createdAt": bson.M{"$gte": p.From, "$lte": p.To},
	}
	if p.CourseID != nil {
		enrollFilter["courseId"] = *p.CourseID
	}
	enrollments, err := findAll[models.Enrollment](ctx, h.db.Enrollments(), enrollFilter)
	if err != nil {
		return nil, fmt.Errorf("load enrollments: %w", err)
	}

	// Aggregate per-course + funnel.
	type courseAgg struct {
		enrolled      int
		completed     int
		progressSum   float64
		progressCount int
	}
	perCourseAgg := map[primitive.ObjectID]*courseAgg{}
	var completedDurationSum float64 // hours
	completedCount := 0
	startedCount := 0
	fiftyPctCount := 0
	for _, e := range enrollments {
		agg, ok := perCourseAgg[e.CourseID]
		if !ok {
			agg = &courseAgg{}
			perCourseAgg[e.CourseID] = agg
		}
		agg.enrolled++
		if e.ProgressPct > 0 {
			agg.progressSum += e.ProgressPct
			agg.progressCount++
		}
		if e.Status == models.EnrollmentStatusCompleted {
			agg.completed++
			completedCount++
			if e.CompletedAt != nil {
				dur := e.CompletedAt.Sub(e.CreatedAt).Hours()
				if dur > 0 {
					completedDurationSum += dur
				}
			}
		}
		if e.ProgressPct > 0 || e.LessonsComplete > 0 {
			startedCount++
		}
		if e.ProgressPct >= 50.0 {
			fiftyPctCount++
		}
	}

	var overallCompletionRate float64
	if len(enrollments) > 0 {
		overallCompletionRate = float64(completedCount) / float64(len(enrollments)) * 100.0
	}
	var avgCompletionDays float64
	if completedCount > 0 {
		avgCompletionDays = (completedDurationSum / float64(completedCount)) / 24.0
	}

	// Resolve course titles.
	courseIDs := make([]primitive.ObjectID, 0, len(perCourseAgg))
	for cid := range perCourseAgg {
		courseIDs = append(courseIDs, cid)
	}
	courseTitles := map[primitive.ObjectID]string{}
	if len(courseIDs) > 0 {
		courses, err := findAll[models.Course](ctx, h.db.Courses(), bson.M{
			"_id": bson.M{"$in": courseIDs},
		}, options.Find().SetProjection(bson.D{{Key: "title", Value: 1}}))
		if err == nil {
			for _, c := range courses {
				courseTitles[c.ID] = c.Title
			}
		}
	}

	type perCourseRow struct {
		CourseID       string  `json:"courseId"`
		Title          string  `json:"title"`
		Enrolled       int     `json:"enrolled"`
		Completed      int     `json:"completed"`
		CompletionRate float64 `json:"completionRate"`
		AvgProgress    float64 `json:"avgProgress"`
	}
	perCourse := make([]perCourseRow, 0, len(perCourseAgg))
	for cid, agg := range perCourseAgg {
		rate := 0.0
		if agg.enrolled > 0 {
			rate = float64(agg.completed) / float64(agg.enrolled) * 100.0
		}
		avgProg := 0.0
		if agg.progressCount > 0 {
			avgProg = agg.progressSum / float64(agg.progressCount)
		}
		perCourse = append(perCourse, perCourseRow{
			CourseID:       cid.Hex(),
			Title:          courseTitles[cid],
			Enrolled:       agg.enrolled,
			Completed:      agg.completed,
			CompletionRate: rate,
			AvgProgress:    avgProg,
		})
	}
	sort.Slice(perCourse, func(i, j int) bool {
		return perCourse[i].Enrolled > perCourse[j].Enrolled
	})

	funnel := map[string]interface{}{
		"enrolled":  len(enrollments),
		"started":   startedCount,
		"fiftyPct":  fiftyPctCount,
		"completed": completedCount,
	}

	response := map[string]interface{}{
		"overallCompletionRate": overallCompletionRate,
		"avgCompletionDays":     avgCompletionDays,
		"perCourse":             perCourse,
		"funnel":                funnel,
		"from":                  p.From,
		"to":                    p.To,
	}

	rows := make([]map[string]interface{}, len(perCourse))
	for i, c := range perCourse {
		rows[i] = map[string]interface{}{
			"courseId":       c.CourseID,
			"title":          c.Title,
			"enrolled":       c.Enrolled,
			"completed":      c.Completed,
			"completionRate": c.CompletionRate,
			"avgProgress":    c.AvgProgress,
		}
	}

	return &reportResult{
		Response: response,
		Rows:     rows,
		Columns:  []string{"courseId", "title", "enrolled", "completed", "completionRate", "avgProgress"},
	}, nil
}

// ===========================================================================
// 5. Courses report
// ===========================================================================

// CoursesReport handles GET /api/lms/admin/reports/courses.
//
// Returns: totalCourses + courses list with enrollments, revenue, rating,
// completion, status.
func (h *ReportsHandler) CoursesReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	p := parseReportParamsFromQuery(r)
	result, err := h.computeCourses(r.Context(), lctx, p)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build courses report: "+err.Error())
		return
	}
	h.emitReportGenerated(lctx, models.ReportTypeCourses, p, result.Response)
	respondWithJSON(w, http.StatusOK, result.Response)
}

func (h *ReportsHandler) computeCourses(ctx context.Context, lctx lmsContext, p reportParams) (*reportResult, error) {
	courseFilter := bson.M{"tenantId": lctx.TenantID}
	if p.InstructorID != nil {
		courseFilter["instructorId"] = *p.InstructorID
	}
	if p.CourseID != nil {
		courseFilter["_id"] = *p.CourseID
	}
	findOpts := options.Find().
		SetLimit(int64(p.Limit)).
		SetSkip(int64(p.Offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})
	courses, err := findAll[models.Course](ctx, h.db.Courses(), courseFilter, findOpts)
	if err != nil {
		return nil, fmt.Errorf("load courses: %w", err)
	}

	courseIDs := make([]primitive.ObjectID, 0, len(courses))
	instructorIDs := map[primitive.ObjectID]struct{}{}
	for _, c := range courses {
		courseIDs = append(courseIDs, c.ID)
		instructorIDs[c.InstructorID] = struct{}{}
	}

	// Aggregate enrollments per course (all-time for the tenant).
	enrollByCourse := map[primitive.ObjectID]int{}
	completedByCourse := map[primitive.ObjectID]int{}
	if len(courseIDs) > 0 {
		enrollments, err := findAll[models.Enrollment](ctx, h.db.Enrollments(), bson.M{
			"tenantId": lctx.TenantID,
			"courseId": bson.M{"$in": courseIDs},
		})
		if err == nil {
			for _, e := range enrollments {
				enrollByCourse[e.CourseID]++
				if e.Status == models.EnrollmentStatusCompleted {
					completedByCourse[e.CourseID]++
				}
			}
		}
	}

	// Aggregate revenue per course from paid orders' items.
	revenueByCourse := map[primitive.ObjectID]int64{}
	if len(courseIDs) > 0 {
		orders, err := findAll[models.Order](ctx, h.db.Orders(), bson.M{
			"tenantId":          lctx.TenantID,
			"status":            models.OrderStatusPaid,
			"items.referenceId": bson.M{"$in": courseIDs},
		})
		if err == nil {
			for _, o := range orders {
				for _, item := range o.Items {
					if item.ItemType == models.OrderItemTypeCourse {
						revenueByCourse[item.ReferenceID] += item.SubtotalCents
					}
				}
			}
		}
	}

	// Resolve instructor names.
	instructorNames := map[primitive.ObjectID]string{}
	if len(instructorIDs) > 0 {
		ids := make([]primitive.ObjectID, 0, len(instructorIDs))
		for id := range instructorIDs {
			ids = append(ids, id)
		}
		users, err := findAll[models.User](ctx, h.db.Users(), bson.M{
			"_id": bson.M{"$in": ids},
		}, options.Find().SetProjection(bson.D{{Key: "displayName", Value: 1}, {Key: "email", Value: 1}}))
		if err == nil {
			for _, u := range users {
				if u.DisplayName != "" {
					instructorNames[u.ID] = u.DisplayName
				} else {
					instructorNames[u.ID] = u.Email
				}
			}
		}
	}

	type courseRow struct {
		ID             string  `json:"id"`
		Title          string  `json:"title"`
		InstructorID   string  `json:"instructorId"`
		InstructorName string  `json:"instructorName"`
		Status         string  `json:"status"`
		Enrollments    int     `json:"enrollments"`
		RevenueCents   int64   `json:"revenueCents"`
		Rating         float64 `json:"rating"`
		RatingCount    int64   `json:"ratingCount"`
		CompletionRate float64 `json:"completionRate"`
	}
	rows := make([]courseRow, 0, len(courses))
	for _, c := range courses {
		enrolled := enrollByCourse[c.ID]
		completed := completedByCourse[c.ID]
		rate := 0.0
		if enrolled > 0 {
			rate = float64(completed) / float64(enrolled) * 100.0
		}
		rows = append(rows, courseRow{
			ID:             c.ID.Hex(),
			Title:          c.Title,
			InstructorID:   c.InstructorID.Hex(),
			InstructorName: instructorNames[c.InstructorID],
			Status:         string(c.Status),
			Enrollments:    enrolled,
			RevenueCents:   revenueByCourse[c.ID],
			Rating:         c.RatingAvg,
			RatingCount:    c.RatingCount,
			CompletionRate: rate,
		})
	}

	total, _ := h.db.Courses().CountDocuments(ctx, courseFilter)

	response := map[string]interface{}{
		"courses":  rows,
		"total":    total,
		"limit":    p.Limit,
		"offset":   p.Offset,
		"currency": "USD",
	}

	csvRows := make([]map[string]interface{}, len(rows))
	for i, r := range rows {
		csvRows[i] = map[string]interface{}{
			"id":             r.ID,
			"title":          r.Title,
			"instructorId":   r.InstructorID,
			"instructorName": r.InstructorName,
			"status":         r.Status,
			"enrollments":    r.Enrollments,
			"revenueCents":   r.RevenueCents,
			"rating":         r.Rating,
			"ratingCount":    r.RatingCount,
			"completionRate": r.CompletionRate,
		}
	}

	return &reportResult{
		Response: response,
		Rows:     csvRows,
		Columns:  []string{"id", "title", "instructorId", "instructorName", "status", "enrollments", "revenueCents", "rating", "ratingCount", "completionRate"},
	}, nil
}

// ===========================================================================
// 6. Students report
// ===========================================================================

// StudentsReport handles GET /api/lms/admin/reports/students.
//
// Returns: totalStudents + students list with enrollments, completedCourses,
// totalSpentCents, lastActive.
func (h *ReportsHandler) StudentsReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	p := parseReportParamsFromQuery(r)
	result, err := h.computeStudents(r.Context(), lctx, p)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build students report: "+err.Error())
		return
	}
	h.emitReportGenerated(lctx, models.ReportTypeStudents, p, result.Response)
	respondWithJSON(w, http.StatusOK, result.Response)
}

func (h *ReportsHandler) computeStudents(ctx context.Context, lctx lmsContext, p reportParams) (*reportResult, error) {
	// Paginated student memberships (role=user) for this tenant.
	memberships, err := findAll[models.TenantMembership](ctx, h.db.TenantMemberships(), bson.M{
		"tenantId": lctx.TenantID,
		"role":     models.RoleUser,
	}, options.Find().
		SetLimit(int64(p.Limit)).
		SetSkip(int64(p.Offset)).
		SetSort(bson.D{{Key: "joinedAt", Value: -1}}))
	if err != nil {
		return nil, fmt.Errorf("load memberships: %w", err)
	}
	studentIDs := make([]primitive.ObjectID, 0, len(memberships))
	for _, m := range memberships {
		studentIDs = append(studentIDs, m.UserID)
	}

	// Resolve user records (name + email).
	users := map[primitive.ObjectID]models.User{}
	if len(studentIDs) > 0 {
		userRows, err := findAll[models.User](ctx, h.db.Users(), bson.M{
			"_id": bson.M{"$in": studentIDs},
		}, options.Find().SetProjection(bson.D{
			{Key: "displayName", Value: 1},
			{Key: "email", Value: 1},
			{Key: "createdAt", Value: 1},
		}))
		if err == nil {
			for _, u := range userRows {
				users[u.ID] = u
			}
		}
	}

	// Aggregate enrollments per student (optionally filtered by courseId).
	enrollFilter := bson.M{
		"tenantId":  lctx.TenantID,
		"studentId": bson.M{"$in": studentIDs},
	}
	if p.CourseID != nil {
		enrollFilter["courseId"] = *p.CourseID
	}
	enrollByStudent := map[primitive.ObjectID]int{}
	completedByStudent := map[primitive.ObjectID]int{}
	if len(studentIDs) > 0 {
		enrollments, err := findAll[models.Enrollment](ctx, h.db.Enrollments(), enrollFilter)
		if err == nil {
			for _, e := range enrollments {
				enrollByStudent[e.StudentID]++
				if e.Status == models.EnrollmentStatusCompleted {
					completedByStudent[e.StudentID]++
				}
			}
		}
	}

	// Aggregate paid-order spend per student.
	spendByStudent := map[primitive.ObjectID]int64{}
	if len(studentIDs) > 0 {
		orders, err := findAll[models.Order](ctx, h.db.Orders(), bson.M{
			"tenantId": lctx.TenantID,
			"userId":   bson.M{"$in": studentIDs},
			"status":   models.OrderStatusPaid,
		})
		if err == nil {
			for _, o := range orders {
				spendByStudent[o.UserID] += o.TotalCents
			}
		}
	}

	// Last-active per student = max(LessonProgress.LastWatchedAt).
	lastActiveByStudent := map[primitive.ObjectID]time.Time{}
	if len(studentIDs) > 0 {
		progress, err := findAll[models.LessonProgress](ctx, h.db.LessonProgress(), bson.M{
			"tenantId":  lctx.TenantID,
			"studentId": bson.M{"$in": studentIDs},
		}, options.Find().SetProjection(bson.D{
			{Key: "studentId", Value: 1},
			{Key: "lastWatchedAt", Value: 1},
			{Key: "updatedAt", Value: 1},
		}))
		if err == nil {
			for _, lp := range progress {
				t := lp.UpdatedAt
				if lp.LastWatchedAt != nil && lp.LastWatchedAt.After(t) {
					t = *lp.LastWatchedAt
				}
				if t.After(lastActiveByStudent[lp.StudentID]) {
					lastActiveByStudent[lp.StudentID] = t
				}
			}
		}
	}

	type studentRow struct {
		ID               string     `json:"id"`
		Name             string     `json:"name"`
		Email            string     `json:"email"`
		Enrollments      int        `json:"enrollments"`
		CompletedCourses int        `json:"completedCourses"`
		TotalSpentCents  int64      `json:"totalSpentCents"`
		LastActive       *time.Time `json:"lastActive,omitempty"`
		JoinedAt         time.Time  `json:"joinedAt"`
	}
	rows := make([]studentRow, 0, len(memberships))
	for _, m := range memberships {
		var name, email string
		var joined time.Time
		if u, ok := users[m.UserID]; ok {
			name = u.DisplayName
			email = u.Email
			joined = u.CreatedAt
		}
		var lastActive *time.Time
		if t, ok := lastActiveByStudent[m.UserID]; ok && !t.IsZero() {
			tCopy := t
			lastActive = &tCopy
		}
		rows = append(rows, studentRow{
			ID:               m.UserID.Hex(),
			Name:             name,
			Email:            email,
			Enrollments:      enrollByStudent[m.UserID],
			CompletedCourses: completedByStudent[m.UserID],
			TotalSpentCents:  spendByStudent[m.UserID],
			LastActive:       lastActive,
			JoinedAt:         joined,
		})
	}

	total, _ := h.db.TenantMemberships().CountDocuments(ctx, bson.M{
		"tenantId": lctx.TenantID,
		"role":     models.RoleUser,
	})

	response := map[string]interface{}{
		"students": rows,
		"total":    total,
		"limit":    p.Limit,
		"offset":   p.Offset,
		"currency": "USD",
	}

	csvRows := make([]map[string]interface{}, len(rows))
	for i, r := range rows {
		lastActiveStr := ""
		if r.LastActive != nil {
			lastActiveStr = r.LastActive.Format(time.RFC3339)
		}
		csvRows[i] = map[string]interface{}{
			"id":               r.ID,
			"name":             r.Name,
			"email":            r.Email,
			"enrollments":      r.Enrollments,
			"completedCourses": r.CompletedCourses,
			"totalSpentCents":  r.TotalSpentCents,
			"lastActive":       lastActiveStr,
			"joinedAt":         r.JoinedAt.Format(time.RFC3339),
		}
	}

	return &reportResult{
		Response: response,
		Rows:     csvRows,
		Columns:  []string{"id", "name", "email", "enrollments", "completedCourses", "totalSpentCents", "lastActive", "joinedAt"},
	}, nil
}

// ===========================================================================
// 7. CSV export
// ===========================================================================

// ExportReport handles POST /api/lms/admin/reports/export.
//
// Body: { reportType: "overview|sales|enrollments|completion|courses|students",
//
//	params: { from, to, courseId, instructorId, limit, offset } }
//
// Returns: { downloadUrl, reportType, rows } where downloadUrl is a
// data:text/csv;base64,... URL the browser can navigate to directly.
func (h *ReportsHandler) ExportReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	var body struct {
		ReportType string                 `json:"reportType"`
		Params     map[string]interface{} `json:"params"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	reportType := models.ReportType(strings.TrimSpace(body.ReportType))
	p := parseReportParamsFromMap(body.Params)

	var (
		result *reportResult
		err    error
	)
	switch reportType {
	case models.ReportTypeOverview:
		result, err = h.computeOverview(r.Context(), lctx, p)
	case models.ReportTypeSales:
		result, err = h.computeSales(r.Context(), lctx, p)
	case models.ReportTypeEnrollments:
		result, err = h.computeEnrollments(r.Context(), lctx, p)
	case models.ReportTypeCompletion:
		result, err = h.computeCompletion(r.Context(), lctx, p)
	case models.ReportTypeCourses:
		result, err = h.computeCourses(r.Context(), lctx, p)
	case models.ReportTypeStudents:
		result, err = h.computeStudents(r.Context(), lctx, p)
	default:
		respondWithError(w, http.StatusBadRequest, "Unknown reportType: "+body.ReportType)
		return
	}
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to build report: "+err.Error())
		return
	}

	csvData, err := buildCSV(result.Rows, result.Columns)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to encode CSV: "+err.Error())
		return
	}
	encoded := base64.StdEncoding.EncodeToString([]byte(csvData))
	downloadURL := "data:text/csv;charset=utf-8;base64," + encoded

	h.emitReportGenerated(lctx, reportType, p, map[string]interface{}{
		"exported": true,
		"rows":     len(result.Rows),
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"downloadUrl": downloadURL,
		"reportType":  string(reportType),
		"rows":        len(result.Rows),
		"from":        p.From,
		"to":          p.To,
	})
}

// buildCSV encodes the supplied rows as CSV. When columns is empty the
// builder derives an alphabetical column list from the first row. String
// cells are passed through sanitizeCSVField (helpers.go) to defang CSV
// formula injection.
func buildCSV(rows []map[string]interface{}, columns []string) (string, error) {
	if len(columns) == 0 {
		if len(rows) == 0 {
			return "", nil
		}
		for k := range rows[0] {
			columns = append(columns, k)
		}
		sort.Strings(columns)
	}
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	if err := w.Write(columns); err != nil {
		return "", err
	}
	for _, row := range rows {
		record := make([]string, len(columns))
		for i, c := range columns {
			record[i] = formatCSVValue(row[c])
		}
		if err := w.Write(record); err != nil {
			return "", err
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// formatCSVValue renders an arbitrary interface{} value as a CSV-safe string.
// time.Time values are formatted RFC3339; nil renders as the empty string.
func formatCSVValue(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return sanitizeCSVField(val)
	case time.Time:
		return sanitizeCSVField(val.Format(time.RFC3339))
	case *time.Time:
		if val == nil {
			return ""
		}
		return sanitizeCSVField(val.Format(time.RFC3339))
	case fmt.Stringer:
		return sanitizeCSVField(val.String())
	default:
		return sanitizeCSVField(fmt.Sprintf("%v", val))
	}
}

// ===========================================================================
// 8. Saved reports CRUD
// ===========================================================================

// SaveReport handles POST /api/lms/admin/reports/save.
//
// Body: { name, reportType, config, scheduleCron? }. Persists a SavedReport
// for the tenant and emits EventReportSaved.
func (h *ReportsHandler) SaveReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	var body struct {
		Name         string                 `json:"name"`
		ReportType   string                 `json:"reportType"`
		Config       map[string]interface{} `json:"config"`
		ScheduleCron string                 `json:"scheduleCron"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	rt := models.ReportType(strings.TrimSpace(body.ReportType))
	if !isValidReportType(rt) {
		respondWithError(w, http.StatusBadRequest, "Invalid reportType")
		return
	}
	if body.Config == nil {
		body.Config = map[string]interface{}{}
	}
	now := time.Now()
	saved := models.SavedReport{
		ID:           primitive.NewObjectID(),
		TenantID:     lctx.TenantID,
		Name:         strings.TrimSpace(body.Name),
		ReportType:   rt,
		Config:       body.Config,
		ScheduleCron: strings.TrimSpace(body.ScheduleCron),
		CreatedBy:    lctx.UserID,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if _, err := h.db.SavedReports().InsertOne(r.Context(), saved); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to save report: "+err.Error())
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventReportSaved,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      lctx.TenantID.Hex(),
			"userId":        lctx.UserID.Hex(),
			"savedReportId": saved.ID.Hex(),
			"name":          saved.Name,
			"reportType":    string(saved.ReportType),
			"scheduleCron":  saved.ScheduleCron,
		},
	})

	respondWithJSON(w, http.StatusCreated, saved)
}

// ListSavedReports handles GET /api/lms/admin/reports/saved.
//
// Returns the tenant's saved report configurations sorted by createdAt desc.
// Optional query params: ?reportType=, ?limit=, ?offset=.
func (h *ReportsHandler) ListSavedReports(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": lctx.TenantID}
	if v := r.URL.Query().Get("reportType"); v != "" {
		filter["reportType"] = v
	}
	limit := parsePositiveInt(r, "limit", 50, 200)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.SavedReports().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch saved reports")
		return
	}
	defer cursor.Close(r.Context())

	var saved []models.SavedReport
	if err := cursor.All(r.Context(), &saved); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode saved reports")
		return
	}
	if saved == nil {
		saved = []models.SavedReport{}
	}
	total, _ := h.db.SavedReports().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"saved":  saved,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// DeleteSavedReport handles DELETE /api/lms/admin/reports/saved/{id}.
//
// Deletes a single SavedReport scoped to the current tenant. A 404 is
// returned when the ID is missing, malformed, or not owned by the tenant.
func (h *ReportsHandler) DeleteSavedReport(w http.ResponseWriter, r *http.Request) {
	lctx, ok := h.requireCtx(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	if idStr == "" {
		respondWithError(w, http.StatusBadRequest, "Missing saved report id")
		return
	}
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid saved report id")
		return
	}
	res, err := h.db.SavedReports().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": lctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete saved report")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Saved report not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"id":      idStr,
	})
}

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

// isValidReportType returns true when rt is one of the ReportType enum
// values declared in models/reportsai.go.
func isValidReportType(rt models.ReportType) bool {
	switch rt {
	case models.ReportTypeOverview, models.ReportTypeSales, models.ReportTypeEnrollments,
		models.ReportTypeCompletion, models.ReportTypeCourses, models.ReportTypeStudents,
		models.ReportTypeInstructors:
		return true
	}
	return false
}

// findAll is a small generic helper that runs a Find with optional FindOptions
// and decodes all matching documents into a freshly-allocated slice of T.
// It removes the cursor/decode boilerplate that would otherwise repeat in
// every compute* method above.
func findAll[T any](ctx context.Context, coll *mongo.Collection, filter interface{}, opts ...*options.FindOptions) ([]T, error) {
	cursor, err := coll.Find(ctx, filter, opts...)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)
	var out []T
	if err := cursor.All(ctx, &out); err != nil {
		return nil, err
	}
	return out, nil
}
