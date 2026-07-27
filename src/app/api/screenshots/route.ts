import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

export async function GET() {
  try {
    const manifestPath = join(process.cwd(), 'public', 'tutor-assets', 'manifest.json');
    const raw = readFileSync(manifestPath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'manifest not found', detail: err.message },
      { status: 500 }
    );
  }
}
