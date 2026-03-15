"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Trash2, Package, Loader2, Search } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, deleteProduct, Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";

export default function ProductsPage() {
  const { t } = useLanguage();
  const { can } = useRole();
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
    const imageId = products.find((p) => p.$id === id)?.image_id;
    try {
      await deleteProduct(id, imageId);
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
            <h1 className="text-2xl font-bold">{t.navProducts}</h1>
            <p className="text-sm text-muted-foreground">{t.itemsInStock(products.length)}</p>
          </div>
          {can("products_add") && (
            <Link
              href="/scan"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ScanLine className="size-4" />
              {t.addProduct}
            </Link>
          )}
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all placeholder:text-muted-foreground"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10" />
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.colName}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.colPrice}</th>
                <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell">{t.colStock}</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                  {t.colDateAdded}
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center text-muted-foreground">
                    <Loader2 className="inline size-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="size-8 opacity-40" />
                      <p className="text-sm">
                        {search ? t.noProductsMatching(search) : t.noProductsAdd}
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
                    <td className="px-4 py-3">
                      {product.image_id ? (
                        <div className="relative size-15 rounded-md overflow-hidden shrink-0">
                          <Image
                            src={getProductImageUrl(product.image_id)}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-15 rounded-md bg-muted flex items-center justify-center">
                          <Package className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/products/${product.$id}`} className="hover:text-primary hover:underline transition-colors">
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">L {product.price.toFixed(2)}</td>
                    <td className="hidden px-4 py-3 text-right sm:table-cell">{product.quantity}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                      {new Date(product.$createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {can("products_delete") && (
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
                      )}
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
