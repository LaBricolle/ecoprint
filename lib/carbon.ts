import { Equivalence, ImpactGrade } from "./types";

// Facteurs de conversion indicatifs, ordres de grandeur ADEME Base Carbone.
// À affiner avant toute communication publique de chiffres précis.
const CAR_KM_PER_KG_CO2E = 1 / 0.193; // ~193 g CO2e/km, voiture thermique moyenne FR
const SMARTPHONE_CHARGE_PER_KG_CO2E = 1 / 0.0084; // ~8.4 g CO2e par charge complète
const TREE_YEAR_ABSORPTION_KG = 25; // un arbre absorbe environ 25 kg CO2/an

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

export function buildEquivalences(kgPerKg: number | null): Equivalence[] {
  if (kgPerKg === null) return [];

  const km = kgPerKg * CAR_KM_PER_KG_CO2E;
  const charges = kgPerKg * SMARTPHONE_CHARGE_PER_KG_CO2E;
  const treeDays = (kgPerKg / TREE_YEAR_ABSORPTION_KG) * 365;

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
