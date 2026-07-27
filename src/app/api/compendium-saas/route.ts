import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const dataPath = join(process.cwd(), 'src', 'data', 'compendium-saas-plan.json');
    const raw = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'compendium plan not found', detail: err.message },
      { status: 500 }
    );
  }
}
