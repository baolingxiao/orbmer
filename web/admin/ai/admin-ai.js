/**
 * Orbmare Admin — reusable AI content optimization UI.
 * Server-only OpenAI; preview → accept → form state; user still clicks Save.
 */
import { escapeHtml, hashValue, renderDiffHtml } from "./diff.js";

const OBJECTIVES = [
  { value: "luxury_editorial", label: "奢侈品编辑风格" },
  { value: "buyer_store", label: "国际买手店风格" },
  { value: "fashion_magazine", label: "时尚杂志风格" },
  { value: "concise_professional", label: "简洁专业" },
  { value: "conversion", label: "提高商品转化" },
  { value: "seo", label: "SEO 优化" },
  { value: "translate_en", label: "翻译为国际英文" },
  { value: "translate_zh", label: "翻译为自然中文" },
  { value: "shorten", label: "缩短内容" },
  { value: "expand", label: "扩展内容" },
  { value: "custom", label: "自定义要求" },
];

const TONES = [
  { value: "restrained", label: "克制" },
  { value: "editorial", label: "编辑感" },
  { value: "authoritative", label: "权威" },
  { value: "warm", label: "温暖" },
  { value: "rational", label: "理性" },
  { value: "poetic", label: "诗意但不过度" },
  { value: "commercial", label: "商业转化" },
  { value: "minimal", label: "极简" },
];

const LENGTHS = [
  { value: "shorter", label: "更短" },
  { value: "similar", label: "保持接近原长度" },
  { value: "longer", label: "更完整" },
];

const CONTEXT_MODES = [
  { value: "field_only", label: "仅使用当前字段" },
  { value: "page_fields", label: "使用当前页面全部字段" },
  { value: "related", label: "使用关联字段信息" },
  { value: "brand_guide", label: "使用 Orbmare 品牌写作规范" },
];

const LOADING_STAGES = [
  "正在整理当前内容",
  "正在优化语言与结构",
  "正在检查中英文一致性",
  "正在生成预览",
];

const EXTRACT_LOADING_STAGES = [
  "正在读取商品截图",
  "正在识别价格、材料与尺寸",
  "正在整理中英文商品信息",
  "正在生成待审核表单草稿",
];

const PRODUCT_EXTRACT_FIELDS = [
  ["id", "商品 ID"],
  ["channel", "前台渠道"],
  ["productType", "商品种类"],
  ["editorialCountry", "国家馆"],
  ["editorialStatus", "策展位置"],
  ["collection", "商品系列"],
  ["price", "基础价格"],
  ["compareAtPrice", "对比价"],
  ["zhName", "中文名称"],
  ["enName", "英文名称"],
  ["zhDesc", "中文说明"],
  ["enDesc", "英文说明"],
  ["materialZh", "材料（中）"],
  ["material", "材料"],
  ["storyZh", "中文故事"],
  ["story", "英文故事"],
  ["craftZh", "工艺（中）"],
  ["craft", "工艺（英）"],
  ["designerNameZh", "设计师（中）"],
  ["designerName", "设计师（英）"],
  ["studioZh", "工作室（中）"],
  ["studio", "工作室（英）"],
  ["originCountry", "发货/来源国家"],
  ["dimensionUnit", "尺寸单位"],
  ["dimensionWeightUnit", "重量单位"],
  ["dimensionLength", "长"],
  ["dimensionWidth", "宽"],
  ["dimensionHeight", "高"],
  ["dimensionDepth", "深"],
  ["dimensionDiameter", "直径"],
  ["dimensionWeight", "重量"],
  ["dimensions", "尺寸摘要"],
  ["imageSource", "图片来源说明"],
  ["safetyWarning", "安全提示"],
  ["seoTitle", "SEO 标题"],
  ["seoDescription", "SEO 描述"],
];

function optionsHtml(list) {
  return list.map((row) => `<option value="${row.value}">${row.label}</option>`).join("");
}

function sparklesSvg() {
  return `<svg class="ai-sparkles" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2.5l1.1 4.2L17 7.8l-3.9 1.1L12 13l-1.1-4.1L7 7.8l3.9-1.1L12 2.5zm6.5 8.2l.7 2.6 2.6.7-2.6.7-.7 2.6-.7-2.6-2.6-.7 2.6-.7.7-2.6zM6.2 14.2l.8 3 3 .8-3 .8-.8 3-.8-3-3-.8 3-.8.8-3z"/></svg>`;
}

/**
 * @param {{ api: Function, toast: Function, can: Function }} deps
 */
export function createAiOptimization(deps) {
  const { api, toast, can } = deps;
  let meta = null;
  let panel = null;
  let stageTimer = null;
  let abortController = null;
  let extractPanel = null;
  const undoByForm = new WeakMap();
  const mountedForms = new WeakSet();

  function ensurePanel() {
    if (panel) return panel;
    panel = document.querySelector("[data-ai-optimize-dialog]");
    if (!panel) {
      panel = document.createElement("dialog");
      panel.className = "ops-dialog ai-optimize-dialog";
      panel.setAttribute("data-ai-optimize-dialog", "");
      panel.innerHTML = `
        <form method="dialog" class="dialog-shell ai-panel-shell" data-ai-panel-form>
          <header class="dialog-header">
            <div>
              <p class="section-label">AI 内容优化</p>
              <h2 data-ai-panel-title>优化字段</h2>
            </div>
            <button class="dialog-close" type="button" data-ai-panel-close aria-label="关闭">关闭</button>
          </header>
          <div class="dialog-body ai-panel-body">
            <div class="ai-panel-controls" data-ai-controls>
              <div class="form-grid">
                <div class="field">
                  <label>优化目标</label>
                  <select name="objective">${optionsHtml(OBJECTIVES)}</select>
                </div>
                <div class="field">
                  <label>语气</label>
                  <select name="tone">${optionsHtml(TONES)}</select>
                </div>
                <div class="field">
                  <label>长度</label>
                  <select name="length">${optionsHtml(LENGTHS)}</select>
                </div>
                <div class="field">
                  <label>模型</label>
                  <select name="modelTier">
                    <option value="standard">标准</option>
                    <option value="premium">高级</option>
                  </select>
                </div>
                <div class="field field-span-2">
                  <label>上下文</label>
                  <select name="contextMode">${optionsHtml(CONTEXT_MODES)}</select>
                </div>
                <div class="field field-span-2">
                  <label>额外要求</label>
                  <textarea name="customInstruction" rows="3" maxlength="2000" placeholder="例如：减少网络流行词；不要虚构事实；英文更接近国际时尚杂志"></textarea>
                </div>
              </div>
            </div>
            <div class="ai-loading" data-ai-loading hidden>
              <div class="ai-spinner" aria-hidden="true"></div>
              <p data-ai-loading-text>正在整理当前内容</p>
            </div>
            <div class="ai-result" data-ai-result hidden></div>
            <p class="form-error" data-ai-error role="alert" hidden></p>
          </div>
          <footer class="dialog-footer ai-panel-footer">
            <button class="button button-secondary" type="button" data-ai-discard>放弃</button>
            <button class="button button-secondary" type="button" data-ai-regenerate hidden>重新生成</button>
            <button class="button button-secondary" type="button" data-ai-copy hidden>复制结果</button>
            <button class="button button-secondary" type="button" data-ai-accept-selected hidden>接受所选</button>
            <button class="button button-primary" type="button" data-ai-run>开始优化</button>
            <button class="button button-primary" type="button" data-ai-accept-all hidden>接受全部</button>
          </footer>
        </form>
      `;
      document.body.appendChild(panel);
      bindPanelEvents(panel);
    }
    return panel;
  }

  function bindPanelEvents(dialog) {
    dialog.querySelector("[data-ai-panel-close]")?.addEventListener("click", () => closePanel(true));
    dialog.querySelector("[data-ai-discard]")?.addEventListener("click", () => closePanel(true));
    dialog.querySelector("[data-ai-run]")?.addEventListener("click", () => runOptimization());
    dialog.querySelector("[data-ai-regenerate]")?.addEventListener("click", () => runOptimization());
    dialog.querySelector("[data-ai-copy]")?.addEventListener("click", copyResult);
    dialog.querySelector("[data-ai-accept-all]")?.addEventListener("click", () => acceptResult(true));
    dialog.querySelector("[data-ai-accept-selected]")?.addEventListener("click", () => acceptResult(false));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closePanel(true);
    });
  }

  function ensureExtractPanel() {
    if (extractPanel) return extractPanel;
    extractPanel = document.querySelector("[data-ai-product-extract-dialog]");
    if (!extractPanel) {
      extractPanel = document.createElement("dialog");
      extractPanel.className = "ops-dialog ai-optimize-dialog ai-extract-dialog";
      extractPanel.setAttribute("data-ai-product-extract-dialog", "");
      extractPanel.innerHTML = `
        <form method="dialog" class="dialog-shell ai-panel-shell" data-ai-extract-form>
          <header class="dialog-header">
            <div>
              <p class="section-label">AI 商品信息提取</p>
              <h2>上传截图，自动填入商品表单</h2>
            </div>
            <button class="dialog-close" type="button" data-ai-extract-close aria-label="关闭">关闭</button>
          </header>
          <div class="dialog-body ai-panel-body">
            <div class="ai-extract-intro">
              <strong>适合商品搬运与资料录入。</strong>
              <span>上传商品截图，AI 会识别商品名、价格、材料、国家、尺寸、尺码和说明。结果只会填入当前表单，仍需员工审核后保存 / 发布。</span>
            </div>
            <div class="form-grid" data-ai-extract-controls>
              <div class="field field-span-2">
                <label>商品截图（建议 10–30 张）</label>
                <div class="entity-image-drop entity-image-drop-multi ai-extract-drop" data-ai-extract-drop tabindex="0" role="button">
                  <div class="upload-grid" data-ai-extract-grid hidden></div>
                  <div class="entity-image-drop-empty" data-ai-extract-empty>
                    <strong>拖拽截图到这里，或点击选择本地文件</strong>
                    <span>支持 JPG / PNG / WebP / GIF；最多 30 张。截图越完整，识别越可靠。</span>
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden data-ai-extract-files />
                </div>
                <small data-ai-extract-count>已选择 0 张。建议包含商品标题、价格、详情、尺寸、材质、物流/来源截图。</small>
              </div>
              <div class="field">
                <label>模型</label>
                <select name="modelTier">
                  <option value="standard">标准</option>
                  <option value="premium">高级</option>
                </select>
              </div>
              <div class="field field-span-2">
                <label>补充说明</label>
                <textarea name="customInstruction" rows="3" maxlength="2000" placeholder="例如：这是服装商品；请重点识别尺码表；不要把促销价当原价。"></textarea>
              </div>
            </div>
            <div class="ai-loading" data-ai-extract-loading hidden>
              <div class="ai-spinner" aria-hidden="true"></div>
              <p data-ai-extract-loading-text>正在读取商品截图</p>
            </div>
            <div class="ai-result" data-ai-extract-result hidden></div>
            <p class="form-error" data-ai-extract-error role="alert" hidden></p>
          </div>
          <footer class="dialog-footer ai-panel-footer">
            <button class="button button-secondary" type="button" data-ai-extract-discard>放弃</button>
            <button class="button button-secondary" type="button" data-ai-extract-regenerate hidden>重新提取</button>
            <button class="button button-primary" type="button" data-ai-extract-run>开始提取</button>
            <button class="button button-primary" type="button" data-ai-extract-apply hidden>填入当前商品表单</button>
          </footer>
        </form>
      `;
      document.body.appendChild(extractPanel);
      bindExtractEvents(extractPanel);
    }
    return extractPanel;
  }

  function bindExtractEvents(dialog) {
    const fileInput = dialog.querySelector("[data-ai-extract-files]");
    const drop = dialog.querySelector("[data-ai-extract-drop]");
    dialog.querySelector("[data-ai-extract-close]")?.addEventListener("click", () => closeExtractPanel(true));
    dialog.querySelector("[data-ai-extract-discard]")?.addEventListener("click", () => closeExtractPanel(true));
    dialog.querySelector("[data-ai-extract-run]")?.addEventListener("click", () => runProductExtraction());
    dialog.querySelector("[data-ai-extract-regenerate]")?.addEventListener("click", () => runProductExtraction());
    dialog.querySelector("[data-ai-extract-apply]")?.addEventListener("click", applyProductExtraction);
    drop?.addEventListener("click", () => fileInput?.click());
    drop?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput?.click();
      }
    });
    fileInput?.addEventListener("change", () => refreshExtractFiles(dialog));
    ["dragenter", "dragover"].forEach((type) => {
      drop?.addEventListener(type, (event) => {
        event.preventDefault();
        drop.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((type) => {
      drop?.addEventListener(type, (event) => {
        event.preventDefault();
        drop.classList.remove("is-dragging");
      });
    });
    drop?.addEventListener("drop", (event) => {
      const files = [...(event.dataTransfer?.files || [])].filter((file) =>
        /^image\/(jpeg|png|webp|gif)$/i.test(file.type)
      );
      if (!files.length || !fileInput) return;
      const transfer = new DataTransfer();
      files.slice(0, 30).forEach((file) => transfer.items.add(file));
      fileInput.files = transfer.files;
      refreshExtractFiles(dialog);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeExtractPanel(true);
    });
  }

  async function loadMeta({ force = false } = {}) {
    if (meta && !force) return meta;
    if (!can("ai_content_optimize")) {
      return { enabled: false, registry: {} };
    }
    try {
      meta = await api("/ai/registry");
    } catch {
      meta = { enabled: false, registry: {} };
    }
    return meta;
  }

  function fieldList(entityType) {
    return meta?.registry?.[entityType] || [];
  }

  function getControlValue(form, name) {
    const el = form?.elements?.namedItem?.(name);
    if (!el) return "";
    if (el instanceof RadioNodeList) return String(el.value || "");
    return String(el.value || "");
  }

  function setControlValue(form, name, value) {
    const el = form?.elements?.namedItem?.(name);
    if (!el || el instanceof RadioNodeList) return false;
    el.value = value == null ? "" : String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function selectedExtractFiles() {
    const input = extractPanel?.querySelector("[data-ai-extract-files]");
    return [...(input?.files || [])];
  }

  function refreshExtractFiles(dialog = extractPanel) {
    if (!dialog) return;
    const files = selectedExtractFiles();
    const grid = dialog.querySelector("[data-ai-extract-grid]");
    const empty = dialog.querySelector("[data-ai-extract-empty]");
    const count = dialog.querySelector("[data-ai-extract-count]");
    if (count) {
      count.textContent = `已选择 ${files.length} 张。建议包含商品标题、价格、详情、尺寸、材质、物流/来源截图。`;
    }
    if (!grid) return;
    grid.hidden = files.length === 0;
    if (empty) empty.hidden = files.length > 0;
    grid.innerHTML = files
      .slice(0, 30)
      .map((file, index) => {
        const url = URL.createObjectURL(file);
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        return `<figure class="upload-thumb"><img src="${url}" alt="截图 ${index + 1}" /><figcaption>${escapeHtml(file.name || `截图 ${index + 1}`)}</figcaption></figure>`;
      })
      .join("");
  }

  function openExtractPanel(form) {
    ensureExtractPanel();
    const panelForm = extractPanel.querySelector("[data-ai-extract-form]");
    panelForm.reset();
    const fileInput = extractPanel.querySelector("[data-ai-extract-files]");
    if (fileInput) fileInput.value = "";
    extractPanel.querySelector("[data-ai-extract-result]").hidden = true;
    extractPanel.querySelector("[data-ai-extract-result]").innerHTML = "";
    extractPanel.querySelector("[data-ai-extract-controls]").hidden = false;
    showExtractError("");
    setExtractLoading(false);
    setExtractFooterMode("configure");
    extractPanel.__aiExtractState = { form, result: null };
    if (!can("ai_content_use_premium_model")) {
      const premium = panelForm.elements.namedItem("modelTier")?.querySelector('option[value="premium"]');
      if (premium) premium.disabled = true;
    }
    refreshExtractFiles(extractPanel);
    extractPanel.showModal();
  }

  function closeExtractPanel(abort = false) {
    if (abort && abortController) abortController.abort();
    clearInterval(stageTimer);
    setExtractLoading(false);
    extractPanel?.close();
  }

  function showExtractError(message) {
    const node = extractPanel?.querySelector("[data-ai-extract-error]");
    if (!node) return;
    node.hidden = !message;
    node.textContent = message || "";
  }

  function setExtractLoading(active) {
    const loading = extractPanel?.querySelector("[data-ai-extract-loading]");
    const controls = extractPanel?.querySelector("[data-ai-extract-controls]");
    const result = extractPanel?.querySelector("[data-ai-extract-result]");
    const text = extractPanel?.querySelector("[data-ai-extract-loading-text]");
    if (!loading) return;
    loading.hidden = !active;
    if (controls) controls.hidden = active;
    if (result && active) result.hidden = true;
    clearInterval(stageTimer);
    if (!active) return;
    let idx = 0;
    if (text) text.textContent = EXTRACT_LOADING_STAGES[0];
    stageTimer = setInterval(() => {
      idx = Math.min(idx + 1, EXTRACT_LOADING_STAGES.length - 1);
      if (text) text.textContent = EXTRACT_LOADING_STAGES[idx];
    }, 2400);
  }

  function setExtractFooterMode(mode) {
    const run = extractPanel.querySelector("[data-ai-extract-run]");
    const regen = extractPanel.querySelector("[data-ai-extract-regenerate]");
    const apply = extractPanel.querySelector("[data-ai-extract-apply]");
    if (mode === "result") {
      run.hidden = true;
      regen.hidden = false;
      apply.hidden = false;
    } else {
      run.hidden = false;
      regen.hidden = true;
      apply.hidden = true;
    }
  }

  async function runProductExtraction() {
    const state = extractPanel?.__aiExtractState;
    if (!state?.form) return;
    const files = selectedExtractFiles();
    if (!files.length) {
      showExtractError("请先上传商品截图。建议 10–30 张，至少包含标题、价格、详情和尺寸页。");
      return;
    }
    if (files.length > 30) {
      showExtractError("最多一次上传 30 张商品截图。");
      return;
    }
    const panelForm = extractPanel.querySelector("[data-ai-extract-form]");
    const modelTier = panelForm.elements.namedItem("modelTier").value;
    if (modelTier === "premium" && !can("ai_content_use_premium_model")) {
      toast("当前账号无高级模型权限", true);
      return;
    }
    const body = new FormData();
    files.forEach((file) => body.append("screenshots", file));
    body.append("modelTier", modelTier);
    body.append("customInstruction", panelForm.elements.namedItem("customInstruction").value || "");
    body.append("entityId", getControlValue(state.form, "id") || "");

    showExtractError("");
    setExtractLoading(true);
    setExtractFooterMode("configure");
    abortController = new AbortController();
    try {
      const data = await api("/ai/extract-product", { method: "POST", body, isFormData: true });
      if (abortController.signal.aborted) return;
      state.result = data.result;
      state.requestId = data.requestId;
      renderExtractResult(state);
      setExtractFooterMode("result");
      toast("商品信息草稿已提取，请先审核再填入。");
    } catch (error) {
      if (abortController.signal.aborted) return;
      showExtractError(error.message || "AI 提取失败，请稍后重试。");
      toast(error.message || "AI 提取失败。", true);
    } finally {
      setExtractLoading(false);
      abortController = null;
    }
  }

  function renderExtractResult(state) {
    const box = extractPanel.querySelector("[data-ai-extract-result]");
    const controls = extractPanel.querySelector("[data-ai-extract-controls]");
    const result = state.result || {};
    const fields = result.fields || {};
    const attrs = result.productAttributes || {};
    const nonEmptyFields = PRODUCT_EXTRACT_FIELDS.filter(([name]) => String(fields[name] ?? "").trim());
    const attrRows = Object.entries(attrs).filter(([key, value]) => {
      if (key === "sizeOptions") return Array.isArray(value) && value.length;
      return String(value ?? "").trim();
    });
    controls.hidden = true;
    box.hidden = false;
    box.innerHTML = `
      <div class="ai-extract-review-note">
        <strong>请先审核。</strong>
        <span>AI 已把截图整理成商品草稿，但价格、材质、尺寸和来源仍需员工确认。填入后不会自动保存，也不会自动发布。</span>
      </div>
      ${
        (result.warnings || []).length || (result.reviewNotes || []).length || (result.missingFields || []).length
          ? `<div class="ai-warnings"><strong>待核实</strong><ul>${[
              ...(result.warnings || []),
              ...(result.reviewNotes || []),
              ...(result.missingFields || []).map((field) => `缺少字段：${field}`),
            ].map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
          : ""
      }
      <div class="ai-result-list">
        <article class="ai-result-card">
          <header class="ai-result-card-head"><strong>可填入字段</strong><span>${nonEmptyFields.length} 项</span></header>
          <div class="ai-extract-field-list">
            ${nonEmptyFields
              .map(([name, label]) => `
                <label class="ai-extract-field-row">
                  <input type="checkbox" checked data-ai-extract-field value="${escapeHtml(name)}" />
                  <span>${escapeHtml(label)}</span>
                  <code>${escapeHtml(String(fields[name] ?? ""))}</code>
                </label>
              `)
              .join("") || "<p class='muted'>没有识别到可填入字段。</p>"}
          </div>
        </article>
        ${
          attrRows.length
            ? `<article class="ai-result-card">
                <header class="ai-result-card-head">
                  <label class="ai-result-check">
                    <input type="checkbox" checked data-ai-extract-attributes />
                    <strong>品类专属数据</strong>
                  </label>
                  <span>${attrRows.length} 组</span>
                </header>
                <pre class="ai-compare-text">${escapeHtml(JSON.stringify(attrs, null, 2))}</pre>
              </article>`
            : ""
        }
        ${
          (result.evidence || []).length
            ? `<article class="ai-result-card">
                <header class="ai-result-card-head"><strong>识别依据</strong><span>${result.evidence.length} 条</span></header>
                <ul class="ai-summary">${result.evidence
                  .map((row) => `<li>${escapeHtml(row.field)}：${escapeHtml(row.value)} · 置信度 ${Math.round(Number(row.confidence || 0) * 100)}%</li>`)
                  .join("")}</ul>
              </article>`
            : ""
        }
      </div>
    `;
  }

  function applyProductExtraction() {
    const state = extractPanel?.__aiExtractState;
    const result = state?.result;
    if (!state?.form || !result) return;
    const selected = new Set(
      [...extractPanel.querySelectorAll("[data-ai-extract-field]")]
        .filter((input) => input.checked)
        .map((input) => input.value)
    );
    const snapshots = [];
    const fields = result.fields || {};
    const productType = fields.productType || "";
    if (selected.has("productType") && productType) {
      snapshots.push({ field: "productType", value: getControlValue(state.form, "productType") });
      setControlValue(state.form, "productType", productType);
    }
    const shouldApplyAttrs = Boolean(extractPanel.querySelector("[data-ai-extract-attributes]")?.checked);
    if (shouldApplyAttrs && result.productAttributes && Object.keys(result.productAttributes).length) {
      state.form.dataset.productAttributes = JSON.stringify(result.productAttributes);
      const typeEl = state.form.elements.namedItem("productType");
      typeEl?.dispatchEvent(new Event("change", { bubbles: true }));
      requestAnimationFrame(() => {
        Object.entries(result.productAttributes || {}).forEach(([key, value]) => {
          if (key === "sizeOptions") return;
          setControlValue(state.form, `attr_${key}`, value);
        });
      });
    }
    for (const [field] of PRODUCT_EXTRACT_FIELDS) {
      if (!selected.has(field) || field === "productType") continue;
      const value = fields[field];
      if (value == null || String(value).trim() === "") continue;
      snapshots.push({ field, value: getControlValue(state.form, field) });
      setControlValue(state.form, field, value);
    }
    if (snapshots.length) pushUndo(state.form, snapshots);
    markDirty(state.form, true);
    toast("已填入商品表单，请审核后保存。");
    closeExtractPanel(false);
  }

  function collectFormContext(form, relatedFields = []) {
    const context = {};
    const names = relatedFields.length
      ? relatedFields
      : [...form.querySelectorAll("input[name], textarea[name], select[name]")].map(
          (node) => node.name
        );
    names.forEach((name) => {
      if (!name) return;
      const value = getControlValue(form, name).trim();
      if (value) context[name] = value;
    });
    return context;
  }

  function collectAiFields(form, entityType) {
    const fields = {};
    fieldList(entityType).forEach((cfg) => {
      const el = form.elements?.namedItem?.(cfg.field);
      if (!el || el instanceof RadioNodeList) return;
      fields[cfg.field] = String(el.value || "");
    });
    return fields;
  }

  function markDirty(form, dirty = true) {
    if (!form) return;
    form.dataset.aiDirty = dirty ? "1" : "";
    const badge = form.querySelector("[data-ai-dirty-badge]");
    if (badge) badge.hidden = !dirty;
  }

  function pushUndo(form, snapshots) {
    const stack = undoByForm.get(form) || [];
    stack.push(snapshots);
    undoByForm.set(form, stack);
    const undoBtn = form.querySelector("[data-ai-undo]");
    if (undoBtn) undoBtn.hidden = stack.length === 0;
  }

  function undoLast(form) {
    const stack = undoByForm.get(form) || [];
    const last = stack.pop();
    undoByForm.set(form, stack);
    if (!last?.length) {
      toast("没有可撤销的 AI 替换。", true);
      return;
    }
    last.forEach((row) => setControlValue(form, row.field, row.value));
    const undoBtn = form.querySelector("[data-ai-undo]");
    if (undoBtn) undoBtn.hidden = stack.length === 0;
    markDirty(form, true);
    toast("已撤销 AI 替换");
  }

  function wrapLabel(fieldEl, cfg, onClick) {
    const container = fieldEl.closest(".field");
    if (!container) return;
    let label = container.querySelector(":scope > label");
    if (!label) return;
    if (label.querySelector("[data-ai-field-btn]")) return;
    label.classList.add("ai-field-label");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ai-field-btn";
    btn.dataset.aiFieldBtn = cfg.field;
    btn.title = cfg.nameSafe ? "AI 翻译 / 规范化（不随意改正式名称）" : "AI 优化";
    btn.innerHTML = `${sparklesSvg()}<span>AI 优化</span>`;
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      onClick(cfg);
    });
    label.appendChild(btn);
  }

  function ensureToolbar(form, entityType) {
    let bar = form.querySelector("[data-ai-toolbar]");
    if (!bar) {
      const footer =
        form.querySelector(".dialog-footer") || form.querySelector(".dialog-actions") || form;
      bar = document.createElement("div");
      bar.className = "ai-toolbar";
      bar.dataset.aiToolbar = "1";
      bar.innerHTML = `
        <span class="ai-dirty-badge" data-ai-dirty-badge hidden>未保存更改（含 AI）</span>
        <button type="button" class="button button-secondary button-compact" data-ai-undo hidden>撤销 AI 替换</button>
        ${
          entityType === "product"
            ? `<button type="button" class="button button-primary button-compact" data-ai-product-extract>AI 提取商品信息</button>
               <button type="button" class="button button-secondary button-compact" data-ai-batch>优化本页文案</button>`
            : `<button type="button" class="button button-secondary button-compact" data-ai-batch>AI 优化本页内容</button>`
        }
      `;
      if (
        footer.classList?.contains("dialog-footer") ||
        footer.classList?.contains("dialog-actions")
      ) {
        footer.insertBefore(bar, footer.firstChild);
      } else {
        form.prepend(bar);
      }
      bar.querySelector("[data-ai-undo]")?.addEventListener("click", () => undoLast(form));
      bar.querySelector("[data-ai-product-extract]")?.addEventListener("click", () => {
        openExtractPanel(form);
      });
      bar.querySelector("[data-ai-batch]")?.addEventListener("click", () => {
        openPanel({
          mode: "full_form",
          entityType,
          form,
          title: "AI 优化本页内容",
        });
      });
    }
    const philosophyLegend = [...form.querySelectorAll("fieldset legend")].find((node) =>
      /设计哲学/.test(node.textContent || "")
    );
    if (philosophyLegend && !philosophyLegend.querySelector("[data-ai-philosophy-batch]")) {
      philosophyLegend.classList.add("ai-fieldset-legend");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ai-field-btn";
      btn.dataset.aiPhilosophyBatch = "1";
      btn.innerHTML = `${sparklesSvg()}<span>统一优化全部哲学</span>`;
      btn.addEventListener("click", () => {
        openPanel({
          mode: "full_form",
          entityType,
          form,
          title: "统一优化设计哲学",
          fieldFilter: (name) => /^philosophy\d/.test(name),
          objectiveHint: "luxury_editorial",
        });
      });
      philosophyLegend.appendChild(btn);
    }
  }

  function pairTranslateButton(form, cfg, entityType) {
    if (!cfg.language || cfg.language === "auto") return;
    const container = form.elements.namedItem(cfg.field)?.closest?.(".field");
    if (!container || container.querySelector("[data-ai-translate-btn]")) return;
    const pair =
      cfg.language === "zh"
        ? cfg.relatedFields?.find((name) => /En$/.test(name) || (!/Zh$/.test(name) && name !== cfg.field))
        : cfg.relatedFields?.find((name) => /Zh$/.test(name));
    // Prefer explicit opposite language sibling by naming convention
    let targetField = null;
    if (cfg.field.endsWith("Zh")) targetField = cfg.field.slice(0, -2) || null;
    else if (!cfg.field.endsWith("Zh")) {
      const candidate = `${cfg.field}Zh`;
      if (form.elements.namedItem(candidate)) targetField = candidate;
    }
    if (!targetField && pair && form.elements.namedItem(pair)) targetField = pair;
    if (!targetField) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ai-translate-btn";
    btn.dataset.aiTranslateBtn = "1";
    btn.textContent = cfg.language === "zh" ? "生成对应英文" : "生成对应中文";
    btn.addEventListener("click", () => {
      const sourceValue = getControlValue(form, cfg.field);
      openPanel({
        mode: "translate_pair",
        entityType,
        form,
        field: targetField,
        contentType: cfg.language === "zh" ? "translation_zh_to_en" : "translation_en_to_zh",
        sourceLanguage: cfg.language,
        targetLanguage: cfg.language === "zh" ? "en" : "zh",
        currentValue: sourceValue,
        title: btn.textContent,
        objectiveHint: cfg.language === "zh" ? "translate_en" : "translate_zh",
        translateFromField: cfg.field,
      });
    });
    container.appendChild(btn);
  }

  async function mountForm(form, options = {}) {
    if (!form) return;
    const entityType = options.entityType || form.dataset.entityType || form.dataset.aiEntityType;
    if (!entityType) return;
    form.dataset.aiEntityType = entityType;
    if (typeof options.getEntityId === "function") {
      form.__aiGetEntityId = options.getEntityId;
    }
    const loaded = await loadMeta();
    if (!can("ai_content_optimize")) {
      form.querySelectorAll("[data-ai-toolbar], [data-ai-field-btn], [data-ai-translate-btn]").forEach(
        (node) => {
          node.hidden = true;
        }
      );
      return;
    }
    const aiReady = loaded?.enabled !== false;
    const disableReason = aiReady ? "" : "服务端未配置 OPENAI_API_KEY / OPENAI_DEFAULT_MODEL";
    ensurePanel();
    ensureToolbar(form, entityType);
    const batchBtn = form.querySelector("[data-ai-batch]");
    if (batchBtn) {
      batchBtn.disabled = !aiReady;
      batchBtn.title = disableReason || "结合本页字段批量优化";
    }
    const extractBtn = form.querySelector("[data-ai-product-extract]");
    if (extractBtn) {
      extractBtn.disabled = !aiReady;
      extractBtn.title = disableReason || "上传商品截图，AI 提取信息并填入表单";
    }
    if (entityType === "product") {
      if (!mountedForms.has(form)) {
        mountedForms.add(form);
        form.addEventListener("input", () => {
          /* dirty from user edits is handled by accept; keep undo available */
        });
      }
      return;
    }
    fieldList(entityType).forEach((cfg) => {
      const el = form.elements?.namedItem?.(cfg.field);
      if (!el || el instanceof RadioNodeList) return;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      if (el.type === "hidden" || el.type === "number" || el.type === "url" || el.type === "password") {
        return;
      }
      wrapLabel(el, cfg, (fieldCfg) => {
        if (!aiReady) {
          toast(disableReason, true);
          return;
        }
        openPanel({
          mode: "single_field",
          entityType,
          form,
          field: fieldCfg.field,
          contentType: fieldCfg.contentType,
          sourceLanguage: fieldCfg.language === "auto" ? "auto" : fieldCfg.language,
          targetLanguage: fieldCfg.language === "auto" ? "auto" : fieldCfg.language,
          currentValue: getControlValue(form, fieldCfg.field),
          title: `优化：${fieldCfg.label}`,
          relatedFields: fieldCfg.relatedFields || [],
          nameSafe: fieldCfg.nameSafe,
        });
      });
      const fieldBtn = el.closest(".field")?.querySelector("[data-ai-field-btn]");
      if (fieldBtn) {
        fieldBtn.disabled = !aiReady;
        if (!aiReady) fieldBtn.title = disableReason;
      }
      pairTranslateButton(form, cfg, entityType);
    });
    if (!mountedForms.has(form)) {
      mountedForms.add(form);
      form.addEventListener("input", () => {
        /* dirty from user edits is handled by accept; keep undo available */
      });
    }
  }

  function panelState() {
    return panel?.__aiState || null;
  }

  function setPanelState(state) {
    if (panel) panel.__aiState = state;
  }

  function showError(message) {
    const node = panel?.querySelector("[data-ai-error]");
    if (!node) return;
    if (!message) {
      node.hidden = true;
      node.textContent = "";
      return;
    }
    node.hidden = false;
    node.textContent = message;
  }

  function setLoading(active) {
    const loading = panel?.querySelector("[data-ai-loading]");
    const controls = panel?.querySelector("[data-ai-controls]");
    const result = panel?.querySelector("[data-ai-result]");
    const text = panel?.querySelector("[data-ai-loading-text]");
    if (!loading) return;
    loading.hidden = !active;
    if (controls) controls.hidden = active;
    if (result && active) result.hidden = true;
    clearInterval(stageTimer);
    if (!active) return;
    let idx = 0;
    if (text) text.textContent = LOADING_STAGES[0];
    stageTimer = setInterval(() => {
      idx = Math.min(idx + 1, LOADING_STAGES.length - 1);
      if (text) text.textContent = LOADING_STAGES[idx];
    }, 2200);
  }

  function setFooterMode(mode) {
    const run = panel.querySelector("[data-ai-run]");
    const regen = panel.querySelector("[data-ai-regenerate]");
    const copy = panel.querySelector("[data-ai-copy]");
    const acceptAll = panel.querySelector("[data-ai-accept-all]");
    const acceptSelected = panel.querySelector("[data-ai-accept-selected]");
    if (mode === "result") {
      run.hidden = true;
      regen.hidden = false;
      copy.hidden = false;
      acceptAll.hidden = false;
      acceptSelected.hidden = false;
    } else {
      run.hidden = false;
      regen.hidden = true;
      copy.hidden = true;
      acceptAll.hidden = true;
      acceptSelected.hidden = true;
    }
  }

  function openPanel(state) {
    ensurePanel();
    const form = panel.querySelector("[data-ai-panel-form]");
    form.elements.namedItem("objective").value = state.objectiveHint || "luxury_editorial";
    form.elements.namedItem("tone").value = "restrained";
    form.elements.namedItem("length").value = "similar";
    form.elements.namedItem("modelTier").value = "standard";
    form.elements.namedItem("contextMode").value =
      state.mode === "full_form" ? "page_fields" : "related";
    form.elements.namedItem("customInstruction").value = state.nameSafe
      ? "仅做翻译或轻微规范化，不得随意改动品牌/产品正式名称。"
      : "";
    panel.querySelector("[data-ai-panel-title]").textContent = state.title || "AI 优化";
    panel.querySelector("[data-ai-result]").hidden = true;
    panel.querySelector("[data-ai-result]").innerHTML = "";
    panel.querySelector("[data-ai-controls]").hidden = false;
    showError("");
    setFooterMode("configure");
    setPanelState({ ...state, result: null, sourceHashes: {} });
    if (!can("ai_content_use_premium_model")) {
      const premium = form.elements.namedItem("modelTier").querySelector('option[value="premium"]');
      if (premium) premium.disabled = true;
    }
    panel.showModal();
    panel.querySelector("[data-ai-run]")?.focus();
  }

  function closePanel(abort = false) {
    if (abort && abortController) abortController.abort();
    clearInterval(stageTimer);
    setLoading(false);
    panel?.close();
  }

  async function runOptimization() {
    const state = panelState();
    if (!state?.form) return;
    const panelForm = panel.querySelector("[data-ai-panel-form]");
    const objective = panelForm.elements.namedItem("objective").value;
    const tone = panelForm.elements.namedItem("tone").value;
    const length = panelForm.elements.namedItem("length").value;
    const modelTier = panelForm.elements.namedItem("modelTier").value;
    const contextMode = panelForm.elements.namedItem("contextMode").value;
    const customInstruction = panelForm.elements.namedItem("customInstruction").value;
    if (modelTier === "premium" && !can("ai_content_use_premium_model")) {
      toast("当前账号无高级模型权限", true);
      return;
    }

    const entityId =
      (typeof state.form.__aiGetEntityId === "function"
        ? state.form.__aiGetEntityId()
        : getControlValue(state.form, "id")) || "";

    let context = {};
    if (contextMode === "page_fields" || state.mode === "full_form") {
      context = collectFormContext(state.form, []);
    } else if (contextMode === "related" || contextMode === "brand_guide") {
      context = collectFormContext(state.form, state.relatedFields || []);
    }
    if (contextMode === "brand_guide") {
      context.__useWritingGuide = true;
    }

    const body = {
      entityType: state.entityType,
      entityId,
      mode: state.mode,
      objective,
      tone,
      length,
      modelTier,
      customInstruction,
      context,
    };

    if (state.mode === "full_form") {
      let fields = collectAiFields(state.form, state.entityType);
      if (typeof state.fieldFilter === "function") {
        fields = Object.fromEntries(
          Object.entries(fields).filter(([name]) => state.fieldFilter(name))
        );
      }
      body.fields = fields;
      body.contentType = "full_entity_consistency";
      body.sourceValueHash = await hashValue(JSON.stringify(fields));
      state.sourceHashes = Object.fromEntries(
        await Promise.all(
          Object.entries(fields).map(async ([field, value]) => [field, await hashValue(value)])
        )
      );
    } else {
      const sourceField = state.translateFromField || state.field;
      const currentValue =
        state.mode === "translate_pair"
          ? getControlValue(state.form, sourceField)
          : getControlValue(state.form, state.field);
      body.field = state.field;
      body.contentType = state.contentType;
      body.sourceLanguage = state.sourceLanguage || "auto";
      body.targetLanguage = state.targetLanguage || state.sourceLanguage || "auto";
      body.currentValue = currentValue;
      body.sourceValueHash = await hashValue(currentValue);
      state.sourceHashes = { [state.field]: await hashValue(getControlValue(state.form, state.field)) };
      if (state.mode === "translate_pair") {
        // Optimize into target field; original shown as source language text
        body.currentValue = currentValue;
      }
    }

    showError("");
    setLoading(true);
    setFooterMode("configure");
    abortController = new AbortController();
    try {
      // admin api() does not expose AbortSignal; fire-and-forget cancel is best-effort via flag
      const data = await api("/ai/optimize", { method: "POST", body });
      if (abortController.signal.aborted) return;
      state.result = data.result;
      state.requestId = data.requestId;
      state.usage = data.usage;
      renderResult(state);
      setFooterMode("result");
      toast("AI 建议已生成");
    } catch (error) {
      if (abortController.signal.aborted) return;
      showError(error.message || "请求失败，请稍后重试");
      toast(error.message || "请求失败，请稍后重试", true);
    } finally {
      setLoading(false);
      abortController = null;
    }
  }

  function renderResult(state) {
    const box = panel.querySelector("[data-ai-result]");
    const controls = panel.querySelector("[data-ai-controls]");
    controls.hidden = true;
    box.hidden = false;
    const rows =
      state.mode === "full_form"
        ? state.result?.fields || []
        : [
            {
              field: state.result?.field || state.field,
              original:
                state.mode === "translate_pair"
                  ? getControlValue(state.form, state.translateFromField || state.field)
                  : state.result?.original || "",
              optimized: state.result?.optimized || "",
              changeSummary: state.result?.changeSummary || [],
              warnings: state.result?.warnings || [],
            },
          ];

    const globalWarnings = [
      ...(state.result?.globalWarnings || []),
      ...(state.result?.consistencyNotes || []).map((note) => `一致性：${note}`),
    ];

    box.innerHTML = `
      ${
        globalWarnings.length
          ? `<div class="ai-warnings"><strong>全局提示</strong><ul>${globalWarnings
              .map((item) => `<li>${escapeHtml(typeof item === "string" ? item : item.message || item)}</li>`)
              .join("")}</ul></div>`
          : ""
      }
      <div class="ai-result-list">
        ${rows
          .map((row, index) => {
            const original = String(row.original ?? "");
            const optimized = String(row.optimized ?? "");
            const delta = optimized.length - original.length;
            const deltaLabel = delta === 0 ? "字数不变" : delta > 0 ? `+${delta} 字` : `${delta} 字`;
            const cfg = fieldList(state.entityType).find((item) => item.field === row.field);
            const warnings = row.warnings || [];
            return `
              <article class="ai-result-card" data-ai-result-row="${index}">
                <header class="ai-result-card-head">
                  <label class="ai-result-check">
                    <input type="checkbox" checked data-ai-select-field value="${escapeHtml(row.field)}" />
                    <strong>${escapeHtml(cfg?.label || row.field)}</strong>
                  </label>
                  <span class="ai-char-delta">${escapeHtml(deltaLabel)}</span>
                </header>
                <div class="ai-compare">
                  <div>
                    <p class="ai-compare-label">原文</p>
                    <pre class="ai-compare-text">${escapeHtml(original) || "（空）"}</pre>
                  </div>
                  <div>
                    <p class="ai-compare-label">AI 建议</p>
                    <pre class="ai-compare-text">${escapeHtml(optimized) || "（空）"}</pre>
                  </div>
                </div>
                <div class="ai-diff-block">
                  <p class="ai-compare-label">差异</p>
                  <div class="ai-diff">${renderDiffHtml(original, optimized)}</div>
                </div>
                ${
                  (row.changeSummary || []).length
                    ? `<ul class="ai-summary">${row.changeSummary
                        .map((item) => `<li>${escapeHtml(item)}</li>`)
                        .join("")}</ul>`
                    : ""
                }
                ${
                  warnings.length
                    ? `<div class="ai-warnings"><strong>风险 / 待核实</strong><ul>${warnings
                        .map(
                          (item) =>
                            `<li><code>${escapeHtml(item.text || "")}</code> — ${escapeHtml(
                              item.message || item.type || ""
                            )}</li>`
                        )
                        .join("")}</ul></div>`
                    : ""
                }
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  async function acceptResult(all) {
    const state = panelState();
    if (!state?.form || !state.result) return;
    const selected = new Set(
      [...panel.querySelectorAll("[data-ai-select-field]")]
        .filter((input) => all || input.checked)
        .map((input) => input.value)
    );
    const rows =
      state.mode === "full_form"
        ? (state.result.fields || []).filter((row) => selected.has(row.field))
        : selected.has(state.result.field || state.field)
          ? [
              {
                field: state.field,
                original: state.result.original,
                optimized: state.result.optimized,
              },
            ]
          : [];
    if (!rows.length) {
      toast("请至少选择一个字段。", true);
      return;
    }

    const conflicts = [];
    for (const row of rows) {
      const current = getControlValue(state.form, row.field);
      const expectedHash = state.sourceHashes?.[row.field];
      if (expectedHash) {
        const nowHash = await hashValue(current);
        // For translate_pair, target field may have been empty / different — only conflict if user edited target after open
        if (state.mode !== "translate_pair" && nowHash !== expectedHash && current !== row.original) {
          conflicts.push(row.field);
        } else if (
          state.mode === "translate_pair" &&
          current &&
          nowHash !== expectedHash &&
          current !== (row.original || "")
        ) {
          conflicts.push(row.field);
        }
      }
    }
    if (conflicts.length) {
      const ok = confirm(
        `以下字段在 AI 生成期间已被修改：\n${conflicts.join(
          ", "
        )}\n\n请比较当前内容与 AI 建议后再选择。是否仍接受所选建议？`
      );
      if (!ok) return;
    }

    const snapshots = rows.map((row) => ({
      field: row.field,
      value: getControlValue(state.form, row.field),
    }));
    rows.forEach((row) => setControlValue(state.form, row.field, row.optimized));
    pushUndo(state.form, snapshots);
    markDirty(state.form, true);
    toast("已应用到表单，尚未保存");
    closePanel(false);
  }

  async function copyResult() {
    const state = panelState();
    if (!state?.result) return;
    const text =
      state.mode === "full_form"
        ? (state.result.fields || [])
            .map((row) => `${row.field}:\n${row.optimized}`)
            .join("\n\n")
        : String(state.result.optimized || "");
    try {
      await navigator.clipboard.writeText(text);
      toast("已复制结果");
    } catch {
      toast("复制失败", true);
    }
  }

  function confirmCloseIfDirty(form) {
    if (form?.dataset?.aiDirty === "1") {
      return confirm("有未保存的 AI 修改，确定关闭？关闭后这些修改将丢失。");
    }
    return true;
  }

  return {
    loadMeta,
    mountForm,
    confirmCloseIfDirty,
    markClean(form) {
      markDirty(form, false);
      undoByForm.set(form, []);
      const undoBtn = form?.querySelector?.("[data-ai-undo]");
      if (undoBtn) undoBtn.hidden = true;
    },
  };
}
