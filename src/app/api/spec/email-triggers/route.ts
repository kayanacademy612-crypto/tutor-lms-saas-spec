import { NextResponse } from 'next/server'
import { emailTriggers, specStats } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: specStats.emailTriggers, samples: emailTriggers })
}
