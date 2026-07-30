import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BACKEND_BINARY = '/tmp/lastsaas-final';
const BACKEND_CWD = '/home/z/my-project/repos/lastsaas/backend';

// Keep a reference to the backend process in module scope
// so it survives across requests in the same Next.js server process.
declare const globalThis: any;

function getBackendProcess(): any {
  return globalThis.__backendProcess;
}

function setBackendProcess(p: any) {
  globalThis.__backendProcess = p;
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'status';

  if (action === 'start') {
    // Check if already running
    const existing = getBackendProcess();
    if (existing && !existing.killed) {
      // Verify it's actually alive with a health check
      try {
        const resp = await fetch('http://127.0.0.1:4290/health', {
          signal: AbortSignal.timeout(2000),
        });
        if (resp.ok) {
          return NextResponse.json({
            status: 'already_running',
            pid: existing.pid,
          });
        }
      } catch {}
    }

    try {
      const child = spawn(BACKEND_BINARY, [], {
        cwd: BACKEND_CWD,
        env: { ...process.env, LASTSAAS_ENV: 'dev' },
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.unref();

      child.stdout?.on('data', (data: Buffer) => {
        console.log('[backend]', data.toString().trim());
      });
      child.stderr?.on('data', (data: Buffer) => {
        console.error('[backend]', data.toString().trim());
      });

      child.on('exit', (code: number) => {
        console.log(`[backend] exited with code ${code}`);
        setBackendProcess(null);
      });

      setBackendProcess(child);

      return NextResponse.json({
        status: 'started',
        pid: child.pid,
        message: 'Backend started. Wait ~20s for MongoDB connection.',
      });
    } catch (err: any) {
      return NextResponse.json({
        status: 'error',
        error: err.message,
      }, { status: 500 });
    }
  }

  if (action === 'status') {
    try {
      const resp = await fetch('http://127.0.0.1:4290/health', {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        return NextResponse.json({ status: 'running', health: data });
      }
    } catch {}

    return NextResponse.json({
      status: 'stopped',
      message: 'Backend not running. Call ?action=start to start it.',
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
