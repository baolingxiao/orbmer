import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGETS = [
  "web/shared/js/customer-communications.js",
  "web/auth/auth.js",
  "web/auth/index.html",
  "web/checkout/checkout.js",
  "web/checkout/success.html",
  "server/email-service.js",
  "server/checkout-service.js",
];

const PROHIBITED = [
  /Dear Customer/i,
  /Valued Customer/i,
  /\bKindly\b/i,
  /Please understand/i,
  /As per (our )?policy/i,
  /According to (our )?policy/i,
  /No refunds/i,
  /No returns/i,
  /You failed to/i,
  /Sorry for the inconvenience/i,
  /Do not reply/i,
  /IMPORTANT!!!/i,
  /ACTION REQUIRED IMMEDIATELY/i,
  /!!!/,
];

const WARNINGS = [
  /\bUnfortunately\b/i,
  /\bWe cannot\b/i,
  /\bFinal sale\b/i,
  /\bThis is an automated message\b/i,
  /\bmust\b/i,
  /无法/,
  /不支持退货/,
  /最终销售/,
];

function scanFile(file) {
  const absolute = path.join(ROOT, file);
  const text = fs.readFileSync(absolute, "utf8");
  const findings = [];
  for (const pattern of PROHIBITED) {
    if (pattern.test(text)) findings.push({ level: "error", file, pattern: pattern.toString() });
  }
  for (const pattern of WARNINGS) {
    if (pattern.test(text)) findings.push({ level: "warn", file, pattern: pattern.toString() });
  }
  return findings;
}

const findings = TARGETS.flatMap(scanFile);
for (const finding of findings) {
  const label = finding.level === "error" ? "ERROR" : "WARN";
  console.log(`${label} ${finding.file} ${finding.pattern}`);
}

if (findings.some((finding) => finding.level === "error")) {
  process.exitCode = 1;
}
