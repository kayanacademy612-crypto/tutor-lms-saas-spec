import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const BACKEND = 'http://127.0.0.1:4290';
async function proxy(req: NextRequest, params: Promise<{ path: string[] }>) {
  const { path } = await params;
  const url = new URL('/api/tenant/' + path.join('/'), BACKEND);
  url.search = req.nextUrl.search;
  const headers: Record<string, string> = { 'Content-Type': req.headers.get('content-type') || 'application/json' };
  const auth = req.headers.get('authorization'); if (auth) headers['Authorization'] = auth;
  const tid = req.headers.get('x-tenant-id'); if (tid) headers['X-Tenant-ID'] = tid;
  let body: BodyInit | undefined; if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.text();
  try {
    const resp = await fetch(url, { method: req.method, headers, body });
    const rh: Record<string, string> = { 'Access-Control-Allow-Origin': '*' };
    const ct = resp.headers.get('content-type'); if (ct) rh['Content-Type'] = ct;
    return new NextResponse(await resp.arrayBuffer(), { status: resp.status, headers: rh });
  } catch (e: any) { return NextResponse.json({ error: 'Proxy failed', detail: e.message }, { status: 502 }); }
}
export const GET = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const POST = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const PATCH = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const PUT = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
export const DELETE = (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => proxy(req, ctx.params);
