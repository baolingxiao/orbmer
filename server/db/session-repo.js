import { query } from "./index.js";

export async function findAdminUserByEmail(email) {
  return findUserByEmailAndRole(email, "admin");
}

export async function findUserByEmailAndRole(email, role) {
  const normalized = String(email || "").trim().toLowerCase();
  const { rows } = await query(
    `SELECT id, email, email_normalized, password_hash, role, display_name, is_active
     FROM users
     WHERE email_normalized = $1 AND role = $2
     LIMIT 1`,
    [normalized, role]
  );
  return rows[0] || null;
}

export async function createSession({
  id,
  userId,
  csrfToken,
  purpose = "admin",
  ip = "",
  userAgent = "",
  expiresAt,
}) {
  await query(
    `INSERT INTO sessions (id, user_id, csrf_token, purpose, ip, user_agent, expires_at, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, now())`,
    [id, userId, csrfToken, purpose, ip, userAgent, new Date(expiresAt).toISOString()]
  );
}

export async function getSession(id, { purpose = null } = {}) {
  if (!id) return null;
  const { rows } = await query(
    `SELECT s.id, s.user_id, s.csrf_token, s.purpose, s.ip, s.expires_at, s.last_seen_at,
            u.email, u.role, u.is_active, u.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  if (!row.is_active) return null;
  if (purpose && row.purpose !== purpose) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await deleteSession(id);
    return null;
  }
  await query(`UPDATE sessions SET last_seen_at = now() WHERE id = $1`, [id]);
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name || "",
    role: row.role,
    csrfToken: row.csrf_token,
    purpose: row.purpose,
    expiresAt: new Date(row.expires_at).getTime(),
    lastSeenAt: Date.now(),
  };
}

export async function deleteSession(id) {
  if (!id) return;
  await query(`DELETE FROM sessions WHERE id = $1`, [id]);
}

export async function purgeExpiredSessions() {
  await query(`DELETE FROM sessions WHERE expires_at <= now()`);
}
