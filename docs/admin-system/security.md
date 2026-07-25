# Admin Security

## Controls in place

| Control | Implementation |
|---------|----------------|
| Auth required | `requireSession` on all `/api/*` except login/session |
| CSRF | `X-CSRF-Token` + session token, constant-time compare |
| Same-origin writes | `sameOriginOnly` |
| Password hashing | scrypt (N=16384) |
| Login throttle | 5 failures / 15 minutes / IP+email |
| Cookie flags | HttpOnly, SameSite=Strict, Secure in production |
| Cookie isolation | `orbmare_ops_session` ≠ buyer/seller |
| Discovery barrier | `/admin` → 404; optional secret `ADMIN_ROUTE` |
| Host isolation | `ADMIN_HOST` serves only admin (+ `/assets` `/shared`) |
| RBAC | Server `requirePermission` on every sensitive route |
| Finance field redaction | `stripFinanceFields` |
| Audit trail | `audit_events` + `admin_login_events` |
| Upload limits | MIME allowlist, 20MB, no `..` paths for product images |
| Security headers | CSP, no-store, noindex, frame deny |
| Soft delete | Content/media prefer soft delete |

## Must never do

- Commit `.env`, password hashes, or invite tokens
- Trust browser role flags
- Share ops cookies on `.orbmare.com` with buyer sessions
- Auto-publish AI content
- Log full payment card data

## Recommended next hardening

- MFA (TOTP) for `super_admin` / `administrator`
- Invitation email tokens with expiry (schema ready)
- Object storage with signed URLs
- Rate limit on upload + team create
- Periodic session purge cron
