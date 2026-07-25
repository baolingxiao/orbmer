/**
 * Curated country pavilion renderer.
 * Loads region JSON and mounts category nav + product shelves.
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function loadCuratedPavilion(dataUrl) {
  const res = await fetch(dataUrl, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Failed to load curated pavilion: ${res.status}`);
  return res.json();
}

export function renderCategoryNav(categories, { ariaLabel = "精选分类" } = {}) {
  return `<div class="category-nav-card curated-nav-card" role="navigation" aria-label="${escapeHtml(ariaLabel)}">
    ${categories
      .map(
        (cat) => `<a class="category-nav-item" id="cat-${escapeHtml(cat.id)}" href="#section-${escapeHtml(cat.id)}">
      <span class="category-nav-orb">
        <img src="${escapeHtml(cat.icon)}" alt="" width="96" height="96" loading="lazy" />
      </span>
      <span class="category-nav-label">${escapeHtml(cat.label)}</span>
    </a>`
      )
      .join("")}
  </div>`;
}

function productCardHtml(product) {
  const status = product.status === "curated" ? "精选" : "";
  return `<article class="curated-product" data-product-id="${escapeHtml(product.id)}">
    <div class="curated-product-media">
      <img src="${escapeHtml(product.image)}" alt="" width="320" height="240" loading="lazy" />
      ${status ? `<span class="curated-product-badge">${status}</span>` : ""}
    </div>
    <div class="curated-product-body">
      <h3>${escapeHtml(product.name)}</h3>
      <p>${escapeHtml(product.summary)}</p>
      <strong class="curated-product-price">${escapeHtml(product.priceLabel)}</strong>
    </div>
  </article>`;
}

export function renderProductShelves(data) {
  const { categories, products, tag, tagZh } = data;
  return categories
    .map((cat) => {
      const items = products.filter((p) => p.categoryId === cat.id);
      return `<section class="curated-shelf shell" id="section-${escapeHtml(cat.id)}" aria-labelledby="title-${escapeHtml(cat.id)}">
        <div class="curated-shelf-head">
          <div>
            <p class="eyebrow">${escapeHtml(tagZh || tag)}</p>
            <h2 id="title-${escapeHtml(cat.id)}">${escapeHtml(cat.label)}</h2>
            <p>${escapeHtml(cat.blurb)}</p>
          </div>
          <span class="curated-shelf-count">${items.length} 款精选</span>
        </div>
        <div class="curated-product-grid">
          ${items.map(productCardHtml).join("")}
        </div>
      </section>`;
    })
    .join("");
}

export function applyHero(data) {
  const hero = document.querySelector("[data-curated-hero]");
  if (!hero) return;
  const img = hero.querySelector("img");
  if (img && data.heroImage) {
    img.src = data.heroImage;
    img.alt = "";
  }
  const kicker = hero.querySelector("[data-hero-kicker]");
  if (kicker) kicker.textContent = `国家馆 · ${data.nameZh} · ${data.tag}`;
  const title = hero.querySelector("[data-hero-title]");
  if (title) title.textContent = data.heroTitle;
  const lede = hero.querySelector("[data-hero-lede]");
  if (lede) lede.textContent = data.heroLede;
}

export function wireCategoryActivation() {
  function activateCategory(raw) {
    const hash = (raw || "").replace(/^#/, "");
    let id = "";
    if (hash.startsWith("section-")) id = hash.slice(8);
    else if (hash.startsWith("cat-")) id = hash.slice(4);
    if (!id) return;
    document.querySelectorAll(".category-nav-item.is-active").forEach((el) => el.classList.remove("is-active"));
    const item = document.querySelector(`#cat-${id}`);
    if (item) item.classList.add("is-active");
    const section = document.querySelector(`#section-${id}`);
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  activateCategory(location.hash);
  window.addEventListener("hashchange", () => activateCategory(location.hash));
  document.querySelectorAll(".category-nav-item").forEach((el) => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".category-nav-item.is-active").forEach((n) => n.classList.remove("is-active"));
      el.classList.add("is-active");
    });
  });
}

/**
 * @param {object} opts
 * @param {string} opts.dataUrl
 * @param {string} [opts.navSelector]
 * @param {string} [opts.shelvesSelector]
 */
export async function mountCuratedPavilion({
  dataUrl,
  navSelector = "[data-curated-nav]",
  shelvesSelector = "[data-curated-shelves]",
} = {}) {
  const data = await loadCuratedPavilion(dataUrl);
  applyHero(data);

  const search = document.querySelector("[data-curated-search]");
  if (search && data.searchPlaceholder) search.placeholder = data.searchPlaceholder;

  const crumb = document.querySelector("[data-curated-crumb]");
  if (crumb) crumb.textContent = data.nameZh;

  const tagEl = document.querySelector("[data-curated-tag]");
  if (tagEl) tagEl.textContent = `${data.tag} · ${data.tagZh}`;

  const nav = document.querySelector(navSelector);
  if (nav) nav.innerHTML = renderCategoryNav(data.categories, { ariaLabel: `${data.nameZh}精选分类` });

  const shelves = document.querySelector(shelvesSelector);
  if (shelves) shelves.innerHTML = renderProductShelves(data);

  wireCategoryActivation();
  return data;
}
