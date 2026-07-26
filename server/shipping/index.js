import { createManualTableShippingProvider } from "./providers/manual-table.js";

const providers = [createManualTableShippingProvider()];

function serviceRank(option) {
  const ranks = {
    EXPRESS_AIR: 10,
    STANDARD_AIR: 20,
    ECONOMY_SEA: 30,
  };
  return ranks[option.shippingMode] || 99;
}

export async function getShippingOptions(input) {
  const results = [];
  for (const provider of providers) {
    const quoted = await provider.quote(input).catch((error) => [
      {
        serviceCode: `${provider.id}_UNAVAILABLE`,
        serviceName: provider.id,
        serviceNameZh: provider.id,
        carrier: provider.id,
        shippingMode: "UNAVAILABLE",
        shippingFee: 0,
        currency: input.rule.currency,
        estimatedTransitDaysMin: input.rule.fallbackShippingDaysMin,
        estimatedTransitDaysMax: input.rule.fallbackShippingDaysMax,
        quoteExpiresAt: input.quoteExpiresAt,
        source: provider.id,
        isEstimate: true,
        providerRateId: null,
        remoteAreaSurcharge: 0,
        warnings: ["PROVIDER_FAILED"],
        error: error.message || "Provider unavailable",
      },
    ]);
    results.push(...quoted);
  }
  return results
    .filter((option) => option.shippingMode !== "UNAVAILABLE")
    .sort((left, right) => serviceRank(left) - serviceRank(right) || left.shippingFee - right.shippingFee);
}

export function selectShippingOption(options, selectedShippingMethod) {
  if (!options.length) return null;
  const selected = options.find((option) => option.serviceCode === selectedShippingMethod);
  return selected || options.find((option) => option.shippingMode === "STANDARD_AIR") || options[0];
}
