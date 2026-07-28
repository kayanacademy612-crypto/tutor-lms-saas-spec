import { NextResponse } from 'next/server'
import {
  saasCollections,
  saasEndpoints,
  saasEvents,
  saasSettings,
  saasEmailTriggers,
  saasScreens,
  saasPlanSummary,
} from '@/data/saas-plan-data'

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({
    summary: saasPlanSummary,
    collections: saasCollections,
    endpoints: saasEndpoints,
    events: saasEvents,
    settings: saasSettings,
    emailTriggers: saasEmailTriggers,
    screens: saasScreens,
    total: {
      collections: saasCollections.length,
      endpoints: saasEndpoints.length,
      events: saasEvents.length,
      settings: saasSettings.length,
      emailTriggers: saasEmailTriggers.length,
      screens: saasScreens.length,
    },
  })
}
