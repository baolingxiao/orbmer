import { loadCatalog } from "/shared/js/load-catalog.js";
import * as Store from "/shared/js/store.js";

// The decorative Three.js scene is intentionally disabled so the catalog never
// depends on a third-party CDN. The canvas remains a branded static backdrop.
const THREE = null;

let products = [];

const header = document.querySelector(".site-header");
const authLink = document.querySelector("[data-auth-link]");
const accountLabel = document.querySelector("[data-account-label]");

const canvas = document.querySelector("#printScene");
const languageToggle = document.querySelector(".language-toggle");
const productGrid = document.querySelector("[data-product-grid]");
const productCardTemplate = document.querySelector("#productCardTemplate");
const filterChips = document.querySelectorAll("[data-filter]");
const filterJumps = document.querySelectorAll("[data-filter-jump]");
const cartToggle = document.querySelector(".cart-toggle");
const cartDrawer = document.querySelector("#cartDrawer");
const cartBackdrop = document.querySelector("[data-cart-backdrop]");
const cartClose = document.querySelector(".cart-close");
const cartList = document.querySelector("[data-cart-list]");
const cartCount = document.querySelector("[data-cart-count]");
const cartTotal = document.querySelector("[data-cart-total]");

let activeLanguage = "zh";
let activeFilter = "all";
let searchQuery = "";
let sortMode = "hot";
let page = 1;
const PAGE_SIZE = 24;

const translations = {
  zh: {
    "nav.shop": "商品",
    "nav.collections": "系列",
    "nav.materials": "材料",
    "nav.custom": "定制",
    "nav.cart": "购物车",
    "hero.title": "打印成品，直接购买。",
    "hero.slogan": "我们不是卖商品，我们是在为全球用户精选世界最好的材料、工艺和设计。",
    "hero.body": "中国区 3D打印采购分类。商品由第三方供应，下单后核实供货，仅配送美国地址。",
    "hero.primary": "浏览商品",
    "hero.secondary": "查看系列",
    "hero.dropTitle": "本周主推",
    "hero.dropName": "传统中国龙",
    "hero.dropCta": "加入购物车",
    "collections.title": "按系列选购",
    "collections.body": "先按品类进入，再挑具体商品。",
    "collections.metal": "工程金属件",
    "collections.metalMeta": "支架 · 夹具 · 结构件",
    "collections.toys": "玩具与收藏",
    "collections.toysMeta": "今奇现货 · 龙/恐龙 · 解压 · 钥匙扣",
    "collections.portrait": "照片真人手办",
    "collections.portraitMeta": "半身 · 全身 · 礼盒",
    "shop.title": "全部商品",
    "shop.body": "第三方供应商品。供货、处理时间、退货资格和图片来源在下单前逐项披露。",
    "shop.filterAll": "全部",
    "shop.filterMetal": "金属件",
    "shop.filterToys": "玩具",
    "shop.filterPortrait": "手办",
    "shop.from": "起",
    "shop.add": "加购",
    "shop.search": "搜索商品",
    "shop.sort": "排序",
    "shop.sortHot": "热销",
    "shop.sortPriceAsc": "价格从低到高",
    "shop.sortPriceDesc": "价格从高到低",
    "shop.sortName": "名称",
    "shop.prev": "上一页",
    "shop.next": "下一页",
    "shop.page": "页",
    "shop.view": "查看",
    "footer.shipping": "配送与退货",
    "footer.privacy": "隐私",
    "footer.terms": "条款",
    "footer.contact": "联系",
    "cart.guestOk": "支持游客结账，无需先登录。",
    "spotlight.title": "AlSi10Mg 无人机臂架",
    "spotlight.body": "轻量铝合金打印，适合装机验证与小批量替换件。表面喷砂，孔位已预留。",
    "spotlight.point1": "材料：AlSi10Mg",
    "spotlight.point2": "尺寸：待核实",
    "spotlight.point3": "采购与运输时间：待核实",
    "spotlight.cta": "加入购物车",
    "materials.title": "材料对照",
    "materials.body": "买的是用途匹配，不只是“能打印”。",
    "materials.metalName": "金属粉末",
    "materials.metal": "316L / 17-4PH / AlSi10Mg / TC4，工程强度与装配公差。",
    "materials.pla": "玩具外观件、低成本验证、彩色系列。",
    "materials.petg": "耐用玩具结构、卡扣件、工作室实用件。",
    "materials.resin": "真人手办、细节收藏、展示级表面。",
    "custom.title": "没有现货？提交定制。",
    "custom.body": "上传模型或照片参考，我们按材料与工期回报价。现货优先走购物车。",
    "custom.selectLabel": "定制类型",
    "custom.optionMetal": "工程金属件",
    "custom.optionToys": "玩具模型",
    "custom.optionPortrait": "照片手办",
    "custom.drop": "拖入 STL / STEP / OBJ / 照片",
    "custom.button": "提交定制询价",
    "cart.title": "购物车",
    "cart.total": "合计",
    "cart.checkout": "去结算",
    "cart.note": "结账前显示逐件政策，金额由服务端验证后交给 Stripe。",
    "cart.empty": "购物车还是空的。去挑一件吧。",
    "cart.emptyAction": "去选购",
    "cart.remove": "移除",
    "cart.soldOut": "已售罄",
    "cart.stockCap": "库存不足，已调整数量。",
    "cart.qty": "数量",
    "shop.empty": "没有找到匹配商品。",
    "shop.emptyClear": "清除筛选",
    "shop.emptyBrowse": "查看全部",
    "nav.login": "登录",
    "nav.account": "账户",
    "cart.success": "下单成功",
    "footer.note": "USD | 首发阶段仅配送美国 | 第三方供应",
    "brand.name": "傲马",
    "brand.sub": "Orbmare",
    "brand.footer": "傲马 Orbmare",
    "collection.metal": "金属件",
    "collection.toys": "玩具",
    "collection.portrait": "手办",
  },
  en: {
    "nav.shop": "Shop",
    "nav.collections": "Collections",
    "nav.materials": "Materials",
    "nav.custom": "Custom",
    "nav.cart": "Cart",
    "hero.title": "Printed products. Ready to buy.",
    "hero.slogan": "We curate the world’s finest materials, craftsmanship, and design.",
    "hero.body": "A China-region 3D-print sourcing category. Third-party supplied, availability checked after order, US delivery only.",
    "hero.primary": "Browse Shop",
    "hero.secondary": "View Collections",
    "hero.dropTitle": "This week",
    "hero.dropName": "Traditional Chinese Dragon",
    "hero.dropCta": "Add to Cart",
    "collections.title": "Shop by collection",
    "collections.body": "Enter by category first, then pick the exact product.",
    "collections.metal": "Engineering Metal",
    "collections.metalMeta": "Brackets · jigs · structures",
    "collections.toys": "Toys & Collectibles",
    "collections.toysMeta": "Jinqi stock · dragons · fidgets · keychains",
    "collections.portrait": "Photo Figurines",
    "collections.portraitMeta": "Bust · full body · gift box",
    "shop.title": "All products",
    "shop.body": "Third-party supplied products. Availability, timing, returns, and image source are disclosed item by item.",
    "shop.filterAll": "All",
    "shop.filterMetal": "Metal",
    "shop.filterToys": "Toys",
    "shop.filterPortrait": "Figurines",
    "shop.from": "From",
    "shop.add": "Add",
    "shop.search": "Search products",
    "shop.sort": "Sort",
    "shop.sortHot": "Bestsellers",
    "shop.sortPriceAsc": "Price: low to high",
    "shop.sortPriceDesc": "Price: high to low",
    "shop.sortName": "Name",
    "shop.prev": "Prev",
    "shop.next": "Next",
    "shop.page": "Page",
    "shop.view": "View",
    "footer.shipping": "Shipping & Returns",
    "footer.privacy": "Privacy",
    "footer.terms": "Terms",
    "footer.contact": "Contact",
    "cart.guestOk": "Guest checkout is available — no account required.",
    "spotlight.title": "AlSi10Mg drone arm",
    "spotlight.body": "Lightweight aluminum print for build validation and small-batch replacements. Bead blasted, holes ready.",
    "spotlight.point1": "Material: AlSi10Mg",
    "spotlight.point2": "Dimensions: details pending verification",
    "spotlight.point3": "Sourcing and transit time: pending verification",
    "spotlight.cta": "Add to Cart",
    "materials.title": "Material map",
    "materials.body": "Buy for the job, not just because it can be printed.",
    "materials.metalName": "Metal powder",
    "materials.metal": "316L / 17-4PH / AlSi10Mg / TC4 for strength and fit.",
    "materials.pla": "Toy exteriors, low-cost validation, color runs.",
    "materials.petg": "Durable toy structures, snap fits, workshop parts.",
    "materials.resin": "Portrait figurines, detail collectibles, display finish.",
    "custom.title": "Need something custom?",
    "custom.body": "Upload a model or photo reference for a quote. Stock items go through the cart.",
    "custom.selectLabel": "Custom type",
    "custom.optionMetal": "Engineering metal",
    "custom.optionToys": "Toy model",
    "custom.optionPortrait": "Photo figurine",
    "custom.drop": "Drop STL / STEP / OBJ / photos",
    "custom.button": "Request custom quote",
    "cart.title": "Cart",
    "cart.total": "Total",
    "cart.checkout": "Checkout",
    "cart.note": "Checkout shows item-specific terms; the server verifies amounts before Stripe.",
    "cart.empty": "Your cart is empty. Pick a product.",
    "cart.emptyAction": "Browse shop",
    "cart.remove": "Remove",
    "cart.soldOut": "Sold out",
    "cart.stockCap": "Not enough stock. Quantity adjusted.",
    "cart.qty": "Qty",
    "shop.empty": "No matching products.",
    "shop.emptyClear": "Clear filters",
    "shop.emptyBrowse": "View all",
    "nav.login": "Log in",
    "nav.account": "Account",
    "cart.success": "Order placed",
    "footer.note": "USD | Initial launch: US delivery only | Third-party supplied",
    "brand.name": "Orbmare",
    "brand.sub": "傲马",
    "brand.footer": "Orbmare 傲马",
    "collection.metal": "Metal",
    "collection.toys": "Toys",
    "collection.portrait": "Figurines",
  },
};



function t(key) {
  return translations[activeLanguage][key] ?? key;
}

function formatPrice(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function setLanguage(language) {
  activeLanguage = language;
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  localStorage.setItem("orbmare-language", language);

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (translations[language][key]) node.textContent = translations[language][key];
  });

  document.querySelectorAll("[data-brand-name]").forEach((node) => {
    node.textContent = t("brand.name");
  });
  document.querySelectorAll("[data-brand-sub]").forEach((node) => {
    node.textContent = t("brand.sub");
  });
  document.querySelectorAll("[data-brand-footer]").forEach((node) => {
    node.textContent = t("brand.footer");
  });
  document.title = language === "en" ? "Orbmare" : "傲马 Orbmare";

  languageToggle.querySelectorAll("[data-lang-option]").forEach((option) => {
    option.classList.toggle("active", option.getAttribute("data-lang-option") === language);
  });
  languageToggle.setAttribute("aria-pressed", String(language === "en"));

  renderProducts();
  renderCart();
  refreshAuthNav();
}

function filteredProducts() {
  let list = products.filter((p) => activeFilter === "all" || p.collection === activeFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    list = list.filter((p) => {
      const blob = `${p.zh?.name || ""} ${p.en?.name || ""} ${p.zh?.desc || ""} ${p.en?.desc || ""} ${p.material}`.toLowerCase();
      return blob.includes(q);
    });
  }

  if (sortMode === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
  else if (sortMode === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);
  else if (sortMode === "name") {
    list = [...list].sort((a, b) => (a[activeLanguage]?.name || "").localeCompare(b[activeLanguage]?.name || ""));
  } else {
    list = [...list];
  }

  return list;
}

function renderProducts() {
  if (!productGrid || !productCardTemplate) return;
  productGrid.innerHTML = "";
  const list = filteredProducts();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (page > totalPages) page = totalPages;
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageMeta = document.querySelector("[data-page-meta]");
  if (pageMeta) {
    pageMeta.textContent = `${t("shop.page")} ${page}/${totalPages} · ${list.length}`;
  }

  if (slice.length === 0) {
    const empty = document.createElement("div");
    empty.className = "shop-empty";
    empty.innerHTML = `
      <p>${t("shop.empty")}</p>
      <div class="shop-empty-actions">
        <button type="button" class="button button-secondary" data-empty-clear>${t("shop.emptyClear")}</button>
        <button type="button" class="button button-primary" data-empty-all>${t("shop.emptyBrowse")}</button>
      </div>
    `;
    empty.querySelector("[data-empty-clear]")?.addEventListener("click", () => {
      searchQuery = "";
      const input = document.querySelector("[data-shop-search]");
      if (input) input.value = "";
      setFilter("all");
      syncShopUrl();
    });
    empty.querySelector("[data-empty-all]")?.addEventListener("click", () => {
      searchQuery = "";
      const input = document.querySelector("[data-shop-search]");
      if (input) input.value = "";
      setFilter("all");
      syncShopUrl();
      document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    productGrid.appendChild(empty);
    return;
  }

  slice.forEach((product) => {
    const copy = product[activeLanguage];
    const node = productCardTemplate.content.firstElementChild.cloneNode(true);
    const img = node.querySelector("img");
    const addButton = node.querySelector("button");
    const media = node.querySelector(".product-media");
    const nameEl = node.querySelector(".product-name");

    node.dataset.collection = product.collection;
    media.href = `/product/shop.html?id=${encodeURIComponent(product.id)}`;
    if (nameEl) {
      const nameLink = document.createElement("a");
      nameLink.href = media.href;
      nameLink.className = "product-name-link";
      nameLink.textContent = copy.name;
      nameEl.replaceWith(nameLink);
    }

    img.src = product.image;
    img.alt = copy.name;
    node.querySelector(".product-collection").textContent = t(`collection.${product.collection}`);
    node.querySelector(".product-material").textContent = `${product.sourceCountry} | ${product.fulfillmentLabels[0]}`;
    node.querySelector(".product-desc").textContent = copy.desc;
    const priceLabel =
      product.priceMax && product.priceMax > product.price
        ? `${t("shop.from")} ${formatPrice(product.price)}`
        : formatPrice(product.price);
    node.querySelector(".product-price").textContent = priceLabel;
    const purchasable = product.isPurchasable !== false && Number(product.maxQty ?? 20) > 0;
    addButton.textContent = purchasable ? t("shop.add") : t("cart.soldOut");
    addButton.disabled = !purchasable;
    addButton.addEventListener("click", (e) => {
      e.preventDefault();
      addToCart(product.id);
    });

    productGrid.appendChild(node);
  });
}

function syncShopUrl() {
  const url = new URL(window.location.href);
  if (activeFilter && activeFilter !== "all") url.searchParams.set("filter", activeFilter);
  else url.searchParams.delete("filter");
  if (searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());
  else url.searchParams.delete("q");
  history.replaceState({}, "", `${url.pathname}${url.search}${url.hash || "#shop"}`);
}

function setFilter(filter) {
  activeFilter = filter || "all";
  page = 1;
  filterChips.forEach((chip) => {
    const active = chip.getAttribute("data-filter") === activeFilter;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-selected", String(active));
  });
  renderProducts();
  syncShopUrl();
}

function flashCartNote(message) {
  const note = document.querySelector("[data-cart-flash]");
  if (!note) return;
  note.textContent = message;
  note.hidden = !message;
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  if (product.isPurchasable === false || Number(product.maxQty ?? 20) < 1) {
    flashCartNote(t("cart.soldOut"));
    return;
  }
  const copy = product[activeLanguage] || product.en;
  const result = Store.addCartLine({
    productId: product.id,
    name: copy.name,
    price: product.price,
    image: product.image,
    variantLabel: product.variants?.[0]?.label || "Standard",
    variantId: product.variants?.[0]?.id || "standard",
    qty: 1,
    maxQty: Number(product.maxQty || 20),
  });
  flashCartNote(result?.capped ? t("cart.stockCap") : "");
  renderCart();
  openCart();
}

function checkout() {
  const lines = Store.getCartLines();
  if (lines.length === 0) {
    flashCartNote(t("cart.empty"));
    document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const unavailable = lines.some((line) => {
    const product = products.find((entry) => entry.id === line.productId);
    return !product || product.isPurchasable === false || Number(product.maxQty || 0) < line.qty;
  });
  if (unavailable) {
    flashCartNote(t("cart.stockCap"));
    renderCart();
    return;
  }

  Store.saveCheckoutDraft({
    items: lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      price: l.price,
      qty: l.qty,
      image: l.image,
      variantLabel: l.variantLabel,
      variantId: l.variantId,
    })),
    createdAt: Date.now(),
  });
  window.location.href = "/checkout/";
}

function refreshAuthNav() {
  if (!authLink || !accountLabel) return;
  accountLabel.textContent = activeLanguage === "zh" ? "账户功能暂停" : "Accounts paused";
  authLink.href = "/auth/";
}

function removeFromCart(lineId) {
  Store.removeCartLine(lineId);
  renderCart();
}

function renderCart() {
  const lines = Store.getCartLines();
  let total = 0;
  let count = 0;
  cartList.innerHTML = "";

  const checkoutBtn = document.querySelector("[data-checkout]");
  const containsUnavailable = lines.some((line) => {
    const product = products.find((entry) => entry.id === line.productId);
    return !product || product.isPurchasable === false || Number(product.maxQty || 0) < line.qty;
  });
  if (checkoutBtn) checkoutBtn.disabled = lines.length === 0 || containsUnavailable;

  if (lines.length === 0) {
    cartList.innerHTML = `
      <p class="cart-empty">${t("cart.empty")}</p>
      <button type="button" class="button button-primary button-sm" data-cart-browse>${t("cart.emptyAction")}</button>
    `;
    cartList.querySelector("[data-cart-browse]")?.addEventListener("click", () => {
      closeCart();
      document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  } else {
    lines.forEach((line) => {
      const product = products.find((entry) => entry.id === line.productId);
      const available = Boolean(
        product &&
          product.isPurchasable !== false &&
          Number(product.maxQty ?? 20) > 0
      );
      const max = available ? Number(product.maxQty || 20) : 0;
      total += line.price * line.qty;
      count += line.qty;
      const row = document.createElement("div");
      row.className = "cart-item";
      const image = document.createElement("img");
      image.src = line.image;
      image.alt = "";
      image.width = 84;
      image.height = 84;
      const details = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = line.name;
      const variant = document.createElement("span");
      variant.textContent = line.variantLabel || "";
      const fulfillment = document.createElement("span");
      fulfillment.textContent = product?.fulfillmentLabels?.join(" | ") || t("cart.soldOut");
      const policy = document.createElement("span");
      policy.textContent = available
        ? "Returns and timing: item-specific; verify before payment"
        : t("cart.soldOut");
      const price = document.createElement("span");
      price.textContent = formatPrice(line.price);
      const quantity = document.createElement("label");
      quantity.className = "cart-qty";
      const quantityLabel = document.createElement("span");
      quantityLabel.className = "visually-hidden";
      quantityLabel.textContent = t("cart.qty");
      const decrement = document.createElement("button");
      decrement.type = "button";
      decrement.dataset.qtyDec = "";
      decrement.setAttribute("aria-label", "-");
      decrement.textContent = "−";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.max = String(Math.max(1, max));
      input.value = String(line.qty);
      input.dataset.qtyInput = "";
      input.disabled = !available;
      const increment = document.createElement("button");
      increment.type = "button";
      increment.dataset.qtyInc = "";
      increment.setAttribute("aria-label", "+");
      increment.textContent = "+";
      decrement.disabled = !available;
      increment.disabled = !available;
      quantity.append(quantityLabel, decrement, input, increment);
      details.append(name, variant, fulfillment, policy, price, quantity);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.remove = "";
      remove.textContent = t("cart.remove");
      row.append(image, details, remove);
      row.querySelector("[data-remove]").addEventListener("click", () => removeFromCart(line.lineId));
      row.querySelector("[data-qty-dec]").addEventListener("click", () => {
        Store.setCartLineQty(line.lineId, line.qty - 1);
        renderCart();
      });
      row.querySelector("[data-qty-inc]").addEventListener("click", () => {
        if (line.qty >= max) {
          flashCartNote(t("cart.stockCap"));
          return;
        }
        Store.setCartLineQty(line.lineId, line.qty + 1);
        renderCart();
      });
      row.querySelector("[data-qty-input]").addEventListener("change", (e) => {
        const next = Math.max(1, Math.min(max, Number(e.target.value) || 1));
        if (next !== Number(e.target.value)) flashCartNote(t("cart.stockCap"));
        Store.setCartLineQty(line.lineId, next);
        renderCart();
      });
      cartList.appendChild(row);
    });
  }

  cartCount.textContent = String(count);
  cartTotal.textContent = formatPrice(total);
}

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  cartToggle.setAttribute("aria-expanded", "true");
  cartBackdrop.hidden = false;
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartToggle.setAttribute("aria-expanded", "false");
  cartBackdrop.hidden = true;
}

function toggleCart() {
  if (cartDrawer.classList.contains("open")) closeCart();
  else openCart();
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  const filter = params.get("filter");
  const open = params.get("cart") === "1" || window.location.hash === "#cart";

  if (q) {
    searchQuery = q;
    const input = document.querySelector("[data-shop-search]");
    if (input) input.value = q;
  }
  if (filter && ["all", "metal", "toys", "portrait"].includes(filter)) {
    activeFilter = filter;
    filterChips.forEach((chip) => {
      const active = chip.getAttribute("data-filter") === activeFilter;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-selected", String(active));
    });
  }
  renderProducts();
  if (q || filter) {
    requestAnimationFrame(() => {
      document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  if (open) openCart();
}

languageToggle.addEventListener("click", () => {
  setLanguage(activeLanguage === "zh" ? "en" : "zh");
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => setFilter(chip.getAttribute("data-filter")));
});

filterJumps.forEach((link) => {
  link.addEventListener("click", () => {
    setFilter(link.getAttribute("data-filter-jump"));
  });
});

document.querySelector("[data-shop-search]")?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  page = 1;
  renderProducts();
  syncShopUrl();
});

document.querySelector("[data-shop-sort]")?.addEventListener("change", (e) => {
  sortMode = e.target.value;
  page = 1;
  renderProducts();
});

document.querySelector("[data-page-prev]")?.addEventListener("click", () => {
  if (page > 1) {
    page -= 1;
    renderProducts();
    document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

document.querySelector("[data-page-next]")?.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(filteredProducts().length / PAGE_SIZE));
  if (page < totalPages) {
    page += 1;
    renderProducts();
    document.querySelector("#shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

document.querySelectorAll("[data-add]").forEach((button) => {
  button.addEventListener("click", () => addToCart(button.getAttribute("data-add")));
});

cartToggle.addEventListener("click", toggleCart);
cartClose.addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCart();
});
document.querySelector("[data-checkout]")?.addEventListener("click", checkout);

refreshAuthNav();
renderCart();

new IntersectionObserver(
  ([entry]) => header.classList.toggle("scrolled", entry.intersectionRatio < 0.92),
  { threshold: [0, 0.92, 1] }
).observe(document.querySelector(".hero-stage"));

async function bootShop() {
  try {
    products = await loadCatalog();
  } catch (error) {
    console.error(error);
    products = [];
    if (productGrid) {
      productGrid.innerHTML =
        '<p class="empty-state">商品目录暂时无法加载，请稍后刷新。</p>';
    }
  }

  const savedLanguage = localStorage.getItem("orbmare-language") === "en" ? "en" : "zh";
  try {
    setLanguage(savedLanguage);
    applyUrlState();
  } catch (error) {
    console.error(error);
    setLanguage("zh");
    applyUrlState();
  }
}

bootShop();

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (THREE && canvas) {
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05070a, 0.035);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x091226, 1);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(6.2, 3.1, 7.8);
camera.lookAt(0, 0.6, 0);

const group = new THREE.Group();
scene.add(group);

const accent = new THREE.Color("#1a4db3");
const cyan = new THREE.Color("#2ee8ff");
const orange = new THREE.Color("#e07a1f");

const materials = {
  frame: new THREE.MeshPhysicalMaterial({
    color: 0xdce2e8,
    metalness: 0.65,
    roughness: 0.26,
    clearcoat: 0.45,
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x10141d,
    metalness: 0.35,
    roughness: 0.46,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x2ee8ff,
    transparent: true,
    opacity: 0.18,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.35,
    thickness: 0.8,
  }),
  acid: new THREE.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 1.25,
    roughness: 0.32,
  }),
  cyan: new THREE.MeshStandardMaterial({
    color: cyan,
    emissive: cyan,
    emissiveIntensity: 0.52,
    roughness: 0.34,
  }),
  orange: new THREE.MeshStandardMaterial({
    color: orange,
    emissive: orange,
    emissiveIntensity: 0.42,
    roughness: 0.38,
  }),
};

scene.add(new THREE.AmbientLight(0xa9c7ff, 0.6));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(-4, 5, 6);
scene.add(keyLight);

const acidLight = new THREE.PointLight(0x1a4db3, 20, 12);
acidLight.position.set(0.3, 1.9, 1.2);
scene.add(acidLight);

const cyanLight = new THREE.PointLight(0x2ee8ff, 18, 13);
cyanLight.position.set(3.5, 2.3, -1.4);
scene.add(cyanLight);

function box(name, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

function cylinder(name, radiusTop, radiusBottom, depth, position, material, radial = 48) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, depth, radial),
    material
  );
  mesh.name = name;
  mesh.position.set(...position);
  group.add(mesh);
  return mesh;
}

[
  ["leftTower", [0.14, 3.7, 0.14], [-2.3, 0.6, 0]],
  ["rightTower", [0.14, 3.7, 0.14], [2.3, 0.6, 0]],
  ["topRail", [4.8, 0.14, 0.14], [0, 2.45, 0]],
  ["bottomRail", [4.8, 0.14, 0.14], [0, -1.25, 0]],
  ["backRailTop", [4.4, 0.1, 0.1], [0, 2.18, -1.9]],
  ["backRailBottom", [4.4, 0.1, 0.1], [0, -1.08, -1.9]],
].forEach(([name, size, position]) => box(name, size, position, materials.frame));

box("buildPlate", [3.7, 0.12, 2.45], [0, -1.02, 0.02], materials.glass);
box("frontGlass", [4.3, 3.1, 0.04], [0, 0.54, 1.28], materials.glass);
box("xRail", [3.65, 0.08, 0.08], [0, 1.32, 0.28], materials.cyan);

const printHead = new THREE.Group();
printHead.add(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.42, 0.56), materials.acid));
const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.42, 32), materials.frame);
nozzle.position.y = -0.42;
nozzle.rotation.x = Math.PI;
printHead.add(nozzle);
printHead.position.set(-0.8, 1.27, 0.28);
group.add(printHead);

const spools = new THREE.Group();
[
  [1.58, 2.72, -0.95, materials.acid],
  [2.08, 2.72, -0.95, materials.cyan],
  [2.58, 2.72, -0.95, materials.orange],
].forEach(([x, y, z, material]) => {
  const spool = cylinder("filamentSpool", 0.22, 0.22, 0.18, [x, y, z], material);
  spool.rotation.x = Math.PI / 2;
  const hole = cylinder("spoolHole", 0.08, 0.08, 0.2, [x, y, z], materials.dark);
  hole.rotation.x = Math.PI / 2;
  spools.add(spool, hole);
});
group.add(spools);

const printObject = new THREE.Group();
group.add(printObject);
const layers = [];
for (let i = 0; i < 34; i += 1) {
  const width = 0.64 + i * 0.027 + Math.sin(i * 0.6) * 0.06;
  const depth = 0.44 + i * 0.014;
  const layer = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.025, depth),
    i % 5 === 0 ? materials.cyan : materials.acid
  );
  layer.position.set(Math.sin(i * 0.35) * 0.08, -0.86 + i * 0.045, 0.06);
  layer.scale.x = 0.01;
  layer.visible = false;
  layers.push(layer);
  printObject.add(layer);
}

const bracketPreview = new THREE.Group();
const previewBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.22), materials.orange);
const previewLegA = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), materials.orange);
const previewLegB = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.1, 0.22), materials.orange);
previewLegA.position.set(-0.55, -0.42, 0);
previewLegB.position.set(0.55, -0.42, 0);
bracketPreview.add(previewBar, previewLegA, previewLegB);
bracketPreview.position.set(3.0, 0.9, -0.85);
bracketPreview.rotation.set(0.15, -0.55, 0.18);
group.add(bracketPreview);

const grid = new THREE.GridHelper(8, 24, 0x2ee8ff, 0x203242);
grid.position.y = -1.12;
grid.material.transparent = true;
grid.material.opacity = 0.24;
group.add(grid);

function resize() {
  const { clientWidth, clientHeight } = canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function render(time = 0) {
  const seconds = time * 0.001;
  const mobile = canvas.clientWidth < 760;

  group.rotation.y = mobile ? -0.18 : -0.42;
  group.position.set(mobile ? 0.25 : 1.05, mobile ? -0.35 : -0.1, 0);
  group.scale.setScalar(mobile ? 0.74 : 1);

  const travel = Math.sin(seconds * 1.3);
  printHead.position.x = travel * 1.15;
  printHead.position.y = 1.25 + Math.sin(seconds * 1.8) * 0.08;
  acidLight.position.x = printHead.position.x;
  acidLight.position.y = printHead.position.y + 0.2;

  const activeLayer = Math.floor(((Math.sin(seconds * 0.45) + 1) / 2) * layers.length);
  layers.forEach((layer, index) => {
    layer.visible = index <= activeLayer;
    const target = index <= activeLayer ? 1 : 0.01;
    layer.scale.x += (target - layer.scale.x) * 0.1;
  });

  spools.rotation.z += prefersReducedMotion ? 0 : 0.012;
  bracketPreview.rotation.y = -0.55 + Math.sin(seconds * 0.8) * 0.18;

  camera.position.x = mobile ? 4.4 : 6.2 + Math.sin(seconds * 0.22) * 0.32;
  camera.position.y = mobile ? 2.45 : 3.1 + Math.cos(seconds * 0.18) * 0.14;
  camera.lookAt(mobile ? 0.35 : 0.65, 0.3, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

resize();
window.addEventListener("resize", resize);
requestAnimationFrame(render);
}
