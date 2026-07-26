import Stripe from "stripe";
import { PRODUCT_POLICY_VERSION } from "../../web/shared/js/catalog.js";
import { getProductForCheckout } from "../product-store.js";
import {
  attachPaymentIntent,
  createPendingOrder,
  getOrderByPaymentIntent,
  processWebhookOnce,
  publicOrder,
} from "../order-store.js";
import { isDatabaseEnabled } from "../db/index.js";

export const POLICY_VERSIONS = Object.freeze({
  terms: "terms-2026-07-23",
  purchasingService: "purchasing-service-2026-07-23",
  privacy: "privacy-2026-07-23",
  shipping: "shipping-2026-07-23",
  returns: "returns-2026-07-23",
  customs: "customs-2026-07-23",
  productPolicy: PRODUCT_POLICY_VERSION,
});

function looksLikeRealKey(value) {
  if (!value || /x{4,}|your[_-]?|replace|changeme|example|sk_test_xxx|pk_test_xxx/i.test(value)) {
    return false;
  }
  return value.length >= 20;
}

function asText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

export async function resolveTrustedItems(requestedItems) {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0 || requestedItems.length > 30) {
    throw new Error("Cart must contain between 1 and 30 items.");
  }

  const resolved = [];
  for (const requested of requestedItems) {
    const product = await getProductForCheckout(requested.productId);
    if (!product) throw new Error(`Unavailable product: ${asText(requested.productId, 60)}`);
    if (!product.isPurchasable) throw new Error(`Product is not available: ${product.id}`);

    const qty = Number(requested.qty);
    const maximum = Math.max(1, Math.min(1000, Number(product.maxQty || 20)));
    if (!Number.isInteger(qty) || qty < 1 || qty > maximum) {
      throw new Error(`Invalid quantity for ${product.id}`);
    }

    const variants = product.variants?.length
      ? product.variants
      : [{ id: "standard", label: "Standard", price: product.price }];
    const variant = variants.find((entry) => entry.id === requested.variantId);
    if (!variant) throw new Error(`Invalid option for ${product.id}`);
    const unitAmountCents = Math.round(Number(variant.price) * 100);
    if (!Number.isInteger(unitAmountCents) || unitAmountCents < 50) {
      throw new Error(`Invalid server price for ${product.id}`);
    }

    resolved.push({
      productId: product.id,
      variantId: variant.id,
      variantLabel: variant.label,
      nameEn: product.en?.name || product.zh?.name || product.id,
      nameZh: product.zh?.name || product.en?.name || product.id,
      image: product.image || "",
      name: product.en?.name || product.zh?.name || product.id,
      qty,
      unitAmountCents,
      lineAmountCents: unitAmountCents * qty,
      policy: {
        policyVersion: product.policyVersion,
        fulfillmentLabels: product.fulfillmentLabels,
        sourceCountry: product.sourceCountry,
        returnWindowDays: product.returnWindowDays,
        returnEligible: product.returnEligible,
        cancellationDeadline: product.cancellationDeadline,
        finalSale: product.finalSale,
        dutiesTreatment: product.dutiesTreatment,
        sourceType: product.sourceType,
        processingTime: product.processingTime,
        internationalShippingTime: product.internationalShippingTime,
      },
    });
  }
  return resolved;
}

export function calculateTotals(items) {
  const merchandiseCents = items.reduce((sum, item) => sum + item.lineAmountCents, 0);
  const shippingCents = merchandiseCents >= 4900 ? 0 : 699;
  const taxCents = 0;
  const serviceFeeCents = 0;
  return {
    merchandiseCents,
    serviceFeeCents,
    shippingCents,
    taxCents,
    dueNowCents: merchandiseCents + serviceFeeCents + shippingCents + taxCents,
    importCharges: "Not collected at checkout; charges may be assessed separately on delivery.",
    serviceFeeDisclosure: "Orbmare sourcing compensation is included in listed item prices.",
  };
}

function validateCheckoutInput(body) {
  const shipping = body.shipping || {};
  const customer = body.customer || {};
  if (shipping.country !== "US") throw new Error("Initial launch supports United States delivery addresses only.");
  for (const key of ["name", "line1", "city", "region", "postal"]) {
    if (!asText(shipping[key])) throw new Error(`Missing shipping field: ${key}`);
  }
  if (!asText(customer.email) || !asText(customer.email).includes("@")) {
    throw new Error("A valid customer email is required.");
  }
  if (body.consent?.accepted !== true) throw new Error("Required policy consent was not provided.");
  if (body.consent?.sourcingAccepted !== true) {
    throw new Error("Order-specific sourcing acknowledgement was not provided.");
  }

  return {
    customer: {
      email: asText(customer.email, 254),
      name: asText(shipping.name, 120),
      phone: asText(customer.phone, 40),
    },
    shipping: {
      name: asText(shipping.name, 120),
      line1: asText(shipping.line1, 160),
      line2: asText(shipping.line2, 160),
      city: asText(shipping.city, 100),
      region: asText(shipping.region, 40),
      postal: asText(shipping.postal, 20),
      country: "US",
    },
    language: body.language === "zh" ? "zh" : "en",
  };
}

export function createStripeRouter({
  express,
  secretKey,
  publishableKey,
  webhookSecret,
  nodeEnvironment = "development",
  checkoutEnabled = "false",
}) {
  const router = express.Router();
  const configured = looksLikeRealKey(secretKey) && looksLikeRealKey(publishableKey);
  const isLive = String(secretKey || "").startsWith("sk_live_");
  const isProduction = nodeEnvironment === "production";
  const publishableIsLive = String(publishableKey || "").startsWith("pk_live_");
  const webhookConfigured = looksLikeRealKey(webhookSecret);
  const operatorEnabled = String(checkoutEnabled || "").toLowerCase() === "true";
  const keyModeMatches = isLive === publishableIsLive && (isProduction ? isLive : !isLive);
  const paymentsEnabled =
    configured &&
    operatorEnabled &&
    webhookConfigured &&
    isDatabaseEnabled() &&
    keyModeMatches;
  const stripe = configured ? new Stripe(secretKey, { apiVersion: "2026-06-24.dahlia" }) : null;

  router.get("/config", (_req, res) => {
    res.json({
      configured,
      paymentsEnabled,
      publishableKey: paymentsEnabled ? publishableKey : null,
      environment: isLive ? "live" : configured ? "test" : "unconfigured",
      currency: "USD",
      demoMode: false,
      policyVersions: POLICY_VERSIONS,
      disabledReason: paymentsEnabled
        ? null
        : "Secure payment is not enabled for this environment. Order review remains available.",
    });
  });

  router.post("/preview", async (req, res) => {
    try {
      const trustedItems = await resolveTrustedItems(req.body?.items);
      return res.json({
        ok: true,
        items: trustedItems,
        totals: calculateTotals(trustedItems),
      });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: error.message || "Order review failed.",
      });
    }
  });

  router.post("/create-payment-intent", async (req, res) => {
    try {
      if (!paymentsEnabled || !stripe) {
        return res.status(503).json({
          ok: false,
          error: "Checkout is currently unavailable. No order or simulated payment was created.",
        });
      }

      const trustedItems = await resolveTrustedItems(req.body?.items);
      const input = validateCheckoutInput(req.body || {});
      const totals = calculateTotals(trustedItems);
      const order = await createPendingOrder({
        items: trustedItems,
        totals,
        customer: input.customer,
        shipping: input.shipping,
        language: input.language,
        consent: { policyVersions: POLICY_VERSIONS },
      });

      let intent;
      try {
        intent = await stripe.paymentIntents.create(
          {
            amount: totals.dueNowCents,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            receipt_email: input.customer.email,
            description: `Orbmare sourcing order ${order.id}`,
            metadata: {
              orderId: order.id,
              itemIds: trustedItems.map((item) => item.productId).join(",").slice(0, 450),
              quantities: trustedItems.map((item) => String(item.qty)).join(",").slice(0, 450),
              policyVersion: PRODUCT_POLICY_VERSION,
              consentRecordId: order.consent.id,
            },
            shipping: {
              name: input.shipping.name,
              phone: input.customer.phone || undefined,
              address: {
                line1: input.shipping.line1,
                line2: input.shipping.line2 || undefined,
                city: input.shipping.city,
                state: input.shipping.region,
                postal_code: input.shipping.postal,
                country: "US",
              },
            },
          },
          { idempotencyKey: `create-payment-${order.id}` }
        );
      } catch (error) {
        throw new Error(`Stripe could not initialize payment: ${error.message}`);
      }

      await attachPaymentIntent(order.id, intent.id);
      return res.json({
        ok: true,
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        orderId: order.id,
        consentRecordId: order.consent.id,
        totals,
      });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message || "Checkout validation failed." });
    }
  });

  router.get("/payment-status", async (req, res) => {
    try {
      if (!paymentsEnabled || !stripe) {
        return res.status(503).json({ ok: false, error: "Payment verification is unavailable." });
      }
      const paymentIntentId = asText(req.query.payment_intent, 120);
      if (!paymentIntentId || paymentIntentId.startsWith("demo_")) {
        return res.status(400).json({ ok: false, error: "Invalid payment reference." });
      }
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const order = await getOrderByPaymentIntent(intent.id);
      if (!order) return res.status(404).json({ ok: false, error: "Order record not found." });
      return res.json({
        ok: true,
        status: intent.status,
        paymentIntentId: intent.id,
        amountCents: intent.amount,
        currency: intent.currency,
        order: publicOrder(order),
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message || "Status lookup failed." });
    }
  });

  return { router, configured, paymentsEnabled, isLive, stripe, webhookSecret };
}

export function stripeWebhookHandler({ stripe, webhookSecret }) {
  return async (req, res) => {
    if (!stripe || !looksLikeRealKey(webhookSecret)) {
      return res.status(503).send("Webhook not configured");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], webhookSecret);
    } catch (error) {
      return res.status(400).send("Webhook signature verification failed");
    }

    const intent = event.data.object;
    const paymentIntentReference =
      event.type === "charge.refunded" ? intent.payment_intent : intent.id;

    const result = await processWebhookOnce(
      event.id,
      isDatabaseEnabled()
        ? { eventType: event.type, paymentIntentId: paymentIntentReference }
        : (data) => {
            const order = data.orders.find(
              (entry) => entry.payment?.paymentIntentId === paymentIntentReference
            );
            if (!order) return;
            if (event.type === "payment_intent.succeeded") {
              order.status = "payment_authorized_or_paid";
              order.payment.status = "succeeded";
              order.statusHistory.push({
                status: order.status,
                at: new Date().toISOString(),
                note: "Stripe confirmed payment; supplier availability is not yet confirmed.",
              });
            } else if (event.type === "payment_intent.payment_failed") {
              order.payment.status = "failed";
            } else if (event.type === "payment_intent.canceled") {
              order.status = "cancelled";
              order.payment.status = "cancelled";
            } else if (event.type === "charge.refunded") {
              order.status = "refunded";
              order.payment.status = "refunded";
            }
            order.updatedAt = new Date().toISOString();
          }
    );

    return res.json({ received: true, duplicate: result.duplicate });
  };
}
