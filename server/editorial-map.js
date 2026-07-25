/**
 * Map Orbmare editorial catalog ↔ managed product store records.
 * Static meta (designers / materials / mission) stays in JSON;
 * products are live from the admin-managed store.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const editorialJsonPath = path.join(
  __dirname,
  "../web/shared/data/orbmare-catalog.json"
);

export const EDITORIAL_COUNTRIES = new Set(["japan", "italy", "china"]);
export const EDITORIAL_STATUSES = new Set([
  "editors-pick",
  "new",
  "hidden-gem",
  "curated",
  "most-loved",
  "seasonal",
]);

const COUNTRY_LABELS = {
  japan: { en: "Japan", zh: "日本", tag: "Craftsmanship", tagZh: "匠心工艺" },
  italy: { en: "Italy", zh: "意大利", tag: "Luxury Design", tagZh: "奢华设计" },
  china: { en: "China", zh: "中国", tag: "Original Design", tagZh: "原创设计" },
};

let metaCache = null;
let metaCacheMtime = 0;

export function loadEditorialMeta() {
  let mtime = 0;
  try {
    mtime = fs.statSync(editorialJsonPath).mtimeMs;
  } catch {
    mtime = Date.now();
  }
  if (metaCache && metaCacheMtime === mtime) return metaCache;
  const raw = JSON.parse(fs.readFileSync(editorialJsonPath, "utf8"));
  metaCache = {
    mission: raw.mission,
    missionZh: raw.missionZh,
    mvpCountries: raw.mvpCountries || ["japan", "italy", "china"],
    materials: raw.materials || [],
    designers: raw.designers || [],
    crafts: raw.crafts || [],
  };
  metaCacheMtime = mtime;
  return metaCache;
}

export function loadEditorialJsonProducts() {
  const raw = JSON.parse(fs.readFileSync(editorialJsonPath, "utf8"));
  return Array.isArray(raw.products) ? raw.products : [];
}

function moneyLabel(price) {
  const value = Number(price);
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** Convert static editorial JSON product → store seed shape. */
export function editorialJsonToStoreProduct(entry) {
  const country = entry.country;
  const labels = COUNTRY_LABELS[country] || {
    en: country,
    zh: country,
    tag: "Curated",
    tagZh: "甄选",
  };
  const origin =
    country === "japan" ? "Japan" : country === "italy" ? "Italy" : "China";
  return {
    id: entry.id,
    channel: "editorial",
    collection: country,
    country,
    editorialStatus: entry.status || "curated",
    image: entry.image,
    images: entry.images?.length ? entry.images : [entry.image],
    price: entry.price,
    priceLabel: entry.priceLabel || moneyLabel(entry.price),
    material: entry.material || "",
    materialZh: entry.materialZh || entry.material || "",
    materialId: entry.materialId || "",
    category: entry.category || "",
    craft: entry.craft || "",
    craftZh: entry.craftZh || entry.craft || "",
    tag: entry.tag || labels.tag,
    tagZh: entry.tagZh || labels.tagZh,
    countryLabel: entry.countryLabel || labels.en,
    countryLabelZh: entry.countryLabelZh || labels.zh,
    summary: entry.summary || "",
    summaryZh: entry.summaryZh || "",
    story: entry.story || entry.summary || "",
    storyZh: entry.storyZh || entry.summaryZh || "",
    designerId: entry.designerId || "",
    designerName: entry.designerName || "",
    designerNameZh: entry.designerNameZh || entry.designerName || "",
    studio: entry.studio || "",
    studioZh: entry.studioZh || entry.studio || "",
    zh: {
      name: entry.nameZh || entry.name,
      desc: entry.summaryZh || entry.storyZh || "",
    },
    en: {
      name: entry.name,
      desc: entry.summary || entry.story || "",
    },
    lifecycleStatus: "published",
    inventory: {
      mode: "source_after_order",
      onHand: null,
      reserved: 0,
      reorderPoint: null,
      maxPerOrder: 5,
    },
    shipping: {
      profile: "cross_border_standard",
      originCountry: origin,
      processingTime: "Concierge confirmation within 2–5 business days",
      internationalShippingTime: "Arranged after availability confirmation",
    },
    sourceCountry: origin,
    processingTime: "Concierge confirmation within 2–5 business days",
    internationalShippingTime: "Arranged after availability confirmation",
  };
}

/** Convert managed store product → editorial frontend shape. */
export function storeProductToEditorialPublic(product) {
  const country = product.country || product.collection;
  const labels = COUNTRY_LABELS[country] || {
    en: country || "",
    zh: country || "",
    tag: "Curated",
    tagZh: "甄选",
  };
  const price = Number(product.price);
  return {
    id: product.id,
    name: product.en?.name || product.name || "",
    nameZh: product.zh?.name || product.nameZh || "",
    summary: product.summary || product.en?.desc || "",
    summaryZh: product.summaryZh || product.zh?.desc || "",
    story: product.story || product.summary || product.en?.desc || "",
    storyZh: product.storyZh || product.summaryZh || product.zh?.desc || "",
    country,
    countryLabel: product.countryLabel || labels.en,
    countryLabelZh: product.countryLabelZh || labels.zh,
    tag: product.tag || labels.tag,
    tagZh: product.tagZh || labels.tagZh,
    category: product.category || "",
    material: product.material || "",
    materialZh: product.materialZh || product.material || "",
    craft: product.craft || "",
    craftZh: product.craftZh || product.craft || "",
    designerId: product.designerId || "",
    designerName: product.designerName || "",
    designerNameZh: product.designerNameZh || product.designerName || "",
    studio: product.studio || "",
    studioZh: product.studioZh || product.studio || "",
    image: product.image,
    images: product.images?.length ? product.images : product.image ? [product.image] : [],
    price,
    priceLabel: product.priceLabel || moneyLabel(price),
    status: product.editorialStatus || product.status || "curated",
    featured: Boolean(product.featured),
    isPurchasable: product.isPurchasable,
    channel: "editorial",
  };
}

export function loadEditorialSeedProducts() {
  return loadEditorialJsonProducts().map(editorialJsonToStoreProduct);
}
