import { query } from "./index.js";

function cleanDetails(value) {
  if (!value || typeof value !== "object") return {};
  const safe = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/password|secret|token|cookie|authorization/i.test(key)) continue;
    if (entry === null || ["string", "number", "boolean"].includes(typeof entry)) {
      safe[key] = typeof entry === "string" ? entry.slice(0, 500) : entry;
    }
  }
  return safe;
}

export async function appendAuditEvent({
  actor,
  action,
  entityType,
  entityId,
  details = {},
  ip = "",
}) {
  const { rows } = await query(
    `INSERT INTO audit_events (actor, action, entity_type, entity_id, details, ip)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING id, at, actor, action, entity_type AS "entityType", entity_id AS "entityId", details, ip`,
    [
      String(actor || "unknown").slice(0, 254),
      String(action || "unknown").slice(0, 100),
      String(entityType || "system").slice(0, 80),
      String(entityId || "").slice(0, 160),
      JSON.stringify(cleanDetails(details)),
      String(ip || "").slice(0, 100),
    ]
  );
  const row = rows[0];
  return {
    id: row.id,
    at: row.at?.toISOString?.() || row.at,
    actor: row.actor,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    ip: row.ip,
  };
}

/**
 * @param {{ limit?: number, actor?: string, action?: string, entityType?: string, entityId?: string, from?: string, to?: string, q?: string }} filters
 */
export async function listAuditEvents(filters = {}) {
  const limit = Math.max(1, Math.min(500, Number(filters.limit) || 100));
  const clauses = [];
  const params = [];

  function add(clause, value) {
    params.push(value);
    clauses.push(clause.replace("?", `$${params.length}`));
  }

  if (filters.actor) add("actor = ?", String(filters.actor).slice(0, 254));
  if (filters.action) add("action = ?", String(filters.action).slice(0, 100));
  if (filters.entityType) add("entity_type = ?", String(filters.entityType).slice(0, 80));
  if (filters.entityId) add("entity_id = ?", String(filters.entityId).slice(0, 160));
  if (filters.from) add("at >= ?::timestamptz", String(filters.from));
  if (filters.to) add("at <= ?::timestamptz", String(filters.to));
  if (filters.q) {
    params.push(`%${String(filters.q).slice(0, 100)}%`);
    clauses.push(
      `(actor ILIKE $${params.length} OR action ILIKE $${params.length} OR entity_id ILIKE $${params.length} OR details::text ILIKE $${params.length})`
    );
  }

  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT id, at, actor, action, entity_type AS "entityType", entity_id AS "entityId", details, ip
     FROM audit_events
     ${where}
     ORDER BY at DESC
     LIMIT $${params.length}`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    at: row.at?.toISOString?.() || row.at,
    actor: row.actor,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details: row.details,
    ip: row.ip,
  }));
}
