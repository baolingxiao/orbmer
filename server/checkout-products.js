import { PRODUCT_POLICY_VERSION } from "../web/shared/js/catalog.js";
import { getProductForCheckout, purchaseVariants } from "./product-store.js";

export const POLICY_VERSIONS = Object.freeze({
  terms: "terms-2026-07-23",
  purchasingService: "purchasing-service-2026-07-23",
  privacy: "privacy-2026-07-23",
  shipping: "shipping-2026-07-23",
  returns: "returns-2026-07-23",
  customs: "customs-2026-07-23",
  productPolicy: PRODUCT_POLICY_VERSION,
});

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

    const variants = purchaseVariants(product);
    const variant = variants.find((entry) => entry.id === requested.variantId);
    if (!variant) throw new Error(`Invalid option for ${product.id}`);
    const unitAmountCents = Math.round(Number(variant.price) * 100);
    if (!Number.isInteger(unitAmountCents) || unitAmountCents < 50) {
      throw new Error(`Invalid server price for ${product.id}`);
    }

    const checkout = product.checkout || {};
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
        originCountry: checkout.originCountry || product.sourceCountry,
        returnWindowDays: product.returnWindowDays,
        returnEligible: product.returnEligible,
        cancellationDeadline: product.cancellationDeadline,
        finalSale: product.finalSale,
        dutiesTreatment: product.dutiesTreatment,
        sourceType: product.sourceType,
        processingTime: product.processingTime,
        internationalShippingTime: product.internationalShippingTime,
        returnPolicyType: checkout.returnPolicyType,
        supplierProcessingDaysMin: checkout.supplierProcessingDaysMin,
        supplierProcessingDaysMax: checkout.supplierProcessingDaysMax,
        procurementDaysMin: checkout.procurementDaysMin,
        procurementDaysMax: checkout.procurementDaysMax,
        madeToOrder: checkout.madeToOrder,
        customizedProduct: checkout.customizedProduct,
        hsCode: checkout.hsCode,
        stripeTaxCode: checkout.stripeTaxCode,
        weightGrams: checkout.weightGrams,
        lengthCm: checkout.lengthCm,
        widthCm: checkout.widthCm,
        heightCm: checkout.heightCm,
        declaredValueCents: checkout.declaredValueCents,
        inventoryStatus: checkout.inventoryStatus,
        shippingRestrictions: checkout.shippingRestrictions,
        dangerousGoods: checkout.dangerousGoods,
        materialComposition: checkout.materialComposition || product.material,
        supplierId: checkout.supplierId,
        fulfillmentProfileId: checkout.fulfillmentProfileId || product.shipping?.profile,
        category: product.category,
      },
    });
  }
  return resolved;
}
