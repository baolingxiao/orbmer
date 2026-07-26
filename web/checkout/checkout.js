import { getLang, LANG_KEY } from "/shared/js/editorial-i18n.js";
import * as Store from "/shared/js/store.js";

const API_BASE = window.location.port === "5180" ? "http://127.0.0.1:4242" : "";
const lang = getLang();
const form = document.querySelector("#checkoutForm");
const payBtn = document.querySelector("#payBtn");
const formError = document.querySelector("#formError");
const stripeStatus = document.querySelector("#stripeStatus");
const paymentRoot = document.querySelector("#payment-element");
const policyRoot = document.querySelector("#checkoutPolicies");

const staticCopy = {
  zh: {
    trustDelivery: "仅配送美国",
    trustStripe: "银行卡信息由 Stripe 安全处理",
    kicker: "按订单采购",
    slogan: "我们甄选世界最好的材料、工艺与设计。",
    title: "核对并支付",
    lede: "付款后傲马将开始确认供货；在收到明确的采购更新前，供应商库存仍未最终确认。",
    contact: "联系方式",
    email: "邮箱",
    phone: "电话",
    optional: "（选填）",
    delivery: "美国配送地址",
    name: "姓名",
    country: "国家",
    unitedStates: "美国",
    address1: "地址第一行",
    address2: "地址第二行",
    city: "城市",
    state: "州",
    zip: "邮编",
    termsTitle: "本订单条款",
    policyConsent:
      '我已阅读并同意<a href="/legal/terms.html" target="_blank">服务条款</a>、<a href="/legal/purchasing-service.html" target="_blank">采购服务协议</a>、<a href="/legal/privacy.html" target="_blank">隐私政策</a>，以及本订单所示的配送、取消、退货与最终销售条款。',
    sourcingConsent: "我理解傲马会为本订单采购这些作品；采购开始后，订单可能无法取消。",
    securePayment: "安全支付",
    checkingPayment: "正在检查支付可用性…",
    continuePayment: "继续安全支付",
    summary: "订单摘要",
    merchandise: "商品",
    serviceFee: "傲马服务费",
    serviceIncluded: "已包含在商品价格中",
    shipping: "配送",
    pendingVerification: "等待服务器确认",
    taxes: "当前收取税费",
    importCharges: "进口费用",
    importSeparate: "可能在交付时另行收取",
    total: "当前应付总额",
    serverVerification: "Stripe 载入前，服务器会重新核验商品与最终金额。本站不提供模拟支付。",
    returnsLink: "退货",
    customs: "关税",
    contactLink: "联系",
    backDiscover: "返回发现",
  },
  en: {
    trustDelivery: "US delivery only",
    trustStripe: "Card data handled by Stripe",
    kicker: "Order-specific sourcing",
    slogan: "We curate the world’s finest materials, craftsmanship, and design.",
    title: "Review and pay",
    lede:
      "Payment starts sourcing review. Supplier availability is not final until Orbmare sends a purchasing update.",
    contact: "Contact",
    email: "Email",
    phone: "Phone",
    optional: "(optional)",
    delivery: "United States delivery address",
    name: "Full name",
    country: "Country",
    unitedStates: "United States",
    address1: "Address line 1",
    address2: "Address line 2",
    city: "City",
    state: "State",
    zip: "ZIP code",
    termsTitle: "Order-specific terms",
    policyConsent:
      'I have reviewed and agree to the <a href="/legal/terms.html" target="_blank">Terms of Service</a>, <a href="/legal/purchasing-service.html" target="_blank">Purchasing Service Agreement</a>, <a href="/legal/privacy.html" target="_blank">Privacy Policy</a>, and the item-specific terms shown for this order.',
    sourcingConsent:
      "I understand Orbmare will source these pieces for my order and cancellation may end once purchasing begins.",
    securePayment: "Secure payment",
    checkingPayment: "Checking payment availability…",
    continuePayment: "Continue to secure payment",
    summary: "Order summary",
    merchandise: "Merchandise",
    serviceFee: "Orbmare service fee",
    serviceIncluded: "Included in item prices",
    shipping: "Shipping",
    pendingVerification: "Pending server verification",
    taxes: "Taxes collected now",
    importCharges: "Import charges",
    importSeparate: "May be charged separately",
    total: "Total due now",
    serverVerification:
      "The server verifies products and the final amount before Stripe loads. No simulated payment is available.",
    returnsLink: "Returns",
    customs: "Customs",
    contactLink: "Contact",
    backDiscover: "Back to Discover",
  },
}[lang];

const copy = {
  zh: {
    unavailable: "安全支付尚未在当前环境启用。你仍可核对订单信息。",
    loading: "正在载入安全支付…",
    ready: "安全支付已准备好。",
    payNow: "立即支付",
    processing: "正在处理…",
    required: "请完整填写联系人与美国配送地址。",
    consent: "请确认两项订单条款。",
    reviewFailed: "无法核对当前订单。",
    paymentFailed: "支付无法继续。",
    standard: "标准",
    qty: "数量",
    returnsYes: "支持退货",
    returnsNo: "不支持退货",
    returnsPending: "退货规则待确认",
    finalYes: "最终销售",
    finalNo: "非最终销售",
    finalPending: "最终销售状态待确认",
    source: "来源",
    processingLabel: "备货",
    transit: "国际运输",
    cancellation: "取消",
    returns: "退货",
    sale: "销售状态",
    duties: "进口费用",
    confirmAtCheckout: "结账时确认",
    importMessage: "结账时不收取；可能在交付时另行征收。",
  },
  en: {
    unavailable: "Secure payment is not enabled for this environment. You can still review the order.",
    loading: "Loading secure payment…",
    ready: "Secure payment is ready.",
    payNow: "Pay now",
    processing: "Processing…",
    required: "Complete all required contact and United States delivery fields.",
    consent: "Both order acknowledgements are required.",
    reviewFailed: "Unable to review this order.",
    paymentFailed: "Payment could not continue.",
    standard: "Standard",
    qty: "Qty",
    returnsYes: "Return eligible",
    returnsNo: "Not return eligible",
    returnsPending: "Return eligibility pending",
    finalYes: "Final sale",
    finalNo: "Not final sale",
    finalPending: "Final-sale status pending",
    source: "Source",
    processingLabel: "Processing",
    transit: "International transit",
    cancellation: "Cancellation",
    returns: "Returns",
    sale: "Sale status",
    duties: "Import charges",
    confirmAtCheckout: "Confirm at checkout",
    importMessage: "Not collected at checkout; charges may be assessed separately on delivery.",
  },
}[lang];

document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
document.title = lang === "zh" ? "结账 | 傲马 Orbmare" : "Checkout | Orbmare 傲马";
document.querySelectorAll("[data-ck]").forEach((node) => {
  const value = staticCopy[node.dataset.ck];
  if (value) node.textContent = value;
});
document.querySelectorAll("[data-ck-html]").forEach((node) => {
  const value = staticCopy[node.dataset.ckHtml];
  if (value) node.innerHTML = value;
});
document.querySelector(".checkout-summary")?.setAttribute(
  "aria-label",
  lang === "zh" ? "订单摘要" : "Order summary"
);
document.querySelector("[data-checkout-brand-primary]").textContent =
  lang === "zh" ? "傲马" : "Orbmare";
document.querySelector("[data-checkout-brand-secondary]").textContent =
  lang === "zh" ? "Orbmare" : "傲马";
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

let items = [];
let stripe;
let elements;
let securePaymentReady = false;

const money = (cents) =>
  new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(cents || 0) / 100);

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

function readInput() {
  const data = new FormData(form);
  return {
    customer: {
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
    },
    shipping: {
      name: String(data.get("name") || "").trim(),
      country: "US",
      line1: String(data.get("line1") || "").trim(),
      line2: String(data.get("line2") || "").trim(),
      city: String(data.get("city") || "").trim(),
      region: String(data.get("region") || "").trim(),
      postal: String(data.get("postal") || "").trim(),
    },
  };
}

function validateInput() {
  const input = readInput();
  if (
    !input.customer.email ||
    !input.customer.email.includes("@") ||
    !input.shipping.name ||
    !input.shipping.line1 ||
    !input.shipping.city ||
    !input.shipping.region ||
    !input.shipping.postal
  ) {
    throw new Error(copy.required);
  }
  if (
    !document.querySelector("#policyConsent").checked ||
    !document.querySelector("#sourcingConsent").checked
  ) {
    throw new Error(copy.consent);
  }
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
    throw new Error(result.error || copy.reviewFailed);
  }
  return result;
}

async function loadConfig() {
  const response = await fetch(`${API_BASE}/api/stripe/config`);
  if (!response.ok) throw new Error(copy.unavailable);
  return response.json();
}

async function initializePayment() {
  const config = await loadConfig();
  if (!config.paymentsEnabled || !config.publishableKey) {
    stripeStatus.textContent = copy.unavailable;
    paymentRoot.innerHTML = `<div class="checkout-disabled">${escapeHtml(copy.unavailable)}</div>`;
    payBtn.disabled = true;
    return;
  }
  if (!window.Stripe) throw new Error(copy.unavailable);
  stripe = window.Stripe(config.publishableKey);
  stripeStatus.textContent = copy.ready;
  payBtn.disabled = false;
}

async function createSecurePayment(input) {
  const result = await postJson("/api/stripe/create-payment-intent", {
    items: requestedItems,
    customer: input.customer,
    shipping: input.shipping,
    language: lang,
    consent: { accepted: true, sourcingAccepted: true },
  });

  elements = stripe.elements({
    clientSecret: result.clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#141414",
        colorBackground: "#ffffff",
        colorText: "#141414",
        colorTextSecondary: "#6e6e6e",
        colorDanger: "#8b3329",
        borderRadius: "0px",
      },
    },
  });
  elements.create("payment").mount(paymentRoot);
  securePaymentReady = true;
  renderTotals(result.totals);
  stripeStatus.textContent = copy.ready;
  payBtn.textContent = `${copy.payNow} ${money(result.totals.dueNowCents)}`;
}

function renderTotals(totals) {
  document.querySelector("#summarySubtotal").textContent = money(totals.merchandiseCents);
  document.querySelector("#summaryShipping").textContent = money(totals.shippingCents);
  document.querySelector("#summaryTax").textContent = money(totals.taxCents);
  document.querySelector("#summaryTotal").textContent = money(totals.dueNowCents);
  document.querySelector("#summaryDuties").textContent =
    lang === "zh" ? copy.importMessage : totals.importCharges;
}

function policyValue(value, fallback = "—") {
  const text = String(value || "").trim();
  if (!text) return escapeHtml(fallback);
  if (lang !== "zh" || /[\u3400-\u9fff]/u.test(text)) return escapeHtml(text);
  const known = {
    China: "中国",
    Japan: "日本",
    Italy: "意大利",
    "Third-party supplier": "第三方供应商",
    "Concierge confirmation within 2–5 business days": "2–5 个工作日内确认供货",
    "Arranged after availability confirmation": "供货确认后安排",
    "Before supplier purchasing begins": "供应商采购开始前",
    "Estimated import charges, if any, may be collected separately at delivery":
      "如产生进口费用，可能在交付时另行收取",
  };
  return escapeHtml(known[text] || copy.confirmAtCheckout);
}

function renderPreview(result) {
  items = result.items;
  document.querySelector("#summaryItems").innerHTML = items
    .map((item) => {
      const name = lang === "zh" ? item.nameZh : item.nameEn;
      return `<div class="summary-row">
        <img src="${escapeHtml(item.image)}" alt="">
        <div>
          <strong>${escapeHtml(name)}</strong>
          <span>${escapeHtml(item.variantLabel === "Standard" ? copy.standard : item.variantLabel || copy.standard)} · ${copy.qty} ${item.qty}</span>
        </div>
        <em>${money(item.lineAmountCents)}</em>
      </div>`;
    })
    .join("");

  policyRoot.innerHTML = items
    .map((item) => {
      const policy = item.policy || {};
      const name = lang === "zh" ? item.nameZh : item.nameEn;
      const returnText =
        policy.returnEligible === true
          ? copy.returnsYes
          : policy.returnEligible === false
            ? copy.returnsNo
            : copy.returnsPending;
      const finalSaleText =
        policy.finalSale === true
          ? copy.finalYes
          : policy.finalSale === false
            ? copy.finalNo
            : copy.finalPending;
      return `<article>
        <strong>${escapeHtml(name)}</strong>
        <dl>
          <div><dt>${copy.source}</dt><dd>${policyValue(policy.sourceCountry, "—")} · ${policyValue(policy.sourceType, "—")}</dd></div>
          <div><dt>${copy.processingLabel}</dt><dd>${policyValue(policy.processingTime, "—")}</dd></div>
          <div><dt>${copy.transit}</dt><dd>${policyValue(policy.internationalShippingTime, "—")}</dd></div>
          <div><dt>${copy.cancellation}</dt><dd>${policyValue(policy.cancellationDeadline, "—")}</dd></div>
          <div><dt>${copy.returns}</dt><dd>${escapeHtml(returnText)}</dd></div>
          <div><dt>${copy.sale}</dt><dd>${escapeHtml(finalSaleText)}</dd></div>
          <div><dt>${copy.duties}</dt><dd>${policyValue(policy.dutiesTreatment, "—")}</dd></div>
        </dl>
      </article>`;
    })
    .join("");

  renderTotals(result.totals);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  payBtn.disabled = true;
  try {
    const input = validateInput();
    if (!securePaymentReady) {
      payBtn.textContent = copy.loading;
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
    showError(error.message || copy.paymentFailed);
    payBtn.disabled = false;
    payBtn.textContent = securePaymentReady ? copy.payNow : copy.loading;
  }
});

async function bootCheckout() {
  try {
    const preview = await postJson("/api/stripe/preview", { items: requestedItems });
    renderPreview(preview);
    await initializePayment();
  } catch (error) {
    showError(error.message || copy.reviewFailed);
    stripeStatus.textContent = copy.reviewFailed;
    payBtn.disabled = true;
  }
}

bootCheckout();
