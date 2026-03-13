"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";

interface BarcodeScannerProps {
  onDetect: (barcode: string) => void;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
    };
  }
}

export function BarcodeScanner({ onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectedRef = useRef(false);

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const startCamera = useCallback(async () => {
    setError(null);
    detectedRef.current = false;
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch {
      setError("Could not access the camera. Please allow camera permissions.");
    }
  }, [facingMode]);

  useEffect(() => {
    setIsSupported(!!window.BarcodeDetector);
    startCamera();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  useEffect(() => {
    if (!isStreaming || !isSupported || !window.BarcodeDetector) return;

    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "code_128", "code_39", "itf"],
    });

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || detectedRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && barcodes[0].rawValue) {
          detectedRef.current = true;
          if (intervalRef.current) clearInterval(intervalRef.current);
          streamRef.current?.getTracks().forEach((t) => t.stop());
          onDetect(barcodes[0].rawValue);
        }
      } catch {
        // frame detection failed — try next frame
      }
    }, 300);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, isSupported, onDetect]);

  if (isSupported === false) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Barcode scanning requires Chrome, Edge, or a Chromium-based browser.
          <br />
          Please switch to <strong>Photo</strong> mode instead.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black aspect-[4/3]">
        {!isStreaming && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <p className="text-sm opacity-75">{error}</p>
            <button
              onClick={startCamera}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

        {/* Targeting frame overlay */}
        {isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-3/4 h-1/3">
              <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-primary rounded-tl-sm" />
              <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-primary rounded-tr-sm" />
              <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-primary rounded-bl-sm" />
              <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-primary rounded-br-sm" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-primary/60 animate-pulse" />
            </div>
          </div>
        )}

        <button
          onClick={() => setFacingMode((p) => (p === "environment" ? "user" : "environment"))}
          className="absolute top-3 right-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
          title="Switch camera"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Align the barcode within the frame — it detects automatically
      </p>
    </div>
  );
}
