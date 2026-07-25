/** Shared marketplace category taxonomy for all country pavilions. */
export const CATEGORIES = [
  { id: "home", label: "家居", icon: "/assets/platform/categories/cat-home.png" },
  { id: "kitchen", label: "厨房", icon: "/assets/platform/categories/cat-kitchen.png" },
  { id: "stationery", label: "文具", icon: "/assets/platform/categories/cat-stationery.png" },
  { id: "beauty", label: "美妆", icon: "/assets/platform/categories/cat-beauty.png" },
  { id: "fragrance", label: "香氛", icon: "/assets/platform/categories/cat-fragrance.png" },
  { id: "watches", label: "手表", icon: "/assets/platform/categories/cat-watches.png" },
  { id: "jewelry", label: "珠宝", icon: "/assets/platform/categories/cat-jewelry.png" },
  { id: "furniture", label: "家具", icon: "/assets/platform/categories/cat-furniture.png" },
  { id: "outdoor", label: "户外", icon: "/assets/platform/categories/cat-outdoor.png" },
  { id: "pets", label: "宠物", icon: "/assets/platform/categories/cat-pets.png" },
];

/**
 * @param {object} [opts]
 * @param {string} [opts.hrefPrefix] - link prefix, e.g. "/regions/china/"
 * @param {string} [opts.activeId] - currently selected category id
 * @param {string} [opts.ariaLabel]
 */
export function categoryNavHtml({
  hrefPrefix = "#",
  activeId = "",
  ariaLabel = "商品分类",
} = {}) {
  const base = hrefPrefix.endsWith("/") || hrefPrefix.startsWith("#") ? hrefPrefix : `${hrefPrefix}/`;
  const items = CATEGORIES.map((cat) => {
    const href =
      base.startsWith("#") && base.length === 1
        ? `#cat-${cat.id}`
        : `${base}#cat-${cat.id}`;
    const active = cat.id === activeId ? " is-active" : "";
    return `<a class="category-nav-item${active}" id="cat-${cat.id}" href="${href}">
      <span class="category-nav-orb">
        <img src="${cat.icon}" alt="" width="96" height="96" loading="lazy" />
      </span>
      <span class="category-nav-label">${cat.label}</span>
    </a>`;
  }).join("");

  return `<div class="category-nav-card" role="navigation" aria-label="${ariaLabel}">${items}</div>`;
}

/** Mount into any `[data-category-nav]` node. */
export function mountCategoryNav(root = document.querySelector("[data-category-nav]"), opts = {}) {
  if (!root) return;
  const activeId = opts.activeId || new URLSearchParams(location.search).get("cat") || "";
  root.innerHTML = categoryNavHtml({ ...opts, activeId });
}
