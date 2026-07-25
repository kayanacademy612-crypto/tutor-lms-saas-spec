import { NextResponse } from 'next/server'
import { eventSamples, specStats } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: specStats.events, samples: eventSamples })
}
