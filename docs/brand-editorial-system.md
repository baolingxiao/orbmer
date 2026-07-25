# Orbmare Brand Editorial System

Orbmare is a static Express + editorial HTML stack (not Next.js). The Brand Editorial Page is implemented as a reusable section contract that maps 1:1 to a future React component tree.

## Route

- Index / rail: `/designers/`
- Archive page: `/brand/?id={brand-|studio-|designer-…}`
- Legacy `/designers/?id=` redirects to `/brand/?id=`

## Fixed section order

1. Hero  
2. Why it's a Orbmare Curates / 为什么是傲马的选择  

3. Identity  
4. Brand Story  
5. Design Philosophy  
6. Craftsmanship  
7. Materials  
8. Signature Collection  
9. Gallery  
10. Orbmare Perspective  
11. Related Brands  
12. Footer (shared chrome)

## Tokens

| Token | Value |
|-------|-------|
| Background | `#F8F7F4` |
| Text | `#111111` |
| Secondary | `#6B6B6B` |
| Border | `#E6E3DD` |
| Accent | `#A78A64` (ratings only) |
| Content width | `1360px` (max shell `1600px`) |
| Display | Cormorant Garamond |
| Body | Noto Sans SC / Helvetica Neue |

## Files

| Role | Path |
|------|------|
| Page | `web/brand/index.html` |
| Renderer | `web/shared/js/brand-editorial.js` |
| Styles | `web/shared/css/brand-editorial.css` |
| Normalize / enrich | `server/brand-editorial.js` |
| API | `GET /api/brands`, `GET /api/brands/:id` |

## React-equivalent modules (for future port)

`BrandEditorialPage` → `BrandHero`, `OrbmareCuratesNote` (为什么是傲马的选择 / Why it's a Orbmare Curates), `IdentityGrid`, `BrandStory`, `PhilosophyQuotes`, `CraftGrid`, `MaterialLinks`, `SignaturePicks`, `GalleryStrip`, `OrbmarePerspective`, `RelatedBrandsRail`, `LogoCard`

## Data

Brand payload may include: `logo`, `slogan(Zh)`, `description(Zh)`, `heroImage`, `editorsNote(Zh)`, `identity{}`, `storyImage`, `philosophy[]`, `crafts[]`, `materialIds[]`, `signatureProductIds[]`, `gallery[]`, `perspective{}`, `ratings{}`, `relatedBrandIds[]`.

Missing fields are enriched from legacy blurb/story so every published entity still renders a complete magazine archive.
