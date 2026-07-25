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
      grid.hidden = !list.length;
    }

    if (preview && !multiple) {
      const src = list[0] || "";
      if (src) {
        preview.src = src;
        preview.hidden = false;
        empty && (empty.hidden = true);
        drop?.classList.add("has-image");
      } else {
        preview.removeAttribute("src");
        preview.hidden = true;
        empty && (empty.hidden = false);
        drop?.classList.remove("has-image");
      }
    } else if (multiple) {
      empty && (empty.hidden = Boolean(list.length));
      drop?.classList.toggle("has-image", Boolean(list.length));
    }

    if (clearBtn) clearBtn.hidden = !list.length;
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
    const name = root.getAttribute("data-upload-target");
    if (!name) return null;
    const form = root.closest("form") || document;
    return form.elements?.namedItem?.(name) || form.querySelector(`[name="${name}"]`);
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
