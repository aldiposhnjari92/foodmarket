import { tablesDB, DATABASE_ID, ID, Query } from "./appwrite";
import { Models } from "appwrite";
import type { Role } from "./roles";

export const USER_ROLES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_USER_ROLES_TABLE_ID!;

export interface UserRole {
  $id: string;
  $createdAt: string;
  user_id: string;
  email: string;
  name: string;
  role: Role;
}

function toUserRole(row: Models.DefaultRow): UserRole {
  return {
    $id: row.$id,
    $createdAt: row.$createdAt,
    user_id: row.user_id as string,
    email: row.email as string,
    name: row.name as string,
    role: (row.role as Role) || "seller",
  };
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const res = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: USER_ROLES_TABLE_ID,
    queries: [Query.equal("user_id", userId), Query.limit(1)],
  });
  return res.rows.length > 0 ? toUserRole(res.rows[0]) : null;
}

export async function getAllUserRoles(): Promise<UserRole[]> {
  const res = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: USER_ROLES_TABLE_ID,
    queries: [Query.orderAsc("name")],
  });
  return res.rows.map(toUserRole);
}

export async function countAdmins(): Promise<number> {
  const res = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: USER_ROLES_TABLE_ID,
    queries: [Query.equal("role", "admin"), Query.limit(1)],
  });
  return res.total;
}

export async function createUserRole(
  user_id: string,
  email: string,
  name: string,
  role: Role
): Promise<UserRole> {
  const row = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: USER_ROLES_TABLE_ID,
    rowId: ID.unique(),
    data: { user_id, email, name, role },
  });
  return toUserRole(row);
}

export async function updateUserRole(id: string, role: Role): Promise<UserRole> {
  const row = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: USER_ROLES_TABLE_ID,
    rowId: id,
    data: { role },
  });
  return toUserRole(row);
}

export async function deleteUserRole(id: string): Promise<void> {
  await tablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: USER_ROLES_TABLE_ID,
    rowId: id,
  });
}
