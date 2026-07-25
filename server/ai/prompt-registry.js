import { ORBMARE_WRITING_GUIDE } from "./writing-guide.js";

const CONTENT_RULES = {
  brand_profile: `
Task: Optimize a brand / studio / designer introduction.
- Establish a clear positioning
- Lead with value, then visual/language cues
- Not an encyclopedic chronology
- Do not invent official brand stories
- Do not disguise Orbmare inference as official brand claims
- Chinese target ~120–300 characters; English ~90–220 words
- Meaning aligned across languages when both are produced; natural rewrite allowed
`.trim(),

  design_philosophy: `
Task: Optimize a design-philosophy item (title + body).
- Chinese title ~2–8 characters; English title ~1–5 words
- Chinese body ~25–80 characters; English body ~15–55 words
- One core idea per item
- Avoid empty slogans
- Do not repeat the same abstraction
`.trim(),

  editor_note: `
Task: Explain why Orbmare curated / selected this entity (“为什么是傲马的选择”).
- Emphasize Orbmare judgment criteria
- Not popularity or sales-driven
- Do not disparage other brands
- Do not invent unverified rankings
- Chinese ~80–180 characters; English ~60–140 words
- Restrained, credible editorial stance
`.trim(),

  brand_blurb: `
Task: Optimize a short brand blurb for listing cards.
- One or two sentences
- Specific, not generic luxury filler
- Chinese ~40–120 characters; English ~25–80 words
`.trim(),

  brand_story: `
Task: Optimize a longer brand story.
- Narrative with materials / making / restraint
- No fake history
- Chinese ~150–600 characters; English ~120–400 words
`.trim(),

  product_title: `
Task: Optimize product title.
- Keep brand, collection, material, category, core traits when present
- No keyword stuffing
- Natural ZH and EN separately
- Do not invent materials or features
`.trim(),

  product_description: `
Task: Optimize product description.
- Prefer order: silhouette → material → craft → wear experience → pairing context
- Not a bare parameter dump
- No unprovable quality promises
- Avoid absolute medical / eco / performance claims
`.trim(),

  material_story: `
Task: Optimize material library copy (intro / lyric / blurb).
- Material knowledge first
- Evidence-aware; do not invent origin or performance
`.trim(),

  country_pavilion: `
Task: Optimize country pavilion editorial copy.
- Place, culture, making language
- No nationalist slogans or invented history
`.trim(),

  magazine_article: `
Task: Optimize journal / magazine listing copy.
- Editorial headline + restrained lead
`.trim(),

  blog_article: `
Task: Optimize blog-style editorial copy with magazine restraint.
`.trim(),

  seo_title: `
Task: Optimize SEO title.
- Clear, human, not spammy
- Prefer under ~60 characters / ~60 Latin glyphs
`.trim(),

  seo_description: `
Task: Optimize SEO description.
- Informative, not clickbait
- Prefer under ~160 characters
`.trim(),

  translation_zh_to_en: `
Task: Translate / rewrite Chinese into natural international English.
- Not word-for-word
- Preserve facts and proper nouns
- Convert local internet slang into internationally readable phrasing
- Do not add facts absent from source
`.trim(),

  translation_en_to_zh: `
Task: Translate / rewrite English into natural Chinese editorial copy.
- Not word-for-word
- Preserve facts and proper nouns
- Do not add facts absent from source
`.trim(),

  full_entity_consistency: `
Task: Optimize multiple fields for one entity for consistency of facts and tone.
- Extract shared facts first
- Rewrite each language naturally
- No fact conflicts across fields/languages
- Provide consistencyNotes
`.trim(),

  identity_text: `
Task: Lightly normalize short identity labels (style, category labels).
- Do not invent founding data
- Keep short
`.trim(),

  name_normalize: `
Task: Only normalize punctuation/spacing or translate display name when asked.
- NEVER invent a new brand/designer legal name
- Prefer keeping the official name unchanged if already correct
`.trim(),
};

const OBJECTIVE_HINTS = {
  luxury_editorial: "Luxury editorial polish.",
  buyer_store: "International buyer-store voice.",
  fashion_magazine: "Fashion magazine cadence.",
  concise_professional: "Concise professional clarity.",
  conversion: "Improve clarity that supports quiet conversion — never hype.",
  seo: "SEO-aware clarity without keyword spam.",
  translate_en: "Produce natural English.",
  translate_zh: "Produce natural Chinese.",
  shorten: "Shorten while keeping meaning.",
  expand: "Expand with substance, not filler.",
  custom: "Follow the custom instruction carefully.",
};

export function resolveContentType(contentType) {
  return CONTENT_RULES[contentType] ? contentType : "brand_profile";
}

export function buildSystemPrompt({ contentType, objective, tone, length }) {
  const typeKey = resolveContentType(contentType);
  return [
    ORBMARE_WRITING_GUIDE,
    "",
    "Content-type rules:",
    CONTENT_RULES[typeKey],
    "",
    `Objective: ${OBJECTIVE_HINTS[objective] || OBJECTIVE_HINTS.luxury_editorial}`,
    `Tone: ${tone || "restrained"}`,
    `Length preference: ${length || "similar"}`,
    "",
    "Output must match the provided JSON schema exactly.",
    "If a claim in the source is risky/unverified, keep it only if necessary and add a warning object.",
  ].join("\n");
}

export function buildUserPrompt(payload) {
  const {
    mode,
    field,
    fields,
    currentValue,
    sourceLanguage,
    targetLanguage,
    context,
    customInstruction,
    entityType,
    entityId,
  } = payload;

  return JSON.stringify(
    {
      task:
        mode === "full_form"
          ? "Optimize multiple fields for consistency."
          : mode === "translate_pair"
            ? "Generate / optimize the target language counterpart."
            : "Optimize a single field.",
      entityType,
      entityId,
      field: field || null,
      sourceLanguage,
      targetLanguage,
      currentValue: currentValue ?? "",
      fields: fields || null,
      context: context || {},
      customInstruction: customInstruction || "",
      rules: [
        "Do not invent facts.",
        "Preserve proper nouns.",
        "Return optimized text ready for a luxury editorial CMS.",
      ],
    },
    null,
    2
  );
}

export { CONTENT_RULES };
