"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Trash2, Package, Loader2, Search } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, deleteProduct, Product } from "@/lib/products";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.$id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">
              {products.length} item{products.length !== 1 ? "s" : ""} in stock
            </p>
          </div>
          <Link
            href="/scan"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ScanLine className="size-4" />
            Add Product
          </Link>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  Date Added
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center text-muted-foreground">
                    <Loader2 className="inline size-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="size-8 opacity-40" />
                      <p className="text-sm">
                        {search ? `No products matching "${search}"` : "No products yet. Scan one to add it!"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((product, i) => (
                  <tr
                    key={product.$id}
                    className={cn(
                      "border-t border-border transition-colors hover:bg-muted/30",
                      i % 2 !== 0 && "bg-muted/10"
                    )}
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/products/${product.$id}`} className="hover:text-primary hover:underline transition-colors">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">${product.price.toFixed(2)}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {new Date(product.$createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(product.$id)}
                        disabled={deletingId === product.$id}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        {deletingId === product.$id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
