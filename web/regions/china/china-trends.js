const datasetUrl = "/shared/data/china-trends.json?v=20260723";

const grid = document.querySelector("[data-trend-grid]");
const statusList = document.querySelector("[data-source-status]");
const categoryFilters = document.querySelector("[data-trend-category-filters]");
const updatedLabel = document.querySelector("[data-trend-updated]");
const resultLabel = document.querySelector("[data-trend-result]");
const emptyState = document.querySelector("[data-trend-empty]");
const emptyTitle = document.querySelector("[data-trend-empty-title]");
const emptyBody = document.querySelector("[data-trend-empty-body]");
const platformButtons = [...document.querySelectorAll("[data-trend-platform]")];

const state = {
  dataset: null,
  platform: "all",
  category: "all",
};

function createExternalLink(href, label, className = "") {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer nofollow";
  if (className) link.className = className;
  return link;
}

function formatObservedDate(value) {
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function renderSourceStatus() {
  statusList.replaceChildren();
  for (const source of state.dataset.sourceStatus) {
    const item = document.createElement("div");
    item.className = `source-status-item source-status-${source.status}`;

    const heading = document.createElement("div");
    heading.className = "source-status-heading";
    heading.append(createExternalLink(source.accessUrl, source.label));

    const status = document.createElement("strong");
    status.textContent = source.statusLabel;
    heading.append(status);

    const message = document.createElement("p");
    message.textContent = source.message;

    item.append(heading, message);
    statusList.append(item);
  }
}

function renderCategoryFilters() {
  categoryFilters.replaceChildren();
  const options = [{ id: "all", label: "全部分类" }, ...state.dataset.categories];
  for (const category of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "trend-filter";
    button.dataset.category = category.id;
    button.textContent = category.label;
    button.setAttribute("aria-pressed", category.id === state.category ? "true" : "false");
    button.addEventListener("click", () => {
      state.category = category.id;
      for (const sibling of categoryFilters.querySelectorAll("button")) {
        sibling.setAttribute(
          "aria-pressed",
          sibling.dataset.category === state.category ? "true" : "false"
        );
      }
      renderItems();
    });
    categoryFilters.append(button);
  }
}

function updateCategoryCounts() {
  const counts = new Map(state.dataset.categories.map((category) => [category.id, 0]));
  for (const item of state.dataset.items) {
    counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1);
  }
  document.querySelectorAll("[data-trend-category-count]").forEach((node) => {
    const count = counts.get(node.dataset.trendCategoryCount) || 0;
    node.textContent = count ? `已收录 ${count} 条可回查线索` : "暂无可回查线索";
  });
}

function createTrendCard(item) {
  const card = document.createElement("article");
  card.className = "trend-card";

  const visual = document.createElement("div");
  visual.className = "trend-card-visual";
  const image = document.createElement("img");
  image.src = item.image;
  image.alt = `${item.categoryLabel}分类占位图，非商品图片`;
  image.width = 96;
  image.height = 96;
  image.loading = "lazy";
  visual.append(image);

  const body = document.createElement("div");
  body.className = "trend-card-body";

  const meta = document.createElement("div");
  meta.className = "trend-card-meta";
  const platform = document.createElement("span");
  platform.textContent = item.platformLabel;
  const category = document.createElement("span");
  category.textContent = item.categoryLabel;
  const rank = document.createElement("strong");
  rank.textContent = item.rankLabel;
  meta.append(platform, category, rank);

  const title = document.createElement("h3");
  title.append(createExternalLink(item.productUrl, item.title));

  const evidence = document.createElement("dl");
  evidence.className = "trend-evidence";
  const evidenceRow = document.createElement("div");
  const evidenceTerm = document.createElement("dt");
  evidenceTerm.textContent = "热度证据";
  const evidenceValue = document.createElement("dd");
  evidenceValue.textContent = item.popularityEvidence;
  evidenceRow.append(evidenceTerm, evidenceValue);

  const dateRow = document.createElement("div");
  const dateTerm = document.createElement("dt");
  dateTerm.textContent = "观察日期";
  const dateValue = document.createElement("dd");
  dateValue.textContent = formatObservedDate(item.observedAt);
  dateRow.append(dateTerm, dateValue);
  evidence.append(evidenceRow, dateRow);

  const reviewNote = document.createElement("p");
  reviewNote.className = "trend-review-note";
  reviewNote.textContent = item.reviewNote;

  const footer = document.createElement("div");
  footer.className = "trend-card-footer";
  footer.append(createExternalLink(item.sourceUrl, "核验榜单来源", "trend-source-link"));
  const leadOnly = document.createElement("span");
  leadOnly.textContent = "采购线索";
  footer.append(leadOnly);

  body.append(meta, title, evidence, reviewNote, footer);
  card.append(visual, body);
  return card;
}

function visibleItems() {
  return state.dataset.items.filter((item) => {
    const platformMatch = state.platform === "all" || item.platform === state.platform;
    const categoryMatch = state.category === "all" || item.categoryId === state.category;
    return platformMatch && categoryMatch;
  });
}

function renderEmptyState() {
  const source = state.dataset.sourceStatus.find((entry) => entry.platform === state.platform);
  if (source && source.status === "source_access_pending") {
    emptyTitle.textContent = `${source.label}数据源待接入`;
    emptyBody.textContent = source.message;
  } else if (state.category !== "all") {
    const category = state.dataset.categories.find((entry) => entry.id === state.category);
    emptyTitle.textContent = `${category?.label || "该分类"}暂无可回查线索`;
    emptyBody.textContent = "取得官方来源或完成新的人工复核后再发布，不使用未经验证的搜索排序填充。";
  } else {
    emptyTitle.textContent = "暂无符合条件的采购线索";
    emptyBody.textContent = "请切换数据源或分类。";
  }
}

function renderItems() {
  const items = visibleItems();
  grid.replaceChildren(...items.map(createTrendCard));
  grid.setAttribute("aria-busy", "false");
  emptyState.hidden = items.length > 0;
  if (!items.length) renderEmptyState();
  resultLabel.textContent = `当前显示 ${items.length} 条；共 ${state.dataset.items.length} 条已复核线索`;
}

function bindPlatformFilters() {
  for (const button of platformButtons) {
    button.addEventListener("click", () => {
      state.platform = button.dataset.trendPlatform;
      for (const sibling of platformButtons) {
        sibling.setAttribute(
          "aria-pressed",
          sibling.dataset.trendPlatform === state.platform ? "true" : "false"
        );
      }
      renderItems();
    });
  }
}

function showLoadError() {
  grid.replaceChildren();
  grid.setAttribute("aria-busy", "false");
  emptyState.hidden = false;
  emptyTitle.textContent = "趋势数据暂时无法读取";
  emptyBody.textContent = "页面没有使用旧缓存或模拟商品替代。请稍后重试，或联系运营人员检查数据文件。";
  resultLabel.textContent = "数据读取失败";
  updatedLabel.textContent = "状态：未加载";
}

async function init() {
  if (!grid || !statusList || !categoryFilters || !emptyState) return;
  bindPlatformFilters();
  try {
    const response = await fetch(datasetUrl, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.dataset = await response.json();
    updatedLabel.textContent = `快照日期：${formatObservedDate(state.dataset.observedAt)}`;
    renderSourceStatus();
    renderCategoryFilters();
    updateCategoryCounts();
    renderItems();
  } catch (error) {
    console.error("Unable to load China trend leads", error);
    showLoadError();
  }
}

init();
