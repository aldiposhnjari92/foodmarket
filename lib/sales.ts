import { tablesDB, DATABASE_ID, ID, Query } from "./appwrite";
import { Models } from "appwrite";

export const SALES_TABLE_ID = process.env.NEXT_PUBLIC_APPWRITE_SALES_TABLE_ID!;

export interface SaleItem {
  product_id: string;
  product_name: string;
  qty_sold: number;
  unit_price: number;
  total: number;
}

export interface Sale {
  $id: string;
  $createdAt: string;
  invoice_number: string;
  items_json: string;
  subtotal: number;
  vat: number;
  grand_total: number;
  buyer_name: string;
  seller_name: string;
}

function toSale(row: Models.DefaultRow): Sale {
  return {
    $id: row.$id,
    $createdAt: row.$createdAt,
    invoice_number: row.invoice_number as string,
    items_json: row.items_json as string,
    subtotal: row.subtotal as number,
    vat: row.vat as number,
    grand_total: row.grand_total as number,
    buyer_name: (row.buyer_name as string) || "",
    seller_name: (row.seller_name as string) || "",
  };
}

export async function getSales(): Promise<Sale[]> {
  const response = await tablesDB.listRows({
    databaseId: DATABASE_ID,
    tableId: SALES_TABLE_ID,
    queries: [Query.orderDesc("$createdAt")],
  });
  return response.rows.map(toSale);
}

export async function getSalesTotals(): Promise<{ unitsSold: number; revenue: number }> {
  const sales = await getSales();
  let unitsSold = 0;
  let revenue = 0;
  for (const sale of sales) {
    revenue += sale.grand_total;
    try {
      const items: SaleItem[] = JSON.parse(sale.items_json);
      unitsSold += items.reduce((s, i) => s + i.qty_sold, 0);
    } catch {
      // skip malformed records
    }
  }
  return { unitsSold, revenue };
}

export async function createSale(
  invoice_number: string,
  items: SaleItem[],
  subtotal: number,
  vat: number,
  grand_total: number,
  buyer_name: string = "",
  seller_name: string = ""
): Promise<Sale> {
  const row = await tablesDB.createRow({
    databaseId: DATABASE_ID,
    tableId: SALES_TABLE_ID,
    rowId: ID.unique(),
    data: {
      invoice_number,
      items_json: JSON.stringify(items),
      subtotal,
      vat,
      grand_total,
      buyer_name,
      seller_name,
    },
  });
  return toSale(row);
}
