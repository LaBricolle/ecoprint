"use client";

import { useEffect, useRef, useState } from "react";
import type { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";

interface Props {
  onBarcodeDetected: (code: string) => void;
  onPhotoCaptured: (base64: string, mediaType: string) => void;
  status: "idle" | "loading" | "error";
  errorMessage?: string;
}

function extractText(result: any): string {
  return typeof result.getText === "function" ? result.getText() : result.text;
}

// Redimensionne une image côté client avant l'envoi à l'API de reconnaissance
// IA, pour limiter le coût en tokens par appel (une photo de téléphone en
// pleine résolution est inutilement lourde pour cet usage).
function resizeImageToBase64(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas non disponible"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      URL.revokeObjectURL(objectUrl);
      resolve(dataUrl.split(",")[1]);
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}

export default function ScannerView({
  onBarcodeDetected,
  onPhotoCaptured,
  status,
  errorMessage,
}: Props) {
  const [mode, setMode] = useState<"barcode" | "photo">("barcode");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showManualCapture, setShowManualCapture] = useState(false);
  const [manualCapturing, setManualCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDetectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (mode !== "barcode") return;
    let cancelled = false;
    setShowManualCapture(false);
    setCameraError(null);
    lastDetectedRef.current = null;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current!,
          (result) => {
            if (!result) return;
            const text = extractText(result);
            if (text && text !== lastDetectedRef.current) {
              lastDetectedRef.current = text;
              onBarcodeDetected(text);
            }
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;

        // Si rien n'est détecté après 5 secondes, on propose une capture
        // manuelle plutôt que de laisser l'utilisateur deviner pourquoi ça
        // ne marche pas.
        manualTimerRef.current = setTimeout(() => {
          if (!cancelled) setShowManualCapture(true);
        }, 5000);
      } catch (err) {
        setCameraError(
          "Impossible d'accéder à la caméra. Vérifiez les autorisations ou utilisez le mode photo."
        );
      }
    })();

    return () => {
      cancelled = true;
      if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [mode, onBarcodeDetected]);

  async function handleManualCapture() {
    setManualCapturing(true);
    try {
      const video = videoRef.current;
      if (!video || !video.videoWidth) throw new Error("Vidéo indisponible");

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas indisponible");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = readerRef.current || new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(dataUrl);
      onBarcodeDetected(extractText(result));
    } catch {
      setCameraError(
        "Toujours rien détecté. Essayez le mode Photo, avec un cadrage bien net et sans reflet."
      );
    } finally {
      setManualCapturing(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. On tente d'abord de décoder un code-barres directement depuis la
    //    photo (plus fiable que le scan vidéo en continu, notamment sur iOS).
    try {
      const objectUrl = URL.createObjectURL(file);
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = readerRef.current || new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(objectUrl);
      URL.revokeObjectURL(objectUrl);
      onBarcodeDetected(extractText(result));
      return;
    } catch {
      // Pas de code-barres détecté sur la photo : on tente la reconnaissance
      // IA du produit à partir de l'image.
    }

    // 2. Reconnaissance IA : on redimensionne d'abord l'image (max 800px de
    //    large, JPEG compressé) pour limiter le coût en tokens par appel.
    const resizedBase64 = await resizeImageToBase64(file, 800, 0.6);
    onPhotoCaptured(resizedBase64, "image/jpeg");
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
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
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

        <span className="pointer-events-none absolute -inset-2 rounded-blob border border-lime/20 animate-pulseRing" aria-hidden />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="absolute w-px h-px opacity-0 overflow-hidden -z-10"
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

      {mode === "barcode" && showManualCapture && (
        <button
          onClick={handleManualCapture}
          disabled={manualCapturing}
          className="px-5 py-2.5 rounded-full bg-lime text-forest text-sm font-medium disabled:opacity-60 focus-ring"
        >
          {manualCapturing ? "Capture…" : "Rien détecté ? Forcer la capture"}
        </button>
      )}

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
