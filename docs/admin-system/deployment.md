# Admin Deployment — admin.orbmare.com

## Architecture

Same Node process as the storefront (Vultr + Nginx + PM2).

| Host | Serves |
|------|--------|
| `orbmare.com` | Storefront + public APIs + optional secret `ADMIN_ROUTE` |
| `admin.orbmare.com` | Admin SPA at `/` via `ADMIN_HOST` |

Sessions use cookie `orbmare_ops_session` (separate from buyer/seller cookies).

## DNS

| Type | Host | Value |
|------|------|-------|
| A | `@` | existing server IP |
| A | `www` | existing server IP |
| A | `admin` | **same server IP** |

## Environment

```env
PUBLIC_BASE_URL=https://orbmare.com
DATABASE_URL=postgresql://orbmare:***@127.0.0.1:5432/orbmare
ADMIN_HOST=admin.orbmare.com
ADMIN_ROUTE=/your-private-ops-path   # optional second entry on apex
ADMIN_EMAIL=ops@yourdomain.com
ADMIN_PASSWORD_HASH=scrypt$...
EDITORIAL_DB_SOURCE=prefer
NODE_ENV=production
```

Generate hash:

```bash
npm run admin:hash-password
```

## Nginx sketch

```nginx
server {
  listen 443 ssl http2;
  server_name admin.orbmare.com;
  # ssl_certificate ... (certbot)

  location / {
    proxy_pass http://127.0.0.1:4242;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25m;
  }
}
```

Issue cert:

```bash
certbot --nginx -d admin.orbmare.com --redirect
```

## Database migration

```bash
cd /var/www/printnova
npm install --omit=dev
npm run db:migrate
# Dry run first:
node scripts/migrate-editorial-content.mjs --dry-run
npm run db:migrate-editorial
pm2 restart printnova
```

## First Super Admin

1. Set `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` in `.env`
2. `npm run db:migrate` bootstraps the user and assigns `super_admin`
3. Sign in at `https://admin.orbmare.com/`

Additional staff: Admin → 团队权限 → 创建员工.

## Staging suggestion

- Separate DB or schema
- `ADMIN_HOST=admin.staging.orbmare.com`
- `NODE_ENV=production` still (for secure cookies) with non-live Stripe keys
- Never point staging `ADMIN_PASSWORD` at production

## Rollback

1. `pm2 restart` previous release directory / git tag
2. Restore `pg_dump` if schema/data broken
3. Set `EDITORIAL_DB_SOURCE=json` to force storefront JSON catalog without dropping DB rows
4. Remove/comment `ADMIN_HOST` to disable subdomain entry (secret route may remain)

## Checklist

- [ ] `/admin` on apex returns 404
- [ ] `admin.orbmare.com` requires login
- [ ] Unauthenticated API → 401
- [ ] Mutating API without CSRF → 403
- [ ] Publish editorial product appears on `/countries/...` after refresh
- [ ] Buyer cookie cannot call ops APIs
