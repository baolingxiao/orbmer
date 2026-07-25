import assert from "node:assert/strict";
import {
  hasPermission,
  loadSessionAuthorization,
  stripFinanceFields,
} from "../server/rbac.js";

const legacy = await loadSessionAuthorization({ email: "ops@orbmare.local" });
assert.ok(legacy.permissions.includes("product.publish"));
assert.equal(hasPermission({ permissions: legacy.permissions }, "team.manage"), true);

const limited = {
  permissions: ["product.read", "product.update", "content.update"],
};
assert.equal(hasPermission(limited, "product.publish"), false);
assert.equal(hasPermission(limited, "product.update"), true);

const product = {
  id: "demo",
  price: 120,
  costPrice: 40,
  purchasePrice: 35,
  marginAmount: 80,
};
const stripped = stripFinanceFields(product, limited);
assert.equal(stripped.costPrice, undefined);
assert.equal(stripped.purchasePrice, undefined);

const financeView = stripFinanceFields(product, {
  permissions: ["finance.read", "product.read"],
});
assert.equal(financeView.costPrice, 40);

console.log("test-admin-rbac: ok");
