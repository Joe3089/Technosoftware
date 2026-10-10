# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Next.js dev server at http://localhost:3000
npm run build      # Production build (.next/)
npm run start      # Serve the production build
npm run lint       # next lint
node --env-file=.env.local scripts/seed-admin.mjs   # Create/reset the admin user
```

There are no tests.

## Architecture

**Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3**, Spanish-language site for a tech agency. Backend is **Supabase** (auth + Postgres) and **Resend** (bulk email). Imports use the `@/` alias.

### Routes (`app/`)

| Route | Purpose |
|-------|---------|
| `/` | Public landing (hero, about, projects carousel, contact) |
| `/quienes-somos`, `/mision`, `/vision` | Info pages (share `components/sections/InfoPage.tsx`) |
| `/login` | Login / register / forgot-password tabs (`components/auth/`) |
| `/dashboard` | Protected area; panels depend on role |

### API routes (`app/api/`)

| Route | Access | Purpose |
|-------|--------|---------|
| `contacto` | public | Contact form → upserts into `clientes` (by email) |
| `clientes`, `clientes/[id]` | admin | CRUD over the `clientes` table |
| `emails/masivo` | admin | Bulk email via Resend; logs to `campanas_email` |

Use the helpers in `lib/api.ts` (`requireRole`, `json`, `isEmail`, `str`) in new routes.

### Auth & roles

- `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server, includes `getSessionProfile`).
- `middleware.ts` refreshes the session cookie and redirects unauthenticated `/dashboard` requests to `/login`. It is a no-op when the Supabase env vars are missing.
- `hooks/useAuth.ts` is the client hook (login/register/logout, Spanish error messages).
- The role (`admin` | `user`) lives in `public.profiles.role`. Schema and RLS are in `supabase/schema.sql`.
- Dashboard: `components/dashboard/DashboardLayout.tsx`; user panels are in `panels/`, admin-only panels (`ClientesPanel`, `CorreosPanel`) are in `panels/admin/`.

### Styling

- Design tokens are CSS variables in `app/globals.css`: a navy/blue/cyan palette, glassmorphism, and a 3-level type scale `--fs-title` / `--fs-subtitle` / `--fs-body`.
- Fonts are exposed as Tailwind families `font-display`, `font-ui` and `font-body`.
- UI primitives are shadcn-style components in `components/ui/` built on Radix.

### Security headers

`next.config.ts` sets the CSP, X-Frame-Options and related headers for every route. When adding an external service (script, image, API host), add it to the matching CSP directive or it will be blocked.

### Legacy

`src/`, `src_backup/`, the root `index.html` and `login.html`, `package.json.vite` and `vite.config.js.bak` are from the old Vite version. They are unused, so don't edit them.

## Environments

- **Env vars** live in Vercel; Supabase was provisioned through the Vercel Marketplace. Run `npx vercel@latest env pull` to refresh `.env.local`. This overwrites the file, so re-add `ADMIN_EMAIL`/`ADMIN_PASSWORD` afterwards.
- **Test/staging** uses Vercel preview deployments: `npx vercel@latest deploy --yes`. Each one gets a `*.vercel.app` URL.
- **Production** is `vercel deploy --prod`. Only do this when the user asks; there is no custom domain yet.
- **Resend** needs `RESEND_API_KEY`, `EMAIL_FROM` and a verified domain. It is not configured yet.
