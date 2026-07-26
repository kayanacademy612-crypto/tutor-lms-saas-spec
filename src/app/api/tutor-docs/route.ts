import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

const DOCS_ROOT = '/home/z/my-project/repos/tutor-docs';

export async function GET() {
  try {
    const dataPath = join(process.cwd(), 'src', 'data', 'tutor-docs.json');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    // Strip the full text_preview and image absolute_path from the listing
    // to keep the response small — full content fetched on demand
    const pages = data.pages.map((p: any) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      category: p.category,
      relative_url: p.relative_url,
      text_length: p.text_length,
      image_count: p.image_count,
      // Include just the image filenames + serve paths
      image_refs: p.image_refs.map((ir: any) => ({
        filename: ir.filename,
        serve_path: ir.local_path.replace(DOCS_ROOT + '/', ''),
      })),
    }));
    const images = data.images.map((img: any) => ({
      id: img.id,
      filename: img.filename,
      serve_path: img.serve_path,
      size_bytes: img.size_bytes,
      referenced_by_count: img.referenced_by.length,
    }));
    return NextResponse.json({
      generated_at: data.generated_at,
      source: data.source,
      total_pages: data.total_pages,
      total_images: data.total_images,
      total_screenshot_refs: data.total_screenshot_refs,
      by_category: data.by_category,
      pages,
      images,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'failed to load tutor docs', detail: err.message }, { status: 500 });
  }
}
