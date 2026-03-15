"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getUserRole, createUserRole, countAdmins } from "@/lib/user-roles";
import { can, type Role, type Permission } from "@/lib/roles";

interface RoleContextValue {
  role: Role | null;
  userId: string | null;
  roleLoading: boolean;
  can: (permission: Permission) => boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  userId: null,
  roleLoading: true,
  can: () => false,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const pathname = usePathname();
  // Track the last resolved user ID without putting state in deps
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const user = await getCurrentUser();
        if (cancelled) return;

        if (!user) {
          // Logged out — clear everything
          lastUserIdRef.current = null;
          setRole(null);
          setUserId(null);
          setRoleLoading(false);
          return;
        }

        // Same user as last check — nothing changed, skip
        if (user.$id === lastUserIdRef.current) {
          setRoleLoading(false);
          return;
        }

        // New user (fresh login or switched account) — fetch their role
        setRoleLoading(true);
        lastUserIdRef.current = user.$id;
        setUserId(user.$id);

        const existing = await getUserRole(user.$id);
        if (cancelled) return;

        if (existing) {
          setRole(existing.role);
        } else {
          const adminCount = await countAdmins();
          const assignedRole: Role = adminCount === 0 ? "admin" : "seller";
          await createUserRole(user.$id, user.email, user.name, assignedRole);
          if (!cancelled) setRole(assignedRole);
        }
      } catch {
        if (!cancelled) setRole("admin");
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]); // re-run on every navigation — cheap because of the ref guard above

  return (
    <RoleContext.Provider
      value={{
        role,
        userId,
        roleLoading,
        can: (permission) => (role ? can(role, permission) : false),
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
