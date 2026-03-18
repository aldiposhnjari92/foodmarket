export type Role = "admin" | "manager" | "seller";

export const PERMISSIONS = {
  products_view:    ["admin", "manager", "seller"],
  products_add:     ["admin", "manager"],
  products_edit:    ["admin"],
  products_delete:  ["admin"],
  invoice:          ["admin", "manager", "seller"],
  inventory:        ["admin", "manager", "seller"],
  customers_view:   ["admin", "manager"],
  customers_add:    ["admin", "manager"],
  customers_edit:   ["admin"],
  customers_delete: ["admin"],
  users_view:       ["admin"],
  users_add:        ["admin"],
  users_edit:       ["admin"],
  warehouse_view:   ["admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  seller: "Seller",
};
