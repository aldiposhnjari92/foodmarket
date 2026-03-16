import { tablesDB, DATABASE_ID, TABLE_ID, ID, Query } from "./appwrite";
import { deleteProductImage } from "./storage";
import { Models } from "appwrite";

export interface Product {
  $id: string;
  $createdAt: string;
  name: string;
  price: number;
  quantity: number;
  image_id?: string;
  owner_id?: string;
}

function toProduct(row: Models.DefaultRow): Product {
  return {
    $id: row.$id,
    $createdAt: row.$createdAt,
    name: row.name as string,
    price: row.price as number,
    quantity: (row.quantity as number) ?? 0,
    image_id: (row.image_id as string) || undefined,
    owner_id: (row.owner_id as string) || undefined,
  };
}

export async function getProducts(ownerId?: string): Promise<Product[]> {
  const queries = [Query.orderDesc("$createdAt")];
  if (ownerId) queries.push(Query.equal("owner_id", ownerId));
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    queries,
  });
  return response.rows.map(toProduct).sort((a, b) => a.name.localeCompare(b.name));
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
  imageId?: string,
  quantity: number = 1,
  ownerId?: string
): Promise<Product> {
  const data: Record<string, unknown> = { name, price, quantity };
  if (imageId) data.image_id = imageId;
  if (ownerId) data.owner_id = ownerId;

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
  imageId?: string,
  quantity?: number
): Promise<Product> {
  const data: Record<string, unknown> = { name, price };
  if (imageId !== undefined) data.image_id = imageId || null;
  if (quantity !== undefined) data.quantity = quantity;

  const row = await tablesDB.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: id,
    data,
  });
  return toProduct(row);
}

export async function deleteProduct(id: string, imageId?: string): Promise<void> {
  await tablesDB.deleteRow({
    databaseId: DATABASE_ID,
    tableId: TABLE_ID,
    rowId: id,
  });
  if (imageId) {
    await deleteProductImage(imageId).catch(() => {});
  }
}

/** Deduct sold quantities from inventory. Deletes the product (and its image) if quantity reaches 0. */
export async function sellProducts(
  items: { id: string; qtySold: number; currentQty: number; imageId?: string }[]
): Promise<void> {
  await Promise.all(
    items.map(({ id, qtySold, currentQty, imageId }) => {
      const remaining = currentQty - qtySold;
      if (remaining <= 0) {
        return deleteProduct(id, imageId);
      }
      return tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: id,
        data: { quantity: remaining },
      });
    })
  );
}
