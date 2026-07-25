/** Deep V2 dossiers — evidence-led, banned-lexicon clean */

import { NO_PUBLIC, src, pair, datum, costFactor, journeyStep } from "./v2-lib.mjs";

const silkSrc = [
  src("fao-silk", "FAO — sericulture & raw silk production overview", 2020, "https://www.fao.org/", "粮农组织对蚕桑与生丝生产的公开概述。", "FAO public overview of sericulture."),
  src("iso-textile", "ISO textile fibre testing landscape", 2018, "https://www.iso.org/", "可比声明须指明测试方法与条件。", "Comparable claims require named test methods."),
  src("pubmed-fibroin", "PubMed — Bombyx mori fibroin literature", null, "https://pubmed.ncbi.nlm.nih.gov/", "丝素组成与力学行为的公开摘要。", "Public abstracts on fibroin mechanics."),
  src("taihu-heritage", "Jiangnan / Taihu sericulture — public heritage records", null, null, "太湖—江南蚕桑的公开文化与经济史记述。", "Public heritage records of Taihu–Jiangnan sericulture."),
];

export const DEEP_V2 = {
  "mulberry-silk-taihu": {
    confidence: "curated",
    scientificName: "Bombyx mori (fibroin filament)",
    scientificNameZh: "家蚕 Bombyx mori（丝素长丝）",
    nameEn: "Mulberry Silk",
    originLine: { en: "Taihu basin · Jiangsu–Zhejiang", zh: "太湖流域 · 苏浙" },
    hero: pair(
      "Value does not fade with the season that made it.",
      "真正的材料，不会随制造它的季节一同消逝。"
    ),
    experience: {
      thesis: pair(
        "On skin, mulberry silk is cool slip and quiet weight — ordinary polyester is sealed heat.",
        "贴身时，桑蚕丝是清凉的滑与安静的重量——普通涤纶是封闭的热。"
      ),
      vsOrdinary: pair(
        "Ordinary synthetics trap vapour against the body. Silk filament moves moisture and light differently because it is a continuous protein filament, not a melt-spun plastic.",
        "普通合成纤维把水汽闷在皮肤上。蚕丝长丝以连续蛋白丝移动湿气与光线——不是熔纺塑料。"
      ),
      ordinary: pair("Ordinary polyester", "普通涤纶"),
      senses: [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Smooth filament; temperature reads cool at first contact.", bodyZh: "长丝光滑；第一触偏凉。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "Drape follows the body without plastic spring-back.", bodyZh: "垂感贴体，无塑料回弹。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Abrasion and sun are the real enemies — care is part of the experience.", bodyZh: "磨损与日照是真正敌人——护理即体验的一部分。" },
      ],
    },
    whyExists: pair(
      "Humans kept silk because a fine continuous filament from a living cycle is hard to replace: strength at low mass, dye affinity, and a hand that synthetics still imitate rather than equal in public fibre science.",
      "人类留下它，是因为生物周期吐出的连续细丝难以替代：低质量下的强力、上色能力，以及合成纤维在公开纤维科学中仍在模仿的手感。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Taihu basin", valueZh: "太湖流域" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Bombyx mori", valueZh: "Bombyx mori" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Chinese Neolithic–Han records", valueZh: "中国新石器—汉代记载", evidence: "verified", sourceIds: ["taihu-heritage"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "Jiangsu · Zhejiang · global rearers", valueZh: "江苏 · 浙江 · 全球饲育区" },
      { key: "density", label: "Fibre density", labelZh: "纤维密度", value: "~1.3 g/cm³ (order)", valueZh: "约 1.3 g/cm³（量级）", evidence: "inferred", sourceIds: ["pubmed-fibroin"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "High when open-weave", valueZh: "疏松组织下偏高", evidence: "inferred", sourceIds: ["iso-textile"] },
      { key: "strength", label: "Tenacity", labelZh: "强力", value: "High for fineness", valueZh: "细度下偏高", evidence: "inferred", sourceIds: ["pubmed-fibroin"] },
      { key: "lifespan", label: "Object lifespan", labelZh: "器物寿命", value: "Decades with care", valueZh: "妥善护理可达数十年", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Biological cycle (seasonal)", valueZh: "生物周期（季节性）", evidence: "verified", sourceIds: ["fao-silk"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Protein fibre; finishes vary", valueZh: "蛋白纤维；后整理影响结论", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("moisture", "Moisture regain", "回潮率", "≈11", "%", "%", "inferred", ["pubmed-fibroin"], "Typical published order for silk; lot varies.", "公开文献常见量级；批次会变。"),
      datum("tenacity", "Dry tenacity (order)", "干强（量级）", "3–5", "cN/dtex", "cN/dtex", "inferred", ["pubmed-fibroin", "iso-textile"], "Requires named test method to compare lots.", "比较批次须指明测试方法。"),
      datum("abrasion", "Abrasion vs dense cloths", "相对耐磨", "Lower", "", "", "inferred", ["iso-textile"], "Fine filament faces often wear sooner than denser cloths.", "细长丝表面常比致密织物更易磨耗。"),
      datum("uv", "UV resistance", "抗紫外", "Limited", "", "", "inferred", [], "Public consensus: prolonged sun weakens silk protein.", "公开共识：长时间日照削弱丝蛋白。"),
      datum("mass", "Fabric mass range", "织物克重范围", "Weave-dependent", "g/m²", "g/m²", "inferred", ["iso-textile"], "No single public number for all Taihu cloths — mass follows weave.", "太湖丝绸无单一公开克重——随组织变化。"),
      datum("conductivity", "Thermal feel", "导热体感", "Cool-to-touch (often)", "—", "—", "inferred", [], "Depends on weave and mass.", "取决于组织与克重。"),
    ],
    costWhy: {
      thesis: pair(
        "Cost rises where biology, season, and hands refuse compression.",
        "成本升高之处，是生物、季节与人手拒绝被压缩的地方。"
      ),
      factors: [
        costFactor("region", "Region limit", "产区限制", "Know-how clustered in basin towns", "技艺集中于流域市镇", 18, "verified", ["taihu-heritage"]),
        costFactor("cycle", "Maturation cycle", "成熟周期", "Leaf → worm → cocoon follows seasons", "桑→蚕→茧跟随季节", 20, "verified", ["fao-silk"]),
        costFactor("labor", "Labour share", "人工比例", "Sorting, reeling, weaving remain hand-sensitive", "选茧、缫丝、织造仍依赖人工判断", 28, "inferred", ["fao-silk"]),
        costFactor("time", "Process time", "制作时间", "Rearing + reeling cannot be skipped", "饲育与缫丝无法跳过", 16, "verified", ["fao-silk"]),
        costFactor("waste", "Reject rate", "废品率", "Breaks & uneven denier remove metreage", "断丝与纤度不匀减少可用米数", 10, "inferred", []),
        costFactor("yield", "Annual yield cap", "年产量上限", "Biological output, not factory throughput", "生物产出，非工厂吞吐", 8, "inferred", ["fao-silk"]),
      ],
    },
    journey: [
      journeyStep("harvest", "Harvest", "采茧", "Cocoons taken at the right hour.", "适时取茧。", "/assets/editorial/materials/mulberry-silk-taihu.jpg"),
      journeyStep("select", "Selection", "选茧", "Only even cocoons enter the reel.", "匀茧才入缫。", "/assets/editorial/materials/mulberry-silk-taihu-detail.jpg"),
      journeyStep("clean", "Cleaning", "索绪", "Warm water finds the filament end.", "温水寻绪。", "/assets/editorial/materials/mulberry-silk-taihu-scene.jpg"),
      journeyStep("reel", "Reeling", "缫丝", "Several ends become one thread.", "多绪合一。", "/assets/editorial/materials/mulberry-silk-taihu.jpg"),
      journeyStep("twist", "Throwing", "络并", "Thread prepared for the loom.", "丝线备织。", "/assets/editorial/materials/mulberry-silk-taihu-detail.jpg"),
      journeyStep("weave", "Weaving", "织造", "Warp and weft record the season.", "经纬记下季节。", "/assets/editorial/materials/mulberry-silk-taihu-scene.jpg"),
      journeyStep("finish", "Finishing", "整理", "Gum eased without erasing breath.", "脱胶而不封死呼吸。", "/assets/editorial/materials/mulberry-silk-taihu.jpg"),
      journeyStep("age", "Rest", "静置", "Cloth settles before it is cut.", "成布后静候裁用。", "/assets/editorial/materials/mulberry-silk-taihu-detail.jpg"),
      journeyStep("product", "Object", "成器", "Filament becomes a lasting surface.", "长丝成为可持存的表面。", "/assets/editorial/materials/mulberry-silk-taihu-scene.jpg"),
    ],
    compare: {
      peers: [
        { id: "ramie", label: "Ramie", labelZh: "苎麻" },
        { id: "cotton", label: "Cotton", labelZh: "棉" },
        { id: "linen", label: "Linen", labelZh: "亚麻" },
        { id: "silk", label: "Silk", labelZh: "桑蚕丝", self: true },
        { id: "synthetic", label: "Synthetic", labelZh: "合成纤维" },
      ],
      axes: [
        { key: "breathability", label: "Breathability", labelZh: "透气" },
        { key: "durability", label: "Durability", labelZh: "耐久" },
        { key: "strength", label: "Strength", labelZh: "强力" },
        { key: "moisture", label: "Moisture", labelZh: "吸湿" },
        { key: "weight", label: "Weight (light)", labelZh: "轻量" },
        { key: "maintenance", label: "Easy care", labelZh: "易护" },
        { key: "cost", label: "Relative cost", labelZh: "相对成本" },
      ],
      scores: {
        ramie: { breathability: 88, durability: 82, strength: 86, moisture: 74, weight: 70, maintenance: 48, cost: 45 },
        cotton: { breathability: 78, durability: 70, strength: 68, moisture: 76, weight: 72, maintenance: 80, cost: 30 },
        linen: { breathability: 90, durability: 84, strength: 82, moisture: 72, weight: 65, maintenance: 50, cost: 48 },
        silk: { breathability: 86, durability: 55, strength: 78, moisture: 82, weight: 88, maintenance: 40, cost: 78 },
        synthetic: { breathability: 45, durability: 88, strength: 80, moisture: 35, weight: 85, maintenance: 92, cost: 25 },
      },
      methodNote: pair(
        "Relative teaching indices (0–100), not lot certificates.",
        "相对教学指数（0–100），非批次证书。"
      ),
    },
    usedBy: [
      {
        name: "Hermès",
        nameZh: "Hermès",
        field: "Apparel / accessories",
        fieldZh: "服饰 / 配饰",
        note: pair("Silk scarves appear consistently on public product pages.", "丝巾长期出现在公开产品页。"),
        evidence: "verified",
        url: "https://www.hermes.com/",
      },
      {
        name: "Museum collections (East Asian silk textiles)",
        nameZh: "博物馆藏（东亚丝织）",
        field: "Museum",
        fieldZh: "博物馆",
        note: pair("Major museums publish silk textile holdings and essays.", "大型博物馆公开丝织藏品与文稿。"),
        evidence: "verified",
        url: "https://www.metmuseum.org/",
      },
    ],
    cultural: pair(
      "Courts and trade routes chose silk when a light, dyeable filament signalled rank across distance. That history still prices grading language today.",
      "宫廷与商路选择它，是因为轻而可染的长丝能在远距离上传达等级。这段历史仍在今天的分级语言里计价。"
    ),
    sources: silkSrc,
  },

  "baby-cashmere": {
    confidence: "curated",
    scientificName: "Capra hircus laniger (undercoat)",
    scientificNameZh: "山羊 Capra hircus laniger（底层绒）",
    nameEn: "Baby Cashmere",
    originLine: { en: "Pastoral Inner Asia · Italian finishing (public)", zh: "内亚牧区 · 意大利整理（公开叙述）" },
    hero: pair(
      "Fineness has a biological ceiling.",
      "细度有生物上限。"
    ),
    experience: {
      thesis: pair(
        "Next to skin, baby cashmere is warmth without the prickle of ordinary sheep wool.",
        "贴身时，baby cashmere 是没有普通绵羊毛刺痒的暖。"
      ),
      vsOrdinary: pair(
        "Ordinary sheep wool is coarser. Baby cashmere language tracks lower micron and first combing — the body reads diameter before it reads a brand.",
        "普通绵羊毛更粗。Baby cashmere 语言追踪更低微米与第一次梳绒——身体先读直径，再读品牌。"
      ),
      ordinary: pair("Ordinary sheep wool", "普通绵羊毛"),
      senses: [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Soft undercoat hand; low prickle risk when micron is true.", bodyZh: "底层绒手感；微米属实时刺痒风险低。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "Light insulation for long hours indoors.", bodyZh: "长时间室内的轻保暖。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Pilling management is part of ownership.", bodyZh: "管理起球是拥有的一部分。" },
      ],
    },
    whyExists: pair(
      "Kept because undercoat diameter delivers next-to-skin comfort that coarser fibres cannot fake without changing the animal itself.",
      "留下它，是因为底层绒直径带来的贴身舒适，粗纤维无法在不改变动物本身的前提下伪造。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Inner Asia pastures", valueZh: "内亚草场" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Capra hircus laniger", valueZh: "Capra hircus laniger" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Pastoral textile histories", valueZh: "游牧纺织史", evidence: "inferred", sourceIds: ["ccmi"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "Mongolia · Inner Asia", valueZh: "蒙古 · 内亚" },
      { key: "density", label: "Mean diameter language", labelZh: "直径语言", value: "Micron grading", valueZh: "微米分级", evidence: "verified", sourceIds: ["ccmi"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "Moderate–high (knit)", valueZh: "中高（针织）", evidence: "inferred", sourceIds: [] },
      { key: "strength", label: "Strength", labelZh: "强力", value: "Trades off with fineness", valueZh: "与细度互换", evidence: "inferred", sourceIds: ["ccmi"] },
      { key: "lifespan", label: "Object lifespan", labelZh: "器物寿命", value: "Years with pilling care", valueZh: "护理起球可达数年", evidence: "inferred", sourceIds: [] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Seasonal combing", valueZh: "季节性梳绒", evidence: "verified", sourceIds: ["ccmi"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Keratin; blends vary", valueZh: "角蛋白；混纺影响", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("micron", "Diameter language", "直径", "Lower µm → less prickle (studies)", "µm", "µm", "inferred", ["ccmi"], "Public comfort literature links mean diameter to prickle.", "公开舒适性研究将平均直径与刺痒感关联。"),
      datum("yield", "Yield per animal", "单只产量", "Small (first combing)", "", "", "inferred", ["ccmi"], "First combing volumes are intrinsically limited.", "第一次梳绒量本身有限。"),
      datum("dehair", "Dehairing loss", "除粗损耗", "Material", "", "", "inferred", ["ccmi"], "Guard hair removal reduces usable undercoat.", "去除粗毛减少可用底绒。"),
    ],
    costWhy: {
      thesis: pair(
        "Price tracks micron, first-combing yield, and dehairing loss.",
        "价格跟随微米、第一次梳绒产量与除粗损耗。"
      ),
      factors: [
        costFactor("yield", "Yield cap", "产量上限", "First combing is small by biology", "第一次梳绒量由生物决定", 30, "inferred", ["ccmi"]),
        costFactor("labor", "Dehairing labour", "除粗人工", "Skilled separation of guard hair", "粗毛分离依赖熟练人工", 26, "inferred", ["ccmi"]),
        costFactor("cycle", "Season", "季节", "Harvest follows climate & welfare limits", "收获受气候与福利约束", 16, "inferred", ["ccmi"]),
        costFactor("region", "Pasture geography", "草场地理", "High-altitude systems concentrate supply", "高海拔体系集中供给", 14, "inferred", ["ccmi"]),
        costFactor("waste", "Grading loss", "分级损耗", "Off-micron lots leave the top bin", "偏离微米的批次离开顶档", 14, "inferred", []),
      ],
    },
    journey: [
      journeyStep("harvest", "Combing", "梳绒", "Undercoat taken in season.", "按季取绒。", "/assets/editorial/materials/baby-cashmere.jpg"),
      journeyStep("select", "Sorting", "分拣", "Diameter language begins.", "直径语言开始。", "/assets/editorial/materials/baby-cashmere-detail.jpg"),
      journeyStep("clean", "Dehairing", "除粗", "Guard hair leaves the lot.", "粗毛离开这批。", "/assets/editorial/materials/baby-cashmere-scene.jpg"),
      journeyStep("spin", "Spinning", "纺纱", "Short staple becomes yarn.", "短绒成纱。", "/assets/editorial/materials/baby-cashmere.jpg"),
      journeyStep("knit", "Knitting", "编织", "Gauge sets the surface.", "针距决定表面。", "/assets/editorial/materials/baby-cashmere-detail.jpg"),
      journeyStep("finish", "Finishing", "整理", "Hand settles after wash.", "洗后手感落定。", "/assets/editorial/materials/baby-cashmere-scene.jpg"),
      journeyStep("product", "Object", "成器", "Yarn becomes a lasting knit.", "纱线成为可持存的针织。", "/assets/editorial/materials/baby-cashmere.jpg"),
    ],
    compare: {
      peers: [
        { id: "cashmere", label: "Cashmere", labelZh: "羊绒", self: true },
        { id: "wool", label: "Sheep wool", labelZh: "绵羊毛" },
        { id: "yak", label: "Yak", labelZh: "牦牛绒" },
        { id: "cotton", label: "Cotton", labelZh: "棉" },
        { id: "synthetic", label: "Synthetic", labelZh: "合成纤维" },
      ],
      axes: [
        { key: "breathability", label: "Breathability", labelZh: "透气" },
        { key: "durability", label: "Durability", labelZh: "耐久" },
        { key: "strength", label: "Strength", labelZh: "强力" },
        { key: "moisture", label: "Moisture", labelZh: "吸湿" },
        { key: "weight", label: "Weight (light)", labelZh: "轻量" },
        { key: "maintenance", label: "Easy care", labelZh: "易护" },
        { key: "cost", label: "Relative cost", labelZh: "相对成本" },
      ],
      scores: {
        cashmere: { breathability: 72, durability: 48, strength: 55, moisture: 70, weight: 90, maintenance: 42, cost: 88 },
        wool: { breathability: 70, durability: 72, strength: 70, moisture: 74, weight: 60, maintenance: 55, cost: 40 },
        yak: { breathability: 68, durability: 66, strength: 68, moisture: 72, weight: 65, maintenance: 50, cost: 62 },
        cotton: { breathability: 78, durability: 70, strength: 68, moisture: 76, weight: 72, maintenance: 80, cost: 28 },
        synthetic: { breathability: 45, durability: 88, strength: 80, moisture: 35, weight: 85, maintenance: 92, cost: 22 },
      },
      methodNote: pair("Relative teaching indices (0–100).", "相对教学指数（0–100）。"),
    },
    usedBy: [
      {
        name: "Loro Piana",
        nameZh: "Loro Piana",
        field: "Knitwear / fibre programmes",
        fieldZh: "针织 / 纤维项目",
        note: pair("Public communications on baby cashmere and rare fibres.", "关于 baby cashmere 与稀有纤维的公开传播。"),
        evidence: "verified",
        url: "https://www.loropiana.com/",
      },
    ],
    cultural: pair(
      "Pastoral societies priced warmth by weight carried on the body. Micron language is the modern form of that constraint.",
      "游牧社会按随身重量为保暖计价。微米语言是这一约束的现代表达。"
    ),
    sources: [
      src("ccmi", "Cashmere & Camel Hair Manufacturers Institute — public fibre education", null, "https://www.cashmere.org/", "公开纤维教育材料。", "Public fibre education."),
    ],
  },

  "raw-lacquer": {
    confidence: "curated",
    scientificName: "Toxicodendron vernicifluum (sap)",
    scientificNameZh: "漆树 Toxicodendron vernicifluum（汁液）",
    nameEn: "Raw Lacquer / Urushi",
    originLine: { en: "East Asia", zh: "东亚" },
    hero: pair(
      "Each coat is a day you cannot rush.",
      "每一层，都是无法催促的一天。"
    ),
    experience: {
      thesis: pair(
        "Under the finger, urushi is depth you fall into — ordinary PU is a sealed skin that never breathes time.",
        "指下，大漆是可坠入的深度——普通聚氨酯是永不呼吸时间的封闭皮。"
      ),
      vsOrdinary: pair(
        "Spray coatings finish in hours. Lacquer finishes in coats and humid days — the hand learns patience as shine.",
        "喷涂数小时完成。大漆以层数与阴干日完成——手把耐心认成光泽。"
      ),
      ordinary: pair("Ordinary PU coating", "普通聚氨酯涂装"),
      senses: [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Warm depth, not plastic slick.", bodyZh: "温润深度，非塑料滑。" },
        { key: "wear", label: "Use", labelZh: "使用", body: "Object use polishes high planes.", bodyZh: "把玩打磨高点。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Centuries are a documented museum possibility.", bodyZh: "数百年是有博物馆证据的可能。" },
      ],
    },
    whyExists: pair(
      "Kept because a humidity-cured film can outlast the object’s century when coats are honest — a finish counted in calendar time, not spray passes.",
      "留下它，是因为诚实的阴干漆膜可以活过器物的世纪——以日历计量，而非喷涂次数。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "East Asia", valueZh: "东亚" },
      { key: "scientific", label: "Scientific name", labelZh: "学名", value: "Toxicodendron vernicifluum", valueZh: "Toxicodendron vernicifluum" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Chinese Neolithic lacquer finds", valueZh: "中国新石器漆器发现", evidence: "verified", sourceIds: ["met-lac"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "China · Japan · Korea", valueZh: "中国 · 日本 · 韩国" },
      { key: "density", label: "Film character", labelZh: "漆膜特性", value: "Cross-linked catechol film", valueZh: "交联儿茶酚漆膜", evidence: "verified", sourceIds: ["met-lac"] },
      { key: "breathability", label: "Substrate seal", labelZh: "基材封闭", value: "High barrier when cured", valueZh: "阴干后高阻隔", evidence: "inferred", sourceIds: ["met-lac"] },
      { key: "strength", label: "Film toughness", labelZh: "漆膜韧性", value: "High with enough coats", valueZh: "层数足够则偏高", evidence: "inferred", sourceIds: ["met-lac"] },
      { key: "lifespan", label: "Object lifespan", labelZh: "器物寿命", value: "Centuries (museum evidence)", valueZh: "数百年（博物馆证据）", evidence: "verified", sourceIds: ["met-lac"] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Living-tree tap, seasonal", valueZh: "活树季节性割漆", evidence: "inferred", sourceIds: [] },
      { key: "recyclability", label: "Repair culture", labelZh: "修复文化", value: "Repair preferred to discard", valueZh: "倾向修复而非丢弃", evidence: "inferred", sourceIds: ["met-lac"] },
    ],
    evidence: [
      datum("cure", "Cure climate", "阴干气候", "Warm humidity required", "", "", "verified", ["met-lac"], "Polymerisation depends on humidity rooms / furo.", "聚合依赖荫房湿度。"),
      datum("coats", "Coat count", "层数", "Multi-coat calendar", "days", "天", "verified", ["met-lac"], "Each coat adds irreversible time.", "每层增加不可逆时间。"),
      datum("life", "Museum lifespan", "馆藏寿命", "Centuries observed", "", "", "verified", ["met-lac"], "Conservation literature documents long-lived lacquer objects.", "保护文献记载长寿漆器。"),
    ],
    costWhy: {
      thesis: pair(
        "The invoice is coats × curing days × failed layers.",
        "账单是：层数 × 阴干天数 × 失败层。"
      ),
      factors: [
        costFactor("time", "Curing time", "阴干时间", "Climate-controlled polymerisation per coat", "每层受控聚合", 34, "verified", ["met-lac"]),
        costFactor("labor", "Artisan labour", "匠人人工", "Brushing, polishing, defect reading", "髹涂、推光、读缺陷", 28, "verified", ["met-lac"]),
        costFactor("waste", "Failed coats", "失败层", "Dust & allergy can erase weeks", "灰尘与致敏可毁掉数周", 16, "inferred", []),
        costFactor("region", "Sap & skill scarcity", "汁液与技艺稀缺", "Tapping seasons + trained artists", "割漆季 + 受训漆艺人", 14, "inferred", []),
        costFactor("cycle", "Sap grade", "汁液等级", "Not all sap films equally", "并非所有汁液成膜相同", 8, "inferred", []),
      ],
    },
    journey: [
      journeyStep("harvest", "Tapping", "割漆", "Sap taken from the living tree.", "自活树取汁。", "/assets/editorial/materials/raw-lacquer.jpg"),
      journeyStep("select", "Refining", "炼制", "Grade the sap for the coat.", "按层选汁。", "/assets/editorial/materials/raw-lacquer-detail.jpg"),
      journeyStep("coat", "Coating", "髹涂", "One thin film at a time.", "一次一层薄膜。", "/assets/editorial/materials/raw-lacquer-scene.jpg"),
      journeyStep("cure", "Curing", "阴干", "Humidity finishes the chemistry.", "湿度完成化学。", "/assets/editorial/materials/raw-lacquer.jpg"),
      journeyStep("polish", "Polishing", "推光", "Surface is read by hand.", "手读表面。", "/assets/editorial/materials/raw-lacquer-detail.jpg"),
      journeyStep("age", "Aging", "静养", "Film hardens into memory.", "漆膜沉为记忆。", "/assets/editorial/materials/raw-lacquer-scene.jpg"),
      journeyStep("product", "Object", "成器", "Wood becomes a lasting skin.", "木成为可持存的皮。", "/assets/editorial/materials/raw-lacquer.jpg"),
    ],
    compare: {
      peers: [
        { id: "urushi", label: "Urushi", labelZh: "大漆", self: true },
        { id: "oil", label: "Oil finish", labelZh: "油饰" },
        { id: "pu", label: "PU coating", labelZh: "聚氨酯涂装" },
        { id: "paint", label: "Industrial paint", labelZh: "工业漆" },
      ],
      axes: [
        { key: "breathability", label: "Barrier", labelZh: "阻隔" },
        { key: "durability", label: "Durability", labelZh: "耐久" },
        { key: "strength", label: "Film toughness", labelZh: "漆膜韧性" },
        { key: "moisture", label: "Humidity cure need", labelZh: "湿度依赖" },
        { key: "weight", label: "Process time", labelZh: "工序时间" },
        { key: "maintenance", label: "Repairability", labelZh: "可修复" },
        { key: "cost", label: "Relative cost", labelZh: "相对成本" },
      ],
      scores: {
        urushi: { breathability: 88, durability: 92, strength: 80, moisture: 90, weight: 95, maintenance: 70, cost: 90 },
        oil: { breathability: 40, durability: 55, strength: 45, moisture: 20, weight: 35, maintenance: 75, cost: 35 },
        pu: { breathability: 85, durability: 80, strength: 78, moisture: 15, weight: 30, maintenance: 40, cost: 40 },
        paint: { breathability: 70, durability: 65, strength: 60, moisture: 10, weight: 25, maintenance: 35, cost: 25 },
      },
      methodNote: pair("Relative teaching indices for film systems.", "漆膜体系相对教学指数。"),
    },
    usedBy: [
      {
        name: "Museum lacquer collections",
        nameZh: "博物馆漆器收藏",
        field: "Museum",
        fieldZh: "博物馆",
        note: pair("Public scholarship on East Asian lacquer objects.", "东亚漆器的公开学术文稿。"),
        evidence: "verified",
        url: "https://www.metmuseum.org/",
      },
    ],
    cultural: pair(
      "Civilisations chose lacquer when an object had to survive touch, damp, and centuries in one continuous skin.",
      "文明选择它，是因为器物需要在潮湿与世纪中，以连续的表皮活下去。"
    ),
    sources: [
      src("met-lac", "Museum scholarship on East Asian lacquer", null, "https://www.metmuseum.org/", "大型博物馆漆器公开文稿。", "Public museum lacquer scholarship."),
    ],
  },

  xiangyunsha: {
    confidence: "curated",
    scientificName: "Bombyx mori silk + Dioscorea cirrhosa tannin + iron mud",
    scientificNameZh: "桑蚕丝 + 薯莨鞣质 + 含铁河泥",
    nameEn: "Xiangyunsha (Gambiered Guangdong Silk)",
    originLine: { en: "Pearl River Delta", zh: "珠江三角洲" },
    hero: pair(
      "The dark face is weather you can wear.",
      "深色那一面，是可以穿在身上的天气。"
    ),
    experience: {
      thesis: pair(
        "In humid heat, xiangyunsha feels dry on the dark face and soft on the reverse — ordinary silk does not carry this asymmetry.",
        "潮湿暑热中，香云纱深色面偏干爽、反面偏柔——普通素丝没有这种正反。"
      ),
      vsOrdinary: pair(
        "Plain silk is one climate. Mud-gambier coating and sunning create a two-sided cloth whose summer behaviour is publicly described across heritage and materials studies.",
        "素丝是一种气候。过泥与日晒造成双面布，其夏季体感在遗产与材料研究中有公开记述。"
      ),
      ordinary: pair("Ordinary plain silk", "普通素丝"),
      senses: [
        { key: "touch", label: "Touch", labelZh: "触感", body: "Dark face cooler/drier; reverse softer.", bodyZh: "深色面更干凉；反面更柔。" },
        { key: "wear", label: "Wear", labelZh: "穿着", body: "Lingnan humidity becomes wearable geometry.", bodyZh: "岭南湿度变成可穿的几何。" },
        { key: "time", label: "Over time", labelZh: "随时间", body: "Colour and hand evolve with wear and wash culture.", bodyZh: "色与手感随穿用与洗涤文化演变。" },
      ],
    },
    whyExists: pair(
      "Kept because plant tannin and river mud, sun-cured on silk, make a cloth that cools the body in humid summers — a geography written into the fibre face.",
      "留下它，是因为植物鞣质与河泥经日晒落在丝绸上，制成潮湿夏季贴身的布——地理写进了布面。"
    ),
    identity: [
      { key: "origin", label: "Origin", labelZh: "产地", value: "Pearl River Delta", valueZh: "珠三角" },
      { key: "scientific", label: "System", labelZh: "体系", value: "Silk + gambier + mud", valueZh: "丝 + 薯莨 + 泥" },
      { key: "firstUse", label: "First known use", labelZh: "已知最早使用", value: "Lingnan commodity histories (Ming–Qing public)", valueZh: "岭南商品史（明清公开叙述）", evidence: "inferred", sourceIds: ["xys"] },
      { key: "regions", label: "Main regions", labelZh: "主要产区", value: "Guangdong Delta towns", valueZh: "广东三角洲市镇" },
      { key: "density", label: "Face character", labelZh: "布面特性", value: "Dark coated / soft reverse", valueZh: "深色涂层 / 柔和反面", evidence: "verified", sourceIds: ["xys"] },
      { key: "breathability", label: "Breathability", labelZh: "透气", value: "High for summer wear", valueZh: "夏装向偏高", evidence: "inferred", sourceIds: ["xys"] },
      { key: "strength", label: "Strength", labelZh: "强力", value: "Coating alters wear vs plain silk", valueZh: "涂层改变相对素丝的磨损", evidence: "inferred", sourceIds: [] },
      { key: "lifespan", label: "Object lifespan", labelZh: "器物寿命", value: "Colour & hand evolve with wear", valueZh: "色与手感随穿用演变", evidence: "inferred", sourceIds: ["xys"] },
      { key: "renewability", label: "Renewability", labelZh: "可再生性", value: "Plant + mud + silk cycle", valueZh: "植物 + 泥 + 丝周期", evidence: "inferred", sourceIds: ["xys"] },
      { key: "recyclability", label: "Recyclability", labelZh: "可回收性", value: "Coated protein textile", valueZh: "涂层蛋白织物", evidence: "inferred", sourceIds: [] },
    ],
    evidence: [
      datum("process", "Process steps", "工序", "Coat · mud · sun (repeated)", "", "", "verified", ["xys"], "Public heritage docs describe repeated coating cycles.", "公开遗产文献记述反复浸涂。"),
      datum("climate", "Weather dependency", "天气依赖", "Sunning interrupted by rain", "", "", "inferred", ["xys"], "Usable metreage follows weather.", "可用米数跟随天气。"),
      datum("asymmetry", "Face asymmetry", "正反差异", "Dark face / soft reverse", "", "", "verified", ["xys"], "Process outcome, not a print.", "工序结果，而非印花。"),
    ],
    costWhy: {
      thesis: pair(
        "Price encodes coating cycles and days of sun.",
        "价格编码了浸涂次数与日照天数。"
      ),
      factors: [
        costFactor("time", "Coating cycles", "浸涂周期", "Multiple tannin and mud passes", "多次莨汁与过泥", 30, "verified", ["xys"]),
        costFactor("labor", "Yard labour", "场院人工", "Stretch, coat, turn by hand", "撑布、涂布、翻晒", 26, "verified", ["xys"]),
        costFactor("waste", "Weather loss", "天气损耗", "Rain and dust cut metreage", "雨尘削减米数", 16, "inferred", []),
        costFactor("region", "Craft geography", "工艺地理", "Skills in specific Delta towns", "技艺在特定市镇", 16, "inferred", ["xys"]),
        costFactor("cycle", "Base silk cost", "底布成本", "Starts as silk before coating", "涂层前已是丝绸", 12, "inferred", []),
      ],
    },
    journey: [
      journeyStep("harvest", "Base silk", "底绸", "Silk cloth enters the yard.", "丝绸入场。", "/assets/editorial/materials/xiangyunsha.jpg"),
      journeyStep("coat", "Gambier", "浸莨", "Plant tannin meets fibre.", "植物鞣质入纤。", "/assets/editorial/materials/xiangyunsha-detail.jpg"),
      journeyStep("mud", "Mudding", "过泥", "Iron-rich mud darkens the face.", "含铁河泥染深正面。", "/assets/editorial/materials/xiangyunsha-scene.jpg"),
      journeyStep("sun", "Sunning", "日晒", "Weather finishes the coat.", "天气完成这一层。", "/assets/editorial/materials/xiangyunsha.jpg"),
      journeyStep("repeat", "Repeat", "反复", "Cycles until the face holds.", "反复至布面成立。", "/assets/editorial/materials/xiangyunsha-detail.jpg"),
      journeyStep("product", "Cloth", "成布", "Asymmetry ready to be cut.", "正反成立，待裁。", "/assets/editorial/materials/xiangyunsha-scene.jpg"),
    ],
    compare: {
      peers: [
        { id: "xys", label: "Xiangyunsha", labelZh: "香云纱", self: true },
        { id: "silk", label: "Plain silk", labelZh: "素丝" },
        { id: "linen", label: "Linen", labelZh: "亚麻" },
        { id: "cotton", label: "Cotton", labelZh: "棉" },
        { id: "synthetic", label: "Synthetic", labelZh: "合成纤维" },
      ],
      axes: [
        { key: "breathability", label: "Breathability", labelZh: "透气" },
        { key: "durability", label: "Durability", labelZh: "耐久" },
        { key: "strength", label: "Strength", labelZh: "强力" },
        { key: "moisture", label: "Moisture", labelZh: "吸湿" },
        { key: "weight", label: "Weight (light)", labelZh: "轻量" },
        { key: "maintenance", label: "Easy care", labelZh: "易护" },
        { key: "cost", label: "Relative cost", labelZh: "相对成本" },
      ],
      scores: {
        xys: { breathability: 80, durability: 68, strength: 72, moisture: 80, weight: 75, maintenance: 45, cost: 82 },
        silk: { breathability: 86, durability: 55, strength: 78, moisture: 82, weight: 88, maintenance: 40, cost: 78 },
        linen: { breathability: 90, durability: 84, strength: 82, moisture: 72, weight: 65, maintenance: 50, cost: 48 },
        cotton: { breathability: 78, durability: 70, strength: 68, moisture: 76, weight: 72, maintenance: 80, cost: 30 },
        synthetic: { breathability: 45, durability: 88, strength: 80, moisture: 35, weight: 85, maintenance: 92, cost: 25 },
      },
      methodNote: pair("Relative teaching indices (0–100).", "相对教学指数（0–100）。"),
    },
    usedBy: [
      {
        name: "Chinese intangible-heritage documentation",
        nameZh: "中国非遗公开档案",
        field: "Heritage / culture",
        fieldZh: "遗产 / 文化",
        note: pair("Public process descriptions of gambiered Guangdong silk.", "莨纱工序的公开记述。"),
        evidence: "verified",
        url: null,
      },
    ],
    cultural: pair(
      "Lingnan summers chose a cloth that turns humidity into a workable surface — mud and sun as climate engineering on fibre.",
      "岭南的夏选择了一种把湿度变成可用表面的布——泥与日，是写在纤维上的气候工程。"
    ),
    sources: [
      src("xys", "Public Chinese heritage documentation on Xiangyunsha", null, null, "香云纱公开非遗与文化档案。", "Public heritage documentation on Xiangyunsha."),
    ],
  },
};
