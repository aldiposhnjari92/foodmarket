"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Users, X, Check } from "lucide-react";
import { AppLayout, AccessDenied } from "@/components/app-layout";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, Customer } from "@/lib/customers";
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
  const { can, roleLoading } = useRole();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (roleLoading) return;
    if (!can("customers_view")) { setLoading(false); return; }
    getCustomers()
      .then(setCustomers)
      .finally(() => setLoading(false));
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
        const created = await createCustomer(form.name, form.phone, form.email, form.address, form.notes);
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

  const field = (key: keyof CustomerForm, label: string, placeholder?: string, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder ?? ""}
        className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
      />
    </div>
  );

  return (
    <AppLayout>
      {!roleLoading && !can("customers_view") ? (
        <AccessDenied />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
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
            <form onSubmit={handleSave} className="rounded-2xl border border-border p-5 flex flex-col gap-4">
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
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
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

          {/* Customers table */}
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
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.customerName}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">{t.customerPhone}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell">{t.customerEmail}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">{t.customerAddress}</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c.$id}
                      className={cn(
                        "border-t border-border transition-colors",
                        i % 2 !== 0 && "bg-muted/10",
                        savedId === c.$id && "bg-green-500/5"
                      )}
                    >
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{c.phone || "—"}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{c.email || "—"}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell truncate max-w-xs">{c.address || "—"}</td>
                      <td className="px-4 py-3 text-right">
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
