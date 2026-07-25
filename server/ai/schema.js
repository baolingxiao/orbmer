/** JSON schemas for OpenAI structured outputs (strict). */

export const SINGLE_FIELD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    field: { type: "string" },
    original: { type: "string" },
    optimized: { type: "string" },
    changeSummary: {
      type: "array",
      items: { type: "string" },
    },
    warnings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string" },
          text: { type: "string" },
          message: { type: "string" },
        },
        required: ["type", "text", "message"],
      },
    },
    language: { type: "string" },
  },
  required: ["field", "original", "optimized", "changeSummary", "warnings", "language"],
};

export const BATCH_FIELDS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          original: { type: "string" },
          optimized: { type: "string" },
          changeSummary: {
            type: "array",
            items: { type: "string" },
          },
          warnings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: { type: "string" },
                text: { type: "string" },
                message: { type: "string" },
              },
              required: ["type", "text", "message"],
            },
          },
        },
        required: ["field", "original", "optimized", "changeSummary", "warnings"],
      },
    },
    globalWarnings: {
      type: "array",
      items: { type: "string" },
    },
    consistencyNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["fields", "globalWarnings", "consistencyNotes"],
};

export const OBJECTIVES = new Set([
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
]);

export const TONES = new Set([
  "restrained",
  "editorial",
  "authoritative",
  "warm",
  "rational",
  "poetic",
  "commercial",
  "minimal",
]);

export const LENGTHS = new Set(["shorter", "similar", "longer"]);

export const MODEL_TIERS = new Set(["standard", "premium"]);

export const MODES = new Set(["single_field", "full_form", "translate_pair"]);

export const LANGUAGES = new Set(["zh", "en", "auto"]);
