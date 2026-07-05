import type { SupabaseClient } from "@supabase/supabase-js";

export async function executeAlertTrigger(
  supabase: SupabaseClient,
  userEmail: string,
  alertId: string,
  currentPrice: number
) {
  const { data: alert, error: fetchError } = await supabase
    .from("price_alerts")
    .select("id,symbol,direction,target_price,active,webhook_url,notify_email")
    .eq("id", alertId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!alert) {
    throw new Error("Alert not found");
  }

  if (!alert.active) {
    return { triggered: false, message: "Alert already triggered or paused" };
  }

  const { error: updateError } = await supabase
    .from("price_alerts")
    .update({
      active: false,
      triggered_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const directionLabel = alert.direction === "above" ? "went above" : "dropped below";
  const targetPriceFormatted = alert.target_price.toLocaleString("en-US", { style: "currency", currency: "USD" });
  const currentPriceFormatted = currentPrice.toLocaleString("en-US", { style: "currency", currency: "USD" });

  if (alert.webhook_url && alert.webhook_url.trim().startsWith("http")) {
    const messageText = `🔔 **MarketCap Alert Triggered!**\n**Symbol:** ${alert.symbol}\n**Condition:** Price ${directionLabel} your target of ${targetPriceFormatted}\n**Trigger Price:** ${currentPriceFormatted}`;

    try {
      await fetch(alert.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          content: messageText,
          username: "MarketCap Alerts",
        }),
      });
    } catch (err) {
      console.error(`Failed to post webhook for alert ${alertId}:`, err);
    }
  }

  if (alert.notify_email) {
    console.log(`[EMAIL DISPATCH MOCK] To: ${userEmail}. Alert triggered for ${alert.symbol}: Price crossed target of ${targetPriceFormatted} (Triggered at: ${currentPriceFormatted})`);
  }

  return { triggered: true };
}
