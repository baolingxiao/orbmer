-- Orbmare first-version memberships and human concierge requests.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_membership_status_check;
ALTER TABLE users ALTER COLUMN membership_status SET DEFAULT 'explorer';
UPDATE users SET membership_status = 'explorer' WHERE membership_status = 'standard';
UPDATE users SET membership_status = 'journal' WHERE membership_status = 'member';
ALTER TABLE users ADD CONSTRAINT users_membership_status_check
  CHECK (membership_status IN ('explorer', 'journal', 'collector', 'black'));

CREATE TABLE IF NOT EXISTS membership_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('explorer', 'journal', 'collector', 'black')),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly', 'none')),
  status TEXT NOT NULL DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_user
  ON membership_subscriptions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_subscriptions_stripe_customer
  ON membership_subscriptions (stripe_customer_id);

CREATE TABLE IF NOT EXISTS membership_entitlements (
  key TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('explorer', 'journal', 'collector', 'black')),
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_zh TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  availability TEXT NOT NULL CHECK (availability IN ('active', 'preparation', 'unavailable')),
  display_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS concierge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  description TEXT NOT NULL,
  budget TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  desired_date DATE,
  product_url TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_method TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'awaiting_customer', 'sourcing', 'completed', 'declined')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_requests_user
  ON concierge_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concierge_requests_status
  ON concierge_requests (status, created_at DESC);

CREATE TABLE IF NOT EXISTS membership_feature_notifications (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_key)
);

INSERT INTO admin_permissions (id, description) VALUES
  ('membership.read', 'View customer memberships'),
  ('membership.manage', 'Manage customer membership tiers'),
  ('concierge.read', 'View concierge requests'),
  ('concierge.manage', 'Update concierge requests')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role_id, permission_id
FROM (VALUES
  ('super_admin', 'membership.read'), ('super_admin', 'membership.manage'),
  ('super_admin', 'concierge.read'), ('super_admin', 'concierge.manage'),
  ('administrator', 'membership.read'), ('administrator', 'membership.manage'),
  ('administrator', 'concierge.read'), ('administrator', 'concierge.manage'),
  ('sales', 'membership.read'), ('sales', 'concierge.read')
) AS grants(role_id, permission_id)
ON CONFLICT DO NOTHING;
