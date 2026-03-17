"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Trash2, Package, Loader2, Search, PlusCircle } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, deleteProduct, Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductsPage() {
  const { t } = useLanguage();
  const { role, userId, can } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (role === null) return;
    const ownerId = role === "admin" ? undefined : userId ?? undefined;
    getProducts(ownerId)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [role, userId]);

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t.navProducts}</h1>
            <p className="text-sm text-muted-foreground">{t.itemsInStock(products.length)}</p>
          </div>
          {can("products_add") && (
            <div className="flex items-center gap-2">
              <Button variant="outline" asChild>
                <Link href="/products/add-manual-order">
                  <PlusCircle />
                  {t.addManually}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/scan">
                  <ScanLine />
                  {t.addProduct}
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-14" />
                <TableHead>{t.colName}</TableHead>
                <TableHead className="text-right">{t.colPrice}</TableHead>
                <TableHead className="text-right">{t.colStock}</TableHead>
                <TableHead>{t.colDateAdded}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                    <Loader2 className="inline size-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="size-8 opacity-40" />
                      <p className="text-sm">
                        {search ? t.noProductsMatching(search) : t.noProductsAdd}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => (
                  <TableRow key={product.$id}>
                    <TableCell>
                      {product.image_id ? (
                        <div className="relative size-10 rounded-md overflow-hidden shrink-0">
                          <Image
                            src={getProductImageUrl(product.image_id)}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-10 rounded-md bg-muted flex items-center justify-center">
                          <Package className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/products/${product.$id}`}
                          className="hover:text-primary hover:underline transition-colors"
                        >
                          {product.name}
                        </Link>
                        {product.is_package && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide shrink-0">
                            {t.packageBadge}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      L {product.price.toFixed(2)}
                      {product.is_package && (
                        <span className="block text-xs text-muted-foreground">/pc</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(product.$createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {can("products_delete") && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(product.$id)}
                          disabled={deletingId === product.$id}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          {deletingId === product.$id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
