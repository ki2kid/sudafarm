# SudaFarm

Turborepo monorepo (pnpm). Frontend: apps/web (Vite, React, shadcn/ui, Tailwind).
Backend: apps/api (Django + django-ninja, uv). Docker Compose at the root.

- The site is Arabic-first and RTL. Use logical Tailwind classes (ms-, me-, ps-, pe-, start-, end-), never ml-/mr-/left-/right-.
- Never hardcode API URLs. Call `/api/...` (Vite proxy in dev, nginx in Docker).
- Django settings come from environment variables. Never commit .env.
- After changing a ninja Schema, regenerate the TypeScript types (`pnpm generate` in packages/api-client).
