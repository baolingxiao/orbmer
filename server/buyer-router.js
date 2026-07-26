import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import multer from "multer";
import Stripe from "stripe";
import { createPortalAuth } from "./portal-auth.js";
import { isDatabaseEnabled, query } from "./db/index.js";
import {
  JOURNAL_WEEKLY_LIMIT,
  getJournalArticle,
  isModernJournalItem,
  normalizeJournalArticles,
} from "../web/shared/js/journal-data.js";
import { tierRank } from "../web/shared/js/membership-data.js";
import { recordJournalRead } from "./db/journal-repo.js";
import {
  createUser,
  findBuyerByGoogleSubject,
  findUserByEmail,
  linkGoogleIdentity,
  listBuyerOrders,
} from "./db/user-repo.js";
import { getBuyerOrderJourney, publicOrder } from "./order-store.js";
import { appendAuditEvent } from "./audit-store.js";
import { sameOriginOnly } from "./security.js";
import {
  createConciergeRequest,
  createFeatureNotification,
  getEntitlements,
  getMembershipForUser,
  listConciergeRequests,
} from "./db/membership-repo.js";
import {
  getSiteContent,
  patchSiteContent,
  addModuleCard,
} from "./site-content-store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authWebRoot = path.join(__dirname, "..", "web", "auth");
const uploadRoot = path.join(__dirname, "..", "web", "assets", "uploads", "site");

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MEMBERSHIP_PRICE_ENV = {
  journal: {
    monthly: "STRIPE_JOURNAL_MONTHLY_PRICE_ID",
    yearly: "STRIPE_JOURNAL_YEARLY_PRICE_ID",
  },
  collector: {
    monthly: "STRIPE_COLLECTOR_MONTHLY_PRICE_ID",
    yearly: "STRIPE_COLLECTOR_YEARLY_PRICE_ID",
  },
};

function publicJournalArticle(article, lang = "zh") {
  const useEn = lang === "en";
  return {
    id: article.id,
    title: useEn ? article.titleEn : article.titleZh,
    category: useEn ? article.categoryEn : article.categoryZh,
    image: article.image,
    excerpt: useEn ? article.excerptEn : article.excerptZh,
    body: useEn ? article.bodyEn : article.bodyZh,
  };
}

function journalArticleFromContent(id) {
  const journal = getSiteContent()?.journal || {};
  const cmsItems = Array.isArray(journal.items) && journal.items.some(isModernJournalItem) ? journal.items : undefined;
  const articles = normalizeJournalArticles(cmsItems);
  return articles.find((article) => article.id === id) || getJournalArticle(id);
}

function looksLikeRealKey(value) {
  return Boolean(value && !/x{4,}|your[_-]?|replace|changeme|example/i.test(value) && String(value).length >= 20);
}

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
  const legacy = session.membershipStatus === "member" ? "journal" : session.membershipStatus;
  return {
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    membershipStatus: legacy || "explorer",
    authProvider: session.authProvider || "email",
  };
}

export function createBuyerRouter({ express, secureCookies, publicBaseUrl = "" }) {
  const router = express.Router();
  const auth = createPortalAuth({
    roles: ["admin", "buyer"],
    purpose: "buyer",
    cookieName: "orbmare_buyer_session",
    cookiePath: "/",
    secureCookies,
  });
  const upload = createUploader();
  const googleClientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const googleClientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const normalizedBaseUrl = String(publicBaseUrl || "").trim().replace(/\/$/, "");
  const googleRedirectUri = `${normalizedBaseUrl}/auth/api/google/callback`;
  const googleConfigured = Boolean(googleClientId && googleClientSecret && normalizedBaseUrl);
  const stripeSecretKey = String(process.env.STRIPE_SECRET_KEY || "").trim();
  const stripe = looksLikeRealKey(stripeSecretKey)
    ? new Stripe(stripeSecretKey, { apiVersion: "2026-06-24.dahlia" })
    : null;

  function appendCookie(res, name, value, { maxAge = 600, sameSite = "Lax" } = {}) {
    const flags = [
      `${name}=${encodeURIComponent(value)}`,
      "Path=/auth",
      "HttpOnly",
      `SameSite=${sameSite}`,
      `Max-Age=${maxAge}`,
    ];
    if (secureCookies) flags.push("Secure");
    res.append("Set-Cookie", flags.join("; "));
  }

  function clearGoogleState(res) {
    appendCookie(res, "orbmare_google_oauth_state", "", { maxAge: 0 });
  }

  function redirectToAuth(res, result) {
    return res.redirect(302, `/auth/?google=${encodeURIComponent(result)}`);
  }

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
    if (!session) {
      return res.json({
        ok: true,
        configured: true,
        authenticated: false,
        googleSignInAvailable: googleConfigured,
      });
    }
    return res.json({
      ok: true,
      configured: true,
      authenticated: true,
      googleSignInAvailable: googleConfigured,
      user: publicUser(session),
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  });

  router.get("/api/google", (req, res) => {
    if (!auth.configured() || !googleConfigured) {
      return redirectToAuth(res, "unavailable");
    }
    const state = crypto.randomBytes(32).toString("base64url");
    appendCookie(res, "orbmare_google_oauth_state", state);
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    }).toString();
    return res.redirect(302, authorizationUrl.toString());
  });

  router.get("/api/google/callback", async (req, res) => {
    try {
      const returnedState = String(req.query?.state || "");
      const cookieState = String(req.headers.cookie || "")
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith("orbmare_google_oauth_state="))
        ?.slice("orbmare_google_oauth_state=".length);
      clearGoogleState(res);
      if (!googleConfigured || !returnedState || !cookieState || !crypto.timingSafeEqual(
        crypto.createHash("sha256").update(returnedState).digest(),
        crypto.createHash("sha256").update(decodeURIComponent(cookieState)).digest()
      )) {
        return redirectToAuth(res, "state_error");
      }
      if (req.query?.error || !req.query?.code) return redirectToAuth(res, "cancelled");

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(req.query.code),
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: googleRedirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokens.id_token) throw new Error("Google token exchange failed.");

      const profileResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`
      );
      const profile = await profileResponse.json().catch(() => ({}));
      if (
        !profileResponse.ok ||
        profile.aud !== googleClientId ||
        !["accounts.google.com", "https://accounts.google.com"].includes(profile.iss) ||
        profile.email_verified !== "true" ||
        !profile.sub ||
        !profile.email
      ) {
        throw new Error("Google identity verification failed.");
      }

      let user = await findBuyerByGoogleSubject(profile.sub);
      if (!user) {
        const matchingUser = await findUserByEmail(profile.email, "buyer");
        user = matchingUser
          ? await linkGoogleIdentity(matchingUser.id, { subject: profile.sub, displayName: profile.name })
          : await createUser({
              email: profile.email,
              password: null,
              role: "buyer",
              displayName: profile.name || "",
              authProvider: "google",
              metadata: { googlePicture: String(profile.picture || "").slice(0, 500) },
            });
        if (!user.google_subject) {
          user = await linkGoogleIdentity(user.id, { subject: profile.sub, displayName: profile.name });
        }
        await appendAuditEvent({
          actor: user.email,
          action: matchingUser ? "buyer_google_linked" : "buyer_google_registered",
          entityType: "user",
          entityId: user.id,
          ip: req.ip || "",
        });
      }
      const session = await auth.createSessionForUser(req, user);
      auth.setSessionCookie(res, session);
      clearLegacyAuthCookie(res);
      return redirectToAuth(res, "success");
    } catch (error) {
      console.error("Google buyer sign-in failed:", error.message);
      return redirectToAuth(res, "failed");
    }
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

  router.get("/api/orders/:id/journey", auth.requireSession, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      const journey = await getBuyerOrderJourney(req.params.id, {
        userId: req.portalSession.userId,
        email: req.portalSession.email,
      });
      if (!journey) return res.status(404).json({ ok: false, error: "Order not found." });
      return res.json({ ok: true, ...journey });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/journal/:id", async (req, res) => {
    try {
      const article = journalArticleFromContent(req.params.id);
      if (!article) return res.status(404).json({ ok: false, error: "Journal article not found." });

      const lang = String(req.query?.lang || "zh").trim() === "en" ? "en" : "zh";
      if (article.requiresMembership === false) {
        return res.json({
          ok: true,
          article: publicJournalArticle(article, lang),
          access: { tier: "public", unlimited: true, used: null, limit: null, resetAt: null, requiresMembership: false },
        });
      }

      if (!isDatabaseEnabled()) {
        return res.status(503).json({ ok: false, error: "Database is required for Journal access." });
      }

      const session = await auth.sessionFromRequest(req);
      if (!session) {
        return res.status(401).json({
          ok: false,
          code: "MEMBERSHIP_REQUIRED",
          error: "Authentication required.",
          currentTier: "guest",
          requiredTier: "journal",
          access: { tier: "guest", unlimited: false, used: 0, limit: JOURNAL_WEEKLY_LIMIT, resetAt: null, requiresMembership: true },
        });
      }
      if (session.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }

      const membership = await getMembershipForUser(session.userId);
      const tier = membership?.tier || session.membershipStatus || "explorer";

      if (["collector", "black"].includes(tier)) {
        return res.json({
          ok: true,
          article: publicJournalArticle(article, lang),
          access: { tier, unlimited: true, used: null, limit: null, resetAt: null, requiresMembership: true },
        });
      }

      if (tierRank(tier) < tierRank("journal")) {
        return res.status(403).json({
          ok: false,
          code: "MEMBERSHIP_REQUIRED",
          error: "Journal membership is required.",
          currentTier: tier,
          requiredTier: "journal",
          access: { tier, unlimited: false, used: 0, limit: JOURNAL_WEEKLY_LIMIT, resetAt: null, requiresMembership: true },
        });
      }

      const access = await recordJournalRead(session.userId, article.id);
      if (!access.allowed) {
        return res.status(403).json({
          ok: false,
          code: "JOURNAL_WEEKLY_LIMIT",
          error: "Weekly Journal reading limit reached.",
          currentTier: tier,
          requiredTier: "collector",
          access: { tier, unlimited: false, used: access.used, limit: access.limit, resetAt: access.resetAt, requiresMembership: true },
        });
      }

      return res.json({
        ok: true,
        article: publicJournalArticle(article, lang),
        access: {
          tier,
          unlimited: false,
          used: access.used,
          limit: access.limit,
          resetAt: access.resetAt,
          requiresMembership: true,
          alreadyReadInWindow: access.alreadyReadInWindow,
        },
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/membership", auth.requireSession, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      if (!isDatabaseEnabled()) {
        return res.json({
          ok: true,
          membership: {
            tier: req.portalSession.membershipStatus === "member" ? "journal" : "explorer",
            billingInterval: "none",
            status: "inactive",
          },
          entitlements: [],
          requests: [],
          databaseEnabled: false,
        });
      }
      const [membership, entitlements, requests] = await Promise.all([
        getMembershipForUser(req.portalSession.userId),
        getEntitlements(),
        listConciergeRequests({ userId: req.portalSession.userId }),
      ]);
      return res.json({ ok: true, membership, entitlements, requests, databaseEnabled: true });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/membership/notify", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      if (!isDatabaseEnabled()) return res.status(503).json({ ok: false, error: "Database is required." });
      await createFeatureNotification(req.portalSession.userId, req.body?.featureKey);
      return res.json({ ok: true });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/concierge", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      if (!isDatabaseEnabled()) return res.status(503).json({ ok: false, error: "Database is required." });
      const membership = await getMembershipForUser(req.portalSession.userId);
      if (!["collector", "black"].includes(membership?.tier)) {
        return res.status(403).json({
          ok: false,
          error: "Collector membership is required for human service requests.",
          requiredTier: "collector",
          currentTier: membership?.tier || "explorer",
        });
      }
      const request = await createConciergeRequest(req.portalSession.userId, req.body || {});
      await appendAuditEvent({
        actor: req.portalSession.email,
        action: "concierge_request_created",
        entityType: "concierge_request",
        entityId: request.id,
        ip: req.ip || "",
      });
      return res.status(201).json({ ok: true, request });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/membership/checkout", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      if (!isDatabaseEnabled()) return res.status(503).json({ ok: false, error: "Database is required." });
      if (!stripe) return res.status(503).json({ ok: false, error: "Payment setup in progress." });
      const tier = String(req.body?.tier || "").trim();
      const interval = String(req.body?.billingInterval || "monthly").trim();
      const envName = MEMBERSHIP_PRICE_ENV[tier]?.[interval];
      const priceId = envName ? String(process.env[envName] || "").trim() : "";
      if (!priceId) return res.status(503).json({ ok: false, error: "Payment setup in progress." });
      const successUrl =
        String(process.env.STRIPE_MEMBERSHIP_SUCCESS_URL || "").trim() ||
        `${normalizedBaseUrl || `${req.protocol}://${req.get("host")}`}/auth/?membership=success`;
      const cancelUrl =
        String(process.env.STRIPE_MEMBERSHIP_CANCEL_URL || "").trim() ||
        `${normalizedBaseUrl || `${req.protocol}://${req.get("host")}`}/membership/?membership=cancel`;
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.portalSession.email,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: req.portalSession.userId,
          tier,
          billingInterval: interval,
        },
        subscription_data: {
          metadata: {
            userId: req.portalSession.userId,
            tier,
            billingInterval: interval,
          },
        },
      });
      return res.json({ ok: true, url: session.url });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/membership/portal", sameOriginOnly, auth.requireSession, auth.requireCsrf, async (req, res) => {
    try {
      if (req.portalSession.role !== "buyer") {
        return res.status(403).json({ ok: false, error: "Buyer access required." });
      }
      if (!stripe) return res.status(503).json({ ok: false, error: "Payment setup in progress." });
      const membership = await getMembershipForUser(req.portalSession.userId);
      if (!membership?.stripeCustomerId) {
        return res.status(400).json({ ok: false, error: "No Stripe subscription is linked to this account yet." });
      }
      const returnUrl = `${normalizedBaseUrl || `${req.protocol}://${req.get("host")}`}/auth/`;
      const portal = await stripe.billingPortal.sessions.create({
        customer: membership.stripeCustomerId,
        return_url: returnUrl,
      });
      return res.json({ ok: true, url: portal.url });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
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
