"use client";

import { useEffect, useRef, useState } from "react";
import {
  Loader2,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle2,
  Search,
  Package,
  PenLine,
} from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { getProducts, sellProducts, Product } from "@/lib/products";
import { createSale, SaleItem } from "@/lib/sales";
import { getCustomers, Customer } from "@/lib/customers";
import { getCurrentUser } from "@/lib/auth";
import { CustomerCombobox } from "@/components/customer-combobox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";

interface InvoiceItem {
  product: Product;
  qtySold: number;
  customPrice?: number;  // invoice-only price, original price is preserved
  isManual?: boolean;    // manually added, not deducted from inventory
}

export default function InvoicePage() {
  const { t } = useLanguage();
  const { role, userId } = useRole();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual item form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQty, setManualQty] = useState("1");

  // Invoice parties
  const [buyerName, setBuyerName] = useState("");
  const [sellerName, setSellerName] = useState("");

  // Raw string state for number inputs — lets users clear and retype freely
  const [pendingQtys, setPendingQtys] = useState<Record<string, string>>({});
  const [rawQtys, setRawQtys] = useState<Record<string, string>>({});
  const [rawPrices, setRawPrices] = useState<Record<string, string>>({});

  // Buyer autocomplete
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customerNames = customers.map((c) => c.name);

  const invoiceNumber = useRef(`INV-${Date.now().toString().slice(-6)}`).current;
  const now = useRef(new Date()).current;
  const invoiceDate = now.toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const invoiceTime = now.toLocaleTimeString("sq-AL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    if (role === null) return;
    const ownerId = role === "admin" ? undefined : userId ?? undefined;
    getProducts(ownerId)
      .then(setProducts)
      .finally(() => setLoading(false));
    getCurrentUser().then((user) => {
      if (user?.name) setSellerName(user.name);
    });
  }, [role, userId]);

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Pending qty helpers (product list) ──────────────────────────────────────
  const getPendingQtyRaw = (id: string) => pendingQtys[id] ?? "1";

  const commitPendingQty = (id: string, stock: number) => {
    const raw = pendingQtys[id] ?? "1";
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) || n < 1 ? 1 : Math.min(n, stock);
    setPendingQtys((prev) => ({ ...prev, [id]: String(clamped) }));
  };

  // ── Add item ────────────────────────────────────────────────────────────────
  const addItem = (product: Product) => {
    const raw = pendingQtys[product.$id] ?? "1";
    const qty = Math.max(1, Math.min(parseInt(raw, 10) || 1, product.quantity));
    setItems((prev) => {
      const existing = prev.find((i) => i.product.$id === product.$id);
      if (existing) {
        return prev.map((i) =>
          i.product.$id === product.$id
            ? { ...i, qtySold: Math.min(i.qtySold + qty, i.product.quantity) }
            : i
        );
      }
      if (product.quantity < 1) return prev;
      return [...prev, { product, qtySold: qty }];
    });
  };

  const addManualItem = () => {
    const name = manualName.trim();
    const price = parseFloat(manualPrice);
    const qty = parseInt(manualQty, 10);
    if (!name || isNaN(price) || price < 0 || isNaN(qty) || qty < 1) return;

    const manualProduct: Product = {
      $id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      $createdAt: new Date().toISOString(),
      name,
      price,
      quantity: qty,
    };
    setItems((prev) => [...prev, { product: manualProduct, qtySold: qty, isManual: true }]);
    setManualName("");
    setManualPrice("");
    setManualQty("1");
    setShowManualForm(false);
  };

  // ── Line item qty ────────────────────────────────────────────────────────────
  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.$id !== id) return i;
          const max = i.isManual ? Infinity : i.product.quantity;
          return { ...i, qtySold: Math.max(0, Math.min(i.qtySold + delta, max)) };
        })
        .filter((i) => i.qtySold > 0)
    );
    // Sync raw display
    setRawQtys((prev) => {
      const item = items.find((i) => i.product.$id === id);
      if (!item) return prev;
      const max = item.isManual ? Infinity : item.product.quantity;
      const next = Math.max(0, Math.min(item.qtySold + delta, max));
      return { ...prev, [id]: String(next) };
    });
  };

  const commitQty = (id: string) => {
    const raw = rawQtys[id];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) {
      // Reset raw to current committed value
      const item = items.find((i) => i.product.$id === id);
      if (item) setRawQtys((prev) => ({ ...prev, [id]: String(item.qtySold) }));
      return;
    }
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.product.$id !== id) return i;
          const max = i.isManual ? Infinity : i.product.quantity;
          return { ...i, qtySold: Math.min(n, max) };
        })
        .filter((i) => i.qtySold > 0)
    );
  };

  const getQtyDisplay = (item: InvoiceItem) =>
    rawQtys[item.product.$id] !== undefined
      ? rawQtys[item.product.$id]
      : String(item.qtySold);

  // ── Line item price ──────────────────────────────────────────────────────────
  const getPriceDisplay = (item: InvoiceItem) =>
    rawPrices[item.product.$id] !== undefined
      ? rawPrices[item.product.$id]
      : item.customPrice !== undefined
      ? String(item.customPrice)
      : String(item.product.price);

  const commitPrice = (id: string) => {
    const raw = rawPrices[id];
    if (raw === undefined) return;
    const n = parseFloat(raw);
    setItems((prev) =>
      prev.map((i) =>
        i.product.$id === id
          ? { ...i, customPrice: isNaN(n) || raw === "" ? undefined : n }
          : i
      )
    );
    setRawPrices((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.product.$id !== id));
    setRawQtys((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setRawPrices((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const effectivePrice = (item: InvoiceItem) => {
    const raw = rawPrices[item.product.$id];
    if (raw !== undefined) {
      const n = parseFloat(raw);
      if (!isNaN(n)) return n;
    }
    return item.customPrice !== undefined ? item.customPrice : item.product.price;
  };

  const effectiveQty = (item: InvoiceItem) => {
    const raw = rawQtys[item.product.$id];
    if (raw !== undefined) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n > 0) return n;
    }
    return item.qtySold;
  };

  const grandTotal = items.reduce((sum, i) => sum + effectivePrice(i) * effectiveQty(i), 0);

  const handleConfirmSale = async (andPrint = false) => {
    if (items.length === 0) {
      setError(t.noItemsSelected);
      return;
    }
    setError(null);
    setConfirming(true);
    try {
      const inventoryItems = items.filter((i) => !i.isManual);
      if (inventoryItems.length > 0) {
        await sellProducts(
          inventoryItems.map((i) => ({
            id: i.product.$id,
            qtySold: i.qtySold,
            currentQty: i.product.quantity,
            imageId: i.product.image_id,
          }))
        );
      }

      const saleItems: SaleItem[] = items.map((i) => ({
        product_id: i.product.$id,
        product_name: i.product.name,
        qty_sold: i.qtySold,
        unit_price: effectivePrice(i),
        total: effectivePrice(i) * i.qtySold,
      }));
      try {
        await createSale(invoiceNumber, saleItems, grandTotal, 0, grandTotal, buyerName, sellerName, userId ?? "");
      } catch {
        // Sales table may not be configured yet — sale still counts for inventory
      }

      // Print before clearing items so the invoice still has content
      if (andPrint) window.print();

      setConfirmed(true);
      setItems([]);
      setRawQtys({});
      setRawPrices({});
      const ownerId = role === "admin" ? undefined : userId ?? undefined;
      const updated = await getProducts(ownerId);
      setProducts(updated);
      setTimeout(() => setConfirmed(false), 4000);
    } catch {
      setError(t.errSaveFailed);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <AppLayout>
      {/* Page header — hidden when printing */}
      <div className="print:hidden mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold">{t.invoiceTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.invoiceDesc}</p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Product selector ── */}
        <div className="print:hidden w-full xl:flex-1 xl:min-w-0">
          {/* Parties */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t.soldBy}
              </label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder={t.sellerPlaceholder}
                className="rounded-xl border border-input bg-background px-3 py-2 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t.soldTo}
              </label>
              <CustomerCombobox
                value={buyerName}
                onChange={setBuyerName}
                suggestions={customerNames}
                placeholder={t.buyerPlaceholder}
                className="[&_input]:py-2 [&_input]:rounded-xl"
              />
            </div>
          </div>

          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">{t.loading}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[40vh] sm:max-h-[50vh] xl:max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {search ? t.noProductsMatching(search) : t.noProductsAdd}
                </p>
              ) : (
                filtered.map((product) => {
                  const inCart = items.find((i) => i.product.$id === product.$id);
                  const noStock = product.quantity < 1;
                  return (
                    <div
                      key={product.$id}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-3 sm:px-4 py-2.5 transition-colors",
                        noStock
                          ? "border-border opacity-40"
                          : inCart
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          L {product.price.toFixed(2)} · {t.stockLabel}: {product.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        {inCart && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground font-medium">
                            ×{inCart.qtySold}
                          </span>
                        )}
                        {!noStock && (
                          <Input
                            type="number"
                            min="1"
                            max={product.quantity}
                            value={getPendingQtyRaw(product.$id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              setPendingQtys((prev) => ({ ...prev, [product.$id]: e.target.value }))
                            }
                            onBlur={() => commitPendingQty(product.$id, product.quantity)}
                            className="w-16 text-center tabular-nums"
                          />
                        )}
                        <button
                          onClick={() => !noStock && addItem(product)}
                          disabled={noStock}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            noStock ? "cursor-not-allowed" : "hover:bg-primary/10 text-primary"
                          )}
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Manual item form */}
          <div className="mt-4 border-t border-border pt-4">
            {showManualForm ? (
              <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">{t.manualItemTitle}</p>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder={t.productName}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder={t.priceLabel}
                    min="0"
                    step="0.01"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    placeholder={t.quantityLabel}
                    min="1"
                    step="1"
                    className="w-24"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addManualItem}
                    disabled={!manualName.trim() || !manualPrice}
                    className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    {t.addToInvoice}
                  </button>
                  <button
                    onClick={() => setShowManualForm(false)}
                    className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowManualForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <PenLine className="size-4" />
                {t.addManualItem}
              </button>
            )}
          </div>
        </div>

        {/* ── Invoice preview + actions ── */}
        <div className="w-full xl:w-[460px] shrink-0">
          {/* Printable invoice */}
          <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 print:rounded-none print:border-none print:shadow-none print:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-4 sm:mb-6 print:mb-10">
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight print:text-2xl">
                  {t.appName}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 print:text-sm">
                  {t.invoiceTitle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-semibold">
                  {t.invoiceNumber} {invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.invoiceDate}: {invoiceDate} {invoiceTime}
                </p>
              </div>
            </div>

            {/* Parties — shown when at least one is filled, always shown on print */}
            {(sellerName || buyerName) && (
              <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-border">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                    {t.soldBy}
                  </p>
                  <p className="text-sm font-medium break-words">{sellerName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
                    {t.soldTo}
                  </p>
                  <p className="text-sm font-medium break-words">{buyerName || "—"}</p>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pl-0">
                    {t.colName}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center w-28">
                    {t.quantityLabel}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right w-24">
                    {t.unitPrice}
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right w-24 pr-0">
                    {t.total}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 && (
                  <TableRow className="hover:bg-transparent print:hidden">
                    <TableCell colSpan={4} className="py-10 text-center pl-0 pr-0">
                      <Package className="size-8 mx-auto opacity-20 mb-2" />
                      <p className="text-sm text-muted-foreground">{t.emptyInvoice}</p>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((item) => (
                  <TableRow key={item.product.$id} className="hover:bg-transparent">
                    {/* Name */}
                    <TableCell className="pl-0 font-medium whitespace-normal">
                      {item.product.name}
                      {item.isManual && (
                        <span className="block text-xs text-primary font-medium">{t.manualBadge}</span>
                      )}
                    </TableCell>

                    {/* Qty */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5 print:hidden">
                        <button
                          onClick={() => updateQty(item.product.$id, -1)}
                          className="rounded p-0.5 hover:bg-muted transition-colors shrink-0"
                        >
                          <Minus className="size-3" />
                        </button>
                        <Input
                          type="number"
                          value={getQtyDisplay(item)}
                          min="1"
                          max={item.isManual ? undefined : item.product.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRawQtys((prev) => ({ ...prev, [item.product.$id]: val }));
                            const n = parseInt(val, 10);
                            if (!isNaN(n) && n > 0) {
                              setItems((prev) =>
                                prev.map((i) => {
                                  if (i.product.$id !== item.product.$id) return i;
                                  const max = i.isManual ? Infinity : i.product.quantity;
                                  return { ...i, qtySold: Math.min(n, max) };
                                })
                              );
                            }
                          }}
                          onBlur={() => commitQty(item.product.$id)}
                          className="w-14 text-center tabular-nums"
                        />
                        <button
                          onClick={() => updateQty(item.product.$id, 1)}
                          className="rounded p-0.5 hover:bg-muted transition-colors shrink-0"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                      <span className="hidden print:block text-sm tabular-nums">
                        {item.qtySold}
                      </span>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end print:hidden">
                        <Input
                          type="number"
                          value={getPriceDisplay(item)}
                          min="0"
                          step="0.01"
                          onChange={(e) => {
                            const val = e.target.value;
                            setRawPrices((prev) => ({ ...prev, [item.product.$id]: val }));
                            const n = parseFloat(val);
                            if (!isNaN(n) && val !== "") {
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.product.$id === item.product.$id
                                    ? { ...i, customPrice: n }
                                    : i
                                )
                              );
                            }
                          }}
                          onBlur={() => commitPrice(item.product.$id)}
                          className="w-full text-right tabular-nums"
                        />
                        {item.customPrice !== undefined && (
                          <span className="text-xs text-muted-foreground line-through">
                            L {item.product.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="hidden print:block text-sm tabular-nums">
                        L {effectivePrice(item).toFixed(2)}
                      </span>
                    </TableCell>

                    {/* Total + remove */}
                    <TableCell className="text-right pr-0">
                      <div className="flex items-center justify-end gap-0.5">
                        <span className="text-sm font-medium tabular-nums">
                          L {(effectivePrice(item) * effectiveQty(item)).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeItem(item.product.$id)}
                          className="print:hidden rounded p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors ml-0.5 shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex justify-between font-bold text-base">
                <span>{t.grandTotal}</span>
                <span className="tabular-nums">L {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Print-only footer */}
            <div className="hidden print:block mt-10 border-t border-border pt-6">
              <div className="flex justify-between text-xs text-muted-foreground">
                <div>
                  <p className="font-semibold uppercase tracking-wide mb-1">{t.soldBy}</p>
                  <p>{sellerName || "—"}</p>
                </div>
                <div className="text-center">
                  <p>{t.appName} · {invoiceDate} {invoiceTime}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold uppercase tracking-wide mb-1">{t.soldTo}</p>
                  <p>{buyerName || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons — hidden when printing */}
          <div className="print:hidden mt-4 flex flex-col gap-3">
            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
            {confirmed && (
              <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-2.5 text-sm text-green-600 font-medium">
                <CheckCircle2 className="size-4 shrink-0" />
                {t.saleConfirmed}
              </div>
            )}

            <button
              onClick={() => handleConfirmSale(true)}
              disabled={confirming || items.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="size-4" />
              {t.printInvoice}
            </button>

            <button
              onClick={() => handleConfirmSale(false)}
              disabled={confirming || items.length === 0}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-primary-foreground transition-all",
                confirming || items.length === 0
                  ? "bg-primary/40 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {confirming ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t.saving}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" /> {t.confirmSale}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
