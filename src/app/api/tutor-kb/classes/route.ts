import { NextResponse } from 'next/server'
import { tutorClassesFree, tutorClassesPro } from '@/data/tutor-knowledge'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ free: tutorClassesFree, pro: tutorClassesPro, totalFree: tutorClassesFree.length, totalPro: tutorClassesPro.length })
}
