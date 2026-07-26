import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { target } = await request.json()
  
  if (!target || !['lastsaas', 'tutor', 'all'].includes(target)) {
    return NextResponse.json({ error: 'Target must be: lastsaas, tutor, or all' }, { status: 400 })
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    target,
    tasks: [],
  }

  try {
    if (target === 'lastsaas' || target === 'all') {
      // Re-extract lastsaas architecture from source code
      try {
        await execAsync('python3 /home/z/my-project/scripts/extract-collections.py 2>&1')
        results.tasks.push({ task: 'extract-collections', status: 'success', message: 'Collections re-extracted from mongodb.go' })
      } catch (e: any) {
        results.tasks.push({ task: 'extract-collections', status: 'error', message: e.message })
      }
    }

    if (target === 'tutor' || target === 'all') {
      // Re-extract Tutor LMS knowledge from source code
      try {
        await execAsync('python3 /home/z/my-project/scripts/mine-spec-data.py 2>&1')
        results.tasks.push({ task: 'mine-tutor-data', status: 'success', message: 'Tutor events, settings, triggers re-extracted from PHP source' })
      } catch (e: any) {
        results.tasks.push({ task: 'mine-tutor-data', status: 'error', message: e.message })
      }
    }

    results.success = results.tasks.every((t: any) => t.status === 'success')
    results.lastSyncAt = new Date().toISOString()
    
    return NextResponse.json(results)
  } catch (e: any) {
    return NextResponse.json({ error: e.message, ...results }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/sync',
    description: 'Re-index source code and regenerate data files',
    targets: {
      lastsaas: 'Re-extract collections from mongodb.go + LMS schema design',
      tutor: 'Re-extract events, settings, triggers from PHP source code',
      all: 'Re-index both systems',
    },
    usage: { method: 'POST', body: { target: 'lastsaas' } },
    note: 'After sync, the Next.js dev server will hot-reload with the updated data.',
  })
}
