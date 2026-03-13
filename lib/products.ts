import { tablesDB, DATABASE_ID, TABLE_ID, ID, Query } from "./appwrite";
import { Models } from "appwrite";

export interface Product {
  $id: string;
  $createdAt: string;
  name: string;
  price: number;
  image_id?: string;
}

function toProduct(row: Models.DefaultRow): Product {
  return {
    $id: row.$id,
    $createdAt: row.$createdAt,
    name: row.name as string,
    price: row.price as number,
    image_id: (row.image_id as string) || undefined,
  };
}

export async function getProducts(): Promise<Product[]> {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    queries: [Query.orderDesc("$createdAt")],
  });
  return response.rows.map(toProduct);
}

export async function getProduct(id: string): Promise<Product> {
  const row = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: id,
  });
  return toProduct(row);
}

export async function createProduct(
  name: string,
  price: number,
  imageId?: string
): Promise<Product> {
  const data: Record<string, unknown> = { name, price };
  if (imageId) data.image_id = imageId;

  const row = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: ID.unique(),
    data,
  });
  return toProduct(row);
}

export async function updateProduct(
  id: string,
  name: string,
  price: number,
  imageId?: string
): Promise<Product> {
  const data: Record<string, unknown> = { name, price };
  if (imageId !== undefined) data.image_id = imageId || null;

  const row = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: id,
    data,
  });
  return toProduct(row);
}

export async function deleteProduct(id: string): Promise<void> {
  await tablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: id,
  });
}
