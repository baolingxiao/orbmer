import { randomUUID } from "crypto";
import {
  COUNTRY_FULFILLMENT_RULES,
  LANDED_COST_RULE_VERSION,
  ORDER_TERMS,
  ORDER_TERMS_VERSION,
  SHIPPING_RULE_VERSION,
  SUPPORTED_COUNTRIES,
  TAX_RULE_VERSION,
} from "./checkout-config.js";
import { resolveTrustedItems, POLICY_VERSIONS } from "./checkout-products.js";
import { getShippingOptions, selectShippingOption } from "./shipping/index.js";

const QUOTE_TTL_MS = 15 * 60 * 1000;
const BUFFER_DAYS = 2;
const quotes = new Map();

function asText(value, max = 200) {
  return String(value ?? "").trim().slice(0, max);
}

function cents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function countryCode(value) {
  return asText(value, 2).toUpperCase();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + Number(days || 0));
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function localeFrom(value) {
  return value === "en" ? "en" : "zh";
}

function normalizeAddress(input = {}) {
  return {
    country: countryCode(input.country || input.countryCode || "US"),
    fullName: asText(input.fullName ?? input.name, 120),
    company: asText(input.company, 120),
    addressLine1: asText(input.addressLine1 ?? input.line1, 180),
    addressLine2: asText(input.addressLine2 ?? input.line2, 180),
    city: asText(input.city, 100),
    stateProvinceRegion: asText(input.stateProvinceRegion ?? input.region, 100),
    postalCode: asText(input.postalCode ?? input.postal, 32),
    phone: asText(input.phone, 40),
  };
}

function productCheckoutMeta(item) {
  const policy = item.policy || {};
  const originCountry = policy.originCountry || policy.sourceCountry || "China";
  const inventoryStatus = policy.inventoryStatus || "SOURCE_AFTER_ORDER";
  const returnPolicyType =
    policy.returnPolicyType ||
    (policy.finalSale ? "FINAL_SALE" : policy.customizedProduct ? "CUSTOMIZED" : "MADE_TO_ORDER");
  return {
    originCountry,
    supplierProcessingDaysMin: Number(policy.supplierProcessingDaysMin || 3),
    supplierProcessingDaysMax: Number(policy.supplierProcessingDaysMax || 10),
    procurementDaysMin: Number(policy.procurementDaysMin || 2),
    procurementDaysMax: Number(policy.procurementDaysMax || 5),
    madeToOrder: policy.madeToOrder ?? inventoryStatus !== "STOCKED",
    customizedProduct: Boolean(policy.customizedProduct),
    finalSale: policy.finalSale ?? returnPolicyType !== "STANDARD",
    returnPolicyType,
    hsCode: policy.hsCode || "6214.10",
    stripeTaxCode: policy.stripeTaxCode || "txcd_99999999",
    weightGrams: Number(policy.weightGrams || 250),
    lengthCm: Number(policy.lengthCm || 24),
    widthCm: Number(policy.widthCm || 18),
    heightCm: Number(policy.heightCm || 3),
    declaredValue: cents(policy.declaredValueCents ?? item.lineAmountCents),
    inventoryStatus,
    shippingRestrictions: Array.isArray(policy.shippingRestrictions) ? policy.shippingRestrictions : [],
    dangerousGoods: Boolean(policy.dangerousGoods),
    materialComposition: policy.materialComposition || "",
    supplierId: policy.supplierId || "",
    fulfillmentProfileId: policy.fulfillmentProfileId || "cross_border_standard",
  };
}

function validateAddress(address, rule) {
  const requirements = rule?.addressRequirements || {};
  const missing = [];
  for (const field of requirements.required || []) {
    if (!address[field]) missing.push(field);
  }
  let postalValid = true;
  if (address.postalCode && requirements.postalPattern) {
    postalValid = new RegExp(requirements.postalPattern, "i").test(address.postalCode);
  }
  return {
    complete: missing.length === 0,
    missing,
    postalValid,
    regionLabel: requirements.regionLabel,
    postalLabel: requirements.postalLabel,
  };
}

function quoteTax({ address, rule, stripeTaxConfigured }) {
  if (!address.addressLine1 || !address.city || !address.postalCode) {
    return {
      tax: 0,
      status: "PENDING_ADDRESS",
      provider: "STRIPE_TAX",
      calculationId: null,
      snapshot: { version: TAX_RULE_VERSION, reason: "incomplete_address" },
    };
  }
  if (rule.taxCalculationMode === "NOT_APPLICABLE") {
    return {
      tax: 0,
      status: "NOT_APPLICABLE",
      provider: "NOT_APPLICABLE",
      calculationId: null,
      snapshot: { version: TAX_RULE_VERSION },
    };
  }
  if (!stripeTaxConfigured) {
    return {
      tax: 0,
      status: "PENDING_PROVIDER",
      provider: "STRIPE_TAX",
      calculationId: null,
      snapshot: { version: TAX_RULE_VERSION, reason: "stripe_tax_not_configured" },
    };
  }
  return {
    tax: 0,
    status: "PENDING_PROVIDER",
    provider: "STRIPE_TAX",
    calculationId: null,
    snapshot: { version: TAX_RULE_VERSION, reason: "stripe_tax_adapter_pending" },
  };
}

function quoteLandedCost(items, rule) {
  const declaredValue = items.reduce((sum, item) => sum + item.lineAmountCents, 0);
  const settings = rule.landedCost || {};
  const estimatedDuty = Math.round((declaredValue * Number(settings.dutyRateBps || 0)) / 10000);
  const estimatedImportTax = Math.round((declaredValue * Number(settings.importTaxRateBps || 0)) / 10000);
  const brokerageFee = cents(settings.brokerageFee);
  const customsProcessingFee = cents(settings.customsProcessingFee);
  const totalLandedCost = estimatedDuty + estimatedImportTax + brokerageFee + customsProcessingFee;
  const included = rule.incoterm === "DDP";
  return {
    estimatedDuty,
    estimatedImportTax,
    brokerageFee,
    customsProcessingFee,
    totalLandedCost,
    status: totalLandedCost === 0 ? "NOT_APPLICABLE" : included ? "INCLUDED" : "PAY_ON_DELIVERY",
    disclaimer:
      rule.incoterm === "DDP"
        ? "Estimated import costs are included in the amount due now."
        : "Estimated import costs are not collected by Orbmare and may be charged by customs or the carrier at delivery.",
    calculationSource: "MANUAL_RULE_TABLE",
    ruleVersion: LANDED_COST_RULE_VERSION,
  };
}

function fulfillmentEstimate(items, shippingQuote, rule) {
  const maxProcurementMin = Math.max(...items.map((item) => productCheckoutMeta(item).procurementDaysMin));
  const maxProcurementMax = Math.max(...items.map((item) => productCheckoutMeta(item).procurementDaysMax));
  const maxSupplierMin = Math.max(...items.map((item) => productCheckoutMeta(item).supplierProcessingDaysMin));
  const maxSupplierMax = Math.max(...items.map((item) => productCheckoutMeta(item).supplierProcessingDaysMax));
  const transitMin = Number(shippingQuote.estimatedTransitDaysMin || rule.fallbackShippingDaysMin);
  const transitMax = Number(shippingQuote.estimatedTransitDaysMax || rule.fallbackShippingDaysMax);
  const customsMin = Number(rule.estimatedCustomsDaysMin || 0);
  const customsMax = Number(rule.estimatedCustomsDaysMax || 0);
  const start = new Date();
  const minDays = maxProcurementMin + maxSupplierMin + transitMin + customsMin + BUFFER_DAYS;
  const maxDays = maxProcurementMax + maxSupplierMax + transitMax + customsMax + BUFFER_DAYS;
  return {
    estimatedStartDate: isoDate(addDays(start, minDays)),
    estimatedEndDate: isoDate(addDays(start, maxDays)),
    isEstimate: true,
    stageBreakdown: [
      { id: "procurement", daysMin: maxProcurementMin, daysMax: maxProcurementMax },
      { id: "supplier_processing", daysMin: maxSupplierMin, daysMax: maxSupplierMax },
      { id: "shipping_customs", daysMin: transitMin + customsMin, daysMax: transitMax + customsMax },
      { id: "buffer", daysMin: BUFFER_DAYS, daysMax: BUFFER_DAYS },
    ],
  };
}

function policyForItems(items, locale, rule, landedCost) {
  const terms = ORDER_TERMS[locale] || ORDER_TERMS.en;
  const returnPolicyTypes = [...new Set(items.map((item) => productCheckoutMeta(item).returnPolicyType))];
  return {
    policyVersion: ORDER_TERMS_VERSION,
    policyLocale: locale,
    returnPolicyTypes,
    dutiesAcknowledgementRequired: landedCost.status === "PAY_ON_DELIVERY",
    finalSaleAcknowledgementRequired: returnPolicyTypes.some((type) => type !== "STANDARD"),
    incoterm: rule.incoterm,
    acknowledgement: terms.acknowledgement,
    policyText: terms.policy,
    links: [
      { id: "shipping", href: "/legal/shipping.html" },
      { id: "returns", href: "/legal/returns.html" },
      { id: "customs", href: "/legal/customs.html" },
      { id: "contact", href: "/legal/contact.html" },
    ],
  };
}

function decorateItems(items) {
  return items.map((item) => {
    const meta = productCheckoutMeta(item);
    return {
      ...item,
      checkout: meta,
      policy: {
        ...item.policy,
        ...meta,
      },
    };
  });
}

function cleanupQuotes() {
  const now = Date.now();
  for (const [id, quote] of quotes.entries()) {
    if (Date.parse(quote.quoteExpiresAt) < now) quotes.delete(id);
  }
}

export function listCheckoutCountries() {
  return SUPPORTED_COUNTRIES.map((rule) => ({
    countryCode: rule.countryCode,
    enabled: rule.enabled,
    currency: rule.currency,
    incoterm: rule.incoterm,
    addressRequirements: rule.addressRequirements,
  }));
}

export async function createCheckoutQuote({
  items,
  destinationAddress,
  selectedShippingMethod = "",
  locale = "zh",
  currency = "USD",
  stripeTaxConfigured = false,
} = {}) {
  cleanupQuotes();
  const language = localeFrom(locale);
  const address = normalizeAddress(destinationAddress);
  const rule = COUNTRY_FULFILLMENT_RULES[address.country];
  if (!rule) {
    return {
      ok: false,
      code: "UNSUPPORTED_COUNTRY",
      error: "Unsupported destination country.",
      countries: listCheckoutCountries(),
    };
  }
  if (!rule.enabled) {
    return {
      ok: false,
      code: "SHIPPING_UNAVAILABLE",
      error: "This destination is not currently enabled for checkout.",
      destinationCountry: address.country,
      countries: listCheckoutCountries(),
    };
  }

  const trusted = decorateItems(await resolveTrustedItems(items));
  const addressValidation = validateAddress(address, rule);
  const restricted = trusted.find((item) => {
    const meta = productCheckoutMeta(item);
    return (
      meta.dangerousGoods ||
      meta.shippingRestrictions.includes(address.country) ||
      rule.restrictedCategories.includes(item.policy?.category)
    );
  });
  if (restricted) {
    return {
      ok: false,
      code: "RESTRICTED_PRODUCT",
      error: "One or more items cannot ship to this destination.",
      productId: restricted.productId,
      destinationCountry: address.country,
    };
  }

  const subtotal = trusted.reduce((sum, item) => sum + item.lineAmountCents, 0);
  const serviceFee = 0;
  const shippingQuoteExpiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();
  const shippingOptions = await getShippingOptions({
    items: trusted,
    address,
    rule,
    quoteExpiresAt: shippingQuoteExpiresAt,
  });
  const shippingQuote = selectShippingOption(shippingOptions, selectedShippingMethod);
  if (!shippingQuote) {
    return {
      ok: false,
      code: "SHIPPING_UNAVAILABLE",
      error: "No shipping method is currently available for this order.",
      destinationCountry: address.country,
    };
  }
  const taxQuote = quoteTax({ address, rule, stripeTaxConfigured });
  const landedCost = quoteLandedCost(trusted, rule);
  const fulfillment = fulfillmentEstimate(trusted, shippingQuote, rule);
  const discount = 0;
  const dutyDueNow = rule.incoterm === "DDP" ? landedCost.totalLandedCost : 0;
  const amountDueNow =
    subtotal + serviceFee + shippingQuote.shippingFee + taxQuote.tax + dutyDueNow - discount;
  const amountPotentiallyDueOnDelivery = rule.incoterm === "DAP" ? landedCost.totalLandedCost : 0;
  const quoteId = `quote_${randomUUID()}`;
  const quoteExpiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();
  const policies = policyForItems(trusted, language, rule, landedCost);
  const warnings = [];
  if (!addressValidation.complete) warnings.push({ code: "INCOMPLETE_ADDRESS", fields: addressValidation.missing });
  if (!addressValidation.postalValid) warnings.push({ code: "INVALID_POSTAL_CODE" });
  if (taxQuote.status === "PENDING_PROVIDER") warnings.push({ code: "TAX_PENDING" });
  if (landedCost.status === "PAY_ON_DELIVERY") warnings.push({ code: "DUTY_PAY_ON_DELIVERY" });
  if (shippingQuote.isEstimate) warnings.push({ code: "SHIPPING_ESTIMATED" });
  for (const warning of shippingQuote.warnings || []) warnings.push({ code: warning });

  const quote = {
    ok: true,
    quoteId,
    quoteExpiresAt,
    selectedShippingMethod: shippingQuote.serviceCode,
    lineItems: trusted,
    subtotal,
    serviceFee,
    shipping: shippingQuote.shippingFee,
    tax: taxQuote.tax,
    duty: landedCost.estimatedDuty,
    importTax: landedCost.estimatedImportTax,
    customsFee: landedCost.brokerageFee + landedCost.customsProcessingFee,
    discount,
    amountDueNow,
    amountPotentiallyDueOnDelivery,
    currency: currency === rule.currency ? currency : rule.currency,
    destinationAddress: address,
    countryRule: {
      countryCode: rule.countryCode,
      incoterm: rule.incoterm,
      shippingMode: rule.shippingMode,
      taxCalculationMode: rule.taxCalculationMode,
      dutyCalculationMode: rule.dutyCalculationMode,
      addressRequirements: rule.addressRequirements,
    },
    addressValidation,
    shippingOptions,
    shippingQuote,
    taxQuote,
    landedCost,
    fulfillmentEstimate: fulfillment,
    policies,
    warnings,
    ruleVersions: {
      shipping: SHIPPING_RULE_VERSION,
      tax: TAX_RULE_VERSION,
      landedCost: LANDED_COST_RULE_VERSION,
      orderTerms: ORDER_TERMS_VERSION,
      catalogPolicies: POLICY_VERSIONS,
    },
  };
  quotes.set(quoteId, quote);
  return quote;
}

export function getStoredQuote(quoteId) {
  cleanupQuotes();
  const quote = quotes.get(asText(quoteId, 80));
  if (!quote) return null;
  if (Date.parse(quote.quoteExpiresAt) <= Date.now()) {
    quotes.delete(quote.quoteId);
    return null;
  }
  return quote;
}

export function buildConsentSnapshot({ quote, locale, accepted }) {
  if (!quote?.policies) throw new Error("Quote policies are required.");
  if (accepted !== true) throw new Error("Required order acknowledgement was not provided.");
  return {
    policyVersions: POLICY_VERSIONS,
    policyVersion: quote.policies.policyVersion,
    policyLocale: localeFrom(locale),
    policySnapshot: quote.policies,
    orderTermsSnapshot: {
      lineItems: quote.lineItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        nameEn: item.nameEn,
        nameZh: item.nameZh,
        returnPolicyType: item.policy.returnPolicyType,
        finalSale: item.policy.finalSale,
        madeToOrder: item.policy.madeToOrder,
        customizedProduct: item.policy.customizedProduct,
        originCountry: item.policy.originCountry,
        hsCode: item.policy.hsCode,
      })),
      fulfillmentEstimate: quote.fulfillmentEstimate,
      landedCost: quote.landedCost,
      amountDueNow: quote.amountDueNow,
      amountPotentiallyDueOnDelivery: quote.amountPotentiallyDueOnDelivery,
      quoteId: quote.quoteId,
      quoteExpiresAt: quote.quoteExpiresAt,
    },
    dutiesAcknowledged: quote.policies.dutiesAcknowledgementRequired,
    finalSaleAcknowledged: quote.policies.finalSaleAcknowledgementRequired,
  };
}
