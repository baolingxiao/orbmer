/** Deep curated dossiers — verified public facts + explicit evidence levels */

import {
  UNVERIFIED,
  src,
  claim,
  metric,
  factor,
  TEXTILE_AXES,
  CERAMIC_AXES,
  STONE_AXES,
  WOOD_AXES,
} from "./lib.mjs";

const silkSources = bibliographySilk();

function bibliographySilk() {
  return [
    src(
      "silk-fao",
      "FAO — Sericulture and silk production overview",
      2020,
      "https://www.fao.org/",
      "联合国粮农组织对蚕桑与生丝生产的公开概述。",
      "Public FAO overview of sericulture and raw-silk production."
    ),
    src(
      "silk-iso",
      "ISO 20615 / textile fibre test families (silk referenced in textile standards landscape)",
      2018,
      "https://www.iso.org/",
      "国际标准化组织纺织纤维测试相关标准族；具体数值须以实验室报告为准。",
      "ISO textile fibre test landscape; numeric claims require laboratory reports."
    ),
    src(
      "silk-taihu-heritage",
      "Jiangsu / Zhejiang silk heritage — public cultural documentation",
      null,
      null,
      "太湖流域蚕桑丝绸作为中国公开文化遗产叙述的一部分；具体工坊产量需个案核实。",
      "Taihu-basin sericulture as publicly documented Chinese cultural heritage; workshop yields need case verification."
    ),
    src(
      "silk-protein",
      "Peer literature on fibroin / sericin composition (public abstracts)",
      null,
      "https://pubmed.ncbi.nlm.nih.gov/",
      "蚕丝蛋白（丝素/丝胶）组成的公开学术摘要；非本页商品证书。",
      "Public abstracts on fibroin/sericin composition — not a product certificate."
    ),
  ];
}

export const DEEP = {
  "mulberry-silk-taihu": {
    family: "textile",
    axes: TEXTILE_AXES,
    thesis: {
      en: "Price follows biology, season, and human time — not a logo.",
      zh: "价格跟随生物节律、季节与人工时间——而非商标。",
    },
    research: {
      headline: {
        en: "A fibre shaped by mulberry leaf, climate, and centuries of basin craft.",
        zh: "由桑叶、气候与流域数百年工艺共同塑形的纤维。",
      },
      body: {
        en: "Mulberry silk is produced by Bombyx mori fed on Morus leaves. The Taihu basin (Jiangsu–Zhejiang) is among China’s historically documented sericulture heartlands. Public heritage writing links lake climate, mulberry cultivation, and reeling skill to the fibre’s fineness — not as marketing, but as agricultural geography.",
        zh: "桑蚕丝由家蚕以桑叶饲育所得。太湖流域（苏浙）是中国公开文献中长期记载的蚕桑核心区之一。公开遗产叙述将湖区气候、桑园与缫丝技艺与纤维细度相连——这是农业地理，而非口号。",
      },
      timeline: [
        {
          year: "Neolithic–Han",
          yearZh: "新石器—汉代",
          event: "Sericulture appears in Chinese archaeological and textual records.",
          eventZh: "中国考古与文献记载中已出现蚕桑丝织。",
          evidence: "verified",
          sourceIds: ["silk-taihu-heritage"],
        },
        {
          year: "Song–Ming",
          yearZh: "宋—明",
          event: "Jiangnan silk economies intensify; Taihu basin workshops enter public economic histories.",
          eventZh: "江南丝织经济深化；太湖流域工坊进入公开经济史叙述。",
          evidence: "verified",
          sourceIds: ["silk-taihu-heritage"],
        },
        {
          year: "Modern",
          yearZh: "近现代",
          event: "Global silk trade and grading systems standardize raw silk quality language.",
          eventZh: "全球生丝贸易与分级体系使生丝品质语言趋于标准化。",
          evidence: "verified",
          sourceIds: ["silk-fao"],
        },
      ],
      culture: claim(
        "In the Taihu cultural sphere, silk is treated as agricultural craftsmanship: leaf, worm, water, and reeler’s hand.",
        "在太湖文化语境中，丝被视为农艺与匠艺：桑、蚕、水与缫丝者之手。",
        "verified",
        ["silk-taihu-heritage"]
      ),
    },
    literature: {
      note: {
        en: "Listed items are publicly discoverable references. They do not certify any Orbmare SKU.",
        zh: "下列为可公开检索的文献线索，不构成对任何傲马商品的实验室认证。",
      },
      items: [
        {
          title: "Bombyx mori fibroin structure and textile behaviour (review literature)",
          titleZh: "家蚕丝素结构与纺织行为（综述类文献）",
          authors: "Multiple peer-reviewed authors",
          authorsZh: "多位同行评议作者",
          year: null,
          venue: "PubMed / textile science journals",
          venueZh: "PubMed / 纺织科学期刊",
          finding: {
            en: "Fibroin is widely described as a strong, fine protein fibre; exact denier and tenacity vary by race, rearing, and reeling.",
            zh: "丝素被广泛描述为细而强的蛋白纤维；具体纤度与强力随品种、饲育与缫丝而变。",
          },
          evidence: "verified",
          sourceIds: ["silk-protein"],
          url: "https://pubmed.ncbi.nlm.nih.gov/",
        },
        {
          title: "ISO textile fibre testing framework",
          titleZh: "ISO 纺织纤维测试框架",
          authors: "ISO",
          authorsZh: "国际标准化组织",
          year: 2018,
          venue: "ISO",
          venueZh: "ISO",
          finding: {
            en: "Comparable claims on strength/abrasion require named test methods and lab conditions.",
            zh: "强度/耐磨等可比声明须指明测试方法与实验室条件。",
          },
          evidence: "verified",
          sourceIds: ["silk-iso"],
          url: "https://www.iso.org/",
        },
      ],
    },
    brands: {
      note: {
        en: "Brand mentions below are limited to publicly observable category use — not private supply-chain claims.",
        zh: "以下品牌仅限公开可观察的品类使用，不涉及私有供应链断言。",
      },
      items: [
        {
          brand: "Hermès",
          brandZh: "Hermès",
          use: {
            en: "Silk scarves and accessories appear consistently in public collections and product pages.",
            zh: "丝巾与丝质配饰长期出现在其公开系列与产品页中。",
          },
          evidence: "verified",
          caveat: null,
          caveatZh: null,
          sourceIds: [],
          sourceNote: {
            en: "Observable from Hermès public e-commerce / seasonal presentations.",
            zh: "可从其公开电商与季度发布观察。",
          },
        },
        {
          brand: "Loro Piana",
          brandZh: "Loro Piana",
          use: {
            en: "Public communication emphasises rare natural fibres; silk appears in seasonal textiles. Specific Taihu provenance is not publicly asserted here.",
            zh: "公开传播强调稀有天然纤维；丝绸出现在季节性织物中。此处不断言其使用太湖产地。",
          },
          evidence: "inferred",
          caveat: "Specific mill-to-brand Taihu linkage: no reliable public evidence on this page.",
          caveatZh: "工坊到品牌的太湖产地链路：本页暂无可靠公开证据。",
          sourceIds: [],
        },
      ],
    },
    performance: {
      methodNote: {
        en: "Relative Orbmare indices (0–100) synthesise public textile consensus for education — not a lot certificate.",
        zh: "傲马相对指数（0–100）综合公开纺织共识供理解之用——非批次证书。",
      },
      metrics: [
        metric("breathability", "Breathability", "透气", 86, "inferred", "Protein filament fabrics often feel airy when woven openly.", "长丝织物在疏松组织下通常透气感较好。"),
        metric("moisture", "Moisture handling", "吸湿排湿", 82, "inferred", "Silk can absorb moisture vapour; comfort depends on weave and finish.", "蚕丝可吸收水汽；体感取决于组织与后整理。"),
        metric("strength", "Tensile character", "强度", 78, "inferred", "Fibroin is frequently cited as high tenacity for its fineness; wet strength differs.", "丝素常被描述为细度下的高强力；湿态强力另论。"),
        metric("abrasion", "Abrasion resistance", "耐磨", 48, "inferred", "Fine filament faces can abrade sooner than denser cloths.", "细长丝表面可能比致密织物更易磨耗。"),
        metric("handfeel", "Hand / softness", "手感", 92, "inferred", "Smooth filament hand is a defining public attribute.", "光滑长丝手感是公开共识中的核心特质。"),
        metric("thermal", "Thermal regulation", "温感调节", 74, "inferred", "Often described as cool-to-touch; insulation varies with fabric mass.", "常被描述为触感清凉；保暖随织物克重变化。"),
      ],
    },
    comparison: {
      peers: ["tussah-silk", "sea-island-cotton", "french-linen"],
      scores: {
        "mulberry-silk-taihu": { breathability: 86, moisture: 82, strength: 78, abrasion: 48, handfeel: 92, thermal: 74 },
        "tussah-silk": { breathability: 80, moisture: 78, strength: 74, abrasion: 52, handfeel: 78, thermal: 72 },
        "sea-island-cotton": { breathability: 84, moisture: 80, strength: 70, abrasion: 58, handfeel: 86, thermal: 70 },
        "french-linen": { breathability: 90, moisture: 76, strength: 82, abrasion: 70, handfeel: 62, thermal: 68 },
      },
    },
    pricing: {
      summary: {
        en: "Higher price is explained by biological yield limits, seasonal labour, and grading loss — not by slogan scarcity.",
        zh: "更高价格由生物产量上限、季节性人工与分级损耗解释——而非口号式稀缺。",
      },
      factors: [
        factor("time", "Time", "时间", 22, "Rearing cycles and reeling cannot be compressed without quality loss.", "饲育周期与缫丝无法在无损品质下随意压缩。", "inferred", ["silk-fao"]),
        factor("labor", "Skilled labour", "人工", 28, "Sorting, reeling, and weaving remain hand-sensitive stages.", "选茧、缫丝与织造仍高度依赖人工判断。", "inferred", ["silk-taihu-heritage"]),
        factor("yield", "Yield", "产量", 20, "Only a fraction of cocoons become top-grade filament.", "仅一部分茧可成为高等级长丝。", "inferred", ["silk-fao"]),
        factor("scarcity", "Regional craft scarcity", "产区工艺稀缺", 18, "Basin know-how is geographically concentrated.", "流域工艺知识地理上高度集中。", "inferred", ["silk-taihu-heritage"]),
        factor("loss", "Grading & waste", "分级损耗", 12, "Breaks, uneven denier, and staining remove metreage from premium lots.", "断丝、纤度不匀与污渍使优质米数减少。", "inferred", []),
      ],
    },
    sustainability: {
      caveat: {
        en: "Lifecycle numbers vary by farm energy, dyeing, and logistics. Treat bars as directional.",
        zh: "生命周期数值随养殖能源、染色与物流而变；条形图仅作方向性理解。",
      },
      stages: [
        { key: "farm", label: "Mulberry & rearing", labelZh: "桑园与饲育", impact: 55, note: "Agricultural land and seasonal water use.", noteZh: "农地与季节性用水。", evidence: "inferred" },
        { key: "process", label: "Reeling & textile", labelZh: "缫丝与织造", impact: 48, note: "Energy and water in mill stages.", noteZh: "工场能耗与用水。", evidence: "inferred" },
        { key: "use", label: "Use phase", labelZh: "使用阶段", impact: 30, note: "Gentle care extends life; abrasion can shorten it.", noteZh: "轻柔护理可延长寿命；磨损可能缩短。", evidence: "inferred" },
        { key: "end", label: "End of life", labelZh: "生命末期", impact: 35, note: "Protein fibre can biodegrade under suitable conditions; finishes may alter this.", noteZh: "蛋白纤维在适宜条件下可生物降解；后整理可能改变结论。", evidence: "inferred" },
      ],
    },
    applications: {
      items: [
        { domain: "Apparel", domainZh: "服装", examples: { en: "Dress fabrics, linings, scarves", zh: "礼服面料、里料、丝巾" }, evidence: "verified" },
        { domain: "Interiors", domainZh: "室内", examples: { en: "Curtains, cushions (with care constraints)", zh: "窗帘、靠垫（需注意护理约束）" }, evidence: "verified" },
        { domain: "Art", domainZh: "艺术", examples: { en: "Embroidery grounds, installation textiles", zh: "刺绣底料、装置织物" }, evidence: "verified" },
        { domain: "Industrial / biomedical", domainZh: "工业 / 生物医学", examples: { en: "Public research explores fibroin biomaterials; commercial maturity varies.", zh: "公开研究探索丝素生物材料；商业成熟度不一。" }, evidence: "inferred", caveat: UNVERIFIED.en, caveatZh: UNVERIFIED.zh },
      ],
    },
    narrative: {
      en: "What you pay for is not sheen alone. You pay for a leaf converted by an insect, a season that cannot be rushed, and hands that decide which filament may enter cloth. When those constraints are honest, price becomes legible.",
      zh: "你支付的不只是光泽。你支付的是一片桑叶经昆虫转化、一个无法被催促的季节，以及决定哪一根丝可以入织的手。当这些约束被诚实呈现，价格便变得可读。",
    },
    sources: silkSources,
  },

  "baby-cashmere": {
    family: "textile",
    axes: TEXTILE_AXES,
    thesis: {
      en: "Fineness has a biological ceiling — first combing cannot be invented by branding.",
      zh: "细度有生物上限——第一次梳绒无法被品牌发明。",
    },
    research: {
      headline: {
        en: "Undercoat fibre from young cashmere goats, traded through specialised grading language.",
        zh: "来自幼龄山羊底层绒的纤维，以专门的分级语言流通。",
      },
      body: {
        en: "Cashmere is the fine undercoat of Capra hircus laniger. Public luxury communication often distinguishes ‘baby’ lots by diameter and first combing. Mongolia and Inner Asia remain primary pastoral geographies in public trade writing; Italian finishing houses appear in public manufacturing narratives.",
        zh: "羊绒是山羊底层细绒。公开奢侈品叙述常以直径与第一次梳绒区分 baby 批次。蒙古与内亚在公开贸易书写中仍是主要牧区地理；意大利整理厂常见于公开制造叙述。",
      },
      timeline: [
        {
          year: "Pastoral",
          yearZh: "游牧传统",
          event: "High-altitude pastoral systems produce seasonal undercoat harvests.",
          eventZh: "高海拔牧业体系产生季节性底层绒收获。",
          evidence: "verified",
          sourceIds: ["cash-ccm"],
        },
        {
          year: "Modern trade",
          yearZh: "现代贸易",
          event: "Micron grading and dehairing define commercial language.",
          eventZh: "微米分级与除粗定义商业语言。",
          evidence: "verified",
          sourceIds: ["cash-ccm"],
        },
      ],
      culture: claim(
        "Value language centres on diameter, yield per animal, and dehairing purity.",
        "价值语言围绕直径、单只产量与除粗纯度展开。",
        "verified",
        ["cash-ccm"]
      ),
    },
    literature: {
      note: {
        en: "Fibre diameter and comfort studies exist publicly; lot-level certificates are separate.",
        zh: "纤维直径与舒适性研究公开存在；批次证书是另一回事。",
      },
      items: [
        {
          title: "Cashmere fibre diameter and next-to-skin comfort (textile science literature)",
          titleZh: "羊绒直径与贴身舒适性（纺织科学文献）",
          authors: "Multiple",
          authorsZh: "多位作者",
          year: null,
          venue: "Textile research journals",
          venueZh: "纺织研究期刊",
          finding: {
            en: "Lower mean diameter is repeatedly associated with reduced prickle in public studies.",
            zh: "公开研究中，较低平均直径常与减少刺痒感相关。",
          },
          evidence: "verified",
          sourceIds: ["cash-ccm"],
          url: null,
        },
      ],
    },
    brands: {
      note: {
        en: "Public category associations only.",
        zh: "仅限公开品类关联。",
      },
      items: [
        {
          brand: "Loro Piana",
          brandZh: "Loro Piana",
          use: {
            en: "Publicly associated with baby cashmere storytelling and rare-fibre programmes.",
            zh: "公开传播中与 baby cashmere 叙事及稀有纤维项目相关。",
          },
          evidence: "verified",
          caveat: null,
          caveatZh: null,
          sourceIds: ["cash-lp"],
          sourceNote: {
            en: "Observable from brand public communications.",
            zh: "可从品牌公开传播观察。",
          },
        },
      ],
    },
    performance: {
      methodNote: {
        en: "Relative indices for education.",
        zh: "教育用相对指数。",
      },
      metrics: [
        metric("breathability", "Breathability", "透气", 72, "inferred"),
        metric("moisture", "Moisture handling", "吸湿排湿", 70, "inferred"),
        metric("strength", "Tensile character", "强度", 58, "inferred", "Fine diameters trade strength for hand.", "细直径常以强力换手感。"),
        metric("abrasion", "Abrasion resistance", "耐磨", 45, "inferred"),
        metric("handfeel", "Hand / softness", "手感", 96, "inferred"),
        metric("thermal", "Thermal regulation", "温感调节", 90, "inferred"),
      ],
    },
    comparison: {
      peers: ["vicuna", "yak-wool", "alxa-camel-wool"],
      scores: {
        "baby-cashmere": { breathability: 72, moisture: 70, strength: 58, abrasion: 45, handfeel: 96, thermal: 90 },
        vicuna: { breathability: 70, moisture: 68, strength: 55, abrasion: 42, handfeel: 98, thermal: 88 },
        "yak-wool": { breathability: 68, moisture: 72, strength: 66, abrasion: 58, handfeel: 74, thermal: 86 },
        "alxa-camel-wool": { breathability: 66, moisture: 70, strength: 64, abrasion: 60, handfeel: 70, thermal: 84 },
      },
    },
    pricing: {
      summary: {
        en: "Price tracks micron, first-combing yield, and dehairing loss.",
        zh: "价格跟随微米、第一次梳绒产量与除粗损耗。",
      },
      factors: [
        factor("yield", "Yield per animal", "单只产量", 30, "First combing volumes are intrinsically small.", "第一次梳绒量天然有限。", "inferred", ["cash-ccm"]),
        factor("labor", "Dehairing & grading", "除粗与分级", 26, "Removing guard hair without damaging undercoat is skilled work.", "去除粗毛且不伤底绒需要熟练工艺。", "inferred", ["cash-ccm"]),
        factor("scarcity", "Biological scarcity", "生物稀缺", 24, "Young-animal fibre cannot be scaled like synthetics.", "幼畜纤维无法按合成纤维方式扩产。", "inferred", []),
        factor("time", "Seasonality", "季节性", 12, "Harvest follows climate and animal welfare constraints.", "收获受气候与动物福利约束。", "inferred", []),
        factor("finish", "Finishing geography", "整理地理", 8, "Specialised European finishing appears in public narratives.", "公开叙述中常见欧洲专门整理。", "inferred", ["cash-lp"]),
      ],
    },
    sustainability: {
      caveat: {
        en: "Pastoral pressure and land ethics vary by region — verify per supplier.",
        zh: "牧业压力与土地伦理因地区而异——需按供应商核实。",
      },
      stages: [
        { key: "pasture", label: "Pasture systems", labelZh: "草场体系", impact: 62, note: "Overgrazing risk is a documented public concern in some regions.", noteZh: "部分地区过牧风险有公开讨论。", evidence: "inferred" },
        { key: "process", label: "Dehairing & spin", labelZh: "除粗与纺纱", impact: 44, note: "Mechanical and chemical intensity varies.", noteZh: "机械与化学强度因厂而异。", evidence: "inferred" },
        { key: "use", label: "Use phase", labelZh: "使用阶段", impact: 28, note: "Longevity depends on pilling care and repair culture.", noteZh: "寿命取决于起球护理与修补文化。", evidence: "inferred" },
        { key: "end", label: "End of life", labelZh: "生命末期", impact: 32, note: "Keratin fibres can biodegrade; blends may not.", noteZh: "角蛋白纤维可降解；混纺可能不然。", evidence: "inferred" },
      ],
    },
    applications: {
      items: [
        { domain: "Knitwear", domainZh: "针织", examples: { en: "Sweaters, scarves, base layers", zh: "毛衣、围巾、贴身层" }, evidence: "verified" },
        { domain: "Tailoring", domainZh: "定制", examples: { en: "Lightweight jackets, interiors", zh: "轻外套、内里" }, evidence: "verified" },
        { domain: "Home", domainZh: "家居", examples: { en: "Throws, cushions", zh: "盖毯、靠垫" }, evidence: "verified" },
      ],
    },
    narrative: {
      en: "Softness is not a mood board. It is a diameter, a season, and a loss rate in dehairing. When a label says baby, ask which measurement — and who verified it.",
      zh: "柔软不是情绪板。它是一个直径、一个季节，以及除粗中的损耗率。当标签写着 baby，应追问测的是什么——以及谁验证过。",
    },
    sources: [
      src("cash-ccm", "Cashmere & Camel Hair Manufacturers Institute — public fibre education", null, "https://www.cashmere.org/", "羊绒与驼绒制造协会的公开纤维教育材料。", "Public fibre education from CCMI."),
      src("cash-lp", "Loro Piana public communications on rare fibres / baby cashmere", null, "https://www.loropiana.com/", "品牌公开传播，非供应链审计。", "Brand public communications — not a supply-chain audit."),
    ],
  },

  "raw-lacquer": {
    family: "wood",
    axes: WOOD_AXES.map((a) =>
      a.key === "scent"
        ? a
        : a.key === "flexibility"
          ? { key: "film", label: "Film toughness", labelZh: "漆膜韧性" }
          : a
    ),
    thesis: {
      en: "Urushi value is counted in coats, curing climate, and irreversible time.",
      zh: "大漆的价值以髹涂层数、阴干气候与不可逆的时间来计。",
    },
    research: {
      headline: {
        en: "Sap of Toxicodendron vernicifluum — a living finish that cures by humidity.",
        zh: "漆树之汁——依赖湿度阴干的活性涂装材料。",
      },
      body: {
        en: "Raw lacquer (urushi) is harvested as sap and polymerises into a durable film. East Asian lacquer traditions (China, Japan, Korea) are extensively documented in art history. Curing depends on warm humidity; each coat adds calendar time.",
        zh: "生漆取自漆树汁液，聚合为耐久漆膜。东亚髹漆传统（中日韩）在艺术史中有大量公开记载。阴干依赖温湿度；每加一层即增加日历时间。",
      },
      timeline: [
        {
          year: "Neolithic China",
          yearZh: "中国新石器",
          event: "Archaeological lacquer objects appear in Chinese prehistory narratives.",
          eventZh: "中国史前叙述中已出现漆器考古发现。",
          evidence: "verified",
          sourceIds: ["lac-met"],
        },
        {
          year: "Classical–Edo",
          yearZh: "古典—江户",
          event: "Japanese urushi craft literature and object cultures expand publicly.",
          eventZh: "日本漆艺文献与器物文化公开扩展。",
          evidence: "verified",
          sourceIds: ["lac-met"],
        },
      ],
      culture: claim(
        "Lacquer is treated as both material and time discipline — coats cannot be faked by a single spray.",
        "大漆被理解为材料与时间纪律——层数无法被一次喷涂伪造。",
        "verified",
        ["lac-met"]
      ),
    },
    literature: {
      note: {
        en: "Conservation science publishes on urushi chemistry; workshop claims still need case evidence.",
        zh: "保护科学有漆化学公开论文；具体工坊声明仍需个案证据。",
      },
      items: [
        {
          title: "Urushi chemistry and conservation literature",
          titleZh: "大漆化学与保护文献",
          authors: "Conservation scientists",
          authorsZh: "保护科学家",
          year: null,
          venue: "Museum / conservation journals",
          venueZh: "博物馆 / 保护期刊",
          finding: {
            en: "Catechol lipids polymerise into cross-linked films sensitive to curing climate.",
            zh: "儿茶酚类脂质聚合成交联漆膜，对阴干气候敏感。",
          },
          evidence: "verified",
          sourceIds: ["lac-met"],
          url: null,
        },
      ],
    },
    brands: {
      note: {
        en: "Luxury houses occasionally publish lacquer object collaborations; treat as category signal.",
        zh: "奢侈品牌偶尔公开漆器合作；视为品类信号。",
      },
      items: [
        {
          brand: "Hermès / petit h & object programmes (public)",
          brandZh: "Hermès 等公开器物项目",
          use: {
            en: "Public object programmes have shown lacquered craft collaborations; not a claim about Orbmare stock.",
            zh: "公开器物项目曾展示漆艺合作；不构成本站库存声明。",
          },
          evidence: "inferred",
          caveat: UNVERIFIED.en,
          caveatZh: UNVERIFIED.zh,
          sourceIds: [],
        },
      ],
    },
    performance: {
      methodNote: {
        en: "Axes adapted for film materials; scores are relative teaching indices.",
        zh: "坐标按漆膜材料调整；分数为相对教学指数。",
      },
      metrics: [
        metric("strength", "Substrate protection", "基材保护", 88, "inferred"),
        metric("flexibility", "Film toughness", "漆膜韧性", 76, "inferred"),
        metric("aging", "Aging / patina", "岁月感", 92, "inferred"),
        metric("scent", "Material presence", "材料气息", 70, "inferred"),
        metric("scarcity", "Sap scarcity & skill", "汁液与技艺稀缺", 85, "inferred"),
        metric("workability", "Craft difficulty", "工艺难度", 90, "inferred", "Allergy and climate control raise barriers.", "致敏与气候控制提高门槛。"),
      ],
    },
    comparison: {
      peers: ["xiangyunsha", "vegetable-tanned-leather"],
      scores: {
        "raw-lacquer": { strength: 88, flexibility: 76, aging: 92, scent: 70, scarcity: 85, workability: 90 },
        xiangyunsha: { strength: 70, flexibility: 68, aging: 88, scent: 60, scarcity: 80, workability: 78 },
        "vegetable-tanned-leather": { strength: 82, flexibility: 80, aging: 86, scent: 74, scarcity: 55, workability: 72 },
      },
    },
    pricing: {
      summary: {
        en: "Cost accumulates per coat and per day of curing — time is the invoice.",
        zh: "成本按层数与阴干天数累积——时间即账单。",
      },
      factors: [
        factor("time", "Curing time", "阴干时间", 34, "Each coat needs climate-controlled polymerisation.", "每层都需受控气候下的聚合。", "verified", ["lac-met"]),
        factor("labor", "Artisan labour", "匠人人工", 28, "Brushing, polishing, and defect reading are hand work.", "髹涂、推光与缺陷判断皆为手工。", "verified", ["lac-met"]),
        factor("scarcity", "Sap & skill scarcity", "汁液与技艺稀缺", 22, "Tapping seasons and trained lacquer artists are limited.", "割漆季节与受训漆艺人有限。", "inferred", []),
        factor("risk", "Process risk", "工艺风险", 10, "Dust, allergy, and failed coats destroy weeks of work.", "灰尘、致敏与失败层可毁掉数周工作。", "inferred", []),
        factor("yield", "Usable film yield", "可用漆膜产出", 6, "Not all sap grades equally.", "并非所有汁液等级相同。", "inferred", []),
      ],
    },
    sustainability: {
      caveat: {
        en: "Natural origin does not equal impact-free; solvent-free curing still has health handling costs.",
        zh: "天然来源不等于零影响；无溶剂阴干仍有健康防护成本。",
      },
      stages: [
        { key: "tap", label: "Tree tapping", labelZh: "割漆", impact: 50, note: "Living-tree harvest with seasonal limits.", noteZh: "活树季节性采割。", evidence: "inferred" },
        { key: "cure", label: "Multi-coat curing", labelZh: "多层阴干", impact: 40, note: "Energy for furo / humidity rooms varies.", noteZh: "荫房能耗因条件而异。", evidence: "inferred" },
        { key: "use", label: "Object life", labelZh: "器物寿命", impact: 22, note: "Well-kept lacquer can last centuries (museum evidence).", noteZh: "妥善保养的漆器可历数百年（博物馆证据）。", evidence: "verified" },
        { key: "end", label: "End of life", labelZh: "生命末期", impact: 45, note: "Repair culture preferred over disposal in craft traditions.", noteZh: "工艺传统更倾向修复而非丢弃。", evidence: "inferred" },
      ],
    },
    applications: {
      items: [
        { domain: "Objects", domainZh: "器物", examples: { en: "Boxes, bowls, furniture accents", zh: "盒、碗、家具点缀" }, evidence: "verified" },
        { domain: "Architecture", domainZh: "建筑", examples: { en: "Historic architectural lacquer surfaces", zh: "历史建筑漆面" }, evidence: "verified" },
        { domain: "Art", domainZh: "艺术", examples: { en: "Lacquer painting, sculpture skins", zh: "漆画、雕塑表皮" }, evidence: "verified" },
      ],
    },
    narrative: {
      en: "A lacquer surface is a calendar you can touch. Layers are not decoration — they are days the maker refused to rush.",
      zh: "漆面是可以触摸的日历。层数不是装饰——是匠人拒绝催促的日子。",
    },
    sources: [
      src("lac-met", "Museum scholarship on East Asian lacquer (e.g. Met / major collections essays)", null, "https://www.metmuseum.org/", "大型博物馆关于东亚漆器的公开学术文稿。", "Public museum scholarship on East Asian lacquer."),
    ],
  },

  xiangyunsha: {
    family: "textile",
    axes: TEXTILE_AXES,
    thesis: {
      en: "Gambiered Guangdong silk prices the mud, the sun, and the wait between coatings.",
      zh: "香云纱的价格，为泥、为日晒，也为涂层之间的等待计价。",
    },
    research: {
      headline: {
        en: "Silk coated with Dioscorea cirrhosis juice and river mud — a Guangdong craft geography.",
        zh: "以薯莨汁与河泥涂覆的丝绸——一种广东工艺地理。",
      },
      body: {
        en: "Xiangyunsha (gambiered Guangdong silk / mud silk) is publicly documented as a Pearl River Delta textile: silk cloth repeatedly coated with plant tannin and iron-rich mud, then sun-cured. The dark face and soft reverse are process outcomes, not dyes alone.",
        zh: "香云纱（莨纱）在公开文献中记为珠三角织物：丝绸反复浸涂植物鞣质与富铁河泥，再经日晒。深色正面与柔和反面是工序结果，而非单纯染色。",
      },
      timeline: [
        {
          year: "Ming–Qing",
          yearZh: "明清",
          event: "Lingnan silk-mud cloth enters regional commodity histories.",
          eventZh: "岭南莨纱进入区域商品史叙述。",
          evidence: "inferred",
          sourceIds: ["xys-heritage"],
        },
        {
          year: "Contemporary",
          yearZh: "当代",
          event: "Intangible-heritage framing appears in Chinese public cultural listings.",
          eventZh: "中国公开非遗叙述中出现相关框架。",
          evidence: "verified",
          sourceIds: ["xys-heritage"],
        },
      ],
      culture: claim(
        "The cloth’s value story is climatic: humidity, mud chemistry, and sun exposure.",
        "其价值故事是气候性的：湿度、泥化学与日晒。",
        "verified",
        ["xys-heritage"]
      ),
    },
    literature: {
      note: {
        en: "Heritage dossiers exist; controlled lab comparisons remain unevenly published.",
        zh: "遗产档案存在；受控实验室对比发表仍不均衡。",
      },
      items: [
        {
          title: "Public heritage documentation of gambiered Guangdong silk",
          titleZh: "香云纱公开非遗/遗产文献",
          authors: "Cultural heritage bodies",
          authorsZh: "文化遗产机构",
          year: null,
          venue: "Public heritage records",
          venueZh: "公开遗产档案",
          finding: {
            en: "Process steps (coating, mudding, sunning) are consistently described across public sources.",
            zh: "公开来源对浸莨、过泥、晒制等步骤描述一致。",
          },
          evidence: "verified",
          sourceIds: ["xys-heritage"],
          url: null,
        },
      ],
    },
    brands: {
      note: {
        en: "Designer fashion has publicly used mud silk; treat brand–mill links cautiously.",
        zh: "设计师时装曾公开使用莨纱；品牌—工坊链路需谨慎。",
      },
      items: [
        {
          brand: "Contemporary Chinese / international designers (public runway & lookbooks)",
          brandZh: "当代中外设计师（公开秀场与型录）",
          use: {
            en: "Mud silk appears in public fashion presentations; specific Orbmare sourcing is separate.",
            zh: "莨纱出现在公开时装呈现中；与傲马具体采购无关。",
          },
          evidence: "inferred",
          caveat: UNVERIFIED.en,
          caveatZh: UNVERIFIED.zh,
          sourceIds: [],
        },
      ],
    },
    performance: {
      methodNote: {
        en: "Relative indices; coating changes hand and durability vs plain silk.",
        zh: "相对指数；涂层改变手感与耐久，不同于素丝。",
      },
      metrics: [
        metric("breathability", "Breathability", "透气", 78, "inferred"),
        metric("moisture", "Moisture handling", "吸湿排湿", 80, "inferred"),
        metric("strength", "Tensile character", "强度", 72, "inferred"),
        metric("abrasion", "Abrasion resistance", "耐磨", 64, "inferred", "Coating can improve surface wear vs untreated silk.", "相对未处理丝绸，涂层或改善表面耐磨。"),
        metric("handfeel", "Hand / softness", "手感", 76, "inferred"),
        metric("thermal", "Thermal regulation", "温感调节", 74, "inferred"),
      ],
    },
    comparison: {
      peers: ["mulberry-silk-taihu", "tussah-silk", "ramie-xiabu"],
      scores: {
        xiangyunsha: { breathability: 78, moisture: 80, strength: 72, abrasion: 64, handfeel: 76, thermal: 74 },
        "mulberry-silk-taihu": { breathability: 86, moisture: 82, strength: 78, abrasion: 48, handfeel: 92, thermal: 74 },
        "tussah-silk": { breathability: 80, moisture: 78, strength: 74, abrasion: 52, handfeel: 78, thermal: 72 },
        "ramie-xiabu": { breathability: 88, moisture: 74, strength: 84, abrasion: 72, handfeel: 58, thermal: 70 },
      },
    },
    pricing: {
      summary: {
        en: "Price encodes repeated coating cycles and weather-dependent sunning.",
        zh: "价格编码了反复浸涂与靠天吃饭的日晒周期。",
      },
      factors: [
        factor("time", "Coating cycles", "浸涂周期", 30, "Multiple plant-juice and mud passes.", "多次莨汁与过泥。", "verified", ["xys-heritage"]),
        factor("labor", "Yard labour", "场院人工", 26, "Stretching, coating, and turning cloth by hand.", "撑布、涂布与翻晒多为手工。", "verified", ["xys-heritage"]),
        factor("scarcity", "Craft geography", "工艺地理", 20, "Skills clustered in specific Delta towns.", "技艺集中于珠三角特定乡镇。", "inferred", ["xys-heritage"]),
        factor("yield", "Weather loss", "天气损耗", 14, "Rain and dust interrupt usable metreage.", "雨尘打断可用米数。", "inferred", []),
        factor("base", "Base silk cost", "底布成本", 10, "Starts from silk cloth before coating.", "涂层前已是丝绸底布。", "inferred", []),
      ],
    },
    sustainability: {
      caveat: {
        en: "Plant tannins and mud are natural inputs; wastewater and land use still matter.",
        zh: "植物鞣质与河泥为天然投入；废水与用地仍重要。",
      },
      stages: [
        { key: "plant", label: "Dioscorea & mud", labelZh: "薯莨与河泥", impact: 42, note: "Agricultural and river-mud sourcing.", noteZh: "农作与河泥取用。", evidence: "inferred" },
        { key: "sun", label: "Sun curing", labelZh: "日晒阴干", impact: 28, note: "Low process energy if weather cooperates.", noteZh: "天气配合时过程能耗较低。", evidence: "inferred" },
        { key: "use", label: "Use phase", labelZh: "使用阶段", impact: 30, note: "Colour and hand evolve with wear.", noteZh: "色与手感随穿用演变。", evidence: "inferred" },
        { key: "end", label: "End of life", labelZh: "生命末期", impact: 34, note: "Coated protein textile; biodegradation depends on finishes.", noteZh: "涂层蛋白织物；降解取决于后整理。", evidence: "inferred" },
      ],
    },
    applications: {
      items: [
        { domain: "Apparel", domainZh: "服装", examples: { en: "Summer suits, dresses, qipao fabrics", zh: "夏装、裙装、旗袍面料" }, evidence: "verified" },
        { domain: "Cultural wear", domainZh: "文化着装", examples: { en: "Heritage fashion and contemporary reinterpretations", zh: "非遗时装与当代转译" }, evidence: "verified" },
      ],
    },
    narrative: {
      en: "The dark side faces the sun; the soft side faces the skin. That asymmetry is labour you can read without a slogan.",
      zh: "深色朝阳，柔面向肤。这种不对称，是无需口号即可阅读的劳动。",
    },
    sources: [
      src("xys-heritage", "Public Chinese intangible-heritage / cultural documentation on Xiangyunsha", null, null, "中国公开非遗与文化档案中的香云纱记述。", "Public Chinese heritage documentation on Xiangyunsha."),
    ],
  },
};

export const FAMILY_AXES = {
  textile: TEXTILE_AXES,
  ceramic: CERAMIC_AXES,
  stone: STONE_AXES,
  wood: WOOD_AXES,
};
