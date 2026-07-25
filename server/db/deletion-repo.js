import { query, withTransaction } from "./index.js";

const RETENTION_DAYS = 7;

export function purgeAfterFrom(deletedAt = new Date()) {
  const at = new Date(deletedAt);
  at.setUTCDate(at.getUTCDate() + RETENTION_DAYS);
  return at;
}

function rowToRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title || "",
    snapshot: row.snapshot || {},
    deletedBy: row.deleted_by || "",
    deletedByUserId: row.deleted_by_user_id || null,
    deletedAt: row.deleted_at?.toISOString?.() || row.deleted_at,
    purgeAfter: row.purge_after?.toISOString?.() || row.purge_after,
    restoredAt: row.restored_at?.toISOString?.() || row.restored_at || null,
    purgedAt: row.purged_at?.toISOString?.() || row.purged_at || null,
  };
}

export async function insertDeletionRecord({
  entityType,
  entityId,
  title = "",
  snapshot = {},
  deletedBy = "",
  deletedByUserId = null,
  deletedAt = new Date(),
}) {
  const purgeAfter = purgeAfterFrom(deletedAt);
  const { rows } = await query(
    `INSERT INTO deletion_records
       (entity_type, entity_id, title, snapshot, deleted_by, deleted_by_user_id, deleted_at, purge_after)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::timestamptz, $8::timestamptz)
     RETURNING *`,
    [
      entityType,
      entityId,
      title,
      JSON.stringify(snapshot),
      deletedBy,
      deletedByUserId,
      new Date(deletedAt).toISOString(),
      purgeAfter.toISOString(),
    ]
  );
  return rowToRecord(rows[0]);
}

export async function listActiveDeletions({ limit = 200 } = {}) {
  const { rows } = await query(
    `SELECT * FROM deletion_records
     WHERE restored_at IS NULL AND purged_at IS NULL
     ORDER BY deleted_at DESC
     LIMIT $1`,
    [Math.min(Number(limit) || 200, 500)]
  );
  return rows.map(rowToRecord);
}

export async function getDeletionRecord(id) {
  const { rows } = await query(`SELECT * FROM deletion_records WHERE id = $1`, [id]);
  return rowToRecord(rows[0]);
}

export async function markRestored(id) {
  const { rows } = await query(
    `UPDATE deletion_records
     SET restored_at = now()
     WHERE id = $1 AND restored_at IS NULL AND purged_at IS NULL
     RETURNING *`,
    [id]
  );
  return rowToRecord(rows[0]);
}

export async function markPurged(id) {
  const { rows } = await query(
    `UPDATE deletion_records
     SET purged_at = now()
     WHERE id = $1 AND purged_at IS NULL
     RETURNING *`,
    [id]
  );
  return rowToRecord(rows[0]);
}

export async function listDueForPurge() {
  const { rows } = await query(
    `SELECT * FROM deletion_records
     WHERE restored_at IS NULL
       AND purged_at IS NULL
       AND purge_after <= now()
     ORDER BY purge_after ASC
     LIMIT 200`
  );
  return rows.map(rowToRecord);
}

export { RETENTION_DAYS, withTransaction };
