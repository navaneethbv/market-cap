"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getQuote } from "@/lib/market/finnhub";
import { isUuid } from "@/lib/parse";
import { fetchAllPaperTrades } from "@/app/trading/data";
import { recordPaperEquitySnapshot } from "@/lib/paper-equity-snapshot";
import {
  normalizePaperTradeInput,
  type PaperTradeActionState,
} from "@/lib/paper-trading";

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

async function savePaperEquitySnapshot(userId: string) {
  const admin = createAdminClient();
  return recordPaperEquitySnapshot(userId, {
    async loadStartingCash(accountUserId) {
      const { data: account, error } = await admin
        .from("paper_accounts")
        .select("starting_cash")
        .eq("user_id", accountUserId)
        .maybeSingle();

      if (error) {
        throw new Error(`Unable to read paper account: ${error.message}`);
      }
      if (!account) {
        throw new Error("Paper account was not found after placing the trade");
      }

      return Number(account.starting_cash);
    },
    loadTrades: (tradeUserId) => fetchAllPaperTrades(admin, tradeUserId),
    getQuotes: (symbols) =>
      Promise.allSettled(symbols.map((symbol) => getQuote(symbol))),
    async saveSnapshot(snapshotUserId, equity) {
      const { error } = await admin.rpc("upsert_paper_equity_snapshot", {
        p_user_id: snapshotUserId,
        p_equity: equity,
      });
      if (error) {
        throw new Error(`Unable to save paper equity snapshot: ${error.message}`);
      }
    },
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

export async function placePaperTrade(
  _previousState: PaperTradeActionState,
  formData: FormData
): Promise<PaperTradeActionState> {
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

  let result: PaperTradeActionState;
  try {
    const snapshot = await savePaperEquitySnapshot(user.id);
    result = snapshot.usedCostBasisFallback
      ? {
          status: "warning",
          message:
            "Trade placed and equity history updated. A live quote was unavailable for at least one holding, so its cost basis was used.",
        }
      : {
          status: "success",
          message: "Trade placed and equity history updated.",
        };
  } catch (err) {
    console.error("paper trade succeeded but equity snapshot failed:", err);
    result = {
      status: "warning",
      message:
        "Trade placed, but the equity history point could not be saved. Check your trading history before placing another trade.",
    };
  }

  revalidatePath("/trading");
  revalidatePath("/trading/history");
  return result;
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
