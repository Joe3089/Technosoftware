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
| `/` | Public landing (hero, about, projects carousel, contact). Public pages live in `app/(public)/` (route group, URLs unchanged) |
| `/quienes-somos`, `/mision`, `/vision` | Info pages (share `components/sections/InfoPage.tsx`) |
| `/login` | Login / register / forgot-password tabs (`components/auth/`) |
| `/dashboard` | Client area (role «usuario», `app/(cliente)/dashboard`); panels depend on role. Staff (non-admin) are redirected to `/dashboard/inicio` |
| `/dashboard/<módulo>` | Internal management (staff only, `app/(management)/dashboard`): inicio, planificacion, proyectos, contactos, clientes, empleados, crm, contabilidad, estadisticas, soporte, configuracion. Clients are redirected to `/dashboard`. Old `/gestion/*` URLs redirect here. See `docs/gestion.md` |

### API routes (`app/api/`)

| Route | Access | Purpose |
|-------|--------|---------|
| `contacto` | public | Contact form → upserts into `clientes` (by email) |
| `clientes`, `clientes/[id]` | admin | CRUD over the `clientes` table |
| `emails/masivo` | admin | Bulk email via Resend; logs to `campanas_email` |
| `perfil` (GET/PUT), `perfil/avatar` (POST) | user | Personal data (`profiles.datos`) and photo (private `avatars` bucket, signed URLs, magic-byte validation) |
| `actividad` | user (admin: `?usuario=`) | Paginated audit history; POST only accepts `cierre_sesion` |
| `billetera` | user (admin: `?usuario=`) | Wallet computed from the `movimientos` ledger (`lib/billetera.ts`) |
| `proyectos` (GET) | user (admin sees all + client) | Paginated list; `grupo` = por_iniciar / iniciados / en_proceso / culminados / cancelados / activos (`lib/proyectos.ts`) |
| `proyectos` (POST), `proyectos/[id]` (PATCH/DELETE), `proyectos/[id]/observaciones`, `movimientos` | admin | Projects, tracking fields, immutable observations, ledger entries (`registrar_movimiento()`) |
| `recargas`, `recargas/[id]` | user | PayPal top-ups: create order → on return the server reconciles with PayPal (`lib/recargas.ts`) |
| `webhooks/paypal` | PayPal (signature verified) | Re-queries the order and credits idempotently via `acreditar_recarga()` |
| `consultorias`, `solicitudes-proyecto` | user | Requests (+ optional linked meeting in `reuniones`); validation in `lib/solicitudes.ts`, insert + rollback in `lib/solicitudes-server.ts` |
| `adjuntos` (POST), `adjuntos/[id]` (GET) | owner / admin | Attachments in private `adjuntos` bucket (signature-checked, 4 MB, max 5); download via signed URL |
| `admin/solicitudes` | admin | Review requests/meetings and change their status |
| `metodos-pago`, `metodos-pago/[id]` | user (available only) / admin (configure) | Unified gateway catalog (`lib/pagos.ts`): PayPal = API; Zelle, Binance Pay, AirTM, Pago Móvil, Mercantil Panamá = reported payment + admin verification |
| `admin/recargas`, `admin/recargas/[id]` | admin | Verify reported payments: approve (credits via `acreditar_recarga()`, idempotent) or reject; view receipt |
| `proyectos/[id]/contratacion` (GET) | owner / admin | Budget, contract, final meeting and survey state of a project |
| `proyectos/[id]/presupuesto` | admin (PUT) / owner (POST aprobar·rechazar) | Budget; an approved budget can't be replaced and unlocks the contract |
| `proyectos/[id]/contrato` | admin (issue PDF, verificar·rechazar_firma) / owner (aprobar → descargar → upload signed) | Contract flow in `contratos`; files in private `adjuntos` bucket; verifying it marks the client `fijo` |
| `proyectos/[id]/encuesta` | owner | Mandatory service survey, only after `reunion_final_at`; optional review → `resenas` (pendiente) |
| `resenas` (GET public / `?todas=1` admin), `resenas/[id]` (PATCH) | public / admin | Published reviews (landing + app); admin moderates |
| `resumen` | user (admin: all, via RLS) | Dashboard home numbers, recent projects, next meeting |
| `tasas` | public | VES rates: BCV USD/EUR (bcv.org.ve with the missing Sectigo intermediate in `lib/certs.ts`, fallback ve.dolarapi.com) + Binance P2P USDT; 60 s cache (`lib/tasas.ts`) |
| `asistente` | public | AI chat «Techno» (`lib/asistente.ts` knowledge; signed-in users also get their own payments/balance via `lib/asistente-contexto.ts` (RLS); `lib/asistente-modelo.ts` free-first chain Gemini → Groq → AI Gateway) |
| `admin/recargas/[id]/conciliar` | admin | AI reconciliation of an APPROVED top-up (`lib/conciliacion.ts`): ledger credit, amount, client, unique reference, BCV-rate difference + AI note. Runs automatically with `after()` when the admin approves. The AI never verifies or approves payments |
| `traducir` | public | Automatic UI translation (en-US, en-GB, pt-BR, pt-PT, it) cached once per text in `traducciones`; MyMemory rows are provisional |

**Contracting rules** (`lib/contratacion.ts`, migration 006): budget → contract (approve, download, upload signed, admin verifies) → final meeting → survey. A DB trigger blocks `estado = completado` without final meeting and survey. Prospects get **one free consultation** (`consultorias.gratuita`, `proyecto_id` null); the rest need an active project. Dashboard panels accept deep links `/dashboard?panel=<id>`.

**Meetings** store `fecha_hora` (UTC instant) + `zona_horaria` (IANA); they are always `pendiente_confirmacion` until an admin confirms (no calendar integration). Location: `components/dashboard/solicitudes/UbicacionPicker.tsx` uses Google Maps + Places when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set, otherwise Leaflet + OpenStreetMap/Nominatim; geolocation only on explicit click; manual address always allowed.

**Payments:** the balance is credited only from a COMPLETED PayPal capture (never from the return URL); `recargas.capture_id` is unique and `acreditar_recarga()` locks the row, so a top-up can't be credited twice. Project dates are stamped by a DB trigger on real state changes (never from `created_at`).

**Audit:** log events server-side with `registrarActividad()` (`lib/actividad.ts`), never with values of personal data. Logins are logged by a trigger on `auth.sessions`.

Use the helpers in `lib/api.ts` (`requireRole`, `json`, `isEmail`, `str`) in new routes.

### Internal management (`/dashboard/<módulo>`, migrations 010–011)

Full docs: `docs/gestion.md`. Key rules:
- Access = the single admin (`profiles.role='admin'`, unique index) or an **active** row in `empleados` linked by `profile_id`. Public sign-up only creates clients (role «usuario»); the admin or the Talento coordinator links accounts (`/api/gestion/personal/[id]/acceso`).
- Roles (`empleados.rol_sistema`): admin_general (only the admin's own account), comercializacion, finanzas, talento, devops, consultoria, legal; plus `es_coordinador`. Permissions = role grants + coordinator grants (`asignaciones_permiso.sujeto_tipo='coordinador'`, per role or `*`) + department + cargo + per-employee overrides; defaults in `supabase/seed/011_roles.sql`. Consultoría has `tareas.asignar` (assign tasks to any employee, e.g. DevOps, in its projects); Talento coordinators have `empleados.asignar_rol`. Helpers live in the unexposed `app` schema (`app.tiene_permiso()`, `app.asigna_tarea()`…); the app reads them via `rpc('gestion_contexto')` in `requireStaff()` (`lib/permissions`).
- Generic CRUD: `app/api/gestion/[recurso]` exposes only tables registered in `lib/services/recursos.ts` (select/embeds, filters, Zod schemas, delete mode). Add a table there instead of writing a new route. Always use the session client so RLS applies; self-referencing embeds use the column (`padre:padre_id(...)`), others the FK name.
- UI: `components/management/` (shell, `RecursoTabla`, `Formulario`, `SelectorRef`, home `Widgets`), `components/planning/` (activities, Trello-style board with `TarjetaRapida`, calendar, detail), `components/gantt/`, `components/shared/` (`Adjuntos`, `Historial`). No extra deps: board = native DnD, gantt/calendar/charts are hand-written.
- DB triggers own the rules: audit log (`auditoria`, field names only for personal/free text), immutable invoice payments and finance records (annul only), no dependency cycles, only managers reassign tasks, notifications. Offboarding goes through `public.desvincular_empleado()` + Auth ban; history is kept.

### Auth & roles

- `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server, includes `getSessionProfile`).
- `middleware.ts` refreshes the session cookie and redirects unauthenticated `/dashboard` requests to `/login`. It is a no-op when the Supabase env vars are missing.
- `hooks/useAuth.ts` is the client hook (login/register/logout, Spanish error messages).
- The role (`admin` | `user`) lives in `public.profiles.role`. Schema and RLS are in `supabase/migrations/schema.sql` plus `002_perfil_actividad_billetera.sql` and `003_recargas_proyectos.sql`, `004_consultorias_solicitudes.sql`, `005_metodos_pago.sql`, `006_contratacion_encuesta_resenas.sql`, `007_traducciones.sql`, `008_seguridad.sql`, `009_conciliacion_pagos.sql`, `010_gestion_empresarial.sql`, `011_roles_sistema.sql`, `012_historial_areas.sql` (run in order), all in `supabase/migrations/`; then `supabase/seed/011_roles.sql`.
- Dashboard: `components/dashboard/DashboardLayout.tsx`; user panels are in `panels/`, admin-only panels (`ClientesPanel`, `CorreosPanel`) are in `panels/admin/`.

### Styling

- Design tokens are CSS variables in `app/globals.css`: a navy/blue/cyan palette, glassmorphism, and a 3-level type scale `--fs-title` / `--fs-subtitle` / `--fs-body`.
- Fonts (`app/layout.tsx`): `font-display` = Bebas Neue (landing titles), `font-ui`/`font-body` = Plus Jakarta Sans, `font-brand` = Sora (brand name).
- Logos: `public/logo-icon.png` (bubble only) and `public/logo-full.png` (cropped, star-free) are derived from `public/logo.png`.
- UI primitives are shadcn-style components in `components/ui/` built on Radix.

### i18n

The source language is Spanish. `components/i18n/IdiomaProvider.tsx` translates the rendered DOM in place (text nodes + placeholder/title/aria-label/alt) and restores it when switching back. Put `translate="no"` on anything that must not be translated or that changes constantly (amounts, codes, clocks, streaming text). The clock (`SelectorIdioma.tsx`) shows the time zone of the selected language's region.

### Security headers

`next.config.ts` sets the CSP, X-Frame-Options and related headers for every route. When adding an external service (script, image, API host), add it to the matching CSP directive or it will be blocked. Production CSP has no `'unsafe-eval'`; HSTS and COOP are on; `/api/*` defaults to `Cache-Control: private, no-store`.

`middleware.ts` rejects state-changing `/api` requests from another origin (CSRF); `/api/webhooks/*` is exempt (signature-verified). Public write endpoints use the `permitido()` limiter (`lib/asistente.ts`); the contact form also has a honeypot and a minimum fill time. Dependency overrides in `package.json` pin patched `postcss`/`postcss-selector-parser` — keep `npm audit --omit=dev` at 0.

### Legacy

`src/`, `src_backup/`, the root `index.html` and `login.html`, `package.json.vite` and `vite.config.js.bak` are from the old Vite version. They are unused, so don't edit them.

## Environments

- **Env vars** live in Vercel; Supabase was provisioned through the Vercel Marketplace. Run `npx vercel@latest env pull` to refresh `.env.local`. This overwrites the file, so re-add `ADMIN_EMAIL`/`ADMIN_PASSWORD` afterwards.
- **Test/staging** uses Vercel preview deployments: `npx vercel@latest deploy --yes`. Each one gets a `*.vercel.app` URL.
- **Production** is `vercel deploy --prod`. Only do this when the user asks; there is no custom domain yet.
- **Resend** needs `RESEND_API_KEY`, `EMAIL_FROM` and a verified domain. It is not configured yet.
- **Google Maps** (optional) needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (browser key restricted by HTTP referrer, with Maps JavaScript API, Places API (New) and Geocoding API enabled). Without it the OpenStreetMap fallback is used.
- **PayPal** needs `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` (see `.env.local.example`). Not configured yet; the top-up button stays disabled until they exist.
