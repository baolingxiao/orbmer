export const PRODUCT_TYPE_TEMPLATES = Object.freeze({
  apparel: {
    labelZh: "服装",
    labelEn: "Apparel",
    fields: [
      ["apparelSize", "尺码", "Size"],
      ["fit", "版型", "Fit"],
      ["recommendedHeight", "建议身高", "Recommended height"],
      ["recommendedWeight", "建议体重", "Recommended weight"],
      ["shoulder", "肩宽", "Shoulder"],
      ["chest", "胸围", "Chest"],
      ["garmentLength", "衣长", "Garment length"],
      ["sleeve", "袖长", "Sleeve"],
      ["waist", "腰围", "Waist"],
      ["care", "护理", "Care"],
    ],
  },
  jewelry: {
    labelZh: "首饰",
    labelEn: "Jewelry",
    fields: [
      ["jewelrySize", "尺寸", "Size"],
      ["chainLength", "链长", "Chain length"],
      ["ringSize", "戒指尺寸", "Ring size"],
      ["gemstone", "宝石", "Gemstone"],
      ["plating", "镀层", "Plating"],
      ["closure", "扣合方式", "Closure"],
    ],
  },
  furniture: {
    labelZh: "家具",
    labelEn: "Furniture",
    fields: [
      ["assembly", "安装方式", "Assembly"],
      ["seatHeight", "座高", "Seat height"],
      ["loadCapacity", "承重", "Load capacity"],
      ["finish", "表面处理", "Finish"],
      ["room", "适用空间", "Room"],
    ],
  },
  home: {
    labelZh: "家居",
    labelEn: "Home",
    fields: [
      ["capacity", "容量", "Capacity"],
      ["finish", "表面处理", "Finish"],
      ["room", "适用空间", "Room"],
    ],
  },
  stationery: {
    labelZh: "文具",
    labelEn: "Stationery",
    fields: [
      ["paperSize", "纸张尺寸", "Paper size"],
      ["pageCount", "页数", "Page count"],
      ["nib", "笔尖", "Nib"],
      ["ink", "墨水", "Ink"],
    ],
  },
  fragrance: {
    labelZh: "香水",
    labelEn: "Fragrance",
    fields: [
      ["volume", "容量", "Volume"],
      ["concentration", "浓度", "Concentration"],
      ["topNotes", "前调", "Top notes"],
      ["heartNotes", "中调", "Heart notes"],
      ["baseNotes", "后调", "Base notes"],
    ],
  },
  tech: {
    labelZh: "科技",
    labelEn: "Tech",
    fields: [
      ["compatibility", "兼容性", "Compatibility"],
      ["power", "供电", "Power"],
      ["connectivity", "连接方式", "Connectivity"],
      ["warranty", "保修", "Warranty"],
    ],
  },
  art: {
    labelZh: "艺术 / 收藏",
    labelEn: "Art / Collectible",
    fields: [
      ["edition", "版数", "Edition"],
      ["signature", "签名", "Signature"],
      ["framing", "装裱", "Framing"],
      ["certificate", "证书", "Certificate"],
    ],
  },
  tool: {
    labelZh: "工具",
    labelEn: "Tool",
    fields: [
      ["useCase", "用途", "Use case"],
      ["hardness", "硬度", "Hardness"],
      ["handleMaterial", "手柄材料", "Handle material"],
      ["maintenance", "维护", "Maintenance"],
    ],
  },
  object: {
    labelZh: "通用物件",
    labelEn: "Object",
    fields: [
      ["useCase", "用途", "Use case"],
      ["finish", "表面处理", "Finish"],
    ],
  },
});

export const BASE_DIMENSION_FIELDS = Object.freeze([
  ["length", "长", "Length"],
  ["width", "宽", "Width"],
  ["height", "高", "Height"],
  ["depth", "深", "Depth"],
  ["diameter", "直径", "Diameter"],
  ["weight", "重量", "Weight"],
]);

export const APPAREL_SIZE_FIELDS = Object.freeze([
  ["apparelSize", "尺码", "Size"],
  ["recommendedHeight", "建议身高", "Recommended height"],
  ["recommendedWeight", "建议体重", "Recommended weight"],
  ["shoulder", "肩宽", "Shoulder"],
  ["chest", "胸围", "Chest"],
  ["garmentLength", "衣长", "Garment length"],
  ["sleeve", "袖长", "Sleeve"],
  ["waist", "腰围", "Waist"],
]);

export function productTypeLabel(type = "object", lang = "zh") {
  const template = PRODUCT_TYPE_TEMPLATES[type] || PRODUCT_TYPE_TEMPLATES.object;
  return lang === "en" ? template.labelEn : template.labelZh;
}

export function productTypeFields(type = "object") {
  return PRODUCT_TYPE_TEMPLATES[type]?.fields || PRODUCT_TYPE_TEMPLATES.object.fields;
}

export function serializeDimensions(dimensions = {}, legacy = "") {
  const parts = [];
  const length = dimensions.length || "";
  const width = dimensions.width || "";
  const height = dimensions.height || "";
  const depth = dimensions.depth || "";
  const diameter = dimensions.diameter || "";
  const weight = dimensions.weight || "";
  if (length || width || height) {
    parts.push([length, width, height].filter(Boolean).join(" × ") + (dimensions.unit ? ` ${dimensions.unit}` : ""));
  }
  if (depth) parts.push(`Depth ${depth}${dimensions.unit ? ` ${dimensions.unit}` : ""}`);
  if (diameter) parts.push(`Ø ${diameter}${dimensions.unit ? ` ${dimensions.unit}` : ""}`);
  if (weight) parts.push(`${weight}${dimensions.weightUnit ? ` ${dimensions.weightUnit}` : ""}`);
  return parts.filter(Boolean).join(" · ") || legacy || "";
}

export function specsToRows({ productType = "object", dimensionsStructured = {}, productAttributes = {} } = {}, lang = "zh") {
  const labels = new Map([...BASE_DIMENSION_FIELDS, ...productTypeFields(productType), ...APPAREL_SIZE_FIELDS].map(([key, zh, en]) => [key, lang === "en" ? en : zh]));
  const rows = [];
  for (const [key, value] of Object.entries(dimensionsStructured || {})) {
    if (["unit", "weightUnit"].includes(key) || !value) continue;
    rows.push({ label: labels.get(key) || key, value: `${value}${key === "weight" && dimensionsStructured.weightUnit ? ` ${dimensionsStructured.weightUnit}` : key !== "weight" && dimensionsStructured.unit ? ` ${dimensionsStructured.unit}` : ""}` });
  }
  const sizeOptions = Array.isArray(productAttributes?.sizeOptions) ? productAttributes.sizeOptions : [];
  sizeOptions.forEach((option, index) => {
    const sizeName = option.apparelSize || option.size || `${lang === "en" ? "Size" : "尺码"} ${index + 1}`;
    const detail = APPAREL_SIZE_FIELDS
      .filter(([key]) => key !== "apparelSize")
      .map(([key]) => [labels.get(key), option[key]])
      .filter(([, value]) => value)
      .map(([label, value]) => `${label}: ${value}`)
      .join(" · ");
    rows.push({
      label: `${lang === "en" ? "Size" : "尺码"} ${sizeName}`,
      value: detail || sizeName,
    });
  });
  for (const [key, value] of Object.entries(productAttributes || {})) {
    if (key === "sizeOptions") continue;
    if (!value) continue;
    rows.push({ label: labels.get(key) || key, value });
  }
  return rows;
}
