#!/usr/bin/env python3
"""
Extract ALL MongoDB collections from lastsaas source code (mongodb.go)
+ ALL planned LMS collections from the schema design.
Generates collections-full.ts with ALL 40+ entries.
"""
import re
from pathlib import Path

LASTSAAS_DB = Path("/home/z/my-project/repos/lastsaas/backend/internal/db/mongodb.go")
LASTSAAS_SCHEMA = Path("/home/z/my-project/repos/lastsaas/backend/internal/db/schema.go")
OUTPUT = Path("/home/z/my-project/src/data/collections-full.ts")

# ════════════════════════════════════════════════════════════════
# 1. EXTRACT EXISTING COLLECTIONS FROM mongodb.go
# ════════════════════════════════════════════════════════════════
def extract_existing_collections():
    """Read mongodb.go and extract all collection accessor methods."""
    content = LASTSAAS_DB.read_text()
    
    # Pattern: func (m *MongoDB) CollectionName() *mongo.Collection { return m.Database.Collection("collection_name") }
    matches = re.findall(r'func \(m \*MongoDB\)\s+(\w+)\(\)\s+\*mongo\.Collection\s*\{[^}]*Collection\("([^"]+)"\)', content)
    
    collections = []
    for method_name, collection_name in matches:
        # Determine domain from collection name
        domain = 'platform'
        if 'user' in collection_name.lower() or 'token' in collection_name.lower() or 'oauth' in collection_name.lower() or 'auth' in collection_name.lower() or 'webauthn' in collection_name.lower() or 'sso' in collection_name.lower():
            domain = 'identity'
        elif 'tenant' in collection_name.lower() or 'invitation' in collection_name.lower():
            domain = 'tenancy'
        elif 'plan' in collection_name.lower() or 'credit' in collection_name.lower() or 'financial' in collection_name.lower() or 'stripe' in collection_name.lower():
            domain = 'billing'
        elif 'webhook' in collection_name.lower():
            domain = 'platform'
        elif 'branding' in collection_name.lower():
            domain = 'platform'
        elif 'system' in collection_name.lower() or 'leader' in collection_name.lower() or 'counter' in collection_name.lower() or 'metric' in collection_name.lower():
            domain = 'platform'
        elif 'config' in collection_name.lower() or 'announcement' in collection_name.lower() or 'message' in collection_name.lower() or 'page' in collection_name.lower():
            domain = 'platform'
        elif 'audit' in collection_name.lower() or 'log' in collection_name.lower() or 'impersonation' in collection_name.lower():
            domain = 'platform'
        elif 'usage' in collection_name.lower() or 'telemetry' in collection_name.lower() or 'event_definition' in collection_name.lower():
            domain = 'platform'
        elif 'api_key' in collection_name.lower():
            domain = 'platform'
        
        collections.append({
            'name': collection_name,
            'domain': domain,
            'status': 'existing',
            'fields': 0,  # Will be filled from schema.go if available
            'description': f'Existing lastsaas collection. Go accessor: MongoDB.{method_name}()',
            'source': f'lastsaas/backend/internal/db/mongodb.go (method: {method_name})',
            'confidence': 'confirmed',
        })
    
    return collections

# ════════════════════════════════════════════════════════════════
# 2. EXTRACT SCHEMA-VALIDATED COLLECTIONS FROM schema.go
# ════════════════════════════════════════════════════════════════
def extract_schema_collections():
    """Read schema.go and find which collections have JSON schema validation."""
    content = LASTSAAS_SCHEMA.read_text()
    
    # Find AllSchemas() return statements
    matches = re.findall(r'(\w+Schema)\(\)', content)
    
    schemas = {}
    for func_name in matches:
        # Try to find the collection name from the function
        # Pattern: func xxxSchema() CollectionSchema { return CollectionSchema{Collection: "name", ...} }
        pattern = rf'func {func_name}\(\)\s+CollectionSchema\s+\{{[^}}]*Collection:\s*"([^"]+)"'
        m = re.search(pattern, content)
        if m:
            schemas[m.group(1)] = func_name
    
    return schemas

# ════════════════════════════════════════════════════════════════
# 3. PLANNED LMS COLLECTIONS (from the build spec)
# ════════════════════════════════════════════════════════════════
PLANNED_LMS_COLLECTIONS = [
    # Course authoring
    {'name': 'course', 'domain': 'course', 'fields': 26, 'description': 'Core course entity with pricing, curriculum, ratings', 'source': 'build-spec-plan.md §2.1', 'confidence': 'planned'},
    {'name': 'course_topic', 'domain': 'course', 'fields': 7, 'description': 'Course section that groups lessons', 'source': 'build-spec-plan.md §2.3', 'confidence': 'planned'},
    {'name': 'lesson', 'domain': 'course', 'fields': 14, 'description': 'Lesson with 7 video source types, drip gating', 'source': 'build-spec-plan.md §2.3', 'confidence': 'planned'},
    {'name': 'course_category', 'domain': 'course', 'fields': 6, 'description': 'Category tree for course organization', 'source': 'build-spec-plan.md §2.2', 'confidence': 'planned'},
    {'name': 'course_tag', 'domain': 'course', 'fields': 4, 'description': 'Flat tag list for courses', 'source': 'build-spec-plan.md §2.2', 'confidence': 'planned'},
    {'name': 'course_review', 'domain': 'course', 'fields': 7, 'description': 'Student reviews with ratings and instructor replies', 'source': 'build-spec-plan.md §2.7', 'confidence': 'planned'},
    # Quiz
    {'name': 'quiz', 'domain': 'quiz', 'fields': 22, 'description': 'Quiz with 19+ settings, embedded questions array', 'source': 'build-spec-plan.md §2.5', 'confidence': 'planned'},
    {'name': 'quiz_question', 'domain': 'quiz', 'fields': 15, 'description': 'Question supporting 13 types with type-specific config', 'source': 'build-spec-plan.md §2.5', 'confidence': 'planned'},
    {'name': 'quiz_attempt', 'domain': 'quiz', 'fields': 8, 'description': 'Student quiz attempt with score and timing', 'source': 'build-spec-plan.md §2.5', 'confidence': 'planned'},
    {'name': 'quiz_attempt_answer', 'domain': 'quiz', 'fields': 6, 'description': 'Per-question answer within an attempt', 'source': 'build-spec-plan.md §2.5', 'confidence': 'planned'},
    {'name': 'assignment', 'domain': 'quiz', 'fields': 10, 'description': 'Assignment with file upload limits and grading config', 'source': 'build-spec-plan.md §4.2', 'confidence': 'planned'},
    {'name': 'assignment_submission', 'domain': 'quiz', 'fields': 7, 'description': 'Student submission with instructor evaluation', 'source': 'build-spec-plan.md §4.2', 'confidence': 'planned'},
    # Ecommerce
    {'name': 'cart', 'domain': 'ecommerce', 'fields': 5, 'description': 'Shopping cart with items and coupon', 'source': 'build-spec-plan.md §3.1', 'confidence': 'planned'},
    {'name': 'order', 'domain': 'ecommerce', 'fields': 18, 'description': 'Purchase order with payment status and billing', 'source': 'build-spec-plan.md §3.3', 'confidence': 'planned'},
    {'name': 'order_item', 'domain': 'ecommerce', 'fields': 8, 'description': 'Order line item (polymorphic: course/bundle/plan)', 'source': 'build-spec-plan.md §3.3', 'confidence': 'planned'},
    {'name': 'order_activity', 'domain': 'ecommerce', 'fields': 6, 'description': 'Append-only order state change audit log', 'source': 'build-spec-plan.md §3.3', 'confidence': 'planned'},
    {'name': 'coupon', 'domain': 'ecommerce', 'fields': 14, 'description': 'Coupon with 6 applies_to types, scheduling, usage limits', 'source': 'build-spec-plan.md §3.4', 'confidence': 'planned'},
    {'name': 'subscription_plan', 'domain': 'ecommerce', 'fields': 12, 'description': 'Recurring plan (course/bundle/category/full_site)', 'source': 'build-spec-plan.md §3.5', 'confidence': 'planned'},
    {'name': 'subscription', 'domain': 'ecommerce', 'fields': 8, 'description': 'Active student subscription with history', 'source': 'build-spec-plan.md §3.5', 'confidence': 'planned'},
    {'name': 'bundle', 'domain': 'ecommerce', 'fields': 8, 'description': 'Course bundle with visibility options', 'source': 'build-spec-plan.md §4.6', 'confidence': 'planned'},
    {'name': 'revenue_ledger', 'domain': 'ecommerce', 'fields': 7, 'description': 'Double-entry revenue per instructor + platform', 'source': 'build-spec-plan.md §3.7', 'confidence': 'planned'},
    {'name': 'withdrawal_request', 'domain': 'ecommerce', 'fields': 7, 'description': 'Instructor payout request with approval flow', 'source': 'build-spec-plan.md §3.8', 'confidence': 'planned'},
    {'name': 'tax_rate', 'domain': 'ecommerce', 'fields': 6, 'description': 'Regional tax rates by country and province', 'source': 'build-spec-plan.md §3.6', 'confidence': 'planned'},
    {'name': 'payment_gateway', 'domain': 'billing', 'fields': 5, 'description': 'Per-tenant payment gateway configs (11 gateways, encrypted creds)', 'source': 'build-spec-plan.md §3.2', 'confidence': 'planned'},
    # Engagement
    {'name': 'enrollment', 'domain': 'engagement', 'fields': 12, 'description': 'Student-course enrollment with progress tracking', 'source': 'build-spec-plan.md §2.4', 'confidence': 'planned'},
    {'name': 'lesson_progress', 'domain': 'engagement', 'fields': 8, 'description': 'Per-lesson progress with video position tracking', 'source': 'build-spec-plan.md §2.4', 'confidence': 'planned'},
    {'name': 'wishlist', 'domain': 'engagement', 'fields': 4, 'description': 'Student course wishlist', 'source': 'build-spec-plan.md §2.7', 'confidence': 'planned'},
    {'name': 'lesson_note', 'domain': 'engagement', 'fields': 5, 'description': 'Student notes attached to lessons (Pro)', 'source': 'build-spec-plan.md §5.3', 'confidence': 'planned'},
    {'name': 'qna_question', 'domain': 'engagement', 'fields': 7, 'description': 'Q&A questions on courses/lessons', 'source': 'build-spec-plan.md §2.7', 'confidence': 'planned'},
    {'name': 'qna_answer', 'domain': 'engagement', 'fields': 5, 'description': 'Answers to Q&A questions', 'source': 'build-spec-plan.md §2.7', 'confidence': 'planned'},
    {'name': 'announcement', 'domain': 'engagement', 'fields': 6, 'description': 'Course announcements with read tracking', 'source': 'build-spec-plan.md §5.3', 'confidence': 'planned'},
    {'name': 'notification', 'domain': 'engagement', 'fields': 7, 'description': 'Per-user notifications (onsite + push)', 'source': 'build-spec-plan.md §5.2', 'confidence': 'planned'},
    {'name': 'notification_preference', 'domain': 'engagement', 'fields': 4, 'description': 'Per-event channel toggle matrix', 'source': 'build-spec-plan.md §5.2', 'confidence': 'planned'},
    # Pro features
    {'name': 'certificate_template', 'domain': 'pro', 'fields': 11, 'description': 'Visual certificate template with layers JSON', 'source': 'build-spec-plan.md §4.1', 'confidence': 'planned'},
    {'name': 'certificate', 'domain': 'pro', 'fields': 8, 'description': 'Issued certificate with PDF URL and verification hash', 'source': 'build-spec-plan.md §4.1', 'confidence': 'planned'},
    {'name': 'certificate_asset', 'domain': 'pro', 'fields': 5, 'description': '172+ library assets (shapes, illustrations, badges, frames, watermarks)', 'source': 'build-spec-plan.md §4.1', 'confidence': 'planned'},
    {'name': 'instructor', 'domain': 'pro', 'fields': 8, 'description': 'Instructor profile with application status and payout config', 'source': 'build-spec-plan.md §4.4', 'confidence': 'planned'},
    {'name': 'course_instructor', 'domain': 'pro', 'fields': 5, 'description': 'N:N join with revenue_share_percent', 'source': 'build-spec-plan.md §4.4', 'confidence': 'planned'},
    {'name': 'drip_rule', 'domain': 'pro', 'fields': 7, 'description': 'Content drip rules (4 types: schedule/prereq/enrollment_days/sequence)', 'source': 'build-spec-plan.md §4.3', 'confidence': 'planned'},
    {'name': 'gamification_point', 'domain': 'pro', 'fields': 5, 'description': 'Points awarded per student per action', 'source': 'build-spec-plan.md §5.1', 'confidence': 'planned'},
    {'name': 'gamification_badge', 'domain': 'pro', 'fields': 6, 'description': 'Badge definitions with criteria', 'source': 'build-spec-plan.md §5.1', 'confidence': 'planned'},
    {'name': 'gamification_student_badge', 'domain': 'pro', 'fields': 4, 'description': 'Awarded badges per student', 'source': 'build-spec-plan.md §5.1', 'confidence': 'planned'},
    {'name': 'gamification_leaderboard', 'domain': 'pro', 'fields': 5, 'description': 'Rebuilt weekly leaderboards (course/tenant scope)', 'source': 'build-spec-plan.md §5.1', 'confidence': 'planned'},
    {'name': 'ai_generation_job', 'domain': 'pro', 'fields': 8, 'description': 'Async AI generation jobs (OpenAI passthrough)', 'source': 'build-spec-plan.md §6.2', 'confidence': 'planned'},
    {'name': 'email_template', 'domain': 'pro', 'fields': 8, 'description': 'Per-trigger email templates (42 triggers)', 'source': 'build-spec-plan.md §5.6', 'confidence': 'planned'},
    # New platform collections
    {'name': 'jobs', 'domain': 'platform', 'fields': 8, 'description': 'Background job queue with lease-based locking', 'source': 'build-spec-plan.md §1.2', 'confidence': 'planned'},
    {'name': 'job_runs', 'domain': 'platform', 'fields': 5, 'description': 'Job execution history (30-day TTL)', 'source': 'build-spec-plan.md §1.2', 'confidence': 'planned'},
    {'name': '_migrations', 'domain': 'platform', 'fields': 3, 'description': 'Applied migration tracking', 'source': 'build-spec-plan.md §1.5', 'confidence': 'planned'},
    {'name': 'legal_consent', 'domain': 'identity', 'fields': 6, 'description': 'Admin-defined consent notices for GDPR/compliance', 'source': 'build-spec-plan.md §5.7', 'confidence': 'planned'},
    {'name': 'consent_log', 'domain': 'identity', 'fields': 5, 'description': 'Per-acceptance consent audit trail', 'source': 'build-spec-plan.md §5.7', 'confidence': 'planned'},
    {'name': 'device_session', 'domain': 'identity', 'fields': 7, 'description': 'Active login sessions with device fingerprinting (Pro)', 'source': 'build-spec-plan.md §5.8', 'confidence': 'planned'},
    {'name': 'subdomain_reservation', 'domain': 'tenancy', 'fields': 4, 'description': 'Subdomain slug reservations for storefronts', 'source': 'build-spec-plan.md §4.2 (Plan)', 'confidence': 'planned'},
    {'name': 'custom_domain', 'domain': 'tenancy', 'fields': 6, 'description': 'Custom domain configs with SSL status', 'source': 'build-spec-plan.md §4.2 (Plan)', 'confidence': 'planned'},
]

# ════════════════════════════════════════════════════════════════
# 4. MERGE + DEDUPLICATE
# ════════════════════════════════════════════════════════════════
def main():
    existing = extract_existing_collections()
    schema_validated = extract_schema_collections()
    
    print(f"Extracted {len(existing)} existing collections from mongodb.go")
    print(f"Extracted {len(schema_validated)} schema-validated collections from schema.go")
    print(f"Planned LMS collections: {len(PLANNED_LMS_COLLECTIONS)}")
    
    # Merge: existing collections + planned collections (mark overlaps as "extended")
    all_collections = {}
    
    # Add existing collections
    for col in existing:
        name = col['name']
        all_collections[name] = col
        if name in schema_validated:
            all_collections[name]['description'] += f' (has JSON schema validation: {schema_validated[name]})'
    
    # Add/merge planned collections
    for col in PLANNED_LMS_COLLECTIONS:
        name = col['name']
        if name in all_collections:
            # Collection exists in lastsaas AND is planned for extension
            all_collections[name]['status'] = 'extended'
            all_collections[name]['description'] += f' | LMS extension: {col["description"]}'
            all_collections[name]['source'] += f' | {col["source"]}'
            all_collections[name]['confidence'] = 'confirmed'
        else:
            # New collection
            all_collections[name] = {
                **col,
                'status': 'new',
            }
    
    # Convert to sorted list
    result = sorted(all_collections.values(), key=lambda x: (x['domain'], x['name']))
    
    print(f"\nTotal unique collections: {len(result)}")
    by_status = {}
    for c in result:
        by_status[c['status']] = by_status.get(c['status'], 0) + 1
    for status, count in sorted(by_status.items()):
        print(f"  {status}: {count}")
    by_domain = {}
    for c in result:
        by_domain[c['domain']] = by_domain.get(c['domain'], 0) + 1
    print("\nBy domain:")
    for domain, count in sorted(by_domain.items()):
        print(f"  {domain}: {count}")
    
    # Generate TypeScript
    lines = [
        "// Auto-generated from lastsaas source code (mongodb.go + schema.go) + LMS schema design",
        "// DO NOT EDIT — regenerate with scripts/extract-collections.py",
        "",
        "export interface SpecCollection {",
        "  name: string",
        "  domain: string",
        "  status: 'existing' | 'new' | 'extended'",
        "  fields: number",
        "  description: string",
        "  source: string",
        "  confidence: 'confirmed' | 'planned' | 'inferred' | 'unknown'",
        "}",
        "",
        "export const collections: SpecCollection[] = [",
    ]
    
    for col in result:
        lines.append(f'  {{ name: "{col["name"]}", domain: "{col["domain"]}", status: "{col["status"]}", fields: {col["fields"]}, description: "{col["description"].replace('"', '\\"')}", source: "{col["source"].replace('"', '\\"')}", confidence: "{col["confidence"]}" }},')
    
    lines.append("]")
    lines.append("")
    lines.append(f"export const collectionsCount = {len(result)}")
    lines.append("")
    
    OUTPUT.write_text('\n'.join(lines), encoding='utf-8')
    print(f"\nGenerated {OUTPUT}: {len(result)} collections, {len(lines)} lines")

if __name__ == '__main__':
    main()
