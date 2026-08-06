# Global Boutique Trade Platform + Orbmare China Pavilion

> **Engineer / AI handoff:** read [`docs/ENGINEERING-HANDOFF.md`](docs/ENGINEERING-HANDOFF.md) first (structure, design system, Dual Narrative, recent context, WIP).

Marketplace homepage with the Orbmare 3D printing store nested under **中国区**. Domain and Stripe checkout are unchanged.

```text
.
├── server/                      # Backend (Express + Stripe + operations)
│   ├── index.js                 # App entry: static + API
│   ├── admin-auth.js            # Admin sessions, password verification, CSRF
│   ├── admin-router.js          # Protected operations routes
│   ├── product-store.js         # Runtime catalog and inventory source of truth
│   ├── order-store.js           # Orders and shipment records
│   ├── audit-store.js           # Admin action audit trail
│   └── stripe/
│       └── payments.js
│
├── web/
│   ├── index.html               # 平台主页（全球精品贸易）
│   ├── home/                    # 平台主页样式与脚本
│   ├── regions/china/           # 中国区（Orbmare 为精选板块）
│   ├── shop/                    # Orbmare 3D打印独立站（完整保留）
│   ├── product/ · checkout/ · auth/ · admin/ · legal/
│   ├── shared/js/
│   └── assets/platform/         # 国别馆 / 主视觉图
│
├── docs/
├── package.json
└── AGENTS.md
```

## URLs

| Module | Path |
|--------|------|
| Platform home | `/` |
| China region | `/regions/china/` |
| Orbmare shop | `/shop/` |
| Product | `/product/?id=...` |
| Checkout | `/checkout/` |
| Auth | `/auth/` |
| Stripe API | `/api/stripe/*` |

The operations console is intentionally absent from this table and from all
consumer navigation. Its same-domain route is supplied through `ADMIN_ROUTE`
at server startup. Conventional `/admin/` requests return `404`.

## Run locally

```bash
npm start
# http://127.0.0.1:4242/
```

## Private operations console

Generate a production password hash:

```bash
npm run admin:hash-password
```

Set `ADMIN_ROUTE`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH` in the server
environment. Production ignores plain `ADMIN_PASSWORD`. The configured route
is only an extra discovery barrier; the actual boundary is the server-side
session, CSRF validation, login throttling, protected API, and audit log.

Until PostgreSQL is adopted, set `ADMIN_DATA_DIR` to a durable mounted volume.
Do not run multiple application instances against the JSON store.
