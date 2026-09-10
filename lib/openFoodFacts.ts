import { ImpactGrade, ProductImpact } from "./types";

const OFF_PRODUCT_URL = (barcode: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_url,ecoscore_grade,ecoscore_data,agribalyse,quantity,product_quantity`;

const OFF_SEARCH_URL = (query: string) =>
  `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
    query
  )}&search_simple=1&action=process&json=1&page_size=5&fields=code,product_name,brands,image_url,ecoscore_grade,ecoscore_data,agribalyse,quantity,product_quantity`;

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

// Convertit le champ texte libre "quantity" d'Open Food Facts (ex: "100 g",
// "1kg", "33 cl", "1 L") en grammes. Approximation : pour les liquides, on
// suppose une densité proche de celle de l'eau (1 ml ≈ 1 g), ce qui reste
// raisonnable pour la plupart des boissons mais pas pour de l'huile par ex.
// Les packs multiples ("6 x 25 g") ne sont pas totalisés : seule la première
// unité est retenue, donc le poids peut être sous-estimé sur ces produits.
function parseWeightGrams(quantity: string | null | undefined): number | null {
  if (!quantity) return null;
  const match = quantity
    .toLowerCase()
    .replace(",", ".")
    .match(/(\d+(\.\d+)?)\s*(kg|g|l|cl|ml)\b/);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[3];

  switch (unit) {
    case "kg":
    case "l":
      return value * 1000;
    case "cl":
      return value * 10;
    case "g":
    case "ml":
      return value;
    default:
      return null;
  }
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
  const carbonKgPerKg = extractCarbon(product);

  // product_quantity est déjà en grammes quand Open Food Facts l'a normalisé ;
  // à défaut on retombe sur le parsing du texte libre "quantity".
  const weightGrams =
    (typeof product.product_quantity === "number" ? product.product_quantity : null) ??
    parseWeightGrams(product.quantity);

  return {
    barcode,
    name: product.product_name || "Produit sans nom",
    brand: product.brands || null,
    imageUrl: product.image_url || null,
    carbonKgPerKg,
    weightGrams,
    weightSource: weightGrams !== null ? "declared" : "unknown",
    carbonForPackage:
      carbonKgPerKg !== null && weightGrams !== null
        ? carbonKgPerKg * (weightGrams / 1000)
        : null,
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

  const carbonKgPerKg = extractCarbon(product);
  const weightGrams =
    (typeof product.product_quantity === "number" ? product.product_quantity : null) ??
    parseWeightGrams(product.quantity);

  return {
    barcode: product.code || null,
    name: product.product_name || query,
    brand: product.brands || null,
    imageUrl: product.image_url || null,
    carbonKgPerKg,
    weightGrams,
    weightSource: weightGrams !== null ? "declared" : "unknown",
    carbonForPackage:
      carbonKgPerKg !== null && weightGrams !== null
        ? carbonKgPerKg * (weightGrams / 1000)
        : null,
    grade: normalizeGrade(product.ecoscore_grade),
    source: "openfoodfacts",
    confidence: "medium",
  };
}
