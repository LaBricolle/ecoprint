"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanRecord } from "@/lib/types";
import { gradeLabel } from "@/lib/carbon";
import { getOrCreateDeviceId } from "@/lib/supabase";

const GRADE_DOT: Record<string, string> = {
  a: "bg-lime",
  b: "bg-[#C7D96B]",
  c: "bg-[#E0B94E]",
  d: "bg-[#E08A3E]",
  e: "bg-clay",
  unknown: "bg-sage/30",
};

export default function HistoryPage() {
  const [records, setRecords] = useState<ScanRecord[] | null>(null);

  useEffect(() => {
    const deviceId = getOrCreateDeviceId();
    fetch(`/api/history?device_id=${deviceId}`)
      .then((r) => r.json())
      .then((data) => setRecords(data.history || []))
      .catch(() => setRecords([]));
  }, []);

  return (
    <main className="min-h-dvh bg-forest px-6 py-6">
      <header className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-sage/70 hover:text-sage focus-ring rounded px-1">
          ←
        </Link>
        <h1 className="font-display text-2xl text-sage">Vos scans</h1>
      </header>

      {records === null && <p className="text-sage/50 text-sm">Chargement…</p>}

      {records?.length === 0 && (
        <div className="text-center mt-20">
          <p className="text-sage/60">Aucun scan enregistré pour l'instant.</p>
          <Link href="/" className="inline-block mt-4 text-lime text-sm underline underline-offset-4">
            Faire un premier scan
          </Link>
        </div>
      )}

      {records && records.length > 0 && (
        <ol className="relative border-l border-sage/15 pl-6 space-y-6">
          {records.map((r) => (
            <li key={r.id} className="relative">
              <span
                className={`absolute -left-[29px] top-1.5 w-3 h-3 rounded-full ${GRADE_DOT[r.grade]}`}
              />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sage font-medium">{r.product_name}</p>
                  {r.brand && <p className="text-sage/50 text-xs mt-0.5">{r.brand}</p>}
                </div>
                {r.image_url && (
                  <img
                    src={r.image_url}
                    alt=""
                    className="w-10 h-10 object-contain rounded-lg bg-sage/10 flex-shrink-0"
                  />
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-sage/50">
                <span>
                  {r.carbon_kg_per_kg !== null
                    ? `${Number(r.carbon_kg_per_kg).toFixed(1)} kg CO₂e/kg`
                    : "donnée indisponible"}
                </span>
                <span>·</span>
                <span>{gradeLabel(r.grade as any)}</span>
                <span>·</span>
                <span>{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
