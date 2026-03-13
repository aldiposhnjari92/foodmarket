"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Save, Loader2, Package } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProduct, updateProduct, deleteProduct, Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProduct(id)
      .then((p) => {
        setProduct(p);
        setName(p.name);
        setPrice(p.price.toString());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const isDirty =
    product !== null && (name !== product.name || price !== product.price.toString());

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError(null);
    const parsedPrice = parseFloat(price);
    if (!name.trim()) { setSaveError(t.nameRequired); return; }
    if (isNaN(parsedPrice) || parsedPrice < 0) { setSaveError(t.errValidPrice); return; }

    setSaving(true);
    try {
      const updated = await updateProduct(id, name.trim(), parsedPrice);
      setProduct(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError(t.saveChangesFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.deleteConfirm(product?.name ?? ""))) return;
    setDeleting(true);
    try {
      await deleteProduct(id);
      router.push("/products");
    } catch {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          {t.backToProducts}
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">{t.loading}</span>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Package className="size-10 opacity-40" />
            <p className="text-sm">{t.productNotFound}</p>
            <Link href="/products" className="text-sm text-primary hover:underline">
              {t.goBack}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {product!.image_id ? (
              <div className="overflow-hidden rounded-2xl border border-border aspect-4/3">
                <img
                  src={getProductImageUrl(product!.image_id)}
                  alt={product!.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-4/3 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Package className="size-10 opacity-30" />
                  <p className="text-xs">{t.noPhoto}</p>
                </div>
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold">{product!.name}</h1>
              <p className="text-sm text-muted-foreground">
                {t.added}{" "}
                {new Date(product!.$createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{t.currentPrice}</p>
                <p className="text-2xl font-bold">${product!.price.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{t.productId}</p>
                <p className="text-xs font-mono text-muted-foreground break-all mt-1">{product!.$id}</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-2xl border border-border p-5">
              <h2 className="font-semibold">{t.editDetails}</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.productName}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSaved(false); }}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.priceLabel}</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => { setPrice(e.target.value); setSaved(false); }}
                  step="0.01"
                  min="0"
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>

              {saveError && (
                <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {saveError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !isDirty}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all",
                  saved
                    ? "bg-green-500"
                    : saving || !isDirty
                    ? "bg-primary/40 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {saving ? (
                  <><Loader2 className="size-4 animate-spin" /> {t.saving}</>
                ) : saved ? (
                  t.saved
                ) : (
                  <><Save className="size-4" /> {t.saveChanges}</>
                )}
              </button>
            </form>

            <div className="rounded-2xl border border-destructive/30 p-5">
              <h2 className="font-semibold text-destructive mb-1">{t.dangerZone}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t.dangerDesc}</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <><Loader2 className="size-4 animate-spin" /> {t.deleting}</>
                ) : (
                  <><Trash2 className="size-4" /> {t.deleteProduct}</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
