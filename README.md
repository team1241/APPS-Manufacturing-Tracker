# Next.js template

A starter app with Next.js App Router, TypeScript, Tailwind CSS v4, and shadcn/ui (Radix). Includes a responsive component demo and light/dark themes that follow your system preference by default.

## Run locally

Use Node.js 24 LTS (see `.nvmrc`) and npm.

```bash
nvm use
npm ci
npm run dev
```

Open [localhost:3050](http://localhost:3050). Both `npm run dev` and `npm start` use port 3050 by default.

## Commands

```bash
npm run dev        # Development server
npm run build      # Production build (includes type checking)
npm start          # Serve the production build
npm run typecheck  # Generate route types and check TypeScript
npm run lint       # ESLint
```

If your environment prevents Turbopack from opening local compiler ports, use `npm run build -- --webpack` for the production build. This starter uses Tailwind's standard PostCSS plugin with either bundler.

## Customize

- `src/app/page.tsx`: starter homepage (Server Component).
- `src/app/layout.tsx`: root layout, metadata, and theme provider.
- `src/app/globals.css`: Tailwind imports and light/dark theme tokens.
- `src/components/ui/`: editable shadcn/ui components.
- `src/components/component-demo.tsx`: interactive examples (Client Component).
- `src/lib/utils.ts`: `cn()` helper for merging Tailwind classes.
- `components.json`: shadcn CLI settings and import aliases.

The demo includes Button, Badge, Card, Dialog, Input, Label, Separator, Switch, and Tabs. Its form and project dialog use in-memory state that resets on refresh; there is no backend or database. Theme selection persists in the browser through `next-themes`.

Add more components with the official CLI:

```bash
npx shadcn@latest add select table dropdown-menu
```

Imports use the `@/` alias for `src/`. System fonts keep development and builds independent of external font services. Tailwind v4 uses CSS configuration in `globals.css`, so a `tailwind.config.js` file is not required.

Documentation: [Next.js](https://nextjs.org/docs), [Tailwind CSS](https://tailwindcss.com/docs), [shadcn/ui](https://ui.shadcn.com/docs).

## Dependency audit

At setup, `npm audit` reported 12 advisories (2 low, 10 moderate) in shadcn CLI and TypeScript/ESLint dependency chains. `npm audit fix` did not resolve them with compatible upgrades. Breaking downgrades and forced dependency overrides have not been applied. Review the current report before production use.
