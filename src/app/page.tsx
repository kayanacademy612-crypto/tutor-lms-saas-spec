'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen, Database, Code2, Zap, Map, Ticket, HelpCircle, CreditCard,
  Mail, Plug, Search, Sun, Moon, ChevronRight, Check, Menu, Clock, Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useTheme } from 'next-themes'
import {
  specStats, navSections, collectionSummaries, endpointSamples, eventSamples,
  phases, quizTypes, gateways, settingsData, emailTriggers
} from '@/data/spec'

const iconMap: Record<string, any> = { BookOpen, Database, Code2, Zap, Map, Ticket, HelpCircle, CreditCard, Mail, Plug }

const phaseColors: Record<string, string> = {
  'Phase 0': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  'Phase 1': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Phase 2': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  'Phase 3': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'Phase 4': 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  'Phase 5': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  POST: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

function Sidebar({ active, onSelect, onClose }: { active: string; onSelect: (id: string) => void; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm">LMS SaaS Spec</div>
            <div className="text-xs text-muted-foreground">Interactive · AI-Accessible</div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-0.5 py-2">
          {navSections.map(s => {
            const Icon = iconMap[s.icon] || BookOpen
            return (
              <button key={s.id} onClick={() => { onSelect(s.id); onClose() }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${active === s.id ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
      <div className="p-3 border-t text-xs text-muted-foreground">
        <div>{specStats.collections} collections · {specStats.endpoints} endpoints</div>
        <div className="mt-0.5">v1.0 · July 2026</div>
      </div>
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

  const stats = [
    { label: 'Collections', value: specStats.collections, icon: Database, color: 'text-amber-500' },
    { label: 'Endpoints', value: specStats.endpoints, icon: Code2, color: 'text-emerald-500' },
    { label: 'Events', value: specStats.events, icon: Zap, color: 'text-pink-500' },
    { label: 'Tickets', value: specStats.tickets, icon: Ticket, color: 'text-cyan-500' },
    { label: 'Settings', value: specStats.settings, icon: Map, color: 'text-purple-500' },
    { label: 'Email Triggers', value: specStats.emailTriggers, icon: Mail, color: 'text-orange-500' },
    { label: 'Quiz Types', value: specStats.quizTypes, icon: HelpCircle, color: 'text-red-500' },
    { label: 'Gateways', value: specStats.gateways, icon: CreditCard, color: 'text-yellow-500' },
    { label: 'Phases', value: specStats.phases, icon: Map, color: 'text-blue-500' },
    { label: 'Dev-Days', value: specStats.devDays, icon: Clock, color: 'text-green-500' },
  ]

  const renderContent = () => {
    if (active === 'overview') {
      return (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Interactive Spec · AI-Accessible via MCP + JSON API</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Tutor LMS Pro-Style SaaS</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              The complete engineering specification for building a Tutor LMS Pro-style SaaS on the lastsaas Go + React foundation.
              Every collection, every endpoint, every event — all searchable, all AI-accessible.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map(s => {
              const Icon = s.icon
              return (
                <Card key={s.label}>
                  <CardContent className="p-4">
                    <Icon className={`w-5 h-5 ${s.color} mb-2`} />
                    <div className="text-2xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-amber-500/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4 text-amber-500" /> Web</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">Human-readable docs. Browse via sidebar.</CardContent>
            </Card>
            <Card className="border-emerald-500/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Code2 className="w-4 h-4 text-emerald-500" /> JSON API</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/spec/collections</code><br/>
                <code className="text-emerald-600 dark:text-emerald-400 text-xs">GET /api/spec/endpoints</code>
              </CardContent>
            </Card>
            <Card className="border-purple-500/20">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Plug className="w-4 h-4 text-purple-500" /> MCP Server</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <code className="text-purple-600 dark:text-purple-400 text-xs">POST /api/mcp</code><br/>
                Claude Code + Cursor connect directly.
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Map className="w-5 h-5" /> Build Roadmap</CardTitle>
              <CardDescription>6 phases · 24 weeks · ~137.5 dev-days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {phases.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Badge variant="outline" className={`shrink-0 ${phaseColors[p.id]}`}>{p.id}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{p.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.weeks} · {p.theme}</div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">{p.tickets} tickets</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (active === 'collections') {
      const filtered = search ? collectionSummaries.filter(c => c.name.includes(search) || c.description.toLowerCase().includes(search.toLowerCase())) : collectionSummaries
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Data Model</h1><p className="text-muted-foreground">{specStats.collections} MongoDB collections across 9 domains</p></div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="text-left p-3">Collection</th><th className="text-left p-3">Domain</th><th className="text-left p-3">Status</th><th className="text-right p-3">Fields</th><th className="text-left p-3">Description</th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.name} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono font-medium text-amber-600 dark:text-amber-400">{c.name}</td>
                    <td className="p-3 capitalize text-muted-foreground">{c.domain}</td>
                    <td className="p-3"><Badge variant="outline" className={c.status === 'existing' ? 'bg-gray-500/10' : c.status === 'extended' ? 'bg-blue-500/10' : 'bg-amber-500/10'}>{c.status}</Badge></td>
                    <td className="p-3 text-right font-mono">{c.fields}</td>
                    <td className="p-3 text-muted-foreground text-xs">{c.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (active === 'endpoints') {
      const filtered = search ? endpointSamples.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.path.toLowerCase().includes(search.toLowerCase())) : endpointSamples
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">API Reference</h1><p className="text-muted-foreground">{specStats.endpoints} REST endpoints — showing {filtered.length} samples</p></div>
          <div className="space-y-2">
            {filtered.map(ep => (
              <Card key={ep.id}><CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className={`shrink-0 font-mono text-xs ${methodColors[ep.method] || ''}`}>{ep.method}</Badge>
                  <div className="flex-1 min-w-0">
                    <code className="text-sm font-mono text-amber-600 dark:text-amber-400 break-all">{ep.path}</code>
                    <p className="text-sm text-muted-foreground mt-1">{ep.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ep.desc}</p>
                    <div className="mt-2 flex gap-2"><Badge variant="outline" className="text-xs">{ep.auth}</Badge><Badge variant="outline" className={`text-xs ${phaseColors[ep.phase]}`}>{ep.phase}</Badge></div>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )
    }

    if (active === 'events') {
      const filtered = search ? eventSamples.filter(e => e.name.includes(search) || e.domain.toLowerCase().includes(search.toLowerCase())) : eventSamples
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Event Catalog</h1><p className="text-muted-foreground">{specStats.events} events — showing {filtered.length} samples</p></div>
          <div className="space-y-2">
            {filtered.map(ev => (
              <Card key={ev.name}><CardContent className="p-4">
                <div className="flex items-start gap-3"><Zap className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2"><code className="text-sm font-mono text-amber-600 dark:text-amber-400">{ev.name}</code><Badge variant="outline" className="text-xs">{ev.domain}</Badge></div>
                    <div className="mt-1 text-xs"><span className="text-muted-foreground">Fired by: </span><span className="text-cyan-600 dark:text-cyan-400">{ev.firedBy}</span></div>
                    <div className="mt-2 flex flex-wrap gap-1"><span className="text-xs text-muted-foreground">Subscribers:</span>{ev.subscribers.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                    <div className="mt-1 text-xs"><span className="text-muted-foreground">WP Hook: </span><code className="text-purple-600 dark:text-purple-400">{ev.tutorHook}</code></div>
                  </div>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      )
    }

    if (active === 'phases') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Build Roadmap</h1><p className="text-muted-foreground">6 phases · 24 weeks · ~{specStats.devDays} dev-days</p></div>
          {phases.map(p => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={phaseColors[p.id]}>{p.id}</Badge>
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <Badge variant="secondary" className="ml-auto text-xs">{p.tickets} tickets · {p.devDays} days</Badge>
                </div>
                <CardDescription>{p.weeks} · {p.theme}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {p.scope.map((s, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-1 shrink-0 text-amber-500" />{s}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (active === 'tickets') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Ticket Breakdown</h1><p className="text-muted-foreground">{specStats.tickets} tickets · ~{specStats.devDays} dev-days · Importable to Linear/Jira</p></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {phases.map(p => (
              <Card key={p.id} className="p-3">
                <Badge variant="outline" className={`text-xs ${phaseColors[p.id]}`}>{p.id}</Badge>
                <div className="text-xl font-bold mt-2">{p.tickets}</div>
                <div className="text-xs text-muted-foreground">{p.devDays} days</div>
              </Card>
            ))}
          </div>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 text-sm">Import <code className="text-amber-600 dark:text-amber-400">Tutor-LMS-SaaS-Ticket-Breakdown.csv</code> into Linear or Jira.</CardContent>
          </Card>
        </div>
      )
    }

    if (active === 'quiz-types') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Quiz Question Types</h1><p className="text-muted-foreground">{specStats.quizTypes} types (10 free + 3 Pro)</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            {quizTypes.map(qt => (
              <Card key={qt.id} className={qt.isPro ? 'border-amber-500/30' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><HelpCircle className="w-4 h-4" />{qt.name}</CardTitle>
                    <div className="flex gap-1">
                      {qt.isPro && <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400">PRO</Badge>}
                      <Badge variant="outline" className={`text-xs ${qt.grading === 'auto' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'}`}>{qt.grading}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{qt.desc}</p><div className="mt-1 text-xs font-mono text-muted-foreground">{qt.id}</div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    if (active === 'gateways') {
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Payment Gateways</h1><p className="text-muted-foreground">{specStats.gateways} gateways</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            {gateways.map(gw => (
              <Card key={gw.id} className={gw.phase === 'Phase 2' ? 'border-emerald-500/20' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" />{gw.name}</CardTitle>
                    <div className="flex gap-1"><Badge variant="outline" className={`text-xs ${phaseColors[gw.phase]}`}>{gw.phase}</Badge><Badge variant="outline" className="text-xs">{gw.region}</Badge></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">{gw.creds.map(c => <div key={c} className="text-xs font-mono"><span className="text-amber-600 dark:text-amber-400">{c}</span></div>)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    if (active === 'settings') {
      const filtered = search ? settingsData.filter(s => s.field.includes(search) || s.label.toLowerCase().includes(search.toLowerCase())) : settingsData
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Settings Tree</h1><p className="text-muted-foreground">{specStats.settings} settings across 12 tabs</p></div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="text-left p-3">Tab</th><th className="text-left p-3">Field</th><th className="text-left p-3">Label</th><th className="text-left p-3">Type</th><th className="text-left p-3">Default</th><th className="text-left p-3">Phase</th></tr></thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} className="border-t hover:bg-muted/30">
                    <td className="p-3"><Badge variant="outline" className="text-xs">{s.tab}</Badge></td>
                    <td className="p-3 font-mono text-xs text-amber-600 dark:text-amber-400">{s.field}</td>
                    <td className="p-3">{s.label}</td>
                    <td className="p-3"><code className="text-xs text-cyan-600 dark:text-cyan-400">{s.type}</code></td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{s.default}</td>
                    <td className="p-3"><Badge variant="outline" className={`text-xs ${phaseColors[s.phase] || ''}`}>{s.phase}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (active === 'email-triggers') {
      const filtered = search ? emailTriggers.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.trigger.includes(search)) : emailTriggers
      return (
        <div className="space-y-4">
          <div><h1 className="text-3xl font-bold mb-2">Email Triggers</h1><p className="text-muted-foreground">{specStats.emailTriggers} triggers — showing {filtered.length}</p></div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="text-left p-3">Name</th><th className="text-left p-3">Recipient</th><th className="text-left p-3">Trigger</th><th className="text-left p-3">Subject</th><th className="text-left p-3">Phase</th></tr></thead>
              <tbody>
                {filtered.map(et => (
                  <tr key={et.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-medium">{et.name}</td>
                    <td className="p-3"><Badge variant="outline" className={`text-xs ${et.recipient === 'student' ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : et.recipient === 'instructor' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>{et.recipient}</Badge></td>
                    <td className="p-3 font-mono text-xs text-purple-600 dark:text-purple-400">{et.trigger}</td>
                    <td className="p-3 text-xs text-muted-foreground">{et.subject}</td>
                    <td className="p-3"><Badge variant="outline" className={`text-xs ${phaseColors[et.phase] || ''}`}>{et.phase}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (active === 'mcp') {
      return (
        <div className="space-y-6">
          <div><h1 className="text-3xl font-bold mb-2">MCP + API Access</h1><p className="text-muted-foreground">How AI agents connect to this spec</p></div>
          <Card className="border-purple-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5 text-purple-500" /> MCP Server</CardTitle><CardDescription>For Claude Code, Cursor, and MCP-compatible agents</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">POST JSON-RPC 2.0 requests to connect your AI agent directly.</p>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono text-zinc-300 overflow-x-auto">{`POST /api/mcp
Content-Type: application/json

// Resources (10):
spec://collections  spec://endpoints
spec://events       spec://tickets
spec://settings     spec://phases

// Tools (6):
get_collection(name)
get_endpoint(id)
get_ticket(id)
get_phase(id)
search_spec(query)
get_stats()`}</pre>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/20">
            <CardHeader><CardTitle className="flex items-center gap-2"><Code2 className="w-5 h-5 text-emerald-500" /> JSON API</CardTitle><CardDescription>For any AI with web access</CardDescription></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-2">
                {['GET /api/spec/overview','GET /api/spec/collections','GET /api/spec/endpoints','GET /api/spec/events','GET /api/spec/tickets','GET /api/spec/settings','GET /api/spec/phases','GET /api/spec/quiz-types','GET /api/spec/gateways','GET /api/spec/email-triggers'].map(p => (
                  <div key={p} className="flex items-center gap-2 p-2 rounded border text-xs">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">GET</Badge>
                    <code className="font-mono text-amber-600 dark:text-amber-400">{p}</code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return <div className="text-muted-foreground">Select a section from the sidebar.</div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden md:flex w-72 shrink-0 border-r bg-card/30">
        <Sidebar active={active} onSelect={setActive} onClose={() => {}} />
      </aside>
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar active={active} onSelect={setActive} onClose={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b bg-card/30">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></Button>
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search spec..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
            </div>
          </div>
          {mounted && <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</Button>}
          <Badge variant="outline" className="hidden lg:flex text-xs gap-1"><Code2 className="w-3 h-3" />API</Badge>
          <Badge variant="outline" className="hidden lg:flex text-xs gap-1"><Plug className="w-3 h-3" />MCP</Badge>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-6xl mx-auto px-4 md:px-8 py-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
