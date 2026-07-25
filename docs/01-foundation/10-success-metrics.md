# Success Metrics

- **Title:** Success Metrics
- **Version:** 1.0.0
- **Status:** Draft
- **Owner:** Product, Operations & Finance
- **Last Updated:** 2026-07-22
- **Related Documents:** [Business Model](07-business-model.md), [Target Users](08-target-users.md), [Roadmap](11-long-term-roadmap.md)

## Measurement principle

The MVP succeeds by proving trustworthy, repeatable, and economically supportable transactions—not by maximizing traffic, listings, or gross merchandise value in isolation.

## North-star candidate

**Successful cross-border orders with positive contribution margin**

An order qualifies only when it:

- was accepted and fulfilled through an approved lane;
- reached the agreed terminal milestone;
- has no unresolved material claim after the measurement window;
- has passed the relevant refund and chargeback observation window; and
- generated positive contribution margin under the approved formula.

The exact terminal milestone and observation window are not yet approved.

## Metric framework

| Area | Metric | Definition | Why it matters |
|---|---|---|---|
| Demand | Qualified order intent | Eligible checkout, sourcing request, or deposit event from a target user | Separates real demand from browsing |
| Conversion | Qualified-intent-to-accepted-order rate | Accepted orders divided by qualified order intents | Tests offer clarity and availability |
| Access | Sourcing success rate | Eligible requests successfully confirmed with a Source Merchant | Tests actual product access |
| Fulfillment | Order Success Rate | Successful orders divided by accepted orders after the observation window | Measures end-to-end reliability |
| Reliability | On-time milestone rate | Orders reaching a controlled milestone within its stated range | Measures expectation accuracy without claiming carrier control |
| Transparency | Pre-purchase cost variance | Absolute difference between disclosed expected cost and final buyer cost | Tests landed-cost clarity |
| Support | First meaningful response time | Time to a response that advances resolution, excluding automated acknowledgement | Measures support usefulness |
| Resolution | Exception resolution time | Time from detected exception to documented resolution | Measures operational control |
| Quality | Material claim rate | Orders with wrong-item, damage, authenticity, quality, loss, or undisclosed-cost claims | Identifies trust failures |
| Payments | Refund completion time | Time from approved refund to processor submission and customer confirmation where observable | Tests remedy execution |
| Risk | Chargeback rate | Chargeback count and value divided by eligible transactions and volume | Protects payment access and margin |
| Economics | Net revenue per order | Recognized service, commission, and other revenue net of pass-through amounts | Establishes monetization |
| Economics | Contribution margin per order | Net revenue minus approved variable costs attributable to the order | Tests sustainability |
| Retention | Repeat purchase rate | Eligible buyers completing another order within an approved window | Tests recurring value |
| Partners | Partner SLA attainment | Eligible partner milestones completed within agreed service levels | Supports partner governance |

## Contribution margin draft formula

`Contribution margin = recognized net revenue - payment fees - sourcing labor - variable support - shipping subsidy - verification cost - refunds/claims/chargebacks retained by Platform - other order-variable costs`

Pass-through product price, shipping, duties, and taxes should not be counted as Platform revenue unless accounting treatment supports recognition.

> [LEGAL REVIEW REQUIRED: LR-009] Legal and accounting advisors must review revenue recognition, gross-versus-net presentation, taxes, pass-through funds, credits, and protection-service reserves.

## Guardrail metrics

- restricted-product attempts and confirmed violations;
- sanctions or screening exceptions;
- privacy/security incidents;
- customs holds caused by inaccurate Platform or partner data;
- partner cancellation and substitution rates;
- negative contribution orders;
- support backlog age;
- repeat claims by buyer, merchant, product, or lane; and
- product safety or recall events.

## Reporting cuts

Metrics should be segmented by:

- source and destination country;
- product category and protection tier;
- Source Merchant, sourcing partner, warehouse, and carrier;
- new versus repeat buyer;
- transaction model; and
- failure type.

Aggregated global averages must not hide a failing lane or partner.

## Targets and gates

No numeric target is approved. Targets require baseline data, observation windows, and explicit go/no-go consequences.

> [DECISION REQUIRED: DR-013] Approve metric targets, windows, data owners, reporting frequency, and pilot/expansion/stop thresholds.

> [TECHNICAL REVIEW REQUIRED: TR-003] Define event taxonomy, source-of-truth tables, identity rules, metric queries, auditability, and privacy controls before metrics are used for operational decisions.

## Anti-metrics

The following must not be used alone as evidence of success:

- registered users;
- catalog size;
- page views;
- gross order value;
- social impressions; or
- orders acquired through unsustainable subsidies.
