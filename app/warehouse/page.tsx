"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Warehouse,
  Check,
  ChevronsUpDown,
  X,
  PackageCheck,
} from "lucide-react";
import { AppLayout, AccessDenied } from "@/components/app-layout";
import { useRole } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import { getProducts, createProduct, deleteProduct, Product } from "@/lib/products";
import { getAllUserRoles, UserRole } from "@/lib/user-roles";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Multiselect User Combobox ─────────────────────────────────────────────

function UserMultiSelect({
  users,
  selectedIds,
  onChange,
  placeholder,
  searchPlaceholder,
  noUsersFound,
}: {
  users: UserRole[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  noUsersFound: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const selectedUsers = users.filter((u) => selectedIds.includes(u.user_id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-55 h-auto min-h-9 justify-between flex-wrap gap-1 px-3 py-1.5 text-sm font-normal"
        >
          {selectedUsers.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-1">
              {selectedUsers.map((u) => (
                <span
                  key={u.user_id}
                  className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
                >
                  {u.name}
                  {/* span instead of button to avoid <button> inside <button> */}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(selectedIds.filter((x) => x !== u.user_id));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onChange(selectedIds.filter((x) => x !== u.user_id));
                      }
                    }}
                    className="cursor-pointer hover:text-destructive"
                  >
                    <X className="size-3" />
                  </span>
                </span>
              ))}
            </span>
          )}
          <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-65 p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{noUsersFound}</CommandEmpty>
            <CommandGroup>
              {users.map((u) => {
                const selected = selectedIds.includes(u.user_id);
                return (
                  <CommandItem
                    key={u.user_id}
                    value={u.name}
                    onSelect={() => toggle(u.user_id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        selected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{u.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {u.email}
                      </span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function WarehousePage() {
  const { t } = useLanguage();
  const { can, roleLoading } = useRole();

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Row selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // User assignment multiselect
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Add product form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [productType, setProductType] = useState<"single" | "package">("single");
  const [piecesPerPkg, setPiecesPerPkg] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const isPackage = productType === "package";
  const parsedPieces = parseInt(piecesPerPkg, 10);
  const parsedPrice = parseFloat(newPrice);
  const parsedQty = parseInt(newQty, 10);
  const packageCost =
    isPackage && !isNaN(parsedPieces) && !isNaN(parsedPrice)
      ? parsedPieces * parsedPrice
      : null;

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search
  const [search, setSearch] = useState("");

  const userById = Object.fromEntries(users.map((u) => [u.user_id, u]));

  // Group all products by name+price+is_package so that:
  // - products created directly for a user (owner_id set, no unassigned base) still appear
  // - products assigned to multiple users collapse into one row with all assignees shown
  type WarehouseRow = Product & { assignees: UserRole[] };

  const productGroups = new Map<string, Product[]>();
  for (const p of products) {
    const key = `${p.name}__${p.price}__${!!p.is_package}`;
    if (!productGroups.has(key)) productGroups.set(key, []);
    productGroups.get(key)!.push(p);
  }

  const allWarehouseProducts: WarehouseRow[] = Array.from(productGroups.values()).map((group) => {
    const base = group.find((p) => !p.owner_id) ?? group[0];
    const assignees = group
      .filter((p) => p.owner_id)
      .map((p) => userById[p.owner_id!])
      .filter(Boolean)
      .filter((u, i, arr) => arr.findIndex((x) => x.user_id === u.user_id) === i) as UserRole[];
    return { ...base, assignees };
  });

  // Filtered by search
  const warehouseProducts = allWarehouseProducts.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (roleLoading) return;
    if (!can("warehouse_view")) { setLoading(false); return; }
    Promise.all([getProducts(), getAllUserRoles()])
      .then(([prods, userRoles]) => {
        setProducts(prods);
        setUsers(userRoles);
      })
      .finally(() => setLoading(false));
  }, [roleLoading, can]);

  // ── Row selection helpers ──
  const allSelected =
    warehouseProducts.length > 0 &&
    warehouseProducts.every((p) => selectedIds.has(p.$id));
  const someSelected =
    warehouseProducts.some((p) => selectedIds.has(p.$id)) && !allSelected;

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(warehouseProducts.map((p) => p.$id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleRow = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (e.target.checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  // ── Add product ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!newName.trim()) { setAddError(t.errNameRequired); return; }
    if (isNaN(parsedPrice) || parsedPrice < 0) { setAddError(t.errValidPrice); return; }
    if (isNaN(parsedQty) || parsedQty < 1) { setAddError(t.errValidPrice); return; }
    if (isPackage && (isNaN(parsedPieces) || parsedPieces < 1)) { setAddError(t.errValidPrice); return; }

    const totalQty = isPackage ? parsedQty * parsedPieces : parsedQty;

    setAdding(true);
    try {
      const product = await createProduct(
        newName.trim(),
        parsedPrice,
        undefined,
        totalQty,
        undefined,
        isPackage,
        isPackage ? parsedPieces : undefined
      );
      setProducts((prev) => [product, ...prev]);
      setNewName(""); setNewPrice(""); setNewQty("1");
      setProductType("single"); setPiecesPerPkg("");
      setShowForm(false);
    } catch {
      setAddError(t.errSaveFailed);
    } finally {
      setAdding(false);
    }
  };

  // ── Assign products ──
  const handleAssign = async () => {
    if (selectedIds.size === 0) {
      setAssignResult({ ok: false, msg: t.selectProductsFirst });
      return;
    }
    if (assignUserIds.length === 0) {
      setAssignResult({ ok: false, msg: t.selectUsersFirst });
      return;
    }
    setAssigning(true);
    setAssignResult(null);
    try {
      const selected = warehouseProducts.filter((p) => selectedIds.has(p.$id));
      await Promise.all(
        selected.flatMap((product) =>
          assignUserIds.map((userId) =>
            createProduct(
              product.name,
              product.price,
              product.image_id,
              product.quantity,
              userId,
              product.is_package,
              product.pieces_per_package
            )
          )
        )
      );
      setSelectedIds(new Set());
      setAssignUserIds([]);
      setAssignResult({ ok: true, msg: t.assignSuccess });
      setTimeout(() => setAssignResult(null), 4000);
    } catch {
      setAssignResult({ ok: false, msg: t.assignFailed });
    } finally {
      setAssigning(false);
    }
  };

  // ── Delete product ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteTarget.$id, deleteTarget.image_id);
      setProducts((prev) => prev.filter((p) => p.$id !== deleteTarget.$id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.$id);
        return next;
      });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = warehouseProducts.filter((p) => selectedIds.has(p.$id)).length;

  // ── Pagination ──
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Reset to first page whenever search or page size changes
  useEffect(() => { setPage(1); }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(warehouseProducts.length / pageSize));
  const pagedProducts = warehouseProducts.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      {!roleLoading && !can("warehouse_view") ? (
        <AccessDenied />
      ) : (
        <div className="flex flex-col gap-4 h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.warehouseTitle}</h1>
              <p className="text-sm text-muted-foreground">{t.warehouseDesc}</p>
            </div>
            <Button onClick={() => { setShowForm(true); setAddError(null); }}>
              <Plus className="size-4" /> {t.addToWarehouse}
            </Button>
          </div>

          {/* Add product modal */}
          <Dialog
            open={showForm}
            onOpenChange={(open) => {
              if (!open) {
                setShowForm(false);
                setAddError(null);
                setProductType("single");
                setPiecesPerPkg("");
                setNewName(""); setNewPrice(""); setNewQty("1");
              }
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t.addToWarehouse}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAdd} className="flex flex-col gap-4">
                {/* Product name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{t.productName}</label>
                  <Input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={t.productNamePlaceholder}
                    required
                    autoFocus
                    className="h-10"
                  />
                </div>

                {/* Product type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">{t.productType}</label>
                  <Tabs
                    value={productType}
                    onValueChange={(v) => {
                      setProductType(v as "single" | "package");
                      setPiecesPerPkg("");
                    }}
                    className="w-full"
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="single" className="flex-1">{t.singleUnit}</TabsTrigger>
                      <TabsTrigger value="package" className="flex-1">{t.packageType}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    {isPackage ? `${t.priceLabel} / ${t.singleUnit.toLowerCase()}` : t.priceLabel}
                  </label>
                  <Input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="0.00"
                    min={0}
                    step="0.01"
                    required
                    className="h-10"
                  />
                </div>

                {/* Pieces per package */}
                {isPackage && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">{t.piecesPerPackage}</label>
                    <Input
                      type="number"
                      value={piecesPerPkg}
                      onChange={(e) => setPiecesPerPkg(e.target.value)}
                      placeholder={t.piecesPerPackagePlaceholder}
                      min={1}
                      step="1"
                      required
                      className="h-10"
                    />
                    {packageCost !== null && (
                      <p className="text-sm text-muted-foreground">
                        {t.packageCost}:{" "}
                        <span className="font-semibold text-foreground">L {packageCost.toFixed(2)}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">
                    {isPackage ? t.packagesToAdd : t.quantity}
                  </label>
                  <Input
                    type="number"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="1"
                    min={1}
                    step="1"
                    required
                    className="h-10"
                  />
                  {isPackage && packageCost !== null && parsedQty > 0 && !isNaN(parsedQty) && (
                    <p className="text-sm text-muted-foreground">
                      {parsedQty * parsedPieces} pcs · L {(parsedQty * packageCost).toFixed(2)} total
                    </p>
                  )}
                </div>

                {addError && (
                  <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{addError}</p>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={adding}>
                    {adding ? <><Loader2 className="size-4 animate-spin" /> {t.saving}</> : t.saveProduct}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Assignment bar – shown when rows are selected */}
          {selectedCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <span className="text-sm font-medium text-primary">
                {t.selectedCount(selectedCount)}
              </span>
              <div className="flex-1 flex flex-wrap items-center gap-2">
                <UserMultiSelect
                  users={users}
                  selectedIds={assignUserIds}
                  onChange={setAssignUserIds}
                  placeholder={t.assignToUsers}
                  searchPlaceholder={t.searchUsers}
                  noUsersFound={t.noUsersFound}
                />
                <Button onClick={handleAssign} disabled={assigning}>
                  {assigning ? (
                    <><Loader2 className="size-4 animate-spin" /> {t.saving}</>
                  ) : (
                    <><PackageCheck className="size-4" /> {t.assignProducts}</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Result message */}
          {assignResult && (
            <div
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium",
                assignResult.ok
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {assignResult.msg}
            </div>
          )}

          {/* Table section — fills remaining vertical space */}
          <div className="flex flex-col flex-1 min-h-0 gap-3">

          {/* Search */}
          {!loading && (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="max-w-xs"
            />
          )}

          {/* Data table */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t.loading}
            </div>
          ) : allWarehouseProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Warehouse className="size-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">{t.noWarehouseProducts}</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border">
              <table className="min-w-[640px] w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b hover:bg-transparent">
                    <th className="sticky top-0 z-10 bg-muted h-10 px-4 text-left align-middle font-medium text-foreground">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="sticky top-0 z-10 bg-muted h-10 px-4 text-left align-middle font-medium text-foreground">{t.colName}</th>
                    <th className="sticky top-0 z-10 bg-muted h-10 px-4 text-left align-middle font-medium text-foreground">{t.colPrice}</th>
                    <th className="sticky top-0 z-10 bg-muted h-10 px-4 text-left align-middle font-medium text-foreground">{t.colQuantity}</th>
                    <th className="sticky top-0 z-10 bg-muted h-10 px-4 text-left align-middle font-medium text-foreground">{t.assignedTo}</th>
                    <th className="sticky top-0 z-10 bg-muted h-10 px-4" />
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {warehouseProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        {t.noProductsMatching(search)}
                      </td>
                    </tr>
                  ) : pagedProducts.map((product) => {
                    const isSelected = selectedIds.has(product.$id);
                    return (
                      <tr
                        key={product.$id}
                        data-state={isSelected ? "selected" : undefined}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                        onClick={() =>
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(product.$id)) next.delete(product.$id);
                            else next.add(product.$id);
                            return next;
                          })
                        }
                      >
                        <td
                          className="p-2 px-4 align-middle whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => toggleRow(product.$id, e)}
                          />
                        </td>
                        <td className="p-2 px-4 align-middle font-medium whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            {product.name}
                            {product.is_package && (
                              <span className="shrink-0 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 text-xs font-semibold">
                                {t.packageBadge}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-2 px-4 align-middle whitespace-nowrap text-muted-foreground">
                          {product.price.toFixed(2)} L
                        </td>
                        <td className="p-2 px-4 align-middle whitespace-nowrap text-muted-foreground">
                          {product.is_package && product.pieces_per_package
                            ? `${product.quantity} pkg × ${product.pieces_per_package} pcs`
                            : product.quantity}
                        </td>
                        <td className="p-2 px-4 align-middle">
                          {product.assignees.length > 0 ? (
                            <span className="flex flex-wrap gap-1">
                              {product.assignees.map((u) => (
                                <span
                                  key={u.user_id}
                                  className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
                                >
                                  {u.name}
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td
                          className="p-2 px-4 align-middle text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(product)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && warehouseProducts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Rows per page */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t.rowsPerPage}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
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
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, warehouseProducts.length)} of {warehouseProducts.length}
                </span>
              </div>

              {/* Page controls — only shown when more than one page */}
              {totalPages > 1 && (
                <Pagination className="w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                      const showPage =
                        n === 1 ||
                        n === totalPages ||
                        (n >= page - 1 && n <= page + 1);
                      const showLeadingEllipsis = n === page - 2 && page - 2 > 1;
                      const showTrailingEllipsis = n === page + 2 && page + 2 < totalPages;

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
                            isActive={n === page}
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
                        disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}

          </div>{/* end table section */}

          {/* Delete confirmation */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteProduct}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.deleteConfirm(deleteTarget?.name ?? "")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <><Loader2 className="size-4 animate-spin" /> {t.deleting}</> : t.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppLayout>
  );
}
