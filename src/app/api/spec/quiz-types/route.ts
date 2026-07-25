import { NextResponse } from 'next/server'
import { quizTypes } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: quizTypes.length, quizTypes })
}
