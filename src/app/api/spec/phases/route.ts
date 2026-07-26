import { NextResponse } from 'next/server'
import { phases } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: phases.length, phases })
}
