/** Material Intelligence V2 — Luxury Conversion Logic */

import { loadCatalog, quietCardHtml, escapeHtml, materialById, materialTitleHtml, splitMaterialTitle } from "/shared/js/catalog-editorial.js";
import { getLang, loc, t, applyI18n, onLangChange } from "/shared/js/editorial-i18n.js";

let detailsCache = null;
let intelCache = null;

async function loadDetails() {
  if (detailsCache) return detailsCache;
  // Prefer admin-managed materials when published in DB; fall back to static JSON.
  try {
    const managed = await fetch(`/api/editorial-catalog?t=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (managed.ok) {
      const data = await managed.json();
      if (data?.ok && Array.isArray(data.materials) && data.materials.length) {
        // Still need full essays from material-details or per-id API.
      }
    }
  } catch {
    // ignore and use static file
  }
  const res = await fetch(`/shared/data/material-details.json?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Material details unavailable");
  detailsCache = await res.json();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    try {
      const live = await fetch(`/api/materials/${encodeURIComponent(id)}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (live.ok) {
        const payload = await live.json();
        if (payload?.ok && payload.material) {
          detailsCache.materials = detailsCache.materials || {};
          detailsCache.materials[id] = {
            ...detailsCache.materials[id],
            ...payload.material,
            id,
          };
        }
      }
    } catch {
      // keep static essay
    }
  }
  return detailsCache;
}

async function loadIntelligence() {
  if (intelCache) return intelCache;
  const res = await fetch(`/shared/data/material-intelligence.json?t=${Date.now()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Material intelligence unavailable");
  intelCache = await res.json();

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    try {
      const live = await fetch(`/api/materials/${encodeURIComponent(id)}?t=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (live.ok) {
        const payload = await live.json();
        const material = payload?.material;
        if (payload?.ok && material?.intelligence && typeof material.intelligence === "object") {
          intelCache.materials = intelCache.materials || {};
          intelCache.materials[id] = {
            ...(intelCache.materials[id] || {}),
            ...material.intelligence,
            id,
            name: material.intelligence.name || material.nameEn || material.name,
            nameZh: material.intelligence.nameZh || material.nameZh || material.name,
            image: material.intelligence.image || material.image || material.heroImage,
          };
        }
      }
    } catch {
      // keep static intelligence
    }
  }
  return intelCache;
}

function L(pair, lang) {
  if (!pair) return "";
  if (typeof pair === "string") return pair;
  return lang === "zh" ? pair.zh || pair.en || "" : pair.en || pair.zh || "";
}

function pick(obj, key, lang) {
  if (!obj) return "";
  if (lang === "zh") return obj[`${key}Zh`] ?? obj[key] ?? "";
  return obj[key] ?? obj[`${key}Zh`] ?? "";
}

function evidenceTag(level, lang) {
  const key = level === "verified" || level === "inferred" ? level : "none";
  return `<span class="mi2-tag mi2-tag--${key}">${escapeHtml(t(`materials.mi2.tag.${key}`, lang))}</span>`;
}

function observeReveals(root) {
  const nodes = [...root.querySelectorAll(".mi2-reveal")];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
  );
  nodes.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    if (rect.top < vh * 0.92 && rect.bottom > 0) {
      el.classList.add("is-in");
    } else {
      io.observe(el);
    }
  });
}

function wireParallax(root) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const nodes = [...root.querySelectorAll("[data-mi2-parallax]")];
  if (!nodes.length) return;
  const onScroll = () => {
    const view = window.innerHeight || 1;
    nodes.forEach((media) => {
      const img = media.querySelector("img");
      if (!img) return;
      const rect = media.getBoundingClientRect();
      const progress = (view - rect.top) / (view + rect.height);
      const y = Math.max(-10, Math.min(10, (progress - 0.5) * 14));
      img.style.transform = `scale(1.05) translate3d(0, ${y}px, 0)`;
    });
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function wireBars(root) {
  requestAnimationFrame(() => {
    root.querySelectorAll("[data-mi2-bar]").forEach((el) => {
      const v = Number(el.getAttribute("data-mi2-bar") || 0);
      const fill = el.querySelector("i");
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, v))}%`;
    });
  });
}

function relatedProducts(catalog, material, lang) {
  const materialId = material?.id || "";
  const nameEn = (material?.name || "").toLowerCase();
  const nameZh = material?.nameZh || "";
  const nameZhCore = nameZh.replace(/[（(].*$/, "").trim();
  const tokens = [
    ...nameEn.split(/[\s(/（）)-]+/).filter((tok) => tok.length > 2),
    nameZhCore,
    nameZhCore.slice(0, 2),
  ].filter(Boolean);
  const isExact = (p) =>
    Boolean(
      materialId &&
        (p.materialId === materialId ||
          (Array.isArray(p.materialIds) && p.materialIds.includes(materialId)))
    );
  const matched = (catalog.products || []).filter((p) => {
    if (isExact(p)) return true;
    const mat = `${p.material || ""} ${p.materialZh || ""}`.toLowerCase();
    return tokens.some((tok) => mat.includes(String(tok).toLowerCase()));
  });
  matched.sort((a, b) => Number(isExact(b)) - Number(isExact(a)));
  return matched.slice(0, 12).map((p) => quietCardHtml(p, lang)).join("");
}

function wireProductsCarousel(root) {
  const section = root.querySelector("#mi2-products");
  if (!section) return;
  const track = section.querySelector("[data-mi2-products-track]");
  const prev = section.querySelector("[data-mi2-products-prev]");
  const next = section.querySelector("[data-mi2-products-next]");
  if (!track) return;

  const step = () => {
    const card = track.querySelector(".quiet-card");
    if (!card) return Math.min(320, track.clientWidth * 0.8);
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || "24") || 24;
    return card.getBoundingClientRect().width + gap;
  };

  const sync = () => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth - 4);
    const x = track.scrollLeft;
    if (prev) prev.disabled = x <= 2;
    if (next) next.disabled = x >= max;
  };

  prev?.addEventListener("click", () => {
    track.scrollBy({ left: -step(), behavior: "smooth" });
  });
  next?.addEventListener("click", () => {
    track.scrollBy({ left: step(), behavior: "smooth" });
  });
  track.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  requestAnimationFrame(sync);
}

export async function mountMaterialDetail(root) {
  const id = new URLSearchParams(location.search).get("id");
  const [catalog, pack, intelPack] = await Promise.all([loadCatalog(), loadDetails(), loadIntelligence()]);
  const detail = id ? pack.materials?.[id] : null;
  const material = id ? materialById(catalog, id) : null;
  const mi = id ? intelPack.materials?.[id] : null;

  function render(lang = getLang()) {
    applyI18n(lang);
    if (!mi && !detail && !material) {
      root.innerHTML = `<section class="mi2-screen shell-wide">
        <h1 class="mi2-display">${escapeHtml(t("materials.detail.notfound", lang))}</h1>
        <p class="mi2-body"><a href="/materials/">${escapeHtml(t("nav.materials", lang))}</a></p>
      </section>`;
      return;
    }

    const d = detail || {};
    const name = pick(mi || d, "name", lang) || loc(material || {}, "name", lang);
    const titleBits = splitMaterialTitle(name);
    document.title = `${titleBits.title || name} · Orbmare`;

    const identity = (mi.identity || [])
      .map(
        (row) => `<div class="mi2-passport-row mi2-reveal">
          <span>${escapeHtml(pick(row, "label", lang))}</span>
          <strong>${escapeHtml(pick(row, "value", lang))}</strong>
        </div>`
      )
      .join("");

    const evidence = (mi.evidence || [])
      .map(
        (row) => `<article class="mi2-evidence-card mi2-reveal">
          <header>
            <h3>${escapeHtml(pick(row, "label", lang))}</h3>
            ${evidenceTag(row.evidence, lang)}
          </header>
          <p class="mi2-evidence-value">${escapeHtml(String(row.value ?? "—"))}${
            pick(row, "unit", lang) ? `<small>${escapeHtml(pick(row, "unit", lang))}</small>` : ""
          }</p>
          ${pick(row, "note", lang) ? `<p class="mi2-fine">${escapeHtml(pick(row, "note", lang))}</p>` : ""}
        </article>`
      )
      .join("");

    const costFactors = (mi.costWhy?.factors || [])
      .map(
        (f) => `<div class="mi2-cost-row mi2-reveal" data-mi2-bar="${f.weight}">
          <div class="mi2-cost-meta">
            <span>${escapeHtml(pick(f, "label", lang))}</span>
            <em>${escapeHtml(pick(f, "figure", lang))}</em>
            ${evidenceTag(f.evidence, lang)}
          </div>
          <div class="mi2-track" aria-hidden="true"><i></i></div>
        </div>`
      )
      .join("");

    const journey = (mi.journey || [])
      .map(
        (step, i) => `<section class="mi2-journey-step mi2-reveal" id="mi2-journey-${i}">
          <figure class="mi2-journey-media" data-mi2-parallax>
            <img src="${step.image || mi.image}" alt="" width="1600" height="1200" loading="lazy" />
          </figure>
          <div class="mi2-journey-copy">
            <p class="mi2-index">${String(i + 1).padStart(2, "0")}</p>
            <h3>${escapeHtml(pick(step, "title", lang))}</h3>
            <p>${escapeHtml(pick(step, "body", lang))}</p>
          </div>
        </section>`
      )
      .join("");

    const peers = mi.compare?.peers || [];
    const axes = mi.compare?.axes || [];
    const scores = mi.compare?.scores || {};
    const compareHead = `<div class="mi2-compare-head">
      <span></span>
      ${peers.map((p) => `<span class="${p.self ? "is-self" : ""}">${escapeHtml(pick(p, "label", lang))}</span>`).join("")}
    </div>`;
    const compareRows = axes
      .map((axis) => {
        const cells = peers
          .map((p) => {
            const v = scores[p.id]?.[axis.key] ?? 0;
            return `<div class="mi2-compare-cell">
              <div class="mi2-pip" style="--v:${v}"></div>
              <span>${v}</span>
            </div>`;
          })
          .join("");
        return `<div class="mi2-compare-row mi2-reveal">
          <span>${escapeHtml(pick(axis, "label", lang))}</span>
          ${cells}
        </div>`;
      })
      .join("");

    const usedBy = (mi.usedBy || []).length
      ? (mi.usedBy || [])
          .map(
            (u) => `<article class="mi2-used mi2-reveal">
              <h3>${escapeHtml(pick(u, "name", lang))}</h3>
              <p class="mi2-fine">${escapeHtml(pick(u, "field", lang))}</p>
              <p>${escapeHtml(L(u.note, lang))}</p>
              ${evidenceTag(u.evidence, lang)}
              ${u.url ? `<a class="mi2-link" href="${escapeHtml(u.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("materials.mi2.open", lang))}</a>` : ""}
            </article>`
          )
          .join("")
      : `<p class="mi2-body mi2-reveal">${escapeHtml(t("materials.mi2.noPublic", lang))}</p>`;

    const library = (mi.sources || [])
      .map(
        (s) => `<li class="mi2-reveal">
          <div class="mi2-lib-title">${
            s.url
              ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}</a>`
              : escapeHtml(s.title)
          }${s.year ? ` <span>${s.year}</span>` : ""}</div>
          ${pick(s, "note", lang) ? `<p>${escapeHtml(pick(s, "note", lang))}</p>` : ""}
        </li>`
      )
      .join("");

    const experience = mi.experience
      ? `<section class="mi2-screen shell-wide mi2-screen--experience" id="mi2-experience">
          <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.experience", lang))}</p>
          <p class="mi2-statement mi2-reveal">${escapeHtml(L(mi.experience.thesis, lang))}</p>
          <div class="mi2-vs mi2-reveal">
            <div>
              <span>${escapeHtml(t("materials.mi2.this", lang))}</span>
              <strong>${escapeHtml(titleBits.title || name)}</strong>
            </div>
            <em>vs</em>
            <div>
              <span>${escapeHtml(t("materials.mi2.ordinary", lang))}</span>
              <strong>${escapeHtml(L(mi.experience.ordinary, lang))}</strong>
            </div>
          </div>
          <p class="mi2-lede mi2-reveal">${escapeHtml(L(mi.experience.vsOrdinary, lang))}</p>
          <div class="mi2-senses">
            ${(mi.experience.senses || [])
              .map(
                (s) => `<article class="mi2-sense mi2-reveal">
                  <h3>${escapeHtml(pick(s, "label", lang))}</h3>
                  <p>${escapeHtml(pick(s, "body", lang))}</p>
                </article>`
              )
              .join("")}
          </div>
        </section>`
      : "";

    root.innerHTML = `
      <section class="mi2-hero mi2-hero--image-first">
        <figure class="mi2-hero-media" data-mi2-parallax>
          <img src="${mi.image || d.image || ""}" alt="" width="2000" height="1200" fetchpriority="high" />
        </figure>
        <div class="mi2-hero-overlay">
          <div class="mi2-hero-inner shell-wide">
            <p class="mi2-kicker mi2-reveal"><a href="/materials/">${escapeHtml(t("nav.materials", lang))}</a></p>
            <p class="mi2-manifesto mi2-reveal">${escapeHtml(L(mi.hero, lang))}</p>
            <div class="mi2-hero-id mi2-reveal">
              <h1>${materialTitleHtml(name)}</h1>
              <dl>
                <div><dt>${escapeHtml(t("materials.mi2.en", lang))}</dt><dd>${escapeHtml(mi.nameEn || pick(d, "name", "en") || name)}</dd></div>
                <div><dt>${escapeHtml(t("materials.mi2.scientific", lang))}</dt><dd>${escapeHtml(pick(mi, "scientificName", lang))}</dd></div>
                <div><dt>${escapeHtml(t("materials.mi2.origin", lang))}</dt><dd>${escapeHtml(L(mi.originLine, lang))}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section class="mi2-screen shell-wide mi2-screen--quiet" id="mi2-products">
        <div class="mi2-products-head mi2-reveal">
          <p class="mi2-eyebrow">${escapeHtml(t("materials.products", lang))}</p>
          <div class="mi2-products-nav">
            <button type="button" class="mi2-products-btn" data-mi2-products-prev aria-label="Previous">←</button>
            <button type="button" class="mi2-products-btn" data-mi2-products-next aria-label="Next">→</button>
          </div>
        </div>
        <div class="mi2-products mi2-reveal" data-mi2-products>
          <div class="mi2-products-track" data-mi2-products-track>
            ${relatedProducts(catalog, material || { id: mi.id, name: mi.name, nameZh: mi.nameZh }, lang)}
          </div>
        </div>
      </section>

      ${experience}

      <section class="mi2-screen shell-wide" id="mi2-why">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.why", lang))}</p>
        <p class="mi2-statement mi2-reveal">${escapeHtml(L(mi.whyExists, lang))}</p>
      </section>

      <section class="mi2-screen shell-wide" id="mi2-identity">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.identity", lang))}</p>
        <h2 class="mi2-display mi2-reveal">${escapeHtml(t("materials.mi2.identity.title", lang))}</h2>
        <div class="mi2-passport">${identity}</div>
      </section>

      <section class="mi2-screen shell-wide" id="mi2-evidence">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.evidence", lang))}</p>
        <h2 class="mi2-display mi2-reveal">${escapeHtml(t("materials.mi2.evidence.title", lang))}</h2>
        <div class="mi2-evidence-grid">${evidence}</div>
      </section>

      <section class="mi2-screen shell-wide mi2-screen--cost" id="mi2-cost">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.cost", lang))}</p>
        <h2 class="mi2-display mi2-reveal">${escapeHtml(L(mi.costWhy?.thesis, lang))}</h2>
        <div class="mi2-cost">${costFactors}</div>
      </section>

      <section class="mi2-journey" id="mi2-journey">
        <div class="shell-wide mi2-journey-head">
          <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.journey", lang))}</p>
          <h2 class="mi2-display mi2-reveal">${escapeHtml(t("materials.mi2.journey.title", lang))}</h2>
        </div>
        ${journey}
      </section>

      <section class="mi2-screen shell-wide" id="mi2-compare">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.compare", lang))}</p>
        <h2 class="mi2-display mi2-reveal">${escapeHtml(t("materials.mi2.compare.title", lang))}</h2>
        <p class="mi2-fine mi2-reveal">${escapeHtml(L(mi.compare?.methodNote, lang))}</p>
        <div class="mi2-compare">
          ${compareHead}
          ${compareRows}
        </div>
      </section>

      <section class="mi2-screen shell-wide" id="mi2-used">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.used", lang))}</p>
        <h2 class="mi2-display mi2-reveal">${escapeHtml(t("materials.mi2.used.title", lang))}</h2>
        <div class="mi2-used-list">${usedBy}</div>
      </section>

      <section class="mi2-screen shell-wide" id="mi2-culture">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.culture", lang))}</p>
        <p class="mi2-statement mi2-reveal">${escapeHtml(L(mi.cultural, lang))}</p>
      </section>

      <section class="mi2-screen shell-wide" id="mi2-library">
        <p class="mi2-eyebrow mi2-reveal">${escapeHtml(t("materials.mi2.library", lang))}</p>
        <h2 class="mi2-display mi2-reveal">${escapeHtml(t("materials.mi2.library.title", lang))}</h2>
        <p class="mi2-fine mi2-reveal">${escapeHtml(L(intelPack.method, lang))}</p>
        <ol class="mi2-library">${library}</ol>
      </section>
    `;

    observeReveals(root);
    wireParallax(root);
    wireBars(root);
    wireProductsCarousel(root);
  }

  render(getLang());
  onLangChange(render);
}
