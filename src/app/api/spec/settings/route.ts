import { NextResponse } from 'next/server'
import { settingsData, specStats } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: specStats.settings, samples: settingsData })
}
