/**
 * Central AI feature config — model IDs only from env, never hardcoded in callers.
 */

function bool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function int(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getAiConfig() {
  return {
    enabled: bool(process.env.OPENAI_AI_FEATURE_ENABLED, true),
    apiKey: String(process.env.OPENAI_API_KEY || "").trim(),
    defaultModel: String(process.env.OPENAI_DEFAULT_MODEL || "").trim(),
    premiumModel: String(process.env.OPENAI_PREMIUM_MODEL || "").trim(),
    maxInputChars: int(process.env.OPENAI_MAX_INPUT_CHARS, 30000),
    requestTimeoutMs: int(process.env.OPENAI_REQUEST_TIMEOUT_MS, 45000),
    dailyLimitPerUser: int(process.env.OPENAI_DAILY_LIMIT_PER_USER, 200),
    monthlyLimitPerUser: int(process.env.OPENAI_MONTHLY_LIMIT_PER_USER, 3000),
    rateLimitPerMinute: int(process.env.OPENAI_RATE_LIMIT_PER_MINUTE, 20),
    // Rough USD / 1M tokens for cost logging only (override via env if needed)
    costPer1MInput: Number(process.env.OPENAI_COST_PER_1M_INPUT || 1.25) || 1.25,
    costPer1MOutput: Number(process.env.OPENAI_COST_PER_1M_OUTPUT || 10) || 10,
  };
}

export function assertAiReady(tier = "standard") {
  const cfg = getAiConfig();
  if (!cfg.enabled) {
    const error = new Error("AI content optimization is disabled.");
    error.status = 503;
    error.code = "ai_disabled";
    throw error;
  }
  if (!cfg.apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured on the server.");
    error.status = 503;
    error.code = "ai_key_missing";
    throw error;
  }
  const model = tier === "premium" ? cfg.premiumModel || cfg.defaultModel : cfg.defaultModel;
  if (!model) {
    const error = new Error(
      tier === "premium"
        ? "OPENAI_PREMIUM_MODEL (or OPENAI_DEFAULT_MODEL) is not configured."
        : "OPENAI_DEFAULT_MODEL is not configured."
    );
    error.status = 503;
    error.code = "ai_model_missing";
    throw error;
  }
  return { ...cfg, model };
}
