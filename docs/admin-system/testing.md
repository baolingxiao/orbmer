# Admin Testing

## Commands

```bash
npm run test:admin-security   # auth, product publish boundaries, checkout trust
npm run test:admin-rbac       # permission helper + finance redaction
npm run db:migrate
node scripts/migrate-editorial-content.mjs --dry-run
```

Tests must not use production data. `test:admin-security` forces a temp `ADMIN_DATA_DIR` and clears `DATABASE_URL`.

## Unit coverage (MVP)

- [x] Permission checks / finance stripping
- [x] Password hash + login throttle (existing)
- [x] Product lifecycle publish gating (existing security suite)
- [ ] Margin calculation helper (covered indirectly via `withMarginFields`)
- [ ] Slug normalization (existing product-store rules)

## Integration (manual / scripted)

1. Login as bootstrap admin
2. Create editorial product as draft
3. Attempt publish without `product.publish` → forced `in_review` or 403
4. Publish with super_admin → appears in `/api/editorial-catalog`
5. Create material / brand / country → list + soft delete
6. Upload media → path copyable
7. Create team member with Viewer → cannot mutate products

## E2E target (Phase 8)

Admin login → brand → material → product → media → draft → review → publish → storefront visible.

Not automated in CI yet (no Playwright harness in repo).
