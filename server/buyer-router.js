import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { createPortalAuth } from "./portal-auth.js";
import { isDatabaseEnabled, query } from "./db/index.js";
import { createUser, listBuyerOrders } from "./db/user-repo.js";
import { publicOrder } from "./order-store.js";
import { appendAuditEvent } from "./audit-store.js";
import { sameOriginOnly } from "./security.js";
import {
  getSiteContent,
  patchSiteContent,
  addModuleCard,
} from "./site-content-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authWebRoot = path.join(__dirname, "..", "web", "auth");
const uploadRoot = path.join(__dirname, "..", "web", "assets", "uploads", "site");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function mapOrder(row) {
  return {
    id: row.id,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
    status: row.status,
    currency: row.currency,
    items: row.items,
    totals: row.totals,
    payment: row.payment,
    shipment: row.shipment || {},
    consent: row.consent || { id: "" },
  };
}

function createUploader() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        cb(null, uploadRoot);
      },
      filename(_req, file, cb) {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
          ? ext === ".jpeg"
            ? ".jpg"
            : ext
          : ".jpg";
        cb(null, `site-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
      },
    }),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed."));
      }
      return cb(null, true);
    },
  });
}

function publicUser(session) {
  return {
    email: session.email,
    displayName: session.displayName,
    role: session.role,
  };
}

export function createBuyerRouter({ express, secureCookies }) {
  const router = express.Router();
  const auth = createPortalAuth({
    roles: ["admin", "buyer"],
    purpose: "buyer",
    cookieName: "orbmare_buyer_session",
    cookiePath: "/",
    secureCookies,
  });
  const upload = createUploader();

  function clearLegacyAuthCookie(res) {
    const flags = [
      "orbmare_buyer_session=",
      "Path=/auth",
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=0",
    ];
    if (secureCookies) flags.push("Secure");
    res.append("Set-Cookie", flags.join("; "));
  }

  function requireAdmin(req, res, next) {
    if (req.portalSession?.role !== "admin") {
      return res.status(403).json({ ok: false, error: "Admin access required." });
    }
    return next();
  }

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  router.get("/auth.css", (_req, res) => {
    res.type("text/css").sendFile(path.join(authWebRoot, "auth.css"));
  });
  router.get("/auth.js", (_req, res) => {
    res.type("text/javascript").sendFile(path.join(authWebRoot, "auth.js"));
  });
  router.get("/", (_req, res) => {
    if (!auth.configured()) {
      return res.status(503).sendFile(path.join(authWebRoot, "unavailable.html"));
    }
    return res.sendFile(path.join(authWebRoot, "index.html"));
  });

  router.get("/api/session", async (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({ ok: false, configured: false });
    }
    const session = await auth.sessionFromRequest(req);
    if (!session) return res.json({ ok: true, configured: true, authenticated: false });
    return res.json({
      ok: true,
      configured: true,
      authenticated: true,
      user: publicUser(session),
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  router.get("/api/content", (_req, res) => {
    try {
      return res.json({ ok: true, content: getSiteContent() });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.patch(
    "/api/content",
    sameOriginOnly,
    auth.requireSession,
    auth.requireCsrf,
    requireAdmin,
    async (req, res) => {
      try {
        const content = patchSiteContent(req.body?.patch || req.body || {});
        await appendAuditEvent({
          actor: req.portalSession.email,
          action: "site_content_patched",
          entityType: "site_content",
          entityId: String(content.version),
          ip: req.ip || "",
        });
        return res.json({ ok: true, content });
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
    }
  );

  router.post(
    "/api/content/cards",
    sameOriginOnly,
    auth.requireSession,
    auth.requireCsrf,
    requireAdmin,
    async (req, res) => {
      try {
        const moduleKey = String(req.body?.module || "").trim();
        const content = addModuleCard(moduleKey, req.body?.card || {});
        await appendAuditEvent({
          actor: req.portalSession.email,
          action: "site_content_card_added",
          entityType: "site_content",
          entityId: moduleKey,
          ip: req.ip || "",
        });
        return res.status(201).json({ ok: true, content });
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
    }
  );

  router.post(
    "/api/content/upload",
    sameOriginOnly,
    auth.requireSession,
    auth.requireCsrf,
    requireAdmin,
    (req, res, next) => {
      upload.single("image")(req, res, (error) => {
        if (!error) return next();
        return res.status(400).json({ ok: false, error: error.message || "Upload failed." });
      });
    },
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ ok: false, error: "Please choose an image." });
        }
        const url = `/assets/uploads/site/${req.file.filename}`;
        return res.status(201).json({ ok: true, url });
      } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
      }
    }
  );

  router.post("/api/register", sameOriginOnly, async (req, res) => {
    try {
      if (!isDatabaseEnabled()) {
        return res.status(503).json({ ok: false, error: "Database is required." });
      }
      const email = String(req.body?.email || "").trim();
      const password = String(req.body?.password || "");
      const displayName = String(req.body?.displayName || "").trim();
      const user = await createUser({
        email,
        password,
        role: "buyer",
        displayName,
      });
      await appendAuditEvent({
        actor: email,
        action: "buyer_registered",
        entityType: "user",
        entityId: user.id,
        ip: req.ip || "",
      });
      return res.status(201).json({ ok: true, email: user.email });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message || "Registration failed." });
    }
  });

  router.post("/api/login", sameOriginOnly, async (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({ ok: false, error: "Accounts require PostgreSQL." });
    }
    const result = await auth.login(req, req.body?.email, req.body?.password);
    if (!result.ok) {
      if (result.rateLimited) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({ ok: false, error: "Too many attempts. Try later." });
      }
      return res.status(401).json({ ok: false, error: "Email or password is incorrect." });
    }
    clearLegacyAuthCookie(res);
    auth.setSessionCookie(res, result.session);
    return res.json({
      ok: true,
      authenticated: true,
      user: publicUser(result.session),
      csrfToken: result.session.csrfToken,
      expiresAt: new Date(result.session.expiresAt).toISOString(),
    });
  });

  router.post("/api/logout", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    await auth.logout(req, res);
    clearLegacyAuthCookie(res);
    return res.json({ ok: true });
  });

  router.get("/api/orders", auth.requireSession, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.json({ ok: true, orders: [] });
      }
      const rows = await listBuyerOrders(req.portalSession.userId, req.portalSession.email);
      return res.json({
        ok: true,
        orders: rows.map((row) => publicOrder(mapOrder(row))),
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/link-orders", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      const result = await query(
        `UPDATE orders
         SET buyer_user_id = $1, updated_at = now()
         WHERE buyer_user_id IS NULL AND lower(customer->>'email') = lower($2)`,
        [req.portalSession.userId, req.portalSession.email]
      );
      return res.json({ ok: true, linked: result.rowCount });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return { router, configured: auth.configured() };
}
