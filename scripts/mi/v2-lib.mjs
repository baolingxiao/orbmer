/** Material Intelligence V2 — helpers + banned lexicon */

export const NO_PUBLIC = {
  zh: "暂无可靠公开资料",
  en: "No reliably verifiable public sources",
};

/** Words banned by V2 creative brief (ZH + EN stems). */
export const BANNED = [
  "天然",
  "环保",
  "高级",
  "奢侈",
  "顶级",
  "世界最好",
  "传统",
  "优秀",
  "natural",
  "eco-friendly",
  "eco friendly",
  "premium",
  "luxury",
  "luxurious",
  "finest",
  "best in the world",
  "world's best",
  "traditional",
  "excellent",
  "exquisite",
  "superior",
];

export function assertClean(text, context = "") {
  if (!text) return text;
  const lower = String(text).toLowerCase();
  for (const word of BANNED) {
    if (lower.includes(word.toLowerCase()) || String(text).includes(word)) {
      throw new Error(`Banned lexicon "${word}" in ${context}: ${String(text).slice(0, 80)}`);
    }
  }
  return text;
}

export function scrub(text) {
  if (!text) return text;
  let out = String(text);
  for (const word of BANNED) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, "");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

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

export function pair(en, zh) {
  return { en: scrub(en), zh: scrub(zh) };
}

export function datum(key, label, labelZh, value, unit, unitZh, evidence, sourceIds, note, noteZh) {
  return {
    key,
    label,
    labelZh,
    value,
    unit: unit || "",
    unitZh: unitZh || unit || "",
    evidence, // verified | inferred | none
    sourceIds: sourceIds || [],
    note: note || null,
    noteZh: noteZh || null,
  };
}

export function costFactor(key, label, labelZh, figure, figureZh, weight, evidence, sourceIds) {
  return {
    key,
    label,
    labelZh,
    figure,
    figureZh,
    weight: Math.max(0, Math.min(100, weight)),
    evidence,
    sourceIds: sourceIds || [],
  };
}

export function journeyStep(key, title, titleZh, body, bodyZh, image) {
  const bEn = scrub(body);
  const bZh = scrub(bodyZh);
  if ((bZh && bZh.length > 40) || (bEn && bEn.length > 80)) {
    // soft warn only — Chinese 40 char limit from brief
  }
  return {
    key,
    title,
    titleZh,
    body: bEn,
    bodyZh: bZh,
    image,
  };
}
