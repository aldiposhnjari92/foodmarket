"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanLine, Package, DollarSign, ShoppingCart, BarChart3, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, Product } from "@/lib/products";
import { useRole } from "@/contexts/role-context";
import { getSalesTotals } from "@/lib/sales";
import { getAllUserRoles } from "@/lib/user-roles";
import { getProductImageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useLanguage } from "@/contexts/language-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function DashboardPage() {
  const { t } = useLanguage();
  const { role, userId } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unitsSold, setUnitsSold] = useState<number | null>(null);
  const [revenue, setRevenue] = useState<number | null>(null);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [selectedSeller, setSelectedSeller] = useState("");

  const isAdmin = role === "admin";

  useEffect(() => {
    if (!role) return;
    const ownerId = isAdmin ? undefined : userId ?? undefined;
    getProducts(ownerId)
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));

    if (isAdmin) {
      getAllUserRoles()
        .then((rows) => setSellers(rows.map((r) => ({ id: r.user_id, name: r.name || r.email }))))
        .catch(() => {});
    }
  }, [role, userId, isAdmin]);

  useEffect(() => {
    if (!role) return;
    const sellerId = isAdmin ? (selectedSeller || undefined) : (userId ?? undefined);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    getSalesTotals(sellerId, todayStart.toISOString(), todayEnd.toISOString())
      .then(({ unitsSold, revenue }) => {
        setUnitsSold(unitsSold);
        setRevenue(revenue);
      })
      .catch(() => {
        setUnitsSold(0);
        setRevenue(0);
      });
  }, [role, userId, isAdmin, selectedSeller]);

  const totalValue = products.reduce((sum, p) => sum + p.price, 0);
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

        {/* Admin: seller picker to scope stats */}
        {isAdmin && sellers.length > 0 && (
          <Select
            value={selectedSeller || "__all__"}
            onValueChange={(v) => setSelectedSeller(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t.allSellers} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t.allSellers}</SelectItem>
              {sellers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Package} label={t.totalProducts} value={loading ? null : products.length.toString()} />
          <StatCard icon={DollarSign} label={t.totalValue} value={loading ? null : `L ${totalValue.toFixed(2)}`} />
          <StatCard
            icon={ShoppingCart}
            label={t.totalSold}
            value={unitsSold === null ? null : unitsSold.toString()}
            accent
          />
          <StatCard
            icon={BarChart3}
            label={t.totalRevenue}
            value={revenue === null ? null : `L ${revenue.toFixed(2)}`}
            accent
          />
        </div>

        {role !== "seller" && (
          <div>
            <h2 className="mb-3 font-semibold">{t.recentlyAdded}</h2>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> {t.loading}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noProductsStart}</p>
            ) : (
              <div className="rounded-xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-14" />
                      <TableHead>{t.colName}</TableHead>
                      <TableHead className="text-right">{t.colPrice}</TableHead>
                      <TableHead>{t.colDate}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((product) => (
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
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">L {product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(product.$createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-lg border p-4",
      accent ? "border-primary/20 bg-primary/5" : "border-border bg-card"
    )}>
      <div className={cn(
        "mb-2 flex items-center gap-2",
        accent ? "text-primary" : "text-muted-foreground"
      )}>
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
