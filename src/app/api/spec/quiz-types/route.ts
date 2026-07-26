import { NextResponse } from 'next/server'
import { quizTypes, quizTypesCount } from '@/data/quiz-types-full'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: quizTypesCount, quizTypes })
}
