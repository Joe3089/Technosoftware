# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install        # Install dependencies (only Vite 5.2)
npm run dev        # Dev server at http://localhost:3000 (auto-opens browser)
npm run build      # Production build → dist/
npm run preview    # Preview the production build locally
```

There are no test or lint scripts configured.

## Architecture

This is a **multi-page vanilla JS + Vite** frontend for a Spanish-language tech agency landing site. No framework, no backend, no API calls.

### Entry Points (all under `src/`)

| File | Purpose |
|------|---------|
| `index.html` | Public landing page (hero, about, projects, contact) |
| `login.html` | Auth page (login / register / forgot password tabs) |
| `dashboard.html` | Protected area shown after login |

Vite is configured with `root: "src/"` and multiple Rollup input entries for the three HTML files.

### CSS

All styles live in `src/css/`. Load order matters — `variables.css` must come first as it defines all design tokens (CSS custom properties for colors, fonts, spacing). `reset.css` follows. Other files are page/component-scoped.

The design system uses a navy/blue/cyan palette with glassmorphism effects (backdrop-filter, translucent backgrounds), 3D transforms, and four Google Font families: Bebas Neue, Rajdhani, Inter, Orbitron.

There is also a `src/styles/` directory with legacy CSS — treat it as stale; the canonical styles are in `src/css/`.

### JavaScript Modules (`src/js/`)

| File | Responsibility |
|------|---------------|
| `navbar.js` | Scroll-driven active link highlighting; exports functions consumed by `main.js` |
| `animations.js` | Floating particle system and scroll-reveal effects |
| `main.js` | Orchestrates navbar + animations + contact form validation for the landing page |
| `login.js` | Tab switching, password visibility toggle, client-side form validation |
| `loader.js` | Global loading spinner singleton |
| `contact.js` | Leaflet map (loaded via CDN), geolocation, reverse geocoding, event calendar |

Authentication is simulated — `sessionStorage` tracks login state; there is no real backend.

### External Dependencies (CDN, not npm)

- **Leaflet** — map on the contact section
- **Google Fonts** — typography

### Security Headers

`index.html` includes `<meta>` CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. Keep these intact when modifying the `<head>`.
