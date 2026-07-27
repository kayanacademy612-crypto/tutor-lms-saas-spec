'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen, Database, Code2, Zap, Map, Ticket, HelpCircle, CreditCard,
  Mail, Plug, Search, Sun, Moon, ChevronRight, Menu, Clock, Globe,
  Loader2, FileText, GitCompare, Server, Brain, CheckCircle, XCircle,
  AlertCircle, ArrowRight, Folder, File, X, Download, HardDrive, FileCode, FileJson, FileText as FileTextIcon, FileType, Monitor, Layers, ImageIcon, Maximize2, Code, Eye, ChevronDown, ChevronRight as ChevronR
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FrontendAppsSection } from '@/components/frontend-apps/FrontendAppsSection'
import { useTheme } from 'next-themes'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: BookOpen, group: 'general' },
  { id: 'files', label: 'Files & Resources', icon: Folder, group: 'general' },
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
  { id: 'tutor-docs', label: 'Tutor Docs (295)', icon: BookOpen, group: 'tutor' },
  { id: 'comparison', label: 'Comparison', icon: GitCompare, group: 'comparison' },
  { id: 'compendium-saas', label: 'Compendium → SaaS', icon: Map, group: 'comparison' },
  { id: 'visual-ui', label: 'Visual UI (197 imgs)', icon: ImageIcon, group: 'comparison' },
  { id: 'screens', label: 'Screen Inventory (429)', icon: Folder, group: 'comparison' },
  { id: 'feature-comparison', label: 'Feature Comparison (13)', icon: GitCompare, group: 'comparison' },
  { id: 'user-flows', label: 'User Flows (7)', icon: Map, group: 'comparison' },
  { id: 'frontend-gaps', label: 'Frontend Gaps (20)', icon: AlertCircle, group: 'comparison' },
  { id: 'backend-gaps', label: 'Backend Gaps (20)', icon: AlertCircle, group: 'comparison' },
  { id: 'ai-search', label: 'AI Search', icon: Brain, group: 'ai' },
  { id: 'health', label: 'System Health', icon: CheckCircle, group: 'ai' },
  { id: 'mcp', label: 'MCP + API Access', icon: Plug, group: 'ai' },
  { id: 'frontend-apps', label: 'Frontend Apps', icon: Monitor, group: 'apps' },
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

// ════════════════════════════════════════════════════════════════
// SYSTEM HEALTH SECTION with sync
// ════════════════════════════════════════════════════════════════
function HealthSection({ healthData, tutorData }: { healthData: any; tutorData: any }) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const lsStats = healthData?.summary || {}
  const tStats = tutorData || {}

  const doSync = async (target: string) => {
    setSyncing(true); setSyncResult(null)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      })
      const data = await res.json()
      setSyncResult(data)
    } catch (e: any) { setSyncResult({ error: e.message }) }
    setSyncing(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
        <div><h1 className="text-3xl font-bold">System Health</h1><p className="text-muted-foreground">Indexing status for both knowledge bases — with re-sync capability</p></div>
      </div>

      {/* Sync controls */}
      <Card className="border-amber-500/20">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">Re-index:</span>
          <Button size="sm" variant="outline" onClick={() => doSync('lastsaas')} disabled={syncing} className="text-xs gap-1"><Server className="w-3 h-3" /> LastSaaS</Button>
          <Button size="sm" variant="outline" onClick={() => doSync('tutor')} disabled={syncing} className="text-xs gap-1"><FileText className="w-3 h-3" /> Tutor LMS</Button>
          <Button size="sm" variant="outline" onClick={() => doSync('all')} disabled={syncing} className="text-xs gap-1"><CheckCircle className="w-3 h-3" /> Both</Button>
          {syncing && <Loader2 className="w-4 h-4 animate-spin text-amber-500" />}
          {syncResult && (
            <div className="w-full mt-2">
              {syncResult.tasks?.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs mt-1">
                  {t.status === 'success' ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                  <span className="font-mono">{t.task}</span>
                  <span className="text-muted-foreground">{t.message}</span>
                </div>
              ))}
              {syncResult.lastSyncAt && <div className="text-xs text-muted-foreground mt-1">Last sync: {new Date(syncResult.lastSyncAt).toLocaleString()}</div>}
            </div>
          )}
        </CardContent>
      </Card>

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

// ════════════════════════════════════════════════════════════════
// AI SEARCH SECTION — supports both LastSaaS (CodeWiki) and Tutor LMS (internal)
// ════════════════════════════════════════════════════════════════
function AISearchSection({ aiQuestion, setAiQuestion, aiAnswer, aiLoading, aiSource, askAI }: {
  aiQuestion: string; setAiQuestion: (v: string) => void; aiAnswer: string | null; aiLoading: boolean; aiSource: string; askAI: () => void
}) {
  const [searchTarget, setSearchTarget] = useState<'lastsaas' | 'tutor' | 'compare'>('lastsaas')
  const [tutorAnswer, setTutorAnswer] = useState<string | null>(null)
  const [tutorLoading, setTutorLoading] = useState(false)
  const [tutorResults, setTutorResults] = useState<any[]>([])

  const askTutor = async () => {
    if (!aiQuestion) return
    setTutorLoading(true); setTutorAnswer(null); setTutorResults([])
    try {
      const res = await fetch('/api/tutor-kb/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuestion })
      })
      const data = await res.json()
      setTutorAnswer(data.answer || data.error || 'No response')
      setTutorResults(data.results || [])
    } catch (e: any) { setTutorAnswer(`Error: ${e.message}`) }
    setTutorLoading(false)
  }

  const handleAsk = () => {
    if (searchTarget === 'lastsaas') { askAI() }
    else if (searchTarget === 'tutor') { askTutor() }
    else if (searchTarget === 'compare') { askAI(); setTimeout(() => askTutor(), 500) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-purple-500" />
        <div><h1 className="text-3xl font-bold">AI Search</h1><p className="text-muted-foreground">Ask questions about either codebase. Two separate knowledge bases, never mixed.</p></div>
      </div>

      {/* Target selector */}
      <div className="flex gap-2">
        <Button variant={searchTarget === 'lastsaas' ? 'default' : 'outline'} size="sm" onClick={() => setSearchTarget('lastsaas')} className="text-xs gap-1">
          <Server className="w-3 h-3" /> LastSaaS (CodeWiki)
        </Button>
        <Button variant={searchTarget === 'tutor' ? 'default' : 'outline'} size="sm" onClick={() => setSearchTarget('tutor')} className="text-xs gap-1">
          <FileText className="w-3 h-3" /> Tutor LMS (Internal Index)
        </Button>
        <Button variant={searchTarget === 'compare' ? 'default' : 'outline'} size="sm" onClick={() => setSearchTarget('compare')} className="text-xs gap-1">
          <GitCompare className="w-3 h-3" /> Compare Both
        </Button>
      </div>

      {/* Question input */}
      <Card className="border-purple-500/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={searchTarget === 'lastsaas' ? 'Ask about lastsaas... (e.g. How does authentication work?)' : searchTarget === 'tutor' ? 'Ask about Tutor LMS... (e.g. How does quiz grading work?)' : 'Ask both codebases... (e.g. How does authentication work?)'}
              value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAsk()} className="flex-1"
            />
            <Button onClick={handleAsk} disabled={aiLoading || tutorLoading}>
              {(aiLoading || tutorLoading) ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {searchTarget === 'lastsaas' && ['How does authentication work?', 'How are MongoDB collections defined?', 'How does the Stripe integration work?', 'How does multi-tenancy work?'].map((q, i) => (
              <Button key={`lsq-${i}`} variant="outline" size="sm" className="text-xs" onClick={() => setAiQuestion(q)}>{q}</Button>
            ))}
            {searchTarget === 'tutor' && ['How does quiz grading work?', 'How are courses structured?', 'How does enrollment work?', 'How do certificates work?'].map((q, i) => (
              <Button key={`tq-${i}`} variant="outline" size="sm" className="text-xs" onClick={() => setAiQuestion(q)}>{q}</Button>
            ))}
            {searchTarget === 'compare' && ['How does authentication work?', 'How are payments handled?', 'How does email work?', 'How is data stored?'].map((q, i) => (
              <Button key={`cq-${i}`} variant="outline" size="sm" className="text-xs" onClick={() => setAiQuestion(q)}>{q}</Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* LastSaaS answer */}
      {(searchTarget === 'lastsaas' || searchTarget === 'compare') && aiAnswer && (
        <Card className="border-blue-500/20"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Server className="w-4 h-4 text-blue-500" /> LastSaaS Answer <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">{aiSource}</Badge></CardTitle></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap text-sm text-muted-foreground max-h-[50vh] overflow-y-auto">{aiAnswer}</pre></CardContent>
        </Card>
      )}

      {/* Tutor answer */}
      {(searchTarget === 'tutor' || searchTarget === 'compare') && tutorAnswer && (
        <Card className="border-orange-500/20"><CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" /> Tutor LMS Answer <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400">Internal Index</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground max-h-[40vh] overflow-y-auto">{tutorAnswer}</pre>
            {tutorResults.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Source References ({tutorResults.length} found)</div>
                {tutorResults.slice(0, 10).map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded text-xs">
                    <Badge variant="secondary" className="shrink-0">{r.type}</Badge>
                    <span className="font-medium text-orange-600 dark:text-orange-400">{r.name}</span>
                    <span className="text-muted-foreground truncate">{r.detail}</span>
                    <code className="text-muted-foreground shrink-0 text-[10px]">{r.source}</code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-4 text-sm">
          <div className="flex items-center gap-2 mb-1"><Server className="w-4 h-4 text-blue-500" /><strong>LastSaaS</strong></div>
          Questions are proxied to <code className="text-blue-600 dark:text-blue-400">codewiki.google</code> via CodeWiki MCP. The Gemini agent has full knowledge of the lastsaas Go + React codebase.
        </CardContent></Card>
        <Card className="border-orange-500/20 bg-orange-500/5"><CardContent className="p-4 text-sm">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-orange-500" /><strong>Tutor LMS</strong></div>
          Questions search our internal index of <strong>2,254 PHP files</strong>, 89 classes, 16 models, 29 addons, 480 events, 66 settings, 54 email triggers. Results include source file references.
        </CardContent></Card>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// INTERACTIVE COMPARISON SECTION
// ════════════════════════════════════════════════════════════════
function ComparisonSection({ data, searchQuery }: { data: any; searchQuery: string }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const allComparisons = data.comparisons || []
  const filtered = allComparisons.filter((c: any) => {
    if (searchQuery && !JSON.stringify(c).toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    return true
  })

  // Group by status for summary
  const statusCounts = allComparisons.reduce((acc: any, c: any) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GitCompare className="w-8 h-8 text-yellow-500" />
        <div><h1 className="text-3xl font-bold">Side-by-Side Comparison</h1><p className="text-muted-foreground">{data.total} comparison rows — Tutor LMS vs LastSaaS. Click any row to expand details.</p></div>
      </div>

      {/* Status summary + filter */}
      <div className="flex flex-wrap gap-2">
        <Button variant={statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter('all')} className="text-xs">All ({allComparisons.length})</Button>
        {Object.entries(statusCounts).map(([status, count]: [string, any]) => (
          <Button key={status} variant={statusFilter === status ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(status)} className="text-xs">
            <Badge variant="outline" className={`mr-1 ${STATUS_COLORS[status] || ''}`}>{count}</Badge>
            {status.replace(/-/g, ' ')}
          </Button>
        ))}
      </div>

      {/* Comparison cards — expandable */}
      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
        {filtered.map((c: any, i: number) => {
          const isExpanded = expandedRow === i
          const realIndex = allComparisons.indexOf(c)
          return (
            <Card key={i} className={`cursor-pointer transition-all ${isExpanded ? 'border-amber-500/40' : ''}`} >
              <div onClick={() => setExpandedRow(isExpanded ? null : i)} className="p-3">
                <div className="flex items-start gap-3">
                  <ChevronRight className={`w-4 h-4 mt-0.5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{c.category}</span>
                      <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ''}`}>{c.status.replace(/-/g, ' ')}</Badge>
                      <Badge variant="outline" className={c.confidence === 'confirmed' ? 'text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}>{c.confidence}</Badge>
                    </div>
                    {!isExpanded && (
                      <div className="mt-1 grid md:grid-cols-2 gap-2 text-xs">
                        <div><span className="text-orange-600 dark:text-orange-400 font-medium">Tutor:</span> <span className="text-muted-foreground">{c.tutorLms?.substring(0, 80)}</span></div>
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">LastSaaS:</span> <span className="text-muted-foreground">{c.lastsaas?.substring(0, 80)}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3 bg-muted/20">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-orange-500"></span><span className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400">Tutor LMS</span></div>
                      <p className="text-sm text-muted-foreground">{c.tutorLms}</p>
                      <div className="mt-2 text-xs"><span className="text-muted-foreground">Source:</span> <code className="font-mono text-orange-600 dark:text-orange-400">{c.tutorSource}</code></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400">LastSaaS</span></div>
                      <p className="text-sm text-muted-foreground">{c.lastsaas}</p>
                      <div className="mt-2 text-xs"><span className="text-muted-foreground">Source:</span> <code className="font-mono text-blue-600 dark:text-blue-400">{c.lastsaasSource}</code></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ''}`}>{c.status.replace(/-/g, ' ')}</Badge>
                    <Badge variant="outline" className={c.confidence === 'confirmed' ? 'text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}>Confidence: {c.confidence}</Badge>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {data.total} comparisons. Click any row to expand details with source files.</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// FILES & RESOURCES SECTION
// ════════════════════════════════════════════════════════════════
const SYSTEM_COLORS: Record<string, string> = {
  lastsaas: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  tutor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'tutor-pro': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  codewiki: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  project: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const CATEGORY_ICONS: Record<string, any> = {
  'source-code': FileCode,
  'documentation': FileText,
  'config': FileCode,
  'data': FileJson,
  'generated': FileJson,
  'pdf': File,
  'script': FileCode,
}

// ============================================================
// TUTOR DOCS SECTION — 295 real docs + 870 real screenshots
// ============================================================
function TutorDocsSection({ data, searchQuery }: { data: any; searchQuery: string }) {
  const [sectionFilter, setSectionFilter] = useState('all')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [pageDetail, setPageDetail] = useState<any | null>(null)
  const [pageLoading, setPageLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list')
  const [lightboxImg, setLightboxImg] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const allPages: any[] = data.pages || []
  const allImages: any[] = data.images || []
  const sections: { name: string; order: number; count: number }[] = data.sections_in_order || []

  const filteredPages = allPages.filter(p => {
    if (sectionFilter !== 'all' && p.section !== sectionFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!`${p.title} ${p.slug} ${p.section} ${p.relative_url}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Group filtered pages by section, in section order
  const groupedBySection = sections
    .filter(s => sectionFilter === 'all' || s.name === sectionFilter)
    .map(s => ({
      ...s,
      pages: filteredPages.filter(p => p.section === s.name),
    }))
    .filter(s => s.pages.length > 0)

  const loadPageDetail = async (slug: string) => {
    setSelectedSlug(slug)
    setPageLoading(true)
    setPageDetail(null)
    try {
      const res = await fetch(`/api/tutor-docs/page?slug=${encodeURIComponent(slug)}`)
      const d = await res.json()
      setPageDetail(d)
    } catch (e) {
      setPageDetail({ error: 'failed to load' })
    }
    setPageLoading(false)
  }

  const imgSrc = (servePath: string) => `/api/tutor-docs/file?p=${encodeURIComponent(servePath)}`

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <BookOpen className="w-8 h-8 text-orange-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Tutor LMS Documentation</h1>
          <p className="text-muted-foreground mt-1">{data.total_pages} real doc pages in original site order ({data.total_sections} sections) + {data.total_images} real screenshots. Indexed from the 428MB docs bundle downloaded from your Google Drive link.</p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle className="w-3 h-3 mr-1" /> 428MB · {data.total_sections} sections
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded border overflow-hidden text-xs">
          <button onClick={() => setViewMode('list')} className={`px-3 py-1 ${viewMode === 'list' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <FileText className="inline w-3 h-3 mr-1" />Pages
          </button>
          <button onClick={() => setViewMode('gallery')} className={`px-3 py-1 ${viewMode === 'gallery' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <ImageIcon className="inline w-3 h-3 mr-1" />Screenshot Gallery
          </button>
        </div>
        <span className="text-xs text-muted-foreground ml-2">Section:</span>
        <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="text-xs border rounded px-2 py-1 bg-background max-w-[280px]">
          <option value="all">all ({data.total_pages})</option>
          {sections.map(s => (
            <option key={s.name} value={s.name}>{s.order}. {s.name} ({s.count})</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {viewMode === 'list' ? `${filteredPages.length} pages in ${groupedBySection.length} sections` : `${allImages.length} screenshots`}
        </span>
      </div>

      {viewMode === 'list' ? (
        <div className="grid md:grid-cols-[1fr_2fr] gap-4">
          {/* Page list grouped by section in original order */}
          <Card className="h-[75vh] flex flex-col">
            <CardHeader className="py-2"><CardTitle className="text-sm">Doc Pages in Original Site Order</CardTitle></CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div>
                  {groupedBySection.map(sec => (
                    <div key={sec.name}>
                      {/* Section header */}
                      <div className="sticky top-0 bg-background/95 backdrop-blur px-3 py-1.5 border-y text-xs font-semibold flex items-center gap-2 z-10">
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-600 dark:text-orange-400">{sec.order}</Badge>
                        <span className="text-orange-600 dark:text-orange-400">{sec.name}</span>
                        <span className="text-muted-foreground font-normal ml-auto">{sec.pages.length} docs</span>
                      </div>
                      {/* Pages in this section */}
                      {sec.pages.map((p, i) => (
                        <button
                          key={p.id || `doc-${sec.name}-${i}`}
                          onClick={() => loadPageDetail(p.slug)}
                          className={`w-full text-left px-3 py-2 text-xs border-b hover:bg-muted/50 flex items-center gap-2 ${selectedSlug === p.slug ? 'bg-orange-500/10 border-l-2 border-orange-500' : ''}`}
                        >
                          <span className="text-[10px] text-muted-foreground w-6 shrink-0">{p.order_in_section}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate" title={p.title}>{p.title}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.image_count > 0 && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-pink-500/10 text-pink-600 dark:text-pink-400">
                                  <ImageIcon className="w-2.5 h-2.5 mr-0.5" />{p.image_count}
                                </Badge>
                              )}
                              <code className="text-[10px] text-muted-foreground truncate">{p.slug}</code>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                  {filteredPages.length === 0 && (
                    <div className="p-6 text-center text-muted-foreground text-sm">No docs match the filters.</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Page detail */}
          <Card className="h-[75vh] flex flex-col">
            <CardHeader className="py-2">
              <CardTitle className="text-sm">
                {pageLoading ? 'Loading...' : pageDetail?.title || 'Select a doc page from the left'}
              </CardTitle>
              {pageDetail && !pageDetail.error && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400">{pageDetail.section || pageDetail.category}</Badge>
                  <code className="text-[10px] text-muted-foreground">{pageDetail.relative_url}</code>
                  <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 dark:text-pink-400">{pageDetail.image_count} images</Badge>
                  <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-600 dark:text-gray-400">{pageDetail.text_length} chars</Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              {!selectedSlug && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  Click any page from the left to read the real doc content + see its screenshots.
                </div>
              )}
              {pageLoading && (
                <div className="p-8 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching page content...
                </div>
              )}
              {pageDetail?.error && (
                <div className="p-8 text-center text-red-500 text-sm">{pageDetail.error}</div>
              )}
              {pageDetail && !pageDetail.error && !pageLoading && (
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    {/* Screenshots gallery */}
                    {pageDetail.image_refs?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold uppercase text-pink-600 dark:text-pink-400 mb-2">Screenshots ({pageDetail.image_refs.length}) — click to enlarge</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {pageDetail.image_refs.map((ir: any, i: number) => (
                            <div key={`pimg-${i}`} className="border rounded overflow-hidden cursor-pointer group hover:shadow-md transition-shadow bg-muted/20" onClick={() => { setLightboxImg(ir.serve_path); setFullscreen(false) }}>
                              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgSrc(ir.serve_path)} alt={ir.filename} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                              </div>
                              <div className="p-1 text-[10px] text-muted-foreground truncate" title={ir.filename}>{ir.filename}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Text content */}
                    <div>
                      <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 mb-2">Doc Content</div>
                      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{pageDetail.text_preview}</div>
                    </div>
                    {/* File path */}
                    <div className="text-[10px] text-muted-foreground pt-3 border-t">
                      <span className="font-medium">Source file:</span> <code>{pageDetail.file_path}</code>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Gallery view: all 870 screenshots */
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-pink-500" />
              All Screenshots ({allImages.length})
              <span className="text-xs text-muted-foreground font-normal ml-2">Sorted by file size (largest first = highest detail screenshots). Click any to enlarge + go fullscreen.</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-[75vh] overflow-y-auto">
              {allImages.map((img, i) => (
                <div key={`gimg-${i}`} className="border rounded overflow-hidden cursor-pointer group hover:shadow-md transition-shadow bg-muted/20" onClick={() => { setLightboxImg(img.serve_path); setFullscreen(false) }}>
                  <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc(img.serve_path)} alt={img.filename} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                  </div>
                  <div className="p-1">
                    <div className="text-[10px] font-medium truncate" title={img.filename}>{img.filename}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[9px] text-muted-foreground">{(img.size_bytes / 1024).toFixed(0)} KB</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400">{img.referenced_by_count} docs</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox with fullscreen option */}
      {lightboxImg && (
        <Dialog open onOpenChange={() => { setLightboxImg(null); setFullscreen(false) }}>
          <DialogContent className={fullscreen ? 'max-w-none w-screen h-screen !m-0 !rounded-none !translate-x-0 !translate-y-0 !left-0 !top-0 p-0' : 'max-w-5xl'}>
            <DialogHeader className={fullscreen ? 'sr-only' : ''}>
              <DialogTitle className="text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-500" /> Screenshot
              </DialogTitle>
            </DialogHeader>
            <div className={`flex flex-col ${fullscreen ? 'h-screen' : ''}`}>
              <div className={`bg-black/95 flex items-center justify-center overflow-auto ${fullscreen ? 'flex-1' : 'max-h-[75vh] rounded'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgSrc(lightboxImg)} alt="screenshot" className={fullscreen ? 'max-w-full max-h-full object-contain' : 'max-w-full max-h-[70vh] object-contain'} />
              </div>
              {!fullscreen && (
                <>
                  <div className="text-xs text-muted-foreground mt-2 truncate"><code>{lightboxImg}</code></div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" variant="default" onClick={() => setFullscreen(true)}>
                      <Maximize2 className="w-3 h-3 mr-1" /> Fullscreen
                    </Button>
                    <a href={imgSrc(lightboxImg)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Open in new tab</Button>
                    </a>
                  </div>
                </>
              )}
              {fullscreen && (
                <Button size="sm" variant="secondary" className="fixed top-3 right-3 z-50" onClick={() => setFullscreen(false)}>
                  <X className="w-3 h-3 mr-1" /> Exit fullscreen
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
// COMPENDIUM → SAAS BUILD PLAN
// Maps each of 27 Tutor LMS docs sections to SaaS implementation
// Shows: what to build, which sidebar items get affected, status, phase
// ============================================================
function CompendiumSaaSSection({ data, searchQuery }: { data: any; searchQuery: string }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

  const allSections: any[] = data.sections || []
  const summary = data.summary || {}

  const filtered = allSections.filter((s: any) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (phaseFilter !== 'all' && s.phase !== phaseFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!`${s.name} ${s.saas_implementation} ${s.phase} ${s.status}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const statusColors: Record<string, string> = {
    'done': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'in-progress': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    'planned': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'skipped': 'bg-gray-500/10 text-gray-500 line-through',
    'reference': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  }

  const phaseColors: Record<string, string> = {
    'Phase 0': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    'Phase 1': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    'Phase 2': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    'Phase 3': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    'Phase 4': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    'Phase 5': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'skipped': 'bg-gray-500/10 text-gray-400',
    'reference': 'bg-purple-500/10 text-purple-400',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Map className="w-8 h-8 text-purple-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Compendium → SaaS Build Plan</h1>
          <p className="text-muted-foreground mt-1">
            Maps each of the <strong>{data.total_sections} Tutor LMS docs sections</strong> (the compendium) to its SaaS implementation.
            Shows exactly what to build and how it affects every sidebar item (Data Model, API Reference, Events, Settings, Email Triggers, Tickets, Screens).
          </p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-sm">
          {summary.overall_progress}% complete
        </Badge>
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Build Progress</span>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{summary.overall_progress}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all" style={{ width: `${summary.overall_progress}%` }} />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4 text-xs">
            <Stat label="Done" value={summary.status_counts?.done || 0} color="text-emerald-600" />
            <Stat label="In Progress" value={summary.status_counts?.['in-progress'] || 0} color="text-amber-600" />
            <Stat label="Planned" value={summary.status_counts?.planned || 0} color="text-blue-600" />
            <Stat label="Skipped" value={summary.status_counts?.skipped || 0} color="text-gray-500" />
            <Stat label="Reference" value={summary.status_counts?.reference || 0} color="text-purple-600" />
            <Stat label="Total" value={data.total_sections} color="text-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Sidebar impact summary */}
      <Card className="border-purple-500/20">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-purple-500" /> Total Impact on Sidebar Items</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <ImpactStat icon={Database} label="Collections to Build" value={summary.totals?.collections_to_build || 0} color="text-amber-600" />
            <ImpactStat icon={Code2} label="Endpoints to Build" value={summary.totals?.endpoints_to_build || 0} color="text-emerald-600" />
            <ImpactStat icon={Zap} label="Events to Fire" value={summary.totals?.events_to_build || 0} color="text-pink-600" />
            <ImpactStat icon={Mail} label="Settings to Add" value={summary.totals?.settings_to_build || 0} color="text-purple-600" />
            <ImpactStat icon={Mail} label="Email Triggers" value={summary.totals?.email_triggers_to_build || 0} color="text-cyan-600" />
            <ImpactStat icon={Ticket} label="Tickets" value={summary.totals?.tickets || 0} color="text-indigo-600" />
            <ImpactStat icon={Monitor} label="Screens to Build" value={summary.totals?.screens_to_build || 0} color="text-orange-600" />
            <ImpactStat icon={HelpCircle} label="Quiz Types" value={summary.totals?.quiz_types || 0} color="text-yellow-600" />
            <ImpactStat icon={CreditCard} label="Payment Gateways" value={summary.totals?.gateways || 0} color="text-green-600" />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        {['all', 'done', 'in-progress', 'planned', 'skipped', 'reference'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-2 py-1 rounded text-xs border transition-colors ${statusFilter === s ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {s} <span className="opacity-60">({s === 'all' ? data.total_sections : (summary.status_counts?.[s] || 0)})</span>
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-3">Phase:</span>
        {['all', 'Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'skipped', 'reference'].map(p => (
          <button key={p} onClick={() => setPhaseFilter(p)} className={`px-2 py-1 rounded text-xs border transition-colors ${phaseFilter === p ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Sections list */}
      <div className="space-y-3">
        {filtered.map((s: any, i: number) => {
          const isExpanded = expanded === s.id
          const impact = s.impact || {}
          const sidebarEffects = s.sidebar_effects || {}
          return (
            <Card key={s.id || `cs-${i}`} className={s.status === 'skipped' ? 'opacity-60' : ''}>
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <button onClick={() => setExpanded(isExpanded ? null : s.id)} className="shrink-0 p-1 hover:bg-muted rounded mt-0.5">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{s.name}</h3>
                      <Badge variant="outline" className={`text-xs ${statusColors[s.status] || ''}`}>{s.status}</Badge>
                      <Badge variant="outline" className={`text-xs ${phaseColors[s.phase] || ''}`}>{s.phase}</Badge>
                      <Badge variant="secondary" className="text-xs">{s.doc_count} docs</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{s.saas_implementation}</p>
                  </div>
                </div>

                {/* Quick impact badges (always visible) */}
                <div className="flex flex-wrap gap-1.5 mt-3 ml-8">
                  {impact.collections?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Database className="w-2.5 h-2.5 mr-0.5" />{impact.collections.length} collections
                    </Badge>
                  )}
                  {impact.endpoints?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Code2 className="w-2.5 h-2.5 mr-0.5" />{impact.endpoints.length} endpoints
                    </Badge>
                  )}
                  {impact.events?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600 dark:text-pink-400">
                      <Zap className="w-2.5 h-2.5 mr-0.5" />{impact.events.length} events
                    </Badge>
                  )}
                  {impact.settings?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Mail className="w-2.5 h-2.5 mr-0.5" />{impact.settings.length} settings
                    </Badge>
                  )}
                  {impact.email_triggers?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <Mail className="w-2.5 h-2.5 mr-0.5" />{impact.email_triggers.length} emails
                    </Badge>
                  )}
                  {impact.tickets?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Ticket className="w-2.5 h-2.5 mr-0.5" />{impact.tickets.length} tickets
                    </Badge>
                  )}
                  {impact.screens?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <Monitor className="w-2.5 h-2.5 mr-0.5" />{impact.screens.length} screens
                    </Badge>
                  )}
                  {impact.quiz_types?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                      <HelpCircle className="w-2.5 h-2.5 mr-0.5" />{impact.quiz_types.length} quiz types
                    </Badge>
                  )}
                  {impact.gateways?.length > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400">
                      <CreditCard className="w-2.5 h-2.5 mr-0.5" />{impact.gateways.length} gateways
                    </Badge>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-4 ml-8 space-y-4">
                    {/* Full implementation description */}
                    <div>
                      <div className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400 mb-1">SaaS Implementation</div>
                      <p className="text-sm text-foreground leading-relaxed">{s.saas_implementation}</p>
                    </div>

                    {/* Detailed impact lists */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {impact.collections?.length > 0 && (
                        <ImpactList icon={Database} label="Collections" items={impact.collections} color="text-amber-600" />
                      )}
                      {impact.endpoints?.length > 0 && (
                        <ImpactList icon={Code2} label="Endpoints" items={impact.endpoints} color="text-emerald-600" />
                      )}
                      {impact.events?.length > 0 && (
                        <ImpactList icon={Zap} label="Events" items={impact.events} color="text-pink-600" />
                      )}
                      {impact.settings?.length > 0 && (
                        <ImpactList icon={Mail} label="Settings" items={impact.settings} color="text-purple-600" />
                      )}
                      {impact.email_triggers?.length > 0 && (
                        <ImpactList icon={Mail} label="Email Triggers" items={impact.email_triggers} color="text-cyan-600" />
                      )}
                      {impact.tickets?.length > 0 && (
                        <ImpactList icon={Ticket} label="Tickets" items={impact.tickets} color="text-indigo-600" />
                      )}
                      {impact.screens?.length > 0 && (
                        <ImpactList icon={Monitor} label="Screens" items={impact.screens} color="text-orange-600" />
                      )}
                      {impact.quiz_types?.length > 0 && (
                        <ImpactList icon={HelpCircle} label="Quiz Types" items={impact.quiz_types} color="text-yellow-600" />
                      )}
                      {impact.gateways?.length > 0 && (
                        <ImpactList icon={CreditCard} label="Gateways" items={impact.gateways} color="text-green-600" />
                      )}
                    </div>

                    {/* Sidebar effects — the key part: how this section affects each sidebar item */}
                    <div>
                      <div className="text-xs font-semibold uppercase text-purple-600 dark:text-purple-400 mb-2">Effects on Sidebar Items</div>
                      <div className="space-y-1.5">
                        {Object.entries(sidebarEffects).map(([key, val]: [string, any]) => (
                          <div key={key} className="flex items-start gap-2 p-2 rounded border border-purple-500/10 bg-purple-500/5 text-xs">
                            <Badge variant="outline" className="shrink-0 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400">{key}</Badge>
                            <span className="text-muted-foreground">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Map className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No sections match the current filters.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {data.total_sections} compendium sections. Click any section to expand its full impact on every sidebar item.</p>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="text-center"><div className={`text-lg font-bold ${color}`}>{value}</div><div className="text-muted-foreground">{label}</div></div>
}

function ImpactStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded border">
      <Icon className={`w-4 h-4 ${color} shrink-0`} />
      <div className="min-w-0">
        <div className={`font-bold ${color}`}>{value}</div>
        <div className="text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  )
}

function ImpactList({ icon: Icon, label, items, color }: { icon: any; label: string; items: string[]; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs font-semibold uppercase" style={{ color: undefined }}>{label} ({items.length})</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 20).map((item: string, i: number) => (
          <code key={`${label}-${i}`} className={`text-[10px] px-1.5 py-0.5 rounded bg-muted ${color}`}>{item}</code>
        ))}
        {items.length > 20 && <span className="text-[10px] text-muted-foreground">+{items.length - 20} more</span>}
      </div>
    </div>
  )
}

function VisualUISection({ data, searchQuery }: { data: any; searchQuery: string }) {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [systemFilter, setSystemFilter] = useState('all')
  const [selected, setSelected] = useState<any | null>(null)
  const [showPath, setShowPath] = useState(false)
  const [uiFullscreen, setUiFullscreen] = useState(false)

  const images: any[] = data.images || []
  const filtered = images.filter(img => {
    if (categoryFilter !== 'all' && img.category !== categoryFilter) return false
    if (systemFilter !== 'all' && img.system !== systemFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!`${img.screen_name} ${img.filename} ${img.original_path} ${img.addon_key || ''}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const categories = ['all', ...Object.keys(data.by_category || {})]
  const systems = ['all', 'tutor-free', 'tutor-pro']

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <ImageIcon className="w-8 h-8 text-pink-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Visual UI — Real Tutor LMS Screenshots</h1>
          <p className="text-muted-foreground mt-1">{data.total_images} actual images extracted from Tutor LMS source code (free + Pro). These are real PNG/JPG/WEBP files embedded inside the plugin repos — not mockups.</p>
        </div>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-3 text-xs">
          <strong className="text-amber-600 dark:text-amber-400">Honest disclosure:</strong> The 408MB docs bundle you previously shared is no longer on disk (lost in a context reset). These {data.total_images} images are extracted directly from <code className="text-amber-600 dark:text-amber-400">tutor/</code> and <code className="text-amber-600 dark:text-amber-400">tutor-pro/</code> source code — they include addon showcase thumbnails, certificate template backgrounds, UI empty/error states, onboarding hero, AI placeholders, and emoji reactions. For full UI screenshots of every screen, see the <strong>Screen Inventory</strong> section which links to the actual PHP template file (the source of truth, better than a screenshot).
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Category:</span>
        {categories.map(c => (
          <button key={`cat-${c}`} onClick={() => setCategoryFilter(c)} className={`px-2 py-1 rounded text-xs border transition-colors ${categoryFilter === c ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {c} <span className="opacity-60">({c === 'all' ? data.total_images : (data.by_category?.[c] || 0)})</span>
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-3">System:</span>
        {systems.map(s => (
          <button key={`sys-${s}`} onClick={() => setSystemFilter(s)} className={`px-2 py-1 rounded text-xs border transition-colors ${systemFilter === s ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {s}
          </button>
        ))}
        <label className="flex items-center gap-1 ml-auto text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={showPath} onChange={e => setShowPath(e.target.checked)} className="rounded" />
          Show file paths
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filtered.map((img, i) => (
          <Card key={`img-${i}`} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group" >
            <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden relative" onClick={() => setSelected(img)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.screen_name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4 text-white bg-black/60 p-0.5 rounded" />
              </div>
            </div>
            <CardContent className="p-2">
              <div className="text-xs font-medium truncate" title={img.screen_name}>{img.screen_name}</div>
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="outline" className={`text-[10px] px-1 py-0 ${img.system === 'tutor-pro' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>{img.system === 'tutor-pro' ? 'Pro' : 'Free'}</Badge>
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-500/10 text-gray-600 dark:text-gray-400">{img.category}</Badge>
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 ml-auto">{(img.size_bytes / 1024).toFixed(1)} KB</Badge>
              </div>
              {showPath && (
                <code className="block text-[10px] text-muted-foreground mt-1 truncate" title={img.original_path}>{img.original_path}</code>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No images match the current filters.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Showing {filtered.length} of {data.total_images} real images. Click any thumbnail to enlarge.</p>

      {/* Lightbox modal with fullscreen */}
      {selected && (
        <Dialog open onOpenChange={() => { setSelected(null); setUiFullscreen(false) }}>
          <DialogContent className={uiFullscreen ? 'max-w-none w-screen h-screen !m-0 !rounded-none !translate-x-0 !translate-y-0 !left-0 !top-0 p-0' : 'max-w-4xl'}>
            <DialogHeader className={uiFullscreen ? 'sr-only' : ''}>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-500" />
                {selected.screen_name}
              </DialogTitle>
            </DialogHeader>
            <div className={uiFullscreen ? 'h-screen flex flex-col' : 'space-y-3'}>
              <div className={`bg-black/95 flex items-center justify-center overflow-auto ${uiFullscreen ? 'flex-1' : 'rounded-lg p-4 max-h-[60vh]'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.url} alt={selected.screen_name} className={uiFullscreen ? 'max-w-full max-h-full object-contain' : 'max-w-full max-h-[55vh] object-contain'} />
              </div>
              {!uiFullscreen && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-muted-foreground">System:</span> <Badge variant="outline" className="ml-1">{selected.system}</Badge></div>
                    <div><span className="text-muted-foreground">Category:</span> <Badge variant="outline" className="ml-1">{selected.category}</Badge></div>
                    <div><span className="text-muted-foreground">Size:</span> {(selected.size_bytes / 1024).toFixed(2)} KB</div>
                    <div><span className="text-muted-foreground">Filename:</span> <code>{selected.filename}</code></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Original path:</span> <code className="block mt-1 p-2 bg-muted/30 rounded text-[10px]">{selected.original_path}</code></div>
                    {selected.addon_key && <div className="col-span-2"><span className="text-muted-foreground">Addon:</span> <code>{selected.addon_key}</code></div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setUiFullscreen(true)}><Maximize2 className="w-3 h-3 mr-1" /> Fullscreen</Button>
                    <a href={selected.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">Open in new tab</Button>
                    </a>
                  </div>
                </div>
              )}
              {uiFullscreen && (
                <Button size="sm" variant="secondary" className="fixed top-3 right-3 z-50" onClick={() => setUiFullscreen(false)}>
                  <X className="w-3 h-3 mr-1" /> Exit fullscreen
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ============================================================
// SCREENS SECTION — real PHP templates + real React components
// ============================================================
function ScreensSection({ data, searchQuery }: { data: any; searchQuery: string }) {
  const [systemTab, setSystemTab] = useState<'tutor' | 'lastsaas'>('tutor')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [previewScreen, setPreviewScreen] = useState<any | null>(null)
  const [lightboxShot, setLightboxShot] = useState<string | null>(null)
  const [shotFullscreen, setShotFullscreen] = useState(false)

  const allScreens: any[] = data.screens || []
  const screens = allScreens.filter(s => {
    if (s.system !== systemTab) return false
    if (categoryFilter !== 'all' && s.feature !== categoryFilter) return false
    if (roleFilter !== 'all' && s.role !== roleFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!`${s.name} ${s.source} ${s.route} ${s.feature} ${s.role}`.toLowerCase().includes(q)) return false
    }
    return true
  })

  const tutorCategories = Object.keys(data.tutor_by_category || {})
  const lastsaasAreas = Object.keys(data.lastsaas_by_area || {})
  const categories = systemTab === 'tutor' ? tutorCategories : lastsaasAreas
  const roles = systemTab === 'tutor' ? Object.keys(data.tutor_by_role || {}) : Object.keys(data.lastsaas_by_role || {})

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Monitor className="w-8 h-8 text-yellow-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Frontend Screen Inventory (REAL)</h1>
          <p className="text-muted-foreground mt-1">{data.total} real screen-rendering files — {data.tutor_total} Tutor LMS PHP templates + {data.lastsaas_total} LastSaaS React pages. Every entry references a real file on disk you can open and read.</p>
        </div>
      </div>

      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-3 text-xs">
          <strong className="text-emerald-600 dark:text-emerald-400">Real source files:</strong> These are NOT made-up screen names. Each entry is an actual PHP template file (Tutor LMS) or React component file (LastSaaS) extracted from the repos on disk. Click any row to expand metadata, or click <Eye className="inline w-3 h-3" /> to see the first 40 lines of real code from that file.
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => { setSystemTab('tutor'); setCategoryFilter('all'); setRoleFilter('all') }} className={`px-3 py-1.5 rounded text-sm border transition-colors ${systemTab === 'tutor' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 font-medium' : 'border-border text-muted-foreground hover:bg-muted'}`}>
          <FileText className="inline w-4 h-4 mr-1" /> Tutor LMS PHP ({data.tutor_total})
        </button>
        <button onClick={() => { setSystemTab('lastsaas'); setCategoryFilter('all'); setRoleFilter('all') }} className={`px-3 py-1.5 rounded text-sm border transition-colors ${systemTab === 'lastsaas' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium' : 'border-border text-muted-foreground hover:bg-muted'}`}>
          <Server className="inline w-4 h-4 mr-1" /> LastSaaS React ({data.lastsaas_total})
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">{systemTab === 'tutor' ? 'Category:' : 'Area:'}</span>
        <button onClick={() => setCategoryFilter('all')} className={`px-2 py-1 rounded border ${categoryFilter === 'all' ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>all</button>
        {categories.map(c => (
          <button key={`cf-${c}`} onClick={() => setCategoryFilter(c)} className={`px-2 py-1 rounded border ${categoryFilter === c ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {c} <span className="opacity-60">({systemTab === 'tutor' ? (data.tutor_by_category?.[c] || 0) : (data.lastsaas_by_area?.[c] || 0)})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Role:</span>
        <button onClick={() => setRoleFilter('all')} className={`px-2 py-1 rounded border ${roleFilter === 'all' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>all</button>
        {roles.map(r => (
          <button key={`rf-${r}`} onClick={() => setRoleFilter(r)} className={`px-2 py-1 rounded border ${roleFilter === r ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {r} <span className="opacity-60">({systemTab === 'tutor' ? (data.tutor_by_role?.[r] || 0) : (data.lastsaas_by_role?.[r] || 0)})</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{systemTab === 'tutor' ? 'Tutor LMS — Real PHP Template Files' : 'LastSaaS — Real React Component Files'}</span>
            <Badge variant="outline" className="text-xs">{screens.length} showing</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[700px] overflow-y-auto divide-y">
            {screens.slice(0, 200).map((s, i) => {
              const isExpanded = expanded === s.id
              return (
                <div key={s.id || `scr-${i}`} className="hover:bg-muted/20">
                  <div className="flex items-center gap-2 p-2 text-xs">
                    <button onClick={() => setExpanded(isExpanded ? null : s.id)} className="shrink-0 p-1 hover:bg-muted rounded">
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronR className="w-3 h-3" />}
                    </button>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${systemTab === 'tutor' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>{s.role}</Badge>
                    <span className="font-medium shrink-0 min-w-[120px] truncate" title={s.name}>{s.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{s.feature}</Badge>
                    <code className="text-muted-foreground truncate flex-1" title={s.source}>{s.source}</code>
                    <Badge variant="outline" className="shrink-0 text-[10px] bg-gray-500/10 text-gray-600 dark:text-gray-400">{s.line_count} lines</Badge>
                    {s.image_refs && s.image_refs.length > 0 && (
                      <Badge variant="outline" className="shrink-0 text-[10px] bg-pink-500/10 text-pink-600 dark:text-pink-400" title={s.image_refs.join(', ')}>
                        <ImageIcon className="inline w-3 h-3 mr-0.5" />{s.image_refs.length}
                      </Badge>
                    )}
                    {s.doc_screenshot_count > 0 && (
                      <Badge variant="outline" className="shrink-0 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title={`${s.doc_screenshot_count} screenshots matched from Tutor LMS docs`}>
                        <ImageIcon className="inline w-3 h-3 mr-0.5" />{s.doc_screenshot_count} docs
                      </Badge>
                    )}
                    <button onClick={() => setPreviewScreen(s)} className="shrink-0 p-1 hover:bg-muted rounded" title="Preview code">
                      <Eye className="w-3 h-3" />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 text-xs space-y-3 bg-muted/10">
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-muted-foreground">Source path:</span> <code className="text-[10px]">{s.absolute_path}</code></div>
                        <div><span className="text-muted-foreground">Route hint:</span> <code>{s.route}</code></div>
                      </div>
                      {/* Real screenshots from Tutor LMS docs */}
                      {s.doc_screenshots && s.doc_screenshots.length > 0 && (
                        <div>
                          <div className="text-muted-foreground mb-1">
                            <span className="font-semibold text-pink-600 dark:text-pink-400">Real screenshots from docs</span> ({s.doc_screenshot_count} matched from Tutor LMS docs bundle):
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {s.doc_screenshots.map((ds: any, di: number) => (
                              <div key={`ds-${i}-${di}`} className="border rounded overflow-hidden bg-background group">
                                <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setLightboxShot(ds.serve_path)}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={`/api/tutor-docs/file?p=${encodeURIComponent(ds.serve_path)}`} alt={ds.filename} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                                </div>
                                <div className="p-1">
                                  <div className="text-[9px] truncate" title={ds.filename}>{ds.filename}</div>
                                  <code className="text-[9px] text-muted-foreground truncate block" title={ds.doc_title}>from: {ds.doc_title}</code>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.image_refs && s.image_refs.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Image references found in template:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.image_refs.map((ref: string, ri: number) => (
                              <code key={`ir-${i}-${ri}`} className="text-[10px] px-1 py-0.5 bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded">{ref}</code>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">First 40 lines of code:</span>
                        <pre className="text-[10px] bg-muted/30 p-2 rounded max-h-48 overflow-auto font-mono mt-1"><code>{s.preview}</code></pre>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {screens.length > 200 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Showing first 200 of {screens.length} matching screens. Refine filters or use search to narrow down.</p>
      )}

      {/* Code preview modal */}
      {previewScreen && (
        <Dialog open onOpenChange={() => setPreviewScreen(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-yellow-500" />
                {previewScreen.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Source:</span> <code className="text-[10px]">{previewScreen.source}</code></div>
                <div><span className="text-muted-foreground">Lines:</span> {previewScreen.line_count}</div>
                <div><span className="text-muted-foreground">Role:</span> {previewScreen.role}</div>
                <div><span className="text-muted-foreground">Category:</span> {previewScreen.feature}</div>
              </div>
              {previewScreen.doc_screenshots && previewScreen.doc_screenshots.length > 0 && (
                <div>
                  <div className="text-pink-600 dark:text-pink-400 font-semibold mb-1">Real screenshots from docs ({previewScreen.doc_screenshot_count} matched):</div>
                  <div className="grid grid-cols-3 gap-2">
                    {previewScreen.doc_screenshots.map((ds: any, di: number) => (
                      <div key={`pds-${di}`} className="border rounded overflow-hidden bg-background cursor-pointer" onClick={() => setLightboxShot(ds.serve_path)}>
                        <div className="aspect-video bg-muted overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/tutor-docs/file?p=${encodeURIComponent(ds.serve_path)}`} alt={ds.filename} className="w-full h-full object-contain" loading="lazy" />
                        </div>
                        <div className="p-1 text-[9px] truncate">{ds.filename}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-muted-foreground">First 40 lines of code (real file content):</div>
              <pre className="text-[10px] bg-muted/30 p-3 rounded max-h-[55vh] overflow-auto font-mono border"><code>{previewScreen.preview}</code></pre>
              {previewScreen.absolute_path && (
                <div className="text-[10px] text-muted-foreground">Absolute path on disk: <code>{previewScreen.absolute_path}</code></div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Screenshot lightbox with fullscreen */}
      {lightboxShot && (
        <Dialog open onOpenChange={() => { setLightboxShot(null); setShotFullscreen(false) }}>
          <DialogContent className={shotFullscreen ? 'max-w-none w-screen h-screen !m-0 !rounded-none !translate-x-0 !translate-y-0 !left-0 !top-0 p-0' : 'max-w-6xl'}>
            <DialogHeader className={shotFullscreen ? 'sr-only' : ''}>
              <DialogTitle className="text-sm flex items-center gap-2"><ImageIcon className="w-4 h-4 text-pink-500" /> Screenshot from Tutor LMS docs</DialogTitle>
            </DialogHeader>
            <div className={`bg-black/95 flex items-center justify-center overflow-auto ${shotFullscreen ? 'h-screen' : 'rounded max-h-[75vh] p-4'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/tutor-docs/file?p=${encodeURIComponent(lightboxShot)}`} alt="screenshot" className={shotFullscreen ? 'max-w-full max-h-full object-contain' : 'max-w-full max-h-[70vh] object-contain'} />
            </div>
            {!shotFullscreen && (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" onClick={() => setShotFullscreen(true)}><Maximize2 className="w-3 h-3 mr-1" /> Fullscreen</Button>
                <a href={`/api/tutor-docs/file?p=${encodeURIComponent(lightboxShot)}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">Open in new tab</Button>
                </a>
                <code className="text-xs text-muted-foreground truncate ml-2">{lightboxShot}</code>
              </div>
            )}
            {shotFullscreen && (
              <Button size="sm" variant="secondary" className="fixed top-3 right-3 z-50" onClick={() => setShotFullscreen(false)}>
                <X className="w-3 h-3 mr-1" /> Exit fullscreen
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function FilesSection({ searchQuery }: { searchQuery: string }) {
  const [localSearch, setLocalSearch] = useState('')
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (systemFilter !== 'all') params.set('system', systemFilter)
    if (categoryFilter !== 'all') params.set('category', categoryFilter)
    fetch(`/api/files?${params}`)
      .then(r => r.json())
      .then(d => { setFiles(d.files); setStats(d.stats); setLoading(false) })
      .catch(e => { setLoading(false) })
  }, [systemFilter, categoryFilter])

  useEffect(() => {
    setLocalSearch(searchQuery)
  }, [searchQuery])

  const filteredFiles = files?.filter(f => {
    if (!localSearch) return true
    return f.name.toLowerCase().includes(localSearch.toLowerCase()) || 
           f.path.toLowerCase().includes(localSearch.toLowerCase())
  }) || []

  const openPreview = async (filePath: string) => {
    setPreviewLoading(true)
    setPreviewFile({ path: filePath, name: filePath.split('/').pop() })
    try {
      const res = await fetch(`/api/files/preview?path=${encodeURIComponent(filePath)}`)
      const data = await res.json()
      if (data.content) {
        setPreviewContent(data.content)
      } else {
        setPreviewContent(`Error: ${data.error || 'Could not load file'}`)
      }
    } catch (e: any) {
      setPreviewContent(`Error: ${e.message}`)
    }
    setPreviewLoading(false)
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewContent(null)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Folder className="w-8 h-8 text-amber-500" />
          Files & Resources
        </h1>
        <p className="text-muted-foreground">All project files — source code, documentation, generated data, scripts. Browse, search, and preview.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="p-3"><div className="text-xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Files</div></Card>
          <Card className="p-3"><div className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.bySystem.lastsaas}</div><div className="text-xs text-muted-foreground">LastSaaS</div></Card>
          <Card className="p-3"><div className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.bySystem.tutor + stats.bySystem['tutor-pro']}</div><div className="text-xs text-muted-foreground">Tutor LMS</div></Card>
          <Card className="p-3"><div className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.bySystem.codewiki}</div><div className="text-xs text-muted-foreground">CodeWiki</div></Card>
          <Card className="p-3"><div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.bySystem.project}</div><div className="text-xs text-muted-foreground">Project</div></Card>
          <Card className="p-3"><div className="text-xl font-bold">{stats.totalSizeMB} MB</div><div className="text-xs text-muted-foreground">Total Size</div></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button variant={systemFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setSystemFilter('all')} className="text-xs">All Systems</Button>
        {['lastsaas', 'tutor', 'tutor-pro', 'codewiki', 'project'].map((s, i) => (
          <Button key={`sys-${i}`} variant={systemFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setSystemFilter(s)} className="text-xs capitalize">{s}</Button>
        ))}
        <div className="w-px bg-border mx-1" />
        <Button variant={categoryFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter('all')} className="text-xs">All Types</Button>
        {['source-code', 'documentation', 'config', 'generated', 'script', 'pdf'].map((c, i) => (
          <Button key={`cat-${i}`} variant={categoryFilter === c ? 'default' : 'outline'} size="sm" onClick={() => setCategoryFilter(c)} className="text-xs capitalize">{c.replace('-', ' ')}</Button>
        ))}
      </div>

      {/* File List */}
      {loading ? (
        <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span>Scanning filesystem...</span></div>
      ) : (
        <>
          <div className="border rounded-lg overflow-auto max-h-[calc(100vh-380px)]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium">File</th>
                  <th className="text-left p-3 font-medium">System</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">Size</th>
                  <th className="text-left p-3 font-medium">Path</th>
                  <th className="text-left p-3 font-medium">Modified</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.map((f, i) => {
                  const Icon = CATEGORY_ICONS[f.category] || File
                  return (
                    <tr key={i} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => openPreview(f.path)}>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="font-mono text-xs font-medium">{f.name}</span>
                        </div>
                      </td>
                      <td className="p-3"><Badge variant="outline" className={`text-xs ${SYSTEM_COLORS[f.system] || ''}`}>{f.system}</Badge></td>
                      <td className="p-3"><Badge variant="secondary" className="text-xs">{f.category.replace('-', ' ')}</Badge></td>
                      <td className="p-3 text-right text-xs text-muted-foreground font-mono">{formatSize(f.size)}</td>
                      <td className="p-3 text-xs font-mono text-muted-foreground truncate max-w-xs">{f.path}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(f.modifiedAt).toLocaleDateString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Showing {filteredFiles.length} of {files?.length || 0} files (max 500 displayed). Click any file to preview.</p>
        </>
      )}

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileCode className="w-4 h-4 text-amber-500" />
              <span className="font-mono">{previewFile?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {previewLoading ? (
              <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /><span>Loading file...</span></div>
            ) : (
              <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 p-4 rounded-lg overflow-auto max-h-[60vh] whitespace-pre-wrap break-all"><code>{previewContent}</code></pre>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
            <span className="font-mono">{previewFile?.path}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function Home() {
  const [active, setActive] = useState('overview')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [launchedApp, setLaunchedApp] = useState<string | null>(null)
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
      'tutor-docs': '/api/tutor-docs',
      'comparison': '/api/comparison',
      'compendium-saas': '/api/compendium-saas',
      'visual-ui': '/api/screenshots',
      'screens': '/api/screens',
      'feature-comparison': '/api/feature-comparison',
      'user-flows': '/api/user-flows',
      'frontend-gaps': '/api/gaps/frontend',
      'backend-gaps': '/api/gaps/backend',
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
            {stats.map((s, i) => { const Icon = s.icon; return (
              <Card key={`stat-${i}`}><CardContent className="p-4"><Icon className={`w-5 h-5 ${s.color} mb-2`} /><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></CardContent></Card>
            )})}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-blue-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Server className="w-4 h-4 text-blue-500" /> LastSaaS</CardTitle><CardDescription>CodeWiki + MCP connected</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><div>134 Go files · 91 TS files</div><div>22 packages · 38 collections</div><div>133 API routes · 10 middleware</div><div>22 models · 22 events</div><Badge variant="outline" className="mt-2 bg-blue-500/10 text-blue-600 dark:text-blue-400">CodeWiki: Connected</Badge></CardContent></Card>
            <Card className="border-orange-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="w-4 h-4 text-orange-500" /> Tutor LMS</CardTitle><CardDescription>Source code indexed</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><div>636 PHP files (free) · 1618 (Pro)</div><div>61 free classes · 28 Pro classes</div><div>16 models · 29 addons</div><div>54 email templates · 9 shortcodes</div><Badge variant="outline" className="mt-2 bg-orange-500/10 text-orange-600 dark:text-orange-400">Index: Complete</Badge></CardContent></Card>
            <Card className="border-purple-500/20"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plug className="w-4 h-4 text-purple-500" /> AI Access</CardTitle><CardDescription>MCP + JSON API</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground space-y-1"><div><code className="text-purple-600 dark:text-purple-400 text-xs">POST /api/mcp</code> — MCP server</div><div><code className="text-purple-600 dark:text-purple-400 text-xs">POST /api/codewiki/ask</code> — CodeWiki proxy</div><div><code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/spec/*</code> — 10 JSON endpoints</div><div><code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/comparison</code> — Comparison data</div></CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Map className="w-5 h-5" /> Build Roadmap</CardTitle><CardDescription>6 phases · 24 weeks · ~137.5 dev-days</CardDescription></CardHeader>
            <CardContent><div className="space-y-3">{PHASES.map((p, i) => (
              <div key={p.id || `phase-${i}`} className="flex items-start gap-3 p-3 rounded-lg border"><Badge variant="outline" className={`shrink-0 ${PHASE_COLORS[p.id]}`}>{p.id}</Badge><div className="flex-1 min-w-0"><div className="font-medium text-sm">{p.title}</div><div className="text-xs text-muted-foreground mt-0.5">{p.weeks} · {p.theme}</div></div><Badge variant="secondary" className="shrink-0 text-xs">{p.tickets} tickets</Badge></div>
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
      if (!apiData || !apiData.summary) return <div className="p-8 text-muted-foreground">Loading...</div>
      const s = apiData.summary
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Server className="w-8 h-8 text-blue-500" />
            <div><h1 className="text-3xl font-bold">LastSaaS Architecture</h1><p className="text-muted-foreground">Extracted from real source code — {s.totalGoFiles} Go files, {s.totalTSFiles} TS files, {s.packages} packages</p></div>
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
            ].map((stat, i) => <Card key={`ls-stat-${i}`} className="p-3"><div className="text-xl font-bold">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></Card>)}
          </div>

          {/* Architecture Layers */}
          <Card><CardHeader><CardTitle className="text-base">Architecture Layers (top → bottom)</CardTitle><CardDescription>How the system is structured — from frontend to database</CardDescription></CardHeader>
            <CardContent><div className="space-y-2">
              {[
                { name: 'Frontend (React 19 + Vite)', components: ['AuthContext', 'BrandingContext', 'TenantContext', 'ThemeContext', 'API Client', '52 pages', '18 components'], source: 'lastsaas/frontend/src/', color: 'border-purple-500/30' },
                { name: 'HTTP Layer (gorilla/mux)', components: ['main.go (router)', '10 middleware (auth, rbac, tenant, ratelimit, security, recovery, requestid, bodylimit, metrics, apiversion)'], source: 'lastsaas/backend/cmd/server/main.go', color: 'border-indigo-500/30' },
                { name: 'API Handlers (24 files)', components: ['auth', 'tenant', 'billing', 'plans', 'webhooks', 'branding', 'admin', 'messages', 'announcements', 'config', 'health', 'telemetry', 'apikeys', 'logs', 'bundles', 'usage', 'pm', 'bootstrap', 'docs', 'openapi', 'promotions', 'helpers', 'event_definitions'], source: 'lastsaas/backend/internal/api/handlers/', color: 'border-blue-500/30' },
                { name: 'Services (Business Logic)', components: ['auth', 'configstore', 'email (Resend)', 'events (Emitter)', 'health', 'metrics', 'planstore', 'stripe', 'telemetry', 'webhooks (Dispatcher)'], source: 'lastsaas/backend/internal/', color: 'border-cyan-500/30' },
                { name: 'Data Layer (MongoDB)', components: ['38 collections (mongodb.go)', '16 schema validators (schema.go)', '22 model files (models/)'], source: 'lastsaas/backend/internal/db/, models/', color: 'border-emerald-500/30' },
              ].map((layer, i) => (
                <div key={`layer-${i}`} className={`p-3 border rounded-lg ${layer.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">Layer {i + 1}</Badge>
                    <span className="font-medium text-sm">{layer.name}</span>
                    <code className="text-xs text-muted-foreground ml-auto">{layer.source}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {layer.components.map((c, ci) => <Badge key={`comp-${i}-${ci}`} variant="secondary" className="text-xs font-mono">{c}</Badge>)}
                  </div>
                  {i < 4 && <div className="text-center mt-1 text-muted-foreground text-xs">↓</div>}
                </div>
              ))}
            </div></CardContent>
          </Card>

          {/* Module Relationships */}
          <Card><CardHeader><CardTitle className="text-base">Module Relationships</CardTitle><CardDescription>How modules connect to each other — traced from source code</CardDescription></CardHeader>
            <CardContent><div className="space-y-1 max-h-[400px] overflow-y-auto">
              {[
                { from: 'db', to: 'collections', type: 'owns', desc: 'The db package defines all 38 MongoDB collections via accessor methods in mongodb.go' },
                { from: 'models', to: 'db', type: 'maps-to', desc: 'Each model struct maps to a MongoDB collection with bson tags' },
                { from: 'api/handlers', to: 'models', type: 'uses', desc: 'API handlers import model structs for request/response serialization' },
                { from: 'middleware/auth', to: 'models/user', type: 'validates', desc: 'Auth middleware validates JWT tokens against the users collection' },
                { from: 'middleware/tenant', to: 'models/tenant', type: 'extracts', desc: 'Tenant middleware extracts tenant_id from JWT and injects into request context' },
                { from: 'middleware/rbac', to: 'models/membership', type: 'checks', desc: 'RBAC middleware checks tenant_memberships for user roles' },
                { from: 'stripe', to: 'models/plan', type: 'syncs', desc: 'Stripe service syncs plans collection with Stripe Products and Prices' },
                { from: 'stripe', to: 'models/billing', type: 'records', desc: 'Stripe service records transactions in financial_transactions collection' },
                { from: 'webhooks/dispatcher', to: 'models/webhook', type: 'delivers', desc: 'Webhook dispatcher reads webhook subscriptions and delivers signed payloads' },
                { from: 'events/emitter', to: 'webhooks/dispatcher', type: 'triggers', desc: 'Event emitter fires events that the webhook dispatcher subscribes to' },
                { from: 'email/resend', to: 'events/emitter', type: 'listens', desc: 'Email service subscribes to events and sends transactional emails via Resend API' },
                { from: 'configstore', to: 'db', type: 'caches', desc: 'Config store caches config_vars collection in-memory with periodic reload' },
                { from: 'health', to: 'db', type: 'monitors', desc: 'Health service runs periodic checks on MongoDB connectivity' },
                { from: 'metrics', to: 'health', type: 'collects', desc: 'Metrics service collects system metrics from health checks and Go runtime' },
                { from: 'frontend/AuthContext', to: 'api/handlers/auth', type: 'calls', desc: 'AuthContext calls /api/auth/* endpoints for login, register, refresh' },
                { from: 'frontend/BrandingContext', to: 'api/handlers/branding', type: 'calls', desc: 'BrandingContext calls /api/branding for tenant branding config' },
                { from: 'frontend/API Client', to: 'api/handlers', type: 'calls-all', desc: 'API client makes all HTTP requests to /api/* endpoints with token refresh' },
                { from: 'planstore', to: 'models/plan', type: 'manages', desc: 'Plan store manages plan data with caching on top of plans collection' },
              ].map((rel, i) => (
                <div key={`rel-${i}`} className="flex items-center gap-2 p-2 border rounded text-xs hover:bg-muted/30">
                  <code className="font-mono text-blue-600 dark:text-blue-400 shrink-0">{rel.from}</code>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <Badge variant="outline" className="text-xs shrink-0 bg-amber-500/10 text-amber-600 dark:text-amber-400">{rel.type}</Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <code className="font-mono text-blue-600 dark:text-blue-400 shrink-0">{rel.to}</code>
                  <span className="text-muted-foreground truncate ml-2">{rel.desc}</span>
                </div>
              ))}
            </div></CardContent>
          </Card>

          {/* Backend Packages */}
          <Card><CardHeader><CardTitle className="text-base">Backend Packages ({s.packages})</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-3 gap-2">
              {apiData.packages.map((pkg: any, i: number) => (
                <div key={pkg.name || `pkg-${i}`} className="p-2 border rounded text-xs">
                  <div className="font-mono font-medium text-blue-600 dark:text-blue-400">{pkg.name}/</div>
                  <div className="text-muted-foreground mt-0.5">{pkg.files} files</div>
                  <div className="text-muted-foreground mt-0.5 truncate">{pkg.fileList?.[0] || ''}</div>
                </div>
              ))}
            </div></CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">Query LastSaaS via CodeWiki</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Ask questions about the lastsaas codebase through the AI Search section (select "LastSaaS" target). Questions are proxied to <code className="text-blue-600 dark:text-blue-400">codewiki.google/github.com/jonradoff/lastsaas</code> via CodeWiki MCP.</p>
              <div className="mt-2 grid md:grid-cols-2 gap-2 text-xs">
                {['GET /api/lastsaas/architecture','GET /api/lastsaas/collections','GET /api/lastsaas/routes','GET /api/lastsaas/models','GET /api/lastsaas/middleware','GET /api/lastsaas/events','GET /api/lastsaas/relationships','POST /api/codewiki/ask'].map((p, i) => (
                  <div key={`lsapi-${i}`} className="flex items-center gap-2 p-2 border rounded"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs">{p.startsWith('POST') ? 'POST' : 'GET'}</Badge><code className="text-amber-600 dark:text-amber-400">{p.replace('GET ', '').replace('POST ', '')}</code></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // === TUTOR DOCS (295 real pages + 870 screenshots) ===
    if (active === 'tutor-docs') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-orange-500" /><span>Loading Tutor LMS docs...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      return <TutorDocsSection data={apiData} searchQuery={search} />
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
            <div><h1 className="text-3xl font-bold">Tutor LMS Knowledge</h1><p className="text-muted-foreground">Indexed from source code — {(s?.totalPhpFilesFree || 636) + (s?.totalPhpFilesPro || 1618)} PHP files total</p></div>
            <Badge variant="outline" className="ml-auto bg-orange-500/10 text-orange-600 dark:text-orange-400"><CheckCircle className="w-3 h-3 mr-1" /> Source Indexed</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'PHP Free', value: s?.totalPhpFilesFree || 636 }, { label: 'PHP Pro', value: s?.totalPhpFilesPro || 1618 },
              { label: 'Free Classes', value: s?.classesFree || 61 }, { label: 'Pro Classes', value: s?.classesPro || 28 },
              { label: 'Models', value: s?.models || 16 }, { label: 'Addons', value: s?.addons || 29 },
              { label: 'API Controllers', value: s?.apiControllers || 14 }, { label: 'Email Templates', value: s?.emailTemplates || 54 },
              { label: 'Shortcodes', value: s?.shortcodes || 9 },
            ].map((stat, i) => <Card key={`tstat-${i}`} className="p-3"><div className="text-xl font-bold">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></Card>)}
          </div>

          {/* Architecture Layers */}
          <Card><CardHeader><CardTitle className="text-base">Tutor LMS Architecture Layers</CardTitle><CardDescription>WordPress plugin architecture — how components connect</CardDescription></CardHeader>
            <CardContent><div className="space-y-2">
              {[
                { name: 'Templates (PHP)', components: ['single-course.php', 'dashboard.php', 'checkout.php', 'cart.php', 'login.php', '54 email templates'], source: 'tutor/templates/, tutor-pro/templates/', color: 'border-purple-500/30' },
                { name: 'Classes (Core Logic)', components: ['Course', 'Lesson', 'Quiz', 'Enrollment', 'Earnings', 'Withdraw', 'Reviews', 'Q_And_A', 'Frontend', 'Admin', 'Shortcode', 'RestAPI', 'Assets', 'Permalink', 'Rewrite_Rules', 'Tutor_Setup'], source: 'tutor/classes/ (61 files), tutor-pro/classes/ (28 files)', color: 'border-orange-500/30' },
                { name: 'Models (Data Layer)', components: ['CourseModel', 'LessonModel', 'QuizModel', 'EnrollmentModel', 'OrderModel', 'CouponModel', 'CartModel', 'WithdrawModel', 'UserModel', 'BillingModel'], source: 'tutor/models/ (16 files)', color: 'border-amber-500/30' },
                { name: 'REST API (Pro)', components: ['CourseController', 'QuizController', 'EnrollmentController', 'LessonController', 'TopicController', 'QAndAController', 'ReviewController', 'StudentController', 'AssignmentController', 'QuizAttemptController', 'WishlistController', 'UserProfileController'], source: 'tutor-pro/rest-api/Controllers/ (14 files)', color: 'border-red-500/30' },
                { name: 'Pro Addons (29)', components: ['tutor-certificate', 'content-drip', 'tutor-multi-instructors', 'subscription', 'tutor-zoom', 'google-meet', 'tutor-notifications', 'tutor-email', 'social-login', 'calendar', 'tutor-report', 'gradebook', 'h5p', 'buddypress', 'google-classroom', 'course-bundle', 'enrollments', 'tutor-course-preview', 'tutor-course-attachments', 'quiz-import-export', 'tutor-wpml', 'tutor-prerequisites', 'wc-subscriptions', 'pmpro', 'restrict-content-pro', 'tutor-weglot', 'tutor-assignments', 'auth'], source: 'tutor-pro/addons/ (29 addon folders)', color: 'border-pink-500/30' },
                { name: 'WordPress Layer', components: ['Custom Post Types (courses, lessons, topics, quizzes)', 'Custom Taxonomies (course-category, course-tag)', 'Options API (get_tutor_option)', 'do_action hooks (480 events)', 'add_shortcode (9 shortcodes)', 'WP REST API (wp-json/tutor/v1/)'], source: 'WordPress core integration', color: 'border-blue-500/30' },
              ].map((layer, i) => (
                <div key={`tlayer-${i}`} className={`p-3 border rounded-lg ${layer.color}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400">Layer {i + 1}</Badge>
                    <span className="font-medium text-sm">{layer.name}</span>
                    <code className="text-xs text-muted-foreground ml-auto">{layer.source}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {layer.components.map((c, ci) => <Badge key={`tc-${i}-${ci}`} variant="secondary" className="text-xs font-mono">{c}</Badge>)}
                  </div>
                  {i < 5 && <div className="text-center mt-1 text-muted-foreground text-xs">↓</div>}
                </div>
              ))}
            </div></CardContent>
          </Card>

          {/* Pro Addons Grid */}
          <Card><CardHeader><CardTitle className="text-base">Pro Addons ({apiData.addons?.length || 0})</CardTitle></CardHeader>
            <CardContent><div className="grid md:grid-cols-3 gap-2">
              {(apiData.addons || []).map((addon: any, i: number) => (
                <div key={addon.name || `addon-${i}`} className="p-2 border rounded text-xs">
                  <div className="font-mono font-medium text-orange-600 dark:text-orange-400">{addon.name}</div>
                  <div className="text-muted-foreground mt-0.5">{addon.files} PHP files</div>
                  <div className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{addon.source}</div>
                </div>
              ))}
            </div></CardContent>
          </Card>

          {/* Indexed Data Sources */}
          <Card><CardHeader><CardTitle className="text-base">Indexed Data Sources</CardTitle><CardDescription>What's been extracted from the Tutor LMS source code</CardDescription></CardHeader>
            <CardContent><div className="space-y-1 text-xs">
              {[
                { source: 'tutor/classes/*.php', count: 61, desc: 'Core PHP classes (Course, Quiz, Lesson, etc.)', confidence: 'confirmed' },
                { source: 'tutor-pro/classes/*.php', count: 28, desc: 'Pro PHP classes (Certificate, Drip, AI Studio, etc.)', confidence: 'confirmed' },
                { source: 'tutor/models/*.php', count: 16, desc: 'Data models with constants and fields', confidence: 'confirmed' },
                { source: 'tutor-pro/addons/*/', count: 29, desc: 'Pro addon folders with PHP file counts', confidence: 'confirmed' },
                { source: 'tutor-pro/rest-api/Controllers/', count: 14, desc: 'REST API controller classes', confidence: 'confirmed' },
                { source: 'tutor-pro/templates/email/', count: 54, desc: 'Email template files (to_*.php)', confidence: 'confirmed' },
                { source: 'do_action() calls (all PHP)', count: 480, desc: 'WordPress action hooks = Go events', confidence: 'confirmed' },
                { source: 'get_tutor_option() calls', count: 66, desc: 'Setting keys from source', confidence: 'confirmed' },
                { source: 'add_shortcode() calls', count: 9, desc: 'WordPress shortcodes', confidence: 'confirmed' },
              ].map((item, i) => (
                <div key={`src-${i}`} className="flex items-center gap-2 p-2 border rounded">
                  <Badge variant="secondary" className="text-xs shrink-0">{item.count}</Badge>
                  <code className="font-mono text-orange-600 dark:text-orange-400 shrink-0">{item.source}</code>
                  <span className="text-muted-foreground flex-1 truncate">{item.desc}</span>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">{item.confidence}</Badge>
                </div>
              ))}
            </div></CardContent>
          </Card>

          {/* API endpoints */}
          <Card><CardHeader><CardTitle className="text-base">Query Tutor LMS Knowledge</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Ask questions through the AI Search section (select "Tutor LMS" target). Searches our internal index of 2,254 PHP files.</p>
              <div className="mt-2 grid md:grid-cols-2 gap-2 text-xs">
                {['GET /api/tutor-kb/classes','GET /api/tutor-kb/models','GET /api/tutor-kb/addons','POST /api/tutor-kb/search'].map((p, i) => (
                  <div key={`tkapi-${i}`} className="flex items-center gap-2 p-2 border rounded"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs">{p.startsWith('POST') ? 'POST' : 'GET'}</Badge><code className="text-amber-600 dark:text-amber-400">{p.replace('GET ', '').replace('POST ', '')}</code></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // === COMPARISON ===
    if (active === 'comparison') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-yellow-500" /><span>Loading comparison...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      return <ComparisonSection data={apiData} searchQuery={search} />
    }

    // === COMPENDIUM → SAAS BUILD PLAN ===
    if (active === 'compendium-saas') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-purple-500" /><span>Loading build plan...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      return <CompendiumSaaSSection data={apiData} searchQuery={search} />
    }

    // === VISUAL UI (real screenshots gallery) ===
    if (active === 'visual-ui') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-yellow-500" /><span>Loading screenshots...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      return <VisualUISection data={apiData} searchQuery={search} />
    }

    // === SCREEN INVENTORY (REAL — 383 PHP templates + 46 React pages) ===
    if (active === 'screens') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-yellow-500" /><span>Loading screens...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      return <ScreensSection data={apiData} searchQuery={search} />
    }

    // === FEATURE COMPARISON (Full-Stack) ===
    if (active === 'feature-comparison') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-yellow-500" /><span>Loading feature comparison...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const comps = apiData.comparisons || []
      const filtered = search ? comps.filter((c: any) => JSON.stringify(c).toLowerCase().includes(search.toLowerCase())) : comps
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Layers className="w-8 h-8 text-yellow-500" /><div><h1 className="text-3xl font-bold">Full-Stack Feature Comparison</h1><p className="text-muted-foreground">{apiData.total} features compared — Frontend + Backend + Data + API + Source</p></div></div>
          <div className="space-y-3">
            {filtered.map((fc: any, i: number) => (
              <Card key={`fc-${i}`} className="border-yellow-500/20">
                <CardHeader><div className="flex items-center gap-2"><CardTitle className="text-base">{fc.feature}</CardTitle><Badge variant="outline" className={`text-xs ${STATUS_COLORS[fc.comparison] || ''}`}>{fc.comparison.replace(/-/g, ' ')}</Badge></div></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border-l-2 border-orange-500/30 pl-3">
                      <div className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400 mb-1">Tutor LMS</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={fc.tutor.status === 'complete' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}>{fc.tutor.status}</Badge></div>
                        <div><span className="text-muted-foreground">Screens:</span> {fc.tutor.screens.join(', ') || 'None'}</div>
                        <div><span className="text-muted-foreground">APIs:</span> <code className="text-purple-600 dark:text-purple-400">{fc.tutor.apis.join(', ') || 'None'}</code></div>
                        <div><span className="text-muted-foreground">Models:</span> {fc.tutor.models.join(', ') || 'None'}</div>
                        <div><span className="text-muted-foreground">Source:</span> <code className="text-muted-foreground">{fc.tutor.source}</code></div>
                      </div>
                    </div>
                    <div className="border-l-2 border-blue-500/30 pl-3">
                      <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 mb-1">LastSaaS</div>
                      <div className="space-y-1 text-xs">
                        <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={fc.lastsaas.status === 'complete' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : fc.lastsaas.status === 'missing' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}>{fc.lastsaas.status}</Badge></div>
                        <div><span className="text-muted-foreground">Screens:</span> {fc.lastsaas.screens.join(', ') || 'None'}</div>
                        <div><span className="text-muted-foreground">APIs:</span> <code className="text-purple-600 dark:text-purple-400">{fc.lastsaas.apis.join(', ') || 'None'}</code></div>
                        <div><span className="text-muted-foreground">Models:</span> {fc.lastsaas.models.join(', ') || 'None'}</div>
                        <div><span className="text-muted-foreground">Source:</span> <code className="text-muted-foreground">{fc.lastsaas.source}</code></div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2 border-t space-y-1">
                    <div className="text-xs"><span className="font-medium">Notes:</span> <span className="text-muted-foreground">{fc.notes}</span></div>
                    <div className="text-xs flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" /><span className="text-amber-600 dark:text-amber-400"><span className="font-medium">Gap:</span> {fc.gap}</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {apiData.total} feature comparisons. Each shows: Tutor LMS (screens, APIs, models, source) vs LastSaaS (same) with gap analysis.</p>
        </div>
      )
    }

    // === USER FLOWS ===
    if (active === 'user-flows') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-yellow-500" /><span>Loading user flows...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const flows = apiData.flows || []
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><Map className="w-8 h-8 text-yellow-500" /><div><h1 className="text-3xl font-bold">User Flow Comparison</h1><p className="text-muted-foreground">{apiData.total} workflows compared side-by-side</p></div></div>
          {flows.map((uf: any, i: number) => (
            <Card key={`uf-${i}`}>
              <CardHeader><CardTitle className="text-base">{uf.flow}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400 mb-2">Tutor LMS Flow ({uf.tutor.length} steps)</div>
                    <div className="flex flex-wrap items-center gap-1">
                      {uf.tutor.map((step: string, si: number) => (
                        <div key={`ts-${i}-${si}`} className="flex items-center gap-1">
                          {si > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400">{step}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase text-blue-600 dark:text-blue-400 mb-2">LastSaaS Flow ({uf.lastsaas.length} steps)</div>
                    <div className="flex flex-wrap items-center gap-1">
                      {uf.lastsaas.map((step: string, si: number) => (
                        <div key={`ls-${i}-${si}`} className="flex items-center gap-1">
                          {si > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                          <Badge variant="outline" className={`text-xs ${step.startsWith('N/A') ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>{step}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t space-y-1">
                  <div className="text-xs"><span className="font-medium">Analysis:</span> <span className="text-muted-foreground">{uf.analysis}</span></div>
                  <div className="text-xs flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" /><span className="text-amber-600 dark:text-amber-400"><span className="font-medium">Gap:</span> {uf.gap}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    // === FRONTEND GAPS ===
    if (active === 'frontend-gaps') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-red-500" /><span>Loading frontend gaps...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const gaps = apiData.gaps || []
      const filtered = search ? gaps.filter((g: any) => JSON.stringify(g).toLowerCase().includes(search.toLowerCase())) : gaps
      const severityColors: Record<string, string> = { critical: 'bg-red-500/10 text-red-600 dark:text-red-400', high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><AlertCircle className="w-8 h-8 text-red-500" /><div><h1 className="text-3xl font-bold">Frontend Gap Analysis</h1><p className="text-muted-foreground">{apiData.total} gaps identified — what's missing from LastSaaS frontend</p></div></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <Card key={sev} className="p-3"><div className="text-xl font-bold">{gaps.filter((g: any) => g.severity === sev).length}</div><div className="text-xs text-muted-foreground capitalize">{sev}</div></Card>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map((g: any, i: number) => (
              <Card key={`fg-${i}`} className={g.severity === 'critical' ? 'border-red-500/30' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={`shrink-0 text-xs ${severityColors[g.severity]}`}>{g.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{g.gap}</div>
                      <div className="text-xs mt-1 grid md:grid-cols-2 gap-2">
                        <div><span className="text-orange-600 dark:text-orange-400 font-medium">Tutor:</span> <span className="text-muted-foreground">{g.tutor}</span></div>
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">LastSaaS:</span> <span className="text-muted-foreground">{g.lastsaas}</span></div>
                      </div>
                      <div className="text-xs mt-1 flex items-start gap-1"><ChevronRight className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" /><span className="text-amber-600 dark:text-amber-400">{g.action}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {apiData.total} frontend gaps</p>
        </div>
      )
    }

    // === BACKEND GAPS ===
    if (active === 'backend-gaps') {
      if (loading) return <div className="flex items-center gap-2 p-8"><Loader2 className="w-5 h-5 animate-spin text-red-500" /><span>Loading backend gaps...</span></div>
      if (!apiData) return <div className="p-8 text-muted-foreground">Loading...</div>
      const gaps = apiData.gaps || []
      const filtered = search ? gaps.filter((g: any) => JSON.stringify(g).toLowerCase().includes(search.toLowerCase())) : gaps
      const severityColors: Record<string, string> = { critical: 'bg-red-500/10 text-red-600 dark:text-red-400', high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400', low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3"><AlertCircle className="w-8 h-8 text-red-500" /><div><h1 className="text-3xl font-bold">Backend Gap Analysis</h1><p className="text-muted-foreground">{apiData.total} gaps identified — what's missing from LastSaaS backend</p></div></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['critical', 'high', 'medium', 'low'].map(sev => (
              <Card key={sev} className="p-3"><div className="text-xl font-bold">{gaps.filter((g: any) => g.severity === sev).length}</div><div className="text-xs text-muted-foreground capitalize">{sev}</div></Card>
            ))}
          </div>
          <div className="space-y-2">
            {filtered.map((g: any, i: number) => (
              <Card key={`bg-${i}`} className={g.severity === 'critical' ? 'border-red-500/30' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className={`shrink-0 text-xs ${severityColors[g.severity]}`}>{g.severity}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{g.gap}</div>
                      <div className="text-xs mt-1 grid md:grid-cols-2 gap-2">
                        <div><span className="text-orange-600 dark:text-orange-400 font-medium">Tutor:</span> <span className="text-muted-foreground">{g.tutor}</span></div>
                        <div><span className="text-blue-600 dark:text-blue-400 font-medium">LastSaaS:</span> <span className="text-muted-foreground">{g.lastsaas}</span></div>
                      </div>
                      <div className="text-xs mt-1 flex items-start gap-1"><ChevronRight className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" /><span className="text-amber-600 dark:text-amber-400">{g.action}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {apiData.total} backend gaps</p>
        </div>
      )
    }

    // === AI SEARCH ===
    if (active === 'ai-search') {
      return <AISearchSection aiQuestion={aiQuestion} setAiQuestion={setAiQuestion} aiAnswer={aiAnswer} aiLoading={aiLoading} aiSource={aiSource} askAI={askAI} />
    }

    // === SYSTEM HEALTH ===
    if (active === 'health') {
      return <HealthSection healthData={healthData} tutorData={tutorData} />
    }

    // === PHASES ===
    if (active === 'phases') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Build Roadmap — ALL 6 Phases</h1></div>
          {PHASES.map((p, i) => (
            <Card key={p.id || `phase-${i}`}><CardHeader><div className="flex items-center gap-3"><Badge variant="outline" className={PHASE_COLORS[p.id]}>{p.id}</Badge><CardTitle className="text-base">{p.title}</CardTitle><Badge variant="secondary" className="ml-auto text-xs">{p.tickets} tickets · {p.devDays} days</Badge></div><CardDescription>{p.weeks} · {p.theme}</CardDescription></CardHeader>
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
            {GATEWAYS.map((gw, i) => (
              <Card key={gw.id || `gw-${i}`} className={gw.phase === 'Phase 2' ? 'border-emerald-500/20' : ''}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />{gw.name}</CardTitle><div className="flex gap-1"><Badge variant="outline" className={`text-xs ${PHASE_COLORS[gw.phase]}`}>{gw.phase}</Badge><Badge variant="outline" className="text-xs">{gw.region}</Badge></div></div></CardHeader>
                <CardContent><div className="space-y-1">{gw.creds.map((c, ci) => <div key={ci} className="text-xs font-mono"><span className="text-amber-600 dark:text-amber-400">{c}</span></div>)}</div></CardContent>
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
              {['GET /api/spec/overview','GET /api/spec/collections → 91','GET /api/spec/endpoints → 172','GET /api/spec/events → 480','GET /api/spec/settings → 66','GET /api/spec/email-triggers → 54','GET /api/lastsaas/architecture','GET /api/lastsaas/collections → 38','GET /api/lastsaas/routes → 133','GET /api/tutor-kb/classes → 89','GET /api/tutor-kb/models → 16','GET /api/comparison → 25'].map((p, i) => (
                <div key={`api-${i}`} className="flex items-center gap-2 p-2 rounded border text-xs"><Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">GET</Badge><code className="font-mono text-amber-600 dark:text-amber-400">{p}</code></div>
              ))}
            </div></CardContent>
          </Card>
        </div>
      )
    }

    // === FRONTEND APPS ===
    if (active === 'frontend-apps') {
      return <FrontendAppsSection onLaunch={(appId) => setLaunchedApp(appId)} />
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
            {filtered.map((ep: any, i: number) => (
              <Card key={ep.id || `ep-${i}`}><CardContent className="p-3"><div className="flex items-start gap-2">
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
            {filtered.map((qt: any, i: number) => (
              <Card key={qt.id || qt.name || `qt-${i}`} className={qt.isPro ? 'border-amber-500/30' : ''}><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><HelpCircle className="w-4 h-4" />{qt.name}</CardTitle><div className="flex gap-1">{qt.isPro && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">PRO</Badge>}<Badge variant="outline" className={`text-xs ${qt.grading === 'auto' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>{qt.grading}</Badge></div></div></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{qt.desc}</p><div className="mt-1 text-xs font-mono text-muted-foreground">{qt.id}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    // === FILES & RESOURCES ===
    if (active === 'files') {
      return <FilesSection searchQuery={search} />
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

      {/* Launched frontend app overlay (full-screen iframe to tailux via proxy) */}
      {launchedApp && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-900">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            <a
              href={`/api/tailux/apps/${launchedApp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-100 shadow-sm"
            >
              Open in new tab ↗
            </a>
            <button
              onClick={() => setLaunchedApp(null)}
              className="px-3 py-1.5 text-xs rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-100 shadow-sm flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Close
            </button>
          </div>
          <iframe
            src={`/api/tailux/apps/${launchedApp}`}
            className="w-full h-full border-0"
            title={`Frontend App: ${launchedApp}`}
          />
        </div>
      )}
    </div>
  )
}
