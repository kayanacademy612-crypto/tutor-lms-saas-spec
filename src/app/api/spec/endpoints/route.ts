import { NextResponse } from 'next/server'
import { endpoints, endpointsCount } from '@/data/endpoints-full'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: endpointsCount, endpoints })
}
