import { NextResponse } from 'next/server'
import { events, eventsCount } from '@/data/events-full'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: eventsCount, events })
}
