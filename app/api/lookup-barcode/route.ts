import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const barcode = request.nextUrl.searchParams.get("barcode");
  if (!barcode) {
    return NextResponse.json({ productName: null });
  }

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands`,
      { headers: { "User-Agent": "FoodMarket/1.0" } }
    );
    const data = await res.json();

    if (data.status === 1 && data.product) {
      const name = (data.product.product_name || data.product.brands || "").trim();
      return NextResponse.json({ productName: name || null });
    }
  } catch {
    // lookup failed — return null so UI falls back gracefully
  }

  return NextResponse.json({ productName: null });
}
