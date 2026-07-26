#!/usr/bin/env node
import assert from "assert/strict";
import fs from "fs";
import os from "os";
import path from "path";

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbmare-fulfillment-"));
process.env.ADMIN_DATA_DIR = tempDir;
delete process.env.DATABASE_URL;

const {
  appendOrderEvent,
  createOrderShipment,
  createPendingOrder,
  getBuyerOrderJourney,
  getOrderWithFulfillment,
  hasOrderEmailEvent,
  recordOrderEmailEvent,
} = await import("../server/order-store.js");

const order = await createPendingOrder({
  items: [
    {
      productId: "test-piece",
      variantId: "standard",
      name: "Test piece",
      qty: 1,
      unitAmount: 100,
      policy: {
        policyVersion: "test",
        returnWindowDays: null,
        returnEligible: null,
        cancellationDeadline: "Before purchasing",
        finalSale: true,
        originCountry: "China",
      },
    },
  ],
  totals: { dueNowCents: 10000 },
  customer: { email: "buyer@example.com", name: "Buyer" },
  shipping: { country: "US", fullName: "Buyer" },
  consent: {
    policyVersions: {},
    policyVersion: "test",
    sourcingAcknowledged: true,
    legalAcknowledged: true,
  },
  language: "en",
});

const shipment = await createOrderShipment(order.id, {
  sourceCountry: "China",
  carrier: "FedEx",
  trackingNumber: "TRACK123",
});
assert.ok(shipment.shipmentId);

const event = await appendOrderEvent(
  order.id,
  {
    status: "SHIPPED",
    shipmentId: shipment.shipmentId,
    location: "Shanghai",
    publicTitle: "Dispatched",
    publicDescription: "Your order has been dispatched.",
    internalNote: "Supplier order hidden from buyer.",
    carrier: "FedEx",
    trackingNumber: "TRACK123",
    estimatedDelivery: "2026-08-01",
  },
  { operatorId: "ops@example.com" }
);
assert.equal(event.status, "SHIPPED");

const full = await getOrderWithFulfillment(order.id);
assert.equal(full.fulfillmentStatus, "SHIPPED");
assert.equal(full.events.length, 1);
assert.equal(full.shipments.length >= 1, true);

const journey = await getBuyerOrderJourney(order.id, {
  email: "buyer@example.com",
});
assert.equal(journey.events[0].publicDescription, "Your order has been dispatched.");
assert.equal(journey.events[0].internalNote, undefined);
assert.equal(journey.events[0].operatorId, undefined);

assert.equal(await hasOrderEmailEvent({ orderId: order.id, status: "SHIPPED", templateId: "fulfillment_update" }), false);
assert.equal(await recordOrderEmailEvent({ orderId: order.id, status: "SHIPPED", templateId: "fulfillment_update", messageId: "email_1" }), true);
assert.equal(await hasOrderEmailEvent({ orderId: order.id, status: "SHIPPED", templateId: "fulfillment_update" }), true);
assert.equal(await recordOrderEmailEvent({ orderId: order.id, status: "SHIPPED", templateId: "fulfillment_update", messageId: "email_2" }), false);

console.log("order fulfillment tests passed");
