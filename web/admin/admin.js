import "./admin-platform.js?v=34";
import { createAdminUploader } from "./admin-upload.js";
import { createAiOptimization } from "./ai/admin-ai.js";
import { returnPolicyDisplay } from "/shared/js/commerce-display.js";
import { APPAREL_SIZE_FIELDS, productTypeFields, serializeDimensions } from "/shared/js/product-specs.js";
import { CONCIERGE_STATUSES, SERVICE_TYPES, TIER_META } from "/shared/js/membership-data.js";

const state = {
  csrfToken: "",
  user: null,
  environment: "staging",
  overview: null,
  products: [],
  orders: [],
  statuses: [],
  email: { config: { configured: false }, templates: [], adminCopy: {} },
  auditEvents: [],
  brands: [],
  materials: [],
  countries: [],
  crafts: [],
  media: [],
  team: [],
  customers: [],
  memberships: [],
  conciergeRequests: [],
  roles: [],
  siteContent: null,
  activeSection: "overview",
  selectedProducts: new Set(),
  shownFulfillmentWarnings: new Set(),
};

const loginView = document.querySelector("[data-login-view]");
const loginForm = document.querySelector("[data-login-form]");
const loginError = document.querySelector("[data-login-error]");
const opsShell = document.querySelector("[data-ops-shell]");
const adminEmail = document.querySelector("[data-admin-email]");
const toast = document.querySelector("[data-toast]");

const sectionMeta = {
  overview: { kicker: "运营总览", title: "总览" },
  products: { kicker: "Catalog", title: "商品" },
  brands: { kicker: "Catalog", title: "品牌 · Orbmare精选" },
  materials: { kicker: "Catalog", title: "材料" },
  countries: { kicker: "Catalog", title: "国家馆" },
  crafts: { kicker: "Catalog", title: "工艺" },
  inventory: { kicker: "Commerce", title: "库存" },
  shipping: { kicker: "Commerce", title: "订单" },
  customers: { kicker: "Commerce", title: "客户与会员" },
  memberships: { kicker: "Commerce", title: "Memberships" },
  concierge: { kicker: "Commerce", title: "Concierge Requests" },
  content: { kicker: "Content", title: "站点文案" },
  media: { kicker: "Content", title: "媒体库" },
  team: { kicker: "System", title: "团队权限" },
  trash: { kicker: "System", title: "删除记录" },
  audit: { kicker: "System", title: "操作记录" },
};

// ensure platform state field exists
state.trash = [];

const collectionLabels = {
  metal: "工程金属件",
  toys: "玩具与收藏",
  portrait: "照片真人手办",
  japan: "日本馆",
  italy: "意大利馆",
  china: "中国馆",
};

const channelLabels = {
  shop: "3D打印",
  editorial: "甄选",
};

const lifecycleLabels = {
  candidate: "候选",
  draft: "草稿",
  in_review: "审核中",
  changes_requested: "需修改",
  approved: "已批准",
  scheduled: "定时发布",
  published: "已发布",
  hidden: "隐藏",
  archived: "已归档",
  out_of_stock: "缺货",
};

const inventoryLabels = {
  source_after_order: "按单采购",
  stocked: "实物库存",
  unavailable: "暂停供应",
};

const orderStatusLabels = {
  ORDER_CONFIRMED: "订单已确认",
  ORDER_ACCEPTED: "订单已接受",
  PURCHASED: "已完成采购",
  SELLER_CONFIRMED: "来源已确认",
  PREPARING_SHIPMENT: "准备发货",
  SHIPPED: "已发货",
  IN_TRANSIT: "运输中",
  CUSTOMS_CLEARANCE: "清关中",
  LOCAL_DELIVERY: "本地派送",
  DELIVERED: "已送达",
  DELAYED: "延迟",
  CANCELLED: "已取消",
  PAYMENT_PENDING: "等待付款",
  PAID: "已付款",
  PROCUREMENT_REVIEW: "采购复核中",
  PROCUREMENT_STARTED: "已开始采购",
  SUPPLIER_CONFIRMED: "供应商已确认",
  SUPPLIER_UNAVAILABLE: "供应商无货",
  SUPPLIER_PROCESSING: "供应商处理中",
  SHIPPING_QUOTE_REVIEW: "物流报价复核中",
  SHIPPING_ADJUSTMENT_REQUIRED: "需要处理运费差额",
  CUSTOMER_APPROVAL_PENDING: "等待客户确认",
  READY_TO_SHIP: "待发货",
  SHIPPED: "已发货",
  CUSTOMS_CLEARANCE: "清关中",
  DELIVERED: "已送达",
  EXCEPTION: "异常",
  CANCELLED: "已取消",
  REFUND_REVIEW: "退款复核",
  PARTIALLY_REFUNDED: "部分退款",
  REFUNDED: "已退款",
  request_received: "已收到订单",
  availability_checking: "正在确认供货",
  awaiting_customer_confirmation: "等待客户确认",
  payment_authorized_or_paid: "已付款",
  purchasing_from_supplier: "正在向供应商采购",
  supplier_processing: "供应商处理中",
  shipped_internationally: "国际运输中",
  customs_processing: "清关处理中",
  out_for_delivery: "派送中",
  delivered: "已送达",
  return_requested: "已申请退货",
  refund_pending_from_supplier: "等待供应商退款",
  refunded: "已退款",
  cancelled: "已取消",
};

const auditActionLabels = {
  admin_login: "管理员登录",
  admin_logout: "管理员退出",
  product_created: "创建商品",
  product_updated: "更新商品",
  product_deleted: "删除商品",
  product_batch_deleted: "批量删除商品",
  inventory_updated: "调整库存",
  shipment_updated: "更新运输",
  order_email_sent: "发送订单邮件",
  order_event_created: "更新订单履约",
  order_shipment_created: "创建订单包裹",
  order_shipment_updated: "更新订单包裹",
  trash_restored: "恢复删除",
  trash_purged: "清理回收站",
  brand_batch_deleted: "批量删除品牌",
  material_batch_deleted: "批量删除材料",
  country_batch_deleted: "批量删除国家",
  craft_batch_deleted: "批量删除工艺",
  media_batch_deleted: "批量删除媒体",
};

function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);
  if (options.type) node.type = options.type;
  if (options.hidden !== undefined) node.hidden = options.hidden;
  return node;
}

function clear(node) {
  while (node?.firstChild) node.removeChild(node.firstChild);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
      : {}),
  }).format(date);
}

function showToast(message, isError = false) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 4200);
}

function showInlineError(node, message = "") {
  if (!node) return;
  node.textContent = message;
  node.hidden = !message;
}

function can(permission) {
  return (state.user?.permissions || []).includes(permission);
}

async function refreshCsrfFromSession() {
  const response = await fetch("./api/session", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = { ok: false };
  }
  if (data?.authenticated && data.csrfToken) {
    state.csrfToken = data.csrfToken;
    if (data.user) state.user = data.user;
  }
  return data;
}

async function api(path, options = {}) {
  const method = options.method || "GET";
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const request = {
    method,
    credentials: "same-origin",
    headers,
  };
  const isFormData = Boolean(options.isFormData);

  if (options.body !== undefined) {
    if (isFormData) {
      request.body = options.body;
    } else {
      headers["Content-Type"] = "application/json";
      request.body = JSON.stringify(options.body);
    }
  }
  if (method !== "GET" && state.csrfToken) {
    headers["X-CSRF-Token"] = state.csrfToken;
  }

  const response = await fetch(`./api${path}`, request);
  let data;
  try {
    data = await response.json();
  } catch {
    data = { ok: false, error: "服务器返回了无法读取的内容。" };
  }
  if (response.status === 401 && path !== "/login") {
    showLogin();
    throw new Error("登录已失效，请重新登录。");
  }
  // Session may rotate CSRF after server restart / multi-tab; refresh once and retry.
  if (
    response.status === 403 &&
    /security token/i.test(String(data.error || "")) &&
    !options._csrfRetry &&
    path !== "/session"
  ) {
    await refreshCsrfFromSession();
    return api(path, { ...options, _csrfRetry: true });
  }
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || "操作失败。");
    error.status = response.status;
    throw error;
  }
  return data;
}

function showLogin() {
  state.csrfToken = "";
  state.user = null;
  loginView.hidden = false;
  opsShell.hidden = true;
  loginForm?.reset();
  showInlineError(loginError);
}

function showApplication(session) {
  state.csrfToken = session.csrfToken;
  state.user = session.user;
  state.environment = session.environment || "staging";
  if (adminEmail) adminEmail.textContent = session.user.email;
  loginView.hidden = true;
  opsShell.hidden = false;
  window.__orbmareAdminPlatform?.applyNavPermissions?.();
}

function statusBadge(label, tone = "") {
  const badge = element("span", {
    className: `status-badge${tone ? ` ${tone}` : ""}`,
    text: label,
  });
  return badge;
}

function lifecycleTone(status) {
  if (status === "published") return "is-success";
  if (status === "draft") return "is-warning";
  return "";
}

function inventoryTone(product) {
  if (product.inventory.mode === "unavailable") return "is-danger";
  if (
    product.inventory.mode === "stocked" &&
    product.availableQuantity <= Number(product.inventory.reorderPoint || 0)
  ) {
    return "is-warning";
  }
  return product.inventory.mode === "stocked" ? "is-success" : "";
}

function orderTone(status) {
  if (["DELIVERED", "delivered"].includes(status)) return "is-success";
  if (["CANCELLED", "REFUNDED", "cancelled", "refunded"].includes(status)) return "";
  if (
    [
      "EXCEPTION",
      "SUPPLIER_UNAVAILABLE",
      "SHIPPING_ADJUSTMENT_REQUIRED",
      "return_requested",
      "refund_pending_from_supplier",
    ].includes(status)
  ) {
    return "is-danger";
  }
  return "is-warning";
}

function activateSection(name) {
  if (!sectionMeta[name]) return;
  state.activeSection = name;
  document.querySelectorAll("[data-section]").forEach((section) => {
    const active = section.dataset.section === name;
    section.hidden = !active;
    section.classList.toggle("is-active", active);
  });
  document.querySelectorAll("[data-section-target]").forEach((button) => {
    const active = button.dataset.sectionTarget === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  document.querySelector("[data-section-kicker]").textContent = sectionMeta[name].kicker;
  document.querySelector("[data-section-title]").textContent = sectionMeta[name].title;
}

function renderOverviewList(container, rows, emptyText) {
  clear(container);
  if (!rows.length) {
    container.appendChild(element("p", { className: "panel-empty", text: emptyText }));
    return;
  }
  const list = element("div", { className: "overview-list" });
  rows.forEach((row) => {
    const item = element("div", { className: "overview-row" });
    item.append(
      element("strong", { text: row.primary }),
      element("span", { text: row.secondary })
    );
    list.appendChild(item);
  });
  container.appendChild(list);
}

function renderOverview() {
  const overview = state.overview;
  if (!overview) return;
  (overview.fulfillmentWarnings || []).forEach((warning) => {
    const key = `${warning.countryCode}:${warning.code}`;
    if (state.shownFulfillmentWarnings.has(key)) return;
    state.shownFulfillmentWarnings.add(key);
    showToast(`履约规则提醒：${warning.countryCode} ${warning.message}`, true);
  });
  document.querySelector("[data-metric-published]").textContent =
    overview.products.published;
  document.querySelector("[data-metric-product-detail]").textContent =
    `共 ${overview.products.total} 件商品，${overview.products.draft} 件草稿`;
  document.querySelector("[data-metric-stock-alerts]").textContent =
    overview.inventory.alerts;
  document.querySelector("[data-metric-active-orders]").textContent =
    overview.shipping.active;
  document.querySelector("[data-metric-tracking-detail]").textContent =
    `${overview.shipping.missingTracking} 个缺少追踪号`;

  renderOverviewList(
    document.querySelector("[data-overview-stock]"),
    overview.stockAlerts.map((product) => ({
      primary: product.zh?.name || product.en?.name || product.id,
      secondary:
        product.inventory.mode === "stocked"
          ? `可售 ${product.availableQuantity}`
          : inventoryLabels[product.inventory.mode],
    })),
    "当前没有库存提醒。"
  );

  renderOverviewList(
    document.querySelector("[data-overview-orders]"),
    overview.recentOrders.map((order) => ({
      primary: order.id,
      secondary: orderStatusLabels[order.status] || order.status,
    })),
    "当前还没有订单。"
  );
}

function productCell(product) {
  const wrapper = element("div", { className: "table-product" });
  const image = element("img");
  image.src = product.image;
  image.alt = "";
  image.width = 48;
  image.height = 48;
  const copy = element("div", { className: "table-product-copy" });
  copy.append(
    element("strong", { text: product.zh?.name || product.en?.name || product.id }),
    element("span", { text: product.id }),
    element("span", {
      text: returnPolicyDisplay(product.checkout?.returnPolicyType, "zh").summary,
    })
  );
  wrapper.append(image, copy);
  return wrapper;
}

function actionButton(label, dataName, id) {
  const button = element("button", {
    className: "table-action",
    text: label,
    type: "button",
  });
  button.dataset[dataName] = id;
  return button;
}

function storefrontHref(kind, product) {
  const id = encodeURIComponent(product?.id || product || "");
  const channel =
    typeof product === "object"
      ? product.channel ||
        (["japan", "italy", "china"].includes(product.collection) ? "editorial" : "shop")
      : "shop";
  if (kind === "pdp") {
    return channel === "editorial"
      ? `/product/?id=${id}`
      : `/product/shop.html?id=${id}`;
  }
  if (kind === "shop") return `/shop/#shop`;
  if (kind === "country" && typeof product === "object") {
    const country = product.country || product.collection;
    return `/countries/${encodeURIComponent(country)}/`;
  }
  return channel === "editorial" ? `/discover/` : `/discover/#print-catalog`;
}

function storefrontLink(label, href) {
  const link = element("a", { className: "table-action table-action-link", text: label });
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

function syncChannelFields(channel) {
  const editorial = channel === "editorial";
  document.querySelectorAll("[data-editorial-fields]").forEach((node) => {
    node.hidden = !editorial;
  });
  document.querySelectorAll("[data-shop-fields]").forEach((node) => {
    node.hidden = editorial;
  });
  const shopCollection = productForm?.elements.namedItem("collection");
  const editorialCollection = productForm?.querySelector("[data-editorial-collection]");
  if (shopCollection) shopCollection.disabled = editorial;
  if (editorialCollection) editorialCollection.disabled = !editorial;
}

function resolveChannel(product) {
  if (product?.channel) return product.channel;
  if (["japan", "italy", "china"].includes(product?.collection) || product?.country) {
    return "editorial";
  }
  return "shop";
}

function serializeImagesField(product) {
  const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
  if (!images.length && product?.image) return product.image;
  return images.join("\n");
}

function serializeVariantsField(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return "";
  if (
    variants.length === 1 &&
    String(variants[0].label || "").toLowerCase() === "standard" &&
    Number(variants[0].price) === Number(product.price)
  ) {
    return "";
  }
  return variants
    .map((variant) => `${variant.label || variant.id}|${variant.price}`)
    .join("\n");
}

function parseImagesField(text, primaryImage) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const images = [];
  for (const line of lines) {
    if (!images.includes(line)) images.push(line);
  }
  if (primaryImage && !images.includes(primaryImage)) images.unshift(primaryImage);
  return images;
}

function parseVariantsField(text, basePrice) {
  const lines = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  return lines.map((line, index) => {
    const separator = line.includes("|") ? "|" : line.includes(",") ? "," : null;
    let label = line;
    let price = basePrice;
    if (separator) {
      const parts = line.split(separator);
      label = parts[0].trim();
      const parsed = Number(parts[1]?.trim());
      if (Number.isFinite(parsed)) price = parsed;
    }
    if (!label) label = `Option ${index + 1}`;
    return { id: label, label, price };
  });
}

function fillProductSyncPreview(product) {
  const panel = document.querySelector("[data-product-sync-preview]");
  const links = document.querySelector("[data-product-sync-links]");
  if (!panel || !links) return;
  clear(links);
  if (!product?.id) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const channel = resolveChannel(product);
  links.append(
    storefrontLink("商品详情", storefrontHref("pdp", product)),
    storefrontLink(
      channel === "editorial" ? "发现页甄选" : "发现页 3D馆",
      storefrontHref("discover", product)
    )
  );
  if (channel === "editorial") {
    links.appendChild(storefrontLink("国家馆", storefrontHref("country", product)));
  } else {
    links.appendChild(storefrontLink("店铺列表", storefrontHref("shop", product)));
  }
  if (product.lifecycleStatus !== "published") {
    links.appendChild(
      element("span", {
        className: "sync-preview-note",
        text: "当前非「已发布」，前台买家看不到。",
      })
    );
  }
}

function syncProductBulkBar() {
  const bar = document.querySelector("[data-product-bulk]");
  const count = document.querySelector("[data-product-bulk-count]");
  const button = document.querySelector("[data-product-bulk-delete]");
  const selectAll = document.querySelector("[data-product-select-all]");
  const visible = [
    ...document.querySelectorAll("[data-product-table] [data-select-product]"),
  ];
  const selectedVisible = visible.filter((input) => input.checked);
  const canDelete = can("product.delete");
  if (count) count.textContent = `已选 ${state.selectedProducts.size} 项`;
  if (bar) bar.hidden = !canDelete;
  if (button) button.disabled = !canDelete || state.selectedProducts.size === 0;
  if (selectAll) {
    selectAll.disabled = !canDelete;
    selectAll.checked = visible.length > 0 && selectedVisible.length === visible.length;
    selectAll.indeterminate =
      selectedVisible.length > 0 && selectedVisible.length < visible.length;
  }
}

function renderProducts() {
  const table = document.querySelector("[data-product-table]");
  const empty = document.querySelector("[data-product-empty]");
  const query = document
    .querySelector("[data-product-search]")
    .value.trim()
    .toLowerCase();
  const status = document.querySelector("[data-product-status-filter]").value;
  const channelFilter =
    document.querySelector("[data-product-channel-filter]")?.value || "all";
  const products = state.products.filter((product) => {
    const channel = resolveChannel(product);
    const matchesChannel = channelFilter === "all" || channel === channelFilter;
    const matchesStatus = status === "all" || product.lifecycleStatus === status;
    const haystack =
      `${product.id} ${product.zh?.name || ""} ${product.en?.name || ""} ${product.material} ${channel}`.toLowerCase();
    return matchesChannel && matchesStatus && (!query || haystack.includes(query));
  });

  // Drop selections that no longer exist in the catalog.
  const alive = new Set(state.products.map((product) => product.id));
  [...state.selectedProducts].forEach((id) => {
    if (!alive.has(id)) state.selectedProducts.delete(id);
  });

  clear(table);
  empty.hidden = products.length > 0;
  products.forEach((product) => {
    const row = element("tr");
    const checkCell = element("td", { className: "col-check" });
    if (can("product.delete")) {
      const check = element("input", { type: "checkbox" });
      check.dataset.selectProduct = product.id;
      check.checked = state.selectedProducts.has(product.id);
      check.setAttribute("aria-label", `选择 ${product.id}`);
      checkCell.appendChild(check);
    }
    const productColumn = element("td");
    productColumn.appendChild(productCell(product));
    const channel = resolveChannel(product);
    const collection = element("td", {
      text: `${channelLabels[channel] || channel} · ${
        collectionLabels[product.collection] || product.collection
      }`,
    });
    const price = element("td", { text: formatMoney(product.price) });
    const lifecycle = element("td");
    lifecycle.appendChild(
      statusBadge(
        lifecycleLabels[product.lifecycleStatus] || product.lifecycleStatus,
        lifecycleTone(product.lifecycleStatus)
      )
    );
    const featuredOrder = element("td", {
      text: product.featured
        ? String(Number.isFinite(Number(product.featuredRank)) ? product.featuredRank : 100)
        : "—",
    });
    const inventory = element("td");
    inventory.appendChild(
      statusBadge(
        inventoryLabels[product.inventory.mode] || product.inventory.mode,
        inventoryTone(product)
      )
    );
    const updated = element("td", { text: formatDate(product.updatedAt, true) });
    const actions = element("td", { className: "table-actions" });
    actions.appendChild(actionButton("编辑", "editProduct", product.id));
    if (can("product.update") || can("product.write")) {
      actions.appendChild(
        actionButton(product.featured ? "取消推荐" : "推荐", "toggleFeatured", product.id)
      );
    }
    if (can("product.delete")) {
      actions.appendChild(actionButton("删除", "deleteProduct", product.id));
    }
    if (product.lifecycleStatus === "published") {
      actions.appendChild(storefrontLink("详情", storefrontHref("pdp", product)));
      actions.appendChild(
        storefrontLink(
          channel === "editorial" ? "发现" : "3D馆",
          storefrontHref("discover", product)
        )
      );
    }
    row.append(
      checkCell,
      productColumn,
      collection,
      price,
      lifecycle,
      featuredOrder,
      inventory,
      updated,
      actions
    );
    table.appendChild(row);
  });
  syncProductBulkBar();
}

function renderInventory() {
  const table = document.querySelector("[data-inventory-table]");
  const empty = document.querySelector("[data-inventory-empty]");
  const summary = document.querySelector("[data-inventory-summary]");
  clear(table);
  clear(summary);

  const counts = {
    source_after_order: state.products.filter(
      (product) => product.inventory.mode === "source_after_order"
    ).length,
    stocked: state.products.filter((product) => product.inventory.mode === "stocked")
      .length,
    unavailable: state.products.filter(
      (product) => product.inventory.mode === "unavailable"
    ).length,
  };
  Object.entries(counts).forEach(([mode, count]) => {
    summary.appendChild(
      element("span", {
        className: "summary-chip",
        text: `${inventoryLabels[mode]} ${count}`,
      })
    );
  });

  empty.hidden = state.products.length > 0;
  state.products.forEach((product) => {
    const row = element("tr");
    const productColumn = element("td");
    productColumn.appendChild(productCell(product));
    const mode = element("td");
    mode.appendChild(
      statusBadge(
        inventoryLabels[product.inventory.mode] || product.inventory.mode,
        inventoryTone(product)
      )
    );
    const stocked = product.inventory.mode === "stocked";
    const onHand = element("td", {
      text: stocked ? product.inventory.onHand : "不适用",
    });
    const reserved = element("td", {
      text: stocked ? product.inventory.reserved : "不适用",
    });
    const available = element("td", {
      text: stocked ? product.availableQuantity : "按单确认",
    });
    const reorder = element("td", {
      text: stocked ? product.inventory.reorderPoint : "不适用",
    });
    const maximum = element("td", { text: product.inventory.maxPerOrder });
    const actions = element("td");
    actions.appendChild(actionButton("调整", "editInventory", product.id));
    row.append(
      productColumn,
      mode,
      onHand,
      reserved,
      available,
      reorder,
      maximum,
      actions
    );
    table.appendChild(row);
  });
}

function populateOrderStatusSelects() {
  const filter = document.querySelector("[data-shipping-status-filter]");
  const dialogSelect = document.querySelector("#orderStatus");
  const currentFilter = filter.value;
  const currentDialog = dialogSelect.value;
  clear(filter);
  clear(dialogSelect);
  const allOption = element("option", { text: "全部" });
  allOption.value = "all";
  filter.appendChild(allOption);
  state.statuses.forEach((status) => {
    const label = orderStatusLabels[status.id] || status.label;
    const filterOption = element("option", { text: label });
    filterOption.value = status.id;
    filter.appendChild(filterOption);
    const dialogOption = element("option", { text: label });
    dialogOption.value = status.id;
    dialogSelect.appendChild(dialogOption);
  });
  filter.value = [...filter.options].some((option) => option.value === currentFilter)
    ? currentFilter
    : "all";
  if ([...dialogSelect.options].some((option) => option.value === currentDialog)) {
    dialogSelect.value = currentDialog;
  }
}

function renderShipping() {
  populateOrderStatusSelects();
  const table = document.querySelector("[data-shipping-table]");
  const empty = document.querySelector("[data-shipping-empty]");
  const query = document
    .querySelector("[data-shipping-search]")
    .value.trim()
    .toLowerCase();
  const status = document.querySelector("[data-shipping-status-filter]").value;
  const orders = state.orders.filter((order) => {
    const displayStatus = order.fulfillmentStatus || order.status;
    const matchesStatus = status === "all" || displayStatus === status || order.status === status;
    const haystack =
      `${order.id} ${order.customer?.email || ""} ${order.customer?.name || ""} ${order.trackingNumber || ""} ${order.shipment?.trackingNumber || ""}`.toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
  clear(table);
  empty.hidden = orders.length > 0;

  orders.forEach((order) => {
    const row = element("tr");
    const id = element("td");
    const idCopy = element("div", { className: "table-product-copy" });
    idCopy.append(
      element("strong", { text: order.id }),
      element("span", { text: formatDate(order.createdAt, true) })
    );
    id.appendChild(idCopy);
    const customer = element("td");
    const customerCopy = element("div", { className: "table-product-copy" });
    customerCopy.append(
      element("strong", { text: order.customer?.name || "未记录" }),
      element("span", { text: order.customer?.email || "未记录" })
    );
    customer.appendChild(customerCopy);
    const statusCell = element("td");
    const displayStatus = order.fulfillmentStatus || order.status;
    statusCell.appendChild(
      statusBadge(
        orderStatusLabels[displayStatus] || displayStatus,
        orderTone(displayStatus)
      )
    );
    const carrier = element("td", { text: order.carrier || order.shipment?.carrier || "未记录" });
    const tracking = element("td", {
      text: order.trackingNumber || order.shipment?.trackingNumber || "未记录",
    });
    const updated = element("td", { text: formatDate(order.updatedAt, true) });
    const actions = element("td");
    actions.append(
      actionButton("更新", "editShipping", order.id),
      actionButton("新增包裹", "createShipment", order.id),
      actionButton("发邮件", "emailOrder", order.id)
    );
    row.append(id, customer, statusCell, carrier, tracking, updated, actions);
    table.appendChild(row);
  });
}

function renderAudit() {
  const list = document.querySelector("[data-audit-list]");
  const empty = document.querySelector("[data-audit-empty]");
  clear(list);
  empty.hidden = state.auditEvents.length > 0;
  list.hidden = state.auditEvents.length === 0;
  state.auditEvents.forEach((event) => {
    const row = element("article", { className: "audit-row" });
    const time = element("time", { text: formatDate(event.at, true) });
    time.dateTime = event.at;
    row.append(
      time,
      element("strong", {
        text: auditActionLabels[event.action] || event.action,
      }),
      element("span", {
        text: event.entityId || event.entityType,
      }),
      element("span", {
        text: `${event.actor}${event.ip ? ` | ${event.ip}` : ""}`,
      })
    );
    list.appendChild(row);
  });
}

function renderCustomers() {
  const table = document.querySelector("[data-customer-table]");
  const empty = document.querySelector("[data-customer-empty]");
  if (!table || !empty) return;
  clear(table);
  empty.hidden = state.customers.length > 0;
  state.customers.forEach((customer) => {
    const row = element("tr");
    const tier = customer.membership_status === "member" ? "journal" : customer.membership_status === "standard" ? "explorer" : customer.membership_status;
    const membership = tier !== "explorer";
    const action = element("button", { className: "table-action", type: "button", text: membership ? "改回 Explorer" : "开通 Journal" });
    action.dataset.customerMembership = customer.id;
    action.dataset.membershipStatus = membership ? "explorer" : "journal";
    const status = element("td");
    status.appendChild(statusBadge(tierLabel(tier), membership ? "is-success" : ""));
    const actionCell = element("td");
    if (can("customer.manage")) actionCell.appendChild(action);
    row.append(
      element("td", { text: customer.email }), element("td", { text: customer.display_name || "—" }),
      element("td", { text: customer.auth_provider === "google" ? "Google" : "邮箱" }),
      element("td", { text: formatDate(customer.created_at) }), element("td", { text: formatDate(customer.last_login_at, true) }), status, actionCell
    );
    table.appendChild(row);
  });
}

function tierLabel(tier) {
  return TIER_META[tier]?.titleZh || tier || "Explorer";
}

function serviceTypeLabel(type) {
  return SERVICE_TYPES[type]?.zh || type || "—";
}

function conciergeStatusLabel(status) {
  return CONCIERGE_STATUSES[status]?.zh || status || "—";
}

function renderMemberships() {
  const table = document.querySelector("[data-membership-table]");
  const empty = document.querySelector("[data-membership-empty]");
  if (!table || !empty) return;
  clear(table);
  empty.hidden = state.memberships.length > 0;
  state.memberships.forEach((membership) => {
    const row = element("tr");
    const actionCell = element("td");
    if (can("membership.manage") || can("customer.manage")) {
      const select = element("select");
      select.dataset.membershipTierUpdate = membership.id;
      ["explorer", "journal", "collector", "black"].forEach((tier) => {
        const option = element("option", { text: tierLabel(tier) });
        option.value = tier;
        option.selected = membership.membership_status === tier;
        select.appendChild(option);
      });
      actionCell.appendChild(select);
    }
    row.append(
      element("td", { text: membership.email }),
      element("td", { text: tierLabel(membership.membership_status) }),
      element("td", { text: membership.billing_interval || "none" }),
      element("td", { text: membership.status || "inactive" }),
      element("td", { text: formatDate(membership.current_period_start) }),
      element("td", { text: formatDate(membership.current_period_end) }),
      element("td", { text: membership.cancel_at_period_end ? "是" : "否" }),
      actionCell
    );
    table.appendChild(row);
  });
}

function renderConciergeRequests() {
  const table = document.querySelector("[data-concierge-table]");
  const empty = document.querySelector("[data-concierge-empty]");
  if (!table || !empty) return;
  clear(table);
  empty.hidden = state.conciergeRequests.length > 0;
  state.conciergeRequests.forEach((request) => {
    const row = element("tr");
    const actionCell = element("td");
    if (can("concierge.manage")) {
      const select = element("select");
      select.dataset.conciergeStatus = request.id;
      Object.keys(CONCIERGE_STATUSES).forEach((status) => {
        const option = element("option", { text: conciergeStatusLabel(status) });
        option.value = status;
        option.selected = request.status === status;
        select.appendChild(option);
      });
      const note = element("textarea");
      note.dataset.conciergeNote = request.id;
      note.placeholder = "内部备注";
      note.value = request.internal_notes || "";
      const save = element("button", { className: "table-action", type: "button", text: "保存" });
      save.dataset.conciergeSave = request.id;
      actionCell.append(select, note, save);
    }
    row.append(
      element("td", { text: request.request_number }),
      element("td", { text: request.email }),
      element("td", { text: serviceTypeLabel(request.service_type) }),
      element("td", { text: conciergeStatusLabel(request.status) }),
      element("td", { text: request.budget || "—" }),
      element("td", { text: request.country || "—" }),
      element("td", { text: formatDate(request.created_at, true) }),
      actionCell
    );
    table.appendChild(row);
  });
}

function renderAll() {
  renderOverview();
  renderProducts();
  renderInventory();
  renderShipping();
  renderAudit();
  renderCustomers();
  renderMemberships();
  renderConciergeRequests();
  window.__orbmareAdminPlatform?.renderPlatform?.();
}

async function loadData({ quiet = false } = {}) {
  if (!quiet) document.body.setAttribute("aria-busy", "true");
  try {
    const tasks = [];
    if (can("product.read")) {
      tasks.push(
        api("/overview").then((data) => {
          state.overview = data.overview;
        })
      );
      tasks.push(
        api("/products").then((data) => {
          state.products = data.products;
        })
      );
    }
    if (can("order.read")) {
      tasks.push(
        api("/orders").then((data) => {
          state.orders = data.orders;
          state.statuses = data.statuses;
          state.email = data.email || state.email;
        })
      );
    }
    if (can("audit.read")) {
      tasks.push(
        api("/audit?limit=100").then((data) => {
          state.auditEvents = data.events;
        })
      );
    }
    if (can("customer.read")) {
      tasks.push(api("/customers").then((data) => { state.customers = data.customers || []; }));
    }
    if (can("membership.read") || can("customer.read")) {
      const params = new URLSearchParams({
        search: document.querySelector("[data-membership-search]")?.value || "",
        tier: document.querySelector("[data-membership-tier]")?.value || "",
        status: document.querySelector("[data-membership-subscription-status]")?.value || "",
      });
      tasks.push(api(`/memberships?${params}`).then((data) => { state.memberships = data.memberships || []; }));
    }
    if (can("concierge.read")) {
      const params = new URLSearchParams({
        status: document.querySelector("[data-concierge-status-filter]")?.value || "",
        serviceType: document.querySelector("[data-concierge-type-filter]")?.value || "",
      });
      tasks.push(api(`/concierge-requests?${params}`).then((data) => { state.conciergeRequests = data.requests || []; }));
    }
    await Promise.allSettled(tasks);
    if (window.__orbmareAdminPlatform?.loadPlatformData) {
      await window.__orbmareAdminPlatform.loadPlatformData();
    }
    renderAll();
  } finally {
    document.body.setAttribute("aria-busy", "false");
  }
}

function formValue(form, name) {
  return form.elements.namedItem(name)?.value ?? "";
}

function numberValue(form, name, fallback = 0) {
  const value = Number(formValue(form, name));
  return Number.isFinite(value) ? value : fallback;
}

function setFormValue(form, name, value) {
  const field = form.elements.namedItem(name);
  if (field) field.value = value ?? "";
}

function readStructuredDimensions(form) {
  return {
    unit: formValue(form, "dimensionUnit") || "cm",
    weightUnit: formValue(form, "dimensionWeightUnit") || "g",
    length: formValue(form, "dimensionLength"),
    width: formValue(form, "dimensionWidth"),
    height: formValue(form, "dimensionHeight"),
    depth: formValue(form, "dimensionDepth"),
    diameter: formValue(form, "dimensionDiameter"),
    weight: formValue(form, "dimensionWeight"),
  };
}

function setStructuredDimensions(form, dimensions = {}) {
  setFormValue(form, "dimensionUnit", dimensions.unit || "cm");
  setFormValue(form, "dimensionWeightUnit", dimensions.weightUnit || "g");
  setFormValue(form, "dimensionLength", dimensions.length || "");
  setFormValue(form, "dimensionWidth", dimensions.width || "");
  setFormValue(form, "dimensionHeight", dimensions.height || "");
  setFormValue(form, "dimensionDepth", dimensions.depth || "");
  setFormValue(form, "dimensionDiameter", dimensions.diameter || "");
  setFormValue(form, "dimensionWeight", dimensions.weight || "");
}

function renderProductTypeFields(type, values = {}) {
  const root = document.querySelector("[data-product-type-fields]");
  if (!root) return;
  clear(root);
  if (type === "apparel") {
    renderApparelSizeOptions(root, values.sizeOptions || []);
  }
  const skipped = new Set(type === "apparel" ? APPAREL_SIZE_FIELDS.map(([key]) => key) : []);
  productTypeFields(type).filter(([key]) => !skipped.has(key)).forEach(([key, zh]) => {
    const wrap = element("div", { className: "field" });
    const label = element("label", { text: zh });
    label.htmlFor = `attr-${key}`;
    const input = element("input");
    input.id = `attr-${key}`;
    input.name = `attr_${key}`;
    input.maxLength = 160;
    input.value = values[key] || "";
    wrap.append(label, input);
    root.appendChild(wrap);
  });
}

function renderApparelSizeOptions(root, sizeOptions = []) {
  const section = element("div", { className: "field field-span-2 product-size-options" });
  const head = element("div", { className: "product-size-options-head" });
  head.append(
    element("strong", { text: "多尺寸 / 尺码" }),
    (() => {
      const button = element("button", { className: "button button-secondary button-compact", type: "button", text: "+ 新增尺码" });
      button.dataset.addSizeOption = "apparel";
      return button;
    })()
  );
  const list = element("div");
  list.dataset.sizeOptionsList = "apparel";
  section.append(head, list);
  root.appendChild(section);
  const options = Array.isArray(sizeOptions) && sizeOptions.length ? sizeOptions : [{}];
  options.forEach((option) => appendApparelSizeOption(list, option));
}

function appendApparelSizeOption(list, values = {}) {
  const index = list.querySelectorAll("[data-size-option]").length + 1;
  const item = element("div", { className: "product-size-option" });
  item.dataset.sizeOption = "apparel";
  const title = element("div", { className: "product-size-option-title" });
  title.append(
    element("strong", { text: `尺码 ${index}` }),
    (() => {
      const button = element("button", { className: "text-button", type: "button", text: "移除" });
      button.dataset.removeSizeOption = "apparel";
      return button;
    })()
  );
  const grid = element("div", { className: "form-grid" });
  APPAREL_SIZE_FIELDS.forEach(([key, zh]) => {
    const wrap = element("div", { className: "field" });
    const label = element("label", { text: zh });
    const input = element("input");
    input.dataset.sizeField = key;
    input.maxLength = 80;
    input.value = values[key] || "";
    wrap.append(label, input);
    grid.appendChild(wrap);
  });
  item.append(title, grid);
  list.appendChild(item);
}

function mergeVisibleProductAttributes() {
  const existing = JSON.parse(productForm.dataset.productAttributes || "{}");
  productForm.querySelectorAll("[data-product-type-fields] input").forEach((field) => {
    const key = field.name?.replace(/^attr_/, "");
    if (key && field.value.trim()) existing[key] = field.value.trim();
  });
  const sizeOptions = readApparelSizeOptions();
  if (sizeOptions.length) existing.sizeOptions = sizeOptions;
  productForm.dataset.productAttributes = JSON.stringify(existing);
  return existing;
}

function readProductAttributes(type) {
  const attributes = JSON.parse(productForm.dataset.productAttributes || "{}");
  productTypeFields(type).forEach(([key]) => {
    const field = productForm.elements.namedItem(`attr_${key}`);
    if (field?.value) attributes[key] = field.value.trim();
  });
  if (type === "apparel") {
    attributes.sizeOptions = readApparelSizeOptions();
    for (const [key] of APPAREL_SIZE_FIELDS) delete attributes[key];
  }
  return attributes;
}

function readApparelSizeOptions() {
  return [...productForm.querySelectorAll("[data-size-option='apparel']")]
    .map((item) => {
      const option = {};
      item.querySelectorAll("[data-size-field]").forEach((field) => {
        if (field.value.trim()) option[field.dataset.sizeField] = field.value.trim();
      });
      return option;
    })
    .filter((option) => Object.keys(option).length > 0);
}

function syncDimensionSummary() {
  if (!productForm) return;
  const summary = productForm.elements.namedItem("dimensions");
  if (!summary) return;
  const generated = serializeDimensions(readStructuredDimensions(productForm), "");
  if (!summary.value || summary.dataset.autogenerated === "true") {
    summary.value = generated;
    summary.dataset.autogenerated = generated ? "true" : "";
  }
}

function syncStockFields(modeSelector, attributeName) {
  const stocked = modeSelector.value === "stocked";
  document.querySelectorAll(`[${attributeName}]`).forEach((field) => {
    field.hidden = !stocked;
    field.querySelectorAll("input").forEach((input) => {
      input.disabled = !stocked;
    });
  });
}

const productDialog = document.querySelector("[data-product-dialog]");
const productForm = document.querySelector("[data-product-form]");
const inventoryDialog = document.querySelector("[data-inventory-dialog]");
const inventoryForm = document.querySelector("[data-inventory-form]");
const shippingDialog = document.querySelector("[data-shipping-dialog]");
const shippingForm = document.querySelector("[data-shipping-form]");
const emailDialog = document.querySelector("[data-email-dialog]");
const emailForm = document.querySelector("[data-email-form]");

function openProductDialog(product = null) {
  productForm.reset();
  showInlineError(document.querySelector("[data-product-error]"));
  const editing = Boolean(product);
  const channel = resolveChannel(product) || "shop";
  setFormValue(productForm, "editingId", product?.id || "");
  setFormValue(productForm, "id", product?.id || "");
  productForm.elements.namedItem("id").readOnly = editing;
  setFormValue(productForm, "channel", channel);
  setFormValue(productForm, "lifecycleStatus", product?.lifecycleStatus || "draft");
  const featuredField = productForm.elements.namedItem("featured");
  if (featuredField) featuredField.checked = Boolean(product?.featured);
  setFormValue(productForm, "featuredRank", product?.featuredRank ?? 100);
  setFormValue(productForm, "costPrice", product?.costPrice ?? "");
  setFormValue(productForm, "compareAtPrice", product?.compareAtPrice ?? "");
  setFormValue(productForm, "seoTitle", product?.seo?.title || "");
  setFormValue(productForm, "seoDescription", product?.seo?.description || "");
  setFormValue(productForm, "seoSlug", product?.seo?.slug || product?.id || "");
  setFormValue(
    productForm,
    "collection",
    channel === "shop" ? product?.collection || "toys" : "toys"
  );
  setFormValue(
    productForm,
    "editorialCountry",
    channel === "editorial"
      ? product?.country || product?.collection || "japan"
      : "japan"
  );
  setFormValue(
    productForm,
    "editorialStatus",
    product?.editorialStatus || product?.status || "editors-pick"
  );
  setFormValue(productForm, "price", product?.price || "");
  setFormValue(productForm, "productType", product?.productType || product?.category || "object");
  setFormValue(productForm, "zhName", product?.zh?.name || "");
  setFormValue(productForm, "enName", product?.en?.name || "");
  setFormValue(productForm, "zhDesc", product?.zh?.desc || "");
  setFormValue(productForm, "enDesc", product?.en?.desc || "");
  setFormValue(productForm, "material", product?.material || "");
  setFormValue(productForm, "materialZh", product?.materialZh || "");
  setStructuredDimensions(productForm, product?.dimensionsStructured || {});
  setFormValue(productForm, "dimensions", product?.dimensions || "");
  productForm.elements.namedItem("dimensions").dataset.autogenerated = product?.dimensions ? "" : "true";
  productForm.dataset.productAttributes = JSON.stringify(product?.productAttributes || {});
  renderProductTypeFields(product?.productType || product?.category || "object", product?.productAttributes || {});
  setFormValue(productForm, "image", product?.image || "");
  setFormValue(productForm, "images", serializeImagesField(product));
  setFormValue(productForm, "variants", serializeVariantsField(product));
  setFormValue(productForm, "imageSource", product?.imageSource || "");
  setFormValue(productForm, "safetyWarning", product?.safetyWarning || "");
  setFormValue(productForm, "story", product?.story || "");
  setFormValue(productForm, "storyZh", product?.storyZh || "");
  setFormValue(productForm, "craft", product?.craft || "");
  setFormValue(productForm, "craftZh", product?.craftZh || "");
  setFormValue(productForm, "designerId", product?.designerId || "");
  setFormValue(productForm, "designerName", product?.designerName || "");
  setFormValue(productForm, "designerNameZh", product?.designerNameZh || "");
  setFormValue(productForm, "studio", product?.studio || "");
  setFormValue(productForm, "studioZh", product?.studioZh || "");
  setFormValue(
    productForm,
    "inventoryMode",
    product?.inventory?.mode || "source_after_order"
  );
  setFormValue(productForm, "onHand", product?.inventory?.onHand ?? 0);
  setFormValue(productForm, "reorderPoint", product?.inventory?.reorderPoint ?? 0);
  setFormValue(
    productForm,
    "maxPerOrder",
    product?.inventory?.maxPerOrder || (channel === "editorial" ? 5 : 20)
  );
  setFormValue(
    productForm,
    "originCountry",
    product?.shipping?.originCountry || product?.sourceCountry || "China"
  );
  setFormValue(
    productForm,
    "shippingProfile",
    product?.shipping?.profile || "cross_border_standard"
  );
  setFormValue(
    productForm,
    "processingTime",
    product?.shipping?.processingTime ||
      product?.processingTime ||
      (channel === "editorial" ? "Concierge confirmation within 2–5 business days" : "")
  );
  setFormValue(
    productForm,
    "internationalShippingTime",
    product?.shipping?.internationalShippingTime ||
      product?.internationalShippingTime ||
      (channel === "editorial" ? "Arranged after availability confirmation" : "")
  );
  setFormValue(productForm, "returnPolicyType", product?.checkout?.returnPolicyType || "MADE_TO_ORDER");
  document.querySelector("[data-product-dialog-title]").textContent = editing
    ? "编辑商品"
    : "新建商品";
  syncChannelFields(channel);
  fillProductSyncPreview(
    product || {
      id: "",
      channel,
      lifecycleStatus: "published",
      collection: channel === "editorial" ? "japan" : "toys",
    }
  );
  syncStockFields(
    productForm.elements.namedItem("inventoryMode"),
    "data-stock-only"
  );
  adminUploader.mountAll(productForm);
  adminUploader.refresh(productForm);
  productForm.dataset.aiEntityType = "product";
  adminAi.mountForm(productForm, {
    entityType: "product",
    getEntityId: () => formValue(productForm, "id"),
  });
  productDialog.showModal();
}

function productPayload() {
  const mode = formValue(productForm, "inventoryMode");
  const channel = formValue(productForm, "channel") || "shop";
  const image = formValue(productForm, "image");
  const price = numberValue(productForm, "price");
  const images = parseImagesField(formValue(productForm, "images"), image);
  const variants = parseVariantsField(formValue(productForm, "variants"), price);
  let id = formValue(productForm, "id").trim().toLowerCase();
  const editingId = formValue(productForm, "editingId");
  const existing = state.products.find((entry) => entry.id === (editingId || id));
  const collection =
    channel === "editorial"
      ? formValue(productForm, "editorialCountry") || "japan"
      : formValue(productForm, "collection") || "toys";
  const costRaw = formValue(productForm, "costPrice");
  const compareRaw = formValue(productForm, "compareAtPrice");
  const productType = formValue(productForm, "productType") || "object";
  const dimensionsStructured = readStructuredDimensions(productForm);
  const dimensionsSummary =
    formValue(productForm, "dimensions") ||
    serializeDimensions(dimensionsStructured, existing?.dimensions || "");
  return {
    id,
    channel,
    featured: Boolean(productForm.elements.namedItem("featured")?.checked),
    featuredRank: Number(formValue(productForm, "featuredRank") || 100),
    lifecycleStatus: formValue(productForm, "lifecycleStatus"),
    collection,
    country: channel === "editorial" ? collection : undefined,
    editorialStatus:
      channel === "editorial" ? formValue(productForm, "editorialStatus") : undefined,
    price,
    costPrice: costRaw === "" ? null : Number(costRaw),
    compareAtPrice: compareRaw === "" ? null : Number(compareRaw),
    seo: {
      title: formValue(productForm, "seoTitle"),
      description: formValue(productForm, "seoDescription"),
      slug: formValue(productForm, "seoSlug") || id,
    },
    material: formValue(productForm, "material"),
    materialZh: formValue(productForm, "materialZh"),
    productType,
    dimensionsStructured,
    productAttributes: readProductAttributes(productType),
    dimensions: dimensionsSummary,
    image,
    images,
    variants,
    imageSource: formValue(productForm, "imageSource"),
    safetyWarning: formValue(productForm, "safetyWarning"),
    story: formValue(productForm, "story"),
    storyZh: formValue(productForm, "storyZh"),
    craft: formValue(productForm, "craft"),
    craftZh: formValue(productForm, "craftZh"),
    designerId: formValue(productForm, "designerId"),
    designerName: formValue(productForm, "designerName"),
    designerNameZh: formValue(productForm, "designerNameZh"),
    studio: formValue(productForm, "studio"),
    studioZh: formValue(productForm, "studioZh"),
    summary: formValue(productForm, "enDesc"),
    summaryZh: formValue(productForm, "zhDesc"),
    zh: {
      name: formValue(productForm, "zhName"),
      desc: formValue(productForm, "zhDesc"),
    },
    en: {
      name: formValue(productForm, "enName"),
      desc: formValue(productForm, "enDesc"),
    },
    inventory: {
      mode,
      onHand: mode === "stocked" ? numberValue(productForm, "onHand") : null,
      reorderPoint:
        mode === "stocked" ? numberValue(productForm, "reorderPoint") : null,
      maxPerOrder: numberValue(productForm, "maxPerOrder", 20),
    },
    shipping: {
      profile: formValue(productForm, "shippingProfile"),
      originCountry: formValue(productForm, "originCountry") || "China",
      processingTime: formValue(productForm, "processingTime"),
      internationalShippingTime: formValue(
        productForm,
        "internationalShippingTime"
      ),
    },
    checkout: {
      ...(existing?.checkout || {}),
      returnPolicyType: formValue(productForm, "returnPolicyType") || "MADE_TO_ORDER",
    },
  };
}

function openInventoryDialog(product) {
  inventoryForm.reset();
  showInlineError(document.querySelector("[data-inventory-error]"));
  setFormValue(inventoryForm, "id", product.id);
  setFormValue(inventoryForm, "mode", product.inventory.mode);
  setFormValue(inventoryForm, "onHand", product.inventory.onHand ?? 0);
  setFormValue(inventoryForm, "reorderPoint", product.inventory.reorderPoint ?? 0);
  setFormValue(inventoryForm, "maxPerOrder", product.inventory.maxPerOrder || 20);
  document.querySelector("[data-inventory-product-name]").textContent =
    product.zh?.name || product.en?.name || product.id;
  syncStockFields(
    inventoryForm.elements.namedItem("mode"),
    "data-quick-stock-only"
  );
  inventoryDialog.showModal();
}

function openShippingDialog(order) {
  shippingForm.reset();
  showInlineError(document.querySelector("[data-shipping-error]"));
  populateOrderStatusSelects();
  setFormValue(shippingForm, "id", order.id);
  const status = order.fulfillmentStatus || order.status || "ORDER_CONFIRMED";
  const statusMeta = state.statuses.find((entry) => entry.id === status);
  setFormValue(shippingForm, "status", status);
  setFormValue(shippingForm, "publicTitle", statusMeta?.publicTitle || orderStatusLabels[status] || status);
  setFormValue(shippingForm, "publicDescription", statusMeta?.publicDescription || "");
  setFormValue(shippingForm, "location", "");
  setFormValue(shippingForm, "carrier", order.carrier || order.shipment?.carrier || "");
  setFormValue(shippingForm, "trackingNumber", order.trackingNumber || order.shipment?.trackingNumber || "");
  setFormValue(shippingForm, "trackingUrl", order.trackingUrl || order.shipment?.trackingUrl || "");
  setFormValue(shippingForm, "estimatedDelivery", String(order.estimatedDeliveryEnd || order.shipment?.estimatedDelivery || "").slice(0, 10));
  setFormValue(shippingForm, "internalNote", "");
  const shipmentSelect = shippingForm.elements.namedItem("shipmentId");
  clear(shipmentSelect);
  const allOrder = element("option", { text: "整单事件" });
  allOrder.value = "";
  shipmentSelect.appendChild(allOrder);
  (order.shipments || []).forEach((shipment) => {
    const option = element("option", {
      text: `${shipment.shipmentId} · ${shipment.carrier || "未记录承运商"}`,
    });
    option.value = shipment.shipmentId;
    shipmentSelect.appendChild(option);
  });
  document.querySelector("[data-shipping-order-id]").textContent = order.id;
  renderOrderJourneyPreview(order);
  shippingDialog.showModal();
}

function renderOrderJourneyPreview(order) {
  const root = document.querySelector("[data-order-journey-preview]");
  if (!root) return;
  clear(root);
  const events = order.events || [];
  if (!events.length) {
    root.appendChild(element("p", { className: "panel-empty", text: "暂无履约事件。" }));
    return;
  }
  events.slice(0, 6).forEach((event) => {
    const row = element("article", { className: "audit-row" });
    row.append(
      element("time", { text: formatDate(event.createdAt, true) }),
      element("strong", { text: event.publicTitle || orderStatusLabels[event.status] || event.status }),
      element("span", { text: event.publicDescription || "" })
    );
    root.appendChild(row);
  });
}

async function loadEmailDraft(order, templateId = "sourcing_update") {
  const data = await api(
    `/orders/${encodeURIComponent(order.id)}/email-draft?templateId=${encodeURIComponent(templateId)}&language=${encodeURIComponent(order.language || "zh")}`
  );
  state.email = {
    config: data.config || state.email.config,
    templates: data.templates || state.email.templates,
    adminCopy: data.adminCopy || state.email.adminCopy || {},
  };
  return data;
}

function emailConfigText(config = state.email.config || {}) {
  const adminCopy = state.email.adminCopy || {};
  if (config.configured) return adminCopy.configured || "邮件服务已连接。发送前请确认主题和正文。";
  return adminCopy.unconfigured || "邮件服务尚未配置完成，当前不能发送。请检查 EMAIL_PROVIDER、RESEND_API_KEY 和 EMAIL_FROM。";
}

async function openEmailDialog(order) {
  emailForm.reset();
  showInlineError(document.querySelector("[data-email-error]"));
  setFormValue(emailForm, "id", order.id);
  document.querySelector("[data-email-order-id]").textContent = `发送订单邮件 · ${order.id}`;
  const note = document.querySelector("[data-email-config-note]");
  note.textContent = state.email.adminCopy?.loadingDraft || "正在读取邮件模板。";
  emailDialog.showModal();
  try {
    const data = await loadEmailDraft(order, formValue(emailForm, "templateId") || "sourcing_update");
    setFormValue(emailForm, "to", data.to || order.customer?.email || "");
    setFormValue(emailForm, "subject", data.draft?.subject || "");
    setFormValue(emailForm, "body", data.draft?.body || "");
    note.textContent = emailConfigText(data.config);
    note.dataset.mode = data.config?.configured ? "ok" : "error";
    emailForm.querySelector("button[type='submit']").disabled = !data.config?.configured;
  } catch (error) {
    note.textContent = error.message;
    note.dataset.mode = "error";
    emailForm.querySelector("button[type='submit']").disabled = true;
  }
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showInlineError(loginError);
  const button = loginForm.querySelector("button[type='submit']");
  button.disabled = true;
  try {
    const response = await api("/login", {
      method: "POST",
      body: {
        email: formValue(loginForm, "email"),
        password: formValue(loginForm, "password"),
      },
    });
    showApplication(response);
    await loadData();
  } catch (error) {
    showInlineError(loginError, error.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("[data-logout]")?.addEventListener("click", async () => {
  try {
    await api("/logout", { method: "POST", body: {} });
  } catch {
    // Clearing the local view remains safe even if the session already expired.
  }
  showLogin();
});

document.querySelectorAll("[data-section-target]").forEach((button) => {
  button.addEventListener("click", () => activateSection(button.dataset.sectionTarget));
});

document.querySelectorAll("[data-jump-section]").forEach((button) => {
  button.addEventListener("click", () => activateSection(button.dataset.jumpSection));
});

document.querySelector("[data-refresh]")?.addEventListener("click", async () => {
  try {
    await loadData();
    showToast("运营数据已刷新。");
  } catch (error) {
    showToast(error.message, true);
  }
});

document.querySelector("[data-product-search]")?.addEventListener("input", renderProducts);
document
  .querySelector("[data-product-status-filter]")
  ?.addEventListener("change", renderProducts);
document
  .querySelector("[data-product-channel-filter]")
  ?.addEventListener("change", renderProducts);
document.querySelector("[data-shipping-search]")?.addEventListener("input", renderShipping);
document
  .querySelector("[data-shipping-status-filter]")
  ?.addEventListener("change", renderShipping);

[
  "[data-membership-search]",
  "[data-membership-tier]",
  "[data-membership-subscription-status]",
  "[data-concierge-status-filter]",
  "[data-concierge-type-filter]",
].forEach((selector) => {
  document.querySelector(selector)?.addEventListener("input", () => loadData({ quiet: true }));
  document.querySelector(selector)?.addEventListener("change", () => loadData({ quiet: true }));
});

document.querySelector("[data-new-product]")?.addEventListener("click", () => {
  openProductDialog();
});

document.addEventListener("click", async (event) => {
  const productButton = event.target.closest("[data-edit-product]");
  if (productButton) {
    const product = state.products.find(
      (entry) => entry.id === productButton.dataset.editProduct
    );
    if (product) openProductDialog(product);
    return;
  }
  const inventoryButton = event.target.closest("[data-edit-inventory]");
  if (inventoryButton) {
    const product = state.products.find(
      (entry) => entry.id === inventoryButton.dataset.editInventory
    );
    if (product) openInventoryDialog(product);
    return;
  }
  const shippingButton = event.target.closest("[data-edit-shipping]");
  if (shippingButton) {
    const order = state.orders.find(
      (entry) => entry.id === shippingButton.dataset.editShipping
    );
    if (order) {
      try {
        const data = await api(`/orders/${encodeURIComponent(order.id)}`);
        openShippingDialog(data.order || order);
      } catch (error) {
        showToast(error.message, true);
      }
    }
    return;
  }
  const createShipmentButton = event.target.closest("[data-create-shipment]");
  if (createShipmentButton) {
    const orderId = createShipmentButton.dataset.createShipment;
    const carrier = prompt("承运商（可留空）") || "";
    const trackingNumber = prompt("Tracking Number（可留空）") || "";
    try {
      await api(`/orders/${encodeURIComponent(orderId)}/shipments`, {
        method: "POST",
        body: { carrier, trackingNumber },
      });
      showToast("包裹已创建。");
      await loadData({ quiet: true });
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }
  const emailButton = event.target.closest("[data-email-order]");
  if (emailButton) {
    const order = state.orders.find(
      (entry) => entry.id === emailButton.dataset.emailOrder
    );
    if (order) openEmailDialog(order);
    return;
  }
  const deleteButton = event.target.closest("[data-delete-product]");
  if (deleteButton) {
    const id = deleteButton.dataset.deleteProduct;
    if (!confirm(`确认删除商品「${id}」？将进入删除记录，保留 7 天后永久清除。`)) return;
    try {
      await api(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
      state.selectedProducts.delete(id);
      showToast("已移入删除记录（保留 7 天）。");
      await loadData({ quiet: true });
    } catch (error) {
      showToast(error.message, true);
    }
    return;
  }
  const featuredButton = event.target.closest("[data-toggle-featured]");
  if (featuredButton) {
    const id = featuredButton.dataset.toggleFeatured;
    const product = state.products.find((entry) => entry.id === id);
    if (!product) return;
    try {
      await api(`/products/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: { ...product, featured: !product.featured },
      });
      showToast(product.featured ? "已取消推荐。" : "已设为推荐，将出现在精选页滚动带。");
      await loadData({ quiet: true });
    } catch (error) {
      showToast(error.message, true);
    }
  }
  const membershipButton = event.target.closest("[data-customer-membership]");
  if (membershipButton) {
    const status = membershipButton.dataset.membershipStatus;
    const label = status === "journal" ? "开通 Journal" : "改回 Explorer";
    if (!confirm(`确认${label}该客户的会员资格？`)) return;
    try {
      await api(`/customers/${encodeURIComponent(membershipButton.dataset.customerMembership)}/membership`, { method: "PUT", body: { status } });
      showToast("会员资格已更新。");
      await loadData({ quiet: true });
    } catch (error) { showToast(error.message, true); }
  }
  const conciergeSave = event.target.closest("[data-concierge-save]");
  if (conciergeSave) {
    const id = conciergeSave.dataset.conciergeSave;
    try {
      await api(`/concierge-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: {
          status: document.querySelector(`[data-concierge-status="${CSS.escape(id)}"]`)?.value,
          internalNotes: document.querySelector(`[data-concierge-note="${CSS.escape(id)}"]`)?.value,
        },
      });
      showToast("服务申请已更新。");
      await loadData({ quiet: true });
    } catch (error) {
      showToast(error.message, true);
    }
  }
  const addSize = event.target.closest("[data-add-size-option]");
  if (addSize) {
    const list = document.querySelector("[data-size-options-list='apparel']");
    if (list) appendApparelSizeOption(list, {});
    return;
  }
  const removeSize = event.target.closest("[data-remove-size-option]");
  if (removeSize) {
    const option = removeSize.closest("[data-size-option]");
    const list = option?.parentElement;
    if (option && list?.querySelectorAll("[data-size-option]").length > 1) option.remove();
    else if (option) option.querySelectorAll("input").forEach((input) => { input.value = ""; });
  }
});

document.querySelector("[data-membership-table]")?.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-membership-tier-update]");
  if (!select) return;
  try {
    await api(`/memberships/${encodeURIComponent(select.dataset.membershipTierUpdate)}/tier`, {
      method: "PUT",
      body: { tier: select.value },
    });
    showToast("会员等级已更新。");
    await loadData({ quiet: true });
  } catch (error) {
    showToast(error.message, true);
  }
});

document.querySelector("[data-product-table]")?.addEventListener("change", (event) => {
  const input = event.target.closest("[data-select-product]");
  if (!input) return;
  const id = input.dataset.selectProduct;
  if (input.checked) state.selectedProducts.add(id);
  else state.selectedProducts.delete(id);
  syncProductBulkBar();
});

document.querySelector("[data-product-select-all]")?.addEventListener("change", (event) => {
  const checked = Boolean(event.target.checked);
  document.querySelectorAll("[data-product-table] [data-select-product]").forEach((input) => {
    input.checked = checked;
    const id = input.dataset.selectProduct;
    if (checked) state.selectedProducts.add(id);
    else state.selectedProducts.delete(id);
  });
  syncProductBulkBar();
});

document.querySelector("[data-product-bulk-delete]")?.addEventListener("click", async () => {
  const ids = [...state.selectedProducts];
  if (!ids.length) return;
  if (
    !confirm(
      `确认批量删除已选 ${ids.length} 个商品？将进入删除记录，保留 7 天后永久清除。`
    )
  ) {
    return;
  }
  try {
    const result = await api("/products/batch-delete", {
      method: "POST",
      body: { ids },
    });
    state.selectedProducts.clear();
    const failed = result.failed?.length || 0;
    showToast(
      failed
        ? `已删除 ${result.deleted.length} 项，失败 ${failed} 项。`
        : `已批量删除 ${result.deleted.length} 项（保留 7 天）。`
    );
    await loadData({ quiet: true });
  } catch (error) {
    showToast(error.message, true);
  }
});

productForm?.elements
  .namedItem("inventoryMode")
  ?.addEventListener("change", (event) => {
    syncStockFields(event.currentTarget, "data-stock-only");
  });

productForm?.elements.namedItem("channel")?.addEventListener("change", (event) => {
  const channel = event.currentTarget.value;
  syncChannelFields(channel);
  fillProductSyncPreview({
    id: formValue(productForm, "id") || "preview",
    channel,
    lifecycleStatus: formValue(productForm, "lifecycleStatus"),
    collection:
      channel === "editorial"
        ? formValue(productForm, "editorialCountry")
        : formValue(productForm, "collection"),
    country: formValue(productForm, "editorialCountry"),
  });
});

productForm?.elements.namedItem("productType")?.addEventListener("change", (event) => {
  const attributes = mergeVisibleProductAttributes();
  renderProductTypeFields(event.currentTarget.value || "object", attributes);
});

[
  "dimensionUnit",
  "dimensionWeightUnit",
  "dimensionLength",
  "dimensionWidth",
  "dimensionHeight",
  "dimensionDepth",
  "dimensionDiameter",
  "dimensionWeight",
].forEach((name) => {
  const field = productForm?.elements.namedItem(name);
  field?.addEventListener("input", syncDimensionSummary);
  field?.addEventListener("change", syncDimensionSummary);
});

productForm?.elements.namedItem("dimensions")?.addEventListener("input", (event) => {
  event.currentTarget.dataset.autogenerated = "";
});

shippingForm?.elements.namedItem("status")?.addEventListener("change", (event) => {
  const status = state.statuses.find((entry) => entry.id === event.currentTarget.value);
  setFormValue(shippingForm, "publicTitle", status?.publicTitle || orderStatusLabels[status?.id] || status?.label || "");
  setFormValue(shippingForm, "publicDescription", status?.publicDescription || "");
});

inventoryForm?.elements.namedItem("mode")?.addEventListener("change", (event) => {
  syncStockFields(event.currentTarget, "data-quick-stock-only");
});

productForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorNode = document.querySelector("[data-product-error]");
  showInlineError(errorNode);
  const submit = productForm.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const editingId = formValue(productForm, "editingId");
    const payload = productPayload();
    await api(editingId ? `/products/${encodeURIComponent(editingId)}` : "/products", {
      method: editingId ? "PUT" : "POST",
      body: payload,
    });
    adminAi.markClean(productForm);
    productDialog.close();
    await loadData({ quiet: true });
    const published = payload.lifecycleStatus === "published";
    const pdp = storefrontHref("pdp", payload);
    showToast(
      published
        ? `已同步到${payload.channel === "editorial" ? "甄选馆" : "3D打印馆"}。详情 ${pdp}`
        : "商品已保存为草稿/归档，前台买家不可见。发布后会同步到对应前台。"
    );
  } catch (error) {
    showInlineError(errorNode, error.message);
  } finally {
    submit.disabled = false;
  }
});

inventoryForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorNode = document.querySelector("[data-inventory-error]");
  showInlineError(errorNode);
  const submit = inventoryForm.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const id = formValue(inventoryForm, "id");
    const mode = formValue(inventoryForm, "mode");
    await api(`/products/${encodeURIComponent(id)}/inventory`, {
      method: "PATCH",
      body: {
        mode,
        onHand: mode === "stocked" ? numberValue(inventoryForm, "onHand") : null,
        reorderPoint:
          mode === "stocked" ? numberValue(inventoryForm, "reorderPoint") : null,
        maxPerOrder: numberValue(inventoryForm, "maxPerOrder", 20),
      },
    });
    inventoryDialog.close();
    await loadData({ quiet: true });
    showToast("库存设置已更新。");
  } catch (error) {
    showInlineError(errorNode, error.message);
  } finally {
    submit.disabled = false;
  }
});

shippingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorNode = document.querySelector("[data-shipping-error]");
  showInlineError(errorNode);
  const submit = shippingForm.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const id = formValue(shippingForm, "id");
    const result = await api(`/orders/${encodeURIComponent(id)}/events`, {
      method: "POST",
      body: {
        status: formValue(shippingForm, "status"),
        shipmentId: formValue(shippingForm, "shipmentId"),
        publicTitle: formValue(shippingForm, "publicTitle"),
        publicDescription: formValue(shippingForm, "publicDescription"),
        location: formValue(shippingForm, "location"),
        internalNote: formValue(shippingForm, "internalNote"),
        carrier: formValue(shippingForm, "carrier"),
        trackingNumber: formValue(shippingForm, "trackingNumber"),
        trackingUrl: formValue(shippingForm, "trackingUrl"),
        estimatedDelivery: formValue(shippingForm, "estimatedDelivery"),
      },
    });
    shippingDialog.close();
    await loadData({ quiet: true });
    const adminCopy = state.email.adminCopy || {};
    showToast(
      result.emailError
        ? `${adminCopy.shipmentSavedEmailFailed || "履约状态已更新，但邮件未发送："}${result.emailError}`
        : result.emailSkipped
          ? "履约状态已更新。相同状态邮件已发送过，本次未重复发送。"
          : "履约状态已更新，客户邮件已处理。"
    );
  } catch (error) {
    showInlineError(errorNode, error.message);
  } finally {
    submit.disabled = false;
  }
});

emailForm?.querySelector("[data-email-template]")?.addEventListener("change", async () => {
  const id = formValue(emailForm, "id");
  const order = state.orders.find((entry) => entry.id === id);
  if (!order) return;
  const note = document.querySelector("[data-email-config-note]");
  note.textContent = state.email.adminCopy?.updatingTemplate || "正在更新邮件模板。";
  note.dataset.mode = "";
  try {
    const data = await loadEmailDraft(order, formValue(emailForm, "templateId"));
    setFormValue(emailForm, "subject", data.draft?.subject || "");
    setFormValue(emailForm, "body", data.draft?.body || "");
    note.textContent = emailConfigText(data.config);
    note.dataset.mode = data.config?.configured ? "ok" : "error";
  } catch (error) {
    note.textContent = error.message;
    note.dataset.mode = "error";
  }
});

emailForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorNode = document.querySelector("[data-email-error]");
  showInlineError(errorNode);
  const submit = emailForm.querySelector("button[type='submit']");
  submit.disabled = true;
  try {
    const id = formValue(emailForm, "id");
    await api(`/orders/${encodeURIComponent(id)}/email`, {
      method: "POST",
      body: {
        templateId: formValue(emailForm, "templateId"),
        to: formValue(emailForm, "to"),
        subject: formValue(emailForm, "subject"),
        body: formValue(emailForm, "body"),
      },
    });
    emailDialog.close();
    await loadData({ quiet: true });
    showToast(state.email.adminCopy?.sent || "邮件已发送，并已记录到操作日志。");
  } catch (error) {
    showInlineError(errorNode, error.message);
  } finally {
    submit.disabled = false;
  }
});

const adminUploader = createAdminUploader({
  api,
  toast: showToast,
});

const adminAi = createAiOptimization({
  api,
  toast: showToast,
  can,
});

[
  ["[data-close-product]", productDialog, productForm],
  ["[data-cancel-product]", productDialog, productForm],
  ["[data-close-inventory]", inventoryDialog, null],
  ["[data-cancel-inventory]", inventoryDialog, null],
  ["[data-close-shipping]", shippingDialog, null],
  ["[data-cancel-shipping]", shippingDialog, null],
  ["[data-close-email]", emailDialog, null],
  ["[data-cancel-email]", emailDialog, null],
].forEach(([selector, dialog, form]) => {
  document.querySelector(selector)?.addEventListener("click", () => {
    if (form && !adminAi.confirmCloseIfDirty(form)) return;
    dialog.close();
  });
});

window.__orbmareAdmin = {
  state,
  api,
  element,
  clear,
  showToast,
  activateSection,
  can,
  loadData,
  renderAll,
  uploader: adminUploader,
  ai: adminAi,
};

async function initialize() {
  try {
    window.__orbmareAdminPlatform?.bindPlatform?.();
    adminUploader.mountAll(document);
    const session = await api("/session");
    if (!session.authenticated) {
      showLogin();
      return;
    }
    showApplication(session);
    await loadData();
  } catch (error) {
    showLogin();
    showInlineError(loginError, error.message);
  }
}

initialize();
