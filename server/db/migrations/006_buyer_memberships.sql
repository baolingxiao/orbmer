-- Buyer accounts: membership is separate from staff/admin RBAC.
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email'
  CHECK (auth_provider IN ('email', 'google'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_status TEXT NOT NULL DEFAULT 'standard'
  CHECK (membership_status IN ('standard', 'member'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_granted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS membership_granted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_provider TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_users_buyer_membership
  ON users (membership_status, created_at DESC) WHERE role = 'buyer';

INSERT INTO admin_permissions (id, description) VALUES
  ('customer.read', 'View customer accounts'),
  ('customer.manage', 'Grant or revoke customer membership')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM (VALUES
  ('super_admin', 'customer.read'), ('super_admin', 'customer.manage'),
  ('administrator', 'customer.read'), ('administrator', 'customer.manage'),
  ('sales', 'customer.read')
) AS grants(role_id, permission_id)
ON CONFLICT DO NOTHING;
