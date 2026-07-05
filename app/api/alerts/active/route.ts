import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    const { data: alerts, error } = await supabase
      .from("price_alerts")
      .select("id,direction,target_price")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .eq("active", true);

    if (error) {
      throw new Error(error.message);
    }

    const formatted = (alerts ?? []).map((a) => ({
      id: a.id,
      direction: a.direction,
      targetPrice: Number(a.target_price),
    }));

    return NextResponse.json({ alerts: formatted });
  } catch (err) {
    console.error("Failed to fetch active alerts:", err);
    return NextResponse.json(
      { error: "Failed to load active alerts" },
      { status: 500 }
    );
  }
}
