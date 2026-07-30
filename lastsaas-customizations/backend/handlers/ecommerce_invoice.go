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
// EcommerceInvoiceHandler — Phase 3 invoice endpoints
//
// Mounted under /api/lms/invoices. Provides list / detail / create / void /
// download-pdf operations against the lms_invoices collection. The PDF
// endpoint returns a structured JSON envelope for now (full PDF generation
// is a future enhancement) — clients can render the embedded line items or
// hit a downstream PDF service once one exists.
//
// All endpoints reuse getLMSContext (defined in lms.go) for tenant/user
// resolution, including the dev fallback that pins requests to the default
// tenant + user.
// ---------------------------------------------------------------------------

// EcommerceInvoiceHandler implements the Phase 3 invoice endpoints.
type EcommerceInvoiceHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewEcommerceInvoiceHandler constructs an EcommerceInvoiceHandler bound to
// the supplied MongoDB connection and event emitter.
func NewEcommerceInvoiceHandler(database *db.MongoDB, emitter events.Emitter) *EcommerceInvoiceHandler {
	return &EcommerceInvoiceHandler{db: database, emitter: emitter}
}

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks
// a usable tenant or authenticated user.
func (h *EcommerceInvoiceHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// generateInvoiceNumber returns an invoice number of the form
// INV-YYYYMM-NNNN where NNNN is the in-tenant sequence for the month,
// derived from a count of existing invoices sharing the same YYYYMM prefix.
// The sequence is best-effort — under concurrent inserts there is a small
// chance of collision; the (tenantId, invoiceNumber) unique index will
// reject the duplicate and the caller can retry.
func (h *EcommerceInvoiceHandler) generateInvoiceNumber(r *http.Request, tenantID primitive.ObjectID) (string, error) {
	now := time.Now().UTC()
	prefix := fmt.Sprintf("INV-%s", now.Format("200601"))
	filter := bson.M{
		"tenantId":      tenantID,
		"invoiceNumber": bson.M{"$regex": fmt.Sprintf("^%s-", prefix)},
	}
	count, err := h.db.Invoices().CountDocuments(r.Context(), filter)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s-%04d", prefix, count+1), nil
}

// ListInvoices handles GET /api/lms/invoices.
//
// Returns the tenant's invoices. Tenant admins/instructors see all invoices
// in the tenant; everyone else sees only their own. Optional query params:
// ?status=draft|paid|void, ?orderId=, ?limit=, ?offset=.
func (h *EcommerceInvoiceHandler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["userId"] = ctx.UserID
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter["status"] = status
	}
	if orderIDStr := r.URL.Query().Get("orderId"); orderIDStr != "" {
		if oid, err := primitive.ObjectIDFromHex(orderIDStr); err == nil {
			filter["orderId"] = oid
		}
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.Invoices().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch invoices")
		return
	}
	defer cursor.Close(r.Context())

	var invoices []models.Invoice
	if err := cursor.All(r.Context(), &invoices); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode invoices")
		return
	}
	if invoices == nil {
		invoices = []models.Invoice{}
	}
	total, _ := h.db.Invoices().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"invoices": invoices,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

// GetInvoice handles GET /api/lms/invoices/{id}.
//
// Returns a single Invoice scoped to the current tenant. Tenant admins see
// any invoice; everyone else may only view their own.
func (h *EcommerceInvoiceHandler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid invoice ID")
		return
	}
	var invoice models.Invoice
	filter := bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}
	if !ctx.IsInstructor {
		filter["userId"] = ctx.UserID
	}
	if err := h.db.Invoices().FindOne(r.Context(), filter).Decode(&invoice); err != nil {
		respondWithError(w, http.StatusNotFound, "Invoice not found")
		return
	}
	respondWithJSON(w, http.StatusOK, invoice)
}

// DownloadInvoicePdf handles GET /api/lms/invoices/{id}/pdf.
//
// Full PDF generation is a future enhancement — for now this endpoint
// returns a structured JSON envelope describing the invoice plus a stub
// HTML rendering (Content-Type: text/html) when the client opts in via
// ?format=html. Clients can render the payload directly or hand it to a
// downstream PDF service once one exists.
func (h *EcommerceInvoiceHandler) DownloadInvoicePdf(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid invoice ID")
		return
	}
	var invoice models.Invoice
	filter := bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}
	if !ctx.IsInstructor {
		filter["userId"] = ctx.UserID
	}
	if err := h.db.Invoices().FindOne(r.Context(), filter).Decode(&invoice); err != nil {
		respondWithError(w, http.StatusNotFound, "Invoice not found")
		return
	}

	// Future enhancement: render an actual PDF via gofpdf (already in go.mod)
	// or a headless browser. For now we either return a structured JSON
	// envelope or a simple HTML preview.
	if r.URL.Query().Get("format") == "html" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, htmlInvoicePreview(&invoice))
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"invoiceId":    invoice.ID.Hex(),
		"invoiceNumber": invoice.InvoiceNumber,
		"status":       invoice.Status,
		"totalCents":   invoice.TotalCents,
		"currency":     invoice.Currency,
		"pdfUrl":       "", // Stub: populated when a real PDF service is wired in.
		"lineItems":    invoice.LineItems,
		"billing": map[string]string{
			"name":    invoice.BillingName,
			"email":   invoice.BillingEmail,
			"address": invoice.BillingAddress,
		},
		"createdAt": invoice.CreatedAt,
	})
}

// htmlInvoicePreview returns a minimal HTML rendering of an invoice. It is
// intentionally bare-bones — the goal is just to give the API a usable
// printable representation that can be hand-rolled into a PDF later.
func htmlInvoicePreview(inv *models.Invoice) string {
	var b strings.Builder
	fmt.Fprintf(&b, "<!doctype html><html><head><meta charset=\"utf-8\">")
	fmt.Fprintf(&b, "<title>Invoice %s</title>", inv.InvoiceNumber)
	fmt.Fprintf(&b, "<style>body{font-family:sans-serif;margin:2em}table{border-collapse:collapse;width:100%%}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f5f5f5}</style>")
	fmt.Fprintf(&b, "</head><body>")
	fmt.Fprintf(&b, "<h1>Invoice %s</h1>", inv.InvoiceNumber)
	if inv.BillingName != "" || inv.BillingEmail != "" {
		fmt.Fprintf(&b, "<p><strong>Bill to:</strong> %s &lt;%s&gt;</p>", inv.BillingName, inv.BillingEmail)
	}
	if inv.BillingAddress != "" {
		fmt.Fprintf(&b, "<p>%s</p>", inv.BillingAddress)
	}
	fmt.Fprintf(&b, "<table><thead><tr><th>Description</th><th>Qty</th><th>Amount (cents)</th></tr></thead><tbody>")
	for _, li := range inv.LineItems {
		qty := li.Quantity
		if qty == 0 {
			qty = 1
		}
		fmt.Fprintf(&b, "<tr><td>%s</td><td>%d</td><td>%d</td></tr>", li.Description, qty, li.AmountCents)
	}
	fmt.Fprintf(&b, "</tbody></table>")
	fmt.Fprintf(&b, "<p><strong>Subtotal:</strong> %d %s</p>", inv.SubtotalCents, inv.Currency)
	if inv.DiscountCents > 0 {
		fmt.Fprintf(&b, "<p><strong>Discount:</strong> -%d</p>", inv.DiscountCents)
	}
	if inv.TaxCents > 0 {
		fmt.Fprintf(&b, "<p><strong>Tax:</strong> %d</p>", inv.TaxCents)
	}
	fmt.Fprintf(&b, "<p><strong>Total:</strong> %d %s</p>", inv.TotalCents, inv.Currency)
	fmt.Fprintf(&b, "<p><em>Status: %s</em></p>", inv.Status)
	fmt.Fprintf(&b, "<p><em>Issued: %s</em></p>", inv.CreatedAt.Format(time.RFC1123))
	fmt.Fprintf(&b, "</body></html>")
	return b.String()
}

// CreateInvoice handles POST /api/lms/invoices.
//
// Admin-only. Body: { userId, orderId?, lineItems[], billingName?, billingEmail?,
// billingAddress?, currency?, discountCents?, taxCents?, status? }. The
// invoice number is generated server-side. Emits invoice.created.
func (h *EcommerceInvoiceHandler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create invoices")
		return
	}

	var payload struct {
		UserID         string                   `json:"userId"`
		OrderID        string                   `json:"orderId"`
		LineItems      []models.InvoiceLineItem `json:"lineItems"`
		DiscountCents  int64                    `json:"discountCents"`
		TaxCents       int64                    `json:"taxCents"`
		Currency       string                   `json:"currency"`
		Status         string                   `json:"status"`
		BillingName    string                   `json:"billingName"`
		BillingEmail   string                   `json:"billingEmail"`
		BillingAddress string                   `json:"billingAddress"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if payload.UserID == "" {
		respondWithError(w, http.StatusBadRequest, "userId is required")
		return
	}
	userID, err := primitive.ObjectIDFromHex(payload.UserID)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "userId is invalid")
		return
	}
	if len(payload.LineItems) == 0 {
		respondWithError(w, http.StatusBadRequest, "lineItems must contain at least one item")
		return
	}
	for i, li := range payload.LineItems {
		if strings.TrimSpace(li.Description) == "" {
			respondWithError(w, http.StatusBadRequest, fmt.Sprintf("lineItems[%d].description is required", i))
			return
		}
		if li.AmountCents < 0 {
			respondWithError(w, http.StatusBadRequest, fmt.Sprintf("lineItems[%d].amountCents must be non-negative", i))
			return
		}
		if li.Quantity == 0 {
			payload.LineItems[i].Quantity = 1
		}
	}

	status := strings.TrimSpace(payload.Status)
	if status == "" {
		status = "draft"
	}
	if status != "draft" && status != "paid" && status != "void" {
		respondWithError(w, http.StatusBadRequest, "status must be one of: draft, paid, void")
		return
	}

	currency := strings.TrimSpace(payload.Currency)
	if currency == "" {
		currency = "USD"
	}

	var subtotal int64
	for _, li := range payload.LineItems {
		subtotal += li.AmountCents * int64(li.Quantity)
	}
	total := subtotal - payload.DiscountCents + payload.TaxCents
	if total < 0 {
		total = 0
	}

	invoiceNumber, err := h.generateInvoiceNumber(r, ctx.TenantID)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to generate invoice number")
		return
	}

	now := time.Now()
	invoice := models.Invoice{
		TenantID:       ctx.TenantID,
		UserID:         userID,
		InvoiceNumber:  invoiceNumber,
		LineItems:      payload.LineItems,
		SubtotalCents:  subtotal,
		DiscountCents:  payload.DiscountCents,
		TaxCents:       payload.TaxCents,
		TotalCents:     total,
		Currency:       currency,
		Status:         status,
		BillingName:    strings.TrimSpace(payload.BillingName),
		BillingEmail:   strings.TrimSpace(payload.BillingEmail),
		BillingAddress: strings.TrimSpace(payload.BillingAddress),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if payload.OrderID != "" {
		if oid, err := primitive.ObjectIDFromHex(payload.OrderID); err == nil {
			invoice.OrderID = &oid
		} else {
			respondWithError(w, http.StatusBadRequest, "orderId is invalid")
			return
		}
	}
	if status == "paid" {
		invoice.PaidAt = &now
	}

	result, err := h.db.Invoices().InsertOne(r.Context(), &invoice)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create invoice")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		invoice.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventInvoiceCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      ctx.TenantID.Hex(),
			"invoiceId":     invoice.ID.Hex(),
			"invoiceNumber": invoice.InvoiceNumber,
			"userId":        userID.Hex(),
			"totalCents":    invoice.TotalCents,
			"createdBy":     ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/invoices/"+invoice.ID.Hex())
	respondWithJSON(w, http.StatusCreated, invoice)
}

// VoidInvoice handles PATCH /api/lms/invoices/{id}/void.
//
// Admin-only. Transitions an invoice to the "void" state and emits
// invoice.voided. Only "draft" and "paid" invoices can be voided.
func (h *EcommerceInvoiceHandler) VoidInvoice(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to void invoices")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid invoice ID")
		return
	}
	var invoice models.Invoice
	if err := h.db.Invoices().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&invoice); err != nil {
		respondWithError(w, http.StatusNotFound, "Invoice not found")
		return
	}
	if invoice.Status == "void" {
		respondWithError(w, http.StatusBadRequest, "Invoice is already void")
		return
	}

	now := time.Now()
	if _, err := h.db.Invoices().UpdateByID(r.Context(), id, bson.M{
		"$set": bson.M{
			"status":    "void",
			"updatedAt": now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to void invoice")
		return
	}
	invoice.Status = "void"
	invoice.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventInvoiceVoided,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      ctx.TenantID.Hex(),
			"invoiceId":     id.Hex(),
			"invoiceNumber": invoice.InvoiceNumber,
			"voidedBy":      ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, invoice)
}
