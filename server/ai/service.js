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
  PRODUCT_SCREENSHOT_EXTRACTION_SCHEMA,
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

function cleanText(value, max = 2000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanMultiline(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function cleanPrice(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = text.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
  return match ? match[0] : "";
}

function cleanSlug(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function normalizeCountry(value, fallback = "china") {
  const text = String(value || "").trim().toLowerCase();
  if (/japan|日本/.test(text)) return "japan";
  if (/italy|italia|意大利/.test(text)) return "italy";
  if (/china|中国|cn/.test(text)) return "china";
  return fallback;
}

function normalizeProductType(value) {
  const text = String(value || "").trim().toLowerCase();
  if (/apparel|clothing|wear|服装|衣|裤|裙|衬衫|夹克|外套/.test(text)) return "apparel";
  if (/jewel|ring|necklace|bracelet|首饰|珠宝|戒指|项链/.test(text)) return "jewelry";
  if (/furniture|chair|table|sofa|家具|椅|桌|沙发/.test(text)) return "furniture";
  if (/home|kitchen|家居|居家|餐具/.test(text)) return "home";
  if (/stationery|paper|pen|文具|纸|笔/.test(text)) return "stationery";
  if (/fragrance|perfume|香水|香氛/.test(text)) return "fragrance";
  if (/tech|digital|device|科技|数码|电子/.test(text)) return "tech";
  if (/art|collect|艺术|收藏/.test(text)) return "art";
  if (/tool|工具|刀|剪/.test(text)) return "tool";
  return "object";
}

function normalizeExtractedProduct(parsed = {}) {
  const raw = parsed.fields || {};
  const productType = normalizeProductType(raw.productType || raw.zhName || raw.enName);
  const channel = cleanText(raw.channel, 40) === "shop" ? "shop" : "editorial";
  const fields = {
    id: cleanSlug(raw.id || raw.enName || raw.zhName),
    channel,
    lifecycleStatus: "draft",
    productType,
    editorialCountry: normalizeCountry(raw.editorialCountry || raw.originCountry),
    editorialStatus: cleanText(raw.editorialStatus, 40) || "curated",
    collection: cleanText(raw.collection, 40) || "toys",
    price: cleanPrice(raw.price),
    compareAtPrice: cleanPrice(raw.compareAtPrice),
    zhName: cleanText(raw.zhName, 120),
    enName: cleanText(raw.enName, 120),
    zhDesc: cleanMultiline(raw.zhDesc, 500),
    enDesc: cleanMultiline(raw.enDesc, 500),
    material: cleanText(raw.material, 120),
    materialZh: cleanText(raw.materialZh, 120),
    storyZh: cleanMultiline(raw.storyZh, 2000),
    story: cleanMultiline(raw.story, 2000),
    craftZh: cleanText(raw.craftZh, 120),
    craft: cleanText(raw.craft, 120),
    designerNameZh: cleanText(raw.designerNameZh, 120),
    designerName: cleanText(raw.designerName, 120),
    studioZh: cleanText(raw.studioZh, 120),
    studio: cleanText(raw.studio, 120),
    originCountry: cleanText(raw.originCountry, 80) || "China",
    dimensionUnit: ["cm", "mm", "in"].includes(cleanText(raw.dimensionUnit, 10)) ? cleanText(raw.dimensionUnit, 10) : "cm",
    dimensionWeightUnit: ["g", "kg", "lb", "oz"].includes(cleanText(raw.dimensionWeightUnit, 10)) ? cleanText(raw.dimensionWeightUnit, 10) : "g",
    dimensionLength: cleanText(raw.dimensionLength, 40),
    dimensionWidth: cleanText(raw.dimensionWidth, 40),
    dimensionHeight: cleanText(raw.dimensionHeight, 40),
    dimensionDepth: cleanText(raw.dimensionDepth, 40),
    dimensionDiameter: cleanText(raw.dimensionDiameter, 40),
    dimensionWeight: cleanText(raw.dimensionWeight, 40),
    dimensions: cleanText(raw.dimensions, 220),
    imageSource: cleanText(raw.imageSource, 200) || "商品截图 AI 提取，待员工核实",
    safetyWarning: cleanMultiline(raw.safetyWarning, 500),
    seoTitle: cleanText(raw.seoTitle, 120),
    seoDescription: cleanText(raw.seoDescription, 320),
  };

  const attrs = parsed.productAttributes && typeof parsed.productAttributes === "object"
    ? parsed.productAttributes
    : {};
  const productAttributes = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "sizeOptions" && Array.isArray(value)) {
      productAttributes.sizeOptions = value
        .map((row) => {
          const out = {};
          for (const [k, v] of Object.entries(row || {})) {
            const normalizedKey = k === "size" || k === "length" ? (k === "size" ? "apparelSize" : "garmentLength") : k;
            const cleaned = cleanText(v, 80);
            if (cleaned) out[normalizedKey] = cleaned;
          }
          return out;
        })
        .filter((row) => Object.keys(row).length);
      continue;
    }
    const normalizedKey = key === "size" || key === "length" || key === "middleNotes"
      ? key === "size"
        ? "apparelSize"
        : key === "length"
          ? "garmentLength"
          : "heartNotes"
      : key;
    const cleaned = cleanText(value, 160);
    if (cleaned) productAttributes[normalizedKey] = cleaned;
  }

  return {
    fields,
    productAttributes,
    evidence: Array.isArray(parsed.evidence)
      ? parsed.evidence.map((row) => ({
          field: cleanText(row?.field, 80),
          value: cleanText(row?.value, 220),
          source: cleanText(row?.source, 120),
          confidence: Math.max(0, Math.min(1, Number(row?.confidence || 0))),
        })).filter((row) => row.field && row.value)
      : [],
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings.map((item) => cleanText(item, 240)).filter(Boolean) : [],
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields.map((item) => cleanText(item, 80)).filter(Boolean) : [],
    reviewNotes: Array.isArray(parsed.reviewNotes) ? parsed.reviewNotes.map((item) => cleanText(item, 240)).filter(Boolean) : [],
  };
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

export async function extractProductFromScreenshots({
  files = [],
  body = {},
  session,
  ip = "",
  signal,
}) {
  const cfg = getAiConfig();
  const modelTier = String(body.modelTier || "standard").trim();
  const customInstruction = String(body.customInstruction || "").slice(0, 2000);

  if (!hasPermission(session, "ai_content_optimize")) {
    const error = new Error("You do not have permission to use AI extraction.");
    error.status = 403;
    error.code = "ai_forbidden";
    throw error;
  }
  if (modelTier === "premium" && !hasPermission(session, "ai_content_use_premium_model")) {
    const error = new Error("Premium AI model is not allowed for this account.");
    error.status = 403;
    error.code = "ai_premium_forbidden";
    throw error;
  }
  if (!MODEL_TIERS.has(modelTier)) {
    const error = new Error(`Unsupported modelTier: ${modelTier}`);
    error.status = 400;
    error.code = "invalid_model_tier";
    throw error;
  }
  if (!Array.isArray(files) || files.length < 1) {
    const error = new Error("Please upload product screenshots.");
    error.status = 400;
    error.code = "missing_images";
    throw error;
  }
  if (files.length > 30) {
    const error = new Error("最多一次上传 30 张商品截图。");
    error.status = 400;
    error.code = "too_many_images";
    throw error;
  }

  const inputChars = files.length * 900 + countChars(customInstruction);
  if (inputChars > cfg.maxInputChars) {
    const error = new Error(`Input exceeds max ${cfg.maxInputChars} characters.`);
    error.status = 400;
    error.code = "ai_input_too_large";
    throw error;
  }

  assertRateLimit({
    userId: session.userId || session.email,
    ip,
    perMinute: Math.max(1, Math.min(cfg.rateLimitPerMinute, 8)),
    perDay: cfg.dailyLimitPerUser,
    perMonth: cfg.monthlyLimitPerUser,
  });
  assertAiReady(modelTier);

  const requestId = randomUUID();
  const started = Date.now();
  let status = "completed";
  let errorCode = "";
  let usage = { model: "", inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  let result;
  const sourceHash = hashValue(files.map((file) => `${file.originalname}:${file.size}:${file.mimetype}`).join("|"));

  const systemPrompt = [
    "You are Orbmare's product data extraction assistant for an operations team.",
    "Extract product information from merchant screenshots and return structured JSON only.",
    "Do not invent facts. If a field is not visible or uncertain, return an empty string and add a review note.",
    "Keep lifecycleStatus as draft. Never publish automatically.",
    "Prefer Orbmare editorial marketplace language: restrained, precise, premium, not marketplace hype.",
    "Return both Chinese and English when possible. Translate faithfully when only one language is visible.",
    "Classify productType as one of: object, apparel, jewelry, furniture, home, stationery, fragrance, tech, art, tool.",
    "Classify channel as editorial unless the screenshot is clearly legacy 3D-print shop content.",
  ].join("\n");

  const textPrompt = [
    "从这些商品截图中提取信息，并自动填入 Orbmare 后台商品表单可用字段。",
    "重点提取：商品名、价格、材料、国家/来源、尺寸、重量、尺码、品类、品牌/工作室、工艺、商品描述、SEO、注意事项。",
    "如果是服装，尽量把多个尺码放入 productAttributes.sizeOptions。",
    "如果价格、材料、尺寸来自截图，请放入 evidence，并给 confidence 0–1。",
    customInstruction ? `员工补充要求：${customInstruction}` : "",
  ].filter(Boolean).join("\n");

  const userContent = [
    { type: "input_text", text: textPrompt },
    ...files.map((file) => ({
      type: "input_image",
      image_url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
    })),
  ];

  try {
    const modelResult = await createStructuredResponse({
      tier: modelTier,
      systemPrompt,
      userContent,
      schema: PRODUCT_SCREENSHOT_EXTRACTION_SCHEMA,
      schemaName: "product_screenshot_extraction",
      signal,
    });
    usage = modelResult.usage;
    result = normalizeExtractedProduct(modelResult.parsed);
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
    await writeAiLog({
      requestId,
      userId: session.userId || null,
      actorEmail: session.email || "",
      entityType: "product",
      entityId: String(body.entityId || ""),
      fieldName: "product_screenshots",
      operationMode: "screenshot_extract",
      objective: "extract_product_data",
      model: usage.model,
      inputCharacterCount: inputChars,
      outputCharacterCount: countChars(result),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      status,
      warnings: result?.warnings || [],
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
