"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { AccessDenied } from "@/components/app-layout";
import { createProduct } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AddManualOrderPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { userId, can, roleLoading } = useRole();

  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [productType, setProductType] = useState<"single" | "package">("single");
  const [piecesPerPkg, setPiecesPerPkg] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPackage = productType === "package";
  const parsedPieces = parseInt(piecesPerPkg, 10);
  const parsedPriceNum = parseFloat(price);
  const parsedQtyNum = parseInt(quantity, 10);
  const packageCost =
    isPackage && !isNaN(parsedPieces) && !isNaN(parsedPriceNum)
      ? parsedPieces * parsedPriceNum
      : null;

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) { setError(t.errNameRequired); return; }
    if (isNaN(parsedPriceNum) || parsedPriceNum < 0) { setError(t.errValidPrice); return; }
    if (isNaN(parsedQtyNum) || parsedQtyNum < 1) { setError(t.errValidPrice); return; }
    if (isPackage && (isNaN(parsedPieces) || parsedPieces < 1)) { setError(t.errValidPrice); return; }

    const totalQty = isPackage ? parsedQtyNum * parsedPieces : parsedQtyNum;

    setSaving(true);
    try {
      await createProduct(
        productName.trim(),
        parsedPriceNum,
        undefined,
        totalQty,
        userId ?? undefined,
        isPackage,
        isPackage ? parsedPieces : undefined,
        userId ?? undefined
      );
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
          <h1 className="text-2xl font-bold">{t.confirmProduct}</h1>
          <p className="text-sm text-muted-foreground">{t.confirmDesc}</p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Product Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.productName}</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={t.productNamePlaceholder}
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              required
              autoFocus
            />
          </div>

          {/* Product Type — shadcn Tabs */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">{t.productType}</label>
            <Tabs
              value={productType}
              onValueChange={(v) => {
                setProductType(v as "single" | "package");
                setPiecesPerPkg("");
              }}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger value="single" className="flex-1">
                  {t.singleUnit}
                </TabsTrigger>
                <TabsTrigger value="package" className="flex-1">
                  {t.packageType}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {isPackage
                ? t.priceLabel + " / " + t.singleUnit.toLowerCase()
                : t.priceLabel}
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              required
            />
          </div>

          {/* Pieces per Package */}
          {isPackage && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">{t.piecesPerPackage}</label>
              <input
                type="number"
                value={piecesPerPkg}
                onChange={(e) => setPiecesPerPkg(e.target.value)}
                placeholder={t.piecesPerPackagePlaceholder}
                step="1"
                min="1"
                className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                required
              />
              {packageCost !== null && (
                <p className="text-sm text-muted-foreground">
                  {t.packageCost}:{" "}
                  <span className="font-semibold text-foreground">
                    L {packageCost.toFixed(2)}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Quantity / Number of packages */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">
              {isPackage ? t.packagesToAdd : t.quantity}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
              step="1"
              min="1"
              className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              required
            />
            {isPackage && packageCost !== null && parsedQtyNum > 0 && (
              <p className="text-sm text-muted-foreground">
                {parsedQtyNum * parsedPieces}{" "}
                {t.piecesLabel(parsedQtyNum * parsedPieces).split(" ")[1]} · L{" "}
                {(parsedQtyNum * packageCost).toFixed(2)} total
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push("/products")}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              {t.cancel}
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
                <>
                  <Loader2 className="size-4 animate-spin" /> {t.saving}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> {t.saveProduct}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
