import { NextResponse } from 'next/server'
import { lastsaasModels } from '@/data/lastsaas-architecture'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: lastsaasModels.length, models: lastsaasModels })
}
