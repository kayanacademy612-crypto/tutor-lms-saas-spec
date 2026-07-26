import { NextResponse } from 'next/server'
import { lastsaasCollections } from '@/data/lastsaas-architecture'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: lastsaasCollections.length, collections: lastsaasCollections })
}
