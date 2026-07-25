# Roles & Permissions

## Model

```text
users (role='admin')
  └── admin_user_roles → admin_roles
                            └── admin_role_permissions → admin_permissions
```

Staff identity stays in `users`. Fine-grained authorization is never inferred from the string `"admin"` alone after RBAC seed.

## Preset roles

| Role ID | Label | Intent |
|---------|-------|--------|
| `super_admin` | Super Admin | Full access incl. team + settings |
| `administrator` | Administrator | Most content/commerce; no super-admin/security knobs |
| `buyer` | Buyer | Candidates, drafts, suppliers; no publish/finance/team |
| `content_editor` | Content Editor | Stories/pages/materials copy; no cost/supplier/refunds |
| `sales` | Sales / CS | Orders, customers, notes, refund requests |
| `inventory_manager` | Inventory Manager | Stock, SKUs, movements |
| `finance` | Finance | Money read/export; no content/team |
| `viewer` | Viewer | Read-only granted modules |

Bootstrap: env `ADMIN_EMAIL` user receives `super_admin` on migrate.

## Permission keys (MVP enforced)

```text
product.read product.create product.update product.delete product.publish
order.read order.update order.refund
customer.read customer.export
content.read content.update content.publish
inventory.read inventory.update
finance.read
team.read team.manage
settings.read settings.manage
media.read media.upload media.delete
brand.read brand.write
material.read material.write
country.read country.write
audit.read
ai_content_optimize
ai_content_use_premium_model
```

AI optimize routes: `requirePermission('ai_content_optimize')`. Premium model tier also needs `ai_content_use_premium_model`. See `docs/AI_CONTENT_OPTIMIZATION.md`.

Server helper: `requirePermission('product.publish')`.

UI hides nav items lacking permission; **API still rejects**.

## Separation rules

1. Creator cannot approve their own submission by default (`product.publish` without being sole reviewer — Phase 6 hardens).
2. Cost / margin fields require `finance.read` or `product.update` with cost scope (`finance.read` for view; update needs `product.update` + not content_editor).
3. Customer PII export requires `customer.export` + audit event.
4. Deactivating a user deletes all their sessions.

## Invitation flow (MVP)

1. Super Admin / team.manage creates invitation + role.
2. Email link token (hashed at rest) → set password.
3. User becomes active admin with assigned role.

Password policy: minimum 14 characters (existing scrypt scheme).
