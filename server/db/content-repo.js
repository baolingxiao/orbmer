import { query } from "./index.js";

function rowToEntity(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    code: row.code || undefined,
    status: row.status,
    ...(row.payload || {}),
    createdBy: row.created_by || null,
    updatedBy: row.updated_by || null,
    publishedAt: row.published_at?.toISOString?.() || row.published_at || null,
    deletedAt: row.deleted_at?.toISOString?.() || row.deleted_at || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

function tableFor(type) {
  const map = {
    brand: "brands",
    material: "materials",
    country: "countries",
    designer: "designers",
    craft: "crafts",
  };
  const table = map[type];
  if (!table) throw new Error(`Unsupported content type: ${type}`);
  return table;
}

export async function listEntities(type, { includeDeleted = false, status = null } = {}) {
  const table = tableFor(type);
  const clauses = [];
  const params = [];
  if (!includeDeleted) clauses.push("deleted_at IS NULL");
  if (status) {
    params.push(status);
    clauses.push(`status = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT * FROM ${table} ${where} ORDER BY updated_at DESC`,
    params
  );
  return rows.map(rowToEntity);
}

export async function getEntity(type, id) {
  const table = tableFor(type);
  const { rows } = await query(
    `SELECT * FROM ${table} WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return rowToEntity(rows[0]);
}

export async function getEntityBySlug(type, slug) {
  const table = tableFor(type);
  const { rows } = await query(
    `SELECT * FROM ${table} WHERE slug = $1 AND deleted_at IS NULL`,
    [slug]
  );
  return rowToEntity(rows[0]);
}

export async function upsertEntity(type, entity, { userId = null } = {}) {
  const table = tableFor(type);
  const now = new Date().toISOString();
  const {
    id,
    slug,
    status = "draft",
    code,
    createdBy,
    updatedBy,
    publishedAt,
    createdAt,
    updatedAt,
    deletedAt,
    ...payload
  } = entity;

  if (type === "country") {
    await query(
      `INSERT INTO countries
         (id, code, slug, status, payload, created_by, updated_by, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::timestamptz, $9::timestamptz, $10::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         code = EXCLUDED.code,
         slug = EXCLUDED.slug,
         status = EXCLUDED.status,
         payload = EXCLUDED.payload,
         updated_by = EXCLUDED.updated_by,
         published_at = EXCLUDED.published_at,
         updated_at = EXCLUDED.updated_at`,
      [
        id,
        code || id,
        slug,
        status,
        JSON.stringify(payload),
        createdBy || userId,
        userId || updatedBy,
        publishedAt || (status === "published" ? now : null),
        createdAt || now,
        now,
      ]
    );
  } else {
    await query(
      `INSERT INTO ${table}
         (id, slug, status, payload, created_by, updated_by, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         slug = EXCLUDED.slug,
         status = EXCLUDED.status,
         payload = EXCLUDED.payload,
         updated_by = EXCLUDED.updated_by,
         published_at = EXCLUDED.published_at,
         updated_at = EXCLUDED.updated_at`,
      [
        id,
        slug,
        status,
        JSON.stringify(payload),
        createdBy || userId,
        userId || updatedBy,
        publishedAt || (status === "published" ? now : null),
        createdAt || now,
        now,
      ]
    );
  }
  return getEntity(type, id);
}

export async function softDeleteEntity(type, id, userId = null) {
  const table = tableFor(type);
  const { rowCount } = await query(
    `UPDATE ${table}
     SET deleted_at = now(), updated_at = now(), updated_by = COALESCE($2, updated_by)
     WHERE id = $1 AND deleted_at IS NULL`,
    [id, userId]
  );
  return rowCount > 0;
}

export async function saveRevision({
  entityType,
  entityId,
  revision,
  snapshot,
  changeSummary = "",
  actor = "",
  actorUserId = null,
}) {
  await query(
    `INSERT INTO content_revisions
       (entity_type, entity_id, revision, snapshot, change_summary, actor, actor_user_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
     ON CONFLICT (entity_type, entity_id, revision) DO NOTHING`,
    [
      entityType,
      entityId,
      revision,
      JSON.stringify(snapshot),
      changeSummary,
      actor,
      actorUserId,
    ]
  );
}

export async function listRevisions(entityType, entityId, { limit = 50 } = {}) {
  const { rows } = await query(
    `SELECT id, entity_type, entity_id, revision, change_summary, actor, created_at
     FROM content_revisions
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY revision DESC
     LIMIT $3`,
    [entityType, entityId, Math.min(Number(limit) || 50, 200)]
  );
  return rows.map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    revision: row.revision,
    changeSummary: row.change_summary,
    actor: row.actor,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  }));
}

export async function getRevision(entityType, entityId, revision) {
  const { rows } = await query(
    `SELECT * FROM content_revisions
     WHERE entity_type = $1 AND entity_id = $2 AND revision = $3`,
    [entityType, entityId, revision]
  );
  return rows[0] || null;
}
