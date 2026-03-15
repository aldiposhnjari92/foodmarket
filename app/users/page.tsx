"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ShieldCheck, ChevronDown } from "lucide-react";
import { AppLayout, AccessDenied } from "@/components/app-layout";
import { getAllUserRoles, createUserRole, updateUserRole, deleteUserRole, UserRole } from "@/lib/user-roles";
import { useRole } from "@/contexts/role-context";
import { useLanguage } from "@/contexts/language-context";
import { ROLE_LABELS, type Role } from "@/lib/roles";
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

const ROLES: Role[] = ["admin", "manager", "seller"];

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  seller: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function UsersPage() {
  const { t } = useLanguage();
  const { can, roleLoading } = useRole();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Add user form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("seller");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<UserRole | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [permError, setPermError] = useState(false);

  useEffect(() => {
    if (roleLoading) return;
    if (!can("users_view")) { setLoading(false); return; }
    getAllUserRoles()
      .then(setUsers)
      .catch(() => setPermError(true))
      .finally(() => setLoading(false));
  }, [roleLoading, can]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAdding(true);
    try {
      // Create Appwrite user via server API route
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");

      // Assign role in user_roles table
      const userRole = await createUserRole(data.userId, data.email, data.name, newRole);
      setUsers((prev) => [...prev, userRole].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName(""); setNewEmail(""); setNewPassword(""); setNewRole("seller");
      setShowForm(false);
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (userRole: UserRole, role: Role) => {
    try {
      const updated = await updateUserRole(userRole.$id, role);
      setUsers((prev) => prev.map((u) => (u.$id === updated.$id ? updated : u)));
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserRole(deleteTarget.$id);
      setUsers((prev) => prev.filter((u) => u.$id !== deleteTarget.$id));
      setDeleteTarget(null);
    } catch {
      // silent
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      {!roleLoading && !can("users_view") ? (
        <AccessDenied />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t.usersTitle}</h1>
              <p className="text-sm text-muted-foreground">{t.usersDesc}</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" /> {t.addUser}
            </button>
          </div>

          {permError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm flex flex-col gap-1">
              <p className="font-semibold text-destructive">Appwrite permission error</p>
              <p className="text-muted-foreground">
                The <code className="font-mono bg-muted px-1 rounded">user_roles</code> table is missing client permissions.
                In <strong>Appwrite Console</strong> → Database → Tables → <code className="font-mono bg-muted px-1 rounded">user_roles</code> → Settings → Permissions, add role <code className="font-mono bg-muted px-1 rounded">users</code> with <strong>create, read, update, delete</strong>. Do the same for <code className="font-mono bg-muted px-1 rounded">customers</code> and <code className="font-mono bg-muted px-1 rounded">sales</code> tables, then refresh.
              </p>
            </div>
          )}

          {/* Add user form */}
          {showForm && (
            <form
              onSubmit={handleAdd}
              className="rounded-2xl border border-border p-5 flex flex-col gap-4"
            >
              <p className="font-semibold">{t.addUser}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.labelName}
                  required
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t.labelEmail}
                  required
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t.userPassword}
                  required
                  minLength={8}
                  className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="relative">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full appearance-none rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring pr-8"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                </div>
              </div>
              {addError && (
                <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{addError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {adding ? <><Loader2 className="size-4 animate-spin" /> {t.saving}</> : t.addUser}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setAddError(null); }}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          )}

          {addSuccess && (
            <div className="rounded-lg bg-green-500/10 px-4 py-2.5 text-sm text-green-600 font-medium">
              {t.userAdded}
            </div>
          )}

          {/* Users table */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t.loading}
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <ShieldCheck className="size-10 mx-auto opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">{t.noUsers}</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.labelName}</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">{t.labelEmail}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t.userRole}</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.$id}
                      className={cn("border-t border-border", i % 2 !== 0 && "bg-muted/10")}
                    >
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{u.email}</td>
                      <td className="px-4 py-3">
                        <div className="relative inline-block">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value as Role)}
                            className={cn(
                              "appearance-none rounded-full px-3 py-1 text-xs font-semibold pr-7 border-0 outline-none cursor-pointer",
                              ROLE_COLORS[u.role]
                            )}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 size-3" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
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
                <AlertDialogTitle>{t.deleteUser}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.confirmDeleteUser(deleteTarget?.name ?? "")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? <><Loader2 className="size-4 animate-spin" /> {t.deleting}</> : t.deleteUser}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </AppLayout>
  );
}
