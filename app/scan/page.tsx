"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Barcode, Camera } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { CameraCapture } from "@/components/camera-capture";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { createProduct } from "@/lib/products";
import { uploadProductImage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import { AccessDenied } from "@/components/app-layout";


type Mode = "barcode" | "photo";
type Step = "scan" | "confirm";

export default function ScanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { userId, can, roleLoading } = useRole();
  const isManual = searchParams.get("manual") === "true";
  const [mode, setMode] = useState<Mode>("barcode");
  const [step, setStep] = useState<Step>(isManual ? "confirm" : "scan");

  useEffect(() => {
    if (isManual) setStep("confirm");
  }, [isManual]);

  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const [lookingUp, setLookingUp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setStep("scan");
    setProductName("");
    setPrice("");
    setQuantity("1");
    setCapturedImage(null);
    setError(null);
  };

  const handleBarcodeDetect = async (barcode: string) => {
    setLookingUp(true);
    setProductName(barcode);
    try {
      const res = await fetch(`/api/lookup-barcode?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      setProductName(data.productName || barcode);
    } catch {
      setProductName(barcode);
    } finally {
      setLookingUp(false);
      setStep("confirm");
    }
  };

  const handlePhotoCapture = (imageDataUrl: string) => {
    setCapturedImage(imageDataUrl);
    setStep("confirm");
  };

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(quantity, 10);
    if (!productName.trim()) { setError(t.errNameRequired); return; }
    if (isNaN(parsedPrice) || parsedPrice < 0) { setError(t.errValidPrice); return; }
    if (isNaN(parsedQty) || parsedQty < 1) { setError(t.errValidPrice); return; }

    setSaving(true);
    try {
      let imageId: string | undefined;
      if (capturedImage) {
        imageId = await uploadProductImage(capturedImage);
      }
      await createProduct(productName.trim(), parsedPrice, imageId, parsedQty, userId ?? undefined);
      router.push("/products");
    } catch {
      setError(t.errSaveFailed);
      setSaving(false);
    }
  };

  if (!roleLoading && !can("products_add")) {
    return <AppLayout><AccessDenied /></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {step === "scan" ? t.addProductTitle : t.confirmProduct}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === "scan" ? t.scanDesc : t.confirmDesc}
          </p>
        </div>

        {step === "scan" && (
          <>
            <div className="mb-5 flex overflow-hidden rounded-xl border border-border">
              {(["barcode", "photo"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {m === "barcode" ? <Barcode className="size-4" /> : <Camera className="size-4" />}
                  {m === "barcode" ? t.scanBarcode : t.takePhoto}
                </button>
              ))}
            </div>

            {lookingUp ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">{t.lookingUp}</span>
              </div>
            ) : mode === "barcode" ? (
              <BarcodeScanner onDetect={handleBarcodeDetect} />
            ) : (
              <CameraCapture onCapture={handlePhotoCapture} />
            )}
          </>
        )}

        {step === "confirm" && (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {capturedImage && (
              <div className="overflow-hidden rounded-2xl border border-border aspect-4/3">
                <img src={capturedImage} alt="Captured" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.productName}</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t.productNamePlaceholder}
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.priceLabel}</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.quantity}</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                step="1"
                min="1"
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                {mode === "barcode" ? t.rescan : t.retake}
              </button>
              <button
                type="submit"
                disabled={saving}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all",
                  saving ? "bg-primary/60 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
                )}
              >
                {saving ? (
                  <><Loader2 className="size-4 animate-spin" /> {t.saving}</>
                ) : (
                  <><CheckCircle2 className="size-4" /> {t.saveProduct}</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
