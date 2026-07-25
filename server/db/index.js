import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool = null;

export function databaseUrl() {
  return String(process.env.DATABASE_URL || "").trim();
}

export function isDatabaseEnabled() {
  return Boolean(databaseUrl());
}

export function getPool() {
  if (!isDatabaseEnabled()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.PG_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (error) => {
      console.error("[db] idle client error:", error.message);
    });
  }
  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(work) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function runMigrations() {
  const migrationsDir = path.join(__dirname, "migrations");
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const id = file;
    const existing = await query("SELECT 1 FROM schema_migrations WHERE id = $1", [id]);
    if (existing.rowCount > 0) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [id]);
    });
    console.log(`[db] applied migration ${id}`);
  }
}

export async function ensureDatabaseReady() {
  if (!isDatabaseEnabled()) return { enabled: false };
  await runMigrations();
  await ensureBootstrapAdmin();
  return { enabled: true };
}

async function ensureBootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const passwordHash = String(process.env.ADMIN_PASSWORD_HASH || "").trim();
  if (!email) return;

  const existing = await query("SELECT id FROM users WHERE email_normalized = $1 AND role = 'admin'", [
    email,
  ]);
  let userId = existing.rows[0]?.id || null;
  if (userId) {
    if (passwordHash) {
      await query(
        `UPDATE users
         SET password_hash = COALESCE(NULLIF($2, ''), password_hash),
             is_active = TRUE,
             updated_at = now()
         WHERE email_normalized = $1 AND role = 'admin'`,
        [email, passwordHash]
      );
    }
  } else {
    const inserted = await query(
      `INSERT INTO users (email, email_normalized, password_hash, role, display_name, is_active)
       VALUES ($1, $2, $3, 'admin', 'Operations', TRUE)
       RETURNING id`,
      [email, email, passwordHash || null]
    );
    userId = inserted.rows[0]?.id || null;
  }

  if (userId) {
    const rolesTable = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'admin_user_roles'`
    );
    if (rolesTable.rowCount > 0) {
      const assigned = await query(
        `SELECT 1 FROM admin_user_roles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (assigned.rowCount === 0) {
        await query(
          `INSERT INTO admin_user_roles (user_id, role_id) VALUES ($1, 'super_admin')
           ON CONFLICT DO NOTHING`,
          [userId]
        );
      }
    }
  }
}
