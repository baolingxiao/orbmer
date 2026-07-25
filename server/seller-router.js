import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { createPortalAuth } from "./portal-auth.js";
import { isDatabaseEnabled } from "./db/index.js";
import * as productRepo from "./db/product-repo.js";
import {
  createUser,
  ensureDemoSeller,
  ensureSellerProfile,
  getSellerProfile,
} from "./db/user-repo.js";
import { updateOrderOperations, publicOrder } from "./order-store.js";
import { ORDER_STATUSES } from "./order-statuses.js";
import { appendAuditEvent } from "./audit-store.js";
import {
  createManagedProduct,
  updateManagedInventory,
  updateManagedProduct,
} from "./product-store.js";
import { sameOriginOnly } from "./security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sellerWebRoot = path.join(__dirname, "..", "web", "seller");
const webRoot = path.join(__dirname, "..", "web");
const uploadRoot = path.join(webRoot, "assets", "uploads");

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function createUploader() {
  fs.mkdirSync(uploadRoot, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination(req, _file, cb) {
        const sellerKey = String(req.portalSession?.userId || "anon")
          .replace(/[^a-zA-Z0-9_-]/g, "")
          .slice(0, 36);
        const dir = path.join(uploadRoot, sellerKey || "anon");
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename(_req, file, cb) {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
          ? ext === ".jpeg"
            ? ".jpg"
            : ext
          : ".jpg";
        cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`);
      },
    }),
    limits: { fileSize: 12 * 1024 * 1024, files: 50 },
    fileFilter(_req, file, cb) {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed."));
      }
      return cb(null, true);
    },
  });
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || "";
}

function mapOrderRow(row) {
  if (!row) return null;
  if (row.items && row.customer) {
    return {
      id: row.id,
      createdAt: row.created_at?.toISOString?.() || row.createdAt || row.created_at,
      updatedAt: row.updated_at?.toISOString?.() || row.updatedAt || row.updated_at,
      status: row.status,
      currency: row.currency,
      items: row.items,
      totals: row.totals,
      customer: row.customer,
      shipping: row.shipping,
      payment: row.payment,
      shipment: row.shipment || {},
      statusHistory: row.status_history || row.statusHistory || [],
    };
  }
  return row;
}

export function createSellerRouter({ express, secureCookies }) {
  const router = express.Router();
  const auth = createPortalAuth({
    role: "seller",
    purpose: "seller",
    cookieName: "orbmare_seller_session",
    cookiePath: "/seller",
    secureCookies,
  });
  const upload = createUploader();

  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });

  router.get("/seller.css", (_req, res) => {
    res.type("text/css").sendFile(path.join(sellerWebRoot, "seller.css"));
  });
  router.get("/seller.js", (_req, res) => {
    res.type("text/javascript").sendFile(path.join(sellerWebRoot, "seller.js"));
  });
  router.get("/", (_req, res) => {
    res.sendFile(path.join(sellerWebRoot, "index.html"));
  });

  router.get("/api/session", async (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({
        ok: false,
        configured: false,
        error:
          "卖家后台需要 PostgreSQL。请在服务器 .env 配置 DATABASE_URL 后执行 npm run db:migrate 并 pm2 restart。",
      });
    }
    const session = await auth.sessionFromRequest(req);
    if (!session) return res.json({ ok: true, configured: true, authenticated: false });
    const profile = await getSellerProfile(session.userId);
    return res.json({
      ok: true,
      configured: true,
      authenticated: true,
      user: {
        email: session.email,
        displayName: session.displayName,
        role: "seller",
        storeName: profile?.store_name || "",
      },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  router.post("/api/register", sameOriginOnly, async (req, res) => {
    try {
      if (!isDatabaseEnabled()) {
        return res.status(503).json({ ok: false, error: "Database is required." });
      }
      const invite = String(process.env.SELLER_INVITE_CODE || "").trim();
      const provided = String(req.body?.inviteCode || "").trim();
      if (invite && provided !== invite) {
        return res.status(403).json({ ok: false, error: "Invalid seller invite code." });
      }
      if (!invite && process.env.NODE_ENV === "production") {
        return res.status(403).json({ ok: false, error: "Seller self-registration is closed." });
      }

      const email = String(req.body?.email || "").trim();
      const password = String(req.body?.password || "");
      const storeName = String(req.body?.storeName || "").trim() || "新卖家店铺";
      const user = await createUser({
        email,
        password,
        role: "seller",
        displayName: storeName,
      });
      await ensureSellerProfile(user.id, { storeName, pavilion: "china" });
      await appendAuditEvent({
        actor: email,
        action: "seller_registered",
        entityType: "user",
        entityId: user.id,
        ip: clientIp(req),
      });
      return res.status(201).json({ ok: true, email: user.email });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message || "Registration failed." });
    }
  });

  router.post("/api/login", sameOriginOnly, async (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({
        ok: false,
        error:
          "卖家后台需要 PostgreSQL。云端请配置 DATABASE_URL；本机可用 http://127.0.0.1:4242/seller/",
      });
    }
    const result = await auth.login(req, req.body?.email, req.body?.password);
    if (!result.ok) {
      if (result.rateLimited) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({ ok: false, error: "Too many attempts. Try later." });
      }
      return res.status(401).json({ ok: false, error: "Email or password is incorrect." });
    }
    auth.setSessionCookie(res, result.session);
    await appendAuditEvent({
      actor: result.session.email,
      action: "seller_login",
      entityType: "session",
      entityId: result.session.id.slice(0, 12),
      ip: clientIp(req),
    });
    return res.json({
      ok: true,
      authenticated: true,
      user: { email: result.session.email, role: "seller" },
      csrfToken: result.session.csrfToken,
      expiresAt: new Date(result.session.expiresAt).toISOString(),
    });
  });

  router.post("/api/logout", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    await appendAuditEvent({
      actor: req.portalSession.email,
      action: "seller_logout",
      entityType: "session",
      entityId: req.portalSession.id.slice(0, 12),
      ip: clientIp(req),
    });
    await auth.logout(req, res);
    return res.json({ ok: true });
  });

  router.use("/api", auth.requireSession);

  router.post(
    "/api/uploads",
    sameOriginOnly,
    auth.requireCsrf,
    (req, res, next) => {
      upload.array("images", 50)(req, res, (error) => {
        if (!error) return next();
        return res.status(400).json({ ok: false, error: error.message || "Upload failed." });
      });
    },
    async (req, res) => {
      try {
        const files = Array.isArray(req.files) ? req.files : [];
        if (!files.length) {
          return res.status(400).json({ ok: false, error: "请至少选择一张图片。" });
        }
        const paths = files.map((file) => {
          const relative = path.relative(webRoot, file.path).split(path.sep).join("/");
          return `/${relative}`;
        });
        await appendAuditEvent({
          actor: req.portalSession.email,
          action: "seller_images_uploaded",
          entityType: "upload",
          entityId: String(paths.length),
          ip: clientIp(req),
        });
        return res.status(201).json({ ok: true, paths, count: paths.length });
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
    }
  );

  router.get("/api/overview", async (req, res) => {
    try {
      const products = await productRepo.listProducts({ sellerUserId: req.portalSession.userId });
      const orderRows = await productRepo.listOrdersForSeller(req.portalSession.userId);
      const orders = orderRows.map(mapOrderRow);
      const profile = await getSellerProfile(req.portalSession.userId);
      return res.json({
        ok: true,
        overview: {
          storeName: profile?.store_name || "",
          pavilion: profile?.pavilion || "china",
          products: {
            total: products.length,
            published: products.filter((p) => p.lifecycleStatus === "published").length,
            draft: products.filter((p) => p.lifecycleStatus === "draft").length,
          },
          orders: {
            total: orders.length,
            open: orders.filter((o) => !["delivered", "cancelled", "refunded"].includes(o.status))
              .length,
          },
          recentOrders: orders.slice(0, 5),
        },
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/products", async (req, res) => {
    try {
      const products = await productRepo.listProducts({ sellerUserId: req.portalSession.userId });
      return res.json({ ok: true, products });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/products", sameOriginOnly, auth.requireCsrf, async (req, res) => {
    try {
      const body = { ...(req.body || {}), channel: req.body?.channel || "shop" };
      const ownedProducts = await productRepo.listProducts({
        sellerUserId: req.portalSession.userId,
      });
      const nextId = String(body.id || "").trim().toLowerCase();
      const nextCollection = String(body.collection || "").trim();
      if (
        ownedProducts.some(
          (entry) => entry.collection === nextCollection && entry.id === nextId
        )
      ) {
        return res.status(400).json({
          ok: false,
          error: `分类「${nextCollection}」下已有相同商品 ID「${nextId}」。`,
        });
      }
      const product = await createManagedProduct(body);
      await productRepo.upsertProduct(product, { sellerUserId: req.portalSession.userId });
      const owned = await productRepo.getProduct(product.id);
      await appendAuditEvent({
        actor: req.portalSession.email,
        action: "seller_product_created",
        entityType: "product",
        entityId: product.id,
        ip: clientIp(req),
      });
      return res.status(201).json({ ok: true, product: owned });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.put("/api/products/:id", sameOriginOnly, auth.requireCsrf, async (req, res) => {
    try {
      const existing = await productRepo.getProduct(req.params.id);
      if (!existing || existing.sellerUserId !== req.portalSession.userId) {
        return res.status(404).json({ ok: false, error: "Product not found." });
      }
      const product = await updateManagedProduct(req.params.id, req.body || {});
      await productRepo.upsertProduct(product, { sellerUserId: req.portalSession.userId });
      return res.json({ ok: true, product: await productRepo.getProduct(req.params.id) });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.patch(
    "/api/products/:id/inventory",
    sameOriginOnly,
    auth.requireCsrf,
    async (req, res) => {
      try {
        const existing = await productRepo.getProduct(req.params.id);
        if (!existing || existing.sellerUserId !== req.portalSession.userId) {
          return res.status(404).json({ ok: false, error: "Product not found." });
        }
        const product = await updateManagedInventory(req.params.id, req.body || {});
        return res.json({ ok: true, product });
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
    }
  );

  router.get("/api/orders", async (req, res) => {
    try {
      const orders = (await productRepo.listOrdersForSeller(req.portalSession.userId)).map(
        mapOrderRow
      );
      return res.json({ ok: true, orders, statuses: ORDER_STATUSES });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.put("/api/orders/:id/shipment", sameOriginOnly, auth.requireCsrf, async (req, res) => {
    try {
      const owned = await productRepo.listOrdersForSeller(req.portalSession.userId);
      if (!owned.some((entry) => entry.id === req.params.id)) {
        return res.status(404).json({ ok: false, error: "Order not found." });
      }
      const order = await updateOrderOperations(req.params.id, req.body || {});
      await appendAuditEvent({
        actor: req.portalSession.email,
        action: "seller_shipment_updated",
        entityType: "order",
        entityId: order.id,
        details: { status: order.status },
        ip: clientIp(req),
      });
      return res.json({ ok: true, order: publicOrder(order) });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  return {
    router,
    configured: auth.configured(),
    bootstrapDemoSeller: async () => {
      if (!isDatabaseEnabled()) return null;
      const demo = await ensureDemoSeller();
      await productRepo.assignUnownedProductsToSeller(demo.userId);
      return demo;
    },
  };
}
