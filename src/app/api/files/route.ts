import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

interface FileEntry {
  name: string
  path: string
  size: number
  extension: string
  system: 'lastsaas' | 'tutor' | 'tutor-pro' | 'build-spec' | 'codewiki' | 'project'
  category: 'source-code' | 'documentation' | 'config' | 'data' | 'generated' | 'pdf' | 'script'
  modifiedAt: string
  isDirectory: boolean
}

const PROJECT_ROOT = '/home/z/my-project'

// Directories to scan with their system classification
const SCAN_DIRS = [
  { dir: 'repos/lastsaas', system: 'lastsaas', category: 'source-code' },
  { dir: 'repos/tutor', system: 'tutor', category: 'source-code' },
  { dir: 'repos/tutor-pro/tutor-pro', system: 'tutor-pro', category: 'source-code' },
  { dir: 'repos/codewiki-mcp', system: 'codewiki', category: 'source-code' },
  { dir: 'notes', system: 'project', category: 'documentation' },
  { dir: 'upload', system: 'project', category: 'documentation' },
  { dir: 'download', system: 'project', category: 'pdf' },
  { dir: 'scripts', system: 'project', category: 'script' },
  { dir: 'src/data', system: 'project', category: 'generated' },
  { dir: 'src/app/api', system: 'project', category: 'source-code' },
]

// File extensions to include (skip node_modules, .git, vendor, etc.)
const SKIP_DIRS = ['node_modules', '.git', '.next', 'vendor', 'dist', '__pycache__', '.cache']
const INCLUDE_EXTS = ['.go', '.php', '.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.yaml', '.yml', '.sh', '.py', '.css', '.html', '.pdf', '.csv', '.zip', '.txt', '.env', '.toml']
const MAX_DEPTH = 5

async function scanDirectory(dirPath: string, system: string, category: string, depth: number): Promise<FileEntry[]> {
  if (depth > MAX_DEPTH) return []
  
  const entries: FileEntry[] = []
  const fullPath = path.join(PROJECT_ROOT, dirPath)
  
  try {
    const items = await fs.readdir(fullPath, { withFileTypes: true })
    
    for (const item of items) {
      if (SKIP_DIRS.includes(item.name)) continue
      if (item.name.startsWith('.') && item.name !== '.env') continue
      
      const itemPath = path.join(dirPath, item.name)
      const itemFullPath = path.join(fullPath, item.name)
      
      if (item.isDirectory()) {
        // Recurse into subdirectory
        const subEntries = await scanDirectory(itemPath, system, category, depth + 1)
        entries.push(...subEntries)
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase()
        if (!INCLUDE_EXTS.includes(ext) && ext !== '') continue
        
        try {
          const stat = await fs.stat(itemFullPath)
          
          // Determine category based on extension and path
          let fileCategory = category
          if (ext === '.md') fileCategory = 'documentation'
          else if (ext === '.pdf') fileCategory = 'pdf'
          else if (ext === '.json' && itemPath.includes('src/data')) fileCategory = 'generated'
          else if (ext === '.py' || ext === '.sh' || ext === '.mjs') fileCategory = 'script'
          else if (ext === '.go' || ext === '.php' || ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') fileCategory = 'source-code'
          else if (ext === '.yaml' || ext === '.yml' || ext === '.env' || ext === '.toml') fileCategory = 'config'
          
          entries.push({
            name: item.name,
            path: itemPath,
            size: stat.size,
            extension: ext,
            system: system as FileEntry['system'],
            category: fileCategory as FileEntry['category'],
            modifiedAt: stat.mtime.toISOString(),
            isDirectory: false,
          })
        } catch (e) {
          // Skip files we can't stat
        }
      }
    }
  } catch (e) {
    // Directory doesn't exist or can't be read
  }
  
  return entries
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const search = url.searchParams.get('search') || ''
  const system = url.searchParams.get('system') || ''
  const category = url.searchParams.get('category') || ''
  
  const allFiles: FileEntry[] = []
  
  for (const scanDir of SCAN_DIRS) {
    const files = await scanDirectory(scanDir.dir, scanDir.system, scanDir.category, 0)
    allFiles.push(...files)
  }
  
  // Apply filters
  let filtered = allFiles
  
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(searchLower) || 
      f.path.toLowerCase().includes(searchLower)
    )
  }
  
  if (system && system !== 'all') {
    filtered = filtered.filter(f => f.system === system)
  }
  
  if (category && category !== 'all') {
    filtered = filtered.filter(f => f.category === category)
  }
  
  // Sort by system then path
  filtered.sort((a, b) => {
    if (a.system !== b.system) return a.system.localeCompare(b.system)
    return a.path.localeCompare(b.path)
  })
  
  // Summary stats
  const stats = {
    total: allFiles.length,
    bySystem: {
      lastsaas: allFiles.filter(f => f.system === 'lastsaas').length,
      tutor: allFiles.filter(f => f.system === 'tutor').length,
      'tutor-pro': allFiles.filter(f => f.system === 'tutor-pro').length,
      codewiki: allFiles.filter(f => f.system === 'codewiki').length,
      project: allFiles.filter(f => f.system === 'project').length,
    },
    byCategory: {
      'source-code': allFiles.filter(f => f.category === 'source-code').length,
      documentation: allFiles.filter(f => f.category === 'documentation').length,
      config: allFiles.filter(f => f.category === 'config').length,
      data: allFiles.filter(f => f.category === 'data').length,
      generated: allFiles.filter(f => f.category === 'generated').length,
      pdf: allFiles.filter(f => f.category === 'pdf').length,
      script: allFiles.filter(f => f.category === 'script').length,
    },
    totalSizeMB: Math.round(allFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024 * 100) / 100,
  }
  
  // Return first 500 results (paginated in future)
  const limited = filtered.slice(0, 500)
  
  return NextResponse.json({
    stats,
    filtered: limited.length,
    total: filtered.length,
    files: limited,
  })
}
