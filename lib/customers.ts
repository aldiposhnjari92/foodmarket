import { tablesDB, DATABASE_ID, ID, Query } from "./appwrite";
import { Models } from "appwrite";

export const CUSTOMERS_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_CUSTOMERS_TABLE_ID!;

export interface Customer {
  $id: string;
  $createdAt: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_by?: string;  // user_id of whoever added this customer
}

function toCustomer(row: Models.DefaultRow): Customer {
  return {
    $id: row.$id,
    $createdAt: row.$createdAt,
    name: row.name as string,
    phone: (row.phone as string) || "",
    email: (row.email as string) || "",
    address: (row.address as string) || "",
    notes: (row.notes as string) || "",
    created_by: (row.created_by as string) || undefined,
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: CUSTOMERS_TABLE_ID,
    queries: [Query.orderAsc("name")],
  });
  return res.rows.map(toCustomer);
}

export async function createCustomer(
  name: string,
  phone: string,
  email: string,
  address: string,
  notes: string,
  createdBy?: string
): Promise<Customer> {
  const data: Record<string, unknown> = { name, phone, email, address, notes };
  if (createdBy) data.created_by = createdBy;
  const row = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: CUSTOMERS_TABLE_ID,
    rowId: ID.unique(),
    data,
  });
  return toCustomer(row);
}

export async function updateCustomer(
  id: string,
  name: string,
  phone: string,
  email: string,
  address: string,
  notes: string
): Promise<Customer> {
  const row = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: CUSTOMERS_TABLE_ID,
    rowId: id,
    data: { name, phone, email, address, notes },
  });
  return toCustomer(row);
}

export async function deleteCustomer(id: string): Promise<void> {
  await tablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: CUSTOMERS_TABLE_ID,
    rowId: id,
  });
}
