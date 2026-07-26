/**
 * Orbmare Admin — catalog entities, media, team, site content modules.
 * Loaded after admin.js helpers via shared window.__orbmareAdmin bridge.
 */
(function () {
  const bridge = () => window.__orbmareAdmin;
  if (!bridge) return;

  function can(permission) {
    const perms = bridge().state.user?.permissions || [];
    return perms.includes(permission);
  }

  function el(tag, options = {}) {
    return bridge().element(tag, options);
  }

  function clear(node) {
    bridge().clear(node);
  }

  async function api(path, options) {
    return bridge().api(path, options);
  }

  function toast(message, isError) {
    bridge().showToast(message, isError);
  }

  function applyNavPermissions() {
    document.querySelectorAll("[data-requires-permission]").forEach((node) => {
      const needed = String(node.dataset.requiresPermission || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const ok = needed.length === 0 || needed.some((permission) => can(permission));
      node.hidden = !ok;
    });

    const roleLabel = document.querySelector("[data-admin-role]");
    const envLabel = document.querySelector("[data-admin-env]");
    const user = bridge().state.user;
    if (roleLabel && user) {
      const roles = (user.roles || []).map((role) => role.name || role.id).join(" · ");
      roleLabel.textContent = roles || user.role || "admin";
    }
    if (envLabel) {
      envLabel.textContent = bridge().state.environment || "staging";
      envLabel.dataset.env = bridge().state.environment || "staging";
    }

    const siteAiForm = document.querySelector("[data-site-content-form]");
    if (siteAiForm && bridge().ai?.mountForm) {
      siteAiForm.dataset.aiEntityType = "site_content";
      bridge().ai.mountForm(siteAiForm, {
        entityType: "site_content",
        getEntityId: () => "site-content",
      });
    }
  }

  function kindLabel(kind) {
    if (kind === "studio") return "工作室";
    if (kind === "designer") return "设计师";
    if (kind === "brand") return "品牌";
    return kind || "—";
  }

  function formatEntityTime(item) {
    const raw = item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at;
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  }

  const entitySelections = {
    brand: new Set(),
    material: new Set(),
    country: new Set(),
    craft: new Set(),
  };

  const journalStudioState = {
    activeIssueId: "",
    activeBlockId: "",
    selectedBlockIds: new Set(),
    zoom: 92,
    panX: 0,
    panY: 0,
    navigatorCollapsed: false,
    inspectorCollapsed: false,
  };
  let tinaConfigCache = null;
  let tinaConfigLoading = false;
  const JS_CANVAS_GRID = 16;
  const JS_CANVAS_WIDTH = 1280;
  const JS_CANVAS_HEIGHT = 1700;

  const JS_STATUSES = ["draft", "researching", "writing", "layout", "review", "scheduled", "published", "archived"];
  const JS_STATUS_LABELS = {
    draft: "草稿",
    researching: "资料整理",
    writing: "写作中",
    layout: "排版中",
    review: "审核中",
    scheduled: "已排期",
    published: "已发布",
    archived: "已归档",
  };
  const JS_STEPS = ["research", "insight", "outline", "editorial", "images", "layout", "products", "seo", "preview", "publish"];
  const JS_STEP_LABELS = {
    research: "资料",
    insight: "洞察",
    outline: "大纲",
    editorial: "写作",
    images: "图片",
    layout: "画布",
    products: "商品",
    seo: "SEO",
    preview: "预览",
    publish: "发布",
  };
  const JS_CATEGORIES = ["lifestyle", "objects", "materials", "brands", "countries", "craft", "designers"];
  const mediaSelection = new Set();

  function writePermFor(type) {
    return type === "designer" || type === "craft" ? "content.update" : `${type}.write`;
  }

  function syncEntityBulkBar(type) {
    const bar = document.querySelector(`[data-${type}-bulk]`);
    const count = document.querySelector(`[data-${type}-bulk-count]`);
    const button = document.querySelector(`[data-entity-bulk-delete="${type}"]`);
    const selectAll = document.querySelector(`[data-entity-select-all="${type}"]`);
    const selected = entitySelections[type] || new Set();
    const visible = [
      ...document.querySelectorAll(`[data-${type}-table] [data-select-entity]`),
    ];
    const selectedVisible = visible.filter((input) => input.checked);
    const allowed = can(writePermFor(type));
    if (count) count.textContent = `已选 ${selected.size} 项`;
    if (bar) bar.hidden = !allowed;
    if (button) button.disabled = !allowed || selected.size === 0;
    if (selectAll) {
      selectAll.disabled = !allowed;
      selectAll.checked = visible.length > 0 && selectedVisible.length === visible.length;
      selectAll.indeterminate =
        selectedVisible.length > 0 && selectedVisible.length < visible.length;
    }
  }

  function syncMediaBulkBar() {
    const bar = document.querySelector("[data-media-bulk]");
    const count = document.querySelector("[data-media-bulk-count]");
    const button = document.querySelector("[data-media-bulk-delete]");
    const allowed = can("media.delete");
    if (count) count.textContent = `已选 ${mediaSelection.size} 项`;
    if (bar) bar.hidden = !allowed;
    if (button) button.disabled = !allowed || mediaSelection.size === 0;
  }

  function renderEntityTable(type, items) {
    const tbody = document.querySelector(`[data-${type}-table]`);
    const empty = document.querySelector(`[data-${type}-empty]`);
    if (!tbody) return;
    clear(tbody);
    const selected = entitySelections[type] || (entitySelections[type] = new Set());
    const alive = new Set(items.map((item) => item.id));
    [...selected].forEach((id) => {
      if (!alive.has(id)) selected.delete(id);
    });
    if (!items.length) {
      if (empty) empty.hidden = false;
      syncEntityBulkBar(type);
      return;
    }
    if (empty) empty.hidden = true;
    const writePerm = writePermFor(type);
    items.forEach((item) => {
      const tr = el("tr");
      const checkCell = el("td", { className: "col-check" });
      if (can(writePerm)) {
        const check = el("input", { type: "checkbox" });
        check.dataset.selectEntity = item.id;
        check.dataset.entityType = type;
        check.checked = selected.has(item.id);
        check.setAttribute("aria-label", `选择 ${item.id}`);
        checkCell.appendChild(check);
      }
      tr.appendChild(checkCell);
      const nameCell = el("td", { text: item.nameZh || item.nameEn || item.name || item.id });
      tr.appendChild(nameCell);
      if (type === "brand") {
        tr.appendChild(el("td", { text: kindLabel(item.kind) }));
      }
      tr.append(el("td", { text: item.id }), el("td", { text: item.status || "—" }));
      if (type === "brand") {
        tr.appendChild(el("td", { text: item.featured ? "是" : "否" }));
        tr.appendChild(
          el("td", { text: String(Number.isFinite(Number(item.featuredRank)) ? item.featuredRank : 100) })
        );
      }
      const updatedCell = el("td", { text: formatEntityTime(item) });
      const stamp = item?.updatedAt || item?.updated_at || item?.createdAt || "";
      if (stamp) updatedCell.title = String(stamp);
      tr.append(updatedCell);
      const actions = el("td");
      const edit = el("button", {
        className: "button button-secondary button-compact",
        text: "编辑",
        type: "button",
      });
      edit.addEventListener("click", () => openEntityDialog(type, item));
      actions.appendChild(edit);
      if (type === "brand" && can(writePerm)) {
        const featured = Boolean(item.featured);
        const recommend = el("button", {
          className: "button button-secondary button-compact",
          text: featured ? "取消推荐" : "推荐",
          type: "button",
        });
        recommend.addEventListener("click", async () => {
          try {
            await api(`/brands/${encodeURIComponent(item.id)}`, {
              method: "PUT",
              body: { ...item, featured: !featured },
            });
            toast(featured ? "已取消推荐。" : "已设为推荐，将出现在首页与精选页滚动带。");
            await loadPlatformData();
          } catch (error) {
            toast(error.message, true);
          }
        });
        actions.appendChild(recommend);
      }
      if (can(writePerm)) {
        const del = el("button", {
          className: "button button-secondary button-compact",
          text: "删除",
          type: "button",
        });
        del.addEventListener("click", async () => {
          if (!confirm(`确认删除 ${item.id}？将进入删除记录，保留 7 天后永久清除。`)) return;
          try {
            await api(`/${type}s/${encodeURIComponent(item.id)}`, { method: "DELETE" });
            selected.delete(item.id);
            toast("已移入删除记录（保留 7 天）。");
            await loadPlatformData();
          } catch (error) {
            toast(error.message, true);
          }
        });
        actions.appendChild(del);
      }
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
    syncEntityBulkBar(type);
  }

  function linesList(value) {
    return String(value || "")
      .split(/[\n,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function listLines(list) {
    return (Array.isArray(list) ? list : []).filter(Boolean).join("\n");
  }

  function productDisplayName(product) {
    return (
      product?.zh?.name ||
      product?.en?.name ||
      product?.nameZh ||
      product?.nameEn ||
      product?.name ||
      product?.id ||
      ""
    );
  }

  function entityDisplayName(item) {
    return item?.nameZh || item?.nameEn || item?.name || item?.id || "";
  }

  function relationOptions(kind, { excludeId = "" } = {}) {
    const state = bridge().state || {};
    if (kind === "materials") {
      return (state.materials || [])
        .filter((row) => row?.id && !row.deletedAt)
        .map((row) => ({
          id: row.id,
          label: entityDisplayName(row),
          meta: row.status ? `${row.id} · ${row.status}` : row.id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh"));
    }
    if (kind === "products") {
      return (state.products || [])
        .filter((row) => row?.id)
        .map((row) => ({
          id: row.id,
          label: productDisplayName(row),
          meta: [row.id, row.studio || row.material || row.country].filter(Boolean).join(" · "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh"));
    }
    if (kind === "brands") {
      return (state.brands || [])
        .filter((row) => row?.id && row.id !== excludeId && !row.deletedAt)
        .map((row) => ({
          id: row.id,
          label: entityDisplayName(row),
          meta: `${row.id} · ${kindLabel(row.kind)}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "zh"));
    }
    return [];
  }

  function knownRelationIds(kind) {
    return new Set(relationOptions(kind).map((row) => row.id));
  }

  function sanitizeRelationIds(ids, kind) {
    const allowed = knownRelationIds(kind);
    // If the catalog has not loaded yet, keep values to avoid wiping on race.
    if (!allowed.size) return ids;
    return ids.filter((id) => allowed.has(id));
  }

  function readPickerIds(root) {
    const target = root.querySelector("textarea[name]");
    return linesList(target?.value || "");
  }

  function writePickerIds(root, ids) {
    const target = root.querySelector("textarea[name]");
    const max = Number(root.getAttribute("data-relation-max") || 0) || 0;
    const next = max > 0 ? ids.slice(0, max) : ids;
    if (target) {
      target.value = listLines(next);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return next;
  }

  function renderRelationPicker(root, { excludeId = "" } = {}) {
    if (!root) return;
    const kind = root.getAttribute("data-relation-kind");
    const list = root.querySelector("[data-relation-list]");
    const selectedBox = root.querySelector("[data-relation-selected]");
    const filterInput = root.querySelector("[data-relation-filter]");
    const hint = root.querySelector("[data-relation-hint]");
    const max = Number(root.getAttribute("data-relation-max") || 0) || 0;
    if (!kind || !list) return;

    const selected = readPickerIds(root);
    const selectedSet = new Set(selected);
    const options = relationOptions(kind, { excludeId });
    const byId = new Map(options.map((row) => [row.id, row]));
    const query = String(filterInput?.value || "")
      .trim()
      .toLowerCase();

    // Preserve stale IDs so editors can see and remove them.
    const stale = selected
      .filter((id) => !byId.has(id))
      .map((id) => ({
        id,
        label: id,
        meta: "库中不存在，保存时将移除",
        stale: true,
      }));

    const visible = [...stale, ...options].filter((row) => {
      if (!query) return true;
      const hay = `${row.label} ${row.meta || ""} ${row.id}`.toLowerCase();
      return hay.includes(query);
    });

    if (selectedBox) {
      if (!selected.length) {
        selectedBox.hidden = true;
        selectedBox.innerHTML = "";
      } else {
        selectedBox.hidden = false;
        selectedBox.innerHTML = selected
          .map((id) => {
            const row = byId.get(id);
            const staleItem = !row;
            const label = row?.label || id;
            return `<span class="relation-chip${staleItem ? " is-stale" : ""}" data-relation-chip="${id}">
              <span>${label}${staleItem ? "（失效）" : ""}</span>
              <button type="button" data-relation-remove="${id}" aria-label="移除 ${label}">×</button>
            </span>`;
          })
          .join("");
      }
    }

    if (!visible.length) {
      list.innerHTML = `<div class="relation-picker-empty">${
        options.length || stale.length ? "无匹配项" : "暂无可用数据，请先在对应栏目创建条目"
      }</div>`;
    } else {
      list.innerHTML = visible
        .map((row) => {
          const checked = selectedSet.has(row.id);
          const disabled = !checked && max > 0 && selected.length >= max;
          return `<label class="relation-picker-option${row.stale ? " is-stale" : ""}">
            <input type="checkbox" value="${row.id}" ${checked ? "checked" : ""} ${
              disabled ? "disabled" : ""
            } data-relation-option />
            <span>
              <strong>${row.label}</strong>
              <small>${row.meta || row.id}</small>
            </span>
          </label>`;
        })
        .join("");
    }

    if (hint) {
      const base =
        kind === "materials"
          ? "从材料库勾选"
          : kind === "products"
            ? "从商品库勾选"
            : "从品牌库勾选";
      hint.textContent = `${base}（已选 ${selected.length}${max ? ` / ${max}` : ""}）`;
    }
  }

  function mountRelationPickers(scope = document) {
    scope.querySelectorAll("[data-relation-picker]").forEach((root) => {
      if (root.dataset.relationBound === "1") {
        renderRelationPicker(root, {
          excludeId: root.closest("form")?.elements?.namedItem?.("id")?.value || "",
        });
        return;
      }
      root.dataset.relationBound = "1";
      const filterInput = root.querySelector("[data-relation-filter]");
      filterInput?.addEventListener("input", () => {
        renderRelationPicker(root, {
          excludeId: root.closest("form")?.elements?.namedItem?.("id")?.value || "",
        });
      });
      root.addEventListener("change", (event) => {
        const option = event.target?.closest?.("[data-relation-option]");
        if (!option) return;
        const max = Number(root.getAttribute("data-relation-max") || 0) || 0;
        let ids = readPickerIds(root);
        const id = option.value;
        if (option.checked) {
          if (!ids.includes(id)) ids.push(id);
          if (max > 0 && ids.length > max) {
            option.checked = false;
            toast(`最多选择 ${max} 项。`, true);
            ids = ids.slice(0, max);
          }
        } else {
          ids = ids.filter((entry) => entry !== id);
        }
        writePickerIds(root, ids);
        renderRelationPicker(root, {
          excludeId: root.closest("form")?.elements?.namedItem?.("id")?.value || "",
        });
      });
      root.addEventListener("click", (event) => {
        const remove = event.target?.closest?.("[data-relation-remove]");
        if (!remove) return;
        event.preventDefault();
        const id = remove.getAttribute("data-relation-remove");
        writePickerIds(
          root,
          readPickerIds(root).filter((entry) => entry !== id)
        );
        renderRelationPicker(root, {
          excludeId: root.closest("form")?.elements?.namedItem?.("id")?.value || "",
        });
      });
      renderRelationPicker(root, {
        excludeId: root.closest("form")?.elements?.namedItem?.("id")?.value || "",
      });
    });
  }

  function refreshRelationPickers(scope = document) {
    mountRelationPickers(scope);
    scope.querySelectorAll("[data-relation-picker]").forEach((root) => {
      renderRelationPicker(root, {
        excludeId: root.closest("form")?.elements?.namedItem?.("id")?.value || "",
      });
    });
  }

  function ensureRepeatFields() {
    const philosophyRoot = document.querySelector("[data-philosophy-fields]");
    if (philosophyRoot && !philosophyRoot.dataset.ready) {
      philosophyRoot.dataset.ready = "1";
      philosophyRoot.innerHTML = [0, 1, 2, 3]
        .map(
          (i) => `
          <div class="field"><label>哲学 ${i + 1} 标题中</label><input name="philosophy${i}TitleZh" /></div>
          <div class="field"><label>哲学 ${i + 1} 标题英</label><input name="philosophy${i}Title" /></div>
          <div class="field field-span-2"><label>哲学 ${i + 1} 正文中</label><textarea name="philosophy${i}BodyZh" rows="2"></textarea></div>
          <div class="field field-span-2"><label>哲学 ${i + 1} 正文英</label><textarea name="philosophy${i}Body" rows="2"></textarea></div>`
        )
        .join("");
    }
    const craftRoot = document.querySelector("[data-craft-card-fields]");
    if (craftRoot && !craftRoot.dataset.ready) {
      craftRoot.dataset.ready = "1";
      craftRoot.innerHTML = [0, 1, 2]
        .map(
          (i) => `
          <div class="field field-span-2" data-path-upload data-upload-target="craftCard${i}Image" data-upload-folder="brands">
            <label>细节图 ${i + 1}</label>
            <div class="entity-image-drop entity-image-drop-sm" data-upload-drop tabindex="0" role="button" aria-label="上传细节图 ${i + 1}">
              <img data-upload-preview alt="" hidden width="200" height="250" />
              <div class="entity-image-drop-empty" data-upload-empty><strong>拖拽 / 点击上传</strong><span>产品细节近景</span></div>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden data-upload-file />
            </div>
            <div class="entity-image-toolbar">
              <button class="button button-secondary button-compact" type="button" data-upload-pick>选择</button>
              <button class="button button-secondary button-compact" type="button" data-upload-clear hidden>清除</button>
            </div>
            <input name="craftCard${i}Image" placeholder="/assets/uploads/..." />
            <small>上传后路径会写入此框；必须点弹窗底部「保存」才会进数据库。</small>
          </div>
          <div class="field"><label>标题中（可选）</label><input name="craftCard${i}TitleZh" placeholder="如：缝线细节" /></div>
          <div class="field"><label>标题英（可选）</label><input name="craftCard${i}Title" placeholder="e.g. Stitching" /></div>
          <div class="field field-span-2"><label>说明中（可选）</label><textarea name="craftCard${i}BodyZh" rows="2" maxlength="200"></textarea></div>
          <div class="field field-span-2"><label>说明英（可选）</label><textarea name="craftCard${i}Body" rows="2" maxlength="200"></textarea></div>`
        )
        .join("");
      refreshUploads(craftRoot);
    }
  }

  function fillBrandEditorial(form, item) {
    const nameZh = item?.nameZh || item?.nameEn || item?.name || "";
    const nameEn = item?.nameEn || item?.name || "";
    const blurb = item?.blurb || item?.intro || "";
    const blurbZh = item?.blurbZh || item?.introZh || blurb;
    const kind = item?.kind || "brand";
    setValue(form, "slogan", item?.slogan || blurb.slice(0, 80));
    setValue(form, "sloganZh", item?.sloganZh || blurbZh.slice(0, 80) || `${nameZh}`);
    setValue(
      form,
      "description",
      item?.description ||
        (kind === "designer"
          ? "An independent practice shaped by material honesty and quiet discipline."
          : kind === "studio"
            ? "A studio dedicated to lasting objects and considered making."
            : "A brand selected for clarity, craft, and long-term value.")
    );
    setValue(
      form,
      "descriptionZh",
      item?.descriptionZh ||
        (kind === "designer"
          ? "以材料诚实与安静克制塑造的独立实践。"
          : kind === "studio"
            ? "致力于持久物件与审慎制作的工作室。"
            : "因清晰、工艺与长期价值而被甄选的品牌。")
    );
    setValue(form, "logo", item?.logo || "");
    setValue(form, "heroImage", item?.heroImage || item?.image || "");
    setValue(form, "storyImage", item?.storyImage || "");
    setValue(
      form,
      "editorsNote",
      item?.editorsNote ||
        `Orbmare selected ${nameEn} for a simple reason: the work resists noise. In a marketplace of novelty, this practice chooses proportion, material integrity, and a pace that allows objects to age with dignity. We see long-term value here — not trend velocity.`
    );
    setValue(
      form,
      "editorsNoteZh",
      item?.editorsNoteZh ||
        `傲马选择「${nameZh}」，是因为它拒绝喧哗。在追逐新鲜感的市场里，它坚持比例、材料诚实，以及让物件有尊严地老化的节奏。我们看到的是长期价值，而非趋势速度。`
    );
    const identity = item?.identity || {};
    setValue(form, "identityBrand", identity.brand || nameEn);
    setValue(form, "identityCountry", identity.country || item?.country || "");
    setValue(form, "identityFounded", identity.founded || "");
    setValue(form, "identityFounder", identity.founder || "");
    setValue(form, "identityHeadquarters", identity.headquarters || "");
    setValue(
      form,
      "identityDesignStyle",
      identity.designStyle || identity.category || ""
    );
    setValue(form, "identityDesignLanguage", identity.designLanguage || "");
    setValue(form, "identityPriceRange", identity.priceRange || "");
    setValue(form, "identityMaterials", identity.materials || "");
    setValue(form, "identityWebsite", identity.website || "");
    const philosophy =
      Array.isArray(item?.philosophy) && item.philosophy.length
        ? item.philosophy
        : [
            {
              title: "Less But Better",
              titleZh: "少，但更好",
              body: "Fewer gestures. Clearer decisions. Objects that remain.",
              bodyZh: "更少的姿态，更清晰的决定，留得住的物件。",
            },
            {
              title: "Material Honesty",
              titleZh: "材料诚实",
              body: "Let fibre, metal, and finish speak without disguise.",
              bodyZh: "让纤维、金属与工艺自己说话，不必伪装。",
            },
            {
              title: "Quiet Luxury",
              titleZh: "安静的奢华",
              body: "Presence without spectacle. Confidence without volume.",
              bodyZh: "有存在感而无炫耀，有自信而不喧嚷。",
            },
          ];
    for (let i = 0; i < 4; i += 1) {
      const row = philosophy[i] || {};
      setValue(form, `philosophy${i}Title`, row.title || "");
      setValue(form, `philosophy${i}TitleZh`, row.titleZh || "");
      setValue(form, `philosophy${i}Body`, row.body || "");
      setValue(form, `philosophy${i}BodyZh`, row.bodyZh || "");
    }
    const crafts = item?.crafts || [];
    for (let i = 0; i < 3; i += 1) {
      const row = crafts[i] || {};
      setValue(form, `craftCard${i}Image`, row.image || "");
      setValue(form, `craftCard${i}Title`, row.title || "");
      setValue(form, `craftCard${i}TitleZh`, row.titleZh || "");
      setValue(form, `craftCard${i}Body`, row.body || "");
      setValue(form, `craftCard${i}BodyZh`, row.bodyZh || "");
    }
    setValue(form, "materialIds", listLines(item?.materialIds));
    setValue(form, "signatureProductIds", listLines(item?.signatureProductIds));
    setValue(form, "relatedBrandIds", listLines(item?.relatedBrandIds));
    refreshRelationPickers(form);
    setValue(form, "gallery", listLines(item?.gallery));
    const perspective = item?.perspective || {};
    setValue(form, "perspectiveWhyMatters", perspective.whyMatters || "");
    setValue(form, "perspectiveWhyMattersZh", perspective.whyMattersZh || "");
    setValue(form, "perspectiveWhoFor", perspective.whoFor || "");
    setValue(form, "perspectiveWhoForZh", perspective.whoForZh || "");
    setValue(form, "perspectiveDifferent", perspective.different || "");
    setValue(form, "perspectiveDifferentZh", perspective.differentZh || "");
    setValue(form, "perspectiveVerdict", perspective.verdict || "");
    setValue(form, "perspectiveVerdictZh", perspective.verdictZh || "");
    const ratings = item?.ratings || {};
    setValue(form, "ratingCraftsmanship", ratings.craftsmanship ?? "");
    setValue(form, "ratingTimelessness", ratings.timelessness ?? "");
    setValue(form, "ratingMaterials", ratings.materials ?? "");
    setValue(form, "ratingDesign", ratings.design ?? "");
    setValue(form, "ratingValue", ratings.value ?? "");
    setValue(form, "ratingAuthenticity", ratings.authenticity ?? "");
  }

  function readBrandEditorial(form) {
    const philosophy = [];
    for (let i = 0; i < 4; i += 1) {
      const title = formValue(form, `philosophy${i}Title`);
      const titleZh = formValue(form, `philosophy${i}TitleZh`);
      const body = formValue(form, `philosophy${i}Body`);
      const bodyZh = formValue(form, `philosophy${i}BodyZh`);
      if (title || titleZh || body || bodyZh) {
        philosophy.push({ title, titleZh, body, bodyZh });
      }
    }
    const crafts = [];
    for (let i = 0; i < 3; i += 1) {
      const title = formValue(form, `craftCard${i}Title`).trim();
      const titleZh = formValue(form, `craftCard${i}TitleZh`).trim();
      const body = formValue(form, `craftCard${i}Body`).trim();
      const bodyZh = formValue(form, `craftCard${i}BodyZh`).trim();
      const image = formValue(form, `craftCard${i}Image`).trim();
      // Image-only detail shots are valid (title/body optional).
      if (image || title || titleZh || body || bodyZh) {
        crafts.push({ title, titleZh, body, bodyZh, image });
      }
    }
    const heroImage = formValue(form, "heroImage") || formValue(form, "image");
    return {
      slogan: formValue(form, "slogan"),
      sloganZh: formValue(form, "sloganZh"),
      description: formValue(form, "description"),
      descriptionZh: formValue(form, "descriptionZh"),
      logo: formValue(form, "logo"),
      heroImage,
      // Keep empty when unset — public page falls back to hero; do not overwrite DB.
      storyImage: formValue(form, "storyImage"),
      editorsNote: formValue(form, "editorsNote"),
      editorsNoteZh: formValue(form, "editorsNoteZh"),
      identity: {
        brand: formValue(form, "identityBrand"),
        country: formValue(form, "identityCountry"),
        founded: formValue(form, "identityFounded"),
        founder: formValue(form, "identityFounder"),
        headquarters: formValue(form, "identityHeadquarters"),
        designStyle: formValue(form, "identityDesignStyle"),
        category: formValue(form, "identityDesignStyle"),
        designLanguage: formValue(form, "identityDesignLanguage"),
        priceRange: formValue(form, "identityPriceRange"),
        materials: formValue(form, "identityMaterials"),
        website: formValue(form, "identityWebsite"),
      },
      country: formValue(form, "identityCountry"),
      philosophy,
      crafts,
      materialIds: sanitizeRelationIds(linesList(formValue(form, "materialIds")), "materials"),
      signatureProductIds: sanitizeRelationIds(
        linesList(formValue(form, "signatureProductIds")),
        "products"
      ),
      relatedBrandIds: sanitizeRelationIds(
        linesList(formValue(form, "relatedBrandIds")).filter(
          (id) => id !== formValue(form, "id")
        ),
        "brands"
      ),
      gallery: linesList(formValue(form, "gallery")),
      perspective: {
        whyMatters: formValue(form, "perspectiveWhyMatters"),
        whyMattersZh: formValue(form, "perspectiveWhyMattersZh"),
        whoFor: formValue(form, "perspectiveWhoFor"),
        whoForZh: formValue(form, "perspectiveWhoForZh"),
        different: formValue(form, "perspectiveDifferent"),
        differentZh: formValue(form, "perspectiveDifferentZh"),
        verdict: formValue(form, "perspectiveVerdict"),
        verdictZh: formValue(form, "perspectiveVerdictZh"),
      },
      ratings: {
        craftsmanship: formValue(form, "ratingCraftsmanship"),
        timelessness: formValue(form, "ratingTimelessness"),
        materials: formValue(form, "ratingMaterials"),
        design: formValue(form, "ratingDesign"),
        value: formValue(form, "ratingValue"),
        authenticity: formValue(form, "ratingAuthenticity"),
      },
    };
  }

  function fillCountryFields(form, item) {
    setValue(form, "tag", item?.tag || "");
    setValue(form, "tagZh", item?.tagZh || "");
    setValue(form, "coverImage", item?.coverImage || item?.image || "");
    setValue(form, "culture", item?.culture || "");
    setValue(form, "cultureZh", item?.cultureZh || "");
    const history =
      item?.history ||
      (Array.isArray(item?.historyParagraphs) ? item.historyParagraphs.join("\n\n") : "");
    const historyZh =
      item?.historyZh ||
      (Array.isArray(item?.historyParagraphsZh) ? item.historyParagraphsZh.join("\n\n") : "");
    setValue(form, "history", history);
    setValue(form, "historyZh", historyZh);
    setValue(form, "historyLines", listLines(item?.historyLines));
    setValue(form, "historyLinesZh", listLines(item?.historyLinesZh));
    const mats = (item?.pavilionMaterials || item?.materials || [])
      .map((row) => {
        if (typeof row === "string") return row;
        return [row.id, row.zh || row.nameZh, row.en || row.name, row.noteZh || "", row.noteEn || ""]
          .map((part) => String(part || "").trim())
          .join("|");
      })
      .join("\n");
    setValue(form, "pavilionMaterials", mats);
    setValue(form, "pavilionCrafts", listLines(item?.pavilionCrafts || item?.crafts));
    setValue(form, "pavilionCraftsZh", listLines(item?.pavilionCraftsZh || item?.craftsZh));
    setValue(form, "productsBody", item?.productsBody || "");
    setValue(form, "productsBodyZh", item?.productsBodyZh || "");
  }

  function readCountryFields(form) {
    const history = formValue(form, "history");
    const historyZh = formValue(form, "historyZh");
    const pavilionMaterials = linesList(formValue(form, "pavilionMaterials")).map((line) => {
      const [id, zh, en, noteZh, noteEn] = line.split("|").map((part) => part.trim());
      return { id: id || "", zh: zh || "", en: en || zh || "", noteZh: noteZh || "", noteEn: noteEn || "" };
    });
    return {
      tag: formValue(form, "tag"),
      tagZh: formValue(form, "tagZh"),
      coverImage: formValue(form, "coverImage"),
      image: formValue(form, "coverImage") || formValue(form, "image"),
      culture: formValue(form, "culture"),
      cultureZh: formValue(form, "cultureZh"),
      history,
      historyZh,
      historyParagraphs: history.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      historyParagraphsZh: historyZh.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      historyLines: linesList(formValue(form, "historyLines")),
      historyLinesZh: linesList(formValue(form, "historyLinesZh")),
      pavilionMaterials,
      pavilionCrafts: linesList(formValue(form, "pavilionCrafts")),
      pavilionCraftsZh: linesList(formValue(form, "pavilionCraftsZh")),
      productsBody: formValue(form, "productsBody"),
      productsBodyZh: formValue(form, "productsBodyZh"),
    };
  }

  function fillMaterialFields(form, item) {
    setValue(form, "origin", item?.origin || "");
    setValue(form, "originZh", item?.originZh || "");
    setValue(form, "intro", item?.intro || item?.blurb || "");
    setValue(form, "introZh", item?.introZh || item?.blurbZh || "");
    setValue(form, "lyric", item?.lyric || "");
    setValue(form, "lyricZh", item?.lyricZh || "");
    const traits = Array.isArray(item?.traits)
      ? item.traits
          .map((row) => {
            if (typeof row === "string") return row;
            const zh = row.zh || row.labelZh || row.nameZh || "";
            const en = row.en || row.label || row.name || "";
            return en && en !== zh ? `${zh}|${en}` : zh || en;
          })
          .join("\n")
      : "";
    setValue(form, "traitsText", traits);
    setValue(
      form,
      "intelligenceJson",
      item?.intelligence ? JSON.stringify(item.intelligence, null, 2) : ""
    );
  }

  function readMaterialFields(form) {
    const traits = linesList(formValue(form, "traitsText")).map((line) => {
      const [zh, en] = line.split("|").map((part) => part.trim());
      return en ? { zh, en } : { zh, en: zh };
    });
    let intelligence = null;
    const raw = formValue(form, "intelligenceJson").trim();
    if (raw) {
      try {
        intelligence = JSON.parse(raw);
      } catch {
        throw new Error("材料 Intelligence JSON 格式无效。");
      }
    }
    const intro = formValue(form, "intro");
    const introZh = formValue(form, "introZh");
    return {
      origin: formValue(form, "origin"),
      originZh: formValue(form, "originZh"),
      intro,
      introZh,
      blurb: intro || formValue(form, "blurb"),
      blurbZh: introZh || formValue(form, "blurbZh"),
      lyric: formValue(form, "lyric"),
      lyricZh: formValue(form, "lyricZh"),
      traits,
      intelligence,
    };
  }

  async function openEntityDialog(type, item = null) {
    const dialog = document.querySelector("[data-entity-dialog]");
    const form = document.querySelector("[data-entity-form]");
    if (!dialog || !form) return;
    // Always re-fetch on edit so image paths match the database (list rows can be stale).
    if (item?.id) {
      try {
        const data = await api(`/${type}s/${encodeURIComponent(item.id)}`);
        if (data?.item) item = data.item;
      } catch {
        /* keep list snapshot */
      }
    }
    ensureRepeatFields();
    form.reset();
    form.dataset.entityType = type;
    const isBrand = type === "brand";
    form.querySelectorAll("[data-brand-kind-field], [data-brand-extra-field]").forEach((node) => {
      node.hidden = !isBrand;
    });
    form.querySelectorAll("[data-brand-editorial]").forEach((node) => {
      node.hidden = !isBrand;
    });
    form.querySelectorAll("[data-country-fields]").forEach((node) => {
      node.hidden = type !== "country";
    });
    form.querySelectorAll("[data-material-fields]").forEach((node) => {
      node.hidden = type !== "material";
    });
    form.querySelectorAll("[data-craft-fields]").forEach((node) => {
      node.hidden = type !== "craft";
    });
    const inferredKind =
      item?.kind ||
      (String(item?.id || "").startsWith("studio-")
        ? "studio"
        : String(item?.id || "").startsWith("designer-")
          ? "designer"
          : "brand");
    setValue(form, "kind", inferredKind);
    const kindField = form.elements.namedItem("kind");
    if (kindField) kindField.disabled = Boolean(item);
    setValue(form, "id", item?.id || "");
    form.elements.namedItem("id").readOnly = Boolean(item);
    setValue(form, "slug", item?.slug || item?.id || "");
    setValue(form, "status", item?.status || "draft");
    const featuredField = form.elements.namedItem("featured");
    if (featuredField) featuredField.checked = Boolean(item?.featured);
    setValue(form, "featuredRank", item?.featuredRank ?? 100);
    setValue(form, "nameEn", item?.nameEn || item?.name || "");
    setValue(form, "nameZh", item?.nameZh || "");
    setValue(form, "studio", item?.studio || "");
    setValue(form, "studioZh", item?.studioZh || "");
    setValue(form, "image", item?.image || item?.heroImage || item?.coverImage || "");
    setValue(form, "blurb", item?.blurb || item?.intro || "");
    setValue(form, "blurbZh", item?.blurbZh || item?.introZh || "");
    setValue(form, "story", typeof item?.story === "string" ? item.story : item?.story?.body || "");
    setValue(
      form,
      "storyZh",
      typeof item?.storyZh === "string" ? item.storyZh : item?.story?.bodyZh || ""
    );
    setValue(form, "image", item?.image || item?.heroImage || item?.coverImage || "");
    if (isBrand) fillBrandEditorial(form, item || {});
    if (type === "country") fillCountryFields(form, item || {});
    if (type === "material") fillMaterialFields(form, item || {});
    if (type === "craft") {
      setValue(form, "countriesText", listLines(item?.countries));
      setValue(form, "countriesZhText", listLines(item?.countriesZh));
      setValue(form, "craftHistory", item?.history || item?.blurb || "");
      setValue(form, "craftHistoryZh", item?.historyZh || item?.blurbZh || "");
    }
    const titles = {
      brand: "品牌 / 工作室 / 设计师",
      material: "材料",
      country: "国家",
      designer: "设计师",
      craft: "工艺",
    };
    document.querySelector("[data-entity-dialog-title]").textContent = item
      ? `编辑${titles[type] || type}`
      : `新建${titles[type] || type}`;
    refreshUploads(form);
    refreshRelationPickers(form);
    // Second pass after paint: path inputs are filled before previews bind/refresh.
    requestAnimationFrame(() => {
      refreshUploads(form);
      refreshRelationPickers(form);
    });
    const ai = bridge().ai;
    if (ai?.mountForm) {
      ai.mountForm(form, {
        entityType: type === "designer" ? "brand" : type,
        getEntityId: () => formValue(form, "id"),
      });
    }
    dialog.showModal();
  }

  function refreshUploads(scope) {
    bridge().uploader?.mountAll?.(scope || document);
    bridge().uploader?.refresh?.(scope || document);
  }

  function typeLabel(type) {
    return (
      {
        brand: "品牌",
        material: "材料",
        country: "国家",
        designer: "设计师",
        craft: "工艺",
      }[type] || type
    );
  }

  function setValue(form, name, value) {
    const field = form.elements.namedItem(name);
    if (!field || field instanceof RadioNodeList) return;
    field.value = value ?? "";
    // Notify upload widgets bound to this path field.
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function formValue(form, name) {
    return form.elements.namedItem(name)?.value ?? "";
  }

  function journalTemplate(requiresMembership) {
    const suffix = Date.now().toString(36).slice(-5);
    return {
      id: `story-${suffix}`,
      category: "materials",
      categoryZh: "材料",
      categoryEn: "Materials",
      title: "新的 Journal 文章",
      titleEn: "New Journal Story",
      excerpt: "用 40 到 80 字写清这篇文章的核心：材料、工艺、品牌或生活方式如何值得被理解。",
      excerptEn: "Write a concise 40–80 word summary of the story: material, craft, brand, or lifestyle context.",
      coverImage: "/assets/editorial/designer-atelier.jpg",
      author: "Orbmare 编辑部",
      authorEn: "Orbmare Editors",
      publishedAt: new Date().toISOString().slice(0, 10),
      readingTime: 5,
      issue: "issue-01",
      collection: "quiet-luxury",
      requiresMembership,
      relatedProductIds: [],
      body: [
        "第一段正文。用杂志语气讲清楚这件事为什么值得读。",
        "第二段正文。可以作为页面里的 Pull Quote 呈现，适合写一个有记忆点的判断。",
        "第三段正文。把内容自然连接回 Orbmare 的材料、工艺或商品理解。",
      ],
      bodyEn: [
        "First paragraph. Explain why this story is worth reading in an editorial tone.",
        "Second paragraph. This may appear as a pull quote, so make it memorable.",
        "Third paragraph. Bring the story naturally back to Orbmare’s view of material, craft, or objects.",
      ],
    };
  }

  function parseJournalItems(form) {
    const raw = formValue(form, "journalItemsJson").trim();
    if (!raw) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error("Journal 文章必须是数组。");
    return items;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function jsDefaultBlock(type = "paragraph") {
    const id = `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const defaults = {
      hero: { type: "hero", label: "封面", text: "好作品背后的故事。", image: "/assets/editorial/designer-atelier.jpg", width: "wide" },
      heading: { type: "heading", label: "标题", text: "关于材料、来源与时间的一节。", level: "h2", width: "normal" },
      paragraph: { type: "paragraph", label: "正文", text: "用克制的语言说明这个物件、材料或创作者为什么值得被看见，不要写成促销文案。", width: "normal" },
      quote: { type: "quote", label: "重点引语", text: "好的物件，不急着要求你更换它。", width: "narrow" },
      image: { type: "image", label: "图片", image: "/assets/editorial/country-japan.jpg", caption: "图片说明。", width: "wide" },
      productGrid: { type: "productGrid", label: "关联物件", text: "由这篇故事延伸出的物件。", productIds: [], width: "wide" },
    };
    return {
      id,
      locked: false,
      collapsed: false,
      groupId: "",
      marginTop: 28,
      x: 160,
      y: 120,
      w: type === "quote" ? 620 : 760,
      h: type === "image" || type === "hero" ? 520 : 170,
      ...defaults[type] || defaults.paragraph,
    };
  }

  function snapCanvasValue(value) {
    return Math.max(0, Math.round(Number(value || 0) / JS_CANVAS_GRID) * JS_CANVAS_GRID);
  }

  function normalizeCanvasBlocks(issue) {
    let y = 80;
    (issue.blocks || []).forEach((block) => {
      const type = block.type || "paragraph";
      if (!Number.isFinite(Number(block.x))) block.x = type === "quote" ? 220 : 160;
      if (!Number.isFinite(Number(block.y))) {
        block.y = y;
        y += type === "hero" || type === "image" ? 560 : type === "quote" ? 260 : 210;
      } else {
        y = Math.max(y, Number(block.y) + Number(block.h || 180) + 48);
      }
      if (!Number.isFinite(Number(block.w))) block.w = type === "quote" ? 620 : 760;
      if (!Number.isFinite(Number(block.h))) block.h = type === "hero" || type === "image" ? 520 : 170;
      block.x = Math.min(snapCanvasValue(block.x), JS_CANVAS_WIDTH - 180);
      block.y = Math.min(snapCanvasValue(block.y), JS_CANVAS_HEIGHT - 120);
      block.w = Math.max(240, Math.min(Number(block.w), JS_CANVAS_WIDTH - block.x - 32));
      block.h = Math.max(80, Math.min(Number(block.h), JS_CANVAS_HEIGHT - block.y - 32));
      if (block.groupId == null) block.groupId = "";
    });
  }

  function jsDefaultIssue() {
    const id = `issue-${Date.now().toString(36)}`;
    return {
      id,
      issueNumber: "001",
      title: "The Quiet Luxury Issue",
      titleEn: "The Quiet Luxury Issue",
      subtitle: "Discover Better Objects.",
      description: "A digital issue about better materials, slower decisions, and objects worth keeping.",
      cover: "/assets/editorial/designer-atelier.jpg",
      theme: "Quiet Luxury",
      season: "2026 Summer",
      language: "zh/en",
      publishDate: new Date().toISOString().slice(0, 10),
      categories: ["lifestyle", "objects", "materials"],
      tags: ["quiet-luxury", "materials", "objects"],
      status: "draft",
      updatedAt: nowIso(),
      workflow: Object.fromEntries(JS_STEPS.map((step, index) => [step, index === 0 ? "in_progress" : "not_started"])),
      researchCards: [
        { id: "research-01", title: "品牌理念", source: "官方来源", summary: "先收集可验证信息，再进入写作。资料保持事实属性，不和编辑表达混在一起。", confidence: "中", favorite: true },
      ],
      outline: ["引入", "材料背景", "工艺与来源", "如何选择", "关联物件"],
      blocks: [jsDefaultBlock("hero"), jsDefaultBlock("paragraph"), jsDefaultBlock("quote"), jsDefaultBlock("image"), jsDefaultBlock("productGrid")],
      seo: { metaTitle: "The Quiet Luxury Issue | Orbmare Journal", description: "A digital issue by Orbmare on materials, craft, and objects worth keeping.", slug: "quiet-luxury-issue", keywords: ["Orbmare", "quiet luxury", "craft"] },
      versions: [{ id: `version-${Date.now().toString(36)}`, label: "初始草稿", createdAt: nowIso() }],
    };
  }

  function getJournalStudio() {
    const content = bridge().state.siteContent || {};
    const studio = content.journalStudio || {};
    const issues = Array.isArray(studio.issues) && studio.issues.length ? studio.issues : [jsDefaultIssue()];
    return { ...studio, issues };
  }

  function getActiveIssue() {
    const studio = getJournalStudio();
    if (!journalStudioState.activeIssueId) return null;
    return studio.issues.find((issue) => issue.id === journalStudioState.activeIssueId) || null;
  }

  async function saveJournalStudio(studio, message = "杂志工作室已保存。") {
    await api("/site-content", { method: "PATCH", body: { patch: { journalStudio: studio } } });
    toast(message);
    await loadPlatformData();
  }

  async function mutateJournalStudio(mutator, message) {
    const studio = getJournalStudio();
    const next = JSON.parse(JSON.stringify(studio));
    mutator(next);
    next.updatedAt = nowIso();
    await saveJournalStudio(next, message);
  }

  async function persistJournalStudioDraft(studio) {
    await api("/site-content", { method: "PATCH", body: { patch: { journalStudio: studio } } });
    bridge().state.siteContent = { ...(bridge().state.siteContent || {}), journalStudio: studio };
  }

  function activeCanvasBlocks(studio) {
    const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
    normalizeCanvasBlocks(issue || {});
    return issue?.blocks || [];
  }

  function workflowMark(value) {
    if (value === "completed") return "●";
    if (value === "in_progress") return "◐";
    return "○";
  }

  function issueToJournalArticle(issue) {
    const firstParagraph = issue.blocks?.find((block) => block.type === "paragraph")?.text || issue.description || "";
    return {
      id: issue.seo?.slug || issue.id,
      category: issue.categories?.[0] || "lifestyle",
      categoryZh: "生活方式",
      categoryEn: "Lifestyle",
      title: issue.title,
      titleEn: issue.titleEn || issue.title,
      excerpt: issue.description,
      excerptEn: issue.description,
      coverImage: issue.cover,
      author: "Orbmare 编辑部",
      authorEn: "Orbmare Editors",
      publishedAt: issue.publishDate,
      readingTime: Math.max(4, Math.ceil((issue.blocks || []).length * 1.2)),
      issue: issue.id,
      collection: issue.theme?.toLowerCase?.().replace(/\s+/g, "-") || "quiet-luxury",
      requiresMembership: true,
      relatedProductIds: (issue.blocks || []).flatMap((block) => block.productIds || []).slice(0, 6),
      body: (issue.blocks || [])
        .filter((block) => ["paragraph", "quote", "heading"].includes(block.type))
        .map((block) => block.text || block.label)
        .filter(Boolean)
        .concat(firstParagraph ? [] : [issue.description]),
      bodyEn: (issue.blocks || [])
        .filter((block) => ["paragraph", "quote", "heading"].includes(block.type))
        .map((block) => block.text || block.label)
        .filter(Boolean),
    };
  }

  function renderJournalStudio() {
    const root = document.querySelector("[data-tina-editor]");
    if (!root) return;
    renderTinaEditor(tinaConfigCache);
    if (!tinaConfigCache && !tinaConfigLoading) {
      loadTinaEditorConfig();
    }
  }

  function renderTinaEditor(config) {
    const root = document.querySelector("[data-tina-editor]");
    if (!root) return;
    const status = root.querySelector("[data-tina-status]");
    const enabled = root.querySelector("[data-tina-enabled]");
    const mode = root.querySelector("[data-tina-mode]");
    const branch = root.querySelector("[data-tina-branch]");
    const contentRoot = root.querySelector("[data-tina-content-root]");
    const mediaRoot = root.querySelector("[data-tina-media-root]");
    const journalEnabled = root.querySelector("[data-tina-journal-enabled]");
    const missing = root.querySelector("[data-tina-missing]");
    const openLink = root.querySelector("[data-tina-open]");
    const previewLink = root.querySelector("[data-tina-preview]");
    const adminLink = root.querySelector("[data-tina-admin-url]");

    if (!config) {
      if (status) status.textContent = "正在读取 TinaCMS 配置…";
      if (enabled) enabled.textContent = "待检查";
      return;
    }

    if (status) {
      status.textContent = config.enabled
        ? "TinaCMS 已连接。杂志制作请在 TinaCMS 中完成，发布后按站点同步策略进入前台。"
        : "TinaCMS 尚未完成配置。请先补齐环境变量，再刷新本页。";
      status.classList.toggle("is-ready", Boolean(config.enabled));
      status.classList.toggle("is-warning", !config.enabled);
    }
    if (enabled) enabled.textContent = config.enabled ? "已连接" : "未完成配置";
    if (mode) mode.textContent = config.mode || "本地自托管 / Git-backed";
    if (branch) branch.textContent = config.branch || "main";
    if (contentRoot) contentRoot.textContent = config.contentRoot || "content";
    if (mediaRoot) mediaRoot.textContent = config.mediaRoot || "web/assets";
    if (journalEnabled) journalEnabled.textContent = config.journalEnabled ? "已开启" : "关闭（安全默认）";
    if (missing) missing.textContent = config.missing?.length ? config.missing.join("、") : "无";
    if (openLink && config.adminUrl) openLink.href = config.adminUrl;
    if (adminLink && config.adminUrl) {
      adminLink.href = config.adminUrl;
      adminLink.textContent = config.adminUrl;
    }
    if (previewLink && config.previewUrl) {
      previewLink.href = config.previewUrl;
      previewLink.textContent = config.previewUrl;
    }
  }

  async function loadTinaEditorConfig({ force = false } = {}) {
    if (tinaConfigLoading) return;
    if (tinaConfigCache && !force) {
      renderTinaEditor(tinaConfigCache);
      return;
    }
    tinaConfigLoading = true;
    try {
      const data = await api("/tina/config");
      tinaConfigCache = data.config || null;
      renderTinaEditor(tinaConfigCache);
    } catch (error) {
      const status = document.querySelector("[data-tina-status]");
      if (status) {
        status.textContent = error.message || "无法读取 TinaCMS 配置。";
        status.classList.add("is-warning");
      }
      toast(error.message || "无法读取 TinaCMS 配置。", true);
    } finally {
      tinaConfigLoading = false;
    }
  }

  function renderJournalStudioDashboard(studio) {
    const rail = document.querySelector("[data-js-status-rail]");
    const grid = document.querySelector("[data-js-issue-grid]");
    const stats = document.querySelector("[data-js-stats]");
    if (!rail || !grid || !stats) return;
    clear(rail);
    JS_STATUSES.forEach((status) => {
      const count = (studio.issues || []).filter((issue) => issue.status === status).length;
      const button = el("button", { type: "button", className: "js-status", text: `${JS_STATUS_LABELS[status]} ${count}` });
      rail.appendChild(button);
    });
    clear(grid);
    (studio.issues || []).forEach((issue) => {
      const card = el("button", { type: "button", className: "js-issue-card" });
      card.dataset.jsOpenIssue = issue.id;
      card.innerHTML = `
        <img src="${issue.cover || "/assets/editorial/designer-atelier.jpg"}" alt="" />
        <span>${JS_STATUS_LABELS[issue.status] || "草稿"} · ${issue.language || "中/英"}</span>
        <strong>专题 ${issue.issueNumber || "—"}<br>${issue.title || "未命名"}</strong>
        <small>${issue.categories?.join(" · ") || "未分类"} · ${(issue.blocks || []).length} 个模块</small>
      `;
      grid.appendChild(card);
    });
    const issues = studio.issues || [];
    stats.innerHTML = `
      <p class="section-label">快速统计</p>
      <h3>工作室状态</h3>
      <dl>
        <div><dt>专题</dt><dd>${issues.length}</dd></div>
        <div><dt>文章</dt><dd>${issues.length}</dd></div>
        <div><dt>模块</dt><dd>${issues.reduce((sum, issue) => sum + (issue.blocks || []).length, 0)}</dd></div>
        <div><dt>已关联商品</dt><dd>${issues.reduce((sum, issue) => sum + (issue.blocks || []).flatMap((block) => block.productIds || []).length, 0)}</dd></div>
        <div><dt>已发布</dt><dd>${issues.filter((issue) => issue.status === "published").length}</dd></div>
      </dl>
    `;
  }

  function renderJournalStudioWorkbench(studio, issue) {
    const dashboard = document.querySelector("[data-js-dashboard]");
    const workbench = document.querySelector("[data-js-workbench]");
    if (!dashboard || !workbench) return;
    const open = Boolean(journalStudioState.activeIssueId);
    dashboard.hidden = open;
    workbench.hidden = !open;
    if (!open || !issue) return;
    renderJournalNavigator(issue);
    renderJournalFlow(issue);
    renderJournalCanvas(issue);
    renderJournalInspector(issue);
    bindJournalCanvasInteractions();
  }

  function renderJournalNavigator(issue) {
    const nav = document.querySelector("[data-js-navigator]");
    if (!nav) return;
    nav.innerHTML = `
      <h3>专题 ${issue.issueNumber}</h3>
      <p>${issue.title}</p>
      ${["封面", "资料", "大纲", "写作", "图片", "画布", "商品", "SEO", "预览", "发布", "版本记录"].map((item) => `<button type="button">${item}</button>`).join("")}
    `;
  }

  function renderJournalFlow(issue) {
    const flow = document.querySelector("[data-js-flow]");
    if (!flow) return;
    flow.innerHTML = JS_STEPS.map((step) => `<button type="button" data-js-step="${step}">
      <span>${workflowMark(issue.workflow?.[step])}</span>${JS_STEP_LABELS[step]}
    </button>`).join("");
  }

  function blockHtml(block) {
    const selectedIds = journalStudioState.selectedBlockIds || new Set();
    const selected = block.id === journalStudioState.activeBlockId || selectedIds.has(block.id) ? " is-selected" : "";
    const grouped = block.groupId ? " is-grouped" : "";
    const groupBadge = block.groupId ? `<span class="js-block-group">分组</span>` : "";
    if (block.type === "hero") {
      return `<section class="js-block js-block-hero${selected}${grouped}" data-js-block="${block.id}">
        ${groupBadge}<span class="js-block-drag">移动</span><img src="${block.image || ""}" alt="" /><h1>${block.text || ""}</h1>
      </section>`;
    }
    if (block.type === "image") {
      return `<figure class="js-block js-block-image${selected}${grouped}" data-js-block="${block.id}">
        ${groupBadge}<span class="js-block-drag">移动</span><img src="${block.image || ""}" alt="" /><figcaption>${block.caption || ""}</figcaption>
      </figure>`;
    }
    if (block.type === "quote") {
      return `<blockquote class="js-block js-block-quote${selected}${grouped}" data-js-block="${block.id}">${groupBadge}<span class="js-block-drag">移动</span>${block.text || ""}</blockquote>`;
    }
    if (block.type === "productGrid") {
      return `<section class="js-block js-block-products${selected}${grouped}" data-js-block="${block.id}">
        ${groupBadge}<span class="js-block-drag">移动</span><p>${block.label || "关联物件"}</p><h3>${block.text || ""}</h3><small>${(block.productIds || []).join(", ") || "还没有关联商品。"}</small>
      </section>`;
    }
    if (block.type === "heading") {
      return `<h2 class="js-block js-block-heading${selected}${grouped}" data-js-block="${block.id}">${groupBadge}<span class="js-block-drag">移动</span>${block.text || ""}</h2>`;
    }
    return `<p class="js-block js-block-paragraph${selected}${grouped}" data-js-block="${block.id}">${groupBadge}<span class="js-block-drag">移动</span>${block.text || ""}</p>`;
  }

  function renderJournalCanvas(issue) {
    const canvas = document.querySelector("[data-js-canvas]");
    if (!canvas) return;
    normalizeCanvasBlocks(issue);
    canvas.style.width = `${JS_CANVAS_WIDTH}px`;
    canvas.style.minHeight = `${JS_CANVAS_HEIGHT}px`;
    canvas.style.transform = `translate(${journalStudioState.panX}px, ${journalStudioState.panY}px) scale(${journalStudioState.zoom / 100})`;
    canvas.innerHTML = (issue.blocks || []).map(blockHtml).join("");
    (issue.blocks || []).forEach((block) => {
      const node = canvas.querySelector(`[data-js-block="${block.id}"]`);
      if (!node) return;
      node.style.left = `${block.x || 0}px`;
      node.style.top = `${block.y || 0}px`;
      node.style.width = `${block.w || 760}px`;
      node.style.minHeight = `${block.h || 120}px`;
    });
  }

  function renderJournalInspector(issue) {
    const form = document.querySelector("[data-js-inspector]");
    if (!form) return;
    const block = (issue.blocks || []).find((item) => item.id === journalStudioState.activeBlockId) || (issue.blocks || [])[0];
    if (!journalStudioState.activeBlockId && block) journalStudioState.activeBlockId = block.id;
    if (!block) {
      form.innerHTML = `<p class="panel-empty">选择一个模块后编辑属性。</p>`;
      return;
    }
    form.innerHTML = `
      <p class="section-label">属性面板</p>
      <h3>${block.label || block.type}</h3>
      <label>模块类型<input name="type" value="${block.type}" readonly /></label>
      <label>名称<input name="label" value="${block.label || ""}" /></label>
      <label>文字<textarea name="text" rows="5">${block.text || ""}</textarea></label>
      <label>图片<input name="image" value="${block.image || ""}" /></label>
      <label>图片说明<input name="caption" value="${block.caption || ""}" /></label>
      <label>商品 ID<input name="productIds" value="${(block.productIds || []).join(", ")}" /></label>
      <div class="form-grid">
        <label>X<input name="x" type="number" value="${block.x || 0}" /></label>
        <label>Y<input name="y" type="number" value="${block.y || 0}" /></label>
        <label>宽度<input name="w" type="number" value="${block.w || 760}" /></label>
        <label>高度<input name="h" type="number" value="${block.h || 160}" /></label>
      </div>
      <div class="js-inspector-actions">
        <button class="button button-secondary" type="button" data-js-duplicate-block>复制</button>
        <button class="button button-secondary" type="button" data-js-delete-block>删除</button>
      </div>
    `;
  }

  async function loadPlatformData() {
    const state = bridge().state;
    const tasks = [];

    // Always attempt brand load for Super Admin / brand readers — never leave a
    // stale empty table after a successful save.
    if (can("brand.read") || can("brand.write")) {
      tasks.push(
        api("/brands")
          .then((data) => {
            state.brands = data.items || data.brands || [];
          })
          .catch((error) => {
            state.brands = state.brands || [];
            toast(error.message || "品牌列表加载失败。", true);
          })
      );
    }
    if (can("material.read")) {
      tasks.push(
        api("/materials").then((data) => {
          state.materials = data.items || [];
        })
      );
    }
    if (can("country.read")) {
      tasks.push(
        api("/countries").then((data) => {
          state.countries = data.items || [];
        })
      );
    }
    if (can("content.read")) {
      tasks.push(
        api("/crafts")
          .then((data) => {
            state.crafts = data.items || [];
          })
          .catch(() => {
            state.crafts = state.crafts || [];
          })
      );
    }
    if (can("media.read")) {
      tasks.push(
        api("/media").then((data) => {
          state.media = data.media || [];
        })
      );
    }
    if (can("team.read")) {
      tasks.push(
        api("/team").then((data) => {
          state.team = data.users || [];
          state.roles = data.roles || [];
        })
      );
    }
    if (can("content.read")) {
      tasks.push(
        api("/site-content").then((data) => {
          state.siteContent = data.content || null;
        })
      );
    }
    if (can("audit.read")) {
      tasks.push(
        api("/trash").then((data) => {
          state.trash = data.records || [];
          state.trashRetentionDays = data.retentionDays || 7;
        })
      );
    }

    await Promise.allSettled(tasks);
    renderPlatform();
    refreshRelationPickers(document);
  }

  function renderMedia() {
    const grid = document.querySelector("[data-media-grid]");
    const empty = document.querySelector("[data-media-empty]");
    if (!grid) return;
    clear(grid);
    const media = bridge().state.media || [];
    const alive = new Set(media.map((asset) => asset.id));
    [...mediaSelection].forEach((id) => {
      if (!alive.has(id)) mediaSelection.delete(id);
    });
    if (!media.length) {
      if (empty) empty.hidden = false;
      syncMediaBulkBar();
      return;
    }
    if (empty) empty.hidden = true;
    media.forEach((asset) => {
      const card = el("article", { className: "media-card" });
      if (can("media.delete")) {
        const check = el("input", { type: "checkbox", className: "media-select" });
        check.dataset.selectMedia = asset.id;
        check.checked = mediaSelection.has(asset.id);
        check.setAttribute("aria-label", `选择 ${asset.filename || asset.id}`);
        check.addEventListener("change", () => {
          if (check.checked) mediaSelection.add(asset.id);
          else mediaSelection.delete(asset.id);
          syncMediaBulkBar();
        });
        card.appendChild(check);
      }
      if (String(asset.mimeType || "").startsWith("image/")) {
        const img = el("img");
        img.src = asset.path;
        img.alt = asset.altText || asset.filename;
        card.appendChild(img);
      } else {
        card.appendChild(el("div", { className: "media-file", text: asset.filename }));
      }
      card.append(
        el("strong", { text: asset.filename }),
        el("span", { text: asset.path })
      );
      const copy = el("button", {
        type: "button",
        className: "button button-secondary button-compact",
        text: "复制路径",
      });
      copy.addEventListener("click", async () => {
        await navigator.clipboard.writeText(asset.path);
        toast("已复制路径。");
      });
      card.appendChild(copy);
      if (can("media.delete")) {
        const del = el("button", {
          type: "button",
          className: "button button-secondary button-compact",
          text: "删除",
        });
        del.addEventListener("click", async () => {
          if (!confirm(`确认删除媒体「${asset.filename}」？将进入删除记录，保留 7 天。`)) return;
          try {
            await api(`/media/${encodeURIComponent(asset.id)}`, { method: "DELETE" });
            mediaSelection.delete(asset.id);
            toast("已移入删除记录（保留 7 天）。");
            await loadPlatformData();
          } catch (error) {
            toast(error.message, true);
          }
        });
        card.appendChild(del);
      }
      grid.appendChild(card);
    });
    syncMediaBulkBar();
  }

  function renderTrash() {
    const tbody = document.querySelector("[data-trash-table]");
    const empty = document.querySelector("[data-trash-empty]");
    if (!tbody) return;
    clear(tbody);
    const records = bridge().state.trash || [];
    if (!records.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    const typeLabel = {
      product: "商品",
      brand: "品牌/精选",
      material: "材料",
      country: "国家",
      designer: "设计师",
      craft: "工艺",
      media: "媒体",
    };
    records.forEach((record) => {
      const tr = el("tr");
      tr.append(
        el("td", { text: record.title || record.entityId }),
        el("td", { text: typeLabel[record.entityType] || record.entityType }),
        el("td", { text: record.entityId }),
        el("td", { text: record.deletedBy || "—" }),
        el("td", {
          text: record.deletedAt ? new Date(record.deletedAt).toLocaleString() : "—",
        }),
        el("td", {
          text: record.purgeAfter ? new Date(record.purgeAfter).toLocaleString() : "—",
        })
      );
      const actions = el("td");
      const restore = el("button", {
        type: "button",
        className: "button button-secondary button-compact",
        text: "恢复",
      });
      restore.addEventListener("click", async () => {
        try {
          await api(`/trash/${encodeURIComponent(record.id)}/restore`, { method: "POST" });
          toast("已恢复。");
          window.location.reload();
        } catch (error) {
          toast(error.message, true);
        }
      });
      actions.appendChild(restore);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    });
  }

  function renderTeam() {
    const tbody = document.querySelector("[data-team-table]");
    const empty = document.querySelector("[data-team-empty]");
    if (!tbody) return;
    clear(tbody);
    const users = bridge().state.team || [];
    if (!users.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    users.forEach((user) => {
      const tr = el("tr");
      tr.append(
        el("td", { text: user.email }),
        el("td", { text: user.displayName || "—" }),
        el("td", {
          text: (user.roles || []).map((role) => role.name || role.id).join(", ") || "—",
        }),
        el("td", { text: user.isActive === false ? "停用" : "启用" })
      );
      tbody.appendChild(tr);
    });
  }

  function renderSiteContent() {
    const form = document.querySelector("[data-site-content-form]");
    const content = bridge().state.siteContent;
    if (!form || !content) return;
    const home = content.home || {};
    const about = content.about || {};
    const membership = content.membership || {};
    const journal = content.journal || {};
    setValue(form, "heroTitle", home.heroTitle || "");
    setValue(form, "heroTitleEn", home.heroTitleEn || "");
    setValue(form, "heroBody", home.heroBody || "");
    setValue(form, "heroBodyEn", home.heroBodyEn || "");
    setValue(form, "heroCta", home.heroCta || "");
    setValue(form, "heroCtaEn", home.heroCtaEn || "");
    setValue(form, "aboutTitle", about.title || "");
    setValue(form, "aboutTitleEn", about.titleEn || "");
    setValue(form, "aboutBody", about.body || about.lead || "");
    setValue(form, "aboutBodyEn", about.bodyEn || about.leadEn || "");
    setValue(form, "aboutH1", about.h1 || "");
    setValue(form, "aboutH1En", about.h1En || "");
    setValue(form, "aboutP1", about.p1 || "");
    setValue(form, "aboutP1En", about.p1En || "");
    setValue(form, "aboutP2", about.p2 || "");
    setValue(form, "aboutP2En", about.p2En || "");
    setValue(form, "aboutH2", about.h2 || "");
    setValue(form, "aboutH2En", about.h2En || "");
    setValue(form, "aboutP3", about.p3 || "");
    setValue(form, "aboutP3En", about.p3En || "");
    setValue(form, "aboutH3", about.h3 || "");
    setValue(form, "aboutH3En", about.h3En || "");
    setValue(form, "aboutP4", about.p4 || "");
    setValue(form, "aboutP4En", about.p4En || "");
    setValue(form, "aboutMission", about.mission || "");
    setValue(form, "aboutMissionEn", about.missionEn || "");
    setValue(form, "membershipTitle", membership.title || "");
    setValue(form, "membershipTitleEn", membership.titleEn || "");
    setValue(form, "membershipLead", membership.lead || "");
    setValue(form, "membershipLeadEn", membership.leadEn || "");
    for (const n of ["01", "02", "03", "04", "05", "06"]) {
      setValue(form, `membership${n}`, membership[n] || "");
      setValue(form, `membership${n}En`, membership[`${n}En`] || "");
      setValue(form, `membership${n}b`, membership[`${n}b`] || "");
      setValue(form, `membership${n}bEn`, membership[`${n}bEn`] || "");
    }
    setValue(form, "membershipCta", membership.cta || "");
    setValue(form, "membershipCtaEn", membership.ctaEn || "");
    setValue(form, "journalTitle", journal.title || "");
    setValue(form, "journalTitleEn", journal.titleEn || "");
    setValue(form, "journalLead", journal.lead || "");
    setValue(form, "journalLeadEn", journal.leadEn || "");
    setValue(
      form,
      "journalItemsJson",
      Array.isArray(journal.items) ? JSON.stringify(journal.items, null, 2) : ""
    );
  }

  function renderPlatform() {
    renderEntityTable("brand", bridge().state.brands || []);
    renderEntityTable("material", bridge().state.materials || []);
    renderEntityTable("country", bridge().state.countries || []);
    renderEntityTable("craft", bridge().state.crafts || []);
    renderMedia();
    renderTeam();
    renderSiteContent();
    renderJournalStudio();
    renderTrash();
  }

  function selectJournalBlock(blockId, additive = false) {
    if (!blockId) return;
    if (!additive) journalStudioState.selectedBlockIds.clear();
    if (journalStudioState.selectedBlockIds.has(blockId) && additive) {
      journalStudioState.selectedBlockIds.delete(blockId);
    } else {
      journalStudioState.selectedBlockIds.add(blockId);
    }
    journalStudioState.activeBlockId = blockId;
  }

  function bindJournalCanvasInteractions() {
    const viewport = document.querySelector(".js-canvas-viewport");
    const canvas = document.querySelector("[data-js-canvas]");
    if (!viewport || !canvas || viewport.dataset.jsCanvasBound) return;
    viewport.dataset.jsCanvasBound = "true";

    let dragState = null;
    let panState = null;

    viewport.addEventListener("pointerdown", (event) => {
      const blockNode = event.target.closest("[data-js-block]");
      const canvasNode = event.target.closest("[data-js-canvas]");
      if (blockNode) {
        const studio = getJournalStudio();
        const blocks = activeCanvasBlocks(studio);
        const blockId = blockNode.dataset.jsBlock;
        const block = blocks.find((item) => item.id === blockId);
        if (!block || block.locked) return;

        selectJournalBlock(blockId, event.shiftKey || event.metaKey);
        const selected = journalStudioState.selectedBlockIds.size
          ? Array.from(journalStudioState.selectedBlockIds)
          : [blockId];
        const groupIds = new Set(selected.map((id) => blocks.find((item) => item.id === id)?.groupId).filter(Boolean));
        const movableIds = new Set([
          ...selected,
          ...blocks.filter((item) => groupIds.has(item.groupId)).map((item) => item.id),
        ]);
        const startBlocks = blocks
          .filter((item) => movableIds.has(item.id))
          .map((item) => ({ id: item.id, x: Number(item.x || 0), y: Number(item.y || 0) }));
        dragState = {
          studio,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startBlocks,
          moved: false,
        };
        blockNode.setPointerCapture(event.pointerId);
        renderJournalStudio();
        event.preventDefault();
        return;
      }

      if (canvasNode || event.target === viewport) {
        panState = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startPanX: journalStudioState.panX,
          startPanY: journalStudioState.panY,
        };
        viewport.setPointerCapture(event.pointerId);
        viewport.classList.add("is-panning");
      }
    });

    viewport.addEventListener("pointermove", (event) => {
      if (dragState) {
        const scale = journalStudioState.zoom / 100;
        const dx = (event.clientX - dragState.startX) / scale;
        const dy = (event.clientY - dragState.startY) / scale;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.moved = true;
        const blocks = activeCanvasBlocks(dragState.studio);
        dragState.startBlocks.forEach((start) => {
          const block = blocks.find((item) => item.id === start.id);
          if (!block) return;
          block.x = Math.min(snapCanvasValue(start.x + dx), JS_CANVAS_WIDTH - Number(block.w || 240) - 24);
          block.y = Math.min(snapCanvasValue(start.y + dy), JS_CANVAS_HEIGHT - Number(block.h || 80) - 24);
        });
        const issue = dragState.studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
        if (issue) renderJournalCanvas(issue);
        event.preventDefault();
        return;
      }

      if (panState) {
        journalStudioState.panX = panState.startPanX + event.clientX - panState.startX;
        journalStudioState.panY = panState.startPanY + event.clientY - panState.startY;
        const issue = getActiveIssue();
        if (issue) renderJournalCanvas(issue);
        event.preventDefault();
      }
    });

    viewport.addEventListener("pointerup", async (event) => {
      if (dragState) {
        const studio = dragState.studio;
        const shouldSave = dragState.moved;
        dragState = null;
        if (shouldSave) {
          const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
          if (issue) issue.updatedAt = nowIso();
          try {
            await persistJournalStudioDraft(studio);
            toast("画布位置已保存。");
          } catch (error) {
            toast(error.message || "Canvas 保存失败。", true);
          }
        }
        return;
      }
      if (panState) {
        panState = null;
        viewport.classList.remove("is-panning");
      }
    });

    viewport.addEventListener("pointercancel", () => {
      dragState = null;
      panState = null;
      viewport.classList.remove("is-panning");
    });
  }

  function bindPlatform() {
    document.querySelector("[data-tina-refresh]")?.addEventListener("click", async () => {
      tinaConfigCache = null;
      await loadTinaEditorConfig({ force: true });
      toast("TinaCMS 配置已刷新。");
    });

    document.querySelector("[data-js-new-issue]")?.addEventListener("click", async () => {
      await mutateJournalStudio((studio) => {
        const issue = jsDefaultIssue();
        studio.issues = [issue, ...(studio.issues || [])];
        journalStudioState.activeIssueId = issue.id;
        journalStudioState.activeBlockId = issue.blocks[0]?.id || "";
        journalStudioState.selectedBlockIds = new Set(journalStudioState.activeBlockId ? [journalStudioState.activeBlockId] : []);
      }, "已创建新的杂志专题。");
    });

    document.querySelector("[data-js-save]")?.addEventListener("click", async () => {
      await saveJournalStudio(getJournalStudio(), "杂志工作室已手动保存。");
    });

    document.querySelector("[data-js-import]")?.addEventListener("click", () => {
      toast("导入入口已预留：后续可接入文档、表格或品牌资料库。");
    });

    document.querySelector("[data-js-back]")?.addEventListener("click", () => {
      journalStudioState.activeIssueId = "";
      journalStudioState.activeBlockId = "";
      journalStudioState.selectedBlockIds.clear();
      renderJournalStudio();
    });

    document.querySelector("[data-journal-studio]")?.addEventListener("click", async (event) => {
      const issueButton = event.target.closest("[data-js-open-issue]");
      if (issueButton) {
        const issue = getJournalStudio().issues.find((item) => item.id === issueButton.dataset.jsOpenIssue);
        journalStudioState.activeIssueId = issueButton.dataset.jsOpenIssue;
        journalStudioState.activeBlockId = issue?.blocks?.[0]?.id || "";
        journalStudioState.selectedBlockIds = new Set(journalStudioState.activeBlockId ? [journalStudioState.activeBlockId] : []);
        renderJournalStudio();
        return;
      }

      const blockNode = event.target.closest("[data-js-block]");
      if (blockNode) {
        selectJournalBlock(blockNode.dataset.jsBlock, event.shiftKey || event.metaKey);
        renderJournalStudio();
        return;
      }

      if (event.target.closest("[data-js-toggle-navigator]")) {
        journalStudioState.navigatorCollapsed = !journalStudioState.navigatorCollapsed;
        renderJournalStudio();
        return;
      }

      if (event.target.closest("[data-js-toggle-inspector]")) {
        journalStudioState.inspectorCollapsed = !journalStudioState.inspectorCollapsed;
        renderJournalStudio();
        return;
      }

      const addBlock = event.target.closest("[data-js-add-block]");
      if (addBlock) {
        await mutateJournalStudio((studio) => {
          const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
          if (!issue) return;
          const block = jsDefaultBlock(addBlock.dataset.jsAddBlock);
          normalizeCanvasBlocks(issue);
          const last = (issue.blocks || [])[issue.blocks.length - 1];
          block.x = last ? Math.min(Number(last.x || 160) + 48, JS_CANVAS_WIDTH - Number(block.w || 760) - 32) : 160;
          block.y = last ? Math.min(Number(last.y || 120) + 80, JS_CANVAS_HEIGHT - Number(block.h || 170) - 32) : 120;
          issue.blocks = [...(issue.blocks || []), block];
          issue.updatedAt = nowIso();
          journalStudioState.activeBlockId = block.id;
          journalStudioState.selectedBlockIds = new Set([block.id]);
        }, "已添加画布模块。");
        return;
      }

      const step = event.target.closest("[data-js-step]");
      if (step) {
        await mutateJournalStudio((studio) => {
          const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
          if (!issue) return;
          const current = issue.workflow?.[step.dataset.jsStep] || "not_started";
          const next = current === "completed" ? "not_started" : current === "in_progress" ? "completed" : "in_progress";
          issue.workflow = { ...(issue.workflow || {}), [step.dataset.jsStep]: next };
          issue.updatedAt = nowIso();
        }, "流程状态已更新。");
        return;
      }

      if (event.target.closest("[data-js-group-blocks]")) {
        const selected = Array.from(journalStudioState.selectedBlockIds || []);
        if (selected.length < 2) {
          toast("至少选择两个模块才能分组。", true);
          return;
        }
        await mutateJournalStudio((studio) => {
          const blocks = activeCanvasBlocks(studio);
          const groupId = `group-${Date.now().toString(36)}`;
          blocks.forEach((block) => {
            if (selected.includes(block.id)) block.groupId = groupId;
          });
        }, "模块已分组。");
        return;
      }

      if (event.target.closest("[data-js-ungroup-blocks]")) {
        const selected = Array.from(journalStudioState.selectedBlockIds || []);
        await mutateJournalStudio((studio) => {
          const blocks = activeCanvasBlocks(studio);
          const groupIds = new Set(selected.map((id) => blocks.find((block) => block.id === id)?.groupId).filter(Boolean));
          blocks.forEach((block) => {
            if (selected.includes(block.id) || groupIds.has(block.groupId)) block.groupId = "";
          });
        }, "模块已取消分组。");
        return;
      }

      if (event.target.closest("[data-js-reset-view]")) {
        journalStudioState.panX = 0;
        journalStudioState.panY = 0;
        journalStudioState.zoom = 92;
        const zoom = document.querySelector("[data-js-zoom]");
        if (zoom) zoom.value = "92";
        renderJournalStudio();
        return;
      }

      const aiRewrite = event.target.closest("[data-js-ai-rewrite], [data-js-ai-shorten]");
      if (aiRewrite) {
        const issue = getActiveIssue();
        const block = issue?.blocks?.find((item) => item.id === journalStudioState.activeBlockId);
        if (!issue || !block) {
          toast("先选择一个可编辑的模块。", true);
          return;
        }
        const field = block.type === "image" ? "caption" : "text";
        const currentValue = String(block[field] || "").trim();
        if (!currentValue) {
          toast("当前模块没有可优化的文字。", true);
          return;
        }
        try {
          toast("AI 正在生成草稿建议。");
          const data = await api("/ai/optimize", {
            method: "POST",
            body: {
              entityType: "journal_studio",
              entityId: issue.id,
              mode: "single_field",
              field,
              currentValue,
              objective: "fashion_magazine",
              tone: "restrained",
              length: aiRewrite.dataset.jsAiShorten != null ? "shorter" : "similar",
              modelTier: "standard",
              sourceLanguage: "auto",
              targetLanguage: "auto",
              context: {
                issueTitle: issue.title,
                issueDescription: issue.description,
                blockType: block.type,
                label: block.label,
              },
              customInstruction: "Keep the Orbmare editorial tone: restrained, precise, warm like an old friend, and do not invent facts.",
            },
          });
          const optimized = data?.result?.optimized;
          if (!optimized) {
            toast("AI 没有返回可用文本。", true);
            return;
          }
          const studio = getJournalStudio();
          const blocks = activeCanvasBlocks(studio);
          const target = blocks.find((item) => item.id === block.id);
          if (target) {
            target[field] = optimized;
            const targetIssue = studio.issues.find((item) => item.id === issue.id);
            if (targetIssue) targetIssue.updatedAt = nowIso();
            await persistJournalStudioDraft(studio);
            renderJournalStudio();
            toast("AI 草稿已写入选中模块。");
          }
        } catch (error) {
          toast(error.message || "AI 请求失败。", true);
        }
        return;
      }

      if (event.target.closest("[data-js-duplicate-block]")) {
        await mutateJournalStudio((studio) => {
          const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
          const block = issue?.blocks?.find((item) => item.id === journalStudioState.activeBlockId);
          if (!issue || !block) return;
          const copy = { ...JSON.parse(JSON.stringify(block)), id: `block-${Date.now().toString(36)}`, label: `${block.label || block.type} Copy`, groupId: "", x: Number(block.x || 0) + 40, y: Number(block.y || 0) + 40 };
          issue.blocks.push(copy);
          journalStudioState.activeBlockId = copy.id;
          journalStudioState.selectedBlockIds = new Set([copy.id]);
        }, "模块已复制。");
        return;
      }

      if (event.target.closest("[data-js-delete-block]")) {
        await mutateJournalStudio((studio) => {
          const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
          if (!issue) return;
          issue.blocks = (issue.blocks || []).filter((block) => block.id !== journalStudioState.activeBlockId);
          journalStudioState.activeBlockId = issue.blocks[0]?.id || "";
        }, "模块已删除。");
        return;
      }

      if (event.target.closest("[data-js-preview]")) {
        const issue = getActiveIssue();
        toast(issue ? `预览：${issue.title}` : "请选择专题。");
        return;
      }

      if (event.target.closest("[data-js-publish]")) {
        const issue = getActiveIssue();
        if (!issue) return;
        const article = issueToJournalArticle(issue);
        const content = bridge().state.siteContent || {};
        const existing = Array.isArray(content.journal?.items) ? content.journal.items : [];
        const nextItems = [article, ...existing.filter((item) => item.id !== article.id)];
        await api("/site-content", {
          method: "PATCH",
          body: {
            patch: {
              journal: { ...(content.journal || {}), items: nextItems },
              journalStudio: {
                ...getJournalStudio(),
                issues: getJournalStudio().issues.map((item) =>
                  item.id === issue.id ? { ...item, status: "published", updatedAt: nowIso() } : item
                ),
              },
            },
          },
        });
        toast("已发布到前台 Journal。");
        await loadPlatformData();
      }
    });

    document.querySelector("[data-js-zoom]")?.addEventListener("input", (event) => {
      journalStudioState.zoom = Number(event.target.value || 92);
      renderJournalStudio();
    });

    document.querySelector("[data-js-inspector]")?.addEventListener("input", async (event) => {
      const field = event.target;
      const name = field?.name;
      if (!name) return;
      const studio = getJournalStudio();
      const issue = studio.issues.find((item) => item.id === journalStudioState.activeIssueId);
      const block = issue?.blocks?.find((item) => item.id === journalStudioState.activeBlockId);
      if (!block) return;
      if (name === "productIds") block.productIds = String(field.value || "").split(",").map((part) => part.trim()).filter(Boolean);
      else if (["x", "y", "w", "h"].includes(name)) {
        const value = Number(field.value || 0);
        block[name] = name === "x" || name === "y" ? snapCanvasValue(value) : Math.max(80, value);
      }
      else block[name] = field.value;
      issue.updatedAt = nowIso();
      await api("/site-content", { method: "PATCH", body: { patch: { journalStudio: studio } } });
      bridge().state.siteContent = { ...(bridge().state.siteContent || {}), journalStudio: studio };
      renderJournalCanvas(issue);
    });

    document.querySelectorAll("[data-new-entity]").forEach((button) => {
      button.addEventListener("click", () => openEntityDialog(button.dataset.newEntity));
    });

    ["brand", "material", "country", "craft"].forEach((type) => {
      document
        .querySelector(`[data-${type}-table]`)
        ?.addEventListener("change", (event) => {
          const input = event.target.closest("[data-select-entity]");
          if (!input || input.dataset.entityType !== type) return;
          const selected = entitySelections[type];
          if (input.checked) selected.add(input.dataset.selectEntity);
          else selected.delete(input.dataset.selectEntity);
          syncEntityBulkBar(type);
        });

      document
        .querySelector(`[data-entity-select-all="${type}"]`)
        ?.addEventListener("change", (event) => {
          const checked = Boolean(event.target.checked);
          const selected = entitySelections[type];
          document
            .querySelectorAll(`[data-${type}-table] [data-select-entity]`)
            .forEach((input) => {
              input.checked = checked;
              const id = input.dataset.selectEntity;
              if (checked) selected.add(id);
              else selected.delete(id);
            });
          syncEntityBulkBar(type);
        });
    });

    document.querySelectorAll("[data-entity-bulk-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const type = button.dataset.entityBulkDelete;
        const selected = entitySelections[type];
        const ids = [...(selected || [])];
        if (!ids.length) return;
        if (
          !confirm(
            `确认批量删除已选 ${ids.length} 条？将进入删除记录，保留 7 天后永久清除。`
          )
        ) {
          return;
        }
        try {
          const result = await api(`/${type}s/batch-delete`, {
            method: "POST",
            body: { ids },
          });
          selected.clear();
          const failed = result.failed?.length || 0;
          toast(
            failed
              ? `已删除 ${result.deleted.length} 项，失败 ${failed} 项。`
              : `已批量删除 ${result.deleted.length} 项（保留 7 天）。`
          );
          await loadPlatformData();
        } catch (error) {
          toast(error.message, true);
        }
      });
    });

    document.querySelector("[data-media-bulk-delete]")?.addEventListener("click", async () => {
      const ids = [...mediaSelection];
      if (!ids.length) return;
      if (
        !confirm(
          `确认批量删除已选 ${ids.length} 个媒体？将进入删除记录，保留 7 天后永久清除。`
        )
      ) {
        return;
      }
      try {
        const result = await api("/media/batch-delete", {
          method: "POST",
          body: { ids },
        });
        mediaSelection.clear();
        const failed = result.failed?.length || 0;
        toast(
          failed
            ? `已删除 ${result.deleted.length} 项，失败 ${failed} 项。`
            : `已批量删除 ${result.deleted.length} 项（保留 7 天）。`
        );
        await loadPlatformData();
      } catch (error) {
        toast(error.message, true);
      }
    });

    const entityForm = document.querySelector("[data-entity-form]");
    entityForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const type = entityForm.dataset.entityType;
      if (!type) {
        toast("未识别的内容类型，请关闭后重试。", true);
        return;
      }
      const id = formValue(entityForm, "id").trim();
      const slugValue = formValue(entityForm, "slug").trim();
      const payload = {
        id,
        status: formValue(entityForm, "status"),
        name: formValue(entityForm, "nameEn"),
        nameEn: formValue(entityForm, "nameEn"),
        nameZh: formValue(entityForm, "nameZh"),
        image: formValue(entityForm, "image"),
        heroImage: formValue(entityForm, "image"),
        blurb: formValue(entityForm, "blurb"),
        blurbZh: formValue(entityForm, "blurbZh"),
        intro: formValue(entityForm, "blurb"),
        introZh: formValue(entityForm, "blurbZh"),
        story: formValue(entityForm, "story"),
        storyZh: formValue(entityForm, "storyZh"),
      };
      if (slugValue) payload.slug = slugValue;
      if (type === "brand") {
        payload.kind = formValue(entityForm, "kind") || "brand";
        payload.studio = formValue(entityForm, "studio");
        payload.studioZh = formValue(entityForm, "studioZh");
        payload.featured = Boolean(entityForm.elements.namedItem("featured")?.checked);
        payload.featuredRank = Number(formValue(entityForm, "featuredRank") || 100);
        Object.assign(payload, readBrandEditorial(entityForm));
        payload.heroImage = payload.heroImage || payload.image;
      }
      if (type === "country") {
        payload.code = id;
        Object.assign(payload, readCountryFields(entityForm));
      }
      if (type === "material") {
        try {
          Object.assign(payload, readMaterialFields(entityForm));
        } catch (error) {
          toast(error.message || "材料字段无效。", true);
          return;
        }
      }
      if (type === "craft") {
        payload.countries = linesList(formValue(entityForm, "countriesText"));
        payload.countriesZh = linesList(formValue(entityForm, "countriesZhText"));
        payload.history = formValue(entityForm, "craftHistory");
        payload.historyZh = formValue(entityForm, "craftHistoryZh");
        if (!payload.blurb) payload.blurb = payload.history;
        if (!payload.blurbZh) payload.blurbZh = payload.historyZh;
      }
      if (!id) {
        toast("请填写 ID。", true);
        return;
      }
      if (!payload.nameEn) {
        toast("请填写英文名。", true);
        return;
      }
      const submitBtn = entityForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      try {
        const editing = entityForm.elements.namedItem("id").readOnly;
        // Prefer ensured brand id on edit path when list already has prefixed id.
        let requestId = id;
        if (editing && type === "brand") {
          const existing = (bridge().state.brands || []).find(
            (row) =>
              row.id === id ||
              row.id === `brand-${id}` ||
              row.id === `studio-${id}` ||
              row.id === `designer-${id}`
          );
          if (existing) requestId = existing.id;
        }
        const data = await api(
          `/${type}s${editing ? `/${encodeURIComponent(requestId)}` : ""}`,
          {
            method: editing ? "PUT" : "POST",
            body: { ...payload, id: editing ? requestId : id },
          }
        );
        const saved = data.item;
        if (!saved?.id) throw new Error("服务器未返回保存结果，请刷新后确认是否写入。");

        if (type === "brand") {
          const list = bridge().state.brands || [];
          const index = list.findIndex((row) => row.id === saved.id);
          if (index >= 0) list[index] = saved;
          else list.unshift(saved);
          bridge().state.brands = list;
          renderEntityTable("brand", list);
        } else if (type === "material") {
          const list = bridge().state.materials || [];
          const index = list.findIndex((row) => row.id === saved.id);
          if (index >= 0) list[index] = saved;
          else list.unshift(saved);
          bridge().state.materials = list;
          renderEntityTable("material", list);
        } else if (type === "country") {
          const list = bridge().state.countries || [];
          const index = list.findIndex((row) => row.id === saved.id);
          if (index >= 0) list[index] = saved;
          else list.unshift(saved);
          bridge().state.countries = list;
          renderEntityTable("country", list);
        } else if (type === "craft") {
          const list = bridge().state.crafts || [];
          const index = list.findIndex((row) => row.id === saved.id);
          if (index >= 0) list[index] = saved;
          else list.unshift(saved);
          bridge().state.crafts = list;
          renderEntityTable("craft", list);
        }

        bridge().ai?.markClean?.(entityForm);
        document.querySelector("[data-entity-dialog]")?.close();
        toast(`已写入数据库：${saved.id}`);

        // Reload from server; if the saved row is missing, keep local copy and warn.
        if (typeof bridge().loadData === "function") {
          await bridge().loadData({ quiet: true });
        } else {
          await loadPlatformData();
        }
        const afterList =
          type === "brand"
            ? bridge().state.brands
            : type === "material"
              ? bridge().state.materials
              : type === "country"
                ? bridge().state.countries
                : type === "craft"
                  ? bridge().state.crafts
                  : null;
        if (afterList && !afterList.some((row) => row.id === saved.id)) {
          afterList.unshift(saved);
          if (type === "brand") bridge().state.brands = afterList;
          if (type === "material") bridge().state.materials = afterList;
          if (type === "country") bridge().state.countries = afterList;
          if (type === "craft") bridge().state.crafts = afterList;
          renderEntityTable(type, afterList);
          toast("保存成功，但重新加载列表时未读到该条，已保留本地显示。请检查数据库连接。", true);
        }
      } catch (error) {
        toast(error.message || "保存失败，未写入数据库。", true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    document.querySelector("[data-close-entity]")?.addEventListener("click", () => {
      const form = document.querySelector("[data-entity-form]");
      if (form && bridge().ai && !bridge().ai.confirmCloseIfDirty(form)) return;
      document.querySelector("[data-entity-dialog]")?.close();
    });
    document.querySelector("[data-cancel-entity]")?.addEventListener("click", () => {
      const form = document.querySelector("[data-entity-form]");
      if (form && bridge().ai && !bridge().ai.confirmCloseIfDirty(form)) return;
      document.querySelector("[data-entity-dialog]")?.close();
    });

    entityForm?.elements?.namedItem?.("image")?.addEventListener("change", () => {
      if (entityForm.dataset.entityType !== "brand") return;
      const image = formValue(entityForm, "image");
      const heroField = entityForm.elements.namedItem("heroImage");
      if (!heroField) return;
      const hero = String(heroField.value || "").trim();
      if (!hero) {
        setValue(entityForm, "heroImage", image);
        refreshUploads(entityForm);
      }
    });

    async function uploadMediaFiles(fileList) {
      if (!fileList?.length) return;
      const body = new FormData();
      [...fileList].forEach((file) => body.append("files", file));
      body.append("folder", "general");
      await api("/media/upload", { method: "POST", body, isFormData: true });
      toast("上传完成。");
      await loadPlatformData();
    }

    const uploadInput = document.querySelector("[data-media-upload]");
    uploadInput?.addEventListener("change", async () => {
      try {
        await uploadMediaFiles(uploadInput.files);
      } catch (error) {
        toast(error.message, true);
      } finally {
        uploadInput.value = "";
      }
    });

    const mediaDrop = document.querySelector("[data-media-dropzone]");
    ["dragenter", "dragover"].forEach((name) => {
      mediaDrop?.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        mediaDrop.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((name) => {
      mediaDrop?.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (name === "dragleave") mediaDrop.classList.remove("is-dragover");
      });
    });
    mediaDrop?.addEventListener("drop", async (event) => {
      mediaDrop.classList.remove("is-dragover");
      mediaDrop.classList.add("is-uploading");
      try {
        await uploadMediaFiles(event.dataTransfer?.files);
      } catch (error) {
        toast(error.message, true);
      } finally {
        mediaDrop.classList.remove("is-uploading");
      }
    });
    mediaDrop?.addEventListener("click", () => uploadInput?.click());
    mediaDrop?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        uploadInput?.click();
      }
    });

    refreshUploads(document);
    refreshRelationPickers(document);

    const teamForm = document.querySelector("[data-team-form]");
    teamForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/team", {
          method: "POST",
          body: {
            email: formValue(teamForm, "email"),
            displayName: formValue(teamForm, "displayName"),
            password: formValue(teamForm, "password"),
            roleIds: [formValue(teamForm, "roleId") || "viewer"],
          },
        });
        teamForm.reset();
        toast("员工已创建。");
        await loadPlatformData();
      } catch (error) {
        toast(error.message, true);
      }
    });

    const siteForm = document.querySelector("[data-site-content-form]");
    siteForm?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-add-journal-article]");
      if (!button) return;
      try {
        const items = parseJournalItems(siteForm);
        items.unshift(journalTemplate(button.dataset.addJournalArticle !== "public"));
        setValue(siteForm, "journalItemsJson", JSON.stringify(items, null, 2));
        toast(button.dataset.addJournalArticle === "public" ? "已新增公开 Journal 文章模板。" : "已新增会员 Journal 文章模板。");
      } catch (error) {
        toast(error.message || "Journal JSON 无法解析。", true);
      }
    });

    siteForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const journalItems = parseJournalItems(siteForm);
        const membership = {
          title: formValue(siteForm, "membershipTitle"),
          titleEn: formValue(siteForm, "membershipTitleEn"),
          lead: formValue(siteForm, "membershipLead"),
          leadEn: formValue(siteForm, "membershipLeadEn"),
          cta: formValue(siteForm, "membershipCta"),
          ctaEn: formValue(siteForm, "membershipCtaEn"),
        };
        for (const n of ["01", "02", "03", "04", "05", "06"]) {
          membership[n] = formValue(siteForm, `membership${n}`);
          membership[`${n}En`] = formValue(siteForm, `membership${n}En`);
          membership[`${n}b`] = formValue(siteForm, `membership${n}b`);
          membership[`${n}bEn`] = formValue(siteForm, `membership${n}bEn`);
        }
        await api("/site-content", {
          method: "PATCH",
          body: {
            patch: {
              home: {
                heroTitle: formValue(siteForm, "heroTitle"),
                heroTitleEn: formValue(siteForm, "heroTitleEn"),
                heroBody: formValue(siteForm, "heroBody"),
                heroBodyEn: formValue(siteForm, "heroBodyEn"),
                heroCta: formValue(siteForm, "heroCta"),
                heroCtaEn: formValue(siteForm, "heroCtaEn"),
              },
              about: {
                title: formValue(siteForm, "aboutTitle"),
                titleEn: formValue(siteForm, "aboutTitleEn"),
                body: formValue(siteForm, "aboutBody"),
                bodyEn: formValue(siteForm, "aboutBodyEn"),
                lead: formValue(siteForm, "aboutBody"),
                leadEn: formValue(siteForm, "aboutBodyEn"),
                h1: formValue(siteForm, "aboutH1"),
                h1En: formValue(siteForm, "aboutH1En"),
                p1: formValue(siteForm, "aboutP1"),
                p1En: formValue(siteForm, "aboutP1En"),
                p2: formValue(siteForm, "aboutP2"),
                p2En: formValue(siteForm, "aboutP2En"),
                h2: formValue(siteForm, "aboutH2"),
                h2En: formValue(siteForm, "aboutH2En"),
                p3: formValue(siteForm, "aboutP3"),
                p3En: formValue(siteForm, "aboutP3En"),
                h3: formValue(siteForm, "aboutH3"),
                h3En: formValue(siteForm, "aboutH3En"),
                p4: formValue(siteForm, "aboutP4"),
                p4En: formValue(siteForm, "aboutP4En"),
                mission: formValue(siteForm, "aboutMission"),
                missionEn: formValue(siteForm, "aboutMissionEn"),
              },
              membership,
              journal: {
                title: formValue(siteForm, "journalTitle"),
                titleEn: formValue(siteForm, "journalTitleEn"),
                lead: formValue(siteForm, "journalLead"),
                leadEn: formValue(siteForm, "journalLeadEn"),
                items: journalItems,
              },
            },
          },
        });
        bridge().ai?.markClean?.(siteForm);
        toast("站点文案已保存。");
        await loadPlatformData();
      } catch (error) {
        toast(error.message, true);
      }
    });

    const siteAiForm = document.querySelector("[data-site-content-form]");
    if (siteAiForm) {
      siteAiForm.dataset.aiEntityType = "site_content";
      bridge().ai?.mountForm?.(siteAiForm, {
        entityType: "site_content",
        getEntityId: () => "site-content",
      });
    }

    const searchInput = document.querySelector("[data-global-search]");
    const searchResults = document.querySelector("[data-global-search-results]");
    let searchTimer = null;
    searchInput?.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(async () => {
        const q = searchInput.value.trim();
        if (!searchResults) return;
        if (q.length < 2) {
          searchResults.hidden = true;
          clear(searchResults);
          return;
        }
        try {
          const data = await api(`/search?q=${encodeURIComponent(q)}`);
          clear(searchResults);
          (data.groups || []).forEach((group) => {
            searchResults.appendChild(el("p", { className: "search-group-label", text: group.label }));
            group.items.forEach((item) => {
              const button = el("button", {
                type: "button",
                className: "search-result",
                text: `${item.title} · ${item.subtitle || item.id}`,
              });
              button.addEventListener("click", () => {
                const sectionMap = {
                  product: "products",
                  order: "shipping",
                  brand: "brands",
                  material: "materials",
                  country: "countries",
                  craft: "crafts",
                };
                bridge().activateSection(sectionMap[item.type] || "overview");
                searchResults.hidden = true;
              });
              searchResults.appendChild(button);
            });
          });
          searchResults.hidden = !(data.groups || []).length;
        } catch {
          searchResults.hidden = true;
        }
      }, 250);
    });
  }

  window.__orbmareAdminPlatform = {
    applyNavPermissions,
    loadPlatformData,
    renderPlatform,
    bindPlatform,
  };
})();
