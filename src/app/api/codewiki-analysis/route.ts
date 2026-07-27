import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const dataPath = join(process.cwd(), 'src', 'data', 'lastsaas-codewiki-analysis.json');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    // Return summary + sections (without full content to keep response small)
    return NextResponse.json({
      generated_at: data.generated_at,
      source: data.source,
      total_sections: data.total_sections,
      total_source_files: data.total_source_files,
      source_files: data.source_files,
      sections: data.sections.map((s: any) => ({
        id: s.id,
        name: s.name,
        content_length: s.content_length,
        summary: s.summary,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'codewiki analysis not found', detail: err.message }, { status: 500 });
  }
}
