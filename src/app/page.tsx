import { redirect } from 'next/navigation'

/**
 * Root page — redirects to the SaaS application (tailux frontend).
 *
 * The LMS SaaS is now the main application. The spec engine (planning tool)
 * is still available at /spec.
 */
export default function RootPage() {
  redirect('/api/tailux/')
}
