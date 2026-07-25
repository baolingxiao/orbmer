# Product Decision Log

- **Title:** Product Decision Log
- **Version:** 1.2.0
- **Status:** Draft
- **Owner:** Product & Operations
- **Last Updated:** 2026-07-23
- **Related Documents:** [Governance README](README.md), [Business Model](../01-foundation/07-business-model.md), [Platform Positioning](../01-foundation/06-platform-positioning.md), [Roadmap](../01-foundation/11-long-term-roadmap.md)

## How to use this log

Every material product or commercial decision receives a stable ID. Open decisions use `Proposed` or `Open`; closed decisions record the approver, date, rationale, affected documents, and superseded decision where applicable. This log does not turn a proposal into an approved policy.

## Open decisions

| ID | Decision required | Current direction, not an approved rule | Owner | State | Target stage |
|---|---|---|---|---|---|
| DR-001 | Select the MVP legal/commercial operating model and jurisdiction-specific contract structure. | Owner direction recorded: independently operated cross-border purchasing service; legal characterization remains subject to counsel. | Owner + Legal | Owner direction recorded; legal review open | Before paid MVP |
| DR-002 | Assign the specification owner and approval authority. | Product & Operations is provisional owner. | Executive | Open | Before Foundation approval |
| DR-003 | Define the platform's contracting legal entity and initial launch jurisdictions. | Owner states the first stage is operated by an individual, not an LLC or corporation, and serves United States delivery addresses. Personal identity and residential address remain private. | Owner + Legal | Partially decided; disclosure review open | Before paid MVP |
| DR-004 | Define when the buyer is the importer of record and what exceptions apply. | Owner direction: buyer usually acts as importer; lane-specific legal validation and exceptions remain open. | Legal + Operations | Owner direction recorded; legal review open | Before paid MVP |
| DR-005 | Approve the displayed price structure, service fee disclosure, and duty/tax treatment. | Prefer itemized, understandable landed-cost estimates; no fee formula is approved. | Product + Finance + Legal | Open | Before checkout launch |
| DR-006 | Define the standard protection promise and the enhanced protection offered to curated or certified products. | Tiered protection is preferred; remedies and eligibility are undecided. | Product + Legal + Operations | Open | Before catalog launch |
| DR-007 | Define refund, cancellation, return, and chargeback responsibility by failure type. | Responsibility should follow control and fault, subject to law and payment-network rules. | Operations + Finance + Legal | Open | Before paid MVP |
| DR-008 | Define prohibited, restricted, and unsupported product categories and destinations. | Launch with a narrow curated catalog and destination matrix. | Risk + Legal + Operations | Open | Before catalog launch |
| DR-009 | Select the initial buyer segment, source countries, destination countries, and category wedge. | United States delivery only; China-to-US is the priority lane; broader source countries and exact category wedge remain open. | Product + Growth | Partially decided | Before MVP scope lock |
| DR-010 | Approve the MVP service-level objectives for sourcing, order confirmation, tracking, and support. | Provide clear milestones without promising carrier-controlled delivery dates. | Operations + Support | Open | Before public launch |
| DR-011 | Approve revenue streams, pricing ownership, and unit-economics guardrails. | Service fees and transaction commission are likely first; logistics, protection, and membership require validation. | Executive + Finance | Open | Before paid MVP |
| DR-012 | Define merchant/brand participation and progression from sourcing relationships to a controlled Marketplace. | Marketplace capabilities should be gated by operational evidence. | Product + Operations + Legal | Open | Before Stage 2 |
| DR-013 | Approve success metric targets, reporting windows, and go/no-go thresholds. | Use the metric framework in `10-success-metrics.md`; targets remain unset. | Product + Finance + Operations | Open | Before pilot |
| DR-014 | Define brand architecture for the platform, regional pavilions, and vertical stores. | Orbmare / 傲马 is the current umbrella brand; endorsement rules are undecided. | Brand + Product | Open | Before broad marketing |
| DR-015 | Decide whether and when the platform may become Merchant of Record for selected transactions. | Do not adopt full MoR responsibility until tax, payment, insurance, compliance, and legal architecture are proven. | Executive + Legal + Finance | Open | Stage 3 gate |
| DR-016 | Approve official marketplace data sources, display rights, refresh cadence, expiration rules, and affiliate disclosures for trend sourcing leads. | Publish only dated, source-linked procurement leads; require official APIs or written permission for automated refresh; keep price, stock, authorization, and cross-border eligibility unverified until product review. | Product + Legal + Operations + Engineering | Open; manual JD snapshot implemented | Before automated catalog refresh |
| DR-017 | Approve the production operations identity, role model, database, inventory reservation lifecycle, audit retention, and multi-factor authentication requirements. | A protected same-domain single-owner console is implemented for the single-instance MVP; PostgreSQL, role separation, and mandatory MFA remain production gates. | Owner + Operations + Security + Engineering + Legal | Open; secure local MVP implemented | Before production operations |

## Recorded provisional directions

These directions document the working brief and remain subject to the open decisions above:

- The platform aims to remain asset-light and generally avoid holding long-term inventory.
- The MVP should resemble a controlled proxy purchasing service.
- The platform should provide a unified ordering experience, payment presentation, tracking, and customer-support coordination.
- The buyer will usually be presented as importer of record, subject to legal review and destination-specific exceptions.
- Third-party product quality will not receive an unlimited platform guarantee.
- Curated or certified products may receive enhanced protection.
- A controlled Marketplace may follow after operational validation.
- Full Merchant of Record responsibility is not recommended for the early stage.

## Conflict register

| ID | Conflict or ambiguity | Affected sources | Handling |
|---|---|---|---|
| CR-001 | Existing storefront code can present the platform as the direct seller, while the proposed MVP may operate as a purchasing agent. | Runtime UI, checkout, Foundation documents | Do not infer legal role from UI. Resolve through DR-001 and later align UX and terms. |
| CR-002 | Existing historical documentation labels itself a living specification but contains mostly unapproved placeholders. | `docs/global-curated-trade-platform/`, new specification | New governance README declares the old directory non-authoritative; retain it until archived through an explicit decision. |
| CR-003 | Unified payment collection can make the platform appear to be Merchant of Record even when the intended contract model is agency. | Checkout design, payment processor configuration, receipts | Resolve through legal/payment architecture review under DR-001, DR-003, and DR-005. |

## Closed decisions

No major commercial decisions have been approved in this system yet.
