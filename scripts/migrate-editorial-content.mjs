#!/usr/bin/env node
/**
 * Idempotent migration: editorial JSON → managed Postgres/JSON store.
 *
 * Usage:
 *   node scripts/migrate-editorial-content.mjs --dry-run
 *   node scripts/migrate-editorial-content.mjs
 *   node scripts/migrate-editorial-content.mjs --overwrite
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureDatabaseReady, closePool, isDatabaseEnabled } from "../server/db/index.js";
import { seedEditorialProductsFromJson } from "../server/product-store.js";
import { saveContent, getContent, ensureBrandId } from "../server/content-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const catalogPath = path.join(root, "web/shared/data/orbmare-catalog.json");
const materialDetailsPath = path.join(root, "web/shared/data/material-details.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const overwrite = args.has("--overwrite");

function log(message) {
  console.log(`[migrate-editorial] ${message}`);
}

async function migrateMaterials(catalog, details) {
  const list = catalog.materials || [];
  const detailMap = details.materials || {};
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const entry of list) {
    const detail = detailMap[entry.id] || {};
    const existing = await getContent("material", entry.id);
    if (existing && !overwrite) {
      skipped += 1;
      continue;
    }
    const payload = {
      id: entry.id,
      slug: entry.id,
      status: "published",
      name: entry.name,
      nameEn: entry.name,
      nameZh: entry.nameZh || entry.name,
      origin: entry.origin || detail.origin?.region || "",
      originZh: entry.originZh || detail.origin?.regionZh || "",
      image: entry.image || detail.image || "",
      heroImage: detail.image || entry.image || "",
      blurb: entry.blurb || detail.intro || "",
      blurbZh: entry.blurbZh || detail.introZh || "",
      intro: detail.intro || entry.blurb || "",
      introZh: detail.introZh || entry.blurbZh || "",
      lyric: detail.lyric || "",
      lyricZh: detail.lyricZh || "",
      traits: detail.traits || [],
      story: detail.story || {},
      originDetail: detail.origin || {},
      craft: detail.craft || [],
      care: detail.care || {},
      faq: detail.faq || [],
      sections: [],
      evidenceDefault: "editorial_interpretation",
      source: "orbmare-catalog+material-details",
    };
    if (dryRun) {
      log(`DRY material ${entry.id}`);
      inserted += existing ? 0 : 1;
      updated += existing ? 1 : 0;
      continue;
    }
    await saveContent("material", payload, { actor: "migrate-editorial" });
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated, skipped, total: list.length };
}

async function migrateDesigners(catalog) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const entry of catalog.designers || []) {
    const existing = await getContent("designer", entry.id);
    if (existing && !overwrite) {
      skipped += 1;
      continue;
    }
    const payload = {
      id: entry.id,
      slug: entry.id,
      status: "published",
      name: entry.name,
      nameEn: entry.name,
      nameZh: entry.nameZh || entry.name,
      studio: entry.studio || "",
      studioZh: entry.studioZh || "",
      city: entry.city || "",
      cityZh: entry.cityZh || "",
    };
    if (dryRun) {
      log(`DRY designer ${entry.id}`);
      continue;
    }
    await saveContent("designer", payload, { actor: "migrate-editorial" });
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated, skipped, total: (catalog.designers || []).length };
}

/** Brand management (Orbmare 精选): brand- / studio- / designer- */
async function migrateCuratedBrands(catalog) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const rows = [];

  for (const entry of catalog.designers || []) {
    rows.push({
      kind: "designer",
      bareId: entry.id,
      nameEn: entry.name,
      nameZh: entry.nameZh || entry.name,
      studio: entry.studio || "",
      studioZh: entry.studioZh || entry.studio || "",
      image: "/assets/editorial/designer-atelier.jpg",
      blurb: entry.city ? `${entry.studio || ""} · ${entry.city}` : entry.studio || "",
      blurbZh: entry.cityZh
        ? `${entry.studioZh || entry.studio || ""} · ${entry.cityZh}`
        : entry.studioZh || entry.studio || "",
    });
    if (entry.studio) {
      const studioBare = String(entry.studio)
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      if (studioBare) {
        rows.push({
          kind: "studio",
          bareId: studioBare,
          nameEn: entry.studio,
          nameZh: entry.studioZh || entry.studio,
          studio: entry.studio,
          studioZh: entry.studioZh || entry.studio,
          image: "/assets/editorial/designer-atelier.jpg",
          blurb: entry.city || "",
          blurbZh: entry.cityZh || entry.city || "",
        });
      }
    }
  }

  // Deduplicate by final id
  const seen = new Set();
  for (const row of rows) {
    const id = ensureBrandId(row.kind, row.bareId, row.nameEn);
    if (seen.has(id)) continue;
    seen.add(id);
    const existing = await getContent("brand", id);
    if (existing && !overwrite) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      log(`DRY brand ${id}`);
      inserted += existing ? 0 : 1;
      updated += existing ? 1 : 0;
      continue;
    }
    await saveContent(
      "brand",
      {
        id,
        kind: row.kind,
        slug: id,
        status: "published",
        name: row.nameEn,
        nameEn: row.nameEn,
        nameZh: row.nameZh,
        studio: row.studio,
        studioZh: row.studioZh,
        image: row.image,
        heroImage: row.image,
        blurb: row.blurb,
        blurbZh: row.blurbZh,
        intro: row.blurb,
        introZh: row.blurbZh,
      },
      { actor: "migrate-editorial" }
    );
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated, skipped, total: seen.size };
}

async function migrateCrafts(catalog) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const entry of catalog.crafts || []) {
    const existing = await getContent("craft", entry.id);
    if (existing && !overwrite) {
      skipped += 1;
      continue;
    }
    const HISTORY = {
      handwoven: {
        en: "Looms and hands in dialogue — tension, pattern, and fiber knowledge passed through workshops.",
        zh: "织机与双手对话——张力、图案与纤维知识在工坊中传承。",
      },
      handmade: {
        en: "A broad discipline of human making where finish, proportion, and repairability matter.",
        zh: "广阔的人工制作领域，完成度、比例与可修复性至关重要。",
      },
      forged: {
        en: "Fire and hammer shape steel — Japanese blade traditions among the world's most exacting.",
        zh: "火与锤塑造钢铁——日本刃物传统位居世界最严苛之列。",
      },
      "hand-painted": {
        en: "Brushwork on porcelain, silk, and enamel — patience visible in every stroke.",
        zh: "瓷器、丝绸与珐琅上的笔触——耐心写在每一笔里。",
      },
      "hand-stitched": {
        en: "Saddle stitch and fine leatherwork — seams that can outlast glued construction.",
        zh: "鞍缝与精细皮工——缝线可比胶合结构更持久。",
      },
      "wood-turning": {
        en: "Rotation reveals form — bowls, furniture parts, and quiet sculptural objects.",
        zh: "旋转显现形体——碗、家具构件与安静的雕塑物件。",
      },
      ceramics: {
        en: "Clay, kiln, and glaze chemistry — from Jingdezhen to Kyoto kilns.",
        zh: "泥、窑与釉的化学——从景德镇到京都窑口。",
      },
      "japanese-joinery": {
        en: "Wood joined without nails — precision as philosophy.",
        zh: "不用钉子的木作连接——精度即哲学。",
      },
    };
    const hist = HISTORY[entry.id] || {};
    const payload = {
      id: entry.id,
      slug: entry.id,
      status: "published",
      name: entry.name,
      nameEn: entry.name,
      nameZh: entry.nameZh || entry.name,
      countries: entry.countries || [],
      countriesZh: entry.countriesZh || [],
      history: hist.en || "",
      historyZh: hist.zh || "",
      blurb: hist.en || "",
      blurbZh: hist.zh || "",
    };
    if (dryRun) {
      log(`DRY craft ${entry.id}`);
      continue;
    }
    await saveContent("craft", payload, { actor: "migrate-editorial" });
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated, skipped, total: (catalog.crafts || []).length };
}

async function migrateCountries() {
  const defaults = [
    {
      id: "japan",
      code: "japan",
      slug: "japan",
      name: "Japan",
      nameEn: "Japan",
      nameZh: "日本",
      tag: "Craftsmanship",
      tagZh: "匠心工艺",
      coverImage: "/assets/editorial/country-japan.jpg",
      culture:
        "An aesthetic of quiet utility — objects meant to improve daily life without announcing themselves.",
      cultureZh: "安静的实用美学——物件改善日常，却不必张扬自己。",
      history:
        "Japan's making culture prizes restraint, precision, and longevity. From Sakai blades to Kyoto ceramics, excellence is measured in decades of practice.",
      historyZh:
        "日本的制作文化珍视克制、精度与经年。从堺刃物到京都陶瓷，卓越以数十年的练习衡量。",
      pavilionCrafts: ["Forged", "Ceramics", "Japanese Joinery", "Wood Turning", "Handwoven"],
      pavilionCraftsZh: ["锻造", "陶瓷", "日本榫卯", "车木", "手织"],
      pavilionMaterials: [
        { id: "japanese-denim", en: "Japanese Denim", zh: "日本丹宁" },
        { en: "Porcelain", zh: "瓷器" },
        { en: "Washi", zh: "和纸" },
        { en: "Carbon Steel", zh: "碳钢" },
        { en: "Hinoki", zh: "桧木" },
      ],
    },
    {
      id: "italy",
      code: "italy",
      slug: "italy",
      name: "Italy",
      nameEn: "Italy",
      nameZh: "意大利",
      tag: "Luxury Design",
      tagZh: "奢华设计",
      coverImage: "/assets/editorial/country-italy.jpg",
      culture: "Design is lived — in the hand of a stitch, the drape of a scarf, the silhouette of a chair.",
      cultureZh: "设计即生活——在一针一线、围巾垂坠与椅子轮廓之中。",
      history:
        "Italian workshops treat material as the first designer. Florence leather, Biella cashmere, and Milanese proportion define a language of luxury that begins with touch.",
      historyZh:
        "意大利工坊视材料为第一位设计师。佛罗伦萨皮革、比耶拉羊绒与米兰比例，定义从触感开始的奢华语言。",
      pavilionCrafts: ["Hand Stitched", "Handwoven", "Wood Turning", "Hand Painted"],
      pavilionCraftsZh: ["手缝", "手织", "车木", "手绘"],
      pavilionMaterials: [
        { id: "baby-cashmere", en: "Baby Cashmere", zh: "Baby Cashmere" },
        { id: "vegetable-tanned-leather", en: "Vegetable Tanned Leather", zh: "植鞣革" },
        { en: "Marble", zh: "大理石" },
        { en: "Silk", zh: "丝绸" },
        { id: "french-linen", en: "French Linen", zh: "法国亚麻" },
      ],
    },
    {
      id: "china",
      code: "china",
      slug: "china",
      name: "China",
      nameEn: "China",
      nameZh: "中国",
      tag: "Original Design",
      tagZh: "原创设计",
      coverImage: "/assets/editorial/country-china.jpg",
      culture: "中国，并非所有商品都属于同一种故事。",
      cultureZh: "中国，并非所有商品都属于同一种故事。",
      historyParagraphs: [
        "Not everything made in China tells the same story.",
        "The pieces we choose are not defined by volume, but by patience.",
        "They come from independent studios, master craftsmen, and workshops where techniques have been refined over generations.",
      ],
      historyParagraphsZh: [
        "中国，并非所有商品都属于同一种故事。",
        "傲马所选择的，不是产量，而是时间。",
        "这些作品来自独立设计工作室、世代相传的工坊、以及仍坚持手工制作的匠人。",
      ],
      historyLines: [
        "Porcelain fired in Jingdezhen.",
        "Lacquer applied layer by layer.",
        "Wood shaped by hand.",
        "Silk woven with extraordinary precision.",
      ],
      historyLinesZh: ["景德镇烧制的瓷器。", "层层髹涂的大漆。", "手工雕琢的木器。", "精密织造的丝绸。"],
      historyClose: ["These are not souvenirs.", "They are contemporary objects carrying centuries of knowledge."],
      historyCloseZh: ["它们不是纪念品。", "而是仍然活在今天的传统。"],
      pavilionCrafts: ["Ceramics", "Hand Painted", "Handwoven", "Wood Turning"],
      pavilionCraftsZh: ["陶瓷", "手绘", "手织", "车木"],
      pavilionMaterials: [
        {
          id: "mulberry-silk-taihu",
          en: "Mulberry Silk",
          zh: "桑蚕丝",
          noteEn: "Taihu Lake silk",
          noteZh: "太湖湖丝",
        },
        {
          id: "yak-wool",
          en: "Yak Wool",
          zh: "牦牛绒",
          noteEn: "Qinghai–Tibet Plateau",
          noteZh: "青藏高原",
        },
        { id: "alxa-camel-wool", en: "Alxa Bactrian Camel Wool", zh: "阿拉善双峰驼绒" },
        { id: "han-hemp", en: "Han Hemp", zh: "汉麻" },
        { id: "ramie-xiabu", en: "Ramie", zh: "苎麻", noteEn: "Xia Bu fiber", noteZh: "夏布原料" },
        { id: "raw-lacquer", en: "Raw Lacquer", zh: "天然生漆", noteEn: "Da Qi / Urushi", noteZh: "大漆" },
      ],
    },
  ];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  for (const entry of defaults) {
    const existing = await getContent("country", entry.id);
    if (existing && !overwrite) {
      skipped += 1;
      continue;
    }
    if (dryRun) {
      log(`DRY country ${entry.id}`);
      continue;
    }
    await saveContent(
      "country",
      { ...entry, status: "published" },
      { actor: "migrate-editorial" }
    );
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { inserted, updated, skipped, total: defaults.length };
}

async function main() {
  log(dryRun ? "Starting DRY RUN" : "Starting migration");
  log(`Database: ${isDatabaseEnabled() ? "enabled" : "JSON fallback"}`);

  if (isDatabaseEnabled()) {
    await ensureDatabaseReady();
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
  const details = fs.existsSync(materialDetailsPath)
    ? JSON.parse(fs.readFileSync(materialDetailsPath, "utf8"))
    : { materials: {} };

  if (dryRun) {
    log(`Would migrate products: ${(catalog.products || []).length}`);
  } else {
    const products = await seedEditorialProductsFromJson({ overwrite });
    log(
      `products inserted=${products.inserted} updated=${products.updated} skipped=${products.skipped} total=${products.total}`
    );
  }

  const materials = await migrateMaterials(catalog, details);
  log(
    `materials inserted=${materials.inserted} updated=${materials.updated} skipped=${materials.skipped} total=${materials.total}`
  );

  const designers = await migrateDesigners(catalog);
  log(
    `designers inserted=${designers.inserted} updated=${designers.updated} skipped=${designers.skipped} total=${designers.total}`
  );

  const brands = await migrateCuratedBrands(catalog);
  log(
    `brands(orbmare-picks) inserted=${brands.inserted} updated=${brands.updated} skipped=${brands.skipped} total=${brands.total}`
  );

  const crafts = await migrateCrafts(catalog);
  log(
    `crafts inserted=${crafts.inserted} updated=${crafts.updated} skipped=${crafts.skipped} total=${crafts.total}`
  );

  const countries = await migrateCountries();
  log(
    `countries inserted=${countries.inserted} updated=${countries.updated} skipped=${countries.skipped} total=${countries.total}`
  );

  log("Done. Existing storefront URLs/slugs preserved.");
  if (isDatabaseEnabled()) await closePool();
}

main().catch(async (error) => {
  console.error("[migrate-editorial] failed:", error);
  if (isDatabaseEnabled()) await closePool().catch(() => {});
  process.exit(1);
});
