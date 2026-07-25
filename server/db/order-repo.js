import { randomUUID } from "crypto";
import { query, withTransaction } from "./index.js";
import { commitReservedStock, releaseReservedStock, reserveStock } from "./product-repo.js";

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    status: row.status,
    currency: row.currency,
    items: row.items || [],
    totals: row.totals,
    customer: row.customer,
    shipping: row.shipping,
    consent: row.consent,
    payment: {
      ...(row.payment || {}),
      paymentIntentId: row.payment_intent_id || row.payment?.paymentIntentId || null,
    },
    shipment: row.shipment || {},
    statusHistory: row.status_history || [],
    language: row.language || "zh",
    buyerUserId: row.buyer_user_id || null,
  };
}

export async function createPendingOrder({
  items,
  totals,
  customer,
  shipping,
  consent,
  language,
  buyerUserId = null,
}) {
  const now = new Date().toISOString();
  const order = {
    id: `OM-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    status: "request_received",
    statusHistory: [
      {
        status: "request_received",
        at: now,
        note: "Server received the sourcing request and consent record.",
      },
    ],
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
    language: language || "zh",
    buyerUserId,
  };

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO orders (
         id, status, currency, buyer_user_id, customer, shipping, consent, totals,
         payment, shipment, items, status_history, language, payment_intent_id,
         created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,
         $9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13,NULL,
         $14::timestamptz,$15::timestamptz
       )`,
      [
        order.id,
        order.status,
        order.currency,
        buyerUserId,
        JSON.stringify(order.customer),
        JSON.stringify(order.shipping),
        JSON.stringify(order.consent),
        JSON.stringify(order.totals),
        JSON.stringify(order.payment),
        JSON.stringify(order.shipment),
        JSON.stringify(order.items),
        JSON.stringify(order.statusHistory),
        order.language,
        order.createdAt,
        order.updatedAt,
      ]
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, qty, unit_amount_cents, payload)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
          order.id,
          item.productId,
          item.variantId || null,
          item.qty,
          Math.round(Number(item.unitAmount || item.price || item.unitAmountCents / 100 || 0) * 100) ||
            item.unitAmountCents ||
            null,
          JSON.stringify(item),
        ]
      );
    }
  });

  try {
    await reserveStock(
      items.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        orderId: order.id,
      })),
      { actor: "checkout" }
    );
  } catch (error) {
    await query(`DELETE FROM orders WHERE id = $1`, [order.id]);
    throw error;
  }

  return order;
}

export async function attachPaymentIntent(orderId, paymentIntentId) {
  const { rows } = await query(
    `UPDATE orders
     SET payment_intent_id = $2,
         payment = jsonb_set(
           jsonb_set(payment, '{paymentIntentId}', to_jsonb($2::text), true),
           '{status}', '"requires_payment_method"', true
         ),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [orderId, paymentIntentId]
  );
  return mapOrder(rows[0]);
}

export async function getOrder(orderId) {
  const { rows } = await query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
  return mapOrder(rows[0]);
}

export async function getOrderByPaymentIntent(paymentIntentId) {
  const { rows } = await query(`SELECT * FROM orders WHERE payment_intent_id = $1`, [
    paymentIntentId,
  ]);
  return mapOrder(rows[0]);
}

export async function listOrders() {
  const { rows } = await query(`SELECT * FROM orders ORDER BY created_at DESC`);
  return rows.map(mapOrder);
}

export async function updateOrderRecord(orderId, mutation) {
  const current = await getOrder(orderId);
  if (!current) return null;
  mutation(current);
  current.updatedAt = new Date().toISOString();
  const { rows } = await query(
    `UPDATE orders SET
       status = $2,
       customer = $3::jsonb,
       shipping = $4::jsonb,
       consent = $5::jsonb,
       totals = $6::jsonb,
       payment = $7::jsonb,
       shipment = $8::jsonb,
       items = $9::jsonb,
       status_history = $10::jsonb,
       payment_intent_id = $11,
       updated_at = $12::timestamptz
     WHERE id = $1
     RETURNING *`,
    [
      orderId,
      current.status,
      JSON.stringify(current.customer),
      JSON.stringify(current.shipping),
      JSON.stringify(current.consent),
      JSON.stringify(current.totals),
      JSON.stringify(current.payment),
      JSON.stringify(current.shipment || {}),
      JSON.stringify(current.items),
      JSON.stringify(current.statusHistory || []),
      current.payment?.paymentIntentId || null,
      current.updatedAt,
    ]
  );
  return mapOrder(rows[0]);
}

export async function processWebhookOnce(eventId, apply) {
  return withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO stripe_webhook_events (event_id)
       VALUES ($1)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId]
    );
    if (inserted.rowCount === 0) return { duplicate: true };

    const effect = await apply(client);
    return { duplicate: false, effect };
  });
}

export async function applyPaymentEvent({ eventType, paymentIntentId }) {
  const order = await getOrderByPaymentIntent(paymentIntentId);
  if (!order) return { matched: false };

  const now = new Date().toISOString();
  if (eventType === "payment_intent.succeeded") {
    order.status = "payment_authorized_or_paid";
    order.payment.status = "succeeded";
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({
      status: order.status,
      at: now,
      note: "Stripe confirmed payment; supplier availability is not yet confirmed.",
    });
    await updateOrderRecord(order.id, (entry) => {
      Object.assign(entry, order);
    });
    await commitReservedStock(order.id);
    return { matched: true, orderId: order.id, action: "paid" };
  }

  if (eventType === "payment_intent.payment_failed") {
    order.payment.status = "failed";
    await updateOrderRecord(order.id, (entry) => {
      entry.payment.status = "failed";
    });
    return { matched: true, orderId: order.id, action: "failed" };
  }

  if (eventType === "payment_intent.canceled") {
    order.status = "cancelled";
    order.payment.status = "cancelled";
    await updateOrderRecord(order.id, (entry) => {
      entry.status = "cancelled";
      entry.payment.status = "cancelled";
    });
    await releaseReservedStock(order.id);
    return { matched: true, orderId: order.id, action: "cancelled" };
  }

  if (eventType === "charge.refunded") {
    order.status = "refunded";
    order.payment.status = "refunded";
    await updateOrderRecord(order.id, (entry) => {
      entry.status = "refunded";
      entry.payment.status = "refunded";
    });
    return { matched: true, orderId: order.id, action: "refunded" };
  }

  return { matched: true, orderId: order.id, action: "ignored" };
}
