/**
 * Media library with local disk storage adapter.
 * Path: web/assets/uploads/media/
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { isDatabaseEnabled } from "./db/index.js";
import * as mediaRepo from "./db/media-repo.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const uploadRoot = path.join(projectRoot, "web", "assets", "uploads", "media");
const PUBLIC_PREFIX = "/assets/uploads/media";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);

const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

function runtimeJsonPath() {
  const dir = process.env.ADMIN_DATA_DIR
    ? path.resolve(process.env.ADMIN_DATA_DIR)
    : path.join(__dirname, "runtime-data");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return path.join(dir, "media-library.json");
}

function readJsonMedia() {
  const file = runtimeJsonPath();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).assets || [];
  } catch {
    return [];
  }
}

function writeJsonMedia(assets) {
  const file = runtimeJsonPath();
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(
    temporary,
    JSON.stringify({ assets, updatedAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 }
  );
  fs.renameSync(temporary, file);
}

export function createMediaUploader() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        cb(null, uploadRoot);
      },
      filename(_req, file, cb) {
        const mime = file.mimetype;
        const ext = EXT[mime] || path.extname(file.originalname || "").toLowerCase() || ".bin";
        const safeExt = Object.values(EXT).includes(ext) ? ext : ".bin";
        cb(
          null,
          `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${safeExt}`
        );
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024, files: 8 },
    fileFilter(_req, file, cb) {
      if (!ALLOWED.has(file.mimetype)) {
        return cb(new Error("Unsupported file type."));
      }
      return cb(null, true);
    },
  });
}

export async function listMediaLibrary(options = {}) {
  if (isDatabaseEnabled()) return mediaRepo.listMedia(options);
  let assets = readJsonMedia().filter((row) => !row.deletedAt);
  if (options.folder) assets = assets.filter((row) => row.folder === options.folder);
  if (options.q) {
    const q = String(options.q).toLowerCase();
    assets = assets.filter(
      (row) =>
        row.filename?.toLowerCase().includes(q) ||
        row.altText?.toLowerCase().includes(q) ||
        row.path?.toLowerCase().includes(q)
    );
  }
  return assets.slice(0, Number(options.limit) || 100);
}

export async function registerUploadedFile(file, meta = {}) {
  if (!file) throw new Error("No file uploaded.");
  const publicPath = `${PUBLIC_PREFIX}/${file.filename}`;
  const asset = {
    path: publicPath,
    filename: file.originalname || file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    width: null,
    height: null,
    altText: meta.altText || "",
    caption: meta.caption || "",
    folder: meta.folder || "general",
    tags: meta.tags || [],
    source: meta.source || "",
    copyrightStatus: meta.copyrightStatus || "unknown",
    uploadedBy: meta.uploadedBy || null,
    createdAt: new Date().toISOString(),
  };

  if (isDatabaseEnabled()) {
    return mediaRepo.insertMedia(asset);
  }

  const assets = readJsonMedia();
  const row = { id: `media-${Date.now().toString(36)}`, ...asset };
  assets.unshift(row);
  writeJsonMedia(assets);
  return row;
}

export async function updateMediaAsset(id, patch) {
  if (isDatabaseEnabled()) return mediaRepo.updateMedia(id, patch);
  const assets = readJsonMedia();
  const index = assets.findIndex((row) => row.id === id);
  if (index < 0) return null;
  assets[index] = { ...assets[index], ...patch };
  writeJsonMedia(assets);
  return assets[index];
}

export async function deleteMediaAsset(id) {
  if (isDatabaseEnabled()) return mediaRepo.softDeleteMedia(id);
  const assets = readJsonMedia();
  const index = assets.findIndex((row) => row.id === id);
  if (index < 0) return false;
  assets[index] = { ...assets[index], deletedAt: new Date().toISOString() };
  writeJsonMedia(assets);
  return true;
}

export async function getMediaUsages(id) {
  if (!isDatabaseEnabled()) return [];
  return mediaRepo.listUsages(id);
}
