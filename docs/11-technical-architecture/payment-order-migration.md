# Payment and Order Database Migration

- **Title:** Payment and Order Database Migration
- **Version:** 0.1.0
- **Status:** Draft
- **Owner:** Engineering & Operations
- **Last Updated:** 2026-07-23
- **Related Documents:** [Business Model](../01-foundation/07-business-model.md), [Success Metrics](../01-foundation/10-success-metrics.md), [Decision Log](../00-governance/DECISION-LOG.md)

## Current safety boundary

The first-stage engineering draft stores server-side order and consent records in a private JSON runtime file excluded from Git. This removes active orders and consent evidence from browser storage, but it is not a production database and does not provide multi-instance consistency, backups, row-level locking, encryption management, retention automation, or operator authentication.

Production deployment remains blocked until a durable database and secure operations access are implemented.

## Minimum production schema

- `orders`: immutable public ID, customer reference, currency, trusted totals, current status, timestamps.
- `order_items`: product and variant IDs, trusted price snapshot, quantity, policy snapshot.
- `consent_records`: consent ID, order ID, accepted policy versions, timestamp, language, session audit ID.
- `addresses`: encrypted or access-controlled delivery fields with retention rules.
- `payments`: Stripe PaymentIntent ID, amount, currency, status, event timestamps.
- `webhook_events`: Stripe event ID with unique constraint for idempotency.
- `order_status_history`: append-only status, actor, timestamp, reason.
- `refunds_and_claims`: reason, evidence references, responsibility, amount, status, deadlines.
- `admin_users_and_roles`: external identity reference, role, status, MFA state; never plaintext passwords.
- `audit_log`: actor, action, target, time, and security context.

## Required controls

1. Database transactions must atomically update payment and order state.
2. Stripe event IDs and PaymentIntent IDs require unique constraints.
3. Sensitive fields require least-privilege access, encrypted transport, managed backups, and documented retention.
4. Admin access requires server-side sessions, MFA, CSRF protection, rate limiting, role-based authorization, and audit logs.
5. Logs must redact addresses, contact data, payment details, secrets, and authentication tokens.
6. Inventory and price availability require a trusted server-side source.
7. Operational tools must never use customer-facing localStorage as authority.

> [TECHNICAL REVIEW REQUIRED] Select the production database, hosting region, backup/restore objective, encryption ownership, identity provider, and deployment topology.

> [LEGAL REVIEW REQUIRED] Approve retention, deletion exceptions, international data access, vendor agreements, breach response, and employee/contractor access rules.
