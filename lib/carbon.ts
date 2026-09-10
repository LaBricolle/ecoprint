import { Equivalence, ImpactGrade } from "./types";

// Facteurs de conversion indicatifs, ordres de grandeur ADEME Base Carbone.
// À affiner avant toute communication publique de chiffres précis.
const CAR_KM_PER_KG_CO2E = 1 / 0.193; // ~193 g CO2e/km, voiture thermique moyenne FR
const SMARTPHONE_CHARGE_PER_KG_CO2E = 1 / 0.0084; // ~8.4 g CO2e par charge complète
const TREE_YEAR_ABSORPTION_KG = 25; // un arbre absorbe environ 25 kg CO2/an

// Les 6 étapes du cycle de vie couvertes par le calcul Agribalyse (ADEME/INRAE).
// Le score affiché est la somme de l'impact de chacune de ces étapes, pas
// seulement la production agricole.
export const LIFECYCLE_STAGES = [
  {
    label: "Agriculture",
    description:
      "Culture ou élevage des matières premières : émissions liées aux engrais, au méthane du bétail, à l'usage des sols (déforestation comprise pour certaines cultures comme le cacao ou le soja).",
  },
  {
    label: "Transformation",
    description:
      "Passage de la matière première au produit fini : cuisson, mélange, fermentation, énergie des usines.",
  },
  {
    label: "Emballage",
    description:
      "Fabrication des matériaux d'emballage (plastique, carton, verre) et leur fin de vie.",
  },
  {
    label: "Transport",
    description:
      "Acheminement depuis le lieu de production jusqu'au point de vente, y compris l'import le cas échéant.",
  },
  {
    label: "Distribution",
    description:
      "Stockage et réfrigération en entrepôt et en magasin jusqu'à l'achat.",
  },
  {
    label: "Consommation",
    description:
      "Ce qui se passe une fois chez vous : réfrigération, cuisson, emballage jeté.",
  },
] as const;

export function gradeFromCarbon(kgPerKg: number | null): ImpactGrade {
  if (kgPerKg === null) return "unknown";
  if (kgPerKg < 1) return "a";
  if (kgPerKg < 3) return "b";
  if (kgPerKg < 6) return "c";
  if (kgPerKg < 10) return "d";
  return "e";
}

export function gradeLabel(grade: ImpactGrade): string {
  const labels: Record<ImpactGrade, string> = {
    a: "Impact très faible",
    b: "Impact faible",
    c: "Impact modéré",
    d: "Impact élevé",
    e: "Impact très élevé",
    unknown: "Impact non déterminé",
  };
  return labels[grade];
}

// totalCarbonKg = la quantité de CO2e à convertir en équivalences parlantes.
// Peut être le score "par kg" (référence produit) ou le total réel pour le
// produit scanné (score par kg × poids réel) selon ce que l'appelant veut
// illustrer.
export function buildEquivalences(totalCarbonKg: number | null): Equivalence[] {
  if (totalCarbonKg === null) return [];

  const km = totalCarbonKg * CAR_KM_PER_KG_CO2E;
  const charges = totalCarbonKg * SMARTPHONE_CHARGE_PER_KG_CO2E;
  const treeDays = (totalCarbonKg / TREE_YEAR_ABSORPTION_KG) * 365;

  return [
    { label: "en voiture", value: `${km < 1 ? "< 1" : km.toFixed(km < 10 ? 1 : 0)} km` },
    {
      label: "de charges de smartphone",
      value: charges < 1 ? "< 1" : Math.round(charges).toString(),
    },
    {
      label: "d'absorption par un arbre",
      value: treeDays < 1 ? "< 1 jour" : `${Math.round(treeDays)} jours`,
    },
  ];
}
