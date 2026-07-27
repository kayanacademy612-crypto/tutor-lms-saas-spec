import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const dataPath = join(process.cwd(), 'src', 'data', 'lastsaas-codewiki-analysis.json');

function loadData() {
  const raw = readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

// GET /api/codewiki-analysis → full data with ALL content (not stripped)
// GET /api/codewiki-analysis?section=cw-5 → single section with full content
// GET /api/codewiki-analysis?format=text → plain text (best for AI agents)
export async function GET(req: NextRequest) {
  try {
    const data = loadData();
    const sectionId = req.nextUrl.searchParams.get('section');
    const format = req.nextUrl.searchParams.get('format');

    // Per-section endpoint: GET /api/codewiki-analysis?section=cw-5
    if (sectionId) {
      const section = data.sections.find((s: any) => s.id === sectionId);
      if (!section) {
        return NextResponse.json({ error: 'section not found', id: sectionId }, { status: 404 });
      }
      return NextResponse.json(section);
    }

    // Plain text endpoint: GET /api/codewiki-analysis?format=text
    // Returns ALL sections as readable plain text — best for AI agents
    if (format === 'text') {
      let text = `# LastSaaS CodeWiki Analysis\n\n`;
      text += `Source: ${data.source}\n`;
      text += `Total sections: ${data.total_sections}\n`;
      text += `Total source files: ${data.total_source_files}\n`;
      text += `\n${'='.repeat(80)}\n\n`;

      for (const s of data.sections) {
        text += `## ${s.name}\n\n`;
        text += `${s.content}\n\n`;
        text += `${'='.repeat(80)}\n\n`;
      }

      text += `\n## Source Files Referenced (${data.total_source_files})\n\n`;
      for (const f of data.source_files) {
        text += `- ${f}\n`;
      }

      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // Default: return FULL data with ALL content (not stripped)
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'codewiki analysis not found', detail: err.message }, { status: 500 });
  }
}
