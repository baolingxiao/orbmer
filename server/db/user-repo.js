import { query } from "./index.js";
import { createPasswordHash } from "../admin-auth.js";

export async function findUserByEmail(email, role = null) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return null;
  if (role) {
    const { rows } = await query(
      `SELECT id, email, email_normalized, password_hash, role, display_name, is_active, metadata
       FROM users
       WHERE email_normalized = $1 AND role = $2
       LIMIT 1`,
      [normalized, role]
    );
    return rows[0] || null;
  }
  const { rows } = await query(
    `SELECT id, email, email_normalized, password_hash, role, display_name, is_active, metadata
     FROM users
     WHERE email_normalized = $1
     LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

export async function createUser({
  email,
  password,
  role,
  displayName = "",
  metadata = {},
}) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("A valid email is required.");
  }
  if (!["buyer", "seller", "admin"].includes(role)) {
    throw new Error("Unsupported account role.");
  }
  const existing = await findUserByEmail(normalized);
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = createPasswordHash(password);
  const { rows } = await query(
    `INSERT INTO users (email, email_normalized, password_hash, role, display_name, is_active, metadata)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6::jsonb)
     RETURNING id, email, email_normalized, role, display_name, is_active, metadata`,
    [
      String(email).trim(),
      normalized,
      passwordHash,
      role,
      String(displayName || "").trim().slice(0, 120),
      JSON.stringify(metadata || {}),
    ]
  );
  return rows[0];
}

export async function ensureSellerProfile(userId, { storeName = "", pavilion = "china" } = {}) {
  await query(
    `INSERT INTO seller_profiles (user_id, store_name, pavilion, status)
     VALUES ($1, $2, $3, 'active')
     ON CONFLICT (user_id) DO UPDATE SET
       store_name = COALESCE(NULLIF(EXCLUDED.store_name, ''), seller_profiles.store_name),
       updated_at = now()`,
    [userId, String(storeName || "").slice(0, 120), String(pavilion || "china").slice(0, 40)]
  );
  const { rows } = await query(`SELECT * FROM seller_profiles WHERE user_id = $1`, [userId]);
  return rows[0] || null;
}

export async function getSellerProfile(userId) {
  const { rows } = await query(
    `SELECT sp.*, u.email, u.display_name, u.is_active
     FROM seller_profiles sp
     JOIN users u ON u.id = sp.user_id
     WHERE sp.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

export async function ensureDemoSeller({
  email = "seller@orbmare.local",
  password = "Seller-Demo-Pass-2026!",
  storeName = "中国区示范卖家",
} = {}) {
  let user = await findUserByEmail(email, "seller");
  if (!user) {
    user = await createUser({
      email,
      password,
      role: "seller",
      displayName: storeName,
      metadata: { demo: true },
    });
  }
  await ensureSellerProfile(user.id, { storeName, pavilion: "china" });
  return { email, password, userId: user.id, created: true };
}

export async function listBuyerOrders(userId, email) {
  const { rows } = await query(
    `SELECT * FROM orders
     WHERE buyer_user_id = $1 OR lower(customer->>'email') = lower($2)
     ORDER BY created_at DESC
     LIMIT 100`,
    [userId, email]
  );
  return rows;
}
