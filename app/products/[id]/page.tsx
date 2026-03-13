"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Save, Loader2, Package } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProduct, updateProduct, deleteProduct, Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

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
    if (!name.trim()) { setSaveError("Name is required."); return; }
    if (isNaN(parsedPrice) || parsedPrice < 0) { setSaveError("Enter a valid price."); return; }

    setSaving(true);
    try {
      const updated = await updateProduct(id, name.trim(), parsedPrice);
      setProduct(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${product?.name}"? This cannot be undone.`)) return;
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
        {/* Back */}
        <Link
          href="/products"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Products
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
            <Package className="size-10 opacity-40" />
            <p className="text-sm">Product not found.</p>
            <Link href="/products" className="text-sm text-primary hover:underline">
              Go back
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Product image */}
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
                  <p className="text-xs">No photo</p>
                </div>
              </div>
            )}

            <div>
              <h1 className="text-2xl font-bold">{product!.name}</h1>
              <p className="text-sm text-muted-foreground">
                Added{" "}
                {new Date(product!.$createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                <p className="text-2xl font-bold">${product!.price.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Product ID</p>
                <p className="text-xs font-mono text-muted-foreground break-all mt-1">{product!.$id}</p>
              </div>
            </div>

            {/* Edit form */}
            <form onSubmit={handleSave} className="flex flex-col gap-4 rounded-2xl border border-border p-5">
              <h2 className="font-semibold">Edit Details</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Product Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setSaved(false); }}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Price ($)</label>
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
                  <><Loader2 className="size-4 animate-spin" /> Saving…</>
                ) : saved ? (
                  "Saved!"
                ) : (
                  <><Save className="size-4" /> Save Changes</>
                )}
              </button>
            </form>

            {/* Danger zone */}
            <div className="rounded-2xl border border-destructive/30 p-5">
              <h2 className="font-semibold text-destructive mb-1">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently remove this product from inventory.
              </p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <><Loader2 className="size-4 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="size-4" /> Delete Product</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
