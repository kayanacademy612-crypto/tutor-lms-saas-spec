'use client'

import {
  ArrowRight, LayoutGrid, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function FrontendAppsSection({ onLaunch }: { onLaunch: (appId: string) => void }) {
  const apps = [
    {
      id: 'course-builder',
      title: 'Course Builder',
      description: '3-step wizard (Basics → Curriculum → Additional) with 6 modals. CONNECTED to real API — creates courses, topics, lessons in MongoDB Atlas. 95/100 VLM accuracy.',
      status: 'live',
      tech: 'tailux + Go API + MongoDB',
      screens: 10,
    },
    {
      id: 'student-dashboard',
      title: 'Student Dashboard',
      description: 'Home (stats, continue learning), Courses (enrolled grid), Notes, Discussions, Calendar, Profile, Kids Mode, Settings. 8 screens.',
      status: 'live',
      tech: 'tailux',
      screens: 8,
    },
    {
      id: 'instructor-dashboard',
      title: 'Instructor Dashboard',
      description: 'Home (revenue stats), Courses, Announcements, Quiz Attempts, Assignments, Discussions, Live Classes, Certificate, Analytics (4 charts), Statements, Notifications, Profile. 13 screens.',
      status: 'live',
      tech: 'tailux',
      screens: 13,
    },
    {
      id: 'learning-area',
      title: 'Learning Area',
      description: 'Video lessons, reading lessons, quiz taking (13 question types), assignment submission, Q&A, announcements, resources, reviews, gradebook, certificate. 15 screens.',
      status: 'live',
      tech: 'tailux + 13 question renderers',
      screens: 15,
    },
    {
      id: 'catalog',
      title: 'Course Catalog',
      description: 'Course browsing with search, category filter, sort. Course detail page with curriculum preview. Checkout page with coupon + price breakdown. 4 screens.',
      status: 'live',
      tech: 'tailux',
      screens: 4,
    },
    {
      id: 'quiz-builder',
      title: 'Quiz Builder',
      description: 'Standalone quiz editor with 25 settings fields, 13 question type editors, import/export, AI quiz generation. 5 screens.',
      status: 'live',
      tech: 'tailux',
      screens: 5,
    },
    {
      id: 'settings-pages',
      title: 'Settings',
      description: '14 settings sections: General, Course, Monetization, Design, Advanced, Legal, Gradebook, Email, Email Templates (54), Notifications, Authentication, Certificate, Accessibility, License.',
      status: 'live',
      tech: 'tailux',
      screens: 14,
    },
    {
      id: 'ecommerce',
      title: 'Ecommerce',
      description: 'Shopping cart, checkout with Stripe, coupon management, order history, instructor earnings + withdrawal. 6 screens. Backend: 15 API endpoints with real MongoDB persistence.',
      status: 'live',
      tech: 'tailux + Go API + MongoDB',
      screens: 6,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <LayoutGrid className="w-8 h-8 text-purple-500 shrink-0 mt-1" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">LMS SaaS — Live Frontend</h1>
          <p className="text-muted-foreground mt-1">
            {apps.length} apps · {apps.reduce((sum, a) => sum + a.screens, 0)} screens · all built with tailux template.
            Click any app to launch it full-screen. The Go backend is running on port 4290 with MongoDB Atlas — API calls go through the Next.js proxy.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          Backend: Live
        </Badge>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold text-blue-600 dark:text-blue-400">Architecture — How it works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2 rounded border bg-background">
              <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <div>
                <div className="font-medium">Tailux Frontend</div>
                <div className="text-muted-foreground">port 5173 → proxied via /api/tailux/*</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-background">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <div className="font-medium">Go Backend</div>
                <div className="text-muted-foreground">port 4290 → proxied via /api/lms/*</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-background">
              <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <div>
                <div className="font-medium">MongoDB Atlas</div>
                <div className="text-muted-foreground">cluster0.xuqtpg2.mongodb.net</div>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            Data flow: Preview URL → Next.js (3000) → Vite proxy (5173) → Tailux app calls /api/lms/* → Next.js proxy → Go backend (4290) → MongoDB Atlas
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((app) => (
          <Card key={app.id} className="border-purple-500/30 cursor-pointer hover:shadow-lg hover:border-purple-500/60 transition-all">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">● LIVE</Badge>
              </div>
              <h3 className="font-semibold text-base mb-1">{app.title}</h3>
              <p className="text-xs text-muted-foreground flex-1 mb-3 leading-relaxed">{app.description}</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Screens:</span>
                  <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600">{app.screens} screens</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tech:</span>
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400">{app.tech}</Badge>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={() => onLaunch(app.id)} className="flex-1" size="sm">
                  Launch <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                <a href={`/api/tailux/apps/${app.id}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4 text-xs space-y-2">
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">Test the API directly</div>
          <p className="text-muted-foreground">The Go backend is live and connected to MongoDB Atlas. You can test the API directly:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <a href="/api/lms/courses" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">GET</Badge>
              <code className="text-xs text-amber-600 dark:text-amber-400">/api/lms/courses</code>
              <span className="text-[10px] text-muted-foreground ml-auto">List all courses →</span>
            </a>
            <a href="/api/lms/categories" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">GET</Badge>
              <code className="text-xs text-amber-600 dark:text-amber-400">/api/lms/categories</code>
              <span className="text-[10px] text-muted-foreground ml-auto">List categories →</span>
            </a>
            <a href="/api/lms/tags" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">GET</Badge>
              <code className="text-xs text-amber-600 dark:text-amber-400">/api/lms/tags</code>
              <span className="text-[10px] text-muted-foreground ml-auto">List tags →</span>
            </a>
            <a href="/api/lms/notifications" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded border bg-background hover:bg-muted">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-[10px]">GET</Badge>
              <code className="text-xs text-amber-600 dark:text-amber-400">/api/lms/notifications</code>
              <span className="text-[10px] text-muted-foreground ml-auto">List notifications →</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
