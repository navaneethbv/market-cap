import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaperTrade } from "@/lib/paper-trading";

const PAGE_SIZE = 1000;

// PostgREST caps responses at 1000 rows; page through so the ledger
// derivation never runs on a silently truncated trade history
export async function fetchAllPaperTrades(
  supabase: SupabaseClient,
  userId: string
): Promise<PaperTrade[]> {
  const trades: PaperTrade[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("paper_trades")
      .select("id,symbol,side,shares,price,executed_at")
      .eq("user_id", userId)
      .order("executed_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []).map((row) => ({
      ...row,
      shares: Number(row.shares),
      price: Number(row.price),
    })) as PaperTrade[];
    trades.push(...rows);

    if (rows.length < PAGE_SIZE) {
      return trades;
    }
  }
}
