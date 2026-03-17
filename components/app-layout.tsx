"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Package, ScanLine, FileText, Archive, Users, UserCheck, LogOut, Menu, Loader2, Globe, ShieldAlert, CircleUserRound } from "lucide-react";
import { getCurrentUser, logout } from "@/lib/auth";
import type { User } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useRole } from "@/contexts/role-context";
import type { Locale } from "@/lib/i18n";
import type { Permission } from "@/lib/roles";
import Logo from "./logo";

export function AccessDenied() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <ShieldAlert className="size-12 text-muted-foreground opacity-40" />
      <div>
        <p className="font-semibold text-lg">{t.accessDenied}</p>
        <p className="text-sm text-muted-foreground mt-1">{t.accessDeniedDesc}</p>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();
  const { can } = useRole();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allNavItems: { href: string; label: string; icon: React.ElementType; permission: Permission }[] = [
    { href: "/dashboard",  label: t.navDashboard,  icon: LayoutDashboard, permission: "products_view" },
    { href: "/products",   label: t.navProducts,   icon: Package,         permission: "products_view" },
    { href: "/scan",       label: t.navScanProduct, icon: ScanLine,       permission: "products_add" },
    { href: "/invoice",    label: t.navInvoice,    icon: FileText,        permission: "invoice" },
    { href: "/inventory",  label: t.navInventory,  icon: Archive,         permission: "inventory" },
    { href: "/customers",  label: t.navCustomers,  icon: UserCheck,       permission: "customers_view" },
    { href: "/users",      label: t.navUsers,      icon: Users,           permission: "users_view" },
  ];

  const navItems = allNavItems.filter((item) => can(item.permission));

  useEffect(() => {
    getCurrentUser().then((u) => {
      if (!u) {
        router.replace("/login");
      } else {
        setUser(u);
        setLoading(false);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden print:overflow-visible print:h-auto bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "print:hidden fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Logo />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link
            href="/profile"
            onClick={() => setSidebarOpen(false)}
            className={cn(
              "mb-3 flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-muted",
              pathname === "/profile" && "bg-muted"
            )}
          >
            <CircleUserRound className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{user?.name || user?.email}</p>
              <p className="truncate text-xs text-muted-foreground leading-tight">{user?.email}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="size-4" />
            {t.signOut}
          </button>

          {/* Language switcher */}
          <div className="mt-3 flex items-center gap-2 px-1">
            <Globe className="size-3.5 text-muted-foreground shrink-0" />
            {(["en", "sq"] as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                  locale === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="print:hidden fixed top-0 left-0 right-0 z-10 flex h-12.5 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
        </header>

        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0 lg:mt-0 mt-12.5 lg:h-auto h-[calc(100dvh-50px)]">{children}</main>
      </div>
    </div>
  );
}
