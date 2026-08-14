"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/market/finnhub";
import { isUuid } from "@/lib/parse";
import { normalizePaperTradeInput } from "@/lib/paper-trading";

function getFormString(formData: FormData, key: string): string {
  const val = formData.get(key);
  return typeof val === "string" ? val : "";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

async function recordPaperEquitySnapshot(userId: string) {
  const admin = createAdminClient();
  const { data: account, error: accError } = await admin
    .from("paper_accounts")
    .select("cash_balance")
    .eq("user_id", userId)
    .single();

  if (accError || !account) {
    return;
  }

  const { data: positions, error: posError } = await admin
    .from("paper_positions")
    .select("symbol,shares")
    .eq("user_id", userId);

  if (posError) {
    return;
  }

  let totalPortfolioValue = Number(account.cash_balance);
  const posList = positions ?? [];

  if (posList.length > 0) {
    const quotes = await Promise.allSettled(
      posList.map((p) => getQuote(p.symbol))
    );

    posList.forEach((pos, idx) => {
      const qRes = quotes[idx];
      if (qRes.status === "fulfilled") {
        totalPortfolioValue += Number(pos.shares) * qRes.value.price;
      }
    });
  }

  await admin.from("paper_equity_snapshots").insert({
    user_id: userId,
    total_value: Number(totalPortfolioValue.toFixed(2)),
  });
}

function validateOrderThresholds(
  orderType: string,
  side: "buy" | "sell",
  quotePrice: number,
  limitPriceStr: string | null,
  stopPriceStr: string | null
): void {
  if (orderType === "limit" && limitPriceStr) {
    const limitPrice = Number(limitPriceStr);
    const isUnmetBuy = side === "buy" && quotePrice > limitPrice;
    const isUnmetSell = side === "sell" && quotePrice < limitPrice;
    if (isUnmetBuy || isUnmetSell) {
      throw new Error(
        `Limit price $${limitPrice.toFixed(2)} not met. Current price is $${quotePrice.toFixed(2)}.`
      );
    }
  }

  if (orderType === "stop" && stopPriceStr) {
    const stopPrice = Number(stopPriceStr);
    const isUntriggeredBuy = side === "buy" && quotePrice < stopPrice;
    const isUntriggeredSell = side === "sell" && quotePrice > stopPrice;
    if (isUntriggeredBuy || isUntriggeredSell) {
      throw new Error(
        `Stop price $${stopPrice.toFixed(2)} not triggered. Current price is $${quotePrice.toFixed(2)}.`
      );
    }
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

  validateOrderThresholds(
    orderType,
    input.side,
    quotePrice,
    limitPriceStr,
    stopPriceStr
  );

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
