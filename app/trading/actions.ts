"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchAllPaperTrades } from "@/app/trading/data";
import { getQuote } from "@/lib/market/finnhub";
import {
  buildPaperPortfolio,
  DEFAULT_STARTING_CASH,
  normalizePaperTradeInput,
  validatePaperTrade,
} from "@/lib/paper-trading";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/trading");
  }

  return { supabase, user };
}

export async function placePaperTrade(formData: FormData) {
  const { supabase, user } = await requireUser();
  const input = normalizePaperTradeInput({
    symbol: String(formData.get("symbol") ?? ""),
    side: String(formData.get("side") ?? ""),
    shares: String(formData.get("shares") ?? ""),
  });

  const { data: account, error: accountError } = await supabase
    .from("paper_accounts")
    .select("id,starting_cash")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (!account) {
    const { error } = await supabase
      .from("paper_accounts")
      .insert({ user_id: user.id });

    // 23505 = another request created the account concurrently
    if (error && error.code !== "23505") {
      throw new Error(error.message);
    }
  }

  const startingCash = account
    ? Number(account.starting_cash)
    : DEFAULT_STARTING_CASH;

  let quotePrice: number;
  try {
    quotePrice = (await getQuote(input.symbol)).price;
  } catch (err) {
    console.error("paper trade quote failed:", err);
    throw new Error(`No live quote available for ${input.symbol}`);
  }

  const trades = await fetchAllPaperTrades(supabase, user.id);
  const portfolio = buildPaperPortfolio(trades);
  const cash = startingCash + portfolio.cashDelta;
  const positionShares =
    portfolio.positions.find((position) => position.symbol === input.symbol)
      ?.shares ?? 0;

  const validationError = validatePaperTrade({
    side: input.side,
    shares: input.shares,
    price: quotePrice,
    cash,
    positionShares,
  });

  if (validationError) {
    throw new Error(validationError);
  }

  const { error: insertError } = await supabase.from("paper_trades").insert({
    user_id: user.id,
    symbol: input.symbol,
    side: input.side,
    shares: input.shares,
    price: quotePrice,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
}

export async function resetPaperAccount() {
  const { supabase, user } = await requireUser();

  const { error: tradesError } = await supabase
    .from("paper_trades")
    .delete()
    .eq("user_id", user.id);

  if (tradesError) {
    throw new Error(tradesError.message);
  }

  const { error: snapshotsError } = await supabase
    .from("paper_equity_snapshots")
    .delete()
    .eq("user_id", user.id);

  if (snapshotsError) {
    throw new Error(snapshotsError.message);
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
}
