import { NextResponse } from 'next/server'
import { lastsaasRoutes } from '@/data/lastsaas-architecture'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: lastsaasRoutes.length, routes: lastsaasRoutes })
}
