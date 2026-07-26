import { MEMBERSHIP_ENTITLEMENTS, tierRank } from "../../web/shared/js/membership-data.js";
import { query, withTransaction } from "./index.js";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);
const VALID_TIERS = new Set(["explorer", "journal", "collector", "black"]);
const VALID_INTERVALS = new Set(["monthly", "yearly", "none"]);
const VALID_REQUEST_STATUSES = new Set([
  "submitted",
  "reviewing",
  "awaiting_customer",
  "sourcing",
  "completed",
  "declined",
]);

function clean(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeTier(tier = "explorer") {
  const value = clean(tier, 24);
  return VALID_TIERS.has(value) ? value : "explorer";
}

function normalizeInterval(value = "monthly") {
  const interval = clean(value, 12);
  return VALID_INTERVALS.has(interval) ? interval : "monthly";
}

function subscriptionTier(row) {
  if (!row) return "explorer";
  if (row.tier === "black") return "black";
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(row.status)) return row.tier;
  return "explorer";
}

export async function seedMembershipEntitlements() {
  for (const item of MEMBERSHIP_ENTITLEMENTS) {
    await query(
      `INSERT INTO membership_entitlements
        (key, tier, title_zh, title_en, availability, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET
         tier = EXCLUDED.tier,
         title_zh = EXCLUDED.title_zh,
         title_en = EXCLUDED.title_en,
         availability = EXCLUDED.availability,
         display_order = EXCLUDED.display_order,
         updated_at = now()`,
      [item.key, item.tier, item.titleZh, item.titleEn, item.availability, item.displayOrder]
    );
  }
}

export async function getEntitlements() {
  const { rows } = await query(
    `SELECT key, tier, title_zh, title_en, description_zh, description_en, availability, display_order
     FROM membership_entitlements
     ORDER BY display_order ASC`
  );
  if (!rows.length) {
    await seedMembershipEntitlements();
    return getEntitlements();
  }
  return rows.map((row) => ({
    key: row.key,
    tier: row.tier,
    titleZh: row.title_zh,
    titleEn: row.title_en,
    descriptionZh: row.description_zh,
    descriptionEn: row.description_en,
    availability: row.availability,
    displayOrder: row.display_order,
  }));
}

export async function getMembershipForUser(userId) {
  const { rows } = await query(
    `SELECT u.id AS user_id, u.email, u.membership_status,
            s.*
     FROM users u
     LEFT JOIN LATERAL (
       SELECT * FROM membership_subscriptions
       WHERE user_id = u.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) s ON TRUE
     WHERE u.id = $1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  const legacyTier = normalizeTier(row.membership_status || "explorer");
  const effectiveTier = tierRank(legacyTier) > tierRank(subscriptionTier(row)) ? legacyTier : subscriptionTier(row);
  return {
    userId: row.user_id,
    email: row.email,
    tier: effectiveTier,
    billingInterval: row.billing_interval || (effectiveTier === "explorer" ? "none" : "monthly"),
    status: row.status || (effectiveTier === "explorer" ? "inactive" : "active"),
    stripeCustomerId: row.stripe_customer_id || "",
    stripeSubscriptionId: row.stripe_subscription_id || "",
    stripePriceId: row.stripe_price_id || "",
    currentPeriodStart: row.current_period_start?.toISOString?.() || row.current_period_start || null,
    currentPeriodEnd: row.current_period_end?.toISOString?.() || row.current_period_end || null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };
}

export async function upsertSubscription({
  userId,
  tier,
  billingInterval,
  status,
  stripeCustomerId = "",
  stripeSubscriptionId = "",
  stripePriceId = "",
  currentPeriodStart = null,
  currentPeriodEnd = null,
  cancelAtPeriodEnd = false,
}) {
  const normalizedTier = normalizeTier(tier);
  const normalizedInterval = normalizeInterval(billingInterval || "monthly");
  const normalizedStatus = clean(status || "inactive", 40);
  const subscriptionId = clean(stripeSubscriptionId, 160);
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO membership_subscriptions
        (user_id, tier, billing_interval, status, stripe_customer_id, stripe_subscription_id, stripe_price_id,
         current_period_start, current_period_end, cancel_at_period_end)
       VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9, $10)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         tier = EXCLUDED.tier,
         billing_interval = EXCLUDED.billing_interval,
         status = EXCLUDED.status,
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         stripe_price_id = EXCLUDED.stripe_price_id,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         updated_at = now()
       RETURNING *`,
      [
        userId,
        normalizedTier,
        normalizedInterval,
        normalizedStatus,
        clean(stripeCustomerId, 160),
        subscriptionId,
        clean(stripePriceId, 160),
        currentPeriodStart,
        currentPeriodEnd,
        Boolean(cancelAtPeriodEnd),
      ]
    );
    const effectiveTier = ACTIVE_SUBSCRIPTION_STATUSES.has(normalizedStatus)
      ? normalizedTier
      : "explorer";
    await client.query(
      `UPDATE users SET membership_status = $2, updated_at = now()
       WHERE id = $1 AND role = 'buyer'`,
      [userId, effectiveTier]
    );
    return rows[0];
  });
  return getMembershipForUser(userId);
}

export async function setManualMembership(userId, tier, operatorId = null) {
  const normalizedTier = normalizeTier(tier);
  await query(
    `UPDATE users
     SET membership_status = $2,
         membership_granted_at = CASE WHEN $2 <> 'explorer' THEN now() ELSE NULL END,
         membership_granted_by = CASE WHEN $2 <> 'explorer' THEN $3 ELSE NULL END,
         updated_at = now()
     WHERE id = $1 AND role = 'buyer'`,
    [userId, normalizedTier, operatorId]
  );
  return getMembershipForUser(userId);
}

export async function listMemberships({ tier = "", status = "", search = "" } = {}) {
  const params = [];
  const where = ["u.role = 'buyer'"];
  if (tier) {
    params.push(tier);
    where.push(`u.membership_status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where.push(`lower(u.email) LIKE $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`COALESCE(s.status, 'inactive') = $${params.length}`);
  }
  const { rows } = await query(
    `SELECT u.id, u.email, u.display_name, u.auth_provider, u.membership_status, u.created_at,
            s.billing_interval, s.status, s.current_period_start, s.current_period_end, s.cancel_at_period_end
     FROM users u
     LEFT JOIN LATERAL (
       SELECT * FROM membership_subscriptions
       WHERE user_id = u.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) s ON TRUE
     WHERE ${where.join(" AND ")}
     ORDER BY u.created_at DESC
     LIMIT 500`,
    params
  );
  return rows;
}

export async function createConciergeRequest(userId, input = {}) {
  const description = clean(input.description, 3000);
  if (!description) throw new Error("Please describe what you need.");
  const requestNumber = `OMC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const { rows } = await query(
    `INSERT INTO concierge_requests
      (request_number, user_id, service_type, description, budget, currency, desired_date,
       product_url, attachments, contact_method, country)
     VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::date, $8, $9::jsonb, $10, $11)
     RETURNING *`,
    [
      requestNumber,
      userId,
      clean(input.serviceType || "other", 40),
      description,
      clean(input.budget, 120),
      clean(input.currency || "USD", 8),
      clean(input.desiredDate, 40),
      clean(input.productUrl, 500),
      JSON.stringify(Array.isArray(input.attachments) ? input.attachments.slice(0, 5) : []),
      clean(input.contactMethod, 160),
      clean(input.country, 120),
    ]
  );
  return rows[0];
}

export async function listConciergeRequests({ userId = null, status = "", serviceType = "" } = {}) {
  const params = [];
  const where = [];
  if (userId) {
    params.push(userId);
    where.push(`cr.user_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`cr.status = $${params.length}`);
  }
  if (serviceType) {
    params.push(serviceType);
    where.push(`cr.service_type = $${params.length}`);
  }
  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT cr.*, u.email, u.display_name
     FROM concierge_requests cr
     JOIN users u ON u.id = cr.user_id
     ${sqlWhere}
     ORDER BY cr.created_at DESC
     LIMIT 500`,
    params
  );
  return rows;
}

export async function updateConciergeRequest(id, { status, internalNotes } = {}) {
  const nextStatus = clean(status, 40);
  if (nextStatus && !VALID_REQUEST_STATUSES.has(nextStatus)) throw new Error("Unsupported request status.");
  const { rows } = await query(
    `UPDATE concierge_requests
     SET status = COALESCE(NULLIF($2, ''), status),
         internal_notes = COALESCE($3, internal_notes),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, nextStatus, internalNotes === undefined ? null : clean(internalNotes, 3000)]
  );
  return rows[0] || null;
}

export async function createFeatureNotification(userId, featureKey) {
  await query(
    `INSERT INTO membership_feature_notifications (user_id, feature_key)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, clean(featureKey, 80)]
  );
}
