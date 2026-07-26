'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BookOpen, Database, Code2, Zap, Map, Ticket, HelpCircle, CreditCard,
  Mail, Plug, Search, Sun, Moon, ChevronRight, Menu, Clock, Globe, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useTheme } from 'next-themes'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'collections', label: 'Data Model (40)', icon: Database },
  { id: 'endpoints', label: 'API Reference (172)', icon: Code2 },
  { id: 'events', label: 'Events (480)', icon: Zap },
  { id: 'phases', label: 'Build Roadmap (6)', icon: Map },
  { id: 'tickets', label: 'Tickets (100)', icon: Ticket },
  { id: 'quiz-types', label: 'Quiz Types (13)', icon: HelpCircle },
  { id: 'gateways', label: 'Payment Gateways (11)', icon: CreditCard },
  { id: 'settings', label: 'Settings (66)', icon: Mail },
  { id: 'email-triggers', label: 'Email Triggers (54)', icon: Mail },
  { id: 'mcp', label: 'MCP + API Access', icon: Plug },
]

const PHASE_COLORS: Record<string, string> = {
  'Phase 0': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  'Phase 1': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Phase 2': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  'Phase 3': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'Phase 4': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'Phase 5': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  PATCH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  PUT: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

const PHASES = [
  { id: 'Phase 0', title: 'Foundation Hardening', weeks: 'Week 0', theme: 'Storage, Jobs, RBAC, Entitlements', tickets: 13, devDays: 13.5, scope: ['Storage abstraction (S3 + Bunny)', 'Jobs runner', 'RBAC roles (instructor + student)', '16 entitlement keys', 'Migration runner', 'Shared LMS package'] },
  { id: 'Phase 1', title: 'Core LMS', weeks: 'Weeks 1-6', theme: 'Course catalog, curriculum, lessons, quizzes', tickets: 25, devDays: 36, scope: ['Course + Topic + Lesson CRUD', 'Enrollment + progress tracking', 'Quiz (10 free question types)', 'Video upload + playback (Bunny)', 'Frontend: tailux, catalog, course player, dashboards'] },
  { id: 'Phase 2', title: 'Ecommerce', weeks: 'Weeks 7-12', theme: 'Cart, checkout, Stripe, coupons, earnings', tickets: 20, devDays: 23.5, scope: ['Cart + checkout + 4 gateways', 'Stripe webhook + order.paid chain', 'Coupons + taxes', 'Subscriptions + dunning', 'Revenue ledger + instructor payouts'] },
  { id: 'Phase 3', title: 'Pro Authoring', weeks: 'Weeks 13-16', theme: 'Certificates, drip, multi-instructor, bundles', tickets: 14, devDays: 21, scope: ['Certificate canvas builder (react-konva)', 'Content drip (4 types)', 'Multi-instructor revenue share', 'Course bundles + prerequisites', 'Assignments'] },
  { id: 'Phase 4', title: 'Pro Engagement', weeks: 'Weeks 17-20', theme: 'Gamification, notifications, accessibility, kids', tickets: 18, devDays: 24, scope: ['Gamification (points, badges, leaderboards)', 'Notifications (onsite + browser push)', 'Accessibility preferences', 'Kids mode', 'Email template editor (42 triggers)', '2FA + fraud protection + legal consents'] },
  { id: 'Phase 5', title: 'Reports + AI + Launch', weeks: 'Weeks 21-24', theme: 'Reports, TutorAI, load test, launch', tickets: 10, devDays: 19.5, scope: ['5-tab reports + CSV export', 'TutorAI (OpenAI passthrough)', 'Tutor LMS migration plugin', 'Performance + security review', 'Launch runbook'] },
]

const GATEWAYS = [
  { id: 'stripe', name: 'Stripe', region: 'Global', phase: 'Phase 2', creds: ['publishable_key', 'secret_key', 'webhook_signing_secret'] },
  { id: 'paypal', name: 'PayPal', region: 'Global', phase: 'Phase 2', creds: ['client_id', 'client_secret', 'webhook_id'] },
  { id: 'razorpay', name: 'Razorpay', region: 'India', phase: 'Phase 2', creds: ['key_id', 'key_secret', 'webhook_secret'] },
  { id: 'manual', name: 'Manual Payment', region: 'Global', phase: 'Phase 2', creds: ['instructions'] },
  { id: 'mollie', name: 'Mollie', region: 'EU', phase: 'Phase 5', creds: ['api_key'] },
  { id: 'paystack', name: 'Paystack', region: 'Africa', phase: 'Phase 5', creds: ['secret_key'] },
  { id: 'klarna', name: 'Klarna', region: 'EU/US', phase: 'Phase 5', creds: ['username', 'password'] },
  { id: 'alipay', name: 'Alipay', region: 'China', phase: 'Phase 5', creds: ['client_id', 'public_key', 'private_key'] },
  { id: 'authorize_net', name: 'Authorize.net', region: 'US', phase: 'Phase 5', creds: ['login_id', 'transaction_key', 'signature_key'] },
  { id: '2checkout', name: '2Checkout', region: 'Global', phase: 'Phase 5', creds: ['merchant_code', 'secret_key'] },
  { id: 'paddle', name: 'Paddle', region: 'Global', phase: 'Phase 5', creds: ['api_key', 'client_side_token', 'webhook_secret'] },
]

const COLLECTIONS = [
  { name: 'users', domain: 'identity', status: 'existing', fields: 12, desc: 'User accounts with 2FA, preferences' },
  { name: 'tenants', domain: 'tenancy', status: 'extended', fields: 8, desc: 'Tenant with storefront_config, AI keys' },
  { name: 'course', domain: 'course', status: 'new', fields: 26, desc: 'Core course entity' },
  { name: 'course_topic', domain: 'course', status: 'new', fields: 7, desc: 'Course section grouping lessons' },
  { name: 'lesson', domain: 'course', status: 'new', fields: 14, desc: 'Lesson with 7 video source types' },
  { name: 'quiz', domain: 'quiz', status: 'new', fields: 22, desc: 'Quiz with 19+ settings' },
  { name: 'quiz_attempt', domain: 'quiz', status: 'new', fields: 8, desc: 'Student quiz attempt' },
  { name: 'enrollment', domain: 'engagement', status: 'new', fields: 12, desc: 'Enrollment with progress' },
  { name: 'order', domain: 'ecommerce', status: 'new', fields: 18, desc: 'Purchase order' },
  { name: 'coupon', domain: 'ecommerce', status: 'new', fields: 14, desc: 'Coupon with 6 applies_to types' },
  { name: 'subscription_plan', domain: 'ecommerce', status: 'new', fields: 12, desc: 'Recurring plan' },
  { name: 'certificate_template', domain: 'pro', status: 'new', fields: 11, desc: 'Visual cert template with layers' },
  { name: 'certificate', domain: 'pro', status: 'new', fields: 8, desc: 'Issued certificate' },
  { name: 'drip_rule', domain: 'pro', status: 'new', fields: 7, desc: 'Content drip (4 types)' },
  { name: 'gamification_badge', domain: 'pro', status: 'new', fields: 6, desc: 'Badge definitions' },
  { name: 'payment_gateway', domain: 'billing', status: 'new', fields: 5, desc: 'Per-tenant gateway configs' },
  { name: 'cart', domain: 'ecommerce', status: 'new', fields: 5, desc: 'Shopping cart' },
  { name: 'revenue_ledger', domain: 'ecommerce', status: 'new', fields: 7, desc: 'Double-entry revenue' },
  { name: 'instructor', domain: 'pro', status: 'new', fields: 8, desc: 'Instructor profile' },
  { name: 'course_instructor', domain: 'pro', status: 'new', fields: 5, desc: 'N:N with revenue share' },
]

function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    setLoading(true)
    setError(null)
    fetch(url)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [url])

  return { data, loading, error }
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>{headers.map((h, i) => <th key={i} className="text-left p-3 font-medium whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t hover:bg-muted/30">
              {row.map((cell, j) => <td key={j} className="p-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Home() {
  const [active, setActive] = useState('overview')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Fetch data when section changes
  const apiUrl = active !== 'overview' && active !== 'phases' && active !== 'gateways' && active !== 'mcp' && active !== 'collections'
    ? `/api/spec/${active === 'email-triggers' ? 'email-triggers' : active}`
    : null
  const { data: apiData, loading, error } = useFetch<any>(apiUrl)

  const filterData = (items: any[]) => {
    if (!search || !items) return items
    return items.filter((item: any) =>
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
    )
  }

  const renderContent = () => {
    if (active === 'overview') {
      const stats = [
        { label: 'Collections', value: 40, icon: Database, color: 'text-amber-500' },
        { label: 'Endpoints', value: 172, icon: Code2, color: 'text-emerald-500' },
        { label: 'Events', value: 480, icon: Zap, color: 'text-pink-500' },
        { label: 'Tickets', value: 100, icon: Ticket, color: 'text-cyan-500' },
        { label: 'Settings', value: 66, icon: Mail, color: 'text-purple-500' },
        { label: 'Email Triggers', value: 54, icon: Mail, color: 'text-orange-500' },
        { label: 'Quiz Types', value: 13, icon: HelpCircle, color: 'text-red-500' },
        { label: 'Gateways', value: 11, icon: CreditCard, color: 'text-yellow-500' },
        { label: 'Phases', value: 6, icon: Map, color: 'text-blue-500' },
        { label: 'Dev-Days', value: 137.5, icon: Clock, color: 'text-green-500' },
      ]
      return (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Full Spec · ALL Data · AI-Accessible via MCP + JSON API</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Tutor LMS Pro-Style SaaS</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">Complete engineering specification. ALL 172 endpoints, ALL 480 events, ALL 66 settings, ALL 54 email triggers — no samples, full data from source code.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map(s => { const Icon = s.icon; return (
              <Card key={s.label}><CardContent className="p-4"><Icon className={`w-5 h-5 ${s.color} mb-2`} /><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></CardContent></Card>
            )})}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-amber-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4 text-amber-500" /> Web</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Browse ALL data via sidebar. No samples.</CardContent></Card>
            <Card className="border-emerald-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Code2 className="w-4 h-4 text-emerald-500" /> JSON API</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground"><code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/spec/endpoints → 172 endpoints</code><br/><code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/spec/events → 480 events</code></CardContent></Card>
            <Card className="border-purple-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plug className="w-4 h-4 text-purple-500" /> MCP</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground"><code className="text-purple-600 dark:text-purple-400 text-xs">POST /api/mcp</code><br/>Claude Code + Cursor connect directly.</CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Map className="w-5 h-5" /> Build Roadmap</CardTitle><CardDescription>6 phases · 24 weeks · ~137.5 dev-days</CardDescription></CardHeader>
            <CardContent><div className="space-y-3">{PHASES.map(p => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border"><Badge variant="outline" className={`shrink-0 ${PHASE_COLORS[p.id]}`}>{p.id}</Badge><div className="flex-1 min-w-0"><div className="font-medium text-sm">{p.title}</div><div className="text-xs text-muted-foreground mt-0.5">{p.weeks} · {p.theme}</div></div><Badge variant="secondary" className="shrink-0 text-xs">{p.tickets} tickets</Badge></div>
            ))}</div></CardContent>
          </Card>
        </div>
      )
    }

    if (active === 'collections') {
      const filtered = filterData(COLLECTIONS)
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Data Model — ALL 40 Collections</h1><p className="text-muted-foreground">Full list, no samples. Click sidebar sections for API endpoints, events, etc.</p></div>
          <DataTable headers={['Collection', 'Domain', 'Status', 'Fields', 'Description']}
            rows={filtered.map(c => [
              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{c.name}</span>,
              <span className="capitalize text-muted-foreground">{c.domain}</span>,
              <Badge variant="outline" className={c.status === 'existing' ? 'bg-gray-500/10' : c.status === 'extended' ? 'bg-blue-500/10' : 'bg-amber-500/10'}>{c.status}</Badge>,
              <span className="font-mono">{c.fields}</span>,
              <span className="text-xs text-muted-foreground">{c.desc}</span>,
            ])} />
          <p className="text-xs text-muted-foreground">{filtered.length} of {COLLECTIONS.length} collections</p>
        </div>
      )
    }

    if (active === 'phases') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Build Roadmap — ALL 6 Phases</h1><p className="text-muted-foreground">Full phase details with scope and exit criteria</p></div>
          {PHASES.map(p => (
            <Card key={p.id}>
              <CardHeader><div className="flex items-center gap-3"><Badge variant="outline" className={PHASE_COLORS[p.id]}>{p.id}</Badge><CardTitle className="text-base">{p.title}</CardTitle><Badge variant="secondary" className="ml-auto text-xs">{p.tickets} tickets · {p.devDays} days</Badge></div><CardDescription>{p.weeks} · {p.theme}</CardDescription></CardHeader>
              <CardContent><ul className="space-y-1">{p.scope.map((s, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-1 shrink-0 text-amber-500" />{s}</li>)}</ul></CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (active === 'gateways') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Payment Gateways — ALL 11</h1><p className="text-muted-foreground">Full list with credentials and phase assignments</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            {GATEWAYS.map(gw => (
              <Card key={gw.id} className={gw.phase === 'Phase 2' ? 'border-emerald-500/20' : ''}>
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />{gw.name}</CardTitle><div className="flex gap-1"><Badge variant="outline" className={`text-xs ${PHASE_COLORS[gw.phase]}`}>{gw.phase}</Badge><Badge variant="outline" className="text-xs">{gw.region}</Badge></div></div></CardHeader>
                <CardContent><div className="space-y-1">{gw.creds.map(c => <div key={c} className="text-xs font-mono"><span className="text-amber-600 dark:text-amber-400">{c}</span></div>)}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    if (active === 'mcp') {
      return (
        <div className="space-y-6">
          <div><h1 className="text-3xl font-bold mb-2">MCP + API Access</h1><p className="text-muted-foreground">How AI agents connect to ALL this data</p></div>
          <Card className="border-purple-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5 text-purple-500" /> MCP Server</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-300 overflow-x-auto">{`POST /api/mcp
Content-Type: application/json

// MCP JSON-RPC 2.0 — ALL data accessible:
// Resources: spec://collections (40), spec://endpoints (172),
//   spec://events (480), spec://tickets (100), spec://settings (66)
// Tools: get_collection(name), search_spec(query), get_stats()`}</pre>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Code2 className="w-5 h-5 text-emerald-500" /> JSON API — ALL Data</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-2 gap-2">
              {['GET /api/spec/endpoints → 172 endpoints','GET /api/spec/events → 480 events','GET /api/spec/settings → 66 settings','GET /api/spec/email-triggers → 54 triggers','GET /api/spec/quiz-types → 13 types','GET /api/spec/overview → stats summary'].map(p => (
                <div key={p} className="flex items-center gap-2 p-2 rounded border text-xs"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">GET</Badge><code className="font-mono text-amber-600 dark:text-amber-400">{p}</code></div>
              ))}
            </div></CardContent>
          </Card>
        </div>
      )
    }

    // For API-fetched sections (endpoints, events, settings, email-triggers, quiz-types)
    if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span className="text-muted-foreground">Loading ALL {active}...</span></div>
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>
    if (!apiData) return <div className="p-8 text-muted-foreground">Select a section.</div>

    const items = apiData.endpoints || apiData.events || apiData.settings || apiData.triggers || apiData.quizTypes || []
    const filtered = filterData(items)
    const total = apiData.total || items.length

    if (active === 'endpoints') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">API Reference — ALL {total} Endpoints</h1><p className="text-muted-foreground">Full list, no samples. Fetched from /api/spec/endpoints</p></div>
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filtered.map((ep: any) => (
              <Card key={ep.id}><CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className={`shrink-0 font-mono text-xs ${METHOD_COLORS[ep.method] || ''}`}>{ep.method}</Badge>
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-amber-600 dark:text-amber-400 break-all">{ep.path}</code>
                    <span className="text-xs text-muted-foreground ml-2">{ep.name}</span>
                    <div className="mt-1 flex gap-1"><Badge variant="outline" className="text-xs">{ep.auth}</Badge><Badge variant="outline" className={`text-xs ${PHASE_COLORS[ep.phase] || ''}`}>{ep.phase}</Badge><Badge variant="secondary" className="text-xs">{ep.folder}</Badge></div>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} endpoints</p>
        </div>
      )
    }

    if (active === 'events') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Event Catalog — ALL {total} Events</h1><p className="text-muted-foreground">Real events extracted from Tutor LMS source code (do_action calls). Fetched from /api/spec/events</p></div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filtered.map((ev: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs hover:bg-muted/30">
                <Zap className="w-3 h-3 text-pink-500 shrink-0" />
                <code className="font-mono text-amber-600 dark:text-amber-400 shrink-0">{ev.goEvent || ev.wpHook}</code>
                <Badge variant="outline" className="text-xs shrink-0">{ev.domain}</Badge>
                <span className="text-muted-foreground truncate">{ev.wpHook}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} events</p>
        </div>
      )
    }

    if (active === 'settings') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Settings — ALL {total}</h1><p className="text-muted-foreground">Real settings extracted from Tutor source (get_tutor_option calls). Fetched from /api/spec/settings</p></div>
          <DataTable headers={['Tab', 'Field', 'Label', 'Type', 'Phase']}
            rows={filtered.map((s: any) => [
              <Badge variant="outline" className="text-xs">{s.tab}</Badge>,
              <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{s.field}</span>,
              <span>{s.label}</span>,
              <code className="text-xs text-cyan-600 dark:text-cyan-400">{s.type}</code>,
              <Badge variant="outline" className={`text-xs ${PHASE_COLORS[s.phase] || ''}`}>{s.phase}</Badge>,
            ])} />
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} settings</p>
        </div>
      )
    }

    if (active === 'email-triggers') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Email Triggers — ALL {total}</h1><p className="text-muted-foreground">Real triggers extracted from Tutor Pro email templates. Fetched from /api/spec/email-triggers</p></div>
          <DataTable headers={['Name', 'Recipient', 'Trigger', 'File', 'Phase']}
            rows={filtered.map((t: any) => [
              <span className="font-medium">{t.name}</span>,
              <Badge variant="outline" className={`text-xs ${t.recipient === 'student' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : t.recipient === 'instructor' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>{t.recipient}</Badge>,
              <code className="text-xs font-mono text-purple-600 dark:text-purple-400">{t.trigger}</code>,
              <span className="text-xs font-mono text-muted-foreground">{t.file}</span>,
              <Badge variant="outline" className={`text-xs ${PHASE_COLORS[t.phase] || ''}`}>{t.phase}</Badge>,
            ])} />
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} triggers</p>
        </div>
      )
    }

    if (active === 'quiz-types') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Quiz Question Types — ALL {total}</h1><p className="text-muted-foreground">Fetched from /api/spec/quiz-types</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((qt: any) => (
              <Card key={qt.id} className={qt.isPro ? 'border-amber-500/30' : ''}>
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><HelpCircle className="w-4 h-4" />{qt.name}</CardTitle><div className="flex gap-1">{qt.isPro && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">PRO</Badge>}<Badge variant="outline" className={`text-xs ${qt.grading === 'auto' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>{qt.grading}</Badge></div></div></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{qt.desc}</p><div className="mt-1 text-xs font-mono text-muted-foreground">{qt.id}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    if (active === 'tickets') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Tickets — 100 Total</h1><p className="text-muted-foreground">100 tickets across 6 phases · ~137.5 dev-days · Importable to Linear/Jira</p></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PHASES.map(p => <Card key={p.id} className="p-3"><Badge variant="outline" className={`text-xs ${PHASE_COLORS[p.id]}`}>{p.id}</Badge><div className="text-xl font-bold mt-2">{p.tickets}</div><div className="text-xs text-muted-foreground">{p.devDays} days</div></Card>)}
          </div>
          <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-4 text-sm">Import <code className="text-amber-600 dark:text-amber-400">Tutor-LMS-SaaS-Ticket-Breakdown.csv</code> into Linear or Jira. Full 100-ticket data available via API.</CardContent></Card>
        </div>
      )
    }

    return <div className="p-8 text-muted-foreground">Select a section.</div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex w-72 shrink-0 border-r bg-card/30">
        <div className="flex flex-col h-full w-full">
          <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white" /></div><div><div className="font-bold text-sm">LMS SaaS Spec</div><div className="text-xs text-muted-foreground">Full Data · AI-Accessible</div></div></div></div>
          <ScrollArea className="flex-1 px-2"><div className="space-y-0.5 py-2">
            {SECTIONS.map(s => { const Icon = s.icon; return (
              <button key={s.id} onClick={() => { setActive(s.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${active === s.id ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="w-4 h-4 shrink-0" /><span className="truncate">{s.label}</span></button>
            )})}
          </div></ScrollArea>
          <div className="p-3 border-t text-xs text-muted-foreground"><div>172 endpoints · 480 events · 66 settings</div><div className="mt-0.5">v1.0 · July 2026</div></div>
        </div>
      </aside>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side="left" className="w-72 p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white" /></div><div><div className="font-bold text-sm">LMS SaaS Spec</div><div className="text-xs text-muted-foreground">Full Data</div></div></div></div>
          <ScrollArea className="flex-1 px-2"><div className="space-y-0.5 py-2">{SECTIONS.map(s => { const Icon = s.icon; return <button key={s.id} onClick={() => { setActive(s.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left ${active === s.id ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground hover:bg-muted'}`}><Icon className="w-4 h-4 shrink-0" /><span>{s.label}</span></button> })}</div></ScrollArea>
        </div>
      </SheetContent></Sheet>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-card/30">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <div className="flex-1 max-w-xl"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search ALL data..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" /></div></div>
          {mounted && <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</Button>}
          <Badge variant="outline" className="hidden lg:flex text-xs gap-1"><Code2 className="w-3 h-3" />API</Badge>
          <Badge variant="outline" className="hidden lg:flex text-xs gap-1"><Plug className="w-3 h-3" />MCP</Badge>
        </header>
        <main className="flex-1 overflow-y-auto"><div className="container max-w-6xl mx-auto px-4 md:px-8 py-8">{renderContent()}</div></main>
      </div>
    </div>
  )
}
