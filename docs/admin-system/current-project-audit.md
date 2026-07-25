# Orbmare Current Project Audit

- **Status:** Complete (Phase 0)
- **Date:** 2026-07-24
- **Scope:** Storefront, ops console, database, APIs, deployment
- **Verdict:** Extend the existing Express + vanilla admin stack; do not rewrite as Next.js

---

## 1. Current tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Storefront | Static HTML/CSS/JS under `web/` | No React/Next/Vue |
| Design system | `web/shared/css/editorial.css` + Cormorant Garamond / Noto Sans SC | Editorial luxury tokens |
| Backend | Node.js (ESM) + Express 4 | `server/index.js` |
| Payments | Stripe PaymentIntents + webhook | `server/stripe/payments.js` |
| Database | PostgreSQL 16 (`pg`) optional | Falls back to JSON files when `DATABASE_URL` empty |
| ORM | None — hand-written SQL repos | `server/db/*-repo.js` |
| Auth (admin) | Custom scrypt + session cookie | `orbmare_ops_session`, CSRF, login throttle |
| Auth (buyer/seller) | Custom portal sessions | `orbmare_buyer_session` / seller cookie |
| Uploads | Multer → local `web/assets/uploads/` | Site content images only today |
| Deploy | Vultr + Nginx + PM2 (primary); Railway config present | Domain `orbmare.com` |
| Package manager | npm | Single package, not a monorepo |

**Not present:** Next.js, Auth.js, Clerk, Prisma/Drizzle, Tailwind, React admin UI, Vercel-first architecture.

---

## 2. Directory structure (relevant)

```text
.
├── server/
│   ├── index.js              # Static + public APIs + mounts
│   ├── admin-auth.js         # Ops login / session / CSRF
│   ├── admin-router.js       # Protected ops API + SPA
│   ├── product-store.js      # Catalog source of truth (DB or JSON)
│   ├── order-store.js
│   ├── audit-store.js
│   ├── site-content-store.js # Partial CMS (JSON)
│   ├── editorial-map.js      # Editorial JSON ↔ store mapping
│   ├── portal-auth.js / buyer-router.js / seller-router.js
│   ├── db/migrations/001_init.sql, 002_seller_ownership.sql
│   └── runtime-data/         # Dev JSON fallback
├── web/
│   ├── index.html            # Editorial home
│   ├── countries/ materials/ designers/ discover/ journal/ …
│   ├── shop/ product/ checkout/   # 3D print shop + PDP + Stripe
│   ├── admin/                # Existing ops SPA (hidden route)
│   ├── auth/ seller/         # Buyer / seller portals
│   └── shared/{css,js,data}
├── scripts/                  # migrate, hash password, security tests
├── docs/                     # Governance + this admin-system folder
└── docker-compose.yml        # Local Postgres 16
```

---

## 3. Data flow

### 3D print shop catalog

```text
Admin/Seller write → product-store → Postgres `products`+`inventory`
                                  → (fallback) runtime-data/catalog.json
Storefront read   → GET /api/catalog → load-catalog.js
Checkout          → re-reads server product (never trusts browser prices)
```

### Editorial curated catalog (Japan / Italy / China)

```text
TODAY (hardcoded / static):
  web/shared/data/orbmare-catalog.json
       → loadEditorialJsonProducts()
       → GET /api/editorial-catalog
       → catalog-editorial.js → country / discover / PDP

DB products table currently holds ONLY shop channel (metal/toys/portrait).
purgeNonPrintCatalog() deletes editorial rows if they appear in DB.
```

### Site copy (partial CMS)

```text
site-content-store.js (JSON)
  ← public GET /auth/api/content
  ← admin PATCH via buyer portal session role=admin
```

### Materials deep pages

```text
web/shared/data/material-details.json (+ material-intelligence.json)
  ← material-detail.js fetch (static file, not admin-managed)
```

---

## 4. Database entities (existing)

| Table | Purpose |
|-------|---------|
| `users` | buyer / seller / admin identities |
| `sessions` | purpose-scoped sessions |
| `products` | id, collection, lifecycle_status, price_cents, JSONB payload |
| `inventory` + `inventory_movements` | stock modes & ledger |
| `orders` + `order_items` | commerce + shipment JSON |
| `stripe_webhook_events` | idempotency |
| `audit_events` | ops audit trail |
| `seller_profiles` | seller pavilion metadata |
| `schema_migrations` | migration bookkeeping |

**Live local snapshot (2026-07-24):** 186 shop products, 0 orders, 1 admin / 1 buyer / 1 seller.

Lifecycle today: `draft | published | archived` only.

---

## 5. Storefront module inventory

| Path | Role | Data source |
|------|------|-------------|
| `/` | Editorial home | HTML + site-content + editorial catalog API |
| `/discover/` | Discovery shelves | editorial catalog |
| `/countries/{japan,italy,china}/` | Country pavilions | editorial catalog + page HTML |
| `/materials/` + `/materials/detail/` | Material library | JSON files |
| `/craftsmanship/` `/designers/` `/journal/` `/about/` `/membership/` | Editorial pages | mostly hardcoded HTML |
| `/shop/` | Legacy 3D print shop | `/api/catalog` |
| `/product/?id=` | Editorial / shop PDP | catalog APIs + product.js |
| `/checkout/` | Stripe checkout | server pricing |
| `/auth/` | Buyer login + admin edit mode hooks | portal auth |
| `/seller/` | Seller portal | seller router |
| `/regions/*` | Legacy region URLs | should link/redirect to `/countries/` |
| Private `ADMIN_ROUTE` | Ops console | `web/admin` |
| `/admin` | Intentionally 404 | discovery barrier |

---

## 6. Existing API inventory

### Public

- `GET /api/catalog` — published shop products
- `GET /api/editorial-catalog` — mission/meta + editorial products (JSON today)
- `GET /shared/js/catalog.js` — dynamic shop catalog module
- `POST /api/stripe/*` + webhook

### Ops console (under `ADMIN_ROUTE`)

- `GET/POST …/api/session|login|logout`
- `GET …/api/overview`
- `GET/POST/PUT …/api/products` + inventory patch
- `GET/PUT …/api/orders` + shipment
- `GET …/api/audit`

### Buyer portal (`/auth`)

- session / register / login
- `GET/PATCH /auth/api/content` (admin role)
- content card create + image upload

### Seller portal (`/seller`)

- seller product CRUD (owned rows)

---

## 7. Reusable components / assets

- Ops SPA shell: `web/admin/{index.html,admin.css,admin.js}`
- Editorial tokens: `web/shared/css/editorial.css`
- Admin visual language already quiet/monochrome (good base)
- Auth primitives: scrypt hash, CSRF, same-origin, audit append
- Product normalization in `product-store.js` (images, variants, shipping)
- Editorial mappers in `editorial-map.js`
- Security test: `npm run test:admin-security`
- Password hash CLI: `npm run admin:hash-password`
- Migration runner: `npm run db:migrate`

---

## 8. Hardcoded content that must become manageable

| Content | Location | Priority |
|---------|----------|----------|
| ~105 editorial products | `orbmare-catalog.json` | P0 — migrate to DB |
| Materials list (13) | same JSON | P0 |
| Material detail essays | `material-details.json` | P0 |
| Designers / crafts | `orbmare-catalog.json` | P1 |
| Country page hero/copy | `web/countries/*/index.html` + curated JSON | P1 |
| Home hero / sections | HTML + `site-content-store` (partial) | P1 |
| Nav / footer / legal pages | HTML under `web/` + `web/legal/` | P2 |
| Discover shelves / recommendations | page JS filters | P2 |
| Brand stories as first-class entities | not modeled (studio fields on products) | P1 |

---

## 9. Existing admin / CMS / permissions

**Exists today**

- Private ops console with login, overview, products, inventory, shipping, audit
- Single Owner Administrator model (env `ADMIN_EMAIL` + hash; DB user bootstrap)
- Audit events for login/product/inventory/shipment
- Partial on-site edit mode via `/auth` admin role + `admin-edit.js`

**Missing for enterprise ops**

- Multi-staff RBAC (`roles` / `permissions` / invitations)
- Brand / material / country entity managers
- Media library with usage tracking
- Cost / margin / SEO structured fields in admin UX
- Approval workflow beyond draft→published→archived
- Version history / restore
- AI studio
- `admin.orbmare.com` host routing
- Editorial catalog write-path connected to storefront

---

## 10. Security risks (current)

| Risk | Severity | Mitigation direction |
|------|----------|----------------------|
| Single shared admin identity | High ops risk | Multi-user RBAC + invite |
| Client-only permission gaps once multi-role added | High | Server `requirePermission` |
| Editorial data not in transactional DB | Medium | Migrate + dual-read |
| Local disk uploads only | Medium | Storage adapter interface |
| Admin route secrecy as discovery control | Low (already documented) | Keep + add host isolation |
| Content edit via buyer cookie path | Medium | Move CMS writes into ops admin session |
| No MFA | Medium | Architecture stub in Phase 1 |
| Secrets in `.env` (not committed) | OK | Keep; never commit hashes/passwords |

---

## 11. Recommended admin architecture

**Choose Structure A (same repository), adapted to current stack — not Next.js app router.**

```text
web/admin/          → Orbmare Admin SPA (ops UI)
server/admin-*.js   → Auth, RBAC, routers, services
server/db/          → Shared Postgres schema + repos
web/                → Storefront continues unchanged URLs
```

Why not a separate Next monorepo now:

1. Storefront and ops already share Express + Postgres + product-store.
2. Introducing Next would duplicate auth, types, and deployment without immediate gain.
3. Domain/Stripe/static SEO URLs must stay stable.

**Host strategy**

- `orbmare.com` — storefront + optional secret `ADMIN_ROUTE`
- `admin.orbmare.com` — same Node process, Host-based mount of admin at `/`
- Separate cookie name already: `orbmare_ops_session` (do not share buyer cookie)

---

## 12. Data migration strategy

1. **Additive SQL only** — no DROP of commerce tables.
2. Seed RBAC roles/permissions idempotently.
3. Import editorial products / materials / designers / crafts from JSON with dry-run.
4. Preserve slugs/IDs/image paths (`/assets/...`).
5. Dual-read period: API prefers DB published editorial rows; falls back to JSON if empty.
6. Stop automatic purge of editorial channel rows (purge becomes shop-only / opt-in).
7. Keep `orbmare-catalog.json` as seed source + offline fallback until cutover verified.
8. Soft-delete for brands/materials/media; archive products instead of hard delete by default.

Detailed plan: `database-schema.md` + migration `003_admin_platform.sql` (shown before apply in progress notes).

---

## 13. Recommended implementation order

| Phase | Focus | Status intent |
|-------|-------|---------------|
| 0 | Audit + architecture docs | This document |
| 1 | Admin host, RBAC, layout, activity logs | Immediate |
| 2 | Product MVP (incl. editorial channel), media, draft/publish, storefront DB read | Immediate |
| 3 | Brands, materials, countries managers | Immediate after 2 |
| 4 | Block CMS / homepage / nav | Later |
| 5 | Orders/customers/suppliers depth | Partial now (orders view exists) |
| 6 | Approval workflows / versions / notifications | Later (schema reserved) |
| 7 | AI Studio | Later (provider adapter stub) |
| 8 | Analytics, hardening, e2e | Later |

---

## 14. Environment variables (current)

From `.env.example`:

- Stripe: `STRIPE_*`, `PUBLIC_BASE_URL`, `PORT`, `NODE_ENV`
- DB: `DATABASE_URL`
- Seller: `SELLER_INVITE_CODE`
- Admin: `ADMIN_ROUTE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_PASSWORD` (dev only), `ADMIN_DATA_DIR`

**Planned additions (non-breaking):**

- `ADMIN_HOST=admin.orbmare.com`
- `ADMIN_COOKIE_DOMAIN=` (optional; prefer host-only cookies)
- `EDITORIAL_DB_SOURCE=prefer|db|json` (default `prefer`)

---

## 15. Conclusion

Orbmare already has a real (if narrow) operations console wired to products, inventory, orders, and audit — not a mock dashboard. The main gap is that **editorial commerce content (products, materials, brands/countries stories) still lives in static JSON**, while the DB only runs the 3D print shop. The admin build should **expand the existing Express admin**, migrate editorial entities into Postgres, introduce RBAC, and serve `admin.orbmare.com` from the same deployment.
