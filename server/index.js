import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createStripeRouter, stripeWebhookHandler } from "./stripe/payments.js";
import { createAdminRouter } from "./admin-router.js";
import { createSellerRouter } from "./seller-router.js";
import { createBuyerRouter } from "./buyer-router.js";
import {
  purgeNonPrintCatalog,
  listPublishedEditorialProducts,
  listPublishedProducts,
  renderPublicCatalogModule,
  seedProductsIfEmpty,
} from "./product-store.js";
import { loadEditorialMeta } from "./editorial-map.js";
import { importJsonOrdersIfEmpty } from "./order-store.js";
import { ensureDatabaseReady, isDatabaseEnabled } from "./db/index.js";
import { getPublishedContent, listContent } from "./content-store.js";
import { getSiteContent } from "./site-content-store.js";
import { purgeExpiredDeletions } from "./trash-store.js";
import { toPublicBrandCard, toPublicBrandDetail } from "./brand-editorial.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const webRoot = path.join(projectRoot, "web");

const {
  STRIPE_SECRET_KEY = "",
  STRIPE_PUBLISHABLE_KEY = "",
  STRIPE_WEBHOOK_SECRET = "",
  PUBLIC_BASE_URL = "",
  PORT = "4242",
  NODE_ENV = "development",
  ADMIN_ROUTE = "",
  ADMIN_HOST = "",
  ADMIN_EMAIL = "",
  ADMIN_PASSWORD_HASH = "",
  ADMIN_PASSWORD = "",
} = process.env;

const app = express();
app.disable("x-powered-by");
// Trust reverse proxy (nginx TLS) so req.protocol / cookies work on orbmare.com
app.set("trust proxy", 1);

function resolveAdminBasePath(value) {
  const candidate = String(value || "").trim() || (NODE_ENV === "production" ? "" : "/ops-preview");
  if (!candidate) return null;
  if (!/^\/[a-zA-Z0-9][a-zA-Z0-9_-]{7,79}$/.test(candidate)) {
    throw new Error("ADMIN_ROUTE must be a single hard-to-guess path segment of 8-80 characters.");
  }
  if (["/admin", "/auth", "/checkout", "/shop", "/seller"].includes(candidate.toLowerCase())) {
    throw new Error("ADMIN_ROUTE must not reuse a public application route.");
  }
  return candidate;
}

const adminBasePath = resolveAdminBasePath(ADMIN_ROUTE);
const adminPasswordHash = String(ADMIN_PASSWORD_HASH || "").trim();
const adminDevelopmentPassword =
  NODE_ENV === "production" ? "" : String(ADMIN_PASSWORD || "");
const allowedOrigins = new Set(
  [PUBLIC_BASE_URL, "http://127.0.0.1:5180", "http://localhost:5180"].filter(Boolean)
);
const apiCors = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
});

const {
  router: stripeRouter,
  configured,
  paymentsEnabled,
  isLive,
  stripe,
} = createStripeRouter({
  express,
  secretKey: STRIPE_SECRET_KEY,
  publishableKey: STRIPE_PUBLISHABLE_KEY,
  webhookSecret: STRIPE_WEBHOOK_SECRET,
  nodeEnvironment: NODE_ENV,
});

// Stripe webhook needs raw body — before JSON parser
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler({ stripe, webhookSecret: STRIPE_WEBHOOK_SECRET })
);

app.use(express.json({ limit: "256kb" }));
app.use("/api/stripe", apiCors, stripeRouter);

let adminHostRouter = null;
const adminHost = String(ADMIN_HOST || "")
  .trim()
  .toLowerCase()
  .replace(/^https?:\/\//, "")
  .split("/")[0]
  .split(":")[0];

// The admin host must be handled before the public API. Otherwise routes such as
// /api/brands answer the console with published-only public cards that drop
// updatedAt and the editorial payload.
app.use((req, res, next) => {
  if (!adminHostRouter || !adminHost) return next();
  const host = String(req.headers.host || "").split(":")[0].toLowerCase();
  if (host !== adminHost) return next();
  if (req.path.startsWith("/assets/") || req.path.startsWith("/shared/")) return next();
  return adminHostRouter(req, res, next);
});

app.get("/api/catalog", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, products: await listPublishedProducts() });
});
app.get("/api/editorial-catalog", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const meta = loadEditorialMeta();
  const dbMaterials = await getPublishedContent("material").catch(() => []);
  const dbDesigners = await getPublishedContent("designer").catch(() => []);
  const dbCrafts = await getPublishedContent("craft").catch(() => []);
  res.json({
    ok: true,
    mission: meta.mission,
    missionZh: meta.missionZh,
    mvpCountries: meta.mvpCountries,
    materials: dbMaterials.length
      ? dbMaterials.map((row) => ({
          id: row.id,
          name: row.nameEn || row.name || row.id,
          nameZh: row.nameZh || row.name || row.id,
          origin: row.origin || "",
          originZh: row.originZh || "",
          image: row.image || row.heroImage || "",
          blurb: row.blurb || row.intro || "",
          blurbZh: row.blurbZh || row.introZh || "",
        }))
      : meta.materials,
    designers: dbDesigners.length
      ? dbDesigners.map((row) => ({
          id: row.id,
          name: row.nameEn || row.name || row.id,
          nameZh: row.nameZh || row.name || row.id,
          studio: row.studio || "",
          studioZh: row.studioZh || "",
          city: row.city || "",
          cityZh: row.cityZh || "",
        }))
      : meta.designers,
    crafts: dbCrafts.length
      ? dbCrafts.map((row) => ({
          id: row.id,
          name: row.nameEn || row.name || row.id,
          nameZh: row.nameZh || row.name || row.id,
          countries: row.countries || [],
          countriesZh: row.countriesZh || [],
          history: row.history || row.blurb || "",
          historyZh: row.historyZh || row.blurbZh || "",
          image: row.image || row.heroImage || "",
        }))
      : meta.crafts || [],
    products: await listPublishedEditorialProducts(),
  });
});

app.get("/api/crafts", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const items = (await listContent("craft")).filter((row) => row.status === "published");
    return res.json({
      ok: true,
      crafts: items.map((row) => ({
        id: row.id,
        name: row.nameEn || row.name || row.id,
        nameEn: row.nameEn || row.name || row.id,
        nameZh: row.nameZh || row.name || row.id,
        countries: row.countries || [],
        countriesZh: row.countriesZh || [],
        history: row.history || row.blurb || "",
        historyZh: row.historyZh || row.blurbZh || "",
        image: row.image || row.heroImage || "",
      })),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Crafts unavailable." });
  }
});

app.get("/api/crafts/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const items = await listContent("craft");
    const item = items.find(
      (row) => row.status === "published" && (row.id === req.params.id || row.slug === req.params.id)
    );
    if (!item) return res.status(404).json({ ok: false, error: "Craft not found." });
    return res.json({ ok: true, craft: item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Craft unavailable." });
  }
});

app.get("/api/materials", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const items = (await listContent("material")).filter((row) => row.status === "published");
    return res.json({ ok: true, materials: items });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Materials unavailable." });
  }
});

app.get("/api/countries", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const items = (await listContent("country")).filter((row) => row.status === "published");
    return res.json({ ok: true, countries: items });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Countries unavailable." });
  }
});

app.get("/api/site-content", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    return res.json({ ok: true, content: getSiteContent() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Site content unavailable." });
  }
});

app.get("/api/materials/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const items = await listContent("material");
    const item = items.find((row) => row.id === req.params.id || row.slug === req.params.id);
    if (!item || item.status !== "published") {
      return res.status(404).json({ ok: false, error: "Material not found." });
    }
    return res.json({ ok: true, material: item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Material unavailable." });
  }
});

app.get("/api/countries/:code", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const code = String(req.params.code || "").toLowerCase();
    const items = await listContent("country");
    const item = items.find(
      (row) => row.status === "published" && (row.code === code || row.slug === code || row.id === code)
    );
    if (!item) {
      return res.status(404).json({ ok: false, error: "Country not found." });
    }
    return res.json({ ok: true, country: item });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Country unavailable." });
  }
});

app.get("/api/brands", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const kind = String(req.query.kind || "").toLowerCase();
    const featuredOnly = String(req.query.featured || "") === "1";
    let items = (await listContent("brand")).filter((row) => row.status === "published");
    if (kind === "brand" || kind === "studio" || kind === "designer") {
      items = items.filter((row) => row.kind === kind);
    }
    if (featuredOnly) items = items.filter((row) => row.featured);
    return res.json({
      ok: true,
      brands: items.map((row) => toPublicBrandCard(row)),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Brands unavailable." });
  }
});

app.get("/api/brands/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const items = await listContent("brand");
    const item = items.find(
      (row) =>
        row.status === "published" && (row.id === req.params.id || row.slug === req.params.id)
    );
    if (!item) {
      return res.status(404).json({ ok: false, error: "Brand not found." });
    }
    const styleKey = (row) =>
      String(row?.identity?.designStyle || row?.identity?.category || "")
        .trim()
        .toLowerCase();
    const currentStyle = styleKey(item);
    const publishedOthers = items.filter(
      (row) => row.status === "published" && row.id !== item.id
    );

    // 1) Explicit relatedBrandIds from CMS
    // 2) Same design style
    // 3) Remaining published brands
    const byId = new Map(publishedOthers.map((row) => [row.id, row]));
    const picked = [];
    const seen = new Set();
    const pushRow = (row) => {
      if (!row || seen.has(row.id)) return;
      seen.add(row.id);
      picked.push(row);
    };

    for (const id of item.relatedBrandIds || []) {
      pushRow(byId.get(id));
      if (picked.length >= 12) break;
    }
    if (currentStyle && picked.length < 12) {
      for (const row of publishedOthers) {
        if (styleKey(row) === currentStyle) pushRow(row);
        if (picked.length >= 12) break;
      }
    }
    if (picked.length < 12) {
      for (const row of publishedOthers) {
        pushRow(row);
        if (picked.length >= 12) break;
      }
    }

    const related = picked.slice(0, 12).map((row) => toPublicBrandCard(row));
    return res.json({
      ok: true,
      brand: toPublicBrandDetail(item),
      related,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: "Brand unavailable." });
  }
});

app.get("/shared/js/catalog.js", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.type("text/javascript").send(await renderPublicCatalogModule());
});

const adminCredentials = {
  email: String(ADMIN_EMAIL || "").trim(),
  passwordHash: adminPasswordHash,
  developmentPassword: adminDevelopmentPassword,
  secureCookies: NODE_ENV === "production",
};

let adminConfigured = false;

if (adminBasePath) {
  const admin = createAdminRouter({
    express,
    basePath: adminBasePath,
    ...adminCredentials,
  });
  adminConfigured = admin.configured;
  app.use((req, res, next) => {
    const pathname = req.url.split("?")[0];
    if (pathname === adminBasePath) return res.redirect(302, `${adminBasePath}/`);
    return next();
  });
  app.use(adminBasePath, admin.router);
}

if (adminHost) {
  const hosted = createAdminRouter({
    express,
    basePath: "/",
    ...adminCredentials,
  });
  adminConfigured = adminConfigured || hosted.configured;
  // Consumed by the early host guard registered above the public API routes.
  adminHostRouter = hosted.router;
}

const seller = createSellerRouter({
  express,
  secureCookies: NODE_ENV === "production",
});
app.use("/seller", seller.router);

const buyer = createBuyerRouter({
  express,
  secureCookies: NODE_ENV === "production",
});
app.use("/auth", buyer.router);

// Intentionally return no discovery information at conventional admin paths.
app.use("/admin", (_req, res) => res.status(404).send("Not found"));

// Frontend modules
app.use(express.static(webRoot));

// Platform homepage is / (web/index.html via static). Orbmare 3D shop lives at /shop/.
app.get("/checkout.html", (_req, res) => res.redirect(302, "/checkout/"));
app.get("/product.html", (req, res) => {
  const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/product/${q}`);
});
app.get("/auth.html", (req, res) => {
  const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/auth/${q}`);
});
app.get("/admin.html", (_req, res) => res.status(404).send("Not found"));
app.get("/success.html", (req, res) => {
  const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `/checkout/success.html${q}`);
});

async function start() {
  let demoSeller = null;
  if (isDatabaseEnabled()) {
    await ensureDatabaseReady();
    const seeded = await seedProductsIfEmpty();
    const purged = await purgeNonPrintCatalog();
    const imported = await importJsonOrdersIfEmpty();
    demoSeller = await seller.bootstrapDemoSeller();
    let brandCount = 0;
    let materialCount = 0;
    let countryCount = 0;
    try {
      brandCount = (await listContent("brand")).length;
      materialCount = (await listContent("material")).length;
      countryCount = (await listContent("country")).length;
    } catch (error) {
      console.warn("[db] content count skipped:", error.message);
    }
    console.log(
      `[db] PostgreSQL ready` +
        (seeded.seeded ? ` · seeded ${seeded.count} products` : ` · products ${seeded.count ?? "n/a"}`) +
        ` · print-catalog kept ${purged.kept} · removed ${purged.deleted} · renamed ${purged.renamed}` +
        (imported.imported ? ` · imported ${imported.count} orders` : "") +
        ` · brands ${brandCount} · materials ${materialCount} · countries ${countryCount}`
    );
    if (demoSeller) {
      console.log(`[seller] demo account ready: ${demoSeller.email}`);
    }
    try {
      const trash = await purgeExpiredDeletions();
      if (trash.purged) {
        console.log(`[trash] purged ${trash.purged} expired deletion(s)`);
      }
    } catch (error) {
      console.warn("[trash] purge skipped:", error.message);
    }
  } else {
    const purged = await purgeNonPrintCatalog();
    console.log(
      `[db] DATABASE_URL not set — using JSON file stores (dev fallback)` +
        ` · print-catalog kept ${purged.kept} · removed ${purged.deleted} · renamed ${purged.renamed}`
    );
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Orbmare API + web on http://0.0.0.0:${PORT}`);
    console.log(`Static root: ${webRoot}`);
    if (PUBLIC_BASE_URL) console.log(`Public base URL: ${PUBLIC_BASE_URL}`);
    console.log(`Seller portal: http://127.0.0.1:${PORT}/seller/`);
    console.log(`Buyer accounts: http://127.0.0.1:${PORT}/auth/`);
    console.log(
      adminConfigured
        ? "Operations console enabled on its configured private route"
        : "Operations console disabled: private route or credentials are incomplete"
    );
    console.log(
      paymentsEnabled
        ? `Stripe ${isLive ? "live" : "test"} checkout ready`
        : "Checkout disabled: Stripe or required webhook configuration is incomplete"
    );
  });
}

start().catch((error) => {
  console.error("[boot] failed:", error);
  process.exit(1);
});
