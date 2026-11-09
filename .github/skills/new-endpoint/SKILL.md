---
name: new-endpoint
description: Add a new feature across the Django API and the Vite frontend
disable-model-invocation: true
---
Add a feature called ${input:feature}.
1. Create the Django model and migration.
2. Add a django-ninja Schema and endpoint.
3. Regenerate the TypeScript types.
4. Build the shadcn page that uses it, following the RTL rules.