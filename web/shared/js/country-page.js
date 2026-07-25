/** Shared country pavilion page bootstrap (bilingual) */
import { mountChrome } from "/shared/js/chrome.js";
import { loadCatalog, productsByCountry, quietCardHtml, escapeHtml, materialTitleHtml } from "/shared/js/catalog-editorial.js";
import { getLang, t, loc, applyI18n, onLangChange, COUNTRY_COPY } from "/shared/js/editorial-i18n.js";

/** @typedef {{ id?: string, en: string, zh: string, noteEn?: string, noteZh?: string }} MaterialEntry */

/** Fallback when CMS country row has no pavilion materials. */
const MATERIAL_ENTRIES = {
  japan: [
    { id: "japanese-denim", en: "Japanese Denim", zh: "日本丹宁" },
    { en: "Porcelain", zh: "瓷器" },
    { en: "Washi", zh: "和纸" },
    { en: "Carbon Steel", zh: "碳钢" },
    { en: "Hinoki", zh: "桧木" },
  ],
  italy: [
    { id: "baby-cashmere", en: "Baby Cashmere", zh: "Baby Cashmere" },
    { id: "vegetable-tanned-leather", en: "Vegetable Tanned Leather", zh: "植鞣革" },
    { en: "Marble", zh: "大理石" },
    { en: "Silk", zh: "丝绸" },
    { id: "french-linen", en: "French Linen", zh: "法国亚麻" },
  ],
  china: [
    { id: "mulberry-silk-taihu", en: "Mulberry Silk", zh: "桑蚕丝", noteEn: "Taihu Lake silk", noteZh: "太湖湖丝" },
    { id: "yak-wool", en: "Yak Wool", zh: "牦牛绒", noteEn: "Qinghai–Tibet Plateau", noteZh: "青藏高原" },
    { id: "alxa-camel-wool", en: "Alxa Bactrian Camel Wool", zh: "阿拉善双峰驼绒" },
    { id: "han-hemp", en: "Han Hemp", zh: "汉麻" },
    { id: "ramie-xiabu", en: "Ramie", zh: "苎麻", noteEn: "Xia Bu fiber", noteZh: "夏布原料" },
    { id: "raw-lacquer", en: "Raw Lacquer", zh: "天然生漆", noteEn: "Da Qi / Urushi", noteZh: "大漆" },
  ],
};

const CRAFT_LISTS = {
  japan: ["Forged", "Ceramics", "Japanese Joinery", "Wood Turning", "Handwoven"],
  italy: ["Hand Stitched", "Handwoven", "Wood Turning", "Hand Painted"],
  china: ["Ceramics", "Hand Painted", "Handwoven", "Wood Turning"],
};

const CRAFT_LISTS_ZH = {
  japan: ["锻造", "陶瓷", "日本榫卯", "车木", "手织"],
  italy: ["手缝", "手织", "车木", "手绘"],
  china: ["陶瓷", "手绘", "手织", "车木"],
};

const PRODUCT_BODY_KEY = {
  japan: "country.products.jp",
  italy: "country.products.it",
  china: "country.products.cn",
};

function materialHref(entry) {
  return entry.id ? `/materials/detail/?id=${encodeURIComponent(entry.id)}` : "/materials/";
}

function paragraphsFromText(value) {
  return String(value || "")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

async function fetchCountryEntity(countryKey) {
  try {
    const res = await fetch(`/api/countries/${encodeURIComponent(countryKey)}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok && data.country ? data.country : null;
  } catch {
    return null;
  }
}

function resolveMeta(countryKey, entity, lang) {
  const fallback = COUNTRY_COPY[countryKey]?.[lang] || COUNTRY_COPY[countryKey]?.en || {};
  const name =
    lang === "zh"
      ? entity?.nameZh || entity?.name || fallback.name
      : entity?.nameEn || entity?.name || fallback.name;
  const tag =
    lang === "zh" ? entity?.tagZh || entity?.tag || fallback.tag : entity?.tag || entity?.tagZh || fallback.tag;
  const culture =
    lang === "zh"
      ? entity?.cultureZh || entity?.culture || fallback.culture
      : entity?.culture || entity?.cultureZh || fallback.culture;

  let historyParagraphs =
    lang === "zh"
      ? entity?.historyParagraphsZh || entity?.historyParagraphs
      : entity?.historyParagraphs || entity?.historyParagraphsZh;
  if (!Array.isArray(historyParagraphs) || !historyParagraphs.length) {
    const historyText =
      lang === "zh" ? entity?.historyZh || entity?.history : entity?.history || entity?.historyZh;
    historyParagraphs = paragraphsFromText(historyText);
  }
  if (!historyParagraphs.length && Array.isArray(fallback.historyParagraphs)) {
    historyParagraphs = fallback.historyParagraphs;
  }

  const historyLines =
    (lang === "zh"
      ? entity?.historyLinesZh || entity?.historyLines
      : entity?.historyLines || entity?.historyLinesZh) ||
    fallback.historyLines ||
    [];
  const historyClose =
    (lang === "zh"
      ? entity?.historyCloseZh || entity?.historyClose
      : entity?.historyClose || entity?.historyCloseZh) ||
    fallback.historyClose ||
    [];
  const history =
    lang === "zh"
      ? entity?.historyZh || entity?.history || fallback.history
      : entity?.history || entity?.historyZh || fallback.history;

  return {
    name,
    tag,
    culture,
    history,
    historyParagraphs,
    historyLines: Array.isArray(historyLines) ? historyLines : [],
    historyClose: Array.isArray(historyClose) ? historyClose : [],
    coverImage: entity?.coverImage || entity?.image || `/assets/editorial/country-${countryKey}.jpg`,
    productsBody:
      lang === "zh"
        ? entity?.productsBodyZh || entity?.productsBody || ""
        : entity?.productsBody || entity?.productsBodyZh || "",
    materials: normalizeMaterials(entity, countryKey),
    crafts: normalizeCrafts(entity, countryKey, lang),
  };
}

function normalizeMaterials(entity, countryKey) {
  const rows = entity?.pavilionMaterials || entity?.materials;
  if (Array.isArray(rows) && rows.length) {
    return rows.map((row) => {
      if (typeof row === "string") return { en: row, zh: row };
      return {
        id: row.id || "",
        en: row.en || row.name || row.nameEn || row.zh || "",
        zh: row.zh || row.nameZh || row.en || row.name || "",
        noteEn: row.noteEn || "",
        noteZh: row.noteZh || "",
      };
    });
  }
  return MATERIAL_ENTRIES[countryKey] || [];
}

function normalizeCrafts(entity, countryKey, lang) {
  const list =
    lang === "zh"
      ? entity?.pavilionCraftsZh || entity?.craftsZh || entity?.pavilionCrafts || entity?.crafts
      : entity?.pavilionCrafts || entity?.crafts || entity?.pavilionCraftsZh || entity?.craftsZh;
  if (Array.isArray(list) && list.length) return list.map(String);
  return lang === "zh" ? CRAFT_LISTS_ZH[countryKey] || [] : CRAFT_LISTS[countryKey] || [];
}

export async function mountCountryPage(countryKey) {
  const copyAll = COUNTRY_COPY[countryKey];
  if (!copyAll && !countryKey) return;

  const [catalog, entity] = await Promise.all([loadCatalog(), fetchCountryEntity(countryKey)]);

  function render(lang = getLang()) {
    const meta = resolveMeta(countryKey, entity, lang);
    const titleName = meta.name || countryKey;
    document.title = `${titleName} | Orbmare`;
    applyI18n(lang);

    const cover = document.querySelector("[data-country-cover]");
    if (cover) {
      cover.innerHTML = `
        <img src="${escapeHtml(meta.coverImage)}" alt="" width="1600" height="900" fetchpriority="high" />
        <div class="cover-hero-copy">
          <p class="meta">${escapeHtml(meta.tag || "")}</p>
          <h1>${escapeHtml(meta.name || "")}</h1>
          <p>${escapeHtml(meta.culture || "")}</p>
        </div>`;
    }

    const history = document.querySelector("[data-country-history]");
    if (history) {
      if (Array.isArray(meta.historyParagraphs) && meta.historyParagraphs.length) {
        const paragraphs = meta.historyParagraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
        const lines = meta.historyLines.length
          ? `<ul class="country-history-lines">${meta.historyLines
              .map((line) => `<li>${escapeHtml(line)}</li>`)
              .join("")}</ul>`
          : "";
        const close = meta.historyClose.length
          ? meta.historyClose.map((p) => `<p>${escapeHtml(p)}</p>`).join("")
          : "";
        history.innerHTML = `
          <h2>${escapeHtml(t("country.history", lang))}</h2>
          ${paragraphs}
          ${lines}
          ${close}`;
      } else {
        history.innerHTML = `
          <h2>${escapeHtml(t("country.history", lang))}</h2>
          <p>${escapeHtml(meta.history || "")}</p>
          <p>${escapeHtml(meta.culture || "")}</p>`;
      }
    }

    const mats = document.querySelector("[data-country-materials]");
    if (mats) {
      mats.innerHTML = meta.materials
        .map((entry) => {
          const name = lang === "zh" ? entry.zh : entry.en;
          const note = lang === "zh" ? entry.noteZh || entry.noteEn : entry.noteEn || entry.noteZh;
          const titleHtml = note
            ? `${escapeHtml(name)}<br><span class="material-title-paren">${lang === "zh" ? "（" : "("}${escapeHtml(note)}${lang === "zh" ? "）" : ")"}</span>`
            : materialTitleHtml(name);
          const small = t("label.material", lang);
          return `<a class="material-tile" href="${materialHref(entry)}"><span>${titleHtml}</span><small>${escapeHtml(small)}</small></a>`;
        })
        .join("");
    }

    const crafts = document.querySelector("[data-country-crafts]");
    if (crafts) {
      crafts.innerHTML = meta.crafts
        .map(
          (c) =>
            `<a class="material-tile" href="/craftsmanship/"><span>${escapeHtml(c)}</span><small>${escapeHtml(t("label.craft", lang))}</small></a>`
        )
        .join("");
    }

    applyI18n(lang);

    const products = productsByCountry(catalog, countryKey);
    const designers = [...new Map(products.map((p) => [p.designerId, p])).values()].slice(0, 3);

    const designerEl = document.querySelector("[data-country-designers]");
    if (designerEl) {
      designerEl.innerHTML = designers
        .map((p) => {
          const dName = loc(p, "designerName", lang);
          const studio = loc(p, "studio", lang);
          return `<a class="quiet-card" href="/designers/?id=${encodeURIComponent(p.designerId)}">
            <div class="quiet-card-media"><img src="${p.image}" alt="" width="640" height="800" loading="lazy" /></div>
            <div><h3>${escapeHtml(dName)}</h3><p>${escapeHtml(studio)} · ${escapeHtml(meta.name)}</p></div>
          </a>`;
        })
        .join("");
    }

    const productEl = document.querySelector("[data-country-products]");
    if (productEl) {
      productEl.innerHTML = products.slice(0, 9).map((p) => quietCardHtml(p, lang)).join("");
    }

    const productsBody = document.querySelector("[data-country-products-body]");
    if (productsBody) {
      productsBody.textContent =
        meta.productsBody || t(PRODUCT_BODY_KEY[countryKey] || "country.products.jp", lang);
    }
  }

  const initial = resolveMeta(countryKey, entity, getLang());
  mountChrome({ title: `${initial.name || countryKey} | Orbmare` });
  render(getLang());
  onLangChange((lang) => render(lang));
}
