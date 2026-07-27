import { NextResponse } from 'next/server'
import { lastsaasMiddleware } from '@/data/lastsaas-architecture'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: lastsaasMiddleware.length, middleware: lastsaasMiddleware })
}
