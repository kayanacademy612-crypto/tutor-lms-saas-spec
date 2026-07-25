import { NextResponse } from 'next/server'
import { phases, specStats } from '@/data/spec'
export const dynamic = 'force-static'
export async function GET() {
  return NextResponse.json({ total: specStats.tickets, totalDevDays: specStats.devDays, phases: phases.map(p => ({ id: p.id, title: p.title, tickets: p.tickets, devDays: p.devDays })) })
}
