"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronDown, ChevronUp, BarChart3, ShoppingCart, Receipt, Search, User, X } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getSales, Sale, SaleItem } from "@/lib/sales";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import { AccessDenied } from "@/components/app-layout";

export default function InventoryPage() {
  const { t } = useLanguage();
  const { can, roleLoading } = useRole();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState("");

  useEffect(() => {
    getSales()
      .then(setSales)
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  // Unique customer names for the suggestion list
  const customerNames = useMemo(() => {
    const names = sales
      .map((s) => s.buyer_name)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
    return names;
  }, [sales]);

  const filtered = useMemo(() => {
    if (!customerFilter.trim()) return sales;
    const q = customerFilter.toLowerCase();
    return sales.filter((s) => s.buyer_name.toLowerCase().includes(q));
  }, [sales, customerFilter]);

  const totalRevenue = filtered.reduce((s, sale) => s + sale.grand_total, 0);
  const totalUnits = filtered.reduce((s, sale) => {
    try {
      const items: SaleItem[] = JSON.parse(sale.items_json);
      return s + items.reduce((n, i) => n + i.qty_sold, 0);
    } catch {
      return s;
    }
  }, 0);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AppLayout>
      {!roleLoading && !can("inventory") ? <AccessDenied /> : (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">{t.inventoryTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.inventoryDesc}</p>
        </div>

        {/* Summary stats — reflect current filter */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Receipt className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{t.invoiceTitle}</span>
            </div>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            ) : (
              <p className="text-2xl font-bold">{filtered.length}</p>
            )}
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <ShoppingCart className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{t.totalSold}</span>
            </div>
            {loading ? (
              <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
            ) : (
              <p className="text-2xl font-bold">{totalUnits}</p>
            )}
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <BarChart3 className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wide">{t.totalRevenue}</span>
            </div>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            ) : (
              <p className="text-2xl font-bold">L {totalRevenue.toFixed(2)}</p>
            )}
          </div>
        </div>

        {/* Customer filter */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                placeholder={t.filterByCustomer}
                className="w-full rounded-xl border border-input bg-background pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              />
              {customerFilter && (
                <button
                  onClick={() => setCustomerFilter("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {customerFilter && (
              <span className="text-sm text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "result" : "results"}
              </span>
            )}
          </div>

          {/* Quick-pick customer chips */}
          {customerNames.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customerFilter && (
                <button
                  onClick={() => setCustomerFilter("")}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  {t.allCustomers}
                </button>
              )}
              {customerNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setCustomerFilter(name === customerFilter ? "" : name)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    customerFilter === name
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <User className="size-3" />
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sales history table */}
        <div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Receipt className="size-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">
                {customerFilter ? t.noProductsMatching(customerFilter) : t.noSalesYet}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.invoiceNo}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.saleDate}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">{t.customer}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t.seller}</th>
                    <th className="hidden px-4 py-3 text-right font-medium text-muted-foreground sm:table-cell">{t.itemsCount}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t.revenue}</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sale, i) => {
                    let saleItems: SaleItem[] = [];
                    try { saleItems = JSON.parse(sale.items_json); } catch { /* skip */ }
                    const isExpanded = expandedId === sale.$id;

                    return (
                      <React.Fragment key={sale.$id}>
                        <tr
                          className={cn(
                            "border-t border-border cursor-pointer hover:bg-muted/30 transition-colors",
                            i % 2 !== 0 && "bg-muted/10"
                          )}
                          onClick={() => toggleExpand(sale.$id)}
                        >
                          <td className="px-4 py-3 font-medium font-mono text-xs">
                            {sale.invoice_number}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(sale.$createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            <span className="ml-2 text-xs">
                              {new Date(sale.$createdAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            {sale.buyer_name ? (
                              <span className="flex items-center gap-1.5">
                                <User className="size-3 text-muted-foreground shrink-0" />
                                {sale.buyer_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                            {sale.seller_name || "—"}
                          </td>
                          <td className="hidden px-4 py-3 text-right sm:table-cell">
                            {saleItems.reduce((s, i) => s + i.qty_sold, 0)} {t.soldItems}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            L {sale.grand_total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {isExpanded ? (
                              <ChevronUp className="size-4 ml-auto" />
                            ) : (
                              <ChevronDown className="size-4 ml-auto" />
                            )}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr key={`${sale.$id}-detail`} className="border-t border-border bg-muted/5">
                            <td colSpan={7} className="px-6 py-4">
                              {/* Parties row */}
                              {(sale.buyer_name || sale.seller_name) && (
                                <div className="flex gap-6 mb-3 pb-3 border-b border-border text-xs text-muted-foreground">
                                  {sale.seller_name && (
                                    <span><span className="font-semibold">{t.soldBy}:</span> {sale.seller_name}</span>
                                  )}
                                  {sale.buyer_name && (
                                    <span><span className="font-semibold">{t.soldTo}:</span> {sale.buyer_name}</span>
                                  )}
                                </div>
                              )}
                              {/* Items */}
                              <div className="flex flex-col gap-1">
                                {saleItems.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between py-1 text-sm"
                                  >
                                    <span className="text-foreground">
                                      {item.product_name}
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        ×{item.qty_sold} @ L {item.unit_price.toFixed(2)}
                                      </span>
                                    </span>
                                    <span className="font-medium tabular-nums">
                                      L {item.total.toFixed(2)}
                                    </span>
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-border">
                                  <div className="flex justify-between text-sm font-bold">
                                    <span>{t.grandTotal}</span>
                                    <span>L {sale.grand_total.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      )}
    </AppLayout>
  );
}
