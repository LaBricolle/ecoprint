"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

interface Props {
  onBarcodeDetected: (code: string) => void;
  onPhotoCaptured: (base64: string, mediaType: string) => void;
  status: "idle" | "loading" | "error";
  errorMessage?: string;
}

const FILE_SCANNER_DIV_ID = "hidden-file-scanner";
const SCAN_INTERVAL_MS = 450;

// Instancie (une seule fois, à la demande) le décodeur "fichier" de
// html5-qrcode. On l'utilise à la fois pour le mode Photo et pour le mode
// Code-barres : au lieu de s'appuyer sur le scan vidéo en continu de la
// librairie (peu fiable sur Safari iOS pour les codes-barres 1D, bug
// documenté), on capture nous-mêmes des images de la vidéo plusieurs fois
// par seconde et on les décode comme des photos. C'est le même chemin que
// le mode Photo, donc tout aussi fiable, mais automatisé.
let sharedFileScanner: Html5Qrcode | null = null;
async function getFileScanner(): Promise<Html5Qrcode> {
  if (sharedFileScanner) return sharedFileScanner;
  const { Html5Qrcode } = await import("html5-qrcode");
  if (!document.getElementById(FILE_SCANNER_DIV_ID)) {
    const div = document.createElement("div");
    div.id = FILE_SCANNER_DIV_ID;
    div.style.display = "none";
    document.body.appendChild(div);
  }
  sharedFileScanner = new Html5Qrcode(FILE_SCANNER_DIV_ID, { verbose: false } as any);
  return sharedFileScanner;
}

export default function ScannerView({
  onBarcodeDetected,
  onPhotoCaptured,
  status,
  errorMessage,
}: Props) {
  const [mode, setMode] = useState<"barcode" | "photo">("barcode");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (mode !== "barcode") return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const scanner = await getFileScanner();

        intervalRef.current = setInterval(async () => {
          if (busyRef.current || statusRef.current === "loading") return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < 2) return;

          busyRef.current = true;
          const targetWidth = 640;
          const scale = targetWidth / video.videoWidth;
          canvas.width = targetWidth;
          canvas.height = video.videoHeight * scale;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            busyRef.current = false;
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                busyRef.current = false;
                return;
              }
              try {
                const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
                const result = await scanner.scanFileV2(file, false);
                onBarcodeDetected(result.decodedText);
              } catch {
                // Pas de code détecté sur cette frame, on retente à la suivante.
              } finally {
                busyRef.current = false;
              }
            },
            "image/jpeg",
            0.85
          );
        }, SCAN_INTERVAL_MS);
      } catch (err) {
        setCameraError(
          "Impossible d'accéder à la caméra. Vérifiez les autorisations ou utilisez le mode photo."
        );
      }
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode, onBarcodeDetected]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. On tente d'abord de décoder un code-barres directement depuis la
    //    photo (plus fiable que le scan vidéo en continu, notamment sur iOS).
    try {
      const scanner = await getFileScanner();
      const result = await scanner.scanFileV2(file, false);
      onBarcodeDetected(result.decodedText);
      return;
    } catch {
      // Pas de code-barres détecté sur la photo : on tente la reconnaissance
      // IA du produit à partir de l'image.
    }

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
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
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
