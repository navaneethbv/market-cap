"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizePaperTradeInput } from "@/lib/paper-portfolio";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/portfolio");
  }

  return { supabase, user };
}

export async function executePaperTrade(formData: FormData) {
  const { supabase, user } = await requireUser();

  const rawSymbol = String(formData.get("symbol") ?? "");
  const type = String(formData.get("type") ?? "");
  const rawShares = String(formData.get("shares") ?? "");
  const rawPrice = String(formData.get("price") ?? "");

  if (type !== "BUY" && type !== "SELL") {
    throw new Error("Invalid transaction type");
  }

  const { symbol, shares, price } = normalizePaperTradeInput(rawSymbol, rawShares, rawPrice);

  const { data: initialPortfolio, error: pError } = await supabase
    .from("paper_portfolios")
    .select("cash_balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (pError) {
    throw new Error(pError.message);
  }

  let portfolio = initialPortfolio;

  if (!portfolio) {
    // Initialize portfolio with $100k
    const { data: newP, error: initError } = await supabase
      .from("paper_portfolios")
      .insert({ user_id: user.id, cash_balance: 100000.00 })
      .select("cash_balance")
      .single();

    if (initError) {
      throw new Error(initError.message);
    }
    portfolio = newP;
  }

  const currentCash = Number(portfolio.cash_balance);

  // 2. Fetch existing holding if any
  const { data: holding, error: hError } = await supabase
    .from("paper_holdings")
    .select("id,shares,avg_cost")
    .eq("user_id", user.id)
    .eq("symbol", symbol)
    .maybeSingle();

  if (hError) {
    throw new Error(hError.message);
  }

  const totalCostValue = shares * price;

  if (type === "BUY") {
    if (currentCash < totalCostValue) {
      throw new Error(`Insufficient cash balance. Required: $${totalCostValue.toFixed(2)}, Available: $${currentCash.toFixed(2)}`);
    }

    const newCash = currentCash - totalCostValue;

    if (holding) {
      const existingShares = Number(holding.shares);
      const existingAvgCost = Number(holding.avg_cost);
      
      const newShares = existingShares + shares;
      const newAvgCost = (existingShares * existingAvgCost + totalCostValue) / newShares;

      const { error: updateHError } = await supabase
        .from("paper_holdings")
        .update({ shares: newShares, avg_cost: newAvgCost })
        .eq("id", holding.id);

      if (updateHError) throw new Error(updateHError.message);
    } else {
      const { error: insertHError } = await supabase
        .from("paper_holdings")
        .insert({
          user_id: user.id,
          symbol,
          shares,
          avg_cost: price,
        });

      if (insertHError) throw new Error(insertHError.message);
    }

    // Update Cash
    const { error: updatePError } = await supabase
      .from("paper_portfolios")
      .update({ cash_balance: newCash, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (updatePError) throw new Error(updatePError.message);

  } else {
    // SELL
    if (!holding) {
      throw new Error(`You do not own any shares of ${symbol} to sell.`);
    }

    const existingShares = Number(holding.shares);
    if (existingShares < shares) {
      throw new Error(`Insufficient shares. Attempting to sell: ${shares}, Owned: ${existingShares}`);
    }

    const newCash = currentCash + totalCostValue;

    if (existingShares === shares) {
      // Delete holding entirely
      const { error: deleteHError } = await supabase
        .from("paper_holdings")
        .delete()
        .eq("id", holding.id);

      if (deleteHError) throw new Error(deleteHError.message);
    } else {
      // Update holding shares
      const newShares = existingShares - shares;
      const { error: updateHError } = await supabase
        .from("paper_holdings")
        .update({ shares: newShares })
        .eq("id", holding.id);

      if (updateHError) throw new Error(updateHError.message);
    }

    // Update Cash
    const { error: updatePError } = await supabase
      .from("paper_portfolios")
      .update({ cash_balance: newCash, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (updatePError) throw new Error(updatePError.message);
  }

  // 3. Log transaction
  const { error: transError } = await supabase
    .from("paper_transactions")
    .insert({
      user_id: user.id,
      symbol,
      type,
      shares,
      price,
    });

  if (transError) {
    console.error("Failed to log paper transaction:", transError.message);
  }

  revalidatePath("/portfolio");
}
