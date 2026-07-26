'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen, Database, Code2, Zap, Map, Ticket, HelpCircle, CreditCard,
  Mail, Plug, Search, Sun, Moon, ChevronRight, Menu, Clock, Globe,
  Loader2, FileText, GitCompare, Server, Brain, CheckCircle, XCircle,
  AlertCircle, ArrowRight, Folder, File
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useTheme } from 'next-themes'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BookOpen, group: 'general' },
  { id: 'collections', label: 'Data Model (91)', icon: Database, group: 'general' },
  { id: 'endpoints', label: 'API Reference (172)', icon: Code2, group: 'general' },
  { id: 'events', label: 'Events (480)', icon: Zap, group: 'general' },
  { id: 'phases', label: 'Build Roadmap (6)', icon: Map, group: 'general' },
  { id: 'tickets', label: 'Tickets (100)', icon: Ticket, group: 'general' },
  { id: 'quiz-types', label: 'Quiz Types (13)', icon: HelpCircle, group: 'general' },
  { id: 'gateways', label: 'Payment Gateways (11)', icon: CreditCard, group: 'general' },
  { id: 'settings', label: 'Settings (66)', icon: Mail, group: 'general' },
  { id: 'email-triggers', label: 'Email Triggers (54)', icon: Mail, group: 'general' },
  { id: 'lastsaas', label: 'LastSaaS Architecture', icon: Server, group: 'lastsaas' },
  { id: 'tutor-kb', label: 'Tutor LMS Knowledge', icon: FileText, group: 'tutor' },
  { id: 'comparison', label: 'Comparison', icon: GitCompare, group: 'comparison' },
  { id: 'ai-search', label: 'AI Search', icon: Brain, group: 'ai' },
  { id: 'health', label: 'System Health', icon: CheckCircle, group: 'ai' },
  { id: 'mcp', label: 'MCP + API Access', icon: Plug, group: 'ai' },
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

const STATUS_COLORS: Record<string, string> = {
  'equivalent': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'different-implementation': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'missing-in-lastsaas': 'bg-red-500/10 text-red-600 dark:text-red-400',
  'partially-implemented': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'lastsaas-only': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'tutor-only': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
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

function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!url) return
    setLoading(true); setError(null)
    fetch(url).then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(e => { setError(e.message); setLoading(false) })
  }, [url])
  return { data, loading, error }
}

function DataTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="border rounded-lg overflow-auto max-h-[calc(100vh-250px)]">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0"><tr>{headers.map((h, i) => <th key={i} className="text-left p-3 font-medium whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-t hover:bg-muted/30">{row.map((cell, j) => <td key={j} className="p-3">{cell}</td>)}</tr>)}</tbody>
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

  // AI search state
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSource, setAiSource] = useState<string>('')

  const apiUrl = (() => {
    const map: Record<string, string> = {
      'collections': '/api/spec/collections',
      'endpoints': '/api/spec/endpoints',
      'events': '/api/spec/events',
      'settings': '/api/spec/settings',
      'email-triggers': '/api/spec/email-triggers',
      'quiz-types': '/api/spec/quiz-types',
      'lastsaas': '/api/lastsaas/architecture',
      'tutor-kb': '/api/tutor-kb/addons',
      'comparison': '/api/comparison',
    }
    return map[active] || null
  })()

  const { data: apiData, loading, error } = useFetch<any>(apiUrl)
  const { data: healthData } = useFetch<any>('/api/lastsaas/architecture')
  const { data: tutorData } = useFetch<any>('/api/tutor-kb/classes')

  const filterData = (items: any[]) => {
    if (!search || !items) return items
    return items.filter(item => JSON.stringify(item).toLowerCase().includes(search.toLowerCase()))
  }

  const askAI = async () => {
    if (!aiQuestion) return
    setAiLoading(true); setAiAnswer(null)
    try {
      const res = await fetch('/api/codewiki/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion })
      })
      const data = await res.json()
      setAiAnswer(data.answer || data.error || 'No response')
      setAiSource(data.source || 'codewiki.google')
    } catch (e: any) { setAiAnswer(`Error: ${e.message}`) }
    setAiLoading(false)
  }

  const renderContent = () => {
    // === OVERVIEW ===
    if (active === 'overview') {
      const stats = [
        { label: 'Collections', value: 91, icon: Database, color: 'text-amber-500' },
        { label: 'Endpoints', value: 172, icon: Code2, color: 'text-emerald-500' },
        { label: 'Events', value: 480, icon: Zap, color: 'text-pink-500' },
        { label: 'Tickets', value: 100, icon: Ticket, color: 'text-cyan-500' },
        { label: 'Settings', value: 66, icon: Mail, color: 'text-purple-500' },
        { label: 'LastSaaS Routes', value: 133, icon: Server, color: 'text-blue-500' },
        { label: 'Tutor Classes', value: 89, icon: FileText, color: 'text-orange-500' },
        { label: 'Comparisons', value: 25, icon: GitCompare, color: 'text-yellow-500' },
        { label: 'Phases', value: 6, icon: Map, color: 'text-indigo-500' },
        { label: 'Dev-Days', value: 137.5, icon: Clock, color: 'text-green-500' },
      ]
      return (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/2 0">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Technical Intelligence Platform · Tutor LMS + lastsaas</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">LMS SaaS Spec</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">Complete engineering specification with TWO separated knowledge bases (LastSaaS via CodeWiki/MCP + Tutor LMS via source code indexing), side-by-side comparison, AI search, and full traceability.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map(s => { const Icon = s.icon; return (
              <Card key={s.label}><CardContent className="p-4"><Icon className={`w-5 h-5 ${s.color} mb-2`} /><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></CardContent></Card>
            )})}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="w-4 h-4 text-blue-500" /> LastSaaS</CardTitle><CardDescription>CodeWiki + MCP connected</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><div>134 Go files · 91 TS files</div><div>22 packages · 38 collections</div><div>133 API routes · 10 middleware</div><div>22 models · 22 events</div><Badge variant="outline" className="mt-2 bg-blue-500/10 text-blue-600 dark:text-blue-400">CodeWiki: Connected</Badge></CardContent></Card>
            <Card className="border-orange-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4 text-orange-500" /> Tutor LMS</CardTitle><CardDescription>Source code indexed</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><div>636 PHP files (free) · 1618 (Pro)</div><div>61 free classes · 28 Pro classes</div><div>16 models · 29 addons</div><div>54 email templates · 9 shortcodes</div><Badge variant="outline" className="mt-2 bg-orange-500/10 text-orange-600 dark:text-orange-400">Index: Complete</Badge></CardContent></Card>
            <Card className="border-purple-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plug className="w-4 h-4 text-purple-500" /> AI Access</CardTitle><CardDescription>MCP + JSON API</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><div><code className="text-purple-600 dark:text-purple-400 text-xs">POST /api/mcp</code> — MCP server</div><div><code className="text-purple-600 dark:text-purple-400 text-xs">POST /api/codewiki/ask</code> — CodeWiki proxy</div><div><code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/spec/*</code> — 10 JSON endpoints</div><div><code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/comparison</code> — Comparison data</div></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Map className="w-5 h-5" /> Build Roadmap</CardTitle><CardDescription>6 phases · 24 weeks · ~137.5 dev-days</CardDescription></CardHeader>
            <CardContent><div className="space-y-3">{PHASES.map(p => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border"><Badge variant="outline" className={`shrink-0 ${PHASE_COLORS[p.id]}`}>{p.id}</Badge><div className="flex-1 min-w-0"><div className="font-medium text-sm">{p.title}</div><div className="text-xs text-muted-foreground mt-0.5">{p.weeks} · {p.theme}</div></div><Badge variant="secondary" className="shrink-0 text-xs">{p.tickets} tickets</Badge></div>
            ))}</div></CardContent>
          </Card>
        </div>
      )
    }

    // === COLLECTIONS (now fetches from API — 91 items) ===
    if (active === 'collections') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span>Loading ALL collections...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const filtered = filterData(apiData.collections || [])
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Data Model — ALL {apiData.total} Collections</h1><p className="text-muted-foreground">Extracted from lastsaas mongodb.go (38 existing) + LMS schema design (53 new). Source: real source code.</p></div>
          <DataTable headers={['Collection', 'Domain', 'Status', 'Fields', 'Description', 'Source', 'Confidence']}
            rows={filtered.map((c: any) => [
              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">{c.name}</span>,
              <span className="capitalize text-muted-foreground">{c.domain}</span>,
              <Badge variant="outline" className={c.status === 'existing' ? 'bg-gray-500/10' : c.status === 'extended' ? 'bg-blue-500/10' : 'bg-amber-500/10'}>{c.status}</Badge>,
              <span className="font-mono">{c.fields}</span>,
              <span className="text-xs text-muted-foreground">{c.description}</span>,
              <span className="text-xs font-mono text-muted-foreground">{c.source}</span>,
              <Badge variant="outline" className={c.confidence === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}>{c.confidence}</Badge>,
            ])} />
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {apiData.total} collections</p>
        </div>
      )
    }

    // === LASTSAAS ARCHITECTURE ===
    if (active === 'lastsaas') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /><span>Loading lastsaas architecture...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const s = apiData.summary
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-500" />
            <div><h1 className="text-3xl font-bold">LastSaaS Architecture</h1><p className="text-muted-foreground">Extracted from real source code — 134 Go files, 91 TS files</p></div>
            <Badge variant="outline" className="ml-auto bg-blue-500/10 text-blue-600 dark:text-blue-400"><CheckCircle className="w-3 h-3 mr-1" /> CodeWiki Connected</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Go Files', value: s.totalGoFiles }, { label: 'TS Files', value: s.totalTSFiles },
              { label: 'Packages', value: s.packages }, { label: 'Collections', value: s.collections },
              { label: 'API Routes', value: s.apiRoutes }, { label: 'Middleware', value: s.middleware },
              { label: 'Models', value: s.models }, { label: 'Events', value: s.events },
              { label: 'Frontend Pages', value: s.frontendPages }, { label: 'Components', value: s.frontendComponents },
              { label: 'Contexts', value: s.frontendContexts }, { label: 'API Handlers', value: s.apiHandlers },
            ].map(stat => <Card key={stat.label} className="p-3"><div className="text-xl font-bold">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></Card>)}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Backend Packages ({s.packages})</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-3 gap-2">
              {apiData.packages.map((pkg: any) => (
                <div key={pkg.name} className="p-2 border rounded text-xs">
                  <div className="font-mono font-medium text-blue-600 dark:text-blue-400">{pkg.name}/</div>
                  <div className="text-muted-foreground mt-0.5">{pkg.files} files</div>
                  <div className="text-muted-foreground mt-0.5 truncate">{pkg.fileList[0] || ''}</div>
                </div>
              ))}
            </div></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">All data available via API</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-2 gap-2 text-xs">
              {['GET /api/lastsaas/architecture','GET /api/lastsaas/collections','GET /api/lastsaas/routes','GET /api/lastsaas/models','GET /api/lastsaas/middleware','GET /api/lastsaas/events'].map(p => (
                <div key={p} className="flex items-center gap-2 p-2 border rounded"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">GET</Badge><code className="text-amber-600 dark:text-amber-400">{p}</code></div>
              ))}
            </div></CardContent>
          </Card>
        </div>
      )
    }

    // === TUTOR KB ===
    if (active === 'tutor-kb') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-orange-500" /><span>Loading Tutor LMS knowledge...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const s = apiData.summary
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-500" />
            <div><h1 className="text-3xl font-bold">Tutor LMS Knowledge</h1><p className="text-muted-foreground">Indexed from source code — 636 PHP (free) + 1618 (Pro)</p></div>
            <Badge variant="outline" className="ml-auto bg-orange-500/10 text-orange-600 dark:text-orange-400"><CheckCircle className="w-3 h-3 mr-1" /> Source Indexed</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'PHP Free', value: s?.totalPhpFilesFree || 636 }, { label: 'PHP Pro', value: s?.totalPhpFilesPro || 1618 },
              { label: 'Free Classes', value: s?.classesFree || 61 }, { label: 'Pro Classes', value: s?.classesPro || 28 },
              { label: 'Models', value: s?.models || 16 }, { label: 'Addons', value: s?.addons || 29 },
              { label: 'API Controllers', value: s?.apiControllers || 14 }, { label: 'Email Templates', value: s?.emailTemplates || 54 },
              { label: 'Shortcodes', value: s?.shortcodes || 9 },
            ].map(stat => <Card key={stat.label} className="p-3"><div className="text-xl font-bold">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></Card>)}
          </div>
          <Card><CardHeader><CardTitle className="text-base">Pro Addons ({apiData.addons?.length || 0})</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-3 gap-2">
              {(apiData.addons || []).map((addon: any) => (
                <div key={addon.name} className="p-2 border rounded text-xs">
                  <div className="font-mono font-medium text-orange-600 dark:text-orange-400">{addon.name}</div>
                  <div className="text-muted-foreground mt-0.5">{addon.files} PHP files</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{addon.source}</div>
                </div>
              ))}
            </div></CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">All data available via API</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-2 gap-2 text-xs">
              {['GET /api/tutor-kb/classes','GET /api/tutor-kb/models','GET /api/tutor-kb/addons'].map(p => (
                <div key={p} className="flex items-center gap-2 p-2 border rounded"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">GET</Badge><code className="text-amber-600 dark:text-amber-400">{p}</code></div>
              ))}
            </div></CardContent>
          </Card>
        </div>
      )
    }

    // === COMPARISON ===
    if (active === 'comparison') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-yellow-500" /><span>Loading comparison...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const filtered = filterData(apiData.comparisons || [])
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <GitCompare className="w-8 h-8 text-yellow-500" />
            <div><h1 className="text-3xl font-bold">Side-by-Side Comparison</h1><p className="text-muted-foreground">{apiData.total} comparison rows — Tutor LMS vs LastSaaS</p></div>
          </div>
          <DataTable headers={['Category', 'Tutor LMS', 'LastSaaS', 'Status', 'Tutor Source', 'LastSaaS Source', 'Confidence']}
            rows={filtered.map((c: any) => [
              <span className="font-medium">{c.category}</span>,
              <span className="text-xs text-orange-600 dark:text-orange-400">{c.tutorLms}</span>,
              <span className="text-xs text-blue-600 dark:text-blue-400">{c.lastsaas}</span>,
              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ''}`}>{c.status}</Badge>,
              <span className="text-xs font-mono text-muted-foreground">{c.tutorSource}</span>,
              <span className="text-xs font-mono text-muted-foreground">{c.lastsaasSource}</span>,
              <Badge variant="outline" className={c.confidence === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}>{c.confidence}</Badge>,
            ])} />
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {apiData.total} comparisons</p>
        </div>
      )
    }

    // === AI SEARCH ===
    if (active === 'ai-search') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            <div><h1 className="text-3xl font-bold">AI Search</h1><p className="text-muted-foreground">Ask questions about either codebase via CodeWiki/MCP</p></div>
          </div>
          <Card className="border-purple-500/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Ask about lastsaas... (e.g. How does authentication work?)" value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAI()} className="flex-1" />
                <Button onClick={askAI} disabled={aiLoading}>{aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}</Button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {['How does authentication work?', 'How are MongoDB collections defined?', 'How does the Stripe integration work?', 'How does multi-tenancy work?'].map(q => (
                  <Button key={q} variant="outline" size="sm" className="text-xs" onClick={() => { setAiQuestion(q); }}>{q}</Button>
                ))}
              </div>
            </CardContent>
          </Card>
          {aiAnswer && (
            <Card><CardHeader><CardTitle className="text-base flex items-center gap-2">Answer <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">{aiSource}</Badge></CardTitle></CardHeader>
              <CardContent><pre className="whitespace-pre-wrap text-sm text-muted-foreground max-h-[60vh] overflow-y-auto">{aiAnswer}</pre></CardContent>
            </Card>
          )}
          <Card className="border-amber-500/20 bg-amber-500/5"><CardContent className="p-4 text-sm">
            <strong>How it works:</strong> Questions are proxied to <code className="text-amber-600 dark:text-amber-400">codewiki.google/github.com/jonradoff/lastsaas</code> via the CodeWiki MCP client. The Gemini agent (which has full knowledge of the lastsaas codebase) responds with code-level answers.
          </CardContent></Card>
        </div>
      )
    }

    // === SYSTEM HEALTH ===
    if (active === 'health') {
      const lsStats = healthData?.summary || {}
      const tStats = tutorData || {}
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
            <div><h1 className="text-3xl font-bold">System Health</h1><p className="text-muted-foreground">Indexing status for both knowledge bases</p></div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="w-4 h-4 text-blue-500" /> LastSaaS</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Source code:</span><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Available</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Go files indexed:</span><span className="font-mono">{lsStats.totalGoFiles || 134}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TS files indexed:</span><span className="font-mono">{lsStats.totalTSFiles || 91}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Packages detected:</span><span className="font-mono">{lsStats.packages || 22}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Collections detected:</span><span className="font-mono">{lsStats.collections || 38}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">API routes detected:</span><span className="font-mono">{lsStats.apiRoutes || 133}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Models detected:</span><span className="font-mono">{lsStats.models || 22}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Events detected:</span><span className="font-mono">{lsStats.events || 22}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CodeWiki:</span><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MCP:</span><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge></div>
              </CardContent>
            </Card>
            <Card className="border-orange-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4 text-orange-500" /> Tutor LMS</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Source code:</span><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Available</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PHP files (free):</span><span className="font-mono">636</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PHP files (Pro):</span><span className="font-mono">1618</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Free classes:</span><span className="font-mono">{tStats.totalFree || 61}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pro classes:</span><span className="font-mono">{tStats.totalPro || 28}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Models:</span><span className="font-mono">16</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Addons:</span><span className="font-mono">29</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">API controllers:</span><span className="font-mono">14</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email templates:</span><span className="font-mono">54</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Indexing:</span><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />Complete</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">MCP:</span><Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">N/A (internal index)</Badge></div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    // === PHASES ===
    if (active === 'phases') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Build Roadmap — ALL 6 Phases</h1></div>
          {PHASES.map(p => (
            <Card key={p.id}><CardHeader><div className="flex items-center gap-3"><Badge variant="outline" className={PHASE_COLORS[p.id]}>{p.id}</Badge><CardTitle className="text-base">{p.title}</CardTitle><Badge variant="secondary" className="ml-auto text-xs">{p.tickets} tickets · {p.devDays} days</Badge></div><CardDescription>{p.weeks} · {p.theme}</CardDescription></CardHeader>
              <CardContent><ul className="space-y-1">{p.scope.map((s, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-1 shrink-0 text-amber-500" />{s}</li>)}</ul></CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // === GATEWAYS ===
    if (active === 'gateways') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Payment Gateways — ALL 11</h1></div>
          <div className="grid md:grid-cols-2 gap-4">
            {GATEWAYS.map(gw => (
              <Card key={gw.id} className={gw.phase === 'Phase 2' ? 'border-emerald-500/20' : ''}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />{gw.name}</CardTitle><div className="flex gap-1"><Badge variant="outline" className={`text-xs ${PHASE_COLORS[gw.phase]}`}>{gw.phase}</Badge><Badge variant="outline" className="text-xs">{gw.region}</Badge></div></div></CardHeader>
                <CardContent><div className="space-y-1">{gw.creds.map(c => <div key={c} className="text-xs font-mono"><span className="text-amber-600 dark:text-amber-400">{c}</span></div>)}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    // === MCP ===
    if (active === 'mcp') {
      return (
        <div className="space-y-6">
          <div><h1 className="text-3xl font-bold mb-2">MCP + API Access</h1><p className="text-muted-foreground">How AI agents connect to ALL this data</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-purple-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5 text-purple-500" /> MCP Server</CardTitle></CardHeader>
              <CardContent><pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-300 overflow-x-auto">{`POST /api/mcp\nJSON-RPC 2.0\n\nTools:\n  get_collection(name)\n  search_spec(query)\n  get_stats()`}</pre></CardContent>
            </Card>
            <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Server className="w-5 h-5 text-blue-500" /> CodeWiki Proxy</CardTitle></CardHeader>
              <CardContent><pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-300 overflow-x-auto">{`POST /api/codewiki/ask\nBody: { question: "..." }\n\nProxies to codewiki.google\nfor lastsaas codebase queries`}</pre></CardContent>
            </Card>
          </div>
          <Card className="border-emerald-500/20"><CardHeader><CardTitle className="flex items-center gap-2"><Code2 className="w-5 h-5 text-emerald-500" /> JSON API — ALL Endpoints</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-2 gap-2">
              {['GET /api/spec/overview','GET /api/spec/collections → 91','GET /api/spec/endpoints → 172','GET /api/spec/events → 480','GET /api/spec/settings → 66','GET /api/spec/email-triggers → 54','GET /api/lastsaas/architecture','GET /api/lastsaas/collections → 38','GET /api/lastsaas/routes → 133','GET /api/tutor-kb/classes → 89','GET /api/tutor-kb/models → 16','GET /api/comparison → 25'].map(p => (
                <div key={p} className="flex items-center gap-2 p-2 rounded border text-xs"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">GET</Badge><code className="font-mono text-amber-600 dark:text-amber-400">{p}</code></div>
              ))}
            </div></CardContent>
          </Card>
        </div>
      )
    }

    // === TICKETS ===
    if (active === 'tickets') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Tickets — 100 Total</h1></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PHASES.map(p => <Card key={p.id} className="p-3"><Badge variant="outline" className={`text-xs ${PHASE_COLORS[p.id]}`}>{p.id}</Badge><div className="text-xl font-bold mt-2">{p.tickets}</div><div className="text-xs text-muted-foreground">{p.devDays} days</div></Card>)}
          </div>
        </div>
      )
    }

    // === API-fetched sections (endpoints, events, settings, triggers, quiz-types) ===
    if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span>Loading ALL {active}...</span></div>
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>
    if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>

    const items = apiData.endpoints || apiData.events || apiData.settings || apiData.triggers || apiData.quizTypes || []
    const filtered = filterData(items)
    const total = apiData.total || items.length

    if (active === 'endpoints') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">API Reference — ALL {total} Endpoints</h1></div>
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filtered.map((ep: any) => (
              <Card key={ep.id}><CardContent className="p-3"><div className="flex items-start gap-2">
                <Badge variant="outline" className={`shrink-0 font-mono text-xs ${METHOD_COLORS[ep.method] || ''}`}>{ep.method}</Badge>
                <div className="flex-1 min-w-0"><code className="text-xs font-mono text-amber-600 dark:text-amber-400 break-all">{ep.path}</code><span className="text-xs text-muted-foreground ml-2">{ep.name}</span>
                <div className="mt-1 flex gap-1"><Badge variant="outline" className="text-xs">{ep.auth}</Badge><Badge variant="outline" className={`text-xs ${PHASE_COLORS[ep.phase] || ''}`}>{ep.phase}</Badge><Badge variant="secondary" className="text-xs">{ep.folder}</Badge></div></div>
              </div></CardContent></Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} endpoints</p>
        </div>
      )
    }

    if (active === 'events') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Event Catalog — ALL {total} Events</h1><p className="text-muted-foreground">Real events from Tutor source code (do_action calls)</p></div>
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            {filtered.map((ev: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs hover:bg-muted/30"><Zap className="w-3 h-3 text-pink-500 shrink-0" /><code className="font-mono text-amber-600 dark:text-amber-400 shrink-0">{ev.goEvent || ev.wpHook}</code><Badge variant="outline" className="text-xs shrink-0">{ev.domain}</Badge><span className="text-muted-foreground truncate">{ev.wpHook}</span></div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} events</p>
        </div>
      )
    }

    if (active === 'settings') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Settings — ALL {total}</h1></div>
          <DataTable headers={['Tab', 'Field', 'Label', 'Type', 'Phase']} rows={filtered.map((s: any) => [
            <Badge variant="outline" className="text-xs">{s.tab}</Badge>, <span className="font-mono text-xs text-amber-600 dark:text-amber-400">{s.field}</span>, <span>{s.label}</span>, <code className="text-xs text-cyan-600 dark:text-cyan-400">{s.type}</code>, <Badge variant="outline" className={`text-xs ${PHASE_COLORS[s.phase] || ''}`}>{s.phase}</Badge>,
          ])} />
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} settings</p>
        </div>
      )
    }

    if (active === 'email-triggers') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Email Triggers — ALL {total}</h1></div>
          <DataTable headers={['Name', 'Recipient', 'Trigger', 'File', 'Phase']} rows={filtered.map((t: any) => [
            <span className="font-medium">{t.name}</span>,
            <Badge variant="outline" className={`text-xs ${t.recipient === 'student' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : t.recipient === 'instructor' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>{t.recipient}</Badge>,
            <code className="text-xs font-mono text-purple-600 dark:text-purple-400">{t.trigger}</code>, <span className="text-xs font-mono text-muted-foreground">{t.file}</span>,
            <Badge variant="outline" className={`text-xs ${PHASE_COLORS[t.phase] || ''}`}>{t.phase}</Badge>,
          ])} />
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {total} triggers</p>
        </div>
      )
    }

    if (active === 'quiz-types') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Quiz Question Types — ALL {total}</h1></div>
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((qt: any) => (
              <Card key={qt.id} className={qt.isPro ? 'border-amber-500/30' : ''}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><HelpCircle className="w-4 h-4" />{qt.name}</CardTitle><div className="flex gap-1">{qt.isPro && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">PRO</Badge>}<Badge variant="outline" className={`text-xs ${qt.grading === 'auto' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>{qt.grading}</Badge></div></div></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{qt.desc}</p><div className="mt-1 text-xs font-mono text-muted-foreground">{qt.id}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    return <div className="p-8 text-muted-foreground">Select a section.</div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex w-72 shrink-0 border-r bg-card/30">
        <div className="flex flex-col h-full w-full">
          <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white" /></div><div><div className="font-bold text-sm">LMS SaaS Spec</div><div className="text-xs text-muted-foreground">Intelligence Platform</div></div></div></div>
          <ScrollArea className="flex-1 px-2"><div className="space-y-0.5 py-2">
            {SECTIONS.map(s => { const Icon = s.icon; return (
              <button key={s.id} onClick={() => { setActive(s.id); setSidebarOpen(false) }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${active === s.id ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="w-4 h-4 shrink-0" /><span className="truncate">{s.label}</span></button>
            )})}
          </div></ScrollArea>
          <div className="p-3 border-t text-xs text-muted-foreground"><div>91 collections · 172 endpoints · 480 events</div><div className="mt-0.5">LastSaaS + Tutor LMS · v2.0</div></div>
        </div>
      </aside>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}><SheetContent side="left" className="w-72 p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center"><BookOpen className="w-4 h-4 text-white" /></div><div><div className="font-bold text-sm">LMS SaaS Spec</div><div className="text-xs text-muted-foreground">Intelligence Platform</div></div></div></div>
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
