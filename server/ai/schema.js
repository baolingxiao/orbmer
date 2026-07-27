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

export const PRODUCT_SCREENSHOT_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fields: {
      type: "object",
      additionalProperties: false,
      properties: {
        id: { type: "string" },
        channel: { type: "string" },
        lifecycleStatus: { type: "string" },
        productType: { type: "string" },
        editorialCountry: { type: "string" },
        editorialStatus: { type: "string" },
        collection: { type: "string" },
        price: { type: "string" },
        compareAtPrice: { type: "string" },
        zhName: { type: "string" },
        enName: { type: "string" },
        zhDesc: { type: "string" },
        enDesc: { type: "string" },
        material: { type: "string" },
        materialZh: { type: "string" },
        storyZh: { type: "string" },
        story: { type: "string" },
        craftZh: { type: "string" },
        craft: { type: "string" },
        designerNameZh: { type: "string" },
        designerName: { type: "string" },
        studioZh: { type: "string" },
        studio: { type: "string" },
        originCountry: { type: "string" },
        dimensionUnit: { type: "string" },
        dimensionWeightUnit: { type: "string" },
        dimensionLength: { type: "string" },
        dimensionWidth: { type: "string" },
        dimensionHeight: { type: "string" },
        dimensionDepth: { type: "string" },
        dimensionDiameter: { type: "string" },
        dimensionWeight: { type: "string" },
        dimensions: { type: "string" },
        imageSource: { type: "string" },
        safetyWarning: { type: "string" },
        seoTitle: { type: "string" },
        seoDescription: { type: "string" },
      },
      required: [
        "id",
        "channel",
        "lifecycleStatus",
        "productType",
        "editorialCountry",
        "editorialStatus",
        "collection",
        "price",
        "compareAtPrice",
        "zhName",
        "enName",
        "zhDesc",
        "enDesc",
        "material",
        "materialZh",
        "storyZh",
        "story",
        "craftZh",
        "craft",
        "designerNameZh",
        "designerName",
        "studioZh",
        "studio",
        "originCountry",
        "dimensionUnit",
        "dimensionWeightUnit",
        "dimensionLength",
        "dimensionWidth",
        "dimensionHeight",
        "dimensionDepth",
        "dimensionDiameter",
        "dimensionWeight",
        "dimensions",
        "imageSource",
        "safetyWarning",
        "seoTitle",
        "seoDescription"
      ],
    },
    productAttributes: {
      type: "object",
      additionalProperties: false,
      properties: {
        apparelSize: { type: "string" },
        fit: { type: "string" },
        recommendedHeight: { type: "string" },
        recommendedWeight: { type: "string" },
        shoulder: { type: "string" },
        chest: { type: "string" },
        garmentLength: { type: "string" },
        sleeve: { type: "string" },
        waist: { type: "string" },
        care: { type: "string" },
        sizeOptions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              apparelSize: { type: "string" },
              fit: { type: "string" },
              recommendedHeight: { type: "string" },
              recommendedWeight: { type: "string" },
              shoulder: { type: "string" },
              chest: { type: "string" },
              garmentLength: { type: "string" },
              sleeve: { type: "string" },
              waist: { type: "string" },
              care: { type: "string" }
            },
            required: [
              "apparelSize",
              "fit",
              "recommendedHeight",
              "recommendedWeight",
              "shoulder",
              "chest",
              "garmentLength",
              "sleeve",
              "waist",
              "care"
            ]
          }
        },
        jewelrySize: { type: "string" },
        chainLength: { type: "string" },
        ringSize: { type: "string" },
        gemstone: { type: "string" },
        plating: { type: "string" },
        closure: { type: "string" },
        assembly: { type: "string" },
        seatHeight: { type: "string" },
        loadCapacity: { type: "string" },
        finish: { type: "string" },
        room: { type: "string" },
        capacity: { type: "string" },
        paperSize: { type: "string" },
        pageCount: { type: "string" },
        nib: { type: "string" },
        ink: { type: "string" },
        volume: { type: "string" },
        concentration: { type: "string" },
        topNotes: { type: "string" },
        heartNotes: { type: "string" },
        baseNotes: { type: "string" },
        compatibility: { type: "string" },
        power: { type: "string" },
        connectivity: { type: "string" },
        warranty: { type: "string" },
        edition: { type: "string" },
        signature: { type: "string" },
        framing: { type: "string" },
        certificate: { type: "string" },
        useCase: { type: "string" },
        hardness: { type: "string" },
        handleMaterial: { type: "string" },
        maintenance: { type: "string" }
      },
      required: [
        "apparelSize",
        "fit",
        "recommendedHeight",
        "recommendedWeight",
        "shoulder",
        "chest",
        "garmentLength",
        "sleeve",
        "waist",
        "care",
        "sizeOptions",
        "jewelrySize",
        "chainLength",
        "ringSize",
        "gemstone",
        "plating",
        "closure",
        "assembly",
        "seatHeight",
        "loadCapacity",
        "finish",
        "room",
        "capacity",
        "paperSize",
        "pageCount",
        "nib",
        "ink",
        "volume",
        "concentration",
        "topNotes",
        "heartNotes",
        "baseNotes",
        "compatibility",
        "power",
        "connectivity",
        "warranty",
        "edition",
        "signature",
        "framing",
        "certificate",
        "useCase",
        "hardness",
        "handleMaterial",
        "maintenance"
      ]
    },
    evidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          value: { type: "string" },
          source: { type: "string" },
          confidence: { type: "number" }
        },
        required: ["field", "value", "source", "confidence"]
      }
    },
    warnings: {
      type: "array",
      items: { type: "string" }
    },
    missingFields: {
      type: "array",
      items: { type: "string" }
    },
    reviewNotes: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["fields", "productAttributes", "evidence", "warnings", "missingFields", "reviewNotes"],
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
