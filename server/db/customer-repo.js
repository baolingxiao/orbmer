import { query } from "./index.js";

export async function listCustomers() {
  const { rows } = await query(
    `SELECT id, email, display_name, is_active, auth_provider, membership_status,
            membership_granted_at, created_at, last_login_at
     FROM users WHERE role = 'buyer'
     ORDER BY created_at DESC LIMIT 500`
  );
  return rows;
}

export async function setCustomerMembership(userId, status, grantedBy) {
  if (!['explorer', 'journal', 'collector', 'black', 'standard', 'member'].includes(status)) throw new Error('Unsupported membership status.');
  const normalized = status === 'standard' ? 'explorer' : status === 'member' ? 'journal' : status;
  const { rows } = await query(
    `UPDATE users SET membership_status = $2,
       membership_granted_at = CASE WHEN $2 <> 'explorer' THEN now() ELSE NULL END,
       membership_granted_by = CASE WHEN $2 <> 'explorer' THEN $3::uuid ELSE NULL END,
       updated_at = now()
     WHERE id = $1 AND role = 'buyer'
     RETURNING id, email, display_name, is_active, auth_provider, membership_status,
       membership_granted_at, created_at, last_login_at`,
    [userId, normalized, grantedBy || null]
  );
  return rows[0] || null;
}
