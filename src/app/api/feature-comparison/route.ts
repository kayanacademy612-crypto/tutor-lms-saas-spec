import { NextResponse } from 'next/server'
import { featureComparisons, featureComparisonCount } from '@/data/screen-inventory'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: featureComparisonCount, comparisons: featureComparisons })
}
