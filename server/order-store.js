import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { defaultFulfillmentCopy, isOrderStatus } from "./order-statuses.js";
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

function normalizeShipment(shipment = {}, order = null) {
  return {
    shipmentId: shipment.shipmentId || shipment.id || `SHP-${randomUUID().slice(0, 10).toUpperCase()}`,
    items: Array.isArray(shipment.items) ? shipment.items : order?.items || [],
    sourceCountry: asText(shipment.sourceCountry || order?.items?.[0]?.policy?.originCountry || "", 80),
    carrier: asText(shipment.carrier, 120),
    trackingNumber: asText(shipment.trackingNumber, 160),
    trackingUrl: asText(shipment.trackingUrl, 500),
    currentStatus: asText(shipment.currentStatus || order?.fulfillmentStatus || order?.status || "ORDER_CONFIRMED", 80),
    estimatedDelivery: asText(shipment.estimatedDelivery, 40),
    events: Array.isArray(shipment.events) ? shipment.events : [],
    createdAt: shipment.createdAt || new Date().toISOString(),
    updatedAt: shipment.updatedAt || new Date().toISOString(),
  };
}

function ensureOrderFulfillment(order) {
  if (!order) return order;
  order.fulfillmentStatus = order.fulfillmentStatus || order.status || "ORDER_CONFIRMED";
  order.estimatedDeliveryStart = order.estimatedDeliveryStart || "";
  order.estimatedDeliveryEnd = order.estimatedDeliveryEnd || order.shipment?.estimatedDelivery || "";
  order.carrier = order.carrier || order.shipment?.carrier || "";
  order.trackingNumber = order.trackingNumber || order.shipment?.trackingNumber || "";
  order.trackingUrl = order.trackingUrl || order.shipment?.trackingUrl || "";
  order.events = Array.isArray(order.events) ? order.events : [];
  order.shipments = Array.isArray(order.shipments) && order.shipments.length
    ? order.shipments.map((shipment) => normalizeShipment(shipment, order))
    : [normalizeShipment(order.shipment || {}, order)];
  return order;
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
    status: "PAYMENT_PENDING",
    fulfillmentStatus: "ORDER_CONFIRMED",
    statusHistory: [{ status: "PAYMENT_PENDING", at: now, note: "Server created an order from a server-side checkout quote." }],
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
      policyVersion: consent.policyVersion,
      policyLocale: consent.policyLocale || language,
      sourceAcceptedAt: consent.acceptedAt || now,
      communicationVersion: consent.communicationVersion || null,
      policyLinks: consent.policyLinks || [],
      ip: consent.ip || "",
      userAgent: consent.userAgent || "",
      policySnapshot: consent.policySnapshot || null,
      orderTermsSnapshot: consent.orderTermsSnapshot || null,
      dutiesAcknowledged: Boolean(consent.dutiesAcknowledged),
      finalSaleAcknowledged: Boolean(consent.finalSaleAcknowledged),
      sourcingAcknowledged: Boolean(consent.sourcingAcknowledged),
      legalAcknowledged: Boolean(consent.legalAcknowledged),
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
  ensureOrderFulfillment(order);
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
  ensureOrderFulfillment(order);
  mutation(order);
  ensureOrderFulfillment(order);
  order.updatedAt = new Date().toISOString();
  writeStore(data);
  return order;
}

export async function getOrder(orderId) {
  if (isDatabaseEnabled()) return orderRepo.getOrder(orderId);
  return ensureOrderFulfillment(readStore().orders.find((entry) => entry.id === orderId) || null);
}

export async function getOrderByPaymentIntent(paymentIntentId) {
  if (isDatabaseEnabled()) return orderRepo.getOrderByPaymentIntent(paymentIntentId);
  return ensureOrderFulfillment(readStore().orders.find((entry) => entry.payment?.paymentIntentId === paymentIntentId) || null);
}

export async function listAdminOrders() {
  if (isDatabaseEnabled()) {
    return (await orderRepo.listOrders()).map((order) => ({
      ...ensureOrderFulfillment(order),
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
      ...ensureOrderFulfillment(order),
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

export async function getOrderWithFulfillment(orderId) {
  const order = await getOrder(orderId);
  if (!order) return null;
  if (isDatabaseEnabled()) {
    return {
      ...ensureOrderFulfillment(order),
      events: await orderRepo.listOrderEvents(orderId),
      shipments: await orderRepo.listOrderShipments(orderId),
    };
  }
  return ensureOrderFulfillment(order);
}

export async function getBuyerOrderJourney(orderId, { userId = "", email = "" } = {}) {
  let order = null;
  if (isDatabaseEnabled()) {
    order = await orderRepo.getBuyerOrder(orderId, userId, email);
  } else {
    order = await getOrder(orderId);
    if (order && String(order.customer?.email || "").toLowerCase() !== String(email || "").toLowerCase()) {
      order = null;
    }
  }
  if (!order) return null;
  const full = await getOrderWithFulfillment(order.id);
  return {
    order: publicOrder(full),
    events: (full.events || []).map(({ status, publicTitle, publicDescription, location, createdAt }) => ({
      status,
      publicTitle,
      publicDescription,
      location,
      createdAt,
    })),
    shipments: (full.shipments || []).map((shipment) => ({
      shipmentId: shipment.shipmentId,
      items: shipment.items,
      sourceCountry: shipment.sourceCountry,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      currentStatus: shipment.currentStatus,
      estimatedDelivery: shipment.estimatedDelivery,
      events: (shipment.events || []).map(({ status, publicTitle, publicDescription, location, createdAt }) => ({
        status,
        publicTitle,
        publicDescription,
        location,
        createdAt,
      })),
    })),
  };
}

export async function appendOrderEvent(orderId, input, { operatorId = "" } = {}) {
  const status = asText(input.status, 80);
  if (!isOrderStatus(status)) throw new Error("Unsupported order status.");
  const fallback = defaultFulfillmentCopy(status);
  if (!fallback) throw new Error("Unsupported fulfillment status.");
  const event = {
    id: randomUUID(),
    orderId,
    shipmentId: asText(input.shipmentId, 120),
    status,
    publicTitle: asText(input.publicTitle || fallback.publicTitle, 180),
    publicDescription: asText(input.publicDescription || fallback.publicDescription, 1000),
    internalNote: asText(input.internalNote, 1000),
    location: asText(input.location, 160),
    operatorId: asText(operatorId, 254),
    createdAt: new Date().toISOString(),
  };
  if (isDatabaseEnabled()) {
    const order = await updateOrder(orderId, (current) => {
      current.status = status;
      current.fulfillmentStatus = status;
      current.estimatedDeliveryStart = asText(input.estimatedDeliveryStart ?? current.estimatedDeliveryStart, 40);
      current.estimatedDeliveryEnd = asText(input.estimatedDeliveryEnd ?? input.estimatedDelivery ?? current.estimatedDeliveryEnd, 40);
      current.carrier = asText(input.carrier ?? current.carrier, 120);
      current.trackingNumber = asText(input.trackingNumber ?? current.trackingNumber, 160);
      current.trackingUrl = asText(input.trackingUrl ?? current.trackingUrl, 500);
      current.statusHistory = Array.isArray(current.statusHistory) ? current.statusHistory : [];
      current.statusHistory.push({ status, at: event.createdAt, note: event.publicDescription });
    });
    if (!order) return null;
    const shipments = await orderRepo.listOrderShipments(orderId);
    const shipment = shipments.find((entry) => entry.shipmentId === event.shipmentId || entry.id === event.shipmentId);
    const saved = await orderRepo.appendOrderEvent(orderId, { ...event, shipmentUuid: shipment?.id || "" });
    if (shipment) {
      await orderRepo.updateShipment(shipment.shipmentId, {
        currentStatus: status,
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingUrl,
        estimatedDelivery: input.estimatedDelivery,
        events: [...(shipment.events || []), saved],
      });
    }
    return saved;
  }
  const data = readStore();
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return null;
  ensureOrderFulfillment(order);
  order.status = status;
  order.fulfillmentStatus = status;
  order.estimatedDeliveryStart = asText(input.estimatedDeliveryStart ?? order.estimatedDeliveryStart, 40);
  order.estimatedDeliveryEnd = asText(input.estimatedDeliveryEnd ?? input.estimatedDelivery ?? order.estimatedDeliveryEnd, 40);
  order.carrier = asText(input.carrier ?? order.carrier, 120);
  order.trackingNumber = asText(input.trackingNumber ?? order.trackingNumber, 160);
  order.trackingUrl = asText(input.trackingUrl ?? order.trackingUrl, 500);
  order.events.unshift(event);
  order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  order.statusHistory.push({ status, at: event.createdAt, note: event.publicDescription });
  const shipment = order.shipments.find((entry) => entry.shipmentId === event.shipmentId);
  if (shipment) {
    shipment.currentStatus = status;
    shipment.carrier = asText(input.carrier ?? shipment.carrier, 120);
    shipment.trackingNumber = asText(input.trackingNumber ?? shipment.trackingNumber, 160);
    shipment.trackingUrl = asText(input.trackingUrl ?? shipment.trackingUrl, 500);
    shipment.estimatedDelivery = asText(input.estimatedDelivery ?? shipment.estimatedDelivery, 40);
    shipment.events.unshift(event);
    shipment.updatedAt = event.createdAt;
  }
  order.updatedAt = event.createdAt;
  writeStore(data);
  return event;
}

export async function listOrderEvents(orderId) {
  if (isDatabaseEnabled()) return orderRepo.listOrderEvents(orderId);
  const order = await getOrder(orderId);
  return [...(order?.events || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export async function listOrderShipments(orderId) {
  if (isDatabaseEnabled()) return orderRepo.listOrderShipments(orderId);
  const order = await getOrder(orderId);
  return order?.shipments || [];
}

export async function createOrderShipment(orderId, input) {
  if (isDatabaseEnabled()) return orderRepo.createShipment(orderId, input);
  const data = readStore();
  const order = data.orders.find((entry) => entry.id === orderId);
  if (!order) return null;
  ensureOrderFulfillment(order);
  const shipment = normalizeShipment(input, order);
  order.shipments.push(shipment);
  order.updatedAt = shipment.updatedAt;
  writeStore(data);
  return shipment;
}

export async function updateOrderShipment(shipmentId, input) {
  if (isDatabaseEnabled()) return orderRepo.updateShipment(shipmentId, input);
  const data = readStore();
  for (const order of data.orders) {
    ensureOrderFulfillment(order);
    const shipment = order.shipments.find((entry) => entry.shipmentId === shipmentId || entry.id === shipmentId);
    if (!shipment) continue;
    Object.assign(shipment, {
      items: input.items ?? shipment.items,
      sourceCountry: asText(input.sourceCountry ?? shipment.sourceCountry, 80),
      carrier: asText(input.carrier ?? shipment.carrier, 120),
      trackingNumber: asText(input.trackingNumber ?? shipment.trackingNumber, 160),
      trackingUrl: asText(input.trackingUrl ?? shipment.trackingUrl, 500),
      currentStatus: asText(input.currentStatus ?? shipment.currentStatus, 80),
      estimatedDelivery: asText(input.estimatedDelivery ?? shipment.estimatedDelivery, 40),
      updatedAt: new Date().toISOString(),
    });
    writeStore(data);
    return shipment;
  }
  return null;
}

export async function recordOrderEmailEvent({ orderId, status, templateId, messageId = "" }) {
  if (isDatabaseEnabled()) return orderRepo.recordEmailEvent({ orderId, status, templateId, messageId });
  const data = readStore();
  data.emailEvents = Array.isArray(data.emailEvents) ? data.emailEvents : [];
  const exists = data.emailEvents.some(
    (entry) => entry.orderId === orderId && entry.status === status && entry.templateId === templateId
  );
  if (exists) return false;
  data.emailEvents.push({ orderId, status, templateId, messageId, sentAt: new Date().toISOString() });
  writeStore(data);
  return true;
}

export async function hasOrderEmailEvent({ orderId, status, templateId }) {
  if (isDatabaseEnabled()) return orderRepo.hasEmailEvent({ orderId, status, templateId });
  const data = readStore();
  data.emailEvents = Array.isArray(data.emailEvents) ? data.emailEvents : [];
  return data.emailEvents.some(
    (entry) => entry.orderId === orderId && entry.status === status && entry.templateId === templateId
  );
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
    fulfillmentStatus: order.fulfillmentStatus || order.status,
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
    shipments: (order.shipments || []).map((shipment) => ({
      shipmentId: shipment.shipmentId,
      items: shipment.items,
      sourceCountry: shipment.sourceCountry,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      currentStatus: shipment.currentStatus,
      estimatedDelivery: shipment.estimatedDelivery,
      events: (shipment.events || []).map(({ status, publicTitle, publicDescription, location, createdAt }) => ({
        status,
        publicTitle,
        publicDescription,
        location,
        createdAt,
      })),
    })),
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
