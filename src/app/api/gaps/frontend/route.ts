import { NextResponse } from 'next/server'
import { frontendGaps, frontendGapCount } from '@/data/screen-inventory'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: frontendGapCount, gaps: frontendGaps })
}
