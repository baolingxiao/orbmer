import { query, withTransaction } from "./index.js";

export const JOURNAL_READING_LIMIT = 5;

function mapReadWindow(row) {
  return {
    used: Number(row?.used || 0),
    limit: JOURNAL_READING_LIMIT,
    resetAt: row?.reset_at?.toISOString?.() || row?.reset_at || null,
  };
}

export async function readJournalWindow(userId) {
  const { rows } = await query(
    `WITH recent AS (
       SELECT DISTINCT ON (article_id) article_id, created_at
       FROM journal_read_events
       WHERE user_id = $1
         AND created_at >= now() - interval '7 days'
       ORDER BY article_id, created_at ASC
     )
     SELECT COUNT(*)::int AS used,
            CASE WHEN COUNT(*) > 0
              THEN MIN(created_at) + interval '7 days'
              ELSE NULL
            END AS reset_at
     FROM recent`,
    [userId]
  );
  return mapReadWindow(rows[0]);
}

export async function recordJournalRead(userId, articleId) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT 1
       FROM journal_read_events
       WHERE user_id = $1
         AND article_id = $2
         AND created_at >= now() - interval '7 days'
       LIMIT 1`,
      [userId, articleId]
    );

    const windowResult = await client.query(
      `WITH recent AS (
         SELECT DISTINCT ON (article_id) article_id, created_at
         FROM journal_read_events
         WHERE user_id = $1
           AND created_at >= now() - interval '7 days'
         ORDER BY article_id, created_at ASC
       )
       SELECT COUNT(*)::int AS used,
              CASE WHEN COUNT(*) > 0
                THEN MIN(created_at) + interval '7 days'
                ELSE NULL
              END AS reset_at
       FROM recent`,
      [userId]
    );
    const window = mapReadWindow(windowResult.rows[0]);
    const alreadyReadInWindow = existing.rowCount > 0;

    if (!alreadyReadInWindow && window.used >= JOURNAL_READING_LIMIT) {
      return { allowed: false, alreadyReadInWindow, ...window };
    }

    if (!alreadyReadInWindow) {
      await client.query(
        `INSERT INTO journal_read_events (user_id, article_id)
         VALUES ($1, $2)`,
        [userId, articleId]
      );
      return {
        allowed: true,
        alreadyReadInWindow: false,
        used: window.used + 1,
        limit: JOURNAL_READING_LIMIT,
        resetAt: window.resetAt,
      };
    }

    return { allowed: true, alreadyReadInWindow: true, ...window };
  });
}
