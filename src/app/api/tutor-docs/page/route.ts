import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const DOCS_ROOT = '/home/z/my-project/repos/tutor-docs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  if (!slug) {
    return NextResponse.json({ error: 'missing slug parameter' }, { status: 400 });
  }
  try {
    const dataPath = join(process.cwd(), 'src', 'data', 'tutor-docs.json');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    const page = (data.pages as any[]).find(p => p.slug === slug);
    if (!page) {
      return NextResponse.json({ error: 'page not found' }, { status: 404 });
    }
    // Return full text preview + image refs with serve paths
    return NextResponse.json({
      id: page.id,
      slug: page.slug,
      title: page.title,
      category: page.category,
      section: page.section,
      section_order: page.section_order,
      order_in_section: page.order_in_section,
      global_order: page.global_order,
      file_path: page.file_path,
      relative_url: page.relative_url,
      text_preview: page.text_preview,
      text_length: page.text_length,
      image_refs: page.image_refs.map((ir: any) => ({
        filename: ir.filename,
        serve_path: ir.local_path.replace(DOCS_ROOT + '/', ''),
      })),
      image_count: page.image_count,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'failed to load page', detail: err.message }, { status: 500 });
  }
}
