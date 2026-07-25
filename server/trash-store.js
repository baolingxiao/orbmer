/**
 * Soft-delete trash: keep records 7 days, then hard purge.
 */
import { isDatabaseEnabled, query, withTransaction } from "./db/index.js";
import * as deletionRepo from "./db/deletion-repo.js";
import * as productRepo from "./db/product-repo.js";
import * as contentRepo from "./db/content-repo.js";
import * as mediaRepo from "./db/media-repo.js";
import { getManagedProduct } from "./product-store.js";
import { getContent, saveContent } from "./content-store.js";

const CONTENT_TYPES = new Set(["brand", "material", "country", "designer", "craft"]);

function titleForProduct(product) {
  return product?.zh?.name || product?.en?.name || product?.id || "Product";
}

function titleForEntity(entity) {
  return entity?.nameZh || entity?.nameEn || entity?.name || entity?.id || "Item";
}

export async function softDeleteProduct(id, { actor = "", userId = null } = {}) {
  const product = await getManagedProduct(id);
  if (!product || product.deletedAt) return null;

  if (isDatabaseEnabled()) {
    const snapshot = {
      ...product,
      _wasPublished: product.lifecycleStatus === "published",
    };
    await query(
      `UPDATE products
       SET deleted_at = now(),
           lifecycle_status = CASE
             WHEN lifecycle_status = 'published' THEN 'archived'
             ELSE lifecycle_status
           END,
           updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    await deletionRepo.insertDeletionRecord({
      entityType: "product",
      entityId: id,
      title: titleForProduct(product),
      snapshot,
      deletedBy: actor,
      deletedByUserId: userId,
    });
    return getManagedProduct(id, { includeDeleted: true });
  }

  const { markProductDeleted } = await import("./product-store.js");
  return markProductDeleted(id, { actor, userId });
}

export async function softDeleteContentEntity(
  type,
  id,
  { actor = "", userId = null } = {}
) {
  if (!CONTENT_TYPES.has(type)) throw new Error(`Unsupported type: ${type}`);
  const entity = await getContent(type, id);
  if (!entity) return false;

  if (isDatabaseEnabled()) {
    await contentRepo.softDeleteEntity(type, id, userId);
    await deletionRepo.insertDeletionRecord({
      entityType: type,
      entityId: id,
      title: titleForEntity(entity),
      snapshot: entity,
      deletedBy: actor,
      deletedByUserId: userId,
    });
    return true;
  }

  const { deleteContent } = await import("./content-store.js");
  const ok = await deleteContent(type, id, { userId });
  if (ok) {
    // JSON mode: append to runtime trash file via deletion repo fallback below
    await appendJsonTrash({
      entityType: type,
      entityId: id,
      title: titleForEntity(entity),
      snapshot: entity,
      deletedBy: actor,
    });
  }
  return ok;
}

export async function softDeleteMedia(id, { actor = "", userId = null } = {}) {
  const media = isDatabaseEnabled()
    ? await mediaRepo.getMedia(id)
    : (await import("./media-store.js").then((m) => m.listMediaLibrary())).find(
        (row) => row.id === id
      );
  if (!media) return false;

  if (isDatabaseEnabled()) {
    // Bypass usage block for soft delete into trash; usages cleared on purge.
    await query(
      `UPDATE media_assets SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );
    await deletionRepo.insertDeletionRecord({
      entityType: "media",
      entityId: id,
      title: media.filename || media.path,
      snapshot: media,
      deletedBy: actor,
      deletedByUserId: userId,
    });
    return true;
  }

  const { deleteMediaAsset } = await import("./media-store.js");
  await deleteMediaAsset(id);
  await appendJsonTrash({
    entityType: "media",
    entityId: id,
    title: media.filename || media.path,
    snapshot: media,
    deletedBy: actor,
  });
  return true;
}

async function appendJsonTrash(entry) {
  if (isDatabaseEnabled()) return;
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : path.join(__dirname, "runtime-data");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, "deletion-records.json");
  let rows = [];
  if (fs.existsSync(file)) {
    try {
      rows = JSON.parse(fs.readFileSync(file, "utf8")).records || [];
    } catch {
      rows = [];
    }
  }
  const deletedAt = new Date();
  const purgeAfter = deletionRepo.purgeAfterFrom(deletedAt);
  rows.unshift({
    id: `del-${Date.now().toString(36)}`,
    ...entry,
    deletedAt: deletedAt.toISOString(),
    purgeAfter: purgeAfter.toISOString(),
    restoredAt: null,
    purgedAt: null,
  });
  fs.writeFileSync(file, JSON.stringify({ records: rows }, null, 2), { mode: 0o600 });
}

export async function listTrash() {
  if (isDatabaseEnabled()) {
    return deletionRepo.listActiveDeletions();
  }
  const fs = await import("fs");
  const path = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : path.join(__dirname, "runtime-data");
  const file = path.join(dir, "deletion-records.json");
  if (!fs.existsSync(file)) return [];
  try {
    const rows = JSON.parse(fs.readFileSync(file, "utf8")).records || [];
    return rows.filter((row) => !row.restoredAt && !row.purgedAt);
  } catch {
    return [];
  }
}

export async function restoreDeletion(recordId, { actor = "" } = {}) {
  if (!isDatabaseEnabled()) {
    throw new Error("Restore requires PostgreSQL in this environment.");
  }
  const record = await deletionRepo.getDeletionRecord(recordId);
  if (!record || record.restoredAt || record.purgedAt) {
    throw new Error("Deletion record not found or already closed.");
  }

  const snapshot = record.snapshot || {};
  if (record.entityType === "product") {
    await query(
      `UPDATE products SET deleted_at = NULL, updated_at = now() WHERE id = $1`,
      [record.entityId]
    );
    if (snapshot.lifecycleStatus) {
      await productRepo.upsertProduct({
        ...snapshot,
        deletedAt: undefined,
        lifecycleStatus:
          snapshot.lifecycleStatus === "archived" && snapshot._wasPublished
            ? "published"
            : snapshot.lifecycleStatus,
      });
    }
  } else if (CONTENT_TYPES.has(record.entityType)) {
    await query(
      `UPDATE ${tableFor(record.entityType)}
       SET deleted_at = NULL, updated_at = now()
       WHERE id = $1`,
      [record.entityId]
    );
    await saveContent(record.entityType, { ...snapshot, deletedAt: null }, { actor });
  } else if (record.entityType === "media") {
    await query(
      `UPDATE media_assets SET deleted_at = NULL WHERE id = $1`,
      [record.entityId]
    );
  } else {
    throw new Error(`Cannot restore type: ${record.entityType}`);
  }

  return deletionRepo.markRestored(recordId);
}

function tableFor(type) {
  return {
    brand: "brands",
    material: "materials",
    country: "countries",
    designer: "designers",
    craft: "crafts",
  }[type];
}

async function hardPurgeRecord(record) {
  if (record.entityType === "product") {
    await productRepo.deleteProduct(record.entityId);
  } else if (CONTENT_TYPES.has(record.entityType)) {
    const table = tableFor(record.entityType);
    await query(`DELETE FROM ${table} WHERE id = $1`, [record.entityId]);
  } else if (record.entityType === "media") {
    await query(`DELETE FROM media_usages WHERE media_id = $1`, [record.entityId]);
    await query(`DELETE FROM media_assets WHERE id = $1`, [record.entityId]);
  }
  await deletionRepo.markPurged(record.id);
}

export async function purgeExpiredDeletions() {
  if (!isDatabaseEnabled()) return { purged: 0 };
  const due = await deletionRepo.listDueForPurge();
  let purged = 0;
  for (const record of due) {
    try {
      await hardPurgeRecord(record);
      purged += 1;
    } catch (error) {
      console.error(`[trash] purge failed ${record.entityType}:${record.entityId}`, error.message);
    }
  }
  return { purged, retentionDays: deletionRepo.RETENTION_DAYS };
}

export { RETENTION_DAYS } from "./db/deletion-repo.js";
