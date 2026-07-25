# Admin System Development Progress

Last updated: 2026-07-24

Legend: **Completed** · **Partially Completed** · **Not Started** · **Blocked**

---

## Phase 0 — Project audit

| Item | Status |
|------|--------|
| Full stack/data/API audit | **Completed** — `current-project-audit.md` |
| Architecture decision (same-repo Express) | **Completed** — `architecture.md` |
| Schema / permissions / content model docs | **Completed** |
| Migration strategy documented | **Completed** |

## Phase 1 — Admin skeleton

| Item | Status |
|------|--------|
| Admin route + Host mount (`ADMIN_HOST`) | **Completed** |
| Login / session / CSRF / throttle | **Completed** (pre-existing, extended) |
| RBAC tables + seed roles/permissions | **Completed** — migration `003_admin_platform.sql` |
| Server permission checks | **Completed** |
| Team create / roles / deactivate / revoke sessions | **Completed** (DB required) |
| Activity / audit logs | **Completed** (extended actions) |
| Login event log | **Completed** |
| Invite email + forgot password UX | **Not Started** (tables ready for invitations) |
| MFA | **Not Started** (reserved) |

## Phase 2 — Product MVP

| Item | Status |
|------|--------|
| Product list / create / edit | **Completed** (enhanced) |
| Editorial + shop channels | **Completed** |
| Cost / compare / SEO fields | **Completed** |
| Image paths + media library upload | **Completed** |
| Draft / in_review / publish gating | **Completed** |
| Inventory update | **Completed** |
| Storefront reads DB editorial when present | **Completed** (`EDITORIAL_DB_SOURCE=prefer`) |
| Stop auto-purge of editorial rows | **Completed** |
| Editorial JSON → DB migration script | **Completed** — `npm run db:migrate-editorial` |
| 10-step wizard + rich text + version restore UI | **Partially Completed** (fields exist; wizard/RTF later) |
| Live preview pane reusing PDP | **Not Started** (open-storefront links remain) |

## Phase 3 — Content entities

| Item | Status |
|------|--------|
| Brands / materials / countries CRUD | **Completed** (MVP forms) |
| Designers / crafts APIs | **Completed** (API; minimal UI) |
| Material evidence tags | **Partially Completed** (model supports; UI basic) |
| Deep material essay editor | **Partially Completed** |

## Phase 4 — CMS / blocks

| Item | Status |
|------|--------|
| Homepage hero copy editor | **Completed** (basic) |
| Block-based page builder | **Not Started** |
| Navigation / footer CMS | **Not Started** |

## Phase 5 — Commerce ops

| Item | Status |
|------|--------|
| Orders list + shipment update | **Completed** |
| Customers module | **Not Started** |
| Suppliers / candidates UI | **Partially Completed** (DB table `product_candidates` only) |
| Returns / discounts | **Not Started** |

## Phase 6 — Workflow

| Item | Status |
|------|--------|
| Basic publish permission gate | **Completed** |
| Approval comments / dual control | **Not Started** |
| Scheduled publish worker | **Not Started** |
| Content revisions storage | **Completed** (API list; restore UI later) |
| Notifications | **Not Started** |

## Phase 7 — AI Studio

| Item | Status |
|------|--------|
| Provider adapter + generators | **Not Started** |

## Phase 8 — Analytics / polish

| Item | Status |
|------|--------|
| Operational overview metrics | **Partially Completed** |
| Advanced analytics | **Not Started** |
| Playwright E2E | **Not Started** |
| Deployment doc for admin subdomain | **Completed** |

---

## MVP acceptance (target vs now)

| Requirement | Status |
|-------------|--------|
| Admin login | **Completed** |
| Staff accounts + roles | **Completed** |
| Product list/create/edit/images/price/stock/content/SEO | **Completed** |
| Draft + publish | **Completed** |
| Brand / material / country manage | **Completed** |
| Storefront reads managed data | **Completed** (after migration) |
| Activity logs | **Completed** |
| Basic order view | **Completed** |
| admin.orbmare.com deploy instructions | **Completed** |

## Honest gaps

- Not a full enterprise suite yet (no AI Studio, block CMS, suppliers ERP, MFA).
- Product editor is dialog-based, not the full 10-step wizard.
- Preview is storefront link, not side-by-side draft token preview.
- Designers/crafts have API but light UI.
- Do not claim Analytics / AI / multi-level approval as done.

## Next recommended slice

1. Apply migrate on staging, run `db:migrate-editorial`, verify country pages.
2. Wire Nginx `admin.orbmare.com`.
3. Build side-by-side preview token.
4. Approval comments + scheduled publish.
