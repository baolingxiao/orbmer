import path from "path";
import { fileURLToPath } from "url";
import { createAdminAuth, createPasswordHash } from "./admin-auth.js";
import {
  createManagedProduct,
  listAdminProducts,
  updateManagedInventory,
  updateManagedProduct,
  withMarginFields,
} from "./product-store.js";
import { listAdminOrders, updateOrderOperations } from "./order-store.js";
import { ORDER_STATUSES } from "./order-statuses.js";
import { appendAuditEvent, listAuditEvents } from "./audit-store.js";
import { sameOriginOnly } from "./security.js";
import {
  getContent,
  listContent,
  listContentRevisions,
  saveContent,
} from "./content-store.js";
import {
  createMediaUploader,
  getMediaUsages,
  listMediaLibrary,
  registerUploadedFile,
  updateMediaAsset,
} from "./media-store.js";
import {
  listTrash,
  purgeExpiredDeletions,
  restoreDeletion,
  softDeleteContentEntities,
  softDeleteContentEntity,
  softDeleteMedia,
  softDeleteMediaMany,
  softDeleteProduct,
  softDeleteProducts,
  RETENTION_DAYS,
} from "./trash-store.js";
import {
  getSiteContent,
  patchSiteContent,
} from "./site-content-store.js";
import { isDatabaseEnabled } from "./db/index.js";
import * as rbacRepo from "./db/rbac-repo.js";
import { listCustomers, setCustomerMembership } from "./db/customer-repo.js";
import {
  requireAnyPermission,
  requirePermission,
  stripFinanceFields,
} from "./rbac.js";
import { listAiFieldRegistry, optimizeContent } from "./ai/service.js";
import { getAiConfig } from "./ai/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminWebRoot = path.join(__dirname, "..", "web", "admin");

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || "";
}

function adminHeaders(_req, res, next) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
  );
  next();
}

function routeError(res, error, status = 400) {
  return res.status(status).json({
    ok: false,
    error: error?.message || "The operations request could not be completed.",
  });
}

async function overview() {
  const products = await listAdminProducts();
  const orders = await listAdminOrders();
  const stockAlerts = products.filter((product) => {
    if (product.inventory.mode === "unavailable") return true;
    if (product.inventory.mode !== "stocked") return false;
    return product.availableQuantity <= Number(product.inventory.reorderPoint || 0);
  });
  const activeShipments = orders.filter(
    (order) =>
      !["delivered", "cancelled", "refunded"].includes(order.status)
  );
  const pendingReview = products.filter((product) =>
    ["in_review", "changes_requested"].includes(product.lifecycleStatus)
  );
  const materials = await listContent("material");
  const brands = await listContent("brand");
  return {
    products: {
      total: products.length,
      published: products.filter((product) => product.lifecycleStatus === "published").length,
      draft: products.filter((product) => product.lifecycleStatus === "draft").length,
      archived: products.filter((product) => product.lifecycleStatus === "archived").length,
      inReview: pendingReview.length,
      editorial: products.filter((product) => product.channel === "editorial").length,
      shop: products.filter((product) => product.channel !== "editorial").length,
    },
    inventory: {
      alerts: stockAlerts.length,
      stocked: products.filter((product) => product.inventory.mode === "stocked").length,
      sourceAfterOrder: products.filter(
        (product) => product.inventory.mode === "source_after_order"
      ).length,
    },
    shipping: {
      totalOrders: orders.length,
      active: activeShipments.length,
      missingTracking: activeShipments.filter(
        (order) => !order.shipment?.trackingNumber
      ).length,
    },
    content: {
      materials: materials.length,
      brands: brands.length,
      materialsDraft: materials.filter((row) => row.status === "draft").length,
      brandsDraft: brands.filter((row) => row.status === "draft").length,
    },
    recentOrders: orders.slice(0, 5),
    stockAlerts: stockAlerts.slice(0, 10),
    pendingReview: pendingReview.slice(0, 10),
  };
}

function publicAdminUser(session) {
  return {
    email: session.email,
    displayName: session.displayName || "",
    role: session.role || "admin",
    roles: session.roles || [],
    permissions: session.permissions || [],
  };
}

export function createAdminRouter({
  express,
  basePath,
  email,
  passwordHash,
  developmentPassword,
  secureCookies,
}) {
  const router = express.Router();
  const auth = createAdminAuth({
    email,
    passwordHash,
    developmentPassword,
    cookiePath: basePath,
    secureCookies,
  });
  const upload = createMediaUploader();

  router.use(adminHeaders);

  router.get("/admin.css", (_req, res) => {
    res.type("text/css").sendFile(path.join(adminWebRoot, "admin.css"));
  });
  router.get("/admin.js", (_req, res) => {
    res.type("text/javascript").sendFile(path.join(adminWebRoot, "admin.js"));
  });
  router.get("/admin-platform.js", (_req, res) => {
    res.type("text/javascript").sendFile(path.join(adminWebRoot, "admin-platform.js"));
  });
  // Serve remaining admin assets (upload helper, AI UI modules, CSS).
  router.use(
    express.static(adminWebRoot, {
      index: false,
      fallthrough: true,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".js")) res.type("text/javascript");
        if (filePath.endsWith(".css")) res.type("text/css");
      },
    })
  );
  router.get("/", (_req, res) => {
    if (!auth.configured()) {
      return res.status(503).sendFile(path.join(adminWebRoot, "unavailable.html"));
    }
    return res.sendFile(path.join(adminWebRoot, "index.html"));
  });

  router.get("/api/session", async (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({ ok: false, configured: false, error: "Operations access is not configured." });
    }
    let session = await auth.sessionFromRequest(req);
    if (!session && auth.devBypassEnabled?.()) {
      try {
        session = await auth.ensureDevBypassSession(req, res);
      } catch (error) {
        return routeError(res, error, 500);
      }
    }
    if (!session) return res.json({ ok: true, configured: true, authenticated: false });
    return res.json({
      ok: true,
      configured: true,
      authenticated: true,
      user: publicAdminUser(session),
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
      environment: process.env.NODE_ENV === "production" ? "production" : "staging",
      devBypass: Boolean(session.devBypass) || auth.devBypassEnabled?.(),
    });
  });

  router.post("/api/login", sameOriginOnly, async (req, res) => {
    if (!auth.configured()) {
      return res.status(503).json({ ok: false, error: "Operations access is not configured." });
    }
    const submittedEmail = String(req.body?.email || "").trim();
    let result;
    try {
      result = await auth.login(req, submittedEmail, req.body?.password);
    } catch (error) {
      return routeError(res, error, 500);
    }
    if (!result.ok) {
      if (result.rateLimited) {
        res.setHeader("Retry-After", String(result.retryAfterSeconds));
        return res.status(429).json({
          ok: false,
          error: "Too many failed attempts. Try again later.",
        });
      }
      return res.status(401).json({ ok: false, error: "Email or password is incorrect." });
    }

    auth.setSessionCookie(res, result.session);
    await appendAuditEvent({
      actor: result.session.email,
      action: "admin_login",
      entityType: "session",
      entityId: result.session.id.slice(0, 12),
      ip: clientIp(req),
    });
    return res.json({
      ok: true,
      authenticated: true,
      user: publicAdminUser(result.session),
      csrfToken: result.session.csrfToken,
      expiresAt: new Date(result.session.expiresAt).toISOString(),
      environment: process.env.NODE_ENV === "production" ? "production" : "staging",
    });
  });

  router.post(
    "/api/logout",
    sameOriginOnly,
    auth.requireSession,
    auth.requireCsrf,
    async (req, res) => {
      await appendAuditEvent({
        actor: req.adminSession.email,
        action: "admin_logout",
        entityType: "session",
        entityId: req.adminSession.id.slice(0, 12),
        ip: clientIp(req),
      });
      await auth.logout(req, res);
      return res.json({ ok: true });
    }
  );

  router.use("/api", auth.requireSession);

  router.get("/api/overview", requireAnyPermission("product.read", "order.read"), async (_req, res) => {
    try {
      return res.json({ ok: true, overview: await overview() });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.get("/api/search", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim().toLowerCase();
      if (!q || q.length < 2) {
        return res.json({ ok: true, groups: [] });
      }
      const groups = [];
      const session = req.adminSession;
      const perms = new Set(session.permissions || []);

      if (perms.has("product.read")) {
        const products = (await listAdminProducts())
          .filter((product) => {
            const hay = `${product.id} ${product.zh?.name || ""} ${product.en?.name || ""} ${product.material || ""}`.toLowerCase();
            return hay.includes(q);
          })
          .slice(0, 8)
          .map((product) => ({
            type: "product",
            id: product.id,
            title: product.zh?.name || product.en?.name || product.id,
            subtitle: product.lifecycleStatus,
          }));
        if (products.length) groups.push({ type: "product", label: "Products", items: products });
      }

      if (perms.has("order.read")) {
        const orders = (await listAdminOrders())
          .filter((order) => {
            const hay = `${order.id} ${order.customer?.email || ""} ${order.customer?.name || ""}`.toLowerCase();
            return hay.includes(q);
          })
          .slice(0, 8)
          .map((order) => ({
            type: "order",
            id: order.id,
            title: order.id,
            subtitle: order.status,
          }));
        if (orders.length) groups.push({ type: "order", label: "Orders", items: orders });
      }

      for (const [type, perm, label] of [
        ["brand", "brand.read", "Brands"],
        ["material", "material.read", "Materials"],
        ["country", "country.read", "Countries"],
      ]) {
        if (!perms.has(perm)) continue;
        const items = (await listContent(type))
          .filter((row) => {
            const hay = `${row.id} ${row.slug} ${row.name || ""} ${row.nameZh || ""} ${row.nameEn || ""}`.toLowerCase();
            return hay.includes(q);
          })
          .slice(0, 8)
          .map((row) => ({
            type,
            id: row.id,
            title: row.nameZh || row.nameEn || row.name || row.id,
            subtitle: row.status,
          }));
        if (items.length) groups.push({ type, label, items });
      }

      return res.json({ ok: true, groups });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.get("/api/products", requirePermission("product.read"), async (req, res) => {
    try {
      const products = (await listAdminProducts()).map((product) =>
        stripFinanceFields(withMarginFields(product), req.adminSession)
      );
      return res.json({ ok: true, products });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.post(
    "/api/products",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("product.create"),
    async (req, res) => {
      try {
        const body = { ...(req.body || {}) };
        if (
          ["published", "scheduled"].includes(body.lifecycleStatus) &&
          !req.adminSession.permissions?.includes("product.publish")
        ) {
          body.lifecycleStatus = "in_review";
        }
        const product = stripFinanceFields(
          withMarginFields(await createManagedProduct(body)),
          req.adminSession
        );
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "product_created",
          entityType: "product",
          entityId: product.id,
          details: {
            lifecycleStatus: product.lifecycleStatus,
            inventoryMode: product.inventory.mode,
            channel: product.channel,
          },
          ip: clientIp(req),
        });
        return res.status(201).json({ ok: true, product });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.put(
    "/api/products/:id",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("product.update"),
    async (req, res) => {
      try {
        const body = { ...(req.body || {}) };
        if (
          body.lifecycleStatus === "published" &&
          !req.adminSession.permissions?.includes("product.publish")
        ) {
          return routeError(res, new Error("Publish permission required."), 403);
        }
        if (!req.adminSession.permissions?.includes("finance.read")) {
          delete body.costPrice;
          delete body.purchasePrice;
        }
        const product = await updateManagedProduct(req.params.id, body);
        if (!product) return routeError(res, new Error("Product not found."), 404);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "product_updated",
          entityType: "product",
          entityId: product.id,
          details: {
            revision: product.revision,
            lifecycleStatus: product.lifecycleStatus,
            inventoryMode: product.inventory.mode,
          },
          ip: clientIp(req),
        });
        return res.json({
          ok: true,
          product: stripFinanceFields(withMarginFields(product), req.adminSession),
        });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.delete(
    "/api/products/:id",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("product.delete"),
    async (req, res) => {
      try {
        const product = await softDeleteProduct(req.params.id, {
          actor: req.adminSession.email,
          userId: req.adminSession.userId,
        });
        if (!product) return routeError(res, new Error("Product not found."), 404);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "product_deleted",
          entityType: "product",
          entityId: product.id,
          details: { trashRetentionDays: RETENTION_DAYS },
          ip: clientIp(req),
        });
        return res.json({ ok: true, product, retentionDays: RETENTION_DAYS });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.post(
    "/api/products/batch-delete",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("product.delete"),
    async (req, res) => {
      try {
        const result = await softDeleteProducts(req.body?.ids || [], {
          actor: req.adminSession.email,
          userId: req.adminSession.userId,
        });
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "product_batch_deleted",
          entityType: "product",
          entityId: result.deleted.join(",") || "none",
          details: {
            deletedCount: result.deleted.length,
            failedCount: result.failed.length,
            deletedIds: result.deleted,
            failed: result.failed,
            trashRetentionDays: RETENTION_DAYS,
          },
          ip: clientIp(req),
        });
        return res.json({ ok: true, ...result });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.patch(
    "/api/products/:id/inventory",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("inventory.update"),
    async (req, res) => {
      try {
        const product = await updateManagedInventory(req.params.id, req.body || {});
        if (!product) return routeError(res, new Error("Product not found."), 404);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "inventory_updated",
          entityType: "product",
          entityId: product.id,
          details: {
            mode: product.inventory.mode,
            onHand: product.inventory.onHand,
            availableQuantity: product.availableQuantity,
            reorderPoint: product.inventory.reorderPoint,
          },
          ip: clientIp(req),
        });
        return res.json({
          ok: true,
          product: stripFinanceFields(withMarginFields(product), req.adminSession),
        });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.get("/api/orders", requirePermission("order.read"), async (_req, res) => {
    try {
      return res.json({
        ok: true,
        orders: await listAdminOrders(),
        statuses: ORDER_STATUSES,
      });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.put(
    "/api/orders/:id/shipment",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("order.update"),
    async (req, res) => {
      try {
        const order = await updateOrderOperations(req.params.id, req.body || {});
        if (!order) return routeError(res, new Error("Order not found."), 404);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "shipment_updated",
          entityType: "order",
          entityId: order.id,
          details: {
            status: order.status,
            carrier: order.shipment?.carrier || "",
            trackingNumber: order.shipment?.trackingNumber || "",
          },
          ip: clientIp(req),
        });
        return res.json({ ok: true, order });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.get("/api/audit", requirePermission("audit.read"), async (req, res) => {
    try {
      return res.json({
        ok: true,
        events: await listAuditEvents({
          limit: req.query.limit,
          actor: req.query.actor,
          action: req.query.action,
          entityType: req.query.entityType,
          entityId: req.query.entityId,
          from: req.query.from,
          to: req.query.to,
          q: req.query.q,
        }),
      });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  // ---- Content entities (brands / materials / countries / designers / crafts)
  for (const type of ["brand", "material", "country", "designer", "craft"]) {
    const readPerm = type === "designer" || type === "craft" ? "content.read" : `${type}.read`;
    const writePerm = type === "designer" || type === "craft" ? "content.update" : `${type}.write`;

    router.get(`/api/${type}s`, requirePermission(readPerm), async (_req, res) => {
      try {
        const items = await listContent(type);
        const body = { ok: true, items };
        if (type === "brand") body.brands = items;
        return res.json(body);
      } catch (error) {
        return routeError(res, error, 500);
      }
    });

    router.get(`/api/${type}s/:id`, requirePermission(readPerm), async (req, res) => {
      try {
        const item = await getContent(type, req.params.id);
        if (!item) return routeError(res, new Error("Not found."), 404);
        return res.json({ ok: true, item });
      } catch (error) {
        return routeError(res, error, 500);
      }
    });

    router.post(
      `/api/${type}s`,
      sameOriginOnly,
      auth.requireCsrf,
      requirePermission(writePerm),
      async (req, res) => {
        try {
          const item = await saveContent(type, req.body || {}, {
            userId: req.adminSession.userId,
            actor: req.adminSession.email,
          });
          await appendAuditEvent({
            actor: req.adminSession.email,
            action: `${type}_saved`,
            entityType: type,
            entityId: item.id,
            details: { status: item.status },
            ip: clientIp(req),
          });
          return res.status(201).json({ ok: true, item });
        } catch (error) {
          return routeError(res, error);
        }
      }
    );

    router.put(
      `/api/${type}s/:id`,
      sameOriginOnly,
      auth.requireCsrf,
      requirePermission(writePerm),
      async (req, res) => {
        try {
          const item = await saveContent(
            type,
            { ...(req.body || {}), id: req.params.id },
            { userId: req.adminSession.userId, actor: req.adminSession.email }
          );
          await appendAuditEvent({
            actor: req.adminSession.email,
            action: `${type}_saved`,
            entityType: type,
            entityId: item.id,
            details: { status: item.status },
            ip: clientIp(req),
          });
          return res.json({ ok: true, item });
        } catch (error) {
          return routeError(res, error);
        }
      }
    );

    router.delete(
      `/api/${type}s/:id`,
      sameOriginOnly,
      auth.requireCsrf,
      requirePermission(writePerm),
      async (req, res) => {
        try {
          const ok = await softDeleteContentEntity(type, req.params.id, {
            actor: req.adminSession.email,
            userId: req.adminSession.userId,
          });
          if (!ok) return routeError(res, new Error("Not found."), 404);
          await appendAuditEvent({
            actor: req.adminSession.email,
            action: `${type}_deleted`,
            entityType: type,
            entityId: req.params.id,
            details: { trashRetentionDays: RETENTION_DAYS },
            ip: clientIp(req),
          });
          return res.json({ ok: true, retentionDays: RETENTION_DAYS });
        } catch (error) {
          return routeError(res, error);
        }
      }
    );

    router.post(
      `/api/${type}s/batch-delete`,
      sameOriginOnly,
      auth.requireCsrf,
      requirePermission(writePerm),
      async (req, res) => {
        try {
          const result = await softDeleteContentEntities(type, req.body?.ids || [], {
            actor: req.adminSession.email,
            userId: req.adminSession.userId,
          });
          await appendAuditEvent({
            actor: req.adminSession.email,
            action: `${type}_batch_deleted`,
            entityType: type,
            entityId: result.deleted.join(",") || "none",
            details: {
              deletedCount: result.deleted.length,
              failedCount: result.failed.length,
              deletedIds: result.deleted,
              failed: result.failed,
              trashRetentionDays: RETENTION_DAYS,
            },
            ip: clientIp(req),
          });
          return res.json({ ok: true, ...result });
        } catch (error) {
          return routeError(res, error);
        }
      }
    );

    router.get(
      `/api/${type}s/:id/revisions`,
      requirePermission(readPerm),
      async (req, res) => {
        try {
          return res.json({
            ok: true,
            revisions: await listContentRevisions(type, req.params.id),
          });
        } catch (error) {
          return routeError(res, error, 500);
        }
      }
    );
  }

  // ---- Site content CMS (basic)
  router.get("/api/site-content", requirePermission("content.read"), (_req, res) => {
    try {
      return res.json({ ok: true, content: getSiteContent() });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.patch(
    "/api/site-content",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("content.update"),
    async (req, res) => {
      try {
        const content = patchSiteContent(req.body?.patch || req.body || {});
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "site_content_patched",
          entityType: "site_content",
          entityId: String(content.version),
          ip: clientIp(req),
        });
        return res.json({ ok: true, content });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  // ---- Media library
  router.get("/api/media", requirePermission("media.read"), async (req, res) => {
    try {
      return res.json({
        ok: true,
        media: await listMediaLibrary({
          folder: req.query.folder,
          q: req.query.q,
          limit: req.query.limit,
        }),
      });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.post(
    "/api/media/upload",
    sameOriginOnly,
    auth.requireCsrf,
    requireAnyPermission(
      "media.upload",
      "brand.write",
      "material.write",
      "country.write",
      "content.update",
      "product.create",
      "product.update"
    ),
    (req, res, next) => {
      upload.array("files", 8)(req, res, (error) => {
        if (!error) return next();
        return routeError(res, error);
      });
    },
    async (req, res) => {
      try {
        const files = req.files || [];
        if (!files.length) return routeError(res, new Error("Please choose files."));
        const media = [];
        for (const file of files) {
          media.push(
            await registerUploadedFile(file, {
              folder: req.body?.folder || "general",
              altText: req.body?.altText || "",
              uploadedBy: req.adminSession.userId,
            })
          );
        }
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "media_uploaded",
          entityType: "media",
          entityId: media.map((row) => row.id).join(","),
          details: { count: media.length },
          ip: clientIp(req),
        });
        return res.status(201).json({ ok: true, media });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.patch(
    "/api/media/:id",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("media.upload"),
    async (req, res) => {
      try {
        const media = await updateMediaAsset(req.params.id, req.body || {});
        if (!media) return routeError(res, new Error("Media not found."), 404);
        return res.json({ ok: true, media });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.delete(
    "/api/media/:id",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("media.delete"),
    async (req, res) => {
      try {
        const ok = await softDeleteMedia(req.params.id, {
          actor: req.adminSession.email,
          userId: req.adminSession.userId,
        });
        if (!ok) return routeError(res, new Error("Media not found."), 404);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "media_deleted",
          entityType: "media",
          entityId: req.params.id,
          details: { trashRetentionDays: RETENTION_DAYS },
          ip: clientIp(req),
        });
        return res.json({ ok: true, retentionDays: RETENTION_DAYS });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.post(
    "/api/media/batch-delete",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("media.delete"),
    async (req, res) => {
      try {
        const result = await softDeleteMediaMany(req.body?.ids || [], {
          actor: req.adminSession.email,
          userId: req.adminSession.userId,
        });
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "media_batch_deleted",
          entityType: "media",
          entityId: result.deleted.join(",") || "none",
          details: {
            deletedCount: result.deleted.length,
            failedCount: result.failed.length,
            deletedIds: result.deleted,
            failed: result.failed,
            trashRetentionDays: RETENTION_DAYS,
          },
          ip: clientIp(req),
        });
        return res.json({ ok: true, ...result });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.get("/api/trash", requirePermission("audit.read"), async (_req, res) => {
    try {
      return res.json({
        ok: true,
        retentionDays: RETENTION_DAYS,
        records: await listTrash(),
      });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.post(
    "/api/trash/:id/restore",
    sameOriginOnly,
    auth.requireCsrf,
    requireAnyPermission(
      "product.delete",
      "brand.write",
      "material.write",
      "country.write",
      "media.delete",
      "content.update"
    ),
    async (req, res) => {
      try {
        const record = await restoreDeletion(req.params.id, {
          actor: req.adminSession.email,
        });
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "trash_restored",
          entityType: record.entityType,
          entityId: record.entityId,
          ip: clientIp(req),
        });
        return res.json({ ok: true, record });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.post(
    "/api/trash/purge-expired",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("settings.manage"),
    async (req, res) => {
      try {
        const result = await purgeExpiredDeletions();
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "trash_purged",
          entityType: "trash",
          entityId: "expired",
          details: result,
          ip: clientIp(req),
        });
        return res.json({ ok: true, ...result });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.get("/api/media/:id/usages", requirePermission("media.read"), async (req, res) => {
    try {
      return res.json({ ok: true, usages: await getMediaUsages(req.params.id) });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  // ---- Team / RBAC
  router.get("/api/customers", requirePermission("customer.read"), async (_req, res) => {
    try {
      if (!isDatabaseEnabled()) return res.json({ ok: true, customers: [] });
      return res.json({ ok: true, customers: await listCustomers() });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.put(
    "/api/customers/:id/membership",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("customer.manage"),
    async (req, res) => {
      try {
        if (!isDatabaseEnabled()) return routeError(res, new Error("Database is required."), 503);
        const customer = await setCustomerMembership(req.params.id, req.body?.status, req.adminSession.userId);
        if (!customer) return routeError(res, new Error("Customer not found."), 404);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: customer.membership_status === "member" ? "customer_membership_granted" : "customer_membership_revoked",
          entityType: "customer",
          entityId: customer.id,
          details: { email: customer.email, membershipStatus: customer.membership_status },
          ip: clientIp(req),
        });
        return res.json({ ok: true, customer });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.get("/api/team", requirePermission("team.read"), async (_req, res) => {
    try {
      if (!isDatabaseEnabled()) {
        return res.json({
          ok: true,
          users: [
            {
              email,
              displayName: "Operations",
              isActive: true,
              roles: [{ id: "super_admin", name: "Super Admin" }],
            },
          ],
          roles: await rbacRepo.listRoles().catch(() => []),
        });
      }
      return res.json({
        ok: true,
        users: await rbacRepo.listAdminUsers(),
        roles: await rbacRepo.listRoles(),
        permissions: await rbacRepo.listPermissions(),
      });
    } catch (error) {
      return routeError(res, error, 500);
    }
  });

  router.post(
    "/api/team",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("team.manage"),
    async (req, res) => {
      try {
        if (!isDatabaseEnabled()) {
          return routeError(res, new Error("Database is required for team management."), 503);
        }
        const password = String(req.body?.password || "");
        const passwordHash = password ? createPasswordHash(password) : null;
        const user = await rbacRepo.createAdminUser({
          email: req.body?.email,
          passwordHash,
          displayName: req.body?.displayName || "",
          roleIds: req.body?.roleIds || ["viewer"],
          isActive: req.body?.isActive !== false,
        });
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "team_user_created",
          entityType: "admin_user",
          entityId: user.id,
          details: { email: user.email },
          ip: clientIp(req),
        });
        return res.status(201).json({ ok: true, user });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.put(
    "/api/team/:id/roles",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("team.manage"),
    async (req, res) => {
      try {
        if (!isDatabaseEnabled()) {
          return routeError(res, new Error("Database is required."), 503);
        }
        await rbacRepo.setUserRoles(
          req.params.id,
          req.body?.roleIds || [],
          req.adminSession.userId
        );
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "team_roles_updated",
          entityType: "admin_user",
          entityId: req.params.id,
          details: { roleIds: req.body?.roleIds || [] },
          ip: clientIp(req),
        });
        return res.json({ ok: true });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.post(
    "/api/team/:id/deactivate",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("team.manage"),
    async (req, res) => {
      try {
        if (!isDatabaseEnabled()) {
          return routeError(res, new Error("Database is required."), 503);
        }
        const user = await rbacRepo.setAdminActive(req.params.id, false);
        if (!user) return routeError(res, new Error("User not found."), 404);
        await rbacRepo.revokeAllSessionsForUser(req.params.id);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "team_user_deactivated",
          entityType: "admin_user",
          entityId: req.params.id,
          ip: clientIp(req),
        });
        return res.json({ ok: true, user });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.post(
    "/api/team/:id/revoke-sessions",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("team.manage"),
    async (req, res) => {
      try {
        if (!isDatabaseEnabled()) {
          return routeError(res, new Error("Database is required."), 503);
        }
        await rbacRepo.revokeAllSessionsForUser(req.params.id);
        await appendAuditEvent({
          actor: req.adminSession.email,
          action: "team_sessions_revoked",
          entityType: "admin_user",
          entityId: req.params.id,
          ip: clientIp(req),
        });
        return res.json({ ok: true });
      } catch (error) {
        return routeError(res, error);
      }
    }
  );

  router.get("/api/ai/registry", requirePermission("ai_content_optimize"), (_req, res) => {
    const cfg = getAiConfig();
    return res.json({
      ok: true,
      enabled: cfg.enabled && Boolean(cfg.apiKey) && Boolean(cfg.defaultModel),
      registry: listAiFieldRegistry(),
      objectives: [
        "luxury_editorial",
        "buyer_store",
        "fashion_magazine",
        "concise_professional",
        "conversion",
        "seo",
        "translate_en",
        "translate_zh",
        "shorten",
        "expand",
        "custom",
      ],
      tones: [
        "restrained",
        "editorial",
        "authoritative",
        "warm",
        "rational",
        "poetic",
        "commercial",
        "minimal",
      ],
      lengths: ["shorter", "similar", "longer"],
      modelTiers: ["standard", "premium"],
    });
  });

  router.post(
    "/api/ai/optimize",
    sameOriginOnly,
    auth.requireCsrf,
    requirePermission("ai_content_optimize"),
    async (req, res) => {
      try {
        const data = await optimizeContent({
          body: req.body || {},
          session: req.adminSession,
          ip: clientIp(req),
          signal: req.aborted ? AbortSignal.abort() : undefined,
        });
        return res.json({ ok: true, ...data });
      } catch (error) {
        const status = Number(error?.status || 400);
        return routeError(res, error, status >= 400 && status < 600 ? status : 400);
      }
    }
  );

  router.use((req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ ok: false, error: "Operations endpoint not found." });
    }
    return res.status(404).send("Not found");
  });

  return { router, configured: auth.configured() };
}
