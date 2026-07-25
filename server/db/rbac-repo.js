import { query, withTransaction } from "./index.js";

export async function listRoles() {
  const { rows } = await query(
    `SELECT id, name, description, is_system, created_at
     FROM admin_roles
     ORDER BY name ASC`
  );
  return rows;
}

export async function listPermissions() {
  const { rows } = await query(
    `SELECT id, description FROM admin_permissions ORDER BY id ASC`
  );
  return rows;
}

export async function getPermissionsForUser(userId) {
  if (!userId) return [];
  const { rows } = await query(
    `SELECT DISTINCT rp.permission_id AS id
     FROM admin_user_roles ur
     JOIN admin_role_permissions rp ON rp.role_id = ur.role_id
     WHERE ur.user_id = $1
     ORDER BY 1`,
    [userId]
  );
  return rows.map((row) => row.id);
}

export async function getRolesForUser(userId) {
  if (!userId) return [];
  const { rows } = await query(
    `SELECT r.id, r.name, r.description
     FROM admin_user_roles ur
     JOIN admin_roles r ON r.id = ur.role_id
     WHERE ur.user_id = $1
     ORDER BY r.name ASC`,
    [userId]
  );
  return rows;
}

export async function assignRole(userId, roleId, assignedBy = null) {
  await query(
    `INSERT INTO admin_user_roles (user_id, role_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId, assignedBy]
  );
}

export async function setUserRoles(userId, roleIds, assignedBy = null) {
  const unique = [...new Set((roleIds || []).map(String))];
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM admin_user_roles WHERE user_id = $1`, [userId]);
    for (const roleId of unique) {
      await client.query(
        `INSERT INTO admin_user_roles (user_id, role_id, assigned_by)
         VALUES ($1, $2, $3)`,
        [userId, roleId, assignedBy]
      );
    }
  });
}

export async function ensureSuperAdmin(userId) {
  if (!userId) return;
  const { rows } = await query(
    `SELECT 1 FROM admin_user_roles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (rows.length === 0) {
    await assignRole(userId, "super_admin");
  }
}

export async function listAdminUsers() {
  const { rows } = await query(
    `SELECT u.id, u.email, u.display_name, u.is_active, u.created_at, u.updated_at,
            COALESCE(
              json_agg(
                json_build_object('id', r.id, 'name', r.name)
                ORDER BY r.name
              ) FILTER (WHERE r.id IS NOT NULL),
              '[]'::json
            ) AS roles
     FROM users u
     LEFT JOIN admin_user_roles ur ON ur.user_id = u.id
     LEFT JOIN admin_roles r ON r.id = ur.role_id
     WHERE u.role = 'admin'
     GROUP BY u.id
     ORDER BY u.created_at ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.display_name || "",
    isActive: row.is_active,
    roles: row.roles || [],
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  }));
}

export async function createAdminUser({
  email,
  passwordHash,
  displayName = "",
  roleIds = ["viewer"],
  isActive = true,
}) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid email is required.");
  }
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id FROM users WHERE email_normalized = $1`,
      [normalized]
    );
    if (existing.rowCount > 0) {
      throw new Error("A user with this email already exists.");
    }
    const inserted = await client.query(
      `INSERT INTO users (email, email_normalized, password_hash, role, display_name, is_active)
       VALUES ($1, $2, $3, 'admin', $4, $5)
       RETURNING id, email, display_name, is_active, created_at`,
      [email.trim(), normalized, passwordHash || null, displayName || "", isActive]
    );
    const user = inserted.rows[0];
    for (const roleId of roleIds) {
      await client.query(
        `INSERT INTO admin_user_roles (user_id, role_id) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [user.id, roleId]
      );
    }
    return user;
  });
}

export async function setAdminActive(userId, isActive) {
  const { rows } = await query(
    `UPDATE users
     SET is_active = $2, updated_at = now()
     WHERE id = $1 AND role = 'admin'
     RETURNING id, email, is_active`,
    [userId, Boolean(isActive)]
  );
  return rows[0] || null;
}

export async function revokeAllSessionsForUser(userId) {
  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
}

export async function recordLoginEvent({
  email = "",
  userId = null,
  success,
  ip = "",
  userAgent = "",
  reason = "",
}) {
  await query(
    `INSERT INTO admin_login_events (email, user_id, success, ip, user_agent, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [email, userId, Boolean(success), ip, String(userAgent || "").slice(0, 300), reason]
  );
}

export async function createInvitation({
  email,
  roleId,
  tokenHash,
  invitedBy,
  expiresAt,
}) {
  const normalized = String(email || "").trim().toLowerCase();
  const { rows } = await query(
    `INSERT INTO admin_invitations
       (email, email_normalized, role_id, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
     RETURNING id, email, role_id, expires_at, created_at`,
    [email.trim(), normalized, roleId, tokenHash, invitedBy, new Date(expiresAt).toISOString()]
  );
  return rows[0];
}

export async function findInvitationByTokenHash(tokenHash) {
  const { rows } = await query(
    `SELECT * FROM admin_invitations
     WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > now()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function acceptInvitation(invitationId, userId) {
  await query(
    `UPDATE admin_invitations
     SET accepted_at = now()
     WHERE id = $1`,
    [invitationId]
  );
  const inv = await query(`SELECT role_id FROM admin_invitations WHERE id = $1`, [
    invitationId,
  ]);
  if (inv.rows[0]) {
    await assignRole(userId, inv.rows[0].role_id);
  }
}
