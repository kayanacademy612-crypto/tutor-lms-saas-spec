import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { specStats, collectionSummaries, endpointSamples, eventSamples, phases, quizTypes, gateways, settingsData, emailTriggers } from '@/data/spec'
export const dynamic = 'force-dynamic'

// ---------- Lazy data-file loaders (only read when a tool actually needs them) ----------
const DATA_DIR = join(process.cwd(), 'src', 'data')

function loadJson(relPath: string): any {
  const raw = readFileSync(join(DATA_DIR, relPath), 'utf-8')
  return JSON.parse(raw)
}

function loadCompendium(): any {
  return loadJson('compendium-saas-plan.json')
}

function loadCodewikiAnalysis(): any {
  return loadJson('lastsaas-codewiki-analysis.json')
}

function loadCodewikiSections(): any {
  return loadJson('codewiki-sections.json')
}

function loadTutorDocs(): any {
  return loadJson('tutor-docs.json')
}

function loadScreenInventory(): any {
  const tutor = JSON.parse(readFileSync(join(DATA_DIR, 'tutor-screens.json'), 'utf-8'))
  const lastsaas = JSON.parse(readFileSync(join(DATA_DIR, 'lastsaas-screens.json'), 'utf-8'))
  let screenShots: Record<string, any[]> = {}
  try {
    const ssRaw = readFileSync(join(DATA_DIR, 'tutor-screen-shots.json'), 'utf-8')
    screenShots = JSON.parse(ssRaw).matches || {}
  } catch {}
  const DOCS_ROOT = '/home/z/my-project/repos/tutor-docs'
  const tutorScreens = (tutor.screens || []).map((s: any) => ({
    id: s.id,
    name: s.screen_name,
    route: s.template_path,
    role: s.role,
    feature: s.category,
    module: s.category,
    source: s.template_path,
    system: 'tutor',
    system_detail: s.system,
    line_count: s.line_count,
    image_refs: s.image_refs || [],
    preview: s.preview,
    absolute_path: s.absolute_path,
    doc_screenshots: (screenShots[s.id] || []).slice(0, 6).map((ss: any) => ({
      serve_path: ss.serve_path,
      filename: ss.filename,
      doc_slug: ss.doc_slug,
      doc_title: ss.doc_title,
    })),
    doc_screenshot_count: (screenShots[s.id] || []).length,
  }))
  const lastsaasScreens = (lastsaas.screens || []).map((s: any) => ({
    id: s.id,
    name: s.screen_name,
    route: s.route_hint,
    role: s.role,
    feature: s.area,
    module: s.area,
    source: s.component_path,
    system: 'lastsaas',
    system_detail: s.system,
    line_count: s.line_count,
    image_refs: [],
    preview: s.preview,
    absolute_path: s.absolute_path,
    doc_screenshots: [],
    doc_screenshot_count: 0,
  }))
  const matchedCount = tutorScreens.filter((s: any) => s.doc_screenshot_count > 0).length
  return {
    total: tutorScreens.length + lastsaasScreens.length,
    tutor_total: tutor.total_screens,
    lastsaas_total: lastsaas.total_screens,
    tutor_by_category: tutor.by_category,
    tutor_by_role: tutor.by_role,
    lastsaas_by_area: lastsaas.by_area,
    lastsaas_by_role: lastsaas.by_role,
    matched_with_screenshots: matchedCount,
    total_screenshot_links: Object.values(screenShots).reduce((a: any, b: any[]) => a + b.length, 0),
    source_note: 'Real data extracted from actual PHP templates (tutor/templates/, tutor-pro/templates/) and React components (lastsaas/frontend/src/pages/). Each entry references a real file on disk. Doc screenshots linked via /api/tutor-docs/file endpoint.',
    screens: [...tutorScreens, ...lastsaasScreens],
  }
}

function loadScreenshotsManifest(): any {
  const manifestPath = join(process.cwd(), 'public', 'tutor-assets', 'manifest.json')
  const raw = readFileSync(manifestPath, 'utf-8')
  return JSON.parse(raw)
}

// Search helper for CodeWiki sections (mirrors /api/codewiki/ask logic)
function searchCodewiki(question: string): { answer: string; matched_sections: any[]; total_sections_searched: number } {
  const data = loadCodewikiAnalysis()
  const sections: any[] = data.sections || []
  const q = (question || '').toLowerCase().trim()
  const scored = sections.map((s: any) => {
    const content = (s.content || '').toLowerCase()
    const name = (s.name || '').toLowerCase()
    let score = 0
    const qWords = q.split(/\s+/).filter((w: string) => w.length > 2)
    for (const word of qWords) {
      if (name.includes(word)) score += 10
      if (content.includes(word)) score += 1
    }
    if (content.includes(q)) score += 20
    if (name.includes(q)) score += 50
    return { section: s, score }
  })
  const top = scored
    .filter((s: any) => s.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3)
  if (top.length === 0) {
    return {
      answer: `No sections found matching "${question}". The CodeWiki analysis has ${sections.length} sections covering: backend architecture, configuration, database, middleware, health monitoring, API endpoints, data models, authentication (OAuth, JWT, MFA), billing (Stripe), webhooks, email, CLI tools, system health, frontend structure, and more.`,
      matched_sections: [],
      total_sections_searched: sections.length,
    }
  }
  let answer = `Found ${top.length} relevant section(s) in the CodeWiki analysis:\n\n`
  for (let i = 0; i < top.length; i++) {
    const s = top[i].section
    answer += `### ${i + 1}. ${s.name}\n\n`
    answer += `${s.content}\n\n`
    if (i < top.length - 1) answer += `---\n\n`
  }
  answer += `\n*Source: LastSaaS CodeWiki Analysis (${data.total_sections} sections, ${data.total_source_files} source files)*`
  return {
    answer,
    matched_sections: top.map((t: any) => ({ id: t.section.id, name: t.section.name, score: t.score })),
    total_sections_searched: sections.length,
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'lms-spec-server', version: '2.0.0',
    description: 'MCP server for Tutor LMS SaaS spec + all data sources (compendium, codewiki, tutor docs, screens, screenshots). POST JSON-RPC 2.0 to query.',
    resources: [
      'spec://overview','spec://collections','spec://endpoints','spec://events','spec://tickets','spec://settings','spec://phases','spec://quiz-types','spec://gateways','spec://email-triggers',
      'compendium://summary','compendium://sections','codewiki://analysis','codewiki://sections','docs://pages','screens://inventory','screenshots://manifest',
    ],
    tools: [
      'get_collection','get_endpoint','get_phase','search_spec','get_stats',
      'get_compendium_section','get_compendium_summary','search_codewiki','get_codewiki_section','get_tutor_doc','get_screen_inventory','get_screenshots',
    ],
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { method, params, id } = body
  let result: any
  switch (method) {
    case 'initialize': result = { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'lms-spec-server', version: '2.0.0' } }; break
    case 'tools/list': result = { tools: [
      { name: 'get_collection', description: 'Get a spec collection by name (e.g. users, course, quiz). Returns the collection summary.', inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Collection name (e.g. "course")' } }, required: ['name'] } },
      { name: 'get_endpoint', description: 'Get a spec endpoint sample by path or id.', inputSchema: { type: 'object', properties: { path: { type: 'string' }, id: { type: 'string' } } } },
      { name: 'get_phase', description: 'Get a build phase by id (Phase 0 through Phase 5).', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Phase id e.g. "Phase 1"' } }, required: ['id'] } },
      { name: 'search_spec', description: 'Search all spec content (collections + endpoints) by keyword.', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
      { name: 'get_stats', description: 'Get overview stats (collections, endpoints, events, tickets, settings, phases, dev days, etc.).', inputSchema: { type: 'object' } },
      { name: 'get_compendium_section', description: 'Return a specific compendium section by id (e.g. "getting-started") or all 28 sections if no id provided. Each section includes phase, status, doc_count, saas_implementation, impact (collections/endpoints/events/settings/screens/quiz_types/gateways), and sidebar_effects.', inputSchema: { type: 'object', properties: { section_id: { type: 'string', description: 'Section id from compendium-saas-plan.json. Omit to list all sections (metadata only).' } } } },
      { name: 'get_compendium_summary', description: 'Return the compendium overall build progress + totals (119 collections, 209 endpoints, 175 events, 153 settings, 53 email triggers, 239 screens, 13 quiz types, 11 gateways, status/phase counts, overall_progress %).', inputSchema: { type: 'object' } },
      { name: 'search_codewiki', description: 'Keyword-search all 61 CodeWiki sections of the LastSaaS CodeWiki analysis. Returns the top 3 matching sections with full content + scores. Mirrors the /api/codewiki/ask endpoint.', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Free-text keyword query (e.g. "authentication", "Stripe billing", "middleware")' } }, required: ['query'] } },
      { name: 'get_codewiki_section', description: 'Return a specific CodeWiki section by id (cw-1 through cw-61). Each section has name, content, content_length. Loaded from lastsaas-codewiki-analysis.json.', inputSchema: { type: 'object', properties: { section_id: { type: 'string', description: 'Section id e.g. "cw-5"' } }, required: ['section_id'] } },
      { name: 'get_tutor_doc', description: 'Return a specific Tutor LMS documentation page by slug. Includes title, category, section, text_preview, image_refs (filename + serve_path). Loaded from tutor-docs.json (291 pages, 870 screenshots).', inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Page slug e.g. "getting-started-system-requirements"' } }, required: ['slug'] } },
      { name: 'get_screen_inventory', description: 'Return the unified frontend screen inventory — 429 total screens (383 Tutor PHP templates + 46 LastSaaS React pages) with id, name, route, role, feature, module, source, system, line_count, preview, and linked doc_screenshots. Optionally filter by system (tutor|lastsaas) or role.', inputSchema: { type: 'object', properties: { system: { type: 'string', enum: ['tutor', 'lastsaas'] }, role: { type: 'string' }, limit: { type: 'number', description: 'Cap the number of screens returned (default 50).' } } } },
      { name: 'get_screenshots', description: 'Return the screenshot catalog manifest — 197 real Tutor LMS images with id, category, system, filename, url, original_path, size_bytes, screen_name, addon_key. Optionally filter by category.', inputSchema: { type: 'object', properties: { category: { type: 'string', description: 'Filter by category (e.g. "addons", "certificates", "states", "ai-types", "misc")' } } } },
    ] }; break
    case 'tools/call':
      if (params.name === 'get_stats') result = { content: [{ type: 'text', text: JSON.stringify(specStats) }] }
      else if (params.name === 'get_collection') { const c = collectionSummaries.find(x => x.name === params.arguments.name); result = { content: [{ type: 'text', text: c ? JSON.stringify(c) : 'Not found' }] } }
      else if (params.name === 'get_endpoint') {
        const e = endpointSamples.find(x =>
          (params.arguments.id && x.id === params.arguments.id) ||
          (params.arguments.path && x.path === params.arguments.path))
        result = { content: [{ type: 'text', text: e ? JSON.stringify(e) : 'Not found' }] }
      }
      else if (params.name === 'get_phase') { const p = phases.find(x => x.id === params.arguments.id); result = { content: [{ type: 'text', text: p ? JSON.stringify(p) : 'Not found' }] } }
      else if (params.name === 'search_spec') { const q = params.arguments.query.toLowerCase(); const r = [...collectionSummaries.filter(c => c.name.includes(q) || c.description.toLowerCase().includes(q)), ...endpointSamples.filter(e => e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q))]; result = { content: [{ type: 'text', text: JSON.stringify({ results: r.slice(0, 20) }) }] } }
      // ---- NEW: compendium section ----
      else if (params.name === 'get_compendium_section') {
        try {
          const data = loadCompendium()
          const sid = params.arguments?.section_id
          if (sid) {
            const s = (data.sections || []).find((x: any) => x.id === sid)
            result = { content: [{ type: 'text', text: s ? JSON.stringify(s) : `Section "${sid}" not found. Available ids: ${(data.sections || []).map((x: any) => x.id).join(', ')}` }] }
          } else {
            // list all sections with light metadata (skip the heavy impact object)
            const list = (data.sections || []).map((s: any) => ({
              id: s.id, name: s.name, phase: s.phase, status: s.status, doc_count: s.doc_count,
            }))
            result = { content: [{ type: 'text', text: JSON.stringify({ total_sections: data.total_sections, sections: list }) }] }
          }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error loading compendium: ${err.message}` }] }
        }
      }
      // ---- NEW: compendium summary ----
      else if (params.name === 'get_compendium_summary') {
        try {
          const data = loadCompendium()
          result = { content: [{ type: 'text', text: JSON.stringify({ version: data.version, total_sections: data.total_sections, summary: data.summary }) }] }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error loading compendium summary: ${err.message}` }] }
        }
      }
      // ---- NEW: search codewiki ----
      else if (params.name === 'search_codewiki') {
        try {
          const q = params.arguments?.query
          if (!q) {
            result = { content: [{ type: 'text', text: 'Error: query argument is required' }] }
          } else {
            const r = searchCodewiki(q)
            result = { content: [{ type: 'text', text: JSON.stringify(r) }] }
          }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error searching codewiki: ${err.message}` }] }
        }
      }
      // ---- NEW: get codewiki section ----
      else if (params.name === 'get_codewiki_section') {
        try {
          const data = loadCodewikiAnalysis()
          const sid = params.arguments?.section_id
          const s = (data.sections || []).find((x: any) => x.id === sid)
          result = { content: [{ type: 'text', text: s ? JSON.stringify(s) : `Section "${sid}" not found. Valid range: cw-1 through cw-${data.total_sections}` }] }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error loading codewiki section: ${err.message}` }] }
        }
      }
      // ---- NEW: get tutor doc page ----
      else if (params.name === 'get_tutor_doc') {
        try {
          const data = loadTutorDocs()
          const slug = params.arguments?.slug
          if (!slug) {
            result = { content: [{ type: 'text', text: 'Error: slug argument is required' }] }
          } else {
            const page = (data.pages || []).find((p: any) => p.slug === slug)
            if (!page) {
              result = { content: [{ type: 'text', text: `Doc page "${slug}" not found. Total pages: ${data.total_pages}` }] }
            } else {
              const DOCS_ROOT = '/home/z/my-project/repos/tutor-docs'
              result = { content: [{ type: 'text', text: JSON.stringify({
                id: page.id, slug: page.slug, title: page.title, category: page.category,
                section: page.section, section_order: page.section_order,
                order_in_section: page.order_in_section, global_order: page.global_order,
                file_path: page.file_path, relative_url: page.relative_url,
                text_preview: page.text_preview, text_length: page.text_length,
                image_refs: (page.image_refs || []).map((ir: any) => ({
                  filename: ir.filename,
                  serve_path: ir.local_path.replace(DOCS_ROOT + '/', ''),
                })),
                image_count: page.image_count,
              }) }] }
            }
          }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error loading tutor doc: ${err.message}` }] }
        }
      }
      // ---- NEW: get screen inventory ----
      else if (params.name === 'get_screen_inventory') {
        try {
          const data = loadScreenInventory()
          const sys = params.arguments?.system
          const role = params.arguments?.role
          const limit = params.arguments?.limit ?? 50
          let screens = data.screens
          if (sys) screens = screens.filter((s: any) => s.system === sys)
          if (role) screens = screens.filter((s: any) => s.role === role)
          const total = screens.length
          screens = screens.slice(0, limit)
          result = { content: [{ type: 'text', text: JSON.stringify({
            total: data.total,
            tutor_total: data.tutor_total,
            lastsaas_total: data.lastsaas_total,
            tutor_by_category: data.tutor_by_category,
            tutor_by_role: data.tutor_by_role,
            lastsaas_by_area: data.lastsaas_by_area,
            lastsaas_by_role: data.lastsaas_by_role,
            matched_with_screenshots: data.matched_with_screenshots,
            total_screenshot_links: data.total_screenshot_links,
            filtered_total: total,
            filter: { system: sys || null, role: role || null },
            returned: screens.length,
            source_note: data.source_note,
            screens,
          }) }] }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error loading screen inventory: ${err.message}` }] }
        }
      }
      // ---- NEW: get screenshots ----
      else if (params.name === 'get_screenshots') {
        try {
          const data = loadScreenshotsManifest()
          const cat = params.arguments?.category
          let images = data.images || []
          if (cat) images = images.filter((img: any) => img.category === cat)
          result = { content: [{ type: 'text', text: JSON.stringify({
            generated_at: data.generated_at,
            total_images: data.total_images,
            by_category: data.by_category,
            source_note: data.source_note,
            filter: cat || null,
            returned: images.length,
            images,
          }) }] }
        } catch (err: any) {
          result = { content: [{ type: 'text', text: `Error loading screenshots: ${err.message}` }] }
        }
      }
      else result = { content: [{ type: 'text', text: 'Unknown tool' }] }
      break
    case 'resources/list': result = { resources: [{ uri: 'spec://overview', name: 'Overview' }, { uri: 'spec://collections', name: 'Collections' }, { uri: 'spec://endpoints', name: 'Endpoints' }, { uri: 'compendium://summary', name: 'Compendium Summary' }, { uri: 'codewiki://analysis', name: 'CodeWiki Analysis' }, { uri: 'docs://pages', name: 'Tutor Docs Pages' }, { uri: 'screens://inventory', name: 'Screen Inventory' }, { uri: 'screenshots://manifest', name: 'Screenshots Manifest' }] }; break
    case 'resources/read':
      if (params.uri === 'spec://overview') result = { contents: [{ uri: params.uri, text: JSON.stringify(specStats) }] }
      else if (params.uri === 'spec://collections') result = { contents: [{ uri: params.uri, text: JSON.stringify(collectionSummaries) }] }
      else if (params.uri === 'spec://endpoints') result = { contents: [{ uri: params.uri, text: JSON.stringify(endpointSamples) }] }
      else if (params.uri === 'compendium://summary') result = { contents: [{ uri: params.uri, text: JSON.stringify(loadCompendium().summary) }] }
      else if (params.uri === 'codewiki://analysis') result = { contents: [{ uri: params.uri, text: JSON.stringify({ total_sections: loadCodewikiAnalysis().total_sections, total_source_files: loadCodewikiAnalysis().total_source_files }) }] }
      else if (params.uri === 'docs://pages') result = { contents: [{ uri: params.uri, text: JSON.stringify({ total_pages: loadTutorDocs().total_pages, total_images: loadTutorDocs().total_images }) }] }
      else if (params.uri === 'screens://inventory') result = { contents: [{ uri: params.uri, text: JSON.stringify({ total: loadScreenInventory().total }) }] }
      else if (params.uri === 'screenshots://manifest') result = { contents: [{ uri: params.uri, text: JSON.stringify({ total_images: loadScreenshotsManifest().total_images }) }] }
      else result = { contents: [{ uri: params.uri, text: 'Unknown resource' }] }
      break
    default: return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } })
  }
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}
