/**
 * Orbmare Picks marquee — slow left→right auto-scroll rail with prev/next nudge.
 * Single source of truth shared by /designers (Orbmare 精选) and the home 精品推荐.
 *
 * Markup contract (see .picks-* styles in editorial.css):
 *   <section class="picks-featured" data-featured-section hidden>
 *     <div class="picks-marquee">
 *       <button class="picks-marquee-nav picks-marquee-prev" data-marquee-prev>…</button>
 *       <div class="picks-marquee-viewport" data-featured-viewport>
 *         <div class="picks-marquee-track" data-featured-track></div>
 *       </div>
 *       <button class="picks-marquee-nav picks-marquee-next" data-marquee-next>…</button>
 *     </div>
 *   </section>
 *
 * Item shape: { key, href, image, meta, name }
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemHtml(item) {
  return `<a class="picks-marquee-item" href="${escapeHtml(item.href)}">
    <div class="quiet-card-media"><img src="${escapeHtml(item.image)}" alt="" width="440" height="550" loading="lazy" decoding="async" /></div>
    <p class="meta">${escapeHtml(item.meta || "")}</p>
    <h3>${escapeHtml(item.name || "")}</h3>
  </a>`;
}

export function dedupeMarqueeItems(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = item?.key || item?.href || item?.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Mount a marquee inside `root` (defaults to document). Returns a controller
 * with `render(items)` and `destroy()`.
 */
export function createPicksMarquee(root = document) {
  const scope = root || document;
  const section = scope.querySelector("[data-featured-section]");
  const track = scope.querySelector("[data-featured-track]");
  const viewport = scope.querySelector("[data-featured-viewport]");
  const prevBtn = scope.querySelector("[data-marquee-prev]");
  const nextBtn = scope.querySelector("[data-marquee-next]");

  const prefersReduced =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let controlsBound = false;
  let raf = 0;
  let retryTimer = 0;
  let paused = false;
  let looping = false;
  let ready = false;
  let x = 0;
  let half = 0;
  let lastTs = 0;

  function cardStep() {
    const card = track?.querySelector(".picks-marquee-item");
    if (!card) return 240;
    const gap = Number.parseFloat(getComputedStyle(track).gap || "20") || 20;
    return Math.round(card.getBoundingClientRect().width + gap);
  }

  function measure() {
    if (!track) {
      half = 0;
      ready = false;
      return false;
    }
    const width = track.scrollWidth;
    half = looping ? width / 2 : width;
    ready = half > 40;
    return ready;
  }

  function applyTransform() {
    if (!track) return;
    if (looping && half > 0) {
      while (x >= 0) x -= half;
      while (x < -half) x += half;
    }
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function step(direction) {
    if (!ready && !measure()) return;
    paused = true;
    x += direction * cardStep();
    applyTransform();
    window.setTimeout(() => {
      paused = false;
      lastTs = 0;
    }, 280);
  }

  function tick(ts) {
    raf = window.requestAnimationFrame(tick);
    if (!ready) {
      if (measure()) {
        x = looping ? -half : 0;
        applyTransform();
        lastTs = ts;
      }
      return;
    }
    if (paused || document.hidden || !looping) {
      lastTs = ts;
      return;
    }
    if (!lastTs) lastTs = ts;
    const dt = Math.min(40, ts - lastTs);
    lastTs = ts;
    x += (dt / 1000) * 30; // slow drift, left → right
    applyTransform();
  }

  function startAuto() {
    stopAuto();
    if (prefersReduced) return;
    lastTs = 0;
    raf = window.requestAnimationFrame(tick);
  }

  function stopAuto() {
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    if (retryTimer) {
      window.clearTimeout(retryTimer);
      retryTimer = 0;
    }
    lastTs = 0;
  }

  function bindControls() {
    if (controlsBound) return;
    prevBtn?.addEventListener("click", () => step(-1));
    nextBtn?.addEventListener("click", () => step(1));
    viewport?.addEventListener("mouseenter", () => {
      paused = true;
    });
    viewport?.addEventListener("mouseleave", () => {
      paused = false;
      lastTs = 0;
    });
    window.addEventListener("resize", () => {
      const ratio = half > 0 ? x / -half : 0;
      if (measure() && looping) {
        x = -half * Math.min(1, Math.max(0, -ratio || 1));
        if (x >= 0 || x < -half) x = -half;
        applyTransform();
      }
    });
    controlsBound = true;
  }

  function armAfterLayout() {
    const fonts = document.fonts;
    const wait = fonts?.ready ? fonts.ready.catch(() => {}) : Promise.resolve();
    wait.then(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!measure()) {
            retryTimer = window.setTimeout(armAfterLayout, 120);
            return;
          }
          x = looping ? -half : 0;
          applyTransform();
          startAuto();
        });
      });
    });
  }

  function render(items) {
    if (!section || !track) return;
    const list = dedupeMarqueeItems(items);
    if (!list.length) {
      section.hidden = true;
      track.innerHTML = "";
      stopAuto();
      return;
    }
    section.hidden = false;
    bindControls();
    stopAuto();
    const sequence = list.map(itemHtml).join("");
    looping = list.length >= 4;
    ready = false;
    track.innerHTML = looping ? sequence + sequence : sequence;
    track.style.transform = "translate3d(0, 0, 0)";
    armAfterLayout();
  }

  return { render, destroy: stopAuto };
}
