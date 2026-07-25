import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  products as seedProducts,
  PRODUCT_POLICY_VERSION,
} from "../web/shared/js/catalog.js";
import { isDatabaseEnabled } from "./db/index.js";
import * as productRepo from "./db/product-repo.js";
import {
  EDITORIAL_COUNTRIES,
  EDITORIAL_STATUSES,
  loadEditorialJsonProducts,
  loadEditorialSeedProducts,
  storeProductToEditorialPublic,
} from "./editorial-map.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRuntimeDir = path.join(__dirname, "runtime-data");
const INVENTORY_MODES = new Set(["source_after_order", "stocked", "unavailable"]);
const LIFECYCLE_STATUSES = new Set([
  "candidate",
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "hidden",
  "archived",
  "out_of_stock",
]);
const SHOP_COLLECTIONS = new Set(["metal", "toys", "portrait"]);
const COLLECTIONS = new Set([...SHOP_COLLECTIONS, ...EDITORIAL_COUNTRIES]);
const CHANNELS = new Set(["shop", "editorial"]);

function editorialSourceMode() {
  const mode = String(process.env.EDITORIAL_DB_SOURCE || "prefer").toLowerCase();
  return ["prefer", "db", "json"].includes(mode) ? mode : "prefer";
}

/** Normalize product IDs: lowercase slug, no forced prefix. */
export function normalizeProductId(rawId) {
  const normalized = String(rawId ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) throw new Error("Product ID is required.");
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(normalized)) {
    throw new Error("Product ID must use lowercase letters, numbers, and hyphens.");
  }
  return normalized.slice(0, 80);
}

/** @deprecated Use normalizeProductId — 3d- prefix is no longer required. */
export function ensure3dProductId(rawId) {
  return normalizeProductId(rawId);
}

function productChannel(product) {
  if (product?.channel === "editorial") return "editorial";
  if (product?.channel === "shop") return "shop";
  if (EDITORIAL_COUNTRIES.has(product?.collection) || EDITORIAL_COUNTRIES.has(product?.country)) {
    return "editorial";
  }
  return "shop";
}

function isShopChannel(product) {
  return productChannel(product) === "shop";
}

function isEditorialChannel(product) {
  return productChannel(product) === "editorial";
}

function runtimeDir() {
  return process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : defaultRuntimeDir;
}

function storePath() {
  return path.join(runtimeDir(), "catalog.json");
}

function asText(value, max, field, { required = false } = {}) {
  const result = String(value ?? "").trim().slice(0, max);
  if (required && !result) throw new Error(`${field} is required.`);
  return result;
}

function asInteger(value, field, { min = 0, max = 10_000_000, nullable = false } = {}) {
  if (nullable && (value === null || value === undefined || value === "")) return null;
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new Error(`${field} must be an integer from ${min} to ${max}.`);
  }
  return result;
}

function asPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0.5 || price > 1_000_000) {
    throw new Error("Price must be between 0.50 and 1000000.");
  }
  return Math.round(price * 100) / 100;
}

function asMoney(value, field = "Amount") {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    throw new Error(`${field} must be between 0 and 1000000.`);
  }
  return Math.round(amount * 100) / 100;
}

function asImagePath(value, { required = true } = {}) {
  const image = asText(value, 500, "Image path", { required });
  if (!image) return "";
  if (!image.startsWith("/assets/") || image.includes("..")) {
    throw new Error("Image path must use a local /assets/ file.");
  }
  return image;
}

function normalizeImages(input, existing, primaryImage) {
  const raw = Array.isArray(input?.images)
    ? input.images
    : Array.isArray(existing?.images)
      ? existing.images
      : [];
  const paths = [];
  for (const entry of raw) {
    const pathValue = asImagePath(entry, { required: false });
    if (pathValue && !paths.includes(pathValue)) paths.push(pathValue);
  }
  if (primaryImage && !paths.includes(primaryImage)) {
    paths.unshift(primaryImage);
  }
  if (!paths.length) paths.push(primaryImage);
  return paths.slice(0, 12);
}

function slugifyVariantId(label, index) {
  const base = String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `variant-${index + 1}`;
}

function normalizeVariants(input, existing, basePrice) {
  const raw = Array.isArray(input?.variants) ? input.variants : null;
  if (raw === null) {
    if (Array.isArray(existing?.variants) && existing.variants.length) {
      return existing.variants.map((variant, index) => ({
        id: asText(variant.id || slugifyVariantId(variant.label, index), 80, "Variant id"),
        label: asText(variant.label || `Option ${index + 1}`, 120, "Variant label", {
          required: true,
        }),
        price: asPrice(variant.price ?? basePrice),
      }));
    }
    return [{ id: "standard", label: "Standard", price: basePrice }];
  }
  if (!raw.length) {
    return [{ id: "standard", label: "Standard", price: basePrice }];
  }
  if (raw.length > 20) throw new Error("At most 20 variants are allowed.");
  return raw.map((variant, index) => {
    const label = asText(
      variant?.label ?? variant?.id ?? `Option ${index + 1}`,
      120,
      "Variant label",
      { required: true }
    );
    return {
      id: asText(variant?.id || slugifyVariantId(label, index), 80, "Variant id"),
      label,
      price: asPrice(variant?.price ?? basePrice),
    };
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function seedRecord(product, now) {
  const inventoryMode = product.inventory?.mode || "source_after_order";
  const channel = productChannel({ ...product, channel: product.channel || "shop" });
  const id =
    channel === "shop" ? normalizeProductId(product.id) : String(product.id).toLowerCase();
  return {
    ...clone(product),
    id,
    channel: "shop",
    country: undefined,
    editorialStatus: undefined,
    lifecycleStatus: product.lifecycleStatus || "published",
    inventory: {
      mode: inventoryMode,
      onHand: inventoryMode === "stocked" ? Number(product.inventory?.onHand || 0) : null,
      reserved: Number(product.inventory?.reserved || 0),
      reorderPoint: inventoryMode === "stocked" ? Number(product.inventory?.reorderPoint || 0) : null,
      maxPerOrder: Number(product.inventory?.maxPerOrder || 20),
    },
    shipping: {
      profile: product.shipping?.profile || "cross_border_standard",
      originCountry: product.shipping?.originCountry || product.sourceCountry || "China",
      processingTime: product.shipping?.processingTime || product.processingTime || "Details pending verification",
      internationalShippingTime:
        product.shipping?.internationalShippingTime ||
        product.internationalShippingTime ||
        "Details pending verification",
    },
    revision: Number(product.revision || 1),
    createdAt: product.createdAt || now,
    updatedAt: product.updatedAt || now,
  };
}

function initialStore() {
  const now = new Date().toISOString();
  const shop = seedProducts.map((product) =>
    seedRecord({ ...product, channel: "shop" }, now)
  );
  return {
    schemaVersion: "1.0.0",
    policyVersion: PRODUCT_POLICY_VERSION,
    updatedAt: now,
    products: shop,
  };
}

function ensureStore() {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(storePath())) {
    writeStore(initialStore());
  }
}

function readStore() {
  ensureStore();
  try {
    const value = JSON.parse(fs.readFileSync(storePath(), "utf8"));
    if (!Array.isArray(value.products)) throw new Error("Missing products array.");
    return value;
  } catch (error) {
    throw new Error(`Product store is unavailable: ${error.message}`);
  }
}

function writeStore(data) {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  const target = storePath();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function normalizeProductInput(input, existing = null) {
  const channel = asText(
    input.channel ?? existing?.channel ?? productChannel({ ...existing, ...input }),
    20,
    "Channel"
  );
  if (!CHANNELS.has(channel)) throw new Error("Unsupported product channel.");

  const id = existing
    ? existing.id
    : channel === "shop"
      ? normalizeProductId(input.id)
      : asText(input.id, 80, "Product ID", { required: true }).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id)) {
    throw new Error("Product ID must use lowercase letters, numbers, and hyphens.");
  }

  const collection = asText(
    input.collection ?? existing?.collection,
    40,
    "Collection",
    { required: true }
  );
  if (channel === "editorial") {
    if (!EDITORIAL_COUNTRIES.has(collection)) {
      throw new Error("Editorial products must use japan, italy, or china as collection.");
    }
  } else if (!SHOP_COLLECTIONS.has(collection)) {
    throw new Error("Unsupported product collection.");
  }

  const lifecycleStatus = asText(
    input.lifecycleStatus ?? existing?.lifecycleStatus ?? "draft",
    20,
    "Lifecycle status"
  );
  if (!LIFECYCLE_STATUSES.has(lifecycleStatus)) throw new Error("Unsupported lifecycle status.");

  const inventoryInput = input.inventory || {};
  const previousInventory = existing?.inventory || {};
  const inventoryMode = asText(
    inventoryInput.mode ?? previousInventory.mode ?? "source_after_order",
    30,
    "Inventory mode"
  );
  if (!INVENTORY_MODES.has(inventoryMode)) throw new Error("Unsupported inventory mode.");

  const onHand =
    inventoryMode === "stocked"
      ? asInteger(inventoryInput.onHand ?? previousInventory.onHand ?? 0, "On-hand quantity")
      : null;
  const reserved =
    inventoryMode === "stocked"
      ? Math.min(
          onHand,
          asInteger(previousInventory.reserved ?? 0, "Reserved quantity")
        )
      : 0;
  const reorderPoint =
    inventoryMode === "stocked"
      ? asInteger(
          inventoryInput.reorderPoint ?? previousInventory.reorderPoint ?? 0,
          "Reorder point"
        )
      : null;
  const maxPerOrder = asInteger(
    inventoryInput.maxPerOrder ?? previousInventory.maxPerOrder ?? (channel === "editorial" ? 5 : 20),
    "Maximum per order",
    { min: 1, max: 1000 }
  );

  const shippingInput = input.shipping || {};
  const previousShipping = existing?.shipping || {};
  const defaultOrigin =
    channel === "editorial"
      ? collection === "japan"
        ? "Japan"
        : collection === "italy"
          ? "Italy"
          : "China"
      : "China";
  const processingTime = asText(
    shippingInput.processingTime ??
      input.processingTime ??
      previousShipping.processingTime ??
      existing?.processingTime ??
      (channel === "editorial"
        ? "Concierge confirmation within 2–5 business days"
        : ""),
    160,
    "Processing time",
    { required: true }
  );
  const internationalShippingTime = asText(
    shippingInput.internationalShippingTime ??
      input.internationalShippingTime ??
      previousShipping.internationalShippingTime ??
      existing?.internationalShippingTime ??
      (channel === "editorial" ? "Arranged after availability confirmation" : ""),
    160,
    "International shipping time",
    { required: true }
  );
  const originCountry = asText(
    shippingInput.originCountry ??
      input.sourceCountry ??
      previousShipping.originCountry ??
      existing?.sourceCountry ??
      defaultOrigin,
    80,
    "Origin country",
    { required: true }
  );

  const now = new Date().toISOString();
  const image = asImagePath(input.image ?? existing?.image);
  const images = normalizeImages(input, existing, image);
  const price = asPrice(input.price ?? existing?.price);
  const variants =
    channel === "editorial"
      ? [{ id: "standard", label: "Standard", price }]
      : normalizeVariants(input, existing, price);
  const priceMax = Math.max(price, ...variants.map((variant) => variant.price));
  const zhName = asText(input.zh?.name ?? existing?.zh?.name, 120, "Chinese name", {
    required: true,
  });
  const enName = asText(input.en?.name ?? existing?.en?.name, 120, "English name", {
    required: true,
  });
  const dimensions = asText(
    input.dimensions ?? existing?.dimensions ?? "",
    160,
    "Dimensions"
  );
  const safetyWarning = asText(
    String(input.safetyWarning ?? "").trim()
      ? input.safetyWarning
      : existing?.safetyWarning ||
          "Review item-specific materials, dimensions, age guidance, and warnings before use; details pending verification",
    500,
    "Safety warning",
    { required: true }
  );
  const imageSource = asText(
    String(input.imageSource ?? "").trim()
      ? input.imageSource
      : existing?.imageSource || "Orbmare managed local asset",
    200,
    "Image source",
    { required: true }
  );

  const editorialStatus = asText(
    input.editorialStatus ?? existing?.editorialStatus ?? (channel === "editorial" ? "curated" : ""),
    40,
    "Editorial status"
  );
  if (channel === "editorial" && editorialStatus && !EDITORIAL_STATUSES.has(editorialStatus)) {
    throw new Error("Unsupported editorial status.");
  }

  const optionalText = (value, fallback, max, field) =>
    asText(value ?? fallback ?? "", max, field);

  return {
    ...(existing ? clone(existing) : {}),
    id,
    channel,
    collection,
    country: channel === "editorial" ? collection : existing?.country || undefined,
    editorialStatus: channel === "editorial" ? editorialStatus || "curated" : undefined,
    category: optionalText(input.category, existing?.category, 80, "Category"),
    craft: optionalText(input.craft, existing?.craft, 120, "Craft"),
    craftZh: optionalText(input.craftZh, existing?.craftZh, 120, "Craft ZH"),
    materialZh: optionalText(input.materialZh, existing?.materialZh, 120, "Material ZH"),
    materialId: optionalText(input.materialId, existing?.materialId, 80, "Material ID"),
    tag: optionalText(input.tag, existing?.tag, 80, "Tag"),
    tagZh: optionalText(input.tagZh, existing?.tagZh, 80, "Tag ZH"),
    countryLabel: optionalText(input.countryLabel, existing?.countryLabel, 80, "Country label"),
    countryLabelZh: optionalText(
      input.countryLabelZh,
      existing?.countryLabelZh,
      80,
      "Country label ZH"
    ),
    summary: optionalText(input.summary, existing?.summary, 500, "Summary"),
    summaryZh: optionalText(input.summaryZh, existing?.summaryZh, 500, "Summary ZH"),
    story: optionalText(input.story, existing?.story, 2000, "Story"),
    storyZh: optionalText(input.storyZh, existing?.storyZh, 2000, "Story ZH"),
    designerId: optionalText(input.designerId, existing?.designerId, 80, "Designer ID"),
    designerName: optionalText(input.designerName, existing?.designerName, 120, "Designer"),
    designerNameZh: optionalText(
      input.designerNameZh,
      existing?.designerNameZh,
      120,
      "Designer ZH"
    ),
    studio: optionalText(input.studio, existing?.studio, 120, "Studio"),
    studioZh: optionalText(input.studioZh, existing?.studioZh, 120, "Studio ZH"),
    brandId: optionalText(input.brandId, existing?.brandId, 80, "Brand ID"),
    brandName: optionalText(input.brandName, existing?.brandName, 120, "Brand"),
    brandNameZh: optionalText(input.brandNameZh, existing?.brandNameZh, 120, "Brand ZH"),
    featured:
      input.featured !== undefined ? Boolean(input.featured) : Boolean(existing?.featured),
    priceLabel:
      optionalText(input.priceLabel, existing?.priceLabel, 40, "Price label") ||
      `$${price}`,
    image: images[0],
    images,
    price,
    priceMax,
    costPrice:
      input.costPrice === null || input.costPrice === ""
        ? null
        : input.costPrice !== undefined
          ? asMoney(input.costPrice, "Cost price")
          : existing?.costPrice ?? null,
    compareAtPrice:
      input.compareAtPrice === null || input.compareAtPrice === ""
        ? null
        : input.compareAtPrice !== undefined
          ? asMoney(input.compareAtPrice, "Compare-at price")
          : existing?.compareAtPrice ?? null,
    purchasePrice:
      input.purchasePrice === null || input.purchasePrice === ""
        ? null
        : input.purchasePrice !== undefined
          ? asMoney(input.purchasePrice, "Purchase price")
          : existing?.purchasePrice ?? null,
    currency: optionalText(input.currency, existing?.currency || "USD", 8, "Currency") || "USD",
    allowDiscount:
      input.allowDiscount !== undefined
        ? Boolean(input.allowDiscount)
        : existing?.allowDiscount !== false,
    seo: {
      title: optionalText(input.seo?.title, existing?.seo?.title, 120, "SEO title"),
      description: optionalText(
        input.seo?.description,
        existing?.seo?.description,
        320,
        "SEO description"
      ),
      slug: optionalText(input.seo?.slug, existing?.seo?.slug || id, 120, "SEO slug"),
      keywords: optionalText(input.seo?.keywords, existing?.seo?.keywords, 240, "SEO keywords"),
      ogImage: optionalText(input.seo?.ogImage, existing?.seo?.ogImage, 500, "OG image"),
      noIndex: Boolean(input.seo?.noIndex ?? existing?.seo?.noIndex ?? false),
    },
    variants,
    dimensions,
    material: asText(input.material ?? existing?.material, 120, "Material", {
      required: true,
    }),
    zh: {
      name: zhName,
      desc: asText(input.zh?.desc ?? existing?.zh?.desc, 500, "Chinese description", {
        required: true,
      }),
    },
    en: {
      name: enName,
      desc: asText(input.en?.desc ?? existing?.en?.desc, 500, "English description", {
        required: true,
      }),
    },
    lifecycleStatus,
    inventory: {
      mode: inventoryMode,
      onHand,
      reserved,
      reorderPoint,
      maxPerOrder,
    },
    shipping: {
      profile: asText(
        shippingInput.profile ?? previousShipping.profile ?? "cross_border_standard",
        80,
        "Shipping profile",
        { required: true }
      ),
      originCountry,
      processingTime,
      internationalShippingTime,
    },
    sourceCountry: originCountry,
    processingTime,
    internationalShippingTime,
    fulfillmentLabels:
      inventoryMode === "stocked"
        ? ["Stock Managed", "Third-Party Fulfilled"]
        : inventoryMode === "unavailable"
          ? ["Unavailable", "Third-Party Fulfilled"]
          : ["Sourced After Order", "Third-Party Fulfilled"],
    policyVersion: existing?.policyVersion || PRODUCT_POLICY_VERSION,
    sourceType: existing?.sourceType || "Third-party supplier",
    returnWindowDays: existing?.returnWindowDays ?? null,
    returnEligible: existing?.returnEligible ?? null,
    cancellationDeadline:
      existing?.cancellationDeadline || "Before supplier purchasing begins",
    finalSale: existing?.finalSale ?? null,
    returnShippingPayer:
      existing?.returnShippingPayer || "Details pending verification",
    restockingFee: existing?.restockingFee || "Details pending verification",
    damageReportDeadline:
      existing?.damageReportDeadline ||
      "Contact support promptly after delivery; item-specific deadline pending verification",
    supplierReturnConditions:
      existing?.supplierReturnConditions || "Details pending verification",
    dutiesTreatment:
      existing?.dutiesTreatment ||
      "Estimated import charges, if any, may be collected separately at delivery",
    safetyWarning,
    imageSource,
    supplierInfoNotice:
      existing?.supplierInfoNotice ||
      "Product details are based partly on supplier-provided information and remain subject to verification",
    revision: Number(existing?.revision || 0) + 1,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

function withAvailability(product) {
  const record = clone(product);
  const inventory = record.inventory || {};
  const availableQuantity =
    inventory.mode === "stocked"
      ? Math.max(0, Number(inventory.onHand || 0) - Number(inventory.reserved || 0))
      : null;
  const isPurchasable =
    record.lifecycleStatus === "published" &&
    inventory.mode !== "unavailable" &&
    (inventory.mode !== "stocked" || availableQuantity > 0);
  return {
    ...record,
    availableQuantity,
    isPurchasable,
    maxQty:
      inventory.mode === "stocked"
        ? Math.max(0, Math.min(Number(inventory.maxPerOrder || 20), availableQuantity))
        : Number(inventory.maxPerOrder || 20),
  };
}

export async function listAdminProducts() {
  if (isDatabaseEnabled()) {
    return (await productRepo.listProducts()).map(withAvailability);
  }
  return readStore()
    .products.filter((product) => !product.deletedAt)
    .map(withAvailability);
}

export async function listPublishedProducts() {
  if (isDatabaseEnabled()) {
    return (await productRepo.listProducts())
      .filter((product) => product.lifecycleStatus === "published" && isShopChannel(product))
      .map(withAvailability);
  }
  return readStore()
    .products.filter(
      (product) =>
        !product.deletedAt &&
        product.lifecycleStatus === "published" &&
        isShopChannel(product)
    )
    .map(withAvailability);
}

function toPublicEditorialProduct(product) {
  const mapped = storeProductToEditorialPublic(product);
  // Never expose cost/finance fields on public catalog.
  return mapped;
}

export async function listPublishedEditorialProducts() {
  const mode = editorialSourceMode();
  if (mode === "json") {
    return loadEditorialJsonProducts();
  }

  if (isDatabaseEnabled()) {
    const fromDb = (await productRepo.listProducts())
      .filter(
        (product) =>
          !product.deletedAt &&
          product.lifecycleStatus === "published" &&
          isEditorialChannel(product)
      )
      .map(toPublicEditorialProduct);
    if (mode === "db" || fromDb.length > 0) {
      return fromDb;
    }
  } else {
    const fromFile = readStore()
      .products.filter(
        (product) =>
          !product.deletedAt &&
          product.lifecycleStatus === "published" &&
          isEditorialChannel(product)
      )
      .map(toPublicEditorialProduct);
    if (mode === "db" || fromFile.length > 0) {
      return fromFile;
    }
  }

  return loadEditorialJsonProducts();
}

/** Admin helper: include cost + margin when authorized upstream. */
export function withMarginFields(product) {
  if (!product) return product;
  const price = Number(product.price);
  const cost = product.costPrice == null ? null : Number(product.costPrice);
  if (cost == null || !Number.isFinite(cost) || !Number.isFinite(price)) {
    return { ...product, marginAmount: null, marginRate: null };
  }
  const marginAmount = Math.round((price - cost) * 100) / 100;
  const marginRate = price > 0 ? Math.round((marginAmount / price) * 10000) / 100 : null;
  return { ...product, marginAmount, marginRate };
}

export async function getManagedProduct(id, { includeDeleted = false } = {}) {
  if (isDatabaseEnabled()) {
    const product = await productRepo.getProduct(id, { includeDeleted });
    return product ? withAvailability(product) : null;
  }
  const product = readStore().products.find((entry) => entry.id === id);
  if (!product) return null;
  if (!includeDeleted && product.deletedAt) return null;
  return withAvailability(product);
}

/** JSON-store soft delete used by trash-store when DATABASE_URL is empty. */
export async function markProductDeleted(id, { actor = "", userId = null } = {}) {
  const data = readStore();
  const index = data.products.findIndex((product) => product.id === id);
  if (index < 0) return null;
  const previous = data.products[index];
  if (previous.deletedAt) return withAvailability(previous);
  const deletedAt = new Date().toISOString();
  data.products[index] = {
    ...previous,
    deletedAt,
    lifecycleStatus:
      previous.lifecycleStatus === "published" ? "archived" : previous.lifecycleStatus,
    updatedAt: deletedAt,
  };
  data.updatedAt = deletedAt;
  writeStore(data);

  const fs = await import("fs");
  const path = await import("path");
  const dir = runtimeDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, "deletion-records.json");
  let rows = [];
  if (fs.existsSync(file)) {
    try {
      rows = JSON.parse(fs.readFileSync(file, "utf8")).records || [];
    } catch {
      rows = [];
    }
  }
  const purgeAfter = new Date(deletedAt);
  purgeAfter.setUTCDate(purgeAfter.getUTCDate() + 7);
  rows.unshift({
    id: `del-${Date.now().toString(36)}`,
    entityType: "product",
    entityId: id,
    title: previous.zh?.name || previous.en?.name || id,
    snapshot: previous,
    deletedBy: actor,
    deletedByUserId: userId,
    deletedAt,
    purgeAfter: purgeAfter.toISOString(),
    restoredAt: null,
    purgedAt: null,
  });
  fs.writeFileSync(file, JSON.stringify({ records: rows }, null, 2), { mode: 0o600 });
  return withAvailability(data.products[index]);
}

export async function createManagedProduct(input) {
  const product = normalizeProductInput(input);
  if (isDatabaseEnabled()) {
    const existing = await productRepo.listProducts();
    if (existing.some((entry) => entry.id === product.id)) {
      throw new Error(`商品 ID「${product.id}」已存在，请换一个唯一编号。`);
    }
    const created = await productRepo.insertProduct(product);
    return withAvailability(created);
  }
  const data = readStore();
  if (data.products.some((entry) => entry.id === product.id)) {
    throw new Error(`商品 ID「${product.id}」已存在，请换一个唯一编号。`);
  }
  data.products.push(product);
  data.updatedAt = new Date().toISOString();
  writeStore(data);
  return withAvailability(product);
}

export async function updateManagedProduct(id, input) {
  if (isDatabaseEnabled()) {
    const existing = await productRepo.getProduct(id);
    if (!existing) return null;
    const product = normalizeProductInput(input, existing);
    const updated = await productRepo.upsertProduct(product);
    return withAvailability(updated);
  }
  const data = readStore();
  const index = data.products.findIndex((product) => product.id === id);
  if (index < 0) return null;
  const product = normalizeProductInput(input, data.products[index]);
  data.products[index] = product;
  data.updatedAt = new Date().toISOString();
  writeStore(data);
  return withAvailability(product);
}

export async function updateManagedInventory(id, input) {
  const current = await getManagedProduct(id);
  if (!current) return null;
  return updateManagedProduct(id, {
    ...current,
    inventory: {
      ...current.inventory,
      mode: input.mode ?? current.inventory.mode,
      onHand: input.onHand ?? current.inventory.onHand,
      reorderPoint: input.reorderPoint ?? current.inventory.reorderPoint,
      maxPerOrder: input.maxPerOrder ?? current.inventory.maxPerOrder,
    },
  });
}

export async function getProductForCheckout(id) {
  return getManagedProduct(id);
}

export async function renderPublicCatalogModule() {
  const published = await listPublishedProducts();
  const serialized = JSON.stringify(published).replace(/</g, "\\u003c");
  return [
    `export const PRODUCT_POLICY_VERSION = ${JSON.stringify(PRODUCT_POLICY_VERSION)};`,
    `export const products = ${serialized};`,
    "export function getProduct(id) { return products.find((product) => product.id === id); }",
    "",
  ].join("\n");
}

/** Seed Postgres from the in-memory catalog seed when the products table is empty. */
export async function seedProductsIfEmpty() {
  if (!isDatabaseEnabled()) return { seeded: false };
  const existing = await productRepo.listProducts();
  if (existing.length > 0) return { seeded: false, count: existing.length };
  const now = new Date().toISOString();
  for (const product of seedProducts) {
    await productRepo.upsertProduct(seedRecord({ ...product, channel: "shop" }, now));
  }
  return {
    seeded: true,
    count: seedProducts.length,
  };
}

function isNonPrintProduct(product) {
  if (productChannel(product) === "editorial") return true;
  if (EDITORIAL_COUNTRIES.has(product.collection)) return true;
  if (/^(ja|it|cn)-/i.test(product.id || "")) return true;
  return false;
}

/**
 * Historical helper: remove editorial rows from the commerce catalog.
 * Disabled by default so admin-managed editorial products persist.
 * Opt-in with ORBMARE_PURGE_NON_PRINT=1.
 */
export async function purgeNonPrintCatalog() {
  const result = { deleted: 0, renamed: 0, kept: 0, skipped: false };
  if (String(process.env.ORBMARE_PURGE_NON_PRINT || "") !== "1") {
    if (isDatabaseEnabled()) {
      result.kept = (await productRepo.listProducts()).length;
    } else {
      result.kept = readStore().products.length;
    }
    result.skipped = true;
    return result;
  }

  if (isDatabaseEnabled()) {
    const existing = await productRepo.listProducts();
    const toDelete = existing.filter(isNonPrintProduct).map((product) => product.id);
    if (toDelete.length) {
      result.deleted = await productRepo.deleteProductsByIds(toDelete);
    }
    result.kept = (await productRepo.listProducts()).length;
    return result;
  }

  const data = readStore();
  const kept = [];
  for (const product of data.products) {
    if (isNonPrintProduct(product)) {
      result.deleted += 1;
      continue;
    }
    kept.push(product);
  }
  data.products = kept;
  data.updatedAt = new Date().toISOString();
  writeStore(data);
  result.kept = kept.length;
  return result;
}

/** Idempotent seed of editorial JSON products into the managed store. */
export async function seedEditorialProductsFromJson({ overwrite = false } = {}) {
  const seeds = loadEditorialSeedProducts();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const seed of seeds) {
    const existing = await getManagedProduct(seed.id);
    if (existing && !overwrite) {
      skipped += 1;
      continue;
    }
    const record = {
      ...seed,
      channel: "editorial",
      lifecycleStatus: existing?.lifecycleStatus || seed.lifecycleStatus || "published",
      revision: existing ? Number(existing.revision || 0) + 1 : 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    if (isDatabaseEnabled()) {
      await productRepo.upsertProduct(record);
    } else {
      const data = readStore();
      const index = data.products.findIndex((row) => row.id === record.id);
      if (index >= 0) data.products[index] = record;
      else data.products.push(record);
      data.updatedAt = now;
      writeStore(data);
    }
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated, skipped, total: seeds.length };
}

/** @deprecated Editorial products are no longer stored in the commerce catalog. */
export async function ensureEditorialProductsSeeded() {
  return { inserted: 0, total: 0, skipped: true };
}
