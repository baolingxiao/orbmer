import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultRuntimeDir = path.join(__dirname, "runtime-data");

function runtimeDir() {
  return process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : defaultRuntimeDir;
}

function settingsPath() {
  return path.join(runtimeDir(), "payment-settings.json");
}

function defaultSettings() {
  return { paymentsEnabled: true, updatedAt: null };
}

function writeSettings(settings) {
  fs.mkdirSync(runtimeDir(), { recursive: true, mode: 0o700 });
  const target = settingsPath();
  const temporary = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(settings, null, 2), { mode: 0o600 });
  fs.renameSync(temporary, target);
}

export function getPaymentSettings() {
  try {
    const value = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    return {
      paymentsEnabled: value?.paymentsEnabled === true,
      updatedAt: value?.updatedAt || null,
    };
  } catch {
    const settings = defaultSettings();
    writeSettings(settings);
    return settings;
  }
}

export function updatePaymentSettings({ paymentsEnabled } = {}) {
  if (typeof paymentsEnabled !== "boolean") {
    throw new Error("paymentsEnabled must be a boolean.");
  }
  const settings = { paymentsEnabled, updatedAt: new Date().toISOString() };
  writeSettings(settings);
  return settings;
}
