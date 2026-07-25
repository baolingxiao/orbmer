/**
 * AI content optimization — unit-level validation tests (no live OpenAI calls).
 */
import assert from "node:assert/strict";
import { hasPermission } from "../server/rbac.js";
import {
  assertFieldAllowed,
  ENTITY_TYPES,
  getEntityFields,
} from "../server/ai/field-registry.js";
import { OBJECTIVES, TONES, MODEL_TIERS, MODES } from "../server/ai/schema.js";
import { getAiConfig, assertAiReady } from "../server/ai/config.js";
import { assertRateLimit } from "../server/ai/rate-limit.js";
import { buildSystemPrompt, buildUserPrompt } from "../server/ai/prompt-registry.js";
import { wordDiff } from "../web/admin/ai/diff.js";

// Permissions
assert.equal(hasPermission({ permissions: [] }, "ai_content_optimize"), false);
assert.equal(
  hasPermission({ permissions: ["ai_content_optimize"] }, "ai_content_optimize"),
  true
);
assert.equal(
  hasPermission({ permissions: ["ai_content_optimize"] }, "ai_content_use_premium_model"),
  false
);

// Entity / field whitelist
assert.ok(ENTITY_TYPES.has("brand"));
assert.ok(ENTITY_TYPES.has("product"));
assert.ok(getEntityFields("brand").some((row) => row.field === "editorsNoteZh"));
assert.throws(() => assertFieldAllowed("brand", "id"), /not AI-enabled|Field is not/);
assert.throws(() => assertFieldAllowed("nope", "blurb"), /Unsupported entityType/);
assert.doesNotThrow(() => assertFieldAllowed("brand", "blurbZh"));

// Enums
assert.ok(OBJECTIVES.has("luxury_editorial"));
assert.ok(TONES.has("restrained"));
assert.ok(MODEL_TIERS.has("standard"));
assert.ok(MODES.has("full_form"));

// Config without key
const prevKey = process.env.OPENAI_API_KEY;
const prevModel = process.env.OPENAI_DEFAULT_MODEL;
const prevEnabled = process.env.OPENAI_AI_FEATURE_ENABLED;
process.env.OPENAI_AI_FEATURE_ENABLED = "true";
process.env.OPENAI_API_KEY = "";
process.env.OPENAI_DEFAULT_MODEL = "";
assert.throws(() => assertAiReady("standard"), /OPENAI_API_KEY|not configured|disabled|MODEL/);
process.env.OPENAI_API_KEY = "sk-test";
process.env.OPENAI_DEFAULT_MODEL = "";
assert.throws(() => assertAiReady("standard"), /OPENAI_DEFAULT_MODEL|not configured/);
process.env.OPENAI_DEFAULT_MODEL = "gpt-test";
const ready = assertAiReady("standard");
assert.equal(ready.model, "gpt-test");
const cfg = getAiConfig();
assert.ok(cfg.maxInputChars > 0);

// restore env
if (prevKey == null) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = prevKey;
if (prevModel == null) delete process.env.OPENAI_DEFAULT_MODEL;
else process.env.OPENAI_DEFAULT_MODEL = prevModel;
if (prevEnabled == null) delete process.env.OPENAI_AI_FEATURE_ENABLED;
else process.env.OPENAI_AI_FEATURE_ENABLED = prevEnabled;

// Rate limit
const userId = `test-user-${Date.now()}`;
for (let i = 0; i < 3; i += 1) {
  assertRateLimit({ userId, ip: "127.0.0.1", perMinute: 5, perDay: 10 });
}
assert.throws(
  () => {
    for (let i = 0; i < 10; i += 1) {
      assertRateLimit({ userId: `${userId}-burst`, ip: "1.2.3.4", perMinute: 2, perDay: 100 });
    }
  },
  /rate limit/i
);

// Prompts
const system = buildSystemPrompt({
  contentType: "editor_note",
  objective: "luxury_editorial",
  tone: "restrained",
  length: "similar",
});
assert.match(system, /Orbmare|傲马|editorial/i);
const user = buildUserPrompt({
  mode: "single_field",
  field: "editorsNoteZh",
  currentValue: "测试",
  sourceLanguage: "zh",
  targetLanguage: "zh",
  context: { nameZh: "Demo" },
  customInstruction: "不要虚构事实",
  entityType: "brand",
  entityId: "brand-demo",
});
assert.match(user, /editorsNoteZh/);
assert.match(user, /不要虚构事实/);

// Diff
const parts = wordDiff("quiet luxury brand", "quiet editorial brand");
assert.ok(parts.some((part) => part.type === "del"));
assert.ok(parts.some((part) => part.type === "add"));

console.log("test-ai-optimize: ok");
