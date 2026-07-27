import { NextResponse } from 'next/server'
import { backendGaps, backendGapCount } from '@/data/screen-inventory'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: backendGapCount, gaps: backendGaps })
}
