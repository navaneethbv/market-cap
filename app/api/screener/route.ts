import { NextResponse } from "next/server";
import { SCREENER_CATALOG } from "@/lib/screener";
import { fetchCatalogStocks } from "@/lib/screener-server";

export async function GET() {
  const stocks = await fetchCatalogStocks();
  return NextResponse.json({ stocks, total: SCREENER_CATALOG.length });
}
