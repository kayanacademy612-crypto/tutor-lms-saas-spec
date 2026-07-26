import { NextResponse } from 'next/server'
import { specStats, navSections } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ name: 'Tutor LMS SaaS Spec', version: '1.0', stats: specStats, sections: navSections })
}
