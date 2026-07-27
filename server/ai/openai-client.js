import OpenAI from "openai";
import { assertAiReady } from "./config.js";

let client;

function getClient(apiKey) {
  if (!client || client._orbmareKey !== apiKey) {
    client = new OpenAI({ apiKey });
    client._orbmareKey = apiKey;
  }
  return client;
}

/**
 * Call OpenAI Responses API with strict JSON schema.
 */
export async function createStructuredResponse({
  tier = "standard",
  systemPrompt,
  userPrompt,
  userContent,
  schema,
  schemaName = "ai_optimize_result",
  signal,
}) {
  const cfg = assertAiReady(tier);
  const openai = getClient(cfg.apiKey);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.requestTimeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const response = await openai.responses.create(
      {
        model: cfg.model,
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent || userPrompt },
        ],
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema,
          },
        },
      },
      { signal: controller.signal }
    );

    const text =
      response.output_text ||
      extractOutputText(response) ||
      "";
    if (!text) {
      const error = new Error("Empty model response.");
      error.status = 502;
      error.code = "ai_empty_response";
      throw error;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const error = new Error("Model returned invalid JSON.");
      error.status = 502;
      error.code = "ai_invalid_json";
      throw error;
    }

    const usage = response.usage || {};
    const inputTokens = Number(usage.input_tokens || usage.prompt_tokens || 0) || 0;
    const outputTokens = Number(usage.output_tokens || usage.completion_tokens || 0) || 0;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * cfg.costPer1MInput +
      (outputTokens / 1_000_000) * cfg.costPer1MOutput;

    return {
      parsed,
      model: cfg.model,
      usage: {
        model: cfg.model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
      },
    };
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) {
      const timeout = new Error("AI request timed out.");
      timeout.status = 504;
      timeout.code = "ai_timeout";
      throw timeout;
    }
    const status = Number(error?.status || error?.statusCode || 0);
    if (status === 429) {
      const limited = new Error("OpenAI rate limit. Please retry shortly.");
      limited.status = 429;
      limited.code = "openai_rate_limit";
      throw limited;
    }
    if (status >= 500) {
      const upstream = new Error("OpenAI service error.");
      upstream.status = 502;
      upstream.code = "openai_upstream";
      throw upstream;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onAbort);
  }
}

function extractOutputText(response) {
  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
      if (content.text && typeof content.text === "string") parts.push(content.text);
    }
  }
  return parts.join("");
}
