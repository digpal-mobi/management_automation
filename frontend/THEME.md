# TaskPulse AI — Obsidian Pulse Theme Guide

Use this guide when adding or restyling frontend UI. Canonical tokens live in:

- `DESIGN.md` — design system reference
- `src/app/globals.css` — CSS custom properties
- `tailwind.config.ts` — Tailwind semantic color / radius mappings

## Do

- Prefer semantic Tailwind classes: `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-navigation`, `bg-hover`
- Use `text-tp`, `text-ts`, `text-tm` for primary / secondary / muted text
- Use `bg-accent text-canvas hover:bg-accent-hover` for primary actions
- Use `border-border` / `border-divider` for structure
- Use `rounded-button` (8px), `rounded-card` (10px), `rounded-modal` (12px)
- Use `success` / `warning` / `danger` (+ `-subtle`) sparingly for status
- Use `chart-1` … `chart-6` for multi-series analytics
- Keep portals/overlays on dark surfaces (`bg-elevated` / `bg-surface`)

## Don’t

- Hardcode legacy brand hex (`#003049`, `#669BBC`, `#F7F8FA`, white cards)
- Fill large panels with success/warning/danger
- Introduce a second parallel token system
- Force the home sidebar onto Kanban / Sprint Plan focused workspaces

## Layout shells

| Experience | Shell |
|------------|--------|
| Home / management | `AppShell` + left `Sidebar` (`bg-navigation`) + constrained main |
| Board / Sprint Plan | Focused full-width workspace (no app sidebar), top `Navbar` only |
| Auth (`/login`, `/register`) | Centered canvas, no chrome |

## Typography utilities

Defined in `globals.css`:

- `.text-page-title` — 24/32, 600
- `.text-section` — 18/24, 600
- `.text-card-title` — 14/20, 500
- `.text-body` / `.text-body-compact`
- `.text-label` / `.text-caption`

Fonts: Geist (sans) via `geist/font/sans`, JetBrains Mono via `next/font/google` as `--font-geist-mono`.

## Component checklist

New UI should inherit tokens from shared primitives in `src/components/ui/*` whenever possible (`Button`, `Input`, `Select`, `Card`, `Dialog`, `Badge`, etc.).
