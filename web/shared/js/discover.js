/**
 * Orbmare Discover — curated exploration (facet filters, collections, AI guide).
 */
import { mountChrome } from "/shared/js/chrome.js";
import { loadCatalog, escapeHtml } from "/shared/js/catalog-editorial.js";
import { applyI18n, getLang, onLangChange, loc, t } from "/shared/js/editorial-i18n.js";
import { getSavedIds, toggleSaved } from "/shared/js/store.js";

mountChrome({ title: "Discover | Orbmare" });

const FACETS = {
  collection: [
    "Japanese Everyday",
    "Desk Upgrade",
    "Coffee Time",
    "Quiet Luxury",
    "Objects for Life",
    "Collector's Picks",
    "Under $100",
    "Travel Essentials",
    "Small Living",
    "Handmade",
  ],
  country: [
    "Japan",
    "China",
    "Italy",
    "France",
    "Germany",
    "Sweden",
    "Finland",
    "South Korea",
    "United States",
  ],
  material: ["Ramie", "Brass", "Oak", "Leather", "Titanium", "Linen", "Silk", "Silver", "Walnut"],
  craft: [
    "Handmade",
    "Forged",
    "Hand Sewn",
    "Vegetable Tanned",
    "3D Printed",
    "CNC",
    "Cast",
    "Hand Dyed",
  ],
  mood: [
    "Minimal",
    "Quiet Luxury",
    "Industrial",
    "Natural",
    "Dark",
    "Scandinavian",
    "Japanese",
    "Modern",
    "Vintage",
  ],
  price: ["Under $50", "Under $100", "Under $300", "Collector", "Museum Grade"],
};

const FEATURED_COLLECTIONS = [
  { id: "quiet-luxury", title: "Quiet Luxury", image: "/assets/editorial/material-cashmere.jpg", query: "quiet luxury" },
  { id: "japanese-craft", title: "Japanese Craft", image: "/assets/editorial/country-japan.jpg", query: "japan" },
  { id: "desk-essentials", title: "Desk Essentials", image: "/assets/editorial/designer-atelier.jpg", query: "desk" },
  { id: "coffee-ritual", title: "Coffee Ritual", image: "/assets/editorial/material-veg-leather.jpg", query: "coffee" },
  { id: "photography", title: "Photography", image: "/assets/editorial/hero-craft.jpg", query: "desk" },
  { id: "minimal-home", title: "Minimal Home", image: "/assets/editorial/country-italy.jpg", query: "minimal home" },
  { id: "travel", title: "Travel", image: "/assets/editorial/country-china.jpg", query: "travel" },
  { id: "gift-guide", title: "Gift Guide", image: "/assets/editorial/material-cashmere.jpg", query: "gift" },
];

const MAGAZINE = {
  default: [
    { href: "/journal/", en: "Read why Japanese brass ages beautifully.", zh: "阅读：日本黄铜如何优雅地老化。" },
    { href: "/materials/", en: "Read the history of Ramie.", zh: "阅读：苎麻的历史。" },
    { href: "/journal/", en: "Read our Quiet Luxury Guide.", zh: "阅读：安静奢华指南。" },
  ],
  japan: [
    { href: "/countries/japan/", en: "Enter the Japan pavilion.", zh: "进入日本馆。" },
    { href: "/journal/", en: "Read why Japanese brass ages beautifully.", zh: "阅读：日本黄铜如何优雅地老化。" },
  ],
  leather: [
    { href: "/materials/", en: "Read how vegetable-tanned leather matures.", zh: "阅读：植鞣革如何慢慢成熟。" },
    { href: "/journal/", en: "A quieter guide to leather care.", zh: "皮革护理的安静指南。" },
  ],
  "quiet luxury": [
    { href: "/journal/", en: "Read our Quiet Luxury Guide.", zh: "阅读：安静奢华指南。" },
    { href: "/about/", en: "Why Orbmare curates fewer objects.", zh: "傲马为何只精选更少的物件。" },
  ],
};

const state = {
  tab: "all",
  q: "",
  openFacet: "",
  filters: {
    collection: "",
    country: "",
    material: "",
    craft: "",
    mood: "",
    price: "",
  },
  ai: {
    budget: "",
    country: "",
    material: "",
    mood: "",
    use: "",
  },
};

let catalog = { products: [] };
let saved = new Set(getSavedIds());

const els = {
  search: document.querySelector("[data-dx-search]"),
  facetPanel: document.querySelector("[data-dx-facet-panel]"),
  facetTitle: document.querySelector("[data-dx-facet-title]"),
  facetOptions: document.querySelector("[data-dx-facet-options]"),
  active: document.querySelector("[data-dx-active]"),
  grid: document.querySelector("[data-dx-grid]"),
  empty: document.querySelector("[data-dx-empty]"),
  count: document.querySelector("[data-dx-count]"),
  collections: document.querySelector("[data-dx-collections]"),
  collectionMagazine: document.querySelector("[data-dx-collection-magazine]"),
  objectsMagazine: document.querySelector("[data-dx-objects-magazine]"),
  dialog: document.querySelector("[data-dx-ai-dialog]"),
  aiResult: document.querySelector("[data-dx-ai-result]"),
};

function textHay(product, lang) {
  return [
    product.id,
    loc(product, "name", lang),
    loc(product, "summary", lang),
    loc(product, "story", lang),
    loc(product, "material", lang),
    loc(product, "craft", lang),
    loc(product, "countryLabel", lang),
    product.country,
    product.category,
    product.studio,
    product.designerName,
    product.tag,
    product.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesNeedle(hay, needle) {
  const q = String(needle || "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every((part) => hay.includes(part));
}

function matchesMaterial(product, value) {
  const material = `${product.material || ""} ${product.materialZh || ""}`.toLowerCase();
  const map = {
    leather: "leather",
    brass: "brass",
    linen: "linen",
    silk: "silk",
    walnut: "walnut",
    silver: "silver",
    titanium: "titanium",
    oak: "oak|hardwood|hinoki|walnut|bamboo",
    ramie: "ramie|linen|cotton|hemp",
  };
  const key = String(value || "").toLowerCase();
  const pattern = map[key] || key;
  return new RegExp(pattern, "i").test(material);
}

function matchesCraft(product, value) {
  const craft = `${product.craft || ""} ${product.craftZh || ""}`.toLowerCase();
  const map = {
    handmade: "hand|ceram",
    forged: "forged",
    "hand sewn": "stitch|sewn|hand",
    "vegetable tanned": "leather|tann",
    "3d printed": "print|cnc",
    cnc: "cnc|print|turned",
    cast: "cast|iron|glass|enamel",
    "hand dyed": "dye|paint|print",
  };
  const key = String(value || "").toLowerCase();
  return new RegExp(map[key] || key, "i").test(craft);
}

function matchesMood(product, value) {
  const hay = textHay(product, "en");
  const map = {
    minimal: "minimal|quiet|refined|stationery|desk",
    "quiet luxury": "cashmere|silk|quiet|luxury|leather|collect",
    industrial: "steel|brass|forged|metal|cast",
    natural: "linen|wood|walnut|bamboo|stone|clay|porcelain",
    dark: "black|dark|iron|steel|walnut",
    scandinavian: "linen|oak|minimal|wood|quiet",
    japanese: "japan|washi|hinoki|sakai|kyoto",
    modern: "modern|refined|contemporary|design",
    vintage: "heritage|classic|vintage|antique",
  };
  const key = String(value || "").toLowerCase();
  return new RegExp(map[key] || key, "i").test(hay);
}

function matchesCollection(product, value, lang) {
  const hay = textHay(product, lang);
  const price = Number(product.price) || 0;
  switch (String(value || "")) {
    case "Japanese Everyday":
      return product.country === "japan";
    case "Desk Upgrade":
      return /stationery|desk|pen|knife|office/.test(hay);
    case "Coffee Time":
      return /tea|coffee|ceramic|porcelain|cup|kettle/.test(hay);
    case "Quiet Luxury":
      return matchesMood(product, "quiet luxury") || product.status === "editors-pick";
    case "Objects for Life":
      return /lifestyle|home|daily|everyday|textile/.test(hay);
    case "Collector's Picks":
      return price >= 400 || product.status === "editors-pick" || product.status === "hidden-gem";
    case "Under $100":
      return price > 0 && price < 100;
    case "Travel Essentials":
      return /travel|accessories|leather|bag|wallet|pen/.test(hay);
    case "Small Living":
      return /home|furniture|small|apartment|textile|ceramic/.test(hay);
    case "Handmade":
      return matchesCraft(product, "Handmade");
    default:
      return matchesNeedle(hay, value);
  }
}

function matchesPrice(product, value) {
  const price = Number(product.price) || 0;
  switch (value) {
    case "Under $50":
      return price > 0 && price < 50;
    case "Under $100":
      return price > 0 && price < 100;
    case "Under $300":
      return price > 0 && price < 300;
    case "Collector":
      return price >= 300 && price < 700;
    case "Museum Grade":
      return price >= 700;
    default:
      return true;
  }
}

function matchesCountry(product, value) {
  const label = `${product.country || ""} ${product.countryLabel || ""}`.toLowerCase();
  const key = String(value || "").toLowerCase();
  const aliases = {
    japan: "japan",
    china: "china",
    italy: "italy",
    france: "france",
    germany: "germany",
    sweden: "sweden",
    finland: "finland",
    "south korea": "korea",
    "united states": "united|usa|america",
  };
  return new RegExp(aliases[key] || key, "i").test(label);
}

function tabProducts(products) {
  if (state.tab === "latest") {
    return products.filter((p) => p.status === "new").concat(products.filter((p) => p.status !== "new"));
  }
  if (state.tab === "editors") {
    return products.filter((p) => p.status === "editors-pick" || p.status === "curated");
  }
  if (state.tab === "trending") {
    return products.filter((p) => p.status === "editors-pick" || p.status === "hidden-gem" || p.status === "new");
  }
  return products;
}

function filterProducts(lang = getLang()) {
  const q = state.q.trim().toLowerCase();
  let list = tabProducts(catalog.products || []);

  list = list.filter((product) => {
    const hay = textHay(product, lang);
    if (q && !matchesNeedle(hay, q)) return false;
    if (state.filters.collection && !matchesCollection(product, state.filters.collection, lang)) return false;
    if (state.filters.country && !matchesCountry(product, state.filters.country)) return false;
    if (state.filters.material && !matchesMaterial(product, state.filters.material)) return false;
    if (state.filters.craft && !matchesCraft(product, state.filters.craft)) return false;
    if (state.filters.mood && !matchesMood(product, state.filters.mood)) return false;
    if (state.filters.price && !matchesPrice(product, state.filters.price)) return false;
    return true;
  });

  if (state.tab === "latest") {
    list = [...list].sort((a, b) => Number(b.id?.slice(-3) || 0) - Number(a.id?.slice(-3) || 0));
  }
  return list;
}

function brandLine(product, lang) {
  return loc(product, "studio", lang) || loc(product, "designerName", lang) || "Orbmare";
}

function valueLine(product, lang) {
  return loc(product, "summary", lang) || loc(product, "story", lang) || "";
}

function objectCardHtml(product, lang = getLang()) {
  const name = loc(product, "name", lang);
  const country = loc(product, "countryLabel", lang);
  const brand = brandLine(product, lang);
  const value = valueLine(product, lang);
  const savedOn = saved.has(product.id);
  return `<article class="dx-card">
    <button type="button" class="dx-save${savedOn ? " is-saved" : ""}" data-dx-save="${escapeHtml(product.id)}" aria-label="${escapeHtml(
      t("discover.save", lang)
    )}" aria-pressed="${savedOn ? "true" : "false"}">${savedOn ? "♥" : "♡"}</button>
    <a href="/product/?id=${encodeURIComponent(product.id)}">
      <div class="dx-card-media">
        <img src="${escapeHtml(product.image || "")}" alt="" width="640" height="800" loading="lazy" />
      </div>
      <p class="dx-card-meta">${escapeHtml(country)} · ${escapeHtml(brand)}</p>
      <h3>${escapeHtml(name)}</h3>
      <p class="dx-card-value">${escapeHtml(value)}</p>
      <p class="dx-card-price">${escapeHtml(product.priceLabel || "")}</p>
    </a>
  </article>`;
}

function magazineLinks(topic, lang) {
  const key = String(topic || "default").toLowerCase();
  const rows = MAGAZINE[key] || MAGAZINE.default;
  return rows
    .map((row) => `<a href="${row.href}">${escapeHtml(lang === "zh" ? row.zh : row.en)}</a>`)
    .join("");
}

function renderCollections(lang = getLang()) {
  if (!els.collections) return;
  els.collections.innerHTML = FEATURED_COLLECTIONS.map(
    (item) => `<a class="dx-collection-card" href="#objects" data-dx-collection="${escapeHtml(item.query)}">
      <img src="${escapeHtml(item.image)}" alt="" width="640" height="800" loading="lazy" />
      <span>${escapeHtml(item.title)}</span>
    </a>`
  ).join("");
  if (els.collectionMagazine) {
    els.collectionMagazine.innerHTML = magazineLinks(state.filters.mood || state.filters.collection || "default", lang);
  }
}

function renderActive(lang = getLang()) {
  if (!els.active) return;
  const chips = [];
  Object.entries(state.filters).forEach(([key, value]) => {
    if (!value) return;
    chips.push(
      `<button type="button" data-dx-remove-filter="${key}">${escapeHtml(value)} ×</button>`
    );
  });
  if (state.q) {
    chips.push(`<button type="button" data-dx-remove-query="1">“${escapeHtml(state.q)}” ×</button>`);
  }
  els.active.hidden = chips.length === 0;
  els.active.innerHTML = chips.join("");
}

function renderFacetPanel(lang = getLang()) {
  const key = state.openFacet;
  if (!key || !FACETS[key]) {
    els.facetPanel.hidden = true;
    document.querySelectorAll("[data-dx-facet]").forEach((btn) => {
      btn.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    });
    return;
  }
  els.facetPanel.hidden = false;
  els.facetTitle.textContent = t(`discover.facet.${key}`, lang);
  els.facetOptions.innerHTML = FACETS[key]
    .map((option) => {
      const active = state.filters[key] === option ? " is-active" : "";
      return `<button type="button" class="${active.trim()}" data-dx-facet-option="${escapeHtml(option)}">${escapeHtml(
        option
      )}</button>`;
    })
    .join("");
  document.querySelectorAll("[data-dx-facet]").forEach((btn) => {
    const open = btn.getAttribute("data-dx-facet") === key;
    btn.classList.toggle("is-open", open);
    btn.classList.toggle("is-active", Boolean(state.filters[btn.getAttribute("data-dx-facet")]));
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function renderGrid(lang = getLang()) {
  const items = filterProducts(lang);
  if (els.count) {
    els.count.textContent = t("discover.count", lang).replace("{n}", String(items.length));
  }
  if (!items.length) {
    els.grid.innerHTML = "";
    if (els.empty) els.empty.hidden = false;
  } else {
    if (els.empty) els.empty.hidden = true;
    els.grid.innerHTML = items.map((p) => objectCardHtml(p, lang)).join("");
  }
  if (els.objectsMagazine) {
    const topic =
      state.filters.material ||
      state.filters.country ||
      state.filters.mood ||
      state.q ||
      "default";
    els.objectsMagazine.innerHTML = magazineLinks(topic, lang);
  }
}

function renderAll(lang = getLang()) {
  applyI18n(lang);
  if (els.search) els.search.placeholder = t("discover.searchPlaceholder", lang);
  renderCollections(lang);
  renderFacetPanel(lang);
  renderActive(lang);
  renderGrid(lang);
}

function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll("[data-dx-tab]").forEach((btn) => {
    const on = btn.getAttribute("data-dx-tab") === tab;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  renderGrid(getLang());
}

function applyCollectionQuery(query) {
  state.q = query;
  if (els.search) els.search.value = query;
  const lower = query.toLowerCase();
  if (lower.includes("japan")) state.filters.country = "Japan";
  if (lower.includes("quiet")) state.filters.mood = "Quiet Luxury";
  if (lower.includes("minimal")) state.filters.mood = "Minimal";
  if (lower.includes("desk")) state.filters.collection = "Desk Upgrade";
  if (lower.includes("coffee")) state.filters.collection = "Coffee Time";
  if (lower.includes("travel")) state.filters.collection = "Travel Essentials";
  if (lower.includes("gift")) state.q = "gift";
  renderAll(getLang());
  document.getElementById("dx-objects-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function composeAiCollection(lang = getLang()) {
  const { budget, country, material, mood, use } = state.ai;
  state.filters = {
    collection: "",
    country: "",
    material: "",
    craft: "",
    mood: "",
    price: "",
  };
  state.q = "";
  if (els.search) els.search.value = "";

  if (budget === "under-100") state.filters.price = "Under $100";
  if (budget === "under-300") state.filters.price = "Under $300";
  if (budget === "collector") state.filters.price = "Collector";

  if (country === "japan") state.filters.country = "Japan";
  if (country === "china") state.filters.country = "China";
  if (country === "italy") state.filters.country = "Italy";

  if (material) {
    state.filters.material = material.charAt(0).toUpperCase() + material.slice(1);
    if (material === "leather") state.filters.material = "Leather";
  }

  if (mood === "quiet-luxury") state.filters.mood = "Quiet Luxury";
  else if (mood === "minimal") state.filters.mood = "Minimal";
  else if (mood === "natural") state.filters.mood = "Natural";
  else if (mood === "japanese") state.filters.mood = "Japanese";

  if (use === "desk") state.filters.collection = "Desk Upgrade";
  if (use === "coffee") state.filters.collection = "Coffee Time";
  if (use === "home") state.filters.collection = "Objects for Life";
  if (use === "travel") state.filters.collection = "Travel Essentials";
  if (use === "gift") state.q = "gift";

  const items = filterProducts(lang);
  const titleBits = [country, mood, material, use].filter(Boolean).join(" · ") || "Orbmare";
  if (els.aiResult) {
    els.aiResult.hidden = false;
    els.aiResult.textContent = t("discover.ai.result", lang)
      .replace("{title}", titleBits)
      .replace("{n}", String(items.length));
  }
  renderAll(lang);
  els.dialog?.close();
  document.getElementById("dx-objects-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.querySelector("[data-dx-search-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
});

els.search?.addEventListener("input", () => {
  state.q = els.search.value || "";
  renderActive(getLang());
  renderGrid(getLang());
});

document.querySelectorAll("[data-dx-suggest-chip]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = btn.getAttribute("data-dx-suggest-chip") || "";
    state.q = value;
    if (els.search) els.search.value = value;
    document.querySelectorAll("[data-dx-suggest-chip]").forEach((node) => {
      node.classList.toggle("is-active", node === btn);
    });
    renderActive(getLang());
    renderGrid(getLang());
  });
});

document.querySelectorAll("[data-dx-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.getAttribute("data-dx-tab") || "all"));
});

document.querySelectorAll("[data-dx-facet]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-dx-facet") || "";
    state.openFacet = state.openFacet === key ? "" : key;
    renderFacetPanel(getLang());
  });
});

els.facetOptions?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-dx-facet-option]");
  if (!btn || !state.openFacet) return;
  const value = btn.getAttribute("data-dx-facet-option") || "";
  state.filters[state.openFacet] = state.filters[state.openFacet] === value ? "" : value;
  renderFacetPanel(getLang());
  renderActive(getLang());
  renderGrid(getLang());
});

document.querySelector("[data-dx-facet-clear]")?.addEventListener("click", () => {
  if (!state.openFacet) return;
  state.filters[state.openFacet] = "";
  renderFacetPanel(getLang());
  renderActive(getLang());
  renderGrid(getLang());
});

els.active?.addEventListener("click", (event) => {
  const removeFilter = event.target.closest("[data-dx-remove-filter]");
  const removeQuery = event.target.closest("[data-dx-remove-query]");
  if (removeFilter) {
    state.filters[removeFilter.getAttribute("data-dx-remove-filter")] = "";
  }
  if (removeQuery) {
    state.q = "";
    if (els.search) els.search.value = "";
    document.querySelectorAll("[data-dx-suggest-chip]").forEach((node) => node.classList.remove("is-active"));
  }
  renderAll(getLang());
});

els.collections?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-dx-collection]");
  if (!card) return;
  event.preventDefault();
  applyCollectionQuery(card.getAttribute("data-dx-collection") || "");
});

const rail = document.querySelector("[data-dx-collections-rail]");
document.querySelector("[data-dx-collections-prev]")?.addEventListener("click", () => {
  rail?.scrollBy({ left: -320, behavior: "smooth" });
});
document.querySelector("[data-dx-collections-next]")?.addEventListener("click", () => {
  rail?.scrollBy({ left: 320, behavior: "smooth" });
});

els.grid?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-dx-save]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const id = btn.getAttribute("data-dx-save");
  saved = new Set(toggleSaved(id));
  renderGrid(getLang());
});

document.querySelector("[data-dx-ai-open]")?.addEventListener("click", () => {
  els.dialog?.showModal();
});

document.querySelectorAll("[data-dx-ai-group]").forEach((group) => {
  group.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-dx-ai-chip]");
    if (!chip) return;
    const key = group.getAttribute("data-dx-ai-group");
    const value = chip.getAttribute("data-dx-ai-chip") || "";
    state.ai[key] = state.ai[key] === value ? "" : value;
    group.querySelectorAll("[data-dx-ai-chip]").forEach((node) => {
      node.classList.toggle("is-active", node.getAttribute("data-dx-ai-chip") === state.ai[key]);
    });
  });
});

document.querySelector("[data-dx-ai-run]")?.addEventListener("click", () => {
  composeAiCollection(getLang());
});

try {
  catalog = await loadCatalog();
} catch (error) {
  console.error(error);
  catalog = { products: [] };
}

const params = new URLSearchParams(location.search);
if (params.get("q")) {
  state.q = params.get("q");
  if (els.search) els.search.value = state.q;
}
if (params.get("tab") && ["all", "latest", "editors", "trending"].includes(params.get("tab"))) {
  setTab(params.get("tab"));
}

renderAll(getLang());
onLangChange((lang) => renderAll(lang));
