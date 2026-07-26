import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Direct HTTP call to codewiki.google batchexecute API
// Based on the codewiki-mcp client source code
const CODEWIKI_BASE = 'https://codewiki.google'
const RPC_ASK = 'EgIxfe'

async function askCodeWiki(repo: string, question: string): Promise<{ answer: string; bytes: number; elapsedMs: number }> {
  const start = Date.now()
  const url = new URL(`${CODEWIKI_BASE}/_/BoqAngularSdlcAgentsUi/data/batchexecute`)
  url.searchParams.set('rpcids', RPC_ASK)
  url.searchParams.set('rt', 'c')
  url.searchParams.set('source-path', `/github.com/${repo}`)

  // Build the RPC payload matching the codewiki-mcp client format
  const messages: [string, string][] = [[question, 'user']]
  const rpcPayload = [messages, [null, `https://github.com/${repo}`]]
  const bodyObject = [[[RPC_ASK, JSON.stringify(rpcPayload), null, 'generic']]]
  const body = `f.req=${encodeURIComponent(JSON.stringify(bodyObject))}&`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body,
  })

  const text = await response.text()
  const bytes = text.length

  // Parse the response - codewiki returns a peculiar format
  // The response starts with )]} prefix, then JSON arrays
  let answer = ''
  try {
    // Remove the )]} prefix if present
    const cleanText = text.replace(/^\)\]\}'?\n?/, '')
    const parsed = JSON.parse(cleanText)
    
    // Navigate the nested array structure to find the answer
    // Based on the codewiki-mcp batchexecute extraction
    if (Array.isArray(parsed) && parsed.length > 0) {
      for (const item of parsed) {
        if (Array.isArray(item)) {
          for (const sub of item) {
            if (Array.isArray(sub) && sub.length > 0) {
              // Look for the RPC response
              for (const inner of sub) {
                if (Array.isArray(inner) && inner.length >= 3) {
                  const payloadStr = inner[2]
                  if (typeof payloadStr === 'string') {
                    try {
                      const payload = JSON.parse(payloadStr)
                      if (Array.isArray(payload) && payload.length > 0) {
                        const first = payload[0]
                        if (typeof first === 'string') {
                          answer = first
                          break
                        } else if (Array.isArray(first) && first.length > 0 && typeof first[0] === 'string') {
                          answer = first[0]
                          break
                        }
                      }
                    } catch {
                      // Try another path
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    if (!answer) {
      // Fallback: try to extract any meaningful text
      answer = `Received ${bytes} bytes from CodeWiki but could not parse the answer. Raw response (first 500 chars): ${text.substring(0, 500)}`
    }
  } catch (e: any) {
    answer = `CodeWiki response parsing error: ${e.message}. Raw response (first 500 chars): ${text.substring(0, 500)}`
  }

  return { answer, bytes, elapsedMs: Date.now() - start }
}

export async function POST(request: NextRequest) {
  const { question } = await request.json()
  
  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  try {
    const { answer, bytes, elapsedMs } = await askCodeWiki('jonradoff/lastsaas', question)
    
    return NextResponse.json({
      answer,
      meta: { bytes, elapsedMs },
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
