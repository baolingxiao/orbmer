import { isDatabaseEnabled, getPool } from "../db/index.js";
import { appendAuditEvent } from "../audit-store.js";

function asUuidOrNull(value) {
  const text = String(value || "").trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    text
  )
    ? text
    : null;
}

export async function writeAiLog(entry) {
  const record = {
    requestId: entry.requestId,
    userId: asUuidOrNull(entry.userId),
    entityType: entry.entityType || "",
    entityId: entry.entityId || "",
    fieldName: entry.fieldName || "",
    operationMode: entry.operationMode || "single_field",
    objective: entry.objective || "",
    model: entry.model || "",
    inputCharacterCount: entry.inputCharacterCount || 0,
    outputCharacterCount: entry.outputCharacterCount || 0,
    inputTokens: entry.inputTokens || 0,
    outputTokens: entry.outputTokens || 0,
    estimatedCostUsd: entry.estimatedCostUsd || 0,
    status: entry.status || "completed",
    warningsJson: entry.warnings || [],
    errorCode: entry.errorCode || "",
    sourceValueHash: entry.sourceValueHash || "",
    ip: entry.ip || "",
    completedAt: entry.completedAt || new Date().toISOString(),
  };

  if (isDatabaseEnabled()) {
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO ai_optimization_logs (
           request_id, user_id, entity_type, entity_id, field_name, operation_mode,
           objective, model, input_character_count, output_character_count,
           input_tokens, output_tokens, estimated_cost_usd, status, warnings_json,
           error_code, source_value_hash, ip, completed_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16,$17,$18,$19::timestamptz
         )
         ON CONFLICT (request_id) DO NOTHING`,
        [
          record.requestId,
          record.userId,
          record.entityType,
          record.entityId,
          record.fieldName,
          record.operationMode,
          record.objective,
          record.model,
          record.inputCharacterCount,
          record.outputCharacterCount,
          record.inputTokens,
          record.outputTokens,
          record.estimatedCostUsd,
          record.status,
          JSON.stringify(record.warningsJson || []),
          record.errorCode,
          record.sourceValueHash,
          record.ip,
          record.completedAt,
        ]
      );
    } catch {
      // Table may not exist yet — fall through to audit
    }
  }

  await appendAuditEvent({
    actor: entry.actorEmail || record.userId || "unknown",
    action: "ai.optimize",
    entityType: record.entityType,
    entityId: record.entityId,
    ip: record.ip,
    details: {
      requestId: record.requestId,
      fieldName: record.fieldName,
      mode: record.operationMode,
      objective: record.objective,
      model: record.model,
      status: record.status,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      estimatedCostUsd: record.estimatedCostUsd,
      errorCode: record.errorCode,
    },
  }).catch(() => {});
}
