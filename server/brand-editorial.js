/**
 * Orbmare Brand Editorial System — normalize + public shape + legacy enrichment.
 * Every brand / studio / designer uses the same section contract.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, "../web");

function text(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

/** True when a site-relative /assets/... path exists on disk (uploads that 404 break detail heroes). */
function localAssetExists(publicPath) {
  const value = String(publicPath || "").trim();
  if (!value.startsWith("/assets/")) return true; // remote / unknown — leave alone
  const filePath = path.join(webRoot, value.replace(/^\//, ""));
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function pickExistingAsset(...candidates) {
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (!value) continue;
    if (localAssetExists(value)) return value;
  }
  return "";
}

function listOf(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeBrandEditorial(input = {}, existing = {}) {
  const src = { ...existing, ...input };
  const identityIn = src.identity && typeof src.identity === "object" ? src.identity : {};
  const identityExisting =
    existing.identity && typeof existing.identity === "object" ? existing.identity : {};

  const philosophy = listOf(src.philosophy ?? existing.philosophy)
    .slice(0, 4)
    .map((row) => ({
      title: text(row?.title, 80),
      titleZh: text(row?.titleZh, 80),
      body: text(row?.body, 280),
      bodyZh: text(row?.bodyZh, 280),
    }))
    .filter((row) => row.title || row.titleZh || row.body || row.bodyZh);

  // Detail shots (legacy key: crafts). Keep rows that have an image and/or copy.
  const crafts = listOf(src.crafts ?? src.details ?? existing.crafts)
    .slice(0, 9)
    .map((row) => ({
      image: text(row?.image, 400),
      title: text(row?.title, 80),
      titleZh: text(row?.titleZh, 80),
      body: text(row?.body, 200),
      bodyZh: text(row?.bodyZh, 200),
    }))
    .filter((row) => row.image || row.title || row.titleZh || row.body || row.bodyZh);

  const gallery = listOf(src.gallery ?? existing.gallery)
    .map((row) => (typeof row === "string" ? row : row?.image || row?.src || ""))
    .map((url) => text(url, 400))
    .filter(Boolean)
    .slice(0, 8);

  const ratingsIn = src.ratings && typeof src.ratings === "object" ? src.ratings : {};
  const ratingsExisting =
    existing.ratings && typeof existing.ratings === "object" ? existing.ratings : {};
  const rating = (key) => {
    const n = Number(ratingsIn[key] ?? ratingsExisting[key]);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(10, Math.round(n * 10) / 10));
  };

  const perspectiveIn =
    src.perspective && typeof src.perspective === "object" ? src.perspective : {};
  const perspectiveExisting =
    existing.perspective && typeof existing.perspective === "object"
      ? existing.perspective
      : {};

  return {
    logo: text(src.logo ?? existing.logo, 400),
    slogan: text(src.slogan ?? existing.slogan, 120),
    sloganZh: text(src.sloganZh ?? existing.sloganZh, 120),
    description: text(src.description ?? existing.description, 220),
    descriptionZh: text(src.descriptionZh ?? existing.descriptionZh, 220),
    heroImage: text(src.heroImage ?? existing.heroImage ?? src.image, 400),
    editorsNote: text(src.editorsNote ?? existing.editorsNote, 500),
    editorsNoteZh: text(src.editorsNoteZh ?? existing.editorsNoteZh, 500),
    identity: {
      brand: text(identityIn.brand ?? identityExisting.brand, 120),
      country: text(identityIn.country ?? identityExisting.country ?? src.country, 80),
      founded: text(identityIn.founded ?? identityExisting.founded, 40),
      founder: text(identityIn.founder ?? identityExisting.founder, 120),
      headquarters: text(identityIn.headquarters ?? identityExisting.headquarters, 120),
      designStyle: text(
        identityIn.designStyle ??
          identityIn.category ??
          identityExisting.designStyle ??
          identityExisting.category,
        120
      ),
      // Keep category as legacy alias of designStyle for older rows / clients.
      category: text(
        identityIn.designStyle ??
          identityIn.category ??
          identityExisting.designStyle ??
          identityExisting.category,
        120
      ),
      designLanguage: text(
        identityIn.designLanguage ?? identityExisting.designLanguage,
        120
      ),
      priceRange: text(identityIn.priceRange ?? identityExisting.priceRange, 80),
      materials: text(identityIn.materials ?? identityExisting.materials, 160),
      website: text(identityIn.website ?? identityExisting.website, 240),
    },
    storyImage: text(src.storyImage ?? existing.storyImage, 400),
    philosophy,
    crafts,
    materialIds: listOf(src.materialIds ?? existing.materialIds)
      .map((id) => text(id, 80))
      .filter(Boolean)
      .slice(0, 12),
    signatureProductIds: listOf(src.signatureProductIds ?? existing.signatureProductIds)
      .map((id) => text(id, 80))
      .filter(Boolean)
      .slice(0, 6),
    gallery,
    perspective: {
      whyMatters: text(
        perspectiveIn.whyMatters ?? perspectiveExisting.whyMatters,
        320
      ),
      whyMattersZh: text(
        perspectiveIn.whyMattersZh ?? perspectiveExisting.whyMattersZh,
        320
      ),
      whoFor: text(perspectiveIn.whoFor ?? perspectiveExisting.whoFor, 320),
      whoForZh: text(perspectiveIn.whoForZh ?? perspectiveExisting.whoForZh, 320),
      different: text(perspectiveIn.different ?? perspectiveExisting.different, 320),
      differentZh: text(
        perspectiveIn.differentZh ?? perspectiveExisting.differentZh,
        320
      ),
      verdict: text(perspectiveIn.verdict ?? perspectiveExisting.verdict, 320),
      verdictZh: text(perspectiveIn.verdictZh ?? perspectiveExisting.verdictZh, 320),
    },
    ratings: {
      craftsmanship: rating("craftsmanship"),
      timelessness: rating("timelessness"),
      materials: rating("materials"),
      design: rating("design"),
      value: rating("value"),
      authenticity: rating("authenticity"),
    },
    relatedBrandIds: listOf(src.relatedBrandIds ?? existing.relatedBrandIds)
      .map((id) => text(id, 80))
      .filter(Boolean)
      .slice(0, 8),
  };
}

/** Fill missing editorial fields from legacy brand rows so pages never look empty. */
export function enrichBrandEditorial(brand) {
  if (!brand) return null;
  const editorial = normalizeBrandEditorial(brand, brand);
  const nameEn = brand.nameEn || brand.name || brand.id;
  const nameZh = brand.nameZh || nameEn;
  const blurb = brand.blurb || brand.intro || "";
  const blurbZh = brand.blurbZh || brand.introZh || blurb;
  const story = brand.story || blurb;
  const storyZh = brand.storyZh || blurbZh || story;
  const fallbackImage = "/assets/editorial/designer-atelier.jpg";
  const image =
    pickExistingAsset(brand.image, brand.heroImage, brand.storyImage) || fallbackImage;
  const kind = brand.kind || "brand";

  if (!editorial.logo) editorial.logo = "";
  if (!editorial.slogan) editorial.slogan = blurb.slice(0, 80) || "Timeless by Design.";
  if (!editorial.sloganZh) editorial.sloganZh = blurbZh.slice(0, 80) || "以设计经得起时间。";
  if (!editorial.description) {
    editorial.description =
      kind === "designer"
        ? `An independent practice shaped by material honesty and quiet discipline.`
        : kind === "studio"
          ? `A studio dedicated to lasting objects and considered making.`
          : `A brand selected for clarity, craft, and long-term value.`;
  }
  if (!editorial.descriptionZh) {
    editorial.descriptionZh =
      kind === "designer"
        ? `以材料诚实与安静克制塑造的独立实践。`
        : kind === "studio"
          ? `致力于持久物件与审慎制作的工作室。`
          : `因清晰、工艺与长期价值而被甄选的品牌。`;
  }
  // Detail page prefers heroImage; if that upload is missing on disk, fall back to list image.
  editorial.heroImage = pickExistingAsset(editorial.heroImage, image) || image;
  editorial.storyImage = pickExistingAsset(editorial.storyImage, editorial.heroImage, image) || image;
  editorial.gallery = (editorial.gallery || [])
    .map((src) => pickExistingAsset(src))
    .filter(Boolean);
  if (!editorial.gallery.length) {
    editorial.gallery = [image, editorial.heroImage, editorial.storyImage].filter(
      (url, index, arr) => url && arr.indexOf(url) === index
    );
  }
  if (!editorial.editorsNote) {
    editorial.editorsNote = `Orbmare selected ${nameEn} for a simple reason: the work resists noise. In a marketplace of novelty, this practice chooses proportion, material integrity, and a pace that allows objects to age with dignity. We see long-term value here — not trend velocity.`;
  }
  if (!editorial.editorsNoteZh) {
    editorial.editorsNoteZh = `傲马选择「${nameZh}」，是因为它拒绝喧哗。在追逐新鲜感的市场里，它坚持比例、材料诚实，以及让物件有尊严地老化的节奏。我们看到的是长期价值，而非趋势速度。`;
  }
  if (!editorial.identity.brand) editorial.identity.brand = nameEn;
  if (!editorial.identity.designStyle && !editorial.identity.category) {
    const fallbackStyle =
      kind === "designer"
        ? "Quiet independent practice"
        : kind === "studio"
          ? "Atelier restraint"
          : "Timeless clarity";
    editorial.identity.designStyle = fallbackStyle;
    editorial.identity.category = fallbackStyle;
  } else if (!editorial.identity.designStyle) {
    editorial.identity.designStyle = editorial.identity.category;
  } else if (!editorial.identity.category) {
    editorial.identity.category = editorial.identity.designStyle;
  }
  if (!editorial.philosophy.length) {
    editorial.philosophy = [
      {
        title: "Less But Better",
        titleZh: "少，但更好",
        body: "Fewer gestures. Clearer decisions. Objects that remain.",
        bodyZh: "更少的姿态，更清晰的决定，留得住的物件。",
      },
      {
        title: "Material Honesty",
        titleZh: "材料诚实",
        body: "Let fibre, metal, and finish speak without disguise.",
        bodyZh: "让纤维、金属与工艺自己说话，不必伪装。",
      },
      {
        title: "Quiet Luxury",
        titleZh: "安静的奢华",
        body: "Presence without spectacle. Confidence without volume.",
        bodyZh: "有存在感而无炫耀，有自信而不喧嚷。",
      },
    ];
  }
  // Keep only detail images that still exist on disk; drop broken upload paths.
  editorial.crafts = (editorial.crafts || [])
    .map((row) => ({
      ...row,
      image: pickExistingAsset(row.image) || "",
    }))
    .filter((row) => row.image || row.title || row.titleZh || row.body || row.bodyZh);

  if (!editorial.crafts.length) {
    editorial.crafts = [
      {
        image,
        title: "Silhouette",
        titleZh: "轮廓",
        body: "Proportion and line in close view.",
        bodyZh: "近看比例与轮廓。",
      },
      {
        image,
        title: "Material",
        titleZh: "材料",
        body: "Surface, hand-feel, and ageing character.",
        bodyZh: "表面、手感与老化气质。",
      },
      {
        image,
        title: "Detail",
        titleZh: "细节",
        body: "Seams, hardware, and finishing up close.",
        bodyZh: "缝线、五金与收尾的近景。",
      },
    ];
  }
  if (!editorial.gallery.length) {
    editorial.gallery = [image, editorial.heroImage, editorial.storyImage].filter(
      (url, index, arr) => url && arr.indexOf(url) === index
    );
  }
  const p = editorial.perspective;
  if (!p.whyMatters) {
    p.whyMatters = `It expands what “good” can mean beyond price and novelty — toward durability of idea and make.`;
  }
  if (!p.whyMattersZh) {
    p.whyMattersZh = `它把「好」从价格与新鲜感，扩展到观念与制作的耐久。`;
  }
  if (!p.whoFor) {
    p.whoFor = `Collectors and everyday users who prefer fewer, clearer objects.`;
  }
  if (!p.whoForZh) {
    p.whoForZh = `偏好更少、更清晰物件的收藏者与日常使用者。`;
  }
  if (!p.different) {
    p.different = `Restraint as a design method — not as absence, but as editorial focus.`;
  }
  if (!p.differentZh) {
    p.differentZh = `克制作为一种设计方法——不是缺失，而是编辑式的聚焦。`;
  }
  if (!p.verdict) {
    p.verdict = `A fitting addition to the Orbmare library: calm, rigorous, and built to last.`;
  }
  if (!p.verdictZh) {
    p.verdictZh = `适合进入傲马馆藏：安静、严谨，并经得起时间。`;
  }
  const r = editorial.ratings;
  for (const key of Object.keys(r)) {
    if (r[key] == null) r[key] = 8.6;
  }

  return {
    ...brand,
    ...editorial,
    story: story,
    storyZh: storyZh,
    image,
  };
}

export function toPublicBrandCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind || "brand",
    featured: Boolean(row.featured),
    featuredRank: Number.isFinite(Number(row.featuredRank))
      ? Number(row.featuredRank)
      : 100,
    name: row.nameEn || row.name || row.id,
    nameEn: row.nameEn || row.name || row.id,
    nameZh: row.nameZh || row.name || row.id,
    studio: row.studio || "",
    studioZh: row.studioZh || "",
    country: row.country || row.identity?.country || "",
    image: row.image || row.heroImage || "",
    logo: row.logo || "",
    slogan: row.slogan || "",
    sloganZh: row.sloganZh || "",
    blurb: row.blurb || row.intro || "",
    blurbZh: row.blurbZh || row.introZh || "",
    story: row.story || "",
    storyZh: row.storyZh || "",
    status: row.status,
  };
}

export function toPublicBrandDetail(row) {
  return enrichBrandEditorial({
    ...row,
    ...normalizeBrandEditorial(row, row),
  });
}
