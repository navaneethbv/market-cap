import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: portfolio, error } = await supabase
      .from("paper_portfolios")
      .select("cash_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const cashBalance = portfolio ? Number(portfolio.cash_balance) : 100000.00;
    return NextResponse.json({ cashBalance });
  } catch (err) {
    console.error("Failed to fetch paper cash balance:", err);
    return NextResponse.json({ error: "Failed to load balance" }, { status: 500 });
  }
}
