import { cartCount } from "/shared/js/store.js";

const LANG_KEY = "orbmare-language";

const copy = {
  zh: {
    "hero.title": "为美国客户采购全球特色商品",
    "hero.slogan": "我们不是卖商品，我们是在为全球用户精选世界最好的材料、工艺和设计。",
    "hero.trust1": "第三方采购",
    "hero.trust2": "订单专项寻源",
    "hero.trust3": "首发仅配送美国",
    "hero.trust4": "订单支持与退款协调",
    "lang.toggle": "中文 / CNY",
  },
  en: {
    "hero.title": "Sourcing distinctive goods worldwide for US customers",
    "hero.slogan": "We curate the world’s finest materials, craftsmanship, and design.",
    "hero.trust1": "Third-party sourcing",
    "hero.trust2": "Order-specific purchasing",
    "hero.trust3": "US delivery only at launch",
    "hero.trust4": "Order support & refund help",
    "lang.toggle": "EN / USD",
  },
};

function applyLanguage(language) {
  const lang = language === "en" ? "en" : "zh";
  const dict = copy[lang];
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  localStorage.setItem(LANG_KEY, lang);

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (dict[key]) node.textContent = dict[key];
  });

  const toggle = document.querySelector("[data-lang-toggle]");
  if (toggle) toggle.textContent = dict["lang.toggle"];
}

function initLanguageToggle() {
  const saved = localStorage.getItem(LANG_KEY) === "en" ? "en" : "zh";
  applyLanguage(saved);

  const toggle = document.querySelector("[data-lang-toggle]");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const next = localStorage.getItem(LANG_KEY) === "en" ? "zh" : "en";
    applyLanguage(next);
  });
}

function syncCartBadge() {
  const badge = document.querySelector("[data-cart-count]");
  if (!badge) return;
  try {
    badge.textContent = String(cartCount());
  } catch {
    badge.textContent = "0";
  }
}

function initHeroCarousel() {
  const root = document.getElementById("heroBanner");
  if (!root) return;

  const slides = [...root.querySelectorAll(".hero-slide")];
  const dots = [...root.querySelectorAll("[data-dot]")];
  if (slides.length < 2) return;

  let index = 0;
  let timer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const show = (next) => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
      if (i === index) slide.removeAttribute("hidden");
      else slide.setAttribute("hidden", "");
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
    });
  };

  const start = () => {
    if (reduceMotion) return;
    stop();
    timer = window.setInterval(() => show(index + 1), 5600);
  };

  const stop = () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      show(Number(dot.dataset.dot) || 0);
      start();
    });
  });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  show(0);
  start();
}

function initSearchHint() {
  const form = document.querySelector(".search-bar");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const q = new FormData(form).get("q");
    const query = typeof q === "string" ? q.trim() : "";
    if (!query) return;
    // Route product search into China 3D print shop for now
    window.location.href = `/shop/?q=${encodeURIComponent(query)}#shop`;
  });
}

initLanguageToggle();
syncCartBadge();
initHeroCarousel();
initSearchHint();
