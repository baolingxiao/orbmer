/**
 * Shared drag-and-drop + local file image uploader for Orbmare admin.
 * Mounts on [data-path-upload] roots and writes resulting /assets/... paths
 * into a named input/textarea.
 */

function linesFromValue(value) {
  return String(value || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function uniquePaths(paths) {
  const seen = new Set();
  const out = [];
  for (const path of paths) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push(path);
  }
  return out;
}

const imageDimensionCache = new Map();

function isLikelyImagePath(src) {
  return /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(String(src || ""));
}

function loadImageDimensions(src) {
  const key = String(src || "").trim();
  if (!key || !isLikelyImagePath(key)) return Promise.resolve(null);
  if (imageDimensionCache.has(key)) return imageDimensionCache.get(key);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = key;
  });
  imageDimensionCache.set(key, promise);
  return promise;
}

function ratioLabel(width, height) {
  if (!width || !height) return "未知";
  return (width / height).toFixed(2);
}

function getImageFeedbackNode(root) {
  let node = root.querySelector("[data-upload-image-feedback]");
  if (node) return node;
  node = document.createElement("div");
  node.className = "image-rule-feedback";
  node.setAttribute("data-upload-image-feedback", "");
  node.hidden = true;
  const target = resolveTargetFromRoot(root);
  if (target) target.insertAdjacentElement("afterend", node);
  else root.appendChild(node);
  return node;
}

function resolveTargetFromRoot(root) {
  const name = root.getAttribute("data-upload-target");
  if (!name) return null;
  const form = root.closest("form") || document;
  return form.elements?.namedItem?.(name) || form.querySelector(`[name="${name}"]`);
}

function analyzeProductImage(path, dims, { multiple, index }) {
  if (!dims) {
    return {
      level: "warning",
      text: `${multiple ? `图集第 ${index + 1} 张` : "主图"}无法读取尺寸，请确认路径可访问。`,
    };
  }
  const { width, height } = dims;
  const ratio = width / height;
  const label = multiple ? `图集第 ${index + 1} 张` : "主图";
  const messages = [];

  if (!multiple) {
    if (width < 1200 || height < 1500) {
      messages.push(`${label}当前为 ${width} × ${height} px，建议使用 1600 × 2000 px，最低 1200 × 1500 px。`);
    }
    if (Math.abs(ratio - 0.8) > 0.06) {
      messages.push(`${label}比例为 ${ratioLabel(width, height)}，前台会按 4:5 裁切，可能裁掉主体。`);
    }
  } else {
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    if (longSide < 1600 || shortSide < 1200) {
      messages.push(`${label}为 ${width} × ${height} px。详情大图建议长边 ≥ 1600 px、短边 ≥ 1200 px。`);
    }
    if (index === 0 && Math.abs(ratio - 0.8) > 0.1) {
      messages.push(`图集第一张经常参与详情展示，当前比例为 ${ratioLabel(width, height)}；如需与主图统一，建议换成 4:5。`);
    }
  }

  if (width < 900 || height < 900) {
    messages.push(`${label}有一边低于 900 px，放大展示时可能发虚。`);
  }

  return messages.length
    ? { level: "warning", text: messages.join(" ") }
    : { level: "ok", text: `${label}尺寸 ${width} × ${height} px，适合当前展示。` };
}

async function syncImageGuidance(root, paths, multiple) {
  const targetName = root.getAttribute("data-upload-target");
  const folderName = root.getAttribute("data-upload-folder");
  if (folderName !== "products" || !["image", "images"].includes(targetName || "")) return;

  const list = uniquePaths(paths).filter(isLikelyImagePath);
  const feedback = getImageFeedbackNode(root);
  const token = `${Date.now()}-${Math.random()}`;
  root.dataset.imageCheckToken = token;

  if (!list.length) {
    feedback.hidden = true;
    feedback.innerHTML = "";
    feedback.classList.remove("is-warning", "is-ok");
    return;
  }

  const results = await Promise.all(
    list.map(async (path, index) => analyzeProductImage(path, await loadImageDimensions(path), { multiple, index }))
  );
  if (root.dataset.imageCheckToken !== token) return;

  const warnings = results.filter((item) => item.level === "warning");
  const items = warnings.length ? warnings : results.slice(0, multiple ? 3 : 1);
  feedback.hidden = false;
  feedback.classList.toggle("is-warning", Boolean(warnings.length));
  feedback.classList.toggle("is-ok", !warnings.length);
  feedback.innerHTML = `<strong>${warnings.length ? "图片提醒" : "图片检查通过"}</strong><ul>${items
    .map((item) => `<li>${item.text}</li>`)
    .join("")}</ul>`;
}

export function createAdminUploader({ api, toast } = {}) {
  if (typeof api !== "function") {
    throw new Error("createAdminUploader requires api()");
  }

  async function uploadFiles(files, { folder = "general", acceptImagesOnly = true } = {}) {
    const list = [...files].filter((file) => {
      if (!file) return false;
      if (acceptImagesOnly) return String(file.type || "").startsWith("image/");
      return true;
    });
    if (!list.length) {
      toast?.("请选择图片文件。", true);
      return [];
    }
    const body = new FormData();
    list.forEach((file) => body.append("files", file));
    body.append("folder", folder);
    const data = await api("/media/upload", { method: "POST", body, isFormData: true });
    return (data.media || []).map((row) => row.path).filter(Boolean);
  }

  function syncPreview(root, paths, multiple) {
    const preview = root.querySelector("[data-upload-preview]");
    const empty = root.querySelector("[data-upload-empty]");
    const clearBtn = root.querySelector("[data-upload-clear]");
    const grid = root.querySelector("[data-upload-grid]");
    const drop = root.querySelector("[data-upload-drop]");
    const list = uniquePaths(paths);

    if (grid) {
      grid.innerHTML = list
        .map(
          (src, index) => `<figure class="upload-thumb" data-upload-index="${index}">
            <img src="${src}" alt="" width="120" height="150" />
            <button type="button" class="upload-thumb-remove" data-upload-remove="${index}" aria-label="移除">×</button>
          </figure>`
        )
        .join("");
      if (list.length) grid.removeAttribute("hidden");
      else grid.setAttribute("hidden", "");
    }

    if (preview && !multiple) {
      const src = list[0] || "";
      if (src) {
        // Bust cache so a re-uploaded file at a new path always paints.
        preview.src = src;
        preview.removeAttribute("hidden");
        empty?.setAttribute("hidden", "");
        drop?.classList.add("has-image");
      } else {
        preview.removeAttribute("src");
        preview.setAttribute("hidden", "");
        empty?.removeAttribute("hidden");
        drop?.classList.remove("has-image");
      }
    } else if (multiple) {
      if (list.length) empty?.setAttribute("hidden", "");
      else empty?.removeAttribute("hidden");
      drop?.classList.toggle("has-image", Boolean(list.length));
    }

    if (clearBtn) {
      if (list.length) clearBtn.removeAttribute("hidden");
      else clearBtn.setAttribute("hidden", "");
    }

    syncImageGuidance(root, list, multiple);
  }

  function readTarget(target) {
    if (!target) return [];
    if (target.tagName === "TEXTAREA" || target.dataset.uploadMultiple === "1") {
      return linesFromValue(target.value);
    }
    return target.value ? [String(target.value).trim()] : [];
  }

  function writeTarget(target, paths, multiple) {
    if (!target) return;
    const list = uniquePaths(paths);
    if (multiple || target.tagName === "TEXTAREA") {
      target.value = list.join("\n");
    } else {
      target.value = list[0] || "";
    }
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function resolveTarget(root) {
    return resolveTargetFromRoot(root);
  }

  function mountRoot(root, { apiUpload = uploadFiles } = {}) {
    if (!root || root.dataset.uploadBound === "1") return;
    root.dataset.uploadBound = "1";

    const multiple = root.getAttribute("data-upload-multiple") === "1";
    const folder = root.getAttribute("data-upload-folder") || "general";
    const acceptAttr =
      root.getAttribute("data-upload-accept") || "image/jpeg,image/png,image/webp,image/gif";
    const imagesOnly = !acceptAttr.includes("video") && !acceptAttr.includes("pdf");

    const drop = root.querySelector("[data-upload-drop]");
    const fileInput = root.querySelector("[data-upload-file]");
    const pickBtn = root.querySelector("[data-upload-pick]");
    const clearBtn = root.querySelector("[data-upload-clear]");
    const target = resolveTarget(root);

    if (fileInput) fileInput.accept = acceptAttr;
    if (fileInput) fileInput.multiple = multiple;

    const refresh = () => syncPreview(root, readTarget(target), multiple);
    refresh();

    const openPicker = () => fileInput?.click();

    pickBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      openPicker();
    });
    drop?.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      if (event.target.closest("[data-upload-remove]")) return;
      openPicker();
    });
    drop?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPicker();
      }
    });

    clearBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      writeTarget(target, [], multiple);
      refresh();
    });

    root.querySelector("[data-upload-grid]")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-upload-remove]");
      if (!btn) return;
      event.preventDefault();
      const index = Number(btn.getAttribute("data-upload-remove"));
      const next = readTarget(target).filter((_, i) => i !== index);
      writeTarget(target, next, true);
      refresh();
    });

    fileInput?.addEventListener("change", async () => {
      const files = fileInput.files;
      if (!files?.length) return;
      drop?.classList.add("is-uploading");
      try {
        const paths = await apiUpload(files, { folder, acceptImagesOnly: imagesOnly });
        if (!paths.length) return;
        const next = multiple ? [...readTarget(target), ...paths] : paths;
        writeTarget(target, next, multiple);
        refresh();
        toast?.(multiple ? `已上传 ${paths.length} 张图片。` : "图片已上传。");
      } catch (error) {
        toast?.(error.message || "上传失败。", true);
      } finally {
        drop?.classList.remove("is-uploading");
        fileInput.value = "";
      }
    });

    ["dragenter", "dragover"].forEach((name) => {
      drop?.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        drop.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((name) => {
      drop?.addEventListener(name, (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (name === "dragleave") drop.classList.remove("is-dragover");
      });
    });
    drop?.addEventListener("drop", async (event) => {
      drop.classList.remove("is-dragover");
      const files = event.dataTransfer?.files;
      if (!files?.length) return;
      drop.classList.add("is-uploading");
      try {
        const paths = await apiUpload(files, { folder, acceptImagesOnly: imagesOnly });
        if (!paths.length) return;
        const next = multiple ? [...readTarget(target), ...paths] : paths;
        writeTarget(target, next, multiple);
        refresh();
        toast?.(multiple ? `已上传 ${paths.length} 张图片。` : "图片已上传。");
      } catch (error) {
        toast?.(error.message || "上传失败。", true);
      } finally {
        drop.classList.remove("is-uploading");
      }
    });

    target?.addEventListener("input", refresh);
    target?.addEventListener("change", refresh);

    root._uploadRefresh = refresh;
  }

  function mountAll(scope = document) {
    scope.querySelectorAll("[data-path-upload]").forEach((root) => mountRoot(root));
  }

  function refresh(scope = document) {
    scope.querySelectorAll("[data-path-upload]").forEach((root) => root._uploadRefresh?.());
  }

  return { uploadFiles, mountRoot, mountAll, refresh };
}

/** Markup helper for templates */
export function pathUploadMarkup({
  target,
  label,
  multiple = false,
  folder = "general",
  hint = "支持拖拽或点击选择本地图片（JPG / PNG / WebP / GIF）",
  keepPathInput = true,
  inputTag = "input",
  inputAttrs = "",
} = {}) {
  const multi = multiple ? "1" : "0";
  const pathField =
    keepPathInput === false
      ? `<input type="hidden" name="${target}" value="" />`
      : inputTag === "textarea"
        ? `<textarea name="${target}" rows="3" ${inputAttrs} placeholder="/assets/..."></textarea>`
        : `<input name="${target}" ${inputAttrs} placeholder="/assets/..." />`;

  return `
    <div class="field field-span-2" data-path-upload data-upload-target="${target}" data-upload-multiple="${multi}" data-upload-folder="${folder}">
      <label>${label}</label>
      <div
        class="entity-image-drop ${multiple ? "entity-image-drop-multi" : ""}"
        data-upload-drop
        tabindex="0"
        role="button"
        aria-label="${label}"
      >
        ${
          multiple
            ? `<div class="upload-grid" data-upload-grid hidden></div>
               <div class="entity-image-drop-empty" data-upload-empty>
                 <strong>拖拽图片到此处，或点击选择本地文件</strong>
                 <span>${hint}</span>
               </div>`
            : `<img data-upload-preview alt="" hidden width="320" height="400" />
               <div class="entity-image-drop-empty" data-upload-empty>
                 <strong>拖拽图片到此处，或点击选择本地文件</strong>
                 <span>${hint}</span>
               </div>`
        }
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" ${
          multiple ? "multiple" : ""
        } hidden data-upload-file />
      </div>
      <div class="entity-image-toolbar">
        <button class="button button-secondary button-compact" type="button" data-upload-pick>选择图片</button>
        <button class="button button-secondary button-compact" type="button" data-upload-clear hidden>清除</button>
      </div>
      ${pathField}
      <small>${hint}${keepPathInput ? "；也可直接粘贴 /assets/... 路径。" : ""}</small>
    </div>`;
}
