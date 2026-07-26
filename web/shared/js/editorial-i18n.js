/** Editorial ZH / EN i18n — full-site. Uses orbmare-language like shop. */

export const LANG_KEY = "orbmare-language";

const DICT = {
  zh: {
    "nav.discover": "发现",
    "nav.countries": "国家馆",
    "nav.materials": "材料馆",
    "nav.craft": "工艺",
    "nav.designers": "精选",
    "nav.journal": "阅读",
    "nav.about": "关于",
    "nav.membership": "会员",
    "nav.account": "账户",
    "nav.cart": "购物袋",
    "nav.shop": "3D打印馆",
    "brand.primary": "傲马",
    "brand.secondary": "Orbmare",
    "brand.curated": "傲马精选",
    "brand.curatesNote": "为什么是傲马的选择",
    "hero.title": "探索世界最好的作品",
    "hero.body": "每一件作品都来自独立设计师、匠人与顶级工坊的精心甄选。",
    "hero.cta": "探索精选",
    "home.countries": "国家馆",
    "home.countries.body": "从产地开始。每个国家都有独特的材料、工坊与匠心语言。",
    "home.countries.japan.tag": "工艺",
    "home.countries.italy.tag": "奢华设计",
    "home.countries.china.tag": "原创设计",
    "home.stories": "先读故事，再看商品。",
    "home.stories.body": "傲马不是无所不卖的目录，而是值得被看见的工艺图书馆。",
    "home.materials": "材料即知识。",
    "home.materials.body": "Baby Cashmere、植鞣革、日本丹宁、海岛棉——材料馆是傲马的招牌。",
    "home.collections": "精选系列",
    "home.collections.body": "策展路径，而非折扣筛选。",
    "home.featured": "精选",
    "home.featured.body": "汇聚全站精选——品牌、工作室、设计师与产品，一处安静探索。",
    "home.print": "中国区 · 3D打印专区",
    "home.print.body": "金属结构件、可动玩具与照片手办——可直接加入购物袋并结账。",
    "home.print.cta": "进入 3D打印馆",
    "cart.title": "购物袋",
    "cart.empty": "购物袋还是空的。去发现一些值得收藏的作品。",
    "cart.checkout": "去结账",
    "cart.shop": "查看 3D打印馆",
    "cart.inquire": "会员询购",
    "cart.note.curated": "价格与商品信息将在结账时由傲马服务器再次确认。",
    "cart.continue": "继续浏览",
    "cart.subtotal": "小计",
    "pdp.add": "加入购物袋",
    "pdp.added": "已加入",
    "pdp.inquire": "会员询购",
    "pdp.designer": "设计师",
    "pdp.material": "材料",
    "pdp.craft": "工艺",
    "pdp.country": "国家",
    "pdp.production": "制作",
    "pdp.production.body": "小批量制作。每件入馆前均核验材料与完成度。",
    "pdp.shipping": "配送",
    "pdp.shipping.body": "跨境配送仔细协调。会员享有优惠运费与礼宾支持。",
    "pdp.specSummary": "商品规格",
    "pdp.notfound": "未找到",
    "pdp.notfound.body": "该作品不在傲马精选馆中。",
    "pdp.moreFrom": "来自同一国家的更多作品",
    "pdp.prev": "上一张",
    "pdp.next": "下一张",
    "pdp.aiNote": "AI生成仅供参考",
    "pdp.tab.story": "Story",
    "pdp.tab.materials": "Materials",
    "pdp.tab.craft": "Craft",
    "pdp.tab.origin": "Origin",
    "pdp.tab.designer": "Designer",
    "pdp.tab.specs": "Specifications",
    "pdp.tab.shipping": "Shipping",
    "pdp.tab.care": "Care",
    "pdp.tab.magazine": "Magazine",
    "pdp.tab.related": "Related Objects",
    "pdp.materials.body": "材料是作品的第一位设计师。点击进入材料馆，了解来源、质感与老化方式。",
    "pdp.origin.body": "产地决定比例、节奏与审美。进入国家馆，从文化与工坊开始认识它。",
    "pdp.care.body": "以柔软干布轻拭；避免强溶剂。让材料按自己的节奏老化，比频繁打磨更诚实。",
    "pdp.magazine.one": "阅读相关 Journal 文章",
    "pdp.magazine.two": "继续了解材料",
    "china.print.title": "3D打印专区",
    "china.print.body": "中国馆内的数字制造板块。商品可加入购物袋，结账仍使用原 Stripe 流程。",
    "china.print.cta": "进入完整店铺",
    "footer.mission": "我们甄选世界最好的材料、工艺与设计。",
    "footer.explore": "探索",
    "footer.stories": "故事",
    "footer.visit": "国家",
    "footer.contact": "联系",
    "footer.tag": "工艺精选图书馆",
    "label.material": "材料",
    "label.craft": "工艺",
    "discover.kicker": "发现",
    "discover.heroTitle": "探索世界最好的作品",
    "discover.heroBody": "从世界各地，选择值得长期拥有的作品。",
    "discover.heroLine1": "不要寻找。",
    "discover.heroLine2": "去探索。",
    "discover.heroLine3": "每一件作品都是一个国家、材料与工艺的缩影。",
    "discover.searchLabel": "搜索",
    "discover.searchPlaceholder": "搜索作品、品牌、国家、材料、工艺、合集、设计师或文章",
    "discover.searchAction": "探索",
    "discover.guided.kicker": "策展起点",
    "discover.guided.title": "从一个方向开始",
    "discover.guided.body": "我们已替你缩小范围。选择一个当下更接近你的方向。",
    "discover.tab.all": "All",
    "discover.tab.latest": "Latest",
    "discover.tab.editors": "Editor's Picks",
    "discover.tab.trending": "Trending",
    "discover.facet.collection": "Collection",
    "discover.facet.country": "Country",
    "discover.facet.material": "Material",
    "discover.facet.craft": "Craft",
    "discover.facet.mood": "Mood",
    "discover.facet.price": "Price",
    "discover.facet.clear": "清除",
    "discover.collections.kicker": "精选",
    "discover.collections.title": "精选系列",
    "discover.ai.kicker": "AI 精选",
    "discover.ai.title": "寻找我的精选",
    "discover.ai.body": "预算、国家、材料、风格与用途——为你生成一份专属精选。",
    "discover.ai.cta": "开始",
    "discover.ai.close": "关闭",
    "discover.ai.budget": "预算",
    "discover.ai.country": "国家偏好",
    "discover.ai.material": "材料偏好",
    "discover.ai.mood": "风格",
    "discover.ai.use": "用途",
    "discover.ai.run": "生成我的精选",
    "discover.ai.promptLabel": "告诉我们你在寻找什么",
    "discover.ai.promptPlaceholder": "例如：一件适合日常使用的日本黄铜作品，预算 300 美元以内",
    "discover.ai.result": "已为「{title}」组成 {n} 件作品。向下继续浏览。",
    "discover.objects.kicker": "物件",
    "discover.objects.title": "精选物件",
    "discover.count": "{n} 件作品",
    "discover.empty": "没有符合条件的作品。换一组筛选，继续探索。",
    "discover.save": "收藏",
    "discover.editors.kicker": "编辑精选",
    "discover.editors.title": "本周精选",
    "discover.browse.title": "浏览精选合集",
    "discover.rail.previous": "上一组合集",
    "discover.rail.next": "下一组合集",
    "discover.journal.title": "阅读",
    "discover.journal.all": "阅读全部",
    "discover.membership.title": "成为傲马会员",
    "discover.membership.body": "为重视工艺、材料与设计的收藏者，保留更靠近作品的入口。",
    "discover.membership.cta": "了解会员",
    "discover.shop.note": "需要完整 3D 打印目录？",
    "discover.shop.link": "进入 3D 打印馆",
    "discover.title": "发现",
    "discover.body": "不要寻找。去探索。每一件作品都是一个国家、材料与工艺的缩影。",
    "discover.new": "新发现",
    "discover.new.body": "新近进入傲马精选馆的作品。",
    "discover.editors": "编辑精选",
    "discover.editors.body": "编辑反复回看的作品——重品质，不追潮流。",
    "discover.hidden": "隐藏瑰宝",
    "discover.hidden.body": "安静的工坊与被忽视的卓越。",
    "discover.loved": "备受喜爱",
    "discover.loved.body": "会员与收藏者反复回访的选择。",
    "discover.seasonal": "季节系列",
    "discover.seasonal.body": "更慢的节奏——适合当季的材料与工艺。",
    "discover.seasonal.h": "凉爽季节的柔软纤维。",
    "discover.seasonal.p": "Baby Cashmere、牦牛绒，以及从比耶拉到喜马拉雅的安静针织。",
    "discover.seasonal.cta": "浏览材料馆",
    "discover.shop.title": "3D打印馆 · 全部商品",
    "discover.shop.body": "原 3D 打印独立站的全部在售商品与完整产品信息，可直接加入购物袋结账。",
    "discover.shop.all": "全部",
    "discover.shop.metal": "工程金属件",
    "discover.shop.toys": "玩具与收藏",
    "discover.shop.portrait": "照片手办",
    "discover.shop.search": "搜索商品名称、材料或编号",
    "discover.shop.count": "件商品",
    "discover.shop.source": "来源国",
    "discover.shop.fulfillment": "履约",
    "discover.shop.processing": "采购处理",
    "discover.shop.transit": "国际运输",
    "discover.shop.variants": "规格数",
    "discover.shop.view": "查看详情",
    "discover.shop.empty": "没有符合条件的商品。",
    "discover.shop.open": "进入完整店铺",
    "countries.title": "国家馆",
    "countries.body": "MVP 聚焦：日本、意大利与中国。每一馆是文化、材料与工艺的研究，而非货架通道。",
    "country.history": "历史与文化",
    "country.materials": "材料",
    "country.materials.body": "代表该国制作的材料。",
    "country.crafts": "工艺",
    "country.crafts.body": "定义该国工坊的技艺。",
    "country.designers": "精选设计师",
    "country.designers.body": "我们甄选中的独立创作者与工作室。",
    "country.products": "精选作品",
    "country.products.jp": "文具、厨刀、陶瓷、茶具与生活用品。",
    "country.products.it": "皮具、羊绒、家居、珠宝与家具。",
    "country.products.cn": "原创品牌、非遗、家具、茶具与面料。",
    "materials.title": "材料馆",
    "materials.body": "傲马的招牌。先懂材料，再选作品——产地、特质与如何辨识品质。",
    "materials.chars": "特质",
    "materials.quality": "如何辨识品质",
    "materials.products": "使用该材料的作品",
    "materials.detail.summary": "材料概要",
    "materials.detail.summary.body": "四个安静的事实，先于故事。",
    "materials.detail.origin": "产地",
    "materials.detail.origin.body": "地理、气候与历史——材料为何只在这里成立。",
    "materials.detail.country": "国家",
    "materials.detail.region": "地区",
    "materials.detail.altitude": "海拔",
    "materials.detail.climate": "气候",
    "materials.detail.history": "历史",
    "materials.detail.craft": "工艺",
    "materials.detail.craft.body": "从自然到成器的缓慢步骤。",
    "materials.detail.why": "为何珍贵",
    "materials.detail.why.body": "以事实说明稀缺，而非口号。",
    "materials.detail.gallery": "图集",
    "materials.detail.products.body": "由相近材料气质塑造的作品。",
    "materials.detail.next": "继续阅读",
    "materials.detail.next.body": "下一种值得被理解的材料。",
    "materials.detail.notfound": "未找到该材料",
    "materials.detail.notfound.body": "请返回材料馆，选择另一种材料继续阅读。",
    "materials.mi2.en": "英文",
    "materials.mi2.scientific": "学名",
    "materials.mi2.origin": "产地",
    "materials.mi2.experience": "客户体验",
    "materials.mi2.this": "这种材料",
    "materials.mi2.ordinary": "普通对照",
    "materials.mi2.why": "为何存在",
    "materials.mi2.identity": "材料护照",
    "materials.mi2.identity.title": "Identity",
    "materials.mi2.evidence": "证据",
    "materials.mi2.evidence.title": "Evidence",
    "materials.mi2.cost": "为何更贵",
    "materials.mi2.journey": "生命旅程",
    "materials.mi2.journey.title": "Journey",
    "materials.mi2.compare": "对照",
    "materials.mi2.compare.title": "Compared with others",
    "materials.mi2.used": "公开使用",
    "materials.mi2.used.title": "Used by",
    "materials.mi2.culture": "文明选择",
    "materials.mi2.library": "研究库",
    "materials.mi2.library.title": "Research Library",
    "materials.mi2.open": "查看来源",
    "materials.mi2.noPublic": "暂无可靠公开资料",
    "materials.mi2.tag.verified": "已核实",
    "materials.mi2.tag.inferred": "综合",
    "materials.mi2.tag.none": "暂无可靠公开资料",
    "craft.title": "工艺",
    "craft.body": "制作即知识。每一种工艺都承载历史、地理与机器难以替代的标准。",
    "craft.products": "相关作品",
    "designers.title": "精选",
    "designers.body": "品牌、工作室与设计师——来自运营精选的主体，以及他们背后的作品。",
    "designers.featured": "特别推荐",
    "designers.featuredBody": "运营特别关注的品牌、设计师与作品。",
    "designers.collections": "系列与作品",
    "designers.philosophy": "哲学：少做一点，完成得更好，让材料自己说话。",
    "about.title": "傲马为何存在。",
    "about.lead": "我们相信世界值得更好的产品——而不是更多的产品。",
    "about.h1": "一座图书馆，而非店面。",
    "about.p1": "傲马基于一个简单信念：工艺、材料与设计，值得比无尽滚动的购物平台更安静的家。",
    "about.p2": "我们甄选世界最好的制作——来自独立设计师、匠人与顶级工坊——让发现像走入博物馆，而不是冲过仓库。",
    "about.h2": "为何工艺重要。",
    "about.p3": "用心制作的物件更持久，随时间更有尊严，并把我们与塑造它们的人与地方相连。当你理解纤维、锻造与针脚——你会以不同的方式购买。",
    "about.h3": "为何更好的产品。",
    "about.p4": "数量文化教会我们追逐价格与新鲜感。傲马选择诚信：更少的作品、更清晰的故事、以及对制作者的尊重。",
    "about.mission": "我们甄选世界最好的材料、工艺与设计。",
    "membership.title": "傲马会员",
    "membership.lead": "不是仓储式俱乐部。而是给重视工艺、材料与设计的收藏者的安静圈子。",
    "membership.01": "抢先体验",
    "membership.01b": "在公开馆上线前，先看到新发现。",
    "membership.02": "专属系列",
    "membership.02b": "为会员圈保留的工坊胶囊系列。",
    "membership.03": "更低国际运费",
    "membership.03b": "跨境运送时的优惠费率。",
    "membership.04": "策展采购请求",
    "membership.04b": "告诉我们你在寻找什么——我们替你寻访工坊与传承匠人。",
    "membership.05": "私人礼宾",
    "membership.05b": "材料、尺寸与定制的人工指导。",
    "membership.06": "会员专属 Journal",
    "membership.06b": "比公开杂志更深入的文章、工厂笔记与访谈。",
    "membership.cta": "申请会员",
    "journal.title": "Journal",
    "journal.lead": "一本关于制作的奢华杂志——工艺、材料、国家、设计师，以及非凡物件背后的安静工作。",
    "journal.read": "阅读",
    "journal.1.cat": "工艺",
    "journal.1.title": "锻造之内：日本刃物为何仍是标准",
    "journal.2.cat": "材料",
    "journal.2.title": "Baby Cashmere——可感知的稀有",
    "journal.3.cat": "国家",
    "journal.3.title": "佛罗伦萨皮革与植鞣的耐心",
    "journal.4.cat": "访谈",
    "journal.4.title": "林薇谈瓷器、克制与景德镇的光",
    "journal.5.cat": "指南",
    "journal.5.title": "如何辨识植鞣革的品质",
    "journal.6.cat": "走访",
    "journal.6.title": "中国精品：为何傲马的中国不是“中国制造”",
  },
  en: {
    "nav.discover": "Discover",
    "nav.countries": "Countries",
    "nav.materials": "Materials",
    "nav.craft": "Craftsmanship",
    "nav.designers": "Picks",
    "nav.journal": "Journal",
    "nav.about": "About",
    "nav.membership": "Membership",
    "nav.account": "Account",
    "nav.cart": "Bag",
    "nav.shop": "3D Print Shop",
    "brand.primary": "Orbmare",
    "brand.secondary": "傲马",
    "brand.curated": "Orbmare Curated",
    "brand.curatesNote": "Why it's a Orbmare Curates",
    "hero.title": "Discover the World's Finest Objects",
    "hero.body": "Every piece is carefully curated from independent designers, master craftsmen, and premium workshops around the world.",
    "hero.cta": "Explore Collections",
    "home.countries": "Countries",
    "home.countries.body": "Begin with place. Each country holds a distinct language of making — materials, workshops, and quiet mastery.",
    "home.countries.japan.tag": "Craftsmanship",
    "home.countries.italy.tag": "Luxury Design",
    "home.countries.china.tag": "Original Design",
    "home.stories": "Story before product.",
    "home.stories.body": "Orbmare is not a catalog of everything. It is a library of what deserves attention.",
    "home.materials": "Material as knowledge.",
    "home.materials.body": "Baby Cashmere. Vegetable-tanned leather. Japanese denim. Sea Island cotton.",
    "home.collections": "Collections",
    "home.collections.body": "Curated paths through craftsmanship — not filters, not flash sales.",
    "home.featured": "Featured Collections",
    "home.featured.body": "Every curated corner in one place — brands, studios, designers, and objects.",
    "home.print": "China · 3D Print Atelier",
    "home.print.body": "Metal parts, kinetic toys, and portrait figures — add to bag and checkout with Stripe.",
    "home.print.cta": "Enter 3D Print Shop",
    "cart.title": "Your Bag",
    "cart.empty": "Your bag is empty. Discover something worth keeping.",
    "cart.checkout": "Checkout",
    "cart.shop": "View 3D Print Shop",
    "cart.inquire": "Membership Inquiry",
    "cart.note.curated": "Orbmare verifies prices and item details again at checkout.",
    "cart.continue": "Keep exploring",
    "cart.subtotal": "Subtotal",
    "pdp.add": "Add to Bag",
    "pdp.added": "Added",
    "pdp.inquire": "Membership Inquiry",
    "pdp.designer": "Designer",
    "pdp.material": "Material",
    "pdp.craft": "Craftsmanship",
    "pdp.country": "Country",
    "pdp.production": "Production",
    "pdp.production.body": "Made in small quantities. Each piece is reviewed for material integrity and finishing before it enters the Orbmare library.",
    "pdp.shipping": "Shipping",
    "pdp.shipping.body": "International shipping is coordinated with care. Members receive preferential rates and concierge support.",
    "pdp.specSummary": "Product specifications",
    "pdp.notfound": "Not found",
    "pdp.notfound.body": "This piece is not in the Orbmare library.",
    "pdp.moreFrom": "More from this country",
    "pdp.prev": "Previous image",
    "pdp.next": "Next image",
    "pdp.aiNote": "AI-generated · for reference only",
    "pdp.tab.story": "Story",
    "pdp.tab.materials": "Materials",
    "pdp.tab.craft": "Craft",
    "pdp.tab.origin": "Origin",
    "pdp.tab.designer": "Designer",
    "pdp.tab.specs": "Specifications",
    "pdp.tab.shipping": "Shipping",
    "pdp.tab.care": "Care",
    "pdp.tab.magazine": "Magazine",
    "pdp.tab.related": "Related Objects",
    "pdp.materials.body": "Material is the first designer. Open the Material Library to learn origin, hand-feel, and how it ages.",
    "pdp.origin.body": "Place shapes proportion, pace, and taste. Enter the country pavilion to meet the workshops behind it.",
    "pdp.care.body": "Wipe with a soft dry cloth. Avoid harsh solvents. Let the material age on its own terms.",
    "pdp.magazine.one": "Read related Journal pieces",
    "pdp.magazine.two": "Continue into Materials",
    "china.print.title": "3D Print Atelier",
    "china.print.body": "Digital manufacturing within the China pavilion. Add to bag — Stripe checkout unchanged.",
    "china.print.cta": "Enter full shop",
    "footer.mission": "We curate the world's finest craftsmanship, materials, and design.",
    "footer.explore": "Explore",
    "footer.stories": "Stories",
    "footer.visit": "Visit",
    "footer.contact": "Contact",
    "footer.tag": "A curated library of craftsmanship",
    "label.material": "Material",
    "label.craft": "Craft",
    "discover.kicker": "Discover",
    "discover.heroTitle": "Discover the World's Finest Objects",
    "discover.heroBody": "From around the world, objects chosen to live with for a long time.",
    "discover.heroLine1": "Do not search.",
    "discover.heroLine2": "Explore.",
    "discover.heroLine3": "Each object is a distillation of country, material, and craft.",
    "discover.searchLabel": "AI Search",
    "discover.searchPlaceholder": "Search products, brands, countries, materials, crafts, collections, designers, or journal",
    "discover.searchAction": "Explore",
    "discover.guided.kicker": "A curated starting point",
    "discover.guided.title": "Begin with a direction",
    "discover.guided.body": "We have narrowed the field. Choose the direction that feels closest to you today.",
    "discover.tab.all": "All",
    "discover.tab.latest": "Latest",
    "discover.tab.editors": "Editor's Picks",
    "discover.tab.trending": "Trending",
    "discover.facet.collection": "Collection",
    "discover.facet.country": "Country",
    "discover.facet.material": "Material",
    "discover.facet.craft": "Craft",
    "discover.facet.mood": "Mood",
    "discover.facet.price": "Price",
    "discover.facet.clear": "Clear",
    "discover.collections.kicker": "Featured",
    "discover.collections.title": "Featured Collections",
    "discover.ai.kicker": "AI Discovery",
    "discover.ai.title": "Find My Collection",
    "discover.ai.body": "Budget, country, material, style, and use — composed into a collection of your own.",
    "discover.ai.cta": "Begin",
    "discover.ai.close": "Close",
    "discover.ai.budget": "Budget",
    "discover.ai.country": "Country preference",
    "discover.ai.material": "Material preference",
    "discover.ai.mood": "Style",
    "discover.ai.use": "Use",
    "discover.ai.run": "Compose my collection",
    "discover.ai.promptLabel": "Tell us what you are looking for",
    "discover.ai.promptPlaceholder": "For example: a Japanese brass object for daily use, under $300",
    "discover.ai.result": "A collection for “{title}” — {n} objects. Continue below.",
    "discover.objects.kicker": "Objects",
    "discover.objects.title": "Curated Objects",
    "discover.count": "{n} objects",
    "discover.empty": "Nothing matches yet. Change a filter and keep exploring.",
    "discover.save": "Save",
    "discover.editors.kicker": "Editor's Picks",
    "discover.editors.title": "This Week's Selections",
    "discover.browse.title": "Browse Collections",
    "discover.rail.previous": "Previous collections",
    "discover.rail.next": "Next collections",
    "discover.journal.title": "Journal",
    "discover.journal.all": "Read all",
    "discover.membership.title": "Enter the Orbmare Circle",
    "discover.membership.body": "A closer way into objects for collectors who care about craft, material, and design.",
    "discover.membership.cta": "Discover membership",
    "discover.shop.note": "Looking for the full 3D print catalog?",
    "discover.shop.link": "Open the 3D print shop",
    "discover.title": "Discover",
    "discover.body": "Do not search. Explore. Each object is a distillation of country, material, and craft.",
    "discover.new": "New Discoveries",
    "discover.new.body": "Recently welcomed into the Orbmare library.",
    "discover.editors": "Editor's Picks",
    "discover.editors.body": "Pieces our editors return to — for making quality, not trend.",
    "discover.hidden": "Hidden Gems",
    "discover.hidden.body": "Quiet workshops and overlooked excellence.",
    "discover.loved": "Most Loved",
    "discover.loved.body": "Selections members and collectors revisit.",
    "discover.seasonal": "Seasonal Collections",
    "discover.seasonal.body": "A slower rhythm — materials and crafts suited to the season.",
    "discover.seasonal.h": "Soft fibers for cooler months.",
    "discover.seasonal.p": "Baby cashmere, yak wool, and quiet knits from Biella to the Himalaya.",
    "discover.seasonal.cta": "Browse Materials",
    "discover.shop.title": "3D Print Shop · Full Catalog",
    "discover.shop.body": "Every product from the original 3D print store — with full product details. Add to bag and checkout with Stripe.",
    "discover.shop.all": "All",
    "discover.shop.metal": "Metal",
    "discover.shop.toys": "Toys",
    "discover.shop.portrait": "Portrait",
    "discover.shop.search": "Search name, material, or ID",
    "discover.shop.count": "products",
    "discover.shop.source": "Source country",
    "discover.shop.fulfillment": "Fulfillment",
    "discover.shop.processing": "Processing",
    "discover.shop.transit": "International transit",
    "discover.shop.variants": "Variants",
    "discover.shop.view": "View details",
    "discover.shop.empty": "No products match your filters.",
    "discover.shop.open": "Open full shop",
    "countries.title": "Countries",
    "countries.body": "MVP focus: Japan, Italy, and China. Each pavilion is a study of culture, materials, and craft — not a marketplace aisle.",
    "country.history": "History & Culture",
    "country.materials": "Materials",
    "country.materials.body": "Representative materials of this country's making.",
    "country.crafts": "Craftsmanship",
    "country.crafts.body": "Practices that define the country's workshops.",
    "country.designers": "Featured Designers",
    "country.designers.body": "Independent makers and studios in our selection.",
    "country.products": "Curated Products",
    "country.products.jp": "Stationery, knives, ceramics, tea, and daily objects.",
    "country.products.it": "Leather, cashmere, home, jewelry, and furniture.",
    "country.products.cn": "Original brands, heritage crafts, furniture, tea, and textiles.",
    "materials.title": "Material Library",
    "materials.body": "Orbmare's signature. Learn material before product — origin, character, and how quality reveals itself.",
    "materials.chars": "Characteristics",
    "materials.quality": "How to identify quality",
    "materials.products": "Products in this material",
    "materials.detail.summary": "Material summary",
    "materials.detail.summary.body": "Four quiet facts, before the story.",
    "materials.detail.origin": "Origin",
    "materials.detail.origin.body": "Place, climate, and history — why this material belongs here.",
    "materials.detail.country": "Country",
    "materials.detail.region": "Region",
    "materials.detail.altitude": "Altitude",
    "materials.detail.climate": "Climate",
    "materials.detail.history": "History",
    "materials.detail.craft": "Craft",
    "materials.detail.craft.body": "Slow steps from nature into form.",
    "materials.detail.why": "Why precious",
    "materials.detail.why.body": "Scarcity told as fact — never as slogan.",
    "materials.detail.gallery": "Gallery",
    "materials.detail.products.body": "Works shaped by a related material presence.",
    "materials.detail.next": "Continue reading",
    "materials.detail.next.body": "The next material worth understanding.",
    "materials.detail.notfound": "Material not found",
    "materials.detail.notfound.body": "Return to the Material Library and choose another entry.",
    "materials.mi2.en": "English",
    "materials.mi2.scientific": "Scientific name",
    "materials.mi2.origin": "Origin",
    "materials.mi2.experience": "The experience",
    "materials.mi2.this": "This material",
    "materials.mi2.ordinary": "Ordinary reference",
    "materials.mi2.why": "Why it exists",
    "materials.mi2.identity": "Material passport",
    "materials.mi2.identity.title": "Identity",
    "materials.mi2.evidence": "Evidence",
    "materials.mi2.evidence.title": "Evidence",
    "materials.mi2.cost": "Why it costs more",
    "materials.mi2.journey": "Journey",
    "materials.mi2.journey.title": "Journey",
    "materials.mi2.compare": "Compared",
    "materials.mi2.compare.title": "Compared with others",
    "materials.mi2.used": "Used by",
    "materials.mi2.used.title": "Used by",
    "materials.mi2.culture": "Cultural value",
    "materials.mi2.library": "Research Library",
    "materials.mi2.library.title": "Research Library",
    "materials.mi2.open": "Open source",
    "materials.mi2.noPublic": "No reliably verifiable public sources",
    "materials.mi2.tag.verified": "Verified",
    "materials.mi2.tag.inferred": "Inferred",
    "materials.mi2.tag.none": "No reliable public sources",
    "craft.title": "Craftsmanship",
    "craft.body": "Making is knowledge. Each craft carries history, geography, and a standard of care that machines alone cannot imitate.",
    "craft.products": "Products",
    "designers.title": "Picks",
    "designers.body": "Brands, studios, and designers — curated entities and the objects behind them.",
    "designers.featured": "Featured",
    "designers.featuredBody": "Brands, designers, and pieces we are paying special attention to.",
    "designers.collections": "Collections & Products",
    "designers.philosophy": "Philosophy: make less, finish better, and let the material speak.",
    "about.title": "Why Orbmare exists.",
    "about.lead": "We believe the world deserves better products — not more products.",
    "about.h1": "A library, not a storefront.",
    "about.p1": "Orbmare was founded on a simple conviction: craftsmanship, materials, and design deserve a quieter home than the endless scroll of marketplaces.",
    "about.p2": "We curate the world's finest making — from independent designers, master craftsmen, and premium workshops — so discovery feels like walking through a museum, not racing through a warehouse.",
    "about.h2": "Why craftsmanship matters.",
    "about.p3": "Objects made with care last longer, age with dignity, and connect us to the people and places that shaped them. When you understand the fiber, the forge, the stitch — you buy differently.",
    "about.h3": "Why better products.",
    "about.p4": "Volume culture taught us to chase price and novelty. Orbmare chooses integrity instead: fewer pieces, clearer stories, and standards that honor the maker.",
    "about.mission": "We curate the world's finest craftsmanship, materials, and design.",
    "membership.title": "Orbmare Membership",
    "membership.lead": "Not a warehouse club. A quieter circle for collectors who value craftsmanship, materials, and design.",
    "membership.01": "Early access",
    "membership.01b": "See new discoveries before they appear in the public library.",
    "membership.02": "Exclusive collections",
    "membership.02b": "Members-only capsules from workshops we reserve for the circle.",
    "membership.03": "Lower international shipping",
    "membership.03b": "Preferential rates when pieces travel across borders.",
    "membership.04": "Curated buying requests",
    "membership.04b": "Tell us what you seek — we search ateliers and heritage makers on your behalf.",
    "membership.05": "Private concierge",
    "membership.05b": "Human guidance for materials, sizing, and commissioning.",
    "membership.06": "Members-only Journal",
    "membership.06b": "Deeper essays, factory notes, and interviews beyond the public magazine.",
    "membership.cta": "Request Membership",
    "journal.title": "Journal",
    "journal.lead": "A luxury magazine for making — craftsmanship, materials, countries, designers, and the quiet work behind exceptional objects.",
    "journal.read": "Read",
    "journal.1.cat": "Craftsmanship",
    "journal.1.title": "Inside the forge: why Japanese blades still set the standard",
    "journal.2.cat": "Materials",
    "journal.2.title": "Baby Cashmere — rarity you can feel",
    "journal.3.cat": "Country",
    "journal.3.title": "Florence leather and the patience of vegetable tannage",
    "journal.4.cat": "Interview",
    "journal.4.title": "Lin Wei on porcelain, restraint, and Jingdezhen light",
    "journal.5.cat": "Guide",
    "journal.5.title": "How to identify quality in vegetable-tanned leather",
    "journal.6.cat": "Visit",
    "journal.6.title": "中国精品: why China on Orbmare is not “China manufacturing”",
  },
};

export const COUNTRY_COPY = {
  japan: {
    en: {
      name: "Japan",
      tag: "Craftsmanship",
      history:
        "Japan's making culture prizes restraint, precision, and longevity. From Sakai blades to Kyoto ceramics, excellence is measured in decades of practice.",
      culture:
        "An aesthetic of quiet utility — objects meant to improve daily life without announcing themselves.",
    },
    zh: {
      name: "日本",
      tag: "匠心工艺",
      history:
        "日本的制作文化珍视克制、精度与经年。从堺刃物到京都陶瓷，卓越以数十年的练习衡量。",
      culture: "安静的实用美学——物件改善日常，却不必张扬自己。",
    },
  },
  italy: {
    en: {
      name: "Italy",
      tag: "Luxury Design",
      history:
        "Italian workshops treat material as the first designer. Florence leather, Biella cashmere, and Milanese proportion define a language of luxury that begins with touch.",
      culture: "Design is lived — in the hand of a stitch, the drape of a scarf, the silhouette of a chair.",
    },
    zh: {
      name: "意大利",
      tag: "奢华设计",
      history:
        "意大利工坊视材料为第一位设计师。佛罗伦萨皮革、比耶拉羊绒与米兰比例，定义从触感开始的奢华语言。",
      culture: "设计即生活——在一针一线、围巾垂坠与椅子轮廓之中。",
    },
  },
  china: {
    en: {
      name: "China",
      tag: "Original Design",
      culture: "Not everything made in China tells the same story.",
      historyParagraphs: [
        "Not everything made in China tells the same story.",
        "The pieces we choose are not defined by volume, but by patience.",
        "They come from independent studios, master craftsmen, and workshops where techniques have been refined over generations.",
      ],
      historyLines: [
        "Porcelain fired in Jingdezhen.",
        "Lacquer applied layer by layer.",
        "Wood shaped by hand.",
        "Silk woven with extraordinary precision.",
      ],
      historyClose: [
        "These are not souvenirs.",
        "They are contemporary objects carrying centuries of knowledge.",
      ],
    },
    zh: {
      name: "中国",
      tag: "原创设计",
      culture: "中国，并非所有商品都属于同一种故事。",
      historyParagraphs: [
        "中国，并非所有商品都属于同一种故事。",
        "傲马所选择的，不是产量，而是时间。",
        "这些作品来自独立设计工作室、世代相传的工坊、以及仍坚持手工制作的匠人。",
      ],
      historyLines: [
        "景德镇烧制的瓷器。",
        "层层髹涂的大漆。",
        "手工雕琢的木器。",
        "精密织造的丝绸。",
      ],
      historyClose: ["它们不是纪念品。", "而是仍然活在今天的传统。"],
    },
  },
};

/** Brand names are cultural signatures — never treat as translations of each other. */
export const BRAND_ZH = "傲马";
export const BRAND_EN = "Orbmare";

export function getLang() {
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh";
}

export function otherLang(lang = getLang()) {
  return lang === "en" ? "zh" : "en";
}

export function t(key, lang = getLang()) {
  return DICT[lang]?.[key] || DICT.en[key] || key;
}

export function brandPrimary(lang = getLang()) {
  return lang === "zh" ? BRAND_ZH : BRAND_EN;
}

export function brandSecondary(lang = getLang()) {
  return lang === "zh" ? BRAND_EN : BRAND_ZH;
}

/** Opposite-script brand seal for hero / accent use only. */
export function brandStamp(lang = getLang()) {
  return brandSecondary(lang);
}

export function curatedBadge(lang = getLang()) {
  return t("brand.curated", lang);
}

export function dualLabel(zh, en, lang = getLang()) {
  const primary = lang === "zh" ? zh : en;
  const secondary = lang === "zh" ? en : zh;
  return { primary: primary || secondary || "", secondary: secondary || "" };
}

export function dualPairHtml(zh, en, lang = getLang(), className = "dn-pair") {
  const { primary, secondary } = dualLabel(zh, en, lang);
  const echo = secondary
    ? `<span class="dn-echo" data-dual-echo>${escapePlain(secondary)}</span>`
    : "";
  return `<span class="${className}" data-dual-pair data-dual-zh="${escapeAttr(zh)}" data-dual-en="${escapeAttr(en)}"><span class="dn-primary" data-dual-primary>${escapePlain(primary)}</span>${echo}</span>`;
}

function escapePlain(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapePlain(value).replace(/'/g, "&#39;");
}

/** Pick bilingual field from catalog objects */
export function loc(obj, field, lang = getLang()) {
  if (!obj) return "";
  if (lang === "zh") {
    const zh = obj[`${field}Zh`];
    if (zh != null && zh !== "") return zh;
  }
  return obj[field] ?? "";
}

function applyBrandLockups(lang) {
  const primary = brandPrimary(lang);
  const secondary = brandSecondary(lang);
  const stamp = brandStamp(lang);
  const label = `${primary} ${secondary}`;
  document.querySelectorAll("[data-brand-primary]").forEach((node) => {
    node.textContent = primary;
  });
  document.querySelectorAll("[data-brand-secondary]").forEach((node) => {
    node.textContent = secondary;
  });
  document.querySelectorAll("[data-brand-stamp]").forEach((node) => {
    node.textContent = stamp;
  });
  document.querySelectorAll("[data-brand-curated]").forEach((node) => {
    node.textContent = curatedBadge(lang);
  });
  document.querySelectorAll("a.orb-brand").forEach((node) => {
    node.setAttribute("aria-label", label);
  });
}

function applyEchoTitles(lang) {
  const alt = otherLang(lang);
  document.querySelectorAll("[data-i18n-echo]").forEach((node) => {
    const key = node.getAttribute("data-i18n-echo");
    const value = t(key, alt);
    if (value) node.textContent = value;
  });
}

function applyDualPairs(lang) {
  document.querySelectorAll("[data-dual-pair]").forEach((node) => {
    const zh = node.getAttribute("data-dual-zh") || "";
    const en = node.getAttribute("data-dual-en") || "";
    const { primary, secondary } = dualLabel(zh, en, lang);
    let primaryEl = node.querySelector("[data-dual-primary]");
    let echoEl = node.querySelector("[data-dual-echo]");
    if (!primaryEl) {
      node.replaceChildren();
      primaryEl = document.createElement("span");
      primaryEl.className = "dn-primary";
      primaryEl.setAttribute("data-dual-primary", "");
      echoEl = document.createElement("span");
      echoEl.className = "dn-echo";
      echoEl.setAttribute("data-dual-echo", "");
      node.append(primaryEl, echoEl);
    } else if (!echoEl && secondary) {
      echoEl = document.createElement("span");
      echoEl.className = "dn-echo";
      echoEl.setAttribute("data-dual-echo", "");
      node.appendChild(echoEl);
    }
    primaryEl.textContent = primary;
    if (echoEl) {
      echoEl.textContent = secondary;
      echoEl.hidden = !secondary;
    }
  });
}

export function applyDualNarrative(lang = getLang()) {
  applyBrandLockups(lang);
  applyEchoTitles(lang);
  applyDualPairs(lang);
}

export function applyI18n(lang = getLang()) {
  const resolved = lang === "en" ? "en" : "zh";
  document.documentElement.lang = resolved === "en" ? "en" : "zh-CN";
  document.documentElement.setAttribute("data-lang", resolved);
  localStorage.setItem(LANG_KEY, resolved);
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    const value = t(key, resolved);
    if (!value) return;
    if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") {
      node.placeholder = value;
    } else {
      node.textContent = value;
    }
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    const key = node.getAttribute("data-i18n-title");
    const value = t(key, resolved);
    if (value) {
      document.title = value.includes("|") ? value : `${value} | Orbmare`;
    }
  });
  applyDualNarrative(resolved);
  window.dispatchEvent(new CustomEvent("orbmare:i18n", { detail: { lang: resolved } }));
  return resolved;
}

export function isCuratedProductId(id) {
  return /^(ja|it|ch)-/i.test(String(id || ""));
}

export function onLangChange(handler) {
  window.addEventListener("orbmare:lang", (e) => handler(e.detail?.lang || getLang()));
}
