import { NextResponse } from 'next/server'
import { settingsData, settingsDataCount } from '@/data/settings-full'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: settingsDataCount, settings: settingsData })
}
