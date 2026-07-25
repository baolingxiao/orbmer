/** Orbmare Brand Editorial Page — magazine archive renderer (static stack). */

import { escapeHtml } from "/shared/js/catalog-editorial.js";
import { getLang, loc, t } from "/shared/js/editorial-i18n.js";

function pick(brand, enKey, zhKey, lang = getLang()) {
  if (lang === "zh") return brand[zhKey] || brand[enKey] || "";
  return brand[enKey] || brand[zhKey] || "";
}

function stars(score) {
  const n = Math.max(0, Math.min(5, Math.round((Number(score) || 0) / 2)));
  return "★★★★★☆☆☆☆☆".slice(5 - n, 10 - n);
}

function identityRows(brand, lang) {
  const id = brand.identity || {};
  const rows = [
    ["Brand", "品牌", id.brand || brand.nameEn || brand.name],
    ["Country", "国家", id.country || brand.country],
    ["Founded", "创立", id.founded],
    ["Founder", "创始人", id.founder],
    ["Headquarters", "总部", id.headquarters],
    ["Design Style", "设计风格", id.designStyle || id.category],
    ["Design Language", "设计语言", id.designLanguage],
    ["Price Range", "价位", id.priceRange],
    ["Materials", "材料", id.materials],
    ["Website", "网站", id.website],
  ];
  return rows
    .filter(([, , value]) => value)
    .map(([en, zh, value]) => ({
      label: lang === "zh" ? zh : en,
      value,
    }));
}

export async function fetchBrandDetail(id) {
  const res = await fetch(`/api/brands/${encodeURIComponent(id)}?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.ok || !data.brand) return null;
  return data;
}

export function renderBrandEditorial(root, { brand, related = [], catalog }, lang = getLang()) {
  if (!root || !brand) return;
  const name = lang === "zh" ? brand.nameZh || brand.nameEn : brand.nameEn || brand.nameZh;
  const slogan = pick(brand, "slogan", "sloganZh", lang);
  const description = pick(brand, "description", "descriptionZh", lang);
  const editorsNote = pick(brand, "editorsNote", "editorsNoteZh", lang);
  const story = pick(brand, "story", "storyZh", lang);
  const listImage = brand.image || "/assets/editorial/designer-atelier.jpg";
  const hero = brand.heroImage || listImage;
  const logo = brand.logo || "";
  const storyImage = brand.storyImage || hero;
  const imgFallback = (src, fallback = listImage) =>
    `src="${escapeHtml(src)}" onerror="this.onerror=null;this.src='${escapeHtml(fallback)}'"`;
  const kindLabel =
    lang === "zh"
      ? brand.kind === "studio"
        ? "工作室"
        : brand.kind === "designer"
          ? "设计师"
          : "品牌"
      : brand.kind === "studio"
        ? "Studio"
        : brand.kind === "designer"
          ? "Designer"
          : "Brand";

  const materials = (catalog?.materials || []).filter((m) =>
    (brand.materialIds || []).includes(m.id)
  );
  const fallbackMaterials = materials.length
    ? materials
    : (catalog?.materials || []).slice(0, 4);

  const signature = (catalog?.products || [])
    .filter((p) => (brand.signatureProductIds || []).includes(p.id))
    .slice(0, 6);
  const fallbackSignature = signature.length
    ? signature
    : (catalog?.products || [])
        .filter((p) => {
          const bare = String(brand.id || "").replace(/^(brand|studio|designer)-/, "");
          return (
            p.brandId === brand.id ||
            p.brandId === bare ||
            p.designerId === brand.id ||
            p.designerId === bare ||
            String(p.studio || "").toLowerCase() === String(brand.studio || "").toLowerCase()
          );
        })
        .slice(0, 6);

  const relatedCards = (related || [])
    .filter((row) => row.id !== brand.id)
    .slice(0, 6);

  const philosophy = (brand.philosophy || []).slice(0, 4);
  const crafts = (brand.crafts || []).slice(0, 6);
  const gallery = (brand.gallery || []).slice(0, 8);
  const perspective = brand.perspective || {};
  const ratings = brand.ratings || {};
  const identity = identityRows(brand, lang);

  root.innerHTML = `
    <section class="be-hero">
      <div class="be-shell be-hero-grid">
        <div class="be-hero-copy">
          <div class="be-logo-card">
            <p class="be-kicker">${escapeHtml(kindLabel)}</p>
            <div class="be-logo-frame">
              ${
                logo
                  ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(name || "")}" />`
                  : `<span class="be-logo-fallback">${escapeHtml(name || "")}</span>`
              }
            </div>
            <p class="be-logo-meta">${escapeHtml(
              identity.find((r) => r.label === "Country" || r.label === "国家")?.value ||
                brand.country ||
                (lang === "zh" ? "傲马精选" : "Orbmare Picks")
            )}</p>
          </div>
          <h1 class="be-slogan">${escapeHtml(slogan || name || "")}</h1>
          <p class="be-desc">${escapeHtml(description)}</p>
        </div>
        <div class="be-hero-media">
          <img ${imgFallback(hero)} alt="" width="1200" height="1500" />
        </div>
      </div>
    </section>

    <section class="be-section">
      <div class="be-shell be-narrow">
        <p class="be-kicker">${escapeHtml(t("brand.curatesNote", lang))}</p>
        <p class="be-body">${escapeHtml(editorsNote)}</p>
      </div>
    </section>

    <section class="be-section be-section-line">
      <div class="be-shell">
        <p class="be-kicker">Identity</p>
        <h2 class="be-h2">${lang === "zh" ? "身份档案" : "Identity"}</h2>
        <dl class="be-identity">
          ${identity
            .map(
              (row) => `<div class="be-identity-row">
              <dt>${escapeHtml(row.label)}</dt>
              <dd>${
                String(row.value).startsWith("http")
                  ? `<a href="${escapeHtml(row.value)}" rel="noopener noreferrer" target="_blank">${escapeHtml(row.value)}</a>`
                  : escapeHtml(row.value)
              }</dd>
            </div>`
            )
            .join("")}
        </dl>
      </div>
    </section>

    <section class="be-section">
      <div class="be-shell be-story">
        <div class="be-story-copy">
          <p class="be-kicker">${lang === "zh" ? "品牌故事" : "Brand Story"}</p>
          <h2 class="be-h2">${escapeHtml(name || "")}</h2>
          <p class="be-body">${escapeHtml(story)}</p>
        </div>
        <div class="be-story-media">
          <img ${imgFallback(storyImage)} alt="" width="1000" height="1250" />
        </div>
      </div>
    </section>

    <section class="be-section be-section-line">
      <div class="be-shell be-narrow">
        <p class="be-kicker">${lang === "zh" ? "设计哲学" : "Design Philosophy"}</p>
        <h2 class="be-h2">${lang === "zh" ? "理念" : "Philosophy"}</h2>
        <div class="be-quotes">
          ${philosophy
            .map((item) => {
              const title = lang === "zh" ? item.titleZh || item.title : item.title || item.titleZh;
              const body = lang === "zh" ? item.bodyZh || item.body : item.body || item.bodyZh;
              return `<blockquote class="be-quote">
                <p class="be-quote-title">${escapeHtml(title || "")}</p>
                <p>${escapeHtml(body || "")}</p>
              </blockquote>`;
            })
            .join("")}
        </div>
      </div>
    </section>

    <section class="be-section">
      <div class="be-shell">
        <p class="be-kicker">${lang === "zh" ? "细节" : "Details"}</p>
        <h2 class="be-h2">${lang === "zh" ? "细节展示" : "In Detail"}</h2>
        <div class="be-craft-grid">
          ${crafts
            .map((item) => {
              const title = lang === "zh" ? item.titleZh || item.title : item.title || item.titleZh;
              const body = lang === "zh" ? item.bodyZh || item.body : item.body || item.bodyZh;
              const img = item.image || hero;
              return `<article class="be-craft-card">
                <div class="be-media-45"><img src="${escapeHtml(img)}" alt="${escapeHtml(title || "")}" width="640" height="800" loading="lazy" /></div>
                <h3>${escapeHtml(title || "")}</h3>
                <p>${escapeHtml(body || "")}</p>
              </article>`;
            })
            .join("")}
        </div>
      </div>
    </section>

    <section class="be-section be-section-line">
      <div class="be-shell">
        <p class="be-kicker">${lang === "zh" ? "材料" : "Materials"}</p>
        <h2 class="be-h2">${lang === "zh" ? "材料馆关联" : "From the Material Library"}</h2>
        <div class="be-material-grid">
          ${fallbackMaterials
            .map((m) => {
              const title = loc(m, "name", lang);
              const blurb = loc(m, "blurb", lang);
              return `<a class="be-material-card" href="/materials/?id=${encodeURIComponent(m.id)}">
                <div class="be-media-45"><img src="${escapeHtml(m.image || hero)}" alt="" width="640" height="800" loading="lazy" /></div>
                <h3>${escapeHtml(title || m.id)}</h3>
                <p>${escapeHtml(blurb || "")}</p>
              </a>`;
            })
            .join("")}
        </div>
      </div>
    </section>

    <section class="be-section">
      <div class="be-shell">
        <p class="be-kicker">${lang === "zh" ? "代表作品" : "Signature Collection"}</p>
        <h2 class="be-h2">Editor's Picks</h2>
        <div class="be-signature-grid">
          ${
            fallbackSignature.length
              ? fallbackSignature
                  .map((p) => {
                    const title = loc(p, "name", lang);
                    const summary = loc(p, "summary", lang) || loc(p, "story", lang);
                    return `<a class="be-signature-card" href="/product/?id=${encodeURIComponent(p.id)}">
                      <div class="be-media-45"><img src="${escapeHtml(p.image || hero)}" alt="" width="640" height="800" loading="lazy" /></div>
                      <h3>${escapeHtml(title || p.id)}</h3>
                      <p>${escapeHtml(String(summary || "").slice(0, 90))}</p>
                    </a>`;
                  })
                  .join("")
              : `<p class="be-empty">${
                  lang === "zh" ? "代表作品将陆续收录。" : "Signature pieces will follow."
                }</p>`
          }
        </div>
      </div>
    </section>

    <section class="be-section be-section-line">
      <div class="be-shell">
        <p class="be-kicker">Gallery</p>
        <h2 class="be-h2">${lang === "zh" ? "影像集" : "Gallery"}</h2>
        <div class="be-gallery">
          ${gallery
            .map(
              (src, index) => `<figure class="be-gallery-item" data-ratio="${
                index % 3 === 0 ? "16x9" : "4x5"
              }">
              <img src="${escapeHtml(src)}" alt="" loading="lazy" />
            </figure>`
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="be-section">
      <div class="be-shell be-narrow">
        <p class="be-kicker">Orbmare Perspective</p>
        <h2 class="be-h2">${lang === "zh" ? "傲马视角" : "Orbmare Perspective"}</h2>
        <div class="be-perspective">
          <article><h3>Why it matters.</h3><p>${escapeHtml(
            lang === "zh"
              ? perspective.whyMattersZh || perspective.whyMatters || ""
              : perspective.whyMatters || perspective.whyMattersZh || ""
          )}</p></article>
          <article><h3>Who it's for.</h3><p>${escapeHtml(
            lang === "zh"
              ? perspective.whoForZh || perspective.whoFor || ""
              : perspective.whoFor || perspective.whoForZh || ""
          )}</p></article>
          <article><h3>What makes it different.</h3><p>${escapeHtml(
            lang === "zh"
              ? perspective.differentZh || perspective.different || ""
              : perspective.different || perspective.differentZh || ""
          )}</p></article>
          <article><h3>Orbmare Verdict.</h3><p>${escapeHtml(
            lang === "zh"
              ? perspective.verdictZh || perspective.verdict || ""
              : perspective.verdict || perspective.verdictZh || ""
          )}</p></article>
        </div>
        <div class="be-ratings">
          <p class="be-kicker">${lang === "zh" ? "编辑评分" : "Editor's Rating"}</p>
          ${[
            ["Craftsmanship", "工艺", ratings.craftsmanship],
            ["Timelessness", "经久", ratings.timelessness],
            ["Materials", "材料", ratings.materials],
            ["Design", "设计", ratings.design],
            ["Value", "价值", ratings.value],
            ["Authenticity", "真伪气质", ratings.authenticity],
          ]
            .map(([en, zh, score]) => {
              const label = lang === "zh" ? zh : en;
              const value = Number(score) || 0;
              return `<div class="be-rating-row">
                <span>${escapeHtml(label)}</span>
                <span class="be-stars" aria-label="${value}/10">${stars(value)}</span>
                <strong>${value.toFixed(1)}/10</strong>
              </div>`;
            })
            .join("")}
        </div>
      </div>
    </section>

    <section class="be-section be-section-line">
      <div class="be-shell">
        <p class="be-kicker">${lang === "zh" ? "延伸阅读" : "Related"}</p>
        <h2 class="be-h2">${lang === "zh" ? "你或许也会欣赏" : "You may also appreciate"}</h2>
        <div class="be-related">
          ${relatedCards
            .map((row) => {
              const title = lang === "zh" ? row.nameZh || row.nameEn : row.nameEn || row.nameZh;
              const meta =
                lang === "zh"
                  ? row.kind === "studio"
                    ? "工作室"
                    : row.kind === "designer"
                      ? "设计师"
                      : "品牌"
                  : row.kind === "studio"
                    ? "Studio"
                    : row.kind === "designer"
                      ? "Designer"
                      : "Brand";
              return `<a class="be-related-card" href="/brand/?id=${encodeURIComponent(row.id)}">
                <div class="be-media-45"><img src="${escapeHtml(
                  row.image || "/assets/editorial/designer-atelier.jpg"
                )}" alt="" width="480" height="600" loading="lazy" /></div>
                <p class="be-kicker">${escapeHtml(meta)}</p>
                <h3>${escapeHtml(title || row.id)}</h3>
              </a>`;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}
