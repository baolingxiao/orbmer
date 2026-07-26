export const MEMBERSHIP_TIERS = Object.freeze(["explorer", "journal", "collector", "black"]);
export const PAID_TIERS = Object.freeze(["journal", "collector"]);
export const BILLING_INTERVALS = Object.freeze(["monthly", "yearly"]);

export const MEMBERSHIP_COPY = Object.freeze({
  zh: {
    title: "傲马会员",
    stamp: "Orbmare",
    lead:
      "Orbmare 会员购买的不是折扣，而是来自真人编辑、买手与策展团队的时间、判断与服务。",
    billingMonthly: "月付",
    billingYearly: "年付",
    current: "当前会员状态",
    upgrade: "升级会员",
    manage: "管理订阅",
    cancel: "取消订阅",
    requestInfo: "申请了解",
    paymentInProgress: "Payment setup in progress",
    comparison: "权益对比",
    faq: "常见问题",
    open: "已开放",
    unavailable: "不包含",
    preparation: "筹备中",
    preparingBody: "我们正在认真准备这项服务。",
    notifyMe: "通知我",
    notified: "已记录，我们准备好后会通知你。",
    signInToUpgrade: "登录后管理会员",
    completeExperience: "完整策展体验",
    accountCta: "查看账户会员",
    concierge: "真人服务申请",
    requests: "服务申请记录",
  },
  en: {
    title: "Membership",
    stamp: "傲马",
    lead:
      "Orbmare membership is not built around discounts. It offers access to the time, judgment and service of human editors, buyers and curators.",
    billingMonthly: "Monthly",
    billingYearly: "Yearly",
    current: "Current membership",
    upgrade: "Upgrade",
    manage: "Manage subscription",
    cancel: "Cancel subscription",
    requestInfo: "Request Information",
    paymentInProgress: "Payment setup in progress",
    comparison: "Benefit comparison",
    faq: "FAQ",
    open: "Available",
    unavailable: "Not included",
    preparation: "In Preparation",
    preparingBody: "We are carefully preparing this service.",
    notifyMe: "Notify me",
    notified: "Recorded. We’ll let you know when it is ready.",
    signInToUpgrade: "Sign in to manage membership",
    completeExperience: "The Complete Curated Experience",
    accountCta: "View account membership",
    concierge: "Human service request",
    requests: "Service request history",
  },
});

export const MEMBERSHIP_PRICES = Object.freeze({
  explorer: { monthly: 0, yearly: 0 },
  journal: { monthly: 9.99, yearly: 99 },
  collector: { monthly: 24.99, yearly: 249 },
  black: { monthly: null, yearly: null },
});

export const TIER_META = Object.freeze({
  explorer: {
    titleZh: "Explorer",
    titleEn: "Explorer",
    bodyZh: "免费进入 Orbmare 的公开策展世界，保存喜欢的作品并完成正常下单。",
    bodyEn: "Enter Orbmare’s public curated world, save pieces, and place regular orders.",
  },
  journal: {
    titleZh: "Journal",
    titleEn: "Journal",
    bodyZh: "为喜欢阅读材料、工艺和品牌故事的人准备。",
    bodyEn: "For readers who want deeper access to materials, craft, and brand stories.",
  },
  collector: {
    titleZh: "Collector",
    titleEn: "Collector",
    bodyZh: "为需要完整策展体验、优先购买资格与真人服务入口的收藏者准备。",
    bodyEn: "For collectors who want the complete curated experience, priority access, and human service requests.",
    badgeZh: "完整策展体验",
    badgeEn: "The Complete Curated Experience",
  },
  black: {
    titleZh: "Black",
    titleEn: "Black",
    bodyZh: "邀请制私人服务层级。第一版仅开放申请了解。",
    bodyEn: "An invitation-only private service tier. The first version only accepts information requests.",
  },
});

export const MEMBERSHIP_ENTITLEMENTS = Object.freeze([
  ["public_browse", "explorer", "浏览全部公开商品", "Browse all public objects", "active"],
  ["favorites", "explorer", "收藏商品", "Save favorite objects", "active"],
  ["wishlist", "explorer", "创建愿望单", "Create wishlists", "active"],
  ["partial_journal", "explorer", "阅读部分杂志内容", "Read selected Journal stories", "active"],
  ["brand_material_craft", "explorer", "阅读品牌、材料与工艺故事", "Read brand, material, and craft stories", "active"],
  ["regular_purchase", "explorer", "正常下单购买", "Place regular orders", "active"],
  ["order_tracking", "explorer", "查看订单和物流状态", "View order and delivery status", "active"],
  ["all_member_journal", "journal", "阅读全部会员杂志", "Read all member Journal stories", "active"],
  ["editor_picks", "journal", "阅读编辑推荐", "Read editor recommendations", "active"],
  ["curator_notes", "journal", "阅读 Curator Notes（策展人笔记）", "Read Curator Notes", "active"],
  ["monthly_list", "journal", "查看每月精选清单", "View the monthly selection list", "active"],
  ["brand_early_48", "journal", "新品牌提前48小时浏览", "48-hour early access to new brands", "active"],
  ["journal_badge", "journal", "Journal会员身份标识", "Journal member identity", "active"],
  ["collector_badge", "collector", "Collector会员身份标识", "Collector member identity", "active"],
  ["collector_content", "collector", "Collector专属内容访问权限", "Collector-only content access", "active"],
  ["brand_early_72", "collector", "新品牌提前72小时浏览", "72-hour early access to new brands", "active"],
  ["limited_priority", "collector", "限量商品优先购买资格", "Priority access for limited objects", "active"],
  ["concierge_entry", "collector", "真人服务申请入口", "Human service request access", "active"],
  ["concierge_history", "collector", "服务申请记录页面", "Service request history", "active"],
  ["personal_buyer", "collector", "专属买手", "Dedicated buyer", "preparation"],
  ["styling_advice", "collector", "真人穿搭建议", "Human styling advice", "preparation"],
  ["gift_advisor", "collector", "真人送礼顾问", "Human gift advisor", "preparation"],
  ["global_sourcing", "collector", "全球寻货", "Global sourcing", "preparation"],
  ["purchase_advice", "collector", "真人采购建议", "Human purchasing advice", "preparation"],
  ["priority_procurement", "collector", "优先采购", "Priority procurement", "preparation"],
  ["priority_logistics", "collector", "优先物流处理", "Priority logistics handling", "preparation"],
  ["birthday_courtesy", "collector", "生日礼遇", "Birthday courtesy", "preparation"],
  ["black_private_buyer", "black", "固定私人买手", "Permanent private buyer", "preparation"],
  ["black_planning", "black", "私人购物规划", "Private shopping planning", "preparation"],
  ["black_global_sourcing", "black", "全球寻货", "Global sourcing", "preparation"],
  ["black_global_purchase", "black", "全球代购", "Global purchasing service", "preparation"],
  ["black_catalog", "black", "私人商品目录", "Private object catalog", "preparation"],
  ["black_events", "black", "设计师活动邀请", "Designer event invitations", "preparation"],
  ["black_logistics", "black", "优先物流安排", "Priority logistics arrangement", "preparation"],
  ["black_card", "black", "手写卡片", "Handwritten cards", "preparation"],
  ["black_birthday", "black", "生日礼遇", "Birthday courtesy", "preparation"],
  ["black_objects", "black", "Black专属商品", "Black-exclusive objects", "preparation"],
].map(([key, tier, titleZh, titleEn, availability], index) => ({
  key,
  tier,
  titleZh,
  titleEn,
  availability,
  displayOrder: index + 1,
})));

export const SERVICE_TYPES = Object.freeze({
  styling: { zh: "穿搭建议", en: "Styling advice" },
  gift: { zh: "礼物推荐", en: "Gift recommendation" },
  sourcing: { zh: "商品寻货", en: "Object sourcing" },
  purchasing: { zh: "采购咨询", en: "Purchasing consultation" },
  other: { zh: "其他", en: "Other" },
});

export const CONCIERGE_STATUSES = Object.freeze({
  submitted: { zh: "已提交", en: "Submitted" },
  reviewing: { zh: "正在查看", en: "Reviewing" },
  awaiting_customer: { zh: "等待客户补充", en: "Awaiting customer" },
  sourcing: { zh: "正在寻访", en: "Sourcing" },
  completed: { zh: "已完成", en: "Completed" },
  declined: { zh: "暂不承接", en: "Declined" },
});

export function tierRank(tier = "explorer") {
  return { explorer: 0, journal: 1, collector: 2, black: 3 }[tier] ?? 0;
}

export function tierIncludes(userTier, requiredTier) {
  return tierRank(userTier) >= tierRank(requiredTier);
}

export function locMembership(value, lang = "zh") {
  return lang === "en" ? value?.titleEn || value?.en || "" : value?.titleZh || value?.zh || "";
}
