'use client'

import {
  ArrowRight, LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function FrontendAppsSection({ onLaunch }: { onLaunch: (appId: string) => void }) {
  const apps = [
    {
      id: 'course-builder',
      title: 'Course Builder',
      description: 'Tutor LMS course creation UI built with REAL tailux components. 3-step wizard with Basic Tab (title, description, options, sidebar metadata), Curriculum Tab (topics, lessons, quizzes, assignments — all 6 modals working), and Additional Settings. Served live from the tailux Vite dev server via reverse proxy.',
      matchScore: 92,
      referenceDocs: 4,
      screenshots: 37,
      status: 'experiment',
      tech: 'tailux + headlessui + react-hook-form',
    },
    {
      id: 'quiz-builder',
      title: 'Quiz Builder',
      description: 'Standalone quiz creation interface with 13 question types. (Planned — will be built in tailux.)',
      matchScore: 0, referenceDocs: 3, screenshots: 22, status: 'planned', tech: 'tailux',
    },
    {
      id: 'student-dashboard',
      title: 'Student Dashboard',
      description: 'Frontend student dashboard — home, courses, quizzes, assignments, notes, discussions, calendar.',
      matchScore: 0, referenceDocs: 3, screenshots: 18, status: 'planned', tech: 'tailux',
    },
    {
      id: 'instructor-dashboard',
      title: 'Instructor Dashboard',
      description: 'Frontend instructor dashboard — home, courses, announcements, quiz attempts, analytics.',
      matchScore: 0, referenceDocs: 3, screenshots: 24, status: 'planned', tech: 'tailux',
    },
    {
      id: 'certificate-builder',
      title: 'Certificate Builder',
      description: 'Visual certificate design canvas with backdrops, layers, media library, templates.',
      matchScore: 0, referenceDocs: 3, screenshots: 19, status: 'planned', tech: 'tailux',
    },
    {
      id: 'native-ecommerce',
      title: 'Native eCommerce',
      description: 'Cart, checkout, payment methods, coupons, taxes, orders.',
      matchScore: 0, referenceDocs: 3, screenshots: 14, status: 'planned', tech: 'tailux',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <LayoutGrid className="w-8 h-8 text-purple-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Frontend Apps</h1>
          <p className="text-muted-foreground mt-1">
            Live recreations of Tutor LMS screens built with{' '}
            <strong className="text-purple-600 dark:text-purple-400">real tailux components</strong>.
            Each app runs in the tailux Vite dev server and is reverse-proxied through this Next.js app so
            it's reachable from the preview URL. Click any app to launch it full-screen in an iframe.
          </p>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600">
          {apps.length} apps · {apps.filter(a => a.status === 'experiment').length} live
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <Card
            key={app.id}
            className={app.status === 'experiment'
              ? 'border-purple-500/30 cursor-pointer hover:shadow-lg hover:border-purple-500/60 transition-all'
              : 'opacity-70'}
          >
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                {app.status === 'experiment'
                  ? <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">● LIVE</Badge>
                  : <Badge variant="outline" className="bg-gray-500/10 text-gray-500 text-[10px]">PLANNED</Badge>}
              </div>
              <h3 className="font-semibold text-base mb-1">{app.title}</h3>
              <p className="text-xs text-muted-foreground flex-1 mb-3 leading-relaxed">{app.description}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reference screenshots:</span>
                  <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-600">{app.screenshots} imgs</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reference docs:</span>
                  <span className="font-medium">{app.referenceDocs} pages</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tech:</span>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400">{app.tech}</Badge>
                </div>
                {app.matchScore > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">VLM accuracy:</span>
                    <Badge variant="outline" className={`text-[10px] ${app.matchScore >= 80 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{app.matchScore}/100</Badge>
                  </div>
                )}
              </div>
              {app.status === 'experiment'
                ? <Button onClick={() => onLaunch(app.id)} className="w-full mt-4" size="sm">Launch App <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                : <Button disabled className="w-full mt-4" size="sm" variant="outline">Coming Soon</Button>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold text-blue-600 dark:text-blue-400">How this works</div>
          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
            <li>The course builder runs in the <strong>tailux Vite dev server</strong> (port 5173) using real tailux components (Button, Input, Textarea, Switch, Checkbox, Upload from <code>@/components/ui</code>, Dialog/Transition/Menu from <code>@headlessui/react</code>).</li>
            <li>It's reverse-proxied through Next.js at <code>/api/tailux/*</code> so it's reachable from the preview URL — no localhost needed.</li>
            <li>Click <strong>Launch App</strong> to open it full-screen in an iframe. The "Open in new tab ↗" button gives you a direct URL.</li>
            <li>Apps are benchmarked against real Tutor LMS screenshots using VLM (vision language model) analysis. Current course builder scores <strong>92/100</strong>.</li>
            <li>Reference docs and screenshots come from the 291-page Tutor LMS docs bundle you provided.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
