"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ScannerView from "@/components/ScannerView";
import ResultSheet from "@/components/ResultSheet";
import LeafMark from "@/components/LeafMark";
import AuthModal from "@/components/AuthModal";
import { ProductImpact } from "@/lib/types";
import { getCurrentSession, onAuthStateChange, signOut } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function HomePage() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [result, setResult] = useState<ProductImpact | null>(null);
  const [recognizedAs, setRecognizedAs] = useState<string | undefined>();
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    getCurrentSession().then(setSession);
    const subscription = onAuthStateChange((s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleBarcodeDetected = useCallback(
    async (code: string) => {
      if (code === lastBarcode || status === "loading") return;
      setLastBarcode(code);
      setStatus("loading");
      setErrorMessage(undefined);

      try {
        const res = await fetch(`/api/product/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error);
          return;
        }
        setResult(data.product);
        setRecognizedAs(undefined);
        setStatus("idle");
      } catch {
        setStatus("error");
        setErrorMessage("Erreur réseau. Réessayez.");
      }
    },
    [lastBarcode, status]
  );

  const handlePhotoCaptured = useCallback(
    async (base64: string, mediaType: string) => {
      // La reconnaissance IA (pas le scan de code-barres) est réservée aux
      // comptes connectés, pour maîtriser le coût des appels à l'API Claude.
      if (!session) {
        setShowAuthModal(true);
        return;
      }

      setStatus("loading");
      setErrorMessage(undefined);

      try {
        const res = await fetch("/api/recognize", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ imageBase64: base64, mediaType }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMessage(data.error);
          return;
        }
        setResult(data.product);
        setRecognizedAs(data.recognizedAs);
        setStatus("idle");
      } catch {
        setStatus("error");
        setErrorMessage("Erreur réseau. Réessayez.");
      }
    },
    [session]
  );

  function closeResult() {
    setResult(null);
    setLastBarcode(null);
  }

  return (
    <main className="min-h-dvh flex flex-col bg-forest relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full bg-lime/10 blur-3xl"
        aria-hidden
      />

      <header className="flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <LeafMark className="w-7 h-7" />
          <span className="font-display text-lg text-sage">Empreinte</span>
        </div>
        <div className="flex items-center gap-4">
          {session ? (
            <button
              onClick={() => signOut()}
              className="text-sm text-sage/70 hover:text-sage transition-colors focus-ring rounded px-2 py-1"
            >
              Se déconnecter
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-sm text-sage/70 hover:text-sage transition-colors focus-ring rounded px-2 py-1"
            >
              Se connecter
            </button>
          )}
          <Link
            href="/history"
            className="text-sm text-sage/70 hover:text-sage transition-colors focus-ring rounded px-2 py-1"
          >
            Historique
          </Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-10">
        <div className="text-center max-w-sm">
          <h1 className="font-display text-3xl sm:text-4xl text-sage leading-tight">
            Le poids carbone de ce que vous achetez
          </h1>
          <p className="text-sage/60 mt-3 text-sm sm:text-base">
            Visez un code-barres ou prenez une photo du produit pour voir son
            empreinte carbone, à partir des données ADEME Agribalyse.
          </p>
        </div>

        <ScannerView
          onBarcodeDetected={handleBarcodeDetected}
          onPhotoCaptured={handlePhotoCaptured}
          status={status}
          errorMessage={errorMessage}
        />
      </section>

      <footer className="text-center text-sage/30 text-xs pb-6">
        Données produits : Open Food Facts / ADEME Agribalyse
      </footer>

      {result && (
        <ResultSheet product={result} recognizedAs={recognizedAs} onClose={closeResult} />
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </main>
  );
}
