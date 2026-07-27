# Tailux Customizations

These files are customizations applied to the tailux template at
`/home/z/my-project/repos/tailux/tailux-main/`. They are copied here so they
are tracked in git (the `repos/` directory is gitignored).

## Files

- `apps/course-builder/index.tsx` — Complete Course Builder app with all 6 modals
  (Lesson, Quiz, Assignment, AI Generator, Question Preview, Content Bank),
  built with REAL tailux components (Button, Input, Card, Switch, Checkbox,
  Upload from @/components/ui, Dialog/Transition/Menu from @headlessui/react)
- `router.tsx` — Modified to detect proxied mode (basename /api/tailux when
  window.location.pathname starts with /api/tailux/)
- `vite.config.ts` — Added server.hmr config so WebSocket connects to
  localhost:5173 (real Vite port) instead of localhost:3000 (proxy port)
- `auth-Provider.tsx` — DEV: bypassed auth (isAuthenticated: true in initial
  state, init() commented out) so course builder is accessible without login
- `apps-nav.ts` — Added "Course Builder" nav item under Apps
- `icons.ts` — Added icon mapping for course-builder
- `protected-routes.tsx` — Added lazy-loaded route /apps/course-builder
- `en-translations.json` — Added translation key for course-builder

## How to apply

If the tailux repo is lost, copy these files back to their corresponding
locations in `/home/z/my-project/repos/tailux/tailux-main/src/...`.
