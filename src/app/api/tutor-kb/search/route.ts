import { NextRequest, NextResponse } from 'next/server'
import { tutorClassesFree, tutorClassesPro, tutorModels, tutorAddons, tutorApiControllers, tutorEmailTemplates, tutorShortcodes, tutorSummary } from '@/data/tutor-knowledge'
import { events } from '@/data/events-full'
import { settingsData } from '@/data/settings-full'
import { emailTriggers } from '@/data/triggers-full'
import { endpoints } from '@/data/endpoints-full'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { question } = await request.json()
  
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  const q = question.toLowerCase()
  const results: any[] = []

  // Search classes (free)
  tutorClassesFree.forEach(c => {
    const searchText = `${c.name} ${c.path} ${c.classes.join(' ')}`.toLowerCase()
    if (searchText.includes(q) || q.includes(c.name.toLowerCase())) {
      results.push({ type: 'class (free)', name: c.name, path: c.path, source: c.source, detail: `Classes: ${c.classes.join(', ')}`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search classes (pro)
  tutorClassesPro.forEach(c => {
    const searchText = `${c.name} ${c.path} ${c.classes.join(' ')}`.toLowerCase()
    if (searchText.includes(q) || q.includes(c.name.toLowerCase())) {
      results.push({ type: 'class (pro)', name: c.name, path: c.path, source: c.source, detail: `Classes: ${c.classes.join(', ')}`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search models
  tutorModels.forEach(m => {
    const searchText = `${m.name} ${m.path} ${m.classes.join(' ')} ${m.constants.map(c => c.name + ' ' + c.value).join(' ')}`.toLowerCase()
    if (searchText.includes(q)) {
      results.push({ type: 'model', name: m.name, path: m.path, source: m.source, detail: `Classes: ${m.classes.join(', ')}. Constants: ${m.constants.slice(0, 5).map(c => c.name).join(', ')}`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search addons
  tutorAddons.forEach(a => {
    if (a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase())) {
      results.push({ type: 'addon', name: a.name, path: a.path, source: a.source, detail: `${a.files} PHP files`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search API controllers
  tutorApiControllers.forEach(c => {
    if (c.name.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)) {
      results.push({ type: 'API controller', name: c.name, path: c.path, source: c.source, detail: 'REST API controller', confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search email templates
  tutorEmailTemplates.forEach(t => {
    if (t.name.toLowerCase().includes(q) || t.path.toLowerCase().includes(q)) {
      results.push({ type: 'email template', name: t.name, path: t.path, source: t.source, detail: 'Email template file', confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search shortcodes
  tutorShortcodes.forEach(s => {
    if (s.name.toLowerCase().includes(q)) {
      results.push({ type: 'shortcode', name: s.name, source: s.source, detail: `Shortcode: [${s.name}]`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search events (from Tutor source)
  events.forEach(e => {
    if (e.goEvent?.toLowerCase().includes(q) || e.wpHook?.toLowerCase().includes(q) || e.domain?.toLowerCase().includes(q)) {
      results.push({ type: 'event', name: e.goEvent || e.wpHook, source: e.tutorHook || 'tutor source', detail: `Domain: ${e.domain}. Fired by: ${e.firedBy}. Subscribers: ${e.subscribers?.join(', ')}`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search settings
  settingsData.forEach(s => {
    if (s.field?.toLowerCase().includes(q) || s.label?.toLowerCase().includes(q) || s.tab?.toLowerCase().includes(q)) {
      results.push({ type: 'setting', name: s.field, source: 'tutor source (get_tutor_option)', detail: `Tab: ${s.tab}. Label: ${s.label}. Type: ${s.type}. Default: ${s.default}`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search email triggers
  emailTriggers.forEach(t => {
    if (t.name?.toLowerCase().includes(q) || t.trigger?.includes(q) || t.recipient?.toLowerCase().includes(q)) {
      results.push({ type: 'email trigger', name: t.name, source: t.file || 'tutor-pro/templates/email/', detail: `Recipient: ${t.recipient}. Trigger: ${t.trigger}. Subject: ${t.subject}`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Search endpoints
  endpoints.forEach(e => {
    if (e.name?.toLowerCase().includes(q) || e.path?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q)) {
      results.push({ type: 'endpoint', name: e.name, source: e.specRef || 'build spec', detail: `${e.method} ${e.path} — ${e.description} (Phase: ${e.phase}, Auth: ${e.auth})`, confidence: 'confirmed', system: 'tutor' })
    }
  })

  // Build an answer summary
  let answer = `Found ${results.length} results in the Tutor LMS knowledge base for "${question}".\n\n`
  
  // Group by type
  const byType = results.reduce((acc: any, r: any) => {
    acc[r.type] = acc[r.type] || []
    acc[r.type].push(r)
    return acc
  }, {})

  for (const [type, items] of Object.entries(byType) as [string, any[]][]) {
    answer += `## ${type} (${items.length} found)\n`
    items.slice(0, 5).forEach(item => {
      answer += `- **${item.name}**: ${item.detail}\n  Source: ${item.source}\n`
    })
    if (items.length > 5) answer += `  ... and ${items.length - 5} more\n`
    answer += '\n'
  }

  if (results.length === 0) {
    answer = `No results found in the Tutor LMS knowledge base for "${question}".\n\nThe Tutor LMS knowledge base contains:\n- ${tutorSummary.totalPhpFilesFree} PHP files (free) + ${tutorSummary.totalPhpFilesPro} (Pro)\n- ${tutorSummary.classesFree} free classes, ${tutorSummary.classesPro} Pro classes\n- ${tutorSummary.models} models, ${tutorSummary.addons} addons\n- ${events.length} events, ${settingsData.length} settings, ${emailTriggers.length} email triggers\n\nTry searching for: course, quiz, enrollment, payment, certificate, authentication, email, settings`
  }

  return NextResponse.json({
    answer,
    results: results.slice(0, 50),
    totalResults: results.length,
    source: 'internal Tutor LMS knowledge index',
    system: 'tutor',
    indexedData: {
      classes: tutorSummary.classesFree + tutorSummary.classesPro,
      models: tutorSummary.models,
      addons: tutorSummary.addons,
      events: events.length,
      settings: settingsData.length,
      triggers: emailTriggers.length,
    },
  })
}

export async function GET() {
  return NextResponse.json({
    status: 'connected',
    endpoint: 'POST /api/tutor-kb/search',
    description: 'Search the internal Tutor LMS knowledge index',
    indexedData: {
      classesFree: tutorSummary.classesFree,
      classesPro: tutorSummary.classesPro,
      models: tutorSummary.models,
      addons: tutorSummary.addons,
      events: '480 (from events-full.ts)',
      settings: '66 (from settings-full.ts)',
      triggers: '54 (from triggers-full.ts)',
    },
    usage: { method: 'POST', body: { question: 'How does quiz grading work?' } },
  })
}
