import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const dataPath = join(process.cwd(), 'src', 'data', 'codewiki-compendium-xref.json');

function loadData() {
  const raw = readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

// GET /api/xref
//   Returns the full bidirectional CodeWiki ↔ Compendium cross-reference:
//   { generated_at, source_files, description, totals, concepts,
//     codewiki_to_compendium, compendium_to_codewiki }
//
// GET /api/xref?direction=cw-to-comp
//   Returns just { codewiki_to_compendium } keyed by CodeWiki section id.
//
// GET /api/xref?direction=comp-to-cw
//   Returns just { compendium_to_codewiki } keyed by Compendium section id.
//
// GET /api/xref?cw=cw-13
//   Returns the Compendium section ids that depend on the given CodeWiki
//   section: { cw: "cw-13", compendium_sections: [...] }
//
// GET /api/xref?comp=course-builder
//   Returns the CodeWiki section ids that the given Compendium section
//   depends on: { comp: "course-builder", codewiki_sections: [...] }
//
// GET /api/xref?concepts=true
//   Returns just the concepts array (capability → dependency groupings with
//   human-readable reasons).
export async function GET(req: NextRequest) {
  try {
    const data = loadData();

    const direction = req.nextUrl.searchParams.get('direction');
    const cw = req.nextUrl.searchParams.get('cw');
    const comp = req.nextUrl.searchParams.get('comp');
    const conceptsOnly = req.nextUrl.searchParams.get('concepts');

    if (conceptsOnly === 'true') {
      return NextResponse.json({
        concepts: data.concepts,
        totals: data.totals,
      });
    }

    if (cw) {
      const sections = data.codewiki_to_compendium[cw];
      if (sections === undefined) {
        return NextResponse.json(
          { error: 'unknown codewiki section id', cw },
          { status: 404 }
        );
      }
      // Annotate each compendium id with its concept reason(s)
      const annotated = sections.map((id: string) => {
        const matching = data.concepts.filter(
          (c: any) => c.cw_sections.includes(cw) && c.compendium_sections.includes(id)
        );
        return {
          id,
          reasons: matching.map((c: any) => ({ concept: c.id, reason: c.reason })),
        };
      });
      return NextResponse.json({
        cw,
        compendium_sections: sections,
        annotated,
      });
    }

    if (comp) {
      const sections = data.compendium_to_codewiki[comp];
      if (sections === undefined) {
        return NextResponse.json(
          { error: 'unknown compendium section id', comp },
          { status: 404 }
        );
      }
      const annotated = sections.map((id: string) => {
        const matching = data.concepts.filter(
          (c: any) => c.compendium_sections.includes(comp) && c.cw_sections.includes(id)
        );
        return {
          id,
          reasons: matching.map((c: any) => ({ concept: c.id, reason: c.reason })),
        };
      });
      return NextResponse.json({
        comp,
        codewiki_sections: sections,
        annotated,
      });
    }

    if (direction === 'cw-to-comp') {
      return NextResponse.json({
        codewiki_to_compendium: data.codewiki_to_compendium,
      });
    }

    if (direction === 'comp-to-cw') {
      return NextResponse.json({
        compendium_to_codewiki: data.compendium_to_codewiki,
      });
    }

    // Default: full document
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'failed to load codewiki-compendium xref', detail: err.message },
      { status: 500 }
    );
  }
}
