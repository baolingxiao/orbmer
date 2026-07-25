/** Site content + admin inline edit (controls only when role === admin) */

let state = {
  csrfToken: "",
  content: null,
  isAdmin: false,
  ready: false,
};

function getByPath(obj, path) {
  return String(path || "")
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setByPath(obj, path, value) {
  const keys = String(path || "").split(".").filter(Boolean);
  if (!keys.length) return obj;
  let cursor = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
  return obj;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isForm = options.body instanceof FormData;
  if (!isForm) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (options.method && options.method !== "GET" && state.csrfToken) {
    headers["x-csrf-token"] = state.csrfToken;
  }
  const response = await fetch(`/auth/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: isForm
      ? Object.fromEntries(Object.entries(headers).filter(([k]) => k.toLowerCase() !== "content-type"))
      : headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(message, isError = false) {
  let el = document.querySelector("[data-admin-toast]");
  if (!el) {
    el = document.createElement("div");
    el.className = "admin-toast";
    el.setAttribute("data-admin-toast", "");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle("is-error", Boolean(isError));
  el.classList.add("is-visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("is-visible"), 2600);
}

function ensureBar(user) {
  let bar = document.querySelector("[data-admin-bar]");
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.setAttribute("data-admin-bar", "");
    document.body.prepend(bar);
  }
  bar.innerHTML = `
    <span>编辑模式 · ${user?.email || "admin"}</span>
    <div class="admin-bar-actions">
      <a href="/auth/">账户</a>
      <a href="/">首页</a>
      <button type="button" data-admin-logout>退出</button>
    </div>`;
  bar.querySelector("[data-admin-logout]")?.addEventListener("click", async () => {
    try {
      await api("/logout", { method: "POST", body: "{}" });
    } catch {
      // ignore
    }
    location.reload();
  });
}

export function applySiteContent(content = state.content, lang = "zh") {
  if (!content) return;
  const resolved = lang === "en" ? "en" : "zh";

  document.querySelectorAll("[data-editable]").forEach((el) => {
    const key = el.getAttribute("data-editable");
    if (!key || key.includes(".cards.")) return;
    const enKey = `${key}En`;
    const zhVal = getByPath(content, key);
    const enVal = getByPath(content, enKey);
    const value = resolved === "en" && enVal != null && String(enVal) !== "" ? enVal : zhVal;
    if (value == null || value === "") return;
    if (el.tagName === "IMG") el.src = String(value);
    else el.textContent = String(value);
  });

  document.querySelectorAll("[data-editable-img]").forEach((el) => {
    const key = el.getAttribute("data-editable-img");
    if (!key || key.includes(".cards.")) return;
    const value = getByPath(content, key);
    if (value) el.src = String(value);
  });

  // Orbmare 精选 page is brand-API driven — never overwrite with legacy CMS cards.
  if (document.querySelector("[data-orbmare-picks]")) return;

  const designersRoot = document.querySelector("[data-module-cards='designers']");
  if (designersRoot && Array.isArray(content.designers?.cards)) {
    designersRoot.innerHTML = content.designers.cards
      .map((card) => {
        const name = resolved === "en" ? card.name || card.nameZh : card.nameZh || card.name;
        const studio = resolved === "en" ? card.studio || card.studioZh : card.studioZh || card.studio;
        return `<a class="quiet-card" href="${card.href || "/designers/"}" data-card-id="${card.id}">
          <div class="quiet-card-media">
            <img src="${card.image || "/assets/editorial/designer-atelier.jpg"}" alt="" width="640" height="800" loading="lazy" data-editable-img="designers.cards.${card.id}.image" />
          </div>
          <div>
            <h3 data-editable="designers.cards.${card.id}.nameZh">${name || ""}</h3>
            <p data-editable="designers.cards.${card.id}.studioZh">${studio || ""}</p>
          </div>
        </a>`;
      })
      .join("");
    if (state.isAdmin) wireEditable(designersRoot);
  }
}

function openTextEditor(el) {
  const key = el.getAttribute("data-editable");
  if (!key) return;
  const current = el.textContent || "";
  const next = window.prompt("编辑文案", current);
  if (next == null || next === current) return;
  savePatch(key, next.trim(), el);
}

async function openImageEditor(el) {
  const key =
    el.getAttribute("data-editable-img") ||
    (el.tagName === "IMG" ? el.getAttribute("data-editable") : "");
  if (!key) return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,image/gif";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.append("image", file);
      const uploaded = await api("/content/upload", { method: "POST", body: form });
      await savePatch(key, uploaded.url, el);
    } catch (error) {
      toast(error.message || "上传失败", true);
    }
  });
  input.click();
}

async function savePatch(path, value, el) {
  try {
    if (path.startsWith("designers.cards.")) {
      const parts = path.split(".");
      const cardId = parts[2];
      const field = parts.slice(3).join(".");
      const cards = structuredClone(state.content?.designers?.cards || []);
      const idx = cards.findIndex((c) => c.id === cardId);
      if (idx >= 0 && field) {
        setByPath(cards[idx], field, value);
        if (field === "nameZh" && !cards[idx].name) cards[idx].name = value;
        if (field === "studioZh" && !cards[idx].studio) cards[idx].studio = value;
        const data = await api("/content", {
          method: "PATCH",
          body: JSON.stringify({ patch: { designers: { cards } } }),
        });
        state.content = data.content;
        applySiteContent(state.content, document.documentElement.lang?.startsWith("en") ? "en" : "zh");
        toast("已保存");
        return;
      }
    }
    const patch = {};
    setByPath(patch, path, value);
    const data = await api("/content", {
      method: "PATCH",
      body: JSON.stringify({ patch }),
    });
    state.content = data.content;
    if (el) {
      if (el.tagName === "IMG") el.src = value;
      else el.textContent = value;
    }
    toast("已保存");
  } catch (error) {
    toast(error.message || "保存失败", true);
  }
}

function wireEditable(root = document) {
  if (!state.isAdmin) return;
  root.querySelectorAll("[data-editable]").forEach((el) => {
    if (el.dataset.adminBound === "1") return;
    el.dataset.adminBound = "1";
    el.classList.add("admin-editable");
    el.addEventListener("click", (event) => {
      if (!document.documentElement.classList.contains("is-admin-edit")) return;
      event.preventDefault();
      event.stopPropagation();
      if (el.tagName === "IMG") openImageEditor(el);
      else openTextEditor(el);
    });
  });

  root.querySelectorAll("[data-editable-img]").forEach((el) => {
    if (el.dataset.adminBound === "1") return;
    el.dataset.adminBound = "1";
    el.classList.add("admin-editable");
    el.addEventListener("click", (event) => {
      if (!document.documentElement.classList.contains("is-admin-edit")) return;
      event.preventDefault();
      event.stopPropagation();
      openImageEditor(el);
    });
  });
}

function wireModules() {
  if (!state.isAdmin) return;
  document.querySelectorAll("[data-module]").forEach((moduleEl) => {
    if (moduleEl.dataset.adminModuleBound === "1") return;
    moduleEl.dataset.adminModuleBound = "1";
    moduleEl.classList.add("admin-module");
    const key = moduleEl.getAttribute("data-module");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "admin-add-btn";
    btn.setAttribute("aria-label", "新增卡片");
    btn.textContent = "+";
    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (key !== "designers") {
        toast("文案可直接点击修改；此模块暂不支持新增卡片", true);
        return;
      }
      const nameZh = window.prompt("设计师名称（中文）", "新设计师");
      if (!nameZh) return;
      try {
        const data = await api("/content/cards", {
          method: "POST",
          body: JSON.stringify({
            module: "designers",
            card: {
              nameZh,
              name: nameZh,
              studioZh: "新工作室",
              studio: "New Studio",
              image: "/assets/editorial/designer-atelier.jpg",
              href: "/designers/",
            },
          }),
        });
        state.content = data.content;
        applySiteContent(state.content, document.documentElement.lang?.startsWith("en") ? "en" : "zh");
        toast("已新增卡片");
      } catch (error) {
        toast(error.message || "新增失败", true);
      }
    });
    const head = moduleEl.querySelector(".section-head, .page-hero, .featured-head") || moduleEl;
    head.classList.add("admin-module-head");
    if (!head.querySelector(".admin-add-btn")) head.appendChild(btn);
  });
}

export async function mountAdminEdit({ lang = "zh" } = {}) {
  try {
    const contentRes = await api("/content");
    state.content = contentRes.content;

    let session = { authenticated: false };
    try {
      session = await api("/session");
    } catch {
      session = { authenticated: false };
    }

    state.isAdmin = Boolean(session.authenticated && session.user?.role === "admin");
    if (state.isAdmin) {
      state.csrfToken = session.csrfToken || "";
      document.documentElement.classList.add("is-admin-edit");
      document.body.classList.add("has-admin-bar");
      ensureBar(session.user);
    }

    applySiteContent(state.content, lang);
    wireModules();
    wireEditable();
    state.ready = true;

    const onRefresh = (event) => {
      const nextLang = event.detail?.lang || lang;
      applySiteContent(state.content, nextLang);
      wireEditable();
    };
    window.addEventListener("orbmare:lang", onRefresh);
    window.addEventListener("orbmare:i18n", onRefresh);

    return { active: state.isAdmin, user: session.user || null };
  } catch (error) {
    console.warn("[admin-edit]", error);
    return { active: false, error };
  }
}

export function refreshAdminContent(lang = "zh") {
  if (!state.ready) return;
  applySiteContent(state.content, lang);
  wireEditable();
}
