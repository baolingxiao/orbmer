const CART_KEY = "orbmare-cart-v2";
const CHECKOUT_DRAFT_KEY = "orbmare-checkout-draft";

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeCart(lines) {
  localStorage.setItem(CART_KEY, JSON.stringify(lines));
}

export function getCartLines() {
  return readCart();
}

export function saveCartLines(lines) {
  writeCart(Array.isArray(lines) ? lines : []);
}

export function cartCount() {
  return readCart().reduce((sum, line) => sum + Math.max(0, Number(line.qty) || 0), 0);
}

export function cartSubtotal() {
  return readCart().reduce((sum, line) => sum + Number(line.price || 0) * Number(line.qty || 0), 0);
}

export function addCartLine({
  productId,
  name,
  price,
  image,
  variantLabel = "Standard",
  variantId = "standard",
  qty = 1,
  maxQty = 20,
}) {
  const lines = readCart();
  const lineId = `${productId}::${variantId}`;
  const existing = lines.find((line) => line.lineId === lineId);
  const previous = Number(existing?.qty) || 0;
  const nextQty = Math.max(1, Math.min(maxQty, previous + Number(qty || 1)));
  if (existing) {
    existing.qty = nextQty;
    existing.name = name;
    existing.price = Number(price);
    existing.image = image;
    existing.variantLabel = variantLabel;
    existing.maxQty = Math.max(1, Number(maxQty) || 20);
  } else {
    lines.push({
      lineId,
      productId,
      name,
      price: Number(price),
      image,
      variantLabel,
      variantId,
      qty: Math.max(1, Math.min(maxQty, Number(qty) || 1)),
      maxQty: Math.max(1, Number(maxQty) || 20),
    });
  }
  writeCart(lines);
  return { lines, capped: previous + Number(qty || 1) > maxQty, qty: nextQty };
}

export function setCartLineQty(lineId, qty) {
  let lines = readCart();
  if (qty <= 0) lines = lines.filter((line) => line.lineId !== lineId);
  else {
    const line = lines.find((entry) => entry.lineId === lineId);
    if (line) {
      const maximum = Math.max(1, Number(line.maxQty) || 20);
      line.qty = Math.min(maximum, Math.max(1, Number(qty) || 1));
    }
  }
  writeCart(lines);
  return lines;
}

export function removeCartLine(lineId) {
  const lines = readCart().filter((line) => line.lineId !== lineId);
  writeCart(lines);
  return lines;
}

export function clearCart() {
  writeCart([]);
}

export function saveCheckoutDraft(draft) {
  sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
}

export function loadCheckoutDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(CHECKOUT_DRAFT_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
}
