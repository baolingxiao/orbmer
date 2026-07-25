#!/usr/bin/env node
/**
 * Secure one-shot admin credential reset for production/local.
 *
 * Usage (on the server):
 *   cd /var/www/printnova
 *   node scripts/reset-admin-credentials.mjs
 *
 * Then:
 *   pm2 restart printnova
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import { createPasswordHash } from "../server/admin-auth.js";
import { closePool, ensureDatabaseReady, isDatabaseEnabled, query } from "../server/db/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

function ask(question, { silent = false } = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  if (!silent || !process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(String(answer || "").trim());
      });
    });
  }

  process.stdout.write(question);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  let value = "";

  return new Promise((resolve) => {
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(value.trim());
    };
    const onData = (character) => {
      if (character === "\u0003") {
        process.stdout.write("\n");
        process.exit(130);
      }
      if (character === "\r" || character === "\n") {
        finish();
        return;
      }
      if (character === "\u007f" || character === "\b") {
        value = value.slice(0, -1);
        return;
      }
      if (character >= " ") value += character;
    };
    process.stdin.on("data", onData);
  });
}

function upsertEnv(key, value) {
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, `${key}=${value}\n`, { mode: 0o600 });
    return;
  }
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) next.push(`${key}=${value}`);
  fs.writeFileSync(envPath, `${next.filter((line, index, arr) => !(line === "" && index === arr.length - 1)).join("\n")}\n`, {
    mode: 0o600,
  });
}

async function main() {
  console.log("Orbmare admin credential reset");
  console.log("This updates .env and the PostgreSQL admin user.\n");

  if (!isDatabaseEnabled()) {
    console.error("DATABASE_URL is missing. Aborting.");
    process.exit(1);
  }

  const email = (await ask("Admin email: ")).toLowerCase();
  if (!email.includes("@")) {
    console.error("A valid email is required.");
    process.exit(1);
  }

  const password = await ask("New password (≥14 chars, hidden): ", { silent: true });
  const confirm = await ask("Confirm password: ", { silent: true });
  if (password !== confirm) {
    console.error("Passwords do not match.");
    process.exit(1);
  }

  let passwordHash;
  try {
    passwordHash = createPasswordHash(password);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  await ensureDatabaseReady();

  const existing = await query(
    `SELECT id FROM users WHERE email_normalized = $1 AND role = 'admin' LIMIT 1`,
    [email]
  );

  let userId;
  if (existing.rowCount > 0) {
    userId = existing.rows[0].id;
    await query(
      `UPDATE users
       SET email = $2,
           email_normalized = $1,
           password_hash = $3,
           is_active = TRUE,
           updated_at = now()
       WHERE id = $4`,
      [email, email, passwordHash, userId]
    );
  } else {
    const inserted = await query(
      `INSERT INTO users (email, email_normalized, password_hash, role, display_name, is_active)
       VALUES ($1, $2, $3, 'admin', 'Operations', TRUE)
       RETURNING id`,
      [email, email, passwordHash]
    );
    userId = inserted.rows[0].id;
  }

  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);

  const rolesTable = await query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'admin_user_roles'`
  );
  if (rolesTable.rowCount > 0) {
    await query(
      `INSERT INTO admin_user_roles (user_id, role_id)
       VALUES ($1, 'super_admin')
       ON CONFLICT DO NOTHING`,
      [userId]
    );
  }

  upsertEnv("ADMIN_EMAIL", email);
  upsertEnv("ADMIN_PASSWORD_HASH", passwordHash);
  if (!String(process.env.ADMIN_HOST || "").trim()) {
    upsertEnv("ADMIN_HOST", "admin.orbmare.com");
  }

  console.log("\nDone.");
  console.log(`- Admin email: ${email}`);
  console.log("- Password hash written to .env and database");
  console.log("- Existing sessions revoked");
  console.log("- Role ensured: super_admin");
  console.log("\nRestart the app, then log in at https://admin.orbmare.com/");
  console.log("  pm2 restart printnova");

  await closePool();
}

main().catch(async (error) => {
  console.error("Reset failed:", error.message || error);
  try {
    await closePool();
  } catch {
    // ignore
  }
  process.exit(1);
});
