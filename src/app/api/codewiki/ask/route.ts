import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const dataPath = join(process.cwd(), 'src', 'data', 'lastsaas-codewiki-analysis.json');

function loadData() {
  const raw = readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

// POST /api/codewiki/ask
// Body: { question: "..." }
// Returns: { answer: "...", source: "codewiki-analysis" }
//
// Searches all 61 sections of the CodeWiki analysis for the question,
// returns the most relevant sections' content as the answer.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const question = (body.question || '').toLowerCase().trim();

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const data = loadData();
    const sections: any[] = data.sections || [];

    // Search all sections for keyword matches
    const scored = sections.map((s: any) => {
      const content = (s.content || '').toLowerCase();
      const name = (s.name || '').toLowerCase();
      let score = 0;

      // Score by keyword matches in name (higher weight)
      const qWords = question.split(/\s+/).filter((w: string) => w.length > 2);
      for (const word of qWords) {
        if (name.includes(word)) score += 10;
        if (content.includes(word)) score += 1;
      }

      // Bonus for exact phrase match
      if (content.includes(question)) score += 20;
      if (name.includes(question)) score += 50;

      return { section: s, score };
    });

    // Sort by score, take top 3
    const top = scored
      .filter((s: any) => s.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 3);

    if (top.length === 0) {
      return NextResponse.json({
        answer: `No sections found matching "${body.question}". The CodeWiki analysis has 61 sections covering: backend architecture, configuration, database, middleware, health monitoring, API endpoints, data models, authentication (OAuth, JWT, MFA), billing (Stripe), webhooks, email, CLI tools, system health, frontend structure, and more. Try asking about a specific topic like "authentication", "Stripe billing", "middleware", or "data models".`,
        source: 'codewiki-analysis',
        total_sections_searched: sections.length,
      });
    }

    // Build answer from top sections
    let answer = `Found ${top.length} relevant section(s) in the CodeWiki analysis:\n\n`;
    for (let i = 0; i < top.length; i++) {
      const s = top[i].section;
      answer += `### ${i + 1}. ${s.name}\n\n`;
      answer += `${s.content}\n\n`;
      if (i < top.length - 1) answer += `---\n\n`;
    }

    answer += `\n*Source: LastSaaS CodeWiki Analysis (${data.total_sections} sections, ${data.total_source_files} source files)*`;

    return NextResponse.json({
      answer,
      source: 'codewiki-analysis',
      matched_sections: top.map((t: any) => ({
        id: t.section.id,
        name: t.section.name,
        score: t.score,
      })),
      total_sections_searched: sections.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'failed to query codewiki', detail: err.message }, { status: 500 });
  }
}
