# Business Model

- **Title:** Business Model
- **Version:** 1.0.0
- **Status:** Draft
- **Owner:** Product, Operations & Finance
- **Last Updated:** 2026-07-22
- **Related Documents:** [Platform Positioning](06-platform-positioning.md), [Decision Log](../00-governance/DECISION-LOG.md), [Success Metrics](10-success-metrics.md), [Glossary](../00-governance/GLOSSARY.md)

## Purpose

This document compares three operating models and defines a recommended staged direction. It does not select the final legal structure. Labels such as `agent`, `marketplace`, and `Merchant of Record` are not sufficient on their own; actual obligations depend on contracts, fund flow, customer representation, conduct, product category, and jurisdiction.

> [DECISION REQUIRED: DR-001] Select the MVP legal/commercial operating model and approve the corresponding customer, merchant, payment, tax, and logistics structure.

> [LEGAL REVIEW REQUIRED: LR-004] Qualified counsel must validate the selected model in each source and destination jurisdiction before paid launch.

## Model comparison

The table describes common configurations, not universal legal conclusions.

| Dimension | Proxy Purchasing Agent | Marketplace | Merchant of Record |
|---|---|---|---|
| **Who is the Legal Seller** | Commonly the Source Merchant; the agent procures on the buyer's behalf. Agency terms and local law must support this. | Usually the independent marketplace merchant. The Platform facilitates the transaction. | The MoR is presented as and generally acts as the seller to the customer. |
| **Who collects customer payment** | The agent may collect procurement funds and a service fee, or the buyer may pay components separately. Fund flow must match agency disclosures. | The Platform or payment provider may collect and split/settle funds for sellers. | The MoR collects customer payment. |
| **Who issues receipt or invoice** | The Source Merchant may issue the product receipt; the agent may issue a service receipt or combined statement where lawful. | The seller generally issues the sales invoice; the Platform may issue fee or payment records depending on structure. | The MoR generally issues the customer sales receipt or invoice. |
| **Who bears refunds** | Allocation depends on cause: merchant cancellation, procurement failure, logistics event, or agent service failure. The agent may coordinate and temporarily advance funds only if approved. | Seller commonly funds product refunds; Platform policy, reserves, or guarantees may create Platform exposure. | The MoR generally owes and processes customer refunds, then seeks recovery from suppliers where available. |
| **Who bears chargebacks** | The party whose merchant account receives payment is exposed to the payment reversal, even if contracts permit recovery from another party. | Often the Platform/payment account is operationally exposed, with contractual allocation to sellers and reserves. | The MoR generally bears primary chargeback exposure. |
| **Who is responsible for authenticity** | Source Merchant is generally responsible for product representations; the agent is responsible for its own sourcing and verification promises. | Seller is generally responsible, while Platform policy, notice, verification, and consumer law may add duties. | The MoR directly makes or adopts the sale representation and usually carries greater customer-facing responsibility. |
| **Who bears product liability** | Manufacturer, Source Merchant, importer, distributor, agent, or others may have exposure depending on facts and law; contract labels do not eliminate statutory liability. | Manufacturer and seller are central, but Platform liability may arise from conduct, control, category, jurisdiction, or statutory rules. | The MoR has greater seller/distributor exposure; manufacturers and importers may also remain liable. |
| **Who is Importer of Record** | Often the buyer in a direct-to-consumer agency structure, but the agent, merchant, carrier, or customs representative may take the role in some lanes. | Commonly the buyer or seller, depending on delivery terms and destination structure. | May be the MoR, buyer, or a designated importing entity; it must be explicitly structured per lane. |
| **Who handles customs** | Carrier/broker performs processing; buyer usually supplies information and pays import charges under the proposed direction; agent coordinates. | Seller, buyer, Platform, carrier, or broker may perform different tasks according to delivery terms. | MoR often offers more integrated customs and landed-cost handling, directly or through partners. |
| **Who controls logistics** | Source Merchant or partner physically fulfills; agent selects/coordinates options and tracks handoffs. | Seller often fulfills under Platform standards; Platform may offer labels, consolidation, or managed logistics. | MoR typically controls the customer promise and contracts the fulfillment chain more directly. |
| **User experience** | Can be unified, but needs unusually clear role, fee, availability, cancellation, and import disclosures. Procurement may add confirmation time. | Familiar merchant-order experience; quality can vary unless seller admission and standards are controlled. | Most unified experience, with one seller, payment, refund, and support relationship. |
| **Operational complexity** | Medium: sourcing, availability confirmation, fund reconciliation, multi-party tracking, and exception coordination. | High: seller onboarding, catalog governance, settlement, enforcement, reserves, and dispute systems. | Very high: procurement, tax, payment, invoicing, returns, liability, compliance, and working-capital control. |
| **Legal risk** | Medium and jurisdiction-sensitive; risk rises if conduct or UX contradicts agency status. | Medium to high; depends on seller control, product scope, platform duties, payments, and consumer law. | High because the Platform assumes the direct seller role and associated obligations. |
| **Profit potential** | Moderate service-fee margin with relatively low inventory capital; depends on procurement and support cost. | Potentially scalable commission and service revenue; requires sufficient liquidity and seller quality. | Potentially higher gross margin and customer lifetime value, offset by tax, fraud, returns, liability, insurance, compliance, and working capital. |
| **MVP suitability** | **Potentially suitable** for a narrow, controlled pilot if agency, payment, import, and disclosure structure is legally validated. | **Partially suitable** only as a highly controlled/manual model; full seller self-service is premature. | **Generally unsuitable** for the early MVP unless the complete supporting architecture already exists. |

## Recommended initial direction

The recommended direction is a controlled Proxy Purchasing Agent-style MVP:

- the Platform provides the unified order interface, payment presentation, tracking, and support coordination;
- procurement is performed by the Platform or approved purchasing partners against a defined buyer instruction;
- the buyer is usually expected to act as Importer of Record;
- third-party product quality is not covered by an unlimited Platform guarantee;
- curated or certified products may receive enhanced protection under a defined standard;
- catalog, routes, partners, and order volume remain constrained; and
- operational evidence is collected before Marketplace expansion.

This recommendation is conditional. It is not an approved legal characterization and should not be implemented in customer terms until legal review is complete.

> [DECISION REQUIRED: DR-004] Define when the buyer acts as Importer of Record, how that fact is accepted, and which destinations or products require a different structure.

> [LEGAL REVIEW REQUIRED: LR-005] Review agency formation, authority to purchase, title and risk transfer, cancellation rights, consumer disclosures, customs representation, tax nexus, money transmission/payment services, and receipt requirements.

## Proposed transaction flow for evaluation

1. Buyer sees a curated product or submits an eligible request.
2. Platform shows product price basis, Platform fees, shipping estimate, import assumptions, availability status, and protection tier.
3. Buyer accepts the procurement instruction and applicable disclosures.
4. Platform or approved partner confirms availability and purchases from the Source Merchant.
5. Merchant, warehouse, or logistics partner ships internationally.
6. Platform aggregates milestones and coordinates exceptions.
7. Buyer completes import requirements where the approved lane assigns that role to the buyer.
8. Platform provides support and remedies according to the approved responsibility matrix.

The sequence of fund capture, purchase confirmation, cancellation, and refund remains undecided.

> [DECISION REQUIRED: DR-005] Approve whether funds are authorized or captured before sourcing, how fees are displayed, and whether duties/taxes are estimated, prepaid, or collected on delivery.

> [DECISION REQUIRED: DR-007] Approve the responsibility matrix for unavailability, merchant cancellation, wrong item, counterfeit claim, damage, loss, delay, customs refusal, buyer non-cooperation, return, refund, and chargeback.

## Revenue model

| Revenue stream | Customer value | Primary cost/risk | Proposed stage |
|---|---|---|---|
| Service fee | Procurement and coordination | Sourcing labor, support, payment costs | MVP candidate |
| Transaction commission | Qualified demand and transaction infrastructure for merchants | Seller acquisition, enforcement, settlement | MVP partner-specific or Stage 2 |
| Logistics service | Better routing, consolidation, tracking, or exception handling | Carrier cost, claims, volumetric variance | Pilot after lane validation |
| Protection service | Defined additional remedies | Adverse selection, claims, fraud, legal characterization | After policy and reserve design |
| Membership service | Recurring benefits for repeat buyers | Benefit utilization and retention risk | After repeat demand is proven |
| Merchant/brand services | Curation, merchandising, insights, localization, or campaign support | Delivery capacity and conflicts of interest | Stage 2 candidate |

No fee rate, commission, markup, reserve, or membership benefit is approved.

> [DECISION REQUIRED: DR-011] Approve revenue ownership, fee formulas, disclosure method, minimum contribution margin, and treatment of currency/payment costs.

> [LEGAL REVIEW REQUIRED: LR-006] Determine whether protection, logistics, membership, currency conversion, or payment features trigger insurance, travel/seller-of-record, money services, lending, unfair-practices, or other regulated activity.

## Cost structure

Variable costs may include:

- payment processing and currency conversion;
- sourcing and availability confirmation;
- merchant or partner compensation;
- international shipping, consolidation, and packaging;
- customs brokerage or documentation;
- customer support and translation;
- refunds, claims, chargebacks, fraud, and protection remedies; and
- product verification.

Fixed or step costs may include engineering, partner integrations, compliance, legal, insurance, catalog operations, support management, and market entry.

## Economics guardrails

The Platform should not scale a lane until it can measure:

- net revenue per completed order;
- contribution margin after support and exception costs;
- cancellation, refund, chargeback, and loss rates;
- cash conversion and refund timing;
- partner reliability; and
- repeat purchase or another credible retention signal.

## Evolution gates

### Proxy service to controlled Marketplace

Consider expansion only when:

- repeatable buyer demand exists;
- seller onboarding and verification standards are documented;
- catalog and restricted-product controls are enforceable;
- settlement, reserves, refunds, and disputes are operational;
- service levels are measurable; and
- contracts and consumer disclosures are approved.

### Controlled Marketplace to selective MoR

Consider MoR only when:

- entity and jurisdiction strategy is approved;
- tax registration, invoicing, payments, and refunds are production-ready;
- product liability, insurance, recall, sanctions, privacy, and consumer-law controls are funded;
- import and customs responsibilities are defined by lane;
- supplier recourse and working capital are sufficient; and
- the expected margin justifies the added exposure.

> [DECISION REQUIRED: DR-015] Approve a transaction-class and jurisdiction-specific MoR gate; do not treat MoR as a universal platform status.

> [TECHNICAL REVIEW REQUIRED: TR-002] Map each candidate model to required payment accounts, ledger, order states, receipts, tax data, partner settlement, refunds, disputes, audit records, and role disclosures.
