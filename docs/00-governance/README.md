# Product Specification System

- **Title:** Product Specification System
- **Version:** 1.0.0
- **Status:** Draft
- **Owner:** Product & Operations
- **Last Updated:** 2026-07-22
- **Related Documents:** [Changelog](CHANGELOG.md), [Decision Log](DECISION-LOG.md), [Glossary](GLOSSARY.md), [Project Overview](../01-foundation/01-project-overview.md)

## Purpose

This directory defines how the Orbmare / 傲马 product specification is maintained. The documents under `00-governance` and `01-foundation` are the current product source of truth for the Foundation phase. Product behavior, operating procedures, legal drafts, and technical implementation must not contradict an Approved document in this system.

The existing `docs/global-curated-trade-platform/` directory is historical reference material. It is not authoritative and must not be used to settle a conflict with this specification.

## Document map

| Area | Purpose | Current phase |
|---|---|---|
| `00-governance` | Change control, decisions, definitions, and navigation | Active |
| `01-foundation` | Product identity, positioning, users, economics, and roadmap | Active |
| `02-business-rules` | Commercial policies and rule hierarchy | Reserved |
| `03-buyer-system` | Buyer journeys, eligibility, and service levels | Reserved |
| `04-seller-system` | Merchant, brand, and sourcing-partner operations | Reserved |
| `05-product-catalog` | Catalog standards, curation, and authenticity tiers | Reserved |
| `06-orders-payments` | Order lifecycle, payment, refunds, and chargebacks | Reserved |
| `07-shipping-customs` | Logistics, duties, customs, and importer responsibilities | Reserved |
| `08-returns-disputes` | Returns, claims, disputes, and remedies | Reserved |
| `09-risk-compliance` | Fraud, sanctions, product, privacy, and regulatory controls | Reserved |
| `10-admin-operations` | Internal workflows, permissions, and reporting | Reserved |
| `11-technical-architecture` | Systems, data, integrations, and non-functional requirements | Reserved |
| `12-legal-drafts` | Lawyer-reviewed customer and partner documents | Reserved |

## Required metadata

Every specification file must begin with:

- Title
- Version
- Status
- Owner
- Last Updated
- Related Documents

Allowed status values are `Draft`, `Under Review`, `Approved`, and `Deprecated`.

## Authority and conflict rules

1. An Approved document outranks an Under Review or Draft document.
2. Within the same status, the more specific document outranks a general document only when it explicitly links to the governing rule.
3. Code and current operations are evidence of implementation, not automatic product policy.
4. A conflict must be recorded in the Decision Log before either statement is replaced.
5. Legal conclusions may not be treated as approved until reviewed by qualified counsel in each relevant jurisdiction.
6. Historical documents remain reference-only until reconciled through the normal review process.

## Change workflow

1. Identify the affected documents and definitions.
2. Add or update a Decision Log entry for any material commercial choice.
3. Edit the smallest set of documents needed to keep the system consistent.
4. Add unresolved issues using an approved marker.
5. Update versions and `Last Updated`.
6. Add a Changelog entry.
7. Run link, marker, metadata, and contradiction checks.
8. Move a document to Under Review or Approved only with the accountable owner's approval.

## Required markers

- `[DECISION REQUIRED]` — a product or commercial owner must choose.
- `[LEGAL REVIEW REQUIRED]` — qualified counsel must review the statement or draft.
- `[TECHNICAL REVIEW REQUIRED]` — engineering must validate feasibility, security, data, or integration implications.

Markers must include a stable identifier and a concrete question whenever practical, for example:

> [DECISION REQUIRED: DR-001] Which legal/commercial operating model will govern the MVP?

## Ownership

`Product & Operations` is the provisional document owner. Named accountable executives, legal owners, and approval authorities remain to be assigned.

> [DECISION REQUIRED: DR-002] Assign the accountable product owner and approval authority for this specification system.

## Phase-one acceptance criteria

The Foundation phase is complete when:

- all `00-governance` and `01-foundation` files exist and follow the metadata standard;
- key terms are defined once in the Glossary;
- material commercial choices appear in the Decision Log;
- the three operating models are compared without silently selecting one;
- legal assumptions are clearly marked;
- success metrics have definitions even where targets remain undecided; and
- the roadmap states validation gates rather than promising unsupported dates.
