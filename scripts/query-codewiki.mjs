// Query codewiki.google about lastsaas — ask the Gemini agent how to build an LMS on it
import { CodeWikiClient } from '../repos/codewiki-mcp/dist/index.js'

const client = new CodeWikiClient({ timeoutMs: 60000, maxRetries: 3 })
const REPO = 'jonradoff/lastsaas'

const questions = [
  // Q1: Overall architecture — how to add a new module
  `I'm building a Tutor LMS Pro-style LMS SaaS on top of lastsaas. I need to add a new "course" module under backend/internal/lms/course/. 

What's the exact pattern for creating a new module in lastsaas? Show me:
1. The file structure (handlers.go, service.go, repository.go, models.go)
2. How to register routes in cmd/server/main.go (the exact code pattern for adding a new subrouter)
3. How the existing modules (like plans, tenants) are structured so I can mirror them`,

  // Q2: MongoDB schema + collections
  `I need to add ~40 new MongoDB collections to lastsaas for my LMS (course, lesson, quiz, enrollment, order, certificate, etc.).

How does lastsaas handle MongoDB schema management? Show me:
1. The exact file and function where collections are defined (schema.go?)
2. How to add a new collection with JSON schema validation
3. How indexes are created
4. The pattern for the MongoDB struct and its accessor methods`,

  // Q3: Events system
  `I need to emit and subscribe to events in my LMS modules (e.g. course.published, lesson.completed, order.paid).

How does the events.Emitter work in lastsaas? Show me:
1. The events package structure
2. How to emit a new event
3. How to subscribe to an event from another module
4. The exact code pattern`,

  // Q4: Middleware — auth, RBAC, entitlements
  `I need to add new RBAC roles (instructor, student) and new entitlement keys (lms.certificates, lms.quizzes, etc.) to lastsaas.

How does the middleware work? Show me:
1. Where RBAC roles are defined
2. How middleware.RequireRole works
3. How middleware.RequireEntitlement works
4. Where entitlement keys are stored (in the plans collection?)
5. The exact code pattern for adding a new role and a new entitlement`,

  // Q5: Stripe integration
  `I need to handle course purchases (one-time payments) and subscription plans (recurring payments) using Stripe.

How does the Stripe integration work in lastsaas? Show me:
1. The stripe package structure
2. How stripe.Service.CreateCheckoutSession works
3. How Stripe webhooks are handled
4. The stripe_mappings collection — what does it map?
5. How I can reuse this for course purchases and subscription plans`,

  // Q6: Frontend structure
  `I'm replacing the lastsaas frontend with a tailux React template. I need to understand the existing frontend structure so I can adapt it.

How is the lastsaas frontend organized? Show me:
1. The src/ directory structure
2. How the API client (src/api/client.ts) works — token refresh, request queuing
3. How routes are defined in App.tsx
4. How auth state is managed (React Contexts)
5. How branding/tenant theming works`,

  // Q7: Configuration + configstore
  `I need to add per-tenant configuration for my LMS (video source preferences, completion thresholds, AI settings, etc.).

How does the configstore work in lastsaas? Show me:
1. The configstore package structure
2. How config vars are stored in MongoDB
3. How the in-memory cache works
4. How to add a new config var
5. How dynamic reloading works`,

  // Q8: Multi-tenancy
  `My LMS is multi-tenant — each school is a tenant. I need to understand how lastsaas handles multi-tenancy so I can extend it.

How does multi-tenancy work in lastsaas? Show me:
1. How tenant_id is extracted from requests (middleware?)
2. How the tenant_memberships collection works
3. How tenant-scoped queries are enforced
4. The tenant model — what fields does it have?
5. How invitations work`,

  // Q9: Background jobs / scheduled tasks
  `I need background jobs for content drip scheduling, subscription dunning, certificate reissuance, and daily report aggregation.

Does lastsaas have any background job system? If not, what's the best way to add one given the existing architecture? Show me:
1. Any existing goroutine patterns
2. How the leader_lock collection works (for distributed job execution)
3. How daily_metrics are collected
4. The pattern I should follow for a job runner`,

  // Q10: Deployment + Docker
  `I need to deploy my LMS SaaS. How is lastsaas deployed?

Show me:
1. The Dockerfile structure
2. The fly.toml configuration
3. How the Go binary serves the React SPA
4. Environment variables needed
5. How static files are served`,
]

async function main() {
  const results = []
  
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    console.log(`\n${'='.repeat(80)}`)
    console.log(`QUESTION ${i + 1}/${questions.length}`)
    console.log(`${'='.repeat(80)}`)
    console.log(q.substring(0, 100) + '...')
    
    try {
      const history = results.map((r, idx) => ({
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: r.answer.substring(0, 500),
      }))
      
      const { data, meta } = await client.askRepository(REPO, q, history)
      console.log(`\nANSWER (${meta.totalBytes} bytes, ${meta.totalElapsedMs}ms):`)
      console.log(data.substring(0, 2000))
      console.log(data.length > 2000 ? `... (${data.length} total chars)` : '')
      
      results.push({ question: q, answer: data, meta })
    } catch (err) {
      console.error(`ERROR: ${err.message}`)
      results.push({ question: q, answer: `ERROR: ${err.message}`, meta: null })
    }
    
    // Small delay between questions
    if (i < questions.length - 1) {
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  
  // Save all results
  const fs = await import('fs')
  const outputPath = '/home/z/my-project/notes/codewiki-lastaas-answers.json'
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n\nAll answers saved to ${outputPath}`)
  
  // Also save as markdown
  let md = '# Codewiki Q&A: Building LMS SaaS on lastsaas\n\n'
  md += `Source: codewiki.google/github.com/${REPO}\n`
  md += `Date: ${new Date().toISOString()}\n`
  md += `Questions: ${questions.length}\n\n---\n\n`
  
  for (let i = 0; i < results.length; i++) {
    md += `## Q${i + 1}: ${results[i].question.substring(0, 80)}...\n\n`
    md += `**Question:**\n${results[i].question}\n\n`
    md += `**Answer:**\n${results[i].answer}\n\n`
    if (results[i].meta) {
      md += `*(${results[i].meta.totalBytes} bytes, ${results[i].meta.totalElapsedMs}ms)*\n\n`
    }
    md += `---\n\n`
  }
  
  const mdPath = '/home/z/my-project/notes/codewiki-lastaas-answers.md'
  fs.writeFileSync(mdPath, md)
  console.log(`Markdown saved to ${mdPath}`)
}

main().catch(console.error)
