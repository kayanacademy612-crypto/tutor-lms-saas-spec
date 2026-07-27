import { NextResponse } from 'next/server'
import { userFlows, userFlowCount } from '@/data/screen-inventory'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: userFlowCount, flows: userFlows })
}
