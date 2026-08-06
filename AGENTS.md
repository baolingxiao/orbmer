# Project Design Guardrails

## Design Read

**Orbmare / 傲马** is the world's premium curated marketplace for craftsmanship, materials, and design — an editorial library, not Amazon/eBay/Taobao.

Mission: *"We curate the world's finest craftsmanship, materials, and design."*

Visual language: Apple × Hermès × Aesop × museum discovery. Cold monochrome luxury, large whitespace, Cormorant Garamond + Noto Sans SC.

## Architecture

| Surface | Path / Host | Role |
|---------|-------------|------|
| Home | `/` | Cinematic hero → Countries → Stories → Collections → Products |
| Discover | `/discover/` | New Discoveries, Editor's Picks, Hidden Gems, Most Loved, Seasonal |
| Countries | `/countries/` | MVP: Japan, Italy, China |
| Materials | `/materials/` | Signature Material Library |
| Craftsmanship | `/craftsmanship/` | Educational craft pages |
| Designers | `/designers/` | Studio / philosophy / collections |
| Journal | `/journal/` | Luxury magazine |
| About | `/about/` | Philosophy (not company brochure) |
| Membership | `/membership/` | Concierge circle (not Costco) |
| Product | `/product/?id=` | Editorial PDP — story before price |
| 3D print shop | `/shop/` | Legacy digital-manufacturing module (redirects to Discover) |
| **Market** | `MARKET_HOST` or `/market/` | Separate Taobao-style retail domain — exclusive `channel=market` SKUs, cart + Stripe checkout |
| Checkout | `/checkout/` | Stripe (domain & flow unchanged; also served on market host) |

Legacy region URLs `/regions/{japan,italy,china}/` should redirect or link to `/countries/…`.

### MVP countries

| Country | Tag | Focus |
|---------|-----|-------|
| Japan | Craftsmanship | Stationery, knives, ceramics, tea, lifestyle |
| Italy | Luxury Design | Leather, Cashmere, home, jewelry, furniture |
| China | Original Design | 中国精品 (not 中国制造): brands, heritage, furniture, tea, textiles |

Catalog: `/web/shared/data/orbmare-catalog.json` (~100 curated products)

## Taste Dials

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 3`
- Palette: off-white `#fafafa`, ink `#141414`, muted grey — **no** discount red, **no** marketplace blue chrome on editorial surfaces
- Type: Cormorant Garamond (display) + Noto Sans SC (UI/body)
- Shared editorial tokens: `/web/shared/css/editorial.css`

## Rules

- Brand: Orbmare (EN) / 傲马 (ZH)
- Never feel like users are searching — they are exploring
- Price must not be the first thing on product pages
- Domain and Stripe payment flow must not change
- Mobile must not have horizontal overflow
- **Product image gallery (mandatory):** multi-image product views use the **stacked card** pattern — layered `4/5` cards with grey translucent left/right flip controls. Styles: `.pdp-gallery` / `.pdp-stack*` in `/web/shared/css/editorial.css`; reference: `/web/product/index.html`. Cursor rule: `.cursor/rules/product-image-stack.mdc`. Do not use thumbnail strips or marketplace carousels on editorial PDP.
- UI sizing skill: `.cursor/skills/orbmare-ui-sizing/SKILL.md` (use with taste-skill; editorial density overrides marketplace card density on new surfaces)

## Internal note

localStorage keys may still use the historical `orbmare-*` prefix for cart/session continuity. Do not rename those keys without a migration.
