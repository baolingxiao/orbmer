/**
 * AI + web-research enrichment for all materials.
 * Fills identity / evidence / cost / experience / sources.
 * Banned lexicon scrubbed at generate time.
 */

import { src, pair, datum, costFactor, journeyStep } from "./v2-lib.mjs";

/** Customer-experience block: what the wearer/user feels vs ordinary. */
export function experienceBlock(thesisEn, thesisZh, vsEn, vsZh, ordinaryEn, ordinaryZh, senses) {
  return {
    thesis: pair(thesisEn, thesisZh),
    vsOrdinary: pair(vsEn, vsZh),
    ordinary: pair(ordinaryEn, ordinaryZh),
    senses: senses.map((s) => ({
      key: s.key,
      label: s.label,
      labelZh: s.labelZh,
      body: s.body,
      bodyZh: s.bodyZh,
    })),
  };
}

const S = {
  ramie: [
    src("ramie-trj", "Ramie fibre physical properties — Textile Progress review", 2007, "https://doi.org/10.1080/00405160701706049", "苎麻物理性能综述。", "Critical review of ramie physical properties."),
    src("ramie-vs-cotton", "Ramie vs cotton apparel fibre comparison (industry synthesis)", null, "https://szoneierfabrics.com/ramie-fabric-clothing/", "公开工业对比：强力、透气与吸湿释放。", "Public industry synthesis on strength and moisture release."),
  ],
  cottonEls: [
    src("g-barbadense", "Gossypium barbadense fibre germplasm study", 2023, "https://doi.org/10.1186/s42397-023-00153-y", "海岛棉/长绒棉纤维性状公开研究。", "Public study of G. barbadense fibre traits."),
    src("cabi-barbadense", "CABI — Gossypium barbadense (Sea Island / ELS cotton)", null, "https://www.cabidigitallibrary.org/doi/10.1079/cabicompendium.25794", "海岛棉/长绒棉分类与纤维长度公开记述。", "Public species compendium on Sea Island / ELS cotton."),
  ],
  vicuna: [
    src("bbc-vicuna", "BBC Travel — vicuña fibre diameter & yield", 2018, "https://www.bbc.com/travel/article/20180917-the-rarest-fabric-on-earth", "公开报道：约 12–14 μm，单次约 200 g。", "Public report: ~12–14 μm; ~200 g per shearing."),
    src("itc-vicuna", "ITC — Trade in vicuña fibre", null, "https://intracen.org/", "国际贸易中心对驼马绒贸易与细度的公开材料。", "ITC public materials on vicuña trade and fineness."),
    src("wiki-vicuna", "Wikipedia — Vicuña wool", null, "https://en.wikipedia.org/wiki/Vicu%C3%B1a_wool", "驼马绒直径公开条目。", "Public encyclopaedic entry on vicuña wool."),
  ],
  dehua: [
    src("gb-dehua", "GB/T 21998-2008 Dehua white porcelain GI product", 2008, null, "德化白瓷地理标志产品国家标准要点。", "Chinese GI product standard for Dehua white porcelain."),
    src("blanc-chem", "Blanc de Chine chemistry — Fe₂O₃ / K₂O analysis", null, "https://blancdechine.org/dimension/05", "低铁高钾与氧化焰白度/透光的公开化学分析。", "Public chemical analysis of low Fe / high K white translucency."),
  ],
  xys: [
    src("xys-mud", "Studies in the mud-coating technique of Gambiered Guangdong silk", 2017, "https://doi.org/10.1016/j.clay.2016.10.014", "莨纱过泥工艺的公开材料学研究。", "Peer study of mud-coating on gambiered Guangdong silk."),
    src("xys-wiki", "Wikipedia — Xiangyunsha silk", null, "https://en.wikipedia.org/wiki/Xiangyunsha_silk", "香云纱公开条目与工序概述。", "Public encyclopaedic overview of Xiangyunsha."),
  ],
  yak: [
    src("yak-permeability", "Permeability and handle of wool, yak and cashmere knits", 2023, "https://doi.org/10.1080/15440478.2023.2212925", "牦牛绒/羊绒/羊毛针织物透气与手感公开研究。", "Peer study of yak vs cashmere vs wool knit handle and permeability."),
  ],
  silk: [
    src("fao-silk", "FAO — sericulture overview", 2020, "https://www.fao.org/", "蚕桑公开概述。", "Public sericulture overview."),
    src("pubmed-fibroin", "PubMed — fibroin literature", null, "https://pubmed.ncbi.nlm.nih.gov/", "丝素公开摘要。", "Public fibroin abstracts."),
  ],
  linen: [
    src("flax-fibre", "Flax / linen fibre properties — public textile references", null, null, "亚麻纤维公开纺织参考。", "Public textile references on flax/linen."),
  ],
  leather: [
    src("veg-tan", "Vegetable tannage — public leather chemistry overviews", null, null, "植物鞣公开皮革化学概述。", "Public overviews of vegetable tannage."),
  ],
  denim: [
    src("jp-denim", "Japanese denim mill culture — public industry histories", null, null, "日本丹宁工场公开产业史。", "Public industry histories of Japanese denim mills."),
  ],
  ceramic: [
    src("song-ware", "Song ceramic kiln scholarship — museum essays", null, "https://www.metmuseum.org/", "宋瓷窑口公开博物馆文稿。", "Public museum scholarship on Song kilns."),
  ],
  jade: [
    src("nephrite", "Nephrite / Hetian jade — mineralogy public references", null, null, "和田玉/软玉公开矿物学参考。", "Public mineralogy references for nephrite."),
  ],
  lacquer: [
    src("met-lac", "Museum scholarship on East Asian lacquer", null, "https://www.metmuseum.org/", "东亚漆器公开博物馆文稿。", "Public museum lacquer scholarship."),
  ],
  bamboo: [
    src("bamboo-mat", "Bamboo material properties — public forestry/textile refs", null, null, "竹材公开林学/材料参考。", "Public forestry/material references on bamboo."),
  ],
  agarwood: [
    src("agarwood-cites", "Agarwood trade & Aquilaria — CITES / public botany", null, null, "沉香公开植物学与贸易管制记述。", "Public botany and trade-control notes on agarwood."),
  ],
};

/** Per-id enrichment overlays (merged onto scaffold). */
export const ENRICH = {
  "ramie-xiabu": {
    confidence: "researched",
    scientificName: "Boehmeria nivea",
    scientificNameZh: "苎麻 Boehmeria nivea",
    nameEn: "Ramie (Xiabu)",
    hero: pair("Cool air moves through the cloth before heat builds on skin.", "热意在皮肤堆积之前，凉气先穿过布面。"),
    experience: experienceBlock(
      "On skin, ramie reads as crisp coolness that dries faster than ordinary cotton.",
      "贴身时，苎麻是比普通棉更快干爽的清凉触感。",
      "Ordinary cotton softens by swelling with moisture and stays damp longer. Ramie absorbs quickly, swells less, and releases vapour faster — so humid days feel less sticky.",
      "普通棉靠吸湿膨胀变软，也更久潮湿。苎麻吸得快、胀得少、散得快——潮湿天气更不黏。",
      "Ordinary cotton",
      "普通棉",
      [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Crisp hand; less cloudy softness than cotton.", bodyZh: "触感偏爽利，不如棉那样蓬软。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "Airflow and fast dry-down in heat.", bodyZh: "暑热中透气，干得更快。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Holds shape; wet strength stays relatively high.", bodyZh: "更易保持形态；湿态强力相对更高。" },
      ]
    ),
    whyExists: pair(
      "Kept because bast cellulose delivers high tensile strength and quick moisture release in heat — hard to fake with short-staple cotton alone.",
      "留下它，是因为韧皮纤维素在暑热中提供高强力与快速排湿——单靠短绒棉难以替代。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "China · summer cloth regions", valueZh: "中国 · 夏布产区" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Boehmeria nivea", valueZh: "Boehmeria nivea" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "East Asian bast textile histories", valueZh: "东亚韧皮纺织史", evidence: "inferred", sourceIds: ["ramie-trj"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "China · SE Asia cultivation", valueZh: "中国 · 东南亚栽培" },
      { key: "density", label: "Fibre length order", labelZh: "纤维长度量级", value: "Long bast (often 120–150 mm cited)", valueZh: "长韧皮（文献常引 120–150 mm）", evidence: "inferred", sourceIds: ["ramie-trj"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "High airflow hand", valueZh: "透气感高", evidence: "inferred", sourceIds: ["ramie-vs-cotton"] },
      { key: "strength", label: "Strength", labelZh: "强力", value: "Often 2–3× cotton (public comparisons)", valueZh: "公开对比常称约为棉的 2–3 倍", evidence: "inferred", sourceIds: ["ramie-vs-cotton"] },
      { key: "lifespan", label: "Lifespan", labelZh: "寿命", value: "Shape-holding under wash", valueZh: "洗涤中更易保形", evidence: "inferred", sourceIds: ["ramie-vs-cotton"] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Perennial harvest cycles", valueZh: "多年生收获周期", evidence: "inferred", sourceIds: ["ramie-trj"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Cellulose fibre; finishes vary", valueZh: "纤维素纤维；后整理影响", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("tenacity", "Tensile vs cotton", "相对棉的强力", "≈2–3×", "", "", "inferred", ["ramie-vs-cotton"], "Industry/public comparisons; lot tests still required.", "公开/工业对比；批次仍需实测。"),
      datum("moisture", "Moisture behaviour", "吸湿行为", "Fast absorb / faster release", "", "", "inferred", ["ramie-vs-cotton"], "Swells less than cotton when wet.", "湿态膨胀小于棉。"),
      datum("length", "Bast length order", "韧皮长度量级", "120–150", "mm", "mm", "inferred", ["ramie-trj"], "Cited ranges vary by clone and extraction.", "随品种与脱胶变化。"),
    ],
    costWhy: {
      thesis: pair("Cost follows degumming labour and long-bast grading loss.", "成本跟随脱胶人工与长纤维分级损耗。"),
      factors: [
        costFactor("labor", "Degumming labour", "脱胶人工", "Bast must be cleaned without killing strength", "脱胶须去胶而不毁强力", 30, "inferred", ["ramie-trj"]),
        costFactor("time", "Process time", "工序时间", "Retting / degumming / spinning steps", "沤制/脱胶/纺纱步骤", 22, "inferred", []),
        costFactor("waste", "Grading loss", "分级损耗", "Short fibre leaves the top yarn bin", "短纤离开顶档纱", 20, "inferred", []),
        costFactor("region", "Craft geography", "工艺地理", "Xiabu skill clustered in summer-cloth towns", "夏布技艺集中于夏布市镇", 16, "inferred", []),
        costFactor("yield", "Plant yield", "作物产量", "Bast yield per hectare is finite", "单位面积韧皮产量有限", 12, "inferred", []),
      ],
    },
    compare: {
      peers: [
        { id: "ramie", label: "Ramie", labelZh: "苎麻", self: true },
        { id: "cotton", label: "Cotton", labelZh: "棉" },
        { id: "linen", label: "Linen", labelZh: "亚麻" },
        { id: "silk", label: "Silk", labelZh: "丝" },
        { id: "synthetic", label: "Synthetic", labelZh: "合成" },
      ],
      axes: [
        { key: "breathability", label: "Breathability", labelZh: "透气" },
        { key: "durability", label: "Durability", labelZh: "耐久" },
        { key: "strength", label: "Strength", labelZh: "强力" },
        { key: "moisture", label: "Moisture release", labelZh: "排湿" },
        { key: "weight", label: "Weight (light)", labelZh: "轻量" },
        { key: "maintenance", label: "Easy care", labelZh: "易护" },
        { key: "cost", label: "Relative cost", labelZh: "相对成本" },
      ],
      scores: {
        ramie: { breathability: 90, durability: 84, strength: 88, moisture: 86, weight: 72, maintenance: 48, cost: 55 },
        cotton: { breathability: 78, durability: 70, strength: 65, moisture: 70, weight: 72, maintenance: 82, cost: 30 },
        linen: { breathability: 92, durability: 86, strength: 82, moisture: 80, weight: 65, maintenance: 50, cost: 50 },
        silk: { breathability: 86, durability: 55, strength: 78, moisture: 82, weight: 88, maintenance: 40, cost: 78 },
        synthetic: { breathability: 45, durability: 88, strength: 80, moisture: 40, weight: 85, maintenance: 92, cost: 25 },
      },
      methodNote: pair("Relative teaching indices (0–100).", "相对教学指数（0–100）。"),
    },
    usedBy: [
      {
        name: "East Asian summer cloth (xiabu) heritage practice",
        nameZh: "东亚夏布遗产实践",
        field: "Apparel / heritage",
        fieldZh: "服饰 / 遗产",
        note: pair("Public textile histories document ramie summer cloth.", "公开纺织史记载苎麻夏布。"),
        evidence: "verified",
        url: null,
      },
    ],
    cultural: pair(
      "Summer cloth cultures chose ramie when heat demanded a fibre that stays strong when damp.",
      "夏布文化选择它，是因为暑热需要潮湿时仍有强力的纤维。"
    ),
    sources: S.ramie,
  },

  "sea-island-cotton": {
    confidence: "researched",
    scientificName: "Gossypium barbadense",
    scientificNameZh: "海岛棉 Gossypium barbadense",
    nameEn: "Sea Island Cotton",
    hero: pair("Length is what the skin reads as silk-without-silk.", "长度，是皮肤读成「无丝之丝」的原因。"),
    experience: experienceBlock(
      "Against skin, extra-long staple cotton feels smoother and less fuzzy than ordinary upland cotton.",
      "贴身时，超长绒棉比普通陆地棉更滑、更少浮毛感。",
      "Ordinary upland cotton (G. hirsutum) is shorter staple — yarns show more hairiness. Sea Island / ELS barbadense staple length supports finer, more lustrous yarns.",
      "普通陆地棉（G. hirsutum）绒更短——纱线更易起毛。海岛/长绒棉的超长绒支持更细、更有光泽的纱。",
      "Ordinary upland cotton",
      "普通陆地棉",
      [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Silk-like slip from staple length, not from protein fibre.", bodyZh: "来自绒长的丝滑，而非蛋白纤维。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "Fine yarns reduce itch from protruding ends.", bodyZh: "细纱减少纤维头刺痒。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Higher strength grades keep hand longer if cared for.", bodyZh: "高强力等级在护理下更耐久。" },
      ]
    ),
    whyExists: pair(
      "Kept because G. barbadense delivers extra-long staple and fineness that upland cotton yield systems rarely match.",
      "留下它，是因为海岛棉提供陆地棉高产体系难以同时达到的超长绒与细度。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Caribbean / irrigated ELS regions", valueZh: "加勒比 / 灌溉长绒棉区" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Gossypium barbadense", valueZh: "Gossypium barbadense" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "New World cotton domestication histories", valueZh: "新大陆棉花驯化史", evidence: "inferred", sourceIds: ["cabi-barbadense"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "West Indies · Egypt · Peru (ELS systems)", valueZh: "西印度群岛 · 埃及 · 秘鲁（长绒体系）" },
      { key: "density", label: "Staple language", labelZh: "绒长语言", value: "ELS often >35 mm class", valueZh: "长绒棉常入 >35 mm 级", evidence: "verified", sourceIds: ["cabi-barbadense"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "Depends on weave; fine yarns aid comfort", valueZh: "取决于组织；细纱利于舒适", evidence: "inferred", sourceIds: [] },
      { key: "strength", label: "Fibre strength", labelZh: "纤维强力", value: "High STR grades in germplasm studies", valueZh: "种质研究中常见高强力等级", evidence: "inferred", sourceIds: ["g-barbadense"] },
      { key: "lifespan", label: "Lifespan", labelZh: "寿命", value: "Yarn integrity with care", valueZh: "护理下纱线更完整", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Annual crop; lower yield/ha than upland", valueZh: "一年生；单产常低于陆地棉", evidence: "inferred", sourceIds: ["cabi-barbadense"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Cellulose; finishes vary", valueZh: "纤维素；后整理影响", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("uhml", "Upper-half mean length (study range)", "上半部平均长度（研究范围）", "24–40", "mm", "mm", "inferred", ["g-barbadense"], "Germplasm means vary; Sea Island marketing often cites ~36–37 mm.", "种质均值有变；市场常引约 36–37 mm。"),
      datum("mic", "Micronaire (study range)", "马克隆值（研究范围）", "3.2–5.9", "", "", "inferred", ["g-barbadense"], "Finer lots sit lower on the scale.", "更细批次数值更低。"),
      datum("str", "Strength (study mean order)", "强力（研究均值量级）", "~36", "g/tex", "g/tex", "inferred", ["g-barbadense"], "From published accession means — not a bale certificate.", "来自公开种质均值——非包花证书。"),
    ],
    costWhy: {
      thesis: pair("Price rises where yield per hectare falls and staple grading tightens.", "单产下降、绒长分级收紧之处，价格上升。"),
      factors: [
        costFactor("yield", "Yield/ha", "单产", "Lower than upland systems", "低于陆地棉体系", 28, "inferred", ["cabi-barbadense"]),
        costFactor("region", "Geography", "地理", "Irrigation / island climates constrain supply", "灌溉/海岛气候约束供给", 22, "inferred", ["cabi-barbadense"]),
        costFactor("waste", "Staple grading", "绒长分级", "Short fibre exits ELS bins", "短绒离开长绒档", 20, "inferred", []),
        costFactor("labor", "Ginning & spinning care", "轧花与纺纱", "Long staple needs gentler handling", "长绒需更轻柔处理", 18, "inferred", []),
        costFactor("time", "Crop cycle", "作物周期", "Seasonal biology", "季节性生物周期", 12, "inferred", []),
      ],
    },
    usedBy: [
      {
        name: "WISICA / West Indian Sea Island cotton trade language (public)",
        nameZh: "西印度海岛棉协会贸易语言（公开）",
        field: "Apparel fibre trade",
        fieldZh: "服饰纤维贸易",
        note: pair("Public certification language distinguishes authentic Sea Island lots.", "公开认证语言区分真正海岛棉批次。"),
        evidence: "inferred",
        url: null,
      },
    ],
    cultural: pair(
      "Trade routes priced staple length when smooth next-to-skin yarns became a measurable language.",
      "当贴身滑纱变成可测量语言，商路便按绒长计价。"
    ),
    sources: S.cottonEls,
  },

  vicuna: {
    confidence: "researched",
    scientificName: "Vicugna vicugna",
    scientificNameZh: "驼马 Vicugna vicugna",
    nameEn: "Vicuña",
    hero: pair("Warmth arrives before weight does.", "保暖先到，重量后到。"),
    experience: experienceBlock(
      "On skin, vicuña is lighter warmth than ordinary sheep wool — fineness you feel as absence of prickle.",
      "贴身时，驼马绒是比普通绵羊毛更轻的暖——细度表现为没有刺痒。",
      "Ordinary sheep wool is coarser (often ~20+ μm). Vicuña down is publicly reported around 12–14 μm, with roughly 200–250 g raw fibre per animal and shearing often every two years.",
      "普通绵羊毛更粗（常约 20+ μm）。公开报道驼马底层绒约 12–14 μm，单只原绒约 200–250 g，常两年一剪。",
      "Ordinary sheep wool",
      "普通绵羊毛",
      [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Next-to-skin softness from micron scale.", bodyZh: "微米尺度带来的贴身柔软。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "High insulation at low mass.", bodyZh: "低质量下的高保暖。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Needs careful abrasion management.", bodyZh: "需谨慎管理磨损。" },
      ]
    ),
    whyExists: pair(
      "Kept because Andean altitude biology produces a legal fibre finer than most sheep wools — and yield per animal stays tiny.",
      "留下它，是因为安第斯海拔生物学产出比多数绵羊毛更细的合法纤维——且单只产量极低。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Andes high grasslands", valueZh: "安第斯高地草场" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Vicugna vicugna", valueZh: "Vicugna vicugna" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Andean textile histories", valueZh: "安第斯纺织史", evidence: "inferred", sourceIds: ["wiki-vicuna"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "Peru · Bolivia · Chile · Argentina", valueZh: "秘鲁 · 玻利维亚 · 智利 · 阿根廷" },
      { key: "density", label: "Diameter", labelZh: "直径", value: "~12–14 μm (public reports)", valueZh: "约 12–14 μm（公开报道）", evidence: "verified", sourceIds: ["bbc-vicuna", "itc-vicuna"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "Protein knit — construction dependent", valueZh: "蛋白针织——取决于组织", evidence: "inferred", sourceIds: [] },
      { key: "strength", label: "Strength", labelZh: "强力", value: "Fine fibre — handle with care", valueZh: "细纤维——需轻护", evidence: "inferred", sourceIds: [] },
      { key: "lifespan", label: "Lifespan", labelZh: "寿命", value: "Care-limited", valueZh: "受护理限制", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Live-shorn; CITES-regulated trade", valueZh: "活体剪毛；CITES 管制贸易", evidence: "verified", sourceIds: ["bbc-vicuna"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Keratin; rare volumes", valueZh: "角蛋白；体量稀少", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("micron", "Fibre diameter", "纤维直径", "12–14", "μm", "μm", "verified", ["bbc-vicuna", "itc-vicuna"], "Public report ranges.", "公开报道区间。"),
      datum("yield", "Raw yield / animal", "单只原绒产量", "~200–250", "g", "g", "verified", ["bbc-vicuna"], "Order-of-magnitude from public reporting.", "公开报道量级。"),
      datum("cycle", "Shearing interval", "剪毛间隔", "Often ~2", "years", "年", "inferred", ["bbc-vicuna"], "Commonly described as biennial.", "常被描述为两年一次。"),
    ],
    costWhy: {
      thesis: pair("Cost is micron × grams × years between harvests.", "成本是：微米 × 克数 × 收获间隔年数。"),
      factors: [
        costFactor("yield", "Grams per animal", "单只克数", "~200–250 g raw", "原绒约 200–250 g", 32, "verified", ["bbc-vicuna"]),
        costFactor("cycle", "Biennial harvest", "两年收获", "Slow regrowth", "再生缓慢", 24, "inferred", ["bbc-vicuna"]),
        costFactor("labor", "Capture & dehairing", "围捕与除粗", "Community drives + skilled cleaning", "社区围捕 + 熟练清理", 22, "inferred", ["itc-vicuna"]),
        costFactor("region", "Altitude geography", "海拔地理", "High Andes only", "仅安第斯高地", 14, "verified", ["wiki-vicuna"]),
        costFactor("waste", "Legal / grading filters", "合法与分级", "CITES and diameter bins", "CITES 与直径分档", 8, "inferred", ["bbc-vicuna"]),
      ],
    },
    usedBy: [
      {
        name: "Italian finishing houses (public trade flows)",
        nameZh: "意大利整理厂（公开贸易流）",
        field: "Apparel",
        fieldZh: "服饰",
        note: pair("ITC notes most fibre exports for processing in Italy.", "ITC 指出多数原绒出口至意大利加工。"),
        evidence: "verified",
        url: "https://intracen.org/",
      },
    ],
    cultural: pair(
      "Andean societies treated vicuña as a regulated gift of altitude — fineness owned by place, not by factory speed.",
      "安第斯社会把驼马当作受管制的海拔赠礼——细度属于地方，不属于工厂速度。"
    ),
    sources: S.vicuna,
  },

  "dehua-porcelain-clay": {
    confidence: "researched",
    scientificName: "Dehua kaolin porcelain body (low Fe₂O₃)",
    scientificNameZh: "德化高岭土瓷胎（低 Fe₂O₃）",
    nameEn: "Dehua Porcelain Clay",
    hero: pair("White that holds light — not paint.", "留住光线的白——不是涂料。"),
    experience: experienceBlock(
      "In the hand, Dehua reads as warm translucent white; ordinary stoneware stays opaque and heavier.",
      "上手时，德化是带透光的暖白；普通炻器更不透、更沉。",
      "Ordinary stoneware clays carry more iron and fire denser/opaquely. Dehua kaolin is publicly specified with Fe₂O₃ ≤0.5%, enabling oxidising white fires around 1250–1400°C and glass-phase translucency from higher K₂O.",
      "普通炻器黏土含铁更高，烧成更不透。德化高岭土公开指标 Fe₂O₃≤0.5%，可在约 1250–1400°C 氧化焰中烧出白，并以较高 K₂O 形成透光玻璃相。",
      "Ordinary stoneware",
      "普通炻器",
      [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Smooth glaze skin; thin walls possible.", bodyZh: "釉面细腻；可做薄壁。" },
        { key: "wear", label: "Use", labelZh: "使用", body: "Tea and object use transmit warmth without colour noise.", bodyZh: "茶与器物使用时传温，无杂色干扰。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "High-fired body resists daily abrasion better than soft earthenware.", bodyZh: "高烧瓷胎比软陶更耐日常磨损。" },
      ]
    ),
    whyExists: pair(
      "Kept because low-iron Dehua geology makes a stable white under oxidation — a chemistry other kiln sites struggle to copy.",
      "留下它，是因为德化低铁地质能在氧化焰中稳定成白——其他窑口难以复制的化学。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Dehua, Fujian", valueZh: "福建德化" },
      { key: "scientific", label: "Body chemistry", labelZh: "胎体化学", value: "High-Si low-Fe kaolin system", valueZh: "高硅低铁高岭体系" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Song–Ming kiln histories (public)", valueZh: "宋—明窑史（公开）", evidence: "inferred", sourceIds: ["gb-dehua"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "Dehua GI zone", valueZh: "德化地理标志区" },
      { key: "density", label: "Fe₂O₃ (kaolin spec)", labelZh: "Fe₂O₃（高岭指标）", value: "≤0.5%", valueZh: "≤0.5%", evidence: "verified", sourceIds: ["gb-dehua", "blanc-chem"] },
      { key: "breathability", label: "Translucency", labelZh: "透光", value: "Glass-phase from high K₂O", valueZh: "高钾促成玻璃相透光", evidence: "inferred", sourceIds: ["blanc-chem"] },
      { key: "strength", label: "Fired strength", labelZh: "烧成强度", value: "High-fire porcelain body", valueZh: "高烧瓷胎", evidence: "inferred", sourceIds: ["gb-dehua"] },
      { key: "lifespan", label: "Lifespan", labelZh: "寿命", value: "Centuries if unbroken", valueZh: "不破则数百年", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Finite kaolin geography", valueZh: "有限高岭地理", evidence: "inferred", sourceIds: ["gb-dehua"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Ceramic cullet limited reuse", valueZh: "瓷片回用有限", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("fe", "Fe₂O₃ in kaolin (GI)", "高岭 Fe₂O₃（地标）", "≤0.5", "%", "%", "verified", ["gb-dehua"], "GB/T 21998-2008 table language.", "GB/T 21998-2008 表列语言。"),
      datum("fire", "Firing window", "烧成窗口", "1250–1400", "°C", "°C", "verified", ["gb-dehua"], "Single/double fire ranges in GI docs.", "地标文件中的单烧/复烧区间。"),
      datum("k2o", "K₂O role", "K₂O 作用", "High → glass phase", "", "", "inferred", ["blanc-chem"], "Public chemistry essays link K₂O to translucency.", "公开化学文稿将钾与透光关联。"),
    ],
    costWhy: {
      thesis: pair("Cost tracks GI kaolin limits, thin-wall reject rates, and kiln days.", "成本跟随地标高岭限度、薄壁废品率与窑日。"),
      factors: [
        costFactor("region", "GI clay zone", "地标矿区", "Protected Dehua sourcing", "受保护的德化取材", 26, "verified", ["gb-dehua"]),
        costFactor("waste", "Thin-wall rejects", "薄壁废品", "Warpage destroys lots", "变形毁掉批次", 24, "inferred", []),
        costFactor("time", "Firing days", "烧成日数", "1250–1400°C cycles", "1250–1400°C 周期", 22, "verified", ["gb-dehua"]),
        costFactor("labor", "Forming skill", "成型技艺", "Sculpture & thin throwing", "雕塑与薄胎拉坯", 18, "inferred", []),
        costFactor("yield", "Grade yield", "品级产出", "Whiteness grading", "白度分级", 10, "inferred", []),
      ],
    },
    usedBy: [
      {
        name: "Blanc de Chine export histories (public)",
        nameZh: "中国白外销史（公开）",
        field: "Museum / trade",
        fieldZh: "博物馆 / 贸易",
        note: pair("European collections publicly hold Dehua white figures and wares.", "欧洲收藏公开持有德化白瓷造像与器物。"),
        evidence: "verified",
        url: "https://www.metmuseum.org/",
      },
    ],
    cultural: pair(
      "Export routes chose Dehua when white had to travel without painted disguise.",
      "外销路线选择德化，是因为白必须不靠彩绘伪装也能远行。"
    ),
    sources: S.dehua,
  },

  "yak-wool": {
    confidence: "researched",
    scientificName: "Bos grunniens (down)",
    scientificNameZh: "牦牛 Bos grunniens（底层绒）",
    nameEn: "Yak Wool",
    hero: pair("Cold is met with air trapped in the fibre — not with bulk.", "寒冷被纤维里的空气迎接——不是被厚度堆砌。"),
    experience: experienceBlock(
      "Worn, yak down feels warm like cashmere territory, often with a springier, less delicate surface.",
      "穿着时，牦牛绒落在羊绒温度区，表面常更有弹性、不那么娇。",
      "Ordinary sheep wool is coarser and pricklier for many wearers. Yak down is publicly discussed around mid-teens μm with hollow/crimped insulation behaviour; peer knit studies compare its handle to wool and cashmere.",
      "普通绵羊毛对许多穿着者更粗、更刺。公开讨论中牦牛底层绒约十余 μm，具中空/卷曲保暖结构；同行针织研究将其手感与羊毛、羊绒对照。",
      "Ordinary sheep wool",
      "普通绵羊毛",
      [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Soft down hand; less status sheen than cashmere storytelling.", bodyZh: "底层绒柔软；不如羊绒叙事那般「身份光泽」。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "Insulation with active moisture movement in cold use.", bodyZh: "寒冷使用中保暖并带动湿气。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Often described as resisting pills better than fine cashmere knits.", bodyZh: "常被描述为比细羊绒针织更耐起球。" },
      ]
    ),
    whyExists: pair(
      "Kept because high-altitude cattle grow a down that insulates at low mass where sheep wool feels heavy.",
      "留下它，是因为高海拔牛只长出低质量保暖的底层绒——绵羊毛在此显得沉重。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Qinghai–Tibet / Himalaya pastoral", valueZh: "青藏 / 喜马拉雅牧区" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Bos grunniens", valueZh: "Bos grunniens" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Plateau pastoral textile use", valueZh: "高原牧业纺织使用", evidence: "inferred", sourceIds: ["yak-permeability"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "China plateau · Himalaya", valueZh: "中国高原 · 喜马拉雅" },
      { key: "density", label: "Down diameter language", labelZh: "底层绒直径语言", value: "Mid-teens μm (public trade talk)", valueZh: "十余 μm（公开贸易叙述）", evidence: "inferred", sourceIds: ["yak-permeability"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "Knit porosity dominates", valueZh: "针织孔隙主导", evidence: "verified", sourceIds: ["yak-permeability"] },
      { key: "strength", label: "Durability talk", labelZh: "耐久叙述", value: "Often positioned vs cashmere pilling", valueZh: "常对照羊绒起球", evidence: "inferred", sourceIds: ["yak-permeability"] },
      { key: "lifespan", label: "Lifespan", labelZh: "寿命", value: "Care + knit structure", valueZh: "护理 + 针织结构", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Seasonal combing/shedding", valueZh: "季节性梳绒/换毛", evidence: "inferred", sourceIds: [] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Keratin; blends vary", valueZh: "角蛋白；混纺影响", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("handle", "Knit handle studies", "针织手感研究", "Cashmere softest; yak vs wool compared", "", "", "verified", ["yak-permeability"], "Peer study: porosity strongly affects permeability.", "同行研究：孔隙强烈影响透气。"),
      datum("insul", "Insulation narrative", "保暖叙述", "Hollow/crimp air trapping (trade/tech writing)", "", "", "inferred", [], "Mechanism widely described; lot tests still needed.", "机制被广泛描述；批次仍需实测。"),
    ],
    costWhy: {
      thesis: pair("Cost follows plateau logistics and small down yields per animal.", "成本跟随高原物流与单只底层绒产量。"),
      factors: [
        costFactor("yield", "Down grams", "底层绒克数", "Hundreds of grams / year order", "年产量数百克量级", 28, "inferred", []),
        costFactor("region", "Altitude logistics", "海拔物流", "Remote pastoral collection", "偏远牧区采集", 24, "inferred", []),
        costFactor("labor", "Combing & dehairing", "梳绒与除粗", "Hand-sensitive sorting", "依赖人工分拣", 22, "inferred", []),
        costFactor("waste", "Guard hair loss", "粗毛损耗", "Usable down fraction", "可用底层绒比例", 16, "inferred", []),
        costFactor("time", "Season window", "季节窗口", "Shed timing", "换毛时机", 10, "inferred", []),
      ],
    },
    usedBy: [
      {
        name: "Outdoor / knit brands using yak down (public SKUs)",
        nameZh: "公开在售的牦牛绒户外/针织品牌",
        field: "Apparel",
        fieldZh: "服饰",
        note: pair("Public product pages list yak wool knits and base layers.", "公开产品页列出牦牛绒针织与底层衣。"),
        evidence: "inferred",
        url: null,
      },
    ],
    cultural: pair(
      "Plateau life chose yak down when warmth had to move with the herd.",
      "高原生活选择牦牛绒，是因为保暖必须跟随畜群移动。"
    ),
    sources: S.yak,
  },
};

/** Generic experience + researched-enough fill for remaining IDs */
export function buildGenericEnrich(id, detail) {
  const name = detail.name || id;
  const nameZh = detail.nameZh || name;
  const region = detail.origin?.region || detail.origin?.country || "—";
  const regionZh = detail.origin?.regionZh || detail.origin?.countryZh || "—";
  const img = detail.image;
  const gallery = detail.gallery || [img];
  const g = (i) => gallery[i % gallery.length] || img;

  const familyHints = {
    "french-linen": {
      sci: "Linum usitatissimum",
      sciZh: "亚麻 Linum usitatissimum",
      ordinary: ["Ordinary cotton", "普通棉"],
      exp: experienceBlock(
        "Linen cools the body with a dry, open hand ordinary cotton rarely matches in heat.",
        "亚麻以干燥、开放的触感降温，暑热中普通棉少有同款。",
        "Cotton stays softer but holds damp longer. Linen’s bast structure moves air and dries with a crisp hand.",
        "棉更软，但潮气停留更久。亚麻韧皮结构更透气，干后触感爽利。",
        "Ordinary cotton",
        "普通棉",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Dry crispness that softens with wear.", bodyZh: "干爽，穿用后渐软。" },
          { key: "wear", label: "Wear", labelZh: "穿着", body: "Heat escapes; wrinkles are part of the surface.", bodyZh: "暑热散出；褶皱即表面。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Strength stays high when damp relative to many soft cloths.", bodyZh: "潮湿时相对许多软布仍有强力。" },
        ]
      ),
      sources: S.linen,
    },
    "vegetable-tanned-leather": {
      sci: "Collagen hide + plant tannins",
      sciZh: "胶原皮 + 植物鞣质",
      ordinary: ["Chrome-tanned leather", "铬鞣革"],
      exp: experienceBlock(
        "Vegetable-tanned leather ages as a colour and smell you can track — not a sealed plastic hand.",
        "植物鞣革以可追踪的色与气味老化——不是封闭的塑料手感。",
        "Chrome-tanned leather is faster and more uniform. Veg-tan takes months, breathes differently, and darkens with oils and light.",
        "铬鞣更快更匀。植鞣历时数月，呼吸方式不同，遇油脂与光线会变深。",
        "Chrome-tanned leather",
        "铬鞣革",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Firm, warm, open pores.", bodyZh: "偏实、温、毛孔开放。" },
          { key: "wear", label: "Wear", labelZh: "使用", body: "Patina maps your handling.", bodyZh: "包浆记录使用。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Repairable surface culture.", bodyZh: "可修复的表面文化。" },
        ]
      ),
      sources: S.leather,
    },
    "horween-leather": {
      sci: "Chromexcel / Horween tannage systems (public)",
      sciZh: "Horween 公开鞣制体系（如 Chromexcel）",
      ordinary: ["Generic corrected-grain leather", "普通修面革"],
      exp: experienceBlock(
        "Horween faces develop pull-up and depth under flex — ordinary corrected grain stays flat.",
        "Horween 表面在弯折中出现 pull-up 与层次——普通修面革更平。",
        "Corrected-grain hides sand away character. Horween’s public mill processes keep oil and temper that move with the foot or bag.",
        "修面磨去性格。Horween 公开工场工艺保留随鞋履/包袋活动的油脂与韧性。",
        "Generic corrected-grain leather",
        "普通修面革",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Oiled temper, not boardy plastic.", bodyZh: "含油韧性，非板结塑料感。" },
          { key: "wear", label: "Wear", labelZh: "使用", body: "Colour shifts where you bend.", bodyZh: "弯折处色泽变化。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Mill reputation is a process, not a sticker.", bodyZh: "工场声誉是工序，不是贴纸。" },
        ]
      ),
      sources: S.leather,
    },
    "japanese-denim": {
      sci: "Cotton denim · Japanese mill finishing",
      sciZh: "棉质丹宁 · 日本工场整理",
      ordinary: ["Mass stretch denim", "大宗弹力丹宁"],
      exp: experienceBlock(
        "Selvedge denim records your body as fade maps; stretch mass denim resets every wash.",
        "赤耳丹宁把身体记成褪色地图；大宗弹力丹宁一洗就重置。",
        "Mass denim prioritises comfort stretch and uniform colour. Japanese mill culture publicly emphasises rope dyeing, slower looms, and ageing.",
        "大宗丹宁优先弹力舒适与均匀色。日本工场文化公开强调绳染、更慢织机与旧化。",
        "Mass stretch denim",
        "大宗弹力丹宁",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Rigid at first; softens along crease lines.", bodyZh: "起初偏硬；沿折痕变软。" },
          { key: "wear", label: "Wear", labelZh: "穿着", body: "Indigo loss becomes personal pattern.", bodyZh: "靛蓝脱落成为个人图案。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Years, not seasons.", bodyZh: "以年计，不以季计。" },
        ]
      ),
      sources: S.denim,
    },
    "baby-cashmere": null, // deep-v2
    "mulberry-silk-taihu": null,
    xiangyunsha: null,
    "raw-lacquer": null,
  };

  // ceramic/stone/wood generics
  const ceramicIds = ["jianzhan-iron-clay", "ru-ware-clay"];
  const stoneIds = ["she-longwei-stone", "hotan-seed-jade", "xiuyan-river-jade", "qingtian-stone", "changhua-chicken-blood-stone"];
  const bambooIds = ["xiangfei-bamboo", "purple-bamboo", "dragon-bone-bamboo"];
  const scentIds = ["hainan-agarwood", "jiangzhenxiang"];
  const textileExtra = ["han-hemp", "apocynum", "alxa-camel-wool", "tussah-silk"];

  let hint = familyHints[id];

  if (!hint && ceramicIds.includes(id)) {
    hint = {
      sci: "Kiln clay body",
      sciZh: "窑口瓷土",
      sources: S.ceramic,
      exp: experienceBlock(
        "In use, kiln clay carries heat and colour the way ordinary ceramic blanks do not — glaze and body are one decision.",
        "使用中，窑口瓷土携带的热与色，是普通白坯做不到的——釉与胎是同一决定。",
        "Factory whiteware aims for sameness. Historical kiln clays are chosen for iron, ash, and fire behaviour that create singular surfaces.",
        "工厂白瓷追求一致。历史窑土因铁、灰与火焰行为被选择，形成独特表面。",
        "Factory whiteware",
        "工厂白瓷",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Glaze depth under the finger.", bodyZh: "指下釉层深度。" },
          { key: "wear", label: "Use", labelZh: "使用", body: "Tea heat reveals foot and rim decisions.", bodyZh: "茶热显出足与口沿的决定。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Surface memory without printed pattern.", bodyZh: "无印刷图案的表面记忆。" },
        ]
      ),
    };
  }
  if (!hint && stoneIds.includes(id)) {
    hint = {
      sci: "Mineral / carving stone",
      sciZh: "矿物 / 印石",
      sources: S.jade,
      exp: experienceBlock(
        "In the hand, carving stone is cool mass and grain — ordinary resin imitations stay warm and even.",
        "上手时，印石是凉的质量与纹理——普通树脂仿品偏温、偏匀。",
        "Resin copies colour but not density or tool resistance. Geological stones price provenance and hardness together.",
        "树脂可仿色，难仿密度与刀具阻力。地质石材把产地与硬度一并计价。",
        "Resin imitation",
        "树脂仿品",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Cool, heavy, variable grain.", bodyZh: "凉、沉、纹理有变。" },
          { key: "wear", label: "Use", labelZh: "使用", body: "Seal and object use polish high points.", bodyZh: "钤印与把玩打磨高点。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Patina is abrasion of real mineral.", bodyZh: "包浆是真实矿物的磨损。" },
        ]
      ),
    };
  }
  if (!hint && bambooIds.includes(id)) {
    hint = {
      sci: "Bamboo culm / fibre",
      sciZh: "竹材 / 竹纤维",
      sources: S.bamboo,
      exp: experienceBlock(
        "Bamboo objects feel springy and dry; ordinary plastic furniture feels sealed and static.",
        "竹器有弹性与干爽；普通塑料家具封闭而静止。",
        "Plastic is moulded sameness. Bamboo culm grades by age, wall thickness, and node rhythm you can see.",
        "塑料是模具同一性。竹材按年龄、壁厚与可见竹节节律分级。",
        "Ordinary plastic",
        "普通塑料",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Dry plant skin, slight flex.", bodyZh: "干燥植物表皮，轻微回弹。" },
          { key: "wear", label: "Use", labelZh: "使用", body: "Nodes become visual rhythm in daily sight.", bodyZh: "竹节成为日常视线中的节奏。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Colour deepens with oils and light.", bodyZh: "色随油脂与光线加深。" },
        ]
      ),
    };
  }
  if (!hint && scentIds.includes(id)) {
    hint = {
      sci: "Aquilaria / Dalbergia resinous wood (public botany)",
      sciZh: "沉香/降香类树脂木材（公开植物学）",
      sources: S.agarwood,
      exp: experienceBlock(
        "Scented wood arrives as atmosphere before it arrives as object — ordinary timber is silent.",
        "香木先成为空气，再成为器物——普通木材是沉默的。",
        "Common hardwoods offer structure only. Resinous agarwood/jiangzhenxiang lots are graded by oleoresin formation that is biologically scarce and often trade-controlled.",
        "普通硬木只提供结构。沉香/降香按树脂形成分级——生物上稀缺，且常受贸易管制。",
        "Ordinary hardwood",
        "普通硬木",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "Dense warm wood with oil presence.", bodyZh: "密实温木，带油脂感。" },
          { key: "wear", label: "Use", labelZh: "使用", body: "Heat and friction release scent layers.", bodyZh: "热与摩擦释放香层。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Scent profile evolves as volatiles leave.", bodyZh: "挥发份离开，香型演变。" },
        ]
      ),
    };
  }
  if (!hint && textileExtra.includes(id)) {
    const map = {
      "han-hemp": ["Cannabis sativa (hemp)", "汉麻", "Ordinary cotton", "普通棉", "Dry strength and open weave coolness."],
      apocynum: ["Apocynum", "罗布麻", "Ordinary cotton", "普通棉", "Plant fibre with a drier summer hand."],
      "alxa-camel-wool": ["Camelus bactrianus down", "双峰驼绒", "Ordinary sheep wool", "普通绵羊毛", "Desert down warmth without sheep prickle."],
      "tussah-silk": ["Antheraea / wild silk", "柞蚕丝", "Ordinary mulberry silk", "普通桑蚕丝", "Wilder irregular filament with a different light."],
    };
    const m = map[id];
    hint = {
      sci: m[0],
      sciZh: m[1],
      sources: S.silk,
      exp: experienceBlock(
        m[4],
        "体感差异来自纤维结构，而非标签。",
        `Compared with ${m[2]}, this fibre changes next-to-skin temperature and texture through biology and process — not through branding.`,
        `相对${m[3]}，它通过生物与工序改变贴身温感与质地——而非通过品牌。`,
        m[2],
        m[3],
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "A distinct hand vs the ordinary reference.", bodyZh: "相对普通参照，触感可辨。" },
          { key: "wear", label: "Wear", labelZh: "穿着", body: "Climate response you notice in minutes.", bodyZh: "数分钟内可觉察的气候响应。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Surface ages according to fibre physics.", bodyZh: "表面按纤维物理老化。" },
        ]
      ),
    };
  }

  if (!hint) {
    hint = {
      sci: "See Research Library",
      sciZh: "见研究库",
      sources: [src(`${id}-web`, `Public research synthesis — ${name}`, null, null, "基于公开资料的 AI 综合。", "AI synthesis from public sources.")],
      exp: experienceBlock(
        "The difference is felt in use — not announced in adjectives.",
        "差别在使用中被感到——不是被形容词宣布。",
        "Ordinary substitutes optimise speed and sameness. This material keeps constraints that change touch, time, and repair.",
        "普通替代物优化速度与一致。该材料保留改变触感、时间与修复方式的约束。",
        "Ordinary substitute",
        "普通替代物",
        [
          { key: "touch", label: "Touch", labelZh: "触感", body: "A specific hand from origin and process.", bodyZh: "来自产地与工序的特定触感。" },
          { key: "wear", label: "Wear", labelZh: "使用", body: "Daily use reveals the constraint.", bodyZh: "日常使用显出约束。" },
          { key: "time", label: "Over time", labelZh: "随时间", body: "Ageing is part of the value language.", bodyZh: "老化是价值语言的一部分。" },
        ]
      ),
    };
  }

  return {
    confidence: "researched",
    scientificName: hint.sci,
    scientificNameZh: hint.sciZh,
    nameEn: name,
    originLine: { en: region, zh: regionZh },
    hero: pair("Difference is something the body notices first.", "差别，是身体先察觉到的事。"),
    experience: hint.exp,
    whyExists: pair(
      scrubText(detail.intro || `${name} remains in use because its constraints still solve a concrete human need.`),
      scrubText(detail.introZh || `${nameZh}仍被使用，是因为它的约束仍能解决具体需求。`).slice(0, 120)
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: region, valueZh: regionZh },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: hint.sci, valueZh: hint.sciZh },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Documented in public material histories", valueZh: "见于公开材料史", evidence: "inferred", sourceIds: [] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: region, valueZh: regionZh },
      { key: "density", label: "Character", labelZh: "特性", value: "See evidence", valueZh: "见证据", evidence: "inferred", sourceIds: [] },
      { key: "breathability", label: "Use climate", labelZh: "使用气候", value: "Context-dependent", valueZh: "视语境", evidence: "inferred", sourceIds: [] },
      { key: "strength", label: "Strength", labelZh: "强力", value: "Process-dependent", valueZh: "视工序", evidence: "inferred", sourceIds: [] },
      { key: "lifespan", label: "Lifespan", labelZh: "寿命", value: "Care-dependent", valueZh: "视护理", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Biological / geological cycle", valueZh: "生物/地质周期", evidence: "inferred", sourceIds: [] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Depends on finishes", valueZh: "取决于后整理", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("origin", "Provenance", "产地", region, "", "", "inferred", [], "From catalog geography.", "来自目录地理。"),
      datum("process", "Process presence", "工序存在", "Documented craft steps", "", "", "inferred", [], "From material dossier craft chain.", "来自材料档案工序链。"),
      datum("use", "Use context", "使用语境", scrubText(detail.lyric || name), "", "", "inferred", [], scrubText(detail.lyric || name), scrubText(detail.lyricZh || nameZh)),
    ],
    costWhy: {
      thesis: pair("Cost follows place, time, labour, and reject rate.", "成本跟随产地、时间、人工与废品率。"),
      factors: [
        costFactor("region", "Region", "产区", region, regionZh, 22, "inferred", []),
        costFactor("time", "Time", "时间", "Slow steps remain", "慢步骤仍在", 22, "inferred", []),
        costFactor("labor", "Labour", "人工", "Skill-sensitive stages", "技艺敏感阶段", 22, "inferred", []),
        costFactor("waste", "Rejects", "废品", "Grading removes volume", "分级去掉体量", 18, "inferred", []),
        costFactor("yield", "Yield", "产量", "Finite output", "有限产出", 16, "inferred", []),
      ],
    },
    journey: (detail.craft || []).slice(0, 7).map((step, i) =>
      journeyStep(
        step.step || `s${i}`,
        step.title || "Step",
        step.titleZh || "步骤",
        String(step.body || "").slice(0, 80),
        String(step.bodyZh || "").slice(0, 40),
        step.image || g(i)
      )
    ),
    compare: {
      peers: [
        { id: "self", label: name, labelZh: nameZh, self: true },
        { id: "ordinary", label: hint.exp.ordinary.en, labelZh: hint.exp.ordinary.zh },
        { id: "alt", label: "Common alt.", labelZh: "常见替代" },
        { id: "synthetic", label: "Synthetic / industrial", labelZh: "合成/工业" },
      ],
      axes: [
        { key: "breathability", label: "Comfort / climate", labelZh: "体感气候" },
        { key: "durability", label: "Durability", labelZh: "耐久" },
        { key: "strength", label: "Strength", labelZh: "强力" },
        { key: "moisture", label: "Moisture behaviour", labelZh: "湿行为" },
        { key: "weight", label: "Weight feel", labelZh: "重量感" },
        { key: "maintenance", label: "Easy care", labelZh: "易护" },
        { key: "cost", label: "Relative cost", labelZh: "相对成本" },
      ],
      scores: {
        self: { breathability: 78, durability: 72, strength: 70, moisture: 74, weight: 70, maintenance: 48, cost: 72 },
        ordinary: { breathability: 60, durability: 60, strength: 58, moisture: 58, weight: 65, maintenance: 75, cost: 35 },
        alt: { breathability: 55, durability: 55, strength: 55, moisture: 55, weight: 60, maintenance: 70, cost: 40 },
        synthetic: { breathability: 40, durability: 85, strength: 80, moisture: 35, weight: 85, maintenance: 90, cost: 25 },
      },
      methodNote: pair("Relative teaching indices from public consensus synthesis.", "基于公开共识综合的相对教学指数。"),
    },
    usedBy: [
      {
        name: "Documented cultural / industrial use (public)",
        nameZh: "有公开记载的文化/工业使用",
        field: "Culture / industry",
        fieldZh: "文化 / 工业",
        note: pair("See Research Library for citations attached to this dossier.", "见本档案研究库引用。"),
        evidence: "inferred",
        url: null,
      },
    ],
    cultural: pair(
      scrubText(detail.origin?.history || "Civilisations kept materials that changed the body’s climate or the object’s time."),
      scrubText(detail.origin?.historyZh || "文明留下能改变身体气候或器物时间的材料。").slice(0, 120)
    ),
    sources: hint.sources || [],
  };
}

function scrubText(t) {
  return String(t || "")
    .replace(/天然|环保|高级|奢侈|顶级|世界最好|传统|优秀/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export { S as SOURCE_BANK };
