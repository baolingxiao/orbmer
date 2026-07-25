/**
 * Managed editorial entities: brands, materials, countries, designers, crafts.
 * Postgres when available; JSON file fallback under ADMIN_DATA_DIR.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isDatabaseEnabled } from "./db/index.js";
import * as contentRepo from "./db/content-repo.js";
import { normalizeBrandEditorial } from "./brand-editorial.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TYPES = new Set(["brand", "material", "country", "designer", "craft"]);
const STATUSES = new Set(["draft", "in_review", "published", "hidden", "archived"]);
export const BRAND_KINDS = new Set(["brand", "studio", "designer"]);
export const BRAND_KIND_PREFIX = {
  brand: "brand-",
  studio: "studio-",
  designer: "designer-",
};

export function brandKindFromId(id) {
  const value = String(id || "").toLowerCase();
  if (value.startsWith("studio-")) return "studio";
  if (value.startsWith("designer-")) return "designer";
  if (value.startsWith("brand-")) return "brand";
  return "";
}

export function ensureBrandId(kind, rawId, nameFallback = "") {
  if (!BRAND_KINDS.has(kind)) {
    throw new Error("Brand kind must be brand, studio, or designer.");
  }
  let base = String(rawId || "")
    .trim()
    .toLowerCase()
    .replace(/^(brand|studio|designer)-/, "");
  if (!base) {
    base = String(nameFallback || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }
  if (!base) throw new Error("Brand id is required.");
  base = base
    .replace(/[^a-z0-9\u4e00-\u9fff-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${BRAND_KIND_PREFIX[kind]}${base}`.slice(0, 80);
}

function runtimeDir() {
  return process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : path.join(__dirname, "runtime-data");
}

function storePath() {
  return path.join(runtimeDir(), "content-entities.json");
}

function ensureJsonStore() {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(storePath())) {
    const initial = {
      brand: [],
      material: [],
      country: [],
      designer: [],
      craft: [],
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(storePath(), JSON.stringify(initial, null, 2), { mode: 0o600 });
  }
}

function readJson() {
  ensureJsonStore();
  return JSON.parse(fs.readFileSync(storePath(), "utf8"));
}

function writeJson(data) {
  ensureJsonStore();
  const temporary = `${storePath()}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, storePath());
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function assertType(type) {
  if (!TYPES.has(type)) throw new Error(`Unsupported content type: ${type}`);
}

function normalizeEntity(type, input, existing = null) {
  assertType(type);
  let id =
    String(input.id || existing?.id || slugify(input.slug || input.name || input.nameEn))
      .trim()
      .toLowerCase()
      .slice(0, 80);
  if (!id) throw new Error("Entity id is required.");

  let kind;
  if (type === "brand") {
    kind =
      String(input.kind || existing?.kind || brandKindFromId(id) || "brand").toLowerCase();
    if (!BRAND_KINDS.has(kind)) {
      throw new Error("Brand kind must be brand, studio, or designer.");
    }
    // Keep stable id when editing an existing row.
    if (existing?.id) {
      id = existing.id;
      kind = brandKindFromId(existing.id) || existing.kind || kind;
    } else {
      id = ensureBrandId(kind, id, input.nameEn || input.name || input.nameZh);
    }
  }

  const slug = slugify(input.slug || existing?.slug || id);
  const status = String(input.status || existing?.status || "draft");
  if (!STATUSES.has(status)) throw new Error("Unsupported status.");

  const base = {
    ...(existing || {}),
    ...input,
    id,
    slug,
    status,
    updatedAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (type === "brand") {
    base.kind = kind;
    base.kindLabel =
      kind === "studio" ? "工作室" : kind === "designer" ? "设计师" : "品牌";
    base.featured =
      input.featured !== undefined
        ? Boolean(input.featured)
        : Boolean(existing?.featured);
    const featuredRank = Number(input.featuredRank ?? existing?.featuredRank ?? 100);
    base.featuredRank = Number.isFinite(featuredRank)
      ? Math.max(0, Math.min(9999, Math.round(featuredRank)))
      : 100;
    const editorial = normalizeBrandEditorial(input, existing || {});
    Object.assign(base, editorial);
  }

  if (type === "country") {
    base.code = String(input.code || existing?.code || id).toLowerCase().slice(0, 16);
  }

  if (status === "published" && !base.publishedAt) {
    base.publishedAt = new Date().toISOString();
  }

  // Evidence tags for material claims — never auto-promote AI to verified.
  if (type === "material" && Array.isArray(input.sections)) {
    base.sections = input.sections.map((section) => ({
      ...section,
      evidence:
        section.evidence === "verified_fact" ||
        section.evidence === "brand_claim" ||
        section.evidence === "editorial_interpretation" ||
        section.evidence === "ai_draft" ||
        section.evidence === "needs_verification"
          ? section.evidence
          : section.evidence || "needs_verification",
    }));
  }

  return base;
}

export async function listContent(type, options = {}) {
  assertType(type);
  if (isDatabaseEnabled()) {
    return contentRepo.listEntities(type, options);
  }
  const data = readJson();
  let rows = data[type] || [];
  if (!options.includeDeleted) rows = rows.filter((row) => !row.deletedAt);
  if (options.status) rows = rows.filter((row) => row.status === options.status);
  return rows;
}

export async function getContent(type, id) {
  assertType(type);
  if (isDatabaseEnabled()) return contentRepo.getEntity(type, id);
  return (await listContent(type, { includeDeleted: false })).find((row) => row.id === id) || null;
}

export async function getPublishedContent(type) {
  return listContent(type, { status: "published" });
}

async function findExistingEntity(type, input) {
  if (!input?.id) return null;
  const direct = await getContent(type, input.id);
  if (direct) return direct;
  if (type !== "brand") return null;
  const kind = String(input.kind || brandKindFromId(input.id) || "brand").toLowerCase();
  if (!BRAND_KINDS.has(kind)) return null;
  try {
    const ensured = ensureBrandId(kind, input.id, input.nameEn || input.name || input.nameZh);
    if (ensured !== input.id) return getContent(type, ensured);
  } catch {
    return null;
  }
  return null;
}

export async function saveContent(type, input, { userId = null, actor = "" } = {}) {
  assertType(type);
  const existing = await findExistingEntity(type, input);
  const entity = normalizeEntity(type, input, existing);
  // Prefer stable unique slug = final id when client sent a bare/empty slug.
  if (!String(input.slug || "").trim() || String(input.slug).trim() === String(input.id || "").trim()) {
    entity.slug = slugify(entity.id);
  }
  const revision = Number(existing?.revision || 0) + 1;
  entity.revision = revision;

  if (isDatabaseEnabled()) {
    let saved;
    try {
      saved = await contentRepo.upsertEntity(type, entity, { userId });
    } catch (error) {
      const message = String(error?.message || error || "");
      if (/unique|duplicate/i.test(message) && entity.slug === slugify(entity.id)) {
        entity.slug = slugify(`${entity.id}-${Date.now().toString(36)}`);
        saved = await contentRepo.upsertEntity(type, entity, { userId });
      } else if (/unique|duplicate/i.test(message)) {
        throw new Error("Slug 或 ID 已存在，请换一个后再保存。");
      } else {
        throw error;
      }
    }
    await contentRepo.saveRevision({
      entityType: type,
      entityId: saved.id,
      revision,
      snapshot: saved,
      changeSummary: existing ? "update" : "create",
      actor,
      actorUserId: userId,
    });
    return saved;
  }

  const data = readJson();
  const list = data[type] || [];
  const index = list.findIndex((row) => row.id === entity.id);
  if (index >= 0) list[index] = entity;
  else list.push(entity);
  data[type] = list;
  data.updatedAt = new Date().toISOString();
  writeJson(data);
  return entity;
}

export async function deleteContent(type, id, { userId = null } = {}) {
  assertType(type);
  if (isDatabaseEnabled()) return contentRepo.softDeleteEntity(type, id, userId);
  const data = readJson();
  const list = data[type] || [];
  const index = list.findIndex((row) => row.id === id);
  if (index < 0) return false;
  list[index] = { ...list[index], deletedAt: new Date().toISOString() };
  data[type] = list;
  writeJson(data);
  return true;
}

export async function listContentRevisions(type, id) {
  if (!isDatabaseEnabled()) return [];
  return contentRepo.listRevisions(type, id);
}
