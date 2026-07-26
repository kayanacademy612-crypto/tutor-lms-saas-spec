import { NextResponse } from 'next/server'
import { tutorModels } from '@/data/tutor-knowledge'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: tutorModels.length, models: tutorModels })
}
