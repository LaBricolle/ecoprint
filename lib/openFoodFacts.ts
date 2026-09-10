import { ImpactGrade, ProductImpact } from "./types";

const OFF_PRODUCT_URL = (barcode: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_url,ecoscore_grade,ecoscore_data,agribalyse`;

const OFF_SEARCH_URL = (query: string) =>
  `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=5&fields=code,product_name,brands,image_url,ecoscore_grade,ecoscore_data,agribalyse`;

function normalizeGrade(grade: string | undefined | null): ImpactGrade {
  if (!grade) return "unknown";
  const g = grade.toLowerCase();
  if (["a", "b", "c", "d", "e"].includes(g)) return g as ImpactGrade;
  return "unknown";
}

function extractCarbon(product: any): number | null {
  // Agribalyse carbon footprint, kg CO2e per kg of product.
  const agribalyse = product?.agribalyse?.co2_total;
  if (typeof agribalyse === "number") return agribalyse;

  const ecoscoreAgribalyse = product?.ecoscore_data?.agribalyse?.co2_total;
  if (typeof ecoscoreAgribalyse === "number") return ecoscoreAgribalyse;

  return null;
}

export async function fetchProductByBarcode(
  barcode: string
): Promise<ProductImpact | null> {
  const res = await fetch(OFF_PRODUCT_URL(barcode), {
    headers: { "User-Agent": "CarbonScan/1.0 (contact: you@example.com)" },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;

  const product = data.product;

  return {
    barcode,
    name: product.product_name || "Produit sans nom",
    brand: product.brands || null,
    imageUrl: product.image_url || null,
    carbonKgPerKg: extractCarbon(product),
    grade: normalizeGrade(product.ecoscore_grade),
    source: "openfoodfacts",
    confidence: "high",
  };
}

export async function searchProductByName(
  query: string
): Promise<ProductImpact | null> {
  const res = await fetch(OFF_SEARCH_URL(query), {
    headers: { "User-Agent": "CarbonScan/1.0 (contact: you@example.com)" },
  });

  if (!res.ok) return null;
  const data = await res.json();
  const product = data?.products?.[0];
  if (!product) return null;

  return {
    barcode: product.code || null,
    name: product.product_name || query,
    brand: product.brands || null,
    imageUrl: product.image_url || null,
    carbonKgPerKg: extractCarbon(product),
    grade: normalizeGrade(product.ecoscore_grade),
    source: "openfoodfacts",
    confidence: "medium",
  };
}
