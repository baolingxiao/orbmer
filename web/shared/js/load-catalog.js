/**
 * Live catalog loader — always reads published products from the server DB
 * (via /api/catalog), so admin/seller updates appear after a page refresh.
 */
export async function loadCatalog() {
  const response = await fetch(`/api/catalog?t=${Date.now()}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("Catalog is temporarily unavailable.");
  }
  const data = await response.json();
  if (!data?.ok || !Array.isArray(data.products)) {
    throw new Error("Catalog response was invalid.");
  }
  return data.products;
}

export function getProductFromList(products, id) {
  return products.find((product) => product.id === id) || null;
}
