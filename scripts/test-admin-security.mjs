import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbmare-admin-security-"));
process.env.ADMIN_DATA_DIR = testDataDir;
delete process.env.DATABASE_URL;

try {
  const { createAdminAuth, createPasswordHash } = await import(
    "../server/admin-auth.js"
  );
  const {
    createManagedProduct,
    getManagedProduct,
    listPublishedProducts,
    renderPublicCatalogModule,
    updateManagedInventory,
    updateManagedProduct,
  } = await import("../server/product-store.js");
  const { resolveTrustedItems } = await import("../server/checkout-products.js");
  const { createPendingOrder, updateOrderOperations } = await import(
    "../server/order-store.js"
  );

  const password = "A-Long-Local-Test-Password-2026";
  const passwordHash = createPasswordHash(password);
  assert.match(passwordHash, /^scrypt\$/);

  const auth = createAdminAuth({
    email: "owner@orbmare.local",
    passwordHash,
    developmentPassword: "",
    cookiePath: "/private-ops",
    secureCookies: true,
  });
  const request = {
    headers: {},
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
    get() {
      return "";
    },
  };
  assert.equal((await auth.login(request, "owner@orbmare.local", "wrong-password")).ok, false);
  const login = await auth.login(request, "owner@orbmare.local", password);
  assert.equal(login.ok, true);

  const throttledAuth = createAdminAuth({
    email: "owner@orbmare.local",
    passwordHash,
    developmentPassword: "",
    cookiePath: "/private-ops",
    secureCookies: true,
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(
      (await throttledAuth.login(request, "owner@orbmare.local", "wrong-password")).ok,
      false
    );
  }
  const blockedLogin = await throttledAuth.login(
    request,
    "owner@orbmare.local",
    password
  );
  assert.equal(blockedLogin.rateLimited, true);

  const response = {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  auth.setSessionCookie(response, login.session);
  const setCookie = response.headers["Set-Cookie"];
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /Path=\/private-ops/);

  request.headers.cookie = setCookie.split(";")[0];
  let sessionPassed = false;
  await auth.requireSession(request, response, () => {
    sessionPassed = true;
  });
  assert.equal(sessionPassed, true);
  assert.equal(request.adminSession.email, "owner@orbmare.local");

  request.get = (name) =>
    String(name).toLowerCase() === "x-csrf-token" ? "" : "";
  auth.requireCsrf(request, response, () => {});
  assert.equal(response.statusCode, 403);

  response.statusCode = 200;
  request.get = (name) =>
    String(name).toLowerCase() === "x-csrf-token"
      ? login.session.csrfToken
      : "";
  let csrfPassed = false;
  auth.requireCsrf(request, response, () => {
    csrfPassed = true;
  });
  assert.equal(csrfPassed, true);

  const seeded = await getManagedProduct("metal-bracket");
  assert.ok(seeded);
  const unavailable = await updateManagedInventory("metal-bracket", {
    mode: "stocked",
    onHand: 0,
    reorderPoint: 2,
    maxPerOrder: 5,
  });
  assert.equal(unavailable.isPurchasable, false);
  assert.equal(
    (await listPublishedProducts()).find((product) => product.id === "metal-bracket")
      .availableQuantity,
    0
  );
  await assert.rejects(
    () =>
      resolveTrustedItems([
        { productId: "metal-bracket", variantId: "standard", qty: 1 },
      ]),
    /not available/
  );

  const draft = await updateManagedProduct("drone-arm", {
    ...(await getManagedProduct("drone-arm")),
    lifecycleStatus: "draft",
  });
  assert.equal(draft.lifecycleStatus, "draft");
  assert.equal(
    (await listPublishedProducts()).some((product) => product.id === "drone-arm"),
    false
  );

  await createManagedProduct({
    id: "security-test-item",
    lifecycleStatus: "published",
    collection: "toys",
    price: 19.95,
    material: "PLA",
    image: "/assets/toys/jinqi-dragon-gold.jpg",
    zh: { name: "<script>测试</script>", desc: "安全文本测试。" },
    en: { name: "Security text test", desc: "Stored as text only." },
    inventory: {
      mode: "source_after_order",
      maxPerOrder: 3,
    },
    shipping: {
      profile: "cross_border_standard",
      originCountry: "China",
      processingTime: "Pending verification",
      internationalShippingTime: "Pending verification",
    },
  });
  assert.equal((await renderPublicCatalogModule()).includes("<script>"), false);

  await createManagedProduct({
    id: "apparel-size-test",
    channel: "editorial",
    collection: "japan",
    lifecycleStatus: "published",
    price: 88.93,
    material: "Cotton",
    image: "/assets/toys/jinqi-dragon-gold.jpg",
    zh: { name: "尺码测试长裤", desc: "用于校验按尺码结账。" },
    en: { name: "Size test trousers", desc: "Used to validate size checkout." },
    productType: "apparel",
    productAttributes: {
      sizeOptions: [{ apparelSize: "XS" }, { apparelSize: "M", price: 92.5 }],
    },
    inventory: { mode: "source_after_order", maxPerOrder: 3 },
    shipping: {
      profile: "cross_border_standard",
      originCountry: "Japan",
      processingTime: "Pending verification",
      internationalShippingTime: "Pending verification",
    },
  });
  const sized = await resolveTrustedItems([
    { productId: "apparel-size-test", variantId: "size-1", qty: 1 },
  ]);
  assert.equal(sized[0].variantLabel, "M");
  assert.equal(sized[0].unitAmountCents, 9250);

  const order = await createPendingOrder({
    items: [
      {
        productId: "security-test-item",
        variantId: "standard",
        variantLabel: "Standard",
        name: "Security text test",
        qty: 1,
        policy: {
          policyVersion: "test",
          returnWindowDays: null,
          returnEligible: null,
          cancellationDeadline: "Before purchasing",
          finalSale: null,
        },
      },
    ],
    totals: { dueNowCents: 1995 },
    customer: {
      email: "buyer@example.com",
      name: "Test Buyer",
      phone: "",
    },
    shipping: {
      name: "Test Buyer",
      line1: "1 Test Way",
      line2: "",
      city: "Boston",
      region: "MA",
      postal: "02108",
      country: "US",
    },
    consent: { policyVersions: { terms: "test" } },
    language: "en",
  });
  const shipped = await updateOrderOperations(order.id, {
    status: "shipped_internationally",
    carrier: "Test Carrier",
    trackingNumber: "TEST123",
    trackingUrl: "https://example.com/track/TEST123",
    note: "Integration test.",
  });
  assert.equal(shipped.status, "shipped_internationally");
  assert.equal(shipped.shipment.trackingNumber, "TEST123");
  await assert.rejects(
    () =>
      updateOrderOperations(order.id, {
        status: "shipped_internationally",
        trackingUrl: "javascript:alert(1)",
      }),
    /HTTPS/
  );

  console.log("Admin security and operations checks passed.");
} finally {
  fs.rmSync(testDataDir, { recursive: true, force: true });
}
