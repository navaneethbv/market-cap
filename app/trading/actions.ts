"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getQuote } from "@/lib/market/finnhub";
import {
  buildPaperPortfolio,
  buildPaperPositionRows,
  buildPaperSummary,
  DEFAULT_STARTING_CASH,
  normalizePaperTradeInput,
} from "@/lib/paper-trading";
import { fetchAllPaperTrades } from "@/app/trading/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/parse";

function getFormString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

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

async function recordPaperEquitySnapshot(userId: string) {
  try {
    const admin = createAdminClient();
    const [{ data: account }, trades] = await Promise.all([
      admin
        .from("paper_accounts")
        .select("starting_cash")
        .eq("user_id", userId)
        .maybeSingle(),
      fetchAllPaperTrades(admin, userId),
    ]);
    const portfolio = buildPaperPortfolio(trades);
    const quoteResults = await Promise.allSettled(
      portfolio.positions.map((position) => getQuote(position.symbol))
    );
    const positionRows = buildPaperPositionRows(
      portfolio.positions,
      quoteResults
    );
    if (positionRows.some((row) => row.error !== null)) return;

    const summary = buildPaperSummary({
      startingCash: account ? Number(account.starting_cash) : DEFAULT_STARTING_CASH,
      portfolio,
      positionRows,
    });
    const { error } = await admin.rpc("upsert_paper_equity_snapshot", {
      p_user_id: userId,
      p_equity: Math.max(0, summary.equity),
    });
    if (error) console.error("equity snapshot failed:", error.message);
  } catch (error) {
    console.error("equity snapshot failed:", error);
  }
}

export async function placePaperTrade(formData: FormData) {
  const user = await requireUser();
  const input = normalizePaperTradeInput({
    symbol: getFormString(formData, "symbol"),
    side: getFormString(formData, "side"),
    shares: getFormString(formData, "shares"),
  });
  const idempotencyKey = getFormString(formData, "idempotencyKey");
  if (!isUuid(idempotencyKey)) {
    throw new Error("Idempotency key is required");
  }

  let quotePrice: number;
  try {
    quotePrice = (await getQuote(input.symbol)).price;
  } catch (err) {
    console.error("paper trade quote failed:", err);
    throw new Error(`No live quote available for ${input.symbol}`);
  }

  const orderType = getFormString(formData, "orderType") || "market";
  const limitPriceStr = getFormString(formData, "limitPrice");
  const stopPriceStr = getFormString(formData, "stopPrice");

  if (orderType === "limit" && limitPriceStr) {
    const limitPrice = Number(limitPriceStr);
    if (input.side === "buy" && quotePrice > limitPrice) {
      throw new Error(
        `Limit price $${limitPrice.toFixed(2)} not met. Current price is $${quotePrice.toFixed(2)}.`
      );
    }
    if (input.side === "sell" && quotePrice < limitPrice) {
      throw new Error(
        `Limit price $${limitPrice.toFixed(2)} not met. Current price is $${quotePrice.toFixed(2)}.`
      );
    }
  }

  if (orderType === "stop" && stopPriceStr) {
    const stopPrice = Number(stopPriceStr);
    if (input.side === "buy" && quotePrice < stopPrice) {
      throw new Error(
        `Stop price $${stopPrice.toFixed(2)} not triggered. Current price is $${quotePrice.toFixed(2)}.`
      );
    }
    if (input.side === "sell" && quotePrice > stopPrice) {
      throw new Error(
        `Stop price $${stopPrice.toFixed(2)} not triggered. Current price is $${quotePrice.toFixed(2)}.`
      );
    }
  }

  const { error } = await createAdminClient().rpc("place_paper_trade", {
    p_user_id: user.id,
    p_symbol: input.symbol,
    p_side: input.side,
    p_shares: input.shares,
    p_price: quotePrice,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    throw new Error(error.message);
  }

  await recordPaperEquitySnapshot(user.id);

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
