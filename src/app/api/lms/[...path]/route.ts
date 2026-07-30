import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_ORIGIN = 'http://localhost:4290';

// Proxy /api/lms/* → http://localhost:4290/api/lms/*
// This makes the Go backend accessible from the preview URL.
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, params);
}

async function proxyRequest(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path: pathParts } = await params;
  const path = '/' + (pathParts || []).join('/');
  const url = new URL(`/api/lms${path}`, BACKEND_ORIGIN);
  url.search = req.nextUrl.search;

  // Forward the request body
  let body: BodyInit | undefined;
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text();
  }

  // Forward relevant headers
  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };

  try {
    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    const res = new NextResponse(buf, { status: upstream.status });
    
    // Pass through content type
    const ct = upstream.headers.get('content-type');
    if (ct) res.headers.set('Content-Type', ct);
    
    // CORS headers so the iframe can call this
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'LMS backend proxy failed', detail: err.message, target: url.toString() },
      { status: 502 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return res;
}
