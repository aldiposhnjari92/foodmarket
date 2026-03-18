"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Users, X, Check } from "lucide-react";
import { AppLayout, AccessDenied } from "@/components/app-layout";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, Customer } from "@/lib/customers";
import { getAllUserRoles, UserRole } from "@/lib/user-roles";
import { useRole } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import { cn } from "@/lib/utils";
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
import { Input } from "@/components/ui/input";

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: CustomerForm = { name: "", phone: "", email: "", address: "", notes: "" };

export default function CustomersPage() {
  const { t } = useLanguage();
  const { can, role, userId, roleLoading } = useRole();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [userById, setUserById] = useState<Record<string, UserRole>>({});
  const [loading, setLoading] = useState(true);
  const isAdmin = role === "admin";

  // Add / edit form
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search & pagination
  const [search, setSearch] = useState("");
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const [pageSize, setPageSize] = useState(() => typeof sessionStorage !== "undefined" ? Number(sessionStorage.getItem("customers_pageSize")) || 10 : 10);
  const [page, setPage] = useState(() => typeof sessionStorage !== "undefined" ? Number(sessionStorage.getItem("customers_page")) || 1 : 1);

  useEffect(() => { sessionStorage.setItem("customers_pageSize", String(pageSize)); }, [pageSize]);
  useEffect(() => { sessionStorage.setItem("customers_page", String(page)); }, [page]);

  useEffect(() => {
    if (roleLoading) return;
    if (!can("customers_view")) { setLoading(false); return; }
    const fetches: Promise<unknown>[] = [
      getCustomers().then(setCustomers),
    ];
    if (role === "admin") {
      fetches.push(getAllUserRoles().then((roles) =>
        setUserById(Object.fromEntries(roles.map((u) => [u.user_id, u])))
      ));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [roleLoading, can]);

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (c: Customer) => {
    setEditTarget(c);
    setForm({ name: c.name, phone: c.phone, email: c.email, address: c.address, notes: c.notes });
    setSaveError(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditTarget(null); setSaveError(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaveError(null);
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateCustomer(editTarget.$id, form.name, form.phone, form.email, form.address, form.notes);
        setCustomers((prev) => prev.map((c) => (c.$id === updated.$id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
        setSavedId(updated.$id);
        setTimeout(() => setSavedId(null), 2500);
      } else {
        const created = await createCustomer(form.name, form.phone, form.email, form.address, form.notes, userId ?? undefined);
        setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      closeForm();
    } catch {
      setSaveError(t.errSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCustomer(deleteTarget.$id);
      setCustomers((prev) => prev.filter((c) => c.$id !== deleteTarget.$id));
      setDeleteTarget(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const pagedCustomers = filteredCustomers.slice((effectivePage - 1) * pageSize, effectivePage * pageSize);

  const field = (key: keyof CustomerForm, label: string, placeholder?: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder ?? ""}
        className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
      />
    </div>
  );

  return (
    <AppLayout>
      {!roleLoading && !can("customers_view") ? (
        <AccessDenied />
      ) : (
        <div className="flex flex-col h-full gap-4">

          {/* Page header */}
          <div className="shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.customersTitle}</h1>
              <p className="text-sm text-muted-foreground">{t.customersDesc}</p>
            </div>
            {can("customers_add") && (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" /> {t.addCustomer}
              </button>
            )}
          </div>

          {/* Add / Edit form */}
          {showForm && (
            <form onSubmit={handleSave} className="shrink-0 rounded-2xl border border-border p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{editTarget ? t.editCustomer : t.addCustomer}</p>
                <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("name", t.customerName, t.placeholderName)}
                {field("phone", t.customerPhone, t.phonePlaceholder, "tel")}
                {field("email", t.customerEmail, "customer@example.com", "email")}
                {field("address", t.customerAddress, t.addressPlaceholder)}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">{t.customerNotes}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                />
              </div>
              {saveError && (
                <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{saveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving || !form.name.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {saving ? <><Loader2 className="size-4 animate-spin" /> {t.saving}</> : <><Check className="size-4" /> {t.saveChanges}</>}
                </button>
                <button type="button" onClick={closeForm} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors">
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {/* Search */}
          {!loading && customers.length > 0 && (
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t.searchPlaceholder}
              className="shrink-0 max-w-xs"
            />
          )}

          {/* Table — fills remaining vertical space */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t.loading}
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <Users className="size-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">{t.noCustomers}</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border overflow-hidden">

              {/* Fixed header — never scrolls */}
              <div className="shrink-0 border-b">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.customerName}</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">{t.customerPhone}</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">{t.customerEmail}</th>
                      <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t.customerAddress}</th>
                      {isAdmin && <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground xl:table-cell">{t.colAddedBy}</th>}
                      <th className="px-4 py-3 w-20" />
                    </tr>
                  </thead>
                </table>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                {pagedCustomers.length === 0 ? (
                  <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
                    {t.noProductsMatching(search)}
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {pagedCustomers.map((c, i) => (
                        <tr
                          key={c.$id}
                          className={cn(
                            "border-b last:border-0 transition-colors hover:bg-muted/50",
                            i % 2 !== 0 && "bg-muted/10",
                            savedId === c.$id && "bg-green-500/5"
                          )}
                        >
                          <td className="px-4 py-3 font-medium">{c.name}</td>
                          <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{c.phone || "—"}</td>
                          <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{c.email || "—"}</td>
                          <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell truncate max-w-xs">{c.address || "—"}</td>
                          {isAdmin && (
                            <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                              {c.created_by ? (userById[c.created_by]?.name ?? "—") : "—"}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right w-20">
                            <div className="flex items-center justify-end gap-1">
                              {can("customers_edit") && (
                                <button
                                  onClick={() => openEdit(c)}
                                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                >
                                  <Pencil className="size-4" />
                                </button>
                              )}
                              {can("customers_delete") && (
                                <button
                                  onClick={() => setDeleteTarget(c)}
                                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Paginator — always at the bottom */}
          {!loading && filteredCustomers.length > 0 && (
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
                  {(effectivePage - 1) * pageSize + 1}–{Math.min(effectivePage * pageSize, filteredCustomers.length)} of {filteredCustomers.length}
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

          {/* Delete dialog */}
          <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.deleteProduct}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.confirmDeleteCustomer(deleteTarget?.name ?? "")}
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
