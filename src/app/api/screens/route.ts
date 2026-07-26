import { NextResponse } from 'next/server'
import { screenInventory, screenInventoryCount } from '@/data/screen-inventory'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: screenInventoryCount, screens: screenInventory })
}
