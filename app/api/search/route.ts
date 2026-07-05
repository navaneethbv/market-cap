import { NextResponse, type NextRequest } from "next/server";
import { searchSymbols } from "@/lib/market/finnhub";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }
  try {
    const results = await searchSymbols(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("search failed:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
