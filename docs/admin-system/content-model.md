# Content Model

## Product (managed)

Channels:

- `shop` — 3D print commerce (`/shop/`, `/api/catalog`)
- `editorial` — curated pavilion (`/countries/`, `/discover/`, `/api/editorial-catalog`)

Lifecycle: `candidate → draft → in_review → changes_requested → approved → scheduled → published | hidden | archived | out_of_stock`

Core fields: identity, media, pricing (incl. cost when permitted), variants, inventory, shipping, bilingual story, SEO, relations (brand/material/designer/country).

Public APIs never return cost/purchase/margin fields.

## Brand / Material / Country / Designer / Craft

Stored in dedicated tables with:

- `id`, `slug`, `status`, JSON `payload`, audit timestamps, soft delete

Material payload should tag claim evidence:

- `verified_fact` | `brand_claim` | `editorial_interpretation` | `ai_draft` | `needs_verification`

AI output must default to `ai_draft`.

## Site content

`site-content-store` JSON (homepage hero and section copy). Block-based page builder is Phase 4.

## Media

`media_assets` + local disk adapter under `/assets/uploads/media/`.

## Migration sources

| Source | Target |
|--------|--------|
| `orbmare-catalog.json` products | `products` channel=editorial |
| materials / designers / crafts | entity tables |
| `material-details.json` | material payload essays |
| MVP countries | `countries` |
