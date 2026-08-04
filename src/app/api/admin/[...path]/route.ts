import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BACKEND = 'http://127.0.0.1:4290';

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const url = new URL('/api/admin/' + path.join('/'), BACKEND);
  url.search = req.nextUrl.search;
  
  const headers: Record<string, string> = {
    'Content-Type': req.headers.get('content-type') || 'application/json',
  };
  
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  
  const tenantId = req.headers.get('x-tenant-id');
  if (tenantId) headers['X-Tenant-ID'] = tenantId;
  
  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }
  
  try {
    const resp = await fetch(url, { method: req.method, headers, body });
    const respHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-ID',
    };
    const ct = resp.headers.get('content-type');
    if (ct) respHeaders['Content-Type'] = ct;
    
    const data = await resp.arrayBuffer();
    return new NextResponse(data, { status: resp.status, headers: respHeaders });
  } catch (e: any) {
    return NextResponse.json({ error: 'Admin proxy failed', detail: e.message }, { status: 502 });
  }
}

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const PUT = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
