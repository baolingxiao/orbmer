/** Orbmare curated catalog helpers (bilingual) — live from /api/editorial-catalog */

import { getLang, loc, curatedBadge } from "/shared/js/editorial-i18n.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Split "桑蚕丝（太湖湖丝）" → title + parenthetical for line break display. */
export function splitMaterialTitle(name) {
  const text = String(name ?? "").trim();
  const match = text.match(/^(.*?)([（(][^）)]+[）)])\s*$/u);
  if (!match || !String(match[1] || "").trim()) {
    return { title: text, paren: "" };
  }
  return { title: match[1].trim(), paren: match[2].trim() };
}

export function materialTitleHtml(name) {
  const { title, paren } = splitMaterialTitle(name);
  if (!paren) return escapeHtml(title);
  return `${escapeHtml(title)}<br><span class="material-title-paren">${escapeHtml(paren)}</span>`;
}

/**
 * Load published editorial products + designers/materials meta.
 * Always hits the API (no-store) so admin publish/edit appears after refresh.
 */
export async function loadCatalog() {
  const res = await fetch(`/api/editorial-catalog?t=${Date.now()}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Catalog unavailable");
  const data = await res.json();
  if (!data?.ok || !Array.isArray(data.products)) {
    throw new Error("Catalog response was invalid.");
  }
  return data;
}

export function productsByCountry(catalog, country) {
  return (catalog.products || []).filter((p) => p.country === country);
}

export function productsByStatus(catalog, status) {
  return (catalog.products || []).filter((p) => p.status === status);
}

export function productById(catalog, id) {
  return (catalog.products || []).find((p) => p.id === id);
}

export function designerById(catalog, id) {
  return (catalog.designers || []).find((d) => d.id === id);
}

export function materialById(catalog, id) {
  return (catalog.materials || []).find((m) => m.id === id);
}

export function quietCardHtml(p, lang = getLang()) {
  const name = loc(p, "name", lang);
  const country = loc(p, "countryLabel", lang);
  const material = loc(p, "material", lang);
  return `<a class="quiet-card" href="/product/?id=${encodeURIComponent(p.id)}">
    <div class="quiet-card-media">
      <img src="${p.image}" alt="" width="640" height="800" loading="lazy" />
    </div>
    <div>
      <p class="dn-curated">${escapeHtml(curatedBadge(lang))}</p>
      <h3>${escapeHtml(name)}</h3>
      <p>${escapeHtml(country)} · ${escapeHtml(material)}</p>
      <div class="price">${escapeHtml(p.priceLabel)}</div>
    </div>
  </a>`;
}
