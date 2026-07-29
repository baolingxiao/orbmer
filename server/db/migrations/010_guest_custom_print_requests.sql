ALTER TABLE concierge_requests ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE concierge_requests ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_concierge_requests_contact_email
  ON concierge_requests (contact_email, created_at DESC);
