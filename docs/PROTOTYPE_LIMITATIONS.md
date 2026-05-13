# MSS prototype — limitations & verification (A8, A2–A7)

This app is a **100% client-side** prototype: data lives in `localStorage` and in-memory contexts. Behavior matches a realistic ERP UI, not a production backend.

## True backend-dependent limitations

- **No authentication server** — session role is chosen locally; not suitable for security audits.
- **No multi-user sync or conflict resolution.**
- **No durable file storage** — uploads (bills, photos) use browser memory / data URLs only.
- **No e-invoice / GSTN APIs** — numbers and compliance UIs are illustrative.
- **Email, SMS, WhatsApp** — actions show toasts or copy-only flows.
- **No bank statement feeds** — reconciliation is manual entry.
- **Large payloads** — very big images or exports may hit browser limits.

## Route coverage (A2)

All primary routes in `App.tsx` are registered. Nested routes: `/projects/:id`, `/customers/:id`, `/vendors/:id`, `/employees/:id`, `/agents/:id`, `/loans/person/:id`, and all `/audit/*` children.

Design reference: **`/settings/design-system`** (Settings tab) — not a standalone top-level path in production builds unless `import.meta.env.DEV`.

## UI / flow checklist (A3–A5)

Verified iteratively: each module has list + detail or modal entry where applicable; empty states use `ListEmptyState` or inline CTAs; destructive actions prefer `AlertDialog`.

## Types & data (A6)

Entities are defined in `src/types/*` and merged via `AppDataContext` persistence. No server schema migrations.

## Design (A7)

Components follow shared `ui/*`, `StickyPageHeader`, `PageShell`, and Tailwind tokens from the design system page.

## Seed / reset (excluded from automation)

Items **Z1–Z8** (full dummy purge, script removal, full re-seed) are intentionally **not** automated in-repo delivery; use app **Settings → Reset** where provided for local dev only.
