-- Orbmare Admin Platform — RBAC, content entities, media, workflow support
-- Additive / non-destructive. Safe to re-run via schema_migrations bookkeeping.

-- ---------------------------------------------------------------------------
-- Expand product lifecycle statuses (keep legacy values valid)
-- ---------------------------------------------------------------------------
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_lifecycle_status_check;
ALTER TABLE products ADD CONSTRAINT products_lifecycle_status_check
  CHECK (lifecycle_status IN (
    'candidate',
    'draft',
    'in_review',
    'changes_requested',
    'approved',
    'scheduled',
    'published',
    'hidden',
    'archived',
    'out_of_stock'
  ));

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_permissions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON admin_user_roles (role_id);

CREATE TABLE IF NOT EXISTS admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email
  ON admin_invitations (email_normalized);

CREATE TABLE IF NOT EXISTS admin_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  success BOOLEAN NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_login_events_created
  ON admin_login_events (created_at DESC);

-- ---------------------------------------------------------------------------
-- Editorial content entities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'hidden', 'archived')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_status ON brands (status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'hidden', 'archived')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materials_status ON materials (status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'hidden', 'archived')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_countries_status ON countries (status) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS designers (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'published', 'hidden', 'archived')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crafts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'in_review', 'published', 'hidden', 'archived')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'researching', 'approved', 'rejected', 'converted')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  converted_product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_candidates_status
  ON product_candidates (status) WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Media library
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT NOT NULL DEFAULT '',
  folder TEXT NOT NULL DEFAULT 'general',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT '',
  copyright_status TEXT NOT NULL DEFAULT 'unknown',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_folder
  ON media_assets (folder) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_media_assets_created
  ON media_assets (created_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS media_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (media_id, entity_type, entity_id, field)
);

CREATE INDEX IF NOT EXISTS idx_media_usages_entity
  ON media_usages (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Content revisions (version history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  change_summary TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT '',
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_content_revisions_entity_time
  ON content_revisions (entity_type, entity_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Seed roles
-- ---------------------------------------------------------------------------
INSERT INTO admin_roles (id, name, description) VALUES
  ('super_admin', 'Super Admin', 'Full platform authority'),
  ('administrator', 'Administrator', 'Manage most operations except core security'),
  ('buyer', 'Buyer', 'Sourcing, candidates, and draft products'),
  ('content_editor', 'Content Editor', 'Editorial copy and pages'),
  ('sales', 'Sales / Customer Service', 'Orders and customer support'),
  ('inventory_manager', 'Inventory Manager', 'Stock and SKU operations'),
  ('finance', 'Finance', 'Financial read access'),
  ('viewer', 'Viewer', 'Read-only access')
ON CONFLICT (id) DO NOTHING;

INSERT INTO admin_permissions (id, description) VALUES
  ('product.read', 'View products'),
  ('product.create', 'Create products'),
  ('product.update', 'Update products'),
  ('product.delete', 'Delete or archive products'),
  ('product.publish', 'Publish products'),
  ('order.read', 'View orders'),
  ('order.update', 'Update order fulfillment'),
  ('order.refund', 'Initiate refunds'),
  ('customer.read', 'View customers'),
  ('customer.export', 'Export customer data'),
  ('content.read', 'View site content'),
  ('content.update', 'Edit site content'),
  ('content.publish', 'Publish site content'),
  ('inventory.read', 'View inventory'),
  ('inventory.update', 'Update inventory'),
  ('finance.read', 'View cost and financial fields'),
  ('team.read', 'View team members'),
  ('team.manage', 'Manage team and roles'),
  ('settings.read', 'View settings'),
  ('settings.manage', 'Change settings'),
  ('media.read', 'View media library'),
  ('media.upload', 'Upload media'),
  ('media.delete', 'Delete media'),
  ('brand.read', 'View brands'),
  ('brand.write', 'Edit brands'),
  ('material.read', 'View materials'),
  ('material.write', 'Edit materials'),
  ('country.read', 'View countries'),
  ('country.write', 'Edit countries'),
  ('audit.read', 'View activity logs')
ON CONFLICT (id) DO NOTHING;

-- Super Admin: all permissions
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 'super_admin', id FROM admin_permissions
ON CONFLICT DO NOTHING;

-- Administrator: all except settings.manage (keeps security knobs for super)
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT 'administrator', id FROM admin_permissions
WHERE id NOT IN ('settings.manage')
ON CONFLICT DO NOTHING;

-- Buyer
INSERT INTO admin_role_permissions (role_id, permission_id) VALUES
  ('buyer', 'product.read'),
  ('buyer', 'product.create'),
  ('buyer', 'product.update'),
  ('buyer', 'brand.read'),
  ('buyer', 'brand.write'),
  ('buyer', 'material.read'),
  ('buyer', 'country.read'),
  ('buyer', 'media.read'),
  ('buyer', 'media.upload'),
  ('buyer', 'inventory.read'),
  ('buyer', 'content.read'),
  ('buyer', 'audit.read')
ON CONFLICT DO NOTHING;

-- Content Editor
INSERT INTO admin_role_permissions (role_id, permission_id) VALUES
  ('content_editor', 'product.read'),
  ('content_editor', 'product.update'),
  ('content_editor', 'brand.read'),
  ('content_editor', 'brand.write'),
  ('content_editor', 'material.read'),
  ('content_editor', 'material.write'),
  ('content_editor', 'country.read'),
  ('content_editor', 'country.write'),
  ('content_editor', 'content.read'),
  ('content_editor', 'content.update'),
  ('content_editor', 'media.read'),
  ('content_editor', 'media.upload'),
  ('content_editor', 'audit.read')
ON CONFLICT DO NOTHING;

-- Sales
INSERT INTO admin_role_permissions (role_id, permission_id) VALUES
  ('sales', 'order.read'),
  ('sales', 'order.update'),
  ('sales', 'order.refund'),
  ('sales', 'customer.read'),
  ('sales', 'product.read'),
  ('sales', 'audit.read')
ON CONFLICT DO NOTHING;

-- Inventory
INSERT INTO admin_role_permissions (role_id, permission_id) VALUES
  ('inventory_manager', 'inventory.read'),
  ('inventory_manager', 'inventory.update'),
  ('inventory_manager', 'product.read'),
  ('inventory_manager', 'product.update'),
  ('inventory_manager', 'audit.read')
ON CONFLICT DO NOTHING;

-- Finance
INSERT INTO admin_role_permissions (role_id, permission_id) VALUES
  ('finance', 'finance.read'),
  ('finance', 'order.read'),
  ('finance', 'customer.read'),
  ('finance', 'customer.export'),
  ('finance', 'product.read'),
  ('finance', 'audit.read')
ON CONFLICT DO NOTHING;

-- Viewer
INSERT INTO admin_role_permissions (role_id, permission_id) VALUES
  ('viewer', 'product.read'),
  ('viewer', 'order.read'),
  ('viewer', 'brand.read'),
  ('viewer', 'material.read'),
  ('viewer', 'country.read'),
  ('viewer', 'content.read'),
  ('viewer', 'inventory.read'),
  ('viewer', 'media.read'),
  ('viewer', 'audit.read')
ON CONFLICT DO NOTHING;
