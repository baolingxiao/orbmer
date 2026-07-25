import { query, withTransaction } from "./index.js";

function priceToCents(price) {
  return Math.round(Number(price) * 100);
}

function centsToPrice(cents) {
  return Math.round(Number(cents)) / 100;
}

function rowToProduct(row) {
  const payload = row.payload || {};
  const inventory = {
    mode: row.inv_mode,
    onHand: row.on_hand,
    reserved: Number(row.reserved || 0),
    reorderPoint: row.reorder_point,
    maxPerOrder: Number(row.max_per_order || 20),
  };
  return {
    ...payload,
    id: row.id,
    collection: row.collection,
    lifecycleStatus: row.lifecycle_status,
    price: centsToPrice(row.price_cents),
    inventory,
    revision: row.revision,
    sellerUserId: row.seller_user_id || null,
    deletedAt: row.deleted_at?.toISOString?.() || row.deleted_at || null,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
    updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
  };
}

const PRODUCT_SELECT = `
  SELECT p.id, p.collection, p.lifecycle_status, p.price_cents, p.payload, p.revision,
         p.seller_user_id, p.created_at, p.updated_at, p.deleted_at,
         i.mode AS inv_mode, i.on_hand, i.reserved, i.reorder_point, i.max_per_order
  FROM products p
  JOIN inventory i ON i.product_id = p.id
`;

export async function listProducts({
  sellerUserId = null,
  includeDeleted = false,
} = {}) {
  const clauses = [];
  const params = [];
  if (sellerUserId) {
    params.push(sellerUserId);
    clauses.push(`p.seller_user_id = $${params.length}`);
  }
  if (!includeDeleted) {
    clauses.push("p.deleted_at IS NULL");
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `${PRODUCT_SELECT} ${where} ORDER BY p.updated_at DESC`,
    params
  );
  return rows.map(rowToProduct);
}

export async function getProduct(id, { includeDeleted = false } = {}) {
  const deletedClause = includeDeleted ? "" : "AND p.deleted_at IS NULL";
  const { rows } = await query(
    `${PRODUCT_SELECT} WHERE p.id = $1 ${deletedClause}`,
    [id]
  );
  return rows[0] ? rowToProduct(rows[0]) : null;
}

export async function upsertProduct(product, { sellerUserId = undefined } = {}) {
  const inventory = product.inventory || {};
  const ownerId =
    sellerUserId !== undefined ? sellerUserId : product.sellerUserId || null;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO products (id, collection, lifecycle_status, price_cents, payload, revision, seller_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::timestamptz, $9::timestamptz)
       ON CONFLICT (id) DO UPDATE SET
         collection = EXCLUDED.collection,
         lifecycle_status = EXCLUDED.lifecycle_status,
         price_cents = EXCLUDED.price_cents,
         payload = EXCLUDED.payload,
         revision = EXCLUDED.revision,
         seller_user_id = COALESCE(EXCLUDED.seller_user_id, products.seller_user_id),
         updated_at = EXCLUDED.updated_at`,
      [
        product.id,
        product.collection,
        product.lifecycleStatus,
        priceToCents(product.price),
        JSON.stringify({ ...product, sellerUserId: ownerId }),
        product.revision || 1,
        ownerId,
        product.createdAt || new Date().toISOString(),
        product.updatedAt || new Date().toISOString(),
      ]
    );
    await client.query(
      `INSERT INTO inventory (product_id, mode, on_hand, reserved, reorder_point, max_per_order, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (product_id) DO UPDATE SET
         mode = EXCLUDED.mode,
         on_hand = EXCLUDED.on_hand,
         reserved = EXCLUDED.reserved,
         reorder_point = EXCLUDED.reorder_point,
         max_per_order = EXCLUDED.max_per_order,
         updated_at = now()`,
      [
        product.id,
        inventory.mode,
        inventory.onHand,
        Number(inventory.reserved || 0),
        inventory.reorderPoint,
        Number(inventory.maxPerOrder || 20),
      ]
    );
  });
  return getProduct(product.id);
}

export async function insertProduct(product, { sellerUserId = null } = {}) {
  const existing = await getProduct(product.id);
  if (existing) throw new Error("A product with this ID already exists.");
  return upsertProduct(product, { sellerUserId });
}

export async function deleteProduct(id) {
  const { rowCount } = await query(`DELETE FROM products WHERE id = $1`, [id]);
  return rowCount > 0;
}

export async function deleteProductsByIds(ids) {
  if (!ids?.length) return 0;
  const { rowCount } = await query(`DELETE FROM products WHERE id = ANY($1::text[])`, [ids]);
  return rowCount;
}

/** Rename product primary key and related inventory / order line references. */
export async function renameProductId(oldId, newId) {
  if (oldId === newId) return getProduct(newId);
  const existing = await getProduct(oldId);
  if (!existing) return null;
  if (await getProduct(newId)) {
    throw new Error(`Target product ID already exists: ${newId}`);
  }

  await withTransaction(async (client) => {
    const payload = {
      ...existing,
      id: newId,
      revision: Number(existing.revision || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    await client.query(
      `INSERT INTO products (id, collection, lifecycle_status, price_cents, payload, revision, seller_user_id, created_at, updated_at)
       SELECT $2, collection, lifecycle_status, price_cents, $3::jsonb, $4, seller_user_id, created_at, $5::timestamptz
       FROM products WHERE id = $1`,
      [
        oldId,
        newId,
        JSON.stringify(payload),
        payload.revision,
        payload.updatedAt,
      ]
    );
    await client.query(
      `INSERT INTO inventory (product_id, mode, on_hand, reserved, reorder_point, max_per_order, updated_at)
       SELECT $2, mode, on_hand, reserved, reorder_point, max_per_order, now()
       FROM inventory WHERE product_id = $1`,
      [oldId, newId]
    );
    await client.query(
      `UPDATE inventory_movements SET product_id = $2 WHERE product_id = $1`,
      [oldId, newId]
    );
    await client.query(`UPDATE order_items SET product_id = $2 WHERE product_id = $1`, [
      oldId,
      newId,
    ]);
    await client.query(`DELETE FROM products WHERE id = $1`, [oldId]);
  });

  return getProduct(newId);
}

export async function assignUnownedProductsToSeller(sellerUserId) {
  const { rowCount } = await query(
    `UPDATE products SET seller_user_id = $1
     WHERE seller_user_id IS NULL
       AND collection IN ('metal', 'toys', 'portrait')`,
    [sellerUserId]
  );
  return rowCount;
}

export async function listOrdersForSeller(sellerUserId) {
  const { rows } = await query(
    `SELECT o.*
     FROM orders o
     WHERE EXISTS (
       SELECT 1
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = o.id AND p.seller_user_id = $1
     )
     ORDER BY o.created_at DESC
     LIMIT 200`,
    [sellerUserId]
  );
  return rows;
}

/**
 * Atomically reserve stock for stocked items.
 * @param {{ productId: string, qty: number, orderId: string, actor?: string }[]} lines
 */
export async function reserveStock(lines, { actor = "checkout" } = {}) {
  if (!lines?.length) return;
  await withTransaction(async (client) => {
    for (const line of lines) {
      const qty = Number(line.qty);
      if (!Number.isInteger(qty) || qty < 1) throw new Error("Invalid reserve quantity.");
      const { rows } = await client.query(
        `SELECT mode, on_hand, reserved, max_per_order
         FROM inventory WHERE product_id = $1 FOR UPDATE`,
        [line.productId]
      );
      const inv = rows[0];
      if (!inv) throw new Error(`Product not found for inventory: ${line.productId}`);
      if (inv.mode !== "stocked") continue;
      if (qty > Number(inv.max_per_order || 20)) {
        throw new Error(`Quantity exceeds max per order for ${line.productId}.`);
      }
      const available = Number(inv.on_hand || 0) - Number(inv.reserved || 0);
      if (qty > available) {
        throw new Error(`Insufficient stock for ${line.productId}.`);
      }
      await client.query(
        `UPDATE inventory SET reserved = reserved + $2, updated_at = now() WHERE product_id = $1`,
        [line.productId, qty]
      );
      await client.query(
        `INSERT INTO inventory_movements
           (product_id, order_id, delta_on_hand, delta_reserved, reason, actor)
         VALUES ($1, $2, 0, $3, 'reserve', $4)`,
        [line.productId, line.orderId || null, qty, actor]
      );
    }
  });
}

export async function commitReservedStock(orderId, { actor = "stripe_webhook" } = {}) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT product_id, SUM(delta_reserved) AS reserved_qty
       FROM inventory_movements
       WHERE order_id = $1 AND reason = 'reserve'
       GROUP BY product_id`,
      [orderId]
    );
    for (const row of rows) {
      const qty = Number(row.reserved_qty || 0);
      if (qty <= 0) continue;
      await client.query(
        `UPDATE inventory
         SET on_hand = on_hand - $2,
             reserved = GREATEST(0, reserved - $2),
             updated_at = now()
         WHERE product_id = $1 AND mode = 'stocked'`,
        [row.product_id, qty]
      );
      await client.query(
        `INSERT INTO inventory_movements
           (product_id, order_id, delta_on_hand, delta_reserved, reason, actor)
         VALUES ($1, $2, $3, $4, 'commit', $5)`,
        [row.product_id, orderId, -qty, -qty, actor]
      );
    }
  });
}

export async function releaseReservedStock(orderId, { actor = "stripe_webhook" } = {}) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT product_id, SUM(delta_reserved) AS reserved_qty
       FROM inventory_movements
       WHERE order_id = $1 AND reason = 'reserve'
       GROUP BY product_id`,
      [orderId]
    );
    for (const row of rows) {
      const qty = Number(row.reserved_qty || 0);
      if (qty <= 0) continue;
      await client.query(
        `UPDATE inventory
         SET reserved = GREATEST(0, reserved - $2),
             updated_at = now()
         WHERE product_id = $1`,
        [row.product_id, qty]
      );
      await client.query(
        `INSERT INTO inventory_movements
           (product_id, order_id, delta_on_hand, delta_reserved, reason, actor)
         VALUES ($1, $2, 0, $3, 'release', $4)`,
        [row.product_id, orderId, -qty, actor]
      );
    }
  });
}
