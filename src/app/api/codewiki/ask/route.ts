import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { question } = await request.json()
  
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  try {
    // Dynamically import the codewiki client
    const { CodeWikiClient } = await import('/home/z/my-project/repos/codewiki-mcp/dist/index.js')
    const client = new CodeWikiClient({ timeoutMs: 60000, maxRetries: 2 })
    
    const { data, meta } = await client.askRepository('jonradoff/lastsaas', question)
    
    return NextResponse.json({
      answer: data,
      meta: { bytes: meta.totalBytes, elapsedMs: meta.totalElapsedMs },
      source: 'codewiki.google/github.com/jonradoff/lastsaas',
      status: 'connected',
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      status: 'error',
      source: 'codewiki.google/github.com/jonradoff/lastsaas',
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'connected',
    repo: 'jonradoff/lastsaas',
    endpoint: 'POST /api/codewiki/ask',
    description: 'Proxy to codewiki.google — ask questions about the lastsaas codebase',
    usage: { method: 'POST', body: { question: 'How does authentication work in lastsaas?' } },
  })
}
