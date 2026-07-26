import { mountChrome } from "/shared/js/chrome.js";
import { loadCatalog, escapeHtml } from "/shared/js/catalog-editorial.js";
import { applyI18n, getLang, onLangChange, loc, t, curatedBadge } from "/shared/js/editorial-i18n.js";
import { getSavedIds, toggleSaved } from "/shared/js/store.js";
import { COLLECTIONS, JOURNAL_FEATURES, GUIDED_PATHS } from "/shared/js/discover-data.js";

mountChrome({ title: "Discover | Orbmare" });
let catalog = { products: [] };
let saved = new Set(getSavedIds());
let query = "";
const el = {
  guidedOptions: document.querySelector("[data-dx-guided-options]"),
  editors: document.querySelector("[data-dx-editors]"), rail: document.querySelector("[data-dx-rail]"),
  grid: document.querySelector("[data-dx-grid]"), journal: document.querySelector("[data-dx-journal]"),
  count: document.querySelector("[data-dx-count]"), empty: document.querySelector("[data-dx-empty]"),
  dialog: document.querySelector("[data-dx-ai-dialog]"), prompt: document.querySelector("[data-dx-ai-prompt]"),
};
const label = (item, lang) => lang === "zh" ? item.zh : item.en;
const searchable = (product, lang) => [product.id, loc(product,"name",lang), loc(product,"summary",lang), loc(product,"story",lang), loc(product,"material",lang), loc(product,"craft",lang), loc(product,"countryLabel",lang), product.studio, product.designerName, product.country, product.tag].filter(Boolean).join(" ").toLowerCase();

function productCard(product, lang) {
  const active = saved.has(product.id);
  return `<article class="dx-object-card">
    <button class="dx-save${active ? " is-saved" : ""}" type="button" data-dx-save="${escapeHtml(product.id)}" aria-label="${escapeHtml(t("discover.save",lang))}" aria-pressed="${active}">${active ? "♥" : "♡"}</button>
    <a href="/product/?id=${encodeURIComponent(product.id)}"><div class="dx-object-media"><img src="${escapeHtml(product.image || "")}" alt="" width="640" height="480" loading="lazy" /></div>
    <p class="dx-object-meta">${escapeHtml(loc(product,"countryLabel",lang))} · ${escapeHtml(loc(product,"studio",lang) || product.designerName || "Orbmare")}</p>
    <h3>${escapeHtml(loc(product,"name",lang))}</h3><p class="dx-object-summary">${escapeHtml(loc(product,"summary",lang) || "")}</p>
    <div class="dx-object-bottom"><span class="dn-curated">${escapeHtml(curatedBadge(lang))}</span><span>${escapeHtml(product.priceLabel || "")}</span></div></a></article>`;
}
function collectionCard(item, lang, feature = false) {
  return `<a class="dx-collection-card${feature ? " is-feature" : ""}" href="/collection/?id=${encodeURIComponent(item.slug)}"><img src="${item.image}" alt="" width="800" height="1000" loading="lazy" /><span>${escapeHtml(label(item,lang))}</span></a>`;
}
function filteredProducts(lang) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return (catalog.products || []).filter((p) => terms.every((term) => searchable(p,lang).includes(term))).slice(0, 18);
}
function render(lang = getLang()) {
  applyI18n(lang);
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel, lang)));
  el.guidedOptions.innerHTML = GUIDED_PATHS.map((item) => `<button type="button" class="dx-guided-choice${query === item.query ? " is-active" : ""}" data-dx-path="${item.query}"><span>${escapeHtml(label(item,lang))}</span><small>${escapeHtml(lang === "zh" ? item.zhBody : item.enBody)}</small><i aria-hidden="true">↗</i></button>`).join("");
  el.editors.innerHTML = COLLECTIONS.slice(0, 4).map((item) => collectionCard(item, lang, true)).join("");
  el.rail.innerHTML = COLLECTIONS.map((item) => collectionCard(item, lang)).join("");
  el.journal.innerHTML = JOURNAL_FEATURES.map((item) => `<a class="dx-journal-card" href="${item.href}"><img src="${item.image}" alt="" width="800" height="560" loading="lazy" /><p>${escapeHtml(lang === "zh" ? item.kindZh : item.kindEn)}</p><h3>${escapeHtml(label(item,lang))}</h3></a>`).join("");
  const products = filteredProducts(lang);
  el.grid.innerHTML = products.map((p) => productCard(p,lang)).join("");
  el.count.textContent = t("discover.count",lang).replace("{n}",String(products.length));
  el.empty.hidden = products.length > 0;
}
function setQuery(value) { query = value || ""; render(getLang()); document.getElementById("dx-objects-title")?.scrollIntoView({behavior:"smooth",block:"start"}); }
el.guidedOptions?.addEventListener("click", (event) => { const button = event.target.closest("[data-dx-path]"); if (button) setQuery(button.dataset.dxPath); });
document.querySelector("[data-dx-rail-prev]")?.addEventListener("click", () => el.rail?.scrollBy({left:-360,behavior:"smooth"}));
document.querySelector("[data-dx-rail-next]")?.addEventListener("click", () => el.rail?.scrollBy({left:360,behavior:"smooth"}));
el.grid?.addEventListener("click", (event) => { const button = event.target.closest("[data-dx-save]"); if (!button) return; event.preventDefault(); saved = new Set(toggleSaved(button.dataset.dxSave)); render(getLang()); });
document.querySelector("[data-dx-ai-open]")?.addEventListener("click", () => el.dialog?.showModal());
document.querySelector("[data-dx-ai-run]")?.addEventListener("click", () => { el.dialog?.close(); setQuery(el.prompt?.value); });
try { catalog = await loadCatalog(); } catch (error) { console.error(error); }
query = new URLSearchParams(location.search).get("q") || "";
render(getLang()); onLangChange(render);
