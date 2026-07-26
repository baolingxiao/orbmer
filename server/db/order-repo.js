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
    fulfillmentStatus: row.fulfillment_status || row.status,
    estimatedDeliveryStart: row.estimated_delivery_start?.toISOString?.().slice(0, 10) || row.estimated_delivery_start || "",
    estimatedDeliveryEnd: row.estimated_delivery_end?.toISOString?.().slice(0, 10) || row.estimated_delivery_end || "",
    carrier: row.carrier || "",
    trackingNumber: row.tracking_number || "",
    trackingUrl: row.tracking_url || "",
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
    status: "PAYMENT_PENDING",
    fulfillmentStatus: "ORDER_CONFIRMED",
    statusHistory: [
      {
        status: "PAYMENT_PENDING",
        at: now,
        note: "Server created an order from a server-side checkout quote.",
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
    language: language || "zh",
    buyerUserId,
  };

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO orders (
         id, status, fulfillment_status, currency, buyer_user_id, customer, shipping, consent, totals,
         payment, shipment, items, status_history, language, payment_intent_id,
         created_at, updated_at
       ) VALUES (
         $1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,
         $10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,NULL,
         $15::timestamptz,$16::timestamptz
       )`,
      [
        order.id,
        order.status,
        order.fulfillmentStatus,
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

export async function getBuyerOrder(orderId, userId, email) {
  const { rows } = await query(
    `SELECT * FROM orders
     WHERE id = $1
       AND (buyer_user_id = $2 OR lower(customer->>'email') = lower($3))
     LIMIT 1`,
    [orderId, userId || null, email || ""]
  );
  return mapOrder(rows[0]);
}

export async function updateOrderRecord(orderId, mutation) {
  const current = await getOrder(orderId);
  if (!current) return null;
  mutation(current);
  current.updatedAt = new Date().toISOString();
  const { rows } = await query(
    `UPDATE orders SET
       status = $2,
       fulfillment_status = $3,
       estimated_delivery_start = NULLIF($4, '')::date,
       estimated_delivery_end = NULLIF($5, '')::date,
       carrier = $6,
       tracking_number = $7,
       tracking_url = $8,
       customer = $9::jsonb,
       shipping = $10::jsonb,
       consent = $11::jsonb,
       totals = $12::jsonb,
       payment = $13::jsonb,
       shipment = $14::jsonb,
       items = $15::jsonb,
       status_history = $16::jsonb,
       payment_intent_id = $17,
       updated_at = $18::timestamptz
     WHERE id = $1
     RETURNING *`,
    [
      orderId,
      current.status,
      current.fulfillmentStatus || current.status,
      current.estimatedDeliveryStart || "",
      current.estimatedDeliveryEnd || "",
      current.carrier || current.shipment?.carrier || "",
      current.trackingNumber || current.shipment?.trackingNumber || "",
      current.trackingUrl || current.shipment?.trackingUrl || "",
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

export async function listOrderEvents(orderId) {
  const { rows } = await query(
    `SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at DESC`,
    [orderId]
  );
  return rows.map((row) => ({
    id: row.id,
    orderId: row.order_id,
    shipmentId: row.shipment_id || null,
    status: row.status,
    publicTitle: row.public_title,
    publicDescription: row.public_description,
    internalNote: row.internal_note || "",
    location: row.location || "",
    operatorId: row.operator_id || "",
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  }));
}

export async function appendOrderEvent(orderId, event) {
  const { rows } = await query(
    `INSERT INTO order_events (
       order_id, shipment_id, status, public_title, public_description,
       internal_note, location, operator_id, created_at
     ) VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, $8, COALESCE($9::timestamptz, now()))
     RETURNING *`,
    [
      orderId,
      event.shipmentUuid || "",
      event.status,
      event.publicTitle,
      event.publicDescription,
      event.internalNote || "",
      event.location || "",
      event.operatorId || "",
      event.createdAt || null,
    ]
  );
  return (await listOrderEvents(orderId)).find((entry) => entry.id === rows[0].id);
}

export async function listOrderShipments(orderId) {
  const { rows } = await query(
    `SELECT * FROM order_shipments WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );
  return rows.map((row) => ({
    id: row.id,
    shipmentId: row.shipment_id,
    orderId: row.order_id,
    items: row.items || [],
    sourceCountry: row.source_country || "",
    carrier: row.carrier || "",
    trackingNumber: row.tracking_number || "",
    trackingUrl: row.tracking_url || "",
    currentStatus: row.current_status,
    estimatedDelivery: row.estimated_delivery?.toISOString?.().slice(0, 10) || row.estimated_delivery || "",
    events: row.events || [],
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  }));
}

export async function createShipment(orderId, input) {
  const shipmentId = input.shipmentId || `SHP-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const { rows } = await query(
    `INSERT INTO order_shipments (
       order_id, shipment_id, items, source_country, carrier, tracking_number,
       tracking_url, current_status, estimated_delivery
     ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,NULLIF($9, '')::date)
     RETURNING *`,
    [
      orderId,
      shipmentId,
      JSON.stringify(input.items || []),
      input.sourceCountry || "",
      input.carrier || "",
      input.trackingNumber || "",
      input.trackingUrl || "",
      input.currentStatus || "ORDER_CONFIRMED",
      input.estimatedDelivery || "",
    ]
  );
  return (await listOrderShipments(orderId)).find((entry) => entry.id === rows[0].id);
}

export async function updateShipment(shipmentId, input) {
  const { rows } = await query(
    `UPDATE order_shipments
     SET items = COALESCE($2::jsonb, items),
         source_country = COALESCE($3, source_country),
         carrier = COALESCE($4, carrier),
         tracking_number = COALESCE($5, tracking_number),
         tracking_url = COALESCE($6, tracking_url),
         current_status = COALESCE($7, current_status),
         estimated_delivery = COALESCE(NULLIF($8, '')::date, estimated_delivery),
         events = COALESCE($9::jsonb, events),
         updated_at = now()
     WHERE shipment_id = $1 OR id::text = $1
     RETURNING order_id`,
    [
      shipmentId,
      input.items === undefined ? null : JSON.stringify(input.items || []),
      input.sourceCountry ?? null,
      input.carrier ?? null,
      input.trackingNumber ?? null,
      input.trackingUrl ?? null,
      input.currentStatus ?? null,
      input.estimatedDelivery ?? "",
      input.events === undefined ? null : JSON.stringify(input.events || []),
    ]
  );
  if (!rows[0]) return null;
  const shipments = await listOrderShipments(rows[0].order_id);
  return shipments.find((entry) => entry.shipmentId === shipmentId || entry.id === shipmentId) || null;
}

export async function recordEmailEvent({ orderId, status, templateId, messageId = "" }) {
  const { rows } = await query(
    `INSERT INTO order_email_events (order_id, status, template_id, message_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (order_id, status, template_id) DO NOTHING
     RETURNING id`,
    [orderId, status, templateId, messageId]
  );
  return rows.length > 0;
}

export async function hasEmailEvent({ orderId, status, templateId }) {
  const { rows } = await query(
    `SELECT 1 FROM order_email_events
     WHERE order_id = $1 AND status = $2 AND template_id = $3
     LIMIT 1`,
    [orderId, status, templateId]
  );
  return rows.length > 0;
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
    order.status = "PAID";
    order.payment.status = "succeeded";
    order.statusHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    order.statusHistory.push({
      status: order.status,
      at: now,
      note: "Stripe confirmed payment; order is ready for procurement review.",
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
    order.status = "CANCELLED";
    order.payment.status = "cancelled";
    await updateOrderRecord(order.id, (entry) => {
      entry.status = "CANCELLED";
      entry.payment.status = "cancelled";
    });
    await releaseReservedStock(order.id);
    return { matched: true, orderId: order.id, action: "cancelled" };
  }

  if (eventType === "charge.refunded") {
    order.status = "REFUNDED";
    order.payment.status = "refunded";
    await updateOrderRecord(order.id, (entry) => {
      entry.status = "REFUNDED";
      entry.payment.status = "refunded";
    });
    return { matched: true, orderId: order.id, action: "refunded" };
  }

  return { matched: true, orderId: order.id, action: "ignored" };
}
