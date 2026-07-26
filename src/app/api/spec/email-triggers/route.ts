import { NextResponse } from 'next/server'
import { emailTriggers, emailTriggersCount } from '@/data/triggers-full'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: emailTriggersCount, triggers: emailTriggers })
}
