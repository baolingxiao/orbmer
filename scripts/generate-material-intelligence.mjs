#!/usr/bin/env node
/**
 * Build Material Intelligence V2 dossiers (AI + web-research enriched).
 * Usage: node scripts/generate-material-intelligence.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEEP_V2 } from "./mi/deep-v2.mjs";
import { ENRICH, buildGenericEnrich } from "./mi/enrich-all.mjs";
import { NO_PUBLIC, scrub, BANNED, journeyStep } from "./mi/v2-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const detailsPath = path.join(root, "web/shared/data/material-details.json");
const outPath = path.join(root, "web/shared/data/material-intelligence.json");

function deepScrub(obj) {
  if (obj == null) return obj;
  if (typeof obj === "string") return scrub(obj);
  if (Array.isArray(obj)) return obj.map(deepScrub);
  if (typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = deepScrub(v);
    return out;
  }
  return obj;
}

function scanBanned(obj, pathKey = "root") {
  if (obj == null) return;
  if (typeof obj === "string") {
    for (const w of BANNED) {
      if (obj.toLowerCase().includes(w.toLowerCase()) || obj.includes(w)) {
        throw new Error(`Banned "${w}" at ${pathKey}: ${obj.slice(0, 100)}`);
      }
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanBanned(v, `${pathKey}[${i}]`));
    return;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) scanBanned(v, `${pathKey}.${k}`);
  }
}

function baseFromDetail(detail) {
  const gallery = detail.gallery || [detail.image];
  return {
    id: detail.id,
    name: detail.name,
    nameZh: detail.nameZh,
    image: detail.image,
    gallery,
    craft: detail.craft || [],
    traits: detail.traits || [],
    origin: detail.origin || {},
    story: detail.story || {},
  };
}

function mergeAll(base, ...layers) {
  let out = { ...base };
  for (const layer of layers) {
    if (!layer) continue;
    out = {
      ...out,
      ...layer,
      id: base.id,
      name: base.name,
      nameZh: base.nameZh,
      image: base.image,
      gallery: base.gallery,
      craft: layer.craft || out.craft || base.craft,
      traits: base.traits,
      origin: base.origin,
      story: base.story,
    };
  }
  if (!out.journey?.length && base.craft?.length) {
    out.journey = base.craft.slice(0, 7).map((step, i) =>
      journeyStep(
        step.step || `s${i}`,
        step.title || "Step",
        step.titleZh || "步骤",
        String(step.body || "").slice(0, 80),
        String(step.bodyZh || "").slice(0, 40),
        step.image || base.gallery[i % base.gallery.length]
      )
    );
  }
  return out;
}

function main() {
  const pack = JSON.parse(fs.readFileSync(detailsPath, "utf8"));
  const materials = {};

  for (const [id, detail] of Object.entries(pack.materials || {})) {
    const base = baseFromDetail(detail);
    const generic = buildGenericEnrich(id, detail);
    const researched = ENRICH[id] || null;
    const deep = DEEP_V2[id] || null;
    materials[id] = mergeAll(base, generic, researched, deep);
  }

  const output = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    method: {
      en: "AI-assisted global research with live web retrieval and human evidence gates. Claims without public sources are not shown as facts.",
      zh: "AI 辅助全球研究，结合联网检索与人工证据门控。无公开来源的内容不以事实呈现。",
    },
    evidenceLegend: {
      verified: { en: "Cited public source", zh: "有公开引用来源" },
      inferred: { en: "Public consensus synthesis — not a lot certificate", zh: "公开共识综合——非批次证书" },
      none: { en: NO_PUBLIC.en, zh: NO_PUBLIC.zh },
    },
    materials,
  };

  const cleaned = deepScrub(output);
  scanBanned(cleaned);
  fs.writeFileSync(outPath, `${JSON.stringify(cleaned, null, 2)}\n`);

  let noneCount = 0;
  for (const m of Object.values(cleaned.materials)) {
    noneCount += (JSON.stringify(m).match(/暂无可靠公开资料/g) || []).length;
  }
  const researched = Object.values(cleaned.materials).filter((m) =>
    ["curated", "researched"].includes(m.confidence)
  ).length;
  console.log(`V2 enriched: ${Object.keys(cleaned.materials).length} materials`);
  console.log(`Researched/curated: ${researched}; remaining 暂无 count: ${noneCount}`);
}

main();
