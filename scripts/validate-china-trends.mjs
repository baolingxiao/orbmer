import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const datasetPath = path.join(projectRoot, "web", "shared", "data", "china-trends.json");
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));

const allowedPlatforms = new Set(["1688", "taobao", "jd", "pdd"]);
const allowedSourceStates = new Set(["verified_snapshot", "source_access_pending"]);
const allowedItemStates = new Set(["verified_snapshot"]);
const expectedHosts = {
  jd: {
    source: new Set(["www.jd.com"]),
    product: new Set(["item.jd.com"]),
  },
};

const errors = [];
const ids = new Set();
const productUrls = new Set();
const categories = new Map((dataset.categories || []).map((category) => [category.id, category]));
const sourceStates = new Map(
  (dataset.sourceStatus || []).map((source) => [source.platform, source.status])
);

function requireValue(condition, message) {
  if (!condition) errors.push(message);
}

function parseHttpsUrl(raw, field, itemId) {
  try {
    const url = new URL(raw);
    requireValue(url.protocol === "https:", `${itemId}: ${field} must use HTTPS`);
    return url;
  } catch {
    errors.push(`${itemId}: ${field} is not a valid URL`);
    return null;
  }
}

requireValue(dataset.schemaVersion === "1.0.0", "schemaVersion must be 1.0.0");
requireValue(dataset.datasetId === "china-trend-leads", "datasetId must be china-trend-leads");
requireValue(/^\d{4}-\d{2}-\d{2}$/.test(dataset.observedAt || ""), "observedAt must be YYYY-MM-DD");
requireValue(categories.size === 10, "exactly ten Orbmare categories are required");

for (const source of dataset.sourceStatus || []) {
  requireValue(allowedPlatforms.has(source.platform), `unknown source platform: ${source.platform}`);
  requireValue(
    allowedSourceStates.has(source.status),
    `${source.platform}: unsupported source status ${source.status}`
  );
  parseHttpsUrl(source.accessUrl, "accessUrl", `source:${source.platform}`);
}

for (const platform of allowedPlatforms) {
  requireValue(sourceStates.has(platform), `missing source status for ${platform}`);
}

for (const item of dataset.items || []) {
  const label = item.id || "item-without-id";
  requireValue(Boolean(item.id), "every item requires an id");
  requireValue(!ids.has(item.id), `${label}: duplicate id`);
  ids.add(item.id);

  requireValue(allowedPlatforms.has(item.platform), `${label}: unknown platform`);
  requireValue(allowedItemStates.has(item.status), `${label}: item is not publication-ready`);
  requireValue(
    sourceStates.get(item.platform) === "verified_snapshot",
    `${label}: source is not approved for public snapshots`
  );
  requireValue(categories.has(item.categoryId), `${label}: unknown categoryId`);
  requireValue(
    categories.get(item.categoryId)?.label === item.categoryLabel,
    `${label}: categoryLabel does not match taxonomy`
  );
  requireValue(
    categories.get(item.categoryId)?.icon === item.image,
    `${label}: only the matching local category image may be used`
  );
  requireValue(item.imageType === "category_placeholder", `${label}: imageType must be category_placeholder`);
  requireValue(!/^https?:\/\//.test(item.image), `${label}: remote product images are not allowed`);
  requireValue(item.procurementStatus === "lead_only", `${label}: procurementStatus must be lead_only`);
  requireValue(item.price === null, `${label}: unverified prices must remain null`);
  requireValue(item.stock === "unverified", `${label}: stock must remain unverified`);
  requireValue(
    item.brandAuthorization === "unverified",
    `${label}: brand authorization must remain unverified`
  );
  requireValue(
    item.crossBorderEligibility === "unverified",
    `${label}: cross-border eligibility must remain unverified`
  );
  requireValue(
    Number.isInteger(item.rankPosition) && item.rankPosition > 0,
    `${label}: rankPosition must be a positive integer`
  );
  requireValue(Boolean(item.popularityEvidence), `${label}: popularityEvidence is required`);
  requireValue(item.observedAt === dataset.observedAt, `${label}: observedAt must match dataset`);
  requireValue(!/[—–]/.test(item.title), `${label}: title contains a disallowed dash character`);

  const sourceUrl = parseHttpsUrl(item.sourceUrl, "sourceUrl", label);
  const productUrl = parseHttpsUrl(item.productUrl, "productUrl", label);
  const hosts = expectedHosts[item.platform];
  if (hosts && sourceUrl) {
    requireValue(hosts.source.has(sourceUrl.hostname), `${label}: unexpected source host`);
  }
  if (hosts && productUrl) {
    requireValue(hosts.product.has(productUrl.hostname), `${label}: unexpected product host`);
  }
  requireValue(!productUrls.has(item.productUrl), `${label}: duplicate productUrl`);
  productUrls.add(item.productUrl);
}

if (errors.length) {
  console.error(`China trend dataset failed validation with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const counts = Object.fromEntries(
    [...categories.keys()].map((categoryId) => [
      categoryId,
      dataset.items.filter((item) => item.categoryId === categoryId).length,
    ])
  );
  console.log(`China trend dataset is valid: ${dataset.items.length} verified lead(s).`);
  console.log(JSON.stringify(counts, null, 2));
}
