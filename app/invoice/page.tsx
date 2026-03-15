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
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";

interface InvoiceItem {
  product: Product;
  qtySold: number;
  customPrice?: number;  // invoice-only price, original price is preserved
  isManual?: boolean;    // manually added, not deducted from inventory
}

export default function InvoicePage() {
  const { t } = useLanguage();
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

  const invoiceNumber = useRef(`INV-${Date.now().toString().slice(-6)}`).current;
  const invoiceDate = new Date().toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.$id === product.$id);
      if (existing) {
        return prev.map((i) =>
          i.product.$id === product.$id
            ? { ...i, qtySold: Math.min(i.qtySold + 1, i.product.quantity) }
            : i
        );
      }
      if (product.quantity < 1) return prev;
      return [...prev, { product, qtySold: 1 }];
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
  };

  const setQtyDirect = (id: string, value: string) => {
    const n = parseInt(value, 10);
    if (isNaN(n) || n < 0) return;
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

  const updatePrice = (id: string, value: string) => {
    const n = parseFloat(value);
    setItems((prev) =>
      prev.map((i) =>
        i.product.$id === id
          ? { ...i, customPrice: isNaN(n) || value === "" ? undefined : n }
          : i
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.product.$id !== id));
  };

  const effectivePrice = (item: InvoiceItem) =>
    item.customPrice !== undefined ? item.customPrice : item.product.price;

  const subtotal = items.reduce((sum, i) => sum + effectivePrice(i) * i.qtySold, 0);
  const vat = subtotal * 0.2;
  const grandTotal = subtotal + vat;

  const handlePrint = () => window.print();

  const handleConfirmSale = async () => {
    if (items.length === 0) {
      setError(t.noItemsSelected);
      return;
    }
    setError(null);
    setConfirming(true);
    try {
      // Deduct inventory for non-manual items
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

      // Record the sale (best-effort — requires SALES_TABLE_ID env var)
      const saleItems: SaleItem[] = items.map((i) => ({
        product_id: i.product.$id,
        product_name: i.product.name,
        qty_sold: i.qtySold,
        unit_price: effectivePrice(i),
        total: effectivePrice(i) * i.qtySold,
      }));
      try {
        await createSale(invoiceNumber, saleItems, subtotal, vat, grandTotal);
      } catch {
        // Sales table may not be configured yet — sale still counts for inventory
      }

      setConfirmed(true);
      setItems([]);
      const updated = await getProducts();
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
      <div className="print:hidden mb-6">
        <h1 className="text-2xl font-bold">{t.invoiceTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.invoiceDesc}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Product selector ── */}
        <div className="print:hidden flex-1 min-w-0">
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">{t.loading}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-130 overflow-y-auto pr-1">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {search ? t.noProductsMatching(search) : t.noProductsAdd}
                </p>
              ) : (
                filtered.map((product) => {
                  const inCart = items.find((i) => i.product.$id === product.$id);
                  const noStock = product.quantity < 1;
                  return (
                    <button
                      key={product.$id}
                      onClick={() => !noStock && addItem(product)}
                      disabled={noStock}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors",
                        noStock
                          ? "border-border opacity-40 cursor-not-allowed"
                          : inCart
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted cursor-pointer"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          L {product.price.toFixed(2)} · {t.stockLabel}: {product.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {inCart && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground font-medium">
                            ×{inCart.qtySold}
                          </span>
                        )}
                        <Plus
                          className={cn(
                            "size-4",
                            noStock ? "opacity-30" : "text-primary"
                          )}
                        />
                      </div>
                    </button>
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
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    placeholder={t.priceLabel}
                    min="0"
                    step="0.01"
                    className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="number"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    placeholder={t.quantityLabel}
                    min="1"
                    step="1"
                    className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
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
        <div className="w-full lg:w-120 shrink-0">
          {/* Printable invoice */}
          <div className="rounded-2xl border border-border bg-white p-6 print:rounded-none print:border-none print:shadow-none print:p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 print:mb-10">
              <div>
                <h2 className="text-xl font-bold tracking-tight print:text-2xl">
                  {t.appName}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 print:text-sm">
                  {t.invoiceTitle}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {t.invoiceNumber} {invoiceNumber}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.invoiceDate}: {invoiceDate}
                </p>
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border pb-2 mb-1">
              <span>{t.colName}</span>
              <span className="text-right">{t.quantityLabel}</span>
              <span className="text-right">{t.unitPrice}</span>
              <span className="text-right">{t.total}</span>
            </div>

            {/* Line items */}
            {items.length === 0 ? (
              <div className="py-10 text-center print:hidden">
                <Package className="size-8 mx-auto opacity-20 mb-2" />
                <p className="text-sm text-muted-foreground">{t.emptyInvoice}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {items.map((item) => (
                  <div
                    key={item.product.$id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 items-center py-2.5"
                  >
                    {/* Name + optional manual badge */}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block pr-1">
                        {item.product.name}
                      </span>
                      {item.isManual && (
                        <span className="text-xs text-primary font-medium">{t.manualBadge}</span>
                      )}
                    </div>

                    {/* Qty controls — screen only */}
                    <div className="flex items-center gap-1 print:hidden">
                      <button
                        onClick={() => updateQty(item.product.$id, -1)}
                        className="rounded p-0.5 hover:bg-muted transition-colors"
                      >
                        <Minus className="size-3" />
                      </button>
                      <input
                        type="number"
                        value={item.qtySold}
                        min="1"
                        max={item.isManual ? undefined : item.product.quantity}
                        onChange={(e) => setQtyDirect(item.product.$id, e.target.value)}
                        className="w-10 text-center text-sm tabular-nums rounded border border-input bg-background px-1 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        onClick={() => updateQty(item.product.$id, 1)}
                        className="rounded p-0.5 hover:bg-muted transition-colors"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                    {/* Qty — print only */}
                    <span className="hidden print:block text-sm text-right tabular-nums">
                      {item.qtySold}
                    </span>

                    {/* Editable price — screen only */}
                    <div className="flex flex-col items-end print:hidden">
                      <input
                        type="number"
                        value={item.customPrice !== undefined ? item.customPrice : item.product.price}
                        min="0"
                        step="0.01"
                        onChange={(e) => updatePrice(item.product.$id, e.target.value)}
                        className="w-20 text-right text-sm tabular-nums rounded border border-input bg-background px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-ring"
                      />
                      {item.customPrice !== undefined && (
                        <span className="text-xs text-muted-foreground line-through">
                          L {item.product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {/* Price — print only */}
                    <span className="hidden print:block text-sm text-right tabular-nums">
                      L {effectivePrice(item).toFixed(2)}
                    </span>

                    <div className="flex items-center justify-end gap-1">
                      <span className="text-sm font-medium tabular-nums">
                        L {(effectivePrice(item) * item.qtySold).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.$id)}
                        className="print:hidden rounded p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors ml-0.5"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-border flex flex-col gap-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.subtotal}</span>
                <span className="tabular-nums">L {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t.vat}</span>
                <span className="tabular-nums">L {vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1.5 mt-0.5 border-t border-border">
                <span>{t.grandTotal}</span>
                <span className="tabular-nums">L {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Print-only footer */}
            <p className="hidden print:block mt-10 text-xs text-center text-muted-foreground">
              {t.appName} · {invoiceDate}
            </p>
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
              onClick={handlePrint}
              disabled={items.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="size-4" />
              {t.printInvoice}
            </button>

            <button
              onClick={handleConfirmSale}
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
