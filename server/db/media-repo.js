import { query } from "./index.js";

function rowToMedia(row) {
  if (!row) return null;
  return {
    id: row.id,
    path: row.path,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    altText: row.alt_text || "",
    caption: row.caption || "",
    folder: row.folder || "general",
    tags: row.tags || [],
    source: row.source || "",
    copyrightStatus: row.copyright_status || "unknown",
    uploadedBy: row.uploaded_by || null,
    deletedAt: row.deleted_at?.toISOString?.() || row.deleted_at || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}

export async function listMedia({ folder = null, q = "", limit = 100, offset = 0 } = {}) {
  const params = [];
  const clauses = ["deleted_at IS NULL"];
  if (folder) {
    params.push(folder);
    clauses.push(`folder = $${params.length}`);
  }
  if (q) {
    params.push(`%${String(q).toLowerCase()}%`);
    clauses.push(
      `(lower(filename) LIKE $${params.length} OR lower(alt_text) LIKE $${params.length} OR path LIKE $${params.length})`
    );
  }
  params.push(Math.min(Number(limit) || 100, 500));
  params.push(Math.max(Number(offset) || 0, 0));
  const { rows } = await query(
    `SELECT * FROM media_assets
     WHERE ${clauses.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return rows.map(rowToMedia);
}

export async function getMedia(id) {
  const { rows } = await query(
    `SELECT * FROM media_assets WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return rowToMedia(rows[0]);
}

export async function getMediaByPath(pathValue) {
  const { rows } = await query(
    `SELECT * FROM media_assets WHERE path = $1 AND deleted_at IS NULL`,
    [pathValue]
  );
  return rowToMedia(rows[0]);
}

export async function insertMedia(asset) {
  const { rows } = await query(
    `INSERT INTO media_assets
       (path, filename, mime_type, size_bytes, width, height, alt_text, caption,
        folder, tags, source, copyright_status, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
     RETURNING *`,
    [
      asset.path,
      asset.filename,
      asset.mimeType,
      asset.sizeBytes,
      asset.width ?? null,
      asset.height ?? null,
      asset.altText || "",
      asset.caption || "",
      asset.folder || "general",
      JSON.stringify(asset.tags || []),
      asset.source || "",
      asset.copyrightStatus || "unknown",
      asset.uploadedBy || null,
    ]
  );
  return rowToMedia(rows[0]);
}

export async function updateMedia(id, patch) {
  const current = await getMedia(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  const { rows } = await query(
    `UPDATE media_assets SET
       alt_text = $2,
       caption = $3,
       folder = $4,
       tags = $5::jsonb,
       source = $6,
       copyright_status = $7
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [
      id,
      next.altText || "",
      next.caption || "",
      next.folder || "general",
      JSON.stringify(next.tags || []),
      next.source || "",
      next.copyrightStatus || "unknown",
    ]
  );
  return rowToMedia(rows[0]);
}

export async function softDeleteMedia(id) {
  const usages = await listUsages(id);
  if (usages.length) {
    const error = new Error("Media is still in use and cannot be deleted.");
    error.usages = usages;
    throw error;
  }
  const { rowCount } = await query(
    `UPDATE media_assets SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return rowCount > 0;
}

export async function listUsages(mediaId) {
  const { rows } = await query(
    `SELECT entity_type, entity_id, field FROM media_usages WHERE media_id = $1`,
    [mediaId]
  );
  return rows.map((row) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    field: row.field,
  }));
}

export async function setUsage(mediaId, entityType, entityId, field = "") {
  await query(
    `INSERT INTO media_usages (media_id, entity_type, entity_id, field)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (media_id, entity_type, entity_id, field) DO NOTHING`,
    [mediaId, entityType, entityId, field]
  );
}

export async function clearUsagesForEntity(entityType, entityId) {
  await query(
    `DELETE FROM media_usages WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId]
  );
}
