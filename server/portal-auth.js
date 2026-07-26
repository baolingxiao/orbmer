import crypto from "crypto";
import { isDatabaseEnabled } from "./db/index.js";
import * as sessionRepo from "./db/session-repo.js";
import { createPasswordHash } from "./admin-auth.js";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 8;

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

/**
 * Role-scoped portal auth (buyer / seller / multi-role site login).
 * Requires DATABASE_URL.
 */
export function createPortalAuth({
  role,
  roles = null,
  purpose,
  cookieName,
  cookiePath,
  secureCookies,
}) {
  const allowedRoles = Array.isArray(roles) && roles.length ? roles : role ? [role] : [];
  if (!allowedRoles.length || !allowedRoles.every((entry) => ["buyer", "seller", "admin"].includes(entry))) {
    throw new Error("Portal auth roles must be buyer, seller, and/or admin.");
  }
  const loginFailures = new Map();
  const memorySessions = new Map();

  function configured() {
    return isDatabaseEnabled();
  }

  function failureKey(req, email) {
    return `${req.ip || req.socket?.remoteAddress || "unknown"}:${String(email || "").toLowerCase()}`;
  }

  function loginAllowed(req, email) {
    const key = failureKey(req, email);
    const record = loginFailures.get(key);
    if (!record) return { allowed: true, retryAfterSeconds: 0 };
    if (Date.now() - record.startedAt >= LOGIN_WINDOW_MS) {
      loginFailures.delete(key);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (record.count < MAX_LOGIN_FAILURES) return { allowed: true, retryAfterSeconds: 0 };
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((LOGIN_WINDOW_MS - (Date.now() - record.startedAt)) / 1000),
    };
  }

  function recordFailure(req, email) {
    const key = failureKey(req, email);
    const current = loginFailures.get(key);
    if (!current || Date.now() - current.startedAt >= LOGIN_WINDOW_MS) {
      loginFailures.set(key, { count: 1, startedAt: Date.now() });
      return;
    }
    current.count += 1;
  }

  async function sessionFromRequest(req) {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (!token) return null;
    if (!isDatabaseEnabled()) {
      const session = memorySessions.get(token);
      if (!session || session.expiresAt <= Date.now()) {
        memorySessions.delete(token);
        return null;
      }
      if (!allowedRoles.includes(session.role)) return null;
      return session;
    }
    const session = await sessionRepo.getSession(token, { purpose });
    if (!session || !allowedRoles.includes(session.role)) return null;
    return session;
  }

  async function login(req, email, password) {
    if (!configured()) {
      return { ok: false, unavailable: true };
    }
    const rate = loginAllowed(req, email);
    if (!rate.allowed) return { ok: false, rateLimited: true, retryAfterSeconds: rate.retryAfterSeconds };

    let user = null;
    for (const candidateRole of allowedRoles) {
      user = await sessionRepo.findUserByEmailAndRole(email, candidateRole);
      if (user) break;
    }
    const valid =
      user?.is_active &&
      user.password_hash &&
      verifyScryptPassword(String(password || ""), user.password_hash);

    if (!valid) {
      recordFailure(req, email);
      return { ok: false, rateLimited: false };
    }

    loginFailures.delete(failureKey(req, email));
    return { ok: true, session: await createSessionForUser(req, user) };
  }

  async function createSessionForUser(req, user) {
    if (!user?.id || !user.is_active || !allowedRoles.includes(user.role)) {
      throw new Error("This account is not allowed to sign in here.");
    }
    const id = crypto.randomBytes(32).toString("base64url");
    const now = Date.now();
    const session = {
      id,
      userId: user.id,
      email: user.email,
      displayName: user.display_name || "",
      role: user.role,
      membershipStatus: user.membership_status || "standard",
      authProvider: user.auth_provider || "email",
      csrfToken: crypto.randomBytes(32).toString("base64url"),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + SESSION_TTL_MS,
      purpose,
    };

    await sessionRepo.createSession({
      id: session.id,
      userId: user.id,
      csrfToken: session.csrfToken,
      purpose,
      ip: req.ip || req.socket?.remoteAddress || "",
      userAgent: String(req.get?.("user-agent") || "").slice(0, 300),
      expiresAt: session.expiresAt,
    });

    return session;
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
    res.append("Set-Cookie", flags.join("; "));
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
    res.append("Set-Cookie", flags.join("; "));
  }

  async function logout(req, res) {
    const token = parseCookies(req.headers.cookie)[cookieName];
    if (token) await sessionRepo.deleteSession(token);
    clearSessionCookie(res);
  }

  async function requireSession(req, res, next) {
    try {
      const session = await sessionFromRequest(req);
      if (!session) return res.status(401).json({ ok: false, error: "Authentication required." });
      req.portalSession = session;
      return next();
    } catch (error) {
      return next(error);
    }
  }

  function requireCsrf(req, res, next) {
    const supplied = String(req.get("x-csrf-token") || "");
    const expected = String(req.portalSession?.csrfToken || "");
    if (!supplied || !constantTimeTextEqual(supplied, expected)) {
      return res.status(403).json({ ok: false, error: "Invalid security token." });
    }
    return next();
  }

  return {
    configured,
    createSessionForUser,
    login,
    logout,
    sessionFromRequest,
    setSessionCookie,
    requireSession,
    requireCsrf,
    createPasswordHash,
  };
}

export { createPasswordHash };
