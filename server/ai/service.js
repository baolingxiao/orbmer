import { createHash, randomUUID } from "crypto";
import { assertAiReady, getAiConfig } from "./config.js";
import { createStructuredResponse } from "./openai-client.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompt-registry.js";
import {
  BATCH_FIELDS_SCHEMA,
  LENGTHS,
  LANGUAGES,
  MODES,
  MODEL_TIERS,
  OBJECTIVES,
  SINGLE_FIELD_SCHEMA,
  TONES,
} from "./schema.js";
import { assertFieldAllowed, ENTITY_TYPES, getEntityFields } from "./field-registry.js";
import { assertRateLimit } from "./rate-limit.js";
import { writeAiLog } from "./log-repo.js";
import { hasPermission } from "../rbac.js";

function hashValue(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex").slice(0, 32);
}

function countChars(value) {
  if (typeof value === "string") return value.length;
  if (value && typeof value === "object") return JSON.stringify(value).length;
  return 0;
}

function validateRequest(body) {
  const entityType = String(body.entityType || "").trim();
  const mode = String(body.mode || "single_field").trim();
  const objective = String(body.objective || "luxury_editorial").trim();
  const tone = String(body.tone || "restrained").trim();
  const length = String(body.length || "similar").trim();
  const modelTier = String(body.modelTier || "standard").trim();
  const sourceLanguage = String(body.sourceLanguage || "auto").trim();
  const targetLanguage = String(body.targetLanguage || sourceLanguage).trim();

  if (!ENTITY_TYPES.has(entityType)) {
    const error = new Error(`Unsupported entityType: ${entityType}`);
    error.status = 400;
    error.code = "invalid_entity_type";
    throw error;
  }
  if (!MODES.has(mode)) {
    const error = new Error(`Unsupported mode: ${mode}`);
    error.status = 400;
    error.code = "invalid_mode";
    throw error;
  }
  if (!OBJECTIVES.has(objective)) {
    const error = new Error(`Unsupported objective: ${objective}`);
    error.status = 400;
    error.code = "invalid_objective";
    throw error;
  }
  if (!TONES.has(tone)) {
    const error = new Error(`Unsupported tone: ${tone}`);
    error.status = 400;
    error.code = "invalid_tone";
    throw error;
  }
  if (!LENGTHS.has(length)) {
    const error = new Error(`Unsupported length: ${length}`);
    error.status = 400;
    error.code = "invalid_length";
    throw error;
  }
  if (!MODEL_TIERS.has(modelTier)) {
    const error = new Error(`Unsupported modelTier: ${modelTier}`);
    error.status = 400;
    error.code = "invalid_model_tier";
    throw error;
  }
  if (!LANGUAGES.has(sourceLanguage) || !LANGUAGES.has(targetLanguage)) {
    const error = new Error("Unsupported language.");
    error.status = 400;
    error.code = "invalid_language";
    throw error;
  }

  return {
    entityType,
    entityId: String(body.entityId || "").slice(0, 120),
    mode,
    objective,
    tone,
    length,
    modelTier,
    sourceLanguage,
    targetLanguage,
    field: body.field ? String(body.field) : "",
    contentType: body.contentType ? String(body.contentType) : "",
    currentValue: body.currentValue ?? "",
    fields: body.fields && typeof body.fields === "object" ? body.fields : null,
    context: body.context && typeof body.context === "object" ? body.context : {},
    customInstruction: String(body.customInstruction || "").slice(0, 2000),
    sourceValueHash: String(body.sourceValueHash || "").slice(0, 64),
  };
}

function estimateInputSize(req) {
  let total = countChars(req.currentValue) + countChars(req.customInstruction);
  if (req.fields) total += countChars(req.fields);
  if (req.context) total += countChars(req.context);
  return total;
}

async function callModelOnce(payload, { schema, schemaName, contentType, signal }) {
  const systemPrompt = buildSystemPrompt({
    contentType,
    objective: payload.objective,
    tone: payload.tone,
    length: payload.length,
  });
  const userPrompt = buildUserPrompt(payload);
  return createStructuredResponse({
    tier: payload.modelTier,
    systemPrompt,
    userPrompt,
    schema,
    schemaName,
    signal,
  });
}

async function callModelWithRetry(payload, options) {
  try {
    return await callModelOnce(payload, options);
  } catch (error) {
    const retryable =
      error?.code === "ai_timeout" ||
      error?.code === "openai_upstream" ||
      error?.code === "openai_rate_limit";
    if (!retryable || options?.signal?.aborted) throw error;
    return callModelOnce(payload, options);
  }
}

export async function optimizeContent({ body, session, ip = "", signal }) {
  const cfg = getAiConfig();
  const req = validateRequest(body || {});

  if (!hasPermission(session, "ai_content_optimize")) {
    const error = new Error("You do not have permission to use AI optimization.");
    error.status = 403;
    error.code = "ai_forbidden";
    throw error;
  }
  if (req.modelTier === "premium" && !hasPermission(session, "ai_content_use_premium_model")) {
    const error = new Error("Premium AI model is not allowed for this account.");
    error.status = 403;
    error.code = "ai_premium_forbidden";
    throw error;
  }

  const inputChars = estimateInputSize(req);
  if (inputChars > cfg.maxInputChars) {
    const error = new Error(`Input exceeds max ${cfg.maxInputChars} characters.`);
    error.status = 400;
    error.code = "ai_input_too_large";
    throw error;
  }

  assertRateLimit({
    userId: session.userId || session.email,
    ip,
    perMinute: cfg.rateLimitPerMinute,
    perDay: cfg.dailyLimitPerUser,
    perMonth: cfg.monthlyLimitPerUser,
  });

  // After auth + validation — ensure key/model exist before calling OpenAI.
  assertAiReady(req.modelTier);

  const requestId = randomUUID();
  const started = Date.now();
  let status = "completed";
  let errorCode = "";
  let usage = { model: "", inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  let result;
  let fieldName = req.field || "";
  let contentType = req.contentType;
  let sourceHash = req.sourceValueHash;

  try {
    if (req.mode === "single_field" || req.mode === "translate_pair") {
      if (!req.field) {
        const error = new Error("field is required for single_field mode.");
        error.status = 400;
        error.code = "missing_field";
        throw error;
      }
      const fieldCfg = assertFieldAllowed(req.entityType, req.field);
      contentType = contentType || fieldCfg.contentType;
      if (req.mode === "translate_pair") {
        contentType =
          req.targetLanguage === "en" ? "translation_zh_to_en" : "translation_en_to_zh";
      }
      if (!String(req.currentValue || "").trim() && req.mode === "single_field") {
        // Allow empty for generation-from-context
      }
      sourceHash = sourceHash || hashValue(req.currentValue);
      const modelResult = await callModelWithRetry(
        { ...req, contentType },
        { schema: SINGLE_FIELD_SCHEMA, schemaName: "ai_single_field", contentType, signal }
      );
      usage = modelResult.usage;
      const parsed = modelResult.parsed;
      parsed.field = req.field;
      parsed.original = String(req.currentValue ?? "");
      if (fieldCfg.maxLength && String(parsed.optimized || "").length > fieldCfg.maxLength) {
        parsed.optimized = String(parsed.optimized).slice(0, fieldCfg.maxLength);
        parsed.warnings = [
          ...(parsed.warnings || []),
          {
            type: "truncated",
            text: parsed.optimized.slice(0, 40),
            message: `Optimized text truncated to ${fieldCfg.maxLength} characters.`,
          },
        ];
      }
      if (fieldCfg.nameSafe) {
        parsed.changeSummary = [
          ...(parsed.changeSummary || []),
          "Name field: only normalization/translation applied; official name must stay faithful.",
        ];
      }
      result = {
        field: parsed.field,
        original: parsed.original,
        optimized: parsed.optimized,
        changeSummary: parsed.changeSummary || [],
        warnings: parsed.warnings || [],
        language: parsed.language || req.targetLanguage,
        sourceValueHash: sourceHash,
      };
    } else {
      // full_form
      const allowed = new Set(getEntityFields(req.entityType).map((row) => row.field));
      const fields = {};
      for (const [key, value] of Object.entries(req.fields || {})) {
        if (allowed.has(key)) fields[key] = value;
      }
      if (!Object.keys(fields).length) {
        const error = new Error("No AI-enabled fields provided for full_form mode.");
        error.status = 400;
        error.code = "empty_fields";
        throw error;
      }
      fieldName = Object.keys(fields).join(",");
      contentType = contentType || "full_entity_consistency";
      sourceHash = sourceHash || hashValue(JSON.stringify(fields));
      const modelResult = await callModelWithRetry(
        { ...req, fields, contentType },
        { schema: BATCH_FIELDS_SCHEMA, schemaName: "ai_batch_fields", contentType, signal }
      );
      usage = modelResult.usage;
      const parsed = modelResult.parsed;
      const filtered = (parsed.fields || []).filter((row) => allowed.has(row.field));
      result = {
        fields: filtered.map((row) => ({
          field: row.field,
          original: row.original ?? String(fields[row.field] ?? ""),
          optimized: row.optimized ?? "",
          changeSummary: row.changeSummary || [],
          warnings: row.warnings || [],
        })),
        globalWarnings: parsed.globalWarnings || [],
        consistencyNotes: parsed.consistencyNotes || [],
        sourceValueHash: sourceHash,
      };
    }

    return {
      success: true,
      requestId,
      result,
      usage,
      durationMs: Date.now() - started,
    };
  } catch (error) {
    status = "error";
    errorCode = error.code || "ai_error";
    throw error;
  } finally {
    const outputChars =
      result?.optimized != null
        ? countChars(result.optimized)
        : countChars(result?.fields);
    await writeAiLog({
      requestId,
      userId: session.userId || null,
      actorEmail: session.email || "",
      entityType: req.entityType,
      entityId: req.entityId,
      fieldName,
      operationMode: req.mode,
      objective: req.objective,
      model: usage.model,
      inputCharacterCount: inputChars,
      outputCharacterCount: outputChars,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      status,
      warnings: result?.warnings || result?.globalWarnings || [],
      errorCode,
      sourceValueHash: sourceHash,
      ip,
      completedAt: new Date().toISOString(),
    });
  }
}

export function listAiFieldRegistry() {
  const out = {};
  for (const entityType of ENTITY_TYPES) {
    out[entityType] = getEntityFields(entityType).map((row) => ({
      field: row.field,
      label: row.label,
      language: row.language,
      contentType: row.contentType,
      maxLength: row.maxLength,
      relatedFields: row.relatedFields,
      nameSafe: Boolean(row.nameSafe),
    }));
  }
  return out;
}
