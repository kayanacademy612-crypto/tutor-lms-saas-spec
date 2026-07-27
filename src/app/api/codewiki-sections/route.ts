import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const dataPath = join(process.cwd(), 'src', 'data', 'codewiki-sections.json');

function loadData() {
  const raw = readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

// GET /api/codewiki-sections → all sections (without SVGs to keep response smaller)
// GET /api/codewiki-sections?section=cw-5 → single section WITH SVGs and code blocks
// GET /api/codewiki-sections?format=nav → just section names for sidebar navigation
export async function GET(req: NextRequest) {
  try {
    const data = loadData();
    const sectionId = req.nextUrl.searchParams.get('section');
    const format = req.nextUrl.searchParams.get('format');

    // Navigation list: just id + name + level
    if (format === 'nav') {
      return NextResponse.json({
        total_sections: data.total_sections,
        sections: data.sections.map((s: any) => ({
          id: s.id,
          name: s.name,
          level: s.level,
          svg_count: s.svg_count,
          code_count: s.code_count,
          content_length: s.content_length,
        })),
      });
    }

    // Single section with full content + SVGs + code
    if (sectionId) {
      const section = data.sections.find((s: any) => s.id === sectionId);
      if (!section) {
        return NextResponse.json({ error: 'section not found' }, { status: 404 });
      }
      return NextResponse.json(section);
    }

    // Default: all sections with content but without SVGs (too large)
    return NextResponse.json({
      total_sections: data.total_sections,
      total_source_files: data.total_source_files,
      total_svgs: data.total_svgs,
      total_code_blocks: data.total_code_blocks,
      source_files: data.source_files,
      sections: data.sections.map((s: any) => ({
        id: s.id,
        name: s.name,
        level: s.level,
        content: s.content,
        content_length: s.content_length,
        svg_count: s.svg_count,
        code_blocks: s.code_blocks,
        code_count: s.code_count,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'failed to load codewiki sections', detail: err.message }, { status: 500 });
  }
}
