"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
}

export function CameraCapture({ onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { t } = useLanguage();

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setError(null);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (!cancelled) setIsStreaming(true);
        }
      } catch {
        if (!cancelled) {
          setError(t.cameraError);
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, retryCount, t]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black aspect-4/3">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <Camera className="size-10 opacity-50" />
            <p className="text-sm opacity-75">{error}</p>
            <button
              onClick={() => setRetryCount((n) => n + 1)}
              className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30 transition-colors"
            >
              {t.retry}
            </button>
          </div>
        ) : (
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        )}

        {isStreaming && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-6 rounded-xl border-2 border-white/40" />
          </div>
        )}

        <button
          onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
          className="absolute top-3 right-3 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
          title={t.switchCamera}
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <button
        onClick={capturePhoto}
        disabled={!isStreaming || !!error}
        className={cn(
          "flex items-center gap-2 rounded-full px-8 py-3 font-semibold text-white transition-all",
          !isStreaming || !!error
            ? "bg-primary/50 cursor-not-allowed"
            : "bg-primary hover:bg-primary/90 active:scale-95"
        )}
      >
        <Camera className="size-5" />
        {t.capturePhoto}
      </button>
    </div>
  );
}
