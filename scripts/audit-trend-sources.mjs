import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "data", "china-trend-sources.json");
const config = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

async function auditSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(source.robotsUrl, {
      headers: {
        "user-agent": "OrbmareTrendSourceAudit/1.0 (+compliance review; no product crawling)",
        accept: "text/plain",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.text();
    const missingSignals = source.expectedRobotsSignals.filter((signal) => !body.includes(signal));
    return {
      platform: source.platform,
      httpStatus: response.status,
      collectionMode: source.webCollection,
      signals: missingSignals.length ? `missing: ${missingSignals.join(", ")}` : "confirmed",
      ok: response.ok && missingSignals.length === 0,
    };
  } catch (error) {
    return {
      platform: source.platform,
      httpStatus: "unavailable",
      collectionMode: source.webCollection,
      signals: error.name === "AbortError" ? "timeout" : error.message,
      ok: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const results = [];
for (const source of config.sources) {
  results.push(await auditSource(source));
}

console.table(
  results.map(({ platform, httpStatus, collectionMode, signals }) => ({
    platform,
    httpStatus,
    collectionMode,
    signals,
  }))
);

const failed = results.filter((result) => !result.ok);
if (failed.length) {
  console.error(
    `Source audit could not confirm ${failed.length} source(s). Product collection remains disabled for those sources.`
  );
  process.exitCode = 1;
} else {
  console.log("All configured crawl restrictions were confirmed. No product pages were requested.");
}
