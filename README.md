# shadcn/ui monorepo template

This is a Vite monorepo template with shadcn/ui.
I'm using django and django-ninja for backend and react with tailwind and shadcn for frontend. 

## Description
This project which I named ISNADho or ISNAD hospital operations شركة تشغيلية للمستشفيات. is an application for my company. that I will convince hospitals managers to buy it because it will manage thier medical devices. I'm a biomedical engineer and I really look forward to extract very meaningful data from this program to show to hospital manager and how this program would improve the hospital income and device life. the application should take care of managing devices including preventive maintenance and corrective maintenance, keep track of working time and stoppage time. and device models performances. which ones fits better. and an easy way to contact the suppliers. also to keep track of financial spend on devices to keep them working in details. and a way to make reporting problems to the company more easier.


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
