# Chapter 14 — Database

**Version:** 1.0  
**Status:** Active (PostgreSQL)

## Decision

Primary store is **PostgreSQL**. JSON file stores remain a local fallback only when `DATABASE_URL` is unset.

## Goals

- Durable admin sessions (survive restarts / multi-instance)
- Buyer / seller / admin user records with roles
- Atomic inventory reserve → commit / release
- Queryable orders and audit events (time, actor, entity)

## Entities

| Table | Purpose |
|-------|---------|
| `users` | Accounts with role `buyer` \| `seller` \| `admin` |
| `sessions` | Cookie sessions + CSRF (admin first; buyer/seller ready) |
| `products` | Catalog rows (`payload` JSONB + indexed fields) |
| `inventory` | `on_hand` / `reserved` / mode |
| `inventory_movements` | Reserve / commit / release trail |
| `orders` | Checkout + ops shipment state |
| `order_items` | Line items |
| `stripe_webhook_events` | Webhook idempotency |
| `audit_events` | Searchable ops audit log |

## Local setup

```bash
# Option A — existing Homebrew Postgres (already used on this machine)
# createdb/user: orbmare / orbmare_dev

# Option B — Docker
npm run db:up

# Configure
echo 'DATABASE_URL=postgresql://orbmare:orbmare_dev@127.0.0.1:5432/orbmare' >> .env

# Migrate + seed catalog if empty
npm run db:migrate
npm start
```

## Storage choices

| Concern | Option | Notes |
|---------|--------|-------|
| Primary DB | PostgreSQL 14+ | `pg` driver |
| Files / media | `/assets/` on disk | unchanged |
| Cache | none yet | add later if needed |
| Legacy JSON | `ADMIN_DATA_DIR` | only without `DATABASE_URL` |

## Urgent capabilities mapped

| Need | Implementation |
|------|----------------|
| Users / roles | `users.role` |
| Sessions | `sessions` table (admin login writes here when DB on) |
| Atomic inventory | `reserveStock` / `commitReservedStock` / `releaseReservedStock` |
| Order status | `orders` + `status_history` JSONB |
| Audit search | `GET .../api/audit?actor=&action=&entityType=&q=&from=&to=` |

## Still deferred (schema ready, product later)

- Full buyer registration portal (`/auth` still paused)
- Seller portal UI
- Fine-grained RBAC beyond role enum
- MFA

## Seller & buyer portals

| Portal | URL | Notes |
|--------|-----|-------|
| Seller | `/seller/` | Login/register; manage owned products & related orders |
| Buyer | `/auth/` | Register/login; view linked orders |
| Ops admin | `{ADMIN_ROUTE}/` | Secret route; not `/admin` |

### Demo seller (auto-seeded when DB is on)

- Email: `seller@orbmare.local`
- Password: `Seller-Demo-Pass-2026!`

Unowned catalog products are assigned to this demo seller on boot.

