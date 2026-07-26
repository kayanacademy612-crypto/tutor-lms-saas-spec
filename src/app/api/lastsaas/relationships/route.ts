import { NextResponse } from 'next/server'
import { lastsaasPackages, lastsaasCollections, lastsaasRoutes, lastsaasMiddleware, lastsaasModels, lastsaasEvents, lastsaasApiHandlers, lastsaasFrontendPages, lastsaasFrontendComponents, lastsaasFrontendContexts, lastsaasSummary } from '@/data/lastsaas-architecture'

export const dynamic = 'force-static'

// Build relationship graph from the extracted data
const relationships = [
  // Package → Collections
  { from: 'db', to: 'collections', type: 'owns', description: 'The db package defines all 38 MongoDB collections via accessor methods in mongodb.go' },
  { from: 'db', to: 'schema.go', type: 'validates', description: 'schema.go applies JSON Schema validators to 16 collections using collMod' },
  { from: 'models', to: 'db', type: 'maps-to', description: 'Each model struct maps to a MongoDB collection with bson tags' },
  { from: 'api/handlers', to: 'models', type: 'uses', description: 'API handlers import model structs for request/response serialization' },
  { from: 'middleware/auth', to: 'models/user', type: 'validates', description: 'Auth middleware validates JWT tokens against the users collection' },
  { from: 'middleware/tenant', to: 'models/tenant', type: 'extracts', description: 'Tenant middleware extracts tenant_id from JWT and injects into request context' },
  { from: 'middleware/rbac', to: 'models/membership', type: 'checks', description: 'RBAC middleware checks tenant_memberships for user roles' },
  { from: 'stripe', to: 'models/plan', type: 'syncs', description: 'Stripe service syncs plans collection with Stripe Products and Prices' },
  { from: 'stripe', to: 'models/billing', type: 'records', description: 'Stripe service records transactions in financial_transactions collection' },
  { from: 'webhooks/dispatcher', to: 'models/webhook', type: 'delivers', description: 'Webhook dispatcher reads webhook subscriptions and delivers signed payloads' },
  { from: 'events/emitter', to: 'webhooks/dispatcher', type: 'triggers', description: 'Event emitter fires events that the webhook dispatcher subscribes to' },
  { from: 'email/resend', to: 'events/emitter', type: 'listens', description: 'Email service subscribes to events and sends transactional emails via Resend API' },
  { from: 'configstore', to: 'db', type: 'caches', description: 'Config store caches config_vars collection in-memory with periodic reload' },
  { from: 'health', to: 'db', type: 'monitors', description: 'Health service runs periodic checks on MongoDB connectivity and third-party integrations' },
  { from: 'metrics', to: 'health', type: 'collects', description: 'Metrics service collects system metrics from health checks and Go runtime' },
  { from: 'api/handlers/auth', to: 'middleware/auth', type: 'depends-on', description: 'Auth handler depends on auth middleware for JWT verification' },
  { from: 'api/handlers/tenant', to: 'middleware/tenant', type: 'depends-on', description: 'Tenant handler depends on tenant middleware for tenant isolation' },
  { from: 'api/handlers/billing', to: 'stripe', type: 'calls', description: 'Billing handler calls stripe service for checkout sessions' },
  { from: 'api/handlers/webhooks', to: 'webhooks/dispatcher', type: 'manages', description: 'Webhooks handler manages webhook subscriptions via dispatcher' },
  { from: 'api/handlers/branding', to: 'configstore', type: 'reads', description: 'Branding handler reads branding config from configstore' },
  { from: 'frontend/contexts/AuthContext', to: 'api/handlers/auth', type: 'calls', description: 'AuthContext calls /api/auth/* endpoints for login, register, refresh' },
  { from: 'frontend/contexts/BrandingContext', to: 'api/handlers/branding', type: 'calls', description: 'BrandingContext calls /api/branding for tenant branding config' },
  { from: 'frontend/contexts/TenantContext', to: 'middleware/tenant', type: 'depends-on', description: 'TenantContext relies on tenant middleware for tenant_id injection' },
  { from: 'frontend/api/client', to: 'api/handlers', type: 'calls-all', description: 'API client makes all HTTP requests to /api/* endpoints with token refresh' },
  { from: 'telemetry', to: 'metrics', type: 'feeds', description: 'Telemetry service feeds data to metrics collection' },
  { from: 'planstore', to: 'models/plan', type: 'manages', description: 'Plan store manages plan data with caching on top of plans collection' },
]

// Architecture layers
const layers = [
  {
    name: 'Frontend (React 19 + Vite)',
    components: ['contexts/AuthContext', 'contexts/BrandingContext', 'contexts/TenantContext', 'contexts/ThemeContext', 'api/client', 'pages/*', 'components/*', 'hooks/useTelemetry'],
    source: 'lastsaas/frontend/src/',
    confidence: 'confirmed',
  },
  {
    name: 'HTTP Layer (gorilla/mux)',
    components: ['cmd/server/main.go (router setup)', 'middleware/* (10 middleware)'],
    source: 'lastsaas/backend/cmd/server/main.go, backend/internal/middleware/',
    confidence: 'confirmed',
  },
  {
    name: 'API Handlers',
    components: lastsaasApiHandlers.map(h => h.name),
    source: 'lastsaas/backend/internal/api/handlers/',
    confidence: 'confirmed',
  },
  {
    name: 'Services (Business Logic)',
    components: ['auth', 'configstore', 'email (Resend)', 'events (Emitter)', 'health', 'metrics', 'planstore', 'stripe', 'telemetry', 'webhooks (Dispatcher)'],
    source: 'lastsaas/backend/internal/',
    confidence: 'confirmed',
  },
  {
    name: 'Data Layer (MongoDB)',
    components: ['db/mongodb.go (38 collections)', 'db/schema.go (16 validators)', 'models/* (22 model files)'],
    source: 'lastsaas/backend/internal/db/, backend/internal/models/',
    confidence: 'confirmed',
  },
]

export async function GET() {
  return NextResponse.json({
    summary: lastsaasSummary,
    layers,
    relationships,
    packages: lastsaasPackages.length,
    collections: lastsaasCollections.length,
    routes: lastsaasRoutes.length,
    middleware: lastsaasMiddleware.length,
    models: lastsaasModels.length,
    events: lastsaasEvents.length,
  })
}
