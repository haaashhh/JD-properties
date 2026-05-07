---
name: jd-dashboard-builder
description: >
  Full-stack developer skill for building "Properties by JD," a Next.js + Supabase real estate dashboard. Trigger when writing code for this project: React components, server actions, Supabase queries, Tailwind styling, Recharts data visualizations, file uploads, drag-and-drop Kanban boards, form handling, or any implementation task. Contains component recipes, styling tokens, Supabase client patterns, form/validation patterns, and module-specific code guides for the deal analyzer, pipeline board, budget tracker, QuickBooks transaction mapper, and design board gallery. Use alongside jd-platform-architect for schema and structure. Read references/00-index.md FIRST.
---

# JD Dashboard Builder — Full-Stack Implementation Skill

You are the hands-on developer building **Properties by JD**. The architect skill defines WHAT to build (schema, routes, structure). This skill defines HOW to write the code — component patterns, styling, data fetching, form handling, and module-specific recipes.

## How To Use This Skill

1. **Read `references/00-index.md`** to route to the right reference.
2. When implementing a feature, find its recipe in `module-recipes.md` first.
3. Follow patterns in `ui-patterns.md` for all visual components.
4. Follow patterns in `supabase-patterns.md` for all data operations.
5. Follow patterns in `form-patterns.md` for all user input.

## Golden Rules

0. **Next.js 16 specifics (mandatory).** `params` and `searchParams` are `Promise<...>` — always `await` them. `cookies()` and `headers()` are async. The auth gate is `src/proxy.ts` (NOT `middleware.ts`) and it exports a `proxy` function on the Node.js runtime (the edge runtime is unsupported in proxy). Use the React 19 `useActionState` hook for server-action wiring (replaces the legacy `useFormState`).

1. **Server components by default.** Only add `'use client'` when the component needs useState, useEffect, onClick, onChange, or browser APIs. If you're reaching for `'use client'` just to pass props, you're doing it wrong — restructure so the server component fetches data and passes it to a thin client component.

2. **No custom CSS files.** Everything is Tailwind utilities. Use `cn()` from `lib/utils` for conditional classes. Use CSS variables from shadcn/ui theme for colors.

3. **Currency is always cents internally.** Store as `BIGINT` in DB, pass as `number` in TypeScript, only format to dollars in the UI layer using `formatCurrency()`. Never do math on formatted strings.

4. **Colocation.** Server actions live next to the page that uses them (`actions.ts` sibling to `page.tsx`). Types specific to a module live in that module's directory. Shared types go in `src/types/`.

5. **Errors are user-visible.** Every mutation must handle errors gracefully — show a toast, not a console.log. Use shadcn/ui `sonner` (toast) for feedback.

6. **Loading states everywhere.** Every page has a `loading.tsx` sibling using skeleton components. Every async action shows a spinner on the button.

7. **Realtime ≠ `router.refresh()`.** Use `useSupabaseChannel({ table, filter })` from `src/hooks/use-supabase-channel.ts`; it merges per-row events into the Zustand store at `src/lib/stores/realtime-store.ts`. Reserve `router.refresh()` for auth-state and org-switch transitions only.

8. **No Prisma.** Migrations live in `supabase/migrations/*.sql`; types come from `npm run types:db` (`supabase gen types typescript --linked > src/types/database.ts`). Both server and browser Supabase clients are typed with the generated `Database` type.

## Reference Files

| File | When to read |
|------|-------------|
| `ui-patterns.md` | Building any visual component, styling, layout, charts, tables, the dashboard aesthetic |
| `supabase-patterns.md` | Any data operation: fetching, mutations, real-time subscriptions, file uploads, auth |
| `form-patterns.md` | Any user input: forms, validation, server actions, optimistic updates |
| `module-recipes.md` | Implementing a specific feature (deal form, kanban, budget table, QB mapper, design gallery) |
