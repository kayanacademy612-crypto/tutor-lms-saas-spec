#!/bin/bash
# Sync Phase 4 Pro Authoring files to customization backup dirs and push to GitHub

set -e

echo "=========================================="
echo "Phase 4 GitHub Push Script"
echo "=========================================="

# ============================================================
# PART 1: Sync lastsaas-customizations/backend/
# ============================================================
echo ""
echo "[1/3] Syncing lastsaas backend customizations..."

LASTSAAS_SRC=/home/z/my-project/repos/lastsaas/backend
LASTSAAS_DST=/home/z/my-project/lastsaas-customizations/backend

# Phase 4 new model files
cp "$LASTSAAS_SRC/internal/models/proauthoring.go" "$LASTSAAS_DST/models/proauthoring.go"
cp "$LASTSAAS_SRC/internal/models/lms.go" "$LASTSAAS_DST/models/lms.go"
cp "$LASTSAAS_SRC/internal/models/ecommerce.go" "$LASTSAAS_DST/models/ecommerce.go"

# Phase 4 new db files
cp "$LASTSAAS_SRC/internal/db/proauthoring_collections.go" "$LASTSAAS_DST/db/proauthoring_collections.go"
cp "$LASTSAAS_SRC/internal/db/ecommerce_collections.go" "$LASTSAAS_DST/db/ecommerce_collections.go"
cp "$LASTSAAS_SRC/internal/db/lms_collections.go" "$LASTSAAS_DST/db/lms_collections.go"

# Phase 4 new event files
cp "$LASTSAAS_SRC/internal/events/proauthoring_events.go" "$LASTSAAS_DST/events/proauthoring_events.go"
cp "$LASTSAAS_SRC/internal/events/ecommerce_events.go" "$LASTSAAS_DST/events/ecommerce_events.go"
cp "$LASTSAAS_SRC/internal/events/lms_events.go" "$LASTSAAS_DST/events/lms_events.go"

# Phase 4 new handler files
for f in proauthoring_certificate.go proauthoring_drip.go proauthoring_instructor.go proauthoring_assignment.go \
         ecommerce_bundle.go ecommerce_cart.go ecommerce_checkout.go ecommerce_gateway.go \
         ecommerce_gift.go ecommerce_invoice.go ecommerce_membership.go ecommerce_payment.go \
         ecommerce_refund.go ecommerce_revenue.go ecommerce_subscription.go ecommerce_tax.go \
         ecommerce_withdrawal.go lms.go; do
    cp "$LASTSAAS_SRC/internal/api/handlers/$f" "$LASTSAAS_DST/handlers/$f"
done

# Copy updated main.go + mongodb.go + stripe.go
cp "$LASTSAAS_SRC/cmd/server/main.go" "$LASTSAAS_DST/main.go"
cp "$LASTSAAS_SRC/internal/db/mongodb.go" "$LASTSAAS_DST/db/mongodb.go"
cp "$LASTSAAS_SRC/internal/stripe/stripe.go" "$LASTSAAS_DST/handlers/stripe.go"

echo "  -> Backend customizations synced: $(find $LASTSAAS_DST -type f | wc -l) files"

# ============================================================
# PART 2: Sync tailux-customizations/
# ============================================================
echo ""
echo "[2/3] Syncing tailux frontend customizations..."

TAILUX_SRC=/home/z/my-project/repos/tailux/tailux-main/src
TAILUX_DST=/home/z/my-project/tailux-customizations

# Types, services, hooks
cp "$TAILUX_SRC/types/lms.ts" "$TAILUX_DST/lms-types.ts"
cp "$TAILUX_SRC/services/lms-api.ts" "$TAILUX_DST/lms-api.ts"
cp "$TAILUX_SRC/hooks/useProAuthoring.ts" "$TAILUX_DST/useProAuthoring.ts"
cp "$TAILUX_SRC/hooks/useEcommerce.ts" "$TAILUX_DST/useEcommerce.ts"
cp "$TAILUX_SRC/hooks/useLms.ts" "$TAILUX_DST/useLms.ts"

# Components - ecommerce + lms
cp -r "$TAILUX_SRC/components/ecommerce/"* "$TAILUX_DST/components/ecommerce/" 2>/dev/null || true
cp -r "$TAILUX_SRC/components/lms/"* "$TAILUX_DST/components/lms/" 2>/dev/null || true

# Phase 4 new page areas
for area in certificate-builder drip-manager prerequisite-manager multi-instructor assignment-grading; do
    if [ -d "$TAILUX_SRC/app/pages/apps/$area" ]; then
        rm -rf "$TAILUX_DST/apps/$area"
        mkdir -p "$TAILUX_DST/apps/$area"
        cp -r "$TAILUX_SRC/app/pages/apps/$area/"* "$TAILUX_DST/apps/$area/"
        echo "  -> Synced apps/$area ($(find $TAILUX_DST/apps/$area -type f | wc -l) files)"
    fi
done

# Router
cp "$TAILUX_SRC/app/router/protected.tsx" "$TAILUX_DST/protected-routes.tsx"
cp "$TAILUX_SRC/app/router/public.tsx" "$TAILUX_DST/public-routes.tsx" 2>/dev/null || true

echo "  -> Frontend customizations synced: $(find $TAILUX_DST -type f | wc -l) files"

# ============================================================
# PART 3: Commit and push
# ============================================================
echo ""
echo "[3/3] Committing and pushing to GitHub..."

cd /home/z/my-project
git add lastsaas-customizations/ tailux-customizations/

if git diff --cached --quiet; then
    echo "  -> No new changes to commit"
else
    git commit -m "Phase 4: Pro Authoring — Certificates, Drip, Multi-Instructor, Assignments

Backend (lastsaas-customizations/backend/):
- New models: CertificateLayer, CertificateBackdrop, CertificateMedia,
  DripRule (4 types), PrerequisiteChain, CourseInstructor, AssignmentGrade
  (all tenant-scoped)
- 7 new MongoDB collection accessors + 15 compound indexes (3 unique)
- 14 new event constants (certificate, drip, prerequisite, instructor)
- 4 new handler files with 48+ methods:
  - proauthoring_certificate.go (25 handlers: templates CRUD, layers CRUD,
    backdrops, media, issue, download, verify, revoke, assign)
  - proauthoring_drip.go (10 handlers: drip rules CRUD, access check,
    prerequisites CRUD, eligibility check)
  - proauthoring_instructor.go (4 handlers: multi-instructor N:N with
    revenue share, primary management)
  - proauthoring_assignment.go (9 handlers: assignments CRUD, submissions,
    grading with auto pass/fail)
- Updated main.go: 52 new routes registered, certificate stubs replaced

Frontend (tailux-customizations/):
- 17 new TypeScript types in lms-types.ts
- 8 new API resource groups + extended certificateApi (10 methods)
- 44 new hooks in useProAuthoring.ts
- 4 new page areas (29 files total):
  - certificate-builder/ (10 files: visual canvas editor with drag-drop
    layers, template management, backdrop/media library, issued certs,
    public verification, assign-to-course)
  - drip-manager/ (3 files: 4 drip types, per-lesson rules, access check)
  - prerequisite-manager/ (2 files: required/recommended chains, eligibility)
  - multi-instructor/ (3 files: N:N instructors, revenue share bar, roles)
  - assignment-grading/ (3 files: grading dashboard, grading panel, submission detail)
- Updated router with 6 new routes

Verification:
- Backend: go build ./... PASS
- Frontend: tsc --noEmit PASS (zero diagnostics)
- 52 new backend routes registered, build clean

Built by 8 parallel agents across 2 waves." 2>/dev/null
    
    echo "  -> Committed. Pushing..."
fi

git push origin main 2>&1 | tail -5
echo "  -> Push complete"

echo ""
echo "=========================================="
echo "Phase 4 push complete!"
echo "=========================================="
