-- AI content optimization — permissions + audit log (no full prompt/output by default)

INSERT INTO admin_permissions (id, description) VALUES
  ('ai_content_optimize', 'Use AI to optimize editorial content fields'),
  ('ai_content_use_premium_model', 'Use premium AI model tier for content optimization')
ON CONFLICT (id) DO NOTHING;

-- Only grant to roles that actually exist (production may not have every seed role).
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.id IN ('super_admin', 'administrator')
  AND p.id IN ('ai_content_optimize', 'ai_content_use_premium_model')
ON CONFLICT DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM admin_roles r
CROSS JOIN admin_permissions p
WHERE r.id IN ('content_editor', 'editor')
  AND p.id = 'ai_content_optimize'
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_optimization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  field_name TEXT NOT NULL DEFAULT '',
  operation_mode TEXT NOT NULL DEFAULT 'single_field',
  objective TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  input_character_count INTEGER NOT NULL DEFAULT 0,
  output_character_count INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_code TEXT NOT NULL DEFAULT '',
  source_value_hash TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_opt_logs_user_created
  ON ai_optimization_logs (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_optimization_daily (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  call_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
