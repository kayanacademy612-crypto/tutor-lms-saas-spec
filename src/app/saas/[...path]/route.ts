import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const FRONTEND = 'http://127.0.0.1:4280';

async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const url = new URL('/' + path.join('/'), FRONTEND);
  url.search = req.nextUrl.search;
  
  const headers: Record<string, string> = {};
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;
  
  let body: BodyInit | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }
  
  try {
    const resp = await fetch(url, { method: req.method, headers, body, redirect: 'manual' });
    const respHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
    };
    const rct = resp.headers.get('content-type');
    if (rct) respHeaders['Content-Type'] = rct;
    const data = await resp.arrayBuffer();
    return new NextResponse(data, { status: resp.status, headers: respHeaders });
  } catch (e: any) {
    return NextResponse.json({ error: 'Frontend proxy failed', detail: e.message }, { status: 502 });
  }
}

export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const PUT = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
