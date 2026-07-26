-- Journal membership access metering. Events are append-only for auditability.
CREATE TABLE IF NOT EXISTS journal_read_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_read_events_user_recent
  ON journal_read_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_read_events_user_article_recent
  ON journal_read_events (user_id, article_id, created_at DESC);
