ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery_start DATE,
  ADD COLUMN IF NOT EXISTS estimated_delivery_end DATE,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

UPDATE orders
SET fulfillment_status = COALESCE(fulfillment_status, status, 'ORDER_CONFIRMED')
WHERE fulfillment_status IS NULL;

CREATE TABLE IF NOT EXISTS order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipment_id UUID,
  status TEXT NOT NULL,
  public_title TEXT NOT NULL,
  public_description TEXT NOT NULL,
  internal_note TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  operator_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_created
  ON order_events (order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shipment_id TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_country TEXT NOT NULL DEFAULT '',
  carrier TEXT NOT NULL DEFAULT '',
  tracking_number TEXT NOT NULL DEFAULT '',
  tracking_url TEXT NOT NULL DEFAULT '',
  current_status TEXT NOT NULL DEFAULT 'ORDER_CONFIRMED',
  estimated_delivery DATE,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_shipments_order
  ON order_shipments (order_id);

CREATE TABLE IF NOT EXISTS order_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  template_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_id TEXT NOT NULL DEFAULT '',
  UNIQUE (order_id, status, template_id)
);
