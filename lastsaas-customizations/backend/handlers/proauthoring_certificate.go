package handlers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"lastsaas/internal/db"
	"lastsaas/internal/events"
	"lastsaas/internal/models"

	"github.com/gorilla/mux"
	"github.com/jung-kurt/gofpdf"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ---------------------------------------------------------------------------
// ProAuthoringCertificateHandler — Phase 4 certificate endpoints
//
// Mounted under /api/lms/certificates/* plus
// /api/lms/courses/{courseId}/certificate/assign. Replaces the HTTP 501 stubs
// in lms.go (ListCertificates / CreateCertificateTemplate).
//
// Covers:
//   - Issued certificates: list, get, download (PDF/HTML), public verify,
//     revoke, assign-to-course, auto-issue helper.
//   - Certificate templates: list, get, create, update, delete, duplicate,
//     preview-with-sample-data.
//   - Certificate layers: list-by-template, create, update, delete, reorder.
//   - Certificate backdrops: list, create, delete.
//   - Certificate media: list (optionally by mediaType), create, delete.
//
// All tenant-scoped queries filter by tenantId. The public verification
// endpoint is the exception — it looks up by verificationCode alone.
//
// All endpoints reuse getLMSContext (defined in lms.go) for tenant/user
// resolution, including the dev fallback that pins requests to the default
// tenant + user. Event emission follows the established events.Event{...}
// pattern; the certificate-related constants are split between
// lms_events.go (EventCertificateIssued/Revoked/TemplateCreated/Updated —
// reused) and proauthoring_events.go (the new Pro Authoring events).
// ---------------------------------------------------------------------------

// ProAuthoringCertificateHandler implements the Phase 4 certificate endpoints.
type ProAuthoringCertificateHandler struct {
	db      *db.MongoDB
	emitter events.Emitter
}

// NewProAuthoringCertificateHandler constructs a ProAuthoringCertificateHandler
// bound to the supplied MongoDB connection and event emitter.
func NewProAuthoringCertificateHandler(database *db.MongoDB, emitter events.Emitter) *ProAuthoringCertificateHandler {
	return &ProAuthoringCertificateHandler{db: database, emitter: emitter}
}

const (
	certVerificationCodeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	certVerificationCodeLength   = 12
	certNumberPrefix             = "CERT"
)

// requireContext resolves the per-request tenant/user/instructor context.
// Returns false (after writing a 400/401 response) when the request lacks a
// usable tenant or authenticated user.
func (h *ProAuthoringCertificateHandler) requireContext(w http.ResponseWriter, r *http.Request) (lmsContext, bool) {
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

// generateCertificateVerificationCode returns a cryptographically-random
// 12-character alphanumeric code suitable for public verification URLs.
func generateCertificateVerificationCode() string {
	out := make([]byte, certVerificationCodeLength)
	alphaLen := big.NewInt(int64(len(certVerificationCodeAlphabet)))
	for i := range out {
		idx, err := rand.Int(rand.Reader, alphaLen)
		if err != nil {
			out[i] = certVerificationCodeAlphabet[int(time.Now().UnixNano())%len(certVerificationCodeAlphabet)]
			continue
		}
		out[i] = certVerificationCodeAlphabet[idx.Int64()]
	}
	return string(out)
}

// generateCertificateNumber returns a certificate number of the form
// CERT-YYYYMM-NNNN where NNNN is the in-tenant sequence for the month,
// derived from a count of existing certificates sharing the same YYYYMM
// prefix. Best-effort — under concurrent inserts there is a small chance of
// collision; the caller can retry on insert conflict.
func (h *ProAuthoringCertificateHandler) generateCertificateNumber(ctx context.Context, tenantID primitive.ObjectID) (string, error) {
	now := time.Now().UTC()
	prefix := fmt.Sprintf("%s-%s", certNumberPrefix, now.Format("200601"))
	filter := bson.M{
		"tenantId":          tenantID,
		"certificateNumber": bson.M{"$regex": fmt.Sprintf("^%s-", prefix)},
	}
	count, err := h.db.Certificates().CountDocuments(ctx, filter)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s-%04d", prefix, count+1), nil
}

// resolveStudentName looks up the user's display name; returns "Student" as a
// fallback if the user record can't be loaded.
func (h *ProAuthoringCertificateHandler) resolveStudentName(ctx context.Context, studentID primitive.ObjectID) string {
	var user models.User
	if err := h.db.Users().FindOne(ctx, bson.M{"_id": studentID}).Decode(&user); err != nil {
		return "Student"
	}
	if user.DisplayName != "" {
		return user.DisplayName
	}
	if user.Email != "" {
		return user.Email
	}
	return "Student"
}

// resolveInstructorName looks up the instructor's display name; returns
// "Instructor" as a fallback.
func (h *ProAuthoringCertificateHandler) resolveInstructorName(ctx context.Context, instructorID primitive.ObjectID) string {
	var user models.User
	if err := h.db.Users().FindOne(ctx, bson.M{"_id": instructorID}).Decode(&user); err != nil {
		return "Instructor"
	}
	if user.DisplayName != "" {
		return user.DisplayName
	}
	if user.Email != "" {
		return user.Email
	}
	return "Instructor"
}

// fillPlaceholders replaces {student_name}, {course_title}, {instructor_name},
// {issue_date}, {score}, {certificate_number}, {verification_code} tokens in
// the supplied text with the values from the replacements map.
func fillPlaceholders(text string, replacements map[string]string) string {
	if text == "" {
		return ""
	}
	out := text
	for key, val := range replacements {
		out = strings.ReplaceAll(out, "{"+key+"}", val)
	}
	return out
}

// renderCertificateHTML returns a minimal HTML rendering of a certificate.
// Used by DownloadCertificate (?format=html) and PreviewCertificateTemplate.
func renderCertificateHTML(studentName, courseTitle, instructorName string, issueDate time.Time, scorePct float64, certificateNumber, verificationCode string) string {
	var b strings.Builder
	fmt.Fprintf(&b, "<!doctype html><html><head><meta charset=\"utf-8\">")
	fmt.Fprintf(&b, "<title>Certificate — %s</title>", studentName)
	fmt.Fprintf(&b, "<style>body{font-family:Georgia,serif;margin:0;padding:40px;background:#f8f6f1;color:#222}.cert{max-width:900px;margin:0 auto;background:#fff;border:8px double #b89b5e;padding:60px;text-align:center}h1{font-size:36px;margin:0 0 10px;color:#1d3557}h2{font-size:22px;font-weight:normal;margin:0 0 30px;color:#555}p.recipient{font-size:28px;font-style:italic;margin:20px 0;border-bottom:1px solid #ccc;padding-bottom:20px}.meta{margin-top:30px;font-size:14px;color:#666}.footer{margin-top:40px;font-size:12px;color:#999}</style>")
	fmt.Fprintf(&b, "</head><body><div class=\"cert\">")
	fmt.Fprintf(&b, "<h1>Certificate of Completion</h1>")
	fmt.Fprintf(&b, "<h2>This certifies that</h2>")
	fmt.Fprintf(&b, "<p class=\"recipient\">%s</p>", studentName)
	fmt.Fprintf(&b, "<p>has successfully completed</p>")
	fmt.Fprintf(&b, "<p style=\"font-size:22px;font-weight:bold;color:#1d3557\">%s</p>", courseTitle)
	if instructorName != "" {
		fmt.Fprintf(&b, "<p>Instructor: %s</p>", instructorName)
	}
	if scorePct > 0 {
		fmt.Fprintf(&b, "<p>Final Score: %.1f%%</p>", scorePct)
	}
	fmt.Fprintf(&b, "<div class=\"meta\">")
	fmt.Fprintf(&b, "<p>Issued: %s</p>", issueDate.Format("January 2, 2006"))
	fmt.Fprintf(&b, "<p>Certificate #: %s</p>", certificateNumber)
	fmt.Fprintf(&b, "<p>Verification Code: %s</p>", verificationCode)
	fmt.Fprintf(&b, "</div>")
	fmt.Fprintf(&b, "</div></body></html>")
	return b.String()
}

// renderCertificatePDF renders an issued certificate to a PDF byte buffer using
// gofpdf. The template supplies the orientation (landscape default); all other
// styling is hard-coded for now (Phase 4 polish will pass layer payloads into
// the renderer).
func renderCertificatePDF(cert *models.Certificate, template *models.CertificateTemplate) (*bytes.Buffer, error) {
	orientation := "L" // landscape
	if template != nil && strings.EqualFold(template.Orientation, "portrait") {
		orientation = "P"
	}
	pdf := gofpdf.New(orientation, "mm", "A4", "")
	pdf.AddPage()

	// Title
	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetTextColor(29, 53, 87)
	pdf.Cell(0, 10, "CERTIFICATE OF COMPLETION")
	pdf.Ln(20)

	// Recipient name
	pdf.SetFont("Helvetica", "B", 28)
	pdf.SetTextColor(20, 20, 20)
	pdf.Cell(0, 15, cert.StudentName)
	pdf.Ln(20)

	// Course title
	pdf.SetFont("Helvetica", "", 14)
	pdf.SetTextColor(80, 80, 80)
	pdf.MultiCell(0, 8, fmt.Sprintf("has successfully completed %s", cert.CourseTitle), "", "C", false)
	pdf.Ln(15)

	if cert.InstructorName != "" {
		pdf.SetFont("Helvetica", "", 12)
		pdf.Cell(0, 8, fmt.Sprintf("Instructor: %s", cert.InstructorName))
		pdf.Ln(10)
	}
	if cert.FinalScorePct > 0 {
		pdf.Cell(0, 8, fmt.Sprintf("Final Score: %.1f%%", cert.FinalScorePct))
		pdf.Ln(10)
	}

	pdf.SetFont("Helvetica", "", 11)
	pdf.Cell(0, 8, fmt.Sprintf("Issued: %s", cert.IssueDate.Format("January 2, 2006")))
	pdf.Ln(8)
	pdf.Cell(0, 8, fmt.Sprintf("Certificate #: %s", cert.CertificateNumber))
	pdf.Ln(8)
	pdf.SetTextColor(120, 120, 120)
	pdf.Cell(0, 8, fmt.Sprintf("Verification Code: %s", cert.VerificationCode))

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return &buf, nil
}

// ===========================================================================
// Issued certificates
// ===========================================================================

// ListCertificates handles GET /api/lms/certificates.
//
// Returns the tenant's issued certificates. Students see only their own;
// instructors/admins see all. Optional query params: ?courseId=, ?limit=,
// ?offset=.
func (h *ProAuthoringCertificateHandler) ListCertificates(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if !ctx.IsInstructor {
		filter["studentId"] = ctx.UserID
	}
	if courseIDStr := r.URL.Query().Get("courseId"); courseIDStr != "" {
		if oid, err := primitive.ObjectIDFromHex(courseIDStr); err == nil {
			filter["courseId"] = oid
		}
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.Certificates().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch certificates")
		return
	}
	defer cursor.Close(r.Context())

	var certs []models.Certificate
	if err := cursor.All(r.Context(), &certs); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode certificates")
		return
	}
	if certs == nil {
		certs = []models.Certificate{}
	}
	total, _ := h.db.Certificates().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"certificates": certs,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

// GetCertificate handles GET /api/lms/certificates/{id}.
//
// Returns a single Certificate scoped to the current tenant. Tenant admins
// see any certificate; students see only their own.
func (h *ProAuthoringCertificateHandler) GetCertificate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid certificate ID")
		return
	}
	filter := bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}
	if !ctx.IsInstructor {
		filter["studentId"] = ctx.UserID
	}
	var cert models.Certificate
	if err := h.db.Certificates().FindOne(r.Context(), filter).Decode(&cert); err != nil {
		respondWithError(w, http.StatusNotFound, "Certificate not found")
		return
	}
	respondWithJSON(w, http.StatusOK, cert)
}

// DownloadCertificate handles GET /api/lms/certificates/{id}/download.
//
// Generates a PDF (default) or HTML preview (?format=html) of the issued
// certificate. Emits EventCertificateDownloaded on success.
func (h *ProAuthoringCertificateHandler) DownloadCertificate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid certificate ID")
		return
	}
	filter := bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}
	if !ctx.IsInstructor {
		filter["studentId"] = ctx.UserID
	}
	var cert models.Certificate
	if err := h.db.Certificates().FindOne(r.Context(), filter).Decode(&cert); err != nil {
		respondWithError(w, http.StatusNotFound, "Certificate not found")
		return
	}
	if cert.IsRevoked {
		respondWithError(w, http.StatusGone, "Certificate has been revoked")
		return
	}

	// Best-effort: load the template for orientation + styling hints.
	var template *models.CertificateTemplate
	if !cert.TemplateID.IsZero() {
		var tpl models.CertificateTemplate
		if err := h.db.CertificateTemplates().FindOne(r.Context(), bson.M{
			"_id":      cert.TemplateID,
			"tenantId": ctx.TenantID,
		}).Decode(&tpl); err == nil {
			template = &tpl
		}
	}

	now := time.Now()
	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateDownloaded,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      ctx.TenantID.Hex(),
			"certificateId": cert.ID.Hex(),
			"userId":        ctx.UserID.Hex(),
			"format":        r.URL.Query().Get("format"),
		},
	})

	if r.URL.Query().Get("format") == "html" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, renderCertificateHTML(
			cert.StudentName, cert.CourseTitle, cert.InstructorName,
			cert.IssueDate, cert.FinalScorePct, cert.CertificateNumber, cert.VerificationCode,
		))
		return
	}

	buf, err := renderCertificatePDF(&cert, template)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="certificate-%s.pdf"`, cert.CertificateNumber))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", buf.Len()))
	w.Write(buf.Bytes())
}

// VerifyCertificate handles GET /api/lms/certificates/verify/{code}.
//
// PUBLIC endpoint — no auth required. Looks up the certificate by its
// verification code (no tenantId filter — verification codes are globally
// unique). Returns { valid: true, certificate } on a live certificate or
// { valid: false } on a missing/revoked one.
func (h *ProAuthoringCertificateHandler) VerifyCertificate(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(mux.Vars(r)["code"])
	if code == "" {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"valid": false,
		})
		return
	}

	var cert models.Certificate
	if err := h.db.Certificates().FindOne(r.Context(), bson.M{
		"verificationCode": code,
	}).Decode(&cert); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"valid":  false,
			"reason": "not_found",
		})
		return
	}

	if cert.IsRevoked {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"valid":       false,
			"reason":      "revoked",
			"revokedAt":   cert.RevokedAt,
			"certificate": cert,
		})
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"valid":       true,
		"certificate": cert,
	})
}

// RevokeCertificate handles POST /api/lms/certificates/{id}/revoke.
//
// Admin/instructor only. Marks the certificate as revoked (isRevoked=true,
// revokedAt=now). Optional body: { "reason": "..." }. Emits
// EventCertificateRevoked (reused from lms_events.go).
func (h *ProAuthoringCertificateHandler) RevokeCertificate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to revoke certificates")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid certificate ID")
		return
	}

	var payload struct {
		Reason string `json:"reason"`
	}
	// Body is optional — ignore decode errors.
	_ = json.NewDecoder(r.Body).Decode(&payload)

	var cert models.Certificate
	if err := h.db.Certificates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&cert); err != nil {
		respondWithError(w, http.StatusNotFound, "Certificate not found")
		return
	}
	if cert.IsRevoked {
		respondWithError(w, http.StatusBadRequest, "Certificate already revoked")
		return
	}

	now := time.Now()
	if _, err := h.db.Certificates().UpdateByID(r.Context(), cert.ID, bson.M{
		"$set": bson.M{
			"isRevoked": true,
			"revokedAt": now,
			"updatedAt": now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to revoke certificate")
		return
	}
	cert.IsRevoked = true
	cert.RevokedAt = &now
	cert.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateRevoked,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":      ctx.TenantID.Hex(),
			"certificateId": cert.ID.Hex(),
			"revokedBy":     ctx.UserID.Hex(),
			"reason":        payload.Reason,
		},
	})

	respondWithJSON(w, http.StatusOK, cert)
}

// AssignCertificateToCourse handles POST /api/lms/courses/{courseId}/certificate/assign.
//
// Body: { "templateId": "...", "autoIssue": true|false }. Links the template
// to the course by setting Course.CertificateID. The autoIssue flag is
// accepted (and emitted in the event) but not persisted on the Course model
// today — auto-issue is triggered by IssueCertificateForEnrollment when an
// enrollment flips to "completed" status, regardless of the flag, so the flag
// is informational for now. Admin/instructor only. Emits
// EventCertificateAssigned.
func (h *ProAuthoringCertificateHandler) AssignCertificateToCourse(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to assign certificate")
		return
	}
	courseIDStr := mux.Vars(r)["courseId"]
	courseID, err := primitive.ObjectIDFromHex(courseIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid course ID")
		return
	}

	var payload struct {
		TemplateID string `json:"templateId"`
		AutoIssue  bool   `json:"autoIssue"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	var course models.Course
	if err := h.db.Courses().FindOne(r.Context(), bson.M{
		"_id":      courseID,
		"tenantId": ctx.TenantID,
	}).Decode(&course); err != nil {
		respondWithError(w, http.StatusNotFound, "Course not found")
		return
	}

	var templateID *primitive.ObjectID
	if payload.TemplateID != "" {
		tplID, err := primitive.ObjectIDFromHex(payload.TemplateID)
		if err != nil {
			respondWithError(w, http.StatusBadRequest, "Invalid templateId")
			return
		}
		// Validate the template belongs to the tenant.
		count, err := h.db.CertificateTemplates().CountDocuments(r.Context(), bson.M{
			"_id":      tplID,
			"tenantId": ctx.TenantID,
		})
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to verify template")
			return
		}
		if count == 0 {
			respondWithError(w, http.StatusNotFound, "Certificate template not found")
			return
		}
		templateID = &tplID
	}

	now := time.Now()
	if _, err := h.db.Courses().UpdateByID(r.Context(), courseID, bson.M{
		"$set": bson.M{
			"certificateTemplateId": templateID,
			"updatedAt":             now,
		},
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to assign certificate")
		return
	}
	course.CertificateID = templateID
	course.UpdatedAt = now

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateAssigned,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"courseId":   courseID.Hex(),
			"templateId": payload.TemplateID,
			"autoIssue":  payload.AutoIssue,
			"assignedBy": ctx.UserID.Hex(),
		},
	})

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"courseId":   courseID.Hex(),
		"templateId": payload.TemplateID,
		"autoIssue":  payload.AutoIssue,
		"assigned":   true,
	})
}

// ===========================================================================
// Certificate templates
// ===========================================================================

// ListCertificateTemplates handles GET /api/lms/certificates/templates.
//
// Returns the tenant's certificate templates. Optional ?isActive=true|false
// filter.
func (h *ProAuthoringCertificateHandler) ListCertificateTemplates(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if activeStr := r.URL.Query().Get("isActive"); activeStr != "" {
		filter["isActive"] = activeStr == "true" || activeStr == "1"
	}

	limit := parsePositiveInt(r, "limit", 50, 100)
	offset := parsePositiveInt(r, "offset", 0, 1<<30)
	findOpts := options.Find().
		SetLimit(int64(limit)).
		SetSkip(int64(offset)).
		SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := h.db.CertificateTemplates().Find(r.Context(), filter, findOpts)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch certificate templates")
		return
	}
	defer cursor.Close(r.Context())

	var templates []models.CertificateTemplate
	if err := cursor.All(r.Context(), &templates); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode certificate templates")
		return
	}
	if templates == nil {
		templates = []models.CertificateTemplate{}
	}
	total, _ := h.db.CertificateTemplates().CountDocuments(r.Context(), filter)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"templates": templates,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}

// GetCertificateTemplate handles GET /api/lms/certificates/templates/{id}.
func (h *ProAuthoringCertificateHandler) GetCertificateTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}
	var tpl models.CertificateTemplate
	if err := h.db.CertificateTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&tpl); err != nil {
		respondWithError(w, http.StatusNotFound, "Certificate template not found")
		return
	}
	respondWithJSON(w, http.StatusOK, tpl)
}

// CreateCertificateTemplate handles POST /api/lms/certificates/templates.
//
// Body: { name, orientation?, backgroundUrl?, logoUrl?, signatureUrl?,
// htmlTemplate?, fontFamily?, primaryColor?, accentColor?, isActive? }. Emits
// EventCertificateTemplateCreated (reused from lms_events.go). Admin/instructor
// only.
func (h *ProAuthoringCertificateHandler) CreateCertificateTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create certificate templates")
		return
	}

	var tpl models.CertificateTemplate
	if err := json.NewDecoder(r.Body).Decode(&tpl); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(tpl.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	tpl.ID = primitive.NilObjectID
	tpl.TenantID = ctx.TenantID
	if tpl.Orientation == "" {
		tpl.Orientation = "landscape"
	}
	now := time.Now()
	tpl.CreatedAt = now
	tpl.UpdatedAt = now

	result, err := h.db.CertificateTemplates().InsertOne(r.Context(), &tpl)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create certificate template")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		tpl.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateTemplateCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"templateId": tpl.ID.Hex(),
			"name":       tpl.Name,
			"createdBy":  ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/certificates/templates/"+tpl.ID.Hex())
	respondWithJSON(w, http.StatusCreated, tpl)
}

// UpdateCertificateTemplate handles PATCH /api/lms/certificates/templates/{id}.
//
// Body: a subset of the writable CertificateTemplate fields (name, orientation,
// backgroundUrl, logoUrl, signatureUrl, htmlTemplate, fontFamily, primaryColor,
// accentColor, isActive). Emits EventCertificateTemplateUpdated (reused from
// lms_events.go). Admin/instructor only.
func (h *ProAuthoringCertificateHandler) UpdateCertificateTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to update certificate templates")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Whitelist writable fields.
	allowed := map[string]bool{
		"name":          true,
		"orientation":   true,
		"backgroundUrl": true,
		"logoUrl":       true,
		"signatureUrl":  true,
		"htmlTemplate":  true,
		"fontFamily":    true,
		"primaryColor":  true,
		"accentColor":   true,
		"isActive":      true,
	}
	setFields := bson.M{}
	for k, v := range payload {
		if allowed[k] {
			setFields[k] = v
		}
	}
	if _, hasName := setFields["name"]; hasName {
		if nameStr, ok := setFields["name"].(string); ok && strings.TrimSpace(nameStr) == "" {
			respondWithError(w, http.StatusBadRequest, "name must not be empty")
			return
		}
	}
	if len(setFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No writable fields supplied")
		return
	}
	now := time.Now()
	setFields["updatedAt"] = now

	if _, err := h.db.CertificateTemplates().UpdateByID(r.Context(), id, bson.M{
		"$set": setFields,
	}); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update certificate template")
		return
	}

	var updated models.CertificateTemplate
	if err := h.db.CertificateTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&updated); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"id":        id.Hex(),
			"updatedAt": now,
		})
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateTemplateUpdated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"templateId": id.Hex(),
			"updatedBy":  ctx.UserID.Hex(),
			"fields":     setFields,
		},
	})

	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteCertificateTemplate handles DELETE /api/lms/certificates/templates/{id}.
//
// Admin/instructor only. Hard-deletes the template. Layers referencing the
// template are NOT auto-deleted today (they become orphaned); a future
// enhancement may add a cascade. The Course.CertificateID pointer is NOT
// auto-cleared either — callers should re-assign before deleting if needed.
func (h *ProAuthoringCertificateHandler) DeleteCertificateTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to delete certificate templates")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}
	res, err := h.db.CertificateTemplates().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete certificate template")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Certificate template not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Certificate template deleted",
		"id":      id.Hex(),
	})
}

// DuplicateCertificateTemplate handles POST
// /api/lms/certificates/templates/{id}/duplicate.
//
// Admin/instructor only. Creates a deep copy of the template (with a new
// ObjectID and name "<original> (copy)") AND all of its layers. Emits
// EventCertificateTemplateDuplicated.
func (h *ProAuthoringCertificateHandler) DuplicateCertificateTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to duplicate certificate templates")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var src models.CertificateTemplate
	if err := h.db.CertificateTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&src); err != nil {
		respondWithError(w, http.StatusNotFound, "Certificate template not found")
		return
	}

	now := time.Now()
	dup := src
	dup.ID = primitive.NilObjectID
	dup.Name = src.Name + " (copy)"
	dup.CreatedAt = now
	dup.UpdatedAt = now

	result, err := h.db.CertificateTemplates().InsertOne(r.Context(), &dup)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to duplicate certificate template")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		dup.ID = oid
	}

	// Copy layers referencing the source template onto the new template.
	cursor, err := h.db.CertificateLayers().Find(r.Context(), bson.M{
		"tenantId":   ctx.TenantID,
		"templateId": src.ID,
	})
	if err == nil {
		defer cursor.Close(r.Context())
		for cursor.Next(r.Context()) {
			var layer models.CertificateLayer
			if err := cursor.Decode(&layer); err != nil {
				continue
			}
			layer.ID = primitive.NilObjectID
			layer.TemplateID = dup.ID
			layer.CreatedAt = now
			layer.UpdatedAt = now
			_, _ = h.db.CertificateLayers().InsertOne(r.Context(), &layer)
		}
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateTemplateDuplicated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":     ctx.TenantID.Hex(),
			"sourceId":     src.ID.Hex(),
			"duplicateId":  dup.ID.Hex(),
			"duplicatedBy": ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/certificates/templates/"+dup.ID.Hex())
	respondWithJSON(w, http.StatusCreated, dup)
}

// PreviewCertificateTemplate handles POST
// /api/lms/certificates/templates/{id}/preview.
//
// Renders the template with sample data (replace {student_name} with
// "John Doe", {course_title} with "Sample Course", etc.). Returns an HTML
// preview directly (Content-Type: text/html) so the client can render it in
// an iframe. Optional body: { "studentName"?, "courseTitle"?, "instructorName"?,
// "issueDate"?, "scorePct?" } — overrides the sample defaults.
func (h *ProAuthoringCertificateHandler) PreviewCertificateTemplate(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}
	var tpl models.CertificateTemplate
	if err := h.db.CertificateTemplates().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&tpl); err != nil {
		respondWithError(w, http.StatusNotFound, "Certificate template not found")
		return
	}

	var payload struct {
		StudentName    string  `json:"studentName"`
		CourseTitle    string  `json:"courseTitle"`
		InstructorName string  `json:"instructorName"`
		IssueDate      string  `json:"issueDate"`
		ScorePct       float64 `json:"scorePct"`
	}
	// Body optional.
	_ = json.NewDecoder(r.Body).Decode(&payload)

	studentName := payload.StudentName
	if studentName == "" {
		studentName = "John Doe"
	}
	courseTitle := payload.CourseTitle
	if courseTitle == "" {
		courseTitle = "Sample Course"
	}
	instructorName := payload.InstructorName
	if instructorName == "" {
		instructorName = "Jane Instructor"
	}
	issueDate := time.Now()
	if payload.IssueDate != "" {
		if parsed, err := time.Parse(time.RFC3339, payload.IssueDate); err == nil {
			issueDate = parsed
		}
	}
	scorePct := payload.ScorePct
	if scorePct == 0 {
		scorePct = 95.0
	}
	certNumber := fmt.Sprintf("%s-PREVIEW-%s", certNumberPrefix, time.Now().UTC().Format("0102150405"))
	verificationCode := "PREVIEWCODE1"

	// If the template declares an htmlTemplate, substitute placeholders;
	// otherwise fall back to the standard renderer.
	if strings.TrimSpace(tpl.HTMLTemplate) != "" {
		replacements := map[string]string{
			"student_name":       studentName,
			"course_title":       courseTitle,
			"instructor_name":    instructorName,
			"issue_date":         issueDate.Format("January 2, 2006"),
			"score":              fmt.Sprintf("%.1f%%", scorePct),
			"certificate_number": certNumber,
			"verification_code":  verificationCode,
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, fillPlaceholders(tpl.HTMLTemplate, replacements))
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, renderCertificateHTML(
		studentName, courseTitle, instructorName, issueDate, scorePct, certNumber, verificationCode,
	))
}

// ===========================================================================
// Certificate layers
// ===========================================================================

// ListCertificateLayers handles GET
// /api/lms/certificates/templates/{templateId}/layers.
//
// Returns the layers for the given template, sorted ascending by sortOrder.
func (h *ProAuthoringCertificateHandler) ListCertificateLayers(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	templateIDStr := mux.Vars(r)["templateId"]
	templateID, err := primitive.ObjectIDFromHex(templateIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}
	cursor, err := h.db.CertificateLayers().Find(r.Context(), bson.M{
		"tenantId":   ctx.TenantID,
		"templateId": templateID,
	}, options.Find().SetSort(bson.D{{Key: "sortOrder", Value: 1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch certificate layers")
		return
	}
	defer cursor.Close(r.Context())

	var layers []models.CertificateLayer
	if err := cursor.All(r.Context(), &layers); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode certificate layers")
		return
	}
	if layers == nil {
		layers = []models.CertificateLayer{}
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"layers":     layers,
		"templateId": templateID.Hex(),
	})
}

// CreateCertificateLayer handles POST /api/lms/certificates/layers.
//
// Body: a CertificateLayer JSON object (without id/tenantId/createdAt/updatedAt
// — server populates). Requires templateId, name, layerType. Emits
// EventCertificateLayerCreated. Admin/instructor only.
func (h *ProAuthoringCertificateHandler) CreateCertificateLayer(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create certificate layers")
		return
	}
	var layer models.CertificateLayer
	if err := json.NewDecoder(r.Body).Decode(&layer); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if layer.TemplateID.IsZero() {
		respondWithError(w, http.StatusBadRequest, "templateId is required")
		return
	}
	if strings.TrimSpace(layer.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(layer.LayerType) == "" {
		respondWithError(w, http.StatusBadRequest, "layerType is required")
		return
	}
	// Validate the template belongs to the tenant.
	count, err := h.db.CertificateTemplates().CountDocuments(r.Context(), bson.M{
		"_id":      layer.TemplateID,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to verify template")
		return
	}
	if count == 0 {
		respondWithError(w, http.StatusNotFound, "Certificate template not found")
		return
	}

	layer.ID = primitive.NilObjectID
	layer.TenantID = ctx.TenantID
	if layer.SortOrder == 0 {
		// Append to the end of the template's layer list.
		nextOrder, _ := h.db.CertificateLayers().CountDocuments(r.Context(), bson.M{
			"tenantId":   ctx.TenantID,
			"templateId": layer.TemplateID,
		})
		layer.SortOrder = int(nextOrder) + 1
	}
	now := time.Now()
	layer.CreatedAt = now
	layer.UpdatedAt = now

	result, err := h.db.CertificateLayers().InsertOne(r.Context(), &layer)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create certificate layer")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		layer.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateLayerCreated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":   ctx.TenantID.Hex(),
			"templateId": layer.TemplateID.Hex(),
			"layerId":    layer.ID.Hex(),
			"layerType":  layer.LayerType,
			"createdBy":  ctx.UserID.Hex(),
		},
	})

	w.Header().Set("Location", "/api/lms/certificates/layers/"+layer.ID.Hex())
	respondWithJSON(w, http.StatusCreated, layer)
}

// UpdateCertificateLayer handles PATCH /api/lms/certificates/layers/{id}.
//
// Body: a subset of the writable CertificateLayer fields. Emits
// EventCertificateLayerUpdated. Admin/instructor only.
func (h *ProAuthoringCertificateHandler) UpdateCertificateLayer(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to update certificate layers")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid layer ID")
		return
	}

	var payload map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	allowed := map[string]bool{
		"name":        true,
		"layerType":   true,
		"sortOrder":   true,
		"positionX":   true,
		"positionY":   true,
		"width":       true,
		"height":      true,
		"rotation":    true,
		"opacity":     true,
		"content":     true,
		"fontFamily":  true,
		"fontSize":    true,
		"fontWeight":  true,
		"fontStyle":   true,
		"textAlign":   true,
		"color":       true,
		"imageUrl":    true,
		"shapeType":   true,
		"fillColor":   true,
		"borderColor": true,
		"borderWidth": true,
		"dataKey":     true,
		"isVisible":   true,
		"isLocked":    true,
	}
	setFields := bson.M{}
	for k, v := range payload {
		if allowed[k] {
			setFields[k] = v
		}
	}
	if len(setFields) == 0 {
		respondWithError(w, http.StatusBadRequest, "No writable fields supplied")
		return
	}
	now := time.Now()
	setFields["updatedAt"] = now

	res, err := h.db.CertificateLayers().UpdateOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}, bson.M{"$set": setFields})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to update certificate layer")
		return
	}
	if res.MatchedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Certificate layer not found")
		return
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateLayerUpdated,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":  ctx.TenantID.Hex(),
			"layerId":   id.Hex(),
			"updatedBy": ctx.UserID.Hex(),
			"fields":    setFields,
		},
	})

	var updated models.CertificateLayer
	if err := h.db.CertificateLayers().FindOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	}).Decode(&updated); err != nil {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"id":        id.Hex(),
			"updatedAt": now,
		})
		return
	}
	respondWithJSON(w, http.StatusOK, updated)
}

// DeleteCertificateLayer handles DELETE /api/lms/certificates/layers/{id}.
//
// Admin/instructor only.
func (h *ProAuthoringCertificateHandler) DeleteCertificateLayer(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to delete certificate layers")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid layer ID")
		return
	}
	res, err := h.db.CertificateLayers().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete certificate layer")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Certificate layer not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Certificate layer deleted",
		"id":      id.Hex(),
	})
}

// ReorderCertificateLayers handles POST
// /api/lms/certificates/templates/{templateId}/layers/reorder.
//
// Body: { "layerIds": ["<id1>", "<id2>", "<id3>"] }. Updates sortOrder for
// each layer ID to its index in the array. Admin/instructor only.
func (h *ProAuthoringCertificateHandler) ReorderCertificateLayers(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to reorder certificate layers")
		return
	}
	templateIDStr := mux.Vars(r)["templateId"]
	templateID, err := primitive.ObjectIDFromHex(templateIDStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid template ID")
		return
	}

	var payload struct {
		LayerIDs []string `json:"layerIds"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(payload.LayerIDs) == 0 {
		respondWithError(w, http.StatusBadRequest, "layerIds is required")
		return
	}

	now := time.Now()
	for i, layerIDStr := range payload.LayerIDs {
		layerID, err := primitive.ObjectIDFromHex(layerIDStr)
		if err != nil {
			continue
		}
		_, _ = h.db.CertificateLayers().UpdateOne(r.Context(), bson.M{
			"_id":        layerID,
			"tenantId":   ctx.TenantID,
			"templateId": templateID,
		}, bson.M{
			"$set": bson.M{
				"sortOrder": i + 1,
				"updatedAt": now,
			},
		})
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"templateId": templateID.Hex(),
		"reordered":  len(payload.LayerIDs),
	})
}

// ===========================================================================
// Certificate backdrops & media
// ===========================================================================

// ListCertificateBackdrops handles GET /api/lms/certificates/backdrops.
//
// Optional ?orientation=landscape|portrait filter.
func (h *ProAuthoringCertificateHandler) ListCertificateBackdrops(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if orientation := r.URL.Query().Get("orientation"); orientation != "" {
		filter["orientation"] = orientation
	}
	cursor, err := h.db.CertificateBackdrops().Find(r.Context(), filter,
		options.Find().SetSort(bson.D{{Key: "isDefault", Value: -1}, {Key: "createdAt", Value: -1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch certificate backdrops")
		return
	}
	defer cursor.Close(r.Context())

	var backdrops []models.CertificateBackdrop
	if err := cursor.All(r.Context(), &backdrops); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode certificate backdrops")
		return
	}
	if backdrops == nil {
		backdrops = []models.CertificateBackdrop{}
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"backdrops": backdrops,
	})
}

// CreateCertificateBackdrop handles POST /api/lms/certificates/backdrops.
//
// Body: { name, imageUrl, orientation?, width?, height?, isDefault? }. Admin/
// instructor only.
func (h *ProAuthoringCertificateHandler) CreateCertificateBackdrop(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create certificate backdrops")
		return
	}
	var bd models.CertificateBackdrop
	if err := json.NewDecoder(r.Body).Decode(&bd); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(bd.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(bd.ImageURL) == "" {
		respondWithError(w, http.StatusBadRequest, "imageUrl is required")
		return
	}
	bd.ID = primitive.NilObjectID
	bd.TenantID = ctx.TenantID
	bd.CreatedAt = time.Now()

	// If the new backdrop is being marked as the default, clear the previous
	// default (only one default per tenant).
	if bd.IsDefault {
		_, _ = h.db.CertificateBackdrops().UpdateMany(r.Context(), bson.M{
			"tenantId":  ctx.TenantID,
			"isDefault": true,
		}, bson.M{"$set": bson.M{"isDefault": false}})
	}

	result, err := h.db.CertificateBackdrops().InsertOne(r.Context(), &bd)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create certificate backdrop")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		bd.ID = oid
	}
	w.Header().Set("Location", "/api/lms/certificates/backdrops/"+bd.ID.Hex())
	respondWithJSON(w, http.StatusCreated, bd)
}

// DeleteCertificateBackdrop handles DELETE /api/lms/certificates/backdrops/{id}.
func (h *ProAuthoringCertificateHandler) DeleteCertificateBackdrop(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to delete certificate backdrops")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid backdrop ID")
		return
	}
	res, err := h.db.CertificateBackdrops().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete certificate backdrop")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Certificate backdrop not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Certificate backdrop deleted",
		"id":      id.Hex(),
	})
}

// ListCertificateMedia handles GET /api/lms/certificates/media.
//
// Optional ?mediaType=logo|signature|watermark|stamp filter.
func (h *ProAuthoringCertificateHandler) ListCertificateMedia(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	filter := bson.M{"tenantId": ctx.TenantID}
	if mediaType := r.URL.Query().Get("mediaType"); mediaType != "" {
		filter["mediaType"] = mediaType
	}
	cursor, err := h.db.CertificateMedia().Find(r.Context(), filter,
		options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch certificate media")
		return
	}
	defer cursor.Close(r.Context())

	var media []models.CertificateMedia
	if err := cursor.All(r.Context(), &media); err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to decode certificate media")
		return
	}
	if media == nil {
		media = []models.CertificateMedia{}
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"media": media,
	})
}

// CreateCertificateMedia handles POST /api/lms/certificates/media.
//
// Body: { name, mediaType, imageUrl, width?, height? }. Admin/instructor only.
func (h *ProAuthoringCertificateHandler) CreateCertificateMedia(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to create certificate media")
		return
	}
	var media models.CertificateMedia
	if err := json.NewDecoder(r.Body).Decode(&media); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if strings.TrimSpace(media.Name) == "" {
		respondWithError(w, http.StatusBadRequest, "name is required")
		return
	}
	if strings.TrimSpace(media.MediaType) == "" {
		respondWithError(w, http.StatusBadRequest, "mediaType is required")
		return
	}
	if strings.TrimSpace(media.ImageURL) == "" {
		respondWithError(w, http.StatusBadRequest, "imageUrl is required")
		return
	}
	media.ID = primitive.NilObjectID
	media.TenantID = ctx.TenantID
	media.CreatedAt = time.Now()

	result, err := h.db.CertificateMedia().InsertOne(r.Context(), &media)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to create certificate media")
		return
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		media.ID = oid
	}
	w.Header().Set("Location", "/api/lms/certificates/media/"+media.ID.Hex())
	respondWithJSON(w, http.StatusCreated, media)
}

// DeleteCertificateMedia handles DELETE /api/lms/certificates/media/{id}.
func (h *ProAuthoringCertificateHandler) DeleteCertificateMedia(w http.ResponseWriter, r *http.Request) {
	ctx, ok := h.requireContext(w, r)
	if !ok {
		return
	}
	if !ctx.IsInstructor {
		respondWithError(w, http.StatusForbidden, "Admin access required to delete certificate media")
		return
	}
	idStr := mux.Vars(r)["id"]
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid media ID")
		return
	}
	res, err := h.db.CertificateMedia().DeleteOne(r.Context(), bson.M{
		"_id":      id,
		"tenantId": ctx.TenantID,
	})
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete certificate media")
		return
	}
	if res.DeletedCount == 0 {
		respondWithError(w, http.StatusNotFound, "Certificate media not found")
		return
	}
	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Certificate media deleted",
		"id":      id.Hex(),
	})
}

// ===========================================================================
// Auto-issue helper
// ===========================================================================

// IssueCertificateForEnrollment generates a Certificate for the supplied
// enrollment if (a) the enrollment is in the "completed" status and (b) the
// linked Course has a certificate template assigned. The helper is
// idempotent — calling it twice for the same enrollment returns nil without
// creating a duplicate. On success it emits EventCertificateIssued (reused
// from lms_events.go).
//
// Flow:
//  1. Find enrollment by ID; verify status=completed.
//  2. Find the course; pull Course.CertificateID (the assigned template).
//  3. Generate a unique certificate number (CERT-YYYYMM-NNNN).
//  4. Generate a 12-character verification code (retry on rare collision).
//  5. Resolve student + instructor display names from the users collection.
//  6. Create the Certificate record (with studentName, courseTitle,
//     instructorName, finalScorePct from enrollment.ProgressPct, issueDate=now).
//  7. Emit EventCertificateIssued.
func (h *ProAuthoringCertificateHandler) IssueCertificateForEnrollment(ctx context.Context, enrollmentID primitive.ObjectID) error {
	// Idempotency: if a certificate already exists for this enrollment, return nil.
	existingCount, err := h.db.Certificates().CountDocuments(ctx, bson.M{
		"enrollmentId": enrollmentID,
		"isRevoked":    bson.M{"$ne": true},
	})
	if err != nil {
		return fmt.Errorf("failed to check existing certificate: %w", err)
	}
	if existingCount > 0 {
		return nil
	}

	var enrollment models.Enrollment
	if err := h.db.Enrollments().FindOne(ctx, bson.M{
		"_id": enrollmentID,
	}).Decode(&enrollment); err != nil {
		return fmt.Errorf("enrollment not found: %w", err)
	}
	if enrollment.Status != models.EnrollmentStatusCompleted {
		return fmt.Errorf("enrollment is not completed (status=%s)", enrollment.Status)
	}

	var course models.Course
	if err := h.db.Courses().FindOne(ctx, bson.M{
		"_id":      enrollment.CourseID,
		"tenantId": enrollment.TenantID,
	}).Decode(&course); err != nil {
		return fmt.Errorf("course not found: %w", err)
	}
	if course.CertificateID == nil {
		// No template assigned — silent skip; this is not an error.
		return nil
	}

	var template models.CertificateTemplate
	if err := h.db.CertificateTemplates().FindOne(ctx, bson.M{
		"_id":      *course.CertificateID,
		"tenantId": enrollment.TenantID,
	}).Decode(&template); err != nil {
		return fmt.Errorf("certificate template not found: %w", err)
	}
	if !template.IsActive {
		return fmt.Errorf("certificate template %s is not active", template.ID.Hex())
	}

	certNumber, err := h.generateCertificateNumber(ctx, enrollment.TenantID)
	if err != nil {
		return fmt.Errorf("failed to generate certificate number: %w", err)
	}

	// Generate a unique verification code (best-effort retry loop).
	verificationCode := generateCertificateVerificationCode()
	for attempt := 0; attempt < 5; attempt++ {
		count, err := h.db.Certificates().CountDocuments(ctx, bson.M{
			"verificationCode": verificationCode,
		})
		if err != nil {
			return fmt.Errorf("failed to verify verification code uniqueness: %w", err)
		}
		if count == 0 {
			break
		}
		verificationCode = generateCertificateVerificationCode()
	}

	now := time.Now()
	studentName := h.resolveStudentName(ctx, enrollment.StudentID)
	instructorName := h.resolveInstructorName(ctx, course.InstructorID)
	finalScorePct := enrollment.ProgressPct

	cert := models.Certificate{
		TenantID:          enrollment.TenantID,
		CourseID:          enrollment.CourseID,
		StudentID:         enrollment.StudentID,
		EnrollmentID:      enrollment.ID,
		TemplateID:        template.ID,
		CertificateNumber: certNumber,
		StudentName:       studentName,
		CourseTitle:       course.Title,
		InstructorName:    instructorName,
		FinalScorePct:     finalScorePct,
		IssueDate:         now,
		VerificationCode:  verificationCode,
		IsRevoked:         false,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	result, err := h.db.Certificates().InsertOne(ctx, &cert)
	if err != nil {
		return fmt.Errorf("failed to insert certificate: %w", err)
	}
	if oid, ok := result.InsertedID.(primitive.ObjectID); ok {
		cert.ID = oid
	}

	h.emitter.Emit(events.Event{
		Type:      events.EventCertificateIssued,
		Timestamp: now,
		Data: map[string]interface{}{
			"tenantId":          enrollment.TenantID.Hex(),
			"certificateId":     cert.ID.Hex(),
			"enrollmentId":      enrollment.ID.Hex(),
			"courseId":          enrollment.CourseID.Hex(),
			"studentId":         enrollment.StudentID.Hex(),
			"templateId":        template.ID.Hex(),
			"certificateNumber": certNumber,
		},
	})

	return nil
}
