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

  function renderEntityTable(type, items) {
    const tbody = document.querySelector(`[data-${type}-table]`);
    const empty = document.querySelector(`[data-${type}-empty]`);
    if (!tbody) return;
    clear(tbody);
    if (!items.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    const writePerm =
      type === "designer" || type === "craft" ? "content.update" : `${type}.write`;
    items.forEach((item) => {
      const tr = el("tr");
      const nameCell = el("td", { text: item.nameZh || item.nameEn || item.name || item.id });
      tr.appendChild(nameCell);
      if (type === "brand") {
        tr.appendChild(el("td", { text: kindLabel(item.kind) }));
      }
      tr.append(el("td", { text: item.id }), el("td", { text: item.status || "—" }));
      if (type === "brand") {
        tr.appendChild(el("td", { text: item.featured ? "是" : "—" }));
      }
      tr.append(
        el("td", { text: item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—" })
      );
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
            toast(featured ? "已取消推荐。" : "已设为推荐，将出现在精选页滚动带。");
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
      materialIds: linesList(formValue(form, "materialIds")),
      signatureProductIds: linesList(formValue(form, "signatureProductIds")),
      relatedBrandIds: linesList(formValue(form, "relatedBrandIds")),
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
    // Second pass after paint: path inputs are filled before previews bind/refresh.
    requestAnimationFrame(() => refreshUploads(form));
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
  }

  function renderMedia() {
    const grid = document.querySelector("[data-media-grid]");
    const empty = document.querySelector("[data-media-empty]");
    if (!grid) return;
    clear(grid);
    const media = bridge().state.media || [];
    if (!media.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    media.forEach((asset) => {
      const card = el("article", { className: "media-card" });
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
    renderTrash();
  }

  function bindPlatform() {
    document.querySelectorAll("[data-new-entity]").forEach((button) => {
      button.addEventListener("click", () => openEntityDialog(button.dataset.newEntity));
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
        Object.assign(payload, readBrandEditorial(entityForm));
        payload.heroImage = payload.heroImage || payload.image;
        const existing = (bridge().state.brands || []).find(
          (row) => row.id === id || row.id.endsWith(`-${id.replace(/^(brand|studio|designer)-/, "")}`)
        );
        if (existing) payload.featured = Boolean(existing.featured);
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
    siteForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        let journalItems = [];
        const journalRaw = formValue(siteForm, "journalItemsJson").trim();
        if (journalRaw) {
          journalItems = JSON.parse(journalRaw);
          if (!Array.isArray(journalItems)) throw new Error("Journal 条目必须是数组。");
        }
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
