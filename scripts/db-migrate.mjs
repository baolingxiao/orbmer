#!/usr/bin/env node
import "dotenv/config";
import { closePool, ensureDatabaseReady, isDatabaseEnabled } from "../server/db/index.js";
import { seedProductsIfEmpty } from "../server/product-store.js";
import { importJsonOrdersIfEmpty } from "../server/order-store.js";

if (!isDatabaseEnabled()) {
  console.error("Set DATABASE_URL before running migrations.");
  process.exit(1);
}

const ready = await ensureDatabaseReady();
const seeded = await seedProductsIfEmpty();
const imported = await importJsonOrdersIfEmpty();
console.log("Migrations complete:", ready);
console.log("Product seed:", seeded);
console.log("Order import:", imported);
await closePool();
