import type { SupabaseClient } from "@supabase/supabase-js";
import type { PriceAlert } from "./alerts.ts";
import type { Quote } from "./market/types.ts";
import { evaluateAlertNotifications } from "./notifications.ts";

export async function loadNotificationFeed(
  supabase: Pick<SupabaseClient, "from">,
  userId: string,
  getQuote: (symbol: string) => Promise<Quote>
) {
  const { data, error } = await supabase
    .from("price_alerts")
    .select("id,symbol,direction,target_price,active,triggered_at,created_at")
    .eq("user_id", userId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw new Error("Unable to load price alert notifications.");
  const alerts = (data ?? []).map((alert) => ({
    ...alert,
    target_price: Number(alert.target_price),
  })) as PriceAlert[];
  const symbols = [...new Set(alerts.filter((alert) => alert.active).map((alert) => alert.symbol))];
  const quotes: Record<string, Quote | null> = {};
  await Promise.all(symbols.map(async (symbol) => {
    try {
      quotes[symbol] = await getQuote(symbol);
    } catch {
      quotes[symbol] = null;
    }
  }));
  return evaluateAlertNotifications(alerts, quotes);
}
