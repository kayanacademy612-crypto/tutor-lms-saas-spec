import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, normalize } from 'path';

export const dynamic = 'force-dynamic';

const DOCS_ROOT = '/home/z/my-project/repos/tutor-docs';

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const rawPath = url.searchParams.get('p') || '';
  if (!rawPath) {
    return NextResponse.json({ error: 'missing p parameter' }, { status: 400 });
  }
  // Path traversal protection
  const normalized = normalize(rawPath).replace(/^(\.\.[/\\])+/, '');
  if (normalized.includes('..')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }
  const absPath = join(DOCS_ROOT, normalized);
  if (!absPath.startsWith(DOCS_ROOT)) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }
  if (!existsSync(absPath)) {
    return NextResponse.json({ error: 'not found', path: normalized }, { status: 404 });
  }
  try {
    const stat = statSync(absPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'not a file' }, { status: 400 });
    }
    const ext = absPath.toLowerCase().match(/\.[a-z]+$/)?.[0] || '';
    const mime = EXT_MIME[ext] || 'application/octet-stream';
    const buf = readFileSync(absPath);
    const res = new NextResponse(buf, { status: 200 });
    res.headers.set('Content-Type', mime);
    res.headers.set('Cache-Control', 'public, max-age=86400, immutable');
    res.headers.set('Content-Length', String(buf.length));
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: 'read failed', detail: err.message }, { status: 500 });
  }
}
