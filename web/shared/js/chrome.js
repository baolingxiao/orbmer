/** Shared Orbmare editorial chrome: header + footer + lang + bag */

import { cartCount, getCartLines, setCartLineQty } from "/shared/js/store.js";
import { applyI18n, getLang, t, isCuratedProductId, brandPrimary, brandSecondary } from "/shared/js/editorial-i18n.js";
import { mountAdminEdit } from "/shared/js/admin-edit.js";

function ensureAdminEditStyles() {
  if (document.querySelector('link[data-admin-edit-css]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/shared/css/admin-edit.css?v=1";
  link.setAttribute("data-admin-edit-css", "");
  document.head.appendChild(link);
}

const NAV = [
  { href: "/discover/", key: "nav.discover" },
  { href: "/countries/", key: "nav.countries" },
  { href: "/materials/", key: "nav.materials" },
  { href: "/craftsmanship/", key: "nav.craft" },
  { href: "/designers/", key: "nav.designers" },
  { href: "/journal/", key: "nav.journal" },
  { href: "/about/", key: "nav.about" },
  { href: "/membership/", key: "nav.membership" },
];

function currentPath() {
  return location.pathname.replace(/\/index\.html$/, "/");
}

function money(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n) || 0);
}

function navHtml(lang) {
  const path = currentPath();
  return NAV.map((item) => {
    const active =
      path === item.href || (item.href !== "/" && path.startsWith(item.href))
        ? ' aria-current="page"'
        : "";
    return `<a href="${item.href}"${active} data-i18n="${item.key}">${t(item.key, lang)}</a>`;
  }).join("");
}

function syncCartBadge() {
  document.querySelectorAll("[data-cart-count]").forEach((badge) => {
    try {
      badge.textContent = String(cartCount());
    } catch {
      badge.textContent = "0";
    }
  });
}

function renderBagDrawer() {
  const body = document.querySelector("[data-bag-body]");
  const note = document.querySelector("[data-bag-note]");
  const actions = document.querySelector("[data-bag-actions]");
  if (!body) return;

  const lang = getLang();
  const lines = getCartLines();
  syncCartBadge();

  if (!lines.length) {
    body.innerHTML = `<p class="orb-bag-empty">${t("cart.empty", lang)}</p>`;
    if (note) note.hidden = true;
    if (actions) {
      actions.innerHTML = `<a class="btn btn-ghost" href="/discover/" data-close-bag>${t("cart.continue", lang)}</a>
        <a class="btn" href="/shop/">${t("cart.shop", lang)}</a>`;
    }
    return;
  }

  const hasCurated = lines.some((l) => isCuratedProductId(l.productId));
  const subtotal = lines.reduce((s, l) => s + Number(l.price || 0) * Number(l.qty || 0), 0);

  body.innerHTML = lines
    .map(
      (l) => `<article class="orb-bag-line" data-line-id="${l.lineId}">
        <img src="${l.image || "/assets/editorial/hero-craft.jpg"}" alt="" width="72" height="90" />
        <div>
          <h3>${l.name}</h3>
          <p>${money(l.price)} · ${l.variantLabel || "Standard"}</p>
          <div class="orb-bag-qty">
            <button type="button" data-qty-delta="-1" aria-label="Decrease">−</button>
            <span>${l.qty}</span>
            <button type="button" data-qty-delta="1" aria-label="Increase">+</button>
          </div>
        </div>
        <strong>${money(Number(l.price) * Number(l.qty))}</strong>
      </article>`
    )
    .join("") + `<p class="orb-bag-subtotal"><span>${t("cart.subtotal", lang)}</span><strong>${money(subtotal)}</strong></p>`;

  if (note) {
    note.hidden = !hasCurated;
    note.textContent = t("cart.note.curated", lang);
  }

  if (actions) {
    if (hasCurated) {
      actions.innerHTML = `<a class="btn" href="/membership/">${t("cart.inquire", lang)}</a>
        <a class="btn btn-ghost" href="/shop/?cart=1#cart">${t("cart.shop", lang)}</a>`;
    } else {
      actions.innerHTML = `<a class="btn" href="/checkout/">${t("cart.checkout", lang)}</a>
        <a class="btn btn-ghost" href="/shop/?cart=1#cart">${t("cart.shop", lang)}</a>`;
    }
  }

  body.querySelectorAll("[data-qty-delta]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest("[data-line-id]");
      const lineId = row?.getAttribute("data-line-id");
      const line = getCartLines().find((x) => x.lineId === lineId);
      if (!line) return;
      const delta = Number(btn.getAttribute("data-qty-delta")) || 0;
      setCartLineQty(lineId, Number(line.qty) + delta);
      renderBagDrawer();
    });
  });
}

function setBagOpen(open) {
  const drawer = document.querySelector("[data-bag-drawer]");
  const backdrop = document.querySelector("[data-bag-backdrop]");
  const toggle = document.querySelector("[data-bag-toggle]");
  if (!drawer) return;
  drawer.classList.toggle("is-open", open);
  drawer.setAttribute("aria-hidden", open ? "false" : "true");
  if (backdrop) backdrop.hidden = !open;
  if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) renderBagDrawer();
  document.body.style.overflow = open ? "hidden" : "";
}

export function refreshBagChrome() {
  syncCartBadge();
  const drawer = document.querySelector("[data-bag-drawer]");
  if (drawer?.classList.contains("is-open")) renderBagDrawer();
}

export async function mountChrome({ title } = {}) {
  if (title) document.title = title;
  const lang = getLang();

  const headerHost = document.querySelector("[data-orb-header]");
  if (headerHost) {
    headerHost.innerHTML = `
      <header class="orb-header" data-header>
        <div class="orb-header-inner">
          <a class="orb-brand" href="/" aria-label="${brandPrimary(lang)} ${brandSecondary(lang)}">
            <strong data-brand-primary>${brandPrimary(lang)}</strong>
            <em data-brand-secondary>${brandSecondary(lang)}</em>
          </a>
          <nav class="orb-nav" data-nav aria-label="Primary">${navHtml(lang)}</nav>
          <div class="orb-header-actions">
            <button class="orb-lang" type="button" data-lang-toggle aria-label="Switch language">
              <span data-lang-option="zh" class="${lang === "zh" ? "is-active" : ""}">中</span>
              <span data-lang-option="en" class="${lang === "en" ? "is-active" : ""}">EN</span>
            </button>
            <a href="/shop/" data-i18n="nav.shop">${t("nav.shop", lang)}</a>
            <a href="/auth/" data-i18n="nav.account">${t("nav.account", lang)}</a>
            <button class="orb-bag-btn" type="button" data-bag-toggle aria-expanded="false" aria-controls="orbBag">
              <span data-i18n="nav.cart">${t("nav.cart", lang)}</span>
              <span class="orb-bag-count" data-cart-count>0</span>
            </button>
            <button class="orb-menu-btn" type="button" data-menu aria-label="Menu" aria-expanded="false">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 7h16M4 12h16M4 17h16"/>
              </svg>
            </button>
          </div>
        </div>
      </header>
      <div class="orb-bag-backdrop" data-bag-backdrop hidden></div>
      <aside class="orb-bag-drawer" id="orbBag" data-bag-drawer aria-hidden="true" aria-label="Bag">
        <div class="orb-bag-head">
          <h2 data-i18n="cart.title">${t("cart.title", lang)}</h2>
          <button type="button" data-close-bag aria-label="Close">×</button>
        </div>
        <div class="orb-bag-body" data-bag-body></div>
        <p class="orb-bag-note" data-bag-note hidden></p>
        <div class="orb-bag-actions" data-bag-actions></div>
      </aside>`;
  }

  const footerHost = document.querySelector("[data-orb-footer]");
  if (footerHost) {
    footerHost.innerHTML = `
      <footer class="orb-footer">
        <div class="orb-footer-grid">
          <div class="orb-footer-brand">
            <a class="orb-brand" href="/" aria-label="${brandPrimary(lang)} ${brandSecondary(lang)}">
              <strong data-brand-primary>${brandPrimary(lang)}</strong>
              <em data-brand-secondary>${brandSecondary(lang)}</em>
            </a>
            <p data-i18n="footer.mission">${t("footer.mission", lang)}</p>
          </div>
          <div>
            <h4 data-i18n="footer.explore">${t("footer.explore", lang)}</h4>
            <a href="/discover/" data-i18n="nav.discover">${t("nav.discover", lang)}</a>
            <a href="/countries/" data-i18n="nav.countries">${t("nav.countries", lang)}</a>
            <a href="/materials/" data-i18n="nav.materials">${t("nav.materials", lang)}</a>
            <a href="/craftsmanship/" data-i18n="nav.craft">${t("nav.craft", lang)}</a>
            <a href="/shop/" data-i18n="nav.shop">${t("nav.shop", lang)}</a>
          </div>
          <div>
            <h4 data-i18n="footer.stories">${t("footer.stories", lang)}</h4>
            <a href="/designers/" data-i18n="nav.designers">${t("nav.designers", lang)}</a>
            <a href="/journal/" data-i18n="nav.journal">${t("nav.journal", lang)}</a>
            <a href="/about/" data-i18n="nav.about">${t("nav.about", lang)}</a>
            <a href="/membership/" data-i18n="nav.membership">${t("nav.membership", lang)}</a>
          </div>
          <div>
            <h4 data-i18n="footer.visit">${t("footer.visit", lang)}</h4>
            <a class="dn-pair" href="/countries/japan/" data-dual-pair data-dual-zh="日本" data-dual-en="Japan">
              <span class="dn-primary" data-dual-primary></span>
              <span class="dn-echo" data-dual-echo></span>
            </a>
            <a class="dn-pair" href="/countries/italy/" data-dual-pair data-dual-zh="意大利" data-dual-en="Italy">
              <span class="dn-primary" data-dual-primary></span>
              <span class="dn-echo" data-dual-echo></span>
            </a>
            <a class="dn-pair" href="/countries/china/" data-dual-pair data-dual-zh="中国" data-dual-en="China">
              <span class="dn-primary" data-dual-primary></span>
              <span class="dn-echo" data-dual-echo></span>
            </a>
            <a href="/legal/contact.html" data-i18n="footer.contact">${t("footer.contact", lang)}</a>
          </div>
        </div>
        <div class="orb-footer-base">
          <div class="orb-footer-mark">
            <span class="orb-footer-year">© ${new Date().getFullYear()}</span>
            <a class="orb-brand" href="/" aria-label="${brandPrimary(lang)} ${brandSecondary(lang)}">
              <strong data-brand-primary>${brandPrimary(lang)}</strong>
              <em data-brand-secondary>${brandSecondary(lang)}</em>
            </a>
          </div>
          <span data-i18n="footer.tag">${t("footer.tag", lang)}</span>
        </div>
      </footer>`;
  }

  applyI18n(lang);
  syncCartBadge();

  const header = document.querySelector("[data-header]");
  const nav = document.querySelector("[data-nav]");
  const menuBtn = document.querySelector("[data-menu]");
  const langBtn = document.querySelector("[data-lang-toggle]");
  const bagToggle = document.querySelector("[data-bag-toggle]");
  const bagBackdrop = document.querySelector("[data-bag-backdrop]");

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  if (langBtn) {
    langBtn.addEventListener("click", () => {
      const next = getLang() === "en" ? "zh" : "en";
      applyI18n(next);
      langBtn.querySelectorAll("[data-lang-option]").forEach((el) => {
        el.classList.toggle("is-active", el.getAttribute("data-lang-option") === next);
      });
      if (document.querySelector("[data-bag-drawer]")?.classList.contains("is-open")) renderBagDrawer();
      window.dispatchEvent(new CustomEvent("orbmare:lang", { detail: { lang: next } }));
    });
  }

  if (bagToggle) bagToggle.addEventListener("click", () => setBagOpen(true));
  if (bagBackdrop) bagBackdrop.addEventListener("click", () => setBagOpen(false));
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-bag]")) setBagOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setBagOpen(false);
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  window.addEventListener("storage", (e) => {
    if (e.key === "orbmare-cart-v2") syncCartBadge();
  });

  ensureAdminEditStyles();
  // Admin edit is non-blocking so editorial pages paint immediately.
  void mountAdminEdit({ lang: getLang() });
  return { active: false };
}
