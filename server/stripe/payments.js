import Stripe from "stripe";
import { PRODUCT_POLICY_VERSION } from "../../web/shared/js/catalog.js";
import { POLICY_VERSIONS, resolveTrustedItems } from "../checkout-products.js";
import {
  buildConsentSnapshot,
  createCheckoutQuote,
  getStoredQuote,
  listCheckoutCountries,
} from "../checkout-service.js";
import {
  attachPaymentIntent,
  createPendingOrder,
  getOrderByPaymentIntent,
  processWebhookOnce,
  publicOrder,
} from "../order-store.js";
import { isDatabaseEnabled } from "../db/index.js";

function looksLikeRealKey(value) {
  if (!value || /x{4,}|your[_-]?|replace|changeme|example|sk_test_xxx|pk_test_xxx/i.test(value)) {
    return false;
  }
  return value.length >= 20;
}

function asText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
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
  const country = asText(shipping.country, 2).toUpperCase();
  if (!country) throw new Error("Missing shipping country.");
  for (const key of ["fullName", "addressLine1", "city", "postalCode"]) {
    if (!asText(shipping[key] ?? shipping[key.replace("addressLine", "line")])) {
      throw new Error(`Missing shipping field: ${key}`);
    }
  }
  if (!asText(customer.email) || !asText(customer.email).includes("@")) {
    throw new Error("A valid customer email is required.");
  }
  if (body.consent?.accepted !== true) throw new Error("Required order acknowledgement was not provided.");
  if (body.consent?.sourcingAccepted !== true) {
    throw new Error("Required sourcing and shipping acknowledgement was not provided.");
  }

  return {
    customer: {
      email: asText(customer.email, 254),
      name: asText(shipping.fullName ?? shipping.name, 120),
      phone: asText(customer.phone ?? shipping.phone, 40),
    },
    shipping: {
      name: asText(shipping.fullName ?? shipping.name, 120),
      fullName: asText(shipping.fullName ?? shipping.name, 120),
      company: asText(shipping.company, 120),
      line1: asText(shipping.addressLine1 ?? shipping.line1, 160),
      line2: asText(shipping.addressLine2 ?? shipping.line2, 160),
      addressLine1: asText(shipping.addressLine1 ?? shipping.line1, 160),
      addressLine2: asText(shipping.addressLine2 ?? shipping.line2, 160),
      city: asText(shipping.city, 100),
      region: asText(shipping.stateProvinceRegion ?? shipping.region, 100),
      stateProvinceRegion: asText(shipping.stateProvinceRegion ?? shipping.region, 100),
      postal: asText(shipping.postalCode ?? shipping.postal, 32),
      postalCode: asText(shipping.postalCode ?? shipping.postal, 32),
      phone: asText(shipping.phone ?? customer.phone, 40),
      country,
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
      countries: listCheckoutCountries(),
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
      const quote = await createCheckoutQuote({
        items: req.body?.items,
        destinationAddress: req.body?.destinationAddress || { country: "US" },
        locale: req.body?.locale || req.body?.language,
        stripeTaxConfigured: false,
      });
      return res.json({
        ok: true,
        items: trustedItems,
        totals: calculateTotals(trustedItems),
        quote: quote.ok ? quote : null,
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

      const input = validateCheckoutInput(req.body || {});
      const quote = getStoredQuote(req.body?.quoteId);
      if (!quote) throw new Error("Quote expired. Review the order again before paying.");
      const requote = await createCheckoutQuote({
        items: req.body?.items,
        destinationAddress: input.shipping,
        selectedShippingMethod: quote.selectedShippingMethod,
        locale: input.language,
        currency: quote.currency,
        stripeTaxConfigured: Boolean(stripe),
      });
      if (!requote.ok) throw new Error(requote.error || "Quote could not be refreshed.");
      if (requote.amountDueNow !== quote.amountDueNow) {
        return res.status(409).json({
          ok: false,
          code: "PRICE_CHANGED",
          error: "The order total changed. Review the updated quote before paying.",
          quote: requote,
        });
      }
      const trustedItems = requote.lineItems;
      const totals = {
        merchandiseCents: requote.subtotal,
        serviceFeeCents: requote.serviceFee,
        shippingCents: requote.shipping,
        taxCents: requote.tax,
        dutyCents: requote.duty,
        importTaxCents: requote.importTax,
        customsFeeCents: requote.customsFee,
        dueNowCents: requote.amountDueNow,
        amountPotentiallyDueOnDelivery: requote.amountPotentiallyDueOnDelivery,
        quoteId: requote.quoteId,
        quoteExpiresAt: requote.quoteExpiresAt,
        importCharges: requote.landedCost.disclaimer,
        serviceFeeDisclosure: "Orbmare sourcing compensation is included in listed item prices.",
      };
      const consentSnapshot = buildConsentSnapshot({
        quote: requote,
        locale: input.language,
        accepted: req.body?.consent?.accepted,
        sourcingAccepted: req.body?.consent?.sourcingAccepted,
      });
      const order = await createPendingOrder({
        items: trustedItems,
        totals,
        customer: input.customer,
        shipping: input.shipping,
        language: input.language,
        consent: consentSnapshot,
      });

      let intent;
      try {
        intent = await stripe.paymentIntents.create(
          {
            amount: totals.dueNowCents,
            currency: String(requote.currency || "USD").toLowerCase(),
            automatic_payment_methods: { enabled: true },
            receipt_email: input.customer.email,
            description: `Orbmare sourcing order ${order.id}`,
            metadata: {
              orderId: order.id,
              quoteId: requote.quoteId,
              itemIds: trustedItems.map((item) => item.productId).join(",").slice(0, 450),
              quantities: trustedItems.map((item) => String(item.qty)).join(",").slice(0, 450),
              policyVersion: PRODUCT_POLICY_VERSION,
              orderTermsVersion: consentSnapshot.policyVersion,
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
                country: input.shipping.country,
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
              order.status = "PAID";
              order.payment.status = "succeeded";
              order.statusHistory.push({
                status: order.status,
                at: new Date().toISOString(),
                note: "Stripe confirmed payment; order is ready for procurement review.",
              });
            } else if (event.type === "payment_intent.payment_failed") {
              order.payment.status = "failed";
            } else if (event.type === "payment_intent.canceled") {
              order.status = "CANCELLED";
              order.payment.status = "cancelled";
            } else if (event.type === "charge.refunded") {
              order.status = "REFUNDED";
              order.payment.status = "refunded";
            }
            order.updatedAt = new Date().toISOString();
          }
    );

    return res.json({ received: true, duplicate: result.duplicate });
  };
}
