import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_ORIGIN = 'http://localhost:4290';

// Proxy /api/auth/* → http://localhost:4290/api/auth/*
// This makes the Go backend's auth endpoints accessible from the preview URL.
//
// Auth endpoints proxied include:
//   /api/auth/school-signup
//   /api/auth/login
//   /api/auth/tenants
//   /api/auth/forgot-password
//   /api/auth/reset-password
//   /api/auth/mfa/challenge
//   /api/auth/register
//   /api/auth/providers
//   /api/auth/me
//   /api/auth/logout
//   ...etc
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
  const url = new URL(`/api/auth${path}`, BACKEND_ORIGIN);
  url.search = req.nextUrl.search;

  // Forward the request body
  let body: BodyInit | undefined;
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text();
  }

  // Forward relevant headers.
  // IMPORTANT: auth endpoints often require Authorization (Bearer token)
  // and/or Cookie (session) headers, so we forward them in addition to
  // Content-Type. Also forward X-Request-ID / X-Tenant-ID if present.
  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };
  const forwardHeaders = ['authorization', 'cookie', 'x-request-id', 'x-tenant-id', 'x-tenant-slug'];
  for (const h of forwardHeaders) {
    const v = req.headers.get(h);
    if (v) headers[h] = v;
  }

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

    // Pass through Set-Cookie (auth endpoints set session/JWT cookies)
    const setCookie = upstream.headers.get('set-cookie');
    if (setCookie) res.headers.set('Set-Cookie', setCookie);

    // CORS headers so the iframe / preview page can call this
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Tenant-ID, X-Tenant-Slug');
    res.headers.set('Access-Control-Allow-Credentials', 'true');

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Auth backend proxy failed', detail: err.message, target: url.toString() },
      { status: 502 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-Tenant-ID, X-Tenant-Slug');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  return res;
}
