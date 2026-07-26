import { NextResponse } from 'next/server'
import { gateways } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: gateways.length, gateways })
}
