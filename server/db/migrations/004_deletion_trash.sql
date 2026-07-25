-- Soft-delete trash: keep deleted catalog records for 7 days

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON products (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS deletion_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_by TEXT NOT NULL DEFAULT '',
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_after TIMESTAMPTZ NOT NULL,
  restored_at TIMESTAMPTZ,
  purged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deletion_records_active
  ON deletion_records (purge_after ASC)
  WHERE restored_at IS NULL AND purged_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deletion_records_type
  ON deletion_records (entity_type, deleted_at DESC);
