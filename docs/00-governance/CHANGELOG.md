# Product Documentation Changelog

- **Title:** Product Documentation Changelog
- **Version:** 1.2.0
- **Status:** Draft
- **Owner:** Product & Operations
- **Last Updated:** 2026-07-23
- **Related Documents:** [Governance README](README.md), [Decision Log](DECISION-LOG.md), [Glossary](GLOSSARY.md)

## 2026-07-23 - Protected operations console

### Added

- Added a configurable same-domain operations route with server-side administrator authentication.
- Added scoped secure sessions, CSRF validation, same-origin checks, login throttling, restrictive security headers, and audit logging.
- Added product publication, inventory mode and quantity, order milestone, carrier, and tracking management.
- Added an atomic runtime product store and a server-rendered public catalog module.
- Added the Operations Console specification and registered DR-017.

### Changed

- Made the server-side runtime catalog the consumer catalog source of truth.
- Made shop, product, cart, and checkout availability follow published status and managed inventory.
- Changed conventional `/admin/` and `/admin.html` routes to return `404`.
- Replaced unsafe dynamic product HTML interpolation with text-only DOM construction.

### Deployment boundary

- The current JSON stores support one process with durable mounted storage.
- PostgreSQL, role separation, durable sessions, mandatory MFA, and inventory reservation transactions remain required before multi-instance production.

## 2026-07-23 - China trend sourcing lead system

### Added

- Added a controlled trend-sourcing dataset with six dated JD.com public-ranking leads across six Orbmare categories.
- Added explicit data-source states for 1688, Taobao/Tmall, JD.com, and Pinduoduo.
- Added a dataset validator and a read-only source-restriction audit that requests only official `robots.txt` files.
- Added the China-region trend module with platform and category filters, source evidence, loading, empty, and error states.
- Added the China trend sourcing specification and registered DR-016.

### Changed

- Replaced China-region inventory implications with cross-border sourcing language.
- Updated category tiles to show verified lead counts instead of a generic listing placeholder.
- Kept marketplace trend leads separate from the trusted checkout catalog.

### Data and rights controls

- Did not copy third-party marketplace product images.
- Did not publish unverified prices, inventory, sales, authenticity, authorization, or cross-border eligibility.
- Left 1688, Taobao/Tmall, and Pinduoduo in `source_access_pending` until official access is approved.

## 2026-07-23 - First-stage sourcing model implementation

### Added

- Added item-level sourcing, fulfillment, return, cancellation, import, safety, and image-source policy fields.
- Added server-side order, consent, policy-version, payment, and webhook event records.
- Added the complete first-stage legal and policy page set under `web/legal`.
- Added a minimum production database migration plan.

### Changed

- Repositioned the customer experience as an independent sourcing service for United States delivery.
- Made checkout fail closed when Stripe is unavailable and required a production webhook for live production payments.
- Moved Stripe amount calculation to trusted server catalog data.
- Disabled browser-only customer authentication and admin operations.
- Replaced unsupported guarantees with scoped, item-specific disclosures.

### Security

- Removed the public default administrator credentials.
- Removed browser-local passwords, admin privileges, orders, and inventory from the active storefront store module.
- Preserved only non-sensitive cart and language preferences in browser storage.

### Review status

All legal pages remain Draft and contain owner and professional-review placeholders. This implementation is not legal advice and does not provide entity-level liability protection.

## 2026-07-22 — Foundation specification created

### Added

- Created the governance system, change workflow, decision log, and controlled glossary.
- Created eleven Foundation documents covering product scope, mission, vision, values, brand, positioning, business model, target users, competitive landscape, success metrics, and roadmap.
- Compared Proxy Purchasing Agent, Marketplace, and Merchant of Record models.
- Registered unresolved commercial and legal questions with stable identifiers.
- Created reserved directories for phases `02` through `12`.

### Governance note

The previous `docs/global-curated-trade-platform/` content remains in place as non-authoritative historical reference. No business code or runtime configuration was changed.
