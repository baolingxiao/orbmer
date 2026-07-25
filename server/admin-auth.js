import crypto from "crypto";
import { isDatabaseEnabled } from "./db/index.js";
import * as sessionRepo from "./db/session-repo.js";
import * as rbacRepo from "./db/rbac-repo.js";
import { loadSessionAuthorization } from "./rbac.js";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

function parseCookies(header = "") {
  return String(header)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return cookies;
      const key = part.slice(0, separator);
      const value = part.slice(separator + 1);
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
      return cookies;
    }, {});
}

function constantTimeTextEqual(left, right) {
  const leftHash = crypto.createHash("sha256").update(String(left)).digest();
  const rightHash = crypto.createHash("sha256").update(String(right)).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function verifyScryptPassword(password, encoded) {
  const parts = String(encoded || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltEncoded, hashEncoded] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    if (salt.length < 16 || expected.length < 32) return false;
    const actual = crypto.scryptSync(String(password), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024,
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createPasswordHash(password) {
  const value = String(password || "");
  if (value.length < 14) {
    throw new Error("Admin password must be at least 14 characters.");
  }
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = crypto.randomBytes(24);
  const hash = crypto.scryptSync(value, salt, 64, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function createAdminAuth({
  email,
  passwordHash,
  developmentPassword,
  cookiePath,
  secureCookies,
}) {
  const sessions = new Map();
  const loginFailures = new Map();
  const cookieName = "orbmare_ops_session";

  function configured() {
    return Boolean(email && (passwordHash || developmentPassword));
  }

  function pruneSessions() {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (session.expiresAt <= now) sessions.delete(id);
    }
  }

  async function attachAuthorization(session) {
    if (!session) return null;
    const authz = await loadSessionAuthorization(session);
    session.roles = authz.roles;
    session.permissions = authz.permissions;
    return session;
  }

  async function sessionFromRequest(req) {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (!token) return null;

    if (isDatabaseEnabled()) {
      const session = await sessionRepo.getSession(token, { purpose: "admin" });
      return attachAuthorization(session);
    }

    pruneSessions();
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return null;
    }
    session.lastSeenAt = Date.now();
    return attachAuthorization(session);
  }

  function failureKey(req, submittedEmail) {
    return `${req.ip || req.socket?.remoteAddress || "unknown"}:${String(submittedEmail || "").toLowerCase()}`;
  }

  function loginAllowed(req, submittedEmail) {
    const key = failureKey(req, submittedEmail);
    const record = loginFailures.get(key);
    if (!record) return { allowed: true, retryAfterSeconds: 0 };
    if (Date.now() - record.startedAt >= LOGIN_WINDOW_MS) {
      loginFailures.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (record.count < MAX_LOGIN_FAILURES) return { allowed: true, retryAfterSeconds: 0 };
    const remaining = LOGIN_WINDOW_MS - (Date.now() - record.startedAt);
    return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000) };
  }

  function recordFailure(req, submittedEmail) {
    const key = failureKey(req, submittedEmail);
    const current = loginFailures.get(key);
    if (!current || Date.now() - current.startedAt >= LOGIN_WINDOW_MS) {
      loginFailures.set(key, { count: 1, startedAt: Date.now() });
      return;
    }
    current.count += 1;
  }

  function clearFailures(req, submittedEmail) {
    loginFailures.delete(failureKey(req, submittedEmail));
  }

  function passwordMatches(password, hashOverride = null) {
    const hash = hashOverride || passwordHash;
    if (hash) return verifyScryptPassword(password, hash);
    return constantTimeTextEqual(password, developmentPassword || "");
  }

  async function login(req, submittedEmail, password) {
    const rate = loginAllowed(req, submittedEmail);
    if (!rate.allowed) return { ok: false, rateLimited: true, retryAfterSeconds: rate.retryAfterSeconds };

    let resolvedEmail = email;
    let resolvedUserId = null;
    let validEmail = constantTimeTextEqual(
      String(submittedEmail || "").trim().toLowerCase(),
      String(email || "").toLowerCase()
    );
    let validPassword = passwordMatches(String(password || ""));

    if (isDatabaseEnabled()) {
      const user = await sessionRepo.findAdminUserByEmail(submittedEmail);
      if (user?.is_active) {
        resolvedEmail = user.email;
        resolvedUserId = user.id;
        validEmail = true;
        validPassword = passwordMatches(String(password || ""), user.password_hash || passwordHash);
        if (!user.password_hash && developmentPassword) {
          validPassword = passwordMatches(String(password || ""));
        }
      } else if (!validEmail) {
        validPassword = false;
      }
    }

    const ip = req.ip || req.socket?.remoteAddress || "";
    const userAgent = String(req.get("user-agent") || "").slice(0, 300);

    if (!validEmail || !validPassword) {
      recordFailure(req, submittedEmail);
      if (isDatabaseEnabled()) {
        try {
          await rbacRepo.recordLoginEvent({
            email: String(submittedEmail || ""),
            userId: resolvedUserId,
            success: false,
            ip,
            userAgent,
            reason: "invalid_credentials",
          });
        } catch {
          // login event table may not exist yet during partial boots
        }
      }
      return { ok: false, rateLimited: false };
    }

    clearFailures(req, submittedEmail);
    const id = crypto.randomBytes(32).toString("base64url");
    const now = Date.now();
    const session = {
      id,
      email: resolvedEmail,
      userId: resolvedUserId,
      role: "admin",
      csrfToken: crypto.randomBytes(32).toString("base64url"),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };

    if (isDatabaseEnabled()) {
      let userId = resolvedUserId;
      if (!userId) {
        const user = await sessionRepo.findAdminUserByEmail(resolvedEmail);
        userId = user?.id;
      }
      if (!userId) {
        throw new Error("Admin user is missing in the database. Run migrations with ADMIN_EMAIL set.");
      }
      session.userId = userId;
      await sessionRepo.createSession({
        id: session.id,
        userId,
        csrfToken: session.csrfToken,
        purpose: "admin",
        ip,
        userAgent,
        expiresAt: session.expiresAt,
      });
      try {
        await rbacRepo.ensureSuperAdmin(userId);
        await rbacRepo.recordLoginEvent({
          email: resolvedEmail,
          userId,
          success: true,
          ip,
          userAgent,
          reason: "ok",
        });
      } catch {
        // RBAC tables may be mid-migration
      }
    } else {
      sessions.set(id, session);
    }

    await attachAuthorization(session);
    return { ok: true, session };
  }

  function setSessionCookie(res, session) {
    const flags = [
      `${cookieName}=${encodeURIComponent(session.id)}`,
      `Path=${cookiePath}`,
      "HttpOnly",
      "SameSite=Strict",
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (secureCookies) flags.push("Secure");
    res.setHeader("Set-Cookie", flags.join("; "));
  }

  function clearSessionCookie(res) {
    const flags = [
      `${cookieName}=`,
      `Path=${cookiePath}`,
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=0",
    ];
    if (secureCookies) flags.push("Secure");
    res.setHeader("Set-Cookie", flags.join("; "));
  }

  async function logout(req, res) {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (token) {
      if (isDatabaseEnabled()) await sessionRepo.deleteSession(token);
      else sessions.delete(token);
    }
    clearSessionCookie(res);
  }

  function devBypassEnabled() {
    // Never allow in production, even if the env flag is mistakenly set.
    if (String(process.env.NODE_ENV || "").toLowerCase() === "production") return false;
    return String(process.env.ADMIN_DEV_BYPASS || "").trim() === "1";
  }

  /** Local-only: mint an admin session without password when ADMIN_DEV_BYPASS=1. */
  async function ensureDevBypassSession(req, res) {
    if (!devBypassEnabled() || !configured()) return null;
    const existing = await sessionFromRequest(req);
    if (existing) return existing;

    const ip = req.ip || req.socket?.remoteAddress || "";
    const userAgent = String(req.get("user-agent") || "").slice(0, 300);
    const id = crypto.randomBytes(32).toString("base64url");
    const now = Date.now();
    const session = {
      id,
      email: email || "dev@orbmare.local",
      userId: null,
      role: "admin",
      csrfToken: crypto.randomBytes(32).toString("base64url"),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS,
      devBypass: true,
    };

    if (isDatabaseEnabled()) {
      const user = await sessionRepo.findAdminUserByEmail(session.email);
      if (!user?.id) {
        throw new Error("Admin user missing for dev bypass. Run migrations with ADMIN_EMAIL set.");
      }
      session.userId = user.id;
      await sessionRepo.createSession({
        id: session.id,
        userId: user.id,
        csrfToken: session.csrfToken,
        purpose: "admin",
        ip,
        userAgent,
        expiresAt: session.expiresAt,
      });
      try {
        await rbacRepo.ensureSuperAdmin(user.id);
      } catch {
        // RBAC tables may be mid-migration
      }
    } else {
      sessions.set(id, session);
    }

    await attachAuthorization(session);
    setSessionCookie(res, session);
    return session;
  }

  async function requireSession(req, res, next) {
    try {
      let session = await sessionFromRequest(req);
      if (!session) {
        try {
          session = await ensureDevBypassSession(req, res);
        } catch (error) {
          return next(error);
        }
      }
      if (!session) return res.status(401).json({ ok: false, error: "Authentication required." });
      req.adminSession = session;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  function requireCsrf(req, res, next) {
    const supplied = String(req.get("x-csrf-token") || "");
    const expected = String(req.adminSession?.csrfToken || "");
    if (!supplied || !constantTimeTextEqual(supplied, expected)) {
      return res.status(403).json({ ok: false, error: "Invalid security token." });
    }
    return next();
  }

  return {
    configured,
    login,
    logout,
    sessionFromRequest,
    setSessionCookie,
    ensureDevBypassSession,
    devBypassEnabled,
    requireSession,
    requireCsrf,
  };
}
