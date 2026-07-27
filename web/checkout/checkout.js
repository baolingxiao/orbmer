import { getLang, LANG_KEY } from "/shared/js/editorial-i18n.js";
import * as Store from "/shared/js/store.js";
import { getCustomerCommunicationCopy } from "/shared/js/customer-communications.js";
import {
  incotermDisplay,
  returnPolicyListDisplay,
  taxStatusDisplay,
} from "/shared/js/commerce-display.js";

const API_BASE = window.location.port === "5180" ? "http://127.0.0.1:4242" : "";
const lang = getLang();
const form = document.querySelector("#checkoutForm");
const payBtn = document.querySelector("#payBtn");
const formError = document.querySelector("#formError");
const stripeStatus = document.querySelector("#stripeStatus");
const paymentRoot = document.querySelector("#payment-element");
const policyRoot = document.querySelector("#checkoutPolicies");
const summaryItems = document.querySelector("#summaryItems");
const quoteStatus = document.querySelector("#quoteStatus");
const stageRoot = document.querySelector("#fulfillmentStages");
const shippingMethods = document.querySelector("#shippingMethods");
const sourcingNotice = document.querySelector("#sourcingNotice");
const customerCopy = getCustomerCommunicationCopy(lang);

const copy = {
  zh: {
    trustDelivery: "国际配送按国家报价",
    trustStripe: "银行卡信息由 Stripe 安全处理",
    kicker: "Orbmare",
    slogan: "探索世界最好的作品。",
    title: "核对并支付",
    lede: "您的订单将在付款后进入采购确认流程。我们会根据商品来源、供应商备货情况和配送目的地安排采购与运输。付款前，您可以查看预计费用与送达时间。",
    checkoutIntro: "结账说明",
    contact: "联系方式",
    email: "邮箱",
    phone: "电话",
    optional: "选填",
    delivery: "配送地址",
    fullName: "姓名",
    company: "公司",
    country: "国家/地区",
    address1: "地址第一行",
    address2: "地址第二行",
    city: "城市",
    region: "州/省/地区",
    postal: "邮编",
    deliveryMethod: "配送方式",
    expressAir: "空运快递",
    standardAir: "标准空运",
    economySea: "经济海运",
    realtimeQuote: "实时或账号报价",
    estimatedQuote: "估算报价",
    ...customerCopy.checkout,
    estimateTitle: "预计履约时间",
    termsTitle: "本订单特殊条款",
    acknowledgementTitle: "政策确认",
    paymentTitle: "Stripe 安全支付",
    checkingPayment: "正在检查支付可用性。",
    continuePayment: "继续安全支付",
    orderSummary: "订单摘要",
    merchandise: "商品小计",
    serviceFee: "采购与服务费",
    serviceIncluded: "已包含在商品价格中",
    shipping: "配送费用",
    linkShipping: "配送",
    tax: "销售税、增值税或商品服务税",
    duty: "预计进口关税",
    customsFee: "清关或处理费",
    discount: "优惠",
    dueNow: "当前应付总额",
    deliveryDate: "预计送达日期",
    costStatus: "税费和进口费用状态",
    importCosts: "税费和进口费用",
    shippingTerms: "查看详细配送条款",
    dueOnDelivery: "预计到货时支付",
    countriesLoading: "正在载入可配送国家。",
    quoteLoading: "正在计算订单报价。",
    quoteReady: "报价已更新。",
    unsupported: "当前国家暂未开放配送。",
    incomplete: "填写完整地址后将更新税费与配送。",
    invalidPostal: "邮编格式需要按所选国家填写。",
    unavailable: "Stripe 安全支付暂不可用。请稍后再试或联系傲马。",
    devUnavailable: "当前环境未启用 Stripe 付款。订单不会被模拟创建。",
    ready: "安全支付已准备好。",
    payNow: "立即支付",
    processing: "正在处理",
    required: "请完整填写联系人与配送地址。",
    consent: "请先确认订单政策。",
    sourcingConsent: "请先确认采购与配送说明。",
    reviewFailed: "当前订单还没有完成核对，请稍后再试。",
    paymentFailed: "支付暂时没有完成，请检查信息后再试。",
    standard: "标准",
    qty: "数量",
    source: "来源",
    orderType: "订单类型",
    madeToOrder: "按需采购",
    limited: "限量调货",
    custom: "定制制作",
    stocked: "现货商品",
    finalSale: "特殊售后条款",
    returnPolicy: "退货规则",
    included: "已包含",
    estimated: "预计金额",
    payOnDelivery: "到货时支付",
    notApplicable: "不适用",
    waitingAddress: "等待完整地址",
    procurement: "采购确认",
    supplier: "供应商备货",
    shippingCustoms: "国际运输及清关",
    buffer: "履约缓冲",
    days: "个工作日",
    acknowledgePrefix: "我确认：",
    backDiscover: "返回发现",
    links: { shipping: "配送", returns: "退货", customs: "税费", contact: "联系" },
  },
  en: {
    trustDelivery: "International delivery quoted by country",
    trustStripe: "Card data handled by Stripe",
    kicker: "傲马",
    slogan: "Discover the world's finest objects.",
    title: "Review and pay",
    lede: "Your order enters procurement review after payment. We arrange sourcing and transport based on item origin, supplier readiness, and destination. Before paying, you can review estimated costs and delivery timing.",
    checkoutIntro: "Checkout notes",
    contact: "Contact",
    email: "Email",
    phone: "Phone",
    optional: "optional",
    delivery: "Delivery address",
    fullName: "Full name",
    company: "Company",
    country: "Country / region",
    address1: "Address line 1",
    address2: "Address line 2",
    city: "City",
    region: "State / province / region",
    postal: "Postal code",
    deliveryMethod: "Delivery method",
    expressAir: "Express air",
    standardAir: "Standard air",
    economySea: "Economy sea freight",
    realtimeQuote: "Live or account rate",
    estimatedQuote: "Estimated rate",
    ...customerCopy.checkout,
    estimateTitle: "Estimated fulfillment",
    termsTitle: "Order-specific terms",
    acknowledgementTitle: "Policy acknowledgement",
    paymentTitle: "Stripe secure payment",
    checkingPayment: "Checking payment availability.",
    continuePayment: "Continue to secure payment",
    orderSummary: "Order summary",
    merchandise: "Merchandise",
    serviceFee: "Procurement and service fee",
    serviceIncluded: "Included in item prices",
    shipping: "Shipping",
    linkShipping: "Shipping",
    tax: "Sales tax / VAT / GST",
    duty: "Estimated import duty",
    customsFee: "Customs or handling fee",
    discount: "Discount",
    dueNow: "Total due now",
    deliveryDate: "Estimated delivery",
    costStatus: "Tax and import-cost status",
    importCosts: "Taxes and import costs",
    shippingTerms: "View detailed shipping terms",
    dueOnDelivery: "Estimated due on delivery",
    countriesLoading: "Loading available countries.",
    quoteLoading: "Calculating order quote.",
    quoteReady: "Quote updated.",
    unsupported: "This destination is not currently available.",
    incomplete: "Taxes and shipping update after the full address is entered.",
    invalidPostal: "Postal code does not match the selected country.",
    unavailable: "Stripe secure payment is unavailable. Please try later or contact Orbmare.",
    devUnavailable: "Stripe payment is not enabled in this environment. No simulated order will be created.",
    ready: "Secure payment is ready.",
    payNow: "Pay now",
    processing: "Processing",
    required: "Complete the contact and delivery address.",
    consent: "Confirm the order policy first.",
    sourcingConsent: "Confirm the sourcing and shipping note first.",
    reviewFailed: "Unable to review this order.",
    paymentFailed: "Payment could not continue.",
    standard: "Standard",
    qty: "Qty",
    source: "Origin",
    orderType: "Order type",
    madeToOrder: "On-demand sourcing",
    limited: "Limited allocation",
    custom: "Custom production",
    stocked: "In stock",
    finalSale: "Order-specific sale terms",
    returnPolicy: "Return policy",
    included: "Included",
    estimated: "Estimated",
    payOnDelivery: "Pay on delivery",
    notApplicable: "Not applicable",
    waitingAddress: "Waiting for full address",
    procurement: "Procurement confirmation",
    supplier: "Supplier processing",
    shippingCustoms: "International shipping and customs",
    buffer: "Fulfillment buffer",
    days: "business days",
    acknowledgePrefix: "I confirm:",
    backDiscover: "Back to Discover",
    links: { shipping: "Shipping", returns: "Returns", customs: "Customs", contact: "Contact" },
  },
}[lang];

document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
document.title = lang === "zh" ? "结账 | 傲马 Orbmare" : "Checkout | Orbmare 傲马";
document.querySelectorAll("[data-ck]").forEach((node) => {
  const value = node.dataset.ck.split(".").reduce((current, key) => current?.[key], copy);
  if (value) node.textContent = value;
});
const legalAcknowledge = document.querySelector("[data-ck='legalAcknowledge']");
if (legalAcknowledge) {
  legalAcknowledge.innerHTML =
    lang === "zh"
      ? `我已阅读并同意 Orbmare 的<a href="/legal/purchasing-service.html" target="_blank" rel="noopener">《采购服务条款》</a><a href="/legal/customs.html" target="_blank" rel="noopener">《配送与进口费用说明》</a><a href="/legal/returns.html" target="_blank" rel="noopener">《退货与退款政策》</a>和<a href="/legal/privacy.html" target="_blank" rel="noopener">《隐私政策》</a>。`
      : `I have read and agree to Orbmare’s <a href="/legal/purchasing-service.html" target="_blank" rel="noopener">Purchasing Service Terms</a>, <a href="/legal/customs.html" target="_blank" rel="noopener">Shipping and Import Cost Policy</a>, <a href="/legal/returns.html" target="_blank" rel="noopener">Returns and Refunds Policy</a>, and <a href="/legal/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.`;
}
document.querySelector("[data-checkout-brand-primary]").textContent = lang === "zh" ? "傲马" : "Orbmare";
document.querySelector("[data-checkout-brand-secondary]").textContent = lang === "zh" ? "Orbmare" : "傲马";
document.querySelector("[data-checkout-lang]")?.addEventListener("click", () => {
  localStorage.setItem(LANG_KEY, lang === "zh" ? "en" : "zh");
  location.reload();
});

const cartLines = Store.getCartLines();
if (!cartLines.length) window.location.replace("/discover/");

const requestedItems = cartLines.map((line) => ({
  productId: line.productId,
  variantId: line.variantId === "curated" ? "standard" : line.variantId || "standard",
  qty: Math.max(1, Math.min(20, Number(line.qty) || 1)),
}));

let countries = [];
let currentQuote = null;
let stripeConfig = null;
let stripe;
let elements;
let securePaymentReady = false;
let quoteTimer = null;

const money = (amount, currency = "USD") =>
  new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency,
  }).format(Number(amount || 0) / 100);

const regionNames = new Intl.DisplayNames([lang === "zh" ? "zh-CN" : "en"], { type: "region" });

function countryName(value) {
  const map = { China: "CN", Japan: "JP", Italy: "IT", "United States": "US" };
  const code = map[value] || value;
  if (/^[A-Z]{2}$/.test(String(code))) return regionNames.of(code) || code;
  return value || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showError(message) {
  formError.hidden = !message;
  formError.textContent = message || "";
}

function setStatus(message, mode = "") {
  quoteStatus.textContent = message || "";
  quoteStatus.dataset.mode = mode;
}

function readAddress() {
  const data = new FormData(form);
  return {
    country: String(data.get("country") || "US").trim().toUpperCase(),
    fullName: String(data.get("fullName") || "").trim(),
    company: String(data.get("company") || "").trim(),
    addressLine1: String(data.get("addressLine1") || "").trim(),
    addressLine2: String(data.get("addressLine2") || "").trim(),
    city: String(data.get("city") || "").trim(),
    stateProvinceRegion: String(data.get("stateProvinceRegion") || "").trim(),
    postalCode: String(data.get("postalCode") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
  };
}

function readInput() {
  const data = new FormData(form);
  const address = readAddress();
  return {
    customer: {
      email: String(data.get("email") || "").trim(),
      phone: address.phone,
    },
    shipping: address,
  };
}

function selectedCountry() {
  const address = readAddress();
  return countries.find((entry) => entry.countryCode === address.country);
}

function validateInput() {
  const input = readInput();
  const rule = selectedCountry();
  const required = rule?.addressRequirements?.required || [];
  if (!input.customer.email || !input.customer.email.includes("@")) throw new Error(copy.required);
  for (const field of required) {
    if (!input.shipping[field]) throw new Error(copy.required);
  }
  if (!document.querySelector("#sourcingAcknowledgement").checked) throw new Error(copy.sourcingConsent);
  if (!document.querySelector("#orderAcknowledgement").checked) throw new Error(copy.consent);
  if (!currentQuote?.quoteId) throw new Error(copy.reviewFailed);
  if (currentQuote.addressValidation?.postalValid === false) throw new Error(copy.invalidPostal);
  return input;
}

async function postJson(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    const error = new Error(result.error || copy.reviewFailed);
    error.payload = result;
    throw error;
  }
  return result;
}

async function loadConfig() {
  const response = await fetch(`${API_BASE}/api/stripe/config`);
  if (!response.ok) throw new Error(copy.unavailable);
  return response.json();
}

function renderCountries() {
  const select = form.elements.country;
  select.innerHTML = countries
    .map((entry) => {
      const label = new Intl.DisplayNames([lang === "zh" ? "zh-CN" : "en"], { type: "region" }).of(entry.countryCode);
      return `<option value="${entry.countryCode}" ${entry.enabled ? "" : "disabled"}>${escapeHtml(label || entry.countryCode)}</option>`;
    })
    .join("");
}

function updateAddressLabels() {
  const rule = selectedCountry();
  const region = rule?.addressRequirements?.regionLabel?.[lang] || copy.region;
  const postal = rule?.addressRequirements?.postalLabel?.[lang] || copy.postal;
  document.querySelector("[data-region-label]").textContent = region;
  document.querySelector("[data-postal-label]").textContent = postal;
}

function renderLineItems(items = [], currency = "USD") {
  summaryItems.innerHTML = items
    .map((item) => {
      const name = lang === "zh" ? item.nameZh : item.nameEn;
      const meta = item.policy || {};
      const orderType = meta.customizedProduct
        ? copy.custom
        : meta.inventoryStatus === "STOCKED"
          ? copy.stocked
          : meta.madeToOrder
            ? copy.madeToOrder
            : copy.limited;
      return `<div class="summary-row">
        <img src="${escapeHtml(item.image)}" alt="">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(item.variantLabel === "Standard" ? copy.standard : item.variantLabel || copy.standard)} · ${copy.qty} ${item.qty}</span>
          <small>${escapeHtml(copy.source)}: ${escapeHtml(countryName(meta.originCountry || meta.sourceCountry || ""))} · ${escapeHtml(orderType)}</small>
        </div>
        <em>${money(item.lineAmountCents, currency)}</em>
      </div>`;
    })
    .join("");
}

function statusText(status) {
  return taxStatusDisplay(status, lang, {
    incoterm: currentQuote?.countryRule?.incoterm,
  }).label;
}

function renderTotals(quote) {
  const currency = quote.currency || "USD";
  document.querySelector("#summarySubtotal").textContent = money(quote.subtotal, currency);
  document.querySelector("#summaryService").textContent = quote.serviceFee ? money(quote.serviceFee, currency) : copy.serviceIncluded;
  document.querySelector("#summaryShipping").textContent = money(quote.shipping, currency);
  document.querySelector("#summaryTax").textContent = quote.taxQuote?.status === "PENDING_ADDRESS" ? copy.waitingAddress : money(quote.tax, currency);
  document.querySelector("#summaryDuty").textContent = money(quote.duty, currency);
  document.querySelector("#summaryCustoms").textContent = money(quote.customsFee + quote.importTax, currency);
  document.querySelector("#summaryDiscount").textContent = quote.discount ? `-${money(quote.discount, currency)}` : money(0, currency);
  document.querySelector("#summaryTotal").textContent = money(quote.amountDueNow, currency);
  document.querySelector("#summaryDelivery").textContent = `${quote.fulfillmentEstimate.estimatedStartDate} – ${quote.fulfillmentEstimate.estimatedEndDate}`;
  document.querySelector("#summaryStatus").textContent = taxStatusDisplay(quote.landedCost?.status, lang, {
    incoterm: quote.countryRule?.incoterm,
  }).label;
  document.querySelector("#summaryDeliveryDue").textContent = money(quote.amountPotentiallyDueOnDelivery, currency);
}

function renderShipping(quote) {
  const options = quote.shippingOptions?.length ? quote.shippingOptions : [quote.shippingQuote];
  const modeLabels = {
    EXPRESS_AIR: copy.expressAir,
    STANDARD_AIR: copy.standardAir,
    ECONOMY_SEA: copy.economySea,
  };
  shippingMethods.innerHTML = options
    .map((shipping) => {
      const checked = shipping.serviceCode === quote.selectedShippingMethod ? "checked" : "";
      const name = lang === "zh" ? shipping.serviceNameZh || shipping.serviceName : shipping.serviceName;
      const mode = modeLabels[shipping.shippingMode] || shipping.shippingMode;
      const source = shipping.isEstimate ? copy.estimatedQuote : copy.realtimeQuote;
      return `<label class="method-row">
        <input type="radio" name="shippingMethod" value="${escapeHtml(shipping.serviceCode)}" ${checked}>
        <span>
          <strong>${escapeHtml(name)}</strong>
          <small>${escapeHtml(mode)} · ${shipping.estimatedTransitDaysMin}-${shipping.estimatedTransitDaysMax} ${copy.days}</small>
          <small>${escapeHtml(shipping.carrier)} · ${escapeHtml(source)}</small>
        </span>
        <em>${money(shipping.shippingFee, quote.currency)}</em>
      </label>`;
    })
    .join("");
}

function renderSourcingNotice() {
  if (!sourcingNotice) return;
  sourcingNotice.innerHTML = `<article class="sourcing-card">
    <p>${escapeHtml(copy.sourcingLead)}</p>
    <p>${escapeHtml(copy.sourcingQuote)}</p>
    <p>${escapeHtml(copy.sourcingUpdate)}</p>
    <ul>
      <li>${escapeHtml(copy.smallDifference)}</li>
      <li>${escapeHtml(copy.materialDifference)}</li>
      <li>${escapeHtml(copy.unavailableItem)}</li>
    </ul>
  </article>`;
}

function renderStages(quote) {
  const labels = {
    procurement: copy.procurement,
    supplier_processing: copy.supplier,
    shipping_customs: copy.shippingCustoms,
    buffer: copy.buffer,
  };
  stageRoot.innerHTML = quote.fulfillmentEstimate.stageBreakdown
    .map((stage) => `<div><dt>${escapeHtml(labels[stage.id] || stage.id)}</dt><dd>${stage.daysMin}-${stage.daysMax} ${copy.days}</dd></div>`)
    .join("");
}

function madeToOrderPolicyHtml() {
  const isZh = lang === "zh";
  const title = isZh ? "Thoughtfully Sourced. Made for You." : "Thoughtfully Sourced. Made for You.";
  const body = isZh
    ? [
        "每件作品都会在你下单后专门采购、预留或安排制作。这让 Orbmare 能从世界各地独立品牌中精选作品，而不是只销售仓库现货。",
        "由于每次购买都是按需发生，采购开始后，订单通常不能因改变主意、尺码选择错误、个人偏好，或摄影 / 天然材料造成的轻微色泽与纹理差异而取消、退货或换货。",
        "如果商品在送达时损坏、有缺陷，或与描述存在明显重大差异，请在送达后 7 天内联系我们。我们会审核情况，并在适当时提供替换、维修、店铺余额或退款。"
      ]
    : [
        "Every piece is purchased specifically for your order, which allows Orbmare to curate products from independent brands around the world rather than holding inventory.",
        "Because each purchase is made on demand, orders generally cannot be canceled, returned, or exchanged once procurement begins for change of mind, incorrect size selection, personal preference, or minor color / texture differences caused by photography or natural materials.",
        "If your order arrives damaged, defective, or significantly different from what was described, contact us within 7 days of delivery. We will review the case and, where appropriate, offer a replacement, repair, store credit, or refund."
      ];
  const bullets = isZh
    ? ["改变主意", "尺码选择错误", "个人偏好", "摄影或天然材料造成的轻微色泽 / 纹理差异"]
    : ["Change of mind", "Incorrect size selection", "Personal preference", "Minor color or texture differences caused by photography or natural materials"];
  return `<article class="policy-block policy-block-made">
    <p class="policy-eyebrow">${isZh ? "按需采购规则" : "Made-to-Order Policy"}</p>
    <h3>${escapeHtml(title)}</h3>
    ${body.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
    <ul>${bullets.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
  </article>`;
}

function renderPolicies(quote) {
  const policies = quote.policies || {};
  const importStatus = taxStatusDisplay(quote.landedCost?.status, lang, {
    incoterm: quote.countryRule?.incoterm,
  });
  const incoterm = incotermDisplay(quote.countryRule?.incoterm, lang);
  const returnPolicies = returnPolicyListDisplay(policies.returnPolicyTypes, lang);
  policyRoot.innerHTML = `${madeToOrderPolicyHtml()}<article class="policy-block">
    <h3>${escapeHtml(copy.termsTitle)}</h3>
    <p>${escapeHtml(policies.policyText || "")}</p>
    <dl>
      <div><dt>${escapeHtml(copy.returnPolicy)}</dt><dd>${returnPolicies
        .map((policy) => `<strong>${escapeHtml(policy.title)}</strong><br><span>${escapeHtml(policy.description)}</span>`)
        .join("<hr>")}</dd></div>
      <div><dt>${escapeHtml(copy.importCosts)}</dt><dd><strong>${escapeHtml(importStatus.label)}</strong><br><span>${escapeHtml(importStatus.description)}</span></dd></div>
      <div><dt>${escapeHtml(copy.shippingTerms)}</dt><dd><strong>${escapeHtml(incoterm.customerTitle)}</strong><br><span>${escapeHtml(incoterm.description)} ${escapeHtml(incoterm.detailTitle)}</span></dd></div>
    </dl>
  </article>
  <article class="policy-confirm">
    <h3>${escapeHtml(copy.acknowledgePrefix)}</h3>
    <ul>${(policies.acknowledgement || []).map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
  </article>`;
}

function renderQuote(quote) {
  currentQuote = quote;
  renderLineItems(quote.lineItems, quote.currency);
  renderTotals(quote);
  renderShipping(quote);
  renderSourcingNotice();
  renderStages(quote);
  renderPolicies(quote);
  if (quote.addressValidation?.postalValid === false) {
    setStatus(copy.invalidPostal, "warn");
  } else if (quote.addressValidation?.complete === false) {
    setStatus(copy.incomplete, "warn");
  } else {
    setStatus(copy.quoteReady, "ok");
  }
  securePaymentReady = false;
  elements = null;
  paymentRoot.innerHTML = "";
  payBtn.textContent = copy.continuePayment;
  payBtn.disabled = !stripeConfig?.paymentsEnabled;
}

async function refreshQuote() {
  setStatus(copy.quoteLoading);
  try {
    const quote = await postJson("/api/checkout/quote", {
      items: requestedItems,
      destinationAddress: readAddress(),
      selectedShippingMethod: form.elements.shippingMethod?.value || "",
      locale: lang,
      currency: "USD",
    });
    renderQuote(quote);
  } catch (error) {
    currentQuote = null;
    const code = error.payload?.code;
    if (code === "UNSUPPORTED_COUNTRY" || code === "SHIPPING_UNAVAILABLE") {
      setStatus(copy.unsupported, "error");
    } else {
      setStatus(error.message || copy.reviewFailed, "error");
    }
    payBtn.disabled = true;
  }
}

function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(refreshQuote, 320);
}

async function initializePayment() {
  stripeConfig = await loadConfig();
  countries = stripeConfig.countries || [];
  renderCountries();
  updateAddressLabels();
  if (!stripeConfig.paymentsEnabled || !stripeConfig.publishableKey) {
    stripeStatus.textContent = stripeConfig.environment === "unconfigured" ? copy.unavailable : copy.devUnavailable;
    paymentRoot.innerHTML = `<div class="checkout-disabled">${escapeHtml(stripeStatus.textContent)}</div>`;
    payBtn.disabled = true;
  } else if (window.Stripe) {
    stripe = window.Stripe(stripeConfig.publishableKey);
    stripeStatus.textContent = copy.ready;
  } else {
    stripeStatus.textContent = copy.unavailable;
    payBtn.disabled = true;
  }
  await refreshQuote();
}

async function createSecurePayment(input) {
  const result = await postJson("/api/stripe/create-payment-intent", {
    quoteId: currentQuote.quoteId,
    items: requestedItems,
    customer: input.customer,
    shipping: input.shipping,
    language: lang,
    consent: {
      accepted: true,
      sourcingAccepted: true,
      legalAccepted: true,
      acceptedAt: new Date().toISOString(),
      communicationVersion: customerCopy.version,
      policyLinks: [
        "/legal/purchasing-service.html",
        "/legal/customs.html",
        "/legal/returns.html",
        "/legal/privacy.html",
      ],
    },
  });

  elements = stripe.elements({
    clientSecret: result.clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#141414",
        colorBackground: "#ffffff",
        colorText: "#141414",
        colorTextSecondary: "#707070",
        colorDanger: "#8b3329",
        borderRadius: "0px",
      },
    },
  });
  elements.create("payment").mount(paymentRoot);
  securePaymentReady = true;
  stripeStatus.textContent = copy.ready;
  payBtn.textContent = `${copy.payNow} ${money(result.totals.dueNowCents, currentQuote.currency)}`;
}

form.addEventListener("input", (event) => {
  if (event.target.matches("input, select")) {
    if (event.target.name === "country") updateAddressLabels();
    scheduleQuote();
  }
});

form.addEventListener("change", (event) => {
  if (event.target.name === "shippingMethod") scheduleQuote();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  payBtn.disabled = true;
  try {
    const input = validateInput();
    if (!stripeConfig?.paymentsEnabled || !stripe) throw new Error(stripeStatus.textContent || copy.unavailable);
    if (!securePaymentReady) {
      payBtn.textContent = copy.checkingPayment;
      await createSecurePayment(input);
      payBtn.disabled = false;
      paymentRoot.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    payBtn.textContent = copy.processing;
    const returnUrl = new URL("/checkout/success.html", window.location.href);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl.href,
        receipt_email: input.customer.email,
      },
      redirect: "if_required",
    });
    if (error) throw new Error(error.message);
    if (paymentIntent) {
      window.location.href = `/checkout/success.html?payment_intent=${encodeURIComponent(paymentIntent.id)}`;
    }
  } catch (error) {
    if (error.payload?.code === "PRICE_CHANGED" && error.payload.quote) renderQuote(error.payload.quote);
    showError(error.message || copy.paymentFailed);
    payBtn.disabled = false;
    payBtn.textContent = securePaymentReady && currentQuote ? `${copy.payNow} ${money(currentQuote.amountDueNow, currentQuote.currency)}` : copy.continuePayment;
  }
});

initializePayment().catch((error) => {
  showError(error.message || copy.reviewFailed);
  setStatus(copy.reviewFailed, "error");
  payBtn.disabled = true;
});
