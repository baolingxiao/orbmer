import { isDatabaseEnabled } from "./db/index.js";
import * as rbacRepo from "./db/rbac-repo.js";

/** When DB RBAC is unavailable, env-configured single admin gets full access. */
const LEGACY_ALL_PERMISSIONS = [
  "product.read",
  "product.create",
  "product.update",
  "product.delete",
  "product.publish",
  "order.read",
  "order.update",
  "order.refund",
  "customer.read",
  "customer.manage",
  "customer.export",
  "membership.read",
  "membership.manage",
  "concierge.read",
  "concierge.manage",
  "content.read",
  "content.update",
  "content.publish",
  "inventory.read",
  "inventory.update",
  "finance.read",
  "team.read",
  "team.manage",
  "settings.read",
  "settings.manage",
  "media.read",
  "media.upload",
  "media.delete",
  "brand.read",
  "brand.write",
  "material.read",
  "material.write",
  "country.read",
  "country.write",
  "audit.read",
  "ai_content_optimize",
  "ai_content_use_premium_model",
];

export async function loadSessionAuthorization(session) {
  if (!session) return { roles: [], permissions: [] };
  if (!isDatabaseEnabled() || !session.userId) {
    return {
      roles: [{ id: "super_admin", name: "Super Admin" }],
      permissions: [...LEGACY_ALL_PERMISSIONS],
    };
  }
  let roles = await rbacRepo.getRolesForUser(session.userId);
  let permissions = await rbacRepo.getPermissionsForUser(session.userId);
  if (!roles.length) {
    await rbacRepo.ensureSuperAdmin(session.userId);
    roles = await rbacRepo.getRolesForUser(session.userId);
    permissions = await rbacRepo.getPermissionsForUser(session.userId);
  }
  // Super Admin must always have full access — even if role_permissions rows were missed.
  if (roles.some((role) => role.id === "super_admin")) {
    permissions = [...new Set([...permissions, ...LEGACY_ALL_PERMISSIONS])];
  }
  return { roles, permissions };
}

export function hasPermission(session, permission) {
  const list = session?.permissions || [];
  return list.includes(permission);
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.adminSession, permission)) {
      return res.status(403).json({
        ok: false,
        error: "You do not have permission for this action.",
        permission,
      });
    }
    return next();
  };
}

export function requireAnyPermission(...permissions) {
  return (req, res, next) => {
    const ok = permissions.some((permission) =>
      hasPermission(req.adminSession, permission)
    );
    if (!ok) {
      return res.status(403).json({
        ok: false,
        error: "You do not have permission for this action.",
        permission: permissions[0],
      });
    }
    return next();
  };
}

export function stripFinanceFields(product, session) {
  if (!product) return product;
  if (hasPermission(session, "finance.read")) return product;
  const clone = { ...product };
  delete clone.costPrice;
  delete clone.purchasePrice;
  delete clone.msrp;
  delete clone.marginAmount;
  delete clone.marginRate;
  return clone;
}
