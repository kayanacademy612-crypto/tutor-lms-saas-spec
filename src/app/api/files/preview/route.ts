import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const PROJECT_ROOT = '/home/z/my-project'
const SKIP_DIRS = ['node_modules', '.git', '.next', 'vendor', 'dist']
const MAX_FILE_SIZE = 1024 * 1024 // 1MB max for preview
const ALLOWED_EXTS = ['.go', '.php', '.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.yaml', '.yml', '.sh', '.py', '.css', '.html', '.txt', '.env', '.toml']

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path')
  
  if (!filePath) {
    return NextResponse.json({ error: 'Path parameter required' }, { status: 400 })
  }
  
  // Security: prevent path traversal
  const fullPath = path.join(PROJECT_ROOT, filePath)
  if (!fullPath.startsWith(PROJECT_ROOT)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // Check for skip dirs
  if (SKIP_DIRS.some(d => fullPath.includes(d))) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // Check extension
  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    return NextResponse.json({ error: 'File type not supported for preview' }, { status: 400 })
  }
  
  try {
    const stat = await fs.stat(fullPath)
    if (stat.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large for preview',
        size: stat.size,
        maxSize: MAX_FILE_SIZE,
      }, { status: 413 })
    }
    
    const content = await fs.readFile(fullPath, 'utf-8')
    
    return NextResponse.json({
      path: filePath,
      name: path.basename(filePath),
      size: stat.size,
      extension: ext,
      content: content,
      modifiedAt: stat.mtime.toISOString(),
      language: getLanguage(ext),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 404 })
  }
}

function getLanguage(ext: string): string {
  const map: Record<string, string> = {
    '.go': 'go',
    '.php': 'php',
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.md': 'markdown',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sh': 'bash',
    '.py': 'python',
    '.css': 'css',
    '.html': 'html',
    '.txt': 'text',
    '.env': 'ini',
    '.toml': 'toml',
  }
  return map[ext] || 'text'
}
