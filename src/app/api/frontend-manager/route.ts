import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

const FRONTEND_CWD = '/home/z/my-project/repos/lastsaas/frontend';

declare const globalThis: any;

function getProcess(): any {
  return globalThis.__frontendProcess;
}

function setProcess(p: any) {
  globalThis.__frontendProcess = p;
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'status';

  if (action === 'start') {
    const existing = getProcess();
    if (existing && !existing.killed) {
      try {
        const resp = await fetch('http://127.0.0.1:4280/', {
          signal: AbortSignal.timeout(2000),
        });
        if (resp.ok) {
          return NextResponse.json({ status: 'already_running', pid: existing.pid });
        }
      } catch {}
    }

    try {
      const child = spawn('npx', ['vite', '--port', '4280', '--host', '0.0.0.0'], {
        cwd: FRONTEND_CWD,
        env: { ...process.env },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.unref();

      child.stdout?.on('data', (data: Buffer) => {
        console.log('[frontend]', data.toString().trim());
      });
      child.stderr?.on('data', (data: Buffer) => {
        console.error('[frontend]', data.toString().trim());
      });

      child.on('exit', (code: number) => {
        console.log(`[frontend] exited with code ${code}`);
        setProcess(null);
      });

      setProcess(child);

      return NextResponse.json({
        status: 'started',
        pid: child.pid,
        message: 'Frontend started on port 4280.',
      });
    } catch (err: any) {
      return NextResponse.json({ status: 'error', error: err.message }, { status: 500 });
    }
  }

  if (action === 'status') {
    try {
      const resp = await fetch('http://127.0.0.1:4280/', {
        signal: AbortSignal.timeout(2000),
      });
      if (resp.ok) {
        return NextResponse.json({ status: 'running' });
      }
    } catch {}
    return NextResponse.json({ status: 'stopped' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
