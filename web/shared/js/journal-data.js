export const JOURNAL_WEEKLY_LIMIT = 5;

export const JOURNAL_CATEGORIES = Object.freeze([
  { key: "all", zh: "全部", en: "All" },
  { key: "lifestyle", zh: "生活方式", en: "Lifestyle" },
  { key: "objects", zh: "物件", en: "Objects" },
  { key: "materials", zh: "材料", en: "Materials" },
  { key: "brands", zh: "品牌", en: "Brands" },
  { key: "countries", zh: "国家", en: "Countries" },
  { key: "craft", zh: "工艺", en: "Craft" },
  { key: "designers", zh: "设计师", en: "Designers" },
  { key: "issues", zh: "杂志专题", en: "Magazine Issues" },
]);

export const JOURNAL_COLLECTIONS = Object.freeze([
  { id: "material-library", titleZh: "材料图书馆", titleEn: "The Material Library", count: 8 },
  { id: "quiet-luxury", titleZh: "安静奢华", titleEn: "Quiet Luxury", count: 6 },
  { id: "made-in-japan", titleZh: "日本制造", titleEn: "Made in Japan", count: 7 },
  { id: "modern-craft", titleZh: "当代工艺", titleEn: "Modern Craft", count: 5 },
  { id: "everyday-objects", titleZh: "日常物件", titleEn: "Everyday Objects", count: 9 },
  { id: "slow-living", titleZh: "缓慢生活", titleEn: "Slow Living", count: 4 },
  { id: "natural-materials", titleZh: "天然材料", titleEn: "Natural Materials", count: 6 },
  { id: "design-icons", titleZh: "设计经典", titleEn: "Design Icons", count: 5 },
]);

export const JOURNAL_ISSUES = Object.freeze([
  {
    id: "issue-01",
    titleZh: "Issue 01 · 安静奢华",
    titleEn: "Issue 01 · Quiet Luxury",
    bodyZh: "关于克制、材质和长期拥有的第一期。",
    bodyEn: "A first issue on restraint, materials, and long ownership.",
    coverImage: "/assets/editorial/designer-atelier.jpg",
    articleCount: 6,
  },
  {
    id: "issue-02",
    titleZh: "Issue 02 · 日本",
    titleEn: "Issue 02 · Japan",
    bodyZh: "器物、金属、纸张、刀具与日常工艺。",
    bodyEn: "Objects, metal, paper, blades, and everyday craft.",
    coverImage: "/assets/editorial/country-japan.jpg",
    articleCount: 7,
  },
  {
    id: "issue-03",
    titleZh: "Issue 03 · 物件",
    titleEn: "Issue 03 · Objects",
    bodyZh: "值得留在生活里的全球精品好物。",
    bodyEn: "Exceptional objects worth keeping in daily life.",
    coverImage: "/assets/editorial/country-italy.jpg",
    articleCount: 8,
  },
  {
    id: "issue-04",
    titleZh: "Issue 04 · 材料",
    titleEn: "Issue 04 · Materials",
    bodyZh: "羊绒、苎麻、皮革、金属与天然纤维。",
    bodyEn: "Cashmere, ramie, leather, metal, and natural fibres.",
    coverImage: "/assets/editorial/material-cashmere.jpg",
    articleCount: 9,
  },
]);

export const JOURNAL_ARTICLES = Object.freeze([
  {
    id: "history-of-ramie",
    category: "materials",
    titleZh: "苎麻的历史",
    titleEn: "The History of Ramie",
    categoryZh: "材料",
    categoryEn: "Material",
    image: "/assets/editorial/material-cashmere.jpg",
    coverImage: "/assets/editorial/material-cashmere.jpg",
    authorZh: "Orbmare 编辑部",
    authorEn: "Orbmare Editors",
    publishedAt: "2026-07-22",
    readingTime: 5,
    issue: "issue-04",
    collection: "material-library",
    requiresMembership: true,
    relatedProductIds: ["ja-003", "cn-015", "it-007"],
    excerptZh: "一种古老纤维如何在当代日常里重新变得轻盈、坚韧和值得被保存。",
    excerptEn: "How an ancient fibre became light, resilient, and worth keeping in contemporary life.",
    bodyZh: [
      "苎麻不是突然流行起来的材料。它更像一条慢慢延伸的线，穿过湿热的土地、手工纺织的作坊，也穿过人们对夏季衣物和家用织物的长期想象。",
      "它的吸湿性、挺度与天然光泽，让它很早就被用于衣物、帘布与日常用品。好的苎麻不会急着取悦人，它在第一次触摸时可能略显清冷，却会在使用中逐渐柔和。",
      "Orbmare 选择苎麻时，更看重纤维处理、织造密度和成品比例。真正值得长期拥有的苎麻制品，通常不是靠夸张图案被记住，而是靠反复使用后的稳定质感。",
    ],
    bodyEn: [
      "Ramie is not a material that suddenly became fashionable. It is closer to a long thread running through humid landscapes, small weaving rooms, and the enduring idea of summer cloth.",
      "Its absorbency, structure, and natural lustre made it useful for garments, curtains, and everyday textiles. Good ramie does not rush to charm you; it may feel cool at first, then soften through use.",
      "When Orbmare selects ramie, we look at fibre treatment, weaving density, and final proportion. The pieces worth keeping are often remembered less for decoration and more for their stable texture over time.",
    ],
  },
  {
    id: "japanese-copper-aging",
    category: "craft",
    titleZh: "为什么日本黄铜愈用愈美",
    titleEn: "Why Japanese Copper Ages Beautifully",
    categoryZh: "工艺",
    categoryEn: "Craft",
    image: "/assets/editorial/country-japan.jpg",
    coverImage: "/assets/editorial/country-japan.jpg",
    authorZh: "Orbmare 编辑部",
    authorEn: "Orbmare Editors",
    publishedAt: "2026-07-19",
    readingTime: 6,
    issue: "issue-02",
    collection: "made-in-japan",
    requiresMembership: true,
    relatedProductIds: ["ja-001", "ja-004", "ja-006"],
    excerptZh: "时间不是瑕疵，而是黄铜、铜器与日常器物共同完成的表面语言。",
    excerptEn: "Time is not a flaw, but a surface language shared by brass, copper, and daily objects.",
    bodyZh: [
      "日本金属器物里迷人的部分，往往不在刚完成的那一刻，而在它进入生活之后。手、空气、水汽与光线，会把表面慢慢推向更复杂的颜色。",
      "黄铜与铜的氧化并不等于损坏。它更像皮革的包浆，记录使用方式和环境。好的工坊会在材质、厚度、收边和表面处理上留下足够余地，让时间参与最后的完成。",
      "购买这类器物时，不要只看第一眼是否闪亮。更重要的是边缘是否克制，重量是否平衡，触碰处是否自然，以及它能否在十年后仍然安静地站在桌上。",
    ],
    bodyEn: [
      "The charm of Japanese metal objects is often not found at the moment they leave the workshop, but after they enter daily life. Hands, air, moisture, and light slowly move the surface toward richer tones.",
      "Oxidation in brass and copper does not automatically mean damage. Like patina on leather, it records use and environment. Good workshops leave room in material, thickness, edge work, and finish for time to participate.",
      "When choosing these objects, do not only ask whether they shine at first sight. Look for restrained edges, balanced weight, natural touch points, and whether the piece can still sit quietly on a desk ten years later.",
    ],
  },
  {
    id: "quiet-luxury-beauty",
    category: "lifestyle",
    titleZh: "安静奢华的美",
    titleEn: "The Beauty of Quiet Luxury",
    categoryZh: "观点",
    categoryEn: "Perspective",
    image: "/assets/editorial/designer-atelier.jpg",
    coverImage: "/assets/editorial/designer-atelier.jpg",
    authorZh: "Orbmare 编辑部",
    authorEn: "Orbmare Editors",
    publishedAt: "2026-07-16",
    readingTime: 7,
    issue: "issue-01",
    collection: "quiet-luxury",
    requiresMembership: false,
    relatedProductIds: ["it-001", "it-009", "cn-004"],
    excerptZh: "真正的奢华并不总是大声说话，它常常藏在比例、材质和不被打扰的使用感里。",
    excerptEn: "Luxury does not always speak loudly. It often lives in proportion, material, and undisturbed use.",
    bodyZh: [
      "安静奢华不是把标志藏起来这么简单。它更像一种判断：不为了吸引目光而牺牲比例，不为了短期趋势而放弃材质，不为了显得昂贵而变得紧张。",
      "这种美感要求商品在近处成立。缝线、金属件、皮革纹理、织物坠感和纸张触感，都必须经得起真实使用。远看克制，近看有内容，这是 Orbmare 喜欢的状态。",
      "当一件东西不急着证明自己，它反而更可能陪你很久。安静奢华的价值，不在于别人立刻认出它，而在于你每天重新理解它。",
    ],
    bodyEn: [
      "Quiet luxury is not simply the absence of visible logos. It is a judgment: not sacrificing proportion for attention, not abandoning material for trend, and not becoming tense in order to look expensive.",
      "This beauty must hold up at close range. Stitching, hardware, leather grain, textile drape, and the feel of paper all need to survive real use. Restrained from afar, meaningful up close — that is the Orbmare temperament.",
      "When an object does not rush to prove itself, it is more likely to stay with you. The value of quiet luxury is not that others recognize it immediately, but that you understand it again each day.",
    ],
  },
  {
    id: "italian-leather-explained",
    category: "materials",
    titleZh: "意大利皮革释义",
    titleEn: "Italian Leather Explained",
    categoryZh: "材料",
    categoryEn: "Material",
    image: "/assets/editorial/country-italy.jpg",
    coverImage: "/assets/editorial/country-italy.jpg",
    authorZh: "Orbmare 编辑部",
    authorEn: "Orbmare Editors",
    publishedAt: "2026-07-12",
    readingTime: 6,
    issue: "issue-04",
    collection: "natural-materials",
    requiresMembership: true,
    relatedProductIds: ["it-002", "it-003", "it-010"],
    excerptZh: "从植鞣到手感，意大利皮革的价值并不只来自产地，而来自处理方式与时间。",
    excerptEn: "From vegetable tanning to handfeel, Italian leather is shaped less by origin alone than by process and time.",
    bodyZh: [
      "“意大利皮革”不是一个自动等于高级的标签。真正需要看的，是皮革来自哪里、如何鞣制、如何染色、如何裁切，以及成品是否尊重材料本身的脾气。",
      "植鞣革通常需要更多时间，也更愿意把使用痕迹留在表面。它会变深，会变亮，也可能出现不完全均匀的变化。对于愿意长期使用的人来说，这些变化正是价值的一部分。",
      "Orbmare 在判断皮革作品时，会把产地放在语境里，而不是当作唯一答案。我们更关心工坊是否理解材料，品牌是否控制细节，成品是否能在生活里自然变旧。",
    ],
    bodyEn: [
      "“Italian leather” is not a label that automatically means quality. What matters is where the hide comes from, how it is tanned, dyed, cut, and whether the finished object respects the nature of the material.",
      "Vegetable-tanned leather usually requires more time and is more willing to keep traces of use on its surface. It darkens, shines, and may age unevenly. For someone who intends to keep an object, these changes are part of the value.",
      "Orbmare treats origin as context, not as the only answer. We care more about whether the workshop understands the material, whether the brand controls the details, and whether the finished piece can age naturally in life.",
    ],
  },
  {
    id: "cashmere-care",
    category: "materials",
    titleZh: "羊绒为什么需要慢慢照顾",
    titleEn: "Why Cashmere Rewards Slow Care",
    categoryZh: "护理",
    categoryEn: "Care",
    image: "/assets/editorial/material-cashmere.jpg",
    coverImage: "/assets/editorial/material-cashmere.jpg",
    authorZh: "Orbmare 编辑部",
    authorEn: "Orbmare Editors",
    publishedAt: "2026-07-08",
    readingTime: 4,
    issue: "issue-04",
    collection: "natural-materials",
    requiresMembership: false,
    relatedProductIds: ["it-004", "it-005", "it-006"],
    excerptZh: "好的羊绒不是一次性消费，它需要休息、梳理和足够温柔的日常节奏。",
    excerptEn: "Good cashmere is not disposable. It needs rest, brushing, and a gentler daily rhythm.",
    bodyZh: [
      "羊绒的柔软来自纤维本身，也来自你如何对待它。频繁清洗、粗暴摩擦和密闭潮湿的存放方式，都会让一件原本很好的衣物提前疲惫。",
      "更合理的方式是轮换穿着、充分通风、轻柔去球，并在季节结束时清洁后平放保存。照顾羊绒不复杂，但它要求你不要把衣物当成消耗品。",
      "这也是 Orbmare 看待材料的方式：真正的高级并不是省去维护，而是让维护本身变得值得。",
    ],
    bodyEn: [
      "Cashmere’s softness comes from the fibre itself, and from how you treat it. Frequent washing, rough friction, and damp storage can make a good garment feel tired too soon.",
      "A better rhythm is to rotate wear, air it well, remove pilling gently, and store it flat after cleaning at the end of the season. Caring for cashmere is not complicated, but it asks you not to treat clothing as disposable.",
      "This is also how Orbmare thinks about materials: true refinement does not remove care; it makes care worthwhile.",
    ],
  },
  {
    id: "desk-objects",
    category: "objects",
    titleZh: "一张好书桌需要什么",
    titleEn: "What a Good Desk Needs",
    categoryZh: "日常",
    categoryEn: "Everyday",
    image: "/assets/editorial/designer-atelier.jpg",
    coverImage: "/assets/editorial/designer-atelier.jpg",
    authorZh: "Orbmare 编辑部",
    authorEn: "Orbmare Editors",
    publishedAt: "2026-07-05",
    readingTime: 5,
    issue: "issue-03",
    collection: "everyday-objects",
    requiresMembership: true,
    relatedProductIds: ["ja-001", "ja-002", "cn-003"],
    excerptZh: "书桌不需要被填满。它需要少量稳定、顺手、不会打断注意力的物件。",
    excerptEn: "A desk does not need to be full. It needs a few stable objects that do not interrupt attention.",
    bodyZh: [
      "好的书桌首先不是展示台，而是注意力停靠的地方。太多装饰、太多设备、太多没有用途的物件，都会让工作变得嘈杂。",
      "我们更喜欢少量但明确的选择：一支重量合适的笔，一个能稳定承托纸张的托盘，一盏不刺眼的灯，以及让电线、钥匙和小物件各自有位置的收纳。",
      "书桌日常的美，不是摆拍时的丰富，而是每天开始工作时，手知道该去哪里。",
    ],
    bodyEn: [
      "A good desk is not first a display surface; it is where attention lands. Too much decoration, too many devices, and too many purposeless objects make work noisy.",
      "We prefer a small number of clear choices: a pen with the right weight, a tray that steadies paper, a lamp that does not glare, and storage that gives cables, keys, and small things their own place.",
      "The beauty of a desk is not abundance in a photograph. It is that your hand knows where to go when work begins.",
    ],
  },
]);

export function getJournalArticle(id) {
  return JOURNAL_ARTICLES.find((article) => article.id === id) || null;
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback ?? "").trim();
}

function cleanArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map((item) => cleanText(item)).filter(Boolean);
  const text = cleanText(value);
  return text ? [text] : fallback;
}

export function normalizeJournalArticle(item = {}, index = 0) {
  const id = cleanText(item.id || item.slug || item.href?.split("id=")?.[1], `journal-${index + 1}`);
  const titleZh = cleanText(item.titleZh || item.title, "未命名文章");
  const titleEn = cleanText(item.titleEn || item.title, titleZh);
  const categoryKey = cleanText(item.category || item.categoryKey || item.catEn || item.cat, "lifestyle")
    .toLowerCase()
    .replace(/\s+/g, "-");
  const categoryMeta =
    JOURNAL_CATEGORIES.find((category) => category.key === categoryKey) ||
    JOURNAL_CATEGORIES.find((category) => category.en.toLowerCase() === categoryKey) ||
    JOURNAL_CATEGORIES.find((category) => category.zh === item.cat) ||
    JOURNAL_CATEGORIES[1];
  const bodyZh = cleanArray(item.bodyZh || item.body, [
    cleanText(item.excerptZh || item.excerpt || "这篇文章正在整理中。"),
  ]);
  const bodyEn = cleanArray(item.bodyEn || item.body, [
    cleanText(item.excerptEn || item.excerpt || "This story is being prepared."),
  ]);
  return {
    ...item,
    id,
    href: `/journal/?id=${encodeURIComponent(id)}`,
    category: categoryMeta.key,
    categoryZh: cleanText(item.categoryZh || item.cat || categoryMeta.zh, categoryMeta.zh),
    categoryEn: cleanText(item.categoryEn || item.catEn || categoryMeta.en, categoryMeta.en),
    titleZh,
    titleEn,
    excerptZh: cleanText(item.excerptZh || item.excerpt || bodyZh[0], bodyZh[0]),
    excerptEn: cleanText(item.excerptEn || item.excerpt || bodyEn[0], bodyEn[0]),
    image: cleanText(item.coverImage || item.image, "/assets/editorial/designer-atelier.jpg"),
    coverImage: cleanText(item.coverImage || item.image, "/assets/editorial/designer-atelier.jpg"),
    authorZh: cleanText(item.authorZh || item.author, "Orbmare 编辑部"),
    authorEn: cleanText(item.authorEn || item.author, "Orbmare Editors"),
    publishedAt: cleanText(item.publishedAt || item.date, "2026-07-26"),
    readingTime: Math.max(1, Number(item.readingTime || item.readingTimeMinutes || 5)),
    issue: cleanText(item.issue, "issue-01"),
    collection: cleanText(item.collection, "quiet-luxury"),
    requiresMembership: item.requiresMembership !== false,
    relatedProductIds: Array.isArray(item.relatedProductIds) ? item.relatedProductIds.slice(0, 6) : [],
    bodyZh,
    bodyEn,
  };
}

export function normalizeJournalArticles(items = JOURNAL_ARTICLES) {
  const source = Array.isArray(items) && items.length ? items : JOURNAL_ARTICLES;
  return source.map((item, index) => normalizeJournalArticle(item, index));
}

export function isModernJournalItem(item = {}) {
  return Boolean(
    item.id ||
      item.coverImage ||
      item.body ||
      item.bodyZh ||
      item.bodyEn ||
      Object.prototype.hasOwnProperty.call(item, "requiresMembership") ||
      item.relatedProductIds
  );
}
