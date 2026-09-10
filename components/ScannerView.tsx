"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface Props {
  onBarcodeDetected: (code: string) => void;
  onPhotoCaptured: (base64: string, mediaType: string) => void;
  status: "idle" | "loading" | "error";
  errorMessage?: string;
}

export default function ScannerView({
  onBarcodeDetected,
  onPhotoCaptured,
  status,
  errorMessage,
}: Props) {
  const containerId = "barcode-reader";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [mode, setMode] = useState<"barcode" | "photo">("barcode");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode !== "barcode") return;
    let cancelled = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const instance = new Html5Qrcode(containerId, { verbose: false });
      scannerRef.current = instance;

      try {
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 160 } },
          (decodedText) => {
            onBarcodeDetected(decodedText);
          },
          () => {
            // ignore les frames sans détection
          }
        );
      } catch (err) {
        setCameraError(
          "Impossible d'accéder à la caméra. Vérifiez les autorisations ou utilisez le mode photo."
        );
      }
    })();

    return () => {
      cancelled = true;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
  }, [mode, onBarcodeDetected]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      onPhotoCaptured(base64, file.type);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="relative w-72 h-72 sm:w-80 sm:h-80">
        <div
          className="absolute inset-0 rounded-blob bg-lime/10 blur-2xl"
          aria-hidden
        />
        <div className="absolute inset-4 rounded-blob border border-lime/40 grain" aria-hidden />

        {mode === "barcode" ? (
          <div className="absolute inset-6 rounded-blob overflow-hidden bg-black/40">
            <div id={containerId} className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full" />
            <div className="pointer-events-none absolute left-6 right-6 top-1/2 h-0.5 bg-lime shadow-[0_0_12px_2px_rgba(168,224,99,0.7)] animate-scanline" />
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-6 rounded-blob overflow-hidden bg-deep/60 border border-lime/40 flex flex-col items-center justify-center gap-3 text-sage focus-ring"
          >
            <CameraIcon />
            <span className="text-sm">Prendre une photo du produit</span>
          </button>
        )}

        <span className="absolute -inset-2 rounded-blob border border-lime/20 animate-pulseRing" aria-hidden />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-1 rounded-full bg-deep/50 p-1">
        <button
          onClick={() => setMode("barcode")}
          className={`px-4 py-2 rounded-full text-sm transition-colors focus-ring ${
            mode === "barcode" ? "bg-lime text-forest" : "text-sage/70"
          }`}
        >
          Code-barres
        </button>
        <button
          onClick={() => setMode("photo")}
          className={`px-4 py-2 rounded-full text-sm transition-colors focus-ring ${
            mode === "photo" ? "bg-lime text-forest" : "text-sage/70"
          }`}
        >
          Photo
        </button>
      </div>

      {status === "loading" && (
        <p className="text-sage/70 text-sm">Analyse en cours…</p>
      )}
      {(cameraError || (status === "error" && errorMessage)) && (
        <p className="text-clay text-sm text-center max-w-xs">
          {cameraError || errorMessage}
        </p>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
