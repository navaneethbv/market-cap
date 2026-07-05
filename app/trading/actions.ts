"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getQuote } from "@/lib/market/finnhub";
import { normalizePaperTradeInput } from "@/lib/paper-trading";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading");
  }

  return user;
}

export async function placePaperTrade(formData: FormData) {
  const user = await requireUser();
  const input = normalizePaperTradeInput({
    symbol: String(formData.get("symbol") ?? ""),
    side: String(formData.get("side") ?? ""),
    shares: String(formData.get("shares") ?? ""),
  });

  let quotePrice: number;
  try {
    quotePrice = (await getQuote(input.symbol)).price;
  } catch (err) {
    console.error("paper trade quote failed:", err);
    throw new Error(`No live quote available for ${input.symbol}`);
  }

  const { error } = await createAdminClient().rpc("place_paper_trade", {
    p_user_id: user.id,
    p_symbol: input.symbol,
    p_side: input.side,
    p_shares: input.shares,
    p_price: quotePrice,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
}

export async function resetPaperAccount() {
  const user = await requireUser();
  const { error } = await createAdminClient().rpc("reset_paper_account", {
    p_user_id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
}
