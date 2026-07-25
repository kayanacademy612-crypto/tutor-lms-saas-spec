import { NextRequest, NextResponse } from 'next/server'
import { specStats, collectionSummaries, endpointSamples, eventSamples, phases, quizTypes, gateways, settingsData, emailTriggers } from '@/data/spec'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    name: 'lms-spec-server', version: '1.0.0',
    description: 'MCP server for Tutor LMS SaaS spec. POST JSON-RPC 2.0 to query.',
    resources: ['spec://overview','spec://collections','spec://endpoints','spec://events','spec://tickets','spec://settings','spec://phases','spec://quiz-types','spec://gateways','spec://email-triggers'],
    tools: ['get_collection','get_endpoint','get_phase','search_spec','get_stats'],
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { method, params, id } = body
  let result: any
  switch (method) {
    case 'initialize': result = { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'lms-spec-server', version: '1.0.0' } }; break
    case 'tools/list': result = { tools: [{ name: 'get_collection', description: 'Get collection by name', inputSchema: { type: 'object', properties: { name: { type: 'string' } } } }, { name: 'search_spec', description: 'Search all spec content', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } }, { name: 'get_stats', description: 'Get overview stats', inputSchema: { type: 'object' } }] }; break
    case 'tools/call':
      if (params.name === 'get_stats') result = { content: [{ type: 'text', text: JSON.stringify(specStats) }] }
      else if (params.name === 'get_collection') { const c = collectionSummaries.find(x => x.name === params.arguments.name); result = { content: [{ type: 'text', text: c ? JSON.stringify(c) : 'Not found' }] } }
      else if (params.name === 'search_spec') { const q = params.arguments.query.toLowerCase(); const r = [...collectionSummaries.filter(c => c.name.includes(q) || c.description.toLowerCase().includes(q)), ...endpointSamples.filter(e => e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q))]; result = { content: [{ type: 'text', text: JSON.stringify({ results: r.slice(0, 20) }) }] } }
      else result = { content: [{ type: 'text', text: 'Unknown tool' }] }
      break
    case 'resources/list': result = { resources: [{ uri: 'spec://overview', name: 'Overview' }, { uri: 'spec://collections', name: 'Collections' }, { uri: 'spec://endpoints', name: 'Endpoints' }] }; break
    case 'resources/read':
      if (params.uri === 'spec://overview') result = { contents: [{ uri: params.uri, text: JSON.stringify(specStats) }] }
      else if (params.uri === 'spec://collections') result = { contents: [{ uri: params.uri, text: JSON.stringify(collectionSummaries) }] }
      else if (params.uri === 'spec://endpoints') result = { contents: [{ uri: params.uri, text: JSON.stringify(endpointSamples) }] }
      else result = { contents: [{ uri: params.uri, text: 'Unknown resource' }] }
      break
    default: return NextResponse.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } })
  }
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}
