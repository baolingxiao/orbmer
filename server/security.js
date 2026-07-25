/**
 * Shared same-origin guard for cookie session portals (admin / seller / buyer).
 * Tolerant of reverse-proxy HTTPS and localhost ↔ 127.0.0.1.
 */
function normalizeHost(hostname) {
  const host = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (host === "127.0.0.1" || host === "::1") return "localhost";
  return host;
}

function parseOrigin(originHeader) {
  try {
    const url = new URL(String(originHeader || ""));
    return {
      protocol: url.protocol.replace(":", ""),
      host: normalizeHost(url.hostname),
      port: url.port || (url.protocol === "https:" ? "443" : "80"),
    };
  } catch {
    return null;
  }
}

export function sameOriginOnly(req, res, next) {
  const fetchSite = String(req.get("sec-fetch-site") || "");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    return res.status(403).json({ ok: false, error: "Cross-site request blocked." });
  }

  const origin = String(req.get("origin") || "");
  if (!origin) return next();

  const parsed = parseOrigin(origin);
  if (!parsed) {
    return res.status(403).json({ ok: false, error: "Origin check failed." });
  }

  const requestHost = normalizeHost(String(req.get("host") || "").split(":")[0]);
  const forwardedProto = String(req.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const requestProto = forwardedProto || req.protocol || "http";

  const hostOk = parsed.host === requestHost;
  // Allow http/https mismatch when behind TLS-terminating proxy.
  const protoOk =
    parsed.protocol === requestProto ||
    (parsed.protocol === "https" && requestProto === "http") ||
    (parsed.protocol === "http" && requestProto === "https" && parsed.host === "localhost");

  if (!hostOk || !protoOk) {
    return res.status(403).json({ ok: false, error: "Origin check failed." });
  }
  return next();
}
