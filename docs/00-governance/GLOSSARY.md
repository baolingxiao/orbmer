# Product Glossary

- **Title:** Product Glossary
- **Version:** 1.2.0
- **Status:** Draft
- **Owner:** Product & Operations
- **Last Updated:** 2026-07-23
- **Related Documents:** [Project Overview](../01-foundation/01-project-overview.md), [Business Model](../01-foundation/07-business-model.md), [Success Metrics](../01-foundation/10-success-metrics.md), [China Trend Sourcing Leads](../05-product-catalog/01-china-trend-sourcing.md), [Operations Console](../10-admin-operations/01-operations-console.md)

## Controlled terms

| Term | Definition in this specification |
|---|---|
| **Orbmare / 傲马** | The current umbrella product brand for the global curated purchasing and cross-border transaction platform. |
| **Platform** | The digital service, operational workflows, and partner network through which buyers discover products, request or place orders, pay, track fulfillment, and obtain support. It does not by itself determine the legal seller. |
| **Platform Operator** | The legal entity that operates the Platform. The entity is not yet selected. |
| **Buyer / Customer** | A person or organization seeking to acquire a product through the Platform. |
| **Merchant / Seller** | The party legally selling a product in a given transaction. This may be a source merchant, marketplace merchant, or Platform Operator depending on the approved model. |
| **Source Merchant** | The overseas retailer, brand, or other merchant from whom a product is sourced. |
| **Brand** | The owner or authorized controller of a product brand, whether or not it directly sells through the Platform. |
| **Sourcing Partner / Purchasing Partner** | A third party authorized to locate or purchase goods for a buyer or the Platform under an agreed operating model. |
| **Proxy Purchasing Agent** | A model in which the Platform or partner acts on a buyer's instruction to procure goods from a Source Merchant, usually charging a disclosed service fee. Exact agency status depends on contract and law. |
| **Marketplace** | A model in which the Platform facilitates transactions between buyers and independent sellers, with role allocation defined by the marketplace agreement and applicable law. |
| **Merchant of Record (MoR)** | The entity presented as the seller for a transaction and typically responsible for customer payment, receipts, refunds, chargebacks, and relevant tax/compliance obligations. Exact duties vary by jurisdiction and arrangement. |
| **Legal Seller** | The party legally responsible for selling the product to the buyer in the transaction. |
| **Importer of Record (IoR)** | The party legally responsible for the import declaration and associated import obligations. The role varies by destination and shipping arrangement. |
| **Curated Product** | A product actively selected against documented catalog criteria. Curation alone does not equal authenticity certification or an unlimited quality guarantee. |
| **Certified Product** | A product that has passed an enhanced verification standard that is not yet defined. |
| **Standard Protection** | The baseline buyer remedy and support package. Scope is not yet approved. |
| **Enhanced Protection** | Additional remedies or assurance for eligible curated or certified products. Scope and pricing are not yet approved. |
| **Authenticity** | Whether a product is genuine and originates from an authorized or otherwise legitimate source. |
| **Product Liability** | Legal responsibility for harm or damage caused by a product. Allocation cannot be determined solely by a contract label. |
| **Service Fee** | A disclosed amount charged for procurement, coordination, or another Platform service. |
| **Transaction Commission** | Compensation calculated from a transaction and paid by a merchant, partner, or another approved party. |
| **Logistics Service** | Optional or bundled coordination of shipment, consolidation, tracking, insurance, or customs-support services. |
| **Protection Service** | A service providing defined additional buyer remedies or transaction assurance. It is not insurance unless legally structured and licensed as such. |
| **Membership Service** | A recurring paid plan providing defined platform benefits. No membership package is approved. |
| **Landed Cost** | The expected total cost to receive a product, potentially including product price, service fees, shipping, duties, taxes, and other disclosed charges. |
| **Asset-light** | An operating approach that avoids long-term inventory ownership and heavy fixed fulfillment infrastructure where partners can provide the capability. It does not mean the Platform has no operational or legal responsibility. |
| **Controlled Marketplace** | A marketplace with restricted seller admission, product scope, service standards, and enforcement rather than unrestricted seller self-service. |
| **Order Milestone** | A buyer-visible state such as requested, sourced, purchased, shipped, customs processing, delivered, or exception. Final lifecycle definitions are pending. |
| **Chargeback** | A payment reversal initiated through a card issuer or payment network. |
| **Dispute** | A buyer, merchant, logistics, or payment claim requiring investigation and resolution. |
| **Refund** | Money returned for all or part of a transaction under an approved policy or legal requirement. |
| **Return** | Physical movement of a delivered or shipped product back to a designated party. A refund does not always require a return, and a return does not automatically guarantee a refund. |
| **Customs** | Government procedures for declaring, inspecting, valuing, and admitting goods across borders. |
| **Duties and Import Taxes** | Government charges associated with importation. Treatment and collection vary by jurisdiction and shipping arrangement. |
| **MVP** | The smallest controlled product and operating scope capable of testing demand, fulfillment reliability, economics, and trust without assuming unvalidated scale. |
| **Pilot** | A limited release with constrained users, categories, routes, or order volume used to validate the operating model. |
| **Contribution Margin** | Net revenue remaining after variable costs attributable to fulfilling and supporting an order, using the formula approved in the metrics specification. |
| **Order Success Rate** | The share of accepted orders delivered without cancellation, refund, chargeback, or unresolved material claim, measured using an approved time window. |
| **Cross-border Lane** | A defined source-country to destination-country route with known commercial, logistics, customs, and compliance conditions. |
| **Trend Sourcing Lead** | A dated, source-linked product discovery record derived from defined popularity evidence. It is not inventory, an offer for sale, an authenticity finding, or approval for cross-border procurement. |
| **Verified Snapshot** | A source record whose title, source link, observation date, and stated popularity evidence were reviewed against an official platform source. Verification applies to the recorded observation only and does not make changing fields current. |
| **Source Access Pending** | A state used when official API credentials, written permission, or another required access condition has not been obtained. No item from that source may be presented as a verified trend lead. |
| **Popularity Evidence** | The exact source-visible basis for describing an item as ranked or popular, such as a named ranking position. Comments, views, recommendations, and sales must remain distinct metrics. |
| **Operations Console** | The protected same-domain internal interface for managing the trusted catalog, inventory, order milestones, shipment records, and audit events. It is not a consumer account area or seller portal. |
| **Source After Order Inventory** | A supply mode in which the Platform does not claim physical on-hand inventory and verifies supplier availability through the approved post-order workflow. |
| **Available to Sell** | For managed physical inventory, on-hand units minus reserved units. It is an operational quantity and not a guarantee that the product is legally or logistically eligible for every destination. |
| **Admin Audit Event** | An append-only operational record identifying the authorized actor, time, action, affected entity, and limited non-secret details. |

## Terminology rules

- Do not use `seller`, `merchant`, `agent`, or `MoR` interchangeably.
- Do not call a product `certified`, `authenticated`, or `guaranteed` until the relevant standard and remedy are approved.
- Do not describe an estimated landed cost as final unless duties, taxes, and fees are contractually fixed.
- Customer-facing language must reflect the approved transaction model, not merely the payment flow.
- Do not call a Trend Sourcing Lead `in stock`, `available`, `authorized`, or `for sale` until the corresponding catalog review is complete.
