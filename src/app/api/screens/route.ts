import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-static'

export async function GET() {
  try {
    const tutorRaw = readFileSync(join(process.cwd(), 'src', 'data', 'tutor-screens.json'), 'utf-8')
    const lastsaasRaw = readFileSync(join(process.cwd(), 'src', 'data', 'lastsaas-screens.json'), 'utf-8')
    const tutor = JSON.parse(tutorRaw)
    const lastsaas = JSON.parse(lastsaasRaw)

    // Normalize into a unified screen list (for backwards compatibility with the UI)
    const tutorScreens = (tutor.screens || []).map((s: any) => ({
      id: s.id,
      name: s.screen_name,
      route: s.template_path,
      role: s.role,
      feature: s.category,
      module: s.category,
      source: s.template_path,
      system: 'tutor',
      system_detail: s.system,
      line_count: s.line_count,
      image_refs: s.image_refs || [],
      preview: s.preview,
      absolute_path: s.absolute_path,
    }))

    const lastsaasScreens = (lastsaas.screens || []).map((s: any) => ({
      id: s.id,
      name: s.screen_name,
      route: s.route_hint,
      role: s.role,
      feature: s.area,
      module: s.area,
      source: s.component_path,
      system: 'lastsaas',
      system_detail: s.system,
      line_count: s.line_count,
      image_refs: [],
      preview: s.preview,
      absolute_path: s.absolute_path,
    }))

    return NextResponse.json({
      total: tutorScreens.length + lastsaasScreens.length,
      tutor_total: tutor.total_screens,
      lastsaas_total: lastsaas.total_screens,
      tutor_by_category: tutor.by_category,
      tutor_by_role: tutor.by_role,
      lastsaas_by_area: lastsaas.by_area,
      lastsaas_by_role: lastsaas.by_role,
      source_note: 'Real data extracted from actual PHP templates (tutor/templates/, tutor-pro/templates/) and React components (lastsaas/frontend/src/pages/). Each entry references a real file on disk.',
      screens: [...tutorScreens, ...lastsaasScreens],
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'failed to load screens', detail: err.message }, { status: 500 })
  }
}
