"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  getUserRole,
  createUserRole,
  countAdmins,
} from "@/lib/user-roles";
import { can, type Role, type Permission } from "@/lib/roles";

interface RoleContextValue {
  role: Role | null;
  roleLoading: boolean;
  can: (permission: Permission) => boolean;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  roleLoading: true,
  can: () => false,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          setRoleLoading(false);
          return;
        }

        const existing = await getUserRole(user.$id);
        if (existing) {
          setRole(existing.role);
        } else {
          // First user ever → auto-promote to admin
          const adminCount = await countAdmins();
          const assignedRole: Role = adminCount === 0 ? "admin" : "seller";
          await createUserRole(user.$id, user.email, user.name, assignedRole);
          setRole(assignedRole);
        }
      } catch {
        // If user_roles table not configured yet, default to admin so the app stays usable
        setRole("admin");
      } finally {
        setRoleLoading(false);
      }
    })();
  }, []);

  return (
    <RoleContext.Provider
      value={{
        role,
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
