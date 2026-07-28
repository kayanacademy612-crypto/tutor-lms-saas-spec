#!/usr/bin/env python3
"""
Generate /home/z/my-project/src/data/codewiki-compendium-xref.json — a
bidirectional cross-reference between the 61 CodeWiki analysis sections
(codewiki-sections.json) and the 28 Compendium SaaS plan sections
(compendium-saas-plan.json).

Mapping strategy
----------------
Each CodeWiki section describes a capability of the lastsaas codebase
(auth, billing, frontend, health monitoring, ...). Each Compendium section
describes a Tutor-LMS feature that the SaaS plan will build ON TOP OF
lastsaas. A CodeWiki section maps to a Compendium section when the
capability it describes is a dependency / foundation for that Compendium
feature.

The mapping is built from a CONCEPTS table. Each concept groups:
  - cw_sections: the CodeWiki section ids that implement / describe it
  - compendium_sections: the Compendium section ids that depend on it
  - reason: a short human-readable explanation

The table was derived by:
  1. Reading every CodeWiki section name + content.
  2. Reading every Compendium saas_implementation text.
  3. Matching capability → dependency relationships, cross-checked against
     the explicit examples in the task brief:
       - cw-13 (Auth & Authorization) → getting-started, student-learning-
         experience, instructor-dashboard
       - cw-19 (Billing/Stripe) → native-ecommerce, payment-gateways,
         subscriptions
       - cw-41 (Frontend Application Structure) → course-builder, learner-
         dashboard, instructor-dashboard

Output
------
{
  "generated_at": "...",
  "source_files": ["codewiki-sections.json", "compendium-saas-plan.json"],
  "totals": { "codewiki_sections": 61, "compendium_sections": 28,
              "mappings": N },
  "concepts": [ { id, reason, cw_sections, compendium_sections }, ... ],
  "codewiki_to_compendium": { "cw-1": ["getting-started", ...], ... },
  "compendium_to_codewiki": { "getting-started": ["cw-1", ...], ... }
}

Run:
    python3 scripts/generate-codewiki-compendium-xref.py
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from collections import defaultdict

PROJECT_ROOT = Path('/home/z/my-project')
CODEWIKI_JSON = PROJECT_ROOT / 'src' / 'data' / 'codewiki-sections.json'
COMPENDIUM_JSON = PROJECT_ROOT / 'src' / 'data' / 'compendium-saas-plan.json'
OUTPUT_JSON = PROJECT_ROOT / 'src' / 'data' / 'codewiki-compendium-xref.json'

# ---------------------------------------------------------------------------
# CONCEPTS — the heart of the cross-reference.
#
# Each concept groups CodeWiki sections (capabilities lastsaas provides) with
# Compendium sections (Tutor-LMS features that depend on those capabilities).
# ---------------------------------------------------------------------------
CONCEPTS = [
    {
        'id': 'dev-env-and-server',
        'reason': 'LastSaaS dev environment, backend server architecture, and '
                  'process management are the foundation that Getting Started, '
                  'Developer Guides, and the Admin Panel build on.',
        'cw_sections': ['cw-1', 'cw-2', 'cw-3', 'cw-32', 'cw-60'],
        'compendium_sections': ['getting-started', 'developer-guides', 'admin-panel'],
    },
    {
        'id': 'config-and-settings',
        'reason': 'LastSaaS config store + dynamic reloading backs the 66 Tutor '
                  'LMS settings (13 pages) and the admin config panel.',
        'cw_sections': ['cw-4', 'cw-35'],
        'compendium_sections': ['tutor-lms-settings', 'getting-started', 'admin-panel'],
    },
    {
        'id': 'database-and-models',
        'reason': 'MongoDB connectivity + the 22 base data models are the '
                  'schema foundation every LMS collection extends.',
        'cw_sections': ['cw-5', 'cw-12'],
        'compendium_sections': ['getting-started', 'developer-guides', 'admin-panel'],
    },
    {
        'id': 'middleware-stack',
        'reason': 'HTTP middleware (auth, RBAC, rate-limit, body-limit, '
                  'security, tenant, requestid, metrics) wraps every LMS API '
                  'route — referenced by Getting Started and Developer Guides.',
        'cw_sections': ['cw-6', 'cw-18'],
        'compendium_sections': ['getting-started', 'developer-guides'],
    },
    {
        'id': 'api-endpoints-and-routing',
        'reason': 'The 133-route lastsaas API surface + the structured API '
                  'overview are what Developer Guides documents and the Admin '
                  'Panel / Course Builder / Quiz Builder extend.',
        'cw_sections': ['cw-11', 'cw-61'],
        'compendium_sections': ['developer-guides', 'admin-panel', 'course-builder',
                                 'quiz-builder', 'quiz-question-types'],
    },
    {
        'id': 'authentication',
        'reason': 'Auth & authorization (password, JWT, OAuth, MFA, HTTP auth '
                  'middleware, token refresh, auth flow pages, auth UI '
                  'components) is the foundation for student / instructor / '
                  'admin login across every user-facing Compendium section.',
        'cw_sections': ['cw-13', 'cw-14', 'cw-15', 'cw-16', 'cw-17', 'cw-18',
                        'cw-51', 'cw-55', 'cw-59'],
        'compendium_sections': ['getting-started', 'student-learning-experience',
                                 'learner-dashboard', 'instructor-dashboard',
                                 'admin-panel', 'tutorials'],
    },
    {
        'id': 'billing-and-payments',
        'reason': 'Stripe billing (service init, customer/product sync, '
                  'subscription lifecycle, invoice numbers) is the foundation '
                  'for every monetization Compendium section — native '
                  'eCommerce, all 11 payment gateways, subscriptions, '
                  'memberships, gift course, course bundles.',
        'cw_sections': ['cw-19', 'cw-20', 'cw-21', 'cw-22', 'cw-24'],
        'compendium_sections': ['native-ecommerce', 'payment-gateways',
                                 'subscriptions', 'memberships', 'gift-course',
                                 'course-bundle'],
    },
    {
        'id': 'webhooks',
        'reason': 'Secure webhook handling (signature verification, dispatch + '
                  'retry, secret management) backs payment-gateway webhooks '
                  'and all third-party Integrations.',
        'cw_sections': ['cw-23', 'cw-25', 'cw-26', 'cw-27'],
        'compendium_sections': ['integrations', 'payment-gateways',
                                 'developer-guides', 'native-ecommerce'],
    },
    {
        'id': 'email-service',
        'reason': 'Resend email service backs all 53 email triggers across '
                  'course-builder, certificates, student/instructor '
                  'notifications, and the email-template settings page.',
        'cw_sections': ['cw-28'],
        'compendium_sections': ['course-builder', 'certificate-builder',
                                 'student-learning-experience',
                                 'instructor-dashboard', 'troubleshooting',
                                 'tutor-lms-settings', 'tutor-lms-addons'],
    },
    {
        'id': 'events-system',
        'reason': 'Internal event emitter (22 base events) is the action-hook '
                  'foundation Developer Guides documents and every LMS feature '
                  'extends.',
        'cw_sections': ['cw-10'],
        'compendium_sections': ['developer-guides', 'course-builder',
                                 'student-learning-experience',
                                 'instructor-dashboard', 'admin-panel',
                                 'tutor-lms-addons'],
    },
    {
        'id': 'health-monitoring',
        'reason': 'System health, node heartbeat, metric collection, '
                  'integration health, and health-data querying back the '
                  'admin Health page, instructor analytics, and the '
                  'troubleshooting QA checklist.',
        'cw_sections': ['cw-7', 'cw-36', 'cw-37', 'cw-38', 'cw-39', 'cw-40'],
        'compendium_sections': ['admin-panel', 'troubleshooting',
                                 'instructor-dashboard', 'integrations'],
    },
    {
        'id': 'metrics-and-reporting',
        'reason': 'Daily metrics (DAU/WAU/MAU, revenue, ARR) + financial '
                  'reporting aggregation feed the instructor dashboard '
                  'analytics + admin financial page.',
        'cw_sections': ['cw-8', 'cw-34'],
        'compendium_sections': ['instructor-dashboard', 'admin-panel'],
    },
    {
        'id': 'datadog-and-telemetry',
        'reason': 'Async DataDog integration + client-side telemetry are the '
                  'observability layer for Integrations and Troubleshooting.',
        'cw_sections': ['cw-9', 'cw-46'],
        'compendium_sections': ['integrations', 'troubleshooting',
                                 'developer-guides'],
    },
    {
        'id': 'system-administration',
        'reason': 'cmdDoctor diagnostics, log management, MCP integration, '
                  'and system admin CLI tools back the Admin Panel and the '
                  'Troubleshooting QA checklist.',
        'cw_sections': ['cw-29', 'cw-30', 'cw-31', 'cw-33'],
        'compendium_sections': ['admin-panel', 'troubleshooting',
                                 'developer-guides'],
    },
    {
        'id': 'frontend-architecture',
        'reason': 'Frontend application structure, global state (React '
                  'Context), API communication + interceptors, routing + '
                  'access control, and the frontend API client are the SPA '
                  'foundation every frontend Compendium section (course '
                  'builder, student experience, dashboards) builds on.',
        'cw_sections': ['cw-41', 'cw-42', 'cw-43', 'cw-44', 'cw-57'],
        'compendium_sections': ['course-builder', 'quiz-builder',
                                 'student-learning-experience',
                                 'learner-dashboard', 'instructor-dashboard',
                                 'certificate-builder', 'advanced-customization',
                                 'tutor-lms-shortcodes'],
    },
    {
        'id': 'branding-and-theming',
        'reason': 'Dynamic branding + theming (BrandingContext, '
                  'BrandingThemeInjector, dynamic header) back the Advanced '
                  'Customization override system, the Design settings page, '
                  'and admin theme management.',
        'cw_sections': ['cw-45', 'cw-52', 'cw-58'],
        'compendium_sections': ['advanced-customization', 'tutor-lms-settings',
                                 'admin-panel'],
    },
    {
        'id': 'frontend-components',
        'reason': 'Foundational UI components, core app layouts + navigation, '
                  'and the full component library are what Course Builder, '
                  'Quiz Builder / Quiz Question Types (13 React renderers), '
                  'dashboards, and the Customization override system compose.',
        'cw_sections': ['cw-48', 'cw-49', 'cw-50'],
        'compendium_sections': ['course-builder', 'quiz-builder',
                                 'quiz-question-types',
                                 'student-learning-experience',
                                 'learner-dashboard', 'instructor-dashboard',
                                 'advanced-customization', 'certificate-builder'],
    },
    {
        'id': 'frontend-pages',
        'reason': 'User-facing app pages, public-facing content pages, and '
                  'the structured admin/auth/public page tree map directly to '
                  'the student experience, learner dashboard, instructor '
                  'dashboard, admin panel, and the shortcode→route migration.',
        'cw_sections': ['cw-53', 'cw-54', 'cw-56'],
        'compendium_sections': ['learner-dashboard', 'student-learning-experience',
                                 'instructor-dashboard', 'admin-panel',
                                 'tutor-lms-shortcodes', 'course-builder'],
    },
    {
        'id': 'error-handling',
        'reason': 'Comprehensive frontend + backend error handling + service-'
                  'unavailable handling back the Troubleshooting QA patterns.',
        'cw_sections': ['cw-47', 'cw-60'],
        'compendium_sections': ['troubleshooting', 'student-learning-experience'],
    },
    {
        'id': 'structured-api-endpoints',
        'reason': 'Structured API endpoint overview (cw-61) is the master '
                  'reference for Developer Guides (REST API docs) and the '
                  'Admin Panel API page. Includes the 3 inline brand icons '
                  'rendered as part of the API reference UI.',
        'cw_sections': ['cw-61'],
        'compendium_sections': ['developer-guides', 'admin-panel'],
    },
    {
        'id': 'data-migration-and-import',
        'reason': 'System administration CLI tools (cmdDoctor, cmdLogs, '
                  'cmdConfig) + database/schema management + the structured '
                  'API surface are the infrastructure the Migration tools '
                  '(WooCommerce/LearnDash/LifterLMS/LearnPress → Tutor LMS) '
                  'run on top of for batch import/export with progress '
                  'tracking.',
        'cw_sections': ['cw-5', 'cw-12', 'cw-29', 'cw-30', 'cw-31', 'cw-11',
                        'cw-61'],
        'compendium_sections': ['migration', 'admin-panel', 'developer-guides'],
    },
]


def main():
    # Load source data to get the full list of section ids (so we can emit
    # entries for sections that have no mappings too, and validate ids).
    with open(CODEWIKI_JSON) as f:
        cw_data = json.load(f)
    with open(COMPENDIUM_JSON) as f:
        comp_data = json.load(f)

    all_cw_ids = [s['id'] for s in cw_data['sections']]
    all_comp_ids = [s['id'] for s in comp_data['sections']]
    cw_id_set = set(all_cw_ids)
    comp_id_set = set(all_comp_ids)

    # Validate concept ids reference real sections
    for concept in CONCEPTS:
        for cw_id in concept['cw_sections']:
            assert cw_id in cw_id_set, f'Unknown cw id: {cw_id} in concept {concept["id"]}'
        for comp_id in concept['compendium_sections']:
            assert comp_id in comp_id_set, f'Unknown compendium id: {comp_id} in concept {concept["id"]}'

    # Build bidirectional maps (preserve first-seen order, dedupe)
    cw_to_comp = defaultdict(list)
    comp_to_cw = defaultdict(list)
    for concept in CONCEPTS:
        for cw_id in concept['cw_sections']:
            for comp_id in concept['compendium_sections']:
                if comp_id not in cw_to_comp[cw_id]:
                    cw_to_comp[cw_id].append(comp_id)
                if cw_id not in comp_to_cw[comp_id]:
                    comp_to_cw[comp_id].append(cw_id)

    # Ensure every section id appears in both maps (empty list if no mappings)
    codewiki_to_compendium = {}
    for cw_id in all_cw_ids:
        codewiki_to_compendium[cw_id] = cw_to_comp.get(cw_id, [])
    compendium_to_codewiki = {}
    for comp_id in all_comp_ids:
        compendium_to_codewiki[comp_id] = comp_to_cw.get(comp_id, [])

    # Count total mappings
    total_mappings = sum(len(v) for v in codewiki_to_compendium.values())

    output = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'source_files': [
            'src/data/codewiki-sections.json (61 sections)',
            'src/data/compendium-saas-plan.json (28 sections)',
        ],
        'description': (
            'Bidirectional cross-reference between CodeWiki analysis sections '
            '(lastsaas capabilities) and Compendium SaaS plan sections (Tutor '
            'LMS features that depend on those capabilities). Built from a '
            'concept table that groups capability → dependency relationships; '
            'see the "concepts" array for the reasoning behind each group.'
        ),
        'totals': {
            'codewiki_sections': len(all_cw_ids),
            'compendium_sections': len(all_comp_ids),
            'concepts': len(CONCEPTS),
            'mappings': total_mappings,
            'codewiki_sections_with_mappings': sum(1 for v in codewiki_to_compendium.values() if v),
            'compendium_sections_with_mappings': sum(1 for v in compendium_to_codewiki.values() if v),
        },
        'concepts': CONCEPTS,
        'codewiki_to_compendium': codewiki_to_compendium,
        'compendium_to_codewiki': compendium_to_codewiki,
    }

    with open(OUTPUT_JSON, 'w') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write('\n')

    print(f'Wrote {OUTPUT_JSON}')
    print(f'  CodeWiki sections        : {len(all_cw_ids)}')
    print(f'  Compendium sections      : {len(all_comp_ids)}')
    print(f'  Concepts                 : {len(CONCEPTS)}')
    print(f'  Total mappings           : {total_mappings}')
    print(f'  CW sections w/ mappings  : {output["totals"]["codewiki_sections_with_mappings"]}')
    print(f'  Comp sections w/ mappings: {output["totals"]["compendium_sections_with_mappings"]}')
    print()
    # Spot-check the task's example mappings
    print('=== Spot-checks (from task brief) ===')
    print(f'  cw-13 (Auth)           -> {codewiki_to_compendium["cw-13"]}')
    print(f'  cw-19 (Billing/Stripe) -> {codewiki_to_compendium["cw-19"]}')
    print(f'  cw-41 (Frontend Struct)-> {codewiki_to_compendium["cw-41"]}')
    print(f'  course-builder         <- {compendium_to_codewiki["course-builder"]}')
    print(f'  getting-started        <- {compendium_to_codewiki["getting-started"]}')
    print(f'  native-ecommerce       <- {compendium_to_codewiki["native-ecommerce"]}')


if __name__ == '__main__':
    main()
