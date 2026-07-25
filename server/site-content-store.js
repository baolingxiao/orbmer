/**
 * Editable site content for Orbmare editorial surfaces.
 * Public read; admin write via /auth/api/content.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRuntimeDir = path.join(__dirname, "runtime-data");

function runtimeDir() {
  return process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : defaultRuntimeDir;
}

function storePath() {
  return path.join(runtimeDir(), "site-content.json");
}

export const DEFAULT_SITE_CONTENT = {
  version: 1,
  updatedAt: null,
  home: {
    heroTitle: "发现世界顶尖工艺。",
    heroTitleEn: "Discover the world's finest craftsmanship.",
    heroBody: "每一件作品都来自独立设计师、匠人与顶级工坊的精心甄选。",
    heroBodyEn: "Every piece is curated from independent designers, artisans, and ateliers.",
    heroCta: "探索精选",
    heroCtaEn: "Explore",
    heroImage: "/assets/editorial/hero-craft.jpg",
    countriesTitle: "国家馆",
    countriesTitleEn: "Countries",
    countriesBody: "从产地开始。每个国家都有独特的材料、工坊与匠心语言。",
    countriesBodyEn: "Begin with origin. Each country speaks through materials and making.",
    featuredTitle: "精品推荐",
    featuredTitleEn: "Featured",
    featuredBody: "编辑精选与值得入手的安静好物。",
    featuredBodyEn: "Editor's picks and quiet objects worth keeping.",
    storiesTitle: "先读故事，再看商品。",
    storiesTitleEn: "Story before product.",
    storiesBody: "傲马不是无所不卖的目录，而是值得被看见的工艺图书馆。",
    storiesBodyEn: "Orbmare is a library of craftsmanship, not an endless catalog.",
    collectionsTitle: "精选系列",
    collectionsTitleEn: "Collections",
    collectionsBody: "策展路径，而非折扣筛选。",
    collectionsBodyEn: "Curated paths — not discount filters.",
  },
  designers: {
    title: "Orbmare 精选",
    titleEn: "Orbmare Picks",
    body: "品牌、工作室与设计师——来自运营精选的主体，以及他们背后的作品。",
    bodyEn: "Brands, studios, and designers — curated entities and the objects behind them.",
    cards: [],
  },
  materials: {
    title: "材料馆",
    titleEn: "Materials",
    body: "材料即知识——Baby Cashmere、植鞣革、日本丹宁、海岛棉。",
    bodyEn: "Material as knowledge — cashmere, leather, denim, cotton.",
  },
  about: {
    title: "傲马为何存在。",
    titleEn: "Why Orbmare exists.",
    body: "我们相信世界值得更好的产品——而不是更多的产品。",
    bodyEn: "We believe the world deserves better products — not more products.",
    lead: "我们相信世界值得更好的产品——而不是更多的产品。",
    leadEn: "We believe the world deserves better products — not more products.",
    h1: "一座图书馆，而非店面。",
    h1En: "A library, not a storefront.",
    p1: "傲马基于一个简单信念：工艺、材料与设计，值得比无尽滚动的购物平台更安静的家。",
    p1En: "Orbmare rests on a simple belief: craftsmanship, materials, and design deserve a quieter home than endless scroll.",
    p2: "我们甄选世界最好的制作——来自独立设计师、匠人与顶级工坊——让发现像走入博物馆，而不是冲过仓库。",
    p2En: "We curate the world's finest making — from independent designers, artisans, and ateliers — so discovery feels like a museum, not a warehouse.",
    h2: "为何工艺重要。",
    h2En: "Why craftsmanship matters.",
    p3: "用心制作的物件更持久，随时间更有尊严，并把我们与塑造它们的人与地方相连。当你理解纤维、锻造与针脚——你会以不同的方式购买。",
    p3En: "Objects made with care last longer, age with dignity, and connect us to the people and places that shaped them.",
    h3: "为何更好的产品。",
    h3En: "Why better products.",
    p4: "数量文化教会我们追逐价格与新鲜感。傲马选择诚信：更少的作品、更清晰的故事、以及对制作者的尊重。",
    p4En: "Quantity culture taught us to chase price and novelty. Orbmare chooses integrity: fewer pieces, clearer stories, and respect for makers.",
    mission: "我们甄选世界最好的材料、工艺与设计。",
    missionEn: "We curate the world's finest craftsmanship, materials, and design.",
  },
  membership: {
    title: "傲马会员",
    titleEn: "Orbmare Membership",
    lead: "不是仓储式俱乐部。而是给重视工艺、材料与设计的收藏者的安静圈子。",
    leadEn: "Not a warehouse club. A quiet circle for collectors who value craftsmanship, materials, and design.",
    "01": "抢先体验",
    "01En": "Early access",
    "01b": "在公开馆上线前，先看到新发现。",
    "01bEn": "See new discoveries before they enter the public pavilion.",
    "02": "专属系列",
    "02En": "Members-only capsules",
    "02b": "为会员圈保留的工坊胶囊系列。",
    "02bEn": "Workshop capsules reserved for the membership circle.",
    "03": "更低国际运费",
    "03En": "Reduced international shipping",
    "03b": "跨境运送时的优惠费率。",
    "03bEn": "Preferential rates on cross-border delivery.",
    "04": "策展采购请求",
    "04En": "Curated sourcing requests",
    "04b": "告诉我们你在寻找什么——我们替你寻访工坊与传承匠人。",
    "04bEn": "Tell us what you seek — we source from ateliers and heritage makers.",
    "05": "私人礼宾",
    "05En": "Private concierge",
    "05b": "材料、尺寸与定制的人工指导。",
    "05bEn": "Human guidance on materials, sizing, and commissions.",
    "06": "会员专属 Journal",
    "06En": "Members Journal",
    "06b": "比公开杂志更深入的文章、工厂笔记与访谈。",
    "06bEn": "Deeper essays, factory notes, and interviews than the public journal.",
    cta: "申请会员",
    ctaEn: "Request membership",
  },
  journal: {
    title: "Journal",
    titleEn: "Journal",
    lead: "一本关于制作的奢华杂志——工艺、材料、国家、设计师，以及非凡物件背后的安静工作。",
    leadEn: "A luxury magazine of making — craft, materials, countries, designers, and the quiet work behind exceptional objects.",
    items: [
      {
        cat: "工艺",
        catEn: "Craft",
        title: "锻造之内：日本刃物为何仍是标准",
        titleEn: "Inside forging: why Japanese blades remain the standard",
        href: "/craftsmanship/?id=forged",
      },
      {
        cat: "材料",
        catEn: "Material",
        title: "Baby Cashmere——可感知的稀有",
        titleEn: "Baby Cashmere — rarity you can feel",
        href: "/materials/?id=baby-cashmere",
      },
      {
        cat: "国家",
        catEn: "Country",
        title: "佛罗伦萨皮革与植鞣的耐心",
        titleEn: "Florentine leather and the patience of vegetable tanning",
        href: "/countries/italy/",
      },
      {
        cat: "访谈",
        catEn: "Interview",
        title: "林薇谈瓷器、克制与景德镇的光",
        titleEn: "Lin Wei on porcelain, restraint, and Jingdezhen light",
        href: "/brand/?id=designer-lin-wei",
      },
      {
        cat: "指南",
        catEn: "Guide",
        title: "如何辨识植鞣革的品质",
        titleEn: "How to recognise quality in vegetable-tanned leather",
        href: "/materials/?id=vegetable-tanned-leather",
      },
      {
        cat: "走访",
        catEn: "Visit",
        title: "中国精品：为何傲马的中国不是“中国制造”",
        titleEn: "China curated: why Orbmare's China is not 'Made in China'",
        href: "/countries/china/",
      },
    ],
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(storePath())) {
    const initial = clone(DEFAULT_SITE_CONTENT);
    initial.updatedAt = new Date().toISOString();
    writeStore(initial);
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(storePath(), "utf8"));
  } catch (error) {
    throw new Error(`Site content unavailable: ${error.message}`);
  }
}

function writeStore(data) {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  const target = storePath();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, target);
}

function deepMerge(target, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch;
  const out = { ...target };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target?.[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function getSiteContent() {
  const stored = readStore();
  const merged = deepMerge(clone(DEFAULT_SITE_CONTENT), stored);
  // One-time upgrade: old CMS title was overwriting the new Orbmare 精选 page.
  const staleTitles = new Set(["精选设计师", "Featured Designers", "设计师"]);
  if (staleTitles.has(String(merged.designers?.title || "").trim())) {
    merged.designers.title = DEFAULT_SITE_CONTENT.designers.title;
    merged.designers.titleEn = DEFAULT_SITE_CONTENT.designers.titleEn;
    merged.designers.body = DEFAULT_SITE_CONTENT.designers.body;
    merged.designers.bodyEn = DEFAULT_SITE_CONTENT.designers.bodyEn;
    merged.designers.cards = [];
    merged.updatedAt = new Date().toISOString();
    writeStore(merged);
  }
  return merged;
}

export function patchSiteContent(patch) {
  const current = getSiteContent();
  const next = deepMerge(current, patch || {});
  next.version = Number(current.version || 1) + 1;
  next.updatedAt = new Date().toISOString();
  writeStore(next);
  return next;
}

export function addModuleCard(moduleKey, card) {
  const current = getSiteContent();
  const module = current[moduleKey];
  if (!module || !Array.isArray(module.cards)) {
    throw new Error(`Module "${moduleKey}" does not support cards.`);
  }
  const entry = {
    id: card.id || `card-${Date.now().toString(36)}`,
    name: String(card.name || "New Studio").slice(0, 120),
    nameZh: String(card.nameZh || card.name || "新工作室").slice(0, 120),
    studio: String(card.studio || "").slice(0, 120),
    studioZh: String(card.studioZh || card.studio || "").slice(0, 120),
    image: String(card.image || "/assets/editorial/designer-atelier.jpg").slice(0, 500),
    href: String(card.href || "/designers/").slice(0, 300),
  };
  module.cards.push(entry);
  return patchSiteContent({ [moduleKey]: { cards: module.cards } });
}
