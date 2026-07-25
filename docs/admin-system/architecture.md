# Orbmare Admin Architecture

## Decision

**Same repository, shared Postgres, Express admin SPA** (Structure A adapted to the current stack).

Do **not** introduce a Next.js monorepo at this stage. The storefront is static HTML/JS; the ops console already exists at a private route. Rewriting would risk Stripe/checkout/SEO regressions without accelerating MVP.

```text
orbmare.com          → storefront (web/) + public APIs
admin.orbmare.com    → admin SPA at / (Host mount)
ADMIN_ROUTE (optional secret path on apex) → same admin SPA (defense in depth)
```

## Shared vs separated

| Concern | Shared | Separated |
|---------|--------|-----------|
| Postgres | Yes | — |
| Product / inventory / order models | Yes (`product-store`, repos) | — |
| Validation rules | Yes (server services) | — |
| Editorial CSS tokens | Visual reference only | Admin has own denser CSS |
| Sessions / cookies | — | `orbmare_ops_session` ≠ buyer/seller |
| Deploy process | Same Node service | Different Nginx `server_name` |

## Layering

```text
UI (web/admin)
  → Admin HTTP API (admin-router)
    → Validation
    → Authorization (RBAC permissions)
    → Service (product-store, content-store, media-store, order-store)
      → Repository / JSON fallback
        → PostgreSQL
```

Rules:

- No direct SQL from the browser.
- Every mutating route: session + CSRF + same-origin + permission.
- Mass assignment prevented by explicit normalize functions.
- Complex writes use `withTransaction`.

## Module map (MVP)

| Module | Server | UI section |
|--------|--------|------------|
| Auth / session | `admin-auth.js` | Login |
| RBAC | `rbac.js`, `db/rbac-repo.js` | Team |
| Products | `product-store.js` | Products |
| Media | `media-store.js` | Media |
| Brands / Materials / Countries | `content-store.js` | Catalog entities |
| Orders | `order-store.js` | Orders |
| Audit | `audit-store.js` | Activity |
| Site content | `site-content-store.js` | Content (basic) |
| Public read | `index.js` APIs | Storefront |

## Editorial + shop dual channel

Products carry `channel: "shop" | "editorial"`.

- Shop → `/api/catalog`, `/shop/`
- Editorial → `/api/editorial-catalog`, countries / discover / editorial PDP

Both channels share inventory/lifecycle machinery. Editorial rows are no longer auto-purged.

## Preview strategy (MVP → later)

MVP: “Open storefront” links + draft-only visibility in admin lists.

Later: signed preview token route that renders storefront templates with draft payload (reuse storefront JS, do not fork PDP markup).

## AI content optimization

Implemented under `server/ai/*` + `web/admin/ai/*`. Admin API: `GET/POST {ADMIN_ROUTE}/api/ai/*` (CSRF + `ai_content_optimize`). OpenAI Responses API runs server-side only; suggestions apply to form state — user must still Save. No auto-publish. Details: `docs/AI_CONTENT_OPTIMIZATION.md`.

## Why this scales to the full brief

Phases 4–8 (block CMS, suppliers, approval graphs, analytics) plug into the same routers/tables without relocating the storefront.
