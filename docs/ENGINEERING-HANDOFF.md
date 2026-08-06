# Orbmare / 傲马 — Engineering Handoff

> **Audience:** Next fullstack engineer or coding AI  
> **Date:** 2026-07-26  
> **Repo:** `git@github.com:baolingxiao/orbmer.git`  
> **Local path:** `/Users/dai/Documents/3D打印独立站`  
> **HEAD at handoff:** `85c876a` — *Add buyer memberships and Google sign-in*  
> **Branch:** `main` (tracks `origin/main`)

This file is the **single onboarding packet**. Read it before changing code. Then open the linked docs only as needed.

---

## 0. Start here (60-second boot)

```bash
cd "/Users/dai/Documents/3D打印独立站"
# Ensure .env exists (copy from .env.example; never commit .env)
npm install
# Optional Postgres: npm run db:up && npm run db:migrate
npm start
# → http://127.0.0.1:4242/
```

| Surface | URL |
|---------|-----|
| Storefront | https://orbmare.com / local `http://127.0.0.1:4242/` |
| Admin console | https://admin.orbmare.com (Host mount) — **not** `/admin/` |
| Market retail | `MARKET_HOST` (e.g. shop.example.com) or local `http://127.0.0.1:4242/market/` |
| Seller | `/seller/` |
| Buyer auth | `/auth/` |
| 3D print shop (legacy) | `/shop/` → redirects to `/discover/` |
| Checkout | `/checkout/` (Stripe) |

**Hard rules for any AI/agent:**

1. Do **not** invent a React/Next rewrite. Stack is Express + static HTML/CSS/JS.
2. Do **not** change Stripe domain/payment flow without explicit owner approval.
3. Do **not** commit `.env`, password hashes, or upload binaries.
4. Brand names are **never translations**: `Orbmare` ↔ `傲马` stay as Dual Narrative signatures.
5. Editorial product galleries use **stacked cards only** (see §4.3).
6. Conventional `/admin/` returns 404; ops console is `ADMIN_HOST` and/or secret `ADMIN_ROUTE`.

---

## 1. What the product is

**Orbmare (EN) / 傲马 (ZH)** is a premium **curated editorial marketplace** for craftsmanship, materials, and design — an editorial library, not Amazon/Taobao.

Mission: *"We curate the world's finest craftsmanship, materials, and design."*

Visual language: Apple × Hermès × Aesop × museum discovery. Cold monochrome luxury, large whitespace.

**Two commerce channels in one app:**

| Channel | Path / IDs | Role |
|---------|------------|------|
| Editorial curated | `/`, `/discover/`, `/countries/`, `/product/?id=` | Story-first, curated catalog |
| 3D print shop (legacy) | `/shop/` (redirects), print SKUs via `/api/catalog` | Digital manufacturing / Technology Hall |
| **Market retail** | `MARKET_HOST` or `/market/`, `/api/market-catalog` | Taobao-style shelf + cart; exclusive `channel=market` products; shared Stripe checkout |

Domain + Stripe checkout must remain stable. Set `MARKET_HOST` (and optionally `MARKET_PUBLIC_URL`) for the dedicated retail hostname.

Canonical design guardrails: root [`AGENTS.md`](../AGENTS.md).

---

## 2. Tech stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Storefront | Static HTML + ES modules under `web/` | No React/Vue/Next |
| Design system | `web/shared/css/editorial.css` | Cormorant Garamond + Noto Sans SC |
| Backend | Node ≥18 ESM, Express 4 | Entry: `server/index.js` |
| DB | PostgreSQL 16 (`pg`) | Optional locally; **required** for auth/orders/admin in prod |
| Fallback | JSON under `server/runtime-data/` | Gitignored; local/dev only |
| Payments | Stripe PaymentIntents + webhook | `server/stripe/` |
| AI ops | OpenAI server-side only | `server/ai/` — never expose API key |
| Process mgr (prod) | pm2 name `printnova` | Path on server: `/var/www/printnova/` |
| Deploy | rsync / GitHub Actions | See `DEPLOY.md` |

Package name is still `orbmare-checkout` (historical).

---

## 3. Repository map

```text
.
├── AGENTS.md                 # Design + product guardrails (mandatory)
├── DEPLOY.md                 # Vultr / orbmare.com deploy
├── package.json              # scripts: start, db:migrate, admin:*, test:*
├── docker-compose.yml        # local Postgres
├── .env.example              # env contract (secrets never committed)
├── .cursor/
│   ├── rules/product-image-stack.mdc
│   └── skills/orbmare-ui-sizing/   # sizing + Dual Narrative lockup
├── docs/                     # governance, admin-system, platform vision
│   └── ENGINEERING-HANDOFF.md  ← this file
├── scripts/                  # migrate, deploy, tests, material intelligence
├── server/
│   ├── index.js              # public APIs + static + host routing
│   ├── admin-auth.js / admin-router.js / rbac.js
│   ├── buyer-router.js / seller-router.js / portal-auth.js
│   ├── product-store.js / order-store.js / content-store.js
│   ├── media-store.js / trash-store.js / site-content-store.js
│   ├── brand-editorial.js / editorial-map.js / security.js
│   ├── ai/                   # content optimization
│   ├── stripe/
│   ├── db/                   # migrations 001–007, repos
│   └── runtime-data/         # GITIGNORED local JSON/CMS overrides
└── web/
    ├── index.html            # editorial home
    ├── discover/ countries/ materials/ craftsmanship/
    ├── designers/ journal/ about/ membership/ collection/
    ├── product/ checkout/ auth/ shop/ seller/ brand/
    ├── admin/                # ops SPA (served only on admin host / secret route)
    ├── regions/              # legacy → redirects to /countries/…
    ├── shared/
    │   ├── css/editorial.css # tokens + Dual Narrative + PDP stack
    │   └── js/
    │       ├── chrome.js           # header/footer/bag
    │       ├── editorial-i18n.js   # i18n + Dual Narrative API
    │       ├── catalog-editorial.js / discover.js / store.js
    │       └── picks-marquee.js    # featured marquee
    └── assets/
```

### Key public APIs (`server/index.js`)

- `GET /api/catalog`, `/api/editorial-catalog`
- `GET /api/brands`, `/api/brands/:id`, `/api/featured`
- `GET /api/materials`, `/api/countries`, `/api/crafts`
- `GET /api/site-content` (CMS-driven home/section copy)
- Stripe: `/api/stripe/*` (+ raw webhook body)
- Admin: mounted at `ADMIN_ROUTE` and/or `ADMIN_HOST`
- Buyer: `/auth/*` · Seller: `/seller/*`

### DB migrations (`server/db/migrations/`)

| File | Purpose |
|------|---------|
| `001_init.sql` | Core schema |
| `002_seller_ownership.sql` | Seller ownership |
| `003_admin_platform.sql` | Admin platform entities |
| `004_deletion_trash.sql` | Soft-delete trash (7 days) |
| `005_ai_optimization.sql` | AI optimize permissions/logs |
| `006_buyer_memberships.sql` | Buyer memberships |
| `007_google_buyer_identity.sql` | Google buyer identity |

Run: `npm run db:migrate`.

---

## 4. Design system (non-negotiable)

### 4.1 Taste dials

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 3` (editorial; marketplace shop may be denser)
- Palette: `#fafafa` / `#141414` / muted grey
- **No** discount red, **no** marketplace-blue chrome on editorial surfaces
- Explore, don’t “search”; price is never first on PDP

### 4.2 Dual Narrative (i18n brand language)

**Not** classic ZH↔EN translation of the brand. UI copy fully localizes; brand elements coexist.

| Context | ZH primary | Echo / stamp |
|---------|------------|--------------|
| Logo / footer | 傲马 | Orbmare |
| Logo / footer (EN) | Orbmare | 傲马 |
| Hero stamp | (under ZH title) Orbmare | (under EN title) 傲马 |
| Section header | Current lang H2 | Other lang `.dn-echo` |
| Country / material | 日本 / Japan | dual pair order by locale |
| Product badge | 傲马精选 | Orbmare Curated |

**Visual tokens** (`editorial.css`): `--dn-echo-*`, `--dn-stamp-*`, `--dn-curated-*`, `--dn-lockup-*`  
Classes: `.dn-pair`, `.dn-primary`, `.dn-echo`, `.dn-stamp`, `.dn-curated`  
JS: `web/shared/js/editorial-i18n.js` → `brandPrimary`, `brandSecondary`, `brandStamp`, `curatedBadge`, `dualPairHtml`, `applyDualNarrative`, `applyI18n`

Echo rules: ~15–30% smaller, opacity ~40–60%, increased letter-spacing, never replace body copy.

**Rolled out on:** home, discover, materials, designers, collection, chrome header/footer, quiet cards.  
**Still incomplete on many surfaces:** about, membership, journal, craftsmanship detail, country pages polish, PDP body, cart drawer, AI dialogs, auth/checkout (WIP editorial restyle in working tree).

### 4.3 Product image stack (mandatory)

Multi-image product views → stacked cards (`.pdp-stack`), aspect `4/5`, grey translucent L/R nav, AI note bottom-left.  
Reference: `web/product/index.html` + `.cursor/rules/product-image-stack.mdc`.  
Do **not** add thumbnail strips / marketplace carousels on editorial PDP.

### 4.4 Skills / rules for agents

| Resource | Use when |
|----------|----------|
| `AGENTS.md` | Any editorial/UI work |
| `.cursor/skills/orbmare-ui-sizing/SKILL.md` | Type, image ratios, lockups |
| `.cursor/rules/product-image-stack.mdc` | Any product gallery |
| `docs/brand-editorial-system.md` | Brand/editorial content model |

localStorage may still use historical `orbmare-*` keys — **do not rename** without migration.

---

## 5. Admin / ops console

- **Host:** `admin.orbmare.com` → same Node process, admin SPA at `/`
- **Also:** secret path `ADMIN_ROUTE` on apex (defense in depth)
- **UI:** `web/admin/` (`admin.js`, `admin-platform.js`, …)
- **API:** `server/admin-router.js` + session/CSRF/`rbac.js`
- Soft-delete → trash 7 days (`trash-store.js`, migration `004`)
- Batch soft-delete for products/brands/materials/countries/crafts/media
- Featured flag + `featuredRank` → public `GET /api/featured` → home/designers marquee (`picks-marquee.js`)
- Brand entity `kind`: brand / studio / designer (ID prefixes used in admin)
- AI content optimize under `server/ai/` + admin UI (`docs/AI_CONTENT_OPTIMIZATION.md`)

Docs pack: `docs/admin-system/` (architecture, schema, permissions, security, deployment).

**Gotcha:** Production screenshots ≠ local until deploy. Users often look at `orbmare.com` while you changed localhost.

---

## 6. Auth, membership, Google

Landed in `85c876a`:

- Buyer memberships: migration `006`, admin + `/auth/` membership state
- Google sign-in for buyers: migration `007`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- Callbacks documented in `.env.example`  
  Local: `http://127.0.0.1:4242/auth/api/google/callback`

Seller demo (local/prod when seeded): see `docs/ACCESS-LINKS.md` — change password in production; set `SELLER_INVITE_CODE`.

---

## 7. Deploy & environments

| Item | Value |
|------|--------|
| Prod host | `45.32.91.40` |
| App path | `/var/www/printnova/` |
| pm2 name | `printnova` |
| Domains | `orbmare.com`, `www`, `admin.orbmare.com` |
| Deploy script | `./scripts/deploy-production.sh` |
| CI | `.github/workflows/deploy-production.yml` (SSH secrets) |

**Never rsync local `.env` over production.** Prod has its own `DATABASE_URL`, `ADMIN_HOST`, `NODE_ENV=production`.

Uploads: `web/assets/uploads/` is gitignored; deploy excludes must preserve server media (see recent fix commits).

---

## 8. Chat / work context (what led here)

Primary long thread (admin + storefront evolution):  
Cursor agent transcript id [`057cd4cc-3c8e-4841-8b1f-9f51f07c36e8`](…) — title evolved through admin system → Dual Narrative → handoff.

### Chronological themes (Jul 24–25, 2026)

1. **Enterprise admin** — audit existing stack; extend Express admin (not Next.js); `docs/admin-system/*`.
2. **admin.orbmare.com** — Nginx Host routing, env, 502/login/hash mismatches, DB consistency between local & server.
3. **Brands / studios / designers** — entity kinds; soft-delete + 7-day trash; featured + marquee on “Orbmare 精选”.
4. **Discover redesign** — editorial discover (hero, AI search, tabs, facets, quiet cards); i18n keys.
5. **Featured API** — `GET /api/featured`, admin featuredRank, home/designers marquee.
6. **Admin batch delete** — always-visible bulk bar; soft-delete routes.
7. **Dual Narrative i18n** — design tokens + `editorial-i18n` / chrome / home / discover / materials / designers (committed via Discover redesign commit `01c1aec` and follow-ups).
8. **Buyer memberships + Google** — `85c876a`.
9. **In-progress (uncommitted at handoff):** editorial restyle of auth / checkout / shop / legal / access; collapse non-MVP region pages (AU/FR/DE/US) to redirects toward `/countries/`.

### Owner preferences (repeated)

- Premium editorial taste; reject generic AI “purple gradient / cream serif / broadsheet” looks.
- Prefer concrete local URLs and running servers over abstract advice.
- Production vs local confusion is common — always clarify which environment.
- Commits only when asked; do not force-push main.

---

## 9. Working tree at handoff (not committed)

`git status` showed local modifications (relative to `85c876a`):

```text
M web/access/index.html
M web/auth/auth.css
M web/auth/index.html
M web/checkout/checkout.css
M web/checkout/index.html
M web/checkout/success.html
M web/legal/legal.css
M web/regions/{australia,france,germany,usa}/index.html  # redirect stubs
M web/shop/index.html
M web/shop/shop.css
```

Intent of WIP: pull auth/checkout/shop toward Dual Narrative / editorial.css; simplify legacy region URLs. **Review + commit before deploy** if that was the owner’s direction.

---

## 10. Known gaps / likely next work

1. **Finish Dual Narrative rollout** on about, membership, journal, craftsmanship, country pages, PDP, bag UI, AI surfaces; keep tokens centralized.
2. **Review / finish WIP** auth·checkout·shop editorial alignment; commit or discard deliberately.
3. **CMS override gotcha:** `server/runtime-data/site-content.json` (gitignored) can override i18n defaults — update store defaults in `site-content-store.js` for fresh installs; clear/sync runtime JSON when copy looks “stuck”.
4. **Discover polish:** some suggest chips / CTAs may still be partially EN-only.
5. **Admin:** continue RBAC coverage, media durability across deploys, clear update timestamps (partially done).
6. **Payments:** production checkout blocked until DB migration posture is intentional — read Stripe docs under `docs/11-technical-architecture/` and `.env.example` comments.
7. **Do not** break `/regions/{japan,italy,china}/` redirects to `/countries/…`.

---

## 11. Doc index (read on demand)

| Doc | Topic |
|-----|--------|
| [`AGENTS.md`](../AGENTS.md) | Product + design law |
| [`DEPLOY.md`](../DEPLOY.md) | Production deploy |
| [`docs/ACCESS-LINKS.md`](ACCESS-LINKS.md) | Public URLs + seller demo |
| [`docs/admin-system/`](admin-system/) | Ops console architecture |
| [`docs/AI_CONTENT_OPTIMIZATION.md`](AI_CONTENT_OPTIMIZATION.md) | AI copy pipeline |
| [`docs/brand-editorial-system.md`](brand-editorial-system.md) | Brand/editorial system |
| [`docs/00-governance/`](00-governance/) | Decisions, glossary |
| [`docs/global-curated-trade-platform/`](global-curated-trade-platform/) | Long-form vision (aspirational) |

---

## 12. Prompt template for the next AI

Paste this at the start of a new chat:

```text
You are continuing work on Orbmare / 傲马 (repo baolingxiao/orbmer).

First read:
1. docs/ENGINEERING-HANDOFF.md
2. AGENTS.md
3. .cursor/skills/orbmare-ui-sizing/SKILL.md (for UI)
4. .cursor/rules/product-image-stack.mdc (for product galleries)

Stack: Express + static web/ (no React rewrite). Local: npm start → :4242.
Brand Dual Narrative: Orbmare and 傲马 are signatures, never translations.
Do not change Stripe/domain without asking. Do not commit .env.
Uncommitted WIP may exist on auth/checkout/shop/regions — check git status.

Task: <DESCRIBE TASK HERE>
```

---

## 13. Environment contract (no secrets)

See `.env.example`. Critical keys:

- `PORT`, `PUBLIC_BASE_URL`, `NODE_ENV`
- `DATABASE_URL`
- `STRIPE_*`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_ROUTE`, `ADMIN_HOST`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `OPENAI_*` (server only)
- `SELLER_INVITE_CODE`

**Never paste production secrets into commits, PRs, or this handoff file.**

---

## 14. Quick verification checklist

- [ ] `npm start` → home loads; lang toggle ZH/EN flips Dual Narrative lockup
- [ ] `/discover/` editorial experience loads
- [ ] `/product/?id=<editorial-id>` uses stacked gallery when multi-image
- [ ] `/api/featured` returns interleaved brands/products
- [ ] Admin host or `ADMIN_ROUTE` login works with CSRF
- [ ] Soft-delete appears in trash; batch delete UI visible in admin
- [ ] Checkout still hits Stripe (test keys locally)
- [ ] `/regions/china/` redirects to `/countries/china/`

---

*End of handoff. Update this file when major architecture or brand-language decisions change.*
