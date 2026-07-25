/** Map live 3D print shop catalog into Discover UI cards */

import { loadCatalog as loadShopCatalog } from "/shared/js/load-catalog.js";
import { getLang, t } from "/shared/js/editorial-i18n.js";

const COLLECTION_LABEL = {
  metal: { en: "Metal", zh: "工程金属件" },
  toys: { en: "Toys", zh: "玩具与收藏" },
  portrait: { en: "Portrait", zh: "照片手办" },
};

export async function loadShopProducts() {
  return loadShopCatalog();
}

export function shopCopy(product, lang = getLang()) {
  const pack = product?.[lang] || product?.zh || product?.en || {};
  return {
    name: pack.name || product.id,
    desc: pack.desc || "",
  };
}

export function money(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function collectionLabel(id, lang = getLang()) {
  return COLLECTION_LABEL[id]?.[lang] || COLLECTION_LABEL[id]?.en || id;
}

/**
 * Rich discover card with full shop product information.
 */
export function shopDiscoverCardHtml(product, lang = getLang()) {
  const copy = shopCopy(product, lang);
  const collection = collectionLabel(product.collection, lang);
  const labels = Array.isArray(product.fulfillmentLabels) ? product.fulfillmentLabels : [];
  const material = product.material || "—";
  const source = product.sourceCountry || "—";
  const processing = product.processingTime || "";
  const shipping = product.internationalShippingTime || "";
  const image = product.image || (product.images && product.images[0]) || "";
  const variantCount = Array.isArray(product.variants) ? product.variants.length : 0;
  const priceMax = product.priceMax && product.priceMax > product.price ? product.priceMax : null;
  const priceText = priceMax ? `${money(product.price)} – ${money(priceMax)}` : money(product.price);

  return `<article class="discover-shop-card">
    <a class="discover-shop-media" href="/product/shop.html?id=${encodeURIComponent(product.id)}">
      <img src="${escapeHtml(image)}" alt="" width="640" height="480" loading="lazy" />
    </a>
    <div class="discover-shop-body">
      <p class="discover-shop-meta">${escapeHtml(collection)} · ${escapeHtml(material)}</p>
      <h3><a href="/product/shop.html?id=${encodeURIComponent(product.id)}">${escapeHtml(copy.name)}</a></h3>
      <p class="discover-shop-desc">${escapeHtml(copy.desc)}</p>
      <dl class="discover-shop-facts">
        <div><dt>${escapeHtml(t("discover.shop.source", lang))}</dt><dd>${escapeHtml(source)}</dd></div>
        <div><dt>${escapeHtml(t("discover.shop.fulfillment", lang))}</dt><dd>${escapeHtml(labels.join(" · ") || "—")}</dd></div>
        <div><dt>${escapeHtml(t("discover.shop.processing", lang))}</dt><dd>${escapeHtml(processing || "—")}</dd></div>
        <div><dt>${escapeHtml(t("discover.shop.transit", lang))}</dt><dd>${escapeHtml(shipping || "—")}</dd></div>
        ${
          variantCount > 1
            ? `<div><dt>${escapeHtml(t("discover.shop.variants", lang))}</dt><dd>${variantCount}</dd></div>`
            : ""
        }
      </dl>
      <div class="discover-shop-foot">
        <strong class="price">${escapeHtml(priceText)}</strong>
        <a class="shop-pill" href="/product/shop.html?id=${encodeURIComponent(product.id)}">${escapeHtml(
          t("discover.shop.view", lang)
        )}</a>
      </div>
    </div>
  </article>`;
}

export function filterShopProducts(products, { collection = "all", q = "" } = {}) {
  const query = q.trim().toLowerCase();
  return products.filter((p) => {
    if (collection !== "all" && p.collection !== collection) return false;
    if (!query) return true;
    const zh = `${p.zh?.name || ""} ${p.zh?.desc || ""}`.toLowerCase();
    const en = `${p.en?.name || ""} ${p.en?.desc || ""}`.toLowerCase();
    const hay = `${p.id} ${p.material || ""} ${p.collection || ""} ${zh} ${en}`.toLowerCase();
    return hay.includes(query);
  });
}
