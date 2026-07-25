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
        <button type="button" class="button button-secondary button-compact" data-ai-batch>AI 优化本页内容</button>
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
