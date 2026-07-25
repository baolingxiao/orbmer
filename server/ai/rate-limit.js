/** In-memory rate limits (per process). Suitable for single-node PM2. */

const minuteBuckets = new Map();
const dayBuckets = new Map();
const monthBuckets = new Map();

function minuteKey(userId, ip) {
  const slot = Math.floor(Date.now() / 60000);
  return `${userId || "anon"}:${ip || "ip"}:${slot}`;
}

function dayKey(userId) {
  const day = new Date().toISOString().slice(0, 10);
  return `${userId || "anon"}:${day}`;
}

function monthKey(userId) {
  const month = new Date().toISOString().slice(0, 7);
  return `${userId || "anon"}:${month}`;
}

export function assertRateLimit({
  userId,
  ip,
  perMinute = 20,
  perDay = 200,
  perMonth = 3000,
}) {
  const mk = minuteKey(userId, ip);
  const minuteCount = (minuteBuckets.get(mk) || 0) + 1;
  minuteBuckets.set(mk, minuteCount);
  if (minuteCount > perMinute) {
    const error = new Error("AI rate limit exceeded. Please wait a minute.");
    error.status = 429;
    error.code = "ai_rate_limited";
    throw error;
  }

  const dk = dayKey(userId);
  const dayCount = (dayBuckets.get(dk) || 0) + 1;
  dayBuckets.set(dk, dayCount);
  if (dayCount > perDay) {
    const error = new Error("Daily AI optimization quota exceeded.");
    error.status = 429;
    error.code = "ai_daily_quota";
    throw error;
  }

  const mo = monthKey(userId);
  const monthCount = (monthBuckets.get(mo) || 0) + 1;
  monthBuckets.set(mo, monthCount);
  if (monthCount > perMonth) {
    const error = new Error("Monthly AI optimization quota exceeded.");
    error.status = 429;
    error.code = "ai_monthly_quota";
    throw error;
  }

  // Light cleanup
  if (minuteBuckets.size > 5000) minuteBuckets.clear();
  if (dayBuckets.size > 5000) dayBuckets.clear();
  if (monthBuckets.size > 2000) monthBuckets.clear();
}
