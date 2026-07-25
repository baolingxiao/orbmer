#!/usr/bin/env node
/**
 * Delete non-3D (editorial/fake) products from the commerce catalog.
 * Usage: node scripts/purge-non-print-products.mjs
 */
import "dotenv/config";
import { purgeNonPrintCatalog, listAdminProducts } from "../server/product-store.js";
import { ensureDatabaseReady, isDatabaseEnabled } from "../server/db/index.js";

if (isDatabaseEnabled()) {
  await ensureDatabaseReady();
}

const result = await purgeNonPrintCatalog();
const products = await listAdminProducts();
const editorialLeft = products.filter(
  (p) =>
    p.channel === "editorial" ||
    ["japan", "italy", "china"].includes(p.collection) ||
    /^(ja|it|cn)-/i.test(p.id)
);

console.log(
  JSON.stringify(
    { result, remaining: products.length, editorialLeft: editorialLeft.length },
    null,
    2
  )
);
if (editorialLeft.length) {
  console.error(
    "Editorial rows still present:",
    editorialLeft.slice(0, 10).map((p) => p.id)
  );
  process.exit(1);
}
console.log("Print catalog is clean.");
