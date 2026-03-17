"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Save, Loader2, Package, Plus } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProduct, updateProduct, deleteProduct, Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { can } = useRole();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Restock state
  const [addQty, setAddQty] = useState("");
  const [addingStock, setAddingStock] = useState(false);
  const [stockAdded, setStockAdded] = useState(false);

  useEffect(() => {
    getProduct(id)
      .then((p) => {
        setProduct(p);
        setName(p.name);
        setPrice(p.price.toString());
        setQty(p.quantity.toString());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const isDirty =
    product !== null &&
    (name !== product.name ||
      price !== product.price.toString() ||
      qty !== product.quantity.toString());

  const handleSave = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaveError(null);

    const parsedPrice = parseFloat(price);
    const parsedQty = parseInt(qty, 10);

    if (!name.trim()) {
      setSaveError(t.nameRequired);
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setSaveError(t.errValidPrice);
      return;
    }

    if (isNaN(parsedQty) || parsedQty < 0) {
      setSaveError(t.errValidPrice);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateProduct(id, name.trim(), parsedPrice, undefined, parsedQty);
      setProduct(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError(t.saveChangesFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStock = async () => {
    if (!product) return;
    const n = parseInt(addQty, 10);
    if (isNaN(n) || n < 1) return;
    setAddingStock(true);
    try {
      const updated = await updateProduct(
        id,
        product.name,
        product.price,
        product.image_id,
        product.quantity + n
      );
      setProduct(updated);
      setQty(updated.quantity.toString());
      setAddQty("");
      setStockAdded(true);
      setTimeout(() => setStockAdded(false), 2500);
    } catch {
      // silent — user can retry
    } finally {
      setAddingStock(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;

    setDeleting(true);
    try {
      await deleteProduct(id, product.image_id);
      router.push("/products");
    } catch {
      setDeleting(false);
      setDeleteDialogOpen(false);
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
                <Image
                  src={getProductImageUrl(product!.image_id)}
                  alt={product!.name}
                  className="h-full w-full object-cover"
                  width={400}
                  height={300}
                />
              </div>
            ) : (
              <div className="flex w-full h-40 items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30">
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

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{t.currentPrice}</p>
                <p className="text-2xl font-bold">L {product!.price.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{t.colStock}</p>
                <p className="text-2xl font-bold">{product!.quantity}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">{t.productId}</p>
                <p className="text-xs font-mono text-muted-foreground break-all mt-1">
                  {product!.$id}
                </p>
              </div>
            </div>

            {can("products_edit") && <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-2xl border border-border p-5">
              <h2 className="font-semibold">{t.editDetails}</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.productName}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setSaved(false);
                  }}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.priceLabel}</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setSaved(false);
                  }}
                  step="0.01"
                  min="0"
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.quantity}</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => {
                    setQty(e.target.value);
                    setSaved(false);
                  }}
                  step="1"
                  min="0"
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
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
                  <>
                    <Loader2 className="size-4 animate-spin" /> {t.saving}
                  </>
                ) : saved ? (
                  t.saved
                ) : (
                  <>
                    <Save className="size-4" /> {t.saveChanges}
                  </>
                )}
              </button>
            </form>}

            {/* Restock section — admin + manager */}
            {can("products_add") && <div className="rounded-2xl border border-border p-5 flex flex-col gap-4">
              <div>
                <h2 className="font-semibold">{t.restockTitle}</h2>
                <p className="text-sm text-muted-foreground">{t.restockDesc}</p>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-sm font-medium">{t.addUnits}</label>
                  <input
                    type="number"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                    placeholder={t.addUnitsPlaceholder}
                    min="1"
                    step="1"
                    className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                  />
                </div>
                {addQty && parseInt(addQty) > 0 && product && (
                  <p className="text-sm text-muted-foreground pb-2.5 shrink-0">
                    {t.newStockTotal(product.quantity + parseInt(addQty))}
                  </p>
                )}
              </div>

              {stockAdded && (
                <p className="rounded-lg bg-green-500/10 px-4 py-2.5 text-sm text-green-600 font-medium">
                  {t.stockAdded}
                </p>
              )}

              <button
                type="button"
                onClick={handleAddStock}
                disabled={addingStock || !addQty || parseInt(addQty) < 1}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all",
                  addingStock || !addQty || parseInt(addQty) < 1
                    ? "bg-primary/40 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90"
                )}
              >
                {addingStock ? (
                  <><Loader2 className="size-4 animate-spin" /> {t.addingStock}</>
                ) : (
                  <><Plus className="size-4" /> {t.addStockBtn}</>
                )}
              </button>
            </div>}

            {can("products_delete") && <div className="rounded-2xl border border-destructive/30 p-5">
              <h2 className="font-semibold text-destructive mb-1">{t.dangerZone}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t.dangerDesc}</p>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {t.deleting}
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" /> {t.deleteProduct}
                    </>
                  )}
                </button>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.deleteProduct}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.deleteConfirm(product?.name ?? "")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      {t.cancel ?? "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> {t.deleting}
                        </>
                      ) : (
                        t.deleteProduct
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>}
          </div>
        )}
      </div>
    </AppLayout>
  );
}