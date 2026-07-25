import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { isOrderStatus } from "./order-statuses.js";
import { isDatabaseEnabled, query } from "./db/index.js";
import * as orderRepo from "./db/order-repo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRuntimeDir = path.join(__dirname, "runtime-data");

function runtimeDir() {
  return process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : defaultRuntimeDir;
}

function storePath() {
  return path.join(runtimeDir(), "orders.json");
}

function ensureStore() {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(storePath())) {
    fs.writeFileSync(
      storePath(),
      JSON.stringify({ orders: [], webhookEvents: [] }, null, 2),
      { mode: 0o600 }
    );
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(storePath(), "utf8"));
  } catch {
    throw new Error("Order store is unavailable");
  }
}

function writeStore(data) {
  ensureStore();
  const target = storePath();
  const temporaryPath = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temporaryPath, target);
}

function asText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

export async function createPendingOrder({ items, totals, customer, shipping, consent, language }) {
  if (isDatabaseEnabled()) {
    try {
      return await orderRepo.createPendingOrder({
        items,
        totals,
        customer,
        shipping,
        consent,
        language,
      });
    } catch (error) {
      throw error;
    }
  }

  const data = readStore();
  const now = new Date().toISOString();
  const order = {
    id: `OM-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    status: "request_received",
    statusHistory: [{ status: "request_received", at: now, note: "Server received the sourcing request and consent record." }],
    currency: "USD",
    items,
    totals,
    customer: {
      email: customer.email,
      name: customer.name,
      phone: customer.phone || "",
    },
    shipping,
    consent: {
      id: `consent_${randomUUID()}`,
      acceptedAt: now,
      policyVersions: consent.policyVersions,
      itemPolicies: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        policyVersion: item.policy.policyVersion,
        returnWindowDays: item.policy.returnWindowDays,
        returnEligible: item.policy.returnEligible,
        cancellationDeadline: item.policy.cancellationDeadline,
        finalSale: item.policy.finalSale,
      })),
      language,
      sessionAuditId: randomUUID(),
    },
    payment: {
      provider: "stripe",
      paymentIntentId: null,
      status: "not_created",
    },
    shipment: {
      carrier: "",
      trackingNumber: "",
      trackingUrl: "",
      estimatedDelivery: "",
      shippedAt: "",
      deliveredAt: "",
      updatedAt: null,
    },
  };
  data.orders.push(order);
  writeStore(data);
  return order;
}

export async function attachPaymentIntent(orderId, paymentIntentId) {
  if (isDatabaseEnabled()) {
    return orderRepo.attachPaymentIntent(orderId, paymentIntentId);
  }
  return updateOrder(orderId, (order) => {
    order.payment.paymentIntentId = paymentIntentId;
    order.payment.status = "requires_payment_method";
  });
}

export async function updateOrder(orderId, mutation) {
  if (isDatabaseEnabled()) {
    return orderRepo.updateOrderRecord(orderId, mutation);
  }
  const data = readStore();
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return null;
  mutation(order);
  order.updatedAt = new Date().toISOString();
  writeStore(data);
  return order;
}

export async function getOrder(orderId) {
  if (isDatabaseEnabled()) return orderRepo.getOrder(orderId);
  return readStore().orders.find((entry) => entry.id === orderId) || null;
}

export async function getOrderByPaymentIntent(paymentIntentId) {
  if (isDatabaseEnabled()) return orderRepo.getOrderByPaymentIntent(paymentIntentId);
  return readStore().orders.find((entry) => entry.payment?.paymentIntentId === paymentIntentId) || null;
}

export async function listAdminOrders() {
  if (isDatabaseEnabled()) {
    return (await orderRepo.listOrders()).map((order) => ({
      ...order,
      shipment: {
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
        estimatedDelivery: "",
        shippedAt: "",
        deliveredAt: "",
        updatedAt: null,
        ...(order.shipment || {}),
      },
    }));
  }
  return readStore()
    .orders.map((order) => ({
      ...order,
      shipment: {
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
        estimatedDelivery: "",
        shippedAt: "",
        deliveredAt: "",
        updatedAt: null,
        ...(order.shipment || {}),
      },
    }))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
}

export async function updateOrderOperations(orderId, input) {
  return updateOrder(orderId, (order) => {
    const nextStatus = asText(input.status, 80) || order.status;
    if (!isOrderStatus(nextStatus)) throw new Error("Unsupported order status.");

    const now = new Date().toISOString();
    const note = asText(input.note, 500);
    if (nextStatus !== order.status) {
      order.status = nextStatus;
      order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
      order.statusHistory.push({
        status: nextStatus,
        at: now,
        note: note || "Status updated by an authorized operations user.",
      });
    }

    const previous = order.shipment || {};
    const trackingUrl = asText(input.trackingUrl ?? previous.trackingUrl, 500);
    if (trackingUrl && !/^https:\/\//i.test(trackingUrl)) {
      throw new Error("Tracking URL must use HTTPS.");
    }
    order.shipment = {
      carrier: asText(input.carrier ?? previous.carrier, 120),
      trackingNumber: asText(input.trackingNumber ?? previous.trackingNumber, 160),
      trackingUrl,
      estimatedDelivery: asText(
        input.estimatedDelivery ?? previous.estimatedDelivery,
        40
      ),
      shippedAt: asText(input.shippedAt ?? previous.shippedAt, 40),
      deliveredAt: asText(input.deliveredAt ?? previous.deliveredAt, 40),
      updatedAt: now,
    };
  });
}

export async function processWebhookOnce(eventId, handlerOrMeta) {
  if (isDatabaseEnabled()) {
    // Prefer structured payment event application.
    if (handlerOrMeta && typeof handlerOrMeta === "object" && handlerOrMeta.eventType) {
      return orderRepo.processWebhookOnce(eventId, async () =>
        orderRepo.applyPaymentEvent(handlerOrMeta)
      );
    }
    return orderRepo.processWebhookOnce(eventId, async () => {
      if (typeof handlerOrMeta === "function") await handlerOrMeta({ orders: [] });
    });
  }

  const data = readStore();
  if (data.webhookEvents.includes(eventId)) return { duplicate: true };
  if (typeof handlerOrMeta === "function") handlerOrMeta(data);
  data.webhookEvents.push(eventId);
  if (data.webhookEvents.length > 5000) data.webhookEvents = data.webhookEvents.slice(-5000);
  writeStore(data);
  return { duplicate: false };
}

export function publicOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    currency: order.currency,
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      variantLabel: item.variantLabel,
      policy: item.policy,
    })),
    totals: order.totals,
    consentId: order.consent.id,
    paymentStatus: order.payment.status,
    shipment: order.shipment
      ? {
          carrier: order.shipment.carrier,
          trackingNumber: order.shipment.trackingNumber,
          trackingUrl: order.shipment.trackingUrl,
          estimatedDelivery: order.shipment.estimatedDelivery,
          shippedAt: order.shipment.shippedAt,
          deliveredAt: order.shipment.deliveredAt,
        }
      : null,
    nextUpdate: "Availability and supplier purchasing status will be provided after payment review.",
  };
}

export async function importJsonOrdersIfEmpty() {
  if (!isDatabaseEnabled()) return { imported: false };
  const { rows } = await query(`SELECT COUNT(*)::int AS count FROM orders`);
  if (rows[0].count > 0) return { imported: false, count: rows[0].count };
  ensureStore();
  if (!fs.existsSync(storePath())) return { imported: false, count: 0 };
  const data = JSON.parse(fs.readFileSync(storePath(), "utf8"));
  let count = 0;
  for (const order of data.orders || []) {
    await query(
      `INSERT INTO orders (
         id, status, currency, customer, shipping, consent, totals, payment, shipment,
         items, status_history, language, payment_intent_id, created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,
         $10::jsonb,$11::jsonb,$12,$13,$14::timestamptz,$15::timestamptz
       ) ON CONFLICT (id) DO NOTHING`,
      [
        order.id,
        order.status,
        order.currency || "USD",
        JSON.stringify(order.customer || {}),
        JSON.stringify(order.shipping || {}),
        JSON.stringify(order.consent || {}),
        JSON.stringify(order.totals || {}),
        JSON.stringify(order.payment || {}),
        JSON.stringify(order.shipment || {}),
        JSON.stringify(order.items || []),
        JSON.stringify(order.statusHistory || []),
        order.language || "zh",
        order.payment?.paymentIntentId || null,
        order.createdAt || new Date().toISOString(),
        order.updatedAt || new Date().toISOString(),
      ]
    );
    count += 1;
  }
  for (const eventId of data.webhookEvents || []) {
    await query(
      `INSERT INTO stripe_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [eventId]
    );
  }
  return { imported: true, count };
}
