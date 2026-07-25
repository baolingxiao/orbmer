import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { isDatabaseEnabled } from "./db/index.js";
import * as auditRepo from "./db/audit-repo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRuntimeDir = path.join(__dirname, "runtime-data");
const MAX_AUDIT_EVENTS = 5000;

function runtimeDir() {
  return process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : defaultRuntimeDir;
}

function auditPath() {
  return path.join(runtimeDir(), "audit.json");
}

function ensureStore() {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  if (!fs.existsSync(auditPath())) {
    writeStore({ schemaVersion: "1.0.0", events: [] });
  }
}

function readStore() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(auditPath(), "utf8"));
    if (!Array.isArray(data.events)) throw new Error("Missing events array.");
    return data;
  } catch (error) {
    throw new Error(`Audit store is unavailable: ${error.message}`);
  }
}

function writeStore(data) {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  const target = auditPath();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, target);
}

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
  if (isDatabaseEnabled()) {
    return auditRepo.appendAuditEvent({
      actor,
      action,
      entityType,
      entityId,
      details,
      ip,
    });
  }

  const data = readStore();
  const event = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor: String(actor || "unknown").slice(0, 254),
    action: String(action || "unknown").slice(0, 100),
    entityType: String(entityType || "system").slice(0, 80),
    entityId: String(entityId || "").slice(0, 160),
    details: cleanDetails(details),
    ip: String(ip || "").slice(0, 100),
  };
  data.events.push(event);
  if (data.events.length > MAX_AUDIT_EVENTS) {
    data.events = data.events.slice(-MAX_AUDIT_EVENTS);
  }
  writeStore(data);
  return event;
}

/**
 * @param {number|{ limit?: number, actor?: string, action?: string, entityType?: string, entityId?: string, from?: string, to?: string, q?: string }} filtersOrLimit
 */
export async function listAuditEvents(filtersOrLimit = 100) {
  const filters =
    typeof filtersOrLimit === "object" && filtersOrLimit !== null
      ? filtersOrLimit
      : { limit: filtersOrLimit };

  if (isDatabaseEnabled()) {
    return auditRepo.listAuditEvents(filters);
  }

  const safeLimit = Math.max(1, Math.min(500, Number(filters.limit) || 100));
  let events = readStore().events.slice().reverse();
  if (filters.actor) events = events.filter((e) => e.actor === filters.actor);
  if (filters.action) events = events.filter((e) => e.action === filters.action);
  if (filters.entityType) events = events.filter((e) => e.entityType === filters.entityType);
  if (filters.entityId) events = events.filter((e) => e.entityId === filters.entityId);
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    events = events.filter(
      (e) =>
        String(e.actor).toLowerCase().includes(q) ||
        String(e.action).toLowerCase().includes(q) ||
        String(e.entityId).toLowerCase().includes(q)
    );
  }
  return events.slice(0, safeLimit);
}
