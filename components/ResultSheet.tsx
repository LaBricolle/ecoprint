"use client";

import { useState } from "react";
import { ProductImpact } from "@/lib/types";
import { buildEquivalences, gradeLabel, LIFECYCLE_STAGES } from "@/lib/carbon";
import CarbonGauge from "./CarbonGauge";
import { getOrCreateDeviceId } from "@/lib/supabase";

export default function ResultSheet({
  product,
  recognizedAs,
  onClose,
}: {
  product: ProductImpact;
  recognizedAs?: string;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasRealWeight = product.weightGrams !== null && product.carbonForPackage !== null;
  // On illustre les équivalences avec le chiffre le plus concret possible :
  // l'empreinte du produit réellement scanné si on connaît son poids, sinon
  // la référence "par kg" à titre indicatif.
  const headlineValue = hasRealWeight ? product.carbonForPackage : product.carbonKgPerKg;
  const equivalences = buildEquivalences(headlineValue);

  async function handleSave() {
    const device_id = getOrCreateDeviceId();
    await fetch("/api/history", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        device_id,
        product_name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        carbon_kg_per_kg: product.carbonKgPerKg,
        weight_grams: product.weightGrams,
        carbon_for_package: product.carbonForPackage,
        grade: product.grade,
        image_url: product.imageUrl,
      }),
    });
    setSaved(true);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-forest/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl bg-sage text-ink p-6 pb-8 animate-sheetUp max-h-[85vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink/15 sm:hidden" />

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl leading-tight">{product.name}</h2>
            {product.brand && <p className="text-ink/60 text-sm mt-1">{product.brand}</p>}
            {recognizedAs && (
              <p className="text-ink/40 text-xs mt-1">Identifié par photo : {recognizedAs}</p>
            )}
          </div>
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-16 h-16 object-contain rounded-xl bg-white/60 flex-shrink-0"
            />
          )}
        </div>

        <div className="flex justify-center my-6">
          <div className="bg-forest rounded-3xl px-6 py-4">
            <CarbonGauge
              grade={product.grade}
              carbonKgPerKg={product.carbonKgPerKg}
              value={headlineValue}
              unitLabel={
                hasRealWeight
                  ? `kg CO₂e pour ${
                      product.weightGrams! >= 1000
                        ? `${(product.weightGrams! / 1000).toFixed(1)} kg`
                        : `${product.weightGrams} g`
                    }`
                  : "kg CO₂e / kg (référence)"
              }
            />
          </div>
        </div>

        <p className="text-center font-medium mb-1">{gradeLabel(product.grade)}</p>
        {!hasRealWeight && product.carbonKgPerKg !== null && (
          <p className="text-center text-xs text-ink/50 mb-6">
            Poids du produit non trouvé — score affiché pour 1 kg, pas pour l'emballage réel.
          </p>
        )}
        {hasRealWeight && <div className="mb-6" />}

        {headlineValue !== null && equivalences.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            {equivalences.map((eq) => (
              <div key={eq.label} className="text-center bg-white/50 rounded-2xl py-3 px-2">
                <p className="font-display text-lg">{eq.value}</p>
                <p className="text-xs text-ink/60 mt-1">{eq.label}</p>
              </div>
            ))}
          </div>
        )}

        {product.carbonKgPerKg === null && (
          <p className="text-sm text-ink/60 mb-6 text-center">
            Donnée carbone précise indisponible pour ce produit dans Agribalyse.
          </p>
        )}

        {product.confidence === "low" && (
          <p className="text-xs text-clay mb-4 text-center">
            Estimation par reconnaissance photo — moins fiable qu'un scan de code-barres.
          </p>
        )}

        <button
          onClick={() => setShowDetails((v) => !v)}
          className="w-full text-left text-sm text-deep underline underline-offset-4 mb-4 focus-ring rounded"
        >
          {showDetails ? "Masquer" : "Sur quoi se base ce chiffre ?"}
        </button>

        {showDetails && (
          <div className="bg-white/50 rounded-2xl p-4 mb-6 space-y-3">
            <p className="text-xs text-ink/60">
              Le score vient d'Agribalyse (ADEME/INRAE) et additionne l'impact
              de chaque étape de vie du produit :
            </p>
            <ul className="space-y-2">
              {LIFECYCLE_STAGES.map((stage) => (
                <li key={stage.label} className="text-xs">
                  <span className="font-medium">{stage.label}.</span>{" "}
                  <span className="text-ink/60">{stage.description}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink/40 pt-1 border-t border-ink/10">
              C'est une moyenne par catégorie de produit, pas une mesure
              spécifique à cette marque ou à ce lot précis.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-full border border-ink/20 text-sm focus-ring"
          >
            Nouveau scan
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex-1 py-3 rounded-full bg-deep text-sage text-sm disabled:opacity-50 focus-ring"
          >
            {saved ? "Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
