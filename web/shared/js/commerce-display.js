const LANG = {
  zh: "zh",
  en: "en",
};

export const RETURN_POLICY_DISPLAY = Object.freeze({
  STANDARD: {
    zh: {
      title: "标准退货",
      summary: "按适用售后政策处理。",
      description: "如果商品符合退货条件，Orbmare 会按订单对应的售后政策协助处理。",
    },
    en: {
      title: "Standard returns",
      summary: "Handled under the applicable return policy.",
      description: "If the item is eligible, Orbmare will help under the return policy attached to the order.",
    },
  },
  MADE_TO_ORDER: {
    zh: {
      title: "按订单采购（Made to Order）",
      summary: "按订单采购（Made to Order）",
      description:
        "此商品会在订单确认后为你采购、预留或制作，因此因个人偏好改变通常不支持退货；若商品损坏、错发或与描述存在实质性差异，Orbmare 会协助处理。",
    },
    en: {
      title: "Made to Order",
      summary: "Sourced or prepared after order confirmation.",
      description:
        "This item is sourced, reserved, or made after order confirmation, so returns for a change of preference are usually not supported. If the item arrives damaged, incorrect, or materially different from its description, Orbmare will help resolve it.",
    },
  },
  CUSTOMIZED: {
    zh: {
      title: "定制商品",
      summary: "按你的选择制作或调整。",
      description:
        "此商品会根据你的选择制作或调整，因此因个人偏好改变通常不支持退货；若商品损坏、错发或与描述存在实质性差异，Orbmare 会协助处理。",
    },
    en: {
      title: "Customized item",
      summary: "Made or adjusted to your selection.",
      description:
        "This item is made or adjusted to your selection, so returns for a change of preference are usually not supported. If it arrives damaged, incorrect, or materially different from its description, Orbmare will help resolve it.",
    },
  },
  FINAL_SALE: {
    zh: {
      title: "特殊售后条款",
      summary: "售后范围以订单条款为准。",
      description:
        "此商品适用订单专属售后条款；若商品损坏、错发或与描述存在实质性差异，Orbmare 会协助处理。",
    },
    en: {
      title: "Order-specific sale terms",
      summary: "After-sales handling follows the order terms.",
      description:
        "This item follows order-specific after-sales terms. If it arrives damaged, incorrect, or materially different from its description, Orbmare will help resolve it.",
    },
  },
});

export const INCOTERM_DISPLAY = Object.freeze({
  DAP: {
    zh: {
      customerTitle: "进口费用可能由当地收取",
      detailTitle: "DAP（Delivered at Place）",
      description:
        "Orbmare 安排商品运送至收货地；根据收货国家或地区，关税、进口税或清关费用可能由当地海关或承运商另行收取。",
    },
    en: {
      customerTitle: "Import costs may be collected locally",
      detailTitle: "DAP (Delivered at Place)",
      description:
        "Orbmare arranges delivery to the destination. Depending on the destination country or region, duties, import taxes, or clearance charges may be collected separately by customs or the carrier.",
    },
  },
  DDP: {
    zh: {
      customerTitle: "进口费用已包含",
      detailTitle: "DDP（Delivered Duty Paid）",
      description: "订单显示的应付金额已包含 Orbmare 代收的预计进口费用。",
    },
    en: {
      customerTitle: "Import costs included",
      detailTitle: "DDP (Delivered Duty Paid)",
      description: "The amount due now includes estimated import costs collected by Orbmare.",
    },
  },
});

export const TAX_STATUS_DISPLAY = Object.freeze({
  PENDING_ADDRESS: {
    zh: { label: "等待完整地址", description: "填写完整地址后，税费与进口费用状态会继续更新。" },
    en: { label: "Waiting for full address", description: "Tax and import-cost status will update after the full address is entered." },
  },
  PENDING_PROVIDER: {
    zh: { label: "等待服务商计算", description: "税费服务商还在计算或同步，结账页会显示当前可用结果。" },
    en: { label: "Waiting for provider", description: "The tax provider is still calculating or syncing the available result." },
  },
  INCLUDED: {
    zh: { label: "已包含", description: "这部分费用已包含在当前应付金额中。" },
    en: { label: "Included", description: "This cost is included in the amount due now." },
  },
  PAY_ON_DELIVERY: {
    zh: { label: "到货时可能支付", description: "当地海关或承运商可能在送达前后收取相关费用。" },
    en: { label: "May be due on delivery", description: "Customs or the carrier may collect related charges before or after delivery." },
  },
  NOT_APPLICABLE: {
    zh: { label: "暂未单独收取", description: "Orbmare 当前没有在结账时单独收取这项费用。" },
    en: { label: "Not collected separately", description: "Orbmare is not collecting this cost separately at checkout." },
  },
});

function locale(value = "zh") {
  return value === LANG.en ? LANG.en : LANG.zh;
}

export function returnPolicyDisplay(type, lang = "zh") {
  const key = RETURN_POLICY_DISPLAY[type] ? type : "STANDARD";
  return RETURN_POLICY_DISPLAY[key][locale(lang)];
}

export function returnPolicyListDisplay(types = [], lang = "zh") {
  const unique = [...new Set((types || []).filter(Boolean))];
  return (unique.length ? unique : ["STANDARD"]).map((type) => returnPolicyDisplay(type, lang));
}

export function incotermDisplay(incoterm, lang = "zh") {
  return (INCOTERM_DISPLAY[incoterm] || INCOTERM_DISPLAY.DAP)[locale(lang)];
}

export function taxStatusDisplay(status, lang = "zh", context = {}) {
  if (context.incoterm === "DAP" && status === "NOT_APPLICABLE") {
    return locale(lang) === "zh"
      ? {
          label: "可能产生（May apply）",
          description:
            "根据收货国家或地区，关税、进口税或清关费用可能由当地海关或承运商另行收取。",
        }
      : {
          label: "May apply",
          description:
            "Depending on the destination country or region, duties, import taxes, or clearance charges may be collected separately by customs or the carrier.",
        };
  }
  return (TAX_STATUS_DISPLAY[status] || TAX_STATUS_DISPLAY.NOT_APPLICABLE)[locale(lang)];
}

export function validateFulfillmentRule(rule = {}) {
  const warnings = [];
  if (rule.incoterm === "DAP" && rule.taxCalculationMode === "NOT_APPLICABLE") {
    warnings.push({
      code: "DAP_TAX_NOT_APPLICABLE",
      message:
        "DAP 默认不应搭配 NOT_APPLICABLE。若确实不在结账时收税，也应向客户显示“可能产生”，避免误导为完全不适用。",
    });
  }
  return warnings;
}
