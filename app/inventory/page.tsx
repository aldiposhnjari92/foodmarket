"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronDown, ChevronUp, BarChart3, ShoppingCart, Receipt, User, CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AppLayout } from "@/components/app-layout";
import { getSales, Sale, SaleItem } from "@/lib/sales";
import { getProducts, Product } from "@/lib/products";
import { CustomerCombobox } from "@/components/customer-combobox";
import { getAllUserRoles } from "@/lib/user-roles";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import { AccessDenied } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DatePreset = "all" | "today" | "yesterday" | "week" | "month" | "custom";

type DatePresetDef = { value: DatePreset; tKey: "dateAll" | "dateToday" | "dateYesterday" | "dateWeek" | "dateMonth" | "dateCustom" };

const DATE_PRESETS: DatePresetDef[] = [
  { value: "all", tKey: "dateAll" },
  { value: "today", tKey: "dateToday" },
  { value: "yesterday", tKey: "dateYesterday" },
  { value: "week", tKey: "dateWeek" },
  { value: "month", tKey: "dateMonth" },
  { value: "custom", tKey: "dateCustom" },
];

function getPresetRange(preset: DatePreset): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (preset === "today") {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (preset === "yesterday") {
    const from = new Date(now); from.setDate(now.getDate() - 1); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setDate(now.getDate() - 1); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (preset === "week") {
    const from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  if (preset === "month") {
    const from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
    const to = new Date(now); to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  return { from: null, to: null };
}

export default function InventoryPage() {
  const { t } = useLanguage();
  const { role, userId, can, roleLoading } = useRole();
  const [sales, setSales] = useState<Sale[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customerFilter, setCustomerFilter] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [sellers, setSellers] = useState<{ id: string; name: string }[]>([]);
  const [sellerFilter, setSellerFilter] = useState("");
  const [openSellerCombo, setOpenSellerCombo] = useState(false);
  const [openFromPicker, setOpenFromPicker] = useState(false);
  const [openToPicker, setOpenToPicker] = useState(false);

  const isAdmin = role === "admin";

  useEffect(() => {
    if (roleLoading || !role) return;
    const sellerId = isAdmin ? undefined : (userId ?? undefined);
    getSales(sellerId)
      .then(setSales)
      .catch(() => setSales([]))
      .finally(() => setLoading(false));

    getProducts().then((products) => {
      const map: Record<string, Product> = {};
      for (const p of products) map[p.$id] = p;
      setProductMap(map);
    }).catch(() => {});

    if (isAdmin) {
      getAllUserRoles()
        .then((rows) => setSellers(rows.map((r) => ({ id: r.user_id, name: r.name || r.email }))))
        .catch(() => {});
    }
  }, [role, userId, isAdmin, roleLoading]);

  const customerNames = useMemo(() => {
    return sales
      .map((s) => s.buyer_name)
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  }, [sales]);

  const filtered = useMemo(() => {
    let result = sales;

    if (datePreset !== "all") {
      let from: Date | null = null;
      let to: Date | null = null;
      if (datePreset === "custom") {
        if (customFrom) { from = new Date(customFrom); from.setHours(0, 0, 0, 0); }
        if (customTo) { to = new Date(customTo); to.setHours(23, 59, 59, 999); }
      } else {
        ({ from, to } = getPresetRange(datePreset));
      }
      result = result.filter((s) => {
        const d = new Date(s.$createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    if (sellerFilter) {
      result = result.filter((s) => s.seller_id === sellerFilter);
    }

    if (customerFilter.trim()) {
      const q = customerFilter.toLowerCase();
      result = result.filter((s) => s.buyer_name.toLowerCase().includes(q));
    }

    return result;
  }, [sales, customerFilter, sellerFilter, datePreset, customFrom, customTo]);

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

        {/* Summary stats */}
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

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Seller filter — admin only */}
          {isAdmin && sellers.length > 0 && (
            <Popover open={openSellerCombo} onOpenChange={setOpenSellerCombo}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openSellerCombo}
                  className="w-44 justify-between"
                >
                  {sellerFilter
                    ? sellers.find((s) => s.id === sellerFilter)?.name
                    : t.allSellers}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-0">
                <Command>
                  <CommandInput placeholder={t.allSellers} />
                  <CommandList>
                    <CommandEmpty>{t.noResults}</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__all__"
                        onSelect={() => { setSellerFilter(""); setOpenSellerCombo(false); }}
                      >
                        <Check className={cn("mr-2 size-4", !sellerFilter ? "opacity-100" : "opacity-0")} />
                        {t.allSellers}
                      </CommandItem>
                      {sellers.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.name}
                          onSelect={() => { setSellerFilter(s.id); setOpenSellerCombo(false); }}
                        >
                          <Check className={cn("mr-2 size-4", sellerFilter === s.id ? "opacity-100" : "opacity-0")} />
                          {s.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Date preset buttons */}
          <div className="flex flex-wrap gap-1.5">
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={datePreset === p.value ? "default" : "outline"}
                onClick={() => setDatePreset(p.value)}
              >
                {t[p.tKey]}
              </Button>
            ))}
          </div>

          {/* Custom date range */}
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <Popover open={openFromPicker} onOpenChange={setOpenFromPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-36 justify-start text-left font-normal", !customFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {customFrom ? format(customFrom, "dd MMM yyyy") : t.dateFrom}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customFrom} onSelect={(d) => { setCustomFrom(d); setOpenFromPicker(false); }} disabled={customTo ? { after: customTo } : undefined} />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">{t.dateRangeTo}</span>
              <Popover open={openToPicker} onOpenChange={setOpenToPicker}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn("w-36 justify-start text-left font-normal", !customTo && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {customTo ? format(customTo, "dd MMM yyyy") : t.dateTo}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customTo} onSelect={(d) => { setCustomTo(d); setOpenToPicker(false); }} disabled={customFrom ? { before: customFrom } : undefined} />
                </PopoverContent>
              </Popover>
              {(customFrom || customTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); }}
                >
                  {t.clear}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Customer filter */}
        <div className="flex items-center gap-3">
          <CustomerCombobox
            value={customerFilter}
            onChange={setCustomerFilter}
            suggestions={customerNames}
            placeholder={t.filterByCustomer}
            className="max-w-sm flex-1"
          />
          {customerFilter && (
            <span className="text-sm text-muted-foreground">
              {t.filterResults(filtered.length)}
            </span>
          )}
        </div>

        {/* Sales history table */}
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
          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>{t.invoiceNo}</TableHead>
                  <TableHead>{t.saleDate}</TableHead>
                  <TableHead>{t.customer}</TableHead>
                  <TableHead>{t.seller}</TableHead>
                  <TableHead className="text-right">{t.itemsCount}</TableHead>
                  <TableHead className="text-right">{t.revenue}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sale, i) => {
                  let saleItems: SaleItem[] = [];
                  try { saleItems = JSON.parse(sale.items_json); } catch { /* skip */ }
                  const isExpanded = expandedId === sale.$id;

                  return (
                    <React.Fragment key={sale.$id}>
                      <TableRow
                        className={cn(
                          "cursor-pointer",
                          i % 2 !== 0 && "bg-muted/10"
                        )}
                        onClick={() => toggleExpand(sale.$id)}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {sale.invoice_number}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="whitespace-nowrap">
                            {new Date(sale.$createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="ml-2 text-xs">
                            {new Date(sale.$createdAt).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sale.buyer_name ? (
                            <span className="flex items-center gap-1.5">
                              <User className="size-3 text-muted-foreground shrink-0" />
                              {sale.buyer_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sale.seller_name || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {saleItems.reduce((s, i) => s + i.qty_sold, 0)} {t.soldItems}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          L {sale.grand_total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {isExpanded ? (
                            <ChevronUp className="size-4 ml-auto" />
                          ) : (
                            <ChevronDown className="size-4 ml-auto" />
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-muted/5 hover:bg-muted/5">
                          <TableCell colSpan={7} className="px-6 py-4">
                            {(sale.buyer_name || sale.seller_name) && (
                              <div className="flex flex-wrap gap-6 mb-3 pb-3 border-b border-border text-xs text-muted-foreground">
                                {sale.seller_name && (
                                  <span><span className="font-semibold">{t.soldBy}:</span> {sale.seller_name}</span>
                                )}
                                {sale.buyer_name && (
                                  <span><span className="font-semibold">{t.soldTo}:</span> {sale.buyer_name}</span>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col gap-1">
                              {saleItems.map((item, idx) => {
                                // Fall back to current product data for sales recorded before package support
                                const currentProduct = productMap[item.product_id];
                                const isPkg = item.is_package ?? currentProduct?.is_package ?? false;
                                const piecesPerPkg = item.pieces_per_package ?? currentProduct?.pieces_per_package;
                                return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between py-1 text-sm"
                                >
                                  <span className="text-foreground">
                                    {item.product_name}
                                    {isPkg && (
                                      <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wide">
                                        {t.packageBadge}
                                      </span>
                                    )}
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      ×{item.qty_sold}
                                      {isPkg && piecesPerPkg
                                        ? ` ${t.packageType.toLowerCase()} (${item.qty_sold * piecesPerPkg} ${t.piecesLabel(item.qty_sold * piecesPerPkg).split(" ")[1]})`
                                        : ""
                                      }
                                      {" @ L "}{item.unit_price.toFixed(2)}
                                      {isPkg ? `/${t.packageType.toLowerCase()}` : ""}
                                    </span>
                                  </span>
                                  <span className="font-medium tabular-nums">
                                    L {item.total.toFixed(2)}
                                  </span>
                                </div>
                                );
                              })}
                              <div className="mt-2 pt-2 border-t border-border">
                                <div className="flex justify-between text-sm font-bold">
                                  <span>{t.grandTotal}</span>
                                  <span>L {sale.grand_total.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      )}
    </AppLayout>
  );
}
