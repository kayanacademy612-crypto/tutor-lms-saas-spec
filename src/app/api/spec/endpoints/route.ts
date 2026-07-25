import { NextResponse } from 'next/server'
import { endpointSamples, specStats } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: specStats.endpoints, samples: endpointSamples })
}
