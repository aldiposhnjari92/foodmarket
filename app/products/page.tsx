"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Trash2, Package, Loader2, Search, PlusCircle } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, deleteProduct, Product } from "@/lib/products";
import { getAllUserRoles, UserRole } from "@/lib/user-roles";
import { getProductImageUrl } from "@/lib/storage";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function ProductsPage() {
  const { t } = useLanguage();
  const { role, userId, can } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [userById, setUserById] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = role === "admin";
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ── Pagination ──
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const [pageSize, setPageSize] = useState(() => typeof sessionStorage !== "undefined" ? Number(sessionStorage.getItem("products_pageSize")) || 10 : 10);
  const [page, setPage] = useState(() => typeof sessionStorage !== "undefined" ? Number(sessionStorage.getItem("products_page")) || 1 : 1);

  // Keep sessionStorage in sync
  useEffect(() => {
    sessionStorage.setItem("products_pageSize", String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    sessionStorage.setItem("products_page", String(page));
  }, [page]);

  useEffect(() => {
    if (role === null) return;
    const ownerId = role === "admin" ? undefined : userId ?? undefined;
    const fetches: Promise<unknown>[] = [getProducts(ownerId).then(setProducts)];
    if (role === "admin") {
      fetches.push(getAllUserRoles().then((roles) =>
        setUserById(Object.fromEntries(roles.map((u) => [u.user_id, u])))
      ));
    }
    Promise.all(fetches).finally(() => setLoading(false));
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const pagedProducts = filtered.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-4">

        {/* Page header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
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

        {/* Search */}
        <div className="shrink-0 relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>

        {/* Table — fills remaining vertical space */}
        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-muted-foreground">
            <Package className="size-8 opacity-40" />
            <p className="text-sm">
              {search ? t.noProductsMatching(search) : t.noProductsAdd}
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="sticky top-0 left-0 z-30 bg-muted w-18 h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap hidden sm:table-cell" />
                  <th className="sticky top-0 left-0 sm:left-18 z-30 bg-muted w-32.5 sm:w-50 h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap border-r border-border">{t.colName}</th>
                  <th className="sticky top-0 z-20 bg-muted h-10 px-4 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">{t.colPrice}</th>
                  <th className="sticky top-0 z-20 bg-muted h-10 px-4 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">{t.colStock}</th>
                  <th className="sticky top-0 z-20 bg-muted h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">{t.colDateAdded}</th>
                  {isAdmin && <th className="sticky top-0 z-20 bg-muted h-10 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">{t.colAddedBy}</th>}
                  <th className="sticky top-0 z-20 bg-muted h-10 px-4" />
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((product) => (
                  <tr key={product.$id} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                    <td className="sticky left-0 z-10 bg-background w-18 p-2 px-4 align-middle hidden sm:table-cell">
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
                    </td>
                    <td className="sticky left-0 sm:left-18 z-10 bg-background w-32.5 sm:w-50 p-2 px-4 align-middle font-medium border-r border-border">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          href={`/products/${product.$id}`}
                          className="truncate hover:text-primary hover:underline transition-colors"
                        >
                          {product.name}
                        </Link>
                        {product.is_package && (
                          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                            {t.packageBadge}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 px-4 align-middle text-right text-muted-foreground">
                      L {product.price.toFixed(2)}
                      {product.is_package && (
                        <span className="block text-xs">/pc</span>
                      )}
                    </td>
                    <td className="p-2 px-4 align-middle text-right text-muted-foreground">
                      {product.quantity}
                    </td>
                    <td className="p-2 px-4 align-middle text-muted-foreground">
                      {new Date(product.$createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    {isAdmin && (
                      <td className="p-2 px-4 align-middle text-muted-foreground">
                        {product.created_by ? (userById[product.created_by]?.name ?? "—") : "—"}
                      </td>
                    )}
                    <td className="p-2 px-4 align-middle text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginator — always at the bottom */}
        {!loading && filtered.length > 0 && (
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t.rowsPerPage}</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
              >
                <SelectTrigger size="sm" className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>
                {(effectivePage - 1) * pageSize + 1}–{Math.min(effectivePage * pageSize, filtered.length)} of {filtered.length}
              </span>
            </div>

            {totalPages > 1 && (
              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={effectivePage === 1}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                    const showPage =
                      n === 1 ||
                      n === totalPages ||
                      (n >= effectivePage - 1 && n <= effectivePage + 1);
                    const showLeadingEllipsis = n === effectivePage - 2 && effectivePage - 2 > 1;
                    const showTrailingEllipsis = n === effectivePage + 2 && effectivePage + 2 < totalPages;

                    if (showLeadingEllipsis || showTrailingEllipsis) {
                      return (
                        <PaginationItem key={`ellipsis-${n}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    if (!showPage) return null;
                    return (
                      <PaginationItem key={n}>
                        <PaginationLink
                          isActive={n === effectivePage}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={effectivePage === totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
