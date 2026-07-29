import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { createGuestCustomPrintRequest } from "./db/membership-repo.js";
import { isDatabaseEnabled } from "./db/index.js";
import { sameOriginOnly } from "./security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "runtime-data", "custom-print-files");
const extensions = new Set([".stl", ".obj", ".3mf", ".step", ".stp", ".iges", ".igs", ".glb", ".gltf", ".glp", ".zip"]);
fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => done(null, uploadDir),
    filename: (_req, file, done) => done(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { files: 3, fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(null, extensions.has(path.extname(file.originalname).toLowerCase())),
});

export function createCustomPrintRouter({ express }) {
  const router = express.Router();
  router.post("/requests", sameOriginOnly, upload.array("files", 3), async (req, res) => {
    try {
      if (!isDatabaseEnabled()) throw new Error("Custom requests are temporarily unavailable.");
      const description = String(req.body?.description || "").trim();
      if (description.length < 12) throw new Error("Please describe your printing request in a little more detail.");
      const attachments = (req.files || []).map((file) => ({
        filename: file.filename,
        originalName: path.basename(file.originalname),
        mimeType: file.mimetype,
        size: file.size,
      }));
      const request = await createGuestCustomPrintRequest({
        email: req.body?.email,
        description: `[${String(req.body?.printType || "general").slice(0, 40)}] ${description}`,
        attachments,
      });
      return res.status(201).json({ ok: true, requestNumber: request.request_number });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message || "Request could not be submitted." });
    }
  });
  return { router };
}
