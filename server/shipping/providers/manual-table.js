function cents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
}

function totalWeightGrams(items) {
  return items.reduce((sum, item) => {
    const grams = Number(item.policy?.weightGrams || item.checkout?.weightGrams || 250);
    return sum + grams * Number(item.qty || 1);
  }, 0);
}

function tierFee(tiers, grams, fallback) {
  const tier = (tiers || []).find((entry) => grams <= Number(entry.maxGrams || 0));
  return cents(tier?.fee ?? fallback);
}

function scaleFee(baseFee, multiplier) {
  return cents(baseFee * multiplier);
}

export function createManualTableShippingProvider() {
  return {
    id: "MANUAL_TABLE",
    async quote({ items, rule, quoteExpiresAt }) {
      const grams = totalWeightGrams(items);
      const base = tierFee(rule.weightTiers, grams, rule.fallbackShippingFee);
      const lanes = rule.shippingLanes || {};
      const options = [
        {
          serviceCode: `${rule.countryCode}_EXPRESS_AIR`,
          serviceName: "Express air",
          serviceNameZh: "国际空运快递",
          carrier: "FedEx / DHL / SF Express",
          shippingMode: "EXPRESS_AIR",
          shippingFee: scaleFee(base, lanes.expressAir?.feeMultiplier ?? 2.8),
          estimatedTransitDaysMin: lanes.expressAir?.daysMin ?? Math.max(2, rule.fallbackShippingDaysMin - 4),
          estimatedTransitDaysMax: lanes.expressAir?.daysMax ?? Math.max(4, rule.fallbackShippingDaysMax - 6),
          source: "MANUAL_TABLE",
          isEstimate: true,
          providerRateId: null,
          remoteAreaSurcharge: 0,
          warnings: ["CARRIER_API_NOT_CONFIGURED"],
        },
        {
          serviceCode: `${rule.countryCode}_STANDARD_AIR`,
          serviceName: "Standard air",
          serviceNameZh: "标准空运",
          carrier: "Orbmare logistics desk",
          shippingMode: "STANDARD_AIR",
          shippingFee: scaleFee(base, lanes.standardAir?.feeMultiplier ?? 1),
          estimatedTransitDaysMin: lanes.standardAir?.daysMin ?? rule.fallbackShippingDaysMin,
          estimatedTransitDaysMax: lanes.standardAir?.daysMax ?? rule.fallbackShippingDaysMax,
          source: "MANUAL_TABLE",
          isEstimate: true,
          providerRateId: null,
          remoteAreaSurcharge: 0,
          warnings: [],
        },
        {
          serviceCode: `${rule.countryCode}_ECONOMY_SEA`,
          serviceName: "Economy sea freight",
          serviceNameZh: "经济海运",
          carrier: "Orbmare consolidated freight",
          shippingMode: "ECONOMY_SEA",
          shippingFee: scaleFee(base, lanes.economySea?.feeMultiplier ?? 0.55),
          estimatedTransitDaysMin: lanes.economySea?.daysMin ?? 28,
          estimatedTransitDaysMax: lanes.economySea?.daysMax ?? 45,
          source: "MANUAL_TABLE",
          isEstimate: true,
          providerRateId: null,
          remoteAreaSurcharge: 0,
          warnings: ["SLOW_FREIGHT", "CONSOLIDATED_SHIPMENT"],
        },
      ];
      return options.map((option) => ({
        ...option,
        currency: rule.currency,
        quoteExpiresAt,
        packageWeightGrams: grams,
      }));
    },
  };
}
