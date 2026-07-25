import { loadCatalog, getProductFromList } from "/shared/js/load-catalog.js";
import * as Store from "/shared/js/store.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const lang = localStorage.getItem("orbmare-language") === "en" ? "en" : "zh";

const missing = document.querySelector("#missing");
const grid = document.querySelector("#pdpGrid");
const cartCount = document.querySelector("[data-cart-count]");

function money(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function refreshCount() {
  cartCount.textContent = String(Store.cartCount());
}

function renderProduct(product) {
  grid.hidden = false;
  const copy = product[lang] || product.en;
  const variants =
    product.variants?.length > 0
      ? product.variants
      : [{ id: "standard", label: "Standard", price: product.price }];
  const images = product.images?.length ? product.images : [product.image];

  document.title = `${copy.name} | 傲马 Orbmare`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", copy.desc);

  document.querySelector("#collection").textContent = product.collection.toUpperCase();
  document.querySelector("#title").textContent = copy.name;
  document.querySelector("#desc").textContent = copy.desc;
  const fulfillmentTags = document.querySelector("#fulfillmentTags");
  product.fulfillmentLabels.forEach((label) => {
    const tag = document.createElement("span");
    tag.textContent = label;
    fulfillmentTags.appendChild(tag);
  });
  const detail = (value) =>
    value === null || value === undefined || value === ""
      ? "Details pending verification"
      : value;
  const returnText =
    product.returnEligible === true
      ? `Return eligible${product.returnWindowDays ? ` within ${product.returnWindowDays} days` : ""}`
      : product.returnEligible === false
        ? "Not return eligible"
        : "Details pending verification";
  const finalSaleText =
    product.finalSale === true ? "Yes" : product.finalSale === false ? "No" : "Details pending verification";
  const sourcingFacts = document.querySelector("#sourcingFacts");
  [
    ["Source country", detail(product.sourceCountry)],
    ["Source type", detail(product.sourceType)],
    ["Material", detail(product.material)],
    ["Dimensions", detail(product.dimensions)],
    ["Procurement processing", detail(product.processingTime)],
    ["International transit", detail(product.internationalShippingTime)],
    ["Return eligibility", returnText],
    ["Cancellation deadline", detail(product.cancellationDeadline)],
    ["Import charges", detail(product.dutiesTreatment)],
    ["Safety warning", detail(product.safetyWarning)],
    ["Final sale", finalSaleText],
    ["Image source", detail(product.imageSource)],
  ].forEach(([term, value]) => {
    const row = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = term;
    dd.textContent = value;
    row.append(dt, dd);
    sourcingFacts.appendChild(row);
  });
  document.querySelector("#supplierNotice").textContent = product.supplierInfoNotice;

  const mainImage = document.querySelector("#mainImage");
  mainImage.src = images[0];
  mainImage.alt = copy.name;

  const thumbs = document.querySelector("#thumbs");
  images.forEach((src, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = i === 0 ? "is-active" : "";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    btn.appendChild(img);
    btn.addEventListener("click", () => {
      mainImage.src = src;
      thumbs.querySelectorAll("button").forEach((node) => node.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
    thumbs.appendChild(btn);
  });

  const variantField = document.querySelector("#variantField");
  const variantSelect = document.querySelector("#variantSelect");
  if (variants.length > 1) {
    variantField.hidden = false;
    variants.forEach((v, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${v.label} - ${money(v.price)}`;
      variantSelect.appendChild(opt);
    });
  } else {
    variantField.hidden = true;
    variantSelect.innerHTML = `<option value="0">${variants[0].label}</option>`;
  }

  function selectedVariant() {
    return variants[Number(variantSelect.value) || 0];
  }

  function syncPrice() {
    document.querySelector("#price").textContent = money(selectedVariant().price);
  }
  variantSelect.addEventListener("change", syncPrice);
  syncPrice();

  const qtyInput = document.querySelector("#qty");
  const maximumQuantity = Math.max(0, Number(product.maxQty ?? 20));
  if (qtyInput) qtyInput.max = String(Math.max(1, maximumQuantity));

  const brandName = document.querySelector(".platform-brand-text strong");
  const brandSub = document.querySelector(".platform-brand-text em");
  if (brandName && brandSub) {
    brandName.textContent = lang === "en" ? "Orbmare" : "傲马";
    brandSub.textContent = lang === "en" ? "傲马" : "Orbmare";
  }

  const addBtn = document.querySelector("#addBtn");
  const buyBtn = document.querySelector("#buyBtn");
  if (lang === "zh") {
    addBtn.textContent = "加入购物车";
    buyBtn.textContent = "立即购买";
  }
  if (!product.isPurchasable || maximumQuantity < 1) {
    addBtn.disabled = true;
    buyBtn.disabled = true;
    addBtn.textContent = lang === "zh" ? "暂不可购买" : "Unavailable";
    buyBtn.textContent = lang === "zh" ? "暂不可购买" : "Unavailable";
  }
  function add(qty) {
    if (!product.isPurchasable || maximumQuantity < 1) return;
    const v = selectedVariant();
    Store.addCartLine({
      productId: product.id,
      name: copy.name,
      price: v.price,
      image: product.image,
      variantLabel: v.label,
      variantId: v.id,
      qty,
      maxQty: maximumQuantity,
    });
    refreshCount();
  }

  addBtn.addEventListener("click", () => {
    const qty = Math.max(1, Math.min(maximumQuantity, Number(qtyInput?.value) || 1));
    add(qty);
    addBtn.textContent = lang === "zh" ? "已加入 ✓" : "Added ✓";
    setTimeout(() => {
      addBtn.textContent = lang === "zh" ? "加入购物车" : "Add to cart";
    }, 1200);
  });

  buyBtn.addEventListener("click", () => {
    const qty = Math.max(1, Math.min(maximumQuantity, Number(qtyInput?.value) || 1));
    add(qty);
    const lines = Store.getCartLines();
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
  });
}

async function bootProduct() {
  refreshCount();
  document.querySelector("#cartJump").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/shop/?cart=1#cart";
  });

  let products = [];
  try {
    products = await loadCatalog();
  } catch (error) {
    console.error(error);
  }
  const product = getProductFromList(products, id);
  if (!product) {
    missing.hidden = false;
    return;
  }
  renderProduct(product);
}

bootProduct();
