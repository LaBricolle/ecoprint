"use client";

import { useState } from "react";
import { ProductImpact } from "@/lib/types";
import { buildEquivalences, gradeLabel } from "@/lib/carbon";
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
  const equivalences = buildEquivalences(product.carbonKgPerKg);

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
            <p className="text-xs uppercase tracking-wide text-ink/50 hidden">
              {/* pas de eyebrow générique : titre direct */}
            </p>
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
            <CarbonGauge grade={product.grade} carbonKgPerKg={product.carbonKgPerKg} />
          </div>
        </div>

        <p className="text-center font-medium mb-6">{gradeLabel(product.grade)}</p>

        {product.carbonKgPerKg !== null && equivalences.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
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
