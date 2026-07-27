import { NextResponse } from 'next/server'
import { lastsaasEvents } from '@/data/lastsaas-architecture'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: lastsaasEvents.length, events: lastsaasEvents })
}
