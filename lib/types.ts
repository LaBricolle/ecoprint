export type ImpactGrade = "a" | "b" | "c" | "d" | "e" | "unknown";

export interface ProductImpact {
  barcode: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  carbonKgPerKg: number | null; // kg CO2e par kg de produit, référence Agribalyse
  weightGrams: number | null; // poids réel du produit/emballage, si connu
  weightSource: "declared" | "unknown"; // "declared" = champ quantity d'Open Food Facts
  carbonForPackage: number | null; // kg CO2e pour LE produit réellement scanné (carbonKgPerKg * poids)
  grade: ImpactGrade;
  source: "openfoodfacts" | "ai-estimate";
  confidence: "high" | "medium" | "low";
}

export interface Equivalence {
  label: string;
  value: string;
}

export interface ScanRecord {
  id: string;
  device_id: string;
  product_name: string;
  brand: string | null;
  barcode: string | null;
  carbon_kg_per_kg: number | null;
  weight_grams: number | null;
  carbon_for_package: number | null;
  grade: ImpactGrade;
  image_url: string | null;
  created_at: string;
}
