"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { useLanguage } from "@/contexts/language-context";

interface BarcodeScannerProps {
  onDetect: (barcode: string) => void;
}

export function BarcodeScanner({ onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const detectedRef = useRef(false);
  const { t } = useLanguage();

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);

  const startScanning = useCallback(
    async (deviceId?: string) => {
      setError(null);
      detectedRef.current = false;
      setIsStreaming(false);

      if (readerRef.current) {
        readerRef.current.reset();
      }

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const devices = allDevices
          .filter((d) => d.kind === "videoinput")
          .map((d) => ({ deviceId: d.deviceId, label: d.label } as MediaDeviceInfo));
        if (devices.length === 0) {
          setError(t.noCameraFound);
          return;
        }
        setCameras(devices);

        const selectedId =
          deviceId ??
          (devices.find((d) =>
            /back|rear|environment/i.test(d.label)
          )?.deviceId ?? devices[0].deviceId);

        await reader.decodeFromVideoDevice(
          selectedId,
          videoRef.current!,
          (result, err) => {
            if (result && !detectedRef.current) {
              detectedRef.current = true;
              readerRef.current?.reset();
              onDetect(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              // ignore NotFoundException — no barcode in frame yet
            }
          }
        );

        setIsStreaming(true);
      } catch {
        setError(t.cameraError);
      }
    },
    [onDetect, t]
  );

  useEffect(() => {
    startScanning();
    return () => {
      readerRef.current?.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const next = (cameraIndex + 1) % cameras.length;
    setCameraIndex(next);
    await startScanning(cameras[next].deviceId);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black aspect-4/3">
        {!isStreaming && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <p className="text-sm opacity-75">{error}</p>
            <button
              onClick={() => startScanning()}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
            >
              {t.retry}
            </button>
          </div>
        )}

        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

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

        {cameras.length > 1 && (
          <button
            onClick={switchCamera}
            className="absolute top-3 right-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
            title={t.switchCamera}
          >
            <RotateCcw className="size-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {t.barcodeInstructions}
      </p>
    </div>
  );
}
