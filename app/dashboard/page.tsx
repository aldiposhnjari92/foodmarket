"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Package, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, Product } from "@/lib/products";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";

export default function DashboardPage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getProducts()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  const totalValue = products.reduce((sum, p) => sum + p.price, 0);
  const avgPrice = products.length > 0 ? totalValue / products.length : 0;
  const recent = products.slice(0, 5);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t.navDashboard}</h1>
            <p className="text-sm text-muted-foreground">{t.overviewInventory}</p>
          </div>
          <Link
            href="/scan"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ScanLine className="size-4" />
            {t.scanProduct}
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Package} label={t.totalProducts} value={loading ? null : products.length.toString()} />
          <StatCard icon={DollarSign} label={t.totalValue} value={loading ? null : `L ${totalValue.toFixed(2)}`} />
          <StatCard icon={TrendingUp} label={t.avgPrice} value={loading ? null : `L ${avgPrice.toFixed(2)}`} />
        </div>

        <div>
          <h2 className="mb-3 font-semibold">{t.recentlyAdded}</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t.loading}
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noProductsStart}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-14" />
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.colName}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.colPrice}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">
                      {t.colDate}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((product, i) => (
                    <tr
                      key={product.$id}
                      className={cn("border-t border-border", i % 2 !== 0 && "bg-muted/10")}
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
                      <td className="px-4 py-3 font-medium">{product.name}</td>
                      <td className="px-4 py-3 text-right">L {product.price.toFixed(2)}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {new Date(product.$createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      {value === null ? (
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
    </div>
  );
}
