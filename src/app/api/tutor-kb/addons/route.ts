import { NextResponse } from 'next/server'
import { tutorAddons, tutorSummary } from '@/data/tutor-knowledge'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: tutorAddons.length, addons: tutorAddons, summary: tutorSummary })
}
