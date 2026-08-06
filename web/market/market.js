import * as Store from "/shared/js/store.js";

const API_BASE = window.location.port === "5180" ? "http://127.0.0.1:4242" : "";

const state = {
  products: [],
  filter: "all",
  query: "",
  promoIndex: 0,
  promoTimer: null,
};

function money(value) {
  const amount = Number(value) || 0;
  return `$${amount.toFixed(2)}`;
}

function productName(product) {
  return product?.zh?.name || product?.en?.name || product?.name || product?.id || "商品";
}

function productDesc(product) {
  return (
    product?.zh?.description ||
    product?.en?.description ||
    product?.summaryZh ||
    product?.summary ||
    product?.storyZh ||
    product?.story ||
    ""
  );
}

function productImage(product) {
  const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  return images[0] || product?.image || "/assets/platform/orbmare-mark.svg";
}

function basePath() {
  const path = window.location.pathname;
  if (path.startsWith("/market")) return "/market/";
  return "/";
}

function productHref(id) {
  const root = basePath();
  return `${root}product/?id=${encodeURIComponent(id)}`;
}

function homeHref() {
  return basePath();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function refreshCartBadge() {
  const count = Store.cartCount();
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(count);
  });
}

function renderCartDrawer() {
  const root = document.querySelector("[data-cart-lines]");
  const total = document.querySelector("[data-cart-total]");
  const checkout = document.querySelector("[data-checkout]");
  if (!root) return;
  const lines = Store.getCartLines();
  if (!lines.length) {
    root.innerHTML = `<p class="mk-empty" style="box-shadow:none;padding:24px 8px">购物车是空的</p>`;
  } else {
    root.innerHTML = lines
      .map(
        (line) => `
      <article class="mk-cart-line" data-line-id="${escapeHtml(line.lineId)}">
        <img src="${escapeHtml(line.image || "")}" alt="" width="64" height="64" loading="lazy" />
        <div>
          <h3>${escapeHtml(line.name)}</h3>
          <div class="mk-line-meta">
            <span>${money(line.price)}</span>
            <div class="mk-qty">
              <button type="button" data-qty-delta="-1" aria-label="减少">−</button>
              <span>${Number(line.qty) || 1}</span>
              <button type="button" data-qty-delta="1" aria-label="增加">+</button>
            </div>
          </div>
        </div>
      </article>`
      )
      .join("");
  }
  if (total) total.textContent = money(Store.cartSubtotal());
  if (checkout) checkout.setAttribute("aria-disabled", lines.length ? "false" : "true");
  refreshCartBadge();
}

function openCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  if (!drawer) return;
  drawer.hidden = false;
  renderCartDrawer();
}

function closeCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  if (drawer) drawer.hidden = true;
}

function addProductToCart(product, qty = 1) {
  if (!product?.isPurchasable && product?.lifecycleStatus === "published") {
    /* still allow if maxQty > 0 */
  }
  const maxQty = Math.max(1, Number(product?.maxQty) || 20);
  if (product && product.isPurchasable === false) {
    window.alert("该商品暂不可购买。");
    return;
  }
  Store.addCartLine({
    productId: product.id,
    name: productName(product),
    price: Number(product.price) || 0,
    image: productImage(product),
    qty,
    maxQty,
  });
  refreshCartBadge();
  openCart();
}

function filteredProducts() {
  const q = state.query.trim().toLowerCase();
  return state.products.filter((product) => {
    const catOk = state.filter === "all" || product.collection === state.filter;
    if (!catOk) return false;
    if (!q) return true;
    const hay = `${productName(product)} ${product.id} ${product.collection || ""}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderGrid() {
  const grid = document.querySelector("[data-product-grid]");
  const empty = document.querySelector("[data-empty]");
  const meta = document.querySelector("[data-shelf-meta]");
  if (!grid) return;
  const list = filteredProducts();
  if (meta) meta.textContent = `共 ${list.length} 件`;
  if (!list.length) {
    grid.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  grid.innerHTML = list
    .map((product) => {
      const compare =
        product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
          ? `<small>${money(product.compareAtPrice)}</small>`
          : "";
      const disabled = product.isPurchasable === false ? "disabled" : "";
      return `
      <article class="mk-card">
        <a class="mk-card-media" href="${productHref(product.id)}">
          <img src="${escapeHtml(productImage(product))}" alt="" loading="lazy" width="400" height="400" />
        </a>
        <div class="mk-card-body">
          <h3 class="mk-card-title">
            <a href="${productHref(product.id)}">${escapeHtml(productName(product))}</a>
          </h3>
          <p class="mk-card-price">${money(product.price)}${compare}</p>
          <div class="mk-card-actions">
            <a href="${productHref(product.id)}">详情</a>
            <button type="button" data-add="${escapeHtml(product.id)}" ${disabled}>加购</button>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

async function loadCatalog() {
  const meta = document.querySelector("[data-shelf-meta]");
  if (meta) meta.textContent = "加载中…";
  try {
    const res = await fetch(`${API_BASE}/api/market-catalog`, { credentials: "same-origin" });
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "目录加载失败");
    state.products = Array.isArray(data.products) ? data.products : [];
  } catch (error) {
    state.products = [];
    if (meta) meta.textContent = error.message || "加载失败";
  }
  renderGrid();
}

function setupPromo() {
  const slides = [...document.querySelectorAll("[data-promo-slide]")];
  const dotsRoot = document.querySelector("[data-promo-dots]");
  if (slides.length < 2 || !dotsRoot) return;

  dotsRoot.innerHTML = slides
    .map((_, index) => `<button type="button" data-promo-dot="${index}" aria-label="展位 ${index + 1}"></button>`)
    .join("");

  const show = (index) => {
    state.promoIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === state.promoIndex));
    dotsRoot.querySelectorAll("button").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === state.promoIndex);
    });
  };

  dotsRoot.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-promo-dot]");
    if (!btn) return;
    show(Number(btn.dataset.promoDot) || 0);
    restartPromo();
  });

  const restartPromo = () => {
    clearInterval(state.promoTimer);
    state.promoTimer = setInterval(() => show(state.promoIndex + 1), 4500);
  };

  show(0);
  restartPromo();
}

function setupShelfInteractions() {
  document.querySelector("[data-cats]")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cat]");
    if (!btn) return;
    state.filter = btn.dataset.cat || "all";
    document.querySelectorAll("[data-cat]").forEach((node) => {
      node.classList.toggle("is-active", node === btn);
    });
    renderGrid();
  });

  document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.query = document.querySelector("[data-search-input]")?.value || "";
    renderGrid();
  });

  document.querySelector("[data-product-grid]")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-add]");
    if (!btn) return;
    const product = state.products.find((entry) => entry.id === btn.dataset.add);
    if (product) addProductToCart(product);
  });
}

function setupCartChrome() {
  document.querySelectorAll("[data-open-cart]").forEach((btn) => {
    btn.addEventListener("click", openCart);
  });
  document.querySelectorAll("[data-close-cart]").forEach((btn) => {
    btn.addEventListener("click", closeCart);
  });
  document.querySelector("[data-cart-drawer]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeCart();
  });
  document.querySelector("[data-cart-lines]")?.addEventListener("click", (event) => {
    const deltaBtn = event.target.closest("[data-qty-delta]");
    if (!deltaBtn) return;
    const line = deltaBtn.closest("[data-line-id]");
    if (!line) return;
    const current = Store.getCartLines().find((entry) => entry.lineId === line.dataset.lineId);
    if (!current) return;
    const next = (Number(current.qty) || 1) + Number(deltaBtn.dataset.qtyDelta || 0);
    Store.setCartLineQty(current.lineId, next);
    renderCartDrawer();
  });
  document.querySelectorAll("[data-home-link]").forEach((link) => {
    link.setAttribute("href", homeHref());
  });
  refreshCartBadge();
}

async function renderPdp() {
  const root = document.querySelector("[data-pdp]");
  const status = document.querySelector("[data-pdp-status]");
  if (!root) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    if (status) status.textContent = "缺少商品 ID";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/market-catalog`, { credentials: "same-origin" });
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "加载失败");
    const product = (data.products || []).find((entry) => entry.id === id);
    if (!product) {
      if (status) status.textContent = "商品不存在或未在市集频道发布";
      return;
    }
    const compare =
      product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)
        ? ` <small style="color:#8c8c8c;font-size:14px;text-decoration:line-through;font-weight:500">${money(product.compareAtPrice)}</small>`
        : "";
    root.innerHTML = `
      <div class="mk-pdp-layout">
        <div class="mk-pdp-gallery">
          <img src="${escapeHtml(productImage(product))}" alt="${escapeHtml(productName(product))}" width="800" height="800" />
        </div>
        <div class="mk-pdp-info">
          <h1>${escapeHtml(productName(product))}</h1>
          <p class="mk-pdp-price">${money(product.price)}${compare}</p>
          <p class="mk-pdp-desc">${escapeHtml(productDesc(product) || "暂无详情说明。")}</p>
          <div class="mk-pdp-buy">
            <button type="button" data-pdp-add ${product.isPurchasable === false ? "disabled" : ""}>加入购物车</button>
            <a href="${homeHref()}">返回市集</a>
          </div>
        </div>
      </div>`;
    root.querySelector("[data-pdp-add]")?.addEventListener("click", () => addProductToCart(product));
  } catch (error) {
    if (status) status.textContent = error.message || "加载失败";
  }
}

setupCartChrome();

if (document.body.hasAttribute("data-market-root")) {
  setupPromo();
  setupShelfInteractions();
  loadCatalog();
}

if (document.body.hasAttribute("data-market-pdp")) {
  renderPdp();
}
