# China Trend Sourcing Leads

- **Title:** China Trend Sourcing Leads
- **Version:** 0.1.0
- **Status:** Draft
- **Owner:** Product & Operations
- **Last Updated:** 2026-07-23
- **Related Documents:** [Project Overview](../01-foundation/01-project-overview.md), [Business Model](../01-foundation/07-business-model.md), [Decision Log](../00-governance/DECISION-LOG.md), [Glossary](../00-governance/GLOSSARY.md)

## Purpose

This specification defines how public popularity signals from 1688, Taobao/Tmall, JD.com, and Pinduoduo may become China-region sourcing leads. It does not approve a product for sale, establish inventory, verify authenticity, or authorize the Platform to reuse third-party product content.

The customer-facing module is a discovery and procurement-research surface. It is separate from the trusted checkout catalog in `web/shared/js/catalog.js`.

## Publication semantics

A published trend item means only:

- an operator observed the named item on an official platform source;
- the official source displayed the recorded rank or popularity evidence on the observation date;
- the source link can be revisited for verification;
- the item has been mapped to one controlled Orbmare category.

A published trend item does not mean:

- Orbmare holds stock or has already purchased the item;
- the displayed source still has the same price, inventory, seller, rank, or terms;
- the source merchant or brand has authorized Orbmare;
- authenticity, safety, cross-border eligibility, duties, returns, or warranties have been verified;
- the item can be added to the Orbmare cart.

## Current source matrix

| Platform | Current evidence | Publication state | Required next step |
|---|---|---|---|
| JD.com | Six official public ranking pages were manually reviewed on 2026-07-23. | `verified_snapshot` for the six recorded leads only | Apply for JD Union/JOS access and replace manual snapshots with approved API data. |
| 1688 | No anonymous official source was found that exposed a current item, rank or sales evidence, and a directly reviewable product URL together. | `source_access_pending` | Obtain written authorization for cross-border selection data and approved API fields. |
| Taobao / Tmall | No non-personalized, current, anonymously reviewable official platform-wide hot list was found. Official guidance identifies page scraping as a prohibited application type. | `source_access_pending` | Complete Taobao Alliance media registration and use signed official material APIs. |
| Pinduoduo | Public mobile recommendations did not define whether order was platform-wide popularity, category rank, personalization, or advertising. The general crawler path is disallowed by `robots.txt`. | `source_access_pending` | Obtain Duoduo Jinbao credentials and use the official recommendation or search API. |

## Current verified snapshot

| Category | Item | Official evidence | Observation date |
|---|---|---|---|
| Furniture | Quanyou 1.8 m leather upholstered bed | JD.com luxury home ranking TOP 1; ranking page displayed 20,000 comments | 2026-07-23 |
| Kitchen | SUPOR eight-piece cookware set | JD.com cookware-set ranking TOP 1; ranking page displayed 2,000 comments | 2026-07-23 |
| Stationery | Deli S01 0.5 mm black gel pens, 12-pack | JD.com self-operated black-pen ranking TOP 1; ranking page displayed 5,000,000 comments | 2026-07-23 |
| Beauty | Jo Malone vitamin E lip conditioner, 15 ml | JD.com lip-conditioner ranking TOP 1; ranking page displayed 50,000 comments | 2026-07-23 |
| Pets | Metal-frame medium dog toilet | JD.com dog-toilet ranking TOP 1; ranking page displayed 20,000 comments | 2026-07-23 |
| Outdoor | Decathlon 800 ml stainless-steel insulated bottle | JD.com Decathlon insulated-bottle ranking TOP 1; ranking page displayed 5,000 comments | 2026-07-23 |

Comment counts are source-page evidence only. They must not be relabeled as sales.

## Controlled data model

Every published lead must retain:

- stable internal ID;
- source platform and official platform label;
- original title as observed;
- Orbmare category ID and label;
- official ranking source URL;
- official product URL when directly reviewable;
- ranking name, position, and source-visible popularity evidence;
- observation date;
- `lead_only` procurement status;
- explicit unverified states for price, stock, authorization, and cross-border eligibility;
- a product-specific review note;
- a local category placeholder image rather than a copied marketplace image.

## Workflow

1. Confirm source access is permitted by the source agreement, API grant, and technical access rules.
2. Store the original source response or an operator-review record with an observation timestamp.
3. Map the item to the controlled ten-category taxonomy.
4. Reject any item without a direct source, defined popularity evidence, or current observation date.
5. Review regulated-category, restricted-product, brand, logistics, and destination issues.
6. Publish only as `lead_only`.
7. Re-verify the product page before accepting any buyer procurement request.

The refresh interval, snapshot expiration window, and automatic unpublishing threshold are **[DECISION REQUIRED]** under DR-016.

## Source and content controls

- Do not bypass a login wall, CAPTCHA, anti-bot challenge, geographic restriction, or technical access control.
- Do not collect paths prohibited for the crawler identity.
- Do not copy marketplace product images into Orbmare without documented rights.
- Do not infer a sales number from comments, views, recommendation order, or search position.
- Do not present personalized recommendations as platform-wide popularity.
- Do not persist buyer identity, cookies, or signed-in marketplace data in the trend dataset.
- Do not place trend leads into checkout until the normal product-onboarding and policy fields are complete.

**[LEGAL REVIEW REQUIRED]** Confirm whether linking, brand/title display, ranking evidence, affiliate disclosure, data retention, and commercial reuse comply with each platform agreement and applicable law before automated production refresh is enabled.

**[TECHNICAL REVIEW REQUIRED]** Review API signing, secret storage, rate limits, raw-response retention, field minimization, monitoring, and deletion controls before credentials are added.

## Implementation references

- Published dataset: `web/shared/data/china-trends.json`
- Source-access register: `data/china-trend-sources.json`
- Dataset validator: `scripts/validate-china-trends.mjs`
- Source-restriction audit: `scripts/audit-trend-sources.mjs`
- China-region renderer: `web/regions/china/china-trends.js`

The source-restriction audit requests only official `robots.txt` files. It does not crawl product or ranking pages.
