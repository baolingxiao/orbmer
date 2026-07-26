/** Data only: Discover layouts render these records without page-specific markup changes. */
export const COLLECTIONS = [
  { slug: "quiet-luxury", zh: "安静奢华", en: "Quiet Luxury", image: "/assets/editorial/material-cashmere.jpg", query: "cashmere leather silk" },
  { slug: "japanese-craft", zh: "日本工艺", en: "Japanese Craft", image: "/assets/editorial/country-japan.jpg", query: "japan handmade" },
  { slug: "desk", zh: "书桌日常", en: "Desk Essentials", image: "/assets/editorial/designer-atelier.jpg", query: "desk stationery" },
  { slug: "coffee", zh: "咖啡仪式", en: "Coffee Ritual", image: "/assets/editorial/material-veg-leather.jpg", query: "coffee tea ceramic" },
  { slug: "italian-leather", zh: "意大利皮革", en: "Italian Leather", image: "/assets/editorial/country-italy.jpg", query: "italy leather" },
  { slug: "modern-minimalism", zh: "现代极简", en: "Modern Minimalism", image: "/assets/editorial/hero-craft.jpg", query: "minimal design" },
  { slug: "travel", zh: "旅行随行", en: "Travel Essentials", image: "/assets/editorial/country-china.jpg", query: "travel leather" },
  { slug: "summer-linen", zh: "夏日亚麻", en: "Summer Linen", image: "/assets/editorial/material-cashmere.jpg", query: "linen ramie" },
];

export const JOURNAL_FEATURES = [
  { zh: "苎麻的历史", en: "The History of Ramie", kindZh: "材料", kindEn: "Material", href: "/materials/?id=ramie", image: "/assets/editorial/material-cashmere.jpg" },
  { zh: "为什么日本黄铜愈用愈美", en: "Why Japanese Copper Ages Beautifully", kindZh: "工艺", kindEn: "Craft", href: "/countries/japan/", image: "/assets/editorial/country-japan.jpg" },
  { zh: "安静奢华的美", en: "The Beauty of Quiet Luxury", kindZh: "观点", kindEn: "Perspective", href: "/journal/", image: "/assets/editorial/designer-atelier.jpg" },
  { zh: "意大利皮革释义", en: "Italian Leather Explained", kindZh: "材料", kindEn: "Material", href: "/countries/italy/", image: "/assets/editorial/country-italy.jpg" },
];

/** Each route intentionally maps to an available catalog signal, never open search. */
export const GUIDED_PATHS = [
  { zh: "从日本开始", en: "Begin with Japan", zhBody: "器物、文具与日常工艺", enBody: "Objects, stationery, and everyday craft", query: "japan" },
  { zh: "进入意大利", en: "Enter Italy", zhBody: "设计、质感与经典比例", enBody: "Design, texture, and enduring proportion", query: "italy" },
  { zh: "进入中国", en: "Enter China", zhBody: "原创设计与传承中的新表达", enBody: "Original design and living heritage", query: "china" },
];
