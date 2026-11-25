# SudaFarm (Sudan Farmers)

This is a Vite monorepo template with shadcn/ui.
Backend uses Django and django-ninja, and frontend uses React with Tailwind CSS and shadcn/ui.

## Description
SudaFarm (Sudan Farmers) is a platform for Sudanese farmers.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
