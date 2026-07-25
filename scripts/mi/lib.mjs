/** Shared helpers for Material Intelligence dossier generation */

export const UNVERIFIED = {
  zh: "暂无可靠公开证据",
  en: "No reliably verifiable public evidence found",
};

export function src(id, title, year, url, noteZh, note) {
  return {
    id,
    title,
    year: year || null,
    url: url || null,
    note: note || null,
    noteZh: noteZh || null,
  };
}

export function claim(text, textZh, evidence, sourceIds = [], caveatZh = null, caveat = null) {
  return {
    text,
    textZh,
    evidence, // verified | inferred | unverified
    sourceIds,
    caveat,
    caveatZh,
  };
}

export function metric(key, label, labelZh, score, evidence = "inferred", note = "", noteZh = "") {
  return {
    key,
    label,
    labelZh,
    score: Math.max(0, Math.min(100, score)),
    evidence,
    note,
    noteZh,
  };
}

export function factor(key, label, labelZh, weight, body, bodyZh, evidence = "inferred", sourceIds = []) {
  return {
    key,
    label,
    labelZh,
    weight,
    body,
    bodyZh,
    evidence,
    sourceIds,
  };
}

export function localePair(en, zh) {
  return { en, zh };
}

/** Relative textile index — not a lab certificate. Always mark inferred. */
export const TEXTILE_AXES = [
  { key: "breathability", label: "Breathability", labelZh: "透气" },
  { key: "moisture", label: "Moisture handling", labelZh: "吸湿排湿" },
  { key: "strength", label: "Tensile character", labelZh: "强度" },
  { key: "abrasion", label: "Abrasion resistance", labelZh: "耐磨" },
  { key: "handfeel", label: "Hand / softness", labelZh: "手感" },
  { key: "thermal", label: "Thermal regulation", labelZh: "温感调节" },
];

export const CERAMIC_AXES = [
  { key: "hardness", label: "Hardness", labelZh: "硬度" },
  { key: "translucency", label: "Translucency", labelZh: "透光" },
  { key: "thermalShock", label: "Thermal shock tolerance", labelZh: "抗热震" },
  { key: "workability", label: "Craft workability", labelZh: "可加工性" },
  { key: "durability", label: "Object durability", labelZh: "器物耐久" },
  { key: "rarity", label: "Material rarity", labelZh: "原料稀缺" },
];

export const STONE_AXES = [
  { key: "hardness", label: "Hardness", labelZh: "硬度" },
  { key: "rarity", label: "Geological rarity", labelZh: "地质稀缺" },
  { key: "workability", label: "Carving workability", labelZh: "雕刻适性" },
  { key: "durability", label: "Durability", labelZh: "耐久" },
  { key: "chromatics", label: "Chromatic character", labelZh: "色相表现" },
  { key: "provenance", label: "Provenance sensitivity", labelZh: "产地敏感度" },
];

export const WOOD_AXES = [
  { key: "strength", label: "Structural strength", labelZh: "结构强度" },
  { key: "flexibility", label: "Flexibility", labelZh: "韧性" },
  { key: "aging", label: "Aging / patina", labelZh: "岁月感" },
  { key: "scent", label: "Aromatic character", labelZh: "香性" },
  { key: "scarcity", label: "Scarcity", labelZh: "稀缺" },
  { key: "workability", label: "Craft workability", labelZh: "可加工性" },
];

export function emptyLiterature(noteZh, note) {
  return {
    note,
    noteZh,
    items: [],
  };
}

export function bibliography(...sources) {
  return sources;
}
