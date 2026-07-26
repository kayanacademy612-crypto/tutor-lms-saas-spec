import { NextResponse } from 'next/server'
import { collections, collectionsCount } from '@/data/collections-full'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: collectionsCount, collections })
}
