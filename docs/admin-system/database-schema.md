# Admin Database Schema

## Principles

1. Additive migrations only for MVP.
2. Do not drop or rename existing commerce columns.
3. Product commercial fields that vary widely stay in `products.payload` JSONB with documented keys.
4. First-class editorial entities (brand / material / country / designer / craft) get tables.
5. Soft delete via `deleted_at` where recovery matters.
6. All staff remain `users.role = 'admin'`; fine-grained access is RBAC tables.

## Migration plan (003_admin_platform.sql)

**Before apply:** take a Postgres dump if production data exists.

```bash
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql
npm run db:migrate   # applies pending *.sql in server/db/migrations
```

### New tables

| Table | Purpose |
|-------|---------|
| `admin_roles` | Preset + future custom roles |
| `admin_permissions` | `resource.action` keys |
| `admin_role_permissions` | M2M |
| `admin_user_roles` | Staff ↔ roles |
| `admin_invitations` | Invite / first password setup |
| `admin_login_events` | Login success/failure audit |
| `brands` | Brand entity + JSON payload |
| `materials` | Material entity + essay payload |
| `countries` | Country pavilion entity |
| `designers` | Designer / studio entity |
| `crafts` | Craft taxonomy |
| `media_assets` | Media library index |
| `media_usages` | Asset ↔ entity references |
| `product_candidates` | Buyer sourcing candidates |
| `content_revisions` | Version snapshots (products & entities) |

### Product lifecycle expansion

Existing check constraint replaced with:

`candidate | draft | in_review | changes_requested | approved | scheduled | published | hidden | archived | out_of_stock`

Legacy rows keep `draft|published|archived` values (subset).

### Documented product payload keys (additive)

```text
channel, country, editorialStatus, category, material*, craft*,
designer*, studio*, summary*, story*, images[], variants[],
costPrice, compareAtPrice, currency, allowDiscount,
seo { title, description, slug, ogImage, noIndex },
shipping { … existing … }, hsCode, fragile, hazardous,
contentBlocks[], evidenceTags[], createdBy, updatedBy
```

Cost fields are never returned on public catalog APIs.

### Indexes

- brands/materials/countries: `(status)`, `(slug)`, `(deleted_at)`
- media_assets: `(folder)`, `(created_at DESC)`
- admin_user_roles: `(role_id)`
- content_revisions: `(entity_type, entity_id, created_at DESC)`

### FK delete strategy

- Role delete restricted when system role.
- User delete → SET NULL on authored content; CASCADE sessions.
- Media hard delete blocked while `media_usages` rows exist (app-level).

## Seed / import scripts

| Script | Role |
|--------|------|
| migration SQL seed of roles/permissions | Idempotent INSERT |
| `scripts/migrate-editorial-content.mjs` | JSON → DB (dry-run supported) |
| `scripts/create-admin-user.mjs` | Invite/bootstrap staff |

## Rollback

1. Restore `pg_dump` backup, **or**
2. Leave new tables unused and set `EDITORIAL_DB_SOURCE=json` to force storefront JSON path.
3. Do not DELETE migrated product IDs that already received orders.
