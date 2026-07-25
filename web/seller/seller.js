const state = {
  csrfToken: "",
  user: null,
  overview: null,
  products: [],
  orders: [],
  statuses: [],
  activeSection: "overview",
  editingId: null,
  designMode: false,
  pendingImages: [],
};

const loginView = document.querySelector("[data-login-view]");
const opsShell = document.querySelector("[data-ops-shell]");
const toast = document.querySelector("[data-toast]");

async function api(path, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = { ...(options.headers || {}) };
  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  if (options.method && options.method !== "GET" && state.csrfToken) {
    headers["x-csrf-token"] = state.csrfToken;
  }
  const response = await fetch(`/seller/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function showToast(message) {
  if (!toast) return;
  toast.hidden = false;
  toast.textContent = message;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.hidden = true;
  }, 2800);
}

function setAuthed(session) {
  state.csrfToken = session.csrfToken || "";
  state.user = session.user || null;
  loginView.hidden = true;
  opsShell.hidden = false;
  document.querySelector("[data-seller-email]").textContent = state.user?.email || "";
  if (state.user?.storeName) {
    document.querySelector("[data-store-name]").textContent = state.user.storeName;
  }
}

function setLoggedOut() {
  state.csrfToken = "";
  state.user = null;
  loginView.hidden = false;
  opsShell.hidden = true;
}

function statusPillClass(status) {
  if (/delivered|completed|success/i.test(status)) return "status-pill is-ok";
  if (/shipped|transit|paid|authorized/i.test(status)) return "status-pill";
  return "status-pill is-warn";
}

function switchSection(name) {
  state.activeSection = name;
  document.querySelectorAll("[data-section-target]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.sectionTarget === name);
  });
  document.querySelectorAll("[data-section]").forEach((section) => {
    section.hidden = section.dataset.section !== name;
  });
  const titles = {
    overview: "总览",
    products: "我的商品",
    orders: "订单履约",
  };
  const kickers = {
    overview: "卖家中心",
    products: "货架管理",
    orders: "跨境履约",
  };
  document.querySelector("[data-section-title]").textContent = titles[name] || name;
  const kicker = document.querySelector("[data-section-kicker]");
  if (kicker) kicker.textContent = kickers[name] || "卖家中心";
}

function renderOverview() {
  const o = state.overview;
  if (!o) return;
  document.querySelector("[data-overview-metrics]").innerHTML = `
    <article class="metric-card"><p>商品总数</p><strong>${o.products.total}</strong></article>
    <article class="metric-card"><p>已发布</p><strong>${o.products.published}</strong></article>
    <article class="metric-card"><p>相关订单</p><strong>${o.orders.total}</strong></article>
    <article class="metric-card"><p>进行中</p><strong>${o.orders.open}</strong></article>
  `;
  const orders = o.recentOrders || [];
  document.querySelector("[data-overview-orders]").innerHTML = orders.length
    ? orders
        .map(
          (order) => `<div class="order-chip">
      <code>${order.id}</code>
      <span class="${statusPillClass(order.status)}">${order.status}</span>
    </div>`
        )
        .join("")
    : `<p class="empty-hint">暂无订单</p>`;
}

function renderProducts() {
  const root = document.querySelector("[data-products-table]");
  if (!state.products.length) {
    root.innerHTML =
      '<p class="empty-hint">暂无归属本店的商品。可新建，或由演示卖家自动接管未归属商品。</p>';
    return;
  }
  root.innerHTML = `<table class="product-table"><thead><tr>
    <th>ID</th><th>名称</th><th>状态</th><th>库存模式</th><th>价格</th>
  </tr></thead><tbody>
    ${state.products
      .map((p) => {
        const published = p.lifecycleStatus === "published";
        return `<tr>
      <td><code>${p.id}</code></td>
      <td>${p.zh?.name || p.en?.name || ""}</td>
      <td><span class="status-pill ${published ? "is-ok" : "is-warn"}">${p.lifecycleStatus}</span></td>
      <td>${p.inventory?.mode || "—"}</td>
      <td class="price">$${Number(p.price).toFixed(2)}</td>
    </tr>`;
      })
      .join("")}
  </tbody></table>`;
}

function renderOrders() {
  const root = document.querySelector("[data-orders-table]");
  if (!state.orders.length) {
    root.innerHTML = '<p class="empty-hint">暂无包含本店商品的订单。</p>';
    return;
  }
  root.innerHTML = state.orders
    .map((order) => {
      const statusOptions = (state.statuses || [])
        .map((s) => `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`)
        .join("");
      return `<article class="order-card">
        <h3><code>${order.id}</code> <span class="${statusPillClass(order.status)}">${order.status}</span></h3>
        <p>买家：${order.customer?.email || "—"}</p>
        <form data-ship-form data-order-id="${order.id}" class="ship-form">
          <div class="field"><label>更新状态</label><select name="status">${statusOptions}</select></div>
          <div class="field"><label>承运商</label><input name="carrier" value="${order.shipment?.carrier || ""}" /></div>
          <div class="field"><label>运单号</label><input name="trackingNumber" value="${order.shipment?.trackingNumber || ""}" /></div>
          <div class="field"><label>追踪链接 (https)</label><input name="trackingUrl" value="${order.shipment?.trackingUrl || ""}" /></div>
          <button class="button button-primary" type="submit">保存履约信息</button>
        </form>
      </article>`;
    })
    .join("");
}

async function refresh() {
  const [overview, products, orders] = await Promise.all([
    api("/overview"),
    api("/products"),
    api("/orders"),
  ]);
  state.overview = overview.overview;
  state.products = products.products || [];
  state.orders = orders.orders || [];
  state.statuses = orders.statuses || [];
  if (overview.overview?.storeName) {
    document.querySelector("[data-store-name]").textContent = overview.overview.storeName;
  }
  renderOverview();
  renderProducts();
  renderOrders();
}

document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("[data-login-error]");
  error.hidden = true;
  const form = new FormData(event.target);
  try {
    const data = await api("/login", {
      method: "POST",
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    setAuthed(data);
    await refresh();
  } catch (err) {
    error.hidden = false;
    error.textContent = err.message;
  }
});

document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("[data-register-error]");
  error.hidden = true;
  const form = new FormData(event.target);
  try {
    await api("/register", {
      method: "POST",
      body: JSON.stringify({
        storeName: form.get("storeName"),
        email: form.get("email"),
        password: form.get("password"),
        inviteCode: form.get("inviteCode"),
      }),
    });
    showToast("注册成功，请登录");
    event.target.reset();
  } catch (err) {
    error.hidden = false;
    error.textContent = err.message;
  }
});

document.querySelector("[data-logout]")?.addEventListener("click", async () => {
  try {
    await api("/logout", { method: "POST", body: "{}" });
  } catch {
    // ignore
  }
  setLoggedOut();
});

document.querySelectorAll("[data-section-target]").forEach((btn) => {
  btn.addEventListener("click", () => switchSection(btn.dataset.sectionTarget));
});

document.querySelector("[data-new-product]")?.addEventListener("click", () => {
  if (state.designMode) {
    showToast("预览模式不能新建。请打开 /seller/?login=1 后用真实卖家账号登录。");
    return;
  }
  const dialog = document.querySelector("[data-product-dialog]");
  const form = document.querySelector("[data-product-form]");
  const error = document.querySelector("[data-product-error]");
  if (error) {
    error.hidden = true;
    error.textContent = "";
  }
  form.reset();
  clearPendingImages();
  form.querySelector('[name="id"]').disabled = false;
  state.editingId = null;
  document.querySelector("[data-product-form-title]").textContent = "新建商品";
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.hidden = false;
  }
  form.querySelector('[name="id"]')?.focus();
});

function clearPendingImages() {
  state.pendingImages.forEach((item) => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  state.pendingImages = [];
  const input = document.querySelector("[data-image-files]");
  if (input) input.value = "";
  renderImagePreviews();
}

function renderImagePreviews() {
  const root = document.querySelector("[data-image-previews]");
  if (!root) return;
  if (!state.pendingImages.length) {
    root.innerHTML = `<p class="image-preview-empty">尚未选择图片</p>`;
    return;
  }
  root.innerHTML = state.pendingImages
    .map(
      (item, index) => `
      <figure class="image-preview-item" data-image-index="${index}">
        <img src="${item.previewUrl}" alt="" />
        <figcaption>${index === 0 ? "主图" : `图 ${index + 1}`}</figcaption>
        <button type="button" class="image-preview-remove" data-remove-image="${index}" aria-label="移除图片">×</button>
      </figure>`
    )
    .join("");
}

function addPendingImageFiles(fileList) {
  const files = Array.from(fileList || []);
  let added = 0;
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    state.pendingImages.push({
      file,
      previewUrl: URL.createObjectURL(file),
    });
    added += 1;
  });
  renderImagePreviews();
  return added;
}

const imageFileInput = document.querySelector("[data-image-files]");
const imageDropzone = document.querySelector("[data-image-dropzone]");

imageFileInput?.addEventListener("change", (event) => {
  addPendingImageFiles(event.target.files);
  // Allow selecting the same file again later
  event.target.value = "";
});

imageDropzone?.addEventListener("click", (event) => {
  if (event.target.closest("input")) return;
  imageFileInput?.click();
});
imageDropzone?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    imageFileInput?.click();
  }
});
["dragenter", "dragover"].forEach((name) => {
  imageDropzone?.addEventListener(name, (event) => {
    event.preventDefault();
    event.stopPropagation();
    imageDropzone.classList.add("is-dragover");
  });
});
["dragleave", "drop"].forEach((name) => {
  imageDropzone?.addEventListener(name, (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (name === "dragleave") imageDropzone.classList.remove("is-dragover");
  });
});
imageDropzone?.addEventListener("drop", (event) => {
  imageDropzone.classList.remove("is-dragover");
  addPendingImageFiles(event.dataTransfer?.files);
});

document.querySelector("[data-image-previews]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-image]");
  if (!button) return;
  const index = Number(button.dataset.removeImage);
  const [removed] = state.pendingImages.splice(index, 1);
  if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
  renderImagePreviews();
});

function closeProductDialog() {
  const dialog = document.querySelector("[data-product-dialog]");
  if (dialog?.open) dialog.close();
  else if (dialog) dialog.hidden = true;
  clearPendingImages();
}

document.querySelectorAll("[data-cancel-product]").forEach((button) => {
  button.addEventListener("click", () => closeProductDialog());
});

document.querySelector("[data-product-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.designMode) {
    showToast("预览模式不能保存商品。请使用 /seller/?login=1 登录。");
    return;
  }
  const error = document.querySelector("[data-product-error]");
  error.hidden = true;
  const form = new FormData(event.target);
  const productId = String(form.get("id") || "").trim().toLowerCase();
  if (!state.pendingImages.length) {
    error.hidden = false;
    error.textContent = "请至少上传一张商品图片。";
    return;
  }
  const submit = event.target.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const uploadBody = new FormData();
    state.pendingImages.forEach((item) => uploadBody.append("images", item.file, item.file.name));
    const uploaded = await api("/uploads", { method: "POST", body: uploadBody });
    const images = uploaded.paths || [];
    if (!images.length) throw new Error("图片上传失败，请重试。");
    const payload = {
      id: productId,
      channel: "shop",
      price: form.get("price"),
      material: form.get("material"),
      image: images[0],
      images,
      collection: form.get("collection"),
      lifecycleStatus: form.get("lifecycleStatus"),
      zh: { name: form.get("zhName"), desc: form.get("zhDesc") },
      en: { name: form.get("enName"), desc: form.get("enDesc") },
      inventory: { mode: "source_after_order", maxPerOrder: 20 },
      shipping: {
        profile: "cross_border_standard",
        originCountry: "China",
        processingTime: "Pending verification",
        internationalShippingTime: "Pending verification",
      },
    };
    await api("/products", { method: "POST", body: JSON.stringify(payload) });
    closeProductDialog();
    showToast(
      payload.lifecycleStatus === "published"
        ? "商品已发布，已同步到买家店铺目录"
        : "商品草稿已保存"
    );
    await refresh();
    switchSection("products");
  } catch (err) {
    error.hidden = false;
    error.textContent = err.message;
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.querySelector("[data-orders-table]")?.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-ship-form]");
  if (!form) return;
  event.preventDefault();
  const data = new FormData(form);
  try {
    await api(`/orders/${form.dataset.orderId}/shipment`, {
      method: "PUT",
      body: JSON.stringify({
        status: data.get("status"),
        carrier: data.get("carrier"),
        trackingNumber: data.get("trackingNumber"),
        trackingUrl: data.get("trackingUrl"),
      }),
    });
    showToast("履约信息已更新");
    await refresh();
  } catch (err) {
    showToast(err.message);
  }
});

async function boot() {
  const params = new URLSearchParams(location.search);
  const forceLogin = params.get("login") === "1";
  const localHost = ["127.0.0.1", "localhost"].includes(location.hostname);
  const designMode =
    !forceLogin &&
    (params.get("design") === "1" || location.hash === "#design" || localHost);

  if (designMode) {
    state.designMode = true;
    setAuthed({
      csrfToken: "design-preview",
      user: { email: "design@orbmare.local", storeName: "UI 设计预览店" },
    });
    state.overview = {
      storeName: "UI 设计预览店",
      products: { total: 12, published: 9 },
      orders: { total: 4, open: 2 },
      recentOrders: [
        { id: "OM-DESIGN-001", status: "payment_authorized_or_paid" },
        { id: "OM-DESIGN-002", status: "shipped_internationally" },
      ],
    };
    state.products = [
      {
        id: "design-sample-dragon",
        zh: { name: "示例龙摆件" },
        en: { name: "Sample dragon" },
        lifecycleStatus: "published",
        inventory: { mode: "source_after_order" },
        price: 29.9,
      },
      {
        id: "design-sample-bracket",
        zh: { name: "示例金属支架" },
        en: { name: "Sample bracket" },
        lifecycleStatus: "draft",
        inventory: { mode: "stocked" },
        price: 48,
      },
    ];
    state.orders = [
      {
        id: "OM-DESIGN-001",
        status: "payment_authorized_or_paid",
        customer: { email: "buyer@example.com" },
        shipment: {},
      },
    ];
    state.statuses = [
      "payment_authorized_or_paid",
      "purchasing_from_supplier",
      "shipped_internationally",
      "delivered",
    ];
    renderOverview();
    renderProducts();
    renderOrders();
    return;
  }

  try {
    const session = await api("/session");
    if (!session.configured) {
      document.querySelector("[data-login-error]").hidden = false;
      document.querySelector("[data-login-error]").textContent =
        session.error || "卖家后台需要 PostgreSQL（请配置 DATABASE_URL）";
      return;
    }
    if (session.authenticated) {
      setAuthed(session);
      await refresh();
    }
  } catch (err) {
    console.error(err);
  }
}

boot();
