# Operations Console Specification

- **Title:** Operations Console Specification
- **Version:** 0.1.0
- **Status:** Draft
- **Owner:** Product & Operations + Engineering
- **Last Updated:** 2026-07-23
- **Related Documents:** [Decision Log](../00-governance/DECISION-LOG.md), [Glossary](../00-governance/GLOSSARY.md), [Business Model](../01-foundation/07-business-model.md), [Technical Architecture](../11-technical-architecture/)

## Purpose

The Operations Console is the same-domain internal interface for managing the trusted consumer catalog, inventory availability, order milestones, international shipment records, and administrative audit events.

It is not a seller portal, supplier portal, customer account area, warehouse-management system, or carrier system of record.

## Access and isolation

The console uses all of the following controls:

1. A configurable, non-public route supplied through `ADMIN_ROUTE`.
2. No link from consumer pages, public navigation, sitemap, or documentation intended for customers.
3. Conventional `/admin/` and `/admin.html` paths return `404`.
4. Server-side authentication using an administrator email and a scrypt password hash.
5. An `HttpOnly`, `SameSite=Strict` session cookie scoped to the private operations route.
6. CSRF validation and same-origin checks for every write.
7. Login-attempt throttling.
8. `noindex`, `noarchive`, frame denial, strict content security policy, and no-store response headers.
9. Protected operations APIs mounted under the same private route.
10. An audit event for each successful login, logout, product mutation, inventory change, and shipment update.

The private route is defense in depth, not an authentication mechanism.

## Current roles

The MVP has one `Owner Administrator` authority level. It can:

- Create and update product records.
- Move products among Draft, Published, and Archived states.
- Change inventory mode, on-hand quantity, reorder point, and per-order limit.
- View orders and customer delivery data.
- Change sourcing and shipment milestones.
- Add carrier and tracking data.
- Read the administrative audit trail.

[DECISION REQUIRED] Approve the production role model, including whether catalog editors, fulfillment operators, support agents, finance reviewers, and read-only auditors need separate permissions.

## Product publication

The runtime product store is the server-side source of truth for the consumer catalog.

- `Draft` products are visible only in the Operations Console.
- `Published` products are included in the consumer catalog module.
- `Archived` products are retained for audit and historical order references but are removed from the consumer catalog.
- Product IDs are immutable after creation.
- Product images must currently use managed local `/assets/` files.
- Consumer pages render administrator-supplied strings as text, not executable HTML.
- Checkout re-reads the current server record and does not trust cart prices, product status, or quantity limits from the browser.

## Inventory modes

### Source After Order

The platform does not claim an on-hand quantity. The per-order maximum is enforced, and supply remains subject to post-order verification.

### Stocked

The system records on-hand, reserved, available-to-sell, reorder point, and per-order maximum quantities.

`Available to Sell = On Hand - Reserved`

A published stocked product with zero available-to-sell units remains visible but cannot be added to cart or accepted by checkout.

### Unavailable

The product may remain Published for visibility, but purchase controls and checkout reject it.

[DECISION REQUIRED] Define when inventory is reserved, released, and permanently deducted across PaymentIntent creation, payment success, payment failure, cancellation, supplier rejection, and refund events.

## Orders and shipping

The console can update the controlled order status vocabulary and the following shipment data:

- Carrier
- Tracking number
- HTTPS tracking URL
- Estimated delivery date
- Shipment date
- Status note

Customer delivery data is visible only after authentication.

[DECISION REQUIRED] Select carrier aggregation and tracking providers, notification rules, customer-visible milestone wording, and service-level objectives.

## Storage and deployment

The current store uses atomic JSON replacement with restrictive file permissions. It is intended for:

- Local development
- A single server process
- A deployment with a durable mounted volume

It is not safe for multiple application instances, horizontal scaling, advanced reporting, or high-write inventory workloads.

[TECHNICAL REVIEW REQUIRED] Migrate products, inventory transactions, reservations, orders, shipments, sessions, administrator identities, and audit events to PostgreSQL before multi-instance production.

[DECISION REQUIRED] Approve the production identity provider, database, backup period, recovery objective, audit retention period, administrator session duration, and mandatory multi-factor authentication policy.

## Privacy and legal review

The console exposes customer identity, contact, delivery, order, and tracking data to authorized operations staff.

[LEGAL REVIEW REQUIRED] Confirm administrator access policies, employee or contractor confidentiality obligations, customer-data retention periods, incident-response duties, cross-border access restrictions, and privacy-notice disclosures.

## Operational checks

Before enabling production access:

- Generate the password hash outside source control.
- Use a unique private route and rotate it after suspected disclosure.
- Require HTTPS.
- Mount durable storage or complete the database migration.
- Back up catalog, order, shipment, and audit data.
- Test account recovery without using a shared mailbox password.
- Verify that `/admin/` returns `404`.
- Verify that unauthenticated operations API requests return `401`.
- Verify that writes without CSRF return `403`.
- Verify that Draft, Archived, Unavailable, and zero-stock products cannot be purchased.
