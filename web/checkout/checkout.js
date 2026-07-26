import { loadCatalog } from "/shared/js/load-catalog.js";
import * as Store from "/shared/js/store.js";

const API_BASE = window.location.port === "5180" ? "http://127.0.0.1:4242" : "";
const form = document.querySelector("#checkoutForm");
const payBtn = document.querySelector("#payBtn");
const formError = document.querySelector("#formError");
const stripeStatus = document.querySelector("#stripeStatus");
const paymentRoot = document.querySelector("#payment-element");
const policyRoot = document.querySelector("#checkoutPolicies");

let draft = Store.loadCheckoutDraft();
if (!draft?.items?.length) draft = { items: Store.getCartLines(), createdAt: Date.now() };
if (!draft.items.length) window.location.replace("/shop/");

let items = [];
let stripe;
let elements;
let paymentIntentId;
let securePaymentReady = false;

const money = (cents) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

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
    throw new Error("Complete all required contact and United States delivery fields.");
  }
  if (
    !document.querySelector("#policyConsent").checked ||
    !document.querySelector("#sourcingConsent").checked
  ) {
    throw new Error("Both policy acknowledgements are required and are not preselected.");
  }
  return input;
}

async function loadConfig() {
  const response = await fetch(`${API_BASE}/api/stripe/config`);
  if (!response.ok) throw new Error("Checkout service is unavailable.");
  return response.json();
}

async function initialize() {
  const config = await loadConfig();
  if (!config.paymentsEnabled || !config.publishableKey) {
    throw new Error(config.disabledReason || "Checkout is disabled.");
  }
  if (!window.Stripe) throw new Error("Stripe.js could not load. Payment remains disabled.");
  stripe = window.Stripe(config.publishableKey);
  stripeStatus.textContent = `Stripe ${config.environment} environment available. Complete the form and consents to load secure payment.`;
  payBtn.disabled = false;
}

async function createSecurePayment(input) {
  const response = await fetch(`${API_BASE}/api/stripe/create-payment-intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map(({ product, variant, qty }) => ({
        productId: product.id,
        variantId: variant.id,
        qty,
      })),
      customer: input.customer,
      shipping: input.shipping,
      language: document.documentElement.lang.startsWith("zh") ? "zh" : "en",
      consent: { accepted: true, sourcingAccepted: true },
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.error || "Unable to initialize secure payment.");
  }

  paymentIntentId = result.paymentIntentId;
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
  const totals = result.totals;
  document.querySelector("#summarySubtotal").textContent = money(totals.merchandiseCents);
  document.querySelector("#summaryShipping").textContent = money(totals.shippingCents);
  document.querySelector("#summaryTax").textContent = money(totals.taxCents);
  document.querySelector("#summaryTotal").textContent = money(totals.dueNowCents);
  document.querySelector("#summaryDuties").textContent = totals.importCharges;
  stripeStatus.textContent = `Secure payment ready. Order request ${result.orderId} and consent record ${result.consentRecordId} were created on the server.`;
  payBtn.textContent = `Pay ${money(totals.dueNowCents)}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  payBtn.disabled = true;
  try {
    const input = validateInput();
    if (!securePaymentReady) {
      payBtn.textContent = "Loading secure payment...";
      await createSecurePayment(input);
      payBtn.disabled = false;
      paymentRoot.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    payBtn.textContent = "Processing...";
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
    showError(error.message || "Payment could not continue.");
    payBtn.disabled = false;
    payBtn.textContent = securePaymentReady ? "Pay now" : "Continue to secure payment";
  }
});

async function bootCheckout() {
  let products = [];
  try {
    products = await loadCatalog();
  } catch (error) {
    showError(error.message || "Catalog could not load.");
    payBtn.disabled = true;
    return;
  }

  items = draft.items
    .map((line) => {
      const product = products.find((entry) => entry.id === line.productId);
      if (!product) return null;
      const variants = product.variants?.length
        ? product.variants
        : [{ id: "standard", label: "Standard", price: product.price }];
      const variant =
        variants.find(
          (entry) => entry.id === line.variantId || entry.label === line.variantLabel
        ) || variants[0];
      return {
        product,
        variant,
        qty: Math.max(1, Math.min(20, Number(line.qty) || 1)),
      };
    })
    .filter(Boolean);

  if (!items.length) {
    window.location.replace("/shop/");
    return;
  }

  const estimatedMerchandise = items.reduce(
    (sum, item) => sum + Math.round(item.variant.price * 100) * item.qty,
    0
  );

  document.querySelector("#summaryItems").innerHTML = items
    .map(
      ({ product, variant, qty }) => `
  <div class="summary-row">
    <img src="${product.image}" alt="">
    <div><strong>${product.en?.name || product.zh?.name || product.id}</strong><span>${variant.label} | Qty ${qty}</span><small>${(product.fulfillmentLabels || []).join(" | ")}</small></div>
    <em>${money(Math.round(variant.price * 100) * qty)}</em>
  </div>`
    )
    .join("");

  document.querySelector("#summarySubtotal").textContent = money(estimatedMerchandise);
  document.querySelector("#summaryTotal").textContent = money(estimatedMerchandise);

  policyRoot.innerHTML = items
    .map(({ product }) => {
      const returnText =
        product.returnEligible === true
          ? `Return eligible: ${product.returnWindowDays ?? "item-specific"} days`
          : product.returnEligible === false
            ? "Not return eligible"
            : "Return eligibility: Details pending verification";
      const finalSaleText =
        product.finalSale === true
          ? "Final sale"
          : product.finalSale === false
            ? "Not final sale"
            : "Final-sale status: Details pending verification";
      return `<article><strong>${product.en?.name || product.id}</strong><dl><div><dt>Source</dt><dd>${product.sourceCountry} | ${product.sourceType}</dd></div><div><dt>Processing</dt><dd>${product.processingTime}</dd></div><div><dt>International transit</dt><dd>${product.internationalShippingTime}</dd></div><div><dt>Cancellation</dt><dd>${product.cancellationDeadline}</dd></div><div><dt>Returns</dt><dd>${returnText}</dd></div><div><dt>Sale status</dt><dd>${finalSaleText}</dd></div><div><dt>Import charges</dt><dd>${product.dutiesTreatment}</dd></div></dl></article>`;
    })
    .join("");

  initialize().catch((error) => {
    stripeStatus.textContent = error.message;
    paymentRoot.innerHTML = `<div class="checkout-disabled">Payment is disabled. No order or simulated payment can be completed.</div>`;
    payBtn.disabled = true;
  });
}

bootCheckout();
